import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Terminal } from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 font-mono">
      <TerminalCard
        title="SIGNAL LOST // 404"
        subtitle="SECTOR NOT FOUND"
        glowColor="crimson"
        statusBadge={<Badge variant="crimson">UNMAPPED</Badge>}
      >
        <div className="text-center space-y-6 py-4">
          <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">
            <ShieldAlert className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-white uppercase tracking-wider">
              TRANSMISSION TERMINATED
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              The requested grid coordinate or evidence fragment does not exist in the active operation registry.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link href="/mission" className="flex-1">
              <CyberButton
                variant="cyan"
                size="md"
                className="w-full"
                icon={<Terminal className="w-4 h-4" />}
              >
                RETURN TO MISSION
              </CyberButton>
            </Link>
            <Link href="/" className="flex-1">
              <CyberButton
                variant="secondary"
                size="md"
                className="w-full"
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                GRID HOME
              </CyberButton>
            </Link>
          </div>
        </div>
      </TerminalCard>
    </div>
  );
}
