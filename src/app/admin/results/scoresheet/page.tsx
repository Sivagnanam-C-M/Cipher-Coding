'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, Download, ArrowLeft, RotateCw } from 'lucide-react';

interface ResultRow {
  rank: number;
  id: string;
  name: string;
  college: string;
  score: number;
  completionTime: string;
}

export default function ScoreSheetPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch('/api/admin/results');
        const data = await res.json();
        if (res.ok) {
          setResults(data.results || []);
        }
      } catch (err) {
        console.error('Failed to load score sheet results', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  useEffect(() => {
    if (!loading && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('print') === 'true') {
        const timer = setTimeout(() => {
          window.print();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-mono text-amber-400">
        <RotateCw className="w-6 h-6 animate-spin mr-3" />
        <span>GENERATING OFFICIAL SCORE SHEET...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-black font-sans">
      {/* Top Action Toolbar (Hidden during Print) */}
      <div className="max-w-[900px] mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-lg shadow-lg print:hidden">
        <Link
          href="/admin/results"
          className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO ADMIN RESULTS</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-xs font-bold rounded shadow transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT / SAVE AS PDF</span>
          </button>

          <a
            href="/api/admin/results?format=html&download=true"
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-semibold rounded transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOWNLOAD HTML</span>
          </a>

          <a
            href="/api/admin/results?format=csv"
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-semibold rounded transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOWNLOAD CSV</span>
          </a>
        </div>
      </div>

      {/* Official Score Sheet Document Container */}
      <div className="max-w-[900px] mx-auto bg-white p-8 md:p-12 shadow-xl border border-slate-200 rounded print:shadow-none print:border-none print:p-0">
        {/* Document Header with Logos */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6 gap-4">
          <div className="w-[180px] flex items-center justify-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/veltech-logo.png"
              alt="Vel Tech High Tech"
              className="max-h-[75px] max-w-full object-contain"
            />
          </div>

          <div className="flex-1 text-center px-2">
            <h2 className="text-lg md:text-xl font-bold font-serif uppercase tracking-wide text-neutral-900 m-0">
              Cybersentinel 2K26 - WEBLICA
            </h2>
            <h1 className="text-2xl md:text-3xl font-extrabold font-serif tracking-wider text-black mt-1 m-0">
              Score Sheet
            </h1>
          </div>

          <div className="w-[100px] flex items-center justify-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cybersentinel-logo.png"
              alt="CyberSentinel 2K26"
              className="max-h-[75px] max-w-full object-contain"
            />
          </div>
        </div>

        {/* Results Table strictly with Position, Name, College, Mark, Time Taken */}
        <table className="w-full border-collapse border-[1.5px] border-black text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-100 border-b-[1.5px] border-black">
              <th className="border-[1.5px] border-black px-3 py-2.5 text-center font-bold uppercase w-[80px]">
                Position
              </th>
              <th className="border-[1.5px] border-black px-3 py-2.5 text-left font-bold uppercase">
                Name
              </th>
              <th className="border-[1.5px] border-black px-3 py-2.5 text-left font-bold uppercase">
                College
              </th>
              <th className="border-[1.5px] border-black px-3 py-2.5 text-center font-bold uppercase w-[90px]">
                Mark
              </th>
              <th className="border-[1.5px] border-black px-3 py-2.5 text-center font-bold uppercase w-[120px]">
                Time Taken
              </th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="border-[1.5px] border-black py-8 text-center text-slate-500 font-mono"
                >
                  No participants registered yet.
                </td>
              </tr>
            ) : (
              results.map((r) => (
                <tr key={r.id || r.rank} className="border-b border-black">
                  <td className="border-[1.5px] border-black px-3 py-2 text-center font-bold">
                    {r.rank}
                  </td>
                  <td className="border-[1.5px] border-black px-3 py-2 font-semibold text-slate-900">
                    {r.name}
                  </td>
                  <td className="border-[1.5px] border-black px-3 py-2 text-slate-800">
                    {r.college}
                  </td>
                  <td className="border-[1.5px] border-black px-3 py-2 text-center font-bold">
                    {r.score}
                  </td>
                  <td className="border-[1.5px] border-black px-3 py-2 text-center font-mono font-medium">
                    {r.completionTime}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
