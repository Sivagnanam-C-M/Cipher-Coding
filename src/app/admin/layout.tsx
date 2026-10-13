'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  HelpCircle,
  Users,
  Trophy,
  Sliders,
  Shield,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navItems = [
    { label: 'DASHBOARD', href: '/admin', icon: LayoutDashboard },
    { label: 'QUESTIONS', href: '/admin/questions', icon: HelpCircle },
    { label: 'PARTICIPANTS', href: '/admin/participants', icon: Users },
    { label: 'RESULTS', href: '/admin/results', icon: Trophy },
    { label: 'EVENT SETTINGS', href: '/admin/events', icon: Sliders },
  ];

  return (
    <div className="min-h-screen bg-[#080c14] font-mono print:bg-white print:min-h-0">
      {/* Admin Subheader Navigation Bar */}
      <div className="bg-[#0b101c] border-b border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
              <Shield className="w-4 h-4" />
              <span>COMMAND & CONTROL // ADMIN</span>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-3 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:m-0 print:max-w-full">{children}</main>
    </div>
  );
}
