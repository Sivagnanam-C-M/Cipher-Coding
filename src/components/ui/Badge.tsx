import React from 'react';

interface BadgeProps {
  variant?: 'emerald' | 'cyan' | 'amber' | 'crimson' | 'slate';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = 'cyan',
  size = 'md',
  children,
  className = '',
}: BadgeProps) {
  const variantStyles = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    crimson: 'bg-red-500/15 text-red-400 border-red-500/30',
    slate: 'bg-slate-800 text-slate-400 border-slate-700',
  }[variant];

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono uppercase tracking-wider rounded border font-medium ${variantStyles} ${sizeStyles} ${className}`}
    >
      {children}
    </span>
  );
}

export default Badge;
