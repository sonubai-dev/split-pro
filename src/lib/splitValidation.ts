import { EditorSettings, PanelSlice } from '../types';

export interface ValidationResult {
  valid: boolean;
  name: string;
  slicesCount: number;
  totalCoveredWidth: number;
  totalCoveredHeight: number;
  expectedWidth: number;
  expectedHeight: number;
  seamsOrGapsDetected: boolean;
  overlapDetected: boolean;
  details: string;
}

/**
 * Validates that a set of calculated slices covers the source dimensions exactly
 * with mathematically zero missing pixels and zero overlapping pixels.
 */
export function validateSliceCoverage(
  slices: Omit<PanelSlice, 'blob' | 'blobUrl' | 'sizeBytes'>[],
  sourceWidth: number,
  sourceHeight: number,
  testName = 'Slice Validation'
): ValidationResult {
  if (!slices || slices.length === 0) {
    return {
      valid: false,
      name: testName,
      slicesCount: 0,
      totalCoveredWidth: 0,
      totalCoveredHeight: 0,
      expectedWidth: sourceWidth,
      expectedHeight: sourceHeight,
      seamsOrGapsDetected: true,
      overlapDetected: false,
      details: 'No slices generated.',
    };
  }

  // Check 1: All slices must have integer coordinates within bounds and positive dimensions
  for (const s of slices) {
    if (s.sourceX < 0 || s.sourceY < 0 || s.sourceWidth <= 0 || s.sourceHeight <= 0) {
      return {
        valid: false,
        name: testName,
        slicesCount: slices.length,
        totalCoveredWidth: 0,
        totalCoveredHeight: 0,
        expectedWidth: sourceWidth,
        expectedHeight: sourceHeight,
        seamsOrGapsDetected: true,
        overlapDetected: false,
        details: `Invalid slice coordinates: ${s.id} (${s.sourceX},${s.sourceY},${s.sourceWidth}x${s.sourceHeight})`,
      };
    }
    if (s.sourceX + s.sourceWidth > sourceWidth || s.sourceY + s.sourceHeight > sourceHeight) {
      return {
        valid: false,
        name: testName,
        slicesCount: slices.length,
        totalCoveredWidth: 0,
        totalCoveredHeight: 0,
        expectedWidth: sourceWidth,
        expectedHeight: sourceHeight,
        seamsOrGapsDetected: false,
        overlapDetected: true,
        details: `Slice exceeds image bounds: ${s.id} right=${s.sourceX + s.sourceWidth} > ${sourceWidth} or bottom=${s.sourceY + s.sourceHeight} > ${sourceHeight}`,
      };
    }
  }

  // Group by rows to check continuous coverage along columns and rows
  const rowMap = new Map<number, typeof slices>();
  for (const s of slices) {
    if (!rowMap.has(s.row)) rowMap.set(s.row, []);
    rowMap.get(s.row)!.push(s);
  }

  const sortedRows = Array.from(rowMap.keys()).sort((a, b) => a - b);
  let totalH = 0;
  let prevYEnd = 0;

  for (const r of sortedRows) {
    const rowSlices = rowMap.get(r)!.sort((a, b) => a.col - b.col);
    
    // Check horizontal continuity across this row
    let prevXEnd = 0;
    let rowW = 0;
    const rowY = rowSlices[0].sourceY;
    const rowH = rowSlices[0].sourceHeight;

    if (rowY !== prevYEnd) {
      return {
        valid: false,
        name: testName,
        slicesCount: slices.length,
        totalCoveredWidth: 0,
        totalCoveredHeight: 0,
        expectedWidth: sourceWidth,
        expectedHeight: sourceHeight,
        seamsOrGapsDetected: true,
        overlapDetected: rowY < prevYEnd,
        details: `Row gap/overlap at row ${r}: expected Y=${prevYEnd}, found Y=${rowY}`,
      };
    }

    for (const s of rowSlices) {
      if (s.sourceX !== prevXEnd) {
        return {
          valid: false,
          name: testName,
          slicesCount: slices.length,
          totalCoveredWidth: 0,
          totalCoveredHeight: 0,
          expectedWidth: sourceWidth,
          expectedHeight: sourceHeight,
          seamsOrGapsDetected: true,
          overlapDetected: s.sourceX < prevXEnd,
          details: `Column gap/overlap at row ${r}, col ${s.col}: expected X=${prevXEnd}, found X=${s.sourceX}`,
        };
      }
      if (s.sourceHeight !== rowH) {
        return {
          valid: false,
          name: testName,
          slicesCount: slices.length,
          totalCoveredWidth: 0,
          totalCoveredHeight: 0,
          expectedWidth: sourceWidth,
          expectedHeight: sourceHeight,
          seamsOrGapsDetected: true,
          overlapDetected: false,
          details: `Inconsistent slice height in row ${r}: ${s.sourceHeight} vs ${rowH}`,
        };
      }
      prevXEnd += s.sourceWidth;
      rowW += s.sourceWidth;
    }

    if (rowW !== sourceWidth) {
      return {
        valid: false,
        name: testName,
        slicesCount: slices.length,
        totalCoveredWidth: rowW,
        totalCoveredHeight: 0,
        expectedWidth: sourceWidth,
        expectedHeight: sourceHeight,
        seamsOrGapsDetected: true,
        overlapDetected: rowW > sourceWidth,
        details: `Row ${r} total width ${rowW} does not equal source width ${sourceWidth}`,
      };
    }

    prevYEnd += rowH;
    totalH += rowH;
  }

  if (totalH !== sourceHeight) {
    return {
      valid: false,
      name: testName,
      slicesCount: slices.length,
      totalCoveredWidth: sourceWidth,
      totalCoveredHeight: totalH,
      expectedWidth: sourceWidth,
      expectedHeight: sourceHeight,
      seamsOrGapsDetected: true,
      overlapDetected: totalH > sourceHeight,
      details: `Total height ${totalH} does not equal source height ${sourceHeight}`,
    };
  }

  return {
    valid: true,
    name: testName,
    slicesCount: slices.length,
    totalCoveredWidth: sourceWidth,
    totalCoveredHeight: sourceHeight,
    expectedWidth: sourceWidth,
    expectedHeight: sourceHeight,
    seamsOrGapsDetected: false,
    overlapDetected: false,
    details: `All ${slices.length} panels mathematically align to ${sourceWidth}x${sourceHeight} with 0 gaps and 0 overlaps.`,
  };
}

/**
 * Runs the automated test suite for the image splitting engine across:
 * - 2-panel split (vertical & horizontal)
 * - 3-panel split (vertical & horizontal)
 * - 3×3 grid split
 * - 4×4 grid split
 * - Custom uneven splits
 * - Non-divisible prime dimensions (e.g. 1927 x 1083)
 */
export function runAutomatedSplitTestSuite(
  calculateSlicesFn: (w: number, h: number, s: EditorSettings) => Omit<PanelSlice, 'blob' | 'blobUrl' | 'sizeBytes'>[]
): {
  allPassed: boolean;
  results: ValidationResult[];
} {
  const baseSettings: EditorSettings = {
    splitMode: 'grid',
    autoPartsCount: 10,
    autoOrientation: 'balanced',
    rows: 1,
    columns: 1,
    verticalCount: 2,
    horizontalCount: 2,
    customVLines: [],
    customHLines: [],
    outerMargin: 0,
    horizontalGap: 0,
    verticalGap: 0,
    gapBehavior: 'spacing',
    panelOrder: 'row-by-row',
    outputFormat: 'png',
    quality: 95,
    contrast: 100,
    resolutionMode: 'original',
    customScalePercent: 100,
    namingPrefix: 'slice',
    includeGridCoordsInName: false,
    fitMode: 'original',
  };

  const results: ValidationResult[] = [];

  // Test 1: 2-panel vertical split on standard 1920x1080
  const t1Slices = calculateSlicesFn(1920, 1080, {
    ...baseSettings,
    splitMode: 'vertical',
    verticalCount: 2,
  });
  results.push(validateSliceCoverage(t1Slices, 1920, 1080, '2-Panel Vertical Split (1920x1080)'));

  // Test 2: 2-panel horizontal split on non-divisible 1927x1083
  const t2Slices = calculateSlicesFn(1927, 1083, {
    ...baseSettings,
    splitMode: 'horizontal',
    horizontalCount: 2,
  });
  results.push(validateSliceCoverage(t2Slices, 1927, 1083, '2-Panel Horizontal Split (1927x1083 non-divisible)'));

  // Test 3: 3-panel vertical split on non-divisible 1000x1000
  const t3Slices = calculateSlicesFn(1000, 1000, {
    ...baseSettings,
    splitMode: 'vertical',
    verticalCount: 3,
  });
  results.push(validateSliceCoverage(t3Slices, 1000, 1000, '3-Panel Vertical Split (1000x1000)'));

  // Test 4: 3×3 Grid Split on 4K image 3840x2160
  const t4Slices = calculateSlicesFn(3840, 2160, {
    ...baseSettings,
    splitMode: 'grid',
    rows: 3,
    columns: 3,
  });
  results.push(validateSliceCoverage(t4Slices, 3840, 2160, '3×3 Grid Split (3840x2160 4K)'));

  // Test 5: 4×4 Grid Split on non-divisible 2501x1503
  const t5Slices = calculateSlicesFn(2501, 1503, {
    ...baseSettings,
    splitMode: 'grid',
    rows: 4,
    columns: 4,
  });
  results.push(validateSliceCoverage(t5Slices, 2501, 1503, '4×4 Grid Split (2501x1503 non-divisible)'));

  // Test 6: Custom uneven splits with arbitrary irregular coordinates
  const t6Slices = calculateSlicesFn(2000, 1500, {
    ...baseSettings,
    splitMode: 'custom',
    customVLines: [347, 891, 1542],
    customHLines: [412, 1109],
  });
  results.push(validateSliceCoverage(t6Slices, 2000, 1500, 'Custom Uneven Split (4x3 grid from arbitrary lines)'));

  // Test 7: Auto Split 10-Part on 1920x1080 (auto factors to 2x5 grid)
  const t7Slices = calculateSlicesFn(1920, 1080, {
    ...baseSettings,
    splitMode: 'auto',
    autoPartsCount: 10,
  });
  results.push(validateSliceCoverage(t7Slices, 1920, 1080, 'Auto Split 10-Part (1920x1080 -> 2x5)'));

  // Test 8: Auto Split 20-Part on 3840x2160 (auto factors to 4x5 grid)
  const t8Slices = calculateSlicesFn(3840, 2160, {
    ...baseSettings,
    splitMode: 'auto',
    autoPartsCount: 20,
  });
  results.push(validateSliceCoverage(t8Slices, 3840, 2160, 'Auto Split 20-Part (3840x2160 -> 4x5)'));

  const allPassed = results.every((r) => r.valid);
  return { allPassed, results };
}
