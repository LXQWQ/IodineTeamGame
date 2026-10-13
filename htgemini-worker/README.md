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
#     粘贴：你自己的 Gemini API Key
#     ⚠️ 历史事故：旧 key（AIzaSyBnp…tabQ）曾被明文提交进本文件并公开于仓库，
#        Google 已标记 leaked 并撤销。请到 Google Cloud Console **删除**该 key，
#        新建一个并加上 HTTP referrer / API 限制与配额上限。

# 4. 防滥用令牌 —— **必填**（本 Worker 现在 fail-closed：未配置则拒绝服务）
npx wrangler secret put PROXY_TOKEN
#     粘贴：任意高强度随机串（如：htg-<32位随机>）
#     注意：碘队主 Worker 也必须配置**同一个值**，否则 Gemini 路径会 401：
#       cd deploy && npx wrangler secret put PROXY_TOKEN
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
