PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  role TEXT NOT NULL,
  photo TEXT NOT NULL,
  accent TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  main_category_id TEXT NOT NULL,
  main_category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  prompt TEXT NOT NULL,
  kicker TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vote_counts (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  votes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (question_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS votes (
  voter_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (voter_id, question_id)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
