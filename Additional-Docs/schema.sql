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
CREATE TABLE question_bank (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id          INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    question_text     TEXT NOT NULL,
    reference_answer  TEXT NOT NULL,      -- expected answer, used for TF-IDF / SBERT scoring
    keywords          TEXT[] NOT NULL,    -- used for Algorithm 1 (keyword matching)
    difficulty_level  NUMERIC(3,2) NOT NULL  -- 0.0-1.0, the difficulty this question was authored at
);

CREATE INDEX idx_question_bank_skill ON question_bank(skill_id);
CREATE INDEX idx_question_bank_difficulty ON question_bank(skill_id, difficulty_level);

-- ------------------------------------------------------------
-- interviews (one user -> many interviews)
-- ------------------------------------------------------------
CREATE TYPE interview_status AS ENUM ('in_progress', 'completed', 'abandoned');

CREATE TABLE interviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id            INT NOT NULL REFERENCES skills(id),  -- what the user picked on the select screen
    status              interview_status NOT NULL DEFAULT 'in_progress',
    current_difficulty  NUMERIC(3,2) NOT NULL DEFAULT 0.50,  -- 0.0-1.0 scale: adaptive pointer, updated after each score
    starting_level      TEXT NOT NULL DEFAULT 'mid',          -- 'easy' | 'mid' | 'expert', chosen by user at start
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at            TIMESTAMPTZ
);

CREATE INDEX idx_interviews_user ON interviews(user_id);

-- ------------------------------------------------------------
-- questions (one interview -> many questions)
-- this is a COPY of a question_bank row at the moment it's asked in this
-- interview — keeps the interview self-contained even if the bank changes later
-- ------------------------------------------------------------
CREATE TABLE questions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id        UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_bank_id    UUID REFERENCES question_bank(id),  -- traceability back to the source question; NULL if LLM-generated on the fly
    question_text       TEXT NOT NULL,
    reference_answer    TEXT,             -- "ideal" answer used by TF-IDF / SBERT scoring
    keywords            TEXT[],           -- used by Algorithm 1 (keyword matching)
    reference_embedding VECTOR(384),      -- used by Algorithm 3 (SBERT); nullable if computed in Python only
    difficulty_level    NUMERIC(3,2) NOT NULL,  -- snapshot of the difficulty this question was asked at
    order_index         INT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (interview_id, order_index)
);

CREATE INDEX idx_questions_interview ON questions(interview_id);

-- ------------------------------------------------------------
-- answers (one question -> one answer)
-- ------------------------------------------------------------
CREATE TABLE answers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
    transcript_text TEXT,
    audio_url       TEXT,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- audio_features (one answer -> one audio_features row)
-- confidence analysis branch: pitch, pauses, speech rate, energy, fillers
-- ------------------------------------------------------------
CREATE TABLE audio_features (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id         UUID NOT NULL UNIQUE REFERENCES answers(id) ON DELETE CASCADE,
    pitch             NUMERIC,
    pause_count       INT,
    speech_rate       NUMERIC,
    energy            NUMERIC,
    filler_count      INT,
    confidence_score  NUMERIC NOT NULL
);

-- ------------------------------------------------------------
-- scores (one answer -> one scores row)
-- keyword / TF-IDF / SBERT -> final weighted score + feedback
-- ------------------------------------------------------------
CREATE TABLE scores (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id              UUID NOT NULL UNIQUE REFERENCES answers(id) ON DELETE CASCADE,
    keyword_score          NUMERIC,
    tfidf_score            NUMERIC,
    semantic_score         NUMERIC,
    final_score            NUMERIC NOT NULL,
    strengths              TEXT[],
    weaknesses             TEXT[],
    areas_for_improvement  TEXT[],
    evaluated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
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
--     af.confidence_score,
--     s.keyword_score,
--     s.tfidf_score,
--     s.semantic_score,
--     s.final_score
-- FROM questions q
-- JOIN answers a ON a.question_id = q.id
-- LEFT JOIN audio_features af ON af.answer_id = a.id
-- LEFT JOIN scores s ON s.answer_id = a.id
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
--   AND (SELECT final_score FROM scores WHERE answer_id = $2) >= 0.7;
--
-- UPDATE interviews
-- SET current_difficulty = GREATEST(current_difficulty - 0.20, 0.0)
-- WHERE id = $1
--   AND (SELECT final_score FROM scores WHERE answer_id = $2) < 0.4;
