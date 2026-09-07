import React, { useState } from 'react';
import {
  Download,
  FileArchive,
  FileText,
  GripVertical,
  Edit2,
  Check,
  X,
  Layers,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { PanelSlice } from '../types';
import { formatBytes } from '../lib/imageEngine';

interface PanelResultsProps {
  panels: PanelSlice[];
  selectedPanelId: string | null;
  isGenerating: boolean;
  batchCount?: number;
  onBatchDownloadZip?: () => void;
  onSelectPanel: (id: string) => void;
  onDownloadSingle: (panel: PanelSlice) => void;
  onDownloadAll: () => void;
  onDownloadZip: () => void;
  onDownloadPdf: () => void;
  onReorderPanels: (reordered: PanelSlice[]) => void;
  onRenamePanel: (id: string, newName: string) => void;
  onGenerate: () => void;
}

export const PanelResults: React.FC<PanelResultsProps> = ({
  panels,
  selectedPanelId,
  isGenerating,
  batchCount,
  onBatchDownloadZip,
  onSelectPanel,
  onDownloadSingle,
  onDownloadAll,
  onDownloadZip,
  onDownloadPdf,
  onReorderPanels,
  onRenamePanel,
  onGenerate,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) || panels[0];

  const totalBytes = panels.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);

  // Drag & drop handlers for reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...panels];
    const item = reordered.splice(draggedIndex, 1)[0];
    reordered.splice(index, 0, item);

    // Update index sequence
    const updated = reordered.map((p, idx) => ({
      ...p,
      index: idx + 1,
    }));

    setDraggedIndex(index);
    onReorderPanels(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const startEditing = (panel: PanelSlice) => {
    setEditingId(panel.id);
    setEditingName(panel.customName || panel.filename);
  };

  const saveEditing = (id: string) => {
    if (editingName.trim()) {
      onRenamePanel(id, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-white dark:bg-[#0A0A0B] border-l border-gray-200 dark:border-[#1F2937] overflow-y-auto text-gray-700 dark:text-gray-300 transition-colors">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-[#1F2937] bg-white/90 dark:bg-[#0A0A0B]/90 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-xs tracking-wider text-gray-900 dark:text-white uppercase font-mono">PANEL EXPORTS</h3>
            {panels.length > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                4K ENHANCED
              </span>
            )}
          </div>

          {panels.length > 0 && (
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              EST: {formatBytes(totalBytes)}
            </span>
          )}
        </div>

        {/* Global Export Actions */}
        {panels.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            <button
              type="button"
              onClick={onDownloadZip}
              className="flex items-center justify-center gap-1 py-2 px-2 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black shadow-sm transition-all active:scale-[0.98]"
              title="Download 4K Ultra-HD ZIP archive with all panels"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>4K ZIP</span>
            </button>

            <button
              type="button"
              onClick={onDownloadPdf}
              className="flex items-center justify-center gap-1 py-2 px-2 rounded text-xs font-medium bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-[#374151] hover:border-blue-500/50 transition-colors active:scale-[0.98]"
              title="Download multi-page PDF document"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={onDownloadAll}
              className="flex items-center justify-center gap-1 py-2 px-2 rounded text-xs font-medium bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-[#374151] hover:border-blue-500/50 transition-colors active:scale-[0.98]"
              title="Download all panels as separate files"
            >
              <Download className="w-3.5 h-3.5" />
              <span>All</span>
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Generate panels to slice and export full-resolution assets.
          </p>
        )}

        {/* Batch Export Card for Multi-image */}
        {batchCount && batchCount > 1 && onBatchDownloadZip && (
          <div className="mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Batch Mode ({batchCount} Images)
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                Single ZIP
              </span>
            </div>
            <p className="text-[11px] text-blue-700 dark:text-blue-300/80 leading-snug">
              Slice all {batchCount} images with current settings and download all panels in one organized ZIP.
            </p>
            <button
              type="button"
              onClick={onBatchDownloadZip}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <FileArchive className="w-3.5 h-3.5" />
              <span>Export All {batchCount} Images to Single ZIP</span>
            </button>
          </div>
        )}
      </div>

      {/* Main List Area */}
      <div className="p-4 sm:p-5 flex-1 space-y-3">
        {panels.length === 0 ? (
          <div className="py-12 px-4 rounded-lg border border-dashed border-gray-300 dark:border-[#1F2937] bg-gray-50 dark:bg-[#111827]/30 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-md bg-gray-200 dark:bg-[#1F2937] text-gray-500 dark:text-gray-400 flex items-center justify-center mb-3 border border-gray-300 dark:border-[#374151]">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No Panels Generated Yet
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[220px] mb-4">
              Configure your split settings on the left and trigger slice generation.
            </p>
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="px-3.5 py-2 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              {isGenerating ? 'Processing...' : 'Generate Panels'}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pb-1 font-mono">
              <span>DRAG TO REORDER</span>
              <span>{panels.length} SLICES</span>
            </div>

            <div className="space-y-2">
              {panels.map((panel, idx) => {
                const isSelected = selectedPanelId === panel.id;
                const isEditing = editingId === panel.id;

                return (
                  <div
                    key={panel.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectPanel(panel.id)}
                    className={`group relative p-2.5 rounded-md border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                        : 'bg-gray-50 dark:bg-[#111827]/70 border-gray-200 dark:border-[#1F2937] hover:border-gray-300 dark:hover:border-[#374151] hover:bg-gray-100 dark:hover:bg-[#111827]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Drag Handle */}
                      <div
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing p-0.5"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Thumbnail Preview */}
                      <div className="w-12 h-12 rounded bg-gray-200 dark:bg-[#050505] border border-gray-300 dark:border-[#1F2937] overflow-hidden shrink-0 flex items-center justify-center">
                        {panel.blobUrl ? (
                          <img
                            src={panel.blobUrl}
                            alt={panel.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[9px] font-mono text-gray-500">#{panel.index}</span>
                        )}
                      </div>

                      {/* Details & Filename */}
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="w-full px-2 py-0.5 text-xs font-mono rounded bg-white dark:bg-[#0A0A0B] border border-blue-500 text-gray-900 dark:text-white"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveEditing(panel.id)}
                              className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-gray-200 dark:bg-[#1F2937] text-gray-700 dark:text-gray-300"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-red-500 dark:text-red-400 font-mono">
                              #{String(panel.index).padStart(2, '0')}
                            </span>
                            <span
                              className="text-xs font-medium text-gray-900 dark:text-white truncate"
                              title={panel.customName || panel.filename}
                            >
                              {panel.customName || panel.filename}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(panel);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-0.5 transition-opacity"
                              title="Rename panel"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {panel.outputWidth} × {panel.outputHeight} px
                          </span>
                          {(panel.outputWidth >= 1920 || panel.outputHeight >= 1080) && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                              4K UHD
                            </span>
                          )}
                          <span>•</span>
                          <span className="uppercase">{panel.format}</span>
                          {panel.sizeBytes && (
                            <>
                              <span>•</span>
                              <span>{formatBytes(panel.sizeBytes)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Download Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadSingle(panel);
                        }}
                        className="p-1.5 rounded bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-300 dark:border-[#374151]"
                        title="Download this panel"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Selected Panel Inspector Footer */}
      {selectedPanel && (
        <div className="p-4 bg-gray-50 dark:bg-[#0D1117] border-t border-gray-200 dark:border-[#1F2937]">
          <div className="text-xs font-mono font-medium text-gray-900 dark:text-white mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="text-red-500 dark:text-red-400 font-bold">#{String(selectedPanel.index).padStart(2, '0')}</span>
              <span className="text-gray-600 dark:text-gray-300 uppercase tracking-wider text-[11px]">INSPECTOR</span>
            </span>
            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
              ORIGIN: ({selectedPanel.sourceX}, {selectedPanel.sourceY})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-[#111827] p-2.5 rounded border border-gray-200 dark:border-[#1F2937] mb-3">
            <div>
              <span className="text-gray-400 dark:text-gray-500 block text-[10px]">SOURCE CROP:</span>
              <span className="text-gray-900 dark:text-gray-200 font-medium">{selectedPanel.sourceWidth} × {selectedPanel.sourceHeight}px</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500 block text-[10px]">EXPORT SIZE:</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedPanel.outputWidth} × {selectedPanel.outputHeight}px</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDownloadSingle(selectedPanel)}
            className="w-full py-2 px-3 rounded text-xs font-medium bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-[#374151] transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Selected Panel</span>
          </button>
        </div>
      )}
    </div>
  );
};
