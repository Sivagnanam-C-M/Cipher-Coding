import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { connectToDatabase } from '../lib/mongodb';
import { PLACEHOLDER_QUESTIONS } from '../lib/placeholderQuestions';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

async function seed() {
  console.log('[Seed] Connecting to database...');
  await connectToDatabase();

  const Admin = mongoose.models.Admin || mongoose.model('Admin', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin' },
  }, { timestamps: true }));

  const Event = mongoose.models.Event || mongoose.model('Event', new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    durationMinutes: { type: Number, default: 40 },
    status: { type: String, default: 'live' },
    leaderboardEnabled: { type: Boolean, default: true },
    progressionMode: { type: String, default: 'free' },
    maxAttempts: { type: Number, default: 0 },
  }, { timestamps: true }));

  const Question = mongoose.models.Question || mongoose.model('Question', new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    questionNumber: { type: Number, required: true },
    title: { type: String, required: true },
    section: { type: String, default: 'GENERAL INVESTIGATION' },
    storyText: String,
    storyReveal: String,
    codeBlock: String,
    codeBlocks: {
      python: String,
      java: String,
      c: String,
      cpp: String,
    },
    questionText: { type: String, required: true },
    answerType: { type: String, default: 'case_insensitive_text' },
    correctAnswer: { type: String, required: true },
    points: { type: Number, default: 10 },
    difficulty: { type: String, default: 'medium' },
    hint: String,
    explanation: String,
    isFinal: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
  }, { timestamps: true }));

  console.log('[Seed] Purging and seeding operational baseline...');

  // 1. Seed Super Admin
  const adminSalt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@ZeroDay2026', adminSalt);

  await Admin.findOneAndUpdate(
    { username: 'admin' },
    {
      username: 'admin',
      email: 'admin@zeroday.mil',
      passwordHash: adminHash,
      role: 'superadmin',
    },
    { upsert: true, new: true }
  );
  console.log('[Seed] Superadmin configured: admin / Admin@ZeroDay2026');

  // 2. Seed Default Event
  const event = await Event.findOneAndUpdate(
    { slug: 'operation-zero-day' },
    {
      name: 'CIPHER CODING — OPERATION ZERO DAY',
      slug: 'operation-zero-day',
      description: 'GRID INCIDENT BRIEFING // EYES ONLY: A breach has been detected across the Grid. A classified file has been accessed. The intruder has disappeared. His identity remains unknown. Before vanishing, he left behind a trail of fragments hidden inside programs. Orders: TRACE THE INTRUDER. RECOVER THE STOLEN FILE. Every fragment you recover will reveal another piece of the investigation. Protocol: READ → TRACE → DECODE → CONNECT. Choose your language. 40 MINUTES. THE INVESTIGATION BEGINS NOW.',
      durationMinutes: 40,
      status: 'live',
      leaderboardEnabled: true,
      progressionMode: 'free',
      maxAttempts: 0,
    },
    { upsert: true, new: true }
  );
  console.log('[Seed] Default event initialized with ID:', event._id.toString());

  // 3. Non-destructive sync for questions
  let seededCount = 0;
  for (const q of PLACEHOLDER_QUESTIONS) {
    await Question.findOneAndUpdate(
      { eventId: event._id, questionNumber: q.questionNumber },
      { $set: { ...q, eventId: event._id } },
      { upsert: true, new: true }
    );
    seededCount++;
  }
  console.log(`[Seed] Safely synced ${seededCount} questions without deleting existing data.`);

  console.log('[Seed] Database initialization complete.');
}

seed().catch((err) => {
  console.error('[Seed] Seeding failed:', err);
  process.exit(1);
});
