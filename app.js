const STORAGE_KEY = "ai-vocab-progress-v2";
const TODAY_KEY = "ai-vocab-today-v2";
const CUSTOM_WORDS_KEY = "ai-vocab-custom-words-v1";

const TERM_HINTS = [
  "self-attention", "attention", "transformer", "embedding", "tokenizer", "token",
  "context window", "prompt", "completion", "inference", "training", "fine-tuning",
  "pretraining", "alignment", "hallucination", "rag", "retrieval", "agent",
  "tool use", "function calling", "benchmark", "dataset", "label", "feature",
  "parameter", "hyperparameter", "loss", "gradient", "optimizer", "epoch", "batch",
  "overfitting", "generalization", "classification", "regression", "accuracy",
  "precision", "recall", "neural network", "activation", "backpropagation",
  "vector database", "semantic search", "instruction tuning", "rlhf", "ablation",
  "state-of-the-art", "robust", "scalable", "latency", "throughput"
];

const PHRASE_TRANSLATIONS = [
  ["large language model", "大语言模型"],
  ["language model", "语言模型"],
  ["self-attention", "自注意力机制"],
  ["context window", "上下文窗口"],
  ["fine-tuning", "微调"],
  ["vector database", "向量数据库"],
  ["semantic search", "语义搜索"],
  ["function calling", "函数调用"],
  ["tool use", "工具使用"],
  ["state-of-the-art", "当前最佳水平"],
  ["neural network", "神经网络"],
  ["training data", "训练数据"],
  ["private documents", "私有文档"],
  ["retrieval augmented generation", "检索增强生成"]
];

let customWords = loadCustomWords();
let allWords = mergeWords();
const state = loadState();
let today = loadToday();
let quizWord = null;
let articleCandidates = [];

const els = {
  viewTitle: document.querySelector("#viewTitle"),
  streakCount: document.querySelector("#streakCount"),
  sessionSummary: document.querySelector("#sessionSummary"),
  todayWords: document.querySelector("#todayWords"),
  learnedToday: document.querySelector("#learnedToday"),
  todayTotal: document.querySelector("#todayTotal"),
  quizStatus: document.querySelector("#quizStatus"),
  checkinStatus: document.querySelector("#checkinStatus"),
  checkinButton: document.querySelector("#checkinButton"),
  refreshToday: document.querySelector("#refreshToday"),
  quizQuestion: document.querySelector("#quizQuestion"),
  quizOptions: document.querySelector("#quizOptions"),
  quizFeedback: document.querySelector("#quizFeedback"),
  articleInput: document.querySelector("#articleInput"),
  analyzeArticle: document.querySelector("#analyzeArticle"),
  clearArticle: document.querySelector("#clearArticle"),
  articleWordCount: document.querySelector("#articleWordCount"),
  articleTermCount: document.querySelector("#articleTermCount"),
  articleNewCount: document.querySelector("#articleNewCount"),
  translationOutput: document.querySelector("#translationOutput"),
  articleTerms: document.querySelector("#articleTerms"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  libraryGrid: document.querySelector("#libraryGrid"),
  openSettings: document.querySelector("#openSettings"),
  closeSettings: document.querySelector("#closeSettings"),
  settingsDialog: document.querySelector("#settingsDialog"),
  apiConfigForm: document.querySelector("#apiConfigForm"),
  deepseekApiKey: document.querySelector("#deepseekApiKey"),
  deepseekModel: document.querySelector("#deepseekModel"),
  checkApiConfig: document.querySelector("#checkApiConfig"),
  apiConfigStatus: document.querySelector("#apiConfigStatus"),
  totalLearned: document.querySelector("#totalLearned"),
  masteredCount: document.querySelector("#masteredCount"),
  reviewDueCount: document.querySelector("#reviewDueCount"),
  accuracyRate: document.querySelector("#accuracyRate"),
  categoryProgress: document.querySelector("#categoryProgress"),
  dialog: document.querySelector("#wordDialog")
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : { learned: {}, checkins: [], streak: 0, quiz: { correct: 0, total: 0 } };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadCustomWords() {
  const saved = localStorage.getItem(CUSTOM_WORDS_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveCustomWords() {
  localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(customWords));
}

function mergeWords() {
  const customTerms = new Set(customWords.map((word) => word.term.toLowerCase()));
  return [...customWords, ...WORDS.filter((word) => !customTerms.has(word.term.toLowerCase()))];
}

function loadToday() {
  const saved = localStorage.getItem(TODAY_KEY);
  const date = todayString();
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.date === date) return parsed;
  }
  const fresh = createTodaySession(date);
  localStorage.setItem(TODAY_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveToday() {
  localStorage.setItem(TODAY_KEY, JSON.stringify(today));
}

function createTodaySession(date) {
  const due = getDueReviewWords(date).slice(0, 3);
  const dueTerms = new Set(due.map((word) => word.term));
  const unseen = allWords.filter((word) => !state.learned[word.term] && !dueTerms.has(word.term)).slice(0, 5 - due.length);
  const selected = [...due, ...unseen].slice(0, 5);
  return { date, words: selected.map((word) => word.term), reviewTerms: due.map((word) => word.term), learnedTerms: [], quizDone: false, checkedIn: false };
}

function getDueReviewWords(date = todayString()) {
  return allWords
    .filter((word) => {
      const record = state.learned[word.term];
      return record && (record.dueAt <= date || record.wrong > 0);
    })
    .sort((a, b) => {
      const aRecord = state.learned[a.term];
      const bRecord = state.learned[b.term];
      return bRecord.wrong - aRecord.wrong || aRecord.dueAt.localeCompare(bRecord.dueAt);
    });
}

function getWord(term) {
  return allWords.find((word) => word.term.toLowerCase() === term.toLowerCase());
}

function renderToday() {
  today.words = today.words.filter((term) => getWord(term));
  els.todayWords.innerHTML = today.words.map(renderTodayWord).join("");
  const reviewCount = today.reviewTerms.filter((term) => today.words.includes(term)).length;
  const newCount = today.words.length - reviewCount;
  els.sessionSummary.innerHTML = `<span class="tag">新词 ${newCount}</span><span class="tag">复习 ${reviewCount}</span><span class="tag">今日共 ${today.words.length}</span>`;
  els.learnedToday.textContent = today.learnedTerms.length;
  els.todayTotal.textContent = today.words.length;
  els.quizStatus.textContent = today.quizDone ? "已完成" : "未完成";
  els.checkinStatus.textContent = today.checkedIn ? "已完成" : "未完成";
  els.checkinButton.disabled = today.checkedIn;
  els.checkinButton.textContent = today.checkedIn ? "今天已打卡" : "完成今日打卡";
  renderQuiz();
  updateTopStats();
}

function renderTodayWord(term) {
  const word = getWord(term);
  const learned = today.learnedTerms.includes(term);
  const isReview = today.reviewTerms.includes(term);
  const record = state.learned[term];
  const meta = isReview && record ? `复习 · 已学 ${record.count} 次` : "新词";
  return `
    <article class="word-card">
      <div>
        <div class="word-title">
          <h4>${word.term}</h4>
          <span class="translation">${word.translation}</span>
          <span class="tag">${word.category}</span>
          <span class="tag alt">${meta}</span>
        </div>
        <p>${word.simple}</p>
      </div>
      <div class="actions">
        <button class="small-button" data-detail="${word.term}">详情</button>
        <button class="small-button ${learned ? "learned" : ""}" data-learn="${word.term}">${learned ? "已完成" : "认识了"}</button>
      </div>
    </article>`;
}

function renderQuiz() {
  if (today.learnedTerms.length === 0) {
    els.quizQuestion.textContent = "先学习单词，再开始小测";
    els.quizOptions.innerHTML = "";
    return;
  }
  if (!quizWord || !today.learnedTerms.includes(quizWord.term)) quizWord = getWord(today.learnedTerms[0]);
  els.quizQuestion.textContent = `"${quizWord.term}" 在 AI 语境里更接近哪种含义？`;
  const wrongOptions = allWords.filter((word) => word.term !== quizWord.term).slice(0, 3).map((word) => word.translation);
  els.quizOptions.innerHTML = shuffle([quizWord.translation, ...wrongOptions]).map((option) => `<button data-answer="${option}">${option}</button>`).join("");
}

async function analyzeArticle() {
  const text = els.articleInput.value.trim();
  if (!text) {
    els.translationOutput.textContent = "请先粘贴一篇英文文章。";
    return;
  }

  setArticleLoading("正在调用 DeepSeek 翻译和提取术语...");
  try {
    const result = await analyzeArticleWithAi(text);
    articleCandidates = result.terms.map(normalizeArticleWord);
    renderAiTranslation(result.translation);
    renderArticleTerms();
    updateArticleStats(text, articleCandidates);
    return;
  } catch (error) {
    setArticleNotice(`DeepSeek 暂时不可用，已切换到本地规则解析。原因：${error.message}`);
  }

  const terms = extractArticleTerms(text);
  articleCandidates = terms.map((term) => buildWordFromArticle(term, text));
  renderArticleTranslation(text, terms);
  renderArticleTerms();
  updateArticleStats(text, articleCandidates);
}

async function analyzeArticleWithAi(text) {
  const response = await fetch("/api/analyze-article", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ article: text })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "AI 请求失败");
  if (!data.translation || !Array.isArray(data.terms)) throw new Error("AI 返回格式不完整");
  return data;
}

function normalizeArticleWord(word) {
  return {
    term: String(word.term || "").trim(),
    translation: String(word.translation || "").trim() || `${word.term}（待确认）`,
    category: String(word.category || "文章词汇").trim(),
    difficulty: word.difficulty || "ai",
    meaning: String(word.meaning || "").trim(),
    simple: String(word.simple || "").trim(),
    example: String(word.example || "").trim(),
    exampleZh: String(word.exampleZh || "").trim(),
    confusion: String(word.confusion || "").trim(),
    related: Array.isArray(word.related) ? word.related : []
  };
}

function updateArticleStats(text, candidates) {
  els.articleWordCount.textContent = (text.match(/[A-Za-z]+/g) || []).length;
  els.articleTermCount.textContent = candidates.length;
  els.articleNewCount.textContent = candidates.filter((word) => !getWord(word.term)).length;
}

function setArticleLoading(message) {
  els.translationOutput.className = "translation-output empty-state";
  els.translationOutput.textContent = message;
  els.articleTerms.className = "term-candidate-grid empty-state";
  els.articleTerms.textContent = "正在生成核心词汇...";
}

function setArticleNotice(message) {
  els.translationOutput.className = "translation-output empty-state";
  els.translationOutput.textContent = message;
}

function renderAiTranslation(translation) {
  els.translationOutput.classList.remove("empty-state");
  els.translationOutput.innerHTML = `<article class="translation-line"><strong>${escapeHtml(translation)}</strong></article>`;
}

function extractArticleTerms(text) {
  const lower = text.toLowerCase();
  const fromHints = TERM_HINTS.filter((term) => lower.includes(term));
  const fromKnown = allWords.filter((word) => lower.includes(word.term.toLowerCase())).map((word) => word.term);
  return [...new Set([...fromHints, ...fromKnown])].slice(0, 18);
}

function renderArticleTranslation(text, terms) {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 40);

  els.translationOutput.classList.remove("empty-state");
  els.translationOutput.innerHTML = sentences.map((sentence) => {
    const draft = translateSentenceDraft(sentence, terms);
    return `<article class="translation-line"><p>${sentence}</p><strong>${draft}</strong></article>`;
  }).join("");
}

function translateSentenceDraft(sentence, terms) {
  let translated = sentence;
  PHRASE_TRANSLATIONS.forEach(([en, zh]) => {
    translated = translated.replace(new RegExp(en, "gi"), zh);
  });
  terms.forEach((term) => {
    const word = getWord(term) || articleCandidates.find((item) => item.term.toLowerCase() === term.toLowerCase());
    if (word) translated = translated.replace(new RegExp(escapeRegExp(term), "gi"), `${term}（${word.translation}）`);
  });
  return `初译：${translated}`;
}

function renderArticleTerms() {
  if (articleCandidates.length === 0) {
    els.articleTerms.className = "term-candidate-grid empty-state";
    els.articleTerms.textContent = "这篇文章里暂时没有识别到内置 AI 术语。";
    return;
  }
  els.articleTerms.className = "term-candidate-grid";
  els.articleTerms.innerHTML = articleCandidates.map((word) => {
    const exists = Boolean(getWord(word.term));
    return `
      <article class="term-candidate">
        <div>
          <span class="tag">${word.category}</span>
          ${exists ? '<span class="tag alt">已在词库</span>' : '<span class="tag alt">可添加</span>'}
        </div>
        <h4>${word.term}</h4>
        <p class="translation">${word.translation}</p>
        <p>${word.simple}</p>
        <div class="actions">
          <button class="small-button" data-preview-term="${word.term}">预览</button>
          <button class="small-button ${exists ? "learned" : ""}" data-add-candidate="${word.term}" ${exists ? "disabled" : ""}>${exists ? "已添加" : "加入知识库"}</button>
        </div>
      </article>`;
  }).join("");
}

function buildWordFromArticle(term, articleText) {
  const existing = getWord(term);
  if (existing) return existing;
  const example = findExampleSentence(term, articleText);
  return {
    term,
    translation: guessTranslation(term),
    category: guessCategory(term),
    difficulty: "article",
    meaning: `${term} 是从你粘贴的文章中识别出的 AI 相关表达，建议结合原文语境学习。`,
    simple: `先把它理解为文章里的关键 AI 词：${guessTranslation(term)}。`,
    example,
    exampleZh: translateSentenceDraft(example, [term]),
    confusion: "这是从文章上下文自动生成的词条，后续可以用 AI 进一步润色和校对。",
    related: relatedFor(term)
  };
}

function guessTranslation(term) {
  const known = {
    rag: "检索增强生成", retrieval: "检索", benchmark: "基准测试", ablation: "消融实验",
    robust: "稳健的", scalable: "可扩展的", latency: "延迟", throughput: "吞吐量",
    pretraining: "预训练", rlhf: "基于人类反馈的强化学习"
  };
  return known[term.toLowerCase()] || `${term}（待确认）`;
}

function guessCategory(term) {
  const t = term.toLowerCase();
  if (["rag", "retrieval", "agent", "prompt", "completion", "hallucination", "alignment"].includes(t)) return "大模型";
  if (["benchmark", "ablation", "robust", "scalable"].includes(t)) return "论文表达";
  if (["latency", "throughput"].includes(t)) return "工程实践";
  return "文章词汇";
}

function findExampleSentence(term, text) {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).find((sentence) => sentence.toLowerCase().includes(term.toLowerCase())) || term;
}

function relatedFor(term) {
  const t = term.toLowerCase();
  if (t.includes("retrieval") || t === "rag") return ["embedding", "vector database", "context"];
  if (t.includes("agent")) return ["tool use", "planning", "function calling"];
  if (t.includes("attention")) return ["transformer", "token", "embedding"];
  return [];
}

function addCandidate(term) {
  const word = articleCandidates.find((item) => item.term.toLowerCase() === term.toLowerCase());
  if (!word || getWord(word.term)) return;
  customWords = [word, ...customWords];
  saveCustomWords();
  allWords = mergeWords();
  today = createTodaySession(todayString());
  saveToday();
  setupCategoryFilter();
  renderArticleTerms();
  renderToday();
  renderLibrary();
  renderProgress();
}

function renderLibrary() {
  const keyword = els.searchInput.value.trim().toLowerCase();
  const category = els.categoryFilter.value;
  const words = allWords.filter((word) => {
    const matchesCategory = category === "all" || word.category === category;
    const text = `${word.term} ${word.translation} ${word.category} ${word.meaning} ${word.simple}`.toLowerCase();
    return matchesCategory && text.includes(keyword);
  });
  els.libraryGrid.innerHTML = words.map(renderLibraryWord).join("");
}

function renderLibraryWord(word) {
  const isCustom = customWords.some((item) => item.term === word.term);
  return `
    <article class="library-card">
      <span class="tag">${word.category}</span>
      ${isCustom ? '<span class="tag alt">我的词条</span>' : ""}
      <div class="word-title"><h4>${word.term}</h4><span class="translation">${word.translation}</span></div>
      <p>${word.simple}</p>
      <button class="small-button" data-detail="${word.term}">查看词条</button>
    </article>`;
}

async function checkApiConfig() {
  try {
    const response = await fetch("/api/config-status");
    const data = await response.json();
    els.apiConfigStatus.textContent = data.configured
      ? `已配置：${data.keyHint}，模型：${data.model}`
      : "还没有配置有效的 DeepSeek Key。";
    if (data.model) els.deepseekModel.value = data.model;
  } catch (error) {
    els.apiConfigStatus.textContent = `检查失败：${error.message}`;
  }
}

async function saveApiConfig(event) {
  event.preventDefault();
  const apiKey = els.deepseekApiKey.value.trim();
  const model = els.deepseekModel.value.trim() || "deepseek-chat";
  els.apiConfigStatus.textContent = "正在保存...";

  try {
    const response = await fetch("/api/save-config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKey, model })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "保存失败");
    els.deepseekApiKey.value = "";
    els.apiConfigStatus.textContent = data.message;
  } catch (error) {
    els.apiConfigStatus.textContent = `保存失败：${error.message}`;
  }
}

function renderProgress() {
  const learnedTerms = Object.keys(state.learned);
  const mastered = learnedTerms.filter((term) => state.learned[term].count >= 3 && state.learned[term].wrong === 0).length;
  const accuracy = state.quiz.total ? Math.round((state.quiz.correct / state.quiz.total) * 100) : 0;
  els.totalLearned.textContent = learnedTerms.length;
  els.masteredCount.textContent = mastered;
  els.reviewDueCount.textContent = getDueReviewWords().length;
  els.accuracyRate.textContent = `${accuracy}%`;
  const categories = [...new Set(allWords.map((word) => word.category))];
  els.categoryProgress.innerHTML = categories.map((category) => {
    const all = allWords.filter((word) => word.category === category);
    const learned = all.filter((word) => state.learned[word.term]).length;
    const percent = Math.round((learned / all.length) * 100);
    return `<div class="progress-row"><strong>${category}</strong><div class="bar"><span style="width:${percent}%"></span></div><span>${learned}/${all.length}</span></div>`;
  }).join("");
}

function updateTopStats() {
  els.streakCount.textContent = state.streak;
}

function setupCategoryFilter() {
  const selected = els.categoryFilter.value;
  const categories = [...new Set(allWords.map((word) => word.category))];
  els.categoryFilter.innerHTML = '<option value="all">全部分类</option>';
  els.categoryFilter.innerHTML += categories.map((category) => `<option value="${category}">${category}</option>`).join("");
  els.categoryFilter.value = categories.includes(selected) ? selected : "all";
}

function markLearned(term) {
  if (!today.learnedTerms.includes(term)) today.learnedTerms.push(term);
  const record = state.learned[term] || { count: 0, wrong: 0, firstLearnedAt: todayString(), dueAt: todayString() };
  record.count += 1;
  record.lastLearnedAt = todayString();
  record.dueAt = nextDueDate(record);
  state.learned[term] = record;
  saveToday();
  saveState();
  renderToday();
  renderProgress();
}

function nextDueDate(record) {
  const intervals = [1, 2, 4, 7, 15];
  return addDays(todayString(), intervals[Math.min(record.count - 1, intervals.length - 1)]);
}

function completeCheckin() {
  if (today.learnedTerms.length < today.words.length || !today.quizDone) {
    els.quizFeedback.textContent = "先完成学习清单并通过小测，再打卡。";
    return;
  }
  if (!state.checkins.includes(today.date)) {
    state.checkins.push(today.date);
    state.streak = calculateStreak(state.checkins);
  }
  today.checkedIn = true;
  saveToday();
  saveState();
  renderToday();
  renderProgress();
}

function calculateStreak(checkins) {
  const dates = new Set(checkins);
  let count = 0;
  const cursor = new Date();
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function answerQuiz(answer) {
  const correct = answer === quizWord.translation;
  const record = state.learned[quizWord.term] || { count: 0, wrong: 0, firstLearnedAt: todayString(), dueAt: todayString() };
  state.quiz.total += 1;
  if (correct) {
    state.quiz.correct += 1;
    record.wrong = Math.max(0, record.wrong - 1);
    record.dueAt = nextDueDate(record);
    today.quizDone = true;
    els.quizFeedback.textContent = "答对了，可以打卡。";
  } else {
    record.wrong += 1;
    record.dueAt = todayString();
    els.quizFeedback.textContent = `再想想：${quizWord.term} 是 ${quizWord.translation}。它会优先进入复习。`;
  }
  state.learned[quizWord.term] = record;
  saveState();
  saveToday();
  renderToday();
  renderProgress();
}

function showDetail(term) {
  const word = getWord(term) || articleCandidates.find((item) => item.term.toLowerCase() === term.toLowerCase());
  document.querySelector("#dialogCategory").textContent = `${word.category} · ${word.difficulty}`;
  document.querySelector("#dialogTerm").textContent = word.term;
  document.querySelector("#dialogTranslation").textContent = word.translation;
  document.querySelector("#dialogMeaning").textContent = word.meaning;
  document.querySelector("#dialogSimple").textContent = word.simple;
  document.querySelector("#dialogExample").textContent = word.example;
  document.querySelector("#dialogExampleZh").textContent = word.exampleZh;
  document.querySelector("#dialogConfusion").textContent = word.confusion;
  document.querySelector("#dialogRelated").innerHTML = word.related.map((item) => `<span class="tag">${item}</span>`).join("");
  els.dialog.showModal();
}

function clearArticle() {
  els.articleInput.value = "";
  articleCandidates = [];
  els.articleWordCount.textContent = "0";
  els.articleTermCount.textContent = "0";
  els.articleNewCount.textContent = "0";
  els.translationOutput.className = "translation-output empty-state";
  els.translationOutput.textContent = "粘贴文章后，这里会按句展示中文初译。";
  els.articleTerms.className = "term-candidate-grid empty-state";
  els.articleTerms.textContent = "解析后会出现可加入知识库的核心术语。";
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function shuffle(items) {
  return items.map((value) => ({ value, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map((item) => item.value);
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-view]");
  if (tab) {
    document.querySelectorAll(".nav-tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.view}View`).classList.add("active");
    els.viewTitle.textContent = tab.textContent;
    renderLibrary();
    renderProgress();
  }
  const detail = event.target.closest("[data-detail], [data-preview-term]");
  if (detail) showDetail(detail.dataset.detail || detail.dataset.previewTerm);
  const learn = event.target.closest("[data-learn]");
  if (learn) markLearned(learn.dataset.learn);
  const answer = event.target.closest("[data-answer]");
  if (answer) answerQuiz(answer.dataset.answer);
  const addCandidateButton = event.target.closest("[data-add-candidate]");
  if (addCandidateButton) addCandidate(addCandidateButton.dataset.addCandidate);
});

els.refreshToday.addEventListener("click", () => {
  today = createTodaySession(todayString());
  quizWord = null;
  saveToday();
  renderToday();
});
els.checkinButton.addEventListener("click", completeCheckin);
els.searchInput.addEventListener("input", renderLibrary);
els.categoryFilter.addEventListener("change", renderLibrary);
els.openSettings.addEventListener("click", () => {
  els.settingsDialog.showModal();
  checkApiConfig();
});
els.closeSettings.addEventListener("click", () => els.settingsDialog.close());
els.apiConfigForm.addEventListener("submit", saveApiConfig);
els.checkApiConfig.addEventListener("click", checkApiConfig);
els.analyzeArticle.addEventListener("click", analyzeArticle);
els.clearArticle.addEventListener("click", clearArticle);
document.querySelector("#closeDialog").addEventListener("click", () => els.dialog.close());

setupCategoryFilter();
renderToday();
renderLibrary();
renderProgress();
checkApiConfig();
