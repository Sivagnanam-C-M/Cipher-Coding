import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Question from '@/models/Question';
import Event from '@/models/Event';
import { QuestionManageSchema } from '@/lib/validation';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    await connectToDatabase();
    const question = await Question.findById(id).select('+correctAnswer');

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, question });
  } catch (error: any) {
    console.error('[API GET /api/admin/questions/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve question' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    await connectToDatabase();
    const event = await Event.findOne({ slug: 'operation-zero-day' }).lean();
    if (event && event.status === 'live') {
      return NextResponse.json(
        { error: 'OPERATION IS LIVE: Questions cannot be updated while the event is in live state.' },
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

    const updated = await Question.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    ).select('+correctAnswer');

    if (!updated) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const { invalidateCachedQuestions } = await import('@/lib/questionCache');
    invalidateCachedQuestions();

    return NextResponse.json({
      success: true,
      message: 'Question updated successfully.',
      question: updated,
    });
  } catch (error: any) {
    console.error('[API PUT /api/admin/questions/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    await connectToDatabase();
    const event = await Event.findOne({ slug: 'operation-zero-day' }).lean();
    if (event && event.status === 'live') {
      return NextResponse.json(
        { error: 'OPERATION IS LIVE: Questions cannot be deleted while the event is in live state.' },
        { status: 403 }
      );
    }

    const deleted = await Question.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const { invalidateCachedQuestions } = await import('@/lib/questionCache');
    invalidateCachedQuestions();

    return NextResponse.json({
      success: true,
      message: 'Question fragment removed permanently.',
    });
  } catch (error: any) {
    console.error('[API DELETE /api/admin/questions/[id]] Error:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
