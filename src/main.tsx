import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

// Indian Rupee Currency Formatter
const formatINR = (n: number | string) => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

// Indian Number to Lakhs/Crores readable words
const formatIndianWords = (n: number | string) => {
  const num = Number(n) || 0;
  if (num === 0) return 'Zero';
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Crore`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)} Lakh`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)} Thousand`;
  return num.toLocaleString('en-IN');
};

// Relative timestamp helper
const formatTimeAgo = (isoDateStr?: string) => {
  if (!isoDateStr) return 'just now';
  const diffSec = Math.floor((Date.now() - new Date(isoDateStr).getTime()) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  const diffHrs = Math.floor(diffMin / 60);
  return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
};

// API Fetch Helper
async function api(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

// Preset Taxpayer Profiles
const presets = [
  {
    label: '👤 Rahul Sharma (₹8.5L Salaried)',
    data: { taxpayerName: 'Rahul Sharma', salary: 850000, interest: 18500, otherIncome: 0, tds: 42000, deductions: 150000 },
    error: false
  },
  {
    label: '👤 Priya Patel (₹12.5L Consultant)',
    data: { taxpayerName: 'Priya Patel', salary: 1250000, interest: 24000, otherIncome: 50000, tds: 95000, deductions: 150000 },
    error: false
  },
  {
    label: '⚠️ Test Error: TDS > Salary',
    data: { taxpayerName: 'Rahul Sharma', salary: 500000, interest: 0, otherIncome: 0, tds: 900000, deductions: 50000 },
    error: true
  },
  {
    label: '⚠️ Test Error: Deductions > ₹1.5L Limit',
    data: { taxpayerName: 'Rahul Sharma', salary: 900000, interest: 20000, otherIncome: 0, tds: 50000, deductions: 250000 },
    error: true
  }
];

// Header Component
function Header({ currentRoute }: { currentRoute: string }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <a href="#/" className="brand-container">
          <div className="brand-logo">TF</div>
          <div className="brand-name">
            Tax<span>Flow</span>
          </div>
          <span className="prototype-tag">PROTOTYPE</span>
        </a>
        <nav className="main-nav">
          <a href="#/" className={`nav-link ${currentRoute === '/' ? 'active' : ''}`}>
            Home
          </a>
          <a href="#/file" className={`nav-link ${currentRoute.startsWith('/file') ? 'active' : ''}`}>
            File Return
          </a>
          <a href="#/track" className={`nav-link ${currentRoute.startsWith('/track') ? 'active' : ''}`}>
            Track Return
          </a>
          <a href="#/how" className={`nav-link ${currentRoute === '/how' ? 'active' : ''}`}>
            How It Works
          </a>
          <a href="#/demo" className={`nav-link demo-link ${currentRoute === '/demo' ? 'active' : ''}`}>
            <span className="pulse-dot"></span>
            Demo / Engineering
          </a>
        </nav>
      </div>
    </header>
  );
}

// Global Notice Banner
function Notice() {
  return (
    <div className="global-notice" role="note">
      <span>⚠️</span>
      <span>
        <strong>DEMO PROTOTYPE</strong> — Uses synthetic taxpayer data and simulated government processing. Not an official Government of India service.
      </span>
    </div>
  );
}

// Interactive Demo Controls Bar (Feature 3, 6, 7)
function DemoControlsBar({
  networkInterrupted,
  setNetworkInterrupted,
  ambiguousSubmit,
  setAmbiguousSubmit,
  dependencyState,
  setDependencyState
}: {
  networkInterrupted: boolean;
  setNetworkInterrupted: (val: boolean) => void;
  ambiguousSubmit: boolean;
  setAmbiguousSubmit: (val: boolean) => void;
  dependencyState: string;
  setDependencyState: (val: string) => void;
}) {
  return (
    <div className="demo-controls-bar">
      <div className="demo-controls-inner">
        <span className="demo-bar-badge">⚡ DEMO SIMULATOR CONTROLS</span>
        
        <label className="demo-control-item" title="Simulates network save failure while preserving local form state">
          <input
            type="checkbox"
            checked={networkInterrupted}
            onChange={(e) => setNetworkInterrupted(e.target.checked)}
          />
          <span>Simulate Network Interruption</span>
        </label>

        <label className="demo-control-item" title="Simulates network drop after submission to verify automatic idempotency recovery">
          <input
            type="checkbox"
            checked={ambiguousSubmit}
            onChange={(e) => setAmbiguousSubmit(e.target.checked)}
          />
          <span>Simulate Ambiguous Submit Failure</span>
        </label>

        <div className="demo-control-item">
          <span>Downstream Dependency:</span>
          <select
            value={dependencyState}
            onChange={(e) => setDependencyState(e.target.value)}
            className="demo-select"
          >
            <option value="AVAILABLE">🟢 AVAILABLE</option>
            <option value="SLOW">🟡 SLOW</option>
            <option value="UNAVAILABLE">🔴 UNAVAILABLE</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// Landing Page Component
function Home() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    api('/api/demo/metrics')
      .then(setMetrics)
      .catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-badge">
          <span>🛡️</span> DEADLINE-RESILIENT FILING PROTOTYPE
        </div>
        <h1 className="hero-title">
          Citizens should not lose work<br />
          <span>because the system is slow.</span>
        </h1>
        <p className="hero-subtitle">
          TaxFlow makes the tax filing journey resilient to deadline rush congestion, slow dependencies, network drops, and session timeouts.
        </p>
        <div className="hero-actions">
          <a href="#/file" className="btn btn-primary btn-lg">
            Start Filing Return →
          </a>
          <a href="#/how" className="btn btn-secondary btn-lg">
            See Architecture & How It Works
          </a>
        </div>
      </section>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">💾</div>
          <h3>1. Autosave & Resume</h3>
          <p>
            Your form progress saves automatically in real-time. If you refresh, leave, or lose connection, your draft is ready to resume.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3>2. Retry-Safe Idempotency</h3>
          <p>
            Accidental double-clicks or retries after network timeouts safely return your existing submission without creating duplicates.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>3. Decoupled Queue</h3>
          <p>
            Submissions are safely received in milliseconds (&lt;50ms) and processed asynchronously in the background by persistent queue workers.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">✨</div>
          <h3>4. AI Plain-Language Status</h3>
          <p>
            OpenAI-powered explanations reassure citizens on queue status, validation issues, and next steps without legal jargon.
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Experience the Resilient Citizen Flow</h2>
        <p className="card-subtitle">
          Select a synthetic demo profile to start filing or trigger validation error handling:
        </p>
        <div className="presets-buttons">
          {presets.map((p, idx) => (
            <a
              key={idx}
              href="#/file"
              className={`preset-chip ${p.error ? 'error-preset' : ''}`}
              onClick={() => {
                sessionStorage.setItem('taxflow_preset', JSON.stringify(p.data));
              }}
            >
              {p.label}
            </a>
          ))}
        </div>
      </div>

      {metrics && metrics.received > 0 && (
        <div className="card" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ color: '#065f46', fontSize: '15px' }}>🚀 Live Prototype Queue Status</strong>
              <p style={{ fontSize: '13px', color: '#047857', margin: 0 }}>
                {metrics.received.toLocaleString()} synthetic returns received · {metrics.completed.toLocaleString()} completed · {metrics.queued.toLocaleString()} queued
              </p>
            </div>
            <a href="#/demo" className="btn btn-secondary btn-sm">
              View Engineering Rush Dashboard →
            </a>
          </div>
        </div>
      )}
    </>
  );
}

// Filing Form Component with Autosave, Resume, Network Interruption & Idempotency Recovery
function Filing({
  networkInterrupted,
  ambiguousSubmit
}: {
  networkInterrupted: boolean;
  ambiguousSubmit: boolean;
}) {
  // Stable Draft ID stored in localStorage for persistent session survival
  const [draftId] = useState<string>(() => {
    let savedId = localStorage.getItem('taxflow_draft_id');
    if (!savedId) {
      savedId = `DF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      localStorage.setItem('taxflow_draft_id', savedId);
    }
    return savedId;
  });

  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>(() => {
    const savedPreset = sessionStorage.getItem('taxflow_preset');
    if (savedPreset) {
      try {
        return JSON.parse(savedPreset);
      } catch {}
    }
    return presets[0].data;
  });

  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'interrupted'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);

  const [validation, setValidation] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorFocusField, setErrorFocusField] = useState('');
  const [ambiguousResult, setAmbiguousResult] = useState<any>(null);

  // Check for saved draft on mount for Resume Filing (Feature 2)
  useEffect(() => {
    if (!draftId) return;
    api(`/api/drafts/${draftId}`)
      .then((res) => {
        if (res && res.data && res.status === 'DRAFT') {
          setResumeData(res);
          setShowResumeModal(true);
        }
      })
      .catch(() => {});
  }, [draftId]);

  // Debounced Autosave (Feature 1)
  useEffect(() => {
    if (!draftId) return;
    setAutosaveStatus('saving');

    const timer = setTimeout(async () => {
      if (networkInterrupted) {
        setAutosaveStatus('interrupted');
        return;
      }

      try {
        const res = await api('/api/drafts/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftId, data: { ...data, step } })
        });
        setAutosaveStatus('saved');
        setLastSavedTime(res.updatedAt || new Date().toISOString());
      } catch {
        setAutosaveStatus('interrupted');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [data, step, draftId, networkInterrupted]);

  // Retry autosave when network recovers from interruption (Feature 3)
  useEffect(() => {
    if (!networkInterrupted && autosaveStatus === 'interrupted') {
      api('/api/drafts/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, data: { ...data, step } })
      })
        .then((res) => {
          setAutosaveStatus('saved');
          setLastSavedTime(res.updatedAt || new Date().toISOString());
        })
        .catch(() => {});
    }
  }, [networkInterrupted, autosaveStatus, draftId, data, step]);

  const handleResumeDraft = () => {
    if (resumeData?.data) {
      setData(resumeData.data);
      if (resumeData.data.step) setStep(resumeData.data.step);
      if (resumeData.updatedAt) setLastSavedTime(resumeData.updatedAt);
      setAutosaveStatus('saved');
    }
    setShowResumeModal(false);
  };

  const handleStartNewReturn = () => {
    api('/api/drafts/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId })
    }).catch(() => {});

    const newId = `DF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    localStorage.setItem('taxflow_draft_id', newId);
    sessionStorage.removeItem('taxflow_preset');
    setData(presets[0].data);
    setValidation(null);
    setStep(1);
    setShowResumeModal(false);
  };

  const loadPreset = (presetData: any) => {
    setData(presetData);
    setValidation(null);
    setStep(1);
  };

  const handleValidate = async () => {
    setBusy(true);
    setErrorMsg('');
    try {
      const res = await api('/api/returns/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setValidation(res);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation service unavailable. Please retry.');
    }
    setBusy(false);
  };

  const handleSubmit = async () => {
    setBusy(true);
    setErrorMsg('');
    setAmbiguousResult(null);

    // Stable Idempotency Key tied to submission/draft (Feature 4)
    const idempotencyKey = sessionStorage.getItem('taxflow_sub_key') || `SUB-${crypto.randomUUID()}`;
    sessionStorage.setItem('taxflow_sub_key', idempotencyKey);

    // Feature 6: Simulate Ambiguous Network Failure (Submit sent, but client response drops)
    if (ambiguousSubmit) {
      try {
        await api('/api/returns/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({ ...data, idempotencyKey, draftId })
        });
      } catch {}

      setErrorMsg('Simulated network failure: Response timed out after submit. Recovering submission...');

      setTimeout(async () => {
        try {
          const check = await api(`/api/returns/by-key/${idempotencyKey}`);
          if (check.found) {
            setAmbiguousResult(check);
            sessionStorage.removeItem('taxflow_sub_key');
            sessionStorage.removeItem('taxflow_preset');
          } else {
            setErrorMsg('No submission found. Please try submitting again.');
          }
        } catch {
          setErrorMsg('Unable to verify submission status. Please retry.');
        }
        setBusy(false);
      }, 1000);
      return;
    }

    // Normal Instant Submission Flow
    try {
      const res = await api('/api/returns/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ ...data, idempotencyKey, draftId })
      });

      sessionStorage.removeItem('taxflow_sub_key');
      sessionStorage.removeItem('taxflow_preset');

      try {
        const recent = JSON.parse(localStorage.getItem('taxflow_recent_refs') || '[]');
        if (!recent.includes(res.referenceId)) {
          recent.unshift(res.referenceId);
          localStorage.setItem('taxflow_recent_refs', JSON.stringify(recent.slice(0, 10)));
        }
      } catch {}

      location.hash = `#/status/${res.referenceId}`;
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to submit right now. Please verify your details.');
      setBusy(false);
    }
  };

  // Ambiguous Network Failure Recovery View (Feature 6)
  if (ambiguousResult) {
    return (
      <main className="card" role="main">
        <div className="ambiguous-recovery-box">
          <div className="check-hero-icon">✓</div>
          <h2 className="card-title" style={{ color: '#065f46' }}>
            We found your previous submission.
          </h2>
          <p className="card-subtitle" style={{ fontSize: '16px', color: '#047857' }}>
            Your return was already safely received by TaxFlow before the network response was interrupted.
          </p>

          <div className="reference-card" style={{ margin: '24px 0' }}>
            <div className="ref-details">
              <span>Durable Reference ID</span>
              <strong>{ambiguousResult.referenceId}</strong>
            </div>
          </div>

          <div className="dont-retry-badge" style={{ margin: '20px 0' }}>
            🔒 You do not need to submit again.
          </div>

          <div className="actions-row" style={{ marginTop: '24px' }}>
            <a href={`#/status/${ambiguousResult.referenceId}`} className="btn btn-primary btn-lg">
              Track Return Status & Acknowledgement →
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="card" role="main">
      {/* Feature 2: Resume Filing Banner / Modal */}
      {showResumeModal && (
        <div className="resume-banner" role="dialog" aria-labelledby="resume-title">
          <div className="resume-header">
            <span className="resume-icon">👋</span>
            <div>
              <h3 id="resume-title">Welcome back!</h3>
              <p>
                Your saved return is ready to continue. Last saved:{' '}
                <strong>{formatTimeAgo(resumeData?.updatedAt)}</strong>
              </p>
            </div>
          </div>
          <div className="resume-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleResumeDraft}>
              Resume Filing →
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleStartNewReturn}>
              Start New Return
            </button>
          </div>
        </div>
      )}

      {/* Header Bar with Quick Presets & Autosave Status Indicator */}
      <div className="filing-header-bar">
        <div className="presets-container" style={{ margin: 0, flex: 1 }}>
          <span className="presets-label">⚡ Quick Fill Demo Profiles:</span>
          <div className="presets-buttons">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className={`preset-chip ${p.error ? 'error-preset' : ''}`}
                onClick={() => loadPreset(p.data)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature 1 & 3: Autosave Status Indicator */}
        <div className={`autosave-status-pill ${autosaveStatus}`}>
          {autosaveStatus === 'saving' && <span>⏳ Saving draft...</span>}
          {autosaveStatus === 'saved' && (
            <span>Saved ✓ <small>({formatTimeAgo(lastSavedTime)})</small></span>
          )}
          {autosaveStatus === 'interrupted' && (
            <span>⚠️ Connection interrupted <small>(Progress safe & auto-retrying)</small></span>
          )}
        </div>
      </div>

      {/* Feature 3: Connection Interrupted Banner */}
      {networkInterrupted && (
        <div className="warning-banner" style={{ margin: '16px 0' }}>
          <span>📶 Connection interrupted</span>
          <span>Your local progress is safe in browser memory. We'll retry saving automatically when reconnected.</span>
        </div>
      )}

      {/* Stepper Progress Bar */}
      <div className="stepper-header" aria-label="Filing steps">
        <div className={`step-indicator ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <div className="step-number">{step > 1 ? '✓' : '1'}</div>
          <span>Income</span>
        </div>
        <div className={`step-divider ${step > 1 ? 'completed' : ''}`} />
        <div className={`step-indicator ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
          <div className="step-number">{step > 2 ? '✓' : '2'}</div>
          <span>Tax Info</span>
        </div>
        <div className={`step-divider ${step > 2 ? 'completed' : ''}`} />
        <div className={`step-indicator ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
          <div className="step-number">{step > 3 ? '✓' : '3'}</div>
          <span>Review</span>
        </div>
        <div className={`step-divider ${step > 3 ? 'completed' : ''}`} />
        <div className={`step-indicator ${step === 4 ? 'active' : ''}`}>
          <div className="step-number">4</div>
          <span>Submit</span>
        </div>
      </div>

      {/* Step 1: Income Information */}
      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
        >
          <h2 className="card-title">Step 1 — Income Information</h2>
          <p className="card-subtitle">Enter synthetic taxpayer income details for this prototype demonstration.</p>

          <div className="form-group">
            <label className="form-label" htmlFor="taxpayerName">
              Taxpayer Name (Synthetic Demo)
            </label>
            <input
              id="taxpayerName"
              className="form-input"
              style={{ paddingLeft: '14px' }}
              value={data.taxpayerName || 'Rahul Sharma'}
              onChange={(e) => setData({ ...data, taxpayerName: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="salary">
              Salary Income
            </label>
            <div className="input-currency-wrapper">
              <span className="currency-symbol">₹</span>
              <input
                id="salary"
                type="number"
                min="0"
                step="1000"
                className={`form-input ${errorFocusField === 'salary' ? 'has-error' : ''}`}
                value={data.salary}
                onChange={(e) => setData({ ...data, salary: e.target.value })}
                required
              />
            </div>
            <div className="formatted-preview">{formatINR(data.salary)} ({formatIndianWords(data.salary)})</div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="interest">
              Interest Income (Bank / Savings)
            </label>
            <div className="input-currency-wrapper">
              <span className="currency-symbol">₹</span>
              <input
                id="interest"
                type="number"
                min="0"
                step="500"
                className="form-input"
                value={data.interest}
                onChange={(e) => setData({ ...data, interest: e.target.value })}
              />
            </div>
            <div className="formatted-preview">{formatINR(data.interest)}</div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="otherIncome">
              Other Income
            </label>
            <div className="input-currency-wrapper">
              <span className="currency-symbol">₹</span>
              <input
                id="otherIncome"
                type="number"
                min="0"
                step="1000"
                className="form-input"
                value={data.otherIncome}
                onChange={(e) => setData({ ...data, otherIncome: e.target.value })}
              />
            </div>
            <div className="formatted-preview">{formatINR(data.otherIncome)}</div>
          </div>

          <div className="actions-row">
            <div />
            <button type="submit" className="btn btn-primary">
              Continue to Tax Information →
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Tax Information */}
      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(3);
          }}
        >
          <h2 className="card-title">Step 2 — Tax Information & Deductions</h2>
          <p className="card-subtitle">Enter TDS deducted and synthetic deduction claims.</p>

          <div className="form-group">
            <label className="form-label" htmlFor="tds">
              TDS Deducted (Tax Deducted at Source)
            </label>
            <div className="input-currency-wrapper">
              <span className="currency-symbol">₹</span>
              <input
                id="tds"
                type="number"
                min="0"
                step="1000"
                className={`form-input ${errorFocusField === 'tds' ? 'has-error' : ''}`}
                value={data.tds}
                onChange={(e) => setData({ ...data, tds: e.target.value })}
                required
              />
            </div>
            <div className="formatted-preview">{formatINR(data.tds)} ({formatIndianWords(data.tds)})</div>
            <p className="form-hint">Synthetic demo rule: TDS cannot exceed total gross earnings.</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="deductions">
              Deductions (Synthetic Demo Limit: ₹1,50,000)
            </label>
            <div className="input-currency-wrapper">
              <span className="currency-symbol">₹</span>
              <input
                id="deductions"
                type="number"
                min="0"
                step="5000"
                className={`form-input ${errorFocusField === 'deductions' ? 'has-error' : ''}`}
                value={data.deductions}
                onChange={(e) => setData({ ...data, deductions: e.target.value })}
              />
            </div>
            <div className="formatted-preview">{formatINR(data.deductions)}</div>
            <p className="form-hint">Maximum deductible allowance capped at ₹1,50,000 in this prototype.</p>
          </div>

          <div className="actions-row">
            <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>
              ← Back to Income
            </button>
            <button type="submit" className="btn btn-primary">
              Continue to Review →
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Review & Summary */}
      {step === 3 && (
        <div>
          <h2 className="card-title">Step 3 — Review Return Summary</h2>
          <p className="card-subtitle">Review your synthetic return numbers before running deterministic validation.</p>

          <table className="summary-table">
            <tbody>
              <tr>
                <td className="label">Taxpayer Name</td>
                <td className="value">{data.taxpayerName || 'Rahul Sharma'}</td>
              </tr>
              <tr>
                <td className="label">Salary Income</td>
                <td className="value">{formatINR(data.salary)}</td>
              </tr>
              <tr>
                <td className="label">Interest Income</td>
                <td className="value">{formatINR(data.interest)}</td>
              </tr>
              <tr>
                <td className="label">Other Income</td>
                <td className="value">{formatINR(data.otherIncome)}</td>
              </tr>
              <tr className="highlight">
                <td className="label">Gross Total Income</td>
                <td className="value">{formatINR(Number(data.salary) + Number(data.interest) + Number(data.otherIncome))}</td>
              </tr>
              <tr>
                <td className="label">Claimed Deductions</td>
                <td className="value">{formatINR(data.deductions)}</td>
              </tr>
              <tr>
                <td className="label">TDS Deducted (Pre-paid)</td>
                <td className="value">{formatINR(data.tds)}</td>
              </tr>
            </tbody>
          </table>

          <div className="global-notice" style={{ margin: '16px 0', borderRadius: '8px' }}>
            <span>ℹ️</span> Demo calculation only. This is not an actual ITR or official tax calculation.
          </div>

          <div className="actions-row">
            <button type="button" className="btn btn-outline" onClick={() => setStep(2)}>
              ← Edit Tax Info
            </button>
            <button type="button" className="btn btn-primary" onClick={handleValidate} disabled={busy}>
              {busy ? 'Validating…' : 'Validate Return →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Validation Success OR Failure */}
      {step === 4 && validation && (
        <div>
          {validation.valid ? (
            <div>
              <h2 className="card-title">✓ Your return is ready</h2>
              <p className="card-subtitle">
                Deterministic validation passed successfully. Your return is ready to be saved and queued.
              </p>

              <div className="success-banner">
                <div className="success-item">
                  <div className="check-icon">✓</div>
                  <span>Required synthetic information completed</span>
                </div>
                <div className="success-item">
                  <div className="check-icon">✓</div>
                  <span>Values validated (Numeric, Non-negative, within thresholds)</span>
                </div>
                <div className="success-item">
                  <div className="check-icon">✓</div>
                  <span>Ready for instant decoupled submission</span>
                </div>
              </div>

              <div className="card" style={{ background: '#f8faf8', padding: '20px', margin: '20px 0' }}>
                <p style={{ fontSize: '14px', color: '#0d4a3e', fontWeight: 600, margin: 0 }}>
                  ⚡ When you submit, TaxFlow immediately returns your safe reference ID (&lt;50ms) without keeping your browser waiting for downstream processing.
                </p>
              </div>

              <div className="actions-row">
                <button type="button" className="btn btn-outline" onClick={() => setStep(3)}>
                  ← Back to Review
                </button>
                <button type="button" className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={busy}>
                  {busy ? 'Safely saving submission…' : 'Submit Return 🚀'}
                </button>
              </div>
            </div>
          ) : (
            <ValidationFailureView
              errors={validation.errors}
              onFix={() => {
                const firstErr = validation.errors[0]?.field;
                setErrorFocusField(firstErr);
                if (firstErr === 'salary' || firstErr === 'interest' || firstErr === 'otherIncome') {
                  setStep(1);
                } else {
                  setStep(2);
                }
              }}
            />
          )}
        </div>
      )}

      {errorMsg && (
        <div className="error-banner" style={{ marginTop: '20px' }} role="alert">
          <p>
            <strong>Status Notice:</strong> {errorMsg}
          </p>
        </div>
      )}
    </main>
  );
}

// Validation Failure Component with AI Explanation
function ValidationFailureView({ errors, onFix }: { errors: any[]; onFix: () => void }) {
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const handleExplainError = async () => {
    setLoadingAi(true);
    try {
      const firstError = errors[0];
      const res = await api('/api/ai/explain-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: firstError?.field,
          error: firstError?.message
        })
      });
      setAiExplanation(res.explanation);
    } catch {
      setAiExplanation('This is a prototype validation check. Please adjust the highlighted field amounts and try validating again.');
    }
    setLoadingAi(false);
  };

  return (
    <div>
      <div className="error-banner">
        <div className="error-banner-header">
          <span>⚠️</span>
          <span>We found something to fix</span>
        </div>
        <p style={{ fontSize: '14px', color: '#7f1d1d', marginBottom: '14px' }}>
          Please review the highlighted validation issues before submitting:
        </p>

        {errors.map((err, idx) => (
          <div key={idx} className="error-item">
            <p>
              <strong>1. What went wrong:</strong> {err.message}
            </p>
            <p className="error-suggestion">
              <strong>2. Why it matters:</strong> {err.code === 'TDS_EXCEEDS_INCOME' ? 'TDS deducted cannot exceed gross income in this demo.' : err.code === 'DEDUCTION_LIMIT_EXCEEDED' ? 'Exceeds the prototype synthetic threshold of ₹1,50,000.' : 'Amounts must be valid positive numbers.'}
            </p>
            <p className="error-suggestion">
              <strong>3. What you should change:</strong> {err.suggestion}
            </p>
          </div>
        ))}
      </div>

      <div className="actions-row" style={{ marginTop: '16px' }}>
        <button type="button" className="btn btn-secondary" onClick={handleExplainError} disabled={loadingAi}>
          {loadingAi ? 'Asking AI Assistant…' : '✨ What does this error mean?'}
        </button>
        <button type="button" className="btn btn-primary" onClick={onFix}>
          Fix this now →
        </button>
      </div>

      {aiExplanation && (
        <div className="ai-assistant-card" aria-live="polite">
          <div className="ai-assistant-header">
            <span className="ai-sparkle">✦</span>
            <span>TaxFlow Assistant Explanation</span>
            <span className="ai-tag">AI Assistant</span>
          </div>
          <p>{aiExplanation}</p>
        </div>
      )}
    </div>
  );
}

// Status & Synthetic Acknowledgement Page
function StatusView({ referenceId }: { referenceId: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Poll status every 1200ms
  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const res = await api(`/api/returns/${referenceId}`);
        if (active) {
          setData(res);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1200);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [referenceId]);

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExplainStatus = async () => {
    if (!data) return;
    setLoadingAi(true);
    try {
      const res = await api('/api/ai/explain-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: data.return.processingStatus,
          queuePosition: data.queuePosition,
          estimatedSeconds: data.estimatedSeconds
        })
      });
      setAiExplanation(res.explanation);
    } catch {
      setAiExplanation("Your return has already been safely received. It is currently in TaxFlow's queue. You do not need to submit it again.");
    }
    setLoadingAi(false);
  };

  if (error) {
    return (
      <main className="card" role="main">
        <h2 className="card-title">Reference Not Found</h2>
        <p className="card-subtitle">
          We could not find any saved return matching <code>{referenceId}</code> in this prototype session.
        </p>
        <div className="actions-row">
          <a href="#/track" className="btn btn-primary">
            Search Another Reference
          </a>
          <a href="#/file" className="btn btn-secondary">
            File a New Return
          </a>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="card" role="main">
        <h2 className="card-title">Loading your saved return…</h2>
        <p className="card-subtitle">Retrieving submission record from TaxFlow's persistent queue.</p>
      </main>
    );
  }

  const ret = data.return;
  const status = ret.processingStatus; // 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'
  const isCompleted = status === 'COMPLETED';
  const isProcessing = status === 'PROCESSING';

  return (
    <main role="main">
      {/* Hero Submission Confirmation Banner (Feature 5) */}
      <div className="receipt-header-banner">
        <h2>{isCompleted ? '✓ Processing Completed' : '✓ Submission safely received'}</h2>
        <p>
          {isCompleted
            ? 'Your synthetic return has been processed in this prototype. Your acknowledgement is ready.'
            : 'Your return has been recorded and placed into the processing workflow.'}
        </p>
        <div className="dont-retry-badge">
          <span>🔒</span> You don't need to submit again.
        </div>
      </div>

      {/* Feature 7: Downstream Graceful Failure Notice */}
      {data.dependencyNotice && (
        <div className="warning-banner" style={{ margin: '16px 0', borderLeft: '4px solid #d97706' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#92400e', marginBottom: '4px' }}>
            🛡️ Downstream Dependency Notice (Graceful Failure Demo)
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: '#78350f' }}>
            {data.dependencyNotice}
          </p>
        </div>
      )}

      <div className="card">
        {/* Reference Number Card */}
        <div className="reference-card">
          <div className="ref-details">
            <span>Durable TaxFlow Reference ID</span>
            <strong>{referenceId}</strong>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopyRef}>
            {copied ? '✓ Copied!' : '📋 Copy Reference'}
          </button>
        </div>

        {/* Live Timeline Stepper */}
        <ol className="timeline-stepper" aria-label="Processing timeline">
          <li className="timeline-item done">
            <div className="timeline-badge">✓</div>
            <div className="timeline-content">
              <div className="timeline-title">Submission received</div>
              <div className="timeline-desc">Safely saved into SQLite database ({new Date(ret.createdAt).toLocaleTimeString('en-IN')})</div>
            </div>
          </li>

          <li className="timeline-item done">
            <div className="timeline-badge">✓</div>
            <div className="timeline-content">
              <div className="timeline-title">Added to processing queue</div>
              <div className="timeline-desc">Assigned background job #{data.job?.id || 1}</div>
            </div>
          </li>

          <li className={`timeline-item ${isCompleted ? 'done' : isProcessing ? 'processing' : ''}`}>
            <div className="timeline-badge">{isCompleted ? '✓' : isProcessing ? '●' : '○'}</div>
            <div className="timeline-content">
              <div className="timeline-title">{isCompleted ? 'Background processing completed' : isProcessing ? 'Processing by background worker…' : 'Waiting for worker pickup'}</div>
              <div className="timeline-desc">Simulated mock government backend processing</div>
            </div>
          </li>

          <li className={`timeline-item ${isCompleted ? 'done' : ''}`}>
            <div className="timeline-badge">{isCompleted ? '✓' : '○'}</div>
            <div className="timeline-content">
              <div className="timeline-title">Synthetic Acknowledgement</div>
              <div className="timeline-desc">{isCompleted ? 'Official demonstration receipt generated' : 'Pending completion'}</div>
            </div>
          </li>
        </ol>

        {/* Live Queue Position Indicator (Feature 10) */}
        {!isCompleted && (
          <div className="card" style={{ background: '#f8faf8', border: '1px solid #e2e8f0', margin: '20px 0', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ color: '#0f172a', fontSize: '14px' }}>
                  {isProcessing ? '⚡ Status: Currently Processing' : `📊 Queue Position: ${data.queuePosition}`}
                </strong>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Estimated processing time: ~{data.estimatedSeconds}s (prototype estimate)
                </p>
              </div>
              <span className="prototype-tag">Live Polling (1.2s)</span>
            </div>
          </div>
        )}

        {/* AI Explanation Action */}
        <div className="actions-row">
          <button type="button" className="btn btn-secondary" onClick={handleExplainStatus} disabled={loadingAi}>
            {loadingAi ? 'Asking AI Assistant…' : '✨ Explain my status'}
          </button>
          <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
            You can safely close this browser window anytime.
          </div>
        </div>

        {aiExplanation && (
          <div className="ai-assistant-card" aria-live="polite">
            <div className="ai-assistant-header">
              <span className="ai-sparkle">✦</span>
              <span>AI Status Explanation</span>
              <span className="ai-tag">AI Assistant</span>
            </div>
            <p>{aiExplanation}</p>
          </div>
        )}
      </div>

      {/* Synthetic Acknowledgement Card */}
      {data.acknowledgement && (
        <div className="acknowledgement-doc" id="acknowledgement-print">
          <div className="watermark-badge">✓ Verified Prototype Receipt</div>
          <h3 className="ack-title">TaxFlow Demonstration Acknowledgement</h3>

          <div className="ack-grid">
            <div className="ack-field">
              <span>TaxFlow Reference</span>
              <strong>{referenceId}</strong>
            </div>
            <div className="ack-field">
              <span>Synthetic Ack No</span>
              <strong>{data.acknowledgement.ackNumber}</strong>
            </div>
            <div className="ack-field">
              <span>Taxpayer Name</span>
              <strong>{ret.taxpayerName || 'Rahul Sharma'}</strong>
            </div>
            <div className="ack-field">
              <span>Status</span>
              <strong style={{ color: '#059669' }}>Processed (Mock Backend)</strong>
            </div>
            <div className="ack-field">
              <span>Gross Income</span>
              <strong>{formatINR(Number(ret.salary) + Number(ret.interest) + Number(ret.otherIncome))}</strong>
            </div>
            <div className="ack-field">
              <span>Processed At</span>
              <strong>{new Date(data.acknowledgement.createdAt || ret.completedAt).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="ack-notice-box">
            <strong>NOTICE:</strong> This acknowledgement is synthetic and has no legal or government validity. Government processing is simulated in this prototype.
          </div>

          <div className="actions-row" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => window.print()}
            >
              🖨️ Print / Save Receipt
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a href="#/track" className="btn btn-secondary btn-sm">
                Track Another Return
              </a>
              <a href="#/file" className="btn btn-primary btn-sm">
                File Another Return →
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Track Return Page Component
function TrackView() {
  const [searchRef, setSearchRef] = useState('');
  const [recentReturns, setRecentReturns] = useState<any[]>([]);

  useEffect(() => {
    api('/api/returns/recent/list')
      .then(setRecentReturns)
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRef.trim()) return;
    location.hash = `#/status/${searchRef.trim().toUpperCase()}`;
  };

  return (
    <main className="card" role="main">
      <h2 className="card-title">Track a Return</h2>
      <p className="card-subtitle">
        Enter your TaxFlow reference ID to track live queue status or view your synthetic acknowledgement.
      </p>

      <form onSubmit={handleSearch} style={{ marginBottom: '32px' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="refInput">
            TaxFlow Reference Number
          </label>
          <input
            id="refInput"
            className="form-input"
            style={{ paddingLeft: '14px', fontFamily: 'var(--font-mono)' }}
            placeholder="e.g. TX-DEMO-850124"
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value.toUpperCase())}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Track Return →
        </button>
      </form>

      {recentReturns.length > 0 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
            Recent Returns in this Prototype
          </h3>
          <div className="recent-table-wrapper">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Taxpayer</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentReturns.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.referenceId}</td>
                    <td>{r.taxpayerName || 'Synthetic Taxpayer'}</td>
                    <td>{formatINR(r.salary)}</td>
                    <td>
                      <span className={`status-pill ${r.processingStatus}`}>{r.processingStatus}</span>
                    </td>
                    <td>
                      <a href={`#/status/${r.referenceId}`} className="btn btn-secondary btn-sm">
                        View Status →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}

// How It Works Architectural Explanation Page (Feature 13)
function HowItWorks() {
  const [aiDeadlineExp, setAiDeadlineExp] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const handleAskAI = async () => {
    setLoadingAi(true);
    try {
      const res = await api('/api/ai/explain-deadline', { method: 'POST' });
      setAiDeadlineExp(res.explanation);
    } catch {
      setAiDeadlineExp(
        'During filing deadlines, millions of citizens connect at the same minute. TaxFlow solves this by instantly accepting and securing your return into a durable queue in milliseconds, freeing you immediately while workers process returns smoothly in the background.'
      );
    }
    setLoadingAi(false);
  };

  return (
    <main role="main">
      <section className="hero" style={{ marginTop: '20px', marginBottom: '32px' }}>
        <div className="hero-badge">ARCHITECTURAL DESIGN</div>
        <h1 className="hero-title" style={{ fontSize: '42px' }}>
          The deadline shouldn't be a race against a loading spinner.
        </h1>
        <p className="hero-subtitle">
          TaxFlow separates the citizen's filing interaction from slower downstream processing to guarantee zero lost work and complete deadline resilience.
        </p>
      </section>

      {/* Side-by-Side Comparison */}
      <div className="arch-compare-grid">
        {/* Traditional Synchronous */}
        <div className="arch-card bad">
          <span className="arch-badge">Traditional Synchronous Pipeline</span>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', color: '#991b1b' }}>
            Fragile under deadline spikes
          </h3>
          <div className="flow-step">1. Citizen clicks Submit</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-step">2. Web server opens long HTTP connection</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-step">3. Synchronous downstream DB & Auth verification</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-step error">
            💥 <strong>Timeout / Congestion:</strong> Citizen faces loading spinner, request drops, citizen repeatedly retries.
          </div>
        </div>

        {/* TaxFlow Decoupled */}
        <div className="arch-card good">
          <span className="arch-badge">TaxFlow Decoupled Queue</span>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', color: '#065f46' }}>
            Instant durable receipt in &lt;50ms
          </h3>
          <div className="flow-step">1. Citizen clicks Submit</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-step success">
            2. <strong>Instant Acceptance:</strong> Saved to persistent queue, reference ID issued in 20ms. Citizen is free!
          </div>
          <div className="flow-arrow">↓</div>
          <div className="flow-step">3. Background Worker Pool processes queue at a controlled rate</div>
          <div className="flow-arrow">↓</div>
          <div className="flow-step success">4. <strong>Acknowledgement Generated:</strong> Citizen checks status anytime</div>
        </div>
      </div>

      {/* Feature Deep-dive */}
      <div className="card">
        <h2 className="card-title">TaxFlow Resilience Principles</h2>
        <ul className="resilience-list">
          <li><strong>Autosave & Resume:</strong> Progress is persisted to database before moving on. Refreshing or leaving never erases input.</li>
          <li><strong>Idempotency:</strong> Duplicate submission requests return the same reference ID without creating duplicate returns.</li>
          <li><strong>Graceful Degradation:</strong> If downstream dependencies slow down or pause, submissions remain safe in queue.</li>
          <li><strong>Asynchronous Decoupling:</strong> Processing continues independently even after the citizen closes the page.</li>
        </ul>

        <div className="actions-row" style={{ marginTop: '24px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleAskAI} disabled={loadingAi}>
            {loadingAi ? 'Asking AI Assistant…' : '✨ Ask AI: Why does queue architecture prevent deadline crashes?'}
          </button>
          <a href="#/demo" className="btn btn-primary">
            Try Rush Simulation →
          </a>
        </div>

        {aiDeadlineExp && (
          <div className="ai-assistant-card" style={{ marginTop: '20px' }}>
            <div className="ai-assistant-header">
              <span className="ai-sparkle">✦</span>
              <span>AI Architecture Breakdown</span>
              <span className="ai-tag">AI Assistant</span>
            </div>
            <p>{aiDeadlineExp}</p>
          </div>
        )}
      </div>
    </main>
  );
}

// Deadline Rush Simulation Dashboard (Demo / Engineering - Feature 12)
function DemoDashboard({
  dependencyState,
  setDependencyState
}: {
  dependencyState: string;
  setDependencyState: (val: string) => void;
}) {
  const [metrics, setMetrics] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [rushMsg, setRushMsg] = useState('');
  const [sampleRef, setSampleRef] = useState('');
  const [customCount, setCustomCount] = useState('5000');

  // Fetch metrics every 800ms
  useEffect(() => {
    const fetchMetrics = () => {
      api('/api/demo/metrics')
        .then(setMetrics)
        .catch(() => {});
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 800);
    return () => clearInterval(interval);
  }, []);

  const triggerRush = async (count: number) => {
    if (!count || count <= 0) return;
    setBusy(true);
    setRushMsg('');
    try {
      const res = await api('/api/demo/deadline-rush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      });
      setRushMsg(`Successfully injected ${count.toLocaleString()} synthetic returns into the persistent queue!`);
      if (res.sampleReferenceId) setSampleRef(res.sampleReferenceId);
      api('/api/demo/metrics').then(setMetrics).catch(() => {});
    } catch (err: any) {
      setRushMsg(err.message || 'Rush simulation failed.');
    }
    setBusy(false);
  };

  const handleReset = async () => {
    if (!confirm('Reset the prototype database and queue to 0 submissions?')) return;
    setBusy(true);
    try {
      await api('/api/demo/reset', { method: 'POST' });
      setRushMsg('Queue and database successfully reset to 0 submissions.');
      setSampleRef('');
      localStorage.removeItem('taxflow_recent_refs');
      setMetrics((prev: any) => ({
        received: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        activeWorkers: 0,
        activeDrafts: 0,
        workerConfig: prev?.workerConfig || { delayMs: 5500, concurrency: 6, failureRate: 0.02 },
        mockDependencyState: 'AVAILABLE',
        averageQueueSeconds: 0
      }));
    } catch {
      setRushMsg('Reset failed.');
    }
    setBusy(false);
  };

  const handleSeed = async () => {
    setBusy(true);
    try {
      await api('/api/demo/seed', { method: 'POST' });
      setRushMsg('Sample demo data seeded successfully.');
      api('/api/demo/metrics').then(setMetrics).catch(() => {});
    } catch {
      setRushMsg('Seeding failed.');
    }
    setBusy(false);
  };

  const updateWorkerConfig = async (delayMs: number, concurrency: number) => {
    try {
      const res = await api('/api/demo/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delayMs, concurrency })
      });
      if (res?.workerConfig) {
        setMetrics((prev: any) => (prev ? { ...prev, workerConfig: res.workerConfig } : prev));
      }
    } catch {}
  };

  const handleSetDependency = async (st: string) => {
    setDependencyState(st);
    try {
      await api('/api/demo/dependency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: st })
      });
    } catch {}
  };

  const total = metrics?.received || 0;
  const queuedPct = total > 0 ? ((metrics?.queued || 0) / total) * 100 : 0;
  const procPct = total > 0 ? ((metrics?.processing || 0) / total) * 100 : 0;
  const compPct = total > 0 ? ((metrics?.completed || 0) / total) * 100 : 0;

  return (
    <main className="card" role="main">
      <div className="hero-badge" style={{ background: '#fdf2f8', color: '#9d174d' }}>
        ⚙️ ENGINEERING SIMULATION
      </div>
      <h2 className="card-title">Simulate Deadline Rush</h2>
      <p className="card-subtitle">
        Inject synthetic filing load into TaxFlow's real SQLite persistent queue to observe worker throughput under pressure.
      </p>

      {/* Feature 7: Downstream Dependency Control */}
      <div className="card" style={{ background: '#fefce8', borderColor: '#fef08a', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#854d0e', marginBottom: '8px' }}>
          🛡️ Downstream Dependency Simulator (Graceful Failure Demo)
        </h3>
        <p style={{ fontSize: '13px', color: '#a16207', marginBottom: '14px' }}>
          Test how TaxFlow handles downstream service slowdowns or outages without failing citizen submissions.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${dependencyState === 'AVAILABLE' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleSetDependency('AVAILABLE')}
          >
            🟢 AVAILABLE (Normal)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${dependencyState === 'SLOW' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleSetDependency('SLOW')}
          >
            🟡 SLOW (Delayed Workers)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${dependencyState === 'UNAVAILABLE' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleSetDependency('UNAVAILABLE')}
          >
            🔴 UNAVAILABLE (Busy / Paused Workers)
          </button>
        </div>
      </div>

      {/* Rush Injector Buttons & Custom Form */}
      <div className="presets-container" style={{ background: '#fdf2f8', borderColor: '#fbcfe8', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <span className="presets-label" style={{ color: '#9d174d', fontWeight: 700 }}>
            🚀 Synthetic Load Presets:
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ background: 'white', color: '#475569', borderColor: '#cbd5e1' }}
              onClick={handleSeed}
              disabled={busy}
            >
              🌱 Seed Demo Samples
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleReset}
              disabled={busy}
              style={{ fontWeight: 700 }}
            >
              🔄 Reset Queue (0)
            </button>
          </div>
        </div>

        <div className="presets-buttons" style={{ marginBottom: '14px' }}>
          {[100, 500, 1000, 5000, 10000].map((n) => (
            <button
              key={n}
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ background: 'white', color: '#9d174d', borderColor: '#f472b6', fontWeight: 600 }}
              disabled={busy}
              onClick={() => triggerRush(n)}
            >
              {busy ? 'Injecting…' : `+${n.toLocaleString()} Returns`}
            </button>
          ))}
        </div>

        {/* Custom Simulation Volume Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px dashed #fbcfe8' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#9d174d' }}>Custom Volume:</span>
          <input
            type="number"
            min="1"
            max="50000"
            step="100"
            className="form-input"
            style={{ width: '140px', padding: '6px 10px', fontSize: '13px' }}
            value={customCount}
            onChange={(e) => setCustomCount(e.target.value)}
            disabled={busy}
            placeholder="e.g. 5000"
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ background: '#9d174d', borderColor: '#831843' }}
            disabled={busy || !Number(customCount) || Number(customCount) <= 0}
            onClick={() => triggerRush(Number(customCount))}
          >
            {busy ? 'Injecting…' : `Inject ${Number(customCount || 0).toLocaleString()} Submissions`}
          </button>
        </div>
      </div>

      {rushMsg && (
        <div className="success-banner" style={{ margin: '16px 0', padding: '12px 16px' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{rushMsg}</p>
        </div>
      )}

      {sampleRef && (
        <div className="reference-card" style={{ margin: '16px 0' }}>
          <div className="ref-details">
            <span>Inspect a live return from this rush:</span>
            <strong>{sampleRef}</strong>
          </div>
          <a href={`#/status/${sampleRef}`} className="btn btn-primary btn-sm">
            Open Citizen Status Page →
          </a>
        </div>
      )}

      {/* Live Queue Progress Bar */}
      {metrics && (
        <>
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
              <span>Live Queue Breakdown</span>
              <span>Total Received: {metrics.received.toLocaleString()}</span>
            </div>
            <div className="live-progress-bar">
              <div className="progress-segment completed" style={{ width: `${compPct}%` }} title={`Completed: ${metrics.completed}`} />
              <div className="progress-segment processing" style={{ width: `${procPct}%` }} title={`Processing: ${metrics.processing}`} />
              <div className="progress-segment queued" style={{ width: `${queuedPct}%` }} title={`Queued: ${metrics.queued}`} />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-label">Total Submissions</span>
              <div className="metric-value">{metrics.received.toLocaleString()}</div>
            </div>
            <div className="metric-box">
              <span className="metric-label">In Queue</span>
              <div className="metric-value queued">{metrics.queued.toLocaleString()}</div>
            </div>
            <div className="metric-box">
              <span className="metric-label">Processing</span>
              <div className="metric-value processing">{metrics.processing.toLocaleString()}</div>
            </div>
            <div className="metric-box">
              <span className="metric-label">Completed</span>
              <div className="metric-value completed">{metrics.completed.toLocaleString()}</div>
            </div>
            <div className="metric-box">
              <span className="metric-label">Active Drafts</span>
              <div className="metric-value" style={{ color: '#6366f1' }}>{metrics.activeDrafts || 0}</div>
            </div>
            <div className="metric-box">
              <span className="metric-label">Avg Queue Wait</span>
              <div className="metric-value" style={{ color: '#0d4a3e' }}>
                ~{metrics.averageQueueSeconds}s
              </div>
            </div>
          </div>

          {/* Worker Speed & Concurrency Tuning */}
          <div className="card" style={{ background: '#f8faf8', padding: '20px', marginTop: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px' }}>⚙️ Worker Pool Tuning</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Worker Delay:</span>
              <button
                type="button"
                className={`btn btn-sm ${metrics.workerConfig?.delayMs === 500 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateWorkerConfig(500, metrics.workerConfig?.concurrency || 6)}
              >
                Turbo (0.5s)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${metrics.workerConfig?.delayMs === 2000 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateWorkerConfig(2000, metrics.workerConfig?.concurrency || 6)}
              >
                Fast (2s)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${metrics.workerConfig?.delayMs === 5500 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateWorkerConfig(5500, metrics.workerConfig?.concurrency || 6)}
              >
                Standard (5.5s)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${metrics.workerConfig?.delayMs === 9000 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateWorkerConfig(9000, metrics.workerConfig?.concurrency || 6)}
              >
                Slow (9s)
              </button>

              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '12px' }}>Concurrency:</span>
              <button
                type="button"
                className={`btn btn-sm ${metrics.workerConfig?.concurrency === 4 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateWorkerConfig(metrics.workerConfig?.delayMs || 5500, 4)}
              >
                4 Workers
              </button>
              <button
                type="button"
                className={`btn btn-sm ${metrics.workerConfig?.concurrency === 8 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateWorkerConfig(metrics.workerConfig?.delayMs || 5500, 8)}
              >
                8 Workers
              </button>
              <button
                type="button"
                className={`btn btn-sm ${metrics.workerConfig?.concurrency === 16 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateWorkerConfig(metrics.workerConfig?.delayMs || 5500, 16)}
              >
                16 Workers
              </button>
              <button
                type="button"
                className={`btn btn-sm ${metrics.workerConfig?.concurrency === 32 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateWorkerConfig(metrics.workerConfig?.delayMs || 5500, 32)}
              >
                32 Workers
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

// Main App Container
function App() {
  const [route, setRoute] = useState(() => location.hash.slice(1) || '/');
  const [networkInterrupted, setNetworkInterrupted] = useState(false);
  const [ambiguousSubmit, setAmbiguousSubmit] = useState(false);
  const [dependencyState, setDependencyStateLocal] = useState('AVAILABLE');

  // Fetch current backend dependency state on mount
  useEffect(() => {
    api('/api/demo/dependency')
      .then((res) => {
        if (res?.state) setDependencyStateLocal(res.state);
      })
      .catch(() => {});
  }, []);

  // Update dependency state both locally and on backend server
  const setDependencyState = async (newState: string) => {
    setDependencyStateLocal(newState);
    try {
      await api('/api/demo/dependency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState })
      });
    } catch {}
  };

  useEffect(() => {
    const handleHash = () => setRoute(location.hash.slice(1) || '/');
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const renderContent = () => {
    if (route === '/file') {
      return (
        <Filing
          networkInterrupted={networkInterrupted}
          ambiguousSubmit={ambiguousSubmit}
        />
      );
    }
    if (route === '/track') return <TrackView />;
    if (route === '/how') return <HowItWorks />;
    if (route === '/demo') {
      return (
        <DemoDashboard
          dependencyState={dependencyState}
          setDependencyState={setDependencyState}
        />
      );
    }
    if (route.startsWith('/status/')) {
      const ref = route.replace('/status/', '');
      return <StatusView referenceId={ref} />;
    }
    return <Home />;
  };

  return (
    <>
      <Header currentRoute={route} />
      <Notice />
      <DemoControlsBar
        networkInterrupted={networkInterrupted}
        setNetworkInterrupted={setNetworkInterrupted}
        ambiguousSubmit={ambiguousSubmit}
        setAmbiguousSubmit={setAmbiguousSubmit}
        dependencyState={dependencyState}
        setDependencyState={setDependencyState}
      />
      <main className="page-content">{renderContent()}</main>
      <footer className="app-footer">
        <div className="footer-inner">
          <p>
            <strong>TaxFlow Prototype</strong> — Citizens should not lose work because the system is slow.
          </p>
          <p>
            Demonstration prototype for high-volume decoupled tax filing. Uses synthetic data and simulated downstream processing. Not an official Government of India service.
          </p>
        </div>
      </footer>
    </>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
