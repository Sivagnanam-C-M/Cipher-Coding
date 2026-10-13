'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, Terminal, Trophy, User, LogOut, Lock, FileText } from 'lucide-react';
import CyberButton from './CyberButton';

interface UserState {
  authenticated: boolean;
  user: {
    id: string;
    name?: string;
    username?: string;
    email: string;
    participantCode?: string;
    role: 'participant' | 'admin';
  } | null;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<UserState>({ authenticated: false, user: null });
  const [loading, setLoading] = useState(true);

  const currentDomainRef = useRef<string | null>(null);

  const fetchAuth = useCallback(async (role?: string) => {
    const targetDomain = role || (pathname.startsWith('/admin') ? 'admin' : 'participant');
    const roleParam = `?role=${targetDomain}`;

    try {
      const res = await fetch(`/api/auth/me${roleParam}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAuth(data);
        if (data.authenticated && data.user) {
          currentDomainRef.current = data.user.role === 'admin' ? 'admin' : 'participant';
        } else {
          currentDomainRef.current = null;
        }
      } else {
        setAuth({ authenticated: false, user: null });
        currentDomainRef.current = null;
      }
    } catch {
      setAuth({ authenticated: false, user: null });
      currentDomainRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [pathname]);

  // Listen for instant client-side auth events
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setAuth(customEvent.detail);
        setLoading(false);
        if (customEvent.detail.authenticated && customEvent.detail.user) {
          currentDomainRef.current = customEvent.detail.user.role === 'admin' ? 'admin' : 'participant';
        } else {
          currentDomainRef.current = null;
        }
      } else {
        fetchAuth();
      }
    };

    window.addEventListener('auth-state-change', handleAuthChange);
    return () => window.removeEventListener('auth-state-change', handleAuthChange);
  }, [fetchAuth]);

  // Fetch or verify auth on route navigation
  useEffect(() => {
    const targetDomain = pathname.startsWith('/admin') ? 'admin' : 'participant';

    // Only skip redundant network queries if ALREADY confirmed authenticated in this exact domain
    if (auth.authenticated && currentDomainRef.current === targetDomain) {
      return;
    }

    fetchAuth(targetDomain);
  }, [pathname, auth.authenticated, fetchAuth]);

  const handleLogout = async () => {
    try {
      const targetRole =
        auth.user?.role || (pathname.startsWith('/admin') ? 'admin' : 'participant');
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetRole,
          participantCode: auth.user?.participantCode,
        }),
      });
      setAuth({ authenticated: false, user: null });
      currentDomainRef.current = null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth-state-change', {
            detail: { authenticated: false, user: null },
          })
        );
        window.location.href = targetRole === 'admin' ? '/admin/login' : '/login';
      }
    } catch (err) {
      console.error('Logout error', err);
      if (typeof window !== 'undefined') {
        window.location.href = pathname.startsWith('/admin') ? '/admin/login' : '/login';
      }
    }
  };

  const isMission = pathname.startsWith('/mission');
  const isAdmin = pathname.startsWith('/admin');

  return (
    <nav className="sticky top-0 z-40 bg-[#080c14]/90 backdrop-blur-md border-b border-slate-800 font-mono text-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href={
            auth.authenticated
              ? auth.user?.role === 'admin'
                ? '/admin'
                : '/mission'
              : '/'
          }
          className="flex items-center space-x-2.5 group"
        >
          <div className="relative w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/40 group-hover:border-cyan-400 group-hover:shadow-cyan-glow transition-all overflow-hidden flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Cipher Coding Emblem"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-widest text-slate-100 group-hover:text-cyan-400 transition-colors">
              CIPHER CODING
            </span>
            <span className="text-[10px] text-cyan-500/80 tracking-widest -mt-1">
              OPERATION ZERO DAY
            </span>
          </div>
        </Link>

        {/* Center / Navigation Links */}
        <div className="hidden md:flex items-center space-x-6 text-xs uppercase tracking-wider">
          <Link
            href="/mission"
            className={`flex items-center space-x-1.5 transition-colors ${
              isMission ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Mission</span>
          </Link>

          <Link
            href="/briefing"
            className={`flex items-center space-x-1.5 transition-colors ${
              pathname === '/briefing' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Briefing</span>
          </Link>

          {auth.user?.role === 'admin' && (
            <Link
              href="/leaderboard"
              className={`flex items-center space-x-1.5 transition-colors ${
                pathname === '/leaderboard' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Leaderboard</span>
            </Link>
          )}

          {auth.user?.role === 'admin' && (
            <Link
              href="/admin"
              className={`flex items-center space-x-1.5 text-amber-400 hover:text-amber-300 transition-colors ${
                isAdmin ? 'font-bold underline' : ''
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Admin Console</span>
            </Link>
          )}
        </div>

        {/* Auth / Profile Area */}
        <div className="flex items-center space-x-3">
          {auth.authenticated && auth.user ? (
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end text-xs">
                <span className="font-semibold text-slate-200">
                  {auth.user.participantCode || auth.user.username || auth.user.name}
                </span>
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider">
                  {auth.user.role === 'admin' ? 'SEC_OFFICER' : 'OPERATIVE'}
                </span>
              </div>
              <CyberButton
                variant="secondary"
                size="sm"
                onClick={handleLogout}
                icon={<LogOut className="w-3.5 h-3.5" />}
              >
                DISCONNECT
              </CyberButton>
            </div>
          ) : loading && (pathname.startsWith('/mission') || pathname.startsWith('/admin')) ? (
            <div className="h-8 w-24 rounded bg-slate-800/40 animate-pulse" />
          ) : pathname.startsWith('/admin') ? (
            <div className="flex items-center space-x-2">
              <Link href="/admin/login">
                <CyberButton variant="amber" size="sm">
                  ADMIN LOGIN
                </CyberButton>
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <CyberButton variant="secondary" size="sm">
                  LOGIN
                </CyberButton>
              </Link>
              <Link href="/register">
                <CyberButton variant="cyan" size="sm">
                  REGISTER
                </CyberButton>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
