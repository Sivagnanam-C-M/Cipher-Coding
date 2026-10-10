'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Key, AlertCircle, ShieldAlert } from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          if (data.user.role === 'admin') {
            router.replace('/admin');
          } else {
            router.replace('/mission');
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth-state-change', {
            detail: {
              authenticated: true,
              user: data.user,
            },
          })
        );
      }

      // Redirect according to user role
      if (data.redirectTo) {
        router.push(data.redirectTo);
      } else if (data.user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/mission');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 font-mono">
      <TerminalCard
        title="OPERATIVE AUTHENTICATION"
        subtitle="STATION ACCESS"
        glowColor="cyan"
        statusBadge={<Badge variant="cyan">SECURE LOGIN</Badge>}
      >
        <div className="mb-6 text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            OPERATION ZERO DAY
          </h2>
          <p className="text-xs text-slate-400">
            Enter your Participant ID (e.g. CYB-7A42) or registered email.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="flex items-start space-x-2 p-3 rounded bg-red-950/40 border border-red-500/50 text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 mb-1 tracking-wider uppercase font-semibold">
              PARTICIPANT ID OR EMAIL
            </label>
            <input
              type="text"
              required
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              placeholder="CYB-7A42 or operative@college.edu"
              className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 tracking-wider uppercase font-semibold">
              PASSPHRASE
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <div className="pt-2">
            <CyberButton
              type="submit"
              variant="cyan"
              size="md"
              className="w-full"
              isLoading={loading}
              icon={<LogIn className="w-4 h-4" />}
            >
              AUTHENTICATE AGENT
            </CyberButton>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            <Link href="/register" className="hover:text-cyan-400 transition-colors">
              New agent? Register here
            </Link>
            <Link href="/admin/login" className="text-amber-500 hover:text-amber-400 transition-colors">
              Admin Terminal →
            </Link>
          </div>
        </form>
      </TerminalCard>
    </div>
  );
}
