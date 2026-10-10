# CIPHER CODING — OPERATION ZERO DAY

> **Individual Cybersecurity Code-Deciphering Competition Platform**  
> *"Every line hides a secret. Every output reveals the truth."*

---

## 1. Overview

**CIPHER CODING — OPERATION ZERO DAY** is a competition-grade full-stack web application designed for individual code-deciphering challenges (100–200 concurrent participants, configurable 30–45 minute duration).

### Core Concept
Participants **do not execute arbitrary code on the server**. Instead, they receive captured code fragments from a simulated cybersecurity breach and must:
1. Read the code
2. Trace its execution
3. Understand the logic
4. Identify the information it reveals
5. Submit the decoded answer

The application is structured so that **100% of competition questions are data-driven**. No questions are hardcoded into frontend components. All questions, hints, code fragments, story narratives, and answers are managed directly via the **Admin Portal** or seeded in MongoDB.

---

## 2. Technology Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, React 19, Tailwind CSS, Lucide Icons
- **Backend**: Next.js Server Handlers, Node.js runtime
- **Database**: MongoDB via Mongoose
- **Authentication**: Stateless, signed HTTP-only cookies (`auth-token`) with JWT (`jose`) and `bcryptjs`
- **Validation**: Zod runtime schema validation

---

## 3. Security Highlights

- **HTTP-Only Cookies**: Zero authentication tokens in `localStorage`.
- **Server-Authoritative Timer**: Timers derive strictly from server timestamps (`expiresAt - currentServerTime`). Refreshing or altering local device clocks cannot extend time. Submissions past deadline are rejected (HTTP 403).
- **Answer Protection**: `correctAnswer` is never sent to the client browser (`select: false` on Mongoose queries).
- **Zero Arbitrary Code Execution**: No `eval()`, no remote code execution risks.
- **Audit Logging**: Every submission is permanently saved in the database with timestamps and attempt counts.
- **Leaderboard Privacy**: Participant emails are completely scrubbed from public ranking endpoints.

---

## 4. Getting Started

### Prerequisites
- **Node.js**: v18.18+ or v20+ (tested on Node v22)
- **MongoDB**: Local MongoDB instance (e.g. `mongodb://localhost:27017/cipher_coding`) OR a free MongoDB Atlas cluster URI. *(If no external MongoDB is running, the app automatically falls back to an in-memory database for seamless local development).*

### Installation
```bash
# Clone or navigate to the repository
cd "c:\Cipher Coding"

# Install dependencies
npm install
```

### Environment Configuration
Create a `.env.local` file in the project root:
```bash
touch .env.local
```

Configure your environment variables:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/cipher_coding
AUTH_SECRET=your_super_secret_random_32_character_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 5. Database Seeding & Development Setup

Initialize the database with the default event, superadmin account, and 3 placeholder development questions:

```bash
npm run seed:run
```

### Default Credentials
- **Superadmin Login**:
  - URL: `http://localhost:3000/admin/login`
  - Username: `admin`
  - Password: `Admin@ZeroDay2026`
- **Participant Access**:
  - Register at `http://localhost:3000/register` to receive an auto-generated Operative Code (e.g. `CYB-7A42`).

---

## 6. Running the Application

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm run start
```

### Running Automated Platform Verification
```bash
npm run verify
```

---

## 7. Organizer & Admin Guide

### Accessing the Command Center
Navigate to `/admin` or click **Admin Terminal** from the login page.

### Managing Competition Questions
Navigate to `/admin/questions`:
1. Click **CREATE NEW QUESTION**.
2. Specify the Question Number, Title, Category Section, Story Narrative, Code Block, Question Prompt, Points, Difficulty, and Correct Answer.
3. Choose the appropriate **Answer Type**:
   - `case_insensitive_text`: standard case-insensitive string matching
   - `exact_text`: strictly preserves case
   - `number`: numeric comparison ignoring whitespace
   - `multiple_choice`: choice selection matching
4. Toggle **Published** when ready to release to operatives.

### Event Controls & Lifecycle
Navigate to `/admin/events`:
- **Change Duration**: 30, 40, 45 minutes, etc. (Default: 40 minutes).
- **Life-Cycle Toggles**:
  - `OPEN REGISTRATION`: Allows participants to sign up.
  - `COMMENCE EVENT (GO LIVE)`: Activates mission dashboard.
  - `PAUSE SUBMISSIONS`: Halts submissions without expiring timers.
  - `TERMINATE EVENT`: Permanently closes submissions.
- **Progression Mode**:
  - `FREE`: Participants can solve challenges in any order.
  - `SEQUENTIAL`: Question N+1 unlocks only after Question N is deciphered.
- **Max Attempts**: Configure attempt limit or set to 0 for unlimited.
- **Leaderboard Visibility**: Hide/show rankings during the event.

### Exporting Forensic Results
Navigate to `/admin/results` and click **EXPORT FORENSIC CSV** to download ranked participant data (Rank, Participant Code, Name, College, Score, Time Elapsed, Solved Count).

---

## 8. Directory Structure

```text
src/
├── app/
│   ├── page.tsx                     # Landing briefing page
│   ├── layout.tsx                   # Cyber layout & typography
│   ├── globals.css                  # Terminal styling & glow effects
│   ├── login/page.tsx               # Participant login
│   ├── register/page.tsx            # Participant registration
│   ├── leaderboard/page.tsx         # Live ranking board
│   ├── mission/
│   │   ├── page.tsx                 # Mission terminal & evidence grid
│   │   └── evidence/[id]/page.tsx   # Evidence deciphering interface
│   ├── admin/
│   │   ├── page.tsx                 # Admin overview dashboard
│   │   ├── layout.tsx               # Admin navigation tabs
│   │   ├── login/page.tsx           # Isolated admin login
│   │   ├── events/page.tsx          # Event settings & controls
│   │   ├── questions/page.tsx       # Dynamic Question CRUD
│   │   ├── participants/page.tsx    # Live participant monitor
│   │   └── results/page.tsx         # Final rankings & CSV export
│   └── api/
│       ├── auth/                    # Register, login, admin-login, logout, me
│       ├── mission/                 # Session, start, questions, submit
│       ├── leaderboard/             # Public leaderboard endpoint
│       └── admin/                   # Event, overview, questions CRUD, participants, results
├── components/
│   ├── ui/                          # TerminalCard, CyberButton, CodeViewer, Badge, Modal, Navbar
│   └── timer/                       # MissionTimer (server-authoritative countdown)
├── lib/
│   ├── mongodb.ts                   # Cached MongoDB connection pool
│   ├── timer.ts                     # Authoritative countdown verification
│   ├── scoring.ts                   # Answer comparison engine
│   ├── participantCode.ts           # Collision-resistant CYB-XXXX generator
│   ├── validation.ts                # Zod validation schemas
│   └── auth/                        # Password hashing, JWT tokens, session cookies
├── models/
│   ├── Participant.ts
│   ├── Event.ts
│   ├── Question.ts
│   ├── Submission.ts
│   ├── EventSession.ts
│   ├── ParticipantProgress.ts
│   └── Admin.ts
└── scripts/
    ├── seed.ts                      # Database seeder (admin, event, 3 placeholders)
    └── verify-platform.ts           # Automated platform & security verification
```
