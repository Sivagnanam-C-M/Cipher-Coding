import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/ui/Navbar';

export const metadata: Metadata = {
  title: 'CIPHER CODING — OPERATION ZERO DAY',
  description:
    'An individual cybersecurity-themed code-deciphering competition. Read the code, trace execution, uncover the truth.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080c14] text-slate-100 min-h-screen cyber-grid antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <Navbar />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </body>
    </html>
  );
}
