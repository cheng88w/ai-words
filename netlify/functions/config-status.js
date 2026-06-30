exports.handler = async () => {
  const key = process.env.DEEPSEEK_API_KEY || "";
  const configured = Boolean(key && !key.includes("replace_with") && key.length >= 20);

  return json(200, {
    configured,
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    keyHint: ""
  });
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}
