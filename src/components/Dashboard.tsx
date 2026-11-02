import React, { useRef, useState, useEffect } from 'react';
import {
  Scissors,
  Film,
  Upload,
  ArrowRight,
  Clock,
  Sparkles,
  Layers,
  Zap,
  Grid,
  FileArchive,
  Download,
  Trash2,
  Video,
  Play,
  Check,
  Eye,
  LayoutGrid,
  X,
  ExternalLink,
} from 'lucide-react';
import { Footer } from './Footer';
import { RecentExport } from '../hooks/useRecentExports';

interface DashboardProps {
  onOpenSlicer: () => void;
  onOpenVideoStudio: () => void;
  onImageSelected: (file: File) => void;
  onImagesSelected: (files: File[]) => void;
  recentExports: RecentExport[];
  onClearRecentExports: () => void;
  onNavigate: (view: 'home' | 'dashboard' | 'slicer' | 'video') => void;
}

const QUICK_PRESETS = [
  {
    id: 'reel',
    title: 'Instagram Reel',
    desc: '9:16 vertical video with 3s Ken Burns zoom motion & fade transitions.',
    badge: 'VIDEO',
    target: 'video' as const,
  },
  {
    id: 'youtube',
    title: 'YouTube Storyboard',
    desc: '16:9 widescreen video with 5s smooth cinematic pan motion.',
    badge: 'VIDEO',
    target: 'video' as const,
  },
  {
    id: 'grid3x3',
    title: '3×3 Instagram Mosaic',
    desc: 'Precision 9-panel split grid with lossless 8K Ultra-HD enhancement.',
    badge: 'SLICER',
    target: 'slicer' as const,
  },
  {
    id: 'carousel',
    title: 'Seamless Swipe Carousel',
    desc: '1×3 or 1×5 horizontal panorama split for seamless multi-slide posts.',
    badge: 'SLICER',
    target: 'slicer' as const,
  },
  {
    id: 'ultra8k',
    title: '8K Ultra Master Slice',
    desc: 'Progressive upscaling up to 7680px with razor-sharp contour definition.',
    badge: '8K UHD',
    target: 'slicer' as const,
  },
  {
    id: 'story',
    title: 'Story Slideshow',
    desc: '9:16 vertical video with 4s random motion & slide wipe transitions.',
    badge: 'VIDEO',
    target: 'video' as const,
  },
];

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenSlicer,
  onOpenVideoStudio,
  onImageSelected,
  onImagesSelected,
  recentExports,
  onClearRecentExports,
  onNavigate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<'slicer' | 'video'>('slicer');
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterProject = (id: string) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredProjectId(id);
  };

  const handleMouseLeaveProject = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setHoveredProjectId(null);
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (dragAction === 'video' || files.length > 1) {
        onImagesSelected(files);
        if (dragAction === 'video') {
          onOpenVideoStudio();
        } else {
          onOpenSlicer();
        }
      } else {
        onImageSelected(files[0]);
        onOpenSlicer();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (dragAction === 'video' || files.length > 1) {
        onImagesSelected(files);
        if (dragAction === 'video') {
          onOpenVideoStudio();
        } else {
          onOpenSlicer();
        }
      } else {
        onImageSelected(files[0]);
        onOpenSlicer();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold tracking-wider text-violet-600 dark:text-violet-400 uppercase">
                CREATOR DASHBOARD
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-800">
                100% LOCAL PROCESSING
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome to VistaroAI Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Select a studio tool, launch a creator preset, or drag files directly into your workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSlicer}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Storyboard Slicer</span>
            </button>
            <button
              type="button"
              onClick={onOpenVideoStudio}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg text-white bg-violet-600 hover:bg-violet-500 shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Motion Video Studio</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: STUDIO TOOL LAUNCHERS (Two Large Cards) */}
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            STUDIO WORKSPACES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tool A: Storyboard Slicer Studio */}
            <div
              onClick={onOpenSlicer}
              className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs hover:shadow-xl hover:border-violet-500/50 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                    <Scissors className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/40">
                    PRECISION SLICER
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    Storyboard Slicer Studio
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Slice high-resolution art, storyboards, comics, and panoramas into exact grids, carousels, or custom pixel dividers with 8K Ultra-HD progressive upscaling.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-mono">
                  <span>· Grids & Auto Detection</span>
                  <span>· Custom Draggable Cut Lines</span>
                  <span>· Lossless ZIP & PDF</span>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Open Storyboard Slicer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-mono text-slate-400">8K Studio Master</span>
              </div>
            </div>

            {/* Tool B: Motion Graphic Video Studio */}
            <div
              onClick={onOpenVideoStudio}
              className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xs hover:shadow-xl hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                    <Film className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                    MOTION VIDEO
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Motion Graphic Video Studio
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Upload multiple images, storyboard slices, or video clips to create Ken Burns animated slideshows with custom transitions, audio soundtracks, and burned captions.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-mono">
                  <span>· Ken Burns Pan & Zoom</span>
                  <span>· Multi-slide Transitions</span>
                  <span>· 1080p MP4 Export</span>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Create Motion Graphic Video</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-mono text-slate-400">WebCodecs Hardware Enc</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: UNIVERSAL DRAG-AND-DROP UPLOAD ZONE */}
        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-6 sm:p-8 text-center transition-all hover:border-violet-500">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="space-y-4 max-w-md mx-auto"
          >
            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Drag & Drop Media to Start
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Drop high-resolution images, photos, or video clips directly into your workspace.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDragAction('slicer');
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Upload for Storyboard Slicer
              </button>
              <button
                type="button"
                onClick={() => {
                  setDragAction('video');
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-violet-600 hover:bg-violet-500 shadow-sm transition-colors cursor-pointer"
              >
                Upload for Motion Video
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: 1-TAP CREATOR PRESETS */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ONE-TAP CREATOR PRESETS
            </h2>
            <span className="text-xs text-slate-400 font-mono">INSTANT CONFIGURATION</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {QUICK_PRESETS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => {
                  if (preset.target === 'video') {
                    onOpenVideoStudio();
                  } else {
                    onOpenSlicer();
                  }
                }}
                className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-violet-500/50 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {preset.badge}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {preset.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {preset.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 4: RECENT EXPORT ARCHIVES */}
        {recentExports.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-800/80 pt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  RECENT EXPORTS ({recentExports.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={onClearRecentExports}
                className="text-xs font-mono text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative">
              {recentExports.slice(0, 6).map((item) => {
                const isHovered = hoveredProjectId === item.id;
                const colCount = item.columns || (item.count === 4 ? 2 : 3);
                const gridColsClass = colCount === 2 ? 'grid-cols-2' : colCount >= 4 ? 'grid-cols-4' : 'grid-cols-3';

                return (
                  <div
                    key={item.id}
                    className="relative group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 transition-all duration-200 hover:border-violet-500/60 dark:hover:border-violet-500/60 hover:shadow-xl dark:hover:shadow-violet-950/20 cursor-pointer"
                    onMouseEnter={() => handleMouseEnterProject(item.id)}
                    onMouseLeave={handleMouseLeaveProject}
                    onClick={() => setHoveredProjectId((prev) => (prev === item.id ? null : item.id))}
                  >
                    {/* Floating Hover-Preview Popover */}
                    {isHovered && (
                      <div
                        role="tooltip"
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[320px] sm:w-[380px] p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl dark:shadow-violet-950/80 z-50 pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150"
                        onMouseEnter={() => handleMouseEnterProject(item.id)}
                        onMouseLeave={handleMouseLeaveProject}
                      >
                        {/* Popover Header */}
                        <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-100 dark:border-slate-800">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                              <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {item.filename}
                              </h5>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              <span>{item.count} Slices</span>
                              {item.rows && item.columns && (
                                <span>· {item.rows}×{item.columns} Grid</span>
                              )}
                              <span className="text-violet-600 dark:text-violet-400 font-semibold">
                                · {item.resolution || '8K Ultra-HD'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shrink-0 font-medium">
                            Ready
                          </span>
                        </div>

                        {/* Slices Thumbnail Grid */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                            <span>Slices Preview Matrix</span>
                            <span>{item.count} items</span>
                          </div>

                          <div className={`grid gap-1.5 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80 ${gridColsClass}`}>
                            {item.thumbnails && item.thumbnails.length > 0 ? (
                              item.thumbnails.slice(0, 9).map((thumb, idx) => {
                                const sliceMeta = item.slices?.[idx];
                                return (
                                  <div
                                    key={idx}
                                    className="group/slice relative rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 aspect-video border border-slate-200/80 dark:border-slate-700/80 hover:border-violet-500 transition-colors shadow-xs"
                                    title={sliceMeta?.name || `Slice #${idx + 1}`}
                                  >
                                    <img
                                      src={thumb}
                                      alt={`Slice #${idx + 1}`}
                                      className="w-full h-full object-cover group-hover/slice:scale-105 transition-transform duration-200"
                                      loading="lazy"
                                    />
                                    <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/75 backdrop-blur-xs text-[8px] font-mono font-bold text-white">
                                      #{String(idx + 1).padStart(2, '0')}
                                    </div>
                                    {sliceMeta?.width && (
                                      <div className="absolute bottom-1 right-1 opacity-0 group-hover/slice:opacity-100 transition-opacity px-1 py-0.2 rounded bg-black/85 text-[7px] font-mono text-slate-200">
                                        {sliceMeta.width}×{sliceMeta.height}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              Array.from({ length: Math.min(item.count, 9) }).map((_, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-lg p-2 bg-slate-100 dark:bg-slate-800/80 aspect-video border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-center"
                                >
                                  <span className="text-[10px] font-mono font-bold text-violet-600 dark:text-violet-400">
                                    #{String(idx + 1).padStart(2, '0')}
                                  </span>
                                  <span className="text-[8px] text-slate-400 font-mono mt-0.5">
                                    Slice
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                          {item.count > 9 && (
                            <div className="text-[10px] text-center text-slate-400 font-mono pt-0.5">
                              + {item.count - 9} more slices in archive
                            </div>
                          )}
                        </div>

                        {/* Quick studio action buttons */}
                        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('slicer');
                            }}
                            className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                            <span>Open in Slicer</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('video');
                            }}
                            className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Film className="w-3.5 h-3.5" />
                            <span>Make Video</span>
                          </button>
                        </div>

                        {/* Arrow indicator */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 w-3 h-3 bg-white dark:bg-slate-900 border-b border-r border-slate-200 dark:border-slate-700/80 rotate-45 transform" />
                      </div>
                    )}

                    {/* Primary Card View */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 shrink-0">
                          <FileArchive className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {item.filename}
                          </h4>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shrink-0 font-medium">
                        Saved
                      </span>
                    </div>

                    {/* Inline Mini-Thumbnails Strip & Slices Tag */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {item.thumbnails && item.thumbnails.length > 0 ? (
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {item.thumbnails.slice(0, 4).map((thumb, idx) => (
                              <img
                                key={idx}
                                src={thumb}
                                alt=""
                                className="inline-block w-6 h-6 rounded-md object-cover ring-1 ring-white dark:ring-slate-900 shadow-2xs"
                              />
                            ))}
                          </div>
                        ) : (
                          <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {item.count} slices
                        </span>
                        {item.rows && item.columns && (
                          <span className="text-slate-400">({item.rows}×{item.columns})</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400 group-hover:underline">
                        <Eye className="w-3 h-3" />
                        <span>Hover Preview</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer strictly with "VistaroAI by SOLITA SOLUTIONS" */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
