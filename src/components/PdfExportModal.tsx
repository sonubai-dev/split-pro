import React, { useState } from 'react';
import { FileText, X, Check, FileCheck } from 'lucide-react';
import { PdfExportOptions } from '../types';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: PdfExportOptions) => void;
  isExporting: boolean;
  panelCount: number;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  isExporting,
  panelCount,
}) => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [fitToPage, setFitToPage] = useState<boolean>(true);
  const [marginMm, setMarginMm] = useState<number>(10);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onExport({
      orientation,
      pageSize,
      fitToPage,
      marginMm: fitToPage ? marginMm : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-[#1E293B] rounded-xl shadow-2xl overflow-hidden text-gray-700 dark:text-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0A0F1D]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 id="pdf-modal-title" className="text-sm font-semibold text-gray-900 dark:text-white">
                Download Multi-Page PDF
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Compile {panelCount} panels into an ordered document
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Orientation */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-2">
              Page Orientation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'auto', label: 'Auto (Match Panel)' },
                { id: 'portrait', label: 'Portrait' },
                { id: 'landscape', label: 'Landscape' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOrientation(opt.id as any)}
                  className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-all ${
                    orientation === opt.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-gray-50 dark:bg-[#1E293B]/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#334155] hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page Size */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-2">
              Paper Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'a4', label: 'A4 (210 × 297 mm)' },
                { id: 'letter', label: 'US Letter (8.5 × 11 in)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPageSize(opt.id as any)}
                  className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-all ${
                    pageSize === opt.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-gray-50 dark:bg-[#1E293B]/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#334155] hover:border-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Layout Options */}
          <div className="space-y-2.5 pt-1">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">
              Layout & Scaling
            </label>

            {/* One panel per page */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-[#1E293B]/40 border border-gray-200 dark:border-[#334155]">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-gray-800 dark:text-gray-200">One panel per page</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                1:1 Page Order
              </span>
            </div>

            {/* Fit panel to page checkbox */}
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-[#1E293B]/40 border border-gray-200 dark:border-[#334155] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1E293B]/70 transition-colors">
              <input
                type="checkbox"
                checked={fitToPage}
                onChange={(e) => setFitToPage(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
              />
              <div className="flex-1">
                <span className="text-gray-800 dark:text-gray-200 font-medium block">Fit panel to page</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                  Scales panel proportionally with clean printable margins
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-gray-200 dark:border-[#1E293B] bg-gray-50 dark:bg-[#0A0F1D]">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-gray-200 dark:bg-[#1E293B] hover:bg-gray-300 dark:hover:bg-[#334155] text-gray-700 dark:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-[0.98]"
          >
            {isExporting ? (
              <span>Generating PDF...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
