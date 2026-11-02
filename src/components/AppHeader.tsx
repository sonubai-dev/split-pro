import React from 'react';
import {
  Scissors,
  Moon,
  Sun,
  Keyboard,
  ShieldCheck,
  PlusCircle,
  Download,
  FileArchive,
  Sparkles,
  History,
  Bot,
} from 'lucide-react';

interface AppHeaderProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onOpenShortcuts: () => void;
  onOpenRecentExports?: () => void;
  onOpenAgent?: () => void;
  isAgentPaused?: boolean;
  hasImage: boolean;
  batchCount?: number;
  onNewImage: () => void;
  onExportAll?: () => void;
  onDownloadAllZip?: () => void;
  isExporting?: boolean;
  hasPanels: boolean;
  onGoHome?: () => void;
  currentView?: 'home' | 'dashboard' | 'slicer' | 'video';
  onNavigate?: (view: 'home' | 'dashboard' | 'slicer' | 'video') => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  theme,
  toggleTheme,
  onOpenShortcuts,
  onOpenRecentExports,
  onOpenAgent,
  isAgentPaused = false,
  hasImage,
  batchCount,
  onNewImage,
  onExportAll,
  onDownloadAllZip,
  isExporting = false,
  hasPanels,
  onGoHome,
  currentView = 'home',
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-md text-slate-800 dark:text-[#E5E7EB] select-none transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand mark VistaroAI */}
        <div
          id="app-logo-brand"
          onClick={() => (onNavigate ? onNavigate('home') : onGoHome?.())}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg flex items-center justify-center font-extrabold text-sm shadow-sm group-hover:scale-105 transition-transform">
            V
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Vistaro<span className="text-violet-600 dark:text-violet-400">AI</span>
          </span>
        </div>

        {/* Center: Navigation Links */}
        {onNavigate && (
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentView === 'home'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentView === 'dashboard'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('slicer')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentView === 'slicer'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Storyboard Slicer
            </button>
            <button
              type="button"
              onClick={() => onNavigate('video')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentView === 'video'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Motion Video Studio
            </button>
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentView === 'slicer' && hasImage && (
            <>
              {/* Dedicated "Download All as Zip" button directly in header when multiple images are loaded */}
              {batchCount && batchCount > 1 && onDownloadAllZip && (
                <button
                  id="btn-header-download-all-zip"
                  type="button"
                  onClick={onDownloadAllZip}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-md text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-900/25 active:scale-95 transition-all disabled:opacity-50 ring-1 ring-purple-400/40"
                  title={`Download all slices from all ${batchCount} images packaged into a single ZIP archive`}
                >
                  {isExporting ? (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin shrink-0" />
                  ) : (
                    <FileArchive className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  )}
                  <span className="whitespace-nowrap font-medium">
                    {isExporting ? 'Packaging Zip...' : 'Download All as Zip'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-800/80 text-[10px] font-mono font-bold">
                    {batchCount}
                  </span>
                </button>
              )}

              <button
                id="btn-header-new-image"
                type="button"
                onClick={onNewImage}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-[#374151] transition-colors"
                title="Add or upload another image"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span className="hidden sm:inline">
                  {batchCount && batchCount > 1 ? 'Add Image' : 'New Image'}
                </span>
              </button>

              {hasPanels && onExportAll && (!batchCount || batchCount <= 1) && (
                <button
                  id="btn-header-export-all"
                  type="button"
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

          {currentView === 'home' && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-violet-600 hover:bg-violet-500 shadow-sm shadow-violet-900/20 transition-all cursor-pointer"
            >
              Get Started
            </button>
          )}

          {/* Agent Access Trigger */}
          {onOpenAgent && (
            <button
              id="btn-header-agent"
              type="button"
              onClick={onOpenAgent}
              aria-label="Agent Access"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors shadow-2xs"
              title="Open AI Agent Access Drawer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="font-semibold">Agent</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isAgentPaused ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </button>
          )}

          {/* Recent Exports Trigger */}
          {onOpenRecentExports && (
            <button
              id="btn-header-recent"
              type="button"
              onClick={onOpenRecentExports}
              aria-label="Recent Exports"
              className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2937] border border-transparent hover:border-gray-200 dark:hover:border-[#374151] transition-colors"
              title="Recent Exports"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          {/* Keyboard Shortcuts Trigger */}
          <button
            id="btn-header-shortcuts"
            type="button"
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
            type="button"
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
