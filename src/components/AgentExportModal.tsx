import React from 'react';
import { FileArchive, Film, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { PendingExportRequest } from '../agent/types';

interface AgentExportModalProps {
  request: PendingExportRequest | null;
  onAllow: () => void;
  onDecline: () => void;
  isExporting?: boolean;
}

export const AgentExportModal: React.FC<AgentExportModalProps> = ({
  request,
  onAllow,
  onDecline,
  isExporting = false,
}) => {
  if (!request) return null;

  const isVideo = request.type === 'video';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      aria-modal="true"
      role="alertdialog"
      aria-label="Confirm Agent Export"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] rounded-2xl shadow-2xl overflow-hidden p-6 text-gray-800 dark:text-[#E5E7EB] space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            {isVideo ? <Film className="w-5 h-5" /> : <FileArchive className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {isVideo ? 'Agent wants to export video' : 'Agent wants to export'}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                USER GESTURE
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isVideo ? (
                <>
                  An AI agent invoked <code className="text-blue-600 dark:text-blue-400 font-mono">render_video()</code>. Browser security policies require a direct user click to download video files.
                </>
              ) : (
                <>
                  An AI agent invoked <code className="text-blue-600 dark:text-blue-400 font-mono">export_zip()</code>. Browser security policies require a direct user click to download files.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Details Card */}
        <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#151D2C] border border-gray-200 dark:border-[#1F2937] text-xs font-mono space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Archive Target:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-200 truncate max-w-[200px]">
              {request.filename}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Panel Slices:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-200">
              {request.sliceCount} panels
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onDecline}
            disabled={isExporting}
            className="flex-1 min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] border border-gray-300 dark:border-[#374151] transition-colors disabled:opacity-50"
          >
            Decline
          </button>

          <button
            type="button"
            onClick={onAllow}
            disabled={isExporting}
            className="flex-1 min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Allow Export</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
