import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(root, 'taxflow.db');
const db = new DatabaseSync(dbPath);

try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
} catch {
  // Pragma configuration fallback
}

// Configurable worker parameters (can also be updated via API at runtime)
let workerConfig = {
  delayMs: Number(process.env.PROCESSING_DELAY_MS || 5500),
  concurrency: Number(process.env.WORKER_CONCURRENCY || 6),
  failureRate: 0.02 // 2% synthetic downstream retryable anomaly rate
};

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referenceId TEXT UNIQUE NOT NULL,
    taxpayerName TEXT DEFAULT 'Synthetic Taxpayer',
    salary REAL NOT NULL,
    interest REAL NOT NULL,
    otherIncome REAL NOT NULL,
    tds REAL NOT NULL,
    deductions REAL NOT NULL,
    validationStatus TEXT NOT NULL,
    processingStatus TEXT NOT NULL,
    idempotencyKey TEXT UNIQUE,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    completedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    returnId INTEGER UNIQUE NOT NULL,
    status TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    startedAt TEXT,
    completedAt TEXT,
    FOREIGN KEY (returnId) REFERENCES returns (id)
  );

  CREATE TABLE IF NOT EXISTS acknowledgements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    returnId INTEGER UNIQUE NOT NULL,
    referenceId TEXT NOT NULL,
    ackNumber TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (returnId) REFERENCES returns (id)
  );

  CREATE INDEX IF NOT EXISTS idx_returns_ref ON returns (referenceId);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status, id);
`);

// Safe column migrations in case existing table misses new columns
try {
  db.exec("ALTER TABLE returns ADD COLUMN taxpayerName TEXT DEFAULT 'Synthetic Taxpayer'");
} catch {
  // Column already exists
}

try {
  db.exec("ALTER TABLE acknowledgements ADD COLUMN ackNumber TEXT DEFAULT 'ACK-SYNTH-85920145'");
} catch {
  // Column already exists
}

function generateRef(): string {
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const digits = crypto.randomInt(1000, 9999);
  return `TX-DEMO-${hex}${digits}`;
}

function generateAckNumber(): string {
  return `ACK-SYNTH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

interface TaxInput {
  taxpayerName?: string;
  salary: number | string;
  interest: number | string;
  otherIncome: number | string;
  tds: number | string;
  deductions: number | string;
}

interface CleanedInput {
  taxpayerName: string;
  salary: number;
  interest: number;
  otherIncome: number;
  tds: number;
  deductions: number;
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  suggestion: string;
}

const moneyKeys = ['salary', 'interest', 'otherIncome', 'tds', 'deductions'] as const;

function cleanInput(raw: any): CleanedInput {
  return {
    taxpayerName: (raw?.taxpayerName || 'Rahul Sharma').toString().trim().slice(0, 80),
    salary: raw?.salary === '' || raw?.salary == null ? 0 : Number(raw.salary),
    interest: raw?.interest === '' || raw?.interest == null ? 0 : Number(raw.interest),
    otherIncome: raw?.otherIncome === '' || raw?.otherIncome == null ? 0 : Number(raw.otherIncome),
    tds: raw?.tds === '' || raw?.tds == null ? 0 : Number(raw.tds),
    deductions: raw?.deductions === '' || raw?.deductions == null ? 0 : Number(raw.deductions)
  };
}

function validateReturn(input: any) {
  const data = cleanInput(input);
  const errors: ValidationError[] = [];

  for (const k of moneyKeys) {
    const val = data[k];
    if (!Number.isFinite(val)) {
      errors.push({
        field: k,
        message: `Please enter a valid numeric amount for ${k}.`,
        code: 'INVALID_NUMBER',
        suggestion: 'Ensure the field contains digits only without special letters.'
      });
    } else if (val < 0) {
      errors.push({
        field: k,
        message: 'Amounts cannot be negative in this synthetic filing.',
        code: 'NEGATIVE_VALUE',
        suggestion: 'Enter zero or a positive amount.'
      });
    }
  }

  // Deductions synthetic limit check
  if (data.deductions > 150000) {
    errors.push({
      field: 'deductions',
      message: 'Claimed deductions exceed the prototype synthetic limit of ₹1,50,000.',
      code: 'DEDUCTION_LIMIT_EXCEEDED',
      suggestion: 'Reduce your deductions to ₹1,50,000 or lower for this demonstration.'
    });
  }

  // TDS vs Gross Income check
  const grossIncome = data.salary + data.interest + data.otherIncome;
  if (data.tds > grossIncome && grossIncome > 0) {
    errors.push({
      field: 'tds',
      message: 'Your TDS amount is higher than your total synthetic income.',
      code: 'TDS_EXCEEDS_INCOME',
      suggestion: 'Check if your TDS deducted was entered incorrectly or exceeds the total earnings.'
    });
  } else if (data.tds > 0 && grossIncome === 0) {
    errors.push({
      field: 'tds',
      message: 'TDS cannot be claimed without any reported income.',
      code: 'TDS_WITHOUT_INCOME',
      suggestion: 'Enter your salary or other income details before claiming TDS.'
    });
  }

  // Synthetic demo tax breakdown (clearly labeled demo calculation only)
  const allowedDeductions = Math.min(data.deductions, 150000);
  const taxableIncome = Math.max(0, grossIncome - allowedDeductions);
  
  // Very simple progressive prototype demo estimate (not real tax law)
  let syntheticTax = 0;
  if (taxableIncome > 700000) {
    syntheticTax = Math.round((taxableIncome - 700000) * 0.15 + 40000);
  } else if (taxableIncome > 300000) {
    syntheticTax = Math.round((taxableIncome - 300000) * 0.08);
  }
  const netRefundOrPayable = syntheticTax - data.tds;

  return {
    valid: errors.length === 0,
    errors,
    values: data,
    calculation: {
      grossIncome,
      allowedDeductions,
      taxableIncome,
      syntheticTax,
      tds: data.tds,
      netRefundOrPayable,
      label: 'Demo calculation only — not official Indian tax law'
    }
  };
}

// Fallback plain-language explanations (active when OpenAI key is missing or offline)
function getFallbackStatusExplanation(status: string, queuePosition: number, estimatedSeconds: number): string {
  switch (status) {
    case 'RECEIVED':
    case 'QUEUED':
      if (queuePosition > 0) {
        return `Your return is safely stored in TaxFlow's queue at position ${queuePosition}. It will be picked up in about ~${estimatedSeconds} seconds. You can safely close this page without losing your spot.`;
      }
      return 'Your return has been safely received by TaxFlow and is waiting for background worker pickup. You do not need to submit it again.';
    case 'PROCESSING':
      return 'Your return is currently being processed by the simulated government backend worker. Downstream verification is in progress.';
    case 'COMPLETED':
      return 'Your return has completed synthetic background processing! Your demonstration acknowledgement receipt has been issued.';
    case 'FAILED':
      return 'Synthetic downstream simulation encountered a transient timeout. TaxFlow workers will retry automatically without losing your data.';
    default:
      return 'Your return is safe in the queue. You do not need to re-submit.';
  }
}

function getFallbackErrorExplanation(field: string, errorMsg: string): string {
  if (errorMsg.includes('TDS amount is higher') || field === 'tds') {
    return 'Your TDS (tax deducted at source) exceeds your total reported synthetic earnings. In tax filing, TDS cannot be larger than the income it was deducted from. Please adjust your TDS or income.';
  }
  if (errorMsg.includes('Deductions exceed') || field === 'deductions') {
    return 'The prototype caps synthetic deductions at ₹1,50,000 to simulate standard demonstration thresholds. Please reduce your deductions to proceed.';
  }
  if (errorMsg.includes('negative')) {
    return 'Financial amounts cannot be negative. Please enter zero (0) or positive amounts.';
  }
  return `There is an issue with the ${field} value: ${errorMsg}. Please update the highlighted field and validate again.`;
}

function getFallbackDeadlineExplanation(): string {
  return 'During filing deadlines, millions of citizens try to connect to the same downstream verification services at the exact same minute. In a traditional synchronous system, one slow downstream query makes the citizen wait on a loading spinner until it times out, causing repeated retries. TaxFlow solves this by instantly accepting and securing your return into a durable queue in milliseconds, freeing you immediately while workers process returns smoothly in the background.';
}

const app = express();
app.use(express.json());

// 1. Validate Return
app.post('/api/returns/validate', (req, res) => {
  const result = validateReturn(req.body);
  res.json(result);
});

// 2. Submit Return (Idempotent, Instant Response)
app.post('/api/returns/submit', (req, res) => {
  const validation = validateReturn(req.body);
  if (!validation.valid) {
    return res.status(422).json(validation);
  }

  const idempotencyKey = req.header('Idempotency-Key') || req.body.idempotencyKey;
  if (idempotencyKey) {
    const existing = db.prepare('SELECT referenceId, processingStatus, createdAt FROM returns WHERE idempotencyKey = ?').get(idempotencyKey) as any;
    if (existing) {
      return res.json({
        status: existing.processingStatus,
        referenceId: existing.referenceId,
        duplicate: true,
        message: 'Existing submission returned (idempotency key matched).'
      });
    }
  }

  const now = new Date().toISOString();
  const referenceId = generateRef();
  const values = validation.values;

  try {
    const insertReturn = db.prepare(`
      INSERT INTO returns (
        referenceId, taxpayerName, salary, interest, otherIncome, tds, deductions,
        validationStatus, processingStatus, idempotencyKey, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertReturn.run(
      referenceId,
      values.taxpayerName,
      values.salary,
      values.interest,
      values.otherIncome,
      values.tds,
      values.deductions,
      'VALID',
      'QUEUED',
      idempotencyKey || null,
      now,
      now
    );

    const returnId = Number(result.lastInsertRowid);

    db.prepare(`
      INSERT INTO jobs (returnId, status, attempts, createdAt)
      VALUES (?, 'QUEUED', 0, ?)
    `).run(returnId, now);

    // CRITICAL: Respond immediately (<20ms). Do NOT wait for worker processing!
    res.status(201).json({
      status: 'RECEIVED',
      referenceId,
      createdAt: now,
      message: 'Submission safely received by TaxFlow and queued for processing.'
    });
  } catch (err: any) {
    console.error('Submission save error:', err);
    res.status(500).json({
      message: "We couldn't save your submission right now. Please check the status page before trying again."
    });
  }
});

// 3. Get Return Details by Reference ID
app.get('/api/returns/:referenceId', (req, res) => {
  const ref = req.params.referenceId;
  const returnRecord = db.prepare('SELECT * FROM returns WHERE referenceId = ?').get(ref) as any;

  if (!returnRecord) {
    return res.status(404).json({ message: 'We could not find that TaxFlow reference.' });
  }

  const job = db.prepare('SELECT * FROM jobs WHERE returnId = ?').get(returnRecord.id) as any;
  const ack = db.prepare('SELECT * FROM acknowledgements WHERE returnId = ?').get(returnRecord.id) as any;

  // Compute live queue position
  let queuePosition = 0;
  let estimatedSeconds = 0;

  if (returnRecord.processingStatus === 'QUEUED' && job) {
    const countAhead = (db.prepare(`
      SELECT count(*) as c FROM jobs 
      WHERE status = 'QUEUED' AND id < ?
    `).get(job.id) as any).c;
    queuePosition = countAhead + 1;
    estimatedSeconds = Math.max(1, Math.ceil((queuePosition / Math.max(1, workerConfig.concurrency)) * (workerConfig.delayMs / 1000)));
  } else if (returnRecord.processingStatus === 'PROCESSING') {
    queuePosition = 0;
    estimatedSeconds = Math.max(1, Math.ceil(workerConfig.delayMs / 2000));
  }

  res.json({
    return: returnRecord,
    job,
    acknowledgement: ack,
    queuePosition,
    estimatedSeconds,
    statusNotice: returnRecord.processingStatus === 'COMPLETED'
      ? 'Processing completed. Your synthetic acknowledgement is ready.'
      : "Your return is safely queued. You don't need to submit again."
  });
});

// 4. Lightweight status polling endpoint
app.get('/api/returns/:referenceId/status', (req, res) => {
  const ref = req.params.referenceId;
  const returnRecord = db.prepare('SELECT processingStatus, completedAt, updatedAt FROM returns WHERE referenceId = ?').get(ref) as any;
  if (!returnRecord) {
    return res.status(404).json({ message: 'Reference not found' });
  }
  res.json(returnRecord);
});

// 5. Recent submissions list for easy review
app.get('/api/returns/recent/list', (req, res) => {
  const recent = db.prepare(`
    SELECT referenceId, taxpayerName, salary, tds, processingStatus, createdAt, completedAt
    FROM returns
    ORDER BY id DESC
    LIMIT 10
  `).all();
  res.json(recent);
});

// 6. AI: Explain Status
app.post('/api/ai/explain-status', async (req, res) => {
  const { status = 'QUEUED', queuePosition = 0, estimatedSeconds = 5 } = req.body;
  let explanation = getFallbackStatusExplanation(status, queuePosition, estimatedSeconds);
  let usedAI = false;

  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = `You are a calm, reassuring digital filing assistant for TaxFlow (a prototype demonstrating decoupled asynchronous filing).
Explain this filing status in 1-2 friendly sentences (max 45 words):
Status: ${status}
Queue Position: ${queuePosition}
Estimated Seconds: ${estimatedSeconds}

SAFETY RULES:
- Never claim to be the Income Tax Department or Government of India.
- Never give tax advice or invent legal rules.
- Reassure the user that their return is safely received and they do not need to re-submit or keep the browser open.`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (text) {
        explanation = text;
        usedAI = true;
      }
    } catch (err) {
      console.warn('OpenAI status explanation fallback used:', (err as Error).message);
    }
  }

  res.json({ explanation, usedAI });
});

// 7. AI: Explain Error
app.post('/api/ai/explain-error', async (req, res) => {
  const { field = 'general', error = 'Invalid input value' } = req.body;
  let explanation = getFallbackErrorExplanation(field, error);
  let usedAI = false;

  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = `You are a helpful assistant for TaxFlow, a filing prototype.
Explain this form validation issue simply in plain English (max 45 words):
Field: ${field}
Error: ${error}

SAFETY RULES:
- Never claim to be the Income Tax Department or Government of India.
- Never calculate actual legal tax liability or give formal tax advice.
- Focus on what is wrong and what the user should change in simple terms.`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (text) {
        explanation = text;
        usedAI = true;
      }
    } catch (err) {
      console.warn('OpenAI error explanation fallback used:', (err as Error).message);
    }
  }

  res.json({ explanation, usedAI });
});

// 8. AI: Explain Deadline Bottleneck
app.post('/api/ai/explain-deadline', async (req, res) => {
  let explanation = getFallbackDeadlineExplanation();
  let usedAI = false;

  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const prompt = `Explain in simple non-technical terms (max 65 words) why tax filing portals slow down near the midnight deadline, and why an asynchronous queue architecture (storing submission first in <50ms and processing in background) prevents timeouts and repeated retries.
SAFETY: Never make speculative claims about real Indian Income Tax Department internal hardware. Frame it conceptually.`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.4
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (text) {
        explanation = text;
        usedAI = true;
      }
    } catch (err) {
      console.warn('OpenAI deadline explanation fallback used:', (err as Error).message);
    }
  }

  res.json({ explanation, usedAI });
});

// 9. Demo: Deadline Rush Simulation (Synthetic Load)
app.post('/api/demo/deadline-rush', (req, res) => {
  const count = Math.min(Math.max(1, Number(req.body.count) || 100), 50000);
  const now = new Date().toISOString();
  const batchPrefix = Date.now().toString(36).toUpperCase();

  const insertReturn = db.prepare(`
    INSERT INTO returns (
      referenceId, taxpayerName, salary, interest, otherIncome, tds, deductions,
      validationStatus, processingStatus, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'VALID', 'QUEUED', ?, ?)
  `);

  const insertJob = db.prepare(`
    INSERT INTO jobs (returnId, status, createdAt)
    VALUES (?, 'QUEUED', ?)
  `);

  const sampleNames = ['Aarav Mehta', 'Ananya Iyer', 'Vikram Singh', 'Rohan Gupta', 'Sneha Rao', 'Aditya Verma', 'Pooja Nair', 'Karan Patel', 'Meera Joshi', 'Devendra Sen'];
  let sampleRef = '';

  db.exec('BEGIN TRANSACTION');
  try {
    for (let i = 0; i < count; i++) {
      const hexRand = crypto.randomBytes(2).toString('hex').toUpperCase();
      const ref = `TX-DEMO-${batchPrefix}-${(i + 1).toString().padStart(5, '0')}-${hexRand}`;
      if (i === 0) sampleRef = ref;
      const name = sampleNames[i % sampleNames.length];
      const salary = 500000 + (i % 20) * 50000;
      const tds = Math.round(salary * 0.05);
      const deductions = Math.min(150000, 50000 + (i % 10) * 10000);

      const retResult = insertReturn.run(ref, name, salary, 15000, 0, tds, deductions, now, now);
      insertJob.run(Number(retResult.lastInsertRowid), now);
    }
    db.exec('COMMIT');

    res.json({
      success: true,
      created: count,
      sampleReferenceId: sampleRef,
      message: `Successfully queued ${count.toLocaleString()} synthetic returns into SQLite queue.`
    });
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('Deadline rush error:', err);
    res.status(500).json({ message: 'Synthetic rush failed to initiate: ' + (err as Error).message });
  }
});

// 10. Demo: Real-Time Metrics
app.get('/api/demo/metrics', (req, res) => {
  const counts: Record<string, number> = {
    QUEUED: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0
  };

  const statusRows = db.prepare('SELECT processingStatus, count(*) as count FROM returns GROUP BY processingStatus').all() as any[];
  for (const r of statusRows) {
    counts[r.processingStatus] = r.count;
  }

  const totalReceived = (db.prepare('SELECT count(*) as total FROM returns').get() as any).total;
  const activeWorkers = (db.prepare("SELECT count(*) as count FROM jobs WHERE status = 'PROCESSING'").get() as any).count;

  res.json({
    received: totalReceived,
    queued: counts.QUEUED || 0,
    processing: counts.PROCESSING || 0,
    completed: counts.COMPLETED || 0,
    failed: counts.FAILED || 0,
    activeWorkers,
    workerConfig,
    averageQueueSeconds: Math.round((workerConfig.delayMs / (workerConfig.concurrency * 1000)) * 10) / 10
  });
});

// 11. Demo: Update Worker Settings
app.post('/api/demo/settings', (req, res) => {
  const { delayMs, concurrency } = req.body;
  if (delayMs && Number.isFinite(delayMs)) {
    workerConfig.delayMs = Math.max(300, Math.min(20000, Number(delayMs)));
  }
  if (concurrency && Number.isFinite(concurrency)) {
    workerConfig.concurrency = Math.max(1, Math.min(100, Number(concurrency)));
  }
  res.json({ success: true, workerConfig });
});

// 12. Demo: Reset Database (Resets submissions & queue to 0)
app.post('/api/demo/reset', (req, res) => {
  try {
    db.exec(`
      DELETE FROM acknowledgements;
      DELETE FROM jobs;
      DELETE FROM returns;
    `);
    res.json({ success: true, message: 'Queue and all submissions have been reset to 0.' });
  } catch (err) {
    res.status(500).json({ message: 'Reset failed' });
  }
});

// 13. Demo: Optional Sample Data Seeding
app.post('/api/demo/seed', (req, res) => {
  try {
    seedDemoData();
    res.json({ success: true, message: 'Demo sample data seeded successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Seed failed' });
  }
});

// Persistent Background Worker Tick
function runWorkerTick() {
  try {
    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Complete any PROCESSING jobs whose startedAt + delayMs <= now
    const processingJobs = db.prepare(`
      SELECT jobs.id as jobId, jobs.returnId, jobs.startedAt, returns.referenceId, returns.taxpayerName
      FROM jobs
      JOIN returns ON returns.id = jobs.returnId
      WHERE jobs.status = 'PROCESSING'
    `).all() as any[];

    for (const job of processingJobs) {
      if (!job.startedAt) continue;
      const startedTime = new Date(job.startedAt).getTime();
      if (now.getTime() - startedTime >= workerConfig.delayMs) {
        // Complete this job
        const shouldSimulateFailure = Math.random() < workerConfig.failureRate;
        const finalStatus = shouldSimulateFailure ? 'FAILED' : 'COMPLETED';

        db.prepare("UPDATE jobs SET status = ?, completedAt = ? WHERE id = ?").run(finalStatus, nowIso, job.jobId);
        db.prepare("UPDATE returns SET processingStatus = ?, completedAt = ?, updatedAt = ? WHERE id = ?").run(finalStatus, nowIso, nowIso, job.returnId);

        if (finalStatus === 'COMPLETED') {
          const ackNum = generateAckNumber();
          db.prepare(`
            INSERT OR REPLACE INTO acknowledgements (returnId, referenceId, ackNumber, status, createdAt)
            VALUES (?, ?, ?, 'Processed', ?)
          `).run(job.returnId, job.referenceId, ackNum, nowIso);
        }
      }
    }

    // 2. Pick next QUEUED jobs up to available concurrency
    const currentRunning = (db.prepare("SELECT count(*) as c FROM jobs WHERE status = 'PROCESSING'").get() as any).c;
    const availableSlots = Math.max(0, workerConfig.concurrency - currentRunning);

    if (availableSlots > 0) {
      const nextJobs = db.prepare(`
        SELECT jobs.id as jobId, jobs.returnId
        FROM jobs
        WHERE jobs.status = 'QUEUED'
        ORDER BY jobs.id ASC
        LIMIT ?
      `).all(availableSlots) as any[];

      for (const job of nextJobs) {
        db.prepare("UPDATE jobs SET status = 'PROCESSING', attempts = attempts + 1, startedAt = ? WHERE id = ?").run(nowIso, job.jobId);
        db.prepare("UPDATE returns SET processingStatus = 'PROCESSING', updatedAt = ? WHERE id = ?").run(nowIso, job.returnId);
      }
    }
  } catch (err) {
    console.error('Worker tick error:', err);
  }
}

// Run worker tick every 300ms
setInterval(runWorkerTick, 300);

// Seed function for demo
function seedDemoData() {
  const existing = (db.prepare('SELECT count(*) as c FROM returns').get() as any).c;
  if (existing > 0) return;

  const now = new Date().toISOString();
  const pastTime = new Date(Date.now() - 60000).toISOString();

  // Completed return
  const r1 = db.prepare(`
    INSERT INTO returns (referenceId, taxpayerName, salary, interest, otherIncome, tds, deductions, validationStatus, processingStatus, createdAt, updatedAt, completedAt)
    VALUES ('TX-DEMO-850124', 'Rahul Sharma', 850000, 18500, 0, 42000, 150000, 'VALID', 'COMPLETED', ?, ?, ?)
  `).run(pastTime, pastTime, pastTime);
  const id1 = Number(r1.lastInsertRowid);
  db.prepare("INSERT INTO jobs (returnId, status, attempts, createdAt, startedAt, completedAt) VALUES (?, 'COMPLETED', 1, ?, ?, ?)").run(id1, pastTime, pastTime, pastTime);
  db.prepare("INSERT INTO acknowledgements (returnId, referenceId, ackNumber, status, createdAt) VALUES (?, 'TX-DEMO-850124', 'ACK-SYNTH-85920145', 'Processed', ?)").run(id1, pastTime);

  // Queued return
  const r2 = db.prepare(`
    INSERT INTO returns (referenceId, taxpayerName, salary, interest, otherIncome, tds, deductions, validationStatus, processingStatus, createdAt, updatedAt)
    VALUES ('TX-DEMO-912384', 'Priya Patel', 1250000, 24000, 50000, 95000, 150000, 'VALID', 'QUEUED', ?, ?)
  `).run(now, now);
  const id2 = Number(r2.lastInsertRowid);
  db.prepare("INSERT INTO jobs (returnId, status, attempts, createdAt) VALUES (?, 'QUEUED', 0, ?)").run(id2, now);

  console.log('Seed data initialized: TX-DEMO-850124 (Completed), TX-DEMO-912384 (Queued).');
}

seedDemoData();

if (process.argv.includes('--setup') || process.argv.includes('--seed')) {
  console.log('Setup / Seed completed successfully.');
  process.exit(0);
}

// Serve static assets in production
app.use(express.static(path.join(root, 'dist')));
app.get('/{*splat}', (_, res) => {
  res.sendFile(path.join(root, 'dist', 'index.html'));
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`TaxFlow prototype running at http://localhost:${PORT}`);
});
