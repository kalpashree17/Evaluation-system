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
    "interview_id": "093b0bc9-0a76-461a-9e6a-a1274fdd8f7d",
    "question": {
        "id": "9484d6ae-a552-43e7-bca8-95b512aec89a",
        "question_text": "What is binary search and what condition must be true for it to work?",
        "difficulty_level": 0.2
    }
}
```

Store `interview_id` and `question.id` — you'll need both. Now show `question_text` and the mic
button.

---

## 5. Mic recording loop (the main screen — this repeats every question)

1. User clicks mic, you record audio, user clicks stop → you have a `.wav`/`.webm` blob.
2. Upload it:

`POST /api/questions/:questionId/answer` — **multipart/form-data**, not JSON:

```
field name: audio
value: <the recorded blob/file>
```

(`:questionId` is the current `question.id` from step 4, or from the previous loop's
`next_question.id`.)

3. Response — this covers both "show the score" and "here's the next question" in one shot:
```json
{
    "evaluation": {
        "confidence_score": 0.7421,
        "keyword_score": 0,
        "tfidf_score": 0,
        "semantic_score": 0,
        "final_score": 0.0476,
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
        "id": "699258cd-da40-4ada-8566-ccd002703e07",
        "question_text": "What is the difference between a monolithic architecture and a microservices architecture?",
        "difficulty_level": 0.1,
        "skill_id": 4
    }
}
```

4. Show the `evaluation` (score + feedback) to the user.
5. When they're ready, display `next_question.question_text` and wait for the next mic click.
6. Go back to step 1 with `next_question.id` as the new `:questionId`.

This loop is the whole interview — repeat until you decide to end it (fixed number of
questions,or the user quitting).

---

## 6. Ending the interview

`POST /api/interviews/:id/end` — `:id` is the `interview_id` from step 4. No body needed.

Call this when the question loop is done.

response:
{
    "interview_id": "09c0e602-6e1f-4097-a008-ffa2a59c517e",
    "status": "completed"
}

---

## 7. Results / report screen

`GET /api/interviews/:id/report`

Response:
```json
{
    "interview_id": "c9b1131d-24e0-49eb-a2da-835422edcf98",
    "skills": [
        {
            "skill": "React",
            "final_difficulty_reached": 0.65,
            "assessed_level": "mid",
            "average_score_at_that_level": 0.047,
            "questions_asked": 1,
            "questions": [
                {
                    "order_index": 1,
                    "question_text": "Explain how React Fiber changed the reconciliation process compared to the old stack reconciler.",
                    "difficulty_level": 0.85,
                    "transcript_text": "You can pass the data from parent component to child component using context.",
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
            "questions_asked": 2,
            "questions": [
                {
                    "order_index": 3,
                    "question_text": "How would you design a globally distributed database that stays consistent across regions?",
                    "difficulty_level": 0.85,
                    "transcript_text": "You can pass the data from parent component to child component using context.",
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
            "questions_asked": 1,
            "questions": [
                {
                    "order_index": 4,
                    "question_text": "How would you design a database schema and query strategy to efficiently support full-text search on millions of rows?",
                    "difficulty_level": 0.85,
                    "transcript_text": "You can pass the data from parent component to child component using context.",
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
            "questions_asked": 2,
            "questions": [
                {
                    "order_index": 2,
                    "question_text": "Explain how a trie data structure works and where it's useful.",
                    "difficulty_level": 0.85,
                    "transcript_text": "You can pass the data from parent component to child component using context.",
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

HERE IN FFORENNED I WNAT TO SHOWW.. HAREK QUESTION KOO SCORE. AND HAREK SKILL MA KASTO THEO BHENRA.. AND TEHSMA TYO ORDER INDEX BHNEYYKO..QUESTION KO SEQUENCE LA ORDER INDEX 4 BHENKO. TYO QUETSION 4RYH MA SODHYA THEOO.. ANI TESHMA ESTO STO GARAYO BHENR SABBAI DAEKHNEY LA FONRENNED MAA. HUHUHU



8. TO GET INTEVIEW KO STATUUSS:

http://localhost:4000/api/interviews/:ID 
WHERE ID IS INTERVIEW id

RESPOSE: {
    "interview_id": "c9b1131d-24e0-49eb-a2da-835422edcf98",
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

One row per question asked, in order — enough to render a full breakdown/summary page.

---

## Quick reference — call order

```
register / login
      |
GET /api/skills                          -> render skill buttons + difficulty picker
      |
POST /api/interviews                     -> get interview_id + question #1
      |
   [mic click]
      |
POST /api/questions/:questionId/answer   -> get evaluation + next_question   <-- loops here
      |
   (repeat until interview ends)
      |
PATCH /api/interviews/:id/end
      |
GET /api/interviews/:id/report           -> results screen
```

## Notes for the frontend

- Every question's audio upload is **multipart/form-data** with field name `audio` — everything
  else is plain JSON.
- You never talk to the question dataset directly. You always get a question back as JSON from
  either `POST /api/interviews` (first question) or `POST /api/questions/:questionId/answer`
  (every question after).
- `difficulty_level` on a question is a float 0.0–1.0, not a label — if you want to show a badge
  like "Easy/Mid/Expert" on screen, bucket it yourself: `< 0.35` easy, `0.35–0.65` mid, `> 0.65`
  expert.
-------------------------------------

for the end do: 

Submit all 5 answers via POST /api/questions/:questionId/answer (using each next_question.id from the previous response)
POST /api/interviews/:id/end
GET /api/interviews/:id/report