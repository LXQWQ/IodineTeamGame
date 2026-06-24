/**
 * 碘队 · 化学游戏工坊 — Cloudflare Worker
 *
 * 功能：
 * 1. 托管静态文件（public/ 目录）
 * 2. /api/chat → 用户可选 DeepSeek Flash 或 Gemini 2.5 Flash
 * 3. /api/*    → hteamgame.com 反向代理（puzzles, scores 等）
 */

// DeepSeek API 配置
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// hteamgame Gemini 端点
const GEMINI_URL = 'https://hteamgame.com/api/gemini/generate';

// === 双层限流（内存，Worker 冷启动时清零） ===
// 第一层：IP 限流
const RATE_LIMIT = 20;        // 每 IP 每分钟最多 20 次
const RATE_WINDOW = 60_000;   // 窗口 60 秒
const rateMap = new Map();

// 第二层：全局日限额（兜底，不管换多少 IP 都不能超过）
const DAILY_CAP = 500;        // 每天总共最多 500 次
let dailyTotal = 0;
let dailyReset = Date.now() + 86_400_000;

function checkRate(ip) {
  const now = Date.now();
  // 重置全局日计数器
  if (now > dailyReset) { dailyTotal = 0; dailyReset = now + 86_400_000; }
  if (dailyTotal >= DAILY_CAP) return false; // 全局封顶
  // IP 级检查
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    dailyTotal++;
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  dailyTotal++;
  return true;
}
// 定期清理
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of rateMap) { if (now > e.resetTime) rateMap.delete(ip); }
}, 60_000);

// === Turnstile 验证 ===
async function verifyTurnstile(token, ip, env) {
  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  });
  return resp.json();
}

// 提示词缓存（首次请求时从 public/prompts/ 加载）
let cachedDSPrompt = null;
let cachedDefaultPrompt = null;

async function loadPrompts(env) {
  if (!cachedDSPrompt) {
    const dsResp = await env.ASSETS.fetch(new Request('https://dummy/prompts/dsv4flash.txt'));
    cachedDSPrompt = await dsResp.text();
  }
  if (!cachedDefaultPrompt) {
    const dfResp = await env.ASSETS.fetch(new Request('https://dummy/prompts/default.txt'));
    cachedDefaultPrompt = await dfResp.text();
  }
  return { ds: cachedDSPrompt, df: cachedDefaultPrompt };
}

/**
 * 调用 Gemini（hteamgame）
 */
async function callGemini(systemPrompt, userMessage) {
  const resp = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `玩家提问：${userMessage}` }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.8 },
    }),
  });
  if (!resp.ok) throw new Error(`Gemini returned ${resp.status}`);
  const data = await resp.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) throw new Error('Empty Gemini response');
  return reply;
}

/**
 * 调用 DeepSeek Flash
 */
async function callDeepSeek(env, messages) {
  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 1024,
      thinking: { type: 'enabled' },
    }),
  });
  if (!resp.ok) throw new Error(`DeepSeek returned ${resp.status}`);
  const data = await resp.json();
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) throw new Error('Empty DeepSeek response');
  return reply;
}

/**
 * 主 AI 调度：根据 model 参数选择后端
 * @param {'deepseek'|'gemini'} model - 用户选择的模型
 */
async function callAI(env, puzzle, userMessage, history, model) {
  const { ds, df } = await loadPrompts(env);
  const promptTemplate = model === 'deepseek' ? ds : df;
  const systemPrompt = promptTemplate.replace(/\{PUZZLE_CONTEXT\}/g, puzzle);

  // 构建 DeepSeek 格式 messages（也用于 Gemini 降级场景）
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: `玩家提问：${userMessage}` },
  ];

  // Gemini 模式：直接走 hteamgame
  if (model === 'gemini') {
    console.log('[AI] using Gemini (user selected)');
    try {
      const reply = await callGemini(systemPrompt, userMessage);
      return { reply, source: 'gemini' };
    } catch (e) {
      console.warn(`[AI] Gemini error: ${e.message}, falling back to DeepSeek`);
      try {
        const reply = await callDeepSeek(env, messages);
        return { reply, source: 'deepseek-fallback' };
      } catch (e2) {
        console.warn(`[AI] DeepSeek fallback also failed: ${e2.message}`);
      }
      return {
        reply: '唔……抱歉呢神明大人，小八刚才不小心走神了🌙能再问一次吗？',
        source: 'error',
      };
    }
  }

  // DeepSeek 模式（默认）：主路径
  console.log('[AI] using DeepSeek Flash');

  try {
    const reply = await callDeepSeek(env, messages);
    return { reply, source: 'deepseek' };
  } catch (e) {
    console.warn(`[AI] DeepSeek error: ${e.message}`);
  }

  // DeepSeek 失败 → 降级到 Gemini
  if (model !== 'gemini') {
    console.log('[AI] falling back to Gemini');
    try {
      const reply = await callGemini(systemPrompt, userMessage);
      return { reply, source: 'gemini-fallback' };
    } catch (e2) {
      console.warn(`[AI] Gemini fallback also failed: ${e2.message}`);
    }
  }

  // 双重失败
  return {
    reply: '唔……抱歉呢神明大人，小八刚才不小心走神了🌙能再问一次吗？',
    source: 'error',
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // /api/chat → AI 调度
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { puzzle, userMessage, history, model } = body;

        if (!puzzle || !userMessage) {
          return new Response(JSON.stringify({ error: '缺少 puzzle 或 userMessage' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // 输入大小限制
        if (userMessage.length > 300) {
          return new Response(JSON.stringify({ error: '提问过长，最多300字', reply: '神明大人的问题太长了啦~🌙能简短一点吗？' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        if ((history || []).length > 20) {
          return new Response(JSON.stringify({ error: '对话轮次过多，请刷新重来', reply: '唔…聊了太久了呢✨先换一汤再继续吧~🌙' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        // Turnstile 人机验证
        const token = body.turnstileToken;
        if (!token) {
          return new Response(JSON.stringify({ error: '缺少验证', reply: '请刷新页面后重试🌙' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        const verifyResult = await verifyTurnstile(token, ip, env);
        if (!verifyResult.success) {
          return new Response(JSON.stringify({ error: '验证失败', reply: '八千代觉得你有点像机器人呢……刷新页面再试试？🌙' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        // 双层限流检查
        if (!checkRate(ip)) {
          const msg = dailyTotal >= DAILY_CAP
            ? '今天八千代已经回答了足够多的问题啦✨稍微休息一下，明天再来吧🌙'
            : '啊啦~神明大人问得太快了✨八千代有点跟不上呢……稍等一下再继续吧🌙';
          return new Response(JSON.stringify({ error: '请求太频繁', reply: msg }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-RateLimit-IP': ip },
          });
        }

        const result = await callAI(env, puzzle, userMessage, history || [], model || 'deepseek');

        console.log(`[chat] ip=${ip} model=${model || 'deepseek'} source=${result.source} msg_len=${result.reply.length}`);

        return new Response(JSON.stringify({ reply: result.reply }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-AI-Model': model || 'deepseek',
            'X-AI-Source': result.source,
          },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // /api/* 其他请求 → hteamgame.com 反向代理
    if (url.pathname.startsWith('/api/')) {
      const target = `https://hteamgame.com${url.pathname}${url.search}`;
      const proxyReq = new Request(target, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.text()
          : undefined,
      });
      return fetch(proxyReq);
    }

    // 静态文件
    return env.ASSETS.fetch(request);
  },
};
