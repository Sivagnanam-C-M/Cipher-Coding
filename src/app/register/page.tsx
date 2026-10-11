'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserPlus, Key, ArrowRight, AlertCircle, Copy, Check, Eye, EyeOff } from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';
import Badge from '@/components/ui/Badge';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    college: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredCode, setRegisteredCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);


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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete operative registration.');
      }

      setRegisteredCode(data.participantCode);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (registeredCode) {
      navigator.clipboard.writeText(registeredCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 font-mono">
      {registeredCode ? (
        <TerminalCard
          title="REGISTRATION SUCCESSFUL"
          subtitle="CREDENTIALS ISSUED"
          glowColor="emerald"
        >
          <div className="text-center space-y-6 py-4">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white uppercase">
                OPERATIVE CLEARANCE GRANTED
              </h3>
              <p className="text-xs text-slate-400">
                Your unique operative identification code has been assigned.
              </p>
            </div>

            {/* Unique Participant Code Display */}
            <div className="p-4 rounded bg-[#06090e] border border-emerald-500/40 space-y-2">
              <span className="text-[11px] text-slate-400 uppercase tracking-widest block">
                PARTICIPANT ID
              </span>
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-wider">
                  {registeredCode}
                </span>
                <button
                  onClick={copyCode}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Copy Participant ID"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded">
              ⚠️ Save your Participant ID. You will use this code or your email to log in to the investigation.
            </p>

            <Link href="/login" className="block">
              <CyberButton
                variant="emerald"
                size="md"
                className="w-full"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                PROCEED TO LOGIN
              </CyberButton>
            </Link>
          </div>
        </TerminalCard>
      ) : (
        <TerminalCard
          title="AGENT REGISTRATION"
          subtitle="OPERATION ZERO DAY"
          glowColor="cyan"
          statusBadge={<Badge variant="cyan">CLEARANCE LEVEL 1</Badge>}
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="flex items-start space-x-2 p-3 rounded bg-red-950/40 border border-red-500/50 text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 mb-1 tracking-wider uppercase font-semibold">
                FULL NAME
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Agent John Doe"
                className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 tracking-wider uppercase font-semibold">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="operative@cyber-division.edu"
                className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 tracking-wider uppercase font-semibold">
                COLLEGE / INSTITUTION
              </label>
              <input
                type="text"
                required
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                placeholder="Cyber Defense Institute of Technology"
                className="w-full px-3 py-2 bg-[#06090e] border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 tracking-wider uppercase font-semibold">
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>HIDE</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>VIEW PASSWORD</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 pr-10 bg-[#06090e] border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors p-1"
                  title={showPassword ? 'Hide password' : 'View password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 tracking-wider uppercase font-semibold">
                  CONFIRM PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>HIDE</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>VIEW PASSWORD</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 pr-10 bg-[#06090e] border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors p-1"
                  title={showConfirmPassword ? 'Hide password' : 'View password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <CyberButton
                type="submit"
                variant="cyan"
                size="md"
                className="w-full"
                isLoading={loading}
                icon={<UserPlus className="w-4 h-4" />}
              >
                GENERATE OPERATIVE CLEARANCE
              </CyberButton>
            </div>

            <div className="text-center pt-2 text-slate-400">
              Already have a clearance code?{' '}
              <Link href="/login" className="text-cyan-400 hover:underline">
                Login here
              </Link>
            </div>
          </form>
        </TerminalCard>
      )}
    </div>
  );
}
