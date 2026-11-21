import React, { useState } from 'react';
import { usePwa } from '../lib/pwa';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export const PwaUpdateToast: React.FC = () => {
  const { isUpdateAvailable, applyUpdate } = usePwa();
  const [dismissed, setDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isUpdateAvailable || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    setIsUpdating(true);
    applyUpdate();
  };

  return (
    <aside
      aria-label="Application Update Notice"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 max-w-sm w-[calc(100vw-2.5rem)] p-4 rounded-2xl bg-white dark:bg-[#0F131C] border border-amber-500/40 dark:border-amber-500/50 shadow-2xl backdrop-blur-md flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-[#E05D26] flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-5 h-5 animate-pulse" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
          <span>New Studio Version Available</span>
        </h4>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
          Update to receive the latest carousel algorithms and speed improvements.
        </p>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-3.5 py-1.5 rounded-lg bg-[#E05D26] hover:bg-[#C94E1B] text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Updating...' : 'Update & Reload'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Later
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
        aria-label="Dismiss update notification"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
};
