/**
 * High-Resolution In-Memory Anime & Storyboard Art Generator
 * Creates crisp, self-contained SVG Data URLs for studio samples and testing.
 * 100% offline, zero external network requests, zero CORS issues.
 */

export function getCyberpunkStoryboardSample(): { url: string; name: string } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3840 2160" width="3840" height="2160">
    <defs>
      <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0a051b"/>
        <stop offset="35%" stop-color="#1e0836"/>
        <stop offset="65%" stop-color="#491154"/>
        <stop offset="85%" stop-color="#7b1e58"/>
        <stop offset="100%" stop-color="#ff4b72"/>
      </linearGradient>
      <linearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffe600"/>
        <stop offset="40%" stop-color="#ff0077"/>
        <stop offset="100%" stop-color="#7b00ff"/>
      </linearGradient>
      <linearGradient id="gridGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#00f0ff" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#ff00aa" stop-opacity="0.1"/>
      </linearGradient>
      <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="30" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    <!-- Sky Background -->
    <rect width="3840" height="2160" fill="url(#skyGrad)"/>

    <!-- Distant Stars & Nebulae -->
    <g fill="#ffffff" opacity="0.6">
      <circle cx="450" cy="220" r="4"/>
      <circle cx="820" cy="180" r="6"/>
      <circle cx="1200" cy="340" r="3"/>
      <circle cx="1700" cy="190" r="5"/>
      <circle cx="2150" cy="260" r="4"/>
      <circle cx="2800" cy="150" r="7"/>
      <circle cx="3300" cy="280" r="4"/>
      <circle cx="3600" cy="120" r="5"/>
      <circle cx="600" cy="480" r="3"/>
      <circle cx="2400" cy="420" r="4"/>
    </g>

    <!-- Celestial Cyber Sun -->
    <circle cx="1920" cy="1150" r="580" fill="url(#sunGrad)" filter="url(#neonGlow)"/>
    <!-- Sun scanlines -->
    <path d="M1200 1020 H2640 M1240 1070 H2600 M1290 1130 H2550 M1350 1200 H2490 M1420 1280 H2420 M1500 1370 H2340" stroke="#0a051b" stroke-width="14" stroke-linecap="round"/>

    <!-- Mountain Silhouettes -->
    <polygon points="0,1400 480,1180 950,1360 1450,1100 1920,1320 2400,1080 2900,1340 3380,1120 3840,1380 3840,1650 0,1650" fill="#140728" opacity="0.9"/>
    <polygon points="0,1500 620,1280 1200,1450 1800,1260 2200,1420 2750,1250 3250,1440 3840,1290 3840,1650 0,1650" fill="#0d041a"/>

    <!-- Cyber City Skyline -->
    <g fill="#07020e">
      <!-- Left Skyscrapers -->
      <rect x="200" y="1050" width="160" height="600"/>
      <rect x="400" y="920" width="220" height="730"/>
      <rect x="680" y="1100" width="180" height="550"/>
      <rect x="900" y="980" width="240" height="670"/>
      <rect x="1180" y="1120" width="150" height="530"/>
      <!-- Right Skyscrapers -->
      <rect x="2500" y="1080" width="190" height="570"/>
      <rect x="2740" y="950" width="230" height="700"/>
      <rect x="3020" y="1120" width="160" height="530"/>
      <rect x="3220" y="890" width="260" height="760"/>
      <rect x="3520" y="1060" width="200" height="590"/>
    </g>

    <!-- Neon Cyber Window Lights -->
    <g fill="#00f0ff" opacity="0.8">
      <rect x="430" y="960" width="20" height="40"/>
      <rect x="470" y="960" width="20" height="40"/>
      <rect x="510" y="960" width="20" height="40"/>
      <rect x="430" y="1040" width="20" height="40"/>
      <rect x="510" y="1040" width="20" height="40"/>
      <rect x="930" y="1020" width="30" height="30"/>
      <rect x="990" y="1020" width="30" height="30"/>
      <rect x="1050" y="1020" width="30" height="30"/>
      <rect x="2780" y="990" width="25" height="35"/>
      <rect x="2840" y="990" width="25" height="35"/>
      <rect x="3270" y="930" width="30" height="50"/>
      <rect x="3330" y="930" width="30" height="50"/>
      <rect x="3390" y="930" width="30" height="50"/>
    </g>
    <g fill="#ff00aa" opacity="0.8">
      <rect x="470" y="1040" width="20" height="40"/>
      <rect x="930" y="1080" width="30" height="30"/>
      <rect x="1050" y="1080" width="30" height="30"/>
      <rect x="2810" y="1050" width="25" height="35"/>
      <rect x="3330" y="1010" width="30" height="50"/>
    </g>

    <!-- Perspective Grid Ground (Synthwave/Cyberpunk Floor) -->
    <rect x="0" y="1500" width="3840" height="660" fill="#06020c"/>
    <g stroke="url(#gridGrad)" stroke-width="4">
      <!-- Vanishing lines to center horizon -->
      <line x1="1920" y1="1500" x2="-200" y2="2160"/>
      <line x1="1920" y1="1500" x2="250" y2="2160"/>
      <line x1="1920" y1="1500" x2="700" y2="2160"/>
      <line x1="1920" y1="1500" x2="1150" y2="2160"/>
      <line x1="1920" y1="1500" x2="1600" y2="2160"/>
      <line x1="1920" y1="1500" x2="1920" y2="2160" stroke="#00f0ff" stroke-width="8"/>
      <line x1="1920" y1="1500" x2="2240" y2="2160"/>
      <line x1="1920" y1="1500" x2="2690" y2="2160"/>
      <line x1="1920" y1="1500" x2="3140" y2="2160"/>
      <line x1="1920" y1="1500" x2="3590" y2="2160"/>
      <line x1="1920" y1="1500" x2="4040" y2="2160"/>

      <!-- Horizontal grid steps (perspective distance) -->
      <line x1="0" y1="1520" x2="3840" y2="1520" stroke-width="2"/>
      <line x1="0" y1="1550" x2="3840" y2="1550" stroke-width="2.5"/>
      <line x1="0" y1="1590" x2="3840" y2="1590" stroke-width="3"/>
      <line x1="0" y1="1640" x2="3840" y2="1640" stroke-width="4"/>
      <line x1="0" y1="1710" x2="3840" y2="1710" stroke-width="5"/>
      <line x1="0" y1="1800" x2="3840" y2="1800" stroke-width="6"/>
      <line x1="0" y1="1920" x2="3840" y2="1920" stroke-width="7"/>
      <line x1="0" y1="2070" x2="3840" y2="2070" stroke-width="9"/>
    </g>

    <!-- Studio Watermark & Typography -->
    <text x="1920" y="650" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="72" font-weight="900" letter-spacing="16" text-anchor="middle" opacity="0.9" filter="url(#neonGlow)">
      NEO TOKYO STORYBOARD
    </text>
    <text x="1920" y="730" fill="#00f0ff" font-family="monospace" font-size="32" letter-spacing="8" text-anchor="middle" opacity="0.8">
      VISTARO ANIMATION STUDIO • 3840 × 2160 4K MASTER
    </text>
  </svg>`;

  return {
    name: 'Neo_Tokyo_Cyberpunk_Storyboard_4K.svg',
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}

export function getSeamlessPanoramaSample(): { url: string; name: string } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4320 1440" width="4320" height="1440">
    <defs>
      <linearGradient id="panoSky" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="33%" stop-color="#311042"/>
        <stop offset="66%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.2"/>
      </linearGradient>
    </defs>

    <!-- Continuous Panoramic Sky (Seamless Left-to-Right Loop) -->
    <rect width="4320" height="1440" fill="url(#panoSky)"/>

    <!-- Seamless Horizon Mountains -->
    <path d="M0 900 Q 360 700 720 850 T 1440 820 T 2160 880 T 2880 790 T 3600 860 T 4320 900 L 4320 1440 L 0 1440 Z" fill="#1e113a"/>
    <path d="M0 1020 Q 400 880 800 980 T 1600 950 T 2400 1020 T 3200 930 T 4000 990 T 4320 1020 L 4320 1440 L 0 1440 Z" fill="#0d0920"/>

    <!-- Glowing Celestial Moon on Panel 2 -->
    <circle cx="2160" cy="500" r="180" fill="#f8fafc" opacity="0.9"/>
    <circle cx="2160" cy="500" r="240" fill="#818cf8" opacity="0.2"/>

    <!-- Atmospheric Clouds -->
    <path d="M0 650 Q 500 550 1000 640 T 2000 620 T 3000 650 T 4000 620 T 4320 650" stroke="url(#cloudGrad)" stroke-width="40" fill="none" opacity="0.5"/>
    <path d="M0 750 Q 600 680 1200 740 T 2400 710 T 3600 750 T 4320 750" stroke="url(#cloudGrad)" stroke-width="30" fill="none" opacity="0.4"/>

    <!-- 3-Slide Panel Divider Guide Indicators -->
    <line x1="1440" y1="0" x2="1440" y2="1440" stroke="#00f0ff" stroke-width="3" stroke-dasharray="16,16" opacity="0.6"/>
    <line x1="2880" y1="0" x2="2880" y2="1440" stroke="#00f0ff" stroke-width="3" stroke-dasharray="16,16" opacity="0.6"/>

    <text x="720" y="300" fill="#ffffff" font-family="system-ui, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" opacity="0.8">
      SLIDE 01 • INITIATION
    </text>
    <text x="2160" y="300" fill="#ffffff" font-family="system-ui, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" opacity="0.8">
      SLIDE 02 • THE ECLIPSE
    </text>
    <text x="3600" y="300" fill="#ffffff" font-family="system-ui, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" opacity="0.8">
      SLIDE 03 • HORIZON
    </text>
  </svg>`;

    return {
    name: 'Seamless_Panorama_3x1_Carousel.svg',
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}

export function getWebtoonStripSample(): { url: string; name: string } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 3200" width="1200" height="3200">
    <defs>
      <linearGradient id="panelGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
      <linearGradient id="panelGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#3b0764"/>
        <stop offset="100%" stop-color="#1e1b4b"/>
      </linearGradient>
      <linearGradient id="panelGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#064e3b"/>
        <stop offset="100%" stop-color="#022c22"/>
      </linearGradient>
      <linearGradient id="panelGrad4" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#7c2d12"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
    </defs>

    <rect width="1200" height="3200" fill="#090d16"/>

    <!-- Panel 1: Prologue -->
    <rect x="40" y="40" width="1120" height="720" rx="16" fill="url(#panelGrad1)" stroke="#334155" stroke-width="4"/>
    <text x="600" y="340" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="44" font-weight="900" text-anchor="middle">
      EPISODE 01: THE AWAKENING
    </text>
    <text x="600" y="420" fill="#94a3b8" font-family="monospace" font-size="24" text-anchor="middle">
      Panel 01 • Vertical Webtoon Reader (800 × 1280)
    </text>

    <!-- Panel 2: Action Impact -->
    <rect x="40" y="840" width="1120" height="720" rx="16" fill="url(#panelGrad2)" stroke="#334155" stroke-width="4"/>
    <circle cx="600" cy="1160" r="140" fill="#ec4899" opacity="0.3"/>
    <text x="600" y="1180" fill="#f43f5e" font-family="system-ui, sans-serif" font-size="56" font-weight="900" text-anchor="middle">
      💥 IMPACT STRIKE!
    </text>
    <text x="600" y="1250" fill="#cbd5e1" font-family="monospace" font-size="22" text-anchor="middle">
      Auto-detected gutter at Y: 800px
    </text>

    <!-- Panel 3: Dialogue Encounter -->
    <rect x="40" y="1640" width="1120" height="720" rx="16" fill="url(#panelGrad3)" stroke="#334155" stroke-width="4"/>
    <text x="600" y="1960" fill="#34d399" font-family="system-ui, sans-serif" font-size="44" font-weight="800" text-anchor="middle">
      "THE ENERGY GRID IS UNSTABLE"
    </text>
    <text x="600" y="2030" fill="#a7f3d0" font-family="monospace" font-size="22" text-anchor="middle">
      Panel 03 • Lossless Gutter Separation
    </text>

    <!-- Panel 4: Cliffhanger -->
    <rect x="40" y="2440" width="1120" height="720" rx="16" fill="url(#panelGrad4)" stroke="#334155" stroke-width="4"/>
    <text x="600" y="2780" fill="#fb923c" font-family="system-ui, sans-serif" font-size="52" font-weight="900" text-anchor="middle">
      TO BE CONTINUED...
    </text>
    <text x="600" y="2850" fill="#fdba74" font-family="monospace" font-size="22" text-anchor="middle">
      Panel 04 • Single-Click Batch ZIP Export
    </text>
  </svg>`;

  return {
    name: 'Webtoon_Comic_Vertical_Strip.svg',
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}

export function getProfileGridSample(): { url: string; name: string } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3240 3240" width="3240" height="3240">
    <defs>
      <linearGradient id="mosaicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="50%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0b0f19"/>
      </linearGradient>
    </defs>
    <rect width="3240" height="3240" fill="url(#mosaicGrad)"/>
    <circle cx="1620" cy="1620" r="1000" fill="#f59e0b" opacity="0.15"/>
    <circle cx="1620" cy="1620" r="600" fill="#ea580c" opacity="0.25"/>
    
    <!-- 3x3 Grid Guides -->
    <line x1="1080" y1="0" x2="1080" y2="3240" stroke="#f97316" stroke-width="8" stroke-dasharray="24,24"/>
    <line x1="2160" y1="0" x2="2160" y2="3240" stroke="#f97316" stroke-width="8" stroke-dasharray="24,24"/>
    <line x1="0" y1="1080" x2="3240" y2="1080" stroke="#f97316" stroke-width="8" stroke-dasharray="24,24"/>
    <line x1="0" y1="2160" x2="3240" y2="2160" stroke="#f97316" stroke-width="8" stroke-dasharray="24,24"/>

    <!-- Center Brand Badge -->
    <rect x="800" y="1400" width="1640" height="440" rx="32" fill="#000000" fill-opacity="0.75" stroke="#ffffff" stroke-width="4"/>
    <text x="1620" y="1600" fill="#ffffff" font-family="system-ui, sans-serif" font-size="80" font-weight="900" text-anchor="middle">
      INSTAGRAM 3×3 PROFILE MOSAIC
    </text>
    <text x="1620" y="1720" fill="#fb923c" font-family="monospace" font-size="40" text-anchor="middle">
      9 Tiles • 1080×1080px Each • Perfect Feed Grid
    </text>
  </svg>`;

  return {
    name: 'Instagram_3x3_Profile_Mosaic.svg',
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  };
}
