-- ============================================================
-- AI Interview Platform — Postgres schema
-- Run with: psql -U <user> -d <dbname> -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector, only needed if you store SBERT embeddings in Postgres

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TYPE role AS ENUM ('admin', 'user');

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          role NOT NULL DEFAULT 'user',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- skills (the fixed list of options shown on the "select a skill" button)
-- name is constrained to the skill_name enum below, so only these values
-- can ever be inserted
-- ------------------------------------------------------------


CREATE TYPE skill_name AS ENUM (
    'JavaScript',
    'React',
    'Data Structures',
    'System Design',
    'SQL'
);

CREATE TABLE skills (
    id    SERIAL PRIMARY KEY,
    name  skill_name UNIQUE NOT NULL
);

INSERT INTO skills (name) VALUES
    ('JavaScript'),
    ('React'),
    ('Data Structures'),
    ('System Design'),
    ('SQL')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- question_bank (the master dataset — seeded/imported by your friend,
-- one row per authored question with its expected answer + keywords)
-- this is NOT tied to any one interview — it's the pool everyone picks from
-- ------------------------------------------------------------
-- reference_answer/keywords are NOT stored here — that data stays on the
-- FastAPI side; this table only needs what the Koa backend actually reads
CREATE TABLE question_bank (
    id                VARCHAR PRIMARY KEY,  -- the exact question_id from the spreadsheet (not generated) — shared key with the FastAPI service
    skill_id          INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    question_text     TEXT NOT NULL,
    difficulty_level  NUMERIC(3,2) NOT NULL  -- 0.0-1.0, the difficulty this question was authored at
);

CREATE INDEX idx_question_bank_skill ON question_bank(skill_id);
CREATE INDEX idx_question_bank_difficulty ON question_bank(skill_id, difficulty_level);

-- ------------------------------------------------------------
-- interviews (one user -> many interviews)
-- ------------------------------------------------------------
CREATE TYPE interview_status AS ENUM ('in_progress', 'completed');
CREATE TYPE starting_level AS ENUM ('easy', 'mid', 'expert');

CREATE TABLE interviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id            INT NOT NULL REFERENCES skills(id),  -- what the user picked on the select screen
    starting_level      starting_level NOT NULL,              -- what the user picked at the start
    current_difficulty  NUMERIC(3,2) NOT NULL,  -- 0.0-1.0 scale: adaptive pointer, updated after each score
    status              interview_status NOT NULL DEFAULT 'in_progress',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interviews_user ON interviews(user_id);

-- ------------------------------------------------------------
-- questions (one interview -> many questions)
-- this is a snapshot of a question_bank row at the moment it's asked in this
-- interview — keeps the interview self-contained even if the bank changes later.
-- Koa only needs question_text/difficulty_level here; reference_answer/keywords
-- stay on the FastAPI side, same as question_bank
-- ------------------------------------------------------------
CREATE TABLE questions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id        UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_bank_id    VARCHAR REFERENCES question_bank(id),  -- traceability back to the source question; NULL if LLM-generated on the fly
    question_text       TEXT NOT NULL,
    difficulty_level    NUMERIC(3,2) NOT NULL,  -- snapshot of the difficulty this question was asked at
    order_index         INT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (interview_id, order_index)
);

CREATE INDEX idx_questions_interview ON questions(interview_id);

-- ------------------------------------------------------------
-- answers (one question -> one answer)
-- consolidated: transcript + voice-confidence + NLP scores + feedback all in
-- one row, since the report is just a questions/answers JOIN — no need for
-- separate audio_features/scores tables
-- ------------------------------------------------------------
CREATE TABLE answers (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id            UUID NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
    transcript_text        TEXT,
    confidence_score       NUMERIC(5,4),  -- from the STT/voice-analysis service
    keyword_score          NUMERIC(5,4),
    tfidf_score            NUMERIC(5,4),
    semantic_score         NUMERIC(5,4),
    final_score            NUMERIC(5,4) NOT NULL,  -- source of truth for the adaptive difficulty algorithm
    matched_keywords       TEXT[],
    missing_keywords       TEXT[],
    strengths              TEXT[],
    weaknesses             TEXT[],
    areas_for_improvement  TEXT[],
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Example query: full interview report
-- (the JOIN you'll reuse for GET /api/interviews/:id/report)
-- ============================================================
-- SELECT
--     q.order_index,
--     q.question_text,
--     q.difficulty_level,
--     a.transcript_text,
--     a.confidence_score,
--     a.keyword_score,
--     a.tfidf_score,
--     a.semantic_score,
--     a.final_score
-- FROM questions q
-- LEFT JOIN answers a ON a.question_id = q.id
-- WHERE q.interview_id = $1
-- ORDER BY q.order_index;

-- ============================================================
-- Example: pick the next question from the bank
-- (closest difficulty_level to the target, for this skill,
--  excluding questions already asked in this interview)
-- ============================================================
-- SELECT *
-- FROM question_bank
-- WHERE skill_id = $1
--   AND id NOT IN (
--       SELECT question_bank_id FROM questions
--       WHERE interview_id = $2 AND question_bank_id IS NOT NULL
--   )
-- ORDER BY ABS(difficulty_level - $3) ASC
-- LIMIT 1;

-- ============================================================
-- Example: adjust difficulty after a score comes back
-- (full decision table is in the architecture doc alongside this file)
-- ============================================================
-- UPDATE interviews
-- SET current_difficulty = LEAST(current_difficulty + 0.20, 1.0)
-- WHERE id = $1
--   AND (SELECT final_score FROM answers WHERE id = $2) >= 0.7;
--
-- UPDATE interviews
-- SET current_difficulty = GREATEST(current_difficulty - 0.20, 0.0)
-- WHERE id = $1
--   AND (SELECT final_score FROM answers WHERE id = $2) < 0.4;
