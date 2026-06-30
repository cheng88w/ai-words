const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

loadEnv();

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/config-status") {
    sendJson(res, 200, getConfigStatus());
    return;
  }

  if (req.method === "POST" && req.url === "/api/save-config") {
    await handleSaveConfig(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/analyze-article") {
    await handleAnalyzeArticle(req, res);
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  const urlPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.normalize(path.join(root, urlPath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("not found");
      return;
    }

    res.writeHead(200, {
      "content-type": types[path.extname(filePath)] || "application/octet-stream"
    });
    res.end(data);
  });
});

server.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`AI vocab app running at http://${displayHost}:${port}/`);
});

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] == null) process.env[key] = value;
  });
}

function getConfigStatus() {
  const key = process.env.DEEPSEEK_API_KEY || "";
  const configured = Boolean(key && !key.includes("replace_with") && key.length >= 20);
  return {
    configured,
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    keyHint: configured && !isProduction ? `${key.slice(0, 3)}***${key.slice(-4)}` : ""
  };
}

async function handleSaveConfig(req, res) {
  try {
    if (isProduction || !isLocalRequest(req)) {
      sendJson(res, 403, {
        error: "local_only",
        message: "线上版本不能通过网页保存 API Key，请在部署平台的环境变量里配置。"
      });
      return;
    }

    const body = await readJson(req);
    const apiKey = String(body.apiKey || "").trim();
    const model = String(body.model || "deepseek-chat").trim() || "deepseek-chat";

    if (!apiKey.startsWith("sk-") || apiKey.length < 20) {
      sendJson(res, 400, { error: "invalid_key", message: "Key 格式看起来不对，应该以 sk- 开头。" });
      return;
    }

    const envContent = `DEEPSEEK_API_KEY=${apiKey}\nDEEPSEEK_MODEL=${model}\n`;
    fs.writeFileSync(path.join(root, ".env"), envContent, "utf8");
    process.env.DEEPSEEK_API_KEY = apiKey;
    process.env.DEEPSEEK_MODEL = model;

    sendJson(res, 200, {
      ok: true,
      message: "配置已保存。现在可以去文章解析里测试 DeepSeek。",
      status: getConfigStatus()
    });
  } catch (error) {
    sendJson(res, 500, { error: "save_config_failed", message: error.message || "保存配置失败。" });
  }
}

function isLocalRequest(req) {
  const address = req.socket.remoteAddress || "";
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address);
}

async function handleAnalyzeArticle(req, res) {
  try {
    const body = await readJson(req);
    const article = String(body.article || "").trim();
    if (!article) {
      sendJson(res, 400, { error: "empty_article", message: "请先粘贴英文文章。" });
      return;
    }

    if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.includes("replace_with")) {
      sendJson(res, 400, {
        error: "missing_api_key",
        message: "还没有配置 DeepSeek API Key。请把新 Key 填进 .env 后重启服务。"
      });
      return;
    }

    const result = await callDeepSeek(article);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 500, {
      error: "deepseek_request_failed",
      message: error.message || "DeepSeek 请求失败。"
    });
  }
}

function callDeepSeek(article) {
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const payload = JSON.stringify({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "你是一个面向中文 AI 初学者的英文文章翻译和术语学习助手。",
          "请只输出合法 JSON，不要输出 Markdown。",
          "JSON 顶层必须包含 translation 和 terms。",
          "terms 最多 12 个，优先选择 AI 学习中真正重要的英文术语。"
        ].join("\n")
      },
      {
        role: "user",
        content: [
          "请分析下面这篇英文 AI 文章，输出 JSON：",
          "{",
          '  "translation": "完整中文翻译",',
          '  "terms": [',
          "    {",
          '      "term": "英文术语",',
          '      "translation": "中文翻译",',
          '      "category": "大模型/机器学习/深度学习/论文表达/工程实践/代码报错",',
          '      "meaning": "AI 语境含义",',
          '      "simple": "给 0 基础小白的通俗解释",',
          '      "example": "来自原文或贴近原文的英文例句",',
          '      "exampleZh": "例句中文翻译",',
          '      "confusion": "易混淆点",',
          '      "related": ["相关词1", "相关词2"]',
          "    }",
          "  ]",
          "}",
          "",
          "英文文章：",
          article
        ].join("\n")
      }
    ]
  });

  const options = {
    hostname: "api.deepseek.com",
    path: "/chat/completions",
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "content-length": Buffer.byteLength(payload)
    },
    timeout: 60000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`DeepSeek 返回 ${res.statusCode}: ${data.slice(0, 300)}`));
          return;
        }

        try {
          const apiResult = JSON.parse(data);
          const content = apiResult.choices?.[0]?.message?.content;
          if (!content) throw new Error("DeepSeek 没有返回正文。");
          resolve(normalizeAiResult(JSON.parse(content)));
        } catch (error) {
          reject(new Error(`解析 DeepSeek 返回失败：${error.message}`));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("DeepSeek 请求超时。"));
    });
    req.write(payload);
    req.end();
  });
}

function normalizeAiResult(result) {
  return {
    translation: String(result.translation || ""),
    terms: Array.isArray(result.terms)
      ? result.terms.slice(0, 12).map((term) => ({
          term: String(term.term || "").trim(),
          translation: String(term.translation || "").trim(),
          category: String(term.category || "文章词汇").trim(),
          difficulty: "ai",
          meaning: String(term.meaning || "").trim(),
          simple: String(term.simple || "").trim(),
          example: String(term.example || "").trim(),
          exampleZh: String(term.exampleZh || "").trim(),
          confusion: String(term.confusion || "").trim(),
          related: Array.isArray(term.related) ? term.related.map(String).slice(0, 5) : []
        })).filter((term) => term.term)
      : []
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 120000) {
        reject(new Error("文章太长了，请先粘贴短一点的内容。"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(new Error("请求 JSON 格式错误。"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(data)
  });
  res.end(data);
}
