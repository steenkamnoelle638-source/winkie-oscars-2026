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
function overallMarkup() {
  return `<section class="overall-after section-block"><div class="section-intro compact"><div><div class="eyebrow"><span class="eyebrow-line"></span>Second act · algehele wenners</div><h2>Die groot <em>koeverte.</em></h2></div><p>Nou eers begin die swart skerm, spanning en 3de → 2de → 1ste plek.</p></div><div class="reveal-stage reveal-0" id="reveal-stage"><div class="curtain-valance" aria-hidden="true"><svg viewBox="0 0 1200 120" preserveAspectRatio="none" role="presentation"><defs><linearGradient id="swag-velvet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c74a55"/><stop offset=".28" stop-color="#8f1c2a"/><stop offset=".7" stop-color="#5b0b17"/><stop offset="1" stop-color="#31050c"/></linearGradient><linearGradient id="swag-trim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0cf88"/><stop offset="1" stop-color="#a87936"/></linearGradient><pattern id="swag-pleats" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M0 0V120" stroke="#22040a" stroke-width="18" opacity=".25"/><path d="M33 0V120" stroke="#f38b82" stroke-width="18" opacity=".14"/><path d="M73 0V120" stroke="#21030a" stroke-width="20" opacity=".24"/><path d="M100 0V120" stroke="#f9a49a" stroke-width="10" opacity=".1"/></pattern></defs><path class="swag-shape" d="M0 0H1200V22C1080 22 1105 102 1000 102S920 22 800 22C680 22 705 102 600 102S520 22 400 22C280 22 305 102 200 102S120 22 0 22Z" fill="url(#swag-velvet)"/><path d="M0 22C120 22 95 102 200 102S280 22 400 22C520 22 495 102 600 102S680 22 800 22C920 22 895 102 1000 102S1080 22 1200 22" fill="none" stroke="#4c0812" stroke-width="3" opacity=".72"/><path d="M0 22C120 22 95 102 200 102S280 22 400 22C520 22 495 102 600 102S680 22 800 22C920 22 895 102 1000 102S1080 22 1200 22" fill="none" stroke="url(#swag-pleats)" stroke-width="23"/></svg></div><div class="reveal-content"><span class="reveal-kicker">Overall results</span><span class="reveal-icon">◷</span><h2>Lights out.</h2><p>Druk “Begin algehele onthulling” om die top 3 te speel.</p></div><div class="reveal-bottom"><span>Vriende Oscars 2026</span><span class="reveal-dots"><i></i><i></i><i></i></span></div></div></section>`;
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
      const winnersSection = document.querySelector(".overall-after");
      const revealStage = document.querySelector("#reveal-stage");
      if (!winnersSection || !revealStage) return;
      revealButton.disabled = true;
      winnersSection?.scrollIntoView({ behavior: "instant", block: "start" });
      revealStage.classList.add("curtains-open");
      const curtainDuration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1500;
      window.setTimeout(() => startReveal(results.overall.slice(0, 3)), curtainDuration);
    });
  } catch (error) { state.adminToken = ""; sessionStorage.removeItem("adminToken"); render(); }
}
function startReveal(top) {
  const stage = document.querySelector("#reveal-stage");
  if (!stage) return;
  let step = 0;
  const show = () => {
    const result = top[step === 1 ? 2 : step === 2 ? 1 : 0];
    stage.className = `reveal-stage reveal-${step} curtains-open`;
    stage.querySelector(".reveal-content").innerHTML = step === 0 ? `<span class="reveal-kicker">Overall results</span><span class="reveal-icon">◷</span><h2>Lights out.</h2><p>Die kamer hou asem op…</p>` : `<span class="reveal-place">${step === 1 ? "THIRD PLACE" : step === 2 ? "SECOND PLACE" : "AND THE WINNER IS"}</span><div class="reveal-person"><div><span class="reveal-number">0${step === 1 ? 3 : step === 2 ? 2 : 1}</span><h2>${escapeHtml(result.participant.name)}</h2><p>${result.score} punte oor al die vrae</p></div></div>`;
    stage.querySelectorAll(".reveal-dots i").forEach((dot, index) => dot.classList.toggle("on", index < step));
  };
  show();
  window.setTimeout(() => { step = 1; show(); }, 2200);
  window.setTimeout(() => { step = 2; show(); }, 5200);
  window.setTimeout(() => { step = 3; show(); }, 9400);
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
