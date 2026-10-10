'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
}

export function CodeViewer({
  code,
  language = 'python',
  filename = 'recovered_artifact.bin',
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const lines = code ? code.split('\n') : ['// No code captured'];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code to clipboard', err);
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-[#06090e] overflow-hidden font-mono text-sm shadow-inner">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0f18] border-b border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300 font-semibold">{filename}</span>
          <span className="text-slate-600">[{language}]</span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">COPIED</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">COPY</span>
            </>
          )}
        </button>
      </div>

      {/* Code Lines Display (Strictly Read-Only) */}
      <div className="p-4 overflow-x-auto select-text leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                <td className="w-10 pr-4 text-right text-slate-600 select-none font-mono text-xs align-top pt-0.5">
                  {(idx + 1).toString().padStart(2, '0')}
                </td>
                <td className="text-slate-200 whitespace-pre font-mono text-xs md:text-sm">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CodeViewer;
