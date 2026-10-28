<div align="center">

<img src="client/public/logo.png" alt="ZenithLearn logo" width="96" />

# ZenithLearn

### A bilingual, AI-adaptive Python learning platform — built to find your weak spots and fix them.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-osf--q6kb.onrender.com-7C3AED?style=for-the-badge)](https://osf-q6kb.onrender.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Groq](https://img.shields.io/badge/AI-Groq%20LLM-F55036?style=flat-square)](https://groq.com)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-Hackathon%20Project-lightgrey?style=flat-square)](#)

</div>

ZenithLearn is a MERN-stack, multilingual Python learning platform built for beginner-friendly STEM education. It combines a **concept-level gap analyzer**, AI-generated explanations, daily challenges, gamified progression, leaderboards, avatars, guest access, a developer testing mode, and an AI boss battle experience — all driven by real answer data, not static content.

The app is designed for Indian learners and currently supports **English, Hindi, Tamil, and Malayalam**, while keeping Python syntax, keywords, variable names, and code blocks in English.

## Live Project

**[osf-q6kb.onrender.com](https://osf-q6kb.onrender.com)** — click "Development Mode" on the login page to explore instantly, no signup needed.

---

## Screenshots

<table>
<tr>
<td width="33%"><img src="docs/screenshots/login.jpg" alt="Login screen" /><br/><sub align="center">Login — guest, account, or one-click Dev Mode</sub></td>
<td width="33%"><img src="docs/screenshots/home.jpg" alt="Personalized learning path on the dashboard" /><br/><sub align="center">Dashboard — personalized path from real gap data</sub></td>
<td width="33%"><img src="docs/screenshots/boss-battle.jpg" alt="Boss Battle game mode" /><br/><sub align="center">Boss Battle — gamified topic mastery check</sub></td>
</tr>
</table>

---

## Table of Contents

- [Screenshots](#screenshots)
- [Project Overview](#project-overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Available Scripts](#available-scripts)
- [Application Flow](#application-flow)
- [AI / Groq Key Roles](#ai--groq-key-roles)
- [Frontend Routes](#frontend-routes)
- [Backend API Routes](#backend-api-routes)
- [Learning System](#learning-system)
- [Daily Challenge System](#daily-challenge-system)
- [Authentication Modes](#authentication-modes)
- [Multilingual System](#multilingual-system)
- [Audio / Speak Feature](#audio--speak-feature)
- [Theme System](#theme-system)
- [Data Models](#data-models)
- [Build and Verification](#build-and-verification)
- [Git and Deployment Notes](#git-and-deployment-notes)
- [Troubleshooting](#troubleshooting)

---

## Project Overview

ZenithLearn helps students learn Python through structured topics, personalized theory, adaptive questions, and feedback. The learning journey is built around 10 Python topics, each with 5 levels and increasing difficulty.

The platform connects programming concepts with hobbies such as cricket, football, badminton, gaming, music, cooking, and art so the learner can understand Python through familiar real-world situations.

Main goals:

- Teach Python concepts in a friendly, practical way.
- Use AI for theory, questions, feedback, and challenge conversations.
- Support multilingual learning without translating Python syntax.
- Make progression feel game-like through points, streaks, badges, avatars, daily challenges, and boss battles.
- Allow judges/developers to test the full app through Developer Testing Mode.

---

## Problem Statement Mapping

| Requirement | How ZenithLearn covers it |
|---|---|
| Assess | 10 topics x 5 levels, plus an optional 5-question diagnostic per topic |
| Identify gaps | Concept-level mastery and a gap analyzer with prerequisite root-cause tracing |
| Personalized explanations | Hobby- and language-aware AI theory and explanations, plus interactive concept visuals |
| Adapt the path | Adaptive question batches and diagnostic placement |
| Track progress, actionable feedback | Learning Report with charts and next exercises (`/report`) |

---

## Core Features

- Normal login and signup with JWT authentication.
- Guest Login for trying the platform without creating an account.
- Developer Testing Mode for unlocked full-project testing (disabled on the public demo deployment; available when running locally by uncommenting the route/handler).
- Four languages: English, Hindi, Tamil, Malayalam.
- Global language switcher across the app.
- Text-to-speech support for selected language.
- Light and dark theme support.
- Onboarding with language and hobby selection.
- Dashboard with user stats, daily challenge, learning map, streak, leaderboard preview, and challenge access.
- 10 Python topics:
  - Variables
  - Data Types
  - Conditions
  - Loops
  - Functions
  - Lists
  - String Methods
  - Basic OOP
  - Error Handling
  - Algorithms
- AI-generated personalized theory.
- Adaptive question engine with MCQ, output prediction, fill-in-the-blank, and coding questions.
- Monaco-powered Python editor for code challenges.
- External Python execution through Piston API.
- AI explanation after answers.
- Next button lock until explanation is complete.
- Daily Challenge system with 4 slots per day.
- AI Challenge interview mode.
- Boss Battle game mode.
- Leaderboard with all-time, weekly, daily, and AI challenge views.
- Profile page with avatar selection, stats, weak spots, badges, and sharing.
- Local guest progress and migration support.
- Streak and streak-freeze logic.
- Badges and point rewards.

---

## Tech Stack

### Frontend

- React 18
- Vite
- React Router
- Axios
- Monaco Editor
- Lucide React icons
- Framer Motion
- HTML2Canvas
- Web Speech API

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcryptjs
- node-cron
- Groq SDK

### External Services

- MongoDB database
- Groq AI API
- Piston API for Python code execution
- Browser Speech Synthesis API for audio output

---

## Project Structure

```text
OSF main/
├── client/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── data/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── config/
│   ├── constants/
│   ├── cron/
│   ├── data/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── utils/
│   ├── package.json
│   └── server.js
│
├── .gitignore
├── README.md
└── package-lock.json
```

---

## Getting Started

### Prerequisites

Install these before running the project:

- Node.js 18 or newer
- npm
- MongoDB local server or MongoDB Atlas URI
- Groq API keys
- Modern browser such as Chrome or Edge

---

## Demo Account

Run `node scripts/seedDemo.js` from the `server` folder (needs `MONGODB_URI`), then log in with:

```text
demo@stembhasha.com / Demo@1234
```

The demo user has a ready-made gap story (Conditions is the root cause of weak Loops). Dev Mode is controlled by `ENABLE_DEV_LOGIN`.

---

## Environment Variables

Create a file at:

```text
server/.env
```

Recommended environment:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/zenithlearn
JWT_SECRET=replace_with_a_long_random_secret

GROQ_KEY_1=your_theory_key
GROQ_KEY_2=your_question_key
GROQ_KEY_3=your_answer_feedback_key
GROQ_KEY_4=your_ai_challenge_key

# Developer Testing Mode (bypasses auth) - keep false on public deployments
ENABLE_DEV_LOGIN=false
```

Optional frontend environment:

```text
client/.env
```

```env
VITE_API_URL=http://localhost:5000/api
```

If `VITE_API_URL` is not set, the frontend calls the API on its own origin (`window.location.origin`), falling back to `http://localhost:5000/api` only when running outside a browser. This lets the same build work locally (via the Vite dev proxy) and on Render (same-origin, no CORS) without extra config.

Important:

- Never commit `.env` files.
- `.gitignore` already excludes `.env`, `node_modules`, build output, logs, and local temp files.
- If sharing the project, provide `.env.example` instead of real keys.

---

## Running the App

Install backend dependencies:

```bash
cd server
npm install
```

Start backend:

```bash
npm run dev
```

or:

```bash
npm start
```

Install frontend dependencies:

```bash
cd client
npm install
```

Start frontend:

```bash
npm run dev
```

Default local URLs:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:5000
Health:   http://localhost:5000/api/health
Live:     https://osf-q6kb.onrender.com
```

---

## Available Scripts

### Client

```bash
npm run dev
```

Starts the Vite development server on port `3000`.

```bash
npm run build
```

Builds the production frontend into `client/dist`.

```bash
npm run preview
```

Previews the production build locally.

### Server

```bash
npm start
```

Runs `server.js`.

```bash
npm run dev
```

Runs the server with `nodemon`.

```bash
npm test
```

Currently a placeholder script.

---

## Application Flow

1. User opens the app.
2. User signs up, logs in, enters as guest, or uses Developer Testing Mode.
3. New users complete onboarding:
   - Choose language.
   - Choose hobby.
4. User reaches dashboard.
5. User opens a topic from the learning map.
6. AI theory is generated or loaded from cache.
7. User starts level practice.
8. Adaptive question engine serves questions.
9. User receives feedback and AI explanation.
10. Progress, points, streaks, weak spots, and badges update.
11. Advanced features unlock through progress or Developer Testing Mode.

---

## AI / Groq Key Roles

The backend intentionally uses four separate Groq clients. Each key has one job.

```text
GROQ_KEY_1 -> Theory generation only
GROQ_KEY_2 -> Question generation only
GROQ_KEY_3 -> Wrong-answer summary and IDE code review only
GROQ_KEY_4 -> AI Challenge only
```

This separation helps avoid one feature consuming the entire limit for every AI feature.

The current Groq model is configured in:

```text
server/config/groq.js
```

Current model:

```text
llama-3.1-8b-instant
```

AI prompt rules:

- Explanations follow the selected language.
- Python syntax remains in English.
- Python keywords remain in English.
- Variable names and function names remain unchanged.
- Code blocks are not translated.

---

## Frontend Routes

Main pages:

```text
/login
/signup
/onboarding
/home
/topic/:topicId
/daily-challenge
/challenge/:topicId
/boss-ai/:topicId
/leaderboard
/profile
/avatar
```

Route purpose:

- `/login`: Normal login, guest login, and Developer Testing Mode (disabled on the public demo).
- `/signup`: Create account.
- `/onboarding`: Select language and hobby.
- `/home`: Dashboard and learning map.
- `/topic/:topicId`: Theory and adaptive practice.
- `/daily-challenge`: Slot-based daily challenge.
- `/challenge/:topicId`: AI interview challenge.
- `/boss-ai/:topicId`: Boss battle mode.
- `/leaderboard`: Ranking page.
- `/profile`: Stats, badges, avatar, weak spots, settings.
- `/avatar`: Avatar route kept for future avatar implementation.

---

## Backend API Routes

Backend routes are mounted in:

```text
server/server.js
```

Route groups:

```text
/api/auth
/api/topics
/api/progress
/api/groq
/api/leaderboard
/api/challenge
/api/profile
/api/streak
/api/badge
/api/health
```

Purpose:

- `auth`: signup, login, current user (developer login route is commented out on the public demo — see Authentication Modes).
- `topics`: topic list, theory generation, detailed theory generation.
- `progress`: adaptive learning progress, weak spots, guest migration.
- `groq`: AI question generation, explanations, IDE checks, AI challenge.
- `leaderboard`: rankings.
- `challenge`: daily challenge status and completion.
- `profile`: profile updates.
- `streak`: daily streak updates.
- `badge`: badge checks.
- `health`: server health check.

---

## Learning System

Each topic has 5 levels.

Question types:

- MCQ
- Output prediction
- Fill in the blank
- Code challenge

Difficulty levels:

- EASY
- MEDIUM
- HARD

Adaptive behavior:

- Users answer questions in batches.
- MCQ and Fill batches use 5 questions.
- IDE/code batches use 3 questions.
- Passing a batch requires 60% accuracy.
- Passing EASY moves to MEDIUM.
- Passing MEDIUM moves to HARD.
- Passing HARD completes the level.
- Failing repeatedly can trigger detailed theory review.
- After theory review, difficulty decreases and fail count resets.
- Max question limits prevent infinite loops.

The adaptive engine is mainly handled by:

```text
client/src/components/question/QuestionEngine.jsx
server/routes/progress.js
server/utils/adaptive.js
```

---

## Daily Challenge System

Daily Challenges are topic-aware and based on the user's current topic.

The system supports 4 daily slots:

```text
00:00-05:59 -> Challenge 1
06:00-11:59 -> Challenge 2
12:00-17:59 -> Challenge 3
18:00-23:59 -> Challenge 4
```

Behavior:

- One challenge unlocks every 6 hours.
- A user cannot repeat the same completed slot.
- Slots reset on the next day.
- Developer Testing Mode bypasses cooldowns.
- Guest mode tracks slots locally.
- Normal users persist completions in the database.

Important files:

```text
client/src/assets/challenges/dailyChallenges.js
client/src/pages/DailyChallengePage.jsx
client/src/components/dashboard/DailyChallenge.jsx
client/src/utils/dailyChallengeSlots.js
server/routes/challenge.js
```

---

## Authentication Modes

### Normal User

- Uses email and password.
- Progress is saved in MongoDB.
- Leaderboard and profile are available.
- Full learning progression is persistent.

### Guest User

- No account required.
- Progress is saved locally on the device.
- Some restricted features show a friendly message.
- Guest progress can be migrated after account creation.

### Developer Testing Mode

- Controlled by the `ENABLE_DEV_LOGIN=true` server environment variable. Default is off: with no variable set, `POST /api/auth/dev-login` returns 403 and the login page shows "Development Mode is disabled on this deployment."
- Keep it OFF on public deployments, because it bypasses authentication entirely.
- To turn it on locally: add `ENABLE_DEV_LOGIN=true` to `server/.env` and restart the server. Remove it (or set `false`) and restart to turn it off.
- When enabled: no developer credentials required, unlocks all routes and testing features, bypasses Daily Challenge cooldowns, does not require real learner progress.

---

## Multilingual System

Supported languages:

```text
English
Hindi
Tamil
Malayalam
```

Language behavior:

- Global language preference is stored locally.
- Logged-in users can persist language on profile.
- Language switch does not reload the full page.
- AI prompts include the selected language.
- TTS uses the selected language.
- Code and Python keywords remain English.

Important files:

```text
client/src/utils/i18n.js
client/src/components/shared/LanguageSwitch.jsx
server/routes/groq.js
server/routes/topics.js
server/models/User.js
```

---

## Audio / Speak Feature

The speak feature uses the browser's Speech Synthesis API.

Supported speech language codes:

```text
English   -> en-IN
Hindi     -> hi-IN
Tamil     -> ta-IN
Malayalam -> ml-IN
```

Important files:

```text
client/src/utils/tts.js
client/src/components/shared/SpeakButton.jsx
```

Notes:

- No microphone input is used.
- No speech recognition is used.
- Only audio output is supported.
- Browser voice availability depends on the user's system/browser.

---

## Theme System

The app supports light and dark themes.

Important files:

```text
client/src/context/ThemeContext.jsx
client/src/components/shared/ThemeToggle.jsx
client/src/styles/theme.js
client/src/index.css
```

Theme preference is stored locally and applied across pages.

---

## Data Models

Main models:

```text
server/models/User.js
server/models/Topic.js
server/models/Progress.js
server/models/DailyChallenge.js
```

User stores:

- Name, email, password hash
- Avatar
- Language
- Hobby
- Streak
- Points
- Badges
- Daily challenge completions
- Developer flag

Progress stores:

- Topic progress
- Current level
- Difficulty
- Correct answers
- Wrong answers
- Weak spots
- AI challenge progress
- Topic completion state

Topic stores:

- Topic metadata
- Hindi name
- Prerequisites
- STEM context
- Cached theory
- Cached detailed theory

---

## Build and Verification

Run frontend build:

```bash
cd client
npm run build
```

Check backend syntax:

```bash
node -c server/server.js
node -c server/routes/topics.js
node -c server/routes/groq.js
node -c server/models/User.js
node -c server/models/Topic.js
```

Manual verification checklist:

- Signup works.
- Login works.
- Guest Login works.
- Developer Testing Mode works (local only — disabled on the public demo).
- Onboarding works.
- Dashboard loads.
- Language switch works without full-page reload.
- Theory loads for each topic.
- Speak button follows selected language.
- Practice questions load.
- Correct and wrong answer flows work.
- Explanation appears before Next unlocks.
- Daily Challenge submit works.
- Daily Challenge cooldown follows 6-hour slots.
- AI Challenge responds.
- Boss Battle route loads.
- Leaderboard loads.
- Profile avatar selection syncs.
- Theme switching works.
- Logout clears session correctly.

---

## Git and Deployment Notes

This repository includes a root `.gitignore`.

Ignored items include:

- `node_modules`
- `.env`
- `.env.*`
- frontend build output
- logs
- local temp/cache files
- local database files
- editor files

Initial Git setup:

```bash
git init
git status
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git branch -M main
git push -u origin main
```

Before pushing:

- Make sure no real API keys are committed.
- Make sure `server/.env` is ignored.
- Run `npm run build` in `client`.
- Start backend and check `/api/health`.

---

## Troubleshooting

### Frontend does not start

Run:

```bash
cd client
npm install
npm run dev
```

Check that port `3000` is free.

### Backend does not start

Run:

```bash
cd server
npm install
npm run dev
```

Check:

- `server/.env` exists.
- `MONGODB_URI` is correct.
- MongoDB is running.
- Port `5000` is free.

### AI features return fallback text

Check:

- `GROQ_KEY_1`
- `GROQ_KEY_2`
- `GROQ_KEY_3`
- `GROQ_KEY_4`
- Groq key limits
- Server logs

### Theory takes too long

Theory generation can take longer than normal requests because it asks for structured explanations with code examples. The client API timeout is configured higher for this reason.

### TTS does not speak a language clearly

The browser may not have a native voice installed for that language.

Try:

- Chrome or Edge
- Install OS voice packs
- Refresh the page after language change

### Piston code execution fails

The IDE uses the public Piston API:

```text
https://emkc.org/api/v2/piston/execute
```

If it fails:

- Check internet connection.
- Check browser console.
- Try again after a few seconds.

---

## Current Status

The project is built for hackathon/demo usage with active features for learning, gamification, multilingual AI support, guest access, developer testing, and challenge-based practice.

For production deployment, recommended next steps are:

- Add automated tests.
- Add `.env.example`.
- Add rate limiting on AI routes.
- Add stronger production CORS rules.
- Add deployment-specific environment configuration.
- Add monitoring/logging for API failures.
