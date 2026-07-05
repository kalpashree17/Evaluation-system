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
  "name": "Kalpa",
  "email": "kalpa@example.com",
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
        "name": "Kalpa",
        "email": "kalpa@example.com",
        "role": "admin"
    }
}
```

---

## 2. Login screen

`POST /api/auth/login`

Request:
```json
{ "email": "kalpa@example.com", "password": "Smarika@123" }
```

Response: same shape as register — `{ user, token }`. Save the token, attach it to every
request after this.

{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoia2FscGFAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODMyNjEyNDMsImV4cCI6MTc4MzM0NzY0M30.-ORzHbT1XOzKHhPVg7xUn1acfPqUgMAUfRpwML0aJAI",
        "user": {
            "id": 1,
            "name": "Kalpa",
            "email": "kalpa@example.com",
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

Render these as your ~20 select buttons. Alongside that, show your easy/mid/expert difficulty
picker — that one's just static UI, no API call needed for it.

---

## 4. "Start Interview" button

User has picked one skill + one difficulty band. Send both together:

`POST /api/interviews`

Request:
```json
{
  "skill_id": "2",
  "starting_level": "mid"
}
```
`starting_level` is one of `"easy"`, `"mid"`, `"expert"`.

Response — this already includes your first question, no extra call needed:
```json
{
  "interview_id": "1",
  "question": {
    "id": "1",
    "question_text": "Explain how you'd design a rate limiter.",
    "difficulty_level": 0.50
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
    "confidence_score": 0.78,
    "keyword_score": 0.65,
    "tfidf_score": 0.58,
    "semantic_score": 0.81,
    "final_score": 0.72,
    "strengths": ["Clear structure", "Used correct terminology"],
    "weaknesses": ["Missed edge case discussion"],
    "areas_for_improvement": ["Mention time complexity explicitly"]
  },
  "next_question": {
    "id": "uuid-q2",
    "question_text": "How would you handle a burst of traffic?",
    "difficulty_level": 0.60
  }
}
```

4. Show the `evaluation` (score + feedback) to the user.
5. When they're ready, display `next_question.question_text` and wait for the next mic click.
6. Go back to step 1 with `next_question.id` as the new `:questionId`.

This loop is the whole interview — repeat until you decide to end it (fixed number of
questions, a timer, or the user quitting).

---

## 6. Ending the interview

`PATCH /api/interviews/:id/end` — `:id` is the `interview_id` from step 4. No body needed.

Call this when the question loop is done.

---

## 7. Results / report screen

`GET /api/interviews/:id/report`

Response:
```json
{
  "questions": [
    {
      "order_index": 1,
      "question_text": "Explain how you'd design a rate limiter.",
      "difficulty_level": 0.50,
      "transcript_text": "So the way I'd approach this...",
      "confidence_score": 0.78,
      "keyword_score": 0.65,
      "tfidf_score": 0.58,
      "semantic_score": 0.81,
      "final_score": 0.72
    }
  ]
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
