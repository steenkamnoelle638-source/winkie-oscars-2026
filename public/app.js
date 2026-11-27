const pagesMode = location.hostname.endsWith(".github.io");
const pagesPrefix = pagesMode ? `/${location.pathname.split("/").filter(Boolean)[0] || "winkie-oscars-2026"}` : "";
const routePath = () => {
  if (pagesMode && location.hash) return location.hash.slice(1) || "/";
  const path = location.pathname;
  return pagesPrefix && path.startsWith(pagesPrefix) ? path.slice(pagesPrefix.length) || "/" : path;
};
const routePage = () => routePath() === "/" ? "home" : routePath().replace(/^\//, "");
import { awardCategories, awardQuestions } from "./awards-data.js";
const staticData = {
  participants: [
    { id: "lian", name: "Lian Jacobs", shortName: "Lian", role: "Host", photo: "/images/person-1.webp", accent: "gold" },
    { id: "mieke", name: "Mieke Smit", shortName: "Mieke", role: "Co-host", photo: "/images/person-2.webp", accent: "coral" },
    { id: "jaco", name: "Jaco Nel", shortName: "Jaco", role: "Nominee", photo: "/images/person-3.webp", accent: "sage" },
    { id: "mia", name: "Mia Botha", shortName: "Mia", role: "Nominee", photo: "/images/person-4.webp", accent: "cream" },
    { id: "talia", name: "Talia Roos", shortName: "Talia", role: "Nominee", photo: "/images/person-5.webp", accent: "blue" },
    { id: "deelnemer6", name: "Deelnemer 6", shortName: "Deelnemer 6", role: "Nominee", photo: "", accent: "plum" },
    { id: "deelnemer7", name: "Deelnemer 7", shortName: "Deelnemer 7", role: "Nominee", photo: "", accent: "rose" },
  ],
  categories: awardCategories,
  questions: awardQuestions,
};
const state = {
  data: { participants: [], questions: [] },
  page: routePage(),
  voterId: localStorage.getItem("voterId") || "",
  rulesRead: localStorage.getItem("rulesRead") === "true",
  votes: JSON.parse(localStorage.getItem("votes") || "{}"),
  adminToken: sessionStorage.getItem("adminToken") || "",
  activeQuestion: 0,
  questionOrder: [],
  activeCategoryId: null,
  categoryPhase: "",
  completedCategoryIds: [],
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const person = (id) => state.data.participants.find((candidate) => candidate.id === id);
const currentUser = () => person(state.voterId);
function applyQuestionOrder(voterId) {
  if (!voterId) { state.questionOrder = []; return; }
  const questions = state.data.questions || [];
  const ids = questions.map((question) => question.id);
  const key = `winkieQuestionOrder:${voterId}`;
  let order;
  try { order = JSON.parse(localStorage.getItem(key) || "null"); } catch { order = null; }
  const valid = Array.isArray(order) && order.length === ids.length && new Set(order).size === ids.length && order.every((id) => ids.includes(id));
  if (!valid) {
    order = [...ids];
    for (let index = order.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [order[index], order[swap]] = [order[swap], order[index]];
    }
    localStorage.setItem(key, JSON.stringify(order));
  }
  state.questionOrder = order.map((id) => questions.find((question) => question.id === id));
}
const go = (path) => {
  const target = pagesMode ? `${pagesPrefix}/${path === "/" ? "" : `#${path}`}` : path;
  history.pushState({}, "", target);
  state.page = path === "/" ? "home" : path.slice(1);
  render();
};
const avatar = (p) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="#28231f"/><circle cx="80" cy="62" r="30" fill="#b99a66"/><path d="M23 160c5-39 26-58 57-58s52 19 57 58" fill="#b99a66"/><text x="80" y="150" text-anchor="middle" font-family="sans-serif" font-size="1">${String(p?.shortName || "?").slice(0, 2)}</text></svg>`)}`;
const photo = (p, alt = "") => {
  if (!p) return "";
  const source = pagesMode && p.photo?.startsWith("/") ? `${pagesPrefix}/public${p.photo}` : p.photo || avatar(p);
  return `<img src="${escapeHtml(source)}" onerror="this.onerror=null;this.src='${avatar(p)}'" alt="${escapeHtml(alt || p.name)}" />`;
};

function readLocalBallots() {
  try { return JSON.parse(localStorage.getItem("winkieBallots") || "{}"); }
  catch { return {}; }
}
function calculateLocalResults() {
  const ballots = readLocalBallots();
  const count = (questionId, candidateId) => Object.values(ballots).reduce((total, ballot) => total + (ballot[questionId] === candidateId ? 1 : 0), 0);
  const categories = staticData.categories.map((category) => {
    const questions = staticData.questions.filter((q) => q.mainCategoryId === category.id);
    const podium = staticData.participants.map((participant) => ({ participant, score: Math.round(questions.reduce((sum, question) => sum + count(question.id, participant.id) * question.weight, 0) * 10) / 10 })).sort((a, b) => b.score - a.score || a.participant.name.localeCompare(b.participant.name)).slice(0, 3);
    return { ...category, questions, podium };
  });
  const overall = staticData.participants.map((participant) => ({ participant, score: Math.round(staticData.questions.reduce((sum, question) => sum + count(question.id, participant.id) * question.weight, 0) * 10) / 10 })).sort((a, b) => b.score - a.score || a.participant.name.localeCompare(b.participant.name));
  const questionRankings = staticData.questions.map((question) => ({ question, rankings: staticData.participants.map((participant) => ({ participant, votes: count(question.id, participant.id) })).sort((a, b) => b.votes - a.votes || a.participant.name.localeCompare(b.participant.name)) }));
  return { categories, overall, questions: staticData.questions, participants: staticData.participants, questionRankings };
}

async function api(path, options = {}) {
  if (pagesMode) {
    const method = (options.method || "GET").toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    if (path === "/api/bootstrap") return staticData;
    if (path.startsWith("/api/votes/") && method === "GET") {
      const voterId = path.split("/").pop();
      return Object.entries(readLocalBallots()[voterId] || {}).map(([questionId, candidateId]) => ({ questionId, candidateId }));
    }
    if (path === "/api/votes" && method === "POST") {
      if (!staticData.participants.some((p) => p.id === body.voterId) || !staticData.questions.some((q) => q.id === body.questionId) || !staticData.participants.some((p) => p.id === body.candidateId)) throw new Error("Ongeldige stemkeuse.");
      if (body.voterId === body.candidateId) throw new Error("Jy kan nie vir jouself stem nie.");
      const ballots = readLocalBallots();
      ballots[body.voterId] = { ...(ballots[body.voterId] || {}), [body.questionId]: body.candidateId };
      localStorage.setItem("winkieBallots", JSON.stringify(ballots));
      return { ok: true, ...body };
    }
    if (path === "/api/admin/login" && method === "POST") {
      if (body.password !== "oscar2026") throw new Error("Verkeerde admin-wagwoord.");
      return { ok: true, token: "pages-local-demo" };
    }
    if (path === "/api/results") {
      if (options.headers?.["x-admin-token"] !== "pages-local-demo") throw new Error("Admin-aanmelding word vereis.");
      return calculateLocalResults();
    }
    if (path === "/api/rankings") return calculateLocalResults();
    throw new Error("Hierdie aksie is nie op GitHub Pages beskikbaar nie.");
  }
  const response = await fetch(path, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Iets het verkeerd geloop.");
  return body;
}

async function boot() {
  try {
    state.data = await api("/api/bootstrap");
    if (state.voterId) {
      applyQuestionOrder(state.voterId);
      const saved = await api(`/api/votes/${state.voterId}`);
      state.votes = Object.fromEntries(saved.map((vote) => [vote.questionId, vote.candidateId]));
      localStorage.setItem("votes", JSON.stringify(state.votes));
    }
  } catch (error) { console.error(error); }
  render();
}

function header() {
  const current = currentUser();
  const links = [["/", "Reëls"], ["/vote", "Stem"], ["/results", "Resultate"], ["/ranking", "Ranking"]];
  return `<header class="site-header"><button class="brand" data-nav="/"><span class="brand-mark">✦</span><span><strong>Vriende</strong><em>OSCARS</em></span></button><nav class="top-nav">${links.map(([href, label]) => `<button class="nav-link ${routePath() === href ? "active" : ""}" data-nav="${href}">${label}</button>`).join("")}</nav><div class="header-user">${current ? `${photo(current)}<span>${escapeHtml(current.shortName)}</span>` : "<span>Geen kieser</span>"}</div></header>`;
}
function footer() { return `<footer class="site-footer"><span>Vriende Oscars 2026</span><span class="footer-dot"></span><span>’n Klein aand. Groot menings.</span></footer>`; }
function shell(content) { return `<div class="app-shell">${header()}<main>${content}</main>${footer()}</div>`; }

function homePage() {
  const hosts = state.data.participants.filter((p) => p.role.toLowerCase().includes("host"));
  const host = hosts[0] || state.data.participants[0];
  const cohost = hosts[1] || state.data.participants[1];
  const rules = [["01", "Stem met jou hart", "Kies die persoon wat die titel die meeste verdien — nie noodwendig jou beste vriend nie."], ["02", "Geen selfstem", "Jou eie naam word outomaties uit elke vraag se opsies gehaal."], ["03", "Een kies per vraag", pagesMode ? "Op GitHub Pages word stemme net in hierdie blaaier gestoor." : "Jou keuse word dadelik in SQLite bewaar."]];
  return `<div class="page-wrap home-page"><section class="hero-grid"><div class="hero-copy"><div class="eyebrow"><span class="eyebrow-line"></span>A private awards night <span class="eyebrow-year">2026</span></div><h1>Die aand van<br><span>groot menings.</span></h1><p class="hero-lede">Welkom by die Vriende Oscars — waar die trofeë blink, die stemme geheim is, en niemand ooit heeltemal neutraal is nie.</p><div class="hero-actions"><button class="button button-primary" data-scroll="#choose">Kies jou naam <span>→</span></button><button class="text-action" data-nav="/results">◉ Wys resultate</button></div><div class="hero-meta"><span>♙ ${state.data.participants.length} kiesers</span><span class="meta-separator"></span><span>✦ ${state.data.questions.length} vrae</span><span class="meta-separator"></span><span>⌑ Geheime stem</span></div></div><div class="host-stage"><div class="stage-orbit orbit-one"></div><div class="stage-orbit orbit-two"></div><div class="stage-label">Tonight’s hosts</div><div class="host-portrait host-main">${photo(host, `${host?.name || "Host"}, host`)}<span class="portrait-tag">HOST</span></div><div class="host-portrait host-side">${photo(cohost, `${cohost?.name || "Co-host"}, co-host`)}<span class="portrait-tag">CO-HOST</span></div><div class="host-caption"><strong>${escapeHtml(host?.shortName || "Host")} <i>&</i> ${escapeHtml(cohost?.shortName || "Co-host")}</strong><span>Bring jou beste judgement.</span></div><div class="sparkle sparkle-a">✦</div><div class="sparkle sparkle-b">✦</div></div></section><section class="rules-board section-block"><div class="section-intro"><div><div class="eyebrow"><span class="eyebrow-line"></span>Cue sheet</div><h2>Voor die <em>rooi tapyt</em></h2></div><p>Drie eenvoudige reëls. Geen speeches langer as 45 sekondes nie.</p></div><div class="rule-grid">${rules.map(([number, title, body]) => `<article class="rule-card"><span class="rule-number">${number}</span><h3>${title}</h3><p>${body}</p></article>`).join("")}</div></section><section class="start-panel section-block" id="choose"><div class="start-panel-copy"><div class="eyebrow"><span class="eyebrow-line"></span>Your seat is saved</div><h2>Kies jou naam.<br><em>Hou jou stem geheim.</em></h2><p>Jou naam bepaal watter kandidaat jy nie kan kies nie. Die res bly tussen jou en die goue koevert.</p><div class="progress-rail"><span class="progress-step active"><b>01</b> Reëls</span><span class="progress-line"></span><span class="progress-step ${state.rulesRead ? "active" : ""}"><b>02</b> Naam</span><span class="progress-line"></span><span class="progress-step"><b>03</b> Stem</span></div></div><div class="start-form"><label class="field-label" for="name-select">Wie is jy vanaand?</label><div class="select-wrap"><select id="name-select"><option value="">Kies jou naam…</option>${state.data.participants.map((p) => `<option value="${p.id}" ${p.id === state.voterId ? "selected" : ""}>${escapeHtml(p.name)} — ${escapeHtml(p.role)}</option>`).join("")}</select><span>⌄</span></div><label class="check-row ${state.rulesRead ? "checked" : ""}"><input id="rules-check" type="checkbox" ${state.rulesRead ? "checked" : ""}><span class="custom-check">✓</span><span>Ek het die reëls gelees en verstaan.</span></label><button class="button button-primary wide" id="start-vote" ${state.voterId && state.rulesRead ? "" : "disabled"}>Gaan voort na vrae →</button><button class="button button-ghost wide" data-nav="/ranking">▥ Kyk na voorbeeld ranking</button>${!state.voterId || !state.rulesRead ? `<p class="form-hint">Kies eers jou naam en merk die reëls as gelees.</p>` : ""}</div></section><section class="closing-note">♛ <span>${pagesMode ? "Stemme op hierdie GitHub Pages-demo bly in hierdie blaaier." : "Die uitslae word eers na admin-verifikasie oopgemaak."}</span><button data-nav="/results">Admin toegang →</button></section></div>`;
}

function votePage() {
  const voter = currentUser();
  if (!voter) return `<div class="gate-page"><div class="gate-card"><div class="icon-disc">⌑</div><div class="eyebrow"><span class="eyebrow-line"></span>Eerst jou stoel</div><h1>Kies jou naam<br><em>voor jy begin.</em></h1><p>Gaan terug na die eerste blad om jou kieser te kies.</p><button class="button button-primary" data-nav="/">Gaan na naamkeuse →</button></div></div>`;
  const questions = state.questionOrder;
  const question = questions[state.activeQuestion];
  const candidates = state.data.participants.filter((candidate) => candidate.id !== voter.id);
  const answered = questions.filter((item) => state.votes[item.id]).length;
  return `<div class="page-wrap vote-page"><section class="vote-header"><div><div class="eyebrow"><span class="eyebrow-line"></span>Ballot room · ${escapeHtml(voter.shortName)}</div><h1>Maak jou <em>keuses.</em></h1><p>Een naam per vraag. Jou eie naam is out — die res is fair game.</p></div><div class="vote-progress"><span class="progress-number">${String(answered).padStart(2, "0")}</span><span class="progress-slash">/</span><span>${String(questions.length).padStart(2, "0")} klaar</span><div class="mini-progress"><i style="width:${(answered / questions.length) * 100}%"></i></div></div></section><div class="ballot-layout"><aside class="question-rail"><div class="rail-title">Tonight’s ballot <span>${questions.length} vrae</span></div>${questions.map((item, index) => `<button class="question-nav ${index === state.activeQuestion ? "active" : ""} ${state.votes[item.id] ? "answered" : ""}" data-question="${index}"><span class="question-nav-number">${String(index + 1).padStart(2, "0")}</span><span><small>${escapeHtml(item.mainCategory)}</small><strong>${escapeHtml(item.subcategory)}</strong></span><span>›</span></button>`).join("")}<div class="rail-note">✦ <span>${pagesMode ? "Jou stem bly in hierdie blaaier se plaaslike berging." : "Jou stem word outomaties in SQLite gestoor."}</span></div></aside><section class="question-card-wrap"><div class="question-card"><div class="question-card-top"><span class="question-kicker">${escapeHtml(question.kicker)}</span><span class="question-count">Vraag ${state.activeQuestion + 1} van ${questions.length}</span></div><h2>${escapeHtml(question.prompt)}</h2><p class="question-helper">⌑ Jy kan nie vir <strong>${escapeHtml(voter.shortName)}</strong> stem nie — die naam is uitgelaat.</p><div class="candidate-grid">${candidates.map((candidate) => `<button class="candidate-card ${state.votes[question.id] === candidate.id ? "selected" : ""}" data-candidate="${candidate.id}"><div class="candidate-photo">${photo(candidate)}${state.votes[question.id] === candidate.id ? `<span class="selected-badge">✓</span>` : ""}</div><span class="candidate-name">${escapeHtml(candidate.name)}</span><span class="candidate-role">${escapeHtml(candidate.role)}</span></button>`).join("")}</div><div class="question-footer"><span>${state.votes[question.id] ? "✓ Keuse gestoor" : "↻ Kies een kandidaat"}</span><div class="question-actions"><button class="button button-ghost" data-prev ${state.activeQuestion === 0 ? "disabled" : ""}>← Vorige</button>${state.activeQuestion < questions.length - 1 ? `<button class="button button-primary" data-next>Volgende →</button>` : `<button class="button button-primary" data-nav="/results" ${answered < questions.length ? "disabled" : ""}>Sluit koevert →</button>`}</div></div></div><div class="ballot-footnote"><span class="footnote-line"></span><span>Hierdie is ’n viering, nie ’n hofsaak nie.</span><span class="footnote-line"></span></div></section></div></div>`;
}

function podium(result, place, compact = false) {
  return `<div class="podium-spot place-${place} ${place === 1 ? "tall" : ""} ${compact ? "compact" : ""}"><div class="podium-person"><div class="podium-avatar">${photo(result.participant)}</div><span class="podium-place">${place}</span><strong>${escapeHtml(result.participant.shortName)}</strong><small>${result.score} pts</small></div><div class="podium-block"><span>${place === 1 ? "WINNER" : `0${place}DE`}</span></div></div>`;
}
function resultsPage() {
  if (!state.adminToken) return `<div class="gate-page"><div class="gate-card admin-card"><div class="icon-disc gold-disc">⌑</div><div class="eyebrow"><span class="eyebrow-line"></span>Restricted screen</div><h1>Resultate is<br><em>agter die gordyn.</em></h1><p>Net hosts en co-hosts kry die sleutel tot vanaand se uitslae.</p><form id="admin-form"><label class="field-label" for="admin-password">Admin-wagwoord</label><div class="password-wrap"><input id="admin-password" type="password" placeholder="••••••••" required><span>⌑</span></div><p class="error-message" id="admin-error"></p><button class="button button-primary wide" type="submit">Ontsluit resultate →</button></form><div class="demo-hint"><span>Demo toegang</span><code>oscar2026</code></div></div></div>`;
  return `<div class="page-wrap results-page"><section class="results-header"><div><div class="eyebrow"><span class="eyebrow-line"></span>Confidential · Hosts only</div><h1>Eers die <em>hoofkategorieë.</em></h1><p>Die kategorie-wenners wys eerste. Daarna begin die groot algehele onthulling.</p></div><div class="results-actions"><button class="button button-ghost" data-nav="/ranking">♛ Volle ranking</button><button class="button button-primary" id="reveal-button">▶ Begin algehele onthulling</button></div></section><div id="results-content"><div class="loading-card">${pagesMode ? "Laai plaaslike stemme…" : "Laai resultate uit SQLite…"}</div></div></div>`;
}
function categoryMarkup(results) {
  const completed = new Set(state.completedCategoryIds);
  const active = results.categories.find((category) => category.id === state.activeCategoryId);
  const panel = active && state.categoryPhase === "recap"
    ? `<div class="category-reveal-panel category-recap-panel" data-category-reveal><div class="reveal-award-heading"><span class="award-icon">${escapeHtml(active.icon)}</span><div><span class="eyebrow">${escapeHtml(active.theme)} · question recap</span><h3>${escapeHtml(active.name)}</h3><p>${escapeHtml(active.description)}</p></div></div><ol class="question-recap-list">${active.questions.map((question, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><p>${escapeHtml(question.prompt)}</p></li>`).join("")}</ol><div class="category-reveal-footer"><span>Die top drie word nou onthul…</span><button class="button button-ghost" data-show-podium>Wys die podium →</button></div></div>`
    : active && state.categoryPhase === "podium"
      ? `<button class="category-reveal-panel category-podium-panel" data-category-reveal data-advance-category aria-label="Minimaliseer ${escapeHtml(active.name)} en gaan na die volgende kategorie"><span class="podium-kicker">${escapeHtml(active.theme)} · top drie</span><h3>${escapeHtml(active.name)}</h3><p class="podium-description">${escapeHtml(active.description)}</p><div class="small-podium category-podium">${active.podium.map((item, place) => podium(item, place + 1, true)).join("")}</div><span class="category-advance-label">Klik om te minimaliseer en na die volgende kategorie te gaan →</span></button>`
      : state.completedCategoryIds.length === results.categories.length
        ? `<div class="category-reveal-panel category-all-done" data-category-reveal><span class="award-icon">♛</span><h3>Al 8 kategorieë is onthul.</h3><p>Die hoofkategorieë is afgehandel. Gaan voort na die algehele wenner wanneer julle gereed is.</p></div>`
        : `<div class="category-reveal-panel category-idle-panel" data-category-reveal><span class="award-icon">✦</span><p>Kies enige toekenning om die vyf vrae te herroep en die top drie te onthul.</p><span>${state.completedCategoryIds.length} van ${results.categories.length} kategorieë afgehandel</span></div>`;
  return `<section class="category-first section-block"><div class="section-intro compact"><div><div class="eyebrow"><span class="eyebrow-line"></span>Category winners · die aand se toekennings</div><h2>Die <em>hoofkategorieë</em></h2></div><p>Elke toekenning kry sy eie koevertritueel: vrae, dan die top drie.</p></div><div class="category-progress"><span>${state.completedCategoryIds.length} / ${results.categories.length} TOEKENNINGS ONTHUL</span><i><b style="width:${(state.completedCategoryIds.length / results.categories.length) * 100}%"></b></i></div><div class="category-grid">${results.categories.map((category, index) => {
    const isComplete = completed.has(category.id);
    const isActive = state.activeCategoryId === category.id;
    const status = isComplete ? "✓ ONTHUL" : isActive ? "NOU AAN DIE BEURT" : "OPEN KOEVERT";
    return `<button class="category-card ${isComplete ? "completed" : ""} ${isActive ? "active" : ""}" data-open-category="${escapeHtml(category.id)}" ${isComplete ? "disabled" : ""}><span class="category-index">0${index + 1}</span><span class="award-icon">${escapeHtml(category.icon)}</span><span class="category-name">${escapeHtml(category.name)}</span><span class="category-theme">${escapeHtml(category.theme)}</span><span class="category-description">${escapeHtml(category.description)}</span><span class="category-status">${status}</span></button>`;
  }).join("")}</div>${panel}</section>`;
}
function participantVideoAsset(participant) {
  const slug = String(participant?.name || "participant").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "participant";
  const base = pagesMode ? `${pagesPrefix}/public` : "";
  return { slug, source: `${base}/videos/${slug}.mp4`, filename: `videos/${slug}.mp4` };
}
function overallMarkup() {
  return `<section class="overall-after section-block"><div class="section-intro compact"><div><div class="eyebrow"><span class="eyebrow-line"></span>Second act · algehele wenners</div><h2>Die groot <em>koeverte.</em></h2></div><p>Nou eers begin die swart skerm, spanning en 3de → 2de → 1ste plek.</p></div><div class="reveal-stage reveal-0" id="reveal-stage"><video class="curtain-overlay-video" muted playsinline preload="auto" aria-hidden="true" tabindex="-1" hidden><source src="${pagesMode ? `${pagesPrefix}/public` : ""}/videos/curtains-overlay.webm" type="video/webm"></video><div class="reveal-blackout" aria-hidden="true"></div><div class="reveal-content"><span class="reveal-kicker">Overall results</span><span class="reveal-icon">◷</span><h2>Lights out.</h2><p>Druk “Begin algehele onthulling” om die top 3 te speel.</p></div><div class="reveal-bottom"><span>Vriende Oscars 2026</span><span class="reveal-dots"><i></i><i></i><i></i></span></div></div></section>`;
}
function renderCategoryArea(results) {
  const area = document.querySelector("#category-results");
  if (!area) return;
  area.innerHTML = categoryMarkup(results);
  bindCategoryEvents(results);
}
function scheduleCategoryPodium(results, categoryId) {
  window.setTimeout(() => {
    if (state.activeCategoryId !== categoryId || state.categoryPhase !== "recap") return;
    const panel = document.querySelector("[data-category-reveal]");
    panel?.classList.add("is-fading");
    window.setTimeout(() => {
      if (state.activeCategoryId !== categoryId || state.categoryPhase !== "recap") return;
      state.categoryPhase = "podium";
      renderCategoryArea(results);
    }, 450);
  }, 3600);
}
function bindCategoryEvents(results) {
  document.querySelectorAll("[data-open-category]").forEach((button) => button.addEventListener("click", () => {
    state.activeCategoryId = button.dataset.openCategory;
    state.categoryPhase = "recap";
    renderCategoryArea(results);
    document.querySelector("[data-category-reveal]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    scheduleCategoryPodium(results, state.activeCategoryId);
  }));
  document.querySelector("[data-show-podium]")?.addEventListener("click", () => {
    state.categoryPhase = "podium";
    renderCategoryArea(results);
  });
  document.querySelector("[data-advance-category]")?.addEventListener("click", () => {
    const currentIndex = results.categories.findIndex((category) => category.id === state.activeCategoryId);
    if (!state.completedCategoryIds.includes(state.activeCategoryId)) state.completedCategoryIds.push(state.activeCategoryId);
    let next = null;
    for (let offset = 1; offset <= results.categories.length; offset += 1) {
      const candidate = results.categories[(currentIndex + offset + results.categories.length) % results.categories.length];
      if (!state.completedCategoryIds.includes(candidate.id)) { next = candidate; break; }
    }
    state.activeCategoryId = next?.id || null;
    state.categoryPhase = next ? "recap" : "done";
    renderCategoryArea(results);
    document.querySelector("[data-category-reveal]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (next) scheduleCategoryPodium(results, next.id);
  });
}

async function renderResultsData() {
  const container = document.querySelector("#results-content");
  try {
    const results = await api("/api/results", { headers: { "x-admin-token": state.adminToken } });
    container.innerHTML = `<div id="category-results">${categoryMarkup(results)}</div>${overallMarkup(results)}`;
    bindCategoryEvents(results);
    const revealButton = document.querySelector("#reveal-button");
    revealButton?.addEventListener("click", () => {
      revealButton.disabled = true;
      revealButton.textContent = "Die onthulling begin...";
      playOverallReveal(results.overall.slice(0, 3));
    });
  } catch (error) { state.adminToken = ""; sessionStorage.removeItem("adminToken"); render(); }
}
function winnerRevealMarkup(result, place, phase) {
  const participant = result?.participant;
  if (!participant) return "";

  const asset = participantVideoAsset(participant);
  const displayName = participant.shortName || participant.name;
  const labels = {
    3: "THIRD PLACE",
    2: "SECOND PLACE",
    1: "AND THE WINNER IS...",
  };
  const medals = { 3: "🥉", 2: "🥈", 1: "🏆" };
  const videoMarkup = `
    <div class="reveal-video-frame">
      <video class="reveal-video" muted playsinline controls preload="none" hidden aria-label="Video vir ${escapeHtml(participant.name)}"></video>
      <div class="video-placeholder">
        <span class="video-placeholder-kicker">WINNER VIDEO</span>
        <strong>${escapeHtml(displayName)}</strong>
        <span>Die oomblik behoort aan jou!</span>
        <code>public/${asset.filename}</code>
      </div>
    </div>`;

  if (phase === "intro") {
    return `
      <div class="winner-intro">
        <span class="reveal-place">${labels[place]}</span>
        <h2>${place === 1 ? "Die oomblik van waarheid..." : "Wie sal dit wees?"}</h2>
        ${videoMarkup}
        <p class="winner-intro-caption">${place === 1 ? "Die algehele wenner word binnekort aangekondig." : "Die koevert is oopgemaak..."}</p>
      </div>`;
  }

  return `
    <div class="winner-podium-reveal place-${place}">
      <div class="winner-reveal-heading">
        <span class="winner-medal" aria-hidden="true">${medals[place]}</span>
        <span class="reveal-place">${labels[place]}</span>
      </div>
      <div class="winner-reveal-body">
        <div class="winner-portrait">${photo(participant)}</div>
        <div class="winner-details">
          <span class="winner-title">${place === 1 ? "ALGEHELE WENNER" : "PODIUM WENNER"}</span>
          <h2>${escapeHtml(participant.name)}</h2>
          <p>${result.score} punte</p>
        </div>
        <div class="winner-video-popup">${videoMarkup}</div>
      </div>
    </div>`;
}

function playOverallReveal(top) {
  const revealStage = document.querySelector("#reveal-stage");
  if (!revealStage) return;

  revealStage.className = "reveal-stage reveal-0 reveal-video-mode";
  revealStage.scrollIntoView({ behavior: "smooth", block: "center" });

  const curtainOverlay = revealStage.querySelector(".curtain-overlay-video");
  const drumroll = new Audio(pagesMode ? `${pagesPrefix}/public/overall-drumroll.mp3` : "/overall-drumroll.mp3");
  drumroll.volume = 0.78;
  drumroll.play().catch(() => {});

  let finished = false;
  const finishCurtains = () => {
    if (finished) return;
    finished = true;
    if (!curtainOverlay) {
      startReveal(top);
      return;
    }
    curtainOverlay.pause();
    curtainOverlay.classList.add("is-fading");
    window.setTimeout(() => {
      curtainOverlay.hidden = true;
      startReveal(top);
    }, 950);
  };

  if (curtainOverlay) {
    curtainOverlay.hidden = false;
    curtainOverlay.classList.remove("is-fading");
    curtainOverlay.currentTime = 0;
    curtainOverlay.addEventListener("ended", finishCurtains, { once: true });
    curtainOverlay.play().catch(finishCurtains);
    window.setTimeout(finishCurtains, 9500);
    window.setTimeout(() => revealStage.classList.add("curtains-open"), 3200);
  } else {
    finishCurtains();
  }
}

async function startReveal(top) {
  const stage = document.querySelector("#reveal-stage");
  const validTop = Array.isArray(top) ? top.filter((item) => item?.participant) : [];
  if (!stage || !validTop.length) return;

  const content = stage.querySelector(".reveal-content");
  const blackout = stage.querySelector(".reveal-blackout");
  if (!content) return;

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  const winners = [
    { result: validTop[2], place: 3, podiumWait: 2800 },
    { result: validTop[1], place: 2, podiumWait: 3000 },
    { result: validTop[0], place: 1, podiumWait: 4500 },
  ].filter((item) => item.result);

  async function transition(html, stageClass) {
    blackout?.classList.add("is-black");
    await wait(600);
    content.innerHTML = html;
    stage.className = `reveal-stage reveal-video-mode ${stageClass}`;
    requestAnimationFrame(() => requestAnimationFrame(() => blackout?.classList.remove("is-black")));
    await wait(100);
  }

  async function playCurrentVideo(participant) {
    const video = content.querySelector(".reveal-video");
    if (video) await loadOverallVideo(video, participant);
  }

  async function showFinalPodium() {
    const first = validTop[0];
    const second = validTop[1];
    const third = validTop[2];
    if (!first) return;

    await transition(`
      <div class="overall-final">
        <span class="reveal-kicker">WINKIE OSCARS 2026</span>
        <h2>Ons algehele top 3</h2>
        <p class="overall-final-subtitle">Die aand se drie groot wenners.</p>
        <div class="overall-podium final-podium">
          ${second ? podium(second, 2) : ""}
          ${podium(first, 1)}
          ${third ? podium(third, 3) : ""}
        </div>
        <span class="final-congratulations">✦ BAIE GELUK AAN ONS WENNERS ✦</span>
        <button class="button button-primary replay-button" id="replay-overall">Speel onthulling weer ↻</button>
      </div>`, "reveal-final");
    document.querySelector("#replay-overall")?.addEventListener("click", () => playOverallReveal(validTop));
  }

  async function showWinner(index) {
    if (index >= winners.length) {
      await showFinalPodium();
      return;
    }

    const winner = winners[index];
    if (winner.place === 1) await wait(2800);

    await transition(winnerRevealMarkup(winner.result, winner.place, "intro"), `reveal-intro reveal-place-${winner.place}`);
    await playCurrentVideo(winner.result.participant);

    await transition(winnerRevealMarkup(winner.result, winner.place, "podium"), `reveal-podium reveal-place-${winner.place}`);
    await playCurrentVideo(winner.result.participant);

    await wait(winner.podiumWait);
    await showWinner(index + 1);
  }

  await transition(`
    <span class="reveal-kicker">WINKIE OSCARS 2026</span>
    <h2>Lights out.</h2>
    <p>Die oomblik waarvoor almal gewag het...</p>
    <span class="reveal-icon">✦</span>`, "reveal-black-screen");
  await wait(2600);
  await showWinner(0);
}
async function loadOverallVideo(video, participant) {
  if (!video || !participant) return;
  const asset = participantVideoAsset(participant);
  const placeholder = video.nextElementSibling;
  video.pause();
  video.hidden = true;
  if (placeholder) placeholder.hidden = false;

  return new Promise((resolve) => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      window.clearTimeout(fallback);
      resolve();
    };
    const fallback = window.setTimeout(finish, 30000);

    video.addEventListener("loadeddata", () => {
      if (completed || !video.isConnected) return;
      video.hidden = false;
      if (placeholder) placeholder.hidden = true;
      video.play().catch((error) => console.warn("Winner video autoplay was blocked by the browser; use the player controls.", error));
    }, { once: true });
    video.addEventListener("ended", finish, { once: true });
    video.addEventListener("error", () => {
      video.hidden = true;
      if (placeholder) placeholder.hidden = false;
      console.warn(`Could not load ${asset.filename}; showing the video placeholder.`);
      finish();
    }, { once: true });

    video.src = asset.source;
    video.load();
  });
}

async function rankingPage() {
  const data = await api("/api/rankings");
  return `<div class="page-wrap ranking-page"><section class="results-header ranking-header"><div><div class="eyebrow"><span class="eyebrow-line"></span>The receipts</div><h1>Wie staan <em>waar?</em></h1><p>Die volle stembeeld — per vraag, per naam.</p></div><button class="button button-primary" data-nav="/results">♛ Gaan na resultate →</button></section><section class="ranking-list">${data.questionRankings.map((item, index) => { const total = item.rankings.reduce((sum, row) => sum + row.votes, 0); return `<article class="ranking-card"><div class="ranking-card-head"><div class="ranking-card-title"><span class="question-nav-number">${String(index + 1).padStart(2, "0")}</span><div><span>${escapeHtml(item.question.mainCategory)} · ${escapeHtml(item.question.kicker)}</span><h2>${escapeHtml(item.question.subcategory)}</h2><p>${escapeHtml(item.question.prompt)}</p></div></div><span class="total-votes">${total} stemme</span></div><div class="ranking-rows">${item.rankings.map((row, rank) => { const pct = total ? Math.round(row.votes / total * 100) : 0; return `<div class="ranking-row ${rank === 0 ? "leader" : ""}"><span class="rank-number">${String(rank + 1).padStart(2, "0")}</span>${photo(row.participant)}<strong>${escapeHtml(row.participant.name)}</strong><div class="rank-bar"><i style="width:${pct}%"></i></div><span class="rank-percent">${pct}%</span><span class="rank-votes">${row.votes}</span></div>`; }).join("")}</div></article>`; }).join("")}</section></div>`;
}

async function render() {
  let content = state.page === "home" ? homePage() : state.page === "vote" ? votePage() : state.page === "results" ? resultsPage() : state.page === "ranking" ? `<div class="page-wrap"><div class="loading-card">Laai rankings…</div></div>` : `<div class="gate-page"><div class="gate-card"><h1>Bladsy nie gevind nie.</h1><button class="button button-primary" data-nav="/">Terug huis toe</button></div></div>`;
  document.querySelector("#app").innerHTML = shell(content);
  bindEvents();
  if (state.page === "results" && state.adminToken) renderResultsData();
  if (state.page === "ranking") { try { document.querySelector("main").innerHTML = await rankingPage(); bindEvents(); } catch (error) { console.error(error); } }
}

function bindEvents() {
  document.querySelectorAll("[data-nav]").forEach((element) => element.addEventListener("click", () => go(element.dataset.nav)));
  document.querySelectorAll("[data-scroll]").forEach((element) => element.addEventListener("click", () => document.querySelector(element.dataset.scroll)?.scrollIntoView({ behavior: "smooth" })));
  const select = document.querySelector("#name-select");
  select?.addEventListener("change", async (event) => { state.voterId = event.target.value; state.activeQuestion = 0; localStorage.setItem("voterId", state.voterId); state.votes = {}; applyQuestionOrder(state.voterId); if (state.voterId) { const saved = await api(`/api/votes/${state.voterId}`); state.votes = Object.fromEntries(saved.map((vote) => [vote.questionId, vote.candidateId])); } render(); });
  document.querySelector("#rules-check")?.addEventListener("change", (event) => { state.rulesRead = event.target.checked; localStorage.setItem("rulesRead", String(state.rulesRead)); render(); });
  document.querySelector("#start-vote")?.addEventListener("click", () => go("/vote"));
  document.querySelectorAll("[data-question]").forEach((button) => button.addEventListener("click", () => { state.activeQuestion = Number(button.dataset.question); render(); }));
  document.querySelectorAll("[data-candidate]").forEach((button) => button.addEventListener("click", async () => { const questionId = state.questionOrder[state.activeQuestion].id; const candidateId = button.dataset.candidate; try { await api("/api/votes", { method: "POST", body: JSON.stringify({ voterId: state.voterId, questionId, candidateId }) }); state.votes[questionId] = candidateId; localStorage.setItem("votes", JSON.stringify(state.votes)); render(); } catch (error) { alert(error.message); } }));
  document.querySelector("[data-prev]")?.addEventListener("click", () => { state.activeQuestion = Math.max(0, state.activeQuestion - 1); render(); });
  document.querySelector("[data-next]")?.addEventListener("click", () => { state.activeQuestion = Math.min(state.questionOrder.length - 1, state.activeQuestion + 1); render(); });
  document.querySelector("#admin-form")?.addEventListener("submit", async (event) => { event.preventDefault(); const error = document.querySelector("#admin-error"); try { const result = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password: document.querySelector("#admin-password").value }) }); state.adminToken = result.token; sessionStorage.setItem("adminToken", result.token); render(); } catch (err) { error.textContent = err.message; } });
}
window.addEventListener("popstate", () => { state.page = routePage(); render(); });
boot();
