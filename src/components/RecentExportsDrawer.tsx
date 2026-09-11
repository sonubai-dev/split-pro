import React from 'react';
import { X, Archive, Clock, Trash2, Download } from 'lucide-react';
import { RecentExport } from '../hooks/useRecentExports';

interface RecentExportsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recentExports: RecentExport[];
  onClear: () => void;
}

export const RecentExportsDrawer: React.FC<RecentExportsDrawerProps> = ({
  isOpen,
  onClose,
  recentExports,
  onClear,
}) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 dark:bg-black/60 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-80 sm:w-96 bg-white dark:bg-[#111827] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-[#1F2937] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#1F2937]">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Exports</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2937] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {recentExports.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#1F2937] flex items-center justify-center text-gray-400 dark:text-gray-500">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No recent exports</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ZIP files you download will appear here for quick reference.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExports.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-gray-200 dark:border-[#374151] bg-gray-50 dark:bg-[#1F2937]/50 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 shrink-0">
                        <Download className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate" title={item.filename}>
                          {item.filename}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>&bull;</span>
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-200 dark:bg-[#374151] text-gray-700 dark:text-gray-300">
                      {item.count} image(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {recentExports.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-[#1F2937] bg-gray-50 dark:bg-[#1F2937]/30">
            <button
              onClick={onClear}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          </div>
        )}
      </div>
    </>
  );
};
