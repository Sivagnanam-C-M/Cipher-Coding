'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Download, Printer, RotateCw, FileSpreadsheet } from 'lucide-react';
import TerminalCard from '@/components/ui/TerminalCard';
import CyberButton from '@/components/ui/CyberButton';

interface ResultRow {
  rank: number;
  id: string;
  participantCode: string;
  name: string;
  college: string;
  score: number;
  questionsSolved: number;
  elapsedSeconds: number;
  completionTime: string;
  status: string;
}

export default function AdminResultsPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    try {
      const res = await fetch('/api/admin/results');
      const data = await res.json();
      if (res.ok) {
        setResults(data.results || []);
      }
    } catch (err) {
      console.error('Failed to load results', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleExportCsv = () => {
    window.location.href = '/api/admin/results?format=csv';
  };

  const handleDownloadScoreSheet = () => {
    window.location.href = '/api/admin/results?format=html&download=true';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] font-mono text-amber-400">
        <RotateCw className="w-6 h-6 animate-spin mr-3" />
        <span>COMPILING FORENSIC RESULTS...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            FINAL COMPETITION RESULTS
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Official operational ranking and downloadable score sheet audit report.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/results/scoresheet?print=true">
            <CyberButton
              variant="amber"
              size="md"
              icon={<Printer className="w-4 h-4" />}
            >
              PRINT SCORE SHEET
            </CyberButton>
          </Link>

          <CyberButton
            variant="cyan"
            size="md"
            onClick={handleDownloadScoreSheet}
            icon={<Download className="w-4 h-4" />}
          >
            DOWNLOAD SCORE SHEET
          </CyberButton>

          <CyberButton
            variant="secondary"
            size="md"
            onClick={handleExportCsv}
            icon={<FileSpreadsheet className="w-4 h-4" />}
          >
            DOWNLOAD CSV
          </CyberButton>
        </div>
      </div>

      {/* Results Table strictly with Position, Name, College, Mark, Time Taken */}
      <TerminalCard glowColor="amber">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 text-center w-24">POSITION</th>
                <th className="py-3 px-4">NAME</th>
                <th className="py-3 px-4">COLLEGE</th>
                <th className="py-3 px-4 text-center w-28">MARK</th>
                <th className="py-3 px-4 text-right w-36">TIME TAKEN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No results available yet.
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.id || r.rank} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-center text-amber-400">
                      #{r.rank.toString().padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-semibold">
                      {r.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                      {r.college}
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-emerald-400">
                      {r.score} PTS
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300 font-mono">
                      {r.completionTime}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TerminalCard>
    </div>
  );
}
