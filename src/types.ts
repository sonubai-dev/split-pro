export type SplitMode = 'grid' | 'vertical' | 'horizontal' | 'custom' | 'auto';

export type PanelOrder = 'row-by-row' | 'col-by-col' | 'snake' | 'custom';

export type FitMode = 'original' | 'fit' | 'fill' | 'crop';

export type OutputFormat = 'png' | 'jpeg' | 'webp';

export type ResolutionMode = '8k' | '4k' | '2k' | 'original' | 'custom';

export type GapBehavior = 'spacing' | 'skip_source';

export interface CustomSplitLine {
  id: string;
  orientation: 'vertical' | 'horizontal';
  position: number; // in source image pixels
}

export interface SplitBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelSlice {
  id: string;
  index: number;
  originalIndex: number;
  row: number;
  col: number;
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
  filename: string;
  customName?: string;
  blobUrl?: string;
  blob?: Blob;
  sizeBytes?: number;
  format: OutputFormat;
}

export interface EditorSettings {
  splitMode: SplitMode;
  autoPartsCount: number; // e.g. 10, 12, 15, 20, or custom
  autoOrientation?: 'balanced' | 'vertical' | 'horizontal';
  rows: number;
  columns: number;
  verticalCount: number;
  horizontalCount: number;
  customVLines: number[]; // X coordinates in pixels
  customHLines: number[]; // Y coordinates in pixels
  outerMargin: number; // px
  horizontalGap: number; // px
  verticalGap: number; // px
  gapBehavior: GapBehavior;
  panelOrder: PanelOrder;
  outputFormat: OutputFormat;
  quality: number; // 1 to 100
  contrast?: number; // 50 to 150 (100 is normal/natural)
  resolutionMode: ResolutionMode;
  enhanceTo8K?: boolean; // Automatically scale and enhance up to 8K Ultra-HD (7680px)
  enhanceTo4K?: boolean; // Automatically enhance quality up to 4K on upload & export
  sharpnessBoost?: boolean; // Unsharp edge enhancement for ultra-crisp details
  customScalePercent: number; // e.g. 100, 75, 50, 200
  customWidth?: number;
  customHeight?: number;
  namingPrefix: string;
  includeGridCoordsInName: boolean;
  fitMode: FitMode;
}

export interface PdfExportOptions {
  orientation: 'portrait' | 'landscape' | 'auto';
  pageSize: 'a4' | 'letter';
  fitToPage: boolean;
  marginMm: number;
}

export interface LoadedImage {
  file: File | null;
  name: string;
  url: string;
  width: number;
  height: number;
  size: number;
  type: string;
  imgElement: HTMLImageElement;
  imageBitmap?: ImageBitmap;
}

export interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  category: 'social' | 'grid' | 'creative' | 'aspect';
  rows: number;
  columns: number;
  mode: SplitMode;
  aspectRatioDisplay: string;
}

export interface ProcessingProgress {
  active: boolean;
  current: number;
  total: number;
  percentage: number;
  stage: string;
  cancellable: boolean;
}

export interface BatchImageResult {
  imageName: string;
  panels: PanelSlice[];
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}
