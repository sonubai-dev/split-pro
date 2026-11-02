# VistaroAI Platform Redesign & Unified Creative Suite

Redesign VistaroAI into a modern SaaS platform inspired by the reference landing page aesthetic—featuring a dot-matrix constellation hero, floating UI preview cards, and social badges—seamlessly transitioning into an all-in-one Dashboard, Precision Storyboard Slicer, and Motion Graphic Video Studio.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during the interactive interview:
> - **Navigation Flow**: Seamless transition from the Hero "Get Started for Free" button into the unified **Dashboard**, with a persistent top navigation bar allowing direct jumping between **Home**, **Dashboard**, **Storyboard Slicer**, and **Motion Video Studio**.
> - **Dashboard Features**: Central Studio Tool Launcher (Storyboard Slicer + Motion Video Studio), recent projects/exports list, and one-tap quick creator presets (e.g. 9:16 Instagram Reel, 16:9 YouTube Storyboard, 3×3 Carousel, 4K/8K Ultra).
> - **Motion Graphic Video Focus**: Dedicated multi-media video studio prioritizing Ken Burns pan & zoom motion, smooth transitions (Fade, Slide, Wipe, Zoom), custom text captions, and optional soundtrack audio with local browser rendering (WebCodecs MP4 + WebM fallback).
> - **Branding Rules**: The brand name is strictly **VistaroAI** across the app (header, titles, badges, metadata, tools), with the exact phrase **"VistaroAI by SOLITA SOLUTIONS"** placed exclusively in the footer.

---

## 1. Overview & Core Concept

- **What It Does**: VistaroAI is a professional browser-based visual production platform combining an Ultra-HD storyboard image slicing engine with an animated motion graphic video generator.
- **Key Experience**: 
  1. **Home / Landing Page**: High-conversion SaaS presentation matching the user's reference screenshot with a dotted constellation background, central brand mark, social platform badges, floating interactive UI preview cards, and trust metrics.
  2. **Dashboard**: Central command hub with direct tool launch cards, recent export history, quick templates, and drag-and-drop batch upload.
  3. **Storyboard Slicer Studio**: High-precision image splitter with auto grids, custom pixel cutlines, 8K Ultra-HD upscaling, sharpness boost, and ZIP/PDF export.
  4. **Motion Graphic Video Studio**: Turn multiple images/panels or video clips into animated slideshows with Ken Burns effects, transitions, captions, audio tracks, and instant MP4 export.
- **Privacy & Performance Guarantee**: 100% client-side execution in browser memory using HTML5 Canvas, WebCodecs, and WebMCP agent tools—zero external server uploads, zero API key requirements, and zero telemetry.

---

## 2. User Experience & Visual Design

### A. Visual Identity Matching Reference Image
- **Atmosphere & Canvas**: Crisp white background (`#FFFFFF` in light mode, `#0B0F17` in dark mode) overlaid with a subtle radial dot-grid constellation pattern radiating from a central rounded brand emblem (`VistaroAI`).
- **Typography**: 
  - Display Headline: High-impact sans-serif (`Plus Jakarta Sans` / `Outfit`) with balanced weight (`font-extrabold text-slate-900 dark:text-white`).
  - Gradient Accent: Elegant indigo-to-purple gradient line (`from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400`) for the primary hero value proposition.
  - Body & Subtitle: Refined neutral slate (`text-slate-600 dark:text-slate-400`).
  - Micro-Data & Metrics: Tabular monospace numerals (`font-mono tabular-nums`).
- **Floating Feature Cards (Hero Surroundings)**:
  - Top-left: Mini Storyboard & Shorts card with media thumbnail.
  - Bottom-left: Real-time Timeline Editor card with video playback and waveform scrub.
  - Floating Left: Caption & Subtitle Inspector card with live styling tokens.
  - Top-right: AI Presets & Slicing Template selector card.
  - Bottom-right: Content Calendar / Multi-Panel Export Queue card.
  - Floating 3D Badges: Soft-elevated platform badges for YouTube, TikTok, Instagram, LinkedIn, and X.
- **Call-to-Action**: Prominent pill-less rounded button (`bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25`) with `"Get Started for Free"`, accompanied by user avatar trust proof (`4M+ creators & editors`) and `"No credit card required"`.

### B. View Navigation & State Progression
```
[ Landing Page ]  ──( "Get Started" / Nav Click )──>  [ Main Dashboard ]
                                                           │
                        ┌──────────────────────────────────┴──────────────────────────────────┐
                        ▼                                                                     ▼
             [ Storyboard Slicer Studio ]                                         [ Motion Video Studio ]
             - Grid, Auto, Custom Slicing                                         - Multi-image/video upload
             - 8K Ultra-HD Enhancement                                            - Ken Burns Pan & Zoom
             - Lossless ZIP / PDF Export                                          - Transitions, Audio & Captions
             - WebMCP AI Agent Control                                            - Deterministic MP4 / WebM Export
```

### C. Top Bar & Footer Architecture
- **Header Contract**: Exactly 3 zones:
  - Left: Clean single-wordmark brand logo `VistaroAI` with an icon badge (`V`).
  - Center: Clean text links (`Home`, `Dashboard`, `Storyboard Slicer`, `Video Studio`, `Resources`).
  - Right: Agent Access launcher button, Dark/Light mode toggle, and primary action (`"Launch Studio"`).
- **Footer Attribution**: Quiet, minimalist footer featuring copyright:
  `© 2026 VistaroAI by SOLITA SOLUTIONS · All processing local in your browser.`

---

## 3. Key Product Decisions & Trade-Offs

- **View Routing Without Full Page Reloads**:
  - *Chosen Approach*: React state-driven tabbed workspace (`view = 'home' | 'dashboard' | 'slicer' | 'video'`) with URL hash persistence (`#home`, `#dashboard`, `#slicer`, `#video`).
  - *Why*: Instant transitions with zero network overhead, retaining in-memory canvas bitmaps, undo stacks, and uploaded files without loss.
- **Dedicated Motion Video Studio Mode**:
  - *Chosen Approach*: Expand the existing video engine into both an embedded drawer in the slicer AND a dedicated full-screen Motion Graphic Video Studio accessible directly from the Dashboard.
  - *Why*: Allows users who just want to upload a batch of existing images/photos or videos to immediately create motion graphics without slicing first, while retaining seamless 1-click video creation from split panels.
- **Strict Brand Alignment**:
  - *Chosen Approach*: Everywhere in the application (titles, tools, prompts, buttons, drawers, agent prompts) displays **VistaroAI**. The phrase **"VistaroAI by SOLITA SOLUTIONS"** is displayed only in the footer as explicitly instructed.

---

## 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                       App.tsx                                          │
│    (Global Theme, Navigation State, Toast Manager, WebMCP Bridge, Recent Exports)      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                ┌───────────────────────────┼───────────────────────────┐
                ▼                           ▼                           ▼
        ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
        │  Header.tsx   │           │  Active View  │           │  Footer.tsx   │
        └───────────────┘           └───────┬───────┘           └───────────────┘
                                            │
            ┌───────────────────────┬───────┴───────────────┬───────────────────────┐
            ▼                       ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
    │  LandingPage  │       │   Dashboard   │       │ Storyboard    │       │ Motion Video  │
    │  - Dot Matrix │       │  - Tool Hub   │       │ Slicer Studio │       │ Studio        │
    │  - Hero Cards │       │  - Quick Presets│     │ - Canvas & Cut│       │ - Multi-Slide │
    │  - Trust Proof│       │  - Recent List│       │ - 8K / 4K Res │       │ - Ken Burns   │
    │  - CTA Flow   │       │  - Drag Upload│       │ - ZIP / PDF   │       │ - MP4 Render  │
    └───────────────┘       └───────────────┘       └───────────────┘       └───────────────┘
                                            │
                                            ▼
                            ┌───────────────────────────────┐
                            │    Agent Access & WebMCP      │
                            │  (window.VistaroAI / Tools)   │
                            └───────────────────────────────┘
```

### Component & File Strategy:
1. `src/components/LandingPage.tsx`: Rebuilt to replicate the reference design (dot-grid matrix canvas, headline typography with violet accent, floating interactive mock cards, social icons, CTA button, and feature highlights).
2. `src/components/Dashboard.tsx`: New component serving as the central hub—displays tool cards (Storyboard Slicer & Motion Video Studio), one-tap creator presets, quick image/video drag-and-drop launcher, and recent export gallery.
3. `src/components/MotionVideoStudio.tsx`: Full-screen studio dedicated to multi-image and multi-video motion graphic video composition (Ken Burns pan/zoom, transition presets, audio soundtrack, caption overlays, and WebCodecs MP4 export).
4. `src/components/AppHeader.tsx` & `src/components/Footer.tsx`: Updated with top navigation links, active view highlighting, and the required footer copyright `"VistaroAI by SOLITA SOLUTIONS"`.
5. `src/agent/tools.ts`: Updated to support direct switching between views and launching both studios programmatically.

---

## 5. Verification Plan

1. **Visual & Typographic Review**:
   - Verify the Landing Page reproduces the reference screenshot's dot matrix layout, typography scale, gradient hero line, floating preview cards, and social icons.
   - Verify light and dark mode contrast across all new components.
2. **Workflow Verification**:
   - Test "Get Started for Free" button transition directly into the Dashboard.
   - Test launching the Storyboard Slicer with single and multiple images.
   - Test launching the Motion Graphic Video Studio with batch image/video uploads.
   - Verify deterministic MP4/WebM video rendering with Ken Burns effects, transitions, captions, and audio.
   - Verify ZIP and PDF export from the Storyboard Slicer.
3. **Compilation & Linting**:
   - Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
   - Run `compile_applet` to verify a successful production Vite build.
