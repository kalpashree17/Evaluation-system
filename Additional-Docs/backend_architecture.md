# AI Interview Platform — Backend Architecture

This is the full pipeline from "candidate clicks the microphone" to "next question appears",


---

## 1. Who owns what

There are three services talking to each other. Keep them as three separate things, don't blur them:

| Service | Owner | Language | Job |
|---|---|---|---|
| **Frontend** | Kalpa | React | Record audio, show questions, show feedback |
| **Main backend (API + DB)** | Smarika (You) | Node/Express | Auth, DB, orchestrates everything, does speech-to-text + voice confidence analysis |
| **NLP scoring service** | Akriti (Your Friend)| Python | Takes transcript text, runs keyword/TF-IDF/SBERT scoring, returns final_score + feedback |

Your Express backend is the **hub**. It talks to Postgres, it talks to Whisper, and it talks to your
friend's Python service over plain HTTP (a POST request with JSON in, JSON out — that's all a
"backend calling another backend" means in practice).

Important: Whisper transcription and audio feature extraction (pitch, pauses, speech rate) are
usually done with Python libraries (`faster-whisper`, `librosa`). Doing this in pure Node.js is painful —
there's no good equivalent. So realistically **you'll run a small Python process for the audio
side too**, even though the "main" backend is Express. Two common ways to do this:

- **Easiest**: write a tiny Python script/Flask app that does STT + audio analysis, and have Express
  call it over HTTP just like it calls your friend's scoring service. Now you have two Python
  microservices (yours for audio, your friend's for text) and one Express orchestrator.
- **Alternative**: use OpenAI's hosted Whisper API from Express directly (it's just an HTTPS call,
  no Python needed) for transcription, but you'd still need something to compute pitch/pause/energy
  from the raw audio — that part is still easiest in Python (librosa).

Either is fine. Pick the first if you want everything self-hosted and free; pick the hosted Whisper
API if you want less infrastructure to run and don't mind an API cost per request.

---

## 2. End-to-end flow, step by step

```
1. Candidate clicks mic -> frontend records audio -> stops -> gets a .wav/.webm blob

2. Frontend uploads the blob:
   POST /api/questions/:questionId/answer   (multipart/form-data, field: audio)

3. Express backend:
   a. Saves the audio file (disk, or S3/Supabase storage — just needs a URL)
   b. Sends the audio to the STT + Voice Analysis service
      -> gets back: { transcript_text, confidence_score, pitch, pause_count,
                       speech_rate, energy, filler_count }
   c. Sends transcript_text + question's reference_answer + keywords to your
      friend's Python NLP scoring service
      -> gets back: { keyword_score, tfidf_score, semantic_score, final_score,
                       strengths, weaknesses, areas_for_improvement }
   d. Writes rows into: answers, audio_features, scores
   e. Runs the difficulty adjustment (section 4 below) -> updates interviews.current_difficulty
   f. Generates/fetches the next question at the new difficulty
   g. Returns everything to the frontend in one response:
      { evaluation: {...}, next_question: {...} }

4. Frontend shows the score/feedback, then loads the next question
```

---

## 3. The two JSON contracts (agree on these with your friend NOW)

This is the part that actually matters for teamwork — if you both agree on these two shapes,
you can build your pieces independently and they'll just plug together.

### Contract A — Express -> your own STT/audio service

**Request** (multipart, or base64 if you prefer JSON-only):
```json
{
  "audio_file": "<binary or base64 wav>"
}
```

**Response**:
```json
{
  "transcript_text": "So the way I'd approach this problem is...",
  "confidence_score": 0.78,
  "pitch": 142.5,
  "pause_count": 4,
  "speech_rate": 2.3,
  "energy": 0.61,
  "filler_count": 3
}
```

### Contract B — Express -> your friend's Python NLP scoring service

**Request**:
```json
{
  "transcript_text": "So the way I'd approach this problem is...",
  "reference_answer": "A strong answer discusses time complexity, edge cases...",
  "keywords": ["time complexity", "edge case", "recursion"]
}
```

**Response**:
```json
{
  "keyword_score": 0.65,
  "tfidf_score": 0.58,
  "semantic_score": 0.81,
  "final_score": 0.72,
  "strengths": ["Clear structure", "Used correct terminology"],
  "weaknesses": ["Missed edge case discussion"],
  "areas_for_improvement": ["Mention time complexity explicitly"]
}
```

`final_score` is always a single float from 0.0 to 1.0 — this is the number your Express backend
reads to decide the next question's difficulty. Everyone should treat this as the source of truth,
not `keyword_score`/`tfidf_score`/`semantic_score` individually (those are just for showing
breakdown feedback on the frontend).

Send this section straight to your friend — it's the whole handoff.

---

## 4. Adaptive difficulty logic (0.0 to 1.0 scale)

Bands:

| Band | Range |
|---|---|
| Easy | 0.0 - 0.3 |
| Mid | 0.4 - 0.6 |
| Expert | 0.7 - 1.0 |

**Start of interview**: user picks a starting band on the frontend (easy/mid/expert). Map that to a
starting `current_difficulty`:
```
easy   -> 0.20
mid    -> 0.50
expert -> 0.85
```

**After every answer is scored**, adjust `current_difficulty` based on `final_score`:

| final_score | Adjustment |
|---|---|
| >= 0.75 | +0.20 (push toward harder) |
| 0.55 - 0.74 | +0.05 (small nudge up) |
| 0.35 - 0.54 | 0 (stay put) |
| 0.20 - 0.34 | -0.10 (small nudge down) |
| < 0.20 | -0.20 (pull toward easier) |

Clamp the result to `[0.0, 1.0]` always:
```js
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

**Picking the next question** at the new `current_difficulty`:
- If questions are pre-written in a bank: pick the question whose `difficulty_level` is closest to
  `current_difficulty` (and not already asked in this interview).
- If questions are LLM-generated on the fly: pass `current_difficulty` straight into the generation
  prompt (e.g. "generate a question at difficulty 0.65 out of 1.0 for a [job_role] interview") and
  store whatever difficulty value you asked for as that question's `difficulty_level`.

Either way, the number that drives everything is `interviews.current_difficulty`, and it always lives
in the `interviews` table (see schema.sql) — every new question snapshots it into
`questions.difficulty_level` at creation time so you have a full history of how difficulty moved
across the interview.

---

## 5. Endpoints (updated with the audio flow)

```
Auth
POST   /api/auth/register
POST   /api/auth/login

Interviews
POST   /api/interviews                    body: { job_role, starting_level }
                                           -> creates interview row, sets current_difficulty
                                              from the band mapping in section 4
GET    /api/interviews/:id
GET    /api/interviews/:id/report         -> full transcript + scores (the JOIN query in schema.sql)
PATCH  /api/interviews/:id/end

Questions
POST   /api/interviews/:id/questions      -> generates/fetches the very first question
GET    /api/questions/:id

Answers (the main event)
POST   /api/questions/:id/answer          multipart body: { audio: <file> }
  Express does, in order:
    1. save audio file, get a URL
    2. call STT/audio service (Contract A) -> transcript + confidence + voice features
    3. call NLP scoring service (Contract B) -> keyword/tfidf/semantic/final scores + feedback
    4. INSERT into answers, audio_features, scores
    5. run adjustDifficulty() -> UPDATE interviews.current_difficulty
    6. generate/pick next question at new difficulty -> INSERT into questions
    7. respond:
       {
         "evaluation": { confidence_score, keyword_score, tfidf_score,
                          semantic_score, final_score, strengths,
                          weaknesses, areas_for_improvement },
         "next_question": { id, question_text, difficulty_level }
       }

GET    /api/answers/:id/evaluation        -> re-fetch scores for one answer if needed
```

---

## 6. What goes in the database

Already built - see `schema.sql` next to this doc. Quick recap of what maps where:

- `interviews.current_difficulty` - the single number the adaptive algorithm reads and writes
- `interviews.starting_level` - what the user picked at the start (easy/mid/expert)
- `questions.difficulty_level` - snapshot of `current_difficulty` at the moment that question was made
- `answers.transcript_text` - Whisper output
- `audio_features.*` - everything from Contract A except the transcript
- `scores.*` - everything from Contract B

Nothing new needs to be added to the schema for this - the decimal difficulty change I already
made covers the 0.0-1.0 scale you're using.
