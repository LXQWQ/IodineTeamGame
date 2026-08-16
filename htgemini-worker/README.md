# htgemini — 氢队 Gemini Key 直连代理（Cloudflare Worker）

用氢队的 Google Gemini API Key 直连 Google，从 Cloudflare 出口调用。
请求/响应格式与氢队 `/api/gemini/generate` 完全一致（Gemini 原生格式）。

## 部署（你来操作）

```bash
cd deploy/htgemini-worker

# 1. 登录 Cloudflare（首次）
npx wrangler login

# 2. 部署 Worker（名字 htgemini，部署后得到 https://htgemini.<你的子域>.workers.dev）
npx wrangler deploy

# 3. 设置两个 Secret（Key 不进代码/仓库，只在 Cloudflare 加密存储）
#    第一个：Google Gemini API Key（必填）
npx wrangler secret put GEMINI_KEY
#     粘贴：AIzaSyBnpYXaAod_sURILzdEOIdmz2SIHUVtabQ

# 4.（可选）防滥用令牌 —— 设置了之后，碘队 Worker 调用时必须带 X-Proxy-Token 头
npx wrangler secret put PROXY_TOKEN
#     粘贴：任意随机字符串（如：htg-<随机>）
```

> `wrangler secret put` 设置后自动生效，无需重新 deploy。
> 也可以改用 Dashboard：Workers & Pages → htgemini → Settings → Variables and Secrets → Add secret。

## 验证

```bash
# 本机用代理测（或直接在能访问 workers.dev 的网络测）
curl -x http://127.0.0.1:12000 -X POST \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"hi"}]}],"generationConfig":{"maxOutputTokens":10}}' \
  "https://htgemini.<你的子域>.workers.dev/"
```

期望返回 Google 原生格式：`{"candidates":[{"content":{"parts":[{"text":"..."}]}}]}`

## 接入碘队

部署成功后，把部署地址告诉 AI，碘队 Worker 的 `GEMINI_VIA_SUPABASE` 会改为：
`https://htgemini.<你的子域>.workers.dev/`（若设置了 PROXY_TOKEN 则同时加 `X-Proxy-Token` 头）。

## 模型

默认 `gemini-2.5-flash`（氢队原用），可用请求体 `model` 字段覆盖，或用 Secret `GEMINI_MODEL` 全局覆盖。
