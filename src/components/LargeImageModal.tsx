import React from 'react';
import { AlertTriangle, Check, ShieldAlert, Cpu } from 'lucide-react';

interface LargeImageModalProps {
  isOpen: boolean;
  dimensions: { width: number; height: number; memoryMB: number } | null;
  onAcceptFull: () => void;
  onResizeSafe: () => void;
  onCancel: () => void;
}

export const LargeImageModal: React.FC<LargeImageModalProps> = ({
  isOpen,
  dimensions,
  onAcceptFull,
  onResizeSafe,
  onCancel,
}) => {
  if (!isOpen || !dimensions) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-[#0A0A0B]/85 backdrop-blur-md">
      <div className="w-full max-w-lg p-6 sm:p-7 rounded-lg bg-white dark:bg-[#111827] border border-amber-500/30 text-gray-700 dark:text-gray-200 shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Large Image Memory Protection</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              This image is high-resolution ({dimensions.width} × {dimensions.height} px, ~{dimensions.memoryMB} MB uncompressed).
              Processing in browser memory may take a few moments.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option A: Full High-Res */}
          <button
            type="button"
            onClick={onAcceptFull}
            className="p-4 rounded-lg border border-gray-200 dark:border-[#374151] bg-gray-50 dark:bg-[#0A0A0B] hover:border-blue-500 dark:hover:border-blue-500 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Full Native Resolution
              </span>
              <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              100% original {dimensions.width}×{dimensions.height}px fidelity.
            </p>
          </button>

          {/* Option B: Resized Safe Mode */}
          <button
            type="button"
            onClick={onResizeSafe}
            className="p-4 rounded-lg border border-gray-200 dark:border-[#374151] bg-gray-50 dark:bg-[#0A0A0B] hover:border-blue-500 dark:hover:border-blue-500 text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Safe 4K Optimize
              </span>
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Scales to 4096px for ultra-smooth slicing and lower memory.
            </p>
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2937] transition-colors border border-transparent hover:border-gray-300 dark:hover:border-[#374151]"
          >
            Cancel Upload
          </button>
        </div>
      </div>
    </div>
  );
};
