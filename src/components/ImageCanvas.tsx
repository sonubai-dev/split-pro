import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Move,
  Grid as GridIcon,
  Layers,
} from 'lucide-react';
import { EditorSettings, LoadedImage, PanelSlice } from '../types';

interface ImageCanvasProps {
  image: LoadedImage;
  settings: EditorSettings;
  slices: Omit<PanelSlice, 'blob' | 'blobUrl' | 'sizeBytes'>[];
  selectedPanelId: string | null;
  onSelectPanel: (id: string) => void;
  onUpdateSettings: (updater: Partial<EditorSettings> | ((prev: EditorSettings) => EditorSettings)) => void;
}

export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  image,
  settings,
  slices,
  selectedPanelId,
  onSelectPanel,
  onUpdateSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showNumbers, setShowNumbers] = useState(true);
  const [showLines, setShowLines] = useState(true);

  // Custom split dragging state
  const [draggingLine, setDraggingLine] = useState<{
    orientation: 'vertical' | 'horizontal';
    index: number;
    initialPos: number;
  } | null>(null);

  const [hoveredLine, setHoveredLine] = useState<{
    orientation: 'vertical' | 'horizontal';
    index: number;
  } | null>(null);

  // RAF ref for high performance throttling
  const rafRef = useRef<number | null>(null);

  // Derive grid lines for non-custom modes to draw a strong overlay
  const derivedVLines = React.useMemo(() => {
    if (settings.splitMode === 'custom') return [];
    const lines = new Set<number>();
    slices.forEach(slice => {
      if (slice.sourceX > 0) lines.add(slice.sourceX);
      if (slice.sourceX + slice.sourceWidth < image.width) lines.add(slice.sourceX + slice.sourceWidth);
    });
    return Array.from(lines);
  }, [slices, settings.splitMode, image.width]);

  const derivedHLines = React.useMemo(() => {
    if (settings.splitMode === 'custom') return [];
    const lines = new Set<number>();
    slices.forEach(slice => {
      if (slice.sourceY > 0) lines.add(slice.sourceY);
      if (slice.sourceY + slice.sourceHeight < image.height) lines.add(slice.sourceY + slice.sourceHeight);
    });
    return Array.from(lines);
  }, [slices, settings.splitMode, image.height]);

  // Initial fit to screen on image load
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !image) return;
    const containerW = containerRef.current.clientWidth - 48;
    const containerH = containerRef.current.clientHeight - 48;
    if (containerW <= 0 || containerH <= 0) return;

    const scaleW = containerW / Math.max(1, image.width);
    const scaleH = containerH / Math.max(1, image.height);
    const fitScale = Math.min(scaleW, scaleH, 1.0); // Don't upscale past 100% on initial fit

    setZoom(fitScale > 0 ? fitScale : 0.5);
    setPan({ x: 0, y: 0 });
  }, [image]);

  useEffect(() => {
    fitToScreen();
  }, [fitToScreen]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Handle Zoom In / Out
  const handleZoomIn = () => setZoom((z) => Math.min(5.0, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.1, Math.round((z - 0.15) * 100) / 100));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((z) => {
      const next = Math.max(0.1, Math.min(5.0, z + zoomDelta));
      return Math.round(next * 100) / 100;
    });
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggingLine) return;
    if (e.button === 0 || e.button === 1) {
      // Left click on background or middle click to pan
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  // Touch handlers for mobile pan & pinch-to-zoom
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (draggingLine) return;
    if (e.touches.length === 1) {
      setIsPanning(true);
      setStartPan({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
      touchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      setPan({
        x: clientX - startPan.x,
        y: clientY - startPan.y,
      });
    } else if (e.touches.length === 2 && touchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / touchStartDistRef.current;
      const nextZoom = Math.max(0.1, Math.min(5.0, touchStartZoomRef.current * scale));
      setZoom(Math.round(nextZoom * 100) / 100);
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    touchStartDistRef.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning && !draggingLine) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (isPanning) {
        setPan({
          x: clientX - startPan.x,
          y: clientY - startPan.y,
        });
        return;
      }

      if (draggingLine && containerRef.current) {
        const imageContainer = document.getElementById('canvas-image-layer');
        if (!imageContainer) return;
        const rect = imageContainer.getBoundingClientRect();

        if (draggingLine.orientation === 'vertical') {
          const mouseX = clientX - rect.left;
          const safeZoom = Math.max(0.01, zoom);
          let sourceX = Math.round(mouseX / safeZoom);
          const minBound = Math.min(1, Math.floor(image.width * 0.05));
          const maxBound = Math.max(minBound + 1, image.width - 1);
          sourceX = Math.max(minBound, Math.min(maxBound, sourceX));

          // Snap to center, quarters, thirds (within 15px)
          const snapPoints = [
            Math.round(image.width * 0.5),
            Math.round(image.width * 0.25),
            Math.round(image.width * 0.75),
            Math.round(image.width * 0.3333),
            Math.round(image.width * 0.6667),
          ];

          for (const sp of snapPoints) {
            if (Math.abs(sourceX - sp) < 15) {
              sourceX = sp;
              break;
            }
          }

          onUpdateSettings((prev) => {
            const nextV = [...prev.customVLines];
            nextV[draggingLine.index] = sourceX;
            return { ...prev, customVLines: nextV };
          });
        } else {
          const mouseY = clientY - rect.top;
          const safeZoom = Math.max(0.01, zoom);
          let sourceY = Math.round(mouseY / safeZoom);
          const minBound = Math.min(1, Math.floor(image.height * 0.05));
          const maxBound = Math.max(minBound + 1, image.height - 1);
          sourceY = Math.max(minBound, Math.min(maxBound, sourceY));

          // Snap to center, quarters, thirds
          const snapPoints = [
            Math.round(image.height * 0.5),
            Math.round(image.height * 0.25),
            Math.round(image.height * 0.75),
            Math.round(image.height * 0.3333),
            Math.round(image.height * 0.6667),
          ];

          for (const sp of snapPoints) {
            if (Math.abs(sourceY - sp) < 15) {
              sourceY = sp;
              break;
            }
          }

          onUpdateSettings((prev) => {
            const nextH = [...prev.customHLines];
            nextH[draggingLine.index] = sourceY;
            return { ...prev, customHLines: nextH };
          });
        }
      }
    });
  };

  const handleMouseUp = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    setIsPanning(false);
    setDraggingLine(null);
  };

  // Add custom split line by clicking
  const handleAddVerticalLine = (posX?: number) => {
    const pos = posX ?? Math.round(image.width / 2);
    onUpdateSettings((prev) => ({
      ...prev,
      splitMode: 'custom',
      customVLines: [...prev.customVLines, pos].sort((a, b) => a - b),
    }));
  };

  const handleAddHorizontalLine = (posY?: number) => {
    const pos = posY ?? Math.round(image.height / 2);
    onUpdateSettings((prev) => ({
      ...prev,
      splitMode: 'custom',
      customHLines: [...prev.customHLines, pos].sort((a, b) => a - b),
    }));
  };

  const handleDeleteCustomLine = (orientation: 'vertical' | 'horizontal', index: number) => {
    onUpdateSettings((prev) => {
      if (orientation === 'vertical') {
        const next = [...prev.customVLines];
        next.splice(index, 1);
        return { ...prev, customVLines: next };
      } else {
        const next = [...prev.customHLines];
        next.splice(index, 1);
        return { ...prev, customHLines: next };
      }
    });
  };

  // Double click canvas to add split line in custom mode
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    if (settings.splitMode !== 'custom') return;
    const imageContainer = document.getElementById('canvas-image-layer');
    if (!imageContainer) return;
    const rect = imageContainer.getBoundingClientRect();
    const sourceX = Math.round((e.clientX - rect.left) / zoom);
    const sourceY = Math.round((e.clientY - rect.top) / zoom);

    if (sourceX > 0 && sourceX < image.width && sourceY > 0 && sourceY < image.height) {
      // Add vertical line at this X
      handleAddVerticalLine(sourceX);
    }
  };

  return (
    <div
      ref={containerRef}
      id="main-image-canvas-viewport"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onDoubleClick={handleCanvasDoubleClick}
      className={`relative w-full h-full min-h-[460px] flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-[#050505] select-none touch-none ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        backgroundImage: `
          linear-gradient(45deg, rgba(0,0,0,0.06) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(0,0,0,0.06) 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.06) 75%),
          linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.06) 75%)
        `,
        backgroundSize: '24px 24px',
        backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
      }}
    >
      {/* Floating Canvas Top Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/90 dark:bg-[#111827]/90 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#374151] text-xs font-mono backdrop-blur-md shadow-lg">
          <span className="text-gray-400 dark:text-gray-500">CANVAS:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {image.width} × {image.height}px
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">{slices.length} PANELS</span>
          {Boolean(settings.enhanceTo8K || settings.resolutionMode === '8k') && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20 text-[10px]">
                8K ULTRA
              </span>
            </>
          )}
          {Boolean((settings.enhanceTo4K || settings.resolutionMode === '4k') && !settings.enhanceTo8K && settings.resolutionMode !== '8k') && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 text-[10px]">
                4K UHD
              </span>
            </>
          )}
          {settings.contrast !== undefined && settings.contrast !== 100 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20 text-[10px]">
                CONTRAST {settings.contrast}%
              </span>
            </>
          )}
          {Boolean(settings.sharpnessBoost !== false && settings.sharpnessLevel !== 'off') && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-[10px] flex items-center gap-1">
                SHARP & CLEAR
              </span>
            </>
          )}
        </div>

        {/* Right Zoom & View Controls */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-md bg-white/90 dark:bg-[#111827]/90 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#374151] backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-1 text-xs font-mono font-medium hover:bg-gray-100 dark:hover:bg-[#1F2937] rounded text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Reset to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-gray-200 dark:bg-[#374151] mx-0.5" />

          <button
            type="button"
            onClick={fitToScreen}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Fit to Screen (0)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowNumbers((v) => !v)}
            className={`p-1.5 rounded transition-colors ${
              showNumbers
                ? 'bg-blue-100 dark:bg-blue-600/30 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500/50'
                : 'hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-400 dark:text-gray-500'
            }`}
            title="Toggle Panel Numbers"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowLines((v) => !v)}
            className={`p-1.5 rounded transition-colors ${
              showLines
                ? 'bg-blue-100 dark:bg-blue-600/30 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500/50'
                : 'hover:bg-gray-100 dark:hover:bg-[#1F2937] text-gray-400 dark:text-gray-500'
            }`}
            title="Toggle Split Lines"
          >
            <GridIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Custom Mode Toolbar (when custom mode is active) */}
      {settings.splitMode === 'custom' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1.5 rounded-md bg-white/95 dark:bg-[#111827]/95 border border-gray-200 dark:border-[#374151] backdrop-blur-md shadow-xl text-xs">
          <span className="text-gray-500 dark:text-gray-400 px-2 font-mono text-[11px]">CUSTOM SLICES:</span>
          <button
            type="button"
            onClick={() => handleAddVerticalLine()}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 font-medium transition-colors border border-gray-300 dark:border-[#374151]"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>+ Vertical Line</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddHorizontalLine()}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 font-medium transition-colors border border-gray-300 dark:border-[#374151]"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>+ Horizontal Line</span>
          </button>
        </div>
      )}

      {/* Main Canvas Workspace Transformed Layer */}
      <div
        id="canvas-transform-wrapper"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          transition: isPanning || draggingLine ? 'none' : 'transform 0.05s ease-out',
        }}
        className="relative flex items-center justify-center"
      >
        <div
          id="canvas-image-layer"
          style={{
            width: image.width * zoom,
            height: image.height * zoom,
          }}
          className="relative shadow-2xl rounded-sm overflow-hidden select-none border border-[#1F2937]"
        >
          {/* Real Source Image Display */}
          <img
            src={image.url}
            alt={image.name}
            draggable={false}
            className="w-full h-full object-contain pointer-events-none block transition-[filter] duration-150"
            style={{
              imageRendering: zoom > 2 ? 'pixelated' : 'auto',
              filter: (settings.contrast !== undefined && settings.contrast !== 100)
                ? `contrast(${settings.contrast}%)`
                : undefined,
            }}
          />

          {/* Slices & Overlays Layer */}
          {showLines && (
            <div className="absolute inset-0 pointer-events-none">
              {slices.map((slice) => {
                const isSelected = selectedPanelId === slice.id;
                const left = slice.sourceX * zoom;
                const top = slice.sourceY * zoom;
                const width = slice.sourceWidth * zoom;
                const height = slice.sourceHeight * zoom;

                return (
                  <div
                    key={slice.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPanel(slice.id);
                    }}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                    className={`absolute pointer-events-auto border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/40 z-10 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                        : 'border border-dashed border-red-500/70 hover:border-red-400 hover:bg-red-500/10'
                    }`}
                  >
                    {/* Panel Number Badge matching Clean Minimalism */}
                    {showNumbers && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/90 dark:bg-[#0A0A0B]/90 text-gray-900 dark:text-white border border-gray-300 dark:border-[#374151] text-[10px] font-mono font-bold shadow-md pointer-events-none backdrop-blur-xs">
                        <span className="text-red-500 dark:text-red-400 font-bold">{String(slice.index).padStart(2, '0')}</span>
                        <span className="text-gray-500 dark:text-gray-400 text-[9px]">
                          {slice.sourceWidth}×{slice.sourceHeight}
                        </span>
                      </div>
                    )}

                    {/* Selected Badge info */}
                    {isSelected && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] font-mono shadow-md">
                        SELECTED
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Dynamic Grid Lines Overlay (for auto, grid, vertical, horizontal modes) */}
          {showLines && settings.splitMode !== 'custom' && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {derivedVLines.map((vPos, idx) => (
                <div
                  key={`dv_${idx}`}
                  style={{ left: `${vPos * zoom}px` }}
                  className="absolute top-0 bottom-0 w-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] z-20 transition-all duration-200"
                />
              ))}
              {derivedHLines.map((hPos, idx) => (
                <div
                  key={`dh_${idx}`}
                  style={{ top: `${hPos * zoom}px` }}
                  className="absolute left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] z-20 transition-all duration-200"
                />
              ))}
            </div>
          )}

          {/* Interactive Custom Split Drag Handles */}
          {settings.splitMode === 'custom' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Vertical Lines */}
              {settings.customVLines.map((vPos, idx) => {
                const screenX = vPos * zoom;
                const isHovered =
                  hoveredLine?.orientation === 'vertical' && hoveredLine.index === idx;
                const isDragging =
                  draggingLine?.orientation === 'vertical' && draggingLine.index === idx;

                return (
                  <div
                    key={`v_${idx}`}
                    style={{ left: `${screenX}px` }}
                    className="absolute top-0 bottom-0 pointer-events-auto group cursor-col-resize z-30"
                    onMouseEnter={() => setHoveredLine({ orientation: 'vertical', index: idx })}
                    onMouseLeave={() => setHoveredLine(null)}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingLine({
                        orientation: 'vertical',
                        index: idx,
                        initialPos: vPos,
                      });
                    }}
                  >
                    {/* Visual Line */}
                    <div
                      className={`w-[2px] h-full -ml-[1px] transition-colors ${
                        isDragging || isHovered ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                      }`}
                    />

                    {/* Drag Handle & Tooltip */}
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                      <div className="w-5 h-7 rounded bg-[#111827] border border-amber-400 flex items-center justify-center shadow-lg text-amber-400 cursor-col-resize">
                        <Move className="w-3 h-3 rotate-90" />
                      </div>
                      <div className="px-1.5 py-0.5 rounded bg-[#111827]/90 text-amber-300 font-mono text-[9px] border border-[#374151] shadow-md whitespace-nowrap">
                        X: {Math.round(vPos)}px ({Math.round((vPos / image.width) * 100)}%)
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomLine('vertical', idx);
                        }}
                        className="p-1 rounded bg-red-600 hover:bg-red-500 text-white shadow-md transition-transform hover:scale-110"
                        title="Delete this split line"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Horizontal Lines */}
              {settings.customHLines.map((hPos, idx) => {
                const screenY = hPos * zoom;
                const isHovered =
                  hoveredLine?.orientation === 'horizontal' && hoveredLine.index === idx;
                const isDragging =
                  draggingLine?.orientation === 'horizontal' && draggingLine.index === idx;

                return (
                  <div
                    key={`h_${idx}`}
                    style={{ top: `${screenY}px` }}
                    className="absolute left-0 right-0 pointer-events-auto group cursor-row-resize z-30"
                    onMouseEnter={() => setHoveredLine({ orientation: 'horizontal', index: idx })}
                    onMouseLeave={() => setHoveredLine(null)}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingLine({
                        orientation: 'horizontal',
                        index: idx,
                        initialPos: hPos,
                      });
                    }}
                  >
                    {/* Visual Line */}
                    <div
                      className={`h-[2px] w-full -mt-[1px] transition-colors ${
                        isDragging || isHovered ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                      }`}
                    />

                    {/* Drag Handle & Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <div className="w-7 h-5 rounded bg-[#111827] border border-amber-400 flex items-center justify-center shadow-lg text-amber-400 cursor-row-resize">
                        <Move className="w-3 h-3" />
                      </div>
                      <div className="px-1.5 py-0.5 rounded bg-[#111827]/90 text-amber-300 font-mono text-[9px] border border-[#374151] shadow-md whitespace-nowrap">
                        Y: {Math.round(hPos)}px ({Math.round((hPos / image.height) * 100)}%)
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomLine('horizontal', idx);
                        }}
                        className="p-1 rounded bg-red-600 hover:bg-red-500 text-white shadow-md transition-transform hover:scale-110"
                        title="Delete this split line"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
