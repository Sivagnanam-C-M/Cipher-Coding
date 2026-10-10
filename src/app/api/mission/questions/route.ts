import { NextResponse } from 'next/server';
import { getParticipantSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import { getCachedEvent } from '@/lib/eventCache';
import { getCachedQuestionsBundle } from '@/lib/questionCache';
import ParticipantProgress from '@/models/ParticipantProgress';

export async function GET() {
  try {
    const authSession = await getParticipantSession();
    if (!authSession || authSession.role !== 'participant') {
      return NextResponse.json({ error: 'Unauthorized participant' }, { status: 401 });
    }

    const event = await getCachedEvent();
    if (!event) {
      return NextResponse.json({ error: 'Investigation event not found' }, { status: 404 });
    }

    // High-speed cached question bundle lookup (0ms DB latency for questions list)
    const bundle = await getCachedQuestionsBundle(event._id);
    const questions = bundle.questions;

    await connectToDatabase();

    // Query only participant-specific progress records
    const progressRecords = await ParticipantProgress.find({
      participantId: authSession.userId,
      eventId: event._id,
    })
      .select('questionId status attempts')
      .lean();

    const progressMap = new Map<string, any>();
    progressRecords.forEach((p) => {
      progressMap.set(p.questionId.toString(), p);
    });

    // Check progression mode lock logic
    const isSequential = event.progressionMode === 'sequential';
    let previousSolved = true;

    const formattedQuestions = questions.map((q) => {
      const qIdStr = q._id.toString();
      const p = progressMap.get(qIdStr);
      const isSolved = p?.status === 'solved';

      let isLocked = false;
      if (isSequential) {
        if (!previousSolved) {
          isLocked = true;
        }
        if (!isSolved) {
          previousSolved = false;
        }
      }

      return {
        id: qIdStr,
        questionNumber: q.questionNumber,
        title: q.title,
        section: q.section,
        points: q.points,
        difficulty: q.difficulty,
        isFinal: q.isFinal,
        isSolved,
        isLocked,
        attempts: p?.attempts || 0,
        status: isSolved ? 'solved' : isLocked ? 'locked' : (p?.status || 'available'),
      };
    });

    return NextResponse.json({
      success: true,
      questions: formattedQuestions,
      totalCount: questions.length,
      progressionMode: event.progressionMode,
    });
  } catch (error: any) {
    console.error('[API /api/mission/questions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve investigation evidence list.' },
      { status: 500 }
    );
  }
}
