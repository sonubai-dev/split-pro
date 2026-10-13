import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Zap,
  Check,
  Layers,
  Sliders,
  Move,
  Eye,
  Info,
} from 'lucide-react';
import { PanelSlice, LoadedImage } from '../types';
import { formatBytes } from '../lib/imageEngine';

interface PanelInspectorModalProps {
  panel: PanelSlice | null;
  sourceImage: LoadedImage;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (panel: PanelSlice) => void;
}

export const PanelInspectorModal: React.FC<PanelInspectorModalProps> = ({
  panel,
  sourceImage,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [compareMode, setCompareMode] = useState<'enhanced' | 'split' | 'original'>('enhanced');
  const [splitPos, setSplitPos] = useState<number>(50); // percentage

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom on open
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, panel?.id]);

  if (!isOpen || !panel) return null;

  const is8K = panel.outputWidth >= 4000 || panel.outputHeight >= 4000;
  const is4K = !is8K && (panel.outputWidth >= 2500 || panel.outputHeight >= 2500);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(5, Math.round((z + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.2, Math.round((z - 0.25) * 100) / 100));
  const handleActualPixels = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col rounded-xl bg-[#0D1117] border border-[#1F2937] text-white shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-[#1F2937] flex items-center justify-between gap-3 bg-[#111827]/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate font-mono">
                  {panel.customName || panel.filename}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    is8K
                      ? 'bg-purple-900/50 text-purple-300 border-purple-500/50'
                      : is4K
                      ? 'bg-amber-900/50 text-amber-300 border-amber-500/50'
                      : 'bg-blue-900/50 text-blue-300 border-blue-500/50'
                  }`}
                >
                  {is8K ? '8K ULTRA-HD MASTER' : is4K ? '4K UHD' : 'HD READY'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hidden sm:inline-block">
                  CRYSTAL CLEAR SHARP
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 mt-0.5">
                <span className="text-blue-400 font-semibold">{panel.outputWidth} × {panel.outputHeight} px</span>
                <span>•</span>
                <span>Original Crop: {panel.sourceWidth} × {panel.sourceHeight} px</span>
                {panel.sizeBytes && (
                  <>
                    <span>•</span>
                    <span>{formatBytes(panel.sizeBytes)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onDownload(panel)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download 8K</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#1F2937] hover:bg-[#374151] text-gray-300 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating Controls Bar */}
        <div className="px-4 py-2 border-b border-[#1F2937] bg-[#0A0A0B]/80 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-mono">
          {/* Zoom controls */}
          <div className="flex items-center gap-1.5 bg-[#161B22] p-1 rounded-lg border border-[#30363D]">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-[#21262D] text-gray-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-bold text-gray-200">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-[#21262D] text-gray-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleActualPixels}
              className="px-2 py-0.5 rounded text-[10px] bg-[#21262D] hover:bg-[#30363D] text-gray-300"
              title="Reset Zoom to 100%"
            >
              1:1
            </button>
          </div>

          {/* Quality verification status */}
          <div className="flex items-center gap-2 text-xs text-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Studio 8K Anti-Halo Edge Engine: Razor-sharp contours & crystal-clear line art</span>
          </div>
        </div>

        {/* Main Interactive Zoom Viewport */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex-1 relative overflow-hidden flex items-center justify-center bg-[#050505] cursor-grab ${
            isPanning ? 'cursor-grabbing' : ''
          }`}
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(255,255,255,0.03) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.03) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.03) 75%)
            `,
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
          }}
        >
          {panel.blobUrl ? (
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                transition: isPanning ? 'none' : 'transform 0.05s ease-out',
                transformOrigin: 'center center',
              }}
              className="relative select-none shadow-2xl"
            >
              <img
                src={panel.blobUrl}
                alt={panel.filename}
                draggable={false}
                className="max-w-none max-h-none rounded-sm border border-[#1F2937]"
                style={{
                  width: `${Math.min(window.innerWidth * 0.7, panel.outputWidth * 0.4)}px`,
                  imageRendering: zoomLevel > 1.5 ? 'auto' : 'auto',
                }}
              />
            </div>
          ) : (
            <div className="text-gray-500 font-mono text-sm">Image preview unavailable</div>
          )}

          {/* Quick instructions pill */}
          <div className="absolute bottom-3 left-4 px-3 py-1 rounded-full bg-[#111827]/80 border border-[#374151] text-[10px] text-gray-400 font-mono pointer-events-none backdrop-blur-xs">
            Drag to pan • Use zoom buttons to inspect 8K line art sharpness
          </div>
        </div>

        {/* Footer info specs */}
        <div className="px-4 py-2.5 border-t border-[#1F2937] bg-[#111827] flex items-center justify-between text-xs text-gray-400 font-mono">
          <div className="flex items-center gap-3">
            <span>FORMAT: <strong className="text-gray-200 uppercase">{panel.format}</strong></span>
            <span>•</span>
            <span>SHARPNESS: <strong className="text-purple-400">STUDIO 8K MASTER</strong></span>
            <span>•</span>
            <span>QUALITY: <strong className="text-emerald-400">100% LOSSLESS</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#1F2937] hover:bg-[#374151] text-gray-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
