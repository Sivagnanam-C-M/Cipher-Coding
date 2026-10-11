'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Send,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  FileText,
  X,
} from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import CodeViewer from '@/components/ui/CodeViewer';
import Badge from '@/components/ui/Badge';
import MissionTimer from '@/components/timer/MissionTimer';
import { useProctoring } from '@/context/ProctorContext';
import {
  getCachedClientQuestion,
  setCachedClientQuestion,
  prefetchQuestionEvidence,
} from '@/lib/evidenceClientCache';

interface QuestionDetail {
  id: string;
  questionNumber: number;
  title: string;
  section: string;
  storyText: string;
  storyReveal?: string;
  nextQuestionId?: string | null;
  nextQuestionNumber?: number | null;
  codeBlock: string;
  codeBlocks?: {
    python?: string;
    java?: string;
    c?: string;
    cpp?: string;
  };
  preferredLanguage?: 'python' | 'java' | 'c' | 'cpp';
  questionText: string;
  answerType: 'text' | 'number' | 'case_insensitive_text' | 'exact_text' | 'multiple_choice';
  points: number;
  difficulty: string;
  hint?: string;
  isFinal: boolean;
  isSolved: boolean;
  attempts: number;
  maxAttempts: number;
}

interface SubmissionFeedback {
  isCorrect: boolean;
  message: string;
  pointsAwarded?: number;
  attemptsRemaining?: number | null;
}

export default function EvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { tabSwitchCount, maxTabSwitches, setSessionState } = useProctoring();

  const cachedInitial = typeof window !== 'undefined' ? getCachedClientQuestion(id) : null;
  const [question, setQuestion] = useState<QuestionDetail | null>(cachedInitial);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'python' | 'java' | 'c' | 'cpp'>('python');
  const [loading, setLoading] = useState(!cachedInitial);
  const [submitting, setSubmitting] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<SubmissionFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storyRevealModalOpen, setStoryRevealModalOpen] = useState(false);
  const [activeStoryReveal, setActiveStoryReveal] = useState<string>(cachedInitial?.storyReveal || '');
  const [nextQId, setNextQId] = useState<string | null>(cachedInitial?.nextQuestionId || null);
  const [nextQNum, setNextQNum] = useState<number | null>(cachedInitial?.nextQuestionNumber || null);

  // Sync initial language preference from localStorage or cache
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('zero_day_preferred_language') as any;
      if (stored && ['python', 'java', 'c', 'cpp'].includes(stored)) {
        setSelectedLanguage(stored);
      } else if (cachedInitial?.preferredLanguage) {
        setSelectedLanguage(cachedInitial.preferredLanguage);
      }
    }
  }, [cachedInitial]);

  const fetchEvidence = async () => {
    try {
      const qRes = await fetch(`/api/mission/questions/${id}`, { cache: 'no-store' });

      if (qRes.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        } else {
          router.push('/login');
        }
        return;
      }

      const qData = await qRes.json();

      if (!qRes.ok) {
        // If terminated or completed, redirect to mission overview
        if (qRes.status === 403 && qData.error?.includes('TERMINATED')) {
          router.push('/mission');
          return;
        }
        throw new Error(qData.error || 'Failed to retrieve evidence');
      }

      setQuestion(qData.question);
      setCachedClientQuestion(id, qData.question);

      // Prioritize client's stored language preference over default server response
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('zero_day_preferred_language') as any;
        if (stored && ['python', 'java', 'c', 'cpp'].includes(stored)) {
          setSelectedLanguage(stored);
        } else if (qData.question?.preferredLanguage) {
          setSelectedLanguage(qData.question.preferredLanguage);
          localStorage.setItem('zero_day_preferred_language', qData.question.preferredLanguage);
        }
      } else if (qData.question?.preferredLanguage) {
        setSelectedLanguage(qData.question.preferredLanguage);
      }

      if (qData.question?.storyReveal) {
        setActiveStoryReveal(qData.question.storyReveal);
      }
      if (qData.question?.nextQuestionId !== undefined) {
        setNextQId(qData.question.nextQuestionId);
        if (qData.question.nextQuestionId) {
          prefetchQuestionEvidence(qData.question.nextQuestionId);
          router.prefetch(`/mission/evidence/${qData.question.nextQuestionId}`);
        }
      }
      if (qData.question?.nextQuestionNumber !== undefined) {
        setNextQNum(qData.question.nextQuestionNumber);
      }
      setAnswerInput('');
      setFeedback(null);
      setShowHint(false);

      // Sync session & proctoring state from consolidated response
      if (qData.session) {
        setSessionInfo({ session: qData.session, timer: qData.timer });
        setSessionState(
          qData.session.status,
          qData.session.tabSwitchCount ?? 0,
          qData.session.maxTabSwitches ?? 4,
          qData.session.endReason ?? null
        );

        if (qData.session.status === 'completed' && qData.session.endReason === 'tab_switch_exceeded') {
          router.push('/mission');
          return;
        }
      }
    } catch (err: any) {
      if (!question) {
        setError(err.message || 'Evidence retrieval error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSwitch = async (lang: 'python' | 'java' | 'c' | 'cpp') => {
    setSelectedLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zero_day_preferred_language', lang);
    }
    try {
      await fetch('/api/participant/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredLanguage: lang }),
      });
    } catch (err) {
      console.error('Failed to update preferred language', err);
    }
  };

  useEffect(() => {
    const cached = getCachedClientQuestion(id);
    if (cached) {
      setQuestion(cached);
      if (cached.preferredLanguage) setSelectedLanguage(cached.preferredLanguage);
      if (cached.storyReveal) setActiveStoryReveal(cached.storyReveal);
      if (cached.nextQuestionId !== undefined) setNextQId(cached.nextQuestionId);
      if (cached.nextQuestionNumber !== undefined) setNextQNum(cached.nextQuestionNumber);
      setLoading(false);
      if (cached.nextQuestionId) {
        prefetchQuestionEvidence(cached.nextQuestionId);
        router.prefetch(`/mission/evidence/${cached.nextQuestionId}`);
      }
    }
    fetchEvidence();
  }, [id]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerInput.trim() || submitting || question?.isSolved) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/mission/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question?.id,
          submittedAnswer: answerInput.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Deciphering validation failed');
      }

      setFeedback({
        isCorrect: data.isCorrect,
        message: data.message,
        pointsAwarded: data.pointsAwarded,
        attemptsRemaining: data.attemptsRemaining,
      });

      if (data.isCorrect) {
        if (data.storyReveal) {
          setActiveStoryReveal(data.storyReveal);
        }
        if (data.nextQuestionId !== undefined) {
          setNextQId(data.nextQuestionId);
          if (data.nextQuestionId) {
            prefetchQuestionEvidence(data.nextQuestionId);
            router.prefetch(`/mission/evidence/${data.nextQuestionId}`);
          }
        }
        if (data.nextQuestionNumber !== undefined) {
          setNextQNum(data.nextQuestionNumber);
        }
        setStoryRevealModalOpen(true);
      }

      if (question) {
        const updated = {
          ...question,
          isSolved: data.isCorrect ? true : question.isSolved,
          attempts: data.attempts,
        };
        setQuestion(updated);
        setCachedClientQuestion(id, updated);
      }
    } catch (err: any) {
      setFeedback({
        isCorrect: false,
        message: err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] font-mono text-cyan-400">
        <RotateCw className="w-6 h-6 animate-spin mr-3" />
        <span>RECOVERING ENCRYPTED EVIDENCE...</span>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 font-mono text-center space-y-4">
        <TerminalCard title="EVIDENCE UNAVAILABLE" glowColor="crimson">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-slate-300">{error || 'Unable to load evidence.'}</p>
          <div className="pt-4">
            <Link href="/mission">
              <CyberButton variant="cyan" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                RETURN TO DASHBOARD
              </CyberButton>
            </Link>
          </div>
        </TerminalCard>
      </div>
    );
  }

  const isExpired = sessionInfo?.timer?.isExpired || sessionInfo?.session?.status === 'expired';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-mono space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/mission"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO EVIDENCE REPOSITORY</span>
        </Link>

        <div className="flex items-center space-x-3">
          <Badge
            variant={
              sessionInfo?.session?.endReason === 'tab_switch_exceeded'
                ? 'crimson'
                : tabSwitchCount >= maxTabSwitches
                ? 'crimson'
                : tabSwitchCount > 0
                ? 'amber'
                : 'emerald'
            }
          >
            TAB SWITCHES: {tabSwitchCount} / {maxTabSwitches}
          </Badge>

          {sessionInfo?.session?.expiresAt && (
            <MissionTimer
              expiresAt={sessionInfo.session.expiresAt}
              serverTimestamp={sessionInfo.timer?.serverTimestamp}
              onExpire={() => router.push('/mission')}
            />
          )}
        </div>
      </div>

      {/* Main Evidence Dossier */}
      <TerminalCard
        title={`EVIDENCE ${question.questionNumber.toString().padStart(2, '0')}: ${question.title}`}
        subtitle={question.section}
        glowColor={question.isSolved ? 'emerald' : 'cyan'}
        statusBadge={
          question.isSolved ? (
            <Badge variant="emerald">
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              DECODED
            </Badge>
          ) : (
            <Badge variant="cyan">+{question.points} POINTS</Badge>
          )
        }
      >
        <div className="space-y-6">
          {/* Investigation Story Context */}
          {question.storyText && (
            <div className="p-4 rounded bg-[#06090e] border border-slate-800 text-xs sm:text-sm text-slate-300 font-sans leading-relaxed border-l-4 border-l-cyan-500">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">
                FORENSIC CASE NOTES
              </span>
              {question.storyText}
            </div>
          )}

          {/* Recovered Code Section with Language Switcher */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                RECOVERED CODE FRAGMENT
              </span>

              {/* Language Switcher Tabs */}
              <div className="flex items-center space-x-1 bg-[#06090e] border border-slate-800 p-1 rounded-md">
                <span className="text-[10px] text-slate-500 uppercase px-2 font-mono hidden sm:inline">
                  LANGUAGE:
                </span>
                {(['python', 'java', 'c', 'cpp'] as const).map((lang) => {
                  const labels: Record<string, string> = {
                    python: 'PYTHON',
                    java: 'JAVA',
                    c: 'C',
                    cpp: 'C++',
                  };
                  const isActive = selectedLanguage === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleLanguageSwitch(lang)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all tracking-wider ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                      }`}
                    >
                      {labels[lang]}
                    </button>
                  );
                })}
              </div>
            </div>

            <CodeViewer
              code={
                question.codeBlocks?.[selectedLanguage] ||
                question.codeBlock ||
                '// No code available'
              }
              language={selectedLanguage}
              filename={`evidence_${question.questionNumber.toString().padStart(2, '0')}.${
                selectedLanguage === 'python'
                  ? 'py'
                  : selectedLanguage === 'java'
                  ? 'java'
                  : selectedLanguage === 'cpp'
                  ? 'cpp'
                  : 'c'
              }`}
            />
          </div>

          {/* Decipher Objective Prompt */}
          <div className="p-4 rounded bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest block">
              DECIPHER THIS
            </span>
            <p className="text-sm font-semibold text-slate-100">{question.questionText}</p>
          </div>

          {/* Hint Drawer */}
          {question.hint && (
            <div className="text-xs">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="inline-flex items-center space-x-1.5 text-amber-400/90 hover:text-amber-300 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showHint ? 'HIDE INVESTIGATION HINT' : 'REQUEST INVESTIGATION HINT'}</span>
              </button>

              {showHint && (
                <div className="mt-2 p-3 rounded bg-amber-950/20 border border-amber-500/30 text-amber-200">
                  {question.hint}
                </div>
              )}
            </div>
          )}

          {/* Feedback Display (Access Granted / Access Denied) */}
          {feedback && (
            <div
              className={`p-4 rounded border text-center font-mono space-y-2 animate-fadeIn ${
                feedback.isCorrect
                  ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300 shadow-emerald-glow'
                  : 'bg-red-950/40 border-red-500/80 text-red-300 shadow-crimson-glow'
              }`}
            >
              <div className="flex items-center justify-center space-x-2 text-base font-bold uppercase tracking-wider">
                {feedback.isCorrect ? (
                  <>
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <span>ACCESS GRANTED</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-6 h-6 text-red-400" />
                    <span>ACCESS DENIED</span>
                  </>
                )}
              </div>
              <p className="text-xs sm:text-sm">{feedback.message}</p>
              {feedback.isCorrect && (
                <div className="space-y-3 pt-1">
                  <div className="text-lg font-extrabold text-emerald-400">
                    +{feedback.pointsAwarded || question.points} POINTS AWARDED
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <CyberButton
                      type="button"
                      variant="emerald"
                      size="sm"
                      onClick={() => setStoryRevealModalOpen(true)}
                      icon={<FileText className="w-4 h-4" />}
                    >
                      VIEW STORY REVEAL
                    </CyberButton>
                    {nextQId && (
                      <CyberButton
                        type="button"
                        variant="cyan"
                        size="sm"
                        onClick={() => router.push(`/mission/evidence/${nextQId}`)}
                        icon={<ArrowRight className="w-4 h-4" />}
                      >
                        PROCEED TO NEXT FRAGMENT →
                      </CyberButton>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Answer Submission Form */}
          {!question.isSolved && !isExpired && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-cyan-400 font-bold">ENTER DECIPHERED ANSWER:</span>
                    <span className="text-slate-200 normal-case font-medium">
                      {question.questionText.replace(/\s*\(Format:[^)]+\)/i, '').trim()}
                    </span>
                  </div>
                  {question.questionText.match(/\(Format:\s*([^)]+)\)/i) && (
                    <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded normal-case tracking-normal">
                      Format: {question.questionText.match(/\(Format:\s*([^)]+)\)/i)?.[1]}
                    </span>
                  )}
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder={
                      question.questionText.match(/\(Format:\s*([^)]+)\)/i)
                        ? `Enter answer in format: ${question.questionText.match(/\(Format:\s*([^)]+)\)/i)?.[1]}`
                        : 'Enter deciphered answer...'
                    }
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-[#06090e] border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono text-sm transition-colors"
                  />
                  <CyberButton
                    type="submit"
                    variant="cyan"
                    size="md"
                    isLoading={submitting}
                    icon={<Send className="w-4 h-4" />}
                  >
                    SUBMIT ANSWER
                  </CyberButton>
                </div>
              </div>

              {/* Attempts Counter */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  ATTEMPTS RECORDED: <strong className="text-slate-200">{question.attempts}</strong>
                </span>
                {question.maxAttempts > 0 && (
                  <span>
                    MAX ATTEMPTS:{' '}
                    <strong className="text-amber-400">{question.maxAttempts}</strong>
                  </span>
                )}
              </div>
            </form>
          )}

          {/* Already Solved State */}
          {question.isSolved && !feedback && (
            <div className="p-4 rounded bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 text-center space-y-3">
              <div className="flex items-center justify-center space-x-1.5 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>EVIDENCE SOLVED</span>
              </div>
              <p className="text-xs text-slate-300">
                You have already deciphered this fragment. Points have been credited to your score.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <CyberButton
                  type="button"
                  variant="emerald"
                  size="sm"
                  onClick={() => setStoryRevealModalOpen(true)}
                  icon={<FileText className="w-4 h-4" />}
                >
                  VIEW STORY REVEAL
                </CyberButton>
                {nextQId && (
                  <CyberButton
                    type="button"
                    variant="cyan"
                    size="sm"
                    onClick={() => router.push(`/mission/evidence/${nextQId}`)}
                    icon={<ArrowRight className="w-4 h-4" />}
                  >
                    PROCEED TO NEXT FRAGMENT →
                  </CyberButton>
                )}
              </div>
            </div>
          )}

          {/* Mission Expired State */}
          {isExpired && !question.isSolved && (
            <div className="p-4 rounded bg-red-950/20 border border-red-500/40 text-red-300 text-center">
              <span className="font-bold">MISSION WINDOW EXPIRED: Submissions disabled.</span>
            </div>
          )}
        </div>
      </TerminalCard>

      {/* Story Reveal Modal Popup Card */}
      {storyRevealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#090d16] border-2 border-emerald-500/80 rounded-xl shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden font-mono text-slate-200">
            {/* Top scanning accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 animate-pulse" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#050811] border-b border-emerald-500/30">
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest block">
                    DECRYPTION SUCCESS // GRID ARCHIVE REVEAL
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white tracking-wider uppercase">
                    {question?.title || 'FRAGMENT REVEALED'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStoryRevealModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
                title="Close Reveal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Story Content Body */}
            <div className="p-6 sm:p-7 max-h-[65vh] overflow-y-auto space-y-4 font-mono leading-relaxed bg-[#060a12]/90">
              <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>INTELLIGENCE STREAM DECRYPTED // DOSSIER UPDATED</span>
              </div>

              <div className="text-xs sm:text-sm text-slate-200 font-mono leading-relaxed whitespace-pre-line border-l-2 border-cyan-500/70 pl-4 py-2 bg-slate-900/40 rounded-r">
                {activeStoryReveal || question?.storyReveal || 'Archive details restored.'}
              </div>
            </div>

            {/* Footer / Next Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-[#050811] border-t border-slate-800">
              <CyberButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setStoryRevealModalOpen(false)}
              >
                STAY ON EVIDENCE
              </CyberButton>

              {nextQId ? (
                <CyberButton
                  type="button"
                  variant="emerald"
                  size="md"
                  onClick={() => {
                    setStoryRevealModalOpen(false);
                    router.push(`/mission/evidence/${nextQId}`);
                  }}
                  icon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto shadow-[0_0_20px_rgba(16,185,129,0.4)] font-bold tracking-wider"
                >
                  PROCEED TO NEXT FRAGMENT {nextQNum ? `(0${nextQNum})` : ''} →
                </CyberButton>
              ) : (
                <CyberButton
                  type="button"
                  variant="cyan"
                  size="md"
                  onClick={() => {
                    setStoryRevealModalOpen(false);
                    router.push('/mission');
                  }}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  className="w-full sm:w-auto font-bold tracking-wider"
                >
                  ALL FRAGMENTS RECOVERED — MISSION HUB →
                </CyberButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
