import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import {
  VideoSettings,
  VideoPresetName,
  VideoDimensions,
  RenderProgress,
  RenderResult,
  SlideItemConfig,
  SlideMotion,
  CaptionPosition,
  CaptionSize,
} from './types';
import { PanelSlice } from '../types';

export const VIDEO_PRESETS: Record<
  VideoPresetName,
  {
    aspectRatio: '9:16' | '1:1' | '16:9';
    resolution: '720p' | '1080p';
    fps: 24 | 30;
    durationPerSlide: number;
    motionDefault: SlideMotion;
    transition: 'none' | 'fade' | 'slide' | 'zoom' | 'wipe';
    transitionDuration: number;
    easing: 'linear' | 'ease-in-out';
    fitMode: 'cover' | 'contain';
  }
> = {
  'Instagram Reel': {
    aspectRatio: '9:16',
    resolution: '1080p',
    fps: 30,
    durationPerSlide: 3,
    motionDefault: 'zoom_in',
    transition: 'fade',
    transitionDuration: 0.5,
    easing: 'ease-in-out',
    fitMode: 'cover',
  },
  'Story Slideshow': {
    aspectRatio: '9:16',
    resolution: '1080p',
    fps: 30,
    durationPerSlide: 4,
    motionDefault: 'random',
    transition: 'slide',
    transitionDuration: 0.6,
    easing: 'ease-in-out',
    fitMode: 'contain',
  },
  'YouTube Storyboard': {
    aspectRatio: '16:9',
    resolution: '1080p',
    fps: 30,
    durationPerSlide: 5,
    motionDefault: 'pan_right',
    transition: 'fade',
    transitionDuration: 0.5,
    easing: 'ease-in-out',
    fitMode: 'contain',
  },
  'Square Post': {
    aspectRatio: '1:1',
    resolution: '1080p',
    fps: 30,
    durationPerSlide: 3,
    motionDefault: 'zoom_in',
    transition: 'fade',
    transitionDuration: 0.5,
    easing: 'ease-in-out',
    fitMode: 'cover',
  },
};

/**
 * Calculates pixel dimensions based on aspect ratio and resolution.
 */
export function getVideoDimensions(
  aspectRatio: '9:16' | '1:1' | '16:9',
  resolution: '720p' | '1080p'
): VideoDimensions {
  if (resolution === '1080p') {
    switch (aspectRatio) {
      case '9:16':
        return { width: 1080, height: 1920 };
      case '1:1':
        return { width: 1080, height: 1080 };
      case '16:9':
        return { width: 1920, height: 1080 };
    }
  } else {
    // 720p
    switch (aspectRatio) {
      case '9:16':
        return { width: 720, height: 1280 };
      case '1:1':
        return { width: 720, height: 720 };
      case '16:9':
        return { width: 1280, height: 720 };
    }
  }
}

/**
 * Calculates total duration in seconds.
 */
export function calculateTotalDuration(settings: VideoSettings): number {
  const activeCount = settings.slides.filter((s) => s.included).length;
  return activeCount * settings.durationPerSlide;
}

/**
 * Estimates final video file size in bytes based on resolution, fps, and duration.
 */
export function estimateVideoSizeBytes(
  settings: VideoSettings,
  totalSeconds: number
): number {
  // Estimated bitrates: 1080p ~6 Mbps, 720p ~3 Mbps
  const bps = settings.resolution === '1080p' ? 6_000_000 : 3_000_000;
  const audioBps = settings.audio ? 192_000 : 0;
  return Math.round(((bps + audioBps) / 8) * totalSeconds);
}

/**
 * Easing function helper.
 */
export function applyEasing(
  t: number,
  easing: 'linear' | 'ease-in-out'
): number {
  const clamped = Math.max(0, Math.min(1, t));
  if (easing === 'linear') return clamped;
  // Smooth cubic ease-in-out
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Resolves effective motion for a slide (resolving 'random' deterministically).
 */
export function resolveSlideMotion(
  motion: SlideMotion,
  slideIndex: number
): SlideMotion {
  if (motion !== 'random') return motion;
  const choices: SlideMotion[] = [
    'zoom_in',
    'zoom_out',
    'pan_left',
    'pan_right',
    'pan_up',
    'pan_down',
  ];
  return choices[slideIndex % choices.length];
}

/**
 * Pre-downscales panel slice to target video resolution to minimize RAM usage during animation.
 */
export async function prepareSlideBitmap(
  panel: PanelSlice,
  targetWidth: number,
  targetHeight: number
): Promise<ImageBitmap | HTMLCanvasElement> {
  const maxDim = Math.max(targetWidth, targetHeight);

  // Load image element first
  const img = new Image();
  img.crossOrigin = 'anonymous';

  let srcUrl = panel.blobUrl;
  let isTemp = false;
  if (!srcUrl && panel.blob) {
    srcUrl = URL.createObjectURL(panel.blob);
    isTemp = true;
  }
  if (!srcUrl) {
    throw new Error(`Panel slice #${panel.index} has no image data.`);
  }

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load panel #${panel.index}`));
    img.src = srcUrl!;
  });

  if (isTemp) {
    URL.revokeObjectURL(srcUrl);
  }

  // Calculate downscaled dimensions maintaining aspect ratio
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const scaledWidth = Math.max(2, Math.round(img.width * scale));
  const scaledHeight = Math.max(2, Math.round(img.height * scale));

  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(img, {
        resizeWidth: scaledWidth,
        resizeHeight: scaledHeight,
        resizeQuality: 'high',
      });
      return bitmap;
    } catch {
      // Fallback to canvas below
    }
  }

  // Canvas fallback
  const c = document.createElement('canvas');
  c.width = scaledWidth;
  c.height = scaledHeight;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
  }
  return c;
}

/**
 * Draws a single slide with motion onto the given context.
 */
export function drawSlideLayer(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap | HTMLCanvasElement,
  width: number,
  height: number,
  motion: SlideMotion,
  progress: number, // 0 to 1
  fitMode: 'cover' | 'contain',
  easing: 'linear' | 'ease-in-out',
  opacity = 1
): void {
  ctx.save();
  ctx.globalAlpha = opacity;

  const easedProgress = applyEasing(progress, easing);

  // 1. If 'contain', draw blurred background fill first
  if (fitMode === 'contain') {
    ctx.save();
    ctx.filter = 'blur(28px) brightness(0.65)';
    // Draw background cover with extra bleed to prevent edges
    const bgScale = Math.max((width + 80) / source.width, (height + 80) / source.height);
    const bgW = source.width * bgScale;
    const bgH = source.height * bgScale;
    ctx.drawImage(
      source,
      (width - bgW) / 2,
      (height - bgH) / 2,
      bgW,
      bgH
    );
    ctx.restore();
  }

  // 2. Compute motion transform (Zoom & Pan)
  let scaleMultiplier = 1.0;
  let offsetX = 0;
  let offsetY = 0;

  switch (motion) {
    case 'zoom_in':
      scaleMultiplier = 1.0 + easedProgress * 0.15;
      break;
    case 'zoom_out':
      scaleMultiplier = 1.15 - easedProgress * 0.15;
      break;
    case 'pan_left':
      scaleMultiplier = 1.1;
      offsetX = (0.5 - easedProgress) * (width * 0.1);
      break;
    case 'pan_right':
      scaleMultiplier = 1.1;
      offsetX = (easedProgress - 0.5) * (width * 0.1);
      break;
    case 'pan_up':
      scaleMultiplier = 1.1;
      offsetY = (0.5 - easedProgress) * (height * 0.1);
      break;
    case 'pan_down':
      scaleMultiplier = 1.1;
      offsetY = (easedProgress - 0.5) * (height * 0.1);
      break;
    case 'none':
    default:
      scaleMultiplier = 1.0;
      break;
  }

  // 3. Compute base fitting scale
  let baseScale = 1.0;
  if (fitMode === 'cover') {
    baseScale = Math.max(width / source.width, height / source.height);
  } else {
    // contain
    baseScale = Math.min((width * 0.94) / source.width, (height * 0.94) / source.height);
  }

  const finalScale = baseScale * scaleMultiplier;
  const drawW = source.width * finalScale;
  const drawH = source.height * finalScale;
  const drawX = (width - drawW) / 2 + offsetX;
  const drawY = (height - drawH) / 2 + offsetY;

  // Add subtle drop shadow when in contain mode
  if (fitMode === 'contain') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
  }

  ctx.drawImage(source, drawX, drawY, drawW, drawH);
  ctx.restore();
}

/**
 * Draws caption text burned into video.
 */
export function drawSlideCaption(
  ctx: CanvasRenderingContext2D,
  caption: {
    text: string;
    position: CaptionPosition;
    size: CaptionSize;
    color: string;
  },
  width: number,
  height: number
): void {
  if (!caption.text || !caption.text.trim()) return;

  ctx.save();

  // Font size relative to resolution
  let fontSize = 32;
  if (caption.size === 'small') fontSize = Math.round(width * 0.024);
  else if (caption.size === 'medium') fontSize = Math.round(width * 0.034);
  else if (caption.size === 'large') fontSize = Math.round(width * 0.048);

  fontSize = Math.max(14, fontSize);

  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const text = caption.text.trim();
  const textMetrics = ctx.measureText(text);
  const paddingX = fontSize * 0.8;
  const paddingY = fontSize * 0.4;
  const boxWidth = textMetrics.width + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const boxX = (width - boxWidth) / 2;

  let boxY = 0;
  if (caption.position === 'top') {
    boxY = height * 0.08;
  } else {
    boxY = height * 0.88 - boxHeight;
  }

  // Semi-transparent pill background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 12;
  const radius = boxHeight / 4;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
  ctx.fill();

  // Text
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = caption.color || '#FFFFFF';
  ctx.fillText(text, width / 2, boxY + boxHeight / 2);

  ctx.restore();
}

/**
 * Renders an exact frame at arbitrary second timestamp `t`.
 */
export function renderExactFrame(
  ctx: CanvasRenderingContext2D,
  bitmaps: (ImageBitmap | HTMLCanvasElement)[],
  activeSlides: SlideItemConfig[],
  settings: VideoSettings,
  timeSec: number,
  width: number,
  height: number
): void {
  // Clear canvas
  ctx.fillStyle = '#0A0A0B';
  ctx.fillRect(0, 0, width, height);

  if (activeSlides.length === 0 || bitmaps.length === 0) return;

  const durationPerSlide = settings.durationPerSlide;
  const totalDuration = activeSlides.length * durationPerSlide;
  const clampedTime = Math.max(0, Math.min(totalDuration - 0.0001, timeSec));

  const currentSlideIdx = Math.min(
    activeSlides.length - 1,
    Math.floor(clampedTime / durationPerSlide)
  );
  const timeInSlide = clampedTime - currentSlideIdx * durationPerSlide;
  const slideProgress = timeInSlide / durationPerSlide;

  const currentSlide = activeSlides[currentSlideIdx];
  const currentBitmap = bitmaps[currentSlideIdx];
  const currentMotion = resolveSlideMotion(
    currentSlide.motion || settings.motionDefault,
    currentSlideIdx
  );

  const transDuration = Math.min(settings.transitionDuration, durationPerSlide * 0.4);
  const isTransitioning =
    settings.transition !== 'none' &&
    transDuration > 0 &&
    timeInSlide >= durationPerSlide - transDuration &&
    currentSlideIdx < activeSlides.length - 1;

  if (!isTransitioning) {
    // Normal single slide frame
    if (currentBitmap) {
      drawSlideLayer(
        ctx,
        currentBitmap,
        width,
        height,
        currentMotion,
        slideProgress,
        settings.fitMode,
        settings.easing,
        1
      );
    }
    if (currentSlide.caption) {
      drawSlideCaption(ctx, currentSlide.caption, width, height);
    }
  } else {
    // Transition between current slide and next slide
    const nextSlideIdx = currentSlideIdx + 1;
    const nextSlide = activeSlides[nextSlideIdx];
    const nextBitmap = bitmaps[nextSlideIdx];
    const nextMotion = resolveSlideMotion(
      nextSlide.motion || settings.motionDefault,
      nextSlideIdx
    );

    const transProgress = (timeInSlide - (durationPerSlide - transDuration)) / transDuration;
    const easedTrans = applyEasing(transProgress, settings.easing);

    switch (settings.transition) {
      case 'fade': {
        // Draw current slide full
        drawSlideLayer(
          ctx,
          currentBitmap,
          width,
          height,
          currentMotion,
          slideProgress,
          settings.fitMode,
          settings.easing,
          1
        );
        // Draw next slide with alpha
        drawSlideLayer(
          ctx,
          nextBitmap,
          width,
          height,
          nextMotion,
          0,
          settings.fitMode,
          settings.easing,
          easedTrans
        );
        break;
      }
      case 'slide': {
        // Slide push left
        ctx.save();
        ctx.translate(-easedTrans * width, 0);
        drawSlideLayer(
          ctx,
          currentBitmap,
          width,
          height,
          currentMotion,
          slideProgress,
          settings.fitMode,
          settings.easing,
          1
        );
        ctx.restore();

        ctx.save();
        ctx.translate((1 - easedTrans) * width, 0);
        drawSlideLayer(
          ctx,
          nextBitmap,
          width,
          height,
          nextMotion,
          0,
          settings.fitMode,
          settings.easing,
          1
        );
        ctx.restore();
        break;
      }
      case 'zoom': {
        // Current zoom scales slightly down with fade
        drawSlideLayer(
          ctx,
          currentBitmap,
          width,
          height,
          currentMotion,
          slideProgress,
          settings.fitMode,
          settings.easing,
          1 - easedTrans
        );
        drawSlideLayer(
          ctx,
          nextBitmap,
          width,
          height,
          nextMotion,
          0,
          settings.fitMode,
          settings.easing,
          easedTrans
        );
        break;
      }
      case 'wipe': {
        // Linear horizontal wipe
        drawSlideLayer(
          ctx,
          currentBitmap,
          width,
          height,
          currentMotion,
          slideProgress,
          settings.fitMode,
          settings.easing,
          1
        );

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width * easedTrans, height);
        ctx.clip();
        drawSlideLayer(
          ctx,
          nextBitmap,
          width,
          height,
          nextMotion,
          0,
          settings.fitMode,
          settings.easing,
          1
        );
        ctx.restore();
        break;
      }
      default:
        drawSlideLayer(
          ctx,
          currentBitmap,
          width,
          height,
          currentMotion,
          slideProgress,
          settings.fitMode,
          settings.easing,
          1
        );
    }

    // Blend caption
    if (transProgress < 0.5 && currentSlide.caption) {
      drawSlideCaption(ctx, currentSlide.caption, width, height);
    } else if (transProgress >= 0.5 && nextSlide.caption) {
      drawSlideCaption(ctx, nextSlide.caption, width, height);
    }
  }
}

/**
 * Checks if WebCodecs VideoEncoder is supported in this browser.
 */
export async function checkWebCodecsSupport(
  width: number,
  height: number,
  fps: number
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (typeof (window as any).VideoEncoder === 'undefined' || typeof (window as any).VideoFrame === 'undefined') {
    return false;
  }
  try {
    const config = {
      codec: 'avc1.42001f', // H.264 Baseline Level 3.1
      width,
      height,
      bitrate: 5_000_000,
      framerate: fps,
    };
    const res = await (window as any).VideoEncoder.isConfigSupported(config);
    return Boolean(res && res.supported);
  } catch {
    return false;
  }
}

/**
 * Main Video Render function with deterministic frame timing.
 * Uses WebCodecs + mp4-muxer for MP4, or falls back to canvas.captureStream() + MediaRecorder for WebM.
 */
export async function renderVideoExport(
  panels: PanelSlice[],
  settings: VideoSettings,
  onProgress?: (prog: RenderProgress) => void,
  signal?: AbortSignal
): Promise<RenderResult> {
  const activeSlides = settings.slides.filter((s) => s.included);
  if (activeSlides.length === 0) {
    throw new Error('At least one slide must be included to render video.');
  }

  const { width, height } = getVideoDimensions(settings.aspectRatio, settings.resolution);
  const fps = settings.fps;
  const durationPerSlide = settings.durationPerSlide;
  const totalDuration = activeSlides.length * durationPerSlide;
  const totalFrames = Math.round(totalDuration * fps);

  // 1. Prepare and downscale panel bitmaps
  onProgress?.({
    percentage: 0,
    currentFrame: 0,
    totalFrames,
    stage: 'Preparing high-definition panel frames...',
  });

  const preparedBitmaps: (ImageBitmap | HTMLCanvasElement)[] = [];
  try {
    for (let i = 0; i < activeSlides.length; i++) {
      if (signal?.aborted) throw new Error('Render cancelled by user.');
      const slide = activeSlides[i];
      const panel = panels.find((p) => p.id === slide.id) || panels[slide.panelIndex] || panels[i];
      if (!panel) {
        throw new Error(`Panel slice for slide #${i + 1} not found.`);
      }
      const bitmap = await prepareSlideBitmap(panel, width, height);
      preparedBitmaps.push(bitmap);

      onProgress?.({
        percentage: Math.round(((i + 1) / activeSlides.length) * 10),
        currentFrame: 0,
        totalFrames,
        stage: `Prepared slide ${i + 1} of ${activeSlides.length}...`,
      });
    }

    // 2. Setup rendering canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not create 2D canvas context.');

    // 3. Detect WebCodecs vs MediaRecorder fallback
    const hasWebCodecs = await checkWebCodecsSupport(width, height, fps);

    if (hasWebCodecs) {
      // --- WebCodecs + mp4-muxer rendering path ---
      return await renderWithWebCodecs(
        canvas,
        ctx,
        preparedBitmaps,
        activeSlides,
        settings,
        width,
        height,
        fps,
        totalFrames,
        totalDuration,
        onProgress,
        signal
      );
    } else {
      // --- MediaRecorder Fallback (WebM) ---
      return await renderWithMediaRecorder(
        canvas,
        ctx,
        preparedBitmaps,
        activeSlides,
        settings,
        width,
        height,
        fps,
        totalFrames,
        totalDuration,
        onProgress,
        signal
      );
    }
  } finally {
    // Release bitmaps to free memory
    preparedBitmaps.forEach((b) => {
      if ('close' in b && typeof b.close === 'function') {
        b.close();
      }
    });
  }
}

/**
 * WebCodecs + mp4-muxer deterministic export.
 */
async function renderWithWebCodecs(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  bitmaps: (ImageBitmap | HTMLCanvasElement)[],
  activeSlides: SlideItemConfig[],
  settings: VideoSettings,
  width: number,
  height: number,
  fps: number,
  totalFrames: number,
  totalDuration: number,
  onProgress?: (prog: RenderProgress) => void,
  signal?: AbortSignal
): Promise<RenderResult> {
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
    },
    fastStart: 'in-memory',
  });

  let encoderError: Error | null = null;
  const videoEncoder = new (window as any).VideoEncoder({
    output: (chunk: any, meta: any) => {
      muxer.addVideoChunk(chunk, meta);
    },
    error: (e: any) => {
      encoderError = e instanceof Error ? e : new Error(String(e));
    },
  });

  const bitrate = settings.resolution === '1080p' ? 8_000_000 : 4_500_000;
  await videoEncoder.configure({
    codec: 'avc1.42001f', // Baseline profile
    width,
    height,
    bitrate,
    framerate: fps,
  });

  const frameDurationUs = Math.round(1_000_000 / fps);

  for (let frame = 0; frame < totalFrames; frame++) {
    if (signal?.aborted) {
      videoEncoder.close();
      throw new Error('Render cancelled by user.');
    }
    if (encoderError) {
      throw encoderError;
    }

    const timeSec = frame / fps;
    renderExactFrame(ctx, bitmaps, activeSlides, settings, timeSec, width, height);

    const timestampUs = frame * frameDurationUs;
    const videoFrame = new (window as any).VideoFrame(canvas, {
      timestamp: timestampUs,
      duration: frameDurationUs,
    });

    const isKeyFrame = frame % (fps * 2) === 0;
    videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    // Yield every 3 frames to keep UI responsive
    if (frame % 3 === 0) {
      const pct = 10 + Math.round((frame / totalFrames) * 85);
      onProgress?.({
        percentage: pct,
        currentFrame: frame + 1,
        totalFrames,
        stage: `Encoding frame ${frame + 1} of ${totalFrames} (${pct}%)...`,
      });
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress?.({
    percentage: 96,
    currentFrame: totalFrames,
    totalFrames,
    stage: 'Finalizing MP4 video container...',
  });

  await videoEncoder.flush();
  videoEncoder.close();
  muxer.finalize();

  const buffer = target.buffer;
  const blob = new Blob([buffer], { type: 'video/mp4' });

  return {
    blob,
    filename: 'vistaroai-video.mp4',
    format: 'mp4',
    sizeBytes: blob.size,
    durationSec: totalDuration,
    width,
    height,
  };
}

/**
 * MediaRecorder fallback export (WebM).
 */
async function renderWithMediaRecorder(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  bitmaps: (ImageBitmap | HTMLCanvasElement)[],
  activeSlides: SlideItemConfig[],
  settings: VideoSettings,
  width: number,
  height: number,
  fps: number,
  totalFrames: number,
  totalDuration: number,
  onProgress?: (prog: RenderProgress) => void,
  signal?: AbortSignal
): Promise<RenderResult> {
  const stream = canvas.captureStream(fps);
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const chosenMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: chosenMime,
    videoBitsPerSecond: settings.resolution === '1080p' ? 8_000_000 : 4_500_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  recorder.start();

  const frameIntervalMs = 1000 / fps;

  for (let frame = 0; frame < totalFrames; frame++) {
    if (signal?.aborted) {
      recorder.stop();
      throw new Error('Render cancelled by user.');
    }

    const timeSec = frame / fps;
    renderExactFrame(ctx, bitmaps, activeSlides, settings, timeSec, width, height);

    // Yield frame timing
    await new Promise((r) => setTimeout(r, Math.max(1, frameIntervalMs * 0.8)));

    if (frame % 4 === 0) {
      const pct = 10 + Math.round((frame / totalFrames) * 85);
      onProgress?.({
        percentage: pct,
        currentFrame: frame + 1,
        totalFrames,
        stage: `Recording WebM frame ${frame + 1} of ${totalFrames} (${pct}%)...`,
      });
    }
  }

  onProgress?.({
    percentage: 97,
    currentFrame: totalFrames,
    totalFrames,
    stage: 'Finalizing WebM video file...',
  });

  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    recorder.stop();
  });

  const blob = new Blob(chunks, { type: 'video/webm' });

  return {
    blob,
    filename: 'vistaroai-video.webm',
    format: 'webm',
    sizeBytes: blob.size,
    durationSec: totalDuration,
    width,
    height,
  };
}
