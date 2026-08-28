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
Background Worker Pool processes queue asynchronously
   ↓
Mock Government Processor generates synthetic acknowledgement
   ↓
Citizen tracks status or views acknowledgement anytime
```

### Key Benefits:
1. **Instant Peace of Mind**: Citizen receives a durable reference in milliseconds and can safely leave or close the browser.
2. **"Don't Retry" UX**: Clear assurance that the return is safe and no resubmission is needed.
3. **Spike Smoothing**: The persistent queue flattens sudden traffic spikes into steady, predictable background worker throughput.
4. **Idempotency Protection**: Accidental double-clicks or multiple submit requests safely return the existing reference without creating duplicate returns.

---

## 3. Citizen Journey

1. **Landing Page**: Overview of decoupled filing with clear prototype disclaimers.
2. **Step 1 (Income)**: Enter synthetic salary, interest, and other income with Indian Rupee formatting. Quick preset profiles available.
3. **Step 2 (Tax Info)**: Enter TDS deducted and deduction claims.
4. **Step 3 (Review)**: Structured summary table with synthetic demo breakdown.
5. **Deterministic Validation**: Non-AI validation rules enforce numerical validity, deduction caps, and TDS thresholds.
6. **Instant Submission**: Return is saved to SQLite, assigned a queue job, and a durable reference (`TX-DEMO-XXXXXX`) is returned immediately.
7. **Status Page (`/status/:referenceId`)**: Live timeline stepper with real-time queue position and estimated completion time.
8. **Synthetic Acknowledgement**: Clean demonstration receipt with verified synthetic acknowledgement number (`ACK-SYNTH-XXXXXX`).

---

## 4. AI Integration & Safety

OpenAI is integrated server-side with strict safety guardrails:
* **Explain Validation Errors**: Translates technical validation errors (e.g. TDS exceeding income) into plain, friendly explanations.
* **Explain Processing Status**: Reassures citizens on their queue position and why resubmission is unnecessary.
* **Deadline Bottleneck Education**: Explains why high concurrency causes synchronous bottlenecks and how queues solve the issue.

### Safety Guardrails:
* Never claims to be the Income Tax Department or the Government of India.
* Never calculates actual tax liability or provides financial/tax advice.
* Never claims a return has legally been filed with the government.
* **Deterministic Fallback**: If `OPENAI_API_KEY` is not provided or fails, intelligent deterministic plain-English explanations activate automatically. The application never breaks without AI.

---

## 5. Engineering Demonstration: Synthetic Deadline Rush

Located under the **Demo / Engineering** tab:
* Injects synthetic filing volume (+100, +500, +1,000, +5,000 returns) into the persistent SQLite queue inside a transaction.
* Real-time live dashboard displays total submissions, active queue count, active workers, completed returns, and average queue wait time.
* Live worker pool configuration controls (adjust worker delay from 2s to 9s, and worker concurrency from 4 to 16).
* Direct shortcut to open a live citizen status page from any rush batch.

---

## 6. Architecture & Tech Stack

* **Frontend**: React 18, TypeScript, Vite, Modern Responsive CSS (Vanilla design system with dark forest emerald palette, Outfit & Plus Jakarta Sans typography).
* **Backend**: Node.js, Express, TypeScript.
* **Database & Persistent Queue**: SQLite (`node:sqlite` DatabaseSync) with `returns`, `jobs`, and `acknowledgements` tables.
* **Background Worker**: Asynchronous tick loop processing jobs from `QUEUED` → `PROCESSING` → `COMPLETED`.
* **AI Layer**: OpenAI API (`gpt-4o-mini`) with server-side guardrails & deterministic fallback.

---

## 7. Safety Disclaimers & Limitations

* **Synthetic Data Only**: All taxpayer profiles, numbers, and references are purely synthetic.
* **Zero Government Connection**: No connection or traffic is ever sent to `incometax.gov.in` or any real Indian government service.
* **Mock Backend**: Government processing is simulated locally in this prototype.
* **Production Limitations**: Real-world government deployment would require official e-filing authorization, PAN/Aadhaar cryptographic authentication, digital signatures, audit logs, and security compliance.

---

## 8. Running Locally

### Prerequisites
* Node.js v18+ (tested on Node v24)

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
```bash
npm run dev
```

### Run Automated E2E Test Suite
```bash
npm test
```

### Optional Environment Variables
```bash
PORT=3000                   # Server port (default: 3000)
PROCESSING_DELAY_MS=5500    # Worker processing delay in ms (default: 5500)
WORKER_CONCURRENCY=6        # Worker concurrency (default: 6)
OPENAI_API_KEY=your_key_here # Optional: OpenAI API Key for dynamic AI explanations
```
