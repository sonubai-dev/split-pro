import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastMessage } from '../types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl shadow-xl border backdrop-blur-md text-xs transition-all animate-in fade-in slide-in-from-bottom-2 ${
              isSuccess
                ? 'bg-zinc-900/95 text-zinc-100 border-emerald-500/40'
                : isError
                ? 'bg-zinc-900/95 text-zinc-100 border-rose-500/40'
                : isWarning
                ? 'bg-zinc-900/95 text-zinc-100 border-amber-500/40'
                : 'bg-zinc-900/95 text-zinc-100 border-zinc-700/80'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              {isWarning && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
              {!isSuccess && !isError && !isWarning && (
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              )}

              <div>
                <div className="font-semibold text-zinc-100">{toast.title}</div>
                {toast.description && (
                  <div className="text-zinc-400 text-[11px] mt-0.5">{toast.description}</div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
