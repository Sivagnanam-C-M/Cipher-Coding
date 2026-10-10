import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import { getCachedEvent } from '@/lib/eventCache';
import Participant from '@/models/Participant';
import EventSession from '@/models/EventSession';
import ParticipantProgress from '@/models/ParticipantProgress';
import { formatTimeDisplay } from '@/lib/timer';

let cachedLeaderboard: { timestamp: number; data: any } | null = null;
let inFlightLeaderboardPromise: Promise<any> | null = null;
const CACHE_TTL_MS = 2500; // 2.5s cache for real-time live competition leaderboard

async function generateLeaderboardData() {
  const event = await getCachedEvent();
  if (!event) {
    return { error: 'Operation not found', status: 404 };
  }

  await connectToDatabase();

  // Run aggregation, participant fetch, and sessions fetch in parallel with lean queries
  const [progressAgg, participants, sessions] = await Promise.all([
    ParticipantProgress.aggregate([
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
    ]),
    Participant.find({}).select('name college participantCode').lean(),
    EventSession.find({ eventId: event._id })
      .select('participantId startedAt completedAt expiresAt status')
      .lean(),
  ]);

  const sessionMap = new Map();
  sessions.forEach((s: any) => sessionMap.set(s.participantId.toString(), s));

  const progressMap = new Map();
  progressAgg.forEach((p: any) => progressMap.set(p._id.toString(), p));

  // Build leaderboard list
  const entries = participants.map((part) => {
    const pid = part._id.toString();
    const pData = progressMap.get(pid);
    const session = sessionMap.get(pid);

    const score = pData?.totalScore || 0;
    const solvedCount = pData?.solvedCount || 0;

    // Elapsed time calculation in seconds
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
      participantId: pid,
      participantCode: part.participantCode,
      college: part.college,
      score,
      solvedCount,
      elapsedSeconds,
      formattedTime: formatTimeDisplay(elapsedSeconds),
      status: session?.status || 'not_started',
    };
  });

  // Sort: 1st by highest score, 2nd by shortest elapsed time
  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.elapsedSeconds - b.elapsedSeconds;
  });

  // Assign Rank
  const rankedLeaderboard = entries.map((item, index) => ({
    rank: index + 1,
    ...item,
  }));

  return {
    enabled: true,
    leaderboardEnabled: event.leaderboardEnabled,
    leaderboard: rankedLeaderboard,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const now = Date.now();
    if (cachedLeaderboard && now - cachedLeaderboard.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cachedLeaderboard.data);
    }

    const authSession = await getSession();
    const isAdmin = authSession?.role === 'admin';

    // Single-flight deduplication: coalesce simultaneous requests into one execution
    if (!inFlightLeaderboardPromise) {
      inFlightLeaderboardPromise = generateLeaderboardData()
        .then((payload) => {
          if (!payload.error) {
            cachedLeaderboard = {
              timestamp: Date.now(),
              data: payload,
            };
          }
          return payload;
        })
        .finally(() => {
          inFlightLeaderboardPromise = null;
        });
    }

    const payload = await inFlightLeaderboardPromise;

    if (payload.error) {
      return NextResponse.json({ error: payload.error }, { status: payload.status || 500 });
    }

    if (!payload.leaderboardEnabled && !isAdmin) {
      return NextResponse.json({
        enabled: false,
        message: 'LEADERBOARD CLASSIFIED: Live operational standings are currently restricted.',
        leaderboard: [],
      });
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[API /api/leaderboard] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate operational rankings.' },
      { status: 500 }
    );
  }
}
