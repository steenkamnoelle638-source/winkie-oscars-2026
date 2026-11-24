const pagesMode = location.hostname.endsWith(".github.io");
const pagesPrefix = pagesMode ? `/${location.pathname.split("/").filter(Boolean)[0] || "winkie-oscars-2026"}` : "";
const routePath = () => {
  if (pagesMode && location.hash) return location.hash.slice(1) || "/";
  const path = location.pathname;
  return pagesPrefix && path.startsWith(pagesPrefix) ? path.slice(pagesPrefix.length) || "/" : path;
};
const routePage = () => routePath() === "/" ? "home" : routePath().replace(/^\//, "");
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
  questions: [
    { id: "q1", mainCategoryId: "energy", mainCategory: "Die Vibes", subcategory: "Beste entrance", prompt: "Wie bring die meeste main-character energy wanneer hulle instap?", kicker: "Opening scene", weight: 1 },
    { id: "q2", mainCategoryId: "energy", mainCategory: "Die Vibes", subcategory: "Beste dansvloer", prompt: "Wie sal eerste op die dansvloer wees — en laaste daar weggaan?", kicker: "Dance floor cut", weight: 1 },
    { id: "q3", mainCategoryId: "heart", mainCategory: "Die Vriendskap", subcategory: "Beste hype-person", prompt: "Wie is almal se persoonlike hype squad wanneer dinge rof raak?", kicker: "Warm & fuzzy", weight: 1.15 },
    { id: "q4", mainCategoryId: "heart", mainCategory: "Die Vriendskap", subcategory: "Most likely to host", prompt: "Wie sal ’n gewone kuier in ’n volle produksie verander?", kicker: "Production notes", weight: 1 },
    { id: "q5", mainCategoryId: "chaos", mainCategory: "Die Chaos", subcategory: "Beste one-liner", prompt: "Wie lewer altyd die quote wat die groep vir maande herhaal?", kicker: "Comic relief", weight: 1.1 },
    { id: "q6", mainCategoryId: "chaos", mainCategory: "Die Chaos", subcategory: "Mees onverwags", prompt: "Wie verras jou elke keer met ’n nuwe plot twist?", kicker: "Plot twist", weight: 1 },
  ],
};
const state = {
  data: { participants: [], questions: [] },
  page: routePage(),
  voterId: localStorage.getItem("voterId") || "",
  rulesRead: localStorage.getItem("rulesRead") === "true",
  votes: JSON.parse(localStorage.getItem("votes") || "{}"),
  adminToken: sessionStorage.getItem("adminToken") || "",
  activeQuestion: 0,
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const person = (id) => state.data.participants.find((candidate) => candidate.id === id);
const currentUser = () => person(state.voterId);
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
  const categories = [...new Set(staticData.questions.map((q) => q.mainCategoryId))].map((id) => {
    const questions = staticData.questions.filter((q) => q.mainCategoryId === id);
    const podium = staticData.participants.map((participant) => ({ participant, score: Math.round(questions.reduce((sum, question) => sum + count(question.id, participant.id) * question.weight, 0) * 10) / 10 })).sort((a, b) => b.score - a.score || a.participant.name.localeCompare(b.participant.name)).slice(0, 3);
    return { id, name: questions[0].mainCategory, questions, podium };
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
  const question = state.data.questions[state.activeQuestion];
  const candidates = state.data.participants.filter((candidate) => candidate.id !== voter.id);
  const answered = state.data.questions.filter((item) => state.votes[item.id]).length;
  return `<div class="page-wrap vote-page"><section class="vote-header"><div><div class="eyebrow"><span class="eyebrow-line"></span>Ballot room · ${escapeHtml(voter.shortName)}</div><h1>Maak jou <em>keuses.</em></h1><p>Een naam per vraag. Jou eie naam is out — die res is fair game.</p></div><div class="vote-progress"><span class="progress-number">${String(answered).padStart(2, "0")}</span><span class="progress-slash">/</span><span>${String(state.data.questions.length).padStart(2, "0")} klaar</span><div class="mini-progress"><i style="width:${(answered / state.data.questions.length) * 100}%"></i></div></div></section><div class="ballot-layout"><aside class="question-rail"><div class="rail-title">Tonight’s ballot <span>${state.data.questions.length} vrae</span></div>${state.data.questions.map((item, index) => `<button class="question-nav ${index === state.activeQuestion ? "active" : ""} ${state.votes[item.id] ? "answered" : ""}" data-question="${index}"><span class="question-nav-number">${String(index + 1).padStart(2, "0")}</span><span><small>${escapeHtml(item.mainCategory)}</small><strong>${escapeHtml(item.subcategory)}</strong></span><span>›</span></button>`).join("")}<div class="rail-note">✦ <span>${pagesMode ? "Jou stem bly in hierdie blaaier se plaaslike berging." : "Jou stem word outomaties in SQLite gestoor."}</span></div></aside><section class="question-card-wrap"><div class="question-card"><div class="question-card-top"><span class="question-kicker">${escapeHtml(question.kicker)}</span><span class="question-count">Vraag ${state.activeQuestion + 1} van ${state.data.questions.length}</span></div><h2>${escapeHtml(question.prompt)}</h2><p class="question-helper">⌑ Jy kan nie vir <strong>${escapeHtml(voter.shortName)}</strong> stem nie — die naam is uitgelaat.</p><div class="candidate-grid">${candidates.map((candidate) => `<button class="candidate-card ${state.votes[question.id] === candidate.id ? "selected" : ""}" data-candidate="${candidate.id}"><div class="candidate-photo">${photo(candidate)}${state.votes[question.id] === candidate.id ? `<span class="selected-badge">✓</span>` : ""}</div><span class="candidate-name">${escapeHtml(candidate.name)}</span><span class="candidate-role">${escapeHtml(candidate.role)}</span></button>`).join("")}</div><div class="question-footer"><span>${state.votes[question.id] ? "✓ Keuse gestoor" : "↻ Kies een kandidaat"}</span><div class="question-actions"><button class="button button-ghost" data-prev ${state.activeQuestion === 0 ? "disabled" : ""}>← Vorige</button>${state.activeQuestion < state.data.questions.length - 1 ? `<button class="button button-primary" data-next>Volgende →</button>` : `<button class="button button-primary" data-nav="/results" ${answered < state.data.questions.length ? "disabled" : ""}>Sluit koevert →</button>`}</div></div></div><div class="ballot-footnote"><span class="footnote-line"></span><span>Hierdie is ’n viering, nie ’n hofsaak nie.</span><span class="footnote-line"></span></div></section></div></div>`;
}

function podium(result, place, compact = false) {
  return `<div class="podium-spot place-${place} ${place === 1 ? "tall" : ""} ${compact ? "compact" : ""}"><div class="podium-person"><div class="podium-avatar">${photo(result.participant)}</div><span class="podium-place">${place}</span><strong>${escapeHtml(result.participant.shortName)}</strong><small>${result.score} pts</small></div><div class="podium-block"><span>${place === 1 ? "WINNER" : `0${place}DE`}</span></div></div>`;
}
function resultsPage() {
  if (!state.adminToken) return `<div class="gate-page"><div class="gate-card admin-card"><div class="icon-disc gold-disc">⌑</div><div class="eyebrow"><span class="eyebrow-line"></span>Restricted screen</div><h1>Resultate is<br><em>agter die gordyn.</em></h1><p>Net hosts en co-hosts kry die sleutel tot vanaand se uitslae.</p><form id="admin-form"><label class="field-label" for="admin-password">Admin-wagwoord</label><div class="password-wrap"><input id="admin-password" type="password" placeholder="••••••••" required><span>⌑</span></div><p class="error-message" id="admin-error"></p><button class="button button-primary wide" type="submit">Ontsluit resultate →</button></form><div class="demo-hint"><span>Demo toegang</span><code>oscar2026</code></div></div></div>`;
  return `<div class="page-wrap results-page"><section class="results-header"><div><div class="eyebrow"><span class="eyebrow-line"></span>Confidential · Hosts only</div><h1>Eers die <em>hoofkategorieë.</em></h1><p>Die kategorie-wenners wys eerste. Daarna begin die groot algehele onthulling.</p></div><div class="results-actions"><button class="button button-ghost" data-nav="/ranking">♛ Volle ranking</button><button class="button button-primary" id="reveal-button">▶ Begin algehele onthulling</button></div></section><div id="results-content"><div class="loading-card">${pagesMode ? "Laai plaaslike stemme…" : "Laai resultate uit SQLite…"}</div></div></div>`;
}
function categoryMarkup(results) {
  return `<section class="category-first section-block"><div class="section-intro compact"><div><div class="eyebrow"><span class="eyebrow-line"></span>Category winners · eerste</div><h2>Die <em>hoofkategorieë</em></h2></div><p>Hierdie wenners word eerste op die resultateskerm gewys, gebaseer op hul subkategorieë.</p></div><div class="category-grid">${results.categories.map((category, index) => `<article class="category-card"><div class="category-card-head"><span class="category-index">0${index + 1}</span><div><h3>${escapeHtml(category.name)}</h3><span>${category.questions.length} subkategorieë</span></div><span>✦</span></div><div class="small-podium">${category.podium.map((item, place) => podium(item, place + 1, true)).join("")}</div><div class="category-evidence">${category.questions.map((question) => `<div><span>${escapeHtml(question.subcategory)}</span><strong>${escapeHtml(category.podium[0].participant.shortName)}</strong></div>`).join("")}</div></article>`).join("")}</div></section>`;
}
function overallMarkup(results) {
  const top = results.overall.slice(0, 3);
  return `<section class="overall-after section-block"><div class="section-intro compact"><div><div class="eyebrow"><span class="eyebrow-line"></span>Second act · algehele wenners</div><h2>Die groot <em>koeverte.</em></h2></div><p>Nou eers begin die swart skerm, spanning en 3de → 2de → 1ste plek.</p></div><div class="reveal-stage reveal-0" id="reveal-stage"><div class="reveal-content"><span class="reveal-kicker">Overall results</span><span class="reveal-icon">◷</span><h2>Lights out.</h2><p>Druk “Begin algehele onthulling” om die top 3 te speel.</p></div><div class="reveal-bottom"><span>Vriende Oscars 2026</span><span class="reveal-dots"><i></i><i></i><i></i></span></div></div><div class="overall-podium">${podium(top[1], 2)}${podium(top[0], 1)}${podium(top[2], 3)}</div></section>`;
}

async function renderResultsData() {
  const container = document.querySelector("#results-content");
  try {
    const results = await api("/api/results", { headers: { "x-admin-token": state.adminToken } });
    container.innerHTML = categoryMarkup(results) + overallMarkup(results);
    document.querySelector("#reveal-button")?.addEventListener("click", () => {
      const winnersSection = document.querySelector(".overall-after");
      winnersSection?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => startReveal(results.overall.slice(0, 3)), 750);
    });
  } catch (error) { state.adminToken = ""; sessionStorage.removeItem("adminToken"); render(); }
}
function startReveal(top) {
  const stage = document.querySelector("#reveal-stage");
  if (!stage) return;
  let step = 0;
  const show = () => {
    const result = top[step === 1 ? 2 : step === 2 ? 1 : 0];
    stage.className = `reveal-stage reveal-${step}`;
    stage.querySelector(".reveal-content").innerHTML = step === 0 ? `<span class="reveal-kicker">Overall results</span><span class="reveal-icon">◷</span><h2>Lights out.</h2><p>Die kamer hou asem op…</p>` : `<span class="reveal-place">${step === 1 ? "THIRD PLACE" : step === 2 ? "SECOND PLACE" : "AND THE WINNER IS"}</span><div class="reveal-person"><div class="reveal-photo">${photo(result.participant)}</div><div><span class="reveal-number">0${step === 1 ? 3 : step === 2 ? 2 : 1}</span><h2>${escapeHtml(result.participant.name)}</h2><p>${result.score} punte oor al die vrae</p></div></div>`;
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
  select?.addEventListener("change", async (event) => { state.voterId = event.target.value; localStorage.setItem("voterId", state.voterId); state.votes = {}; if (state.voterId) { const saved = await api(`/api/votes/${state.voterId}`); state.votes = Object.fromEntries(saved.map((vote) => [vote.questionId, vote.candidateId])); } render(); });
  document.querySelector("#rules-check")?.addEventListener("change", (event) => { state.rulesRead = event.target.checked; localStorage.setItem("rulesRead", String(state.rulesRead)); render(); });
  document.querySelector("#start-vote")?.addEventListener("click", () => go("/vote"));
  document.querySelectorAll("[data-question]").forEach((button) => button.addEventListener("click", () => { state.activeQuestion = Number(button.dataset.question); render(); }));
  document.querySelectorAll("[data-candidate]").forEach((button) => button.addEventListener("click", async () => { const questionId = state.data.questions[state.activeQuestion].id; const candidateId = button.dataset.candidate; try { await api("/api/votes", { method: "POST", body: JSON.stringify({ voterId: state.voterId, questionId, candidateId }) }); state.votes[questionId] = candidateId; localStorage.setItem("votes", JSON.stringify(state.votes)); render(); } catch (error) { alert(error.message); } }));
  document.querySelector("[data-prev]")?.addEventListener("click", () => { state.activeQuestion = Math.max(0, state.activeQuestion - 1); render(); });
  document.querySelector("[data-next]")?.addEventListener("click", () => { state.activeQuestion = Math.min(state.data.questions.length - 1, state.activeQuestion + 1); render(); });
  document.querySelector("#admin-form")?.addEventListener("submit", async (event) => { event.preventDefault(); const error = document.querySelector("#admin-error"); try { const result = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password: document.querySelector("#admin-password").value }) }); state.adminToken = result.token; sessionStorage.setItem("adminToken", result.token); render(); } catch (err) { error.textContent = err.message; } });
}
window.addEventListener("popstate", () => { state.page = routePage(); render(); });
boot();
