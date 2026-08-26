import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { PanelSlice, PdfExportOptions } from '../types';

/**
 * Sanitizes a filename to ensure safe cross-platform saving without path traversal or illegal characters.
 */
export function sanitizeFilename(rawName: string, fallback = 'panel'): string {
  if (!rawName || typeof rawName !== 'string') return fallback;

  // Remove path traversal and dangerous characters: < > : " / \ | ? * and ASCII 0-31
  let safe = rawName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\.{2,}/g, '.') // Prevent directory traversal like ..
    .trim();

  // Remove leading/trailing dots or spaces
  safe = safe.replace(/^[.\s]+|[.\s]+$/g, '');

  return safe || fallback;
}

/**
 * Converts a Blob to a Base64 Data URL.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Triggers a direct browser file download for a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const safeName = sanitizeFilename(filename, 'download');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Downloads multiple panels sequentially with duplicate prevention and delay.
 */
export async function downloadAllPanels(panels: PanelSlice[]): Promise<void> {
  const usedNames = new Set<string>();

  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    if (p.blob) {
      let baseName = sanitizeFilename(p.customName || p.filename, `panel_${i + 1}.png`);
      
      // Ensure unique filename
      let finalName = baseName;
      let counter = 1;
      while (usedNames.has(finalName)) {
        const dotIndex = baseName.lastIndexOf('.');
        if (dotIndex !== -1) {
          const namePart = baseName.substring(0, dotIndex);
          const extPart = baseName.substring(dotIndex);
          finalName = `${namePart}_(${counter})${extPart}`;
        } else {
          finalName = `${baseName}_(${counter})`;
        }
        counter++;
      }
      usedNames.add(finalName);

      downloadBlob(p.blob, finalName);
      // Brief pause between browser downloads to prevent popup blocking
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

/**
 * Packs all panel blobs into a single compressed ZIP file with real progress tracking.
 * Guarantees zero duplicate filenames inside the archive.
 */
export async function createAndDownloadZip(
  panels: PanelSlice[],
  zipFilename: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    if (panel.blob) {
      let baseName = sanitizeFilename(panel.customName || panel.filename, `panel_${i + 1}.png`);

      // Ensure unique filename inside zip
      let finalName = baseName;
      let counter = 1;
      while (usedNames.has(finalName)) {
        const dotIndex = baseName.lastIndexOf('.');
        if (dotIndex !== -1) {
          const namePart = baseName.substring(0, dotIndex);
          const extPart = baseName.substring(dotIndex);
          finalName = `${namePart}_(${counter})${extPart}`;
        } else {
          finalName = `${baseName}_(${counter})`;
        }
        counter++;
      }
      usedNames.add(finalName);

      zip.file(finalName, panel.blob);
    }
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  const cleanZipName = sanitizeFilename(zipFilename, 'split_images.zip');
  const safeZipName = cleanZipName.endsWith('.zip') ? cleanZipName : `${cleanZipName}.zip`;
  downloadBlob(zipBlob, safeZipName);
}

/**
 * Assembles all panel slices into a multi-page PDF with configurable layout and orientation.
 */
export async function createAndDownloadPdf(
  panels: PanelSlice[],
  pdfFilename: string,
  options?: Partial<PdfExportOptions>,
  onProgress?: (progress: number) => void
): Promise<void> {
  const validPanels = panels.filter((p) => !!p.blob);
  if (validPanels.length === 0) return;

  const orientationPref = options?.orientation || 'portrait';
  const fitToPage = options?.fitToPage !== false;
  const marginMm = typeof options?.marginMm === 'number' ? options.marginMm : 10;
  const pageSize = options?.pageSize || 'a4';

  // Standard page dimensions in mm
  const baseWidth = pageSize === 'letter' ? 215.9 : 210;
  const baseHeight = pageSize === 'letter' ? 279.4 : 297;

  // Determine first page orientation
  let initialOrientation: 'portrait' | 'landscape' = 'portrait';
  if (orientationPref === 'landscape') {
    initialOrientation = 'landscape';
  } else if (orientationPref === 'auto') {
    initialOrientation = validPanels[0].outputWidth > validPanels[0].outputHeight ? 'landscape' : 'portrait';
  }

  const doc = new jsPDF({
    orientation: initialOrientation,
    unit: 'mm',
    format: pageSize,
    compress: true,
  });

  for (let i = 0; i < validPanels.length; i++) {
    const panel = validPanels[i];
    const dataUrl = await blobToDataUrl(panel.blob!);

    // Decide orientation for this page
    let pageOrientation: 'portrait' | 'landscape' = 'portrait';
    if (orientationPref === 'auto') {
      pageOrientation = panel.outputWidth > panel.outputHeight ? 'landscape' : 'portrait';
    } else {
      pageOrientation = orientationPref;
    }

    const pageWidth = pageOrientation === 'landscape' ? Math.max(baseWidth, baseHeight) : Math.min(baseWidth, baseHeight);
    const pageHeight = pageOrientation === 'landscape' ? Math.min(baseWidth, baseHeight) : Math.max(baseWidth, baseHeight);

    if (i > 0) {
      doc.addPage([pageWidth, pageHeight], pageOrientation);
    }

    const effectiveMargin = fitToPage ? marginMm : 0;
    const availWidth = Math.max(10, pageWidth - effectiveMargin * 2);
    const availHeight = Math.max(10, pageHeight - effectiveMargin * 2);

    const imgAspect = panel.outputWidth / Math.max(1, panel.outputHeight);
    const pageAspect = availWidth / availHeight;

    let imgW = availWidth;
    let imgH = availHeight;

    if (fitToPage) {
      if (imgAspect > pageAspect) {
        imgW = availWidth;
        imgH = availWidth / imgAspect;
      } else {
        imgH = availHeight;
        imgW = availHeight * imgAspect;
      }
    }

    const posX = effectiveMargin + (availWidth - imgW) / 2;
    const posY = effectiveMargin + (availHeight - imgH) / 2;

    const imgType = panel.format === 'jpeg' ? 'JPEG' : panel.format === 'webp' ? 'WEBP' : 'PNG';
    doc.addImage(dataUrl, imgType, posX, posY, imgW, imgH, undefined, 'FAST');

    if (onProgress) {
      onProgress(Math.round(((i + 1) / validPanels.length) * 100));
    }
  }

  const cleanPdfName = sanitizeFilename(pdfFilename, 'split_panels.pdf');
  const safePdfName = cleanPdfName.endsWith('.pdf') ? cleanPdfName : `${cleanPdfName}.pdf`;
  doc.save(safePdfName);
}

