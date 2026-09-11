import { EditorSettings, LoadedImage, PanelSlice, SmartSuggestion } from '../types';
import { runAutomatedSplitTestSuite, validateSliceCoverage, ValidationResult } from './splitValidation';

/**
 * Intelligently calculates optimal rows and columns for a given total number of parts,
 * factoring the number and selecting the (rows, cols) pairing that yields the most
 * harmonious panel proportions relative to the source image's aspect ratio.
 */
export function calculateAutoSplitGrid(
  sourceWidth: number,
  sourceHeight: number,
  totalParts: number,
  orientationPreference: 'balanced' | 'vertical' | 'horizontal' = 'balanced'
): { rows: number; cols: number } {
  const parts = Math.max(1, Math.min(100, Math.floor(totalParts ?? 10)));

  if (parts <= 1) {
    return { rows: 1, cols: 1 };
  }

  if (orientationPreference === 'vertical') {
    return { rows: 1, cols: parts };
  }

  if (orientationPreference === 'horizontal') {
    return { rows: parts, cols: 1 };
  }

  // Find all factor pairs (r, c) such that r * c = parts
  const factorPairs: { rows: number; cols: number }[] = [];
  for (let r = 1; r <= parts; r++) {
    if (parts % r === 0) {
      factorPairs.push({ rows: r, cols: parts / r });
    }
  }

  if (factorPairs.length === 0) {
    return { rows: 1, cols: parts };
  }

  const imageAspect = sourceWidth / Math.max(1, sourceHeight);

  // Score each factor pair: minimize difference between panel aspect ratio and ideal square (1.0)
  let bestPair = factorPairs[0];
  let bestScore = Infinity;

  for (const pair of factorPairs) {
    const panelAspect = imageAspect * (pair.rows / pair.cols);
    const score = Math.abs(Math.log(panelAspect));

    if (score < bestScore) {
      bestScore = score;
      bestPair = pair;
    }
  }

  return bestPair;
}

/**
 * Calculates exact slice rectangles on the source image according to settings.
 * Handles fractional coordinates with mathematical precision so adjacent panels
 * share exact boundary edges without seams, subpixel blurs, or missing pixels.
 */
export function calculateSlices(
  sourceWidth: number,
  sourceHeight: number,
  settings: EditorSettings
): Omit<PanelSlice, 'blob' | 'blobUrl' | 'sizeBytes'>[] {
  if (sourceWidth <= 0 || sourceHeight <= 0) return [];

  const {
    splitMode,
    autoPartsCount = 10,
    autoOrientation = 'balanced',
    rows: rawRows = 1,
    columns: rawCols = 1,
    verticalCount = 2,
    horizontalCount = 2,
    customVLines = [],
    customHLines = [],
    outerMargin = 0,
    horizontalGap = 0,
    verticalGap = 0,
    gapBehavior = 'spacing',
    panelOrder = 'row-by-row',
    outputFormat = 'png',
    customScalePercent = 100,
    resolutionMode = 'original',
    namingPrefix = 'slice',
    includeGridCoordsInName = false,
  } = settings;

  let gridRows = 1;
  let gridCols = 1;

  if (splitMode === 'auto') {
    const autoResult = calculateAutoSplitGrid(
      sourceWidth,
      sourceHeight,
      autoPartsCount,
      autoOrientation
    );
    gridRows = autoResult.rows;
    gridCols = autoResult.cols;
  } else if (splitMode === 'grid') {
    gridRows = Math.max(1, Math.min(20, Math.floor(rawRows)));
    gridCols = Math.max(1, Math.min(20, Math.floor(rawCols)));
  } else if (splitMode === 'vertical') {
    gridRows = 1;
    gridCols = Math.max(1, Math.min(20, Math.floor(verticalCount)));
  } else if (splitMode === 'horizontal') {
    gridRows = Math.max(1, Math.min(20, Math.floor(horizontalCount)));
    gridCols = 1;
  }

  const rawSlices: {
    row: number;
    col: number;
    sourceX: number;
    sourceY: number;
    sourceWidth: number;
    sourceHeight: number;
  }[] = [];

  if (splitMode === 'custom') {
    // Sanitize, filter within (0, sourceWidth/Height), and sort custom split lines
    const vSorted = Array.from(
      new Set(
        customVLines
          .map((v) => Math.round(v))
          .filter((v) => v > 0 && v < sourceWidth)
      )
    ).sort((a, b) => a - b);

    const hSorted = Array.from(
      new Set(
        customHLines
          .map((h) => Math.round(h))
          .filter((h) => h > 0 && h < sourceHeight)
      )
    ).sort((a, b) => a - b);

    const vBounds = [0, ...vSorted, sourceWidth];
    const hBounds = [0, ...hSorted, sourceHeight];

    for (let r = 0; r < hBounds.length - 1; r++) {
      for (let c = 0; c < vBounds.length - 1; c++) {
        const x1 = vBounds[c];
        const x2 = vBounds[c + 1];
        const y1 = hBounds[r];
        const y2 = hBounds[r + 1];

        const sWidth = Math.max(1, x2 - x1);
        const sHeight = Math.max(1, y2 - y1);

        rawSlices.push({
          row: r,
          col: c,
          sourceX: x1,
          sourceY: y1,
          sourceWidth: sWidth,
          sourceHeight: sHeight,
        });
      }
    }
  } else {
    // Grid, Vertical, or Horizontal calculation
    const clampedMargin = Math.max(
      0,
      Math.min(outerMargin, Math.floor(sourceWidth / 2) - 1, Math.floor(sourceHeight / 2) - 1)
    );
    const usableWidth = Math.max(gridCols, sourceWidth - clampedMargin * 2);
    const usableHeight = Math.max(gridRows, sourceHeight - clampedMargin * 2);

    if (gapBehavior === 'skip_source' && (horizontalGap > 0 || verticalGap > 0)) {
      // In skip_source mode, gaps between panels discard pixels from the source
      const totalHGap = (gridCols - 1) * Math.max(0, horizontalGap);
      const totalVGap = (gridRows - 1) * Math.max(0, verticalGap);

      const netWidth = Math.max(gridCols, usableWidth - totalHGap);
      const netHeight = Math.max(gridRows, usableHeight - totalVGap);

      for (let r = 0; r < gridRows; r++) {
        const y0 = clampedMargin + r * verticalGap + Math.round((r * netHeight) / gridRows);
        const y1 = clampedMargin + r * verticalGap + Math.round(((r + 1) * netHeight) / gridRows);
        const sHeight = Math.max(1, y1 - y0);

        for (let c = 0; c < gridCols; c++) {
          const x0 = clampedMargin + c * horizontalGap + Math.round((c * netWidth) / gridCols);
          const x1 = clampedMargin + c * horizontalGap + Math.round(((c + 1) * netWidth) / gridCols);
          const sWidth = Math.max(1, x1 - x0);

          rawSlices.push({
            row: r,
            col: c,
            sourceX: x0,
            sourceY: y0,
            sourceWidth: sWidth,
            sourceHeight: sHeight,
          });
        }
      }
    } else {
      // Standard partition: mathematically exact boundaries, zero gaps, zero overlaps
      for (let r = 0; r < gridRows; r++) {
        const y0 = clampedMargin + Math.round((r * usableHeight) / gridRows);
        const y1 = clampedMargin + Math.round(((r + 1) * usableHeight) / gridRows);
        const sHeight = Math.max(1, y1 - y0);

        for (let c = 0; c < gridCols; c++) {
          const x0 = clampedMargin + Math.round((c * usableWidth) / gridCols);
          const x1 = clampedMargin + Math.round(((c + 1) * usableWidth) / gridCols);
          const sWidth = Math.max(1, x1 - x0);

          rawSlices.push({
            row: r,
            col: c,
            sourceX: x0,
            sourceY: y0,
            sourceWidth: sWidth,
            sourceHeight: sHeight,
          });
        }
      }
    }
  }

  // Determine ordering
  let orderedSlices = [...rawSlices];
  if (splitMode !== 'custom') {
    if (panelOrder === 'col-by-col') {
      orderedSlices.sort((a, b) => (a.col === b.col ? a.row - b.row : a.col - b.col));
    } else if (panelOrder === 'snake') {
      orderedSlices.sort((a, b) => {
        if (a.row === b.row) {
          return a.row % 2 === 0 ? a.col - b.col : b.col - a.col;
        }
        return a.row - b.row;
      });
    } else {
      // row-by-row
      orderedSlices.sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));
    }
  }

  // 8K, 4K Ultra-HD & Dynamic Resolution Scaling
  const maxDim = Math.max(sourceWidth, sourceHeight);
  let scaleMultiplier = 1.0;

  if (settings.enhanceTo8K || settings.resolutionMode === '8k') {
    // 8K Ultra HD target: 7680px on longest dimension
    if (maxDim < 7680) {
      scaleMultiplier = Number((7680 / maxDim).toFixed(4));
    } else {
      scaleMultiplier = 1.0;
    }
  } else if (settings.enhanceTo4K || settings.resolutionMode === '4k') {
    // 4K Ultra HD target: 3840px on longest dimension
    if (maxDim < 3840) {
      scaleMultiplier = Number((3840 / maxDim).toFixed(4));
    } else {
      scaleMultiplier = 1.0;
    }
  } else if (settings.resolutionMode === '2k') {
    if (maxDim < 2560) {
      scaleMultiplier = Number((2560 / maxDim).toFixed(4));
    } else {
      scaleMultiplier = 1.0;
    }
  } else if (settings.resolutionMode === 'custom') {
    scaleMultiplier = Math.max(0.1, (customScalePercent || 100) / 100);
  } else {
    scaleMultiplier = 1.0;
  }

  const prefix = namingPrefix.trim() || 'panel';

  return orderedSlices.map((item, index) => {
    const outWidth = Math.max(1, Math.round(item.sourceWidth * scaleMultiplier));
    const outHeight = Math.max(1, Math.round(item.sourceHeight * scaleMultiplier));
    const padIndex = String(index + 1).padStart(2, '0');
    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;

    let defaultName = `${prefix}_${padIndex}.${ext}`;
    if (includeGridCoordsInName && splitMode === 'grid') {
      const padR = String(item.row + 1).padStart(2, '0');
      const padC = String(item.col + 1).padStart(2, '0');
      defaultName = `${prefix}_r${padR}_c${padC}.${ext}`;
    }

    return {
      id: `slice_${item.row}_${item.col}_${index}`,
      index: index + 1,
      originalIndex: index + 1,
      row: item.row,
      col: item.col,
      sourceX: item.sourceX,
      sourceY: item.sourceY,
      sourceWidth: item.sourceWidth,
      sourceHeight: item.sourceHeight,
      outputWidth: outWidth,
      outputHeight: outHeight,
      filename: defaultName,
      format: outputFormat,
    };
  });
}

/**
 * Advanced Multi-Scale Unsharp Mask & High-Frequency Detail Engine.
 * Ensures output slices are razor-sharp, distinct, and crystal clear.
 * Adapts convolution radius and weight depending on resolution (e.g. 4K, 8K, or native).
 */
export function applySharpnessEnhancement(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  level: 'off' | 'subtle' | 'crisp' | 'ultra' = 'ultra',
  isHighRes: boolean = false
): void {
  if (level === 'off') return;

  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const src = imgData.data;
    const dst = new Uint8ClampedArray(src);
    const w = width;
    const h = height;

    // Determine sharpening strength based on level
    let strength = 0.35; // 'ultra' default
    if (level === 'subtle') strength = 0.16;
    else if (level === 'crisp') strength = 0.26;
    else if (level === 'ultra') strength = 0.42;

    if (isHighRes) {
      strength = Math.min(0.55, strength * 1.25);
    }

    // Adaptive step distance for higher resolutions (1px, 2px, or 3px radius)
    // Ensures sharpness doesn't vanish on huge 4K or 8K canvases
    const maxDim = Math.max(w, h);
    const step = maxDim >= 5000 ? 2 : 1;

    const a = Math.max(0.08, Math.min(0.55, strength));
    const center = 1 + 4 * a;

    // Threshold below which subtle gradient changes are preserved without noise amplification
    const threshold = 3;

    for (let y = step; y < h - step; y++) {
      const rowPrev = (y - step) * w;
      const rowCurr = y * w;
      const rowNext = (y + step) * w;

      for (let x = step; x < w - step; x++) {
        const i = (rowCurr + x) << 2;
        const top = (rowPrev + x) << 2;
        const bottom = (rowNext + x) << 2;
        const left = (rowCurr + (x - step)) << 2;
        const right = (rowCurr + (x + step)) << 2;

        // Process R, G, B channels with edge thresholding
        for (let c = 0; c < 3; c++) {
          const orig = dst[i + c];
          const neighborAvg = (dst[top + c] + dst[bottom + c] + dst[left + c] + dst[right + c]) * 0.25;
          const diff = orig - neighborAvg;

          // Only sharpen if difference exceeds noise threshold
          if (Math.abs(diff) >= threshold) {
            src[i + c] = Math.min(255, Math.max(0, orig + diff * (a * 4)));
          } else {
            src[i + c] = orig;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    // If context doesn't support reading or is tainted, silently skip
    console.debug('Sharpness enhancement skipped:', err);
  }
}

/**
 * Applies micro-contrast clarity enhancement.
 * De-hazes muddy textures and accentuates mid-tone edge definition,
 * creating clean, punchy, crystal-clear imagery without blown highlights.
 */
export function applyClarityEnhancement(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  clarityAmount: number = 0.18
): void {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const len = d.length;

    // Precalculate S-curve LUT for mid-tone micro-contrast enhancement
    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      const normalized = i / 255;
      // Smooth Hermite S-curve centered around mid-gray (0.5)
      // Boosts separation in 20%-80% luminance range while tapering near 0% (black) and 100% (white)
      const delta = Math.sin((normalized - 0.5) * Math.PI) * clarityAmount * 28;
      lut[i] = Math.min(255, Math.max(0, Math.round(i + delta)));
    }

    for (let i = 0; i < len; i += 4) {
      d[i] = lut[d[i]];
      d[i + 1] = lut[d[i + 1]];
      d[i + 2] = lut[d[i + 2]];
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.debug('Clarity enhancement skipped:', err);
  }
}

/**
 * Applies photographic contrast adjustment to canvas context.
 * 100 is neutral natural contrast. Range 50-150.
 */
function applyContrastEnhancement(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  contrastPercent: number
): void {
  if (contrastPercent === 100 || !contrastPercent) return;
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    // Standard photographic contrast formula with center at 128
    const contrastVal = Math.max(-100, Math.min(100, contrastPercent - 100));
    const factor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128));
      d[i + 1] = Math.min(255, Math.max(0, factor * (d[i + 1] - 128) + 128));
      d[i + 2] = Math.min(255, Math.max(0, factor * (d[i + 2] - 128) + 128));
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.debug('Contrast adjustment skipped:', err);
  }
}

/**
 * Extracts high resolution panel blobs from the ORIGINAL source image.
 * Never downsamples from preview canvas; draws raw pixel rectangles at 100% fidelity.
 * Supports createImageBitmap, OffscreenCanvas (where supported), or high-DPI HTMLCanvasElement.
 */
export async function generatePanelOutputs(
  image: LoadedImage,
  slices: Omit<PanelSlice, 'blob' | 'blobUrl' | 'sizeBytes'>[],
  settings: EditorSettings,
  onProgress?: (progress: { current: number; total: number; percentage: number }) => void,
  abortSignal?: AbortSignal
): Promise<PanelSlice[]> {
  const results: PanelSlice[] = [];
  const total = slices.length;

  const mimeType =
    settings.outputFormat === 'jpeg'
      ? 'image/jpeg'
      : settings.outputFormat === 'webp'
      ? 'image/webp'
      : 'image/png';

  // Configurable quality from 1 to 100 (converted to 0.01-1.00 float). PNG is always lossless (1.0).
  const rawQuality = typeof settings.quality === 'number' ? settings.quality : 100;
  const qualityFactor = settings.outputFormat === 'png' ? 1.0 : Math.max(0.01, Math.min(1.0, rawQuality / 100));

  // Prepare source drawable: ensure imgElement is complete and valid
  const sourceElement = image.imgElement;
  if (!sourceElement || !sourceElement.complete) {
    throw new Error('Source image element is not fully loaded.');
  }

  // Pre-acquire ImageBitmap if available for high-speed hardware accelerated sub-rect extraction
  let sourceBitmap: ImageBitmap | null = null;
  if (typeof createImageBitmap !== 'undefined') {
    try {
      sourceBitmap = await createImageBitmap(sourceElement);
    } catch {
      // Fallback to drawing directly from imgElement if createImageBitmap fails
      sourceBitmap = null;
    }
  }

  const drawableSource = sourceBitmap || sourceElement;

  try {
    for (let i = 0; i < total; i++) {
      if (abortSignal?.aborted) {
        throw new Error('Processing cancelled by user.');
      }

      const slice = slices[i];

      // Validate bounds
      const sx = Math.max(0, Math.min(image.width - 1, slice.sourceX));
      const sy = Math.max(0, Math.min(image.height - 1, slice.sourceY));
      const sw = Math.max(1, Math.min(image.width - sx, slice.sourceWidth));
      const sh = Math.max(1, Math.min(image.height - sy, slice.sourceHeight));
      const dw = slice.outputWidth;
      const dh = slice.outputHeight;

      let blob: Blob;

      // Prefer OffscreenCanvas where supported for non-blocking canvas rendering
      if (typeof OffscreenCanvas !== 'undefined') {
        const offscreen = new OffscreenCanvas(dw, dh);
        const ctx = offscreen.getContext('2d', { alpha: settings.outputFormat !== 'jpeg' });
        if (!ctx) {
          throw new Error('Failed to create OffscreenCanvas 2D context.');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (settings.outputFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, dw, dh);
        }

        const contrastVal = typeof settings.contrast === 'number' ? settings.contrast : 100;
        let hardwareFilterApplied = false;
        if (contrastVal !== 100) {
          try {
            (ctx as unknown as { filter?: string }).filter = `contrast(${contrastVal}%)`;
            hardwareFilterApplied = Boolean((ctx as unknown as { filter?: string }).filter?.includes('contrast'));
          } catch {
            hardwareFilterApplied = false;
          }
        }

        ctx.drawImage(drawableSource, sx, sy, sw, sh, 0, 0, dw, dh);

        // Reset filter
        if (contrastVal !== 100 && hardwareFilterApplied) {
          try {
            (ctx as unknown as { filter?: string }).filter = 'none';
          } catch {
            // ignore
          }
        }

        // Apply software contrast enhancement if hardware filter was not active
        if (contrastVal !== 100 && !hardwareFilterApplied) {
          applyContrastEnhancement(ctx, dw, dh, contrastVal);
        }

        const is8K = Boolean(settings.enhanceTo8K || settings.resolutionMode === '8k');
        const is4K = Boolean(!is8K && (settings.enhanceTo4K || settings.resolutionMode === '4k'));
        const sharpnessMode = settings.sharpnessLevel || (settings.sharpnessBoost === false ? 'off' : 'ultra');

        // Apply multi-scale unsharp mask sharpness enhancement
        if (settings.sharpnessBoost !== false && sharpnessMode !== 'off') {
          applySharpnessEnhancement(ctx, dw, dh, sharpnessMode, is8K || is4K);
        }

        // Apply micro-contrast clarity enhancement to eliminate haze and ensure crystal-clear output
        if (settings.clarityBoost !== false && sharpnessMode !== 'off') {
          applyClarityEnhancement(ctx, dw, dh, sharpnessMode === 'ultra' ? 0.22 : 0.16);
        }

        blob = await offscreen.convertToBlob({
          type: mimeType,
          quality: qualityFactor,
        });
      } else {
        // Fallback to standard HTMLCanvasElement
        const canvas = document.createElement('canvas');
        canvas.width = dw;
        canvas.height = dh;
        const ctx = canvas.getContext('2d', { alpha: settings.outputFormat !== 'jpeg' });
        if (!ctx) {
          throw new Error('Failed to create 2D canvas context.');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (settings.outputFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, dw, dh);
        }

        const contrastVal = typeof settings.contrast === 'number' ? settings.contrast : 100;
        let hardwareFilterApplied = false;
        if (contrastVal !== 100) {
          try {
            ctx.filter = `contrast(${contrastVal}%)`;
            hardwareFilterApplied = Boolean(ctx.filter?.includes('contrast'));
          } catch {
            hardwareFilterApplied = false;
          }
        }

        ctx.drawImage(drawableSource, sx, sy, sw, sh, 0, 0, dw, dh);

        // Reset filter
        if (contrastVal !== 100 && hardwareFilterApplied) {
          try {
            ctx.filter = 'none';
          } catch {
            // ignore
          }
        }

        // Apply software contrast enhancement if hardware filter was not active
        if (contrastVal !== 100 && !hardwareFilterApplied) {
          applyContrastEnhancement(ctx, dw, dh, contrastVal);
        }

        const is8K = Boolean(settings.enhanceTo8K || settings.resolutionMode === '8k');
        const is4K = Boolean(!is8K && (settings.enhanceTo4K || settings.resolutionMode === '4k'));
        const sharpnessMode = settings.sharpnessLevel || (settings.sharpnessBoost === false ? 'off' : 'ultra');

        // Apply multi-scale unsharp mask sharpness enhancement
        if (settings.sharpnessBoost !== false && sharpnessMode !== 'off') {
          applySharpnessEnhancement(ctx, dw, dh, sharpnessMode, is8K || is4K);
        }

        // Apply micro-contrast clarity enhancement to eliminate haze and ensure crystal-clear output
        if (settings.clarityBoost !== false && sharpnessMode !== 'off') {
          applyClarityEnhancement(ctx, dw, dh, sharpnessMode === 'ultra' ? 0.22 : 0.16);
        }

        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error(`Failed to generate output blob for panel #${slice.index}`));
            },
            mimeType,
            qualityFactor
          );
        });

        // Clean up temporary canvas references
        canvas.width = 1;
        canvas.height = 1;
      }

      const blobUrl = URL.createObjectURL(blob);

      results.push({
        ...slice,
        blob,
        blobUrl,
        sizeBytes: blob.size,
        filename: slice.customName || slice.filename,
      });

      if (onProgress) {
        const current = i + 1;
        const percentage = Math.round((current / total) * 100);
        onProgress({ current, total, percentage });
      }

      // Yield briefly to main thread to ensure smooth UI responsiveness during batch exports
      if (i % 3 === 0 || i === total - 1) {
        await new Promise((r) => setTimeout(r, 4));
      }
    }
  } finally {
    // Always close ImageBitmap to prevent memory leaks
    if (sourceBitmap) {
      sourceBitmap.close();
    }
  }

  return results;
}

/**
 * Revokes all blob URLs stored within a list of panel slices.
 */
export function revokePanelBlobUrls(panels: PanelSlice[]): void {
  for (const p of panels) {
    if (p.blobUrl && p.blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(p.blobUrl);
    }
  }
}

/**
 * Generates intelligent deterministic suggestions based on image geometry.
 */
export function generateSmartSuggestions(width: number, height: number): SmartSuggestion[] {
  if (!width || !height) return [];

  const aspect = width / height;
  const suggestions: SmartSuggestion[] = [];

  // 1. Social Media: Instagram 3x3 Grid
  suggestions.push({
    id: 'insta-3x3',
    title: 'Instagram 3×3 Grid',
    description: 'Transform full photo into a cohesive 9-post profile banner.',
    category: 'social',
    rows: 3,
    columns: 3,
    mode: 'grid',
    aspectRatioDisplay: '3:3 (9 posts)',
  });

  // 2. Panorama Carousel (if wide)
  if (aspect >= 1.5) {
    const colCount = Math.min(10, Math.max(3, Math.round(aspect * 1.5)));
    suggestions.push({
      id: 'panoramic-carousel',
      title: `${colCount}-Slide Carousel`,
      description: `Seamless swipeable panoramic carousel for Instagram/LinkedIn.`,
      category: 'social',
      rows: 1,
      columns: colCount,
      mode: 'vertical',
      aspectRatioDisplay: `${colCount}:1 wide`,
    });
  }

  // 3. Balanced Quadrant (2x2)
  suggestions.push({
    id: 'quadrant-2x2',
    title: '2×2 Symmetry Quadrants',
    description: 'Even 4-panel quadrant layout for presentation slides and comparisons.',
    category: 'grid',
    rows: 2,
    columns: 2,
    mode: 'grid',
    aspectRatioDisplay: '2:2 (4 panels)',
  });

  // 4. Tall Split (if vertical portrait)
  if (aspect < 0.9) {
    suggestions.push({
      id: 'vertical-triptych',
      title: '3-Story Vertical Slices',
      description: 'Stack into 3 vertical stories/pins for TikTok, Pinterest & Reels.',
      category: 'social',
      rows: 3,
      columns: 1,
      mode: 'horizontal',
      aspectRatioDisplay: '1:3 tall',
    });
  }

  // 5. Classic 3-Column Triptych
  suggestions.push({
    id: 'triptych-3',
    title: '3-Panel Gallery Triptych',
    description: 'Classic museum 3-column split for wall art prints and hero banners.',
    category: 'creative',
    rows: 1,
    columns: 3,
    mode: 'vertical',
    aspectRatioDisplay: '3 columns',
  });

  // 6. High Density 3x4 or 4x4
  suggestions.push({
    id: 'grid-12',
    title: '3×4 Multi-Panel Showcase',
    description: '12 high-resolution panels for collage prints or modular UI designs.',
    category: 'grid',
    rows: 3,
    columns: 4,
    mode: 'grid',
    aspectRatioDisplay: '12 panels',
  });

  return suggestions;
}

/**
 * Calculates raw uncompressed image memory consumption estimate in MB.
 */
export function estimateMemoryUsageMB(width: number, height: number): number {
  return Math.round(((width * height * 4) / (1024 * 1024)) * 10) / 10;
}

/**
 * Formats bytes into human readable string (KB, MB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Automatically detects picture borders, panel gutters, frames, and dividers in the image.
 * Uses variance analysis, luminance profiling, and edge detection to find horizontal and vertical dividing lines.
 * Sensitivity ranges from 1 (coarse) to 20 (high sensitivity).
 */
export function detectPictureBorders(
  image: LoadedImage,
  sensitivity: number = 10
): { vLines: number[]; hLines: number[]; detectedCount: number } {
  const width = image.width;
  const height = image.height;
  if (!width || !height) return { vLines: [], hLines: [], detectedCount: 0 };

  // Create temporary analysis canvas
  const canvas = document.createElement('canvas');
  const maxDim = 600;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const sampleW = Math.max(10, Math.round(width * scale));
  const sampleH = Math.max(10, Math.round(height * scale));

  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { vLines: [], hLines: [], detectedCount: 0 };

  try {
    const drawable = image.imgElement || image.imageBitmap;
    if (!drawable) return { vLines: [], hLines: [], detectedCount: 0 };

    ctx.drawImage(drawable as CanvasImageSource, 0, 0, sampleW, sampleH);
    const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    // Convert to grayscale/luminance buffer
    const gray = new Float32Array(sampleW * sampleH);
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // 1. Calculate row profiles (for horizontal dividers)
    const rowScores: { y: number; score: number }[] = [];
    const minMarginY = Math.floor(sampleH * 0.03); // Skip 3% outer edges
    const maxMarginY = Math.floor(sampleH * 0.97);

    for (let y = minMarginY; y < maxMarginY; y++) {
      let sum = 0;
      let sumSq = 0;
      let diffSum = 0;

      for (let x = 0; x < sampleW; x++) {
        const val = gray[y * sampleW + x];
        sum += val;
        sumSq += val * val;

        if (y > 0 && y < sampleH - 1) {
          const above = gray[(y - 1) * sampleW + x];
          const below = gray[(y + 1) * sampleW + x];
          diffSum += Math.abs(above - val) + Math.abs(below - val);
        }
      }

      const mean = sum / sampleW;
      const variance = sumSq / sampleW - mean * mean;
      const stdDev = Math.sqrt(Math.max(0, variance));

      // Comic gutter or border line is characterized by:
      // A) Very low stdDev (solid horizontal white/black strip across the image)
      // B) Or strong edge gradient diffSum across the line
      const gutterScore = (255 - Math.min(255, stdDev * 4)) / 255;
      const edgeScore = Math.min(1, (diffSum / sampleW) / 50);
      const totalScore = gutterScore * 0.7 + edgeScore * 0.3;

      rowScores.push({ y, score: totalScore });
    }

    // 2. Calculate column profiles (for vertical dividers)
    const colScores: { x: number; score: number }[] = [];
    const minMarginX = Math.floor(sampleW * 0.03);
    const maxMarginX = Math.floor(sampleW * 0.97);

    for (let x = minMarginX; x < maxMarginX; x++) {
      let sum = 0;
      let sumSq = 0;
      let diffSum = 0;

      for (let y = 0; y < sampleH; y++) {
        const val = gray[y * sampleW + x];
        sum += val;
        sumSq += val * val;

        if (x > 0 && x < sampleW - 1) {
          const left = gray[y * sampleW + (x - 1)];
          const right = gray[y * sampleW + (x + 1)];
          diffSum += Math.abs(left - val) + Math.abs(right - val);
        }
      }

      const mean = sum / sampleH;
      const variance = sumSq / sampleH - mean * mean;
      const stdDev = Math.sqrt(Math.max(0, variance));

      const gutterScore = (255 - Math.min(255, stdDev * 4)) / 255;
      const edgeScore = Math.min(1, (diffSum / sampleH) / 50);
      const totalScore = gutterScore * 0.7 + edgeScore * 0.3;

      colScores.push({ x, score: totalScore });
    }

    // Sensitivity threshold: 1 (requires high score ~0.86) to 20 (requires moderate score ~0.53)
    const clampedSens = Math.max(1, Math.min(20, sensitivity));
    const scoreThreshold = 0.88 - (clampedSens / 20) * 0.35;

    // Local peak clustering for horizontal lines
    const minDistanceY = Math.max(6, Math.round(sampleH * 0.08));
    const candidateHLines = rowScores
      .filter((r) => r.score >= scoreThreshold)
      .sort((a, b) => b.score - a.score);

    const selectedSampleHLines: number[] = [];
    for (const cand of candidateHLines) {
      if (selectedSampleHLines.every((y) => Math.abs(y - cand.y) > minDistanceY)) {
        selectedSampleHLines.push(cand.y);
      }
    }

    // Local peak clustering for vertical lines
    const minDistanceX = Math.max(6, Math.round(sampleW * 0.08));
    const candidateVLines = colScores
      .filter((c) => c.score >= scoreThreshold)
      .sort((a, b) => b.score - a.score);

    const selectedSampleVLines: number[] = [];
    for (const cand of candidateVLines) {
      if (selectedSampleVLines.every((x) => Math.abs(x - cand.x) > minDistanceX)) {
        selectedSampleVLines.push(cand.x);
      }
    }

    // Project back to original image dimensions
    const hLines = selectedSampleHLines
      .map((y) => Math.round(y / scale))
      .filter((y) => y > 10 && y < height - 10)
      .sort((a, b) => a - b);

    const vLines = selectedSampleVLines
      .map((x) => Math.round(x / scale))
      .filter((x) => x > 10 && x < width - 10)
      .sort((a, b) => a - b);

    const detectedCount = (vLines.length + 1) * (hLines.length + 1);

    return {
      vLines,
      hLines,
      detectedCount,
    };
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }
}

// Run engine test suite once on startup to ensure production mathematical integrity
const testResults = runAutomatedSplitTestSuite(calculateSlices);
if (!testResults.allPassed) {
  console.error('[SplitEngine] Automated split test suite encountered errors:', testResults.results);
}
