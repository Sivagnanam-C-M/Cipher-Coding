'use client';

import React, { useState } from 'react';
import { Terminal, ShieldAlert } from 'lucide-react';

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
  const [warning, setWarning] = useState(false);

  const lines = code ? code.split('\n') : ['// No code captured'];

  const triggerWarning = () => {
    setWarning(true);
    setTimeout(() => setWarning(false), 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Intercept Ctrl+C / Cmd+C / Ctrl+A / Cmd+A
    if ((e.ctrlKey || e.metaKey) && ['c', 'C', 'a', 'A', 'x', 'X'].includes(e.key)) {
      e.preventDefault();
      triggerWarning();
    }
  };

  return (
    <div
      tabIndex={0}
      onContextMenu={(e) => {
        e.preventDefault();
        triggerWarning();
      }}
      onCopy={(e) => {
        e.preventDefault();
        triggerWarning();
      }}
      onCut={(e) => {
        e.preventDefault();
        triggerWarning();
      }}
      onDragStart={(e) => {
        e.preventDefault();
        triggerWarning();
      }}
      onKeyDown={handleKeyDown}
      className="rounded-lg border border-slate-800 bg-[#06090e] overflow-hidden font-mono text-sm shadow-inner relative select-none focus:outline-none"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {/* Dynamic Security Banner / Toast */}
      {warning && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-md bg-red-950/95 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] text-red-300 text-xs font-bold tracking-wider uppercase flex items-center space-x-2 animate-bounce">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>SECURITY PROTOCOL: CODE COPYING IS RESTRICTED</span>
        </div>
      )}

      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0f18] border-b border-slate-800/80 text-xs text-slate-400 select-none">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300 font-semibold">{filename}</span>
          <span className="text-slate-600">[{language}]</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-bold uppercase tracking-wider">
            COPY PROTECTED
          </span>
          <span className="text-[11px] text-slate-500 font-mono tracking-wider uppercase hidden sm:inline">
            MENTAL LOGIC TRACE
          </span>
        </div>
      </div>

      {/* Code Lines Display (Strictly Read-Only & Non-Selectable) */}
      <div
        className="p-4 overflow-x-auto select-none leading-relaxed"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
      >
        <table className="w-full border-collapse select-none">
          <tbody className="select-none">
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-800/20 transition-colors select-none">
                <td className="w-10 pr-4 text-right text-slate-600 select-none font-mono text-xs align-top pt-0.5 pointer-events-none">
                  {(idx + 1).toString().padStart(2, '0')}
                </td>
                <td
                  className="text-slate-200 whitespace-pre font-mono text-xs md:text-sm select-none"
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                  }}
                >
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
