import React from 'react';
import { RefreshCw, XCircle } from 'lucide-react';
import { ProcessingProgress } from '../types';

interface ProcessingModalProps {
  progress: ProcessingProgress;
  onCancel: () => void;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({ progress, onCancel }) => {
  if (!progress.active) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-zinc-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-zinc-100">{progress.stage}</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Processing {progress.current} of {progress.total} panels
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">{progress.percentage}%</span>
        </div>

        {/* Real Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden border border-gray-200 dark:border-zinc-700/50">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150 rounded-full"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500">
          <span>Lossless native canvas slicing</span>
          {progress.cancellable && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
