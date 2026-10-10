'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw, Terminal } from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Production Runtime Error]:', error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto px-4 py-24 font-mono">
      <TerminalCard
        title="CRITICAL FAULT // EXCEPTION"
        subtitle="RUNTIME INTERRUPT"
        glowColor="crimson"
        statusBadge={<Badge variant="crimson">SYSTEM ERROR</Badge>}
      >
        <div className="text-center space-y-6 py-4">
          <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
            <AlertTriangle className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-white uppercase tracking-wider">
              SUBSYSTEM INTERRUPTED
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              A temporary anomaly was encountered while executing operatives directives. Your session and progress remain secure.
            </p>
            {error.digest && (
              <p className="text-[10px] text-slate-500 font-mono">
                Fault ID: {error.digest}
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <CyberButton
              variant="cyan"
              size="md"
              className="flex-1"
              onClick={() => reset()}
              icon={<RotateCw className="w-4 h-4" />}
            >
              RETRY OPERATION
            </CyberButton>
            <Link href="/mission" className="flex-1">
              <CyberButton
                variant="secondary"
                size="md"
                className="w-full"
                icon={<Terminal className="w-4 h-4" />}
              >
                RETURN HOME
              </CyberButton>
            </Link>
          </div>
        </div>
      </TerminalCard>
    </div>
  );
}
