import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
import EventSession from '@/models/EventSession';
import ParticipantProgress from '@/models/ParticipantProgress';
import Submission from '@/models/Submission';

export async function GET(req: NextRequest) {
  try {
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const statusFilter = searchParams.get('status')?.trim() || '';

    await connectToDatabase();
    const event = await Event.findOne({ slug: 'operation-zero-day' });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Search query on participant
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } },
        { participantCode: { $regex: search, $options: 'i' } },
      ];
    }

    const participants = await Participant.find(query)
      .sort({ createdAt: -1 })
      .select('name email college participantCode preferredLanguage createdAt');

    const participantIds = participants.map((p) => p._id);

    // Fetch sessions
    const sessions = await EventSession.find({
      eventId: event._id,
      participantId: { $in: participantIds },
    });
    const sessionMap = new Map();
    sessions.forEach((s) => sessionMap.set(s.participantId.toString(), s));

    // Aggregate progress
    const progressAgg = await ParticipantProgress.aggregate([
      { $match: { eventId: event._id, participantId: { $in: participantIds } } },
      {
        $group: {
          _id: '$participantId',
          totalScore: { $sum: '$pointsEarned' },
          solvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] },
          },
        },
      },
    ]);
    const progressMap = new Map();
    progressAgg.forEach((p) => progressMap.set(p._id.toString(), p));

    // Combine data
    let list = participants.map((p) => {
      const pid = p._id.toString();
      const s = sessionMap.get(pid);
      const pr = progressMap.get(pid);

      return {
        id: pid,
        name: p.name,
        email: p.email,
        college: p.college,
        participantCode: p.participantCode,
        preferredLanguage: p.preferredLanguage || 'python',
        registeredAt: p.createdAt,
        missionStartedAt: s?.startedAt || null,
        sessionStatus: s?.status || 'not_attended',
        tabSwitchCount: s?.tabSwitchCount || 0,
        endReason: s?.endReason || null,
        score: pr?.totalScore || 0,
        questionsSolved: pr?.solvedCount || 0,
      };
    });

    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((p) =>
        statusFilter === 'not_attended'
          ? p.sessionStatus === 'not_attended' || p.sessionStatus === 'not_started'
          : p.sessionStatus === statusFilter
      );
    }

    return NextResponse.json({
      success: true,
      participants: list,
      totalCount: list.length,
    });
  } catch (error: any) {
    console.error('[API GET /api/admin/participants] Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve participants' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, ids } = body;

    await connectToDatabase();

    if (action === 'delete_all') {
      const deleteCount = await Participant.countDocuments({});
      await Promise.all([
        Participant.deleteMany({}),
        EventSession.deleteMany({}),
        ParticipantProgress.deleteMany({}),
        Submission.deleteMany({}),
      ]);

      return NextResponse.json({
        success: true,
        message: `Successfully purged all ${deleteCount} operative(s) and their associated records.`,
      });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const validObjectIds = ids.filter((id: string) => mongoose.Types.ObjectId.isValid(id));
      await Promise.all([
        Participant.deleteMany({ _id: { $in: validObjectIds } }),
        EventSession.deleteMany({ participantId: { $in: validObjectIds } }),
        ParticipantProgress.deleteMany({ participantId: { $in: validObjectIds } }),
        Submission.deleteMany({ participantId: { $in: validObjectIds } }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${validObjectIds.length} operative(s).`,
      });
    }

    return NextResponse.json({ error: 'Invalid delete request payload' }, { status: 400 });
  } catch (error: any) {
    console.error('[API DELETE /api/admin/participants] Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete participants' }, { status: 500 });
  }
}
