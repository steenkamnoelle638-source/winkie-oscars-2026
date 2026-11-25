import express from "express";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { awardCategories, awardQuestions } from "./public/awards-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const dbPath = process.env.SQLITE_PATH || path.join(dataDir, "awards.sqlite");
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(fs.readFileSync(path.join(dataDir, "schema.sql"), "utf8"));

const participants = [
  ["lian", "Lian Jacobs", "Lian", "Host", "/images/person-1.webp", "gold"],
  ["mieke", "Mieke Smit", "Mieke", "Co-host", "/images/person-2.webp", "coral"],
  ["jaco", "Jaco Nel", "Jaco", "Nominee", "/images/person-3.webp", "sage"],
  ["mia", "Mia Botha", "Mia", "Nominee", "/images/person-4.webp", "cream"],
  ["talia", "Talia Roos", "Talia", "Nominee", "/images/person-5.webp", "blue"],
  ["deelnemer6", "Deelnemer 6", "Deelnemer 6", "Nominee", "", "plum"],
  ["deelnemer7", "Deelnemer 7", "Deelnemer 7", "Nominee", "", "rose"],
];
const questions = awardQuestions.map((question) => [
  question.id, question.mainCategoryId, question.mainCategory, question.subcategory,
  question.prompt, question.kicker, question.weight,
]);
function seed() {
  const insertParticipant = db.prepare("INSERT INTO participants (id, name, short_name, role, photo, accent) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING");
  for (const row of participants) insertParticipant.run(...row);
  // The old six-question set cannot be mapped to the new 40-question ballot, so discard only those obsolete question IDs.
  db.prepare("DELETE FROM questions WHERE id IN ('q1', 'q2', 'q3', 'q4', 'q5', 'q6')").run();
  const insertQuestion = db.prepare("INSERT INTO questions (id, main_category_id, main_category, subcategory, prompt, kicker, weight) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET main_category_id = excluded.main_category_id, main_category = excluded.main_category, subcategory = excluded.subcategory, prompt = excluded.prompt, kicker = excluded.kicker, weight = excluded.weight");
  for (const row of questions) insertQuestion.run(...row);
  const insertCount = db.prepare("INSERT INTO vote_counts (question_id, candidate_id, votes) VALUES (?, ?, 0) ON CONFLICT(question_id, candidate_id) DO NOTHING");
  for (const question of questions) for (const participant of participants) insertCount.run(question[0], participant[0]);
  // Remove old fabricated totals only if no actual ballots have been cast.
  if (db.prepare("SELECT COUNT(*) AS count FROM votes").get().count === 0) db.exec("UPDATE vote_counts SET votes = 0");
}
seed();

const app = express();
app.use(express.json());
app.use(express.static(publicDir));

const participantById = (id) => db.prepare("SELECT * FROM participants WHERE id = ?").get(id);
const questionById = (id) => db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
const publicParticipant = (row) => ({ id: row.id, name: row.name, shortName: row.short_name, role: row.role, photo: row.photo, accent: row.accent });
const publicQuestion = (row) => ({ id: row.id, mainCategoryId: row.main_category_id, mainCategory: row.main_category, subcategory: row.subcategory, prompt: row.prompt, kicker: row.kicker, weight: row.weight });

app.get("/api/health", (_req, res) => res.json({ status: "ok", stack: "html-javascript-css-sqlite" }));
app.get("/api/bootstrap", (_req, res) => {
  const currentVotes = db.prepare("SELECT voter_id AS voterId, question_id AS questionId, candidate_id AS candidateId FROM votes").all();
  res.json({ participants: db.prepare("SELECT * FROM participants").all().map(publicParticipant), categories: awardCategories, questions: db.prepare("SELECT * FROM questions").all().map(publicQuestion), votes: currentVotes });
});
app.get("/api/votes/:voterId", (req, res) => {
  if (!participantById(req.params.voterId)) return res.status(404).json({ error: "Voter not found" });
  res.json(db.prepare("SELECT question_id AS questionId, candidate_id AS candidateId FROM votes WHERE voter_id = ?").all(req.params.voterId));
});

app.post("/api/votes", (req, res) => {
  const { voterId, questionId, candidateId } = req.body || {};
  if (!participantById(voterId) || !questionById(questionId) || !participantById(candidateId)) return res.status(400).json({ error: "Invalid voter, question or candidate" });
  if (voterId === candidateId) return res.status(400).json({ error: "Self-voting is not allowed" });
  const previous = db.prepare("SELECT candidate_id AS candidateId FROM votes WHERE voter_id = ? AND question_id = ?").get(voterId, questionId);
  db.exec("BEGIN IMMEDIATE");
  try {
    if (previous) {
      db.prepare("UPDATE vote_counts SET votes = MAX(votes - 1, 0) WHERE question_id = ? AND candidate_id = ?").run(questionId, previous.candidateId);
      db.prepare("UPDATE votes SET candidate_id = ?, updated_at = CURRENT_TIMESTAMP WHERE voter_id = ? AND question_id = ?").run(candidateId, voterId, questionId);
    } else {
      db.prepare("INSERT INTO votes (voter_id, question_id, candidate_id) VALUES (?, ?, ?)").run(voterId, questionId, candidateId);
    }
    db.prepare("UPDATE vote_counts SET votes = votes + 1 WHERE question_id = ? AND candidate_id = ?").run(questionId, candidateId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  res.json({ ok: true, voterId, questionId, candidateId });
});

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body?.password || "");
  const expected = process.env.ADMIN_PASSWORD || "oscar2026";
  if (password !== expected) return res.status(401).json({ error: "Invalid admin password" });
  const token = crypto.randomUUID();
  db.prepare("INSERT INTO admin_sessions (token) VALUES (?)").run(token);
  res.json({ ok: true, token });
});
function requireAdmin(req, res, next) {
  const token = req.get("x-admin-token");
  if (!token || !db.prepare("SELECT token FROM admin_sessions WHERE token = ?").get(token)) return res.status(401).json({ error: "Admin login required" });
  next();
}

function calculateResults() {
  const people = db.prepare("SELECT * FROM participants").all().map(publicParticipant);
  const qs = db.prepare("SELECT * FROM questions").all().map(publicQuestion);
  const rows = db.prepare("SELECT question_id AS questionId, candidate_id AS candidateId, votes FROM vote_counts").all();
  const countMap = new Map(rows.map((row) => [`${row.questionId}:${row.candidateId}`, row.votes]));
  const count = (questionId, candidateId) => countMap.get(`${questionId}:${candidateId}`) || 0;
  const categories = awardCategories.map((category) => {
    const categoryQuestions = qs.filter((question) => question.mainCategoryId === category.id);
    const podium = people.map((person) => ({ participant: person, score: Math.round(categoryQuestions.reduce((sum, question) => sum + count(question.id, person.id) * question.weight, 0) * 10) / 10 })).sort((a, b) => b.score - a.score || a.participant.name.localeCompare(b.participant.name)).slice(0, 3);
    return { ...category, questions: categoryQuestions, podium };
  });
  const overall = people.map((person) => ({ participant: person, score: Math.round(qs.reduce((sum, question) => sum + count(question.id, person.id) * question.weight, 0) * 10) / 10 })).sort((a, b) => b.score - a.score || a.participant.name.localeCompare(b.participant.name));
  return { categories, overall, questions: qs, participants: people };
}
app.get("/api/results", requireAdmin, (_req, res) => res.json(calculateResults()));
app.get("/api/rankings", (_req, res) => {
  const result = calculateResults();
  const rows = db.prepare("SELECT question_id AS questionId, candidate_id AS candidateId, votes FROM vote_counts").all();
  const count = (questionId, candidateId) => rows.find((row) => row.questionId === questionId && row.candidateId === candidateId)?.votes || 0;
  res.json({ ...result, questionRankings: result.questions.map((question) => ({ question, rankings: result.participants.map((participant) => ({ participant, votes: count(question.id, participant.id) })).sort((a, b) => b.votes - a.votes) })) });
});

app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`Vriende Oscars vanilla server listening on ${port}; SQLite: ${dbPath}`));
