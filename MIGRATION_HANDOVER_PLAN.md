# CIPHER CODING — OPERATION ZERO DAY
## System Migration & Operational Handover Dossier

---

### 1. Executive Summary

**Project Name:** Cipher Coding — Operation Zero Day  
**Working Directory:** `C:\Cipher Coding`  
**Core Purpose:** An immersive, high-stakes cybersecurity and algorithmic investigation competition platform where participants trace the disappearance of rogue architect **SUBJECT ZERO (ZERO)** across 5 narrative Acts and 15 decryptable code fragments.

#### Technology Stack:
- **Framework:** Next.js 15.1.7 (App Router)
- **UI & Runtime:** React 19, Tailwind CSS 3.4.17, Lucide Icons
- **Database:** MongoDB Atlas via Mongoose 8.10.0
- **Authentication:** Stateless, HTTP-Only JWT cookies signed with `jose`
- **Validation:** Zod 3.24.2
- **Testing & Tooling:** TSX, ts-node, BcryptJS

---

### 2. Environment Configuration (`.env.local`)

On the new system, ensure the file `C:\Cipher Coding\.env.local` contains the following active credentials:

```env
# MongoDB Atlas Database URI (Production Cluster)
MONGODB_URI=mongodb+srv://sivagnanamcm2006_db_user:j1jwZpKN6FP5Yjy4@cluster0.mdq9l38.mongodb.net/operation_zero_day?retryWrites=true&w=majority&appName=Cluster0

# Authentication Secret (Used for signing HTTP-only session JWT cookies)
AUTH_SECRET=super_secret_cipher_coding_zero_day_auth_token_key_32chars!

# Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Environment Mode
NODE_ENV=development
```

> [!IMPORTANT]
> The database is hosted remotely on **MongoDB Atlas (`cluster0.mdq9l38.mongodb.net`)**. Both systems will connect to the same cloud database instance, meaning all 15 questions, participant accounts, and live event state are already synchronized and preserved.

---

### 3. Step-by-Step Setup on the New System

```powershell
# 1. Open Terminal in the project directory
cd "C:\Cipher Coding"

# 2. Install all dependencies
npm install

# 3. Verify database connection and question integrity
npm run verify

# 4. (Optional) Re-sync baseline admin and event configuration if needed
npm run seed:run

# 5. Launch the development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

### 4. Competition Narrative Arc & All 15 Fragments

The challenge consists of 15 code fragments divided into 5 distinct Acts. Every question features full parity across **Python, Java, C, and C++**.

| Act | Q# | Fragment ID | Fragment Title | Answer Type | Canonical Answer | Story Revelation |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Act I** | **01** | FRAGMENT 01 | TIME_STAMP | `exact_text` | `3:17:42` | Official report says breach at 03:00; true access was 03:17:42. |
| | **02** | FRAGMENT 02 | ARCHIVE_DIFF | `number` | `3` | Exactly 3 personnel archives were purged (`702`, `705`, `706`). |
| | **03** | FRAGMENT 03 | CIPHER_KEY | `case_insensitive_text` | `ZERO` | The intruder signed the purge routine with the pseudonym `ZERO`. |
| **Act II** | **04** | FRAGMENT 04 | FILE_STATE | `case_insensitive_text` | `ACCESSED` | The Black File was only read, never copied or stolen. Someone lied. |
| | **05** | FRAGMENT 05 | UNKNOWN_TRANSMISSION | `case_insensitive_text` | `IF THEY TOLD YOU I STOLE IT` | ZERO left a caesar-shifted cipher message warning the investigator. |
| | **06** | FRAGMENT 06 | CHECKSUM | `number` | `72` | The transmission checksum proves the file was never transferred out. |
| **Act III** | **07** | FRAGMENT 07 | SUBJECT ZERO | `exact_text` | `SUBJECT 0 — SYSTEMS ARCHITECT` | ZERO wasn't an external hacker; he was the Grid's chief systems architect. |
| | **08** | FRAGMENT 08 | THE PREDICTION | `exact_text` | `102 — HIGH` | The Grid ran predictive behavior models classifying ZERO as high rebellion risk. |
| | **09** | FRAGMENT 09 | THE PURGE | `number` | `4` | 4 surveillance records were erased right before ZERO was flagged. |
| **Act IV** | **10** | FRAGMENT 10 | THE BLACK FILE | `exact_text` | `PROFILES — 7` | Surviving priority archive confirms Black File contains civilian control profiles. |
| | **11** | FRAGMENT 11 | CORRUPTED NODES | `number` | `42` | Memory addresses link the suppression to Grid Central Command itself. |
| | **12** | FRAGMENT 12 | THE SURVEILLANCE LOG | `exact_text` | `ACTIVE — 5` | Grid Control detected your investigation; 5 monitors are watching you now. |
| **Act V** | **13** | FRAGMENT 13 | THE LOCATION | `exact_text` | `NODE-03` | Route seed derived from previous fragments points directly to `NODE-03`. |
| | **14** | FRAGMENT 14 | THE AUTHORIZATION | `case_insensitive_text` | `82824206` | Decoded master key to disarm the predictive behavioral algorithm. |
| | **15** | FRAGMENT 15 | ZERO DAY | `case_insensitive_text` | `INVESTIGATOR` | ZERO reveals he planned this investigation; you are the final authorization. |

---

### 5. Architectural Systems & Recent Implementations

#### A. Dual-Layer Performance Caching (Ultra-Fast Question Transitions)
- **Server Cache (`src/lib/questionCache.ts`)**:
  - In-memory bundle of all 15 published questions and traversal maps (`byId`, `byNumber`, `nextMap`, `priorIdsMap`).
  - Completely eliminated 5 sequential remote MongoDB queries on `/api/mission/questions/[id]`.
  - Queries participant session and progress in a single parallel `Promise.all` round-trip.
  - Reduced API latency from **1000ms+ down to ~30-50ms**.
  - Cache invalidation hooked into admin question creation, updates, and deletes.
- **Client Cache & Pre-warming (`src/lib/evidenceClientCache.ts`)**:
  - Implements memory cache on client.
  - Proactively prefetches next question payload and Next.js route chunks in the background.
  - Navigating to the next fragment from the story reveal modal executes with **0ms spinner delay**.

#### B. Proctoring & Fullscreen Enforcement System (`src/context/ProctorContext.tsx`)
- **Tab & Window Switching**:
  - Monitors `visibilitychange` and window `blur`.
  - Debounced server reporting (`/api/mission/tab-switch`).
  - Cyberpunk warning modal for violations 1 through 3.
  - **Immediate termination** upon 4th violation with score lockdown.
- **Fullscreen Exit Detection & Safe Dismissal**:
  - Tracks `fullscreenchange` and `webkitfullscreenchange`.
  - State ref `wasFullscreenRef` guarantees warning only fires when a participant was in fullscreen and explicitly exited (`ESC`).
  - Includes a direct "RESTORE FULLSCREEN" button, an "ACKNOWLEDGE & RESUME" button, and an explicit close `(X)` button.
  - Modal unconditionally dismisses on user action, eliminating popup entrapment.

#### C. Multi-Language Switcher & Preference Persistence
- Seamless tab toggles between **Python**, **Java**, **C**, and **C++** on every fragment.
- Client source of truth (`localStorage.getItem('zero_day_preferred_language')`) ensures active language choice is preserved across question transitions and page reloads.
- Server route `/api/participant/language` updates MongoDB and synchronizes the JWT auth cookie via `setAuthCookie`, permitting dynamic language changes throughout active missions without lockouts.

#### D. Direct Commencement & Active Target Navigation (`src/app/mission/page.tsx`)
- Clicking "COMMENCE" instantly starts the mission and performs direct browser navigation straight into **Question 01** (`/mission/evidence/[question-01-id]`).
- The mission dashboard features a glowing Quick Resume Banner that routes directly to the current playable fragment.

#### E. Admin Command Center (`/admin`)
- Accessible via Superadmin account (`admin` / `Admin@ZeroDay2026`).
- Live Telemetry Dashboard: participant countdown timers, total scores, solved counts, active questions, and tab switch violation counts.
- Event lifecycle controls: Start, Pause, Resume, End, and Progression mode (Sequential vs. Free).

---

### 6. Key System Files Reference

| Purpose | File Path |
| :--- | :--- |
| **Questions Bundle** | `src/lib/placeholderQuestions.ts` |
| **Question In-Memory Cache** | `src/lib/questionCache.ts` |
| **Client Prefetch Cache** | `src/lib/evidenceClientCache.ts` |
| **Proctoring Context** | `src/context/ProctorContext.tsx` |
| **Participant Evidence View** | `src/app/mission/evidence/[id]/page.tsx` |
| **Participant Mission Hub** | `src/app/mission/page.tsx` |
| **Question API Route** | `src/app/api/mission/questions/[id]/route.ts` |
| **Submission Validator** | `src/app/api/mission/submit/route.ts` |
| **Platform Verification** | `src/scripts/verify-platform.ts` |

---

### 7. Pre-Flight Checklist for the New System

1. [ ] Confirm Node.js 20+ is installed on the system (`node -v`).
2. [ ] Confirm `.env.local` exists in `C:\Cipher Coding` with the Atlas URI and `AUTH_SECRET`.
3. [ ] Run `npm install` in PowerShell.
4. [ ] Run `npm run verify` to test Atlas connection and question integrity.
5. [ ] Run `npm run dev` and navigate to `http://localhost:3000`.
6. [ ] Log in with admin (`admin` / `Admin@ZeroDay2026`) at `http://localhost:3000/login` to confirm the Admin Command Center.
7. [ ] Log in with a participant code (or create one in Admin) to verify the participant flow and fullscreen behavior.
