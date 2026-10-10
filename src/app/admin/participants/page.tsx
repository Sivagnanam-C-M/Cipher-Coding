'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, Filter, RotateCw, Award, CheckCircle2, Clock, RotateCcw, RefreshCw } from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

interface ParticipantRecord {
  id: string;
  name: string;
  email: string;
  college: string;
  participantCode: string;
  registeredAt: string;
  missionStartedAt: string | null;
  sessionStatus: 'not_attended' | 'not_started' | 'active' | 'completed' | 'expired';
  tabSwitchCount?: number;
  endReason?: string | null;
  score: number;
  questionsSolved: number;
}

export default function AdminParticipantsPage() {
  const router = useRouter();
  const [participants, setParticipants] = useState<ParticipantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipants = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (statusFilter !== 'all') query.set('status', statusFilter);

      const res = await fetch(`/api/admin/participants?${query.toString()}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setParticipants(data.participants || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to load participants');
      }
    } catch (err: any) {
      console.error('Failed to load participants', err);
      setError(err?.message || 'Connection error');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
    const interval = setInterval(() => {
      fetchParticipants();
    }, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParticipants();
  };

  const handleResetAll = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/admin/participants/reset-all', { method: 'POST' });
      if (res.ok) {
        setResetModalOpen(false);
        await fetchParticipants();
      }
    } catch (err) {
      console.error('Failed to reset contestants', err);
    } finally {
      setResetting(false);
    }
  };

  const getStatusBadge = (status: string, endReason?: string | null, tabSwitchCount?: number) => {
    if (status === 'completed' && endReason === 'tab_switch_exceeded') {
      return <Badge variant="crimson">TERMINATED ({tabSwitchCount ?? 5}/4)</Badge>;
    }
    switch (status) {
      case 'active':
        return (
          <div className="inline-flex flex-col items-center gap-0.5">
            <Badge variant="emerald">ACTIVE</Badge>
            {(tabSwitchCount ?? 0) > 0 && (
              <span className="text-[10px] text-amber-400 font-mono">
                {tabSwitchCount}/4 switches
              </span>
            )}
          </div>
        );
      case 'completed':
        return <Badge variant="cyan">COMPLETED</Badge>;
      case 'expired':
        return <Badge variant="crimson">EXPIRED</Badge>;
      case 'not_attended':
      case 'not_started':
      default:
        return <Badge variant="slate">NOT ATTENDED</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] font-mono text-amber-400">
        <RotateCw className="w-6 h-6 animate-spin mr-3" />
        <span>RETRIEVING OPERATIVE ROSTER...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            PARTICIPANT MONITOR
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of registered operatives, investigation statuses, and scores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CyberButton
            variant="cyan"
            size="sm"
            onClick={() => fetchParticipants(true)}
            isLoading={refreshing}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            REFRESH
          </CyberButton>
          <CyberButton
            variant="crimson"
            size="sm"
            onClick={() => setResetModalOpen(true)}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            SET ALL TO NOT ATTENDED
          </CyberButton>
          <span className="text-xs text-slate-400 font-mono">
            TOTAL AGENTS: <strong className="text-cyan-400">{participants.length}</strong>
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-950/60 border border-red-500/80 text-xs text-red-300 font-mono flex items-center justify-between">
          <span>SECURITY ALERT: {error}</span>
          <CyberButton variant="crimson" size="sm" onClick={() => fetchParticipants(true)}>
            RETRY
          </CyberButton>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, name, college, email..."
              className="w-full pl-9 pr-3 py-2 bg-[#06090e] border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <CyberButton type="submit" variant="secondary" size="sm">
            SEARCH
          </CyberButton>
        </form>

        <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">STATUS:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#06090e] border border-slate-700 rounded text-slate-200 text-xs focus:outline-none focus:border-cyan-400"
          >
            <option value="all">All Operatives</option>
            <option value="not_attended">Not Attended</option>
            <option value="active">Active Missions</option>
            <option value="completed">Completed Missions</option>
            <option value="expired">Expired Missions</option>
          </select>
        </div>
      </div>

      {/* Participants Table */}
      <TerminalCard glowColor="cyan">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">PARTICIPANT ID</th>
                <th className="py-3 px-4">NAME</th>
                <th className="py-3 px-4">COLLEGE / INSTITUTION</th>
                <th className="py-3 px-4 text-center">SOLVED</th>
                <th className="py-3 px-4 text-right">SCORE</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">REGISTERED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No participants matching current search parameters.
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-cyan-400 font-mono">
                      {p.participantCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      <div>{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{p.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                      {p.college}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-300">
                      {p.questionsSolved}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-400">
                      {p.score} PTS
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(p.sessionStatus, p.endReason, p.tabSwitchCount)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                      {new Date(p.registeredAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TerminalCard>

      {/* Confirmation Modal for Resetting All Contestants */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="RESET CONTESTANTS TO NOT ATTENDED"
        description="Are you sure you want to set all contestant statuses to NOT ATTENDED? This will reset all active, completed, and expired sessions, clearing their mission timers, scores, and submissions."
        confirmLabel="SET ALL TO NOT ATTENDED"
        confirmVariant="crimson"
        isLoading={resetting}
        onConfirm={handleResetAll}
      />
    </div>
  );
}
