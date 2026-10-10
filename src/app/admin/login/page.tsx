'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me?role=admin', { cache: 'no-store' })
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
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Admin verification rejected');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth-state-change', {
            detail: {
              authenticated: true,
              user: data.user || { role: 'admin', username: 'admin' },
            },
          })
        );
      }

      router.push('/admin');
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
        title="COMMAND CONSOLE // RESTRICTED"
        subtitle="ADMIN AUTHORIZATION"
        glowColor="amber"
        statusBadge={<Badge variant="amber">SEC_OPS ONLY</Badge>}
      >
        <div className="mb-6 text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            OPERATION CONTROL TOWER
          </h2>
          <p className="text-xs text-slate-400">
            Authorized administrative personnel only. All access attempts logged.
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
              ADMIN USERNAME OR EMAIL
            </label>
            <input
              type="text"
              required
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              placeholder="admin"
              className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 tracking-wider uppercase font-semibold">
              SECURITY KEY / PASSWORD
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div className="pt-2">
            <CyberButton
              type="submit"
              variant="amber"
              size="md"
              className="w-full"
              isLoading={loading}
              icon={<Shield className="w-4 h-4" />}
            >
              ACCESS COMMAND CENTER
            </CyberButton>
          </div>

          <div className="pt-4 border-t border-slate-800 text-center">
            <Link
              href="/login"
              className="inline-flex items-center space-x-1.5 text-[11px] text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Participant Login</span>
            </Link>
          </div>
        </form>
      </TerminalCard>
    </div>
  );
}
