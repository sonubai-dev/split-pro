export type VideoAspectRatio = '9:16' | '1:1' | '16:9';
export type VideoResolution = '720p' | '1080p';
export type VideoFps = 24 | 30;
export type SlideMotion =
  | 'none'
  | 'zoom_in'
  | 'zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'pan_up'
  | 'pan_down'
  | 'random';
export type VideoTransition = 'none' | 'fade' | 'slide' | 'zoom' | 'wipe';
export type VideoEasing = 'linear' | 'ease-in-out';
export type VideoFitMode = 'cover' | 'contain';
export type CaptionPosition = 'top' | 'bottom';
export type CaptionSize = 'small' | 'medium' | 'large';

export interface SlideCaption {
  text: string;
  position: CaptionPosition;
  size: CaptionSize;
  color: string;
}

export interface SlideItemConfig {
  id: string; // panel ID or generated ID
  panelIndex: number; // 0-indexed order
  included: boolean;
  motion: SlideMotion;
  caption?: SlideCaption;
}

export interface AudioTrackConfig {
  file?: File;
  name?: string;
  blobUrl?: string;
  duration?: number;
  loop: boolean;
  trimToVideo: boolean;
  fadeOut: boolean;
  audioBuffer?: AudioBuffer;
}

export interface VideoSettings {
  aspectRatio: VideoAspectRatio;
  resolution: VideoResolution;
  fps: VideoFps;
  durationPerSlide: number; // 1-10s (default: 3)
  motionDefault: SlideMotion;
  transition: VideoTransition;
  transitionDuration: number; // 0.2-1.5s (default: 0.5)
  easing: VideoEasing;
  fitMode: VideoFitMode;
  slides: SlideItemConfig[];
  audio?: AudioTrackConfig;
}

export type VideoPresetName =
  | 'Instagram Reel'
  | 'Story Slideshow'
  | 'YouTube Storyboard'
  | 'Square Post';

export interface VideoDimensions {
  width: number;
  height: number;
}

export interface RenderProgress {
  percentage: number;
  currentFrame: number;
  totalFrames: number;
  stage: string;
}

export interface RenderResult {
  blob: Blob;
  filename: string;
  format: 'mp4' | 'webm';
  sizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
}
