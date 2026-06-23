/**
 * 碘队 · 化学游戏工坊 — Cloudflare Worker
 *
 * 功能：
 * 1. 托管静态文件（public/ 目录）
 * 2. 反向代理 /api/* → hteamgame.com（解决 CORS）
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API 反向代理 → hteamgame.com
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

    // 静态文件由 ASSETS binding 处理
    return env.ASSETS.fetch(request);
  },
};
