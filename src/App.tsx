import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppHeader } from './components/AppHeader';
import { LandingPage } from './components/LandingPage';
import { EditorWorkspace } from './components/EditorWorkspace';
import { ProcessingModal } from './components/ProcessingModal';
import { LargeImageModal } from './components/LargeImageModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ToastContainer } from './components/ToastContainer';
import { RecentExportsDrawer } from './components/RecentExportsDrawer';
import { useImageLoader } from './hooks/useImageLoader';
import { useEditorHistory, DEFAULT_SETTINGS } from './hooks/useEditorHistory';
import { useToast } from './hooks/useToast';
import { useRecentExports } from './hooks/useRecentExports';
import { ProcessingProgress, BatchImageResult } from './types';
import { calculateSlices, generatePanelOutputs } from './lib/imageEngine';
import { createAndDownloadBatchZip } from './lib/exportUtils';

export default function App() {
  // Theme management with localStorage persistence
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('precision_split_theme');
    return saved === 'light' ? 'light' : 'dark';
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

  // Modal states
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isRecentExportsOpen, setIsRecentExportsOpen] = useState(false);
  const { recentExports, addRecentExport, clearRecentExports } = useRecentExports();
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
    // Automatically configure 4K Ultra-HD Quality Enhancement on upload
    updateSettings({
      enhanceTo4K: true,
      resolutionMode: '4k',
      sharpnessBoost: true,
      quality: 100,
    });
    const batchSummary = (totalCount && totalCount > 1)
      ? `Batch of ${totalCount} images loaded!`
      : `${loaded.name} (${loaded.width} × ${loaded.height} px)`;
    addToast(
      '4K Ultra HD Export Active',
      `${batchSummary} — Slices will be automatically enhanced to 4K resolution on export.`,
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
      addRecentExport({ filename: zipName, count: totalImages });
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

      {/* Main Header with dedicated Download All as Zip button */}
      <AppHeader
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenRecentExports={() => setIsRecentExportsOpen(true)}
        hasImage={!!image}
        batchCount={images.length}
        onNewImage={handleTriggerUpload}
        onDownloadAllZip={handleBatchExportZip}
        isExporting={isExporting}
        hasPanels={false}
        onGoHome={clearImage}
      />

      {/* Main Content View */}
      <main className="flex-1 flex flex-col">
        {!image ? (
          <LandingPage
            onImageSelected={loadImageFromFile}
            onImagesSelected={loadImagesFromFiles}
            onSampleSelected={loadImageFromUrl}
            onPasteRequested={handlePasteRequested}
          />
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
          />
        )}
      </main>

      {/* Modals & Overlays */}
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Recent Exports Sidebar/Drawer */}
      <RecentExportsDrawer
        isOpen={isRecentExportsOpen}
        onClose={() => setIsRecentExportsOpen(false)}
        recentExports={recentExports}
        onClear={clearRecentExports}
      />
    </div>
  );
}
