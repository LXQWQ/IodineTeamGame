/**
 * htgemini — 氢队 Gemini 接口中转（Supabase Edge Function）
 *
 * 背景：氢队（hteamgame.com）封锁了 Cloudflare Worker 出口 IP 对 /api/* 的访问，
 * 但本机/普通服务器 IP 直连正常。此函数跑在 Supabase Edge Runtime（AWS us-west-2，
 * 非 Cloudflare 出口），把碘队 Worker 的请求转发到氢队 /api/gemini/generate，
 * 完全透传请求体与响应体 —— 碘队 Worker 只需把 GEMINI_URL 指向本函数。
 *
 * 部署：supabase functions deploy htgemini
 * 调用：POST https://supabase.iteamgame.dpdns.org/functions/v1/htgemini
 *       头：Authorization: Bearer <anon key>   Content-Type: application/json
 */

const HYDROGEN_URL = 'https://hteamgame.com/api/gemini/generate';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://iteamgame.dpdns.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-proxy-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};

// 共享密钥（Supabase secret：HTGEMINI_TOKEN）。未配置即拒绝服务（fail-closed）。
// 修复前本函数零鉴权：任何匿名者都能驱动它用服务端凭据转发到上游。
const AUTH_TOKEN = Deno.env.get('HTGEMINI_TOKEN') ?? '';
const MAX_BODY = 64_000;

function safeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ① 鉴权：必须携带与 HTGEMINI_TOKEN 一致的 x-proxy-token
  if (!AUTH_TOKEN) {
    console.error('[htgemini] HTGEMINI_TOKEN 未配置，拒绝服务');
    return new Response(
      JSON.stringify({ error: 'Proxy token not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  if (!safeEqual(req.headers.get('x-proxy-token') ?? '', AUTH_TOKEN)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // ② 体积上限：避免被当作大流量转发器 / 放大带宽消耗
    const raw = await req.text();
    if (raw.length > MAX_BODY) {
      return new Response(
        JSON.stringify({ error: 'Payload too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const body = JSON.parse(raw);

    // 转发到氢队（只带必要头，不转发任何 CF-* 头，也不转发调用方凭证）
    const upstream = await fetch(HYDROGEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': BROWSER_UA,
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
