import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ShieldAlert,
  Terminal,
  LogIn,
  UserPlus,
  Lock,
  ChevronRight,
  FileText,
  Trophy,
  Cpu,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';
import { getParticipantSession, getAdminSession } from '@/lib/auth/session';

export const metadata = {
  title: 'Operative Access Gateway | Cipher Coding: Operation Zero Day',
  description: 'Identity verification required. Register or authenticate to enter Operation Zero Day.',
};

export default async function AccessGatewayPage() {
  const [partSession, adminSession] = await Promise.all([
    getParticipantSession(),
    getAdminSession(),
  ]);

  // If already authenticated, forward directly to mission or admin console
  if (partSession) {
    redirect('/mission');
  }
  if (adminSession) {
    redirect('/admin');
  }

  return (
    <div className="relative overflow-hidden py-10 md:py-16 font-mono">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 w-[400px] h-[250px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Gateway Header */}
        <div className="text-center space-y-4">
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

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse inline-block" />
            SECURE TERMINAL GATEWAY // IDENTITY VERIFICATION REQUIRED
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white uppercase terminal-glow-cyan">
              OPERATION ZERO DAY
            </h1>
            <p className="text-sm sm:text-base font-bold text-slate-400 tracking-wider">
              AUTHORIZATION LEVEL: RESTRICTED // PLEASE VERIFY IDENTITY
            </p>
          </div>

          <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
            All operatives must authenticate with an assigned Callsign or initialize registration before accessing the forensic challenge console.
          </p>
        </div>

        {/* Dual Primary Action Gateway Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OPTION 1: Registration Card */}
          <TerminalCard
            title="NEW OPERATIVE // REGISTRATION"
            subtitle="PROTOCOL: NEW_CALLSIGN"
            glowColor="cyan"
            statusBadge={<Badge variant="cyan">INITIALIZE</Badge>}
            className="flex flex-col justify-between border-cyan-500/40 hover:border-cyan-400 transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 w-fit text-cyan-400">
                <UserPlus className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  New Operative Registration
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 font-sans leading-relaxed">
                  First time joining Operation Zero Day? Register with your email and college credentials to obtain your unique cryptographic callsign (e.g. <span className="text-cyan-300 font-mono font-bold">CYB-7A42</span>).
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Instant unique Callsign allocation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Language preference selection (Python/Java/C/C++)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Takes less than 30 seconds</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link href="/register" className="block w-full">
                <CyberButton
                  variant="cyan"
                  size="lg"
                  className="w-full justify-center tracking-wider font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  INITIALIZE REGISTRATION →
                </CyberButton>
              </Link>
            </div>
          </TerminalCard>

          {/* OPTION 2: Login Card */}
          <TerminalCard
            title="RETURNING AGENT // AUTHENTICATION"
            subtitle="PROTOCOL: MISSION_LOGIN"
            glowColor="emerald"
            statusBadge={<Badge variant="emerald">ACTIVE ACCESS</Badge>}
            className="flex flex-col justify-between border-emerald-500/40 hover:border-emerald-400 transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 w-fit text-emerald-400">
                <LogIn className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Operative Access Login
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 font-sans leading-relaxed">
                  Already registered for the mission? Sign in with your assigned <span className="text-emerald-300 font-mono font-bold">Participant ID</span> or <span className="text-emerald-300 font-mono font-bold">Email</span> and password to launch your mission terminal.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Resume active mission countdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Preserve current solve progress and telemetry</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Encrypted HTTP-only session restoration</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link href="/login" className="block w-full">
                <CyberButton
                  variant="emerald"
                  size="lg"
                  className="w-full justify-center tracking-wider font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  icon={<Terminal className="w-4 h-4" />}
                >
                  ACCESS MISSION TERMINAL →
                </CyberButton>
              </Link>
            </div>
          </TerminalCard>
        </div>

        {/* Secondary Navigation & Briefing Callout */}
        <div className="p-4 rounded-lg bg-[#06090e]/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-3 text-slate-300">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">Need to review mission parameters?</span>
              <span className="text-slate-400">Read the incident breach story, investigation rules, and time constraints.</span>
            </div>
          </div>
          <Link href="/briefing">
            <CyberButton variant="secondary" size="sm" icon={<ChevronRight className="w-3.5 h-3.5" />}>
              VIEW INCIDENT BRIEFING
            </CyberButton>
          </Link>
        </div>

        {/* Command Tower & Leaderboard Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <Link href="/leaderboard" className="flex items-center space-x-1.5 hover:text-cyan-400 transition-colors">
              <Trophy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Public Live Leaderboard</span>
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/briefing" className="hover:text-slate-300 transition-colors">
              Rules of Engagement
            </Link>
          </div>

          <Link href="/admin/login" className="flex items-center space-x-1.5 text-amber-400/80 hover:text-amber-300 transition-colors">
            <Lock className="w-3.5 h-3.5" />
            <span>Command Staff Login →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
