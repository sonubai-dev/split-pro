import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Sliders,
  Maximize,
  Layers,
  Undo,
  Redo,
  RotateCcw,
  Sparkles,
  Download,
  FileArchive,
  Images,
  Plus,
  X,
} from 'lucide-react';
import {
  EditorSettings,
  LoadedImage,
  PanelSlice,
  PdfExportOptions,
  ProcessingProgress,
  BatchImageResult,
} from '../types';
import { ControlPanel } from './ControlPanel';
import { ImageCanvas } from './ImageCanvas';
import { PanelResults } from './PanelResults';
import { PdfExportModal } from './PdfExportModal';
import {
  calculateSlices,
  generatePanelOutputs,
  generateSmartSuggestions,
} from '../lib/imageEngine';
import {
  downloadBlob,
  createAndDownloadZip,
  createAndDownloadBatchZip,
  downloadAllPanels,
  createAndDownloadPdf,
} from '../lib/exportUtils';

interface EditorWorkspaceProps {
  image: LoadedImage;
  images?: LoadedImage[];
  activeImageIndex?: number;
  onSelectImageIndex?: (index: number) => void;
  onAddImages?: (files: File[]) => void;
  onRemoveImageIndex?: (index: number) => void;
  settings: EditorSettings;
  canUndo: boolean;
  canRedo: boolean;
  onUpdateSettings: (updater: Partial<EditorSettings> | ((prev: EditorSettings) => EditorSettings)) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onReplaceImage: () => void;
  onRemoveImage: () => void;
  onToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  progress: ProcessingProgress;
  setProgress: React.Dispatch<React.SetStateAction<ProcessingProgress>>;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  image,
  images = [],
  activeImageIndex = 0,
  onSelectImageIndex,
  onAddImages,
  onRemoveImageIndex,
  settings,
  canUndo,
  canRedo,
  onUpdateSettings,
  onUndo,
  onRedo,
  onReset,
  onReplaceImage,
  onRemoveImage,
  onToast,
  progress,
  setProgress,
}) => {
  // Mobile active tab: 'controls' | 'canvas' | 'results'
  const [mobileTab, setMobileTab] = useState<'controls' | 'canvas' | 'results'>('canvas');

  // Selected panel ID
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);

  // Generated full-resolution panels
  const [generatedPanels, setGeneratedPanels] = useState<PanelSlice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  // Compute live slice boundaries based on current settings
  const currentSlices = useMemo(() => {
    return calculateSlices(image.width, image.height, settings);
  }, [image.width, image.height, settings]);

  // Compute smart suggestions based on image geometry
  const smartSuggestions = useMemo(() => {
    return generateSmartSuggestions(image.width, image.height);
  }, [image.width, image.height]);

  // Perform full-resolution panel generation
  const handleGeneratePanels = useCallback(async () => {
    if (!image) return;

    // Clean up previous blob URLs
    generatedPanels.forEach((p) => {
      if (p.blobUrl) URL.revokeObjectURL(p.blobUrl);
    });

    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);

    const is4K = settings.enhanceTo4K || settings.resolutionMode === '4k';

    setProgress({
      active: true,
      current: 0,
      total: currentSlices.length,
      percentage: 0,
      stage: is4K ? 'Enhancing to 4K Ultra-HD & Slicing Panels...' : 'Generating High-Resolution Panels...',
      cancellable: true,
    });

    try {
      const results = await generatePanelOutputs(
        image,
        currentSlices,
        settings,
        (prog) => {
          setProgress((prev) => ({
            ...prev,
            current: prog.current,
            total: prog.total,
            percentage: prog.percentage,
          }));
        },
        controller.signal
      );

      setGeneratedPanels(results);
      setIsGenerating(false);
      setProgress((prev) => ({ ...prev, active: false }));
      onToast(
        is4K ? '4K Ultra-HD Panels Ready' : 'Panels Generated',
        `Successfully rendered ${results.length} panels in ${is4K ? 'enhanced 4K UHD' : 'high'} resolution.`,
        'success'
      );

      // On mobile switch to results tab to view outputs
      if (window.innerWidth < 1024) {
        setMobileTab('results');
      }
    } catch (err: any) {
      setIsGenerating(false);
      setProgress((prev) => ({ ...prev, active: false }));
      if (err?.message !== 'Processing cancelled by user.') {
        onToast('Generation Failed', err?.message || 'Unable to slice image.', 'error');
      } else {
        onToast('Cancelled', 'Panel generation cancelled.', 'info');
      }
    }
  }, [image, currentSlices, settings, generatedPanels, setProgress, onToast]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      generatedPanels.forEach((p) => {
        if (p.blobUrl && p.blobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(p.blobUrl);
        }
      });
    };
  }, [generatedPanels]);

  // Single panel download
  const handleDownloadSingle = useCallback(
    async (panel: PanelSlice) => {
      if (panel.blob) {
        downloadBlob(panel.blob, panel.customName || panel.filename);
        onToast('Panel Downloaded', panel.customName || panel.filename, 'success');
      } else {
        // If not yet generated, generate this single panel on the fly from raw image
        try {
          const single = await generatePanelOutputs(image, [panel], settings);
          if (single[0]?.blob) {
            downloadBlob(single[0].blob, single[0].customName || single[0].filename);
            onToast('Panel Downloaded', single[0].customName || single[0].filename, 'success');
            // Clean up single temporary blobUrl if created
            if (single[0].blobUrl) {
              setTimeout(() => URL.revokeObjectURL(single[0].blobUrl!), 1000);
            }
          }
        } catch (e) {
          onToast('Download Failed', 'Could not export panel.', 'error');
        }
      }
    },
    [image, settings, onToast]
  );

  // Download all panels
  const handleDownloadAll = useCallback(async () => {
    let panelsToDownload = generatedPanels;
    if (panelsToDownload.length === 0) {
      try {
        panelsToDownload = await generatePanelOutputs(image, currentSlices, settings);
        setGeneratedPanels(panelsToDownload);
      } catch (e) {
        onToast('Download Failed', 'Could not generate panels.', 'error');
        return;
      }
    }

    onToast('Downloading Files', `Starting downloads for ${panelsToDownload.length} panels...`, 'info');
    await downloadAllPanels(panelsToDownload);
    onToast('Downloads Complete', 'All files saved.', 'success');
  }, [generatedPanels, image, currentSlices, settings, onToast]);

  // Download ZIP
  const handleDownloadZip = useCallback(async () => {
    let panelsToZip = generatedPanels;
    if (panelsToZip.length === 0) {
      try {
        setIsGenerating(true);
        setProgress({
          active: true,
          current: 0,
          total: currentSlices.length,
          percentage: 0,
          stage: 'Rendering Panels for ZIP...',
          cancellable: false,
        });

        panelsToZip = await generatePanelOutputs(image, currentSlices, settings, (prog) => {
          setProgress((prev) => ({
            ...prev,
            current: prog.current,
            total: prog.total,
            percentage: prog.percentage,
          }));
        });
        setGeneratedPanels(panelsToZip);
      } catch (e) {
        setIsGenerating(false);
        setProgress((prev) => ({ ...prev, active: false }));
        onToast('Export Failed', 'Could not render panels.', 'error');
        return;
      }
    }

    setProgress({
      active: true,
      current: 0,
      total: panelsToZip.length,
      percentage: 0,
      stage: 'Compressing ZIP Archive...',
      cancellable: false,
    });

    try {
      const cleanBaseName = image.name.replace(/\.[^/.]+$/, '') || 'image';
      const zipBase = settings.namingPrefix.trim() || `${cleanBaseName}_split`;
      const zipName = zipBase.endsWith('.zip') ? zipBase : `${zipBase}.zip`;

      await createAndDownloadZip(panelsToZip, zipName, (percent) => {
        setProgress((prev) => ({
          ...prev,
          percentage: percent,
        }));
      });

      setIsGenerating(false);
      setProgress((prev) => ({ ...prev, active: false }));
      onToast('ZIP Exported', `Saved ${zipName}`, 'success');
    } catch (e) {
      setIsGenerating(false);
      setProgress((prev) => ({ ...prev, active: false }));
      onToast('ZIP Failed', 'Could not create archive.', 'error');
    }
  }, [generatedPanels, image, currentSlices, settings, setProgress, onToast]);

  const handleBatchExportZip = useCallback(async () => {
    const listToProcess = images && images.length > 0 ? images : [image];
    if (listToProcess.length === 0) return;

    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);

    const totalImages = listToProcess.length;
    const batchOutputs: BatchImageResult[] = [];
    const is4K = settings.enhanceTo4K || settings.resolutionMode === '4k';

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
          stage: `Processing image ${imgIndex + 1} of ${totalImages}: "${currentImg.name}" (${imgSlices.length} slices, ${is4K ? '4K Ultra-HD' : 'native'})...`,
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

      // Final ZIP packaging into a single archive
      setProgress({
        active: true,
        current: totalImages,
        total: totalImages,
        percentage: 95,
        stage: `Packaging all slices into a single unified ZIP archive...`,
        cancellable: false,
      });

      const zipBase = settings.namingPrefix.trim() || 'split_pro_batch_export';
      const zipName = zipBase.endsWith('.zip') ? zipBase : `${zipBase}.zip`;

      await createAndDownloadBatchZip(batchOutputs, zipName, (percent) => {
        setProgress((prev) => ({
          ...prev,
          percentage: 95 + Math.round(percent * 0.05),
        }));
      });

      setIsGenerating(false);
      setProgress((prev) => ({ ...prev, active: false }));
      const totalSlices = batchOutputs.reduce((acc, item) => acc + item.panels.length, 0);
      onToast(
        'Batch Export Complete',
        `Successfully saved ${totalSlices} slices from ${totalImages} images into "${zipName}".`,
        'success'
      );
    } catch (err: any) {
      setIsGenerating(false);
      setProgress((prev) => ({ ...prev, active: false }));
      if (err?.message !== 'Batch processing cancelled by user.') {
        onToast('Batch Export Failed', err?.message || 'Could not export batch.', 'error');
      } else {
        onToast('Export Cancelled', 'Batch processing was cancelled.', 'info');
      }
    }
  }, [images, image, settings, setProgress, onToast]);

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const handleOpenPdfModal = useCallback(() => {
    setIsPdfModalOpen(true);
  }, []);

  const handleExportPdf = useCallback(
    async (pdfOptions: PdfExportOptions) => {
      setIsPdfModalOpen(false);
      setIsGenerating(true);

      let panelsToPdf = generatedPanels;
      if (panelsToPdf.length === 0 || panelsToPdf.length !== currentSlices.length) {
        try {
          setProgress({
            active: true,
            current: 0,
            total: currentSlices.length,
            percentage: 0,
            stage: 'Rendering Panels for PDF...',
            cancellable: false,
          });

          panelsToPdf = await generatePanelOutputs(image, currentSlices, settings, (prog) => {
            setProgress((prev) => ({
              ...prev,
              current: prog.current,
              total: prog.total,
              percentage: prog.percentage,
            }));
          });
          setGeneratedPanels(panelsToPdf);
        } catch (e) {
          setIsGenerating(false);
          setProgress((prev) => ({ ...prev, active: false }));
          onToast('Export Failed', 'Could not render panels for PDF.', 'error');
          return;
        }
      }

      setProgress({
        active: true,
        current: 0,
        total: panelsToPdf.length,
        percentage: 0,
        stage: 'Compiling PDF Document...',
        cancellable: false,
      });

      try {
        const cleanBaseName = image.name.replace(/\.[^/.]+$/, '') || 'image';
        const pdfBase = settings.namingPrefix.trim() || `${cleanBaseName}_split`;
        const pdfFileName = pdfBase.endsWith('.pdf') ? pdfBase : `${pdfBase}.pdf`;

        await createAndDownloadPdf(panelsToPdf, pdfFileName, pdfOptions, (percent) => {
          setProgress((prev) => ({
            ...prev,
            percentage: percent,
          }));
        });

        setIsGenerating(false);
        setProgress((prev) => ({ ...prev, active: false }));
        onToast('PDF Exported', `Saved ${pdfFileName}`, 'success');
      } catch (e) {
        setIsGenerating(false);
        setProgress((prev) => ({ ...prev, active: false }));
        onToast('PDF Failed', 'Could not create PDF document.', 'error');
      }
    },
    [generatedPanels, image, currentSlices, settings, setProgress, onToast]
  );

  // Handle panel rename
  const handleRenamePanel = (id: string, newName: string) => {
    setGeneratedPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, customName: newName, filename: newName } : p))
    );
    onToast('Panel Renamed', newName, 'info');
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          onUndo();
          onToast('Undo', 'Reverted previous split settings.', 'info');
        }
      }
      // Ctrl+Shift+Z or Cmd+Shift+Z or Ctrl+Y
      else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        if (canRedo) {
          onRedo();
          onToast('Redo', 'Restored split settings.', 'info');
        }
      }
      // Ctrl+S or Cmd+S
      else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleDownloadZip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, onUndo, onRedo, handleDownloadZip, onToast]);

  return (
    <div className="h-[calc(100vh-56px)] w-full flex flex-col overflow-hidden bg-gray-100 dark:bg-[#0A0A0B] text-gray-800 dark:text-[#E5E7EB] transition-colors">
      {/* Sub-Header Toolbar: Undo/Redo & Quick Actions */}
      <div className="h-10 px-4 sm:px-6 border-b border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] flex items-center justify-between gap-4 select-none shrink-0 text-xs transition-colors">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] border border-gray-300 dark:border-[#374151] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] border border-gray-300 dark:border-[#374151] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Redo</span>
          </button>

          <div className="w-[1px] h-4 bg-gray-300 dark:bg-[#374151]" />

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-50 dark:bg-[#1F2937]/60 hover:bg-gray-200 dark:hover:bg-[#1F2937] border border-gray-300 dark:border-[#374151] transition-colors"
            title="Reset Settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Center Mode indicator */}
        <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 hidden md:flex items-center gap-2">
          <span>MODE:</span>
          <span className="uppercase text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-[#1F2937] px-2 py-0.5 rounded border border-blue-200 dark:border-[#374151]">
            {settings.splitMode}
          </span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span>{currentSlices.length} PANELS</span>
        </div>

        {/* Right Action */}
        <div className="flex items-center gap-2">
          {images.length > 1 ? (
            <button
              type="button"
              onClick={handleBatchExportZip}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
              title={`Slice and export all ${images.length} images into a single ZIP`}
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Export All {images.length} (ZIP)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Export ZIP</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Image Management Strip */}
      <div className="h-10 px-4 sm:px-6 bg-gray-50/90 dark:bg-[#0E131F] border-b border-gray-200 dark:border-[#1F2937] flex items-center justify-between gap-3 overflow-x-auto select-none shrink-0 transition-colors">
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Images className="w-3.5 h-3.5" />
            BATCH ({images.length || 1})
          </span>
        </div>

        {/* Horizontal Image Thumbnails Strip */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 max-w-3xl">
          {images.map((img, idx) => {
            const isActive = idx === activeImageIndex;
            return (
              <div
                key={`${img.name}-${idx}`}
                onClick={() => onSelectImageIndex && onSelectImageIndex(idx)}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-all shrink-0 border ${
                  isActive
                    ? 'bg-white dark:bg-[#1F2937] text-blue-600 dark:text-blue-400 border-blue-500 shadow-xs font-semibold'
                    : 'bg-white/60 dark:bg-[#161B22] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#30363D] hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                title={`Switch active preview to ${img.name} (${img.width}×${img.height}px)`}
              >
                {img.url ? (
                  <img src={img.url} alt="" className="w-4 h-4 object-cover rounded shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[9px] font-bold">
                    {idx + 1}
                  </span>
                )}
                <span className="truncate max-w-[100px] sm:max-w-[130px]">{img.name}</span>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                  {img.width}×{img.height}
                </span>
                {images.length > 1 && onRemoveImageIndex && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImageIndex(idx);
                    }}
                    className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors ml-0.5"
                    title={`Remove ${img.name} from batch`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add more images button */}
          {onAddImages && (
            <>
              <input
                ref={batchInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/jpg, image/avif"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAddImages(Array.from(e.target.files));
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => batchInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1F2937] hover:bg-gray-100 dark:hover:bg-[#2D3748] border border-dashed border-gray-300 dark:border-gray-600 transition-colors shrink-0"
                title="Add more images to this batch"
              >
                <Plus className="w-3 h-3 text-blue-500" />
                <span>Add Images</span>
              </button>
            </>
          )}
        </div>

        {/* Right side batch helper */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 font-mono shrink-0">
          <span>Settings applied across batch</span>
        </div>
      </div>

      {/* Main 3-Column Workspace Area (Desktop) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Controls (Desktop) */}
        <div
          className={`w-80 xl:w-96 shrink-0 h-full border-r border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#0D1117] transition-colors ${
            mobileTab === 'controls' ? 'block absolute inset-0 z-30 bg-white dark:bg-[#0D1117]' : 'hidden lg:block'
          }`}
        >
          <ControlPanel
            image={image}
            batchCount={images.length}
            settings={settings}
            smartSuggestions={smartSuggestions}
            sliceCount={currentSlices.length}
            isGenerating={isGenerating}
            onUpdateSettings={onUpdateSettings}
            onGenerate={handleGeneratePanels}
            onReplaceImage={onReplaceImage}
            onRemoveImage={onRemoveImage}
            onToast={onToast}
          />
        </div>

        {/* Center Column: Live Interactive Canvas */}
        <div
          className={`flex-1 h-full relative bg-gray-100 dark:bg-[#050505] transition-colors ${
            mobileTab === 'canvas' ? 'block' : 'hidden lg:block'
          }`}
        >
          <ImageCanvas
            image={image}
            settings={settings}
            slices={currentSlices}
            selectedPanelId={selectedPanelId}
            onSelectPanel={(id) => setSelectedPanelId(id)}
            onUpdateSettings={onUpdateSettings}
          />
        </div>

        {/* Right Column: Generated Panels & Inspector (Desktop) */}
        <div
          className={`w-80 xl:w-96 shrink-0 h-full border-l border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#0D1117] transition-colors ${
            mobileTab === 'results' ? 'block absolute inset-0 z-30 bg-white dark:bg-[#0D1117]' : 'hidden lg:block'
          }`}
        >
          <PanelResults
            panels={generatedPanels}
            selectedPanelId={selectedPanelId}
            isGenerating={isGenerating}
            batchCount={images.length}
            onBatchDownloadZip={handleBatchExportZip}
            onSelectPanel={(id) => setSelectedPanelId(id)}
            onDownloadSingle={handleDownloadSingle}
            onDownloadAll={handleDownloadAll}
            onDownloadZip={handleDownloadZip}
            onDownloadPdf={handleOpenPdfModal}
            onReorderPanels={(reordered) => setGeneratedPanels(reordered)}
            onRenamePanel={handleRenamePanel}
            onGenerate={handleGeneratePanels}
          />
        </div>
      </div>

      {/* PDF Export Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onExport={handleExportPdf}
        isExporting={isGenerating}
        panelCount={generatedPanels.length > 0 ? generatedPanels.length : currentSlices.length}
      />

      {/* Bottom Minimalist Status Bar matching Clean Minimalism design */}
      <footer className="h-7 px-4 bg-white dark:bg-[#111827] border-t border-gray-200 dark:border-[#1F2937] hidden sm:flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-mono select-none shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">READY</span>
          </div>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="truncate max-w-[200px] text-gray-600 dark:text-gray-400">{image.name}</span>
          <span className="text-gray-400 dark:text-gray-500 font-normal">({image.width} × {image.height}px)</span>
        </div>

        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
          <span>{settings.outputFormat.toUpperCase()} ({settings.quality}%)</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>{currentSlices.length} SLICES</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">100% LOCAL RAM</span>
        </div>
      </footer>

      {/* Mobile Bottom Tab Navigation */}
      <div className="lg:hidden h-14 border-t border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] px-4 flex items-center justify-around z-40 shrink-0 transition-colors">
        <button
          type="button"
          onClick={() => setMobileTab('controls')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            mobileTab === 'controls' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('canvas')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            mobileTab === 'canvas' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Maximize className="w-4 h-4" />
          <span>Canvas</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('results')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            mobileTab === 'results' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Panels ({generatedPanels.length})</span>
        </button>
      </div>
    </div>
  );
};
