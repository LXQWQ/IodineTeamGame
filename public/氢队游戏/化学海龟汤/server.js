/**
 * 化学海龟汤 · 月见八千代 — 本地开发服务器
 *
 * 功能：
 * 1. 托管静态文件（index.html + assets/）
 * 2. 代理 /api/* 请求到 hteamgame.com（绕过 CORS）
 *
 * 启动：node server.js
 * 默认端口：3456
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3456;
const TARGET_HOST = "hteamgame.com";
const STATIC_DIR = __dirname;

// MIME 类型映射
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function serveStatic(req, res) {
  let filePath = req.url.split("?")[0];
  if (filePath === "/") filePath = "/index.html";

  const fullPath = path.join(STATIC_DIR, filePath);

  // 安全检查：防止目录穿越
  if (!fullPath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function proxyApi(req, res) {
  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: req.url,
    method: req.method,
    headers: {
      "Content-Type": req.headers["content-type"] || "application/json",
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; YachiyoProxy/1.0)",
      // 转发可能的 cookie/session 头
      ...(req.headers.cookie ? { "Cookie": req.headers.cookie } : {}),
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // 允许跨域
    res.writeHead(proxyRes.statusCode, {
      "Content-Type": proxyRes.headers["content-type"] || "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error(`[proxy error] ${req.url}:`, err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: "Proxy error", detail: err.message }));
  });

  if (req.method === "POST" || req.method === "PUT") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => proxyReq.end(body));
  } else {
    proxyReq.end();
  }
}

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);

  // OPTIONS 预检
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // API 请求代理到 hteamgame.com
  if (req.url.startsWith("/api/")) {
    proxyApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log("═══════════════════════════════════════════════");
  console.log("  🐢 化学海龟汤 · 月见八千代  本地服务器");
  console.log("═══════════════════════════════════════════════");
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  API代理: /api/* → https://${TARGET_HOST}`);
  console.log(`  按 Ctrl+C 停止服务器`);
  console.log("═══════════════════════════════════════════════");
});
