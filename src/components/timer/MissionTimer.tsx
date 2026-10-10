'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { formatTimeDisplay } from '@/lib/timer';

interface MissionTimerProps {
  expiresAt: string | null;
  serverTimestamp?: number;
  onExpire?: () => void;
  className?: string;
}

export function MissionTimer({
  expiresAt,
  serverTimestamp,
  onExpire,
  className = '',
}: MissionTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!expiresAt) return 0;
    const expiry = new Date(expiresAt).getTime();
    const now = serverTimestamp || Date.now();
    return Math.max(0, Math.floor((expiry - now) / 1000));
  });

  const [hasNotifiedExpiry, setHasNotifiedExpiry] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsRemaining(0);
      return;
    }

    const expiryTime = new Date(expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0 && !hasNotifiedExpiry) {
        setHasNotifiedExpiry(true);
        if (onExpire) {
          onExpire();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, hasNotifiedExpiry, onExpire]);

  const isCritical = secondsRemaining > 0 && secondsRemaining <= 300; // < 5 minutes
  const isWarning = secondsRemaining > 300 && secondsRemaining <= 600; // 5 - 10 minutes
  const isTerminated = secondsRemaining === 0 && Boolean(expiresAt);

  const formattedTime = formatTimeDisplay(secondsRemaining);

  return (
    <div
      className={`inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded border font-mono transition-all duration-300 ${
        isTerminated
          ? 'bg-red-950/40 border-red-800 text-red-400'
          : isCritical
          ? 'bg-red-950/40 border-red-500/80 text-red-400 animate-pulse shadow-crimson-glow'
          : isWarning
          ? 'bg-amber-950/40 border-amber-500/60 text-amber-400'
          : 'bg-slate-900/80 border-cyan-500/40 text-cyan-400'
      } ${className}`}
    >
      {isTerminated ? (
        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
      ) : (
        <Clock className={`w-4 h-4 shrink-0 ${isCritical ? 'animate-spin' : ''}`} />
      )}
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold leading-tight">
          {isTerminated ? 'STATUS' : 'TIME REMAINING'}
        </span>
        <span className="text-base font-bold tracking-wider leading-none">
          {isTerminated ? 'TERMINATED' : formattedTime}
        </span>
      </div>
    </div>
  );
}

export default MissionTimer;
