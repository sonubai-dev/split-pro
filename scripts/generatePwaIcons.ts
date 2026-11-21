import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Pure TypeScript PNG generator using Node zlib.
 * Creates valid 192x192 and 512x512 PNG files without external dependencies.
 */

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[i] = c >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function generatePng(size: number, isMaskable = false): Buffer {
  const width = size;
  const height = size;

  // Scanlines: each row starts with filter byte 0x00, followed by width * 4 RGBA bytes
  const scanlines = Buffer.alloc(height * (1 + width * 4));

  const center = size / 2;
  const radius = isMaskable ? size * 0.45 : size * 0.42;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[offset++] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Deep Obsidian #0B0E14
      let r = 0x0b;
      let g = 0x0e;
      let b = 0x14;
      let a = 0xff;

      // Outer squircle or circular frame
      const cornerRadius = size * 0.22;
      const qx = Math.max(Math.abs(dx) - (center - cornerRadius), 0);
      const qy = Math.max(Math.abs(dy) - (center - cornerRadius), 0);
      const qdist = Math.sqrt(qx * qx + qy * qy);

      if (qdist > cornerRadius && !isMaskable) {
        // Transparent outside rounded icon boundary
        scanlines[offset++] = 0;
        scanlines[offset++] = 0;
        scanlines[offset++] = 0;
        scanlines[offset++] = 0;
        continue;
      }

      // Draw stylized "V" with Cadmium Amber #E05D26 and White
      // Left arm of V: from (0.28, 0.28) to (0.50, 0.72)
      // Right arm of V: from (0.50, 0.72) to (0.72, 0.28)
      const nx = x / size;
      const ny = y / size;

      // Inscribed geometry check for "V"
      const armWidth = 0.085;
      const leftLineDist = Math.abs((ny - 0.28) * 0.22 - (nx - 0.28) * 0.44) / 0.492;
      const rightLineDist = Math.abs((ny - 0.72) * -0.22 - (nx - 0.50) * 0.44) / 0.492;

      const inLeftArm = leftLineDist < armWidth && ny >= 0.26 && ny <= 0.74 && nx <= 0.52;
      const inRightArm = rightLineDist < armWidth && ny >= 0.26 && ny <= 0.74 && nx >= 0.48;

      // Slash line representing precision slice cut: Cadmium Amber #E05D26
      const slashDist = Math.abs(ny - 0.5 - (nx - 0.5) * -0.6);
      const inSliceGuide = slashDist < 0.015 && nx > 0.2 && nx < 0.8;

      if (inSliceGuide) {
        // Bright amber slice guideline
        r = 0xe0;
        g = 0x5d;
        b = 0x26;
      } else if (inLeftArm || inRightArm) {
        // Bold white Vistaro lettermark
        r = 0xf8;
        g = 0xfa;
        b = 0xfc;
      } else {
        // Subtle gradient obsidian fill
        const grad = (ny * 0.2);
        r = Math.min(255, 0x0f + Math.floor(grad * 30));
        g = Math.min(255, 0x14 + Math.floor(grad * 35));
        b = Math.min(255, 0x20 + Math.floor(grad * 40));
      }

      scanlines[offset++] = r;
      scanlines[offset++] = g;
      scanlines[offset++] = b;
      scanlines[offset++] = a;
    }
  }

  // PNG Header
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: 0 (Deflate)
  ihdr[11] = 0; // Filter: 0 (Standard)
  ihdr[12] = 0; // Interlace: 0 (None)

  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', compressed);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'split-pro/public');
fs.mkdirSync(publicDir, { recursive: true });

// 1. Generate PNGs
const icon192 = generatePng(192, false);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), icon192);

const icon512 = generatePng(512, false);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), icon512);

const iconMaskable192 = generatePng(192, true);
fs.writeFileSync(path.join(publicDir, 'icon-maskable-192.png'), iconMaskable192);

const iconMaskable512 = generatePng(512, true);
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), iconMaskable512);

// 2. Generate Scalable SVG Icon
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#070a10"/>
    </linearGradient>
    <linearGradient id="amberAccent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb923c"/>
      <stop offset="100%" stop-color="#e05d26"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- Decorative Gutter/Cut Grid Accent -->
  <line x1="80" y1="256" x2="432" y2="256" stroke="#e05d26" stroke-width="6" stroke-dasharray="16,12" opacity="0.6"/>
  <!-- Primary V lettermark -->
  <path d="M 148 144 L 256 368 L 364 144" fill="none" stroke="#ffffff" stroke-width="52" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Precision Slicer Diamond Mark -->
  <circle cx="256" cy="368" r="20" fill="url(#amberAccent)"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svg);

console.log('✅ PWA Icons successfully generated: 192x192, 512x512, Maskable, and SVG.');
