/**
 * 碘队 · 化学游戏工坊 — Cloudflare Worker
 *
 * 功能：
 * 1. 托管静态文件（public/ 目录）
 * 2. /api/chat → 用户可选 DeepSeek Flash 或 Gemini 2.5 Flash
 * 3. /api/*    → hteamgame.com 反向代理（puzzles, scores 等）
 */

import { DEEPSEEK_PROMPT, DEFAULT_PROMPT } from './prompt.js';

// DeepSeek API 配置
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// hteamgame Gemini 端点
const GEMINI_URL = 'https://hteamgame.com/api/gemini/generate';

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
  const promptTemplate = model === 'deepseek' ? DEEPSEEK_PROMPT : DEFAULT_PROMPT;
  const systemPrompt = promptTemplate.replace(/\{PUZZLE_CONTEXT\}/g, puzzle);

  // Gemini 模式：直接走 hteamgame
  if (model === 'gemini') {
    console.log('[AI] using Gemini (user selected)');
    try {
      const reply = await callGemini(systemPrompt, userMessage);
      return { reply, source: 'gemini' };
    } catch (e) {
      console.warn(`[AI] Gemini error: ${e.message}, falling back to DeepSeek`);
    }
  }

  // DeepSeek 模式（默认）：主路径
  console.log('[AI] using DeepSeek Flash');
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: `玩家提问：${userMessage}` },
  ];

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

        const result = await callAI(env, puzzle, userMessage, history || [], model || 'deepseek');

        console.log(`[chat] model=${model || 'deepseek'} source=${result.source} msg_len=${result.reply.length}`);

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
