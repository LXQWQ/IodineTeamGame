/**
 * htgemini — 氢队 Gemini Key 直连代理（Cloudflare Worker）
 *
 * 背景：
 * - 氢队（hteamgame.com）封锁了 Cloudflare Worker 出口 IP 访问其 /api/*，
 *   且氢队可能已弃用此 Google Key；
 * - 此 Worker 用氢队的 Google Gemini API Key **直连** Google，
 *   从 Cloudflare 出口调用（Google 接受 Cloudflare 出口，仅拒"脏"公共 VPN IP）。
 *
 * 兼容性：
 * - 请求/响应格式与氢队 /api/gemini/generate 完全一致（Gemini 原生格式），
 *   碘队 Worker 的 callGemini 无需改解析逻辑，只需改 URL 指向本 Worker。
 *
 * 安全：
 * - API Key 只从环境变量 env.GEMINI_KEY 读取（Cloudflare Secret），
 *   代码与仓库中绝不出现明文 Key。
 * - 可选防滥用：设置 Secret PROXY_TOKEN 后，调用方必须带
 *   X-Proxy-Token 头（碘队 Worker 端配置）。
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-proxy-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response('ok', { status: 204, headers: CORS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // 防滥用：若配置了 PROXY_TOKEN，则校验 X-Proxy-Token
    if (env.PROXY_TOKEN && request.headers.get('X-Proxy-Token') !== env.PROXY_TOKEN) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const key = env.GEMINI_KEY;
    if (!key) {
      return json({ error: 'GEMINI_KEY secret not configured' }, 500);
    }

    try {
      const body = await request.json();

      // 模型默认 gemini-3.5-flash（gemini-2.5-flash 对新注册账号已不可用，
      // Google 返回 404 "no longer available to new users"），可被请求体 model 字段覆盖
      const model = (body && body.model) || env.GEMINI_MODEL || 'gemini-3.5-flash';

      // 组装 Google 原生请求（剔除 model 字段，其余透传）
      const googlePayload = {
        contents: body.contents,
        systemInstruction: body.systemInstruction,
        generationConfig: body.generationConfig,
      };

      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(googlePayload),
        }
      );

      const text = await upstream.text();
      // 原样透传 Google 响应（candidates 格式与氢队一致）
      return new Response(text, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
      });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};
