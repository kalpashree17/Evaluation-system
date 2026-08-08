# Evaluation System Charts

These charts reflect the services and algorithms currently implemented in this
repository. They are written in Mermaid so they remain version-controlled,
editable, and render in GitHub, GitLab, and Mermaid-compatible documentation
viewers.

## Whisper transcription and confidence-analysis algorithm

```mermaid
flowchart TD
    A[Candidate audio<br/>WAV / WebM / MP3] --> B[FastAPI /transcribe]
    B --> C[Store upload in a temporary file]

    C --> D[Faster-Whisper small model<br/>language=en, beam_size=5]
    D --> E[Transcript text]
    D --> F[Word timestamps]

    C --> G[Load and normalize audio]
    G --> H[Convert to mono and resample to 16 kHz]
    H --> I[Frame audio<br/>25 ms frames, 10 ms hop, Hamming window]
    I --> J[Extract signal features]
    J --> K[Pitch contour F0]
    J --> L[RMS energy]
    J --> M[Silent regions / pauses]

    F --> N[Speech-rate score]
    M --> O[Pause score]
    K --> P[Pitch-variation score]
    L --> Q[Energy-stability score]
    M --> R[Silence-ratio score]

    subgraph Acoustic[Acoustic delivery score]
        N --> S[Weighted acoustic fusion]
        O --> S
        P --> S
        Q --> S
        R --> S
        S --> T[Acoustic confidence A]
    end

    E --> U[Filler-behaviour score]
    E --> V[Lexical-certainty score]
    E --> W[Fluency score]
    E --> X[Response-organization score]

    subgraph Communication[Transcript communication score]
        U --> Y[Weighted communication fusion]
        V --> Y
        W --> Y
        X --> Y
        Y --> Z[Communication confidence C]
    end

    T --> AA[Confidence fusion]
    Z --> AA
    AA --> AB[Final confidence score<br/>clamped to 0.0 to 1.0]
    AB --> AC[Return transcript, tier scores,<br/>breakdowns, and raw features]
```

### Confidence scoring model

| Tier | Measures | Weights within tier |
|---|---|---|
| Acoustic delivery | Speech rate, pauses, pitch variation, energy stability, silence ratio | 25/70, 20/70, 10/70, 10/70, 5/70 |
| Communication | Filler behaviour, lexical certainty, fluency, response organization | 10/30, 8/30, 7/30, 5/30 |

The current implementation calculates the final score as:

```text
confidence = acoustic + (communication - acoustic) * 0.30
           = 0.70 * acoustic + 0.30 * communication
```

This produces a score from `0.0` to `1.0`; it is an indicator of delivery and
communication confidence, not a measure of subject-matter correctness.

## Whole-system architecture

```mermaid
flowchart LR
    Candidate[Candidate]

    subgraph Frontend[React + Vite frontend]
        UI[Interview UI]
        Recorder[Browser microphone recorder]
        Dashboard[Candidate and admin dashboards]
        UI --> Recorder
        Dashboard --> UI
    end

    subgraph Backend[Node.js / Express API]
        Auth[Authentication]
        Interview[Interview orchestration]
        Answer[Answer submission service]
        Difficulty[Per-skill adaptive difficulty]
        Questions[Question selection<br/>round-robin by skill]
        Auth --> Interview
        Interview --> Questions
        Answer --> Difficulty --> Questions
    end

    subgraph AudioAI[Whisper audio-analysis service - FastAPI]
        STT[Whisper transcription]
        Confidence[Acoustic + communication<br/>confidence analysis]
        STT --> Confidence
    end

    subgraph NLP[NLP scoring service - FastAPI]
        Keyword[Keyword matching]
        TFIDF[TF-IDF similarity]
        SBERT[SBERT semantic similarity]
        Final[Final answer score + feedback]
        Keyword --> Final
        TFIDF --> Final
        SBERT --> Final
    end

    DB[(PostgreSQL)]
    Bank[(Question bank / CSV reference data)]

    Candidate --> UI
    Recorder -->|multipart audio upload| Answer
    Interview --> DB
    Questions --> DB
    Questions --> Bank
    Answer -->|audio file| AudioAI
    AudioAI -->|transcript, confidence,<br/>audio breakdown| Answer
    Answer -->|transcript, reference answer,<br/>keywords, confidence| NLP
    NLP -->|keyword, TF-IDF, semantic,<br/>final scores and feedback| Answer
    Answer -->|answer and score records| DB
    Answer -->|evaluation + next question| UI
    DB --> Dashboard
```

## Answer-processing sequence

```mermaid
sequenceDiagram
    actor C as Candidate
    participant F as React frontend
    participant B as Express API
    participant W as Whisper + confidence service
    participant N as NLP scoring service
    participant D as PostgreSQL

    C->>F: Record and submit spoken answer
    F->>B: POST answer (multipart audio)
    B->>W: Send audio file
    W-->>B: Transcript, confidence, features
    B->>B: Load reference answer and keywords
    B->>N: Send transcript + reference data + confidence
    N-->>B: Content scores and feedback
    B->>D: Persist answer, confidence and scoring results
    B->>B: Update answered skill's difficulty
    B->>D: Select and save next round-robin question
    B-->>F: Evaluation and next question
    F-->>C: Display feedback and continue interview
```

## Adaptive difficulty decision chart

```mermaid
flowchart TD
    A[Receive NLP final score] --> B{Score band}
    B -->|>= 0.75| C[Increase skill difficulty by 0.20]
    B -->|0.55 to 0.74| D[Increase skill difficulty by 0.05]
    B -->|0.35 to 0.54| E[Keep difficulty unchanged]
    B -->|0.20 to 0.34| F[Decrease skill difficulty by 0.10]
    B -->|< 0.20| G[Decrease skill difficulty by 0.20]
    C --> H[Clamp to 0.0 to 1.0]
    D --> H
    E --> H
    F --> H
    G --> H
    H --> I[Pick next unasked question for the next skill]
```
