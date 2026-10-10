import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import Question from '@/models/Question';
import { QuestionManageSchema } from '@/lib/validation';

export async function GET() {
  try {
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    await connectToDatabase();
    const event = await Event.findOne({ slug: 'operation-zero-day' });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const questions = await Question.find({ eventId: event._id })
      .sort({ questionNumber: 1 })
      .select('+correctAnswer');

    return NextResponse.json({ success: true, questions });
  } catch (error: any) {
    console.error('[API GET /api/admin/questions] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve questions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    await connectToDatabase();
    const event = await Event.findOne({ slug: 'operation-zero-day' });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status === 'live') {
      return NextResponse.json(
        { error: 'OPERATION IS LIVE: Questions cannot be added while the event is in live state.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = QuestionManageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid question parameters' },
        { status: 400 }
      );
    }

    // Auto-calculate question number if not specified or check conflict
    let qNum = parsed.data.questionNumber;
    if (!qNum) {
      const highest = await Question.findOne({ eventId: event._id })
        .sort({ questionNumber: -1 })
        .select('questionNumber');
      qNum = (highest?.questionNumber || 0) + 1;
    }

    const question = await Question.create({
      ...parsed.data,
      eventId: event._id,
      questionNumber: qNum,
    });

    const { invalidateCachedQuestions } = await import('@/lib/questionCache');
    invalidateCachedQuestions();

    return NextResponse.json(
      {
        success: true,
        message: 'Question fragment registered successfully.',
        question,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API POST /api/admin/questions] Error:', error);
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
