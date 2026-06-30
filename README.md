# AI 单词本

一个面向 AI 初学者的英文术语学习与每日打卡工具。

## 当前功能

- 每日 AI 术语学习，包含新词和到期复习词
- 单词详情：中文翻译、AI 语境、通俗解释、例句、易混淆点、相关词
- 今日小测与学习打卡
- AI 词库搜索与分类筛选
- 文章解析：粘贴英文 AI 文章，生成中文翻译，并识别核心术语
- 候选词入库：从文章中选择核心词，一键加入自己的知识库
- 本地学习记录：学习进度、打卡记录和自定义词条保存在浏览器 localStorage

## 本地运行

1. 复制 `.env.example` 为 `.env`。
2. 在 `.env` 里填写你的 DeepSeek Key：

```txt
DEEPSEEK_API_KEY=sk-your-key
DEEPSEEK_MODEL=deepseek-chat
```

3. 启动服务：

```bash
npm start
```

4. 打开：

```txt
http://127.0.0.1:8080/
```

## 部署到 Netlify

这个项目已经支持 Netlify。前端页面由 Netlify 托管，DeepSeek 请求通过 Netlify Functions 在服务端执行。

1. 把代码推送到 GitHub。
2. 打开 Netlify，选择 `Add new site` -> `Import an existing project`。
3. 选择这个 GitHub 仓库。
4. 构建设置保持默认即可：
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
5. 在 Netlify 的 `Site configuration` -> `Environment variables` 添加：

```txt
DEEPSEEK_API_KEY=sk-your-key
DEEPSEEK_MODEL=deepseek-chat
NODE_ENV=production
```

6. 部署完成后，打开 Netlify 给你的网址即可使用。

## 重要提醒

不要把 DeepSeek API Key 发到聊天、截图、仓库或公开网页里。

本地 `.env` 已经被 `.gitignore` 忽略，不会进入 Git 提交。网页版请在 Netlify 环境变量中配置 Key，不要写进前端代码。

## 数据说明

内置词库在 `words.js` 中。

网页里加入知识库的词条、学习记录、打卡记录会保存在当前浏览器的 `localStorage` 中。换浏览器或清理浏览器数据后，这些本地记录不会自动同步。
