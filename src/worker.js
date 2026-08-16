/**
 * 碘队 · 化学游戏工坊 — Cloudflare Worker
 *
 * 功能：
 * 1. 托管静态文件（public/ 目录）
 * 2. /api/chat → 用户可选 Gemini（直连 Google）或 Workers AI（免费）
 * 3. /api/*    → hteamgame.com 反向代理（puzzles, scores 等）
 */

// Gemini 端点
// 主路径：htgemini Worker（用户自己的 Gemini Key 直连 Google，Cloudflare 出口，模型 gemini-3.5-flash）
// 兜底：直连氢队（若其解封 Cloudflare IP 则恢复）；再失败由上层降级 Workers AI。
const GEMINI_VIA_HTGEMINI = 'https://htgmn.iteamgame.dpdns.org/';
const GEMINI_DIRECT = 'https://hteamgame.com/api/gemini/generate';

// Gemini 调用诊断（最近一次调用结果，供 X-Gemini-Debug 响应头排查用）
let geminiDebug = null;

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

// 去掉行尾空白并压缩连续空行，减小请求体。
// 氢队 Gemini 代理对 ~75KB 的大请求体间歇性返回 500「服务暂时不可用」，
// 瘦身后 ~50KB 可稳定通过（不影响语义）。
function slimPrompt(text) {
  return text
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

async function loadPrompts(env) {
  if (!cachedDSPrompt) {
    const dsResp = await env.ASSETS.fetch(new Request('https://dummy/prompts/dsv4flash.txt'));
    cachedDSPrompt = slimPrompt(await dsResp.text());
  }
  if (!cachedDefaultPrompt) {
    const dfResp = await env.ASSETS.fetch(new Request('https://dummy/prompts/default.txt'));
    cachedDefaultPrompt = slimPrompt(await dfResp.text());
  }
  return { ds: cachedDSPrompt, df: cachedDefaultPrompt };
}

/**
 * 调用 Gemini（氢队）：
 * 1. 主：htgemini Worker（用户 Gemini Key 直连 Google，Cloudflare 出口）
 * 2. 兜底：直连氢队（若其解封 Cloudflare IP 则恢复）
 */
async function callGemini(systemPrompt, userMessage) {
  const payload = {
    contents: [{ parts: [{ text: `玩家提问：${userMessage}` }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { temperature: 0.8 },
  };
  const baseHeaders = {
    'Content-Type': 'application/json',
    // 带浏览器 UA，避免氢队按 UA 特征拦截
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  };

  // 主路径：htgemini Worker（用户自己的 Gemini Key 直连 Google）
  try {
    const resp = await fetch(GEMINI_VIA_HTGEMINI, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      const data = await resp.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) { geminiDebug = 'ok:htgemini'; return reply; }
    }
    geminiDebug = `fail:htgemini-${resp.status}`;
    console.warn(`[Gemini] via htgemini returned ${resp.status}, trying direct`);
  } catch (e) {
    geminiDebug = `fail:htgemini-err:${e.message}`;
    console.warn(`[Gemini] via htgemini error: ${e.message}, trying direct`);
  }

  // 兜底：直连氢队
  try {
    const resp = await fetch(GEMINI_DIRECT, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`Gemini returned ${resp.status}`);
    const data = await resp.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error('Empty Gemini response');
    geminiDebug = 'ok:direct';
    return reply;
  } catch (e) {
    geminiDebug = `${geminiDebug} -> fail:direct:${e.message}`;
    throw e;
  }
}

/**
 * 调用 Cloudflare Workers AI（免费额度，替代 DeepSeek）
 * 模型默认 @cf/meta/llama-3.3-70b-instruct-fp8-fast，可用 Secret WORKERS_AI_MODEL 覆盖
 */
async function callWorkersAI(env, systemPrompt, userMessage, history) {
  const model = env.WORKERS_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: `玩家提问：${userMessage}` },
  ];
  const result = await env.AI.run(model, { messages });
  // Workers AI 常见返回格式：{ response } / { choices:[{message:{content}}] } / { output_text }
  const reply = result?.response
    || result?.choices?.[0]?.message?.content
    || result?.output_text;
  if (!reply) throw new Error('Empty Workers AI response');
  return reply;
}

/**
 * 主 AI 调度：根据 model 参数选择后端
 * @param {'deepseek'|'gemini'} model - 用户选择的模型（deepseek 实际走 Cloudflare Workers AI）
 */
async function callAI(env, puzzle, userMessage, history, model) {
  const { ds, df } = await loadPrompts(env);
  const promptTemplate = model === 'deepseek' ? ds : df;
  const systemPrompt = promptTemplate.replace(/\{PUZZLE_CONTEXT\}/g, puzzle);

  // Gemini 模式：主路径 Gemini，失败降级 Workers AI
  if (model === 'gemini') {
    console.log('[AI] using Gemini (user selected)');
    try {
      const reply = await callGemini(systemPrompt, userMessage);
      return { reply, source: 'gemini' };
    } catch (e) {
      console.warn(`[AI] Gemini error: ${e.message}, falling back to Workers AI`);
      try {
        const reply = await callWorkersAI(env, systemPrompt, userMessage, history);
        return { reply, source: 'workers-ai-fallback' };
      } catch (e2) {
        console.warn(`[AI] Workers AI fallback also failed: ${e2.message}`);
      }
      return {
        reply: '唔……抱歉呢神明大人，小八刚才不小心走神了🌙能再问一次吗？',
        source: 'error',
      };
    }
  }

  // 默认模式：Cloudflare Workers AI（免费，替代 DeepSeek）
  console.log('[AI] using Cloudflare Workers AI');

  try {
    const reply = await callWorkersAI(env, systemPrompt, userMessage, history);
    return { reply, source: 'workers-ai' };
  } catch (e) {
    console.warn(`[AI] Workers AI error: ${e.message}`);
  }

  // Workers AI 失败 → 降级到 Gemini
  try {
    const reply = await callGemini(systemPrompt, userMessage);
    return { reply, source: 'gemini-fallback' };
  } catch (e2) {
    console.warn(`[AI] Gemini fallback also failed: ${e2.message}`);
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
              'X-Gemini-Debug': geminiDebug || '',
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

    // 考纲可视化 → index.html 用本地（免登录），其余全反代 hteamgame.com
    if (url.pathname.startsWith('/氢队游戏/考纲可视化/') && !url.pathname.match(/\/考纲可视化\/(index\.html)?$/)) {
      return fetch(`https://hteamgame.com${url.pathname}${url.search}`);
    }

    // /api/* 其他请求 → hteamgame.com 反向代理
    if (url.pathname.startsWith('/api/')) {
      const target = `https://hteamgame.com${url.pathname}${url.search}`;

      // 只转发必要的头，剔除 Cloudflare 内部头与转发头。
      // 氢队站点也在 Cloudflare 后面：若把 CF-Connecting-IP 等原样转发，
      // 来源 IP（本 Worker 出口 IP）与头中声明的客户端 IP 不匹配，
      // 会被氢队判定为伪造客户端 IP → 403 {"error":"Forbidden"}。
      const headers = new Headers();
      const src = request.headers;
      for (const [k, v] of src.entries()) {
        const lk = k.toLowerCase();
        if (lk.startsWith('cf-')) continue;          // CF-Connecting-IP / CF-Ray / CF-IPCountry / CF-Worker ...
        if (lk === 'cdn-loop') continue;             // Cloudflare 回环标记
        if (lk.startsWith('x-forwarded-')) continue; // X-Forwarded-For / X-Forwarded-Proto ...
        if (lk === 'x-real-ip' || lk === 'host' || lk === 'connection' ||
            lk === 'content-length' || lk === 'accept-encoding') continue;
        headers.set(k, v);
      }
      // 统一使用浏览器 UA，避免氢队按 UA 特征拦截
      headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

      const proxyReq = new Request(target, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.text()
          : undefined,
      });
      const upstream = await fetch(proxyReq);

      // 诊断：暴露上游状态码，便于排查氢队反爬
      const upstreamStatus = upstream.status;

      // GET /api/puzzles：氢队失败（403/超时等）时降级为本地缓存题目，保证游戏可用
      if (url.pathname === '/api/puzzles' && request.method === 'GET' && !upstream.ok) {
        console.warn(`[puzzles] upstream ${upstream.status}, serving local backup`);
        const local = await env.ASSETS.fetch(
          new Request('https://dummy/games/chem-turtle-soup/puzzles-backup.json')
        );
        return new Response(local.body, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'X-Puzzles-Source': 'local-backup',
            'X-Upstream-Status': String(upstreamStatus),
          },
        });
      }

      return upstream;
    }

    // 静态文件
    return env.ASSETS.fetch(request);
  },
};
