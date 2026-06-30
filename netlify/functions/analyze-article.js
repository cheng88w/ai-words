exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const article = String(body.article || "").trim();

    if (!article) {
      return json(400, { error: "empty_article", message: "请先粘贴英文文章。" });
    }

    if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.includes("replace_with")) {
      return json(400, {
        error: "missing_api_key",
        message: "还没有配置 DeepSeek API Key。请在 Netlify 环境变量里添加 DEEPSEEK_API_KEY。"
      });
    }

    const result = await callDeepSeek(article);
    return json(200, result);
  } catch (error) {
    return json(500, {
      error: "deepseek_request_failed",
      message: error.message || "DeepSeek 请求失败。"
    });
  }
};

async function callDeepSeek(article) {
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是一个面向中文 AI 初学者的英文文章翻译和术语学习助手。",
            "请只输出合法 JSON，不要输出 Markdown。",
            "JSON 顶层必须包含 translation 和 terms。",
            "terms 最大 12 个，优先选择 AI 学习中真正重要的英文术语。"
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
            '      "related": ["相关词", "相关词"]',
            "    }",
            "  ]",
            "}",
            "",
            "英文文章：",
            article
          ].join("\n")
        }
      ]
    })
  });

  const data = await response.text();
  if (!response.ok) {
    throw new Error(`DeepSeek 返回 ${response.status}: ${data.slice(0, 300)}`);
  }

  const apiResult = JSON.parse(data);
  const content = apiResult.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek 没有返回正文。");

  return normalizeAiResult(JSON.parse(content));
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

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}
