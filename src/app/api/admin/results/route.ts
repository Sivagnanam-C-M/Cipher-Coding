import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdminSession } from '@/lib/auth/session';
import connectToDatabase from '@/lib/mongodb';
import Event from '@/models/Event';
import Participant from '@/models/Participant';
import EventSession from '@/models/EventSession';
import ParticipantProgress from '@/models/ParticipantProgress';
import { formatTimeDisplay } from '@/lib/timer';

function getLogoDataUri(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'public', filename);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
  } catch (err) {
    console.error(`[API /admin/results] Failed to read logo ${filename}:`, err);
  }
  return `/${filename}`;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function GET(req: NextRequest) {
  try {
    const authSession = await getAdminSession();
    if (!authSession || authSession.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin clearance required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');
    const isDownload = searchParams.get('download') === 'true';

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
        name: part.name || 'Unknown Participant',
        college: part.college || 'N/A',
        score,
        questionsSolved: solvedCount,
        elapsedSeconds,
        completionTime: formatTimeDisplay(elapsedSeconds),
        status: session?.status || 'not_started',
      };
    });

    // Rank sorting: highest score first, then lowest time taken
    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.elapsedSeconds - b.elapsedSeconds;
    });

    const ranked = rows.map((r, i) => ({
      rank: i + 1,
      ...r,
    }));

    // CSV format strictly containing: Position, Name, College, Mark, Time Taken
    if (format === 'csv') {
      const header = 'Position,Name,College,Mark,Time Taken\n';
      const csvLines = ranked.map((r) => {
        const safeName = `"${(r.name || '').replace(/"/g, '""')}"`;
        const safeCollege = `"${(r.college || '').replace(/"/g, '""')}"`;
        return `${r.rank},${safeName},${safeCollege},${r.score},"${r.completionTime}"`;
      });

      const csvContent = header + csvLines.join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="cybersentinel_2k26_results.csv"',
        },
      });
    }

    // HTML / Printable Score Sheet format matching the uploaded template
    if (format === 'html' || format === 'scoresheet') {
      const veltechLogo = getLogoDataUri('veltech-logo.png');
      const cybersentinelLogo = getLogoDataUri('cybersentinel-logo.png');

      const tableRowsHtml =
        ranked.length === 0
          ? `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #64748b; font-family: monospace;">No participant records registered yet.</td></tr>`
          : ranked
              .map(
                (r) => `
        <tr>
          <td class="col-position">${r.rank}</td>
          <td class="col-name">${escapeHtml(r.name)}</td>
          <td class="col-college">${escapeHtml(r.college)}</td>
          <td class="col-mark">${r.score}</td>
          <td class="col-time">${escapeHtml(r.completionTime)}</td>
        </tr>`
              )
              .join('\n');

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cybersentinel 2K26 - WEBLICA Score Sheet</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      margin: 0;
      padding: 24px;
      color: #000000;
      background: #f8fafc;
    }
    .sheet-wrapper {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border-radius: 4px;
    }
    .no-print-bar {
      max-width: 900px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      background: #0f172a;
      color: #f8fafc;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .btn-group {
      display: flex;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      font-family: monospace, sans-serif;
      text-transform: uppercase;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-print {
      background: #f59e0b;
      color: #000000;
    }
    .btn-print:hover {
      background: #d97706;
    }
    .btn-download {
      background: #334155;
      color: #ffffff;
      border: 1px solid #475569;
    }
    .btn-download:hover {
      background: #475569;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #000000;
      padding-bottom: 14px;
      margin-bottom: 20px;
      gap: 16px;
    }
    .header-logo-left {
      max-width: 180px;
      max-height: 80px;
      object-fit: contain;
    }
    .header-logo-right {
      max-width: 90px;
      max-height: 80px;
      object-fit: contain;
    }
    .header-center {
      text-align: center;
      flex: 1;
      padding: 0 10px;
    }
    .event-title {
      font-size: 19px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin: 0 0 6px 0;
      font-family: 'Times New Roman', Times, Georgia, serif;
      text-transform: uppercase;
      color: #111827;
    }
    .sheet-title {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 1.2px;
      margin: 0;
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #000000;
    }
    .results-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 13.5px;
    }
    .results-table th, .results-table td {
      border: 1.5px solid #000000;
      padding: 9px 12px;
    }
    .results-table th {
      background-color: #f1f5f9;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 13px;
      color: #000000;
    }
    .col-position {
      width: 80px;
      text-align: center;
      font-weight: 800;
    }
    .col-name {
      text-align: left;
      font-weight: 600;
      color: #0f172a;
    }
    .col-college {
      text-align: left;
      color: #1e293b;
    }
    .col-mark {
      width: 90px;
      text-align: center;
      font-weight: 800;
      color: #000000;
    }
    .col-time {
      width: 120px;
      text-align: center;
      font-family: monospace;
      font-weight: 600;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .sheet-wrapper {
        box-shadow: none;
        border: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print-bar {
        display: none !important;
      }
      .results-table th {
        background-color: #f1f5f9 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-family: monospace; font-size: 13px; font-weight: bold; letter-spacing: 0.5px;">
      CYBERSENTINEL 2K26 // SCORE SHEET DOCUMENT
    </div>
    <div class="btn-group">
      <button class="btn btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <a class="btn btn-download" href="/api/admin/results?format=csv">📥 Download CSV</a>
    </div>
  </div>

  <div class="sheet-wrapper">
    <div class="header">
      <img src="${veltechLogo}" alt="Vel Tech High Tech" class="header-logo-left" />
      <div class="header-center">
        <div class="event-title">Cybersentinel 2K26 - WEBLICA</div>
        <div class="sheet-title">Score Sheet</div>
      </div>
      <img src="${cybersentinelLogo}" alt="CyberSentinel 2K26" class="header-logo-right" />
    </div>

    <table class="results-table">
      <thead>
        <tr>
          <th class="col-position">Position</th>
          <th class="col-name">Name</th>
          <th class="col-college">College</th>
          <th class="col-mark">Mark</th>
          <th class="col-time">Time Taken</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;

      const headers: Record<string, string> = {
        'Content-Type': 'text/html; charset=utf-8',
      };

      if (isDownload) {
        headers['Content-Disposition'] =
          'attachment; filename="Cybersentinel_2K26_Score_Sheet.html"';
      }

      return new NextResponse(htmlContent, {
        status: 200,
        headers,
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
