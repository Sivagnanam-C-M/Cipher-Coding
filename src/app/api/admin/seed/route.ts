import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Admin from '@/models/Admin';
import Event from '@/models/Event';
import Question from '@/models/Question';
import EventSession from '@/models/EventSession';
import { hashPassword } from '@/lib/auth/password';
import { PLACEHOLDER_QUESTIONS } from '@/lib/placeholderQuestions';

export async function POST() {
  try {
    await connectToDatabase();

    // If administrative accounts exist, strictly require admin authorization
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      const authSession = await getAdminSession();
      if (!authSession || authSession.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized: Administrative credentials required.' },
          { status: 403 }
        );
      }
    }

    // 1. Seed Superadmin
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const passwordHash = await hashPassword('Admin@ZeroDay2026');
      await Admin.create({
        username: 'admin',
        email: 'admin@zeroday.mil',
        passwordHash,
        role: 'superadmin',
      });
      console.log('[Seed API] Created superadmin: admin / Admin@ZeroDay2026');
    }

    // 2. Seed Default Event
    let event = await Event.findOne({ slug: 'operation-zero-day' });
    if (!event) {
      event = await Event.create({
        name: 'CIPHER CODING — OPERATION ZERO DAY',
        slug: 'operation-zero-day',
        description: 'GRID INCIDENT BRIEFING // EYES ONLY: A breach has been detected across the Grid. A classified file has been accessed. The intruder has disappeared. His identity remains unknown. Before vanishing, he left behind a trail of fragments hidden inside programs. Orders: TRACE THE INTRUDER. RECOVER THE STOLEN FILE. Every fragment you recover will reveal another piece of the investigation. Protocol: READ → TRACE → DECODE → CONNECT. Choose your language. 40 MINUTES. THE INVESTIGATION BEGINS NOW.',
        durationMinutes: 40,
        status: 'live',
        leaderboardEnabled: true,
        progressionMode: 'free',
        maxAttempts: 0,
      });
      console.log('[Seed API] Created default event: operation-zero-day');
    } else {
      event.description = 'GRID INCIDENT BRIEFING // EYES ONLY: A breach has been detected across the Grid. A classified file has been accessed. The intruder has disappeared. His identity remains unknown. Before vanishing, he left behind a trail of fragments hidden inside programs. Orders: TRACE THE INTRUDER. RECOVER THE STOLEN FILE. Every fragment you recover will reveal another piece of the investigation. Protocol: READ → TRACE → DECODE → CONNECT. Choose your language. 40 MINUTES. THE INVESTIGATION BEGINS NOW.';
      event.status = 'live';
      await event.save();
    }

    // 3. Non-destructive question seeding: upsert each question so data is never wiped
    let seededCount = 0;
    for (const q of PLACEHOLDER_QUESTIONS) {
      await Question.findOneAndUpdate(
        { eventId: event._id, questionNumber: q.questionNumber },
        {
          $set: {
            title: q.title,
            section: q.section,
            storyText: q.storyText,
            codeBlock: q.codeBlock,
            codeBlocks: q.codeBlocks,
            questionText: q.questionText,
            answerType: q.answerType,
            correctAnswer: q.correctAnswer,
            points: q.points,
            difficulty: q.difficulty,
            hint: q.hint,
            explanation: q.explanation,
            isFinal: q.isFinal,
            isPublished: q.isPublished,
          },
        },
        { upsert: true, new: true }
      );
      seededCount++;
    }
    console.log(`[Seed API] Non-destructively synced ${seededCount} questions.`);

    return NextResponse.json({
      success: true,
      message: `Database synchronized safely with ${seededCount} questions. Existing data preserved.`,
      event: { id: event._id, name: event.name, status: event.status },
      questionCount: seededCount,
    });
  } catch (error: any) {
    console.error('[API /api/admin/seed] Error:', error);
    return NextResponse.json({ error: error.message || 'Seeding failed' }, { status: 500 });
  }
}
