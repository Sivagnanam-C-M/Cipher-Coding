'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Clock, Award, ShieldAlert, RotateCw, UserCheck } from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';

interface LeaderboardEntry {
  rank: number;
  participantId: string;
  participantCode: string;
  college: string;
  score: number;
  solvedCount: number;
  elapsedSeconds: number;
  formattedTime: string;
  status: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchLeaderboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (res.ok) {
        setEnabled(data.enabled !== false);
        setEntries(data.leaderboard || []);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(), 15000); // 15s refresh
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] font-mono text-cyan-400">
        <RotateCw className="w-6 h-6 animate-spin mr-3" />
        <span>GENERATING STANDINGS...</span>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 font-mono text-center">
        <TerminalCard title="STANDINGS CLASSIFIED" glowColor="amber">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white uppercase">LEADERBOARD IS RESTRICTED</h3>
          <p className="text-xs text-slate-400 mt-2">
            Mission control has temporarily locked live operational rankings. Check back once results are officially declared.
          </p>
        </TerminalCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            LIVE LEADERBOARD
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked by total score, then lowest elapsed deciphering time.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <span className="text-[11px] text-slate-500">UPDATED: {lastUpdated}</span>
          )}
          <CyberButton
            variant="secondary"
            size="sm"
            onClick={() => fetchLeaderboard(true)}
            isLoading={refreshing}
            icon={<RotateCw className="w-3.5 h-3.5" />}
          >
            REFRESH
          </CyberButton>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <TerminalCard glowColor="cyan">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">RANK</th>
                <th className="py-3 px-4">OPERATIVE ID</th>
                <th className="py-3 px-4 hidden md:table-cell">COLLEGE / INSTITUTION</th>
                <th className="py-3 px-4 text-center">SOLVED</th>
                <th className="py-3 px-4 text-right">SCORE</th>
                <th className="py-3 px-4 text-right">TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No active mission telemetry recorded yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isTop3 = entry.rank <= 3;
                  const rankColor =
                    entry.rank === 1
                      ? 'text-amber-400 font-extrabold'
                      : entry.rank === 2
                      ? 'text-slate-200 font-bold'
                      : entry.rank === 3
                      ? 'text-amber-600 font-bold'
                      : 'text-slate-400';

                  return (
                    <tr
                      key={entry.participantId}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isTop3 ? 'bg-cyan-950/10' : ''
                      }`}
                    >
                      <td className={`py-3.5 px-4 ${rankColor}`}>
                        #{entry.rank.toString().padStart(2, '0')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-cyan-400">
                        {entry.participantCode}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 hidden md:table-cell truncate max-w-xs">
                        {entry.college}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-300">
                        {entry.solvedCount}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-400">
                        {entry.score} PTS
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300">
                        {entry.formattedTime}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </TerminalCard>
    </div>
  );
}
