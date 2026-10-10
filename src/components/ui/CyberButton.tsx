import React from 'react';
import { Loader2 } from 'lucide-react';

interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cyan' | 'emerald' | 'crimson' | 'secondary' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function CyberButton({
  variant = 'cyan',
  size = 'md',
  isLoading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: CyberButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-mono font-medium rounded transition-all duration-200 uppercase tracking-wider focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5',
  }[size];

  const variantClasses = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/20 hover:border-cyan-400 hover:shadow-cyan-glow active:scale-[0.98]',
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/20 hover:border-emerald-400 hover:shadow-emerald-glow active:scale-[0.98]',
    crimson: 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20 hover:border-red-400 hover:shadow-crimson-glow active:scale-[0.98]',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/50 hover:bg-amber-500/20 hover:border-amber-400 hover:shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)] active:scale-[0.98]',
    secondary: 'bg-slate-800/60 text-slate-300 border border-slate-700 hover:bg-slate-700/60 hover:text-white active:scale-[0.98]',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        icon && <span className="inline-flex shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
}

export default CyberButton;
