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

// 第二层：全局日限额（超限自动降级 Gemini，北京时间 0 点重置）
const DAILY_CAP = 500;
let dailyTotal = 0;
let dailyReset = getNextMidnight();

function getNextMidnight() {
  const now = new Date();
  // UTC+8 北京时间次日 0:00
  const bjMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 16)); // UTC+8 midnight = UTC 16:00
  if (bjMidnight <= now) bjMidnight.setUTCDate(bjMidnight.getUTCDate() + 1);
  return bjMidnight.getTime();
}

function checkRate(ip, peekOnly) {
  const now = Date.now();
  if (now > dailyReset) { dailyTotal = 0; dailyReset = getNextMidnight(); }
  if (rateMap.size > 100) {
    for (const [k, e] of rateMap) { if (now > e.resetTime) rateMap.delete(k); }
  }
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetTime) {
    if (!peekOnly) { rateMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW }); dailyTotal++; }
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  if (!peekOnly) { entry.count++; dailyTotal++; }
  return true;
}
// 第三层：并发限制
const GLOBAL_CONCURRENCY = 80;  // 全局同时最多 80 个请求
const IP_CONCURRENCY = 2;       // 单 IP 同时最多 2 个请求
let globalActive = 0;
const ipActiveMap = new Map();

function acquireConcurrency(ip) {
  if (globalActive >= GLOBAL_CONCURRENCY) return false;
  const n = ipActiveMap.get(ip) || 0;
  if (n >= IP_CONCURRENCY) return false;
  globalActive++;
  ipActiveMap.set(ip, n + 1);
  return true;
}
function releaseConcurrency(ip) {
  globalActive = Math.max(0, globalActive - 1);
  const n = ipActiveMap.get(ip) || 0;
  if (n <= 1) ipActiveMap.delete(ip);
  else ipActiveMap.set(ip, n - 1);
}

// 惰性清理：checkRate 内部顺便扫过期条目

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

        // === 智能降级决策：根据负载自动切 Gemini ===
        const ip = request.headers.get('CF-Connecting-IP') || 'cf-missing';
        let effectiveModel = model || 'deepseek';
        const reasons = [];

        // 获取并发数（acquire 之前先看，不阻塞）
        const ipActive = ipActiveMap.get(ip) || 0;

        // 1. 全局并发 > 60 → 全员降级 Gemini
        if (globalActive > 60) {
          effectiveModel = 'gemini';
          reasons.push('global-concurrency');
        }
        // 2. 单 IP 并发 > 2 → 该 IP 降级
        else if (ipActive >= IP_CONCURRENCY) {
          effectiveModel = 'gemini';
          reasons.push('ip-concurrency');
        }
        // 3. 单 IP 速率 > 20/min → 该 IP 降级
        else if (!checkRate(ip, /* countOnly */ true)) {
          effectiveModel = 'gemini';
          reasons.push('ip-ratelimit');
        }
        // 4. 全局日限额 → 降级 Gemini（0 点自动恢复）
        if (Date.now() > dailyReset) { dailyTotal = 0; dailyReset = getNextMidnight(); }
        if (dailyTotal >= DAILY_CAP) {
          effectiveModel = 'gemini';
          reasons.push('daily-cap');
        }

        // 获取并发槽位
        const gotSlot = acquireConcurrency(ip);
        if (!gotSlot) {
          effectiveModel = 'gemini';
          reasons.push('concurrency-full');
          // 再试一次 acquire（可能有刚释放的）
          if (!acquireConcurrency(ip)) {
            // 彻底满了也降级走 Gemini，不计入限流
          }
        }

        // 如果是 DeepSeek 模式，计入限流
        if (effectiveModel !== 'gemini') {
          checkRate(ip, false); // 真正计数
        }

        if (reasons.length > 0) {
          console.log(`[chat] degraded to gemini for ${ip}: ${reasons.join(', ')}`);
        }

        try {
          const result = await callAI(env, puzzle, userMessage, history || [], effectiveModel);
          console.log(`[chat] ip=${ip} model=${effectiveModel} source=${result.source} msg_len=${result.reply.length}`);
          return new Response(JSON.stringify({ reply: result.reply }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'X-AI-Model': effectiveModel,
              'X-AI-Source': result.source,
            },
          });
        } finally {
          releaseConcurrency(ip);
        }
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
    const assetResp = await env.ASSETS.fetch(request);
    // 404 兜底：从 hteamgame.com 拉取（镜像的游戏资源如图片等）
    if (assetResp.status === 404) {
      const fallback = await fetch(`https://hteamgame.com${url.pathname}${url.search}`);
      if (fallback.ok) return fallback;
    }
    return assetResp;
  },
};
