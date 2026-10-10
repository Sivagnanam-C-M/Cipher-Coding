'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Terminal, ShieldAlert, X } from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lines = code ? code.split('\n') : ['// No code captured'];

  const triggerWarning = useCallback(() => {
    setWarning(true);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      setWarning(false);
    }, 2500);
  }, []);

  // Intercept Ctrl+C / Cmd+C / Ctrl+X / Cmd+X / Ctrl+Insert at the window level (capture phase)
  useEffect(() => {
    const handleKeyDownCapture = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);

      // If user is inside an input/textarea, allow copying only if text is selected inside that input
      if (isInput) {
        const inputEl = activeEl as HTMLInputElement | HTMLTextAreaElement;
        const hasSelection =
          typeof inputEl.selectionStart === 'number' &&
          typeof inputEl.selectionEnd === 'number' &&
          inputEl.selectionStart !== inputEl.selectionEnd;
        if (hasSelection) {
          return; // Allow standard input selection copying
        }
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      // Intercept Ctrl+C, Cmd+C, Ctrl+Insert, Ctrl+X, Cmd+X, Ctrl+A outside inputs
      if (
        isCtrlOrMeta &&
        (key === 'c' ||
          key === 'x' ||
          key === 'a' ||
          e.code === 'KeyC' ||
          e.code === 'KeyX' ||
          e.code === 'KeyA' ||
          e.key === 'Insert')
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerWarning();
      }
    };

    const handleCopyCapture = (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);

      if (isInput) {
        const inputEl = activeEl as HTMLInputElement | HTMLTextAreaElement;
        const hasSelection =
          typeof inputEl.selectionStart === 'number' &&
          typeof inputEl.selectionEnd === 'number' &&
          inputEl.selectionStart !== inputEl.selectionEnd;
        if (hasSelection) return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '');
      }
      triggerWarning();
    };

    window.addEventListener('keydown', handleKeyDownCapture, true);
    window.addEventListener('copy', handleCopyCapture, true);
    window.addEventListener('cut', handleCopyCapture, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDownCapture, true);
      window.removeEventListener('copy', handleCopyCapture, true);
      window.removeEventListener('cut', handleCopyCapture, true);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [triggerWarning]);

  return (
    <>
      {/* Global Security Toast: Portaled directly to body to avoid container overflow clipping */}
      {mounted &&
        warning &&
        createPortal(
          <div
            role="alert"
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] max-w-[92vw] sm:max-w-lg w-auto px-4 py-3 rounded-lg bg-[#0c0507]/95 border border-red-500/80 shadow-[0_0_30px_rgba(239,68,68,0.5)] text-red-200 font-mono flex items-center space-x-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto"
          >
            <div className="p-1.5 rounded-md bg-red-500/20 border border-red-500/40 shrink-0">
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex flex-col text-left pr-2">
              <span className="text-[11px] font-bold tracking-wider text-red-400 uppercase">
                SECURITY PROTOCOL ACTIVATED
              </span>
              <span className="text-xs text-red-200/90 font-medium">
                Ctrl+C is restricted. Code deciphering requires mental trace.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setWarning(false)}
              className="p-1 rounded text-red-400/60 hover:text-red-200 hover:bg-red-950/60 transition-colors ml-auto shrink-0"
              aria-label="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>,
          document.body
        )}

      <div
        tabIndex={-1}
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
        className="rounded-lg border border-slate-800 bg-[#06090e] overflow-hidden font-mono text-sm shadow-inner relative select-none focus:outline-none"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
        }}
      >
        {/* Code Header Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0a0f18] border-b border-slate-800/80 text-xs text-slate-400 select-none">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300 font-semibold">{filename}</span>
          <span className="text-slate-600">[{language}]</span>
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
                  className="text-slate-200 whitespace-pre font-mono text-xs md:text-sm select-none pointer-events-none"
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
    </>
  );
}

export default CodeViewer;
