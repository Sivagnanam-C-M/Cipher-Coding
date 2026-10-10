import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
import EventSession from '@/models/EventSession';
import ParticipantProgress from '@/models/ParticipantProgress';
import { formatTimeDisplay } from '@/lib/timer';

export async function GET(req: NextRequest) {
  try {
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    await connectToDatabase();
    const event = await Event.findOne({ slug: 'operation-zero-day' });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const participants = await Participant.find({}).select('name email college participantCode');
    const sessions = await EventSession.find({ eventId: event._id });
    const progressAgg = await ParticipantProgress.aggregate([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: '$participantId',
          totalScore: { $sum: '$pointsEarned' },
          solvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] },
          },
          lastSolvedAt: { $max: '$solvedAt' },
        },
      },
    ]);

    const sessionMap = new Map();
    sessions.forEach((s) => sessionMap.set(s.participantId.toString(), s));

    const progressMap = new Map();
    progressAgg.forEach((p) => progressMap.set(p._id.toString(), p));

    const rows = participants.map((part) => {
      const pid = part._id.toString();
      const pData = progressMap.get(pid);
      const session = sessionMap.get(pid);

      const score = pData?.totalScore || 0;
      const solvedCount = pData?.solvedCount || 0;

      let elapsedSeconds = 0;
      if (session?.startedAt) {
        const start = new Date(session.startedAt).getTime();
        const end = session.completedAt
          ? new Date(session.completedAt).getTime()
          : pData?.lastSolvedAt
          ? new Date(pData.lastSolvedAt).getTime()
          : session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()
          ? new Date(session.expiresAt).getTime()
          : Date.now();
        elapsedSeconds = Math.max(0, Math.floor((end - start) / 1000));
      }

      return {
        id: pid,
        participantCode: part.participantCode,
        name: part.name,
        college: part.college,
        score,
        questionsSolved: solvedCount,
        elapsedSeconds,
        completionTime: formatTimeDisplay(elapsedSeconds),
        status: session?.status || 'not_started',
      };
    });

    // Rank sorting
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.elapsedSeconds - b.elapsedSeconds;
    });

    const ranked = rows.map((r, i) => ({
      rank: i + 1,
      ...r,
    }));

    if (format === 'csv') {
      const header = 'Rank,Participant Code,Name,College,Score,Completion Time,Questions Solved\n';
      const csvLines = ranked.map((r) => {
        const safeName = `"${r.name.replace(/"/g, '""')}"`;
        const safeCollege = `"${r.college.replace(/"/g, '""')}"`;
        return `${r.rank},${r.participantCode},${safeName},${safeCollege},${r.score},"${r.completionTime}",${r.questionsSolved}`;
      });

      const csvContent = header + csvLines.join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="operation_zero_day_results.csv"',
        },
      });
    }

    return NextResponse.json({
      success: true,
      results: ranked,
    });
  } catch (error: any) {
    console.error('[API GET /api/admin/results] Error:', error);
    return NextResponse.json({ error: 'Failed to generate competition results' }, { status: 500 });
  }
}
