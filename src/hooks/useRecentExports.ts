import { useState, useEffect, useCallback } from 'react';

export interface SliceSummary {
  index: number;
  name?: string;
  width?: number;
  height?: number;
  thumbnail?: string;
}

export interface RecentExport {
  id: string;
  filename: string;
  timestamp: number;
  count: number;
  rows?: number;
  columns?: number;
  mode?: string;
  thumbnails?: string[];
  slices?: SliceSummary[];
  resolution?: string;
}

// Lightweight illustrative SVG thumbnails for sample projects
const createSampleThumbnail = (label: string, bgGradient: string, accentColor: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 110" width="160" height="110">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        ${bgGradient}
      </linearGradient>
      <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.3"/>
      </linearGradient>
    </defs>
    <rect width="160" height="110" rx="8" fill="url(#grad)"/>
    <rect x="12" y="14" width="136" height="82" rx="6" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    <!-- Stylized horizon and composition lines -->
    <path d="M 12 60 Q 50 45, 90 62 T 148 55" fill="none" stroke="url(#lineGrad)" stroke-width="2"/>
    <circle cx="110" cy="42" r="14" fill="${accentColor}" fill-opacity="0.35"/>
    <circle cx="110" cy="42" r="7" fill="${accentColor}" fill-opacity="0.8"/>
    <!-- Micro grid lines -->
    <line x1="12" y1="75" x2="148" y2="75" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="3,3"/>
    <line x1="50" y1="14" x2="50" y2="96" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <line x1="100" y1="14" x2="100" y2="96" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <!-- Badge -->
    <rect x="18" y="20" width="34" height="14" rx="3" fill="rgba(0,0,0,0.6)"/>
    <text x="35" y="30" fill="#ffffff" font-size="8" font-family="monospace" font-weight="bold" text-anchor="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const DEFAULT_SAMPLE_PROJECTS: RecentExport[] = [
  {
    id: 'sample-cyberpunk-storyboard',
    filename: 'cyberpunk_act1_storyboard_8k.zip',
    timestamp: Date.now() - 1000 * 60 * 22,
    count: 6,
    rows: 2,
    columns: 3,
    mode: 'grid',
    resolution: '8K Ultra-HD',
    thumbnails: [
      createSampleThumbnail('S#01', '<stop offset="0%" stop-color="#3b0764"/><stop offset="100%" stop-color="#1e1b4b"/>', '#c084fc'),
      createSampleThumbnail('S#02', '<stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#0f172a"/>', '#818cf8'),
      createSampleThumbnail('S#03', '<stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#083344"/>', '#38bdf8'),
      createSampleThumbnail('S#04', '<stop offset="0%" stop-color="#14532d"/><stop offset="100%" stop-color="#022c22"/>', '#4ade80'),
      createSampleThumbnail('S#05', '<stop offset="0%" stop-color="#701a75"/><stop offset="100%" stop-color="#4c0519"/>', '#f472b6'),
      createSampleThumbnail('S#06', '<stop offset="0%" stop-color="#7c2d12"/><stop offset="100%" stop-color="#451a03"/>', '#fb923c'),
    ],
    slices: [
      { index: 1, name: 'cyberpunk_act1_p1.png', width: 2560, height: 1440 },
      { index: 2, name: 'cyberpunk_act1_p2.png', width: 2560, height: 1440 },
      { index: 3, name: 'cyberpunk_act1_p3.png', width: 2560, height: 1440 },
      { index: 4, name: 'cyberpunk_act1_p4.png', width: 2560, height: 1440 },
      { index: 5, name: 'cyberpunk_act1_p5.png', width: 2560, height: 1440 },
      { index: 6, name: 'cyberpunk_act1_p6.png', width: 2560, height: 1440 },
    ],
  },
  {
    id: 'sample-insta-mosaic',
    filename: 'tokyo_panoramic_mosaic_grid.zip',
    timestamp: Date.now() - 1000 * 60 * 145,
    count: 4,
    rows: 1,
    columns: 4,
    mode: 'horizontal',
    resolution: '4K Ultra-HD',
    thumbnails: [
      createSampleThumbnail('P#01', '<stop offset="0%" stop-color="#0369a1"/><stop offset="100%" stop-color="#075985"/>', '#38bdf8'),
      createSampleThumbnail('P#02', '<stop offset="0%" stop-color="#075985"/><stop offset="100%" stop-color="#1e293b"/>', '#60a5fa'),
      createSampleThumbnail('P#03', '<stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#312e81"/>', '#a78bfa'),
      createSampleThumbnail('P#04', '<stop offset="0%" stop-color="#312e81"/><stop offset="100%" stop-color="#4c1d95"/>', '#c084fc'),
    ],
    slices: [
      { index: 1, name: 'panorama_slice_1.png', width: 1920, height: 1920 },
      { index: 2, name: 'panorama_slice_2.png', width: 1920, height: 1920 },
      { index: 3, name: 'panorama_slice_3.png', width: 1920, height: 1920 },
      { index: 4, name: 'panorama_slice_4.png', width: 1920, height: 1920 },
    ],
  },
  {
    id: 'sample-character-sheet',
    filename: 'manga_character_turnaround_9x.zip',
    timestamp: Date.now() - 1000 * 60 * 320,
    count: 9,
    rows: 3,
    columns: 3,
    mode: 'grid',
    resolution: '8K Ultra-HD',
    thumbnails: [
      createSampleThumbnail('C#01', '<stop offset="0%" stop-color="#18181b"/><stop offset="100%" stop-color="#27272a"/>', '#a1a1aa'),
      createSampleThumbnail('C#02', '<stop offset="0%" stop-color="#27272a"/><stop offset="100%" stop-color="#3f3f46"/>', '#e4e4e7'),
      createSampleThumbnail('C#03', '<stop offset="0%" stop-color="#18181b"/><stop offset="100%" stop-color="#27272a"/>', '#a1a1aa'),
      createSampleThumbnail('C#04', '<stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#312e81"/>', '#818cf8'),
      createSampleThumbnail('C#05', '<stop offset="0%" stop-color="#312e81"/><stop offset="100%" stop-color="#4338ca"/>', '#a5b4fc'),
      createSampleThumbnail('C#06', '<stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#312e81"/>', '#818cf8'),
      createSampleThumbnail('C#07', '<stop offset="0%" stop-color="#022c22"/><stop offset="100%" stop-color="#064e3b"/>', '#34d399'),
      createSampleThumbnail('C#08', '<stop offset="0%" stop-color="#064e3b"/><stop offset="100%" stop-color="#047857"/>', '#6ee7b7'),
      createSampleThumbnail('C#09', '<stop offset="0%" stop-color="#022c22"/><stop offset="100%" stop-color="#064e3b"/>', '#34d399'),
    ],
    slices: [
      { index: 1, name: 'turn_front.png', width: 2160, height: 2160 },
      { index: 2, name: 'turn_front_three_quarter.png', width: 2160, height: 2160 },
      { index: 3, name: 'turn_profile_left.png', width: 2160, height: 2160 },
      { index: 4, name: 'turn_profile_right.png', width: 2160, height: 2160 },
      { index: 5, name: 'turn_back.png', width: 2160, height: 2160 },
      { index: 6, name: 'turn_expression_angry.png', width: 2160, height: 2160 },
      { index: 7, name: 'turn_expression_smile.png', width: 2160, height: 2160 },
      { index: 8, name: 'turn_expression_shock.png', width: 2160, height: 2160 },
      { index: 9, name: 'turn_action_pose.png', width: 2160, height: 2160 },
    ],
  },
];

export function useRecentExports() {
  const [recentExports, setRecentExports] = useState<RecentExport[]>(() => {
    try {
      const saved =
        localStorage.getItem('vistaroai_recent_exports') ||
        localStorage.getItem('splitpro_recent_exports');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return DEFAULT_SAMPLE_PROJECTS;
    } catch (e) {
      return DEFAULT_SAMPLE_PROJECTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vistaroai_recent_exports', JSON.stringify(recentExports));
    } catch (e) {
      // Storage quota or disabled in private mode
    }
  }, [recentExports]);

  const addRecentExport = useCallback((entry: Omit<RecentExport, 'id' | 'timestamp'>) => {
    setRecentExports((prev) => {
      const newEntry: RecentExport = {
        ...entry,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      };
      // Keep last 15 exports
      return [newEntry, ...prev].slice(0, 15);
    });
  }, []);

  const clearRecentExports = useCallback(() => {
    setRecentExports([]);
  }, []);

  return { recentExports, addRecentExport, clearRecentExports };
}
