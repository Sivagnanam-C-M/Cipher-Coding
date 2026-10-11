'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Terminal,
  Shield,
  Play,
  Lock,
  CheckCircle2,
  HelpCircle,
  Clock,
  Award,
  AlertTriangle,
  RotateCw,
  Code2,
  Target,
  Zap,
  Radio,
  Crosshair,
  Maximize2,
} from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import MissionTimer from '@/components/timer/MissionTimer';
import { useProctoring } from '@/context/ProctorContext';
import { prefetchQuestionEvidence, setCachedClientQuestion } from '@/lib/evidenceClientCache';

interface QuestionSummary {
  id: string;
  questionNumber: number;
  title: string;
  section: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
  isFinal: boolean;
  isSolved: boolean;
  isLocked: boolean;
  attempts: number;
  status: 'available' | 'viewed' | 'solved' | 'locked';
}

interface MissionData {
  event: {
    id: string;
    name: string;
    status: string;
    durationMinutes: number;
    progressionMode: string;
    maxAttempts: number;
  };
  session: {
    id: string;
    status: 'not_attended' | 'not_started' | 'active' | 'completed' | 'expired';
    startedAt: string | null;
    expiresAt: string | null;
    completedAt?: string | null;
    tabSwitchCount?: number;
    maxTabSwitches?: number;
    endReason?: string | null;
  };
  timer: {
    isActive: boolean;
    isExpired: boolean;
    remainingSeconds: number;
    serverTimestamp: number;
    expiresAt: string | null;
  };
  score: number;
  solvedCount: number;
}

export default function MissionDashboardPage() {
  const router = useRouter();
  const {
    isFullscreen,
    requestFullscreen,
    tabSwitchCount,
    maxTabSwitches,
    setSessionState,
  } = useProctoring();

  const [loading, setLoading] = useState(true);
  const [missionData, setMissionData] = useState<MissionData | null>(null);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [userProfile, setUserProfile] = useState<{
    participantCode?: string;
    name?: string;
    preferredLanguage?: 'python' | 'java' | 'c' | 'cpp';
  } | null>(null);
  const [selectedCommenceLang, setSelectedCommenceLang] = useState<'python' | 'java' | 'c' | 'cpp'>('python');
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateLanguage = async (lang: 'python' | 'java' | 'c' | 'cpp') => {
    setSelectedCommenceLang(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zero_day_preferred_language', lang);
    }
    setUserProfile((prev) => (prev ? { ...prev, preferredLanguage: lang } : null));
    try {
      await fetch('/api/participant/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage: lang }),
      });
    } catch (err) {
      console.error('Failed to update language', err);
    }
  };

  const fetchMissionState = useCallback(async () => {
    try {
      const [sessionRes, qRes] = await Promise.all([
        fetch('/api/mission/session', { cache: 'no-store' }),
        fetch('/api/mission/questions', { cache: 'no-store' }),
      ]);

      if (sessionRes.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        } else {
          router.push('/login');
        }
        return;
      }

      const sessionJson = await sessionRes.json();

      if (!sessionRes.ok) throw new Error(sessionJson.error || 'Failed to load session');

      setMissionData(sessionJson);
      const user = sessionJson.user;
      if (user) {
        setUserProfile(user);

        // Sync directly to Navbar
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('auth-state-change', {
              detail: {
                authenticated: true,
                user: {
                  ...user,
                  role: 'participant',
                },
              },
            })
          );
        }

        // Prioritize client's stored language preference over server default
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('zero_day_preferred_language') as any;
          if (stored && ['python', 'java', 'c', 'cpp'].includes(stored)) {
            setSelectedCommenceLang(stored);
          } else if (user.preferredLanguage) {
            setSelectedCommenceLang(user.preferredLanguage);
            localStorage.setItem('zero_day_preferred_language', user.preferredLanguage);
          }
        } else if (user.preferredLanguage) {
          setSelectedCommenceLang(user.preferredLanguage);
        }
      }

      // Sync proctoring state
      if (sessionJson.session) {
        setSessionState(
          sessionJson.session.status,
          sessionJson.session.tabSwitchCount ?? 0,
          sessionJson.session.maxTabSwitches ?? 3,
          sessionJson.session.endReason ?? null
        );
      }

      // Populate questions if available
      if (qRes.ok) {
        const qJson = await qRes.json();
        const loadedQuestions: QuestionSummary[] = qJson.questions || [];
        setQuestions(loadedQuestions);

        // Pre-warm the first 3 playable questions for 0ms transition ONLY if session is active
        if (sessionJson.session?.status === 'active') {
          const playable = loadedQuestions.filter((q) => !q.isLocked);
          const toPreload = playable.length > 0 ? playable.slice(0, 3) : loadedQuestions.slice(0, 1);
          toPreload.forEach((q) => {
            prefetchQuestionEvidence(q.id);
            router.prefetch(`/mission/evidence/${q.id}`);
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching telemetry');
    } finally {
      setLoading(false);
    }
  }, [router, setSessionState]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('zero_day_preferred_language') as any;
      if (stored && ['python', 'java', 'c', 'cpp'].includes(stored)) {
        setSelectedCommenceLang(stored);
      }
    }
    fetchMissionState();
  }, [fetchMissionState]);

  const handleStartMission = async () => {
    setStarting(true);
    setStartError(null);
    try {
      // 1. Request full-page mode on direct user gesture
      try {
        await requestFullscreen();
      } catch (fsErr) {
        console.warn('Fullscreen request bypassed:', fsErr);
      }

      // 2. Start investigation session on server
      const res = await fetch('/api/mission/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage: selectedCommenceLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start investigation');

      if (typeof window !== 'undefined') {
        localStorage.setItem('zero_day_preferred_language', selectedCommenceLang);
      }

      // Pre-warm client cache with the first question payload if provided
      if (data.firstQuestionData) {
        setCachedClientQuestion(data.firstQuestionData.id, data.firstQuestionData);
      }

      // Update proctoring state in context immediately
      if (data.session) {
        setSessionState(
          data.session.status,
          data.session.tabSwitchCount ?? 0,
          data.session.maxTabSwitches ?? 3,
          data.session.endReason ?? null
        );
      }

      // 3. Immediately navigate straight into Question 1 via router.push (preserving fullscreen!)
      const targetId = data.firstQuestionId || data.questions?.[0]?.id || questions?.[0]?.id;
      if (targetId) {
        setStartModalOpen(false);
        router.push(`/mission/evidence/${targetId}`);
        return;
      }

      setStartModalOpen(false);
      await fetchMissionState();
    } catch (err: any) {
      setStartError(err.message || 'Failed to start investigation');
    } finally {
      setStarting(false);
    }
  };

  const handleTimerExpire = () => {
    fetchMissionState();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] font-mono text-cyan-400">
        <RotateCw className="w-6 h-6 animate-spin mr-3" />
        <span>SYNCING FORENSIC TELEMETRY...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 font-mono">
        <TerminalCard title="SYSTEM ERROR" glowColor="crimson">
          <div className="space-y-4 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-white uppercase">{error}</h3>
            <p className="text-xs text-slate-400">
              Unable to synchronize with mission control server.
            </p>
            <CyberButton variant="cyan" size="sm" onClick={() => fetchMissionState()}>
              RETRY CONNECTION
            </CyberButton>
          </div>
        </TerminalCard>
      </div>
    );
  }

  const isNotStarted =
    missionData?.session.status === 'not_started' ||
    missionData?.session.status === 'not_attended';
  const isExpired = missionData?.timer.isExpired || missionData?.session.status === 'expired';
  const isCompleted = missionData?.session.status === 'completed';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono space-y-8">
      {/* Header Telemetry Dashboard Bar */}
      <TerminalCard glowColor="cyan" className="p-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
          {/* Participant ID */}
          <div className="border-r border-slate-800 pr-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">
              PARTICIPANT CODE
            </div>
            <div className="text-lg font-extrabold text-cyan-400 tracking-wider">
              {userProfile?.participantCode || 'CYB-0000'}
            </div>
          </div>

          {/* Time Remaining */}
          <div className="border-r border-slate-800 pr-4">
            {isNotStarted ? (
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest">
                  TIME ALLOCATED
                </div>
                <div className="text-lg font-bold text-slate-300">
                  {missionData?.event.durationMinutes || 40} MINS
                </div>
              </div>
            ) : (
              <MissionTimer
                expiresAt={missionData?.session.expiresAt || null}
                serverTimestamp={missionData?.timer.serverTimestamp}
                onExpire={handleTimerExpire}
              />
            )}
          </div>

          {/* Score */}
          <div className="border-r border-slate-800 pr-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">
              CURRENT SCORE
            </div>
            <div className="text-lg font-extrabold text-emerald-400 flex items-center gap-1.5">
              <Award className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{missionData?.score || 0} PTS</span>
            </div>
          </div>

          {/* Progress */}
          <div className="border-r border-slate-800 pr-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">
              PROGRESS
            </div>
            <div className="text-lg font-bold text-slate-200">
              {missionData?.solvedCount || 0} / {questions.length || '—'} SOLVED
            </div>
          </div>

          {/* Preferred Language */}
          <div className="border-r border-slate-800 pr-4">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">
              LANGUAGE
            </div>
            <div className="flex items-center space-x-1">
              {(['python', 'java', 'c', 'cpp'] as const).map((lang) => {
                const labels: Record<string, string> = {
                  python: 'PY',
                  java: 'JAVA',
                  c: 'C',
                  cpp: 'C++',
                };
                const isActive = (userProfile?.preferredLanguage || 'python') === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleUpdateLanguage(lang)}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                        : 'text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {labels[lang]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Switches Proctor Monitor */}
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
              <span>TAB SWITCHES</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                variant={
                  missionData?.session.endReason === 'tab_switch_exceeded'
                    ? 'crimson'
                    : tabSwitchCount >= maxTabSwitches
                    ? 'crimson'
                    : tabSwitchCount > 0
                    ? 'amber'
                    : 'emerald'
                }
              >
                {missionData?.session.endReason === 'tab_switch_exceeded'
                  ? 'TERMINATED'
                  : `${tabSwitchCount} / ${maxTabSwitches}`}
              </Badge>
              {!isNotStarted && !isCompleted && !isExpired && (
                <button
                  type="button"
                  onClick={requestFullscreen}
                  title={isFullscreen ? 'Full-Page Mode Active' : 'Enter Full-Page Mode'}
                  className={`p-1 rounded transition-colors ${
                    isFullscreen
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-amber-400 hover:bg-amber-500/10 animate-pulse'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </TerminalCard>

      {/* Mission Not Started State: OPERATION ZERO DAY — THE HUNT BEGINS */}
      {isNotStarted && (
        <TerminalCard
          title="GRID INCIDENT BRIEFING // EYES ONLY"
          subtitle="OPERATION ZERO DAY"
          glowColor="crimson"
          statusBadge={
            <Badge variant="crimson">
              <Radio className="w-3 h-3 inline mr-1 animate-pulse" />
              INCIDENT BRIEFING // EYES ONLY
            </Badge>
          }
        >
          <div className="max-w-3xl mx-auto py-6 space-y-8">
            {/* Header Alert & Titles */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-mono tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                SYSTEM ALERT // GRID COMPROMISED // INTRUDER UNKNOWN
              </div>

              <div className="space-y-1">
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-widest uppercase terminal-glow-cyan">
                  OPERATION ZERO DAY
                </h1>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-widest text-cyan-400 uppercase">
                  GRID INCIDENT BRIEFING // EYES ONLY
                </h2>
              </div>
            </div>

            {/* Target Alert Card */}
            <div className="p-5 rounded-lg bg-red-950/40 border border-red-500/50 shadow-crimson-glow text-center space-y-3">
              <span className="text-lg sm:text-xl font-black text-red-400 tracking-widest uppercase block animate-pulse">
                ⚠️ A BREACH HAS BEEN DETECTED ACROSS THE GRID.
              </span>
              <div className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed space-y-1.5 max-w-2xl mx-auto">
                <p>A classified file has been accessed. The intruder has disappeared. His identity remains unknown.</p>
                <p className="text-slate-300 font-medium">
                  Before vanishing, he left behind a trail of fragments hidden inside programs.
                </p>
              </div>
            </div>

            {/* Directives / Orders */}
            <div className="space-y-3 text-left">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span>YOUR ORDERS ARE SIMPLE:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#06090e] border border-red-500/40 flex items-center space-x-3.5 hover:border-red-400 transition-colors">
                  <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 shrink-0">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                      ORDER 01
                    </div>
                    <div className="text-lg font-black text-white tracking-wider">
                      TRACE THE INTRUDER.
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#06090e] border border-cyan-500/40 flex items-center space-x-3.5 hover:border-cyan-400 transition-colors">
                  <div className="p-2.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                      ORDER 02
                    </div>
                    <div className="text-lg font-black text-white tracking-wider">
                      RECOVER THE STOLEN FILE.
                    </div>
                  </div>
                </div>
              </div>

              {/* Investigation Mystery Callout */}
              <div className="p-4 rounded-lg bg-[#06090e]/90 border border-slate-800 space-y-2 text-center mt-2">
                <p className="text-xs sm:text-sm text-slate-300 font-sans">
                  Every fragment you recover will reveal another piece of the investigation.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm font-mono font-bold text-amber-400 tracking-wide">
                  <span>Who is he?</span>
                  <span className="text-slate-600">•</span>
                  <span>What did he take?</span>
                  <span className="text-slate-600">•</span>
                  <span>And why did he leave the trail behind?</span>
                </div>
              </div>
            </div>

            {/* Protocol Pipeline */}
            <div className="p-5 rounded-lg bg-[#06090e] border border-slate-800 space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span>YOUR PROTOCOL</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                  FORENSIC PIPELINE
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                {[
                  { step: 'READ', sub: 'Decompile logic' },
                  { step: 'TRACE', sub: 'Follow execution' },
                  { step: 'DECODE', sub: 'Extract answers' },
                  { step: 'CONNECT', sub: 'Piece the trail' },
                ].map((item, idx) => (
                  <div
                    key={item.step}
                    className="p-3 rounded bg-[#0d1321] border border-cyan-500/30 flex flex-col items-center justify-center relative group hover:border-cyan-400 transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                  >
                    <div className="text-base sm:text-lg font-black text-cyan-300 tracking-wider">
                      {item.step}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                      {item.sub}
                    </div>
                    {idx < 3 && (
                      <span className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 text-cyan-500 font-bold text-sm z-10 pointer-events-none">
                        →
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-300 text-center font-sans">
                Choose your language. Follow the code. Recover the fragments. Piece together the trail.
              </p>
            </div>

            {/* 40:00 Timer Banner */}
            <div className="p-4 rounded-lg bg-[#0a0e17] border border-amber-500/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-400 tracking-widest px-3.5 py-1.5 bg-black/80 rounded border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                  {missionData?.event.durationMinutes || 40}:00
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                    40 MINUTES.
                  </div>
                  <div className="text-base sm:text-lg font-black text-red-400 tracking-wider font-mono animate-pulse">
                    THE INVESTIGATION BEGINS NOW.
                  </div>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400 font-sans">
                Server-clock locked upon launch.<br />
                Closing browser does not pause timer.
              </div>
            </div>

            {/* Language Selection Protocol */}
            <div className="p-5 rounded-lg bg-[#06090e] border border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-cyan-400">
                  <Code2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    OPERATIVE LANGUAGE PROTOCOL
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                  CHANGEABLE ANYTIME
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Choose the programming language you wish to commence with. All 15 code fragments will be rendered in this syntax. You can switch to any other language dynamically during the challenge.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {[
                  { id: 'python', label: 'PYTHON 3', desc: 'Scripting & Logic' },
                  { id: 'java', label: 'JAVA', desc: 'Object-Oriented' },
                  { id: 'c', label: 'C', desc: 'Low-Level Systems' },
                  { id: 'cpp', label: 'C++', desc: 'Native & Binary' },
                ].map((l) => {
                  const isSelected = selectedCommenceLang === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleUpdateLanguage(l.id as any)}
                      className={`p-3 rounded-lg border text-left transition-all relative ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                          : 'bg-[#0d1321] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                      )}
                      <div className="text-xs font-bold font-mono tracking-wider text-slate-200">
                        {l.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                        {l.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Launch Action */}
            <div className="pt-2 text-center">
              <CyberButton
                variant="emerald"
                size="lg"
                className="w-full sm:w-auto px-10 py-3.5 text-sm tracking-widest font-black"
                onClick={() => setStartModalOpen(true)}
                icon={<Play className="w-5 h-5 fill-current" />}
              >
                COMMENCE THE HUNT ({selectedCommenceLang.toUpperCase()})
              </CyberButton>
            </div>
          </div>
        </TerminalCard>
      )}

      {/* Mission Terminated via Tab Switch Exceeded Banner */}
      {isCompleted && missionData?.session.endReason === 'tab_switch_exceeded' && (
        <div className="p-6 rounded-lg bg-red-950/60 border-2 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.4)] text-center space-y-3 font-mono animate-in fade-in">
          <div className="inline-flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-base">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
            CHALLENGE TERMINATED // PROCTOR VIOLATION
          </div>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl mx-auto">
            Maximum tab switches ({missionData?.session.tabSwitchCount ?? 4}/{maxTabSwitches}) were exceeded.
            The challenge has ended with your current score of{' '}
            <strong className="text-amber-400">{missionData?.score || 0} PTS</strong> and elapsed time.
          </p>
        </div>
      )}

      {/* Mission Expired Banner */}
      {isExpired && !isCompleted && (
        <div className="p-5 rounded-lg bg-red-950/40 border border-red-500/60 shadow-crimson-glow text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider">
            <AlertTriangle className="w-5 h-5" />
            MISSION TERMINATED
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            The investigation window has closed. Your final score of{' '}
            <strong className="text-emerald-400">{missionData?.score || 0} PTS</strong> has been recorded.
            Submissions are now disabled.
          </p>
        </div>
      )}

      {/* Active Mission Quick Resume Banner */}
      {!isNotStarted && !isCompleted && !isExpired && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-cyan-950/80 via-[#071321] to-emerald-950/80 border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.3)] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono animate-in fade-in">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              INVESTIGATION IN PROGRESS // ACTIVE OPERATION
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
              {(() => {
                const nextPlayable = questions.find((q) => !q.isLocked && !q.isSolved);
                return nextPlayable
                  ? `CURRENT TARGET: EVIDENCE ${nextPlayable.questionNumber.toString().padStart(2, '0')} — ${nextPlayable.title}`
                  : 'ALL FRAGMENTS INVESTIGATED';
              })()}
            </h3>
            <p className="text-xs text-slate-300 font-sans">
              Decipher the code fragment and decode the trail left by SUBJECT ZERO.
            </p>
          </div>

          {(() => {
            const nextPlayable = questions.find((q) => !q.isLocked && !q.isSolved) || questions[0];
            return nextPlayable ? (
              <CyberButton
                variant="cyan"
                size="lg"
                className="w-full sm:w-auto font-black tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                icon={<Play className="w-5 h-5 fill-current" />}
                onClick={async () => {
                  try {
                    await requestFullscreen();
                  } catch {}
                  router.push(`/mission/evidence/${nextPlayable.id}`);
                }}
              >
                PROCEED TO EVIDENCE ({selectedCommenceLang.toUpperCase()}) →
              </CyberButton>
            ) : null;
          })()}
        </div>
      )}

      {/* Mission Active/Completed: Evidence Grid */}
      {!isNotStarted && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                RECOVERED EVIDENCE ARTIFACTS
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {questions.length} FRAGMENTS RECOVERED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {questions.map((q) => {
              const isLocked = q.isLocked;
              const isSolved = q.isSolved;
              const isTerminatedByProctor = isCompleted && missionData?.session.endReason === 'tab_switch_exceeded';

              return (
                <div
                  key={q.id}
                  className={`relative p-5 rounded-lg border transition-all duration-200 flex flex-col justify-between ${
                    isSolved
                      ? 'bg-emerald-950/20 border-emerald-500/40 shadow-emerald-glow'
                      : isLocked || isTerminatedByProctor
                      ? 'bg-[#0a0e17]/60 border-slate-800 opacity-60'
                      : 'bg-[#0d1321] border-slate-700 hover:border-cyan-500/60 hover:shadow-cyan-glow'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-widest text-slate-400">
                        EVIDENCE {q.questionNumber.toString().padStart(2, '0')}
                      </span>
                      {isSolved ? (
                        <Badge variant="emerald">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          DECODED ✓
                        </Badge>
                      ) : isTerminatedByProctor ? (
                        <Badge variant="crimson">
                          TERMINATED
                        </Badge>
                      ) : isLocked ? (
                        <Badge variant="slate">
                          <Lock className="w-3 h-3 inline mr-1" />
                          CLASSIFIED 🔒
                        </Badge>
                      ) : (
                        <Badge variant="cyan">
                          <HelpCircle className="w-3 h-3 inline mr-1" />
                          UNRESOLVED ?
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-400">
                      {q.title}
                    </h4>

                    <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                      {q.section}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-emerald-400 font-bold">+{q.points} PTS</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400 capitalize">{q.difficulty}</span>
                    </div>

                    {isLocked ? (
                      <span className="text-xs text-slate-500 font-mono">LOCKED</span>
                    ) : isTerminatedByProctor ? (
                      <span className="text-xs text-red-500 font-mono font-bold">CLOSED</span>
                    ) : (
                      <Link href={`/mission/evidence/${q.id}`}>
                        <CyberButton
                          variant={isSolved ? 'emerald' : 'cyan'}
                          size="sm"
                        >
                          {isSolved ? 'REVIEW' : 'ANALYZE'}
                        </CyberButton>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Start Mission Confirmation Modal */}
      <Modal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        title="COMMENCE THE HUNT: OPERATION ZERO DAY"
        confirmLabel="LAUNCH THE HUNT"
        confirmVariant="emerald"
        isLoading={starting}
        onConfirm={handleStartMission}
      >
        <div className="space-y-4 text-left font-mono">
          {startError && (
            <div className="p-3 bg-red-950/80 border border-red-500 rounded text-xs text-red-300 font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{startError}</span>
            </div>
          )}

          <div className="p-3 bg-red-950/30 border border-red-500/40 rounded text-xs text-red-300 font-sans leading-relaxed space-y-1.5">
            <strong className="text-red-400 font-mono block uppercase tracking-wider">
              ⚠️ MANDATORY PROCTORING PROTOCOL
            </strong>
            <p>
              • <strong>Full-Page Mode:</strong> Upon launching, the investigation terminal will activate in full-screen mode.
            </p>
            <p>
              • <strong>Tab Switching Limit:</strong> Switching tabs or windows is permitted a maximum of <strong>3 times</strong>. If exceeded, your challenge will immediately end with your current score and time recorded.
            </p>
            <p className="text-slate-400 text-[11px]">
              • <strong>Authoritative Timer:</strong> Server countdown begins immediately and cannot be paused.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#06090e] border border-slate-800 space-y-2.5">
            <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
              <span>CONFIRM COMMENCEMENT LANGUAGE</span>
              <span className="text-[10px] text-slate-500 lowercase font-normal">(changeable anytime)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'python', label: 'PYTHON' },
                { id: 'java', label: 'JAVA' },
                { id: 'c', label: 'C' },
                { id: 'cpp', label: 'C++' },
              ].map((l) => {
                const isSelected = selectedCommenceLang === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleUpdateLanguage(l.id as any)}
                    className={`py-2 px-1 text-center rounded text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-[#0d1321] text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1 font-sans">
            <p>🎯 Directives: <strong className="text-slate-200">FIND ZERO. RECOVER WHAT HE STOLE.</strong></p>
            <p>⚡ Protocol: <strong className="text-cyan-400 font-mono">READ → TRACE → DECODE → CONNECT</strong></p>
            <p>✓ All 15 code fragments will load in your chosen syntax. Switchable freely anytime from each terminal.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
