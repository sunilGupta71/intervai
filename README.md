# IntervAI — AI Interviewer Web Application

A full-stack AI interviewer with live camera preview, voice/text answers, timed questions, and AI-based scoring + feedback.

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript (responsive, dark/light mode)
- **Backend:** Node.js + Express
- **Database:** MongoDB (via Mongoose)
- **Browser APIs:** WebRTC `getUserMedia` (camera/mic), Web Speech API (voice input)

## Folder Structure

```
intervai/
├── server.js                # Express server + API routes + DB connection
├── package.json
├── .env.example             # Copy to `.env` and fill in MONGODB_URI
├── README.md
├── data/
│   └── questions.js         # Predefined technical + HR questions
├── models/
│   ├── Candidate.js         # Mongoose model: candidate info
│   └── Interview.js         # Mongoose model: answers, scores, feedback
└── public/                  # Static frontend
    ├── index.html           # Landing page (name + role + Start Interview)
    ├── interview.html       # Camera gate + interview UI + timer
    ├── results.html         # Score, per-question feedback, suggestions
    ├── css/
    │   └── style.css
    └── js/
        ├── landing.js
        ├── interview.js
        └── results.js
```

## Setup & Run

```bash
cd intervai
npm install
cp .env.example .env       # then edit MONGODB_URI if needed
npm start
```

Open <http://localhost:3000> in your browser.

> The browser must allow **camera + microphone** access on `localhost` (or HTTPS).
> If the camera is OFF, the “Begin Interview” button stays disabled and shows
> *“Please enable camera to continue”*.

## API Endpoints

| Method | Path                     | Purpose                                  |
|-------:|--------------------------|------------------------------------------|
| GET    | `/api/health`            | Health + Mongo connection state          |
| GET    | `/api/questions`         | List interview questions                 |
| POST   | `/api/candidates`        | Create candidate `{ name, role }`        |
| POST   | `/api/interviews`        | Save answers, run AI scoring             |
| GET    | `/api/interviews/:id`    | Fetch full results with feedback         |

## AI Evaluation (basic)

Each answer gets a 0–10 score based on:
1. **Length score (0–5):** rewards substantive answers (~80 words = full score).
2. **Keyword score (0–5):** proportion of question-specific keywords found.

Feedback messages are generated per score band, and the results page also
lists improvement suggestions.

## Features Checklist

- [x] Landing page with name + role + Start Interview
- [x] Mandatory camera + mic permission (live preview)
- [x] Camera-off detection (auto-disables interview start)
- [x] Predefined technical + HR questions
- [x] Voice input (Web Speech API) + text fallback
- [x] Per-question countdown timer with auto-advance
- [x] AI score (0–10) + per-question feedback
- [x] Results page with total score, feedback, suggestions
- [x] Dark/Light theme toggle (persisted)
- [x] Progress bar + loading animation during evaluation
- [x] Backend APIs for candidates, interviews, results
```
