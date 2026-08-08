# AI Interview Platform — Frontend API Guide

This is everything you need to wire up the screens to the backend. Every call below is
`Content-Type: application/json` unless noted otherwise. All routes except register/login need
the auth token from login sent as a header: `Authorization: Bearer <token>`.

---

## 1. Register screen

`POST /api/auth/register`

Request:
```json
{
  "name": "Smarika Pokharel",
  "email": "smarika@example.com",
  "password": "Smarika@123",
  "role": "admin"
}
```
ROLE MA KEII NARKHEYY.. BY DEFAULT USER JANXA HAII.

Response:
```json
{
    "success": true,
    "data": {
        "id": 1,
        "name": "Smarika Pokharel",
        "email": "smarika@example.com",
        "role": "admin"
    }
}
```

---

## 2. Login screen

`POST /api/auth/login`

Request:
```json
{ "email": "smarika@example.com", "password": "Smarika@123" }
```

Response: same shape as register — `{ user, token }`. Save the token, attach it to every
request after this.

```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoic21hcmlrYUBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc4NDE4NTgzOSwiZXhwIjoxNzg0MjcyMjM5fQ.jJvdc8yVn3DOns9UfzWW9VkNsSY_S_8KNSI6Q1PHfR8",
        "user": {
            "id": 1,
            "name": "Smarika Pokharel",
            "email": "smarika@example.com",
            "role": "admin"
        }
    }
}
```

---

## 3. Skill + difficulty select screen
ATTCH ROLE AND TOKKENNE HAIIII.

`GET /api/skills`

Response:
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "JavaScript"
        },
        {
            "id": 2,
            "name": "React"
        },
        {
            "id": 3,
            "name": "Data Structures"
        },
        {
            "id": 4,
            "name": "System Design"
        },
        {
            "id": 5,
            "name": "SQL"
        }
    ]
}
```

Render these as your ~5 select buttons. Alongside that, show your easy/mid/expert difficulty
picker — that one's just static UI, no API call needed for it.

---

## 4. "Start Interview" button

User has picked any no of  skill + one difficulty band. Send both together:

`POST /api/interviews`

Request:
```json
{
  "skill_ids": [2,3,4],
  "starting_level": "easy"
}
```
`starting_level` is one of `"easy"`, `"mid"`, `"expert"`.

Response — this already includes your first question, no extra call needed:
```json
{
    "interview_id": 8,
    "question": {
        "id": 41,
        "question_text": "What is binary search and what condition must be true for it to work?",
        "difficulty_level": 0.2
    }
}
```

Store `interview_id` and `question.id` — you'll need both. Both are plain integers now, not
uuids. Now show `question_text` and the mic button.

---

## 5. Mic recording loop (the main screen — this repeats every question)

1. User clicks mic, you record audio, user clicks stop → you have a `.wav`/`.webm` blob.
2. Upload it:

`POST /api/questions/:questionId/answer` — **multipart/form-data**, not JSON:

field name: audio
value: <the recorded blob/file>


(`:questionId` is the current `question.id` from step 4, or from the previous loop's
`next_question.id`. This is a plain integer now, e.g. `42` — not a uuid.)

3. Response — this covers both "show the score" and "here's the next question" in one shot:
```json
{
    "transcription": {
        "confidence_score": 0.7421,
        "message": "Your speech was transcribed with moderate confidence (74%). Some words may have been misheard."
    },
    "evaluation": {
        "keyword_score": 0,
        "tfidf_score": 0,
        "semantic_score": 0,
        "final_score": 0.0476,
        "matched_keywords": [],
        "missing_keywords": ["array", "linked list", "contiguous memory"],
        "negated_keywords": [],
        "strengths": [
            "Attempted the question"
        ],
        "weaknesses": [
            "Missed key concept(s): array, linked list, contiguous memory"
        ],
        "areas_for_improvement": [
            "Review and explicitly mention: array, linked list, contiguous memory",
            "Try using more of the precise terminology from the topic",
            "Answer's overall meaning drifted from what was expected — revisit the core concept"
        ]
    },
    "next_question": {
        "id": 57,
        "question_text": "What is the difference between a monolithic architecture and a microservices architecture?",
        "difficulty_level": 0.1,
        "skill_id": 4
    }
}
```

Notes on what changed from before:
- `confidence_score` is **not** inside `evaluation` — it lives under its own `transcription` block along with a ready-to-display `message`. It's about audio clarity, not answer quality, so it's kept separate on purpose.
- `evaluation` now also includes `matched_keywords`, `missing_keywords`, and `negated_keywords` — these were missing from the old doc. 
- `next_question.id` is a plain integer, not a uuid.
- `next_question` can be `null` if there are no questions left across any selected skill — that's your signal to stop the loop and prompt the user to end the interview, instead of calling the endpoint again.
- If you `POST` to an already-answered `questionId` (e.g. duplicate submit / retry), you get a different shape instead: `{ "message": "This question has already been answered. Continuing with the next question.", "next_question": {...} }` — no `evaluation` or `transcription` in that case, since nothing new was scored.

4. Show the `evaluation` (score + feedback) and `transcription.message` to the user.
5. When they're ready, display `next_question.question_text` and wait for the next mic click.
6. Go back to step 1 with `next_question.id` as the new `:questionId`.

This loop is the whole interview — repeat until you decide to end it (fixed number of
questions, or the user quitting, or `next_question` comes back `null`).

---

## 6. Ending the interview

`POST /api/interviews/:id/end` — `:id` is the `interview_id` from step 4. No body needed.
This is a plain integer now, e.g. `12` — not a uuid.

Call this when the question loop is done.

response:
```json
{
    "interview_id": 12,
    "status": "completed"
}
```

## 7. Results / report screen

`GET /api/interviews/:id/report`

Response:
```json
{
    "interview_id": 12,
    "skills": [
        {
            "skill": "React",
            "final_difficulty_reached": 0.65,
            "assessed_level": "mid",
            "average_score_at_that_level": 0.047,
            "average_confidence_score": 0.7421,
            "questions_asked": 1,
            "questions": [
                {
                    "order_index": 1,
                    "question_text": "Explain how React Fiber changed the reconciliation process compared to the old stack reconciler.",
                    "difficulty_level": 0.85,
                    "transcript_text": "You can pass the data from parent component to child component using context.",
                    "confidence_score": 0.7421,
                    "final_score": 0.047,
                    "strengths": [
                        "Attempted the question"
                    ],
                    "weaknesses": [
                        "Missed key concept(s): React Fiber, incremental rendering, concurrent mode"
                    ],
                    "areas_for_improvement": [
                        "Review and explicitly mention: React Fiber, incremental rendering, concurrent mode",
                        "Try using more of the precise terminology from the topic",
                        "Answer's overall meaning drifted from what was expected — revisit the core concept"
                    ]
                }
            ]
        },
        {
            "skill": "System Design",
            "final_difficulty_reached": 0.65,
            "assessed_level": "mid",
            "average_score_at_that_level": 0.0476,
            "average_confidence_score": 0.7421,
            "questions_asked": 2,
            "questions": [
                {
                    "order_index": 3,
                    "question_text": "How would you design a globally distributed database that stays consistent across regions?",
                    "difficulty_level": 0.85,
                    "transcript_text": "You can pass the data from parent component to child component using context.",
                    "confidence_score": 0.7421,
                    "final_score": 0.0476,
                    "strengths": [
                        "Attempted the question"
                    ],
                    "weaknesses": [
                        "Missed key concept(s): distributed database, multi-region, consensus"
                    ],
                    "areas_for_improvement": [
                        "Review and explicitly mention: distributed database, multi-region, consensus",
                        "Try using more of the precise terminology from the topic",
                        "Answer's overall meaning drifted from what was expected — revisit the core concept"
                    ]
                },
                {
                    "order_index": 6,
                    "question_text": "How would you design a notification system that supports email, SMS, and push notifications?",
                    "difficulty_level": 0.6,
                    "transcript_text": null,
                    "confidence_score": null,
                    "final_score": null,
                    "strengths": [],
                    "weaknesses": [],
                    "areas_for_improvement": []
                }
            ]
        },
        {
            "skill": "SQL",
            "final_difficulty_reached": 0.65,
            "assessed_level": "mid",
            "average_score_at_that_level": 0.0476,
            "average_confidence_score": 0.7421,
            "questions_asked": 1,
            "questions": [
                {
                    "order_index": 4,
                    "question_text": "How would you design a database schema and query strategy to efficiently support full-text search on millions of rows?",
                    "difficulty_level": 0.85,
                    "transcript_text": "You can pass the data from parent component to child component using context.",
                    "confidence_score": 0.7421,
                    "final_score": 0.0476,
                    "strengths": [
                        "Attempted the question"
                    ],
                    "weaknesses": [
                        "Missed key concept(s): full-text search, GIN index, tsvector"
                    ],
                    "areas_for_improvement": [
                        "Review and explicitly mention: full-text search, GIN index, tsvector",
                        "Try using more of the precise terminology from the topic",
                        "Answer's overall meaning drifted from what was expected — revisit the core concept"
                    ]
                }
            ]
        },
        {
            "skill": "Data Structures",
            "final_difficulty_reached": 0.45,
            "assessed_level": "mid",
            "average_score_at_that_level": 0.0476,
            "average_confidence_score": 0.7421,
            "questions_asked": 2,
            "questions": [
                {
                    "order_index": 2,
                    "question_text": "Explain how a trie data structure works and where it's useful.",
                    "difficulty_level": 0.85,
                    "transcript_text": "You can pass the data from parent component to child component using context.",
                    "confidence_score": 0.7421,
                    "final_score": 0.0476,
                    "strengths": [
                        "Attempted the question"
                    ],
                    "weaknesses": [
                        "Missed key concept(s): trie, prefix tree, autocomplete"
                    ],
                    "areas_for_improvement": [
                        "Review and explicitly mention: trie, prefix tree, autocomplete",
                        "Try using more of the precise terminology from the topic",
                        "Answer's overall meaning drifted from what was expected — revisit the core concept"
                    ]
                },
                {
                    "order_index": 5,
                    "question_text": "Explain how you would detect a cycle in a linked list.",
                    "difficulty_level": 0.7,
                    "transcript_text": "You can pass the data from parent component to child component using context.",
                    "confidence_score": 0.7421,
                    "final_score": 0.0476,
                    "strengths": [
                        "Attempted the question"
                    ],
                    "weaknesses": [
                        "Missed key concept(s): cycle detection, Floyd's algorithm, slow pointer"
                    ],
                    "areas_for_improvement": [
                        "Review and explicitly mention: cycle detection, Floyd's algorithm, slow pointer",
                        "Try using more of the precise terminology from the topic",
                        "Answer's overall meaning drifted from what was expected — revisit the core concept"
                    ]
                }
            ]
        }
    ]
}
```

HAREK QUESTION KO SCORE (`final_score`), HAREK SKILL MA KASTO THIYO (`skill`, `assessed_level`,
`average_score_at_that_level`), AND `order_index` (SEQUENCE — order_index 4 MEANS THAT QUESTION
WAS ASKED 4TH OVERALL IN THE INTERVIEW, ACROSS ALL SKILLS, NOT JUST WITHIN THAT SKILL) — SABAI
YO EK RESPONSE BATA FRONTEND MA DEKHAUNA SAKINCHA.

One row per question asked, in order — enough to render a full breakdown/summary page.

---

## 8. To get interview status

`GET /api/interviews/:id` — `:id` is the `interview_id`, a plain integer.

Response:
```json
{
    "interview_id": 12,
    "skills": [
        "React",
        "Data Structures",
        "System Design",
        "SQL"
    ],
    "starting_level": "expert",
    "status": "completed",
    "created_at": "2026-07-23T09:12:34.321Z"
}
```

---

## Quick reference — call order


register / login
|
GET /api/skills -> render skill buttons + difficulty picker
|
POST /api/interviews -> get interview_id + question #1
|
[mic click]
|
POST /api/questions/:questionId/answer -> get evaluation + next_question <-- loops here
|
(repeat until interview ends)
|
POST /api/interviews/:id/end
|
GET /api/interviews/:id/report -> results screen


## Notes for the frontend

- Every question's audio upload is **multipart/form-data** with field name `audio` — everything
  else is plain JSON.
- You never talk to the question dataset directly. You always get a question back as JSON from
  either `POST /api/interviews` (first question) or `POST /api/questions/:questionId/answer`
  (every question after).
- `difficulty_level` on a question is a float 0.0–1.0, not a label — if you want to show a badge
  like "Easy/Mid/Expert" on screen, bucket it yourself: `< 0.35` easy, `0.35–0.65` mid, `> 0.65`
  expert.
- All ids (`interview_id`, `question.id`, `next_question.id`) are plain integers now — none of
  them are uuids anymore.

---

for the end do:

Submit all 5 answers via POST /api/questions/:questionId/answer (using each next_question.id from the previous response)
POST /api/interviews/:id/end
GET /api/interviews/:id/report