import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigate?: (view: 'home' | 'dashboard' | 'slicer' | 'video') => void;
  onOpenAdminPanel?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenAdminPanel }) => {
  return (
    <footer
      id="app-footer"
      className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md py-8 px-4 sm:px-6 transition-colors"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        {/* Brand & required attribution: VistaroAI by SOLITA SOLUTIONS */}
        <div id="footer-brand" className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs shadow-xs">
            V
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              VistaroAI by SOLITA SOLUTIONS
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">·</span>
            <span>All image & video processing 100% local in your browser</span>
          </div>
        </div>

        {/* Quick navigation links & Admin trigger */}
        <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
          {onNavigate && (
            <nav className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => onNavigate('slicer')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Storyboard Slicer
              </button>
              <button
                type="button"
                onClick={() => onNavigate('video')}
                className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Motion Video Studio
              </button>
            </nav>
          )}

          {/* Discreet Admin Control in Footer */}
          {onOpenAdminPanel && (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
              <button
                id="btn-footer-admin"
                type="button"
                onClick={onOpenAdminPanel}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 font-medium"
                title="Super Admin Control (ssdd747346@gmail.com)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Admin</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
