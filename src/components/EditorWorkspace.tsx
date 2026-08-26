import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import {
  EditorSettings,
  LoadedImage,
  PanelSlice,
  PdfExportOptions,
  ProcessingProgress,
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
import { downloadBlob, createAndDownloadZip, downloadAllPanels, createAndDownloadPdf } from '../lib/exportUtils';

interface EditorWorkspaceProps {
  image: LoadedImage;
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

    setProgress({
      active: true,
      current: 0,
      total: currentSlices.length,
      percentage: 0,
      stage: 'Generating High-Resolution Panels...',
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
      onToast('Panels Generated', `Successfully sliced into ${results.length} panels.`, 'success');

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
          <button
            type="button"
            onClick={handleDownloadZip}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-900/20 transition-all active:scale-95"
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>Export ZIP</span>
          </button>
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
