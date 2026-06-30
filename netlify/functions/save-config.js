exports.handler = async () => json(403, {
  error: "local_only",
  message: "网页版不能在页面里保存 API Key，请在 Netlify 的环境变量里配置。"
});

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  };
}
