import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { validateAnswer } from '../lib/scoring';
import { evaluateSessionTimer } from '../lib/timer';
import { createAuthToken, verifyAuthToken } from '../lib/auth/token';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cipher_coding';

async function runVerification() {
  console.log('====================================================');
  console.log('CIPHER CODING — OPERATION ZERO DAY: PLATFORM VERIFICATION');
  console.log('====================================================\n');

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      testsFailed++;
    }
  }

  // TEST 1: Password hashing and verification
  console.log('--- Test Suite 1: Authentication & Hashing ---');
  const rawPassword = 'SecureOperativePass2026!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(rawPassword, salt);
  assert(await bcrypt.compare(rawPassword, hash), 'Bcrypt correctly hashes and verifies passwords');
  assert(!(await bcrypt.compare('WrongPassword', hash)), 'Bcrypt rejects incorrect passwords');

  // TEST 2: JWT Issuance and verification
  const token = await createAuthToken({
    userId: '65239a0b1234567890abcdef',
    role: 'participant',
    email: 'agent@cyber.edu',
    participantCode: 'CYB-7A42',
  });
  assert(typeof token === 'string' && token.length > 20, 'Generates signed JWT auth token');

  const payload = await verifyAuthToken(token);
  assert(
    payload?.participantCode === 'CYB-7A42' && payload?.role === 'participant',
    'Verifies JWT token and extracts claims successfully'
  );

  // TEST 3: Server-authoritative timer logic
  console.log('\n--- Test Suite 2: Server Timer Validation ---');
  const now = new Date();
  const futureExpiry = new Date(now.getTime() + 40 * 60 * 1000); // +40 mins
  const activeTimer = evaluateSessionTimer({
    status: 'active',
    expiresAt: futureExpiry,
  } as any);

  assert(activeTimer.isActive === true, 'Timer reports active when expiresAt is in future');
  assert(
    activeTimer.remainingSeconds > 2300 && activeTimer.remainingSeconds <= 2400,
    `Remaining seconds correctly calculated (~2400s, got ${activeTimer.remainingSeconds}s)`
  );

  const pastExpiry = new Date(now.getTime() - 10 * 1000); // 10s in past
  const expiredTimer = evaluateSessionTimer({
    status: 'active',
    expiresAt: pastExpiry,
  } as any);

  assert(expiredTimer.isExpired === true, 'Timer enforces expired status when server timestamp exceeds expiresAt');
  assert(expiredTimer.remainingSeconds === 0, 'Expired timer reports 0 remaining seconds');

  // TEST 4: Scoring Engine & Answer Comparison
  console.log('\n--- Test Suite 3: Scoring & Answer Normalization ---');

  // Number comparison
  const numCheck1 = validateAnswer(' 56 ', '56', 'number');
  assert(numCheck1.isCorrect, 'Numeric answer matches with whitespace padding');
  const numCheck2 = validateAnswer('55', '56', 'number');
  assert(!numCheck2.isCorrect, 'Numeric answer correctly rejects wrong numbers');

  // Exact text comparison
  const exactCheck1 = validateAnswer('CLNELE', 'CLNELE', 'exact_text');
  assert(exactCheck1.isCorrect, 'Exact text matches exact case');
  const exactCheck2 = validateAnswer('clnele', 'CLNELE', 'exact_text');
  assert(!exactCheck2.isCorrect, 'Exact text rejects casing mismatch');

  // Case-insensitive comparison
  const caseCheck1 = validateAnswer('zero-dd-2026', 'ZERO-dd-2026', 'case_insensitive_text');
  assert(caseCheck1.isCorrect, 'Case-insensitive matches mixed case');
  const caseCheck2 = validateAnswer('ZERO-XX-2026', 'ZERO-dd-2026', 'case_insensitive_text');
  assert(!caseCheck2.isCorrect, 'Case-insensitive rejects different strings');

  // TEST 5: Database Connection & Seed Inspection (if Mongo running)
  console.log('\n--- Test Suite 4: Database Models & Security ---');
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('[DB] Connected to MongoDB for model validation');

    const collections = await mongoose.connection.db?.listCollections().toArray();
    assert(Array.isArray(collections), 'MongoDB connection successful and database accessible');
    await mongoose.disconnect();
  } catch (err: any) {
    console.log('[DB Note] External MongoDB not active during standalone script; in-memory fallback handles web app dev server.');
  }

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('====================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
