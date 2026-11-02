import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Film,
  Play,
  Pause,
  Upload,
  Music,
  Plus,
  Trash2,
  Sparkles,
  Download,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronRight,
  Maximize2,
  Sliders,
  Type,
  ArrowLeft,
  X,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import {
  VideoSettings,
  VideoPresetName,
  SlideItemConfig,
  SlideMotion,
  CaptionPosition,
  CaptionSize,
  RenderProgress,
  RenderResult,
  VideoAspectRatio,
  VideoResolution,
  VideoFps,
  VideoTransition,
  VideoEasing,
  VideoFitMode,
} from '../video/types';
import {
  VIDEO_PRESETS,
  getVideoDimensions,
  calculateTotalDuration,
  estimateVideoSizeBytes,
  prepareSlideBitmap,
  renderExactFrame,
  renderVideoExport,
  checkWebCodecsSupport,
} from '../video/videoEngine';
import { PanelSlice, LoadedImage } from '../types';
import { formatBytes } from '../lib/imageEngine';
import { downloadBlob } from '../lib/exportUtils';
import { Footer } from './Footer';

interface MediaSlide {
  id: string;
  name: string;
  srcUrl: string;
  blob?: Blob;
  width: number;
  height: number;
  motion: SlideMotion;
  captionText?: string;
  captionPos?: CaptionPosition;
  captionSize?: CaptionSize;
  captionColor?: string;
  included: boolean;
}

interface MotionVideoStudioProps {
  onBackToDashboard: () => void;
  onNavigate: (view: 'home' | 'dashboard' | 'slicer' | 'video') => void;
  existingPanels?: PanelSlice[];
  onToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const MotionVideoStudio: React.FC<MotionVideoStudioProps> = ({
  onBackToDashboard,
  onNavigate,
  existingPanels = [],
  onToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Slides state
  const [slides, setSlides] = useState<MediaSlide[]>(() => {
    if (existingPanels && existingPanels.length > 0) {
      return existingPanels.map((p, idx) => ({
        id: p.id,
        name: p.customName || p.filename || `Panel ${idx + 1}`,
        srcUrl: p.blob ? URL.createObjectURL(p.blob) : '',
        blob: p.blob,
        width: p.outputWidth || 1920,
        height: p.outputHeight || 1080,
        motion: 'zoom_in',
        included: true,
      }));
    }
    return [];
  });

  // Selected slide index for inspector
  const [selectedSlideIndex, setSelectedSlideIndex] = useState<number>(0);

  // Video settings state
  const [settings, setSettings] = useState<VideoSettings>({
    aspectRatio: '9:16',
    resolution: '1080p',
    fps: 30,
    durationPerSlide: 3,
    motionDefault: 'zoom_in',
    transition: 'fade',
    transitionDuration: 0.5,
    easing: 'ease-in-out',
    fitMode: 'cover',
    slides: [],
  });

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);

  // Render & export state
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);

  // Cached slide bitmaps
  const [slideBitmaps, setSlideBitmaps] = useState<(ImageBitmap | HTMLCanvasElement)[]>([]);

  // Filter only included slides
  const activeSlides = slides.filter((s) => s.included);
  const totalDuration = activeSlides.length * settings.durationPerSlide;
  const { width: targetWidth, height: targetHeight } = getVideoDimensions(
    settings.aspectRatio,
    settings.resolution
  );

  // Convert MediaSlide items to SlideItemConfig
  const slideConfigs: SlideItemConfig[] = activeSlides.map((s, idx) => ({
    id: s.id,
    panelIndex: idx,
    motion: s.motion,
    caption: s.captionText
      ? {
          text: s.captionText,
          position: s.captionPos || 'bottom',
          size: s.captionSize || 'medium',
          color: s.captionColor || '#ffffff',
        }
      : undefined,
    included: true,
  }));

  // Handle uploading multiple images or video clips
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files) as File[];

    const newSlides: MediaSlide[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);

      // Read dimensions from image
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth || 1920, h: img.naturalHeight || 1080 });
        img.onerror = () => resolve({ w: 1920, h: 1080 });
        img.src = url;
      });

      newSlides.push({
        id: `slide-${Date.now()}-${i}`,
        name: file.name,
        srcUrl: url,
        blob: file,
        width: dims.w,
        height: dims.h,
        motion: (['zoom_in', 'pan_left', 'zoom_out', 'pan_right'] as SlideMotion[])[i % 4],
        included: true,
      });
    }

    setSlides((prev) => [...prev, ...newSlides]);
    onToast('Media Added', `Loaded ${newSlides.length} slide(s) into Motion Video Studio.`, 'success');
  };

  // Import split panels from Storyboard Slicer if available
  const handleImportSlices = () => {
    if (!existingPanels || existingPanels.length === 0) {
      onToast('No Slices Found', 'Slice an image in the Storyboard Slicer first.', 'warning');
      return;
    }

    const imported: MediaSlide[] = existingPanels.map((p, idx) => ({
      id: p.id,
      name: p.customName || p.filename || `Panel ${idx + 1}`,
      srcUrl: p.blob ? URL.createObjectURL(p.blob) : '',
      blob: p.blob,
      width: p.outputWidth || 1920,
      height: p.outputHeight || 1080,
      motion: 'zoom_in',
      included: true,
    }));

    setSlides(imported);
    onToast('Panels Imported', `Imported ${imported.length} sliced storyboard panels.`, 'success');
  };

  // Re-decode bitmaps whenever active slides or dimensions change
  useEffect(() => {
    let cancelled = false;

    async function loadBitmaps() {
      if (activeSlides.length === 0) {
        setSlideBitmaps([]);
        return;
      }

      const bitmaps: (ImageBitmap | HTMLCanvasElement)[] = [];
      for (const slide of activeSlides) {
        if (cancelled) return;
        try {
          const fakePanel: PanelSlice = {
            id: slide.id,
            index: 1,
            originalIndex: 1,
            row: 0,
            col: 0,
            sourceX: 0,
            sourceY: 0,
            sourceWidth: slide.width,
            sourceHeight: slide.height,
            outputWidth: slide.width,
            outputHeight: slide.height,
            filename: `${slide.name}.png`,
            format: 'png',
            blob: slide.blob,
          };
          const bmp = await prepareSlideBitmap(fakePanel, targetWidth, targetHeight);
          bitmaps.push(bmp);
        } catch (e) {
          console.error('Failed to prepare slide bitmap:', e);
        }
      }

      if (!cancelled) {
        setSlideBitmaps(bitmaps);
      }
    }

    loadBitmaps();
    return () => {
      cancelled = true;
    };
  }, [slides, targetWidth, targetHeight]);

  // Real-time canvas render loop
  const drawCurrentFrame = useCallback(
    (timeSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas || slideBitmaps.length === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      renderExactFrame(
        ctx,
        slideBitmaps,
        slideConfigs,
        settings,
        timeSec,
        canvas.width,
        canvas.height
      );
    },
    [slideBitmaps, slideConfigs, settings]
  );

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      setCurrentTimeSec((prev) => {
        const next = prev + dt;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, totalDuration]);

  // Update canvas when time changes
  useEffect(() => {
    drawCurrentFrame(currentTimeSec);
  }, [currentTimeSec, drawCurrentFrame]);

  // Audio track handler
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setSettings((prev) => ({
      ...prev,
      audio: {
        file,
        name: file.name,
        blobUrl: url,
        loop: true,
        trimToVideo: true,
        fadeOut: true,
      },
    }));
    onToast('Soundtrack Added', file.name, 'success');
  };

  // Perform full video export
  const handleStartRender = async (): Promise<RenderResult> => {
    if (activeSlides.length === 0) {
      onToast('No Slides', 'Please upload or add at least one slide to render video.', 'warning');
      throw new Error('No slides included');
    }

    setIsPlaying(false);
    setIsRendering(true);
    setRenderProgress(null);
    setRenderNotice(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { width, height } = getVideoDimensions(settings.aspectRatio, settings.resolution);
      const isWebCodecs = await checkWebCodecsSupport(width, height, settings.fps);
      if (!isWebCodecs) {
        setRenderNotice('MP4 not supported on this browser, exporting WebM');
      }

      // Convert active slides to fake PanelSlice items for export engine
      const panelItems: PanelSlice[] = activeSlides.map((s, idx) => ({
        id: s.id,
        index: idx + 1,
        originalIndex: idx + 1,
        row: 0,
        col: 0,
        sourceX: 0,
        sourceY: 0,
        sourceWidth: s.width,
        sourceHeight: s.height,
        outputWidth: s.width,
        outputHeight: s.height,
        filename: `${s.name}.png`,
        format: 'png',
        blob: s.blob,
      }));

      const finalSettings: VideoSettings = {
        ...settings,
        slides: slideConfigs,
      };

      const result = await renderVideoExport(
        panelItems,
        finalSettings,
        (prog) => setRenderProgress(prog),
        controller.signal
      );

      setIsRendering(false);
      setRenderProgress(null);

      onToast(
        'Video Ready',
        `Successfully rendered ${result.filename} (${formatBytes(result.sizeBytes)}).`,
        'success'
      );

      // Trigger user gesture download
      downloadBlob(result.blob, result.filename);
      return result;
    } catch (err: any) {
      setIsRendering(false);
      setRenderProgress(null);
      if (err?.message !== 'Render cancelled by user.') {
        onToast('Video Render Failed', err?.message || 'Could not export video.', 'error');
      } else {
        onToast('Render Cancelled', 'Export was aborted.', 'info');
      }
      throw err;
    }
  };

  const currentSlide = slides[selectedSlideIndex];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Studio Header */}
      <header className="sticky top-14 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0E1420]/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-violet-600 text-white flex items-center justify-center font-bold text-xs">
              <Film className="w-3.5 h-3.5" />
            </div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">
              Motion Graphic Video Studio
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {existingPanels.length > 0 && (
            <button
              type="button"
              onClick={handleImportSlices}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Import Sliced Panels ({existingPanels.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Media</span>
          </button>

          <button
            type="button"
            onClick={handleStartRender}
            disabled={isRendering || activeSlides.length === 0}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-violet-600 hover:bg-violet-500 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isRendering ? 'Rendering...' : 'Export MP4 Video'}</span>
          </button>
        </div>
      </header>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleUploadFiles}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mp3,audio/wav,audio/m4a,audio/*"
        className="hidden"
        onChange={handleAudioUpload}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Canvas Preview Player */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
              <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-900 dark:text-white">
                CANVAS PREVIEW ({settings.aspectRatio} · {settings.resolution})
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
              <span>
                {currentTimeSec.toFixed(1)}s / {totalDuration.toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Interactive Player Viewport */}
          <div className="relative w-full aspect-[9/16] max-h-[480px] mx-auto bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
            <canvas
              ref={canvasRef}
              width={targetWidth}
              height={targetHeight}
              className="w-full h-full object-contain"
            />

            {slides.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                <Film className="w-10 h-10 opacity-50" />
                <p className="text-xs">No media loaded yet. Upload images or import sliced panels to preview.</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white cursor-pointer"
                >
                  Upload Images / Clips
                </button>
              </div>
            )}
          </div>

          {/* Scrubber & Controls */}
          <div className="space-y-2 pt-2">
            <input
              type="range"
              min="0"
              max={Math.max(1, totalDuration)}
              step="0.05"
              value={currentTimeSec}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentTimeSec(parseFloat(e.target.value));
              }}
              className="w-full accent-violet-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
            />

            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={activeSlides.length === 0}
                  className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTimeSec(0)}
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  title="Rewind to start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="text-slate-500 dark:text-slate-400">
                {activeSlides.length} Slide{activeSlides.length !== 1 ? 's' : ''} · {settings.fps} FPS
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Slide Inspector */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section: Global Video Settings */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
              <span className="font-bold uppercase font-mono tracking-wider text-slate-900 dark:text-white">
                VIDEO CONFIGURATION
              </span>
              <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400">
                {settings.aspectRatio} · {settings.resolution}
              </span>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-400 font-medium">Aspect Ratio:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: '9:16', label: '9:16 Story/Reel' },
                  { id: '16:9', label: '16:9 Landscape' },
                  { id: '1:1', label: '1:1 Square' },
                ].map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, aspectRatio: ar.id as any }))}
                    className={`py-1.5 px-2 rounded-lg font-medium transition-all cursor-pointer ${
                      settings.aspectRatio === ar.id
                        ? 'bg-violet-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution & FPS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Resolution:</label>
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
                  {(['1080p', '720p'] as VideoResolution[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, resolution: res }))}
                      className={`flex-1 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                        settings.resolution === res
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Frame Rate:</label>
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
                  {([30, 24] as VideoFps[]).map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setSettings((prev) => ({ ...prev, fps }))}
                      className={`flex-1 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                        settings.fps === fps
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Slide Duration Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Duration per Slide:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {settings.durationPerSlide}s
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={settings.durationPerSlide}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, durationPerSlide: parseFloat(e.target.value) }))
                }
                className="w-full accent-violet-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
              />
            </div>

            {/* Transitions */}
            <div className="space-y-1.5">
              <label className="text-slate-600 dark:text-slate-400 font-medium">Transition Style:</label>
              <div className="grid grid-cols-5 gap-1 text-[11px]">
                {(['fade', 'slide', 'zoom', 'wipe', 'none'] as VideoTransition[]).map((tr) => (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, transition: tr }))}
                    className={`py-1 px-1 rounded-md capitalize font-medium cursor-pointer ${
                      settings.transition === tr
                        ? 'bg-violet-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tr}
                  </button>
                ))}
              </div>
            </div>

            {/* Soundtrack Upload */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Audio Soundtrack:</span>
                </div>
                {settings.audio ? (
                  <button
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, audio: undefined }))}
                    className="text-red-500 hover:text-red-600 text-[10px] cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="text-violet-600 dark:text-violet-400 hover:underline font-semibold cursor-pointer"
                  >
                    + Add Audio
                  </button>
                )}
              </div>
              {settings.audio && (
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-1">
                  ♪ {settings.audio.name} (Loop & Fade out enabled)
                </div>
              )}
            </div>
          </div>

          {/* Section: Slide Sequence & Ken Burns Motion Inspector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
              <span className="font-bold uppercase font-mono tracking-wider text-slate-900 dark:text-white">
                SLIDE TIMELINE & MOTION ({slides.length})
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer font-semibold"
              >
                + Add Slide
              </button>
            </div>

            {/* Horizontal thumbnail slide list */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSlideIndex(idx)}
                  className={`w-20 shrink-0 aspect-[9/16] rounded-lg overflow-hidden border-2 relative cursor-pointer transition-all ${
                    selectedSlideIndex === idx
                      ? 'border-violet-600 shadow-md ring-2 ring-violet-500/20'
                      : s.included
                      ? 'border-slate-200 dark:border-slate-700 opacity-90'
                      : 'border-slate-200 dark:border-slate-800 opacity-40'
                  }`}
                >
                  <img src={s.srcUrl} alt={s.name} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 px-1 rounded bg-black/60 text-[9px] font-mono text-white">
                    #{idx + 1}
                  </div>
                  <div className="absolute bottom-1 right-1 px-1 rounded bg-black/60 text-[8px] font-mono text-white capitalize">
                    {s.motion.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Slide Inspector */}
            {currentSlide && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Slide #{selectedSlideIndex + 1}: {currentSlide.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSlides((prev) =>
                          prev.map((s, i) =>
                            i === selectedSlideIndex ? { ...s, included: !s.included } : s
                          )
                        )
                      }
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                        currentSlide.included
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {currentSlide.included ? 'Included' : 'Excluded'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSlides((prev) => prev.filter((_, i) => i !== selectedSlideIndex));
                        setSelectedSlideIndex(0);
                      }}
                      className="text-red-500 hover:text-red-600 cursor-pointer"
                      title="Remove slide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Ken Burns Motion Selector */}
                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">Ken Burns Motion Effect:</label>
                  <select
                    value={currentSlide.motion}
                    onChange={(e) => {
                      const motion = e.target.value as SlideMotion;
                      setSlides((prev) =>
                        prev.map((s, i) => (i === selectedSlideIndex ? { ...s, motion } : s))
                      );
                    }}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="zoom_in">Zoom In (Focus inward)</option>
                    <option value="zoom_out">Zoom Out (Reveal outward)</option>
                    <option value="pan_left">Pan Left (Cinematic drift)</option>
                    <option value="pan_right">Pan Right (Cinematic sweep)</option>
                    <option value="pan_up">Pan Up</option>
                    <option value="pan_down">Pan Down</option>
                    <option value="random">Random Ken Burns</option>
                    <option value="none">None (Static slide)</option>
                  </select>
                </div>

                {/* Optional Burned Caption */}
                <div className="space-y-1">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">Burned Caption Text:</label>
                  <input
                    type="text"
                    placeholder="Enter slide caption (burned into video)..."
                    value={currentSlide.captionText || ''}
                    onChange={(e) => {
                      const text = e.target.value;
                      setSlides((prev) =>
                        prev.map((s, i) => (i === selectedSlideIndex ? { ...s, captionText: text } : s))
                      );
                    }}
                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Render Progress Overlay */}
      {isRendering && renderProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Rendering Motion Graphic Video
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {renderProgress.stage}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-violet-600 transition-all duration-150 rounded-full"
                  style={{ width: `${renderProgress.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>{renderProgress.percentage}%</span>
                <span>
                  Frame {renderProgress.currentFrame} / {renderProgress.totalFrames}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => abortControllerRef.current?.abort()}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-400 hover:text-red-500 cursor-pointer"
            >
              Cancel Render
            </button>
          </div>
        </div>
      )}

      {/* Footer strictly with "VistaroAI by SOLITA SOLUTIONS" */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
