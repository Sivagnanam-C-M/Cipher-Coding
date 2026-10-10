import React from 'react';

interface TerminalCardProps {
  title?: string;
  subtitle?: string;
  statusBadge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'emerald' | 'amber' | 'crimson' | 'slate' | 'none';
}

export function TerminalCard({
  title,
  subtitle,
  statusBadge,
  children,
  className = '',
  glowColor = 'none',
}: TerminalCardProps) {
  const glowStyles = {
    cyan: 'border-cyan-500/40 shadow-cyan-glow',
    emerald: 'border-emerald-500/40 shadow-emerald-glow',
    amber: 'border-amber-500/40 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]',
    crimson: 'border-red-500/40 shadow-crimson-glow',
    slate: 'border-slate-800',
    none: 'border-slate-800',
  }[glowColor];

  return (
    <div
      className={`relative bg-[#0d1321]/90 backdrop-blur-md rounded-lg border ${glowStyles} overflow-hidden ${className}`}
    >
      {/* Terminal Title Bar */}
      {(title || statusBadge) && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#080c14]/90 border-b border-slate-800/80 font-mono text-xs">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1.5 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            {title && <span className="font-semibold text-slate-300 tracking-wider uppercase">{title}</span>}
            {subtitle && <span className="text-slate-500">[{subtitle}]</span>}
          </div>
          {statusBadge && <div>{statusBadge}</div>}
        </div>
      )}

      {/* Terminal Content */}
      <div className="p-5">{children}</div>
    </div>
  );
}

export default TerminalCard;
