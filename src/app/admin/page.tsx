'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Activity,
  CheckCircle2,
  Award,
  HelpCircle,
  Clock,
  ArrowRight,
  RotateCw,
  Radio,
} from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';

interface OverviewData {
  eventName: string;
  status: string;
  durationMinutes: number;
  progressionMode: string;
  leaderboardEnabled: boolean;
  maxAttempts: number;
  registeredCount: number;
  activeCount: number;
  completedCount: number;
  averageScore: number;
  totalQuestions: number;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
          window.location.href = '/admin/login';
        }
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setData(json.overview);
      }
    } catch (err) {
      console.error('Error fetching admin overview', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] font-mono text-amber-400">
        <RotateCw className="w-6 h-6 animate-spin mr-3" />
        <span>AGGREGATING COMMAND TELEMETRY...</span>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'live':
        return 'emerald';
      case 'paused':
        return 'amber';
      case 'ended':
        return 'crimson';
      default:
        return 'cyan';
    }
  };

  return (
    <div className="space-y-8 font-mono">
      {/* Title & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider">
              {data?.eventName || 'OPERATION ZERO DAY'}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time competition telemetry and mission supervision console.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Badge
            variant={getStatusBadgeVariant(data?.status || 'draft')}
            size="md"
            className="text-sm px-3 py-1 font-bold"
          >
            STATUS: {(data?.status || 'UNKNOWN').toUpperCase()}
          </Badge>
          <Link href="/admin/events">
            <CyberButton variant="amber" size="sm">
              EVENT CONTROLS
            </CyberButton>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <TerminalCard glowColor="cyan">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              REGISTERED
            </div>
            <div className="text-2xl font-extrabold text-white">
              {data?.registeredCount ?? 0}
            </div>
          </div>
        </TerminalCard>

        <TerminalCard glowColor="emerald">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              ACTIVE
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">
              {data?.activeCount ?? 0}
            </div>
          </div>
        </TerminalCard>

        <TerminalCard glowColor="cyan">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              COMPLETED
            </div>
            <div className="text-2xl font-extrabold text-cyan-400">
              {data?.completedCount ?? 0}
            </div>
          </div>
        </TerminalCard>

        <TerminalCard glowColor="amber">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              AVG SCORE
            </div>
            <div className="text-2xl font-extrabold text-amber-400">
              {data?.averageScore ?? 0}
            </div>
          </div>
        </TerminalCard>

        <TerminalCard glowColor="cyan">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              QUESTIONS
            </div>
            <div className="text-2xl font-extrabold text-white">
              {data?.totalQuestions ?? 0}
            </div>
          </div>
        </TerminalCard>

        <TerminalCard glowColor="slate">
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              DURATION
            </div>
            <div className="text-2xl font-extrabold text-slate-200">
              {data?.durationMinutes ?? 40}m
            </div>
          </div>
        </TerminalCard>
      </div>

      {/* Operational Modules Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TerminalCard
          title="QUESTION REPOSITORY"
          subtitle="CONTENT VAULT"
          glowColor="cyan"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Create, edit, publish, and order code-deciphering challenges without touching source code.
            </p>
            <Link href="/admin/questions" className="block">
              <CyberButton
                variant="cyan"
                size="sm"
                className="w-full"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                MANAGE QUESTIONS
              </CyberButton>
            </Link>
          </div>
        </TerminalCard>

        <TerminalCard
          title="PARTICIPANT MONITOR"
          subtitle="AGENT ROSTER"
          glowColor="emerald"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Track live participant scores, submission attempts, session timings, and institutional affiliations.
            </p>
            <Link href="/admin/participants" className="block">
              <CyberButton
                variant="emerald"
                size="sm"
                className="w-full"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                SUPERVISE AGENTS
              </CyberButton>
            </Link>
          </div>
        </TerminalCard>

        <TerminalCard
          title="RESULTS & EXPORT"
          subtitle="FINAL STANDINGS"
          glowColor="amber"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Review final leaderboard rankings, inspect elapsed completion times, and export forensic CSV reports.
            </p>
            <Link href="/admin/results" className="block">
              <CyberButton
                variant="amber"
                size="sm"
                className="w-full"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                VIEW RESULTS & EXPORT CSV
              </CyberButton>
            </Link>
          </div>
        </TerminalCard>
      </div>
    </div>
  );
}
