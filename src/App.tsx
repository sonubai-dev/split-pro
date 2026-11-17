import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Scissors, PlusCircle } from 'lucide-react';
import { AppHeader } from './components/AppHeader';
import { LandingPage } from './components/LandingPage';
import { ToastContainer } from './components/ToastContainer';

// Lazy-loaded Views and Modals to reduce initial bundle from 2.2MB to < 180kB
const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));
const MotionVideoStudio = lazy(() =>
  import('./components/MotionVideoStudio').then((m) => ({ default: m.MotionVideoStudio }))
);
const EditorWorkspace = lazy(() =>
  import('./components/EditorWorkspace').then((m) => ({ default: m.EditorWorkspace }))
);
const ProcessingModal = lazy(() =>
  import('./components/ProcessingModal').then((m) => ({ default: m.ProcessingModal }))
);
const LargeImageModal = lazy(() =>
  import('./components/LargeImageModal').then((m) => ({ default: m.LargeImageModal }))
);
const KeyboardShortcutsModal = lazy(() =>
  import('./components/KeyboardShortcutsModal').then((m) => ({ default: m.KeyboardShortcutsModal }))
);
const RecentExportsDrawer = lazy(() =>
  import('./components/RecentExportsDrawer').then((m) => ({ default: m.RecentExportsDrawer }))
);
const AgentDrawer = lazy(() => import('./components/AgentDrawer').then((m) => ({ default: m.AgentDrawer })));
const AgentExportModal = lazy(() =>
  import('./components/AgentExportModal').then((m) => ({ default: m.AgentExportModal }))
);
const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));

const ViewLoadingFallback: React.FC = () => (
  <div className="flex-1 flex items-center justify-center min-h-[60vh] bg-white dark:bg-[#0B0F17]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Loading Studio View...</span>
    </div>
  </div>
);
import { useAuth } from './hooks/useAuth';
import { useImageLoader } from './hooks/useImageLoader';
import { useEditorHistory, DEFAULT_SETTINGS } from './hooks/useEditorHistory';
import { useToast } from './hooks/useToast';
import { useRecentExports } from './hooks/useRecentExports';
import { ProcessingProgress, BatchImageResult } from './types';
import { calculateSlices, generatePanelOutputs } from './lib/imageEngine';
import { createAndDownloadBatchZip } from './lib/exportUtils';
import {
  connectAgentBridge,
  disconnectAgentBridge,
  initializeWebMcpTools,
  setPendingExport,
  subscribeAgentState,
} from './agent/tools';
import { PendingExportRequest } from './agent/types';

export default function App() {
  // Theme management with localStorage persistence (defaults to light mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('precision_split_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Keep dark class synced on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('precision_split_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Toast system
  const { toasts, addToast, removeToast } = useToast();

  // Auth state & Firebase integration
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const {
    user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword: authResetPassword,
    logOut,
  } = useAuth();

  // Modal states
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isRecentExportsOpen, setIsRecentExportsOpen] = useState(false);
  const { recentExports, addRecentExport, clearRecentExports } = useRecentExports();
  
  // View routing: 'home' | 'dashboard' | 'slicer' | 'video'
  const [currentView, setCurrentView] = useState<'home' | 'dashboard' | 'slicer' | 'video'>('home');
  
  // Agent Access layer state
  const [isAgentDrawerOpen, setIsAgentDrawerOpen] = useState(false);
  const [isAgentPaused, setIsAgentPaused] = useState(false);
  const [pendingAgentExport, setPendingAgentExport] = useState<PendingExportRequest | null>(null);
  const [agentHighlight, setAgentHighlight] = useState<string | null>(null);
  const workspaceBridgeRef = useRef<{
    getSlices: () => any[];
    getPanels: () => any[];
    reorderPanels: (newOrder: number[]) => void;
    renamePanel: (index: number, newName: string) => void;
    downloadZip: () => Promise<void>;
  } | null>(null);

  const [progress, setProgress] = useState<ProcessingProgress>({
    active: false,
    current: 0,
    total: 0,
    percentage: 0,
    stage: '',
    cancellable: true,
  });

  // Editor settings & history
  const {
    settings,
    updateSettings,
    undo,
    redo,
    resetSettings,
    canUndo,
    canRedo,
  } = useEditorHistory(DEFAULT_SETTINGS);

  // Image loading hook with automatic 4K Ultra-HD Enhancement activation
  const {
    image,
    images,
    activeImageIndex,
    setActiveImageIndex,
    isLoading,
    error,
    isLargeImageWarning,
    pendingDimensions,
    loadImageFromFile,
    loadImagesFromFiles,
    removeImageAtIndex,
    loadImageFromUrl,
    acceptLargeImage,
    resizeAndAcceptLargeImage,
    clearImage,
    setError,
  } = useImageLoader((loaded, totalCount) => {
    // Automatically configure 8K Ultra-HD Crystal Clear Quality Enhancement on upload
    updateSettings({
      enhanceTo8K: true,
      enhanceTo4K: false,
      resolutionMode: '8k',
      upscaleTarget: 'panel',
      storyboardEnhance: true,
      progressiveUpscale: true,
      sharpnessBoost: true,
      sharpnessLevel: 'studio8k',
      clarityBoost: true,
      contrast: 105,
      quality: 100,
      outputFormat: 'png',
    });
    const batchSummary = (totalCount && totalCount > 1)
      ? `Batch of ${totalCount} images loaded!`
      : `${loaded.name} (${loaded.width} × ${loaded.height} px)`;
    addToast(
      '8K Crystal Clear Master Active',
      `${batchSummary} — Slices will be enhanced up to 8K Ultra-HD (7680px) with Studio 8K razor-sharp clarity and zero blur.`,
      'success'
    );
  });

  // Show error toast if any occurs during upload
  useEffect(() => {
    if (error) {
      addToast('Upload Failed', error, 'error');
    }
  }, [error, addToast]);

  // Global Clipboard paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        const imageFiles = Array.from(e.clipboardData.files).filter((f) =>
          f.type.startsWith('image/')
        );
        if (imageFiles.length > 0) {
          e.preventDefault();
          loadImagesFromFiles(imageFiles);
          addToast('Pasted Image(s)', `${imageFiles.length} image(s) loaded from clipboard`, 'info');
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [loadImagesFromFiles, addToast]);

  // Hidden file input for header "New Image" trigger or keyboard shortcuts
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerUpload = () => {
    hiddenFileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadImagesFromFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handlePasteRequested = async () => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], 'pasted_image.png', { type: imageType });
            loadImageFromFile(file);
            addToast('Pasted from Clipboard', 'Image loaded successfully.', 'success');
            return;
          }
        }
        addToast('No Image Found', 'No image data detected in your clipboard.', 'warning');
      } else {
        addToast('Use Shortcut', 'Press Ctrl+V / Cmd+V to paste your image.', 'info');
      }
    } catch (e) {
      addToast('Paste Shortcut', 'Press Ctrl+V or Cmd+V anywhere to paste.', 'info');
    }
  };

  // State & handler for batch exporting all slices of all loaded images into a single ZIP archive
  const [isExporting, setIsExporting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleBatchExportZip = useCallback(async () => {
    const listToProcess = images && images.length > 0 ? images : (image ? [image] : []);
    if (listToProcess.length === 0) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsExporting(true);

    const totalImages = listToProcess.length;
    const batchOutputs: BatchImageResult[] = [];
    const is8K = settings.enhanceTo8K || settings.resolutionMode === '8k';
    const is4K = !is8K && (settings.enhanceTo4K || settings.resolutionMode === '4k');
    const resLabel = is8K ? '8K Ultra-HD' : is4K ? '4K Ultra-HD' : 'native';

    try {
      for (let imgIndex = 0; imgIndex < totalImages; imgIndex++) {
        if (controller.signal.aborted) {
          throw new Error('Batch processing cancelled by user.');
        }

        const currentImg = listToProcess[imgIndex];
        const imgSlices = calculateSlices(currentImg.width, currentImg.height, settings);

        setProgress({
          active: true,
          current: imgIndex + 1,
          total: totalImages,
          percentage: Math.round((imgIndex / totalImages) * 100),
          stage: `Processing image ${imgIndex + 1} of ${totalImages}: "${currentImg.name}" (${imgSlices.length} slices, ${resLabel})...`,
          cancellable: true,
        });

        const renderedPanels = await generatePanelOutputs(
          currentImg,
          imgSlices,
          settings,
          (prog) => {
            const currentImgFraction = (prog.percentage || 0) / 100;
            const overallPercentage = Math.min(
              94,
              Math.round(((imgIndex + currentImgFraction) / totalImages) * 100)
            );
            setProgress((prev) => ({
              ...prev,
              percentage: overallPercentage,
            }));
          },
          controller.signal
        );

        batchOutputs.push({
          imageName: currentImg.name,
          panels: renderedPanels,
        });
      }

      // Final ZIP packaging into a single unified archive
      setProgress({
        active: true,
        current: totalImages,
        total: totalImages,
        percentage: 95,
        stage: `Packaging all slices from ${totalImages} images into a single ZIP archive...`,
        cancellable: false,
      });

      const zipBase = settings.namingPrefix?.trim() || 'all_slices_batch_export';
      const zipName = zipBase.endsWith('.zip') ? zipBase : `${zipBase}.zip`;

      await createAndDownloadBatchZip(batchOutputs, zipName, (percent) => {
        setProgress((prev) => ({
          ...prev,
          percentage: 95 + Math.round(percent * 0.05),
        }));
      });

      setIsExporting(false);
      setProgress((prev) => ({ ...prev, active: false }));
      const totalSlices = batchOutputs.reduce((acc, item) => acc + item.panels.length, 0);
      addToast(
        'Batch Export Complete',
        `Successfully saved ${totalSlices} slices from ${totalImages} images into "${zipName}".`,
        'success'
      );
      addRecentExport({
        filename: zipName,
        count: totalSlices,
        resolution: resLabel,
        mode: settings.splitMode,
        slices: batchOutputs.flatMap((b) => b.panels).slice(0, 9).map((p) => ({
          index: p.index,
          name: p.filename,
          width: p.outputWidth,
          height: p.outputHeight,
        })),
      });
    } catch (err: any) {
      setIsExporting(false);
      setProgress((prev) => ({ ...prev, active: false }));
      if (err?.message !== 'Batch processing cancelled by user.') {
        addToast('Batch Export Failed', err?.message || 'Could not export batch.', 'error');
      } else {
        addToast('Export Cancelled', 'Batch processing was cancelled.', 'info');
      }
    }
  }, [images, image, settings, setProgress, addToast]);

  // Initialize WebMCP tools and listen for agent state changes
  useEffect(() => {
    initializeWebMcpTools();
    const unsubscribe = subscribeAgentState((agState) => {
      setIsAgentPaused(agState.isPaused);
      setPendingAgentExport(agState.pendingExportRequest);
    });
    return unsubscribe;
  }, []);

  // Connect active React application state to the agent bridge
  useEffect(() => {
    connectAgentBridge({
      loadImageFromUrl: async (url: string) => {
        const cleanName = url.split('/').pop()?.split('?')[0] || 'remote_image.png';
        await loadImageFromUrl(url, cleanName);
      },
      loadImageFromClipboard: async () => {
        await handlePasteRequested();
      },
      triggerFilePicker: () => {
        handleTriggerUpload();
      },
      getImageInfo: () => {
        if (!image) return null;
        return {
          name: image.name,
          width: image.width,
          height: image.height,
          size: image.size,
          type: image.type || 'image/png',
          aspectRatio: (image.width / image.height).toFixed(3),
        };
      },
      getSettings: () => settings,
      updateSettings: (updater: any) => {
        updateSettings(updater, true);
      },
      undo: () => {
        if (canUndo) undo();
      },
      redo: () => {
        if (canRedo) redo();
      },
      reset: () => {
        resetSettings();
      },
      getSlices: () => {
        if (workspaceBridgeRef.current?.getSlices) {
          return workspaceBridgeRef.current.getSlices();
        }
        if (image) {
          return calculateSlices(image.width, image.height, settings);
        }
        return [];
      },
      getGeneratedPanels: () => {
        return workspaceBridgeRef.current?.getPanels() || [];
      },
      reorderPanels: (newOrder: number[]) => {
        workspaceBridgeRef.current?.reorderPanels(newOrder);
      },
      renamePanel: (index: number, newName: string) => {
        workspaceBridgeRef.current?.renamePanel(index, newName);
      },
      triggerExportZip: async () => {
        if (workspaceBridgeRef.current?.downloadZip) {
          await workspaceBridgeRef.current.downloadZip();
        } else {
          await handleBatchExportZip();
        }
      },
      captureCanvasPreview: async () => {
        if (!image?.url) return null;
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = image.url;
          });
          const maxDim = 800;
          const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
          const w = Math.round(img.naturalWidth * scale);
          const h = Math.round(img.naturalHeight * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(img, 0, 0, w, h);
          const slices = calculateSlices(image.width, image.height, settings);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          for (const slice of slices) {
            ctx.strokeRect(
              slice.sourceX * scale,
              slice.sourceY * scale,
              slice.sourceWidth * scale,
              slice.sourceHeight * scale
            );
          }
          return canvas.toDataURL('image/jpeg', 0.82);
        } catch (err) {
          console.warn('[Vistaro Agent] captureCanvasPreview error:', err);
          return null;
        }
      },
      openVideoDrawer: () => {
        workspaceBridgeRef.current?.openVideoDrawer?.();
      },
      closeVideoDrawer: () => {
        workspaceBridgeRef.current?.closeVideoDrawer?.();
      },
      getVideoSettings: () => {
        return workspaceBridgeRef.current?.getVideoSettings?.();
      },
      updateVideoSettings: (updates) => {
        workspaceBridgeRef.current?.updateVideoSettings?.(updates);
      },
      applyVideoPreset: (presetName) => {
        workspaceBridgeRef.current?.applyVideoPreset?.(presetName);
      },
      setSlideMotion: (args) => {
        workspaceBridgeRef.current?.setSlideMotion?.(args);
      },
      setSlideCaption: (args) => {
        workspaceBridgeRef.current?.setSlideCaption?.(args);
      },
      previewVideo: (args) => {
        workspaceBridgeRef.current?.previewVideo?.(args);
      },
      triggerRenderVideo: async () => {
        if (workspaceBridgeRef.current?.triggerRenderVideo) {
          await workspaceBridgeRef.current.triggerRenderVideo();
        }
      },
      cancelRenderVideo: () => {
        workspaceBridgeRef.current?.cancelRenderVideo?.();
      },
      isRenderingVideo: () => {
        return Boolean(workspaceBridgeRef.current?.isRenderingVideo?.());
      },
      showToast: (title, desc, type) => {
        addToast(title, desc, type);
      },
      setHighlight: (target: string | null) => {
        setAgentHighlight(target);
      },
    });

    return () => {
      disconnectAgentBridge();
    };
  }, [
    image,
    settings,
    canUndo,
    canRedo,
    undo,
    redo,
    resetSettings,
    updateSettings,
    loadImageFromUrl,
    handleBatchExportZip,
    addToast,
  ]);

  const handleAllowAgentExport = async () => {
    const isVideo = pendingAgentExport?.type === 'video';
    setPendingAgentExport(null);
    setPendingExport(null);
    if (isVideo) {
      if (workspaceBridgeRef.current?.triggerRenderVideo) {
        await workspaceBridgeRef.current.triggerRenderVideo();
      }
    } else {
      if (workspaceBridgeRef.current?.downloadZip) {
        await workspaceBridgeRef.current.downloadZip();
      } else {
        await handleBatchExportZip();
      }
    }
  };

  const handleDeclineAgentExport = () => {
    setPendingAgentExport(null);
    setPendingExport(null);
    addToast('Export Cancelled', 'Human user declined the agent export request.', 'info');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors selection:bg-emerald-500 selection:text-white">
      {/* Hidden file input for programmatically opening file picker */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/jpg, image/avif"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Main Header with multi-view navigation & agent access */}
      <AppHeader
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenRecentExports={() => setIsRecentExportsOpen(true)}
        onOpenAgent={() => setIsAgentDrawerOpen(true)}
        isAgentPaused={isAgentPaused}
        hasImage={!!image}
        batchCount={images.length}
        onNewImage={handleTriggerUpload}
        onDownloadAllZip={handleBatchExportZip}
        isExporting={isExporting}
        hasPanels={false}
        onGoHome={() => setCurrentView('home')}
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={logOut}
      />

      {/* Main Content View Routing */}
      <main className="flex-1 flex flex-col">
        <Suspense fallback={<ViewLoadingFallback />}>
          {currentView === 'home' && (
            <LandingPage
              onGetStarted={() => setCurrentView('dashboard')}
              onOpenSlicer={() => setCurrentView('slicer')}
              onOpenVideoStudio={() => setCurrentView('video')}
              onImageSelected={(file) => {
                loadImageFromFile(file);
                setCurrentView('slicer');
              }}
              onImagesSelected={(files) => {
                loadImagesFromFiles(files);
                setCurrentView('slicer');
              }}
              onSampleSelected={(url, name) => {
                loadImageFromUrl(url, name || 'sample_image.jpg');
                setCurrentView('slicer');
              }}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'dashboard' && (
            <Dashboard
              onOpenSlicer={() => setCurrentView('slicer')}
              onOpenVideoStudio={() => setCurrentView('video')}
              onImageSelected={(file) => {
                loadImageFromFile(file);
                setCurrentView('slicer');
              }}
              onImagesSelected={(files) => {
                loadImagesFromFiles(files);
                setCurrentView('slicer');
              }}
              recentExports={recentExports}
              onClearRecentExports={clearRecentExports}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'video' && (
            <MotionVideoStudio
              onBackToDashboard={() => setCurrentView('dashboard')}
              onNavigate={(v) => setCurrentView(v)}
              existingPanels={workspaceBridgeRef.current?.getPanels?.() || []}
              onToast={addToast}
            />
          )}

          {currentView === 'slicer' && (
            !image ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto shadow-sm">
                  <Scissors className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Upload an Image to Start Slicing
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Choose a high-resolution image, comic strip, or panoramic photo to split into grids and panels.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerUpload}
                    className="px-5 py-2.5 text-xs font-semibold rounded-xl text-white bg-violet-600 hover:bg-violet-500 shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Choose Image File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView('dashboard')}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <EditorWorkspace
                image={image}
                images={images}
                activeImageIndex={activeImageIndex}
                onSelectImageIndex={setActiveImageIndex}
                onAddImages={loadImagesFromFiles}
                onRemoveImageIndex={removeImageAtIndex}
                settings={settings}
                canUndo={canUndo}
                canRedo={canRedo}
                onUpdateSettings={updateSettings}
                onUndo={undo}
                onRedo={redo}
                onReset={() => {
                  resetSettings();
                  addToast('Reset', 'Settings restored to defaults.', 'info');
                }}
                onReplaceImage={handleTriggerUpload}
                onRemoveImage={clearImage}
                onToast={addToast}
                onExportSuccess={addRecentExport}
                progress={progress}
                setProgress={setProgress}
                onBatchExportZip={handleBatchExportZip}
                agentHighlight={agentHighlight}
                onRegisterWorkspaceBridge={(methods) => {
                  workspaceBridgeRef.current = methods;
                }}
              />
            )
          )}
        </Suspense>
      </main>

      {/* Modals & Overlays (Lazy-loaded with Suspense) */}
      <Suspense fallback={null}>
        <ProcessingModal
          progress={progress}
          onCancel={() => {
            abortControllerRef.current?.abort();
            setProgress((prev) => ({ ...prev, active: false }));
          }}
        />

        <LargeImageModal
          isOpen={isLargeImageWarning}
          dimensions={pendingDimensions}
          onAcceptFull={acceptLargeImage}
          onResizeSafe={() => resizeAndAcceptLargeImage(4096)}
          onCancel={() => {
            clearImage();
            setError(null);
          }}
        />

        <KeyboardShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        {/* Firebase Authentication Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSignInGoogle={signInWithGoogle}
          onSignInEmail={signInWithEmail}
          onSignUpEmail={signUpWithEmail}
          onResetPassword={authResetPassword}
          onToast={addToast}
        />

        {/* Recent Exports Sidebar/Drawer */}
        <RecentExportsDrawer
          isOpen={isRecentExportsOpen}
          onClose={() => setIsRecentExportsOpen(false)}
          recentExports={recentExports}
          onClear={clearRecentExports}
        />

        {/* AI Agent Access Drawer */}
        <AgentDrawer
          isOpen={isAgentDrawerOpen}
          onClose={() => setIsAgentDrawerOpen(false)}
          onToast={addToast}
        />

        {/* Agent Export Gesture Confirmation Modal */}
        <AgentExportModal
          request={pendingAgentExport}
          onAllow={handleAllowAgentExport}
          onDecline={handleDeclineAgentExport}
          isExporting={isExporting}
        />
      </Suspense>
    </div>
  );
}
