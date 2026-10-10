import Link from 'next/link';
import {
  ShieldAlert,
  Terminal,
  Clock,
  UserCheck,
  ChevronRight,
  Code2,
  Lock,
  Cpu,
  HelpCircle,
  Target,
  Zap,
  Radio,
} from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';
import { getParticipantSession, getAdminSession } from '@/lib/auth/session';

export const metadata = {
  title: 'Mission Incident Briefing | Operation Zero Day',
  description: 'Classified incident briefing, investigation parameters, and rules of engagement for Operation Zero Day.',
};

export default async function BriefingPage() {
  const [partSession, adminSession] = await Promise.all([
    getParticipantSession(),
    getAdminSession(),
  ]);

  return (
    <div className="relative overflow-hidden py-12 md:py-20 font-mono">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Mission Briefing Hero Banner */}
        <div className="text-center space-y-6">
          <div className="inline-flex justify-center mb-1">
            <div className="relative p-1 rounded-2xl bg-gradient-to-b from-cyan-500/30 to-slate-900 border border-cyan-500/50 shadow-[0_0_35px_rgba(6,182,212,0.35)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Cipher Coding: Operation Zero Day Logo"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]"
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
            CRITICAL INCIDENT // BREACH DETECTED
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white uppercase terminal-glow-cyan">
              OPERATION ZERO DAY
            </h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-widest text-cyan-400 uppercase">
              GRID INCIDENT BRIEFING // EYES ONLY
            </h2>
          </div>

          {/* Incident Alert Card */}
          <div className="max-w-2xl mx-auto p-4 rounded-lg bg-red-950/40 border border-red-500/50 shadow-crimson-glow text-center space-y-2">
            <span className="text-base sm:text-lg font-black text-red-400 tracking-widest uppercase block animate-pulse">
              ⚠️ A BREACH HAS BEEN DETECTED ACROSS THE GRID.
            </span>
            <div className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed space-y-1">
              <p>A classified file has been accessed. The intruder has disappeared. His identity remains unknown.</p>
              <p className="text-slate-300 font-medium">Before vanishing, he left behind a trail of fragments hidden inside programs.</p>
            </div>
          </div>

          {/* Orders Directives */}
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest text-center">
              YOUR ORDERS ARE SIMPLE:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded bg-[#06090e] border border-red-500/40 flex items-center space-x-3">
                <div className="p-2 rounded bg-red-500/10 text-red-400 shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest">ORDER 01</div>
                  <div className="text-sm sm:text-base font-extrabold text-white tracking-wider">TRACE THE INTRUDER.</div>
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#06090e] border border-cyan-500/40 flex items-center space-x-3">
                <div className="p-2 rounded bg-cyan-500/10 text-cyan-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">ORDER 02</div>
                  <div className="text-sm sm:text-base font-extrabold text-white tracking-wider">RECOVER THE STOLEN FILE.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mystery questions & Investigation note */}
          <div className="max-w-2xl mx-auto p-4 rounded-lg bg-[#06090e]/90 border border-slate-800 space-y-2.5 text-center">
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

          {/* Protocol Flow & Time Callout */}
          <div className="max-w-2xl mx-auto p-4 rounded-lg bg-[#06090e] border border-cyan-500/30 space-y-2.5 text-center">
            <div className="text-xs sm:text-sm font-black font-mono text-cyan-300 uppercase tracking-widest">
              READ → TRACE → DECODE → CONNECT
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Choose your language.
            </p>
            <div className="pt-1 flex items-center justify-center gap-3 font-mono">
              <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wider">
                40 MINUTES.
              </span>
              <span className="text-red-400 text-xs sm:text-sm font-black uppercase tracking-wider animate-pulse">
                THE INVESTIGATION BEGINS NOW.
              </span>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {partSession ? (
              <Link href="/mission">
                <CyberButton
                  variant="emerald"
                  size="lg"
                  className="shadow-[0_0_25px_rgba(16,185,129,0.4)] px-8 font-black tracking-wider"
                  icon={<ChevronRight className="w-5 h-5" />}
                >
                  CONTINUE INVESTIGATION // ENTER TERMINAL →
                </CyberButton>
              </Link>
            ) : adminSession ? (
              <Link href="/admin">
                <CyberButton
                  variant="amber"
                  size="lg"
                  className="shadow-[0_0_25px_rgba(245,158,11,0.4)] px-8 font-black tracking-wider"
                  icon={<ChevronRight className="w-5 h-5" />}
                >
                  ENTER COMMAND TOWER // ADMIN CONSOLE →
                </CyberButton>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <CyberButton
                    variant="cyan"
                    size="lg"
                    icon={<ChevronRight className="w-4 h-4" />}
                  >
                    INITIALIZE AGENT REGISTRATION
                  </CyberButton>
                </Link>
                <Link href="/login">
                  <CyberButton variant="secondary" size="lg">
                    OPERATIVE ACCESS LOGIN
                  </CyberButton>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Operational Intelligence Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TerminalCard title="FORMAT" glowColor="cyan">
            <div className="flex items-start space-x-3">
              <UserCheck className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">INDIVIDUAL AGENT</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Single operative deployment. 100–200 agents competing simultaneously on live telemetry.
                </p>
              </div>
            </div>
          </TerminalCard>

          <TerminalCard title="TIMEFRAME" glowColor="amber">
            <div className="flex items-start space-x-3">
              <Clock className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">30 – 45 MINUTES</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Strict server-authoritative countdown. Submissions permanently terminate upon deadline.
                </p>
              </div>
            </div>
          </TerminalCard>

          <TerminalCard title="EVIDENCE" glowColor="emerald">
            <div className="flex items-start space-x-3">
              <Code2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">CODE INVESTIGATION</h4>
                <p className="text-xs text-slate-400 mt-1">
                  You do not write programs. You trace logic, deconstruct algorithms, and recover tokens.
                </p>
              </div>
            </div>
          </TerminalCard>
        </div>

        {/* Rules of Engagement */}
        <TerminalCard
          title="RULES OF ENGAGEMENT // DIRECTIVES"
          subtitle="REV 2026.04"
          statusBadge={<Badge variant="amber">MANDATORY PROTOCOL</Badge>}
        >
          <div className="space-y-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-start space-x-3">
              <span className="text-cyan-400 font-bold">01.</span>
              <p>
                <strong className="text-slate-100">Zero Execution Environment:</strong> Operatives do not submit arbitrary code to run on the server. Your task is pure mental or scratchpad logic tracing.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-cyan-400 font-bold">02.</span>
              <p>
                <strong className="text-slate-100">Server Clock Authority:</strong> Your countdown begins the instant you initialize your mission. Refreshing or tampering with client device clocks has zero effect.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-cyan-400 font-bold">03.</span>
              <p>
                <strong className="text-slate-100">Audit Logging:</strong> Every attempt is permanently recorded in the forensic database. Scores prioritize accuracy, followed by lowest elapsed solve time in case of tie.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-cyan-400 font-bold">04.</span>
              <p>
                <strong className="text-slate-100">Integrity:</strong> Evidence fragments are dynamically retrieved. Any attempt to inspect client bundles for answer keys will fail as solutions reside strictly behind encrypted server vaults.
              </p>
            </div>
          </div>
        </TerminalCard>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-600 space-y-1">
          <p>CIPHER CODING // OPERATION ZERO DAY</p>
          <p>Next-Gen Cybersecurity Investigation Platform</p>
        </div>
      </div>
    </div>
  );
}
