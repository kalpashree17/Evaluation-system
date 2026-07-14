# AI Interview Evaluation System — Backend Spec (Koa/Node side)

This is the consolidated, final reference for what YOUR backend (Koa + TypeORM + Postgres) needs to do. It merges the schema, the end-to-end flow, and the adaptive-difficulty algorithm into one source of truth.

---

## 1. Who owns what

| Service | Owner | Job |
|---|---|---|
| Frontend | — | Record audio, show questions, show feedback |
| Main backend (this project) | You | Auth, DB, question selection, difficulty adaptation, orchestrates calls to the other two services |
| STT / audio analysis | Whisper (self-hosted or hosted API) | Converts `.wav`/`.webm` speech to `transcript_text` |
| NLP scoring service | Friend (Python/FastAPI) | Takes `transcript_text` + reference answer/keywords, returns `keyword_score`, `tfidf_score`, `semantic_score`, `final_score`, feedback |

Your backend never runs Whisper's model or the NLP scoring logic itself — it calls out to those services over HTTP and stores whatever comes back.

---

## 2. Database schema (Postgres — source of truth)

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()

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
-- skills (fixed list shown on the "select a skill" screen)
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
    ('JavaScript'), ('React'), ('Data Structures'),
    ('System Design'), ('SQL')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- question_bank (master dataset, imported from the shared spreadsheet)
-- reference_answer/keywords stay on the FastAPI side — only what
-- the Koa backend actually reads lives here
-- ------------------------------------------------------------
CREATE TABLE question_bank (
    id                VARCHAR PRIMARY KEY,  -- exact question_id from the spreadsheet, shared key with FastAPI
    skill_id          INT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    question_text     TEXT NOT NULL,
    difficulty_level  NUMERIC(3,2) NOT NULL  -- 0.00–1.00
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
    skill_id            INT NOT NULL REFERENCES skills(id),
    starting_level      starting_level NOT NULL,
    current_difficulty  NUMERIC(3,2) NOT NULL,  -- 0.00–1.00, adaptive pointer
    status              interview_status NOT NULL DEFAULT 'in_progress',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interviews_user ON interviews(user_id);

-- ------------------------------------------------------------
-- questions (one interview -> many questions)
-- snapshot of a question_bank row at the moment it was asked
-- ------------------------------------------------------------
CREATE TABLE questions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id        UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_bank_id    VARCHAR REFERENCES question_bank(id),  -- NULL if generated on the fly
    question_text       TEXT NOT NULL,
    difficulty_level    NUMERIC(3,2) NOT NULL,  -- snapshot of current_difficulty at creation time
    order_index         INT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (interview_id, order_index)
);

CREATE INDEX idx_questions_interview ON questions(interview_id);

-- ------------------------------------------------------------
-- answers (one question -> one answer)
-- consolidated: transcript + confidence + NLP scores + feedback, one row
-- ------------------------------------------------------------
CREATE TABLE answers (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id            UUID NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
    transcript_text        TEXT,
    confidence_score       NUMERIC(5,4),  -- from STT/voice-analysis
    keyword_score          NUMERIC(5,4),
    tfidf_score            NUMERIC(5,4),
    semantic_score         NUMERIC(5,4),
    final_score            NUMERIC(5,4) NOT NULL,  -- source of truth for difficulty adaptation
    matched_keywords       TEXT[],
    missing_keywords       TEXT[],
    strengths              TEXT[],
    weaknesses             TEXT[],
    areas_for_improvement  TEXT[],
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. End-to-end flow

```
1. User registers/logs in
2. Frontend calls GET /api/skills -> shows skill picker
3. User picks a skill + a difficulty band (easy/mid/expert)
4. POST /api/interviews  { skill_id, starting_level }
      -> creates interview row, maps starting_level to current_difficulty
      -> picks the closest-difficulty question from question_bank
      -> snapshots it into questions (order_index = 1)
      -> returns { interview_id, question: { id, question_text, difficulty_level } }
5. Frontend shows question_text + mic button
6. User records answer -> gets a .wav/.webm blob
7. POST /api/questions/:questionId/answer   (multipart/form-data, field: audio)
   Backend does, in order:
      a. Save the audio file (disk or object storage)
      b. Send audio to Whisper -> get transcript_text (+ confidence_score if available)
      c. Send transcript_text + question's reference_answer/keywords to friend's
         NLP scoring service -> get keyword_score, tfidf_score, semantic_score,
         final_score, matched_keywords, missing_keywords, strengths, weaknesses,
         areas_for_improvement
      d. INSERT a row into answers with all of the above
      e. Run adjustDifficulty(interview.current_difficulty, final_score)
         -> UPDATE interviews.current_difficulty
      f. Run pickNextQuestion() at the new difficulty (see section 4)
         -> INSERT the new row into questions (order_index + 1)
      g. Respond:
         {
           "evaluation": { confidence_score, keyword_score, tfidf_score,
                            semantic_score, final_score, strengths,
                            weaknesses, areas_for_improvement },
           "next_question": { id, question_text, difficulty_level } | null
         }
8. Frontend shows the score/feedback, then the next question. Repeat from step 6.
9. When the loop ends (fixed question count, timer, or user quits):
   POST /api/interviews/:id/end
      -> marks interview completed
      -> computes averages from the backend's own `answers` table (no need to
         call the friend's service again — you already have every score stored)
      -> returns { interview_id, total_questions_answered, average_*, per_question_scores }
10. GET /api/interviews/:id/report -> full questions+answers JOIN, for a
    detailed results screen at any time
```

---

## 4. Adaptive difficulty logic — the custom algorithm you own

This is the core piece that's entirely your responsibility: after every scored answer, decide whether the next question should be harder, easier, or the same, then pick the actual next question to ask.

### Bands

| Band | Range |
|---|---|
| Easy | 0.0 – 0.3 |
| Mid | 0.4 – 0.6 |
| Expert | 0.7 – 1.0 |

### Starting difficulty (mapped from the user's pick at interview start)

```javascript
const LEVEL_TO_DIFFICULTY = { easy: 0.20, mid: 0.50, expert: 0.85 };
```

### Step 1 — adjust difficulty based on the score just received

The `final_score` from the friend's scoring service (0.0–1.0) is the single number that drives this — not `keyword_score`/`tfidf_score`/`semantic_score` individually (those are just for showing a breakdown on the frontend).

| `final_score` | Adjustment | Meaning |
|---|---|---|
| >= 0.75 | +0.20 | Good answer — push toward harder questions |
| 0.55 – 0.74 | +0.05 | Decent answer — small nudge up |
| 0.35 – 0.54 | 0 | Middling — stay at the same difficulty |
| 0.20 – 0.34 | -0.10 | Weak answer — small nudge down |
| < 0.20 | -0.20 | Poor answer — pull toward easier questions |

Always clamp the result to `[0.0, 1.0]`.

```javascript
function adjustDifficulty(current, finalScore) {
  let delta;

  if (finalScore >= 0.75) delta = 0.20;
  else if (finalScore >= 0.55) delta = 0.05;
  else if (finalScore >= 0.35) delta = 0.0;
  else if (finalScore >= 0.20) delta = -0.10;
  else delta = -0.20;

  const next = current + delta;
  return Math.min(1.0, Math.max(0.0, next));
}
```

### Step 2 — pick the next question at the new difficulty

Rule: closest `difficulty_level` to the target, for this skill, excluding questions already asked in this interview.

```sql
SELECT *
FROM question_bank
WHERE skill_id = $1
  AND id NOT IN (
      SELECT question_bank_id FROM questions
      WHERE interview_id = $2 AND question_bank_id IS NOT NULL
  )
ORDER BY ABS(difficulty_level - $3) ASC
LIMIT 1;
```

```javascript
export const pickNextQuestion = async ({ skillId, targetDifficulty, interviewId }) => {
  const askedQuestions = await questionRepo().find({
    where: { interview: { id: interviewId } },
    relations: { questionBank: true },
  });
  const askedBankIds = askedQuestions.map((q) => q.questionBank?.id).filter(Boolean);

  const qb = questionBankRepo()
    .createQueryBuilder("qb")
    .where("qb.skill_id = :skillId", { skillId });

  if (askedBankIds.length > 0) {
    qb.andWhere("qb.id NOT IN (:...askedBankIds)", { askedBankIds });
  }

  return qb
    .orderBy("ABS(qb.difficulty_level - :target)", "ASC")
    .setParameter("target", targetDifficulty)
    .getOne(); // null if no questions left for this skill
};
```

### Step 3 — put it together after every answer is scored

```javascript
export const processAnswerAndGetNext = async ({ interviewId, finalScore }) => {
  const interview = await interviewRepo().findOne({
    where: { id: interviewId },
    relations: { skill: true },
  });

  const newDifficulty = adjustDifficulty(parseFloat(interview.currentDifficulty), finalScore);

  interview.currentDifficulty = newDifficulty;
  await interviewRepo().save(interview);

  const bankQuestion = await pickNextQuestion({
    skillId: interview.skill.id,
    targetDifficulty: newDifficulty,
    interviewId: interview.id,
  });

  if (!bankQuestion) return { nextQuestion: null }; // ran out of questions for this skill

  const askedCount = await questionRepo().count({ where: { interview: { id: interviewId } } });

  const newQuestion = await questionRepo().save(
    questionRepo().create({
      interview: { id: interviewId },
      questionBank: { id: bankQuestion.id },
      questionText: bankQuestion.questionText,
      difficultyLevel: newDifficulty,
      orderIndex: askedCount + 1,
    })
  );

  return { nextQuestion: newQuestion };
};
```

**Key invariant**: `interviews.current_difficulty` is the single live number that drives everything. Every new `questions` row snapshots it at creation time into `questions.difficulty_level`, so you always have a full history of how difficulty moved across the interview, even though `current_difficulty` itself keeps changing.

---

## 5. Endpoints — final list

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/skills

POST   /api/interviews                    { skill_id, starting_level } -> { interview_id, question }
GET    /api/interviews/:id
GET    /api/interviews/:id/report
POST   /api/interviews/:id/end

POST   /api/questions/:id/answer          multipart, field: audio
                                           -> { evaluation, next_question }
```

---

## 6. The two contracts with the other two services

### Contract A — Backend → Whisper/STT service

Request: raw audio (multipart or base64)
Response:
```json
{
  "transcript_text": "So the way I'd approach this problem is...",
  "confidence_score": 0.78
}
```

### Contract B — Backend → Friend's NLP scoring service

Request:
```json
{
  "transcript_text": "So the way I'd approach this problem is...",
  "reference_answer": "A strong answer discusses time complexity, edge cases...",
  "keywords": ["time complexity", "edge case", "recursion"]
}
```

Response:
```json
{
  "keyword_score": 0.65,
  "tfidf_score": 0.58,
  "semantic_score": 0.81,
  "final_score": 0.72,
  "matched_keywords": ["..."],
  "missing_keywords": ["..."],
  "strengths": ["Clear structure", "Used correct terminology"],
  "weaknesses": ["Missed edge case discussion"],
  "areas_for_improvement": ["Mention time complexity explicitly"]
}
```

`final_score` is always 0.0–1.0 and is the only number the difficulty algorithm reads.
