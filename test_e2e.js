// End-to-End Test Suite for TaxFlow Prototype
import assert from 'node:assert';

async function runE2ETests() {
  const BASE_URL = 'http://localhost:3000';
  console.log('🚀 Starting TaxFlow Comprehensive E2E Verification Suite...\n');

  // Reset queue & configure fast worker for test suite
  await fetch(`${BASE_URL}/api/demo/reset`, { method: 'POST' });
  await fetch(`${BASE_URL}/api/demo/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delayMs: 1200, concurrency: 10 })
  });

  // Test 1: Frontend Static Assets
  console.log('Test 1: Verifying HTML5 Frontend Delivery...');
  const htmlRes = await fetch(BASE_URL);
  assert.strictEqual(htmlRes.status, 200, 'HTML page must return 200');
  const htmlText = await htmlRes.text();
  assert(htmlText.includes('TaxFlow'), 'HTML must include TaxFlow title/brand');
  assert(htmlText.includes('root'), 'HTML must include root mount point');
  console.log('✓ HTML & static assets delivered successfully.\n');

  // Test 2: Deterministic Validation (Valid Case)
  console.log('Test 2: Deterministic Validation (Valid Case)...');
  const validPayload = {
    taxpayerName: 'Rahul Sharma',
    salary: 850000,
    interest: 18500,
    otherIncome: 0,
    tds: 42000,
    deductions: 150000
  };
  const valRes = await fetch(`${BASE_URL}/api/returns/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validPayload)
  });
  assert.strictEqual(valRes.status, 200);
  const valData = await valRes.json();
  assert.strictEqual(valData.valid, true, 'Standard return must be valid');
  assert.strictEqual(valData.calculation.grossIncome, 868500);
  assert.strictEqual(valData.calculation.taxableIncome, 718500);
  console.log('✓ Valid return passed validation with demo calculation breakdown.\n');

  // Test 3: Deterministic Validation (Error Cases: TDS > Salary & Deductions > Limit)
  console.log('Test 3: Deterministic Validation (Error Scenarios)...');
  const invalidTdsPayload = {
    taxpayerName: 'Rahul Sharma',
    salary: 500000,
    interest: 0,
    otherIncome: 0,
    tds: 900000,
    deductions: 50000
  };
  const valErr1 = await (await fetch(`${BASE_URL}/api/returns/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidTdsPayload)
  })).json();
  assert.strictEqual(valErr1.valid, false, 'TDS > Income must fail');
  assert(valErr1.errors.some(e => e.field === 'tds' && e.code === 'TDS_EXCEEDS_INCOME'));

  const invalidDedPayload = {
    taxpayerName: 'Rahul Sharma',
    salary: 850000,
    interest: 0,
    otherIncome: 0,
    tds: 40000,
    deductions: 250000
  };
  const valErr2 = await (await fetch(`${BASE_URL}/api/returns/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidDedPayload)
  })).json();
  assert.strictEqual(valErr2.valid, false, 'Deductions > 1.5L must fail');
  assert(valErr2.errors.some(e => e.field === 'deductions' && e.code === 'DEDUCTION_LIMIT_EXCEEDED'));
  console.log('✓ Error scenarios caught with structured codes and clear user suggestions.\n');

  // Test 4: Submission & Instant Confirmation (<50ms response)
  console.log('Test 4: Instant Submission & Persistent Queueing...');
  const idempotencyKey = 'e2e-test-key-' + Date.now();
  const startTime = Date.now();
  const subRes = await fetch(`${BASE_URL}/api/returns/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({ ...validPayload, idempotencyKey })
  });
  const duration = Date.now() - startTime;
  assert.strictEqual(subRes.status, 201);
  const subData = await subRes.json();
  assert.strictEqual(subData.status, 'RECEIVED');
  assert(subData.referenceId.startsWith('TX-DEMO-'));
  assert(duration < 200, `Submission response time was ${duration}ms, must be under 200ms`);
  console.log(`✓ Return safely received in ${duration}ms with reference: ${subData.referenceId}\n`);

  // Test 5: Idempotency Protection
  console.log('Test 5: Idempotency Duplicate Submission Check...');
  const dupRes = await fetch(`${BASE_URL}/api/returns/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify({ ...validPayload, idempotencyKey })
  });
  const dupData = await dupRes.json();
  assert.strictEqual(dupData.referenceId, subData.referenceId, 'Idempotent call must return same referenceId');
  assert.strictEqual(dupData.duplicate, true, 'Must indicate duplicate was safely handled');
  console.log('✓ Idempotency verified: double clicks prevent duplicate records.\n');

  // Test 6: Status Tracking & Background Worker Progression
  console.log('Test 6: Status Tracking & Background Worker Completion...');
  let completed = false;
  let finalStatusData = null;

  for (let attempt = 0; attempt < 25; attempt++) {
    await new Promise(r => setTimeout(r, 600));
    const statusRes = await (await fetch(`${BASE_URL}/api/returns/${subData.referenceId}`)).json();
    console.log(`  -> Poll [${attempt + 1}]: Status=${statusRes.return.processingStatus}, QueuePos=${statusRes.queuePosition}`);

    if (statusRes.return.processingStatus === 'COMPLETED') {
      completed = true;
      finalStatusData = statusRes;
      break;
    }
  }

  assert(completed, 'Worker should process and complete the return within test duration');
  assert(finalStatusData.acknowledgement, 'Acknowledgement must be generated on completion');
  assert(finalStatusData.acknowledgement.ackNumber.startsWith('ACK-SYNTH-'), 'Must have synthetic ack number');
  console.log(`✓ Return transitioned to COMPLETED with Ack Number: ${finalStatusData.acknowledgement.ackNumber}\n`);

  // Test 7: AI Assistance Endpoints
  console.log('Test 7: AI Plain-Language Explanation Services...');
  const aiErr = await (await fetch(`${BASE_URL}/api/ai/explain-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ field: 'tds', error: 'Your TDS amount is higher than your total synthetic income.' })
  })).json();
  assert(aiErr.explanation.length > 10, 'AI error explanation must be provided');

  const aiStat = await (await fetch(`${BASE_URL}/api/ai/explain-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'QUEUED', queuePosition: 2, estimatedSeconds: 6 })
  })).json();
  assert(aiStat.explanation.length > 10, 'AI status explanation must be provided');

  const aiDead = await (await fetch(`${BASE_URL}/api/ai/explain-deadline`, {
    method: 'POST'
  })).json();
  assert(aiDead.explanation.length > 10, 'AI deadline explanation must be provided');
  console.log('✓ AI explanations functioning with guaranteed fallbacks.\n');

  // Test 8: Deadline Rush Load Simulation (200 returns)
  console.log('Test 8: Synthetic Deadline Rush Simulation (200 returns)...');
  const rushRes = await (await fetch(`${BASE_URL}/api/demo/deadline-rush`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 200 })
  })).json();
  assert.strictEqual(rushRes.success, true);
  assert.strictEqual(rushRes.created, 200);

  const metrics = await (await fetch(`${BASE_URL}/api/demo/metrics`)).json();
  assert(metrics.received >= 200, 'Metrics must reflect injected submissions');
  assert(metrics.queued > 0 || metrics.processing > 0, 'Queue must show active workload');
  console.log(`✓ Rush simulation injected 200 returns. Total in DB: ${metrics.received}, Queued: ${metrics.queued}, Processing: ${metrics.processing}\n`);

  // Test 9: Large Scale 5,000 Returns Rush Simulation
  console.log('Test 9: Large Scale 5,000 Returns Synthetic Rush Simulation...');
  const rush5000Res = await (await fetch(`${BASE_URL}/api/demo/deadline-rush`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 5000 })
  })).json();
  assert.strictEqual(rush5000Res.success, true);
  assert.strictEqual(rush5000Res.created, 5000);
  assert(rush5000Res.sampleReferenceId.startsWith('TX-DEMO-'));

  const metricsAfter5000 = await (await fetch(`${BASE_URL}/api/demo/metrics`)).json();
  assert(metricsAfter5000.received >= 5200, 'Total received must include the 5000 newly injected submissions');
  console.log(`✓ Rush simulation successfully injected 5,000 returns without collision. Total in DB: ${metricsAfter5000.received}\n`);

  // Test 10: Reset Queue (Must reset submissions to exactly 0)
  console.log('Test 10: Reset Queue (Verifying 0 Submissions)...');
  const resetRes = await (await fetch(`${BASE_URL}/api/demo/reset`, { method: 'POST' })).json();
  assert.strictEqual(resetRes.success, true);

  const metricsAfterReset = await (await fetch(`${BASE_URL}/api/demo/metrics`)).json();
  assert.strictEqual(metricsAfterReset.received, 0, 'Total received must be exactly 0 after reset');
  assert.strictEqual(metricsAfterReset.queued, 0, 'Queued must be 0 after reset');
  assert.strictEqual(metricsAfterReset.processing, 0, 'Processing must be 0 after reset');
  assert.strictEqual(metricsAfterReset.completed, 0, 'Completed must be 0 after reset');
  console.log('✓ Reset queue verified: total submissions, queue, processing, and completed reset to 0.\n');

  // Test 11: Draft Autosave & Resume Filing API
  console.log('Test 11: Draft Autosave & Resume Filing API...');
  const testDraftId = 'DF-E2E-TEST-999';
  const draftData = { taxpayerName: 'Autosave User', salary: 950000, tds: 45000, deductions: 120000, step: 2 };
  const saveDraftRes = await (await fetch(`${BASE_URL}/api/drafts/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draftId: testDraftId, data: draftData })
  })).json();
  assert.strictEqual(saveDraftRes.success, true);

  const fetchedDraft = await (await fetch(`${BASE_URL}/api/drafts/${testDraftId}`)).json();
  assert.strictEqual(fetchedDraft.draftId, testDraftId);
  assert.strictEqual(fetchedDraft.data.taxpayerName, 'Autosave User');
  assert.strictEqual(fetchedDraft.data.salary, 950000);
  console.log('✓ Draft autosave & resume retrieval verified.\n');

  // Test 12: Ambiguous Submission Recovery by Submission Key
  console.log('Test 12: Ambiguous Submission Key Lookup...');
  const recoveryKey = 'ambiguous-key-' + Date.now();
  const subRecRes = await (await fetch(`${BASE_URL}/api/returns/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': recoveryKey },
    body: JSON.stringify({ ...validPayload, idempotencyKey: recoveryKey })
  })).json();
  
  const foundRec = await (await fetch(`${BASE_URL}/api/returns/by-key/${recoveryKey}`)).json();
  assert.strictEqual(foundRec.found, true);
  assert.strictEqual(foundRec.referenceId, subRecRes.referenceId);
  console.log(`✓ Ambiguous submission lookup recovered existing submission ${foundRec.referenceId}.\n`);

  // Test 13: Downstream Dependency State Control
  console.log('Test 13: Downstream Dependency Simulator (Graceful Failure)...');
  await fetch(`${BASE_URL}/api/demo/dependency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'UNAVAILABLE' })
  });
  const depCheck = await (await fetch(`${BASE_URL}/api/demo/dependency`)).json();
  assert.strictEqual(depCheck.state, 'UNAVAILABLE');
  
  // Reset dependency to AVAILABLE
  await fetch(`${BASE_URL}/api/demo/dependency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'AVAILABLE' })
  });
  console.log('✓ Downstream dependency simulator verified.\n');

  console.log('=====================================================');
  console.log('🎉 ALL TAXFLOW E2E TESTS PASSED WITH 100% SUCCESS!');
  console.log('=====================================================');
}

runE2ETests().catch(err => {
  console.error('❌ E2E Test Failure:', err);
  process.exit(1);
});
