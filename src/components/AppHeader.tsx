import React, { useState, useEffect } from 'react';
import { subscribeMcpBridgeStatus } from '../agent/tools';
import { isUserSuperAdmin } from '../lib/firebase';
import { usePwa } from '../lib/pwa';
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
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Home,
  LayoutDashboard,
  Film,
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
  user?: any;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenAdminPanel?: () => void;
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
  user,
  onOpenAuth,
  onSignOut,
  onOpenAdminPanel,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMcpBridgeLive, setIsMcpBridgeLive] = useState(false);
  const { canInstall, promptInstall } = usePwa();

  useEffect(() => {
    return subscribeMcpBridgeStatus((live) => setIsMcpBridgeLive(live));
  }, []);

  const isSuperAdmin = isUserSuperAdmin(user) || user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0B0E14]/95 backdrop-blur-md text-slate-800 dark:text-slate-100 select-none transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand mark Vistaro Studio */}
        <div
          id="app-logo-brand"
          onClick={() => (onNavigate ? onNavigate('home') : onGoHome?.())}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-7 h-7 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg flex items-center justify-center font-extrabold text-xs shadow-xs group-hover:scale-105 transition-transform tracking-tight">
            V
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tracking-tight text-slate-950 dark:text-white">
              Vistaro
            </span>
            <span className="text-[10px] font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              STUDIO
            </span>
          </div>
        </div>

        {/* Center: Precision Optical Segmented View Switcher */}
        {onNavigate && (
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800/70 text-xs font-medium">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currentView === 'home'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => onNavigate('slicer')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currentView === 'slicer'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Storyboard Slicer
            </button>
            <button
              type="button"
              onClick={() => onNavigate('video')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currentView === 'video'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Motion Video Studio
            </button>
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {currentView === 'slicer' && hasImage && (
            <>
              {/* Dedicated "Download All as Zip" button */}
              {batchCount && batchCount > 1 && onDownloadAllZip && (
                <button
                  id="btn-header-download-all-zip"
                  type="button"
                  onClick={onDownloadAllZip}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-[#E05D26] hover:bg-[#C94E1B] shadow-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  title={`Download all slices from all ${batchCount} images packaged into a single ZIP archive`}
                >
                  {isExporting ? (
                    <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-spin shrink-0" />
                  ) : (
                    <FileArchive className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                  )}
                  <span className="whitespace-nowrap font-medium">
                    {isExporting ? 'Packaging Zip...' : 'Download All as Zip'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono font-bold">
                    {batchCount}
                  </span>
                </button>
              )}

              <button
                id="btn-header-new-image"
                type="button"
                onClick={onNewImage}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                title="Add or upload another image"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline">
                  {batchCount && batchCount > 1 ? 'Add Image' : 'New Image'}
                </span>
              </button>

              {hasPanels && onExportAll && (!batchCount || batchCount <= 1) && (
                <button
                  id="btn-header-export-all"
                  type="button"
                  onClick={onExportAll}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-[#E05D26] hover:bg-[#C94E1B] shadow-xs transition-all active:scale-95 cursor-pointer"
                  title="Download all generated panels"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export All ZIP</span>
                </button>
              )}
            </>
          )}

          {/* PWA Install Trigger (Desktop Header) */}
          {canInstall && (
            <button
              id="btn-header-install-app"
              type="button"
              onClick={promptInstall}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-[#E05D26] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Install Vistaro to your desktop or device"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {currentView === 'home' && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-[#E05D26] hover:bg-[#C94E1B] shadow-xs transition-all cursor-pointer"
            >
              Get Started
            </button>
          )}

          {/* Recent Exports Trigger */}
          {onOpenRecentExports && (
            <button
              id="btn-header-recent"
              type="button"
              onClick={onOpenRecentExports}
              aria-label="Recent Exports"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
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
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
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
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* User Auth Section */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-slate-400/40 transition-all cursor-pointer"
                title={user.displayName || user.email || 'User Account'}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {isUserMenuOpen && (
                <div
                  onClick={() => setIsUserMenuOpen(false)}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#111827] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                >
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {user.displayName || 'Creator'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                    {isSuperAdmin && (
                      <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                        Super Admin
                      </span>
                    )}
                  </div>
                  {onOpenAdminPanel && (
                    <div className="py-1 border-b border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenAdminPanel();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer font-medium"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#E05D26]" />
                        <span>Admin Console</span>
                      </button>
                    </div>
                  )}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSignOut?.();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all active:scale-[0.98] cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )
          )}
          {/* Mobile Navigation Toggle */}
          {onNavigate && (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Mobile Menu"
              className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && onNavigate && (
        <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0B0E14]/95 backdrop-blur-md px-4 py-3 space-y-1 animate-in fade-in slide-in-from-top-1 shadow-lg">
          {canInstall && (
            <button
              type="button"
              onClick={() => {
                promptInstall();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#E05D26] hover:bg-[#C94E1B] transition-all cursor-pointer shadow-xs mb-2"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Install Vistaro to Home Screen</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onNavigate('home');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'home'
                ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onNavigate('dashboard');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onNavigate('slicer');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'slicer'
                ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Storyboard Slicer</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onNavigate('video');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'video'
                ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-950 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Motion Video Studio</span>
          </button>
          {onOpenAdminPanel && (
            <button
              type="button"
              onClick={() => {
                onOpenAdminPanel();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#E05D26] bg-[#E05D26]/10 hover:bg-[#E05D26]/20 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Console</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
