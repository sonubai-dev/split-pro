import React from 'react';
import {
  Scissors,
  Moon,
  Sun,
  Keyboard,
  ShieldCheck,
  PlusCircle,
  Download,
} from 'lucide-react';

interface AppHeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onOpenShortcuts: () => void;
  hasImage: boolean;
  onNewImage: () => void;
  onExportAll?: () => void;
  hasPanels: boolean;
  onGoHome?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  theme,
  toggleTheme,
  onOpenShortcuts,
  hasImage,
  onNewImage,
  onExportAll,
  hasPanels,
  onGoHome,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] text-gray-800 dark:text-[#E5E7EB] select-none transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo & Brand matching Clean Minimalism design */}
        <div
          id="app-logo-brand"
          onClick={onGoHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-base shadow-sm shadow-blue-900/30 group-hover:bg-blue-500 transition-colors">
            S
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              SPLIT<span className="text-blue-600 dark:text-blue-500 underline underline-offset-4 decoration-2">PRO</span>
            </span>
            <span className="hidden sm:inline text-[9px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151]">
              Minimal
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {hasImage && (
            <>
              <button
                id="btn-header-new-image"
                onClick={onNewImage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-[#374151] transition-colors"
                title="Upload another image"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span className="hidden sm:inline">New Image</span>
              </button>

              {hasPanels && onExportAll && (
                <button
                  id="btn-header-export-all"
                  onClick={onExportAll}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-900/20 transition-all active:scale-95"
                  title="Download all generated panels"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export All ZIP</span>
                </button>
              )}
            </>
          )}

          {/* Keyboard Shortcuts Trigger */}
          <button
            id="btn-header-shortcuts"
            onClick={onOpenShortcuts}
            aria-label="Keyboard Shortcuts"
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2937] border border-transparent hover:border-gray-200 dark:hover:border-[#374151] transition-colors"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            id="btn-header-theme"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2937] border border-transparent hover:border-gray-200 dark:hover:border-[#374151] transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
