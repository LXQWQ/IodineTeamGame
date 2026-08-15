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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

  try {
    const body = await req.json();

    // 转发到氢队（只带必要头，不转发任何 CF-* 头）
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
