# TaxFlow — Deadline-Resilient ITR Filing Prototype

> **File once. Don't fight the deadline.**

TaxFlow is a fully working hackathon prototype demonstrating a deadline-resilient filing architecture that separates citizen submission from downstream processing.

---

## 1. Problem

During income tax filing deadline rush periods, millions of citizens connect simultaneously. In traditional synchronous filing systems, the citizen's browser remains held open while long downstream validation, verification, and database writes execute synchronously. If any downstream component slows down:
* The citizen's request times out.
* The citizen repeatedly retries and submits again.
* Cascading retries amplify server congestion into complete failure.

---

## 2. Solution: Decoupled Asynchronous Filing

TaxFlow demonstrates a decoupled architecture:

```text
Citizen
   ↓
Submit Return
   ↓
[ Instant Acceptance Gateway (<50ms) ]
   ↓
Persist to SQLite Database & Create Persistent Job in Queue
   ↓
Return Durable Reference ("TX-DEMO-XXXXXX") to Citizen Immediately
   ↓
Background Worker Pool (tick every 300ms) processes queue asynchronously
   ↓
Mock Government Processor generates synthetic acknowledgement (ACK-SYNTH-XXXXXX)
   ↓
Citizen tracks status or views acknowledgement anytime
```

### Key Benefits
1. **Instant Peace of Mind** — Citizen receives a durable reference in milliseconds and can safely leave or close the browser.
2. **"Don't Retry" UX** — Clear assurance that the return is safe and no resubmission is needed.
3. **Spike Smoothing** — The persistent queue flattens sudden traffic spikes into steady, predictable background worker throughput.
4. **Idempotency Protection** — Accidental double-clicks or multiple submit requests safely return the existing reference without creating duplicate returns.
5. **Autosave & Resume** — Form progress is saved automatically as a server-persisted draft. Refresh, navigate away, or lose connection and your work survives.
6. **Dependency Resilience** — Workers pause gracefully if the downstream service is `UNAVAILABLE`; all queued submissions stay 100% safe.

---

## 3. Citizen Journey

| Step | Page | Description |
|------|------|-------------|
| 1 | **Home** (`/`) | Overview of decoupled filing. Live queue stats. Quick preset profiles. |
| 2 | **File Return** (`/file`) | 3-step wizard: Income → Tax Info → Review. INR formatting, autosave drafts, idempotency key. |
| 3 | **Validation** | Deterministic server-side rules (deduction cap ₹1,50,000, TDS vs income check). AI plain-English error explanation. |
| 4 | **Submission** | Return saved to SQLite, job enqueued, durable reference (`TX-DEMO-XXXXXX`) returned in <50ms. |
| 5 | **Status Page** (`/status/:referenceId`) | Live polling timeline stepper, queue position, estimated completion time, AI reassurance messages. |
| 6 | **Track Return** (`/track`) | Look up any submission by reference ID. |
| 7 | **Acknowledgement** | Clean demo receipt with `ACK-SYNTH-XXXXXX` once background processing completes. |
| 8 | **How It Works** (`/how`) | Visual architecture explanation with AI deadline bottleneck explainer. |
| 9 | **Demo / Engineering** (`/demo`) | Rush simulation dashboard, real-time metrics, worker controls, dependency toggle. |

---

## 4. Architecture & Tech Stack

### Frontend
| Item | Detail |
|------|--------|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Routing | Hash-based (`#/`, `#/file`, `#/track`, `#/how`, `#/demo`, `#/status/:id`) |
| Styling | Vanilla CSS — dark forest-emerald design system (`src/style.css`) |
| Typography | Outfit & Plus Jakarta Sans (Google Fonts) |
| State | React `useState` / `useEffect` — no external state library |

### Backend
| Item | Detail |
|------|--------|
| Runtime | Node.js 18+ (tested on v24) |
| Server | Express (TypeScript, ESM) |
| Database | SQLite via Node.js built-in `node:sqlite` (`DatabaseSync`) |
| WAL mode | `PRAGMA journal_mode = WAL` + `PRAGMA synchronous = NORMAL` |
| Worker | `setInterval` tick (every 300ms) — async job lifecycle `QUEUED → PROCESSING → COMPLETED/FAILED` |
| Deployment | Vercel (serverless via `api/index.ts`) or self-hosted (`node server.ts`) |

### Database Schema (`taxflow.db`)
```sql
returns          -- one row per filing: referenceId, income fields, processingStatus, idempotencyKey
jobs             -- one row per return: status (QUEUED/PROCESSING/COMPLETED/FAILED), attempts, timestamps
acknowledgements -- issued on COMPLETED: ackNumber (ACK-SYNTH-*), referenceId
drafts           -- autosaved form state keyed by draftId (DRAFT → SUBMITTED lifecycle)
```

Indexed on `returns.referenceId`, `jobs.status + id`, and `drafts.draftId`.

---

## 5. AI Integration & Safety

AI is integrated **server-side only** with a dual-provider cascade and strict guardrails:

### Provider Cascade
1. **Google Gemini** (`GEMINI_API_KEY`) — primary, uses `gemini-2.5-flash` by default.
2. **OpenAI** (`OPENAI_API_KEY`) — fallback, uses `gpt-4o-mini` by default.
3. **Deterministic fallback** — if both keys are absent or API calls fail, pre-written plain-English explanations activate automatically. **The application never breaks without AI.**

### AI Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /api/ai/explain-status` | Reassures citizen about queue position; discourages re-submission. |
| `POST /api/ai/explain-error` | Translates validation errors into plain English. |
| `POST /api/ai/explain-deadline` | Educates on why synchronous systems fail under deadline rush. |

### Safety Guardrails (enforced via server-side prompt rules)
* Never claims to be the Income Tax Department or the Government of India.
* Never calculates actual tax liability or provides financial/tax advice.
* Never claims a return has legally been filed with the government.
* Responses capped at 45–120 tokens to keep explanations short and safe.

---

## 6. REST API Reference

### Returns
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/returns/validate` | Validate income/TDS/deduction fields (no DB write). Returns errors + synthetic demo calculation. |
| `POST` | `/api/returns/submit` | Idempotent submission. Saves to DB, enqueues job, responds instantly with `referenceId`. |
| `GET`  | `/api/returns/:referenceId` | Full return details with job status, queue position, estimated seconds, acknowledgement. |
| `GET`  | `/api/returns/:referenceId/status` | Lightweight status poll (processingStatus + timestamps only). |
| `GET`  | `/api/returns/recent/list` | Last 10 submissions ordered by newest. |
| `GET`  | `/api/returns/by-key/:idempotencyKey` | Ambiguous submission recovery — look up existing submission by idempotency key. |

### Drafts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/drafts/save` | Upsert draft by `draftId` (auto-saves form state). |
| `GET`  | `/api/drafts/:draftId` | Retrieve active draft. Returns 404 if not found or already submitted. |
| `POST` | `/api/drafts/clear` | Mark draft as `SUBMITTED` (called after successful filing). |

### Demo / Engineering
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/demo/deadline-rush` | Inject synthetic filing volume (up to 50,000 returns in a transaction). |
| `GET`  | `/api/demo/metrics` | Live stats: received, queued, processing, completed, failed, active workers, active drafts, worker config. |
| `POST` | `/api/demo/settings` | Adjust `delayMs` (300–20,000ms) and `concurrency` (1–100) at runtime. |
| `POST` | `/api/demo/reset` | Wipe all returns, jobs, acknowledgements, and drafts. |
| `POST` | `/api/demo/seed` | Seed two sample records (one completed, one queued) if DB is empty. |
| `GET`  | `/api/demo/dependency` | Get current mock downstream dependency state. |
| `POST` | `/api/demo/dependency` | Set dependency state: `AVAILABLE` / `SLOW` / `UNAVAILABLE`. Workers pause on `UNAVAILABLE`. |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/explain-status` | AI/fallback plain-English queue status explanation. |
| `POST` | `/api/ai/explain-error` | AI/fallback plain-English validation error explanation. |
| `POST` | `/api/ai/explain-deadline` | AI/fallback explanation of deadline congestion & queue architecture. |

---

## 7. Interactive Demo Simulator Controls

A persistent control bar is visible during filing:

| Control | Simulates |
|---------|-----------|
| **Network Interruption** | Save request fails mid-form — draft is preserved locally, user can resume. |
| **Ambiguous Submit Failure** | Network drops after submit — idempotency key used for automatic recovery on retry. |
| **Downstream Dependency** | Toggle between 🟢 AVAILABLE / 🟡 SLOW (2.5× delay) / 🔴 UNAVAILABLE (workers pause; queue stays safe). |

---

## 8. Validation Rules

Applied deterministically server-side (no AI required):

| Rule | Code | Limit |
|------|------|-------|
| All monetary fields must be non-negative finite numbers | `INVALID_NUMBER` / `NEGATIVE_VALUE` | — |
| Deductions capped | `DEDUCTION_LIMIT_EXCEEDED` | ₹1,50,000 |
| TDS cannot exceed gross income | `TDS_EXCEEDS_INCOME` | — |
| TDS requires at least some reported income | `TDS_WITHOUT_INCOME` | — |

A synthetic (non-legal) progressive tax demo calculation is also returned for display purposes only.

---

## 9. Safety Disclaimers & Limitations

* **Synthetic Data Only** — All taxpayer profiles, numbers, and references are purely synthetic.
* **Zero Government Connection** — No connection or traffic is ever sent to `incometax.gov.in` or any real Indian government service.
* **Mock Backend** — Government processing is simulated locally by the background worker.
* **Production Limitations** — Real-world government deployment would require official e-filing authorization, PAN/Aadhaar cryptographic authentication, digital signatures, audit logs, and security compliance.

---

## 10. Running Locally

### Prerequisites
* **Node.js v18+** (tested on Node v24) — required for `node:sqlite` (built-in `DatabaseSync`).

### Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Build frontend assets
npm run build

# 3. Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Development Mode
Runs Vite dev server and the Express backend concurrently with hot-reload:
```bash
npm run dev
```

### Run Automated E2E Test Suite
```bash
npm test
```

### Database Utilities
```bash
npm run db:setup   # Initialize schema (idempotent)
npm run seed       # Seed demo sample records if DB is empty
```

### Environment Variables

```bash
PORT=3000                      # Server port (default: 3000)
PROCESSING_DELAY_MS=5500       # Worker processing delay in ms (default: 5500)
WORKER_CONCURRENCY=6           # Worker concurrency (default: 6)

# AI Providers (optional — deterministic fallback activates if both are absent)
GEMINI_API_KEY=your_key_here   # Google Gemini API key (primary AI provider)
GEMINI_MODEL=gemini-2.5-flash  # Gemini model name (default: gemini-2.5-flash)
OPENAI_API_KEY=your_key_here   # OpenAI API key (fallback AI provider)
OPENAI_MODEL=gpt-4o-mini       # OpenAI model name (default: gpt-4o-mini)
```

### Deployment (Vercel)

The project includes a [`vercel.json`](vercel.json) that:
- Builds with `npm run build` and outputs to `dist/`
- Routes all `/api/*` requests to the serverless handler at `api/index.ts`
- Serves the SPA via catch-all rewrite to `index.html`

> **Note:** On Vercel, the SQLite database is stored at `/tmp/taxflow.db` (ephemeral per function instance).

---

## 11. Project Structure

```
.
├── src/
│   ├── main.tsx          # React app — all components (Home, Filing, StatusView,
│   │                     #   TrackView, HowItWorks, DemoDashboard, App, …)
│   └── style.css         # Vanilla CSS design system (dark emerald palette)
├── api/
│   └── index.ts          # Vercel serverless entry-point (re-exports Express app)
├── server.ts             # Express server + SQLite + background worker + AI layer
├── test_e2e.js           # End-to-end test suite (Node.js, no test framework)
├── index.html            # Vite HTML entry point
├── vite.config.ts        # Vite config (React plugin)
├── tsconfig.json         # TypeScript config
├── vercel.json           # Vercel deployment config
├── taxflow.db            # SQLite database (auto-created on first run)
└── package.json          # Scripts & dependencies
```

