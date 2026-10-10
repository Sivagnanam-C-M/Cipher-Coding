'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  RotateCw,
  Award,
  CheckCircle2,
  Clock,
  RotateCcw,
  RefreshCw,
  Minus,
  Sliders,
  ShieldAlert,
  X,
  AlertTriangle,
} from 'lucide-react';
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

  // Global reset modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Individual reset modal
  const [individualResetTarget, setIndividualResetTarget] = useState<ParticipantRecord | null>(null);
  const [individualResetLoading, setIndividualResetLoading] = useState(false);

  // Individual tab switch modal
  const [tabSwitchModalTarget, setTabSwitchModalTarget] = useState<ParticipantRecord | null>(null);
  const [tabSwitchLoading, setTabSwitchLoading] = useState(false);
  const [customTabCount, setCustomTabCount] = useState<number>(0);

  // Quick action loading on table row
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // 1. Reset all participants
  const handleResetAll = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/admin/participants/reset-all', { method: 'POST' });
      if (res.ok) {
        setResetModalOpen(false);
        setSuccessMessage('All contestant statuses have been set to NOT ATTENDED.');
        await fetchParticipants();
      }
    } catch (err) {
      console.error('Failed to reset contestants', err);
    } finally {
      setResetting(false);
    }
  };

  // 2. Individual progress reset
  const handleConfirmIndividualReset = async () => {
    if (!individualResetTarget) return;
    setIndividualResetLoading(true);
    try {
      const res = await fetch(`/api/admin/participants/${individualResetTarget.id}/reset`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message || `Progress for ${individualResetTarget.participantCode} reset.`);
        setIndividualResetTarget(null);
        await fetchParticipants();
      } else {
        setError(data.error || 'Failed to reset individual participant progress');
      }
    } catch (err: any) {
      setError(err.message || 'Network error during individual progress reset');
    } finally {
      setIndividualResetLoading(false);
    }
  };

  // 3. Quick reduce 1 tab switch from row
  const handleReduceOneSwitch = async (p: ParticipantRecord) => {
    setActionLoadingId(p.id);
    try {
      const res = await fetch(`/api/admin/participants/${p.id}/tab-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reduce', delta: -1 }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
        await fetchParticipants();
      } else {
        setError(data.error || 'Failed to reduce tab switch count');
      }
    } catch (err: any) {
      setError(err.message || 'Network error updating tab switches');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Tab switch modal actions (reduce, reset to 0, or custom number)
  const handleAdjustTabSwitches = async (action: 'reduce' | 'reset' | 'set', value?: number) => {
    if (!tabSwitchModalTarget) return;
    setTabSwitchLoading(true);
    try {
      const res = await fetch(`/api/admin/participants/${tabSwitchModalTarget.id}/tab-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, delta: -1, value }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(data.message);
        setTabSwitchModalTarget(null);
        await fetchParticipants();
      } else {
        setError(data.error || 'Failed to update tab switch count');
      }
    } catch (err: any) {
      setError(err.message || 'Network error updating tab switches');
    } finally {
      setTabSwitchLoading(false);
    }
  };

  const getStatusBadge = (status: string, endReason?: string | null, tabSwitchCount?: number) => {
    if (status === 'completed' && endReason === 'tab_switch_exceeded') {
      return <Badge variant="crimson">TERMINATED ({tabSwitchCount ?? 3}/3)</Badge>;
    }
    switch (status) {
      case 'active':
        return <Badge variant="emerald">ACTIVE</Badge>;
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
            Real-time tracking of registered operatives, mission statuses, progress resets, and proctor adjustments.
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

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3 rounded bg-emerald-950/70 border border-emerald-500/80 text-xs text-emerald-200 font-mono flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400/80 hover:text-emerald-200 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {error && (
        <div className="p-3 rounded bg-red-950/70 border border-red-500/80 text-xs text-red-300 font-mono flex items-center justify-between">
          <span>SECURITY ALERT: {error}</span>
          <div className="flex items-center space-x-2">
            <CyberButton variant="crimson" size="sm" onClick={() => fetchParticipants(true)}>
              RETRY
            </CyberButton>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400/80 hover:text-red-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
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
                <th className="py-3 px-3">PARTICIPANT ID</th>
                <th className="py-3 px-3">NAME & EMAIL</th>
                <th className="py-3 px-3">COLLEGE / INSTITUTION</th>
                <th className="py-3 px-2 text-center">SOLVED</th>
                <th className="py-3 px-3 text-right">SCORE</th>
                <th className="py-3 px-3 text-center">STATUS</th>
                <th className="py-3 px-3 text-center">TAB SWITCHES</th>
                <th className="py-3 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No participants matching current search parameters.
                  </td>
                </tr>
              ) : (
                participants.map((p) => {
                  const switches = p.tabSwitchCount ?? 0;
                  const isActionLoading = actionLoadingId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-3 font-bold text-cyan-400 font-mono">
                        {p.participantCode}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        <div>{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{p.email}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 truncate max-w-xs">
                        {p.college}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-300 font-semibold">
                        {p.questionsSolved}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-emerald-400">
                        {p.score} PTS
                      </td>
                      <td className="py-3 px-3 text-center">
                        {getStatusBadge(p.sessionStatus, p.endReason, p.tabSwitchCount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <span
                            className={`font-mono text-xs font-bold ${
                              switches >= 3
                                ? 'text-red-400'
                                : switches > 0
                                ? 'text-amber-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {switches}/3
                          </span>
                          {switches > 0 && (
                            <button
                              type="button"
                              title="Reduce 1 tab switch"
                              disabled={isActionLoading}
                              onClick={() => handleReduceOneSwitch(p)}
                              className="p-1 rounded bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <CyberButton
                            variant="amber"
                            size="sm"
                            className="px-2 py-1 text-[10px] tracking-wider"
                            onClick={() => {
                              setTabSwitchModalTarget(p);
                              setCustomTabCount(p.tabSwitchCount ?? 0);
                            }}
                            icon={<Sliders className="w-3 h-3" />}
                          >
                            SWITCHES
                          </CyberButton>
                          <CyberButton
                            variant="crimson"
                            size="sm"
                            className="px-2 py-1 text-[10px] tracking-wider"
                            onClick={() => setIndividualResetTarget(p)}
                            icon={<RotateCcw className="w-3 h-3" />}
                          >
                            RESET
                          </CyberButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </TerminalCard>

      {/* Confirmation Modal for Resetting All Contestants */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="RESET ALL CONTESTANTS TO NOT ATTENDED"
        description="Are you sure you want to set all contestant statuses to NOT ATTENDED? This will reset all active, completed, and expired sessions, clearing all mission timers, scores, and submissions."
        confirmLabel="SET ALL TO NOT ATTENDED"
        confirmVariant="crimson"
        isLoading={resetting}
        onConfirm={handleResetAll}
      />

      {/* Modal 1: Confirmation Modal for Individual Progress Reset */}
      <Modal
        isOpen={!!individualResetTarget}
        onClose={() => setIndividualResetTarget(null)}
        title={`RESET OPERATIVE: ${individualResetTarget?.participantCode}`}
        description={`Are you sure you want to reset all progress for ${individualResetTarget?.name} (${individualResetTarget?.participantCode})? Their score (${individualResetTarget?.score} pts), solved questions count (${individualResetTarget?.questionsSolved}), and tab switch violations will be cleared, resetting their mission status back to NOT ATTENDED.`}
        confirmLabel="CONFIRM PROGRESS RESET"
        confirmVariant="crimson"
        isLoading={individualResetLoading}
        onConfirm={handleConfirmIndividualReset}
      />

      {/* Modal 2: Manage / Reduce Tab Switches Modal */}
      {tabSwitchModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-xl bg-[#090d15] border border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.25)] space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                  PROCTOR INTERVENTION
                </span>
                <h3 className="text-base font-black text-white tracking-wider">
                  MANAGE TAB SWITCHES // {tabSwitchModalTarget.participantCode}
                </h3>
                <p className="text-xs text-slate-400">
                  {tabSwitchModalTarget.name} &bull; {tabSwitchModalTarget.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTabSwitchModalTarget(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Status Box */}
            <div className="p-3.5 rounded bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Current Tab Switches:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    (tabSwitchModalTarget.tabSwitchCount ?? 0) >= 3 ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {tabSwitchModalTarget.tabSwitchCount ?? 0} / 3 allowed
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Mission Status:</span>
                <span>{getStatusBadge(tabSwitchModalTarget.sessionStatus, tabSwitchModalTarget.endReason, tabSwitchModalTarget.tabSwitchCount)}</span>
              </div>

              {tabSwitchModalTarget.sessionStatus === 'completed' &&
                tabSwitchModalTarget.endReason === 'tab_switch_exceeded' && (
                  <div className="p-2 rounded bg-red-950/60 border border-red-500/40 text-[11px] text-red-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>
                      Operative was <strong>TERMINATED</strong> due to excessive tab switches. Reducing switches below 3 will automatically <strong>reactivate</strong> their mission.
                    </span>
                  </div>
                )}
            </div>

            {/* Quick Reduction Actions */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Quick Actions
              </label>
              <div className="grid grid-cols-2 gap-2">
                <CyberButton
                  variant="amber"
                  size="sm"
                  className="w-full justify-center text-xs"
                  isLoading={tabSwitchLoading}
                  disabled={(tabSwitchModalTarget.tabSwitchCount ?? 0) === 0}
                  onClick={() => handleAdjustTabSwitches('reduce')}
                  icon={<Minus className="w-3.5 h-3.5" />}
                >
                  -1 REDUCE SWITCH
                </CyberButton>

                <CyberButton
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center text-xs"
                  isLoading={tabSwitchLoading}
                  onClick={() => handleAdjustTabSwitches('reset')}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  RESET TO 0
                </CyberButton>
              </div>
            </div>

            {/* Custom Count Setter */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <label className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Set Exact Tab Switch Count
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={customTabCount}
                  onChange={(e) => setCustomTabCount(parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-1.5 bg-[#06090e] border border-slate-700 rounded text-xs text-white font-mono focus:outline-none focus:border-amber-400 text-center"
                />
                <CyberButton
                  variant="cyan"
                  size="sm"
                  className="flex-1 justify-center text-xs"
                  isLoading={tabSwitchLoading}
                  onClick={() => handleAdjustTabSwitches('set', customTabCount)}
                >
                  APPLY COUNT
                </CyberButton>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <CyberButton
                variant="secondary"
                size="sm"
                onClick={() => setTabSwitchModalTarget(null)}
              >
                CANCEL
              </CyberButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
