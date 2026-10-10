'use client';

import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Play,
  Pause,
  StopCircle,
  Save,
  AlertTriangle,
  RotateCw,
  Clock,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

export default function EventSettingsPage() {
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form State
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [progressionMode, setProgressionMode] = useState<'free' | 'sequential'>('free');
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(true);
  const [status, setStatus] = useState('registration_open');

  // Confirmation Modals
  const [endModalOpen, setEndModalOpen] = useState(false);

  const fetchEvent = async () => {
    try {
      const res = await fetch('/api/admin/event');
      const json = await res.json();
      if (res.ok && json.event) {
        setEventData(json.event);
        setDurationMinutes(json.event.durationMinutes || 40);
        setProgressionMode(json.event.progressionMode || 'free');
        setMaxAttempts(json.event.maxAttempts || 0);
        setLeaderboardEnabled(json.event.leaderboardEnabled ?? true);
        setStatus(json.event.status || 'registration_open');
      }
    } catch (err) {
      console.error('Failed to load event parameters', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, []);

  const handleSaveParameters = async (newStatus?: string) => {
    setSaving(true);
    setMessage(null);

    const payload: any = {
      durationMinutes,
      progressionMode,
      maxAttempts,
      leaderboardEnabled,
      status: newStatus || status,
    };

    try {
      const res = await fetch('/api/admin/event', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update event parameters');

      setMessage('Event configuration updated successfully.');
      if (newStatus) setStatus(newStatus);
      await fetchEvent();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEndEventConfirm = async () => {
    setEndModalOpen(false);
    await handleSaveParameters('ended');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] font-mono text-amber-400">
        <RotateCw className="w-6 h-6 animate-spin mr-3" />
        <span>LOADING EVENT PARAMETERS...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-mono">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-6 h-6 text-amber-400" />
            EVENT CONTROL & CONFIGURATION
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure duration, progression rules, attempt caps, and life-cycle states.
          </p>
        </div>

        <Badge variant={status === 'live' ? 'emerald' : status === 'ended' ? 'crimson' : 'cyan'}>
          CURRENT: {status.toUpperCase()}
        </Badge>
      </div>

      {message && (
        <div
          className={`p-3 rounded text-xs ${
            message.startsWith('Error')
              ? 'bg-red-950/40 border border-red-500/50 text-red-300'
              : 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-300'
          }`}
        >
          {message}
        </div>
      )}

      {/* Life Cycle State Controls */}
      <TerminalCard title="OPERATION LIFECYCLE CONTROLS" glowColor="amber">
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Control the overall state of <strong>OPERATION ZERO DAY</strong>.
          </p>

          <div className="flex flex-wrap gap-3">
            <CyberButton
              variant={status === 'registration_open' ? 'cyan' : 'secondary'}
              size="sm"
              onClick={() => handleSaveParameters('registration_open')}
              disabled={saving}
            >
              OPEN REGISTRATION
            </CyberButton>

            <CyberButton
              variant={status === 'live' ? 'emerald' : 'secondary'}
              size="sm"
              icon={<Play className="w-4 h-4 fill-current" />}
              onClick={() => handleSaveParameters('live')}
              disabled={saving}
            >
              COMMENCE EVENT (GO LIVE)
            </CyberButton>

            <CyberButton
              variant={status === 'paused' ? 'amber' : 'secondary'}
              size="sm"
              icon={<Pause className="w-4 h-4" />}
              onClick={() => handleSaveParameters('paused')}
              disabled={saving}
            >
              PAUSE SUBMISSIONS
            </CyberButton>

            <CyberButton
              variant={status === 'ended' ? 'crimson' : 'secondary'}
              size="sm"
              icon={<StopCircle className="w-4 h-4" />}
              onClick={() => setEndModalOpen(true)}
              disabled={saving}
            >
              TERMINATE EVENT
            </CyberButton>
          </div>
        </div>
      </TerminalCard>

      {/* Event Configuration Parameters */}
      <TerminalCard title="MISSION PARAMETERS" glowColor="cyan">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveParameters();
          }}
          className="space-y-6 text-xs"
        >
          {/* Duration in Minutes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-slate-200 uppercase font-semibold">
                EVENT DURATION (MINUTES)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[11px] text-slate-500">
                Recommended: 30, 40, or 45 minutes. Not hardcoded.
              </span>
            </div>

            {/* Max Attempts */}
            <div className="space-y-1.5">
              <label className="block text-slate-200 uppercase font-semibold">
                MAX ATTEMPTS PER QUESTION
              </label>
              <input
                type="number"
                min={0}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100 focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[11px] text-slate-500">
                Set to 0 for unlimited attempts.
              </span>
            </div>
          </div>

          {/* Progression Mode */}
          <div className="space-y-2">
            <label className="block text-slate-200 uppercase font-semibold">
              QUESTION PROGRESSION MODE
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setProgressionMode('free')}
                className={`p-4 rounded border text-left transition-colors ${
                  progressionMode === 'free'
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                    : 'border-slate-800 bg-[#06090e] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold uppercase mb-1">FREE ACCESS MODE (DEFAULT)</div>
                <div className="text-[11px] leading-relaxed">
                  Operatives can freely navigate and decipher any published question in any order.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setProgressionMode('sequential')}
                className={`p-4 rounded border text-left transition-colors ${
                  progressionMode === 'sequential'
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                    : 'border-slate-800 bg-[#06090e] text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold uppercase mb-1">SEQUENTIAL MODE</div>
                <div className="text-[11px] leading-relaxed">
                  Question N+1 only unlocks after Question N is successfully decoded.
                </div>
              </button>
            </div>
          </div>

          {/* Leaderboard Visibility Toggle */}
          <div className="flex items-center justify-between p-4 rounded bg-[#06090e] border border-slate-800">
            <div>
              <div className="font-semibold text-slate-200 uppercase">
                PUBLIC LEADERBOARD VISIBILITY
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Disable to restrict standings during the competition to heighten suspense.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLeaderboardEnabled(!leaderboardEnabled)}
              className="text-cyan-400 hover:text-cyan-300 p-1"
            >
              {leaderboardEnabled ? (
                <ToggleRight className="w-8 h-8 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-600" />
              )}
            </button>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <CyberButton
              type="submit"
              variant="cyan"
              size="md"
              isLoading={saving}
              icon={<Save className="w-4 h-4" />}
            >
              SAVE EVENT PARAMETERS
            </CyberButton>
          </div>
        </form>
      </TerminalCard>

      {/* Confirmation Modal for Terminating Event */}
      <Modal
        isOpen={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        title="CONFIRM EVENT TERMINATION"
        description="Are you sure you want to end OPERATION ZERO DAY? This will immediately lock all active participant sessions and permanently prevent further submissions."
        confirmLabel="TERMINATE EVENT"
        confirmVariant="crimson"
        onConfirm={handleEndEventConfirm}
      />
    </div>
  );
}
