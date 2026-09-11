export interface DetectBordersMessage {
  id: string;
  imageData: ImageData;
  sensitivity: number;
}

export interface DetectBordersResult {
  id: string;
  vLines: number[];
  hLines: number[];
  detectedCount: number;
  error?: string;
}

// Applies a simple 3x3 Gaussian blur to a grayscale image array
function gaussianBlur(data: Float32Array, width: number, height: number): Float32Array {
  const blurred = new Float32Array(width * height);
  const kernel = [
    1, 2, 1,
    2, 4, 2,
    1, 2, 1
  ];
  const weightSum = 16;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let k = 0;
      for (let cy = -1; cy <= 1; cy++) {
        for (let cx = -1; cx <= 1; cx++) {
          sum += data[(y + cy) * width + (x + cx)] * kernel[k++];
        }
      }
      blurred[y * width + x] = sum / weightSum;
    }
  }
  return blurred;
}

// Applies Sobel operator to find horizontal and vertical edge magnitudes
function computeSobel(data: Float32Array, width: number, height: number) {
  const sobelX = new Float32Array(width * height);
  const sobelY = new Float32Array(width * height);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // X gradient
      sobelX[idx] = Math.abs(
        -data[(y - 1) * width + (x - 1)] + data[(y - 1) * width + (x + 1)] +
        -2 * data[y * width + (x - 1)] + 2 * data[y * width + (x + 1)] +
        -data[(y + 1) * width + (x - 1)] + data[(y + 1) * width + (x + 1)]
      );
      // Y gradient
      sobelY[idx] = Math.abs(
        -data[(y - 1) * width + (x - 1)] - 2 * data[(y - 1) * width + x] - data[(y - 1) * width + (x + 1)] +
        data[(y + 1) * width + (x - 1)] + 2 * data[(y + 1) * width + x] + data[(y + 1) * width + (x + 1)]
      );
    }
  }
  
  return { sobelX, sobelY };
}

self.onmessage = function (e: MessageEvent<DetectBordersMessage>) {
  try {
    const { id, imageData, sensitivity } = e.data;
    const { width, height, data } = imageData;

    if (!width || !height) {
      self.postMessage({ id, vLines: [], hLines: [], detectedCount: 0 });
      return;
    }

    // 1. Convert to Grayscale
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // 2. Apply Gaussian Blur to reduce noise
    const blurred = gaussianBlur(gray, width, height);

    // 3. Sobel Edge Detection
    const { sobelX, sobelY } = computeSobel(blurred, width, height);

    // 4. Calculate projections (row and column scores)
    const rowScores: { y: number; score: number }[] = [];
    const minMarginY = Math.floor(height * 0.02);
    const maxMarginY = Math.floor(height * 0.98);

    for (let y = minMarginY; y < maxMarginY; y++) {
      let sum = 0;
      let sumSq = 0;
      let edgeSum = 0;
      
      for (let x = 0; x < width; x++) {
        const val = blurred[y * width + x];
        sum += val;
        sumSq += val * val;
        edgeSum += sobelY[y * width + x]; // using sobelY for horizontal lines
      }
      
      const mean = sum / width;
      const variance = sumSq / width - mean * mean;
      const stdDev = Math.sqrt(Math.max(0, variance));
      
      // A strong gutter is usually very uniform (low stdDev) OR it is surrounded by strong horizontal edges
      const gutterScore = (255 - Math.min(255, stdDev * 3)) / 255;
      const edgeScore = Math.min(1, (edgeSum / width) / 100);
      
      const totalScore = gutterScore * 0.8 + edgeScore * 0.2;
      rowScores.push({ y, score: totalScore });
    }

    const colScores: { x: number; score: number }[] = [];
    const minMarginX = Math.floor(width * 0.02);
    const maxMarginX = Math.floor(width * 0.98);

    for (let x = minMarginX; x < maxMarginX; x++) {
      let sum = 0;
      let sumSq = 0;
      let edgeSum = 0;
      
      for (let y = 0; y < height; y++) {
        const val = blurred[y * width + x];
        sum += val;
        sumSq += val * val;
        edgeSum += sobelX[y * width + x]; // using sobelX for vertical lines
      }
      
      const mean = sum / height;
      const variance = sumSq / height - mean * mean;
      const stdDev = Math.sqrt(Math.max(0, variance));
      
      const gutterScore = (255 - Math.min(255, stdDev * 3)) / 255;
      const edgeScore = Math.min(1, (edgeSum / height) / 100);
      
      const totalScore = gutterScore * 0.8 + edgeScore * 0.2;
      colScores.push({ x, score: totalScore });
    }

    // 5. Adaptive Thresholding based on sensitivity
    const clampedSens = Math.max(1, Math.min(20, sensitivity));
    // High sensitivity (20) lowers the threshold, low sensitivity (1) raises it
    const scoreThreshold = 0.92 - (clampedSens / 20) * 0.45;

    // 6. Non-maximum suppression & Local Peak Clustering
    const minDistanceY = Math.max(8, Math.round(height * 0.05));
    const candidateHLines = rowScores
      .filter((r) => r.score >= scoreThreshold)
      .sort((a, b) => b.score - a.score);
      
    const selectedHLines: number[] = [];
    for (const cand of candidateHLines) {
      if (selectedHLines.every((y) => Math.abs(y - cand.y) > minDistanceY)) {
        selectedHLines.push(cand.y);
      }
    }

    const minDistanceX = Math.max(8, Math.round(width * 0.05));
    const candidateVLines = colScores
      .filter((c) => c.score >= scoreThreshold)
      .sort((a, b) => b.score - a.score);
      
    const selectedVLines: number[] = [];
    for (const cand of candidateVLines) {
      if (selectedVLines.every((x) => Math.abs(x - cand.x) > minDistanceX)) {
        selectedVLines.push(cand.x);
      }
    }

    const hLines = selectedHLines.sort((a, b) => a - b);
    const vLines = selectedVLines.sort((a, b) => a - b);
    const detectedCount = (vLines.length + 1) * (hLines.length + 1);

    const result: DetectBordersResult = {
      id,
      vLines,
      hLines,
      detectedCount
    };

    self.postMessage(result);

  } catch (err: any) {
    self.postMessage({
      id: e.data?.id,
      vLines: [],
      hLines: [],
      detectedCount: 0,
      error: err.message || 'Unknown error during border detection'
    } as DetectBordersResult);
  }
};
