import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  Film,
  Download,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Music,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  Type,
  Trash2,
  RefreshCw,
  Info,
  Maximize2,
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
import { PanelSlice } from '../types';
import { formatBytes } from '../lib/imageEngine';
import { downloadBlob } from '../lib/exportUtils';

interface VideoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  panels: PanelSlice[];
  onToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  // External control bridge
  registerVideoController?: (controller: {
    getSettings: () => VideoSettings;
    updateSettings: (updates: Partial<VideoSettings>) => void;
    applyPreset: (presetName: VideoPresetName) => void;
    setSlideMotion: (args: { slideIndex?: number; motion: SlideMotion; applyToAll?: boolean }) => void;
    setSlideCaption: (args: {
      slideIndex: number;
      text: string;
      position?: CaptionPosition;
      size?: CaptionSize;
      color?: string;
    }) => void;
    preview: (args: { action: 'play' | 'pause' | 'seek'; time?: number }) => void;
    render: () => Promise<RenderResult>;
    cancelRender: () => void;
    isRendering: () => boolean;
  }) => void;
}

export const VideoDrawer: React.FC<VideoDrawerProps> = ({
  isOpen,
  onClose,
  panels,
  onToast,
  registerVideoController,
}) => {
  // Video settings state
  const [settings, setSettings] = useState<VideoSettings>(() => {
    const initialSlides: SlideItemConfig[] = panels.map((p, idx) => ({
      id: p.id,
      panelIndex: idx,
      included: true,
      motion: 'zoom_in',
    }));
    return {
      aspectRatio: '9:16',
      resolution: '1080p',
      fps: 30,
      durationPerSlide: 3,
      motionDefault: 'zoom_in',
      transition: 'fade',
      transitionDuration: 0.5,
      easing: 'ease-in-out',
      fitMode: 'cover',
      slides: initialSlides,
    };
  });

  // Sync slides with panels if panels change
  useEffect(() => {
    if (panels.length === 0) return;
    setSettings((prev) => {
      // Keep existing slide overrides if panel ID matches
      const updatedSlides: SlideItemConfig[] = panels.map((p, idx) => {
        const existing = prev.slides.find((s) => s.id === p.id);
        if (existing) {
          return { ...existing, panelIndex: idx };
        }
        return {
          id: p.id,
          panelIndex: idx,
          included: true,
          motion: prev.motionDefault,
        };
      });
      return { ...prev, slides: updatedSlides };
    });
  }, [panels]);

  // Preview playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastPlayTimeRef = useRef<number>(0);
  const cachedBitmapsRef = useRef<(ImageBitmap | HTMLCanvasElement)[]>([]);

  // Audio element for preview playback
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Render & Export states
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [renderedResult, setRenderedResult] = useState<RenderResult | null>(null);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Expanded slide item for caption & motion fine-tuning
  const [expandedSlideIndex, setExpandedSlideIndex] = useState<number | null>(null);

  // Calculation derivations
  const totalDuration = useMemo(() => calculateTotalDuration(settings), [settings]);
  const estimatedSize = useMemo(
    () => estimateVideoSizeBytes(settings, totalDuration),
    [settings, totalDuration]
  );
  const isHighMemoryWarning = useMemo(
    () => totalDuration > 60 && settings.resolution === '1080p',
    [totalDuration, settings.resolution]
  );

  // Active included slides
  const activeSlides = useMemo(
    () => settings.slides.filter((s) => s.included),
    [settings.slides]
  );

  // Load and cache preview bitmaps whenever panels or aspect ratio/resolution change
  useEffect(() => {
    if (!isOpen || activeSlides.length === 0) return;

    let isCancelled = false;
    const { width, height } = getVideoDimensions(settings.aspectRatio, settings.resolution);

    const loadBitmaps = async () => {
      // Clear previous bitmaps
      cachedBitmapsRef.current.forEach((b) => {
        if ('close' in b && typeof b.close === 'function') b.close();
      });
      cachedBitmapsRef.current = [];

      const list: (ImageBitmap | HTMLCanvasElement)[] = [];
      for (let i = 0; i < activeSlides.length; i++) {
        if (isCancelled) return;
        const slide = activeSlides[i];
        const panel = panels.find((p) => p.id === slide.id) || panels[slide.panelIndex] || panels[i];
        if (panel) {
          try {
            // Preview uses lower resolution to keep interactive scrubber instantaneous
            const previewWidth = Math.min(640, width);
            const previewHeight = Math.min(640, height);
            const bmp = await prepareSlideBitmap(panel, previewWidth, previewHeight);
            list.push(bmp);
          } catch {
            // Skip broken
          }
        }
      }
      if (!isCancelled) {
        cachedBitmapsRef.current = list;
        drawPreviewFrame(currentTime);
      }
    };

    loadBitmaps();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, activeSlides, settings.aspectRatio, settings.resolution, panels]);

  // Audio playback synchronization
  useEffect(() => {
    if (settings.audio?.blobUrl) {
      const audio = new Audio(settings.audio.blobUrl);
      audio.loop = settings.audio.loop;
      audioRef.current = audio;
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [settings.audio?.blobUrl, settings.audio?.loop]);

  // Draw preview frame
  const drawPreviewFrame = useCallback(
    (timeSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = getVideoDimensions(settings.aspectRatio, settings.resolution);
      // Canvas internal resolution matches aspect ratio
      canvas.width = width;
      canvas.height = height;

      renderExactFrame(
        ctx,
        cachedBitmapsRef.current,
        activeSlides,
        settings,
        timeSec,
        width,
        height
      );
    },
    [settings, activeSlides]
  );

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) audioRef.current.pause();
      return;
    }

    lastPlayTimeRef.current = performance.now();
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime % (audioRef.current.duration || totalDuration);
      audioRef.current.play().catch(() => {});
    }

    const tick = (now: number) => {
      const deltaSec = (now - lastPlayTimeRef.current) / 1000;
      lastPlayTimeRef.current = now;

      setCurrentTime((prev) => {
        const nextTime = prev + deltaSec;
        if (nextTime >= totalDuration) {
          // Loop preview
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
          drawPreviewFrame(0);
          return 0;
        }
        drawPreviewFrame(nextTime);
        return nextTime;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, totalDuration, drawPreviewFrame]);

  // Scrubbing handler
  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(totalDuration, newTime));
    setCurrentTime(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped;
    }
    drawPreviewFrame(clamped);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  // Apply preset helper
  const handleApplyPreset = (presetName: VideoPresetName) => {
    const preset = VIDEO_PRESETS[presetName];
    if (!preset) return;

    setSettings((prev) => ({
      ...prev,
      ...preset,
      slides: prev.slides.map((s) => ({
        ...s,
        motion: preset.motionDefault,
      })),
    }));

    onToast('Preset Applied', `Configured "${presetName}" video settings.`, 'info');
  };

  // Audio file upload
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
    onToast('Audio Track Added', file.name, 'success');
  };

  const handleRemoveAudio = () => {
    if (settings.audio?.blobUrl) {
      URL.revokeObjectURL(settings.audio.blobUrl);
    }
    setSettings((prev) => ({ ...prev, audio: undefined }));
    onToast('Audio Removed', 'Soundtrack cleared.', 'info');
  };

  // Perform full video export
  const handleStartRender = async (): Promise<RenderResult> => {
    if (activeSlides.length === 0) {
      onToast('No Slides', 'Please include at least one slide to render video.', 'warning');
      throw new Error('No slides included');
    }

    setIsPlaying(false);
    setIsRendering(true);
    setRenderedResult(null);
    setRenderNotice(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Feature detect WebCodecs support
      const { width, height } = getVideoDimensions(settings.aspectRatio, settings.resolution);
      const isWebCodecs = await checkWebCodecsSupport(width, height, settings.fps);
      if (!isWebCodecs) {
        setRenderNotice('MP4 not supported on this browser, exporting WebM');
      }

      const result = await renderVideoExport(
        panels,
        settings,
        (prog) => setRenderProgress(prog),
        controller.signal
      );

      setRenderedResult(result);
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
        onToast('Render Cancelled', 'Video rendering was stopped.', 'info');
      }
      throw err;
    }
  };

  const handleCancelRender = () => {
    abortControllerRef.current?.abort();
    setIsRendering(false);
    setRenderProgress(null);
  };

  // Slide reordering & include toggles
  const handleToggleInclude = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      slides: prev.slides.map((s, idx) =>
        idx === index ? { ...s, included: !s.included } : s
      ),
    }));
  };

  const handleMoveSlide = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= settings.slides.length) return;
    setSettings((prev) => {
      const copy = [...prev.slides];
      const item = copy.splice(fromIndex, 1)[0];
      copy.splice(toIndex, 0, item);
      return { ...prev, slides: copy };
    });
  };

  const handleUpdateSlideMotion = (index: number, motion: SlideMotion) => {
    setSettings((prev) => ({
      ...prev,
      slides: prev.slides.map((s, idx) => (idx === index ? { ...s, motion } : s)),
    }));
  };

  const handleApplyMotionToAll = (motion: SlideMotion) => {
    setSettings((prev) => ({
      ...prev,
      motionDefault: motion,
      slides: prev.slides.map((s) => ({ ...s, motion })),
    }));
    onToast('Motion Applied', `Set "${motion}" across all slides.`, 'info');
  };

  const handleUpdateSlideCaption = (
    index: number,
    captionUpdates: Partial<SlideItemConfig['caption']>
  ) => {
    setSettings((prev) => ({
      ...prev,
      slides: prev.slides.map((s, idx) => {
        if (idx !== index) return s;
        const currentCap = s.caption || {
          text: '',
          position: 'bottom',
          size: 'medium',
          color: '#FFFFFF',
        };
        return {
          ...s,
          caption: { ...currentCap, ...captionUpdates },
        };
      }),
    }));
  };

  // Register Video Controller for Agent layer
  useEffect(() => {
    if (!registerVideoController) return;
    registerVideoController({
      getSettings: () => settings,
      updateSettings: (updates: Partial<VideoSettings>) => {
        setSettings((prev) => ({ ...prev, ...updates }));
      },
      applyPreset: handleApplyPreset,
      setSlideMotion: ({ slideIndex, motion, applyToAll }) => {
        if (applyToAll || typeof slideIndex !== 'number') {
          handleApplyMotionToAll(motion);
        } else {
          handleUpdateSlideMotion(slideIndex, motion);
        }
      },
      setSlideCaption: ({ slideIndex, text, position, size, color }) => {
        handleUpdateSlideCaption(slideIndex, {
          text,
          position: position || 'bottom',
          size: size || 'medium',
          color: color || '#FFFFFF',
        });
      },
      preview: ({ action, time }) => {
        if (action === 'play') setIsPlaying(true);
        else if (action === 'pause') setIsPlaying(false);
        else if (action === 'seek' && typeof time === 'number') handleSeek(time);
      },
      render: handleStartRender,
      cancelRender: handleCancelRender,
      isRendering: () => isRendering,
    });
  }, [registerVideoController, settings, isRendering, panels]);

  // Esc keyboard shortcut to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-drawer-title"
    >
      <div
        className="w-full max-w-2xl sm:max-w-xl md:max-w-2xl h-full bg-white dark:bg-[#111827] text-gray-800 dark:text-[#E5E7EB] border-l border-gray-200 dark:border-[#1F2937] shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-[#1F2937] flex items-center justify-between shrink-0 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-900/30">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="video-drawer-title" className="text-sm font-bold text-gray-900 dark:text-white font-mono uppercase tracking-wider">
                  Storyboard to Video
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  LOCAL ENGINE
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Transform storyboard panels into an animated MP4 / WebM video.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close video drawer"
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2937] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* 1. Quick Presets (One Tap) */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 font-mono uppercase tracking-wider block">
              1-TAP PRESETS
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(VIDEO_PRESETS) as VideoPresetName[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleApplyPreset(name)}
                  className="p-2.5 rounded-lg border border-gray-200 dark:border-[#1F2937] hover:border-blue-500/60 dark:hover:border-blue-500/60 bg-gray-50 dark:bg-[#151D2C] hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-left flex flex-col justify-between min-h-[64px]"
                >
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {name}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                    {VIDEO_PRESETS[name].aspectRatio} • {VIDEO_PRESETS[name].durationPerSlide}s
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Interactive Real-Time Canvas Preview */}
          <div className="rounded-xl border border-gray-200 dark:border-[#1F2937] bg-gray-950 p-3 sm:p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-1.5 font-bold text-white uppercase">
                <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
                CANVAS PREVIEW
              </span>
              <span>
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            {/* Video Canvas Container */}
            <div className="relative w-full aspect-video sm:aspect-[16/10] bg-black rounded-lg overflow-hidden flex items-center justify-center border border-gray-800">
              <canvas
                ref={canvasRef}
                className="max-h-full max-w-full object-contain shadow-2xl"
              />

              {activeSlides.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 font-mono">
                  No panels included in storyboard
                </div>
              )}
            </div>

            {/* Controls Bar: Play/Pause, Scrubber, Info */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  disabled={activeSlides.length === 0}
                  className="w-10 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shrink-0 transition-colors shadow-sm disabled:opacity-40"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                {/* Scrubber slider */}
                <input
                  type="range"
                  min="0"
                  max={Math.max(0.1, totalDuration)}
                  step="0.05"
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  aria-label="Seek video playback"
                  className="flex-1 accent-blue-600 h-2 bg-gray-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Duration and Estimated File Size */}
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-1 pt-0.5">
                <span>
                  TOTAL: <strong className="text-gray-200">{totalDuration}s</strong> ({activeSlides.length} slides)
                </span>
                <span>
                  EST. SIZE: <strong className="text-gray-200">~{formatBytes(estimatedSize)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* High memory warning banner if > 60s at 1080p */}
          {isHighMemoryWarning && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <strong className="block font-semibold">High Memory Warning</strong>
                Estimated render exceeds 60 seconds at 1080p. Browser memory usage may be elevated. If performance drops, consider switching to 720p or reducing slide durations.
              </div>
            </div>
          )}

          {/* Fallback Notice */}
          {renderNotice && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-800 dark:text-blue-300 flex items-center gap-2 text-xs">
              <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>{renderNotice}</span>
            </div>
          )}

          {/* 3. Video Core Settings */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-[#1F2937] bg-gray-50 dark:bg-[#151D2C] space-y-4">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 font-mono uppercase tracking-wider block">
              VIDEO SETTINGS
            </span>

            {/* Aspect Ratio, Resolution & FPS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Aspect Ratio */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['9:16', '1:1', '16:9'] as VideoAspectRatio[]).map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, aspectRatio: ar }))}
                      className={`py-1.5 text-xs font-semibold rounded min-h-[38px] transition-colors border ${
                        settings.aspectRatio === ar
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#374151]'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                  Resolution
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {(['1080p', '720p'] as VideoResolution[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, resolution: res }))}
                      className={`py-1.5 text-xs font-semibold rounded min-h-[38px] transition-colors border ${
                        settings.resolution === res
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#374151]'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* FPS */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                  Frame Rate (FPS)
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {([30, 24] as VideoFps[]).map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, fps }))}
                      className={`py-1.5 text-xs font-semibold rounded min-h-[38px] transition-colors border ${
                        settings.fps === fps
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#374151]'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fit mode: Cover vs Contain with blurred background */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-200 dark:border-[#1F2937]">
              <div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                  Panel Fit Mode
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {settings.fitMode === 'cover'
                    ? 'Crop to fill full screen'
                    : 'Fit full panel with blurred ambient background fill'}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-gray-200 dark:bg-[#111827] p-0.5 rounded-lg border border-gray-300 dark:border-[#374151]">
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, fitMode: 'cover' }))}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    settings.fitMode === 'cover'
                      ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs font-bold'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Cover
                </button>
                <button
                  type="button"
                  onClick={() => setSettings((s) => ({ ...s, fitMode: 'contain' }))}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    settings.fitMode === 'contain'
                      ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xs font-bold'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Contain (Blur Fill)
                </button>
              </div>
            </div>

            {/* Duration per Slide Slider */}
            <div className="space-y-1.5 pt-1 border-t border-gray-200 dark:border-[#1F2937]">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Duration per Slide:
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {settings.durationPerSlide} seconds
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={settings.durationPerSlide}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, durationPerSlide: parseFloat(e.target.value) }))
                }
                className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-gray-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Transitions & Easing */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-gray-200 dark:border-[#1F2937]">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                  Transition Effect
                </label>
                <select
                  value={settings.transition}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, transition: e.target.value as VideoTransition }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-medium min-h-[38px]"
                >
                  <option value="none">None (Cut)</option>
                  <option value="fade">Fade (Crossfade)</option>
                  <option value="slide">Slide (Horizontal)</option>
                  <option value="zoom">Zoom (Dissolve)</option>
                  <option value="wipe">Wipe (Linear)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                  Transition Duration ({settings.transitionDuration}s)
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.1"
                  value={settings.transitionDuration}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      transitionDuration: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-gray-800 rounded-lg cursor-pointer mt-3"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                  Motion Easing
                </label>
                <select
                  value={settings.easing}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, easing: e.target.value as VideoEasing }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-medium min-h-[38px]"
                >
                  <option value="ease-in-out">Ease In-Out (Smooth)</option>
                  <option value="linear">Linear (Constant)</option>
                </select>
              </div>
            </div>

            {/* Default Slide Motion + Apply to All */}
            <div className="pt-1 border-t border-gray-200 dark:border-[#1F2937] space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Motion per Slide (Default)
                </label>
                <button
                  type="button"
                  onClick={() => handleApplyMotionToAll(settings.motionDefault)}
                  className="text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Apply to all slides
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    'none',
                    'zoom_in',
                    'zoom_out',
                    'pan_left',
                    'pan_right',
                    'pan_up',
                    'pan_down',
                    'random',
                  ] as SlideMotion[]
                ).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setSettings((s) => ({ ...s, motionDefault: m }));
                    }}
                    className={`py-1.5 px-2 rounded text-xs font-medium capitalize transition-colors border ${
                      settings.motionDefault === m
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#374151]'
                    }`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Soundtrack / Audio Upload */}
            <div className="pt-2 border-t border-gray-200 dark:border-[#1F2937] space-y-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                Soundtrack (Optional Audio)
              </span>
              {!settings.audio ? (
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer bg-white dark:bg-[#111827] transition-colors min-h-[44px]">
                  <Music className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Upload MP3 / WAV / M4A Audio
                  </span>
                  <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/m4a,audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-blue-900 dark:text-blue-300 truncate max-w-[220px]">
                      🎵 {settings.audio.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveAudio}
                      className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      title="Remove audio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-gray-600 dark:text-gray-400">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.audio.loop}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            audio: s.audio ? { ...s.audio, loop: e.target.checked } : undefined,
                          }))
                        }
                        className="rounded text-blue-600"
                      />
                      <span>Loop Audio</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.audio.fadeOut}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            audio: s.audio ? { ...s.audio, fadeOut: e.target.checked } : undefined,
                          }))
                        }
                        className="rounded text-blue-600"
                      />
                      <span>Fade Out at End</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Slides Timeline, Order & Customization */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 font-mono uppercase tracking-wider block">
                SLIDE PANELS ({activeSlides.length} / {settings.slides.length})
              </span>
              <span className="text-[11px] font-mono text-gray-500">
                Click slide to customize caption & motion
              </span>
            </div>

            <div className="space-y-2">
              {settings.slides.map((slide, idx) => {
                const panel =
                  panels.find((p) => p.id === slide.id) || panels[slide.panelIndex] || panels[idx];
                const isExpanded = expandedSlideIndex === idx;

                return (
                  <div
                    key={slide.id || idx}
                    className={`rounded-xl border transition-all ${
                      slide.included
                        ? 'border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827]'
                        : 'border-gray-200 dark:border-[#1F2937]/50 bg-gray-50 dark:bg-[#111827]/40 opacity-55'
                    }`}
                  >
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Include toggle */}
                        <input
                          type="checkbox"
                          checked={slide.included}
                          onChange={() => handleToggleInclude(idx)}
                          aria-label={`Include slide ${idx + 1}`}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />

                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded bg-gray-900 overflow-hidden shrink-0 border border-gray-300 dark:border-gray-700 flex items-center justify-center">
                          {panel?.blobUrl ? (
                            <img
                              src={panel.blobUrl}
                              alt={`Panel #${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-mono text-gray-400">#{idx + 1}</span>
                          )}
                        </div>

                        {/* Slide Info */}
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-gray-900 dark:text-white block truncate">
                            Slide #{idx + 1}: {panel?.customName || panel?.filename || `Panel ${idx + 1}`}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                            Motion: <strong className="text-blue-600 dark:text-blue-400 capitalize">{slide.motion.replace('_', ' ')}</strong>
                            {slide.caption?.text && ' • Has Caption'}
                          </span>
                        </div>
                      </div>

                      {/* Actions: Reorder up/down + Edit */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(idx, idx - 1)}
                          disabled={idx === 0}
                          aria-label="Move slide up"
                          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSlide(idx, idx + 1)}
                          disabled={idx === settings.slides.length - 1}
                          aria-label="Move slide down"
                          className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedSlideIndex(isExpanded ? null : idx)}
                          aria-label="Edit slide captions and motion"
                          className="px-2 py-1 rounded bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          {isExpanded ? 'Done' : 'Edit'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Slide Customizer (Motion & Caption) */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-[#1F2937] bg-gray-50/50 dark:bg-[#151D2C]/40 space-y-3 animate-in fade-in duration-100">
                        {/* Slide Motion Override */}
                        <div>
                          <label className="text-[11px] font-mono text-gray-500 dark:text-gray-400 block mb-1">
                            OVERRIDE MOTION:
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                            {(
                              [
                                'none',
                                'zoom_in',
                                'zoom_out',
                                'pan_left',
                                'pan_right',
                                'pan_up',
                                'pan_down',
                                'random',
                              ] as SlideMotion[]
                            ).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => handleUpdateSlideMotion(idx, m)}
                                className={`py-1 text-[11px] font-mono rounded capitalize transition-colors border ${
                                  slide.motion === m
                                    ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                    : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#374151]'
                                }`}
                              >
                                {m.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Slide Caption Text & Positioning */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-mono text-gray-500 dark:text-gray-400 block">
                            BURNED-IN TEXT CAPTION:
                          </label>
                          <input
                            type="text"
                            placeholder="Add slide caption (e.g. Chapter 1: The Beginning)..."
                            value={slide.caption?.text || ''}
                            onChange={(e) =>
                              handleUpdateSlideCaption(idx, { text: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-[#374151] bg-white dark:bg-[#111827] text-xs font-medium"
                          />

                          {slide.caption?.text && (
                            <div className="grid grid-cols-3 gap-2">
                              {/* Position */}
                              <div>
                                <span className="text-[10px] font-mono text-gray-400 block mb-0.5">POSITION</span>
                                <div className="grid grid-cols-2 gap-1">
                                  {(['bottom', 'top'] as CaptionPosition[]).map((pos) => (
                                    <button
                                      key={pos}
                                      type="button"
                                      onClick={() => handleUpdateSlideCaption(idx, { position: pos })}
                                      className={`py-1 text-[10px] font-mono rounded capitalize border ${
                                        slide.caption?.position === pos
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#374151]'
                                      }`}
                                    >
                                      {pos}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Size */}
                              <div>
                                <span className="text-[10px] font-mono text-gray-400 block mb-0.5">SIZE</span>
                                <div className="grid grid-cols-3 gap-1">
                                  {(['small', 'medium', 'large'] as CaptionSize[]).map((sz) => (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={() => handleUpdateSlideCaption(idx, { size: sz })}
                                      className={`py-1 text-[10px] font-mono rounded capitalize border ${
                                        (slide.caption?.size || 'medium') === sz
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#374151]'
                                      }`}
                                    >
                                      {sz[0].toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Text Color */}
                              <div>
                                <span className="text-[10px] font-mono text-gray-400 block mb-0.5">COLOR</span>
                                <div className="flex items-center gap-1.5 h-[26px]">
                                  <input
                                    type="color"
                                    value={slide.caption?.color || '#FFFFFF'}
                                    onChange={(e) => handleUpdateSlideCaption(idx, { color: e.target.value })}
                                    className="w-7 h-7 rounded border border-gray-300 dark:border-[#374151] cursor-pointer bg-transparent"
                                  />
                                  <span className="text-[10px] font-mono text-gray-500 uppercase">
                                    {slide.caption?.color || '#FFF'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Footer Export Bar */}
        <div className="p-4 border-t border-gray-200 dark:border-[#1F2937] bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md shrink-0 space-y-2">
          {isRendering && renderProgress && (
            <div className="space-y-1.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between text-xs font-mono">
                <span className="font-semibold text-blue-900 dark:text-blue-300">
                  {renderProgress.stage}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {renderProgress.percentage}%
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-150"
                  style={{ width: `${renderProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!isRendering ? (
              <button
                type="button"
                onClick={handleStartRender}
                disabled={activeSlides.length === 0}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-40"
              >
                <Film className="w-4 h-4 text-white" />
                <span>
                  Export Video ({settings.aspectRatio} • {settings.resolution})
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancelRender}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                <X className="w-4 h-4" />
                <span>Cancel Render</span>
              </button>
            )}

            {renderedResult && !isRendering && (
              <button
                type="button"
                onClick={() => downloadBlob(renderedResult.blob, renderedResult.filename)}
                className="py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
                title="Download generated video file"
              >
                <Download className="w-4 h-4" />
                <span>Save</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
