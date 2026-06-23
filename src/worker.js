/**
 * 碘队 · 化学游戏工坊 — Cloudflare Worker
 *
 * 功能：
 * 1. 托管静态文件（public/ 目录）
 * 2. /api/chat → DeepSeek Flash（主）→ hteamgame Gemini（降级）
 * 3. /api/*    → hteamgame.com 反向代理（puzzles, scores 等）
 */

import { SYSTEM_PROMPT } from './prompt.js';

// DeepSeek API 配置
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

// hteamgame 降级端点
const FALLBACK_GEMINI_URL = 'https://hteamgame.com/api/gemini/generate';

/**
 * 调用 DeepSeek Flash，失败则降级到 hteamgame Gemini
 */
async function callAI(env, puzzle, userMessage, history) {
  // 组装系统提示词
  const systemPrompt = SYSTEM_PROMPT.replace(/\{PUZZLE_CONTEXT\}/g, puzzle);

  // 构建 messages
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: `玩家提问：${userMessage}` },
  ];

  // 主路径：DeepSeek Flash
  try {
    const dsResp = await fetch(DEEPSEEK_URL, {
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

    if (dsResp.ok) {
      const data = await dsResp.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) return { reply, source: 'deepseek' };
    }
    console.warn(`DeepSeek returned ${dsResp.status}, falling back`);
  } catch (e) {
    console.warn(`DeepSeek error: ${e.message}, falling back`);
  }

  // 降级路径：hteamgame Gemini
  try {
    const geminiResp = await fetch(FALLBACK_GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `玩家提问：${userMessage}` }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.8 },
      }),
    });

    if (geminiResp.ok) {
      const data = await geminiResp.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return { reply, source: 'gemini-fallback' };
    }
    console.warn(`Gemini fallback returned ${geminiResp.status}`);
  } catch (e) {
    console.warn(`Gemini fallback error: ${e.message}`);
  }

  // 双重失败 → 返回八千代式道歉
  return {
    reply: '唔……抱歉呢神明大人，八千代刚才不小心走神了🌙能再问一次吗？',
    source: 'error',
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // /api/chat → DeepSeek（主）+ hteamgame 降级
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { puzzle, userMessage, history } = body;

        if (!puzzle || !userMessage) {
          return new Response(JSON.stringify({ error: '缺少 puzzle 或 userMessage' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const result = await callAI(env, puzzle, userMessage, history || []);

        return new Response(JSON.stringify({ reply: result.reply }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
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
