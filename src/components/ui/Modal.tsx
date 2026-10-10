'use client';

import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import CyberButton from './CyberButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: 'cyan' | 'emerald' | 'crimson' | 'amber';
  onConfirm?: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'CONFIRM',
  confirmVariant = 'cyan',
  onConfirm,
  isLoading = false,
  children,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0d1321] border border-slate-700 rounded-lg shadow-2xl overflow-hidden font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#080c14] border-b border-slate-800">
          <div className="flex items-center space-x-2 text-cyan-400">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold tracking-wider uppercase text-slate-200">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-sm text-slate-300">
          {description && <p className="mb-4 leading-relaxed">{description}</p>}
          {children}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-[#080c14] border-t border-slate-800">
          <CyberButton variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            CANCEL
          </CyberButton>
          {onConfirm && (
            <CyberButton
              variant={confirmVariant}
              size="sm"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmLabel}
            </CyberButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
