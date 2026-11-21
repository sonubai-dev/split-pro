import React, { useState, useRef } from 'react';
import {
  Scissors,
  Film,
  Upload,
  ShieldCheck,
  Zap,
  Check,
  Cpu,
  Layers,
  ChevronRight,
  Maximize2,
  Sliders,
  Grid,
  Palette,
  LayoutGrid,
  ArrowRight,
  Lock,
  Download,
  Sparkles,
  Clock,
  FileText,
  Smartphone,
  Play,
} from 'lucide-react';
import { Footer } from './Footer';
import {
  getCyberpunkStoryboardSample,
  getSeamlessPanoramaSample,
  getWebtoonStripSample,
  getProfileGridSample,
} from '../lib/sampleArtGenerator';

interface LandingPageProps {
  onGetStarted: () => void;
  onOpenSlicer: () => void;
  onOpenVideoStudio: () => void;
  onImageSelected?: (file: File) => void;
  onImagesSelected?: (files: File[]) => void;
  onSampleSelected?: (url: string, name: string) => void;
  onNavigate?: (view: 'home' | 'dashboard' | 'slicer' | 'video') => void;
  onOpenAdminPanel?: () => void;
}

type ShowcaseTab = 'carousel' | 'webtoon' | 'motion' | 'grid';

const FAQS = [
  {
    q: 'Does my image or video ever get uploaded to a cloud server?',
    a: 'No, absolutely never. All image ingestion, border detection, grid slicing, and MP4 video encoding occur 100% in-browser on your local machine using HTML5 Canvas and WebCodecs APIs. Your creative files never touch a remote server, making Vistaro safe for confidential client work and NDA projects.',
  },
  {
    q: 'How do I create a seamless Instagram carousel swipe post?',
    a: 'Simply drop your wide panoramic photo into Vistaro and select the "Instagram Carousel" preset (e.g. 3 panels at 4:5 portrait ratio). Vistaro splits the image with sub-pixel alignment and downloads a ZIP file containing numbered images (01, 02, 03). When you upload them in order to an Instagram multi-photo post, swiping between them is completely seamless with zero gaps or white bars.',
  },
  {
    q: 'Can comic and manga artists slice long vertical webtoon strips?',
    a: 'Yes. In the Slicer, choose the Webtoon mode or use the Intelligent Border Detector. The detector runs background Sobel edge analysis to automatically find horizontal gutters between comic panels. You can also drag custom magnetic cut lines freely across any vertical length.',
  },
  {
    q: 'Can I upload multiple photos and music to create motion videos?',
    a: 'Yes! The Motion Video Studio allows you to upload multiple slices or photos, apply cinematic Ken Burns pan-and-zoom motion presets, set per-slide captions, sync MP3/WAV background music, and render crisp 1080p or 4K MP4 videos directly in your browser with no cloud queues.',
  },
  {
    q: 'Is Vistaro really 100% free with no watermarks?',
    a: 'Yes. Because all image and video processing runs on your computer’s local processor rather than expensive cloud servers, Vistaro provides full 8K resolution, unlimited exports, and zero watermarks completely free without requiring an account.',
  },
  {
    q: 'What is the Model Context Protocol (MCP) and Agent Access?',
    a: 'Vistaro features a built-in MCP server and browser bridge. External AI assistants (like Claude Desktop, Antigravity, or Cursor) can connect to Vistaro via port 3002 to programmatically inspect your canvas, calculate layouts, configure grid cuts, and trigger exports via natural language.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onOpenSlicer,
  onOpenVideoStudio,
  onImageSelected,
  onImagesSelected,
  onSampleSelected,
  onNavigate,
  onOpenAdminPanel,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('carousel');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length === 1 && onImageSelected) {
        onImageSelected(e.dataTransfer.files[0]);
      } else if (onImagesSelected) {
        onImagesSelected(Array.from(e.dataTransfer.files));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length === 1 && onImageSelected) {
        onImageSelected(e.target.files[0]);
      } else if (onImagesSelected) {
        onImagesSelected(Array.from(e.target.files));
      }
    }
  };

  const handleLaunchSample = (tab: ShowcaseTab) => {
    if (tab === 'motion') {
      onOpenVideoStudio();
      return;
    }

    let sample;
    if (tab === 'carousel') {
      sample = getSeamlessPanoramaSample();
    } else if (tab === 'webtoon') {
      sample = getWebtoonStripSample();
    } else if (tab === 'grid') {
      sample = getProfileGridSample();
    } else {
      sample = getCyberpunkStoryboardSample();
    }

    if (onSampleSelected) {
      onSampleSelected(sample.url, sample.name);
    } else {
      onOpenSlicer();
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 transition-colors flex flex-col selection:bg-[#E05D26]/20 selection:text-[#E05D26]">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* =========================================================================
          HERO SECTION: CRYSTAL CLEAR BENEFIT & DIRECT VALUE PROPOSITION
          ========================================================================= */}
      <section className="relative pt-12 sm:pt-20 pb-10 px-4 sm:px-6 max-w-5xl mx-auto w-full flex flex-col items-center text-center">
        {/* Instant Privacy & Free Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-6 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#E05D26]" />
          <span>100% In-Browser Privacy • Zero Server Uploads • No Sign-up Needed</span>
        </div>

        {/* Primary Benefit Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.08] mb-6 max-w-4xl">
          Turn Wide Images into Seamless Instagram Carousels & 4K Motion Videos
        </h1>

        {/* Human, Actionable Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">
          The all-in-one studio to split wide panoramas, comic strips, and artwork into seamless swipeable panels for Instagram, TikTok, and Webtoon. Or animate them into 60 FPS Ken Burns motion videos with music—all processed privately in your browser.
        </p>

        {/* Primary Action Dock */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md mb-8">
          <button
            type="button"
            onClick={onOpenSlicer}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-[#E05D26] hover:bg-[#C94E1B] shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Scissors className="w-4 h-4" />
            <span>Open Storyboard Slicer</span>
          </button>

          <button
            type="button"
            onClick={onOpenVideoStudio}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Film className="w-4 h-4 text-[#E05D26]" />
            <span>Motion Video Studio</span>
          </button>
        </div>

        {/* Craft Integrity Badges */}
        <div className="flex items-center justify-center gap-5 sm:gap-8 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            100% Client-Side RAM
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Sub-Pixel Zero Gap Cuts
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Play className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Hardware WebCodecs 4K MP4
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <Download className="w-3.5 h-3.5 text-[#E05D26]" />
            Numbered ZIP & 8K Lossless
          </span>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE USE CASE SHOWCASE: THE "AHA!" MOMENT
          ========================================================================= */}
      <section className="px-4 sm:px-6 max-w-5xl mx-auto w-full mb-16">
        <div className="rounded-2xl border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-[#0F131C] p-4 sm:p-7 shadow-xs">
          {/* Use Case Tabs Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800/80">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                Interactive Live Preview
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Choose a workflow below to see how Vistaro splits and animates in real time
              </span>
            </div>

            {/* Tactile 4-Way Workflow Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('carousel')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'carousel'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs font-bold text-[#E05D26]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Instagram Carousel</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('webtoon')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'webtoon'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs font-bold text-[#E05D26]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Webtoon Strip</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('motion')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'motion'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs font-bold text-[#E05D26]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Motion Video</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('grid')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'grid'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs font-bold text-[#E05D26]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>3×3 Profile Grid</span>
              </button>
            </div>
          </div>

          {/* Workflow Header Banner */}
          <div className="mb-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-slate-900 dark:text-white mr-2">
                {activeTab === 'carousel' && 'Instagram & LinkedIn Continuous Swipe:'}
                {activeTab === 'webtoon' && 'Vertical Manga & Webtoon Chapter:'}
                {activeTab === 'motion' && 'Cinematic Ken Burns Motion Studio:'}
                {activeTab === 'grid' && 'Instagram 3×3 Giant Profile Grid:'}
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {activeTab === 'carousel' && '1 panoramic wide image splits into 3 seamless 4:5 cards with zero gap lines.'}
                {activeTab === 'webtoon' && 'Long scroll comic partitioned into 4 standard mobile reader panels with auto gutter detection.'}
                {activeTab === 'motion' && 'Pan-and-zoom camera movements turn static artwork into 60 FPS 4K MP4 with soundtrack.'}
                {activeTab === 'grid' && '1 square photo splits into 9 numbered tiles to create a mosaic banner across your feed.'}
              </span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-[#E05D26] shrink-0 bg-[#E05D26]/10 px-2 py-0.5 rounded-md">
              {activeTab === 'carousel' && '3 Panels • 1080×1350 • 4:5'}
              {activeTab === 'webtoon' && '4 Panels • 800×1280 • Gutter Snapped'}
              {activeTab === 'motion' && '4K UHD • 60 FPS • WebCodecs'}
              {activeTab === 'grid' && '9 Tiles • 1080×1080 • 1:1'}
            </span>
          </div>

          {/* Dynamic Interactive Visual Preview Canvas */}
          <div
            onClick={() => handleLaunchSample(activeTab)}
            className="group relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700/80 bg-slate-950 aspect-[16/8] sm:aspect-[16/7] cursor-pointer"
            title="Click to load this sample workflow directly in the studio"
          >
            {/* Visual Canvas Content By Tab */}
            {activeTab === 'carousel' && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
                  style={{
                    backgroundImage:
                      'url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80")',
                  }}
                />
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors" />

                {/* 3-Panel Seamless Carousel Slice Guides */}
                <div className="absolute inset-0 grid grid-cols-3 pointer-events-none divide-x-2 divide-dashed divide-amber-400/90 dark:divide-amber-400/80">
                  <div className="relative p-3 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-white bg-black/75 px-2 py-1 rounded-md self-start">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                      <span>Slide 01 • 1080×1350</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300 bg-black/60 px-2 py-0.5 rounded self-end">
                      Left Panorama
                    </span>
                  </div>

                  <div className="relative p-3 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-white bg-black/75 px-2 py-1 rounded-md self-start">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                      <span>Slide 02 • 1080×1350</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300 bg-black/60 px-2 py-0.5 rounded self-center">
                      Seamless Center (Zero Gaps)
                    </span>
                  </div>

                  <div className="relative p-3 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-white bg-black/75 px-2 py-1 rounded-md self-start">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                      <span>Slide 03 • 1080×1350</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300 bg-black/60 px-2 py-0.5 rounded self-end">
                      Right Panorama
                    </span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'webtoon' && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
                  style={{
                    backgroundImage:
                      'url("https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1920&q=80")',
                  }}
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />

                {/* Vertical Strip Horizontal Cut Marks */}
                <div className="absolute inset-0 grid grid-rows-3 pointer-events-none divide-y-2 divide-dashed divide-amber-400/90">
                  <div className="relative p-3 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-white bg-black/75 px-2 py-1 rounded-md">
                      Panel 01: Character Opening • 800×1280
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-black/60 px-2 py-0.5 rounded">
                      Gutter Detected (Y: 0px)
                    </span>
                  </div>
                  <div className="relative p-3 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-white bg-black/75 px-2 py-1 rounded-md">
                      Panel 02: Climax Battle Encounter • 800×1280
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-black/60 px-2 py-0.5 rounded">
                      Gutter Detected (Y: 1280px)
                    </span>
                  </div>
                  <div className="relative p-3 flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-white bg-black/75 px-2 py-1 rounded-md">
                      Panel 03: Episode Cliffhanger • 800×1280
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-black/60 px-2 py-0.5 rounded">
                      Gutter Detected (Y: 2560px)
                    </span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'motion' && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
                  style={{
                    backgroundImage:
                      'url("https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80")',
                  }}
                />
                <div className="absolute inset-0 bg-black/35 group-hover:bg-black/25 transition-colors" />

                {/* Motion Camera Trajectory Overlay */}
                <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-[#E05D26] rounded-xl flex flex-col justify-between p-4 pointer-events-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-white bg-red-600/90 px-2.5 py-1 rounded-md">
                      <span className="w-2 h-2 rounded-full bg-white inline-block animate-ping" />
                      <span>REC • 4K 60FPS WEBMUXER</span>
                    </div>
                    <span className="text-xs font-mono text-amber-300 bg-black/75 px-2.5 py-1 rounded-md">
                      Ken Burns: Pan Right + Slow Zoom In (1.25x)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/90 bg-black/75 backdrop-blur-xs p-2 rounded-lg">
                    <span>Audio Soundtrack: Active (24-bit 48kHz Stereo)</span>
                    <span className="font-mono text-emerald-400">Render Time: 2.1s (GPU WebCodecs)</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'grid' && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
                  style={{
                    backgroundImage:
                      'url("https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=80")',
                  }}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

                {/* 3x3 Grid Overlay */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none divide-x-2 divide-y-2 divide-dashed divide-amber-400/80">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((tile) => (
                    <div key={tile} className="relative p-2 flex items-start justify-between">
                      <span className="text-[10px] font-mono font-bold text-white bg-black/75 px-1.5 py-0.5 rounded">
                        #{tile} (1080×1080)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Interactive Hover Action Button */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-2 group-hover:bg-[#E05D26] group-hover:border-[#E05D26] group-hover:shadow-lg transition-all">
              <Scissors className="w-3.5 h-3.5" />
              <span>
                {activeTab === 'motion'
                  ? 'Launch in Motion Video Studio'
                  : 'Load this workflow sample in Studio'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Quick Demo Samples Footer */}
          <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Load instant offline sample:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleLaunchSample('carousel')}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-[#E05D26] dark:hover:border-[#E05D26] text-slate-800 dark:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Seamless 3×1 Panorama
              </button>
              <button
                type="button"
                onClick={() => handleLaunchSample('webtoon')}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-[#E05D26] dark:hover:border-[#E05D26] text-slate-800 dark:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Webtoon Vertical Strip
              </button>
              <button
                type="button"
                onClick={() => handleLaunchSample('grid')}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-[#E05D26] dark:hover:border-[#E05D26] text-slate-800 dark:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                3×3 Profile Mosaic
              </button>
              <button
                type="button"
                onClick={() => handleLaunchSample('motion')}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-[#E05D26] dark:hover:border-[#E05D26] text-slate-800 dark:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Motion Video Studio
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MEDIA INGESTION DOCK: TACTILE DROP ZONE
          ========================================================================= */}
      <section className="px-4 sm:px-6 max-w-4xl mx-auto w-full mb-16">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full py-10 px-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
            isDragOver
              ? 'border-[#E05D26] bg-[#E05D26]/5 dark:bg-[#E05D26]/10 shadow-md'
              : 'border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 hover:border-[#E05D26] dark:hover:border-[#E05D26]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-[#E05D26] flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-950 dark:text-white">
              Drop an image, panorama, or comic strip here to slice
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Supports PNG, JPG, WebP, and AVIF up to 8K resolution • 100% private: files never leave your computer
            </p>
          </div>
          <span className="mt-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 pointer-events-none hover:bg-slate-200">
            Browse local file
          </span>
        </div>
      </section>

      {/* =========================================================================
          "WHO IS VISTARO FOR?" 4 CORE REAL-WORLD USE CASES
          ========================================================================= */}
      <section className="py-14 px-4 sm:px-6 max-w-5xl mx-auto w-full border-t border-slate-200 dark:border-slate-800/80">
        <div className="mb-10 text-center sm:text-left">
          <span className="text-xs font-bold text-[#E05D26] uppercase tracking-wider block mb-1">
            Built for Visual Creators
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Who uses Vistaro and what can you build?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
            Whether you are optimizing your social media feed, publishing webtoons, or directing animation concepts, Vistaro provides the exact presets and export formats you need.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Persona 1: Instagram Carousel Creators */}
          <div className="p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] flex flex-col justify-between shadow-2xs hover:border-[#E05D26]/50 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold mb-4">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider block mb-1">
                Social Media Creators & Photographers
              </span>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">
                Seamless Instagram & LinkedIn Carousels
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Turn single wide landscape photos and artwork into a continuous multi-card swipe experience. Followers swipe seamlessly across your carousel with zero awkward white margins or misalignment.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Optimal 4:5 portrait aspect ratio (1080×1350) for maximum screen presence</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Sub-pixel mathematical alignment ensures continuous seamless edges</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Download sorted, numbered ZIP files ready to post directly from your phone</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onOpenSlicer}
              className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold text-[#E05D26] hover:text-[#C94E1B] flex items-center gap-1 cursor-pointer"
            >
              <span>Slice an Instagram Carousel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Persona 2: Webtoon & Manga Artists */}
          <div className="p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] flex flex-col justify-between shadow-2xs hover:border-[#E05D26]/50 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-4">
                <Palette className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                Webtoon, Manga & Comic Artists
              </span>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">
                Automated Webtoon & Manga Chapter Slicing
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Stop manually cropping 10,000px vertical comic rolls. Vistaro’s background Web Worker scans your art, detects gutters between panels, and slices chapters into standard Webtoon mobile heights.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Intelligent Sobel edge & gutter detection spots panel gaps automatically</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Custom magnetic split lines allow dragging cut boundaries freely</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Lossless PNG and WebP preservation keeps line art and dialogue crisp</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onOpenSlicer}
              className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold text-[#E05D26] hover:text-[#C94E1B] flex items-center gap-1 cursor-pointer"
            >
              <span>Slice a Comic Strip</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Persona 3: Animators & Filmmakers */}
          <div className="p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] flex flex-col justify-between shadow-2xs hover:border-[#E05D26]/50 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mb-4">
                <Film className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                Animators, Filmmakers & Storyboarders
              </span>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">
                Storyboard Motion Videos & Animatic Reels
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Bring static storyboard sketches and keyframes to life. Add cinematic Ken Burns camera pan and zoom movements, sync background music, burn in subtitles, and render 60 FPS MP4 video right in your browser.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Hardware WebCodecs 4K/1080p MP4 rendering with zero server queues</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Per-slide Ken Burns pan, zoom, and tilt camera trajectory controls</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Sync MP3/WAV soundtracks with customizable burnt-in scene captions</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onOpenVideoStudio}
              className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold text-[#E05D26] hover:text-[#C94E1B] flex items-center gap-1 cursor-pointer"
            >
              <span>Create Motion Video</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Persona 4: Graphic Designers & Agencies */}
          <div className="p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] flex flex-col justify-between shadow-2xs hover:border-[#E05D26]/50 transition-colors">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold mb-4">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                Graphic Designers & Marketing Agencies
              </span>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">
                3×3 Grid Banners & Client Presentation PDFs
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Design giant 3×3 mosaic profiles for brand launches, or partition high-resolution UI screens and product mockups into client-ready multi-page PDFs with full dimension specs.
              </p>
              <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>8K Studio progressive enhancement and ultra-sharpening up to 7680px</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Multi-page PDF export with scene notes and aspect ratio metadata</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Native MCP Agent Bridge: Claude Desktop & AI agents can trigger cuts</span>
                </li>
              </ul>
            </div>
            <button
              type="button"
              onClick={onOpenSlicer}
              className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold text-[#E05D26] hover:text-[#C94E1B] flex items-center gap-1 cursor-pointer"
            >
              <span>Build a 3×3 Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          "HOW IT WORKS IN 3 SIMPLE STEPS" (WORKFLOW)
          ========================================================================= */}
      <section className="py-14 px-4 sm:px-6 max-w-5xl mx-auto w-full border-t border-slate-200 dark:border-slate-800/80">
        <div className="mb-12 text-center">
          <span className="text-xs font-bold text-[#E05D26] uppercase tracking-wider block mb-1">
            Zero Learning Curve
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            How it works in 3 simple steps
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-xl mx-auto">
            From raw high-res artwork to ready-to-post social assets in under 30 seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#E05D26] font-mono font-extrabold text-base flex items-center justify-center mb-4">
                01
              </div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white mb-2">
                Drop Your Image or Art
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Drag and drop any panoramic photo, comic strip, or illustration up to 8K. Files are loaded straight into your browser memory and never leave your computer.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero server upload risk</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#E05D26] font-mono font-extrabold text-base flex items-center justify-center mb-4">
                02
              </div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white mb-2">
                Pick Preset or Drag Cut Lines
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Choose Instagram Carousel (4:5), 3×3 Grid, or Webtoon vertical slice. Or switch to Custom Split mode to drag magnetic cut lines anywhere with live pixel readouts.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Sub-pixel magnetic snap</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#E05D26] font-mono font-extrabold text-base flex items-center justify-center mb-4">
                03
              </div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white mb-2">
                Export in 1-Click
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Download a clean, sorted ZIP package of numbered slides ready for mobile upload. Or click "Render Video" to compile a 60 FPS 4K motion MP4 with Ken Burns animation.
              </p>
            </div>
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>Instant local file packaging</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          WHY IN-BROWSER MATTERS: VISTARO VS CLOUD TOOLS
          ========================================================================= */}
      <section className="py-14 px-4 sm:px-6 max-w-5xl mx-auto w-full border-t border-slate-200 dark:border-slate-800/80">
        <div className="mb-10 text-center sm:text-left">
          <span className="text-xs font-bold text-[#E05D26] uppercase tracking-wider block mb-1">
            Engineered Differently
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Why 100% In-Browser beats traditional cloud croppers
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
            Most online image splitters force you to upload large private images to remote servers, wait in processing queues, and pay subscriptions for high resolution. Vistaro runs entirely on your device.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            {/* Vistaro Column */}
            <div className="p-6 sm:p-8 bg-amber-500/[0.03] dark:bg-amber-500/[0.05]">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                  Vistaro Studio (Local In-Browser)
                </h3>
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Zero Cloud Uploads:</strong> Files remain in local RAM. Complete security for confidential client NDA projects.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Zero Latency:</strong> No server queue times or network upload delays; slicing renders at hardware speed.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Native 8K Resolution:</strong> Lossless PNG, AVIF, WebP, and WebCodecs 4K MP4 with progressive sharpening.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Free & No Watermarks:</strong> Unlimited exports forever without requiring account sign-up.</span>
                </li>
              </ul>
            </div>

            {/* Traditional Cloud Tools Column */}
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-slate-400" />
                <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400">
                  Standard Cloud Image Croppers
                </h3>
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 text-red-500 shrink-0 mt-0.5 font-bold">✕</span>
                  <span>Images uploaded to unknown third-party servers; risky for client or unreleased artwork.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 text-red-500 shrink-0 mt-0.5 font-bold">✕</span>
                  <span>Slow server queues; requires uploading gigabytes of data over internet connections.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 text-red-500 shrink-0 mt-0.5 font-bold">✕</span>
                  <span>Downscales and compresses your high-res art; 4K and 8K exports gated behind paywalls.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-4 h-4 text-red-500 shrink-0 mt-0.5 font-bold">✕</span>
                  <span>Forces account creation, applies watermarks, and charges recurring subscriptions.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ SECTION: DIRECT ANSWERS
          ========================================================================= */}
      <section className="py-14 px-4 sm:px-6 max-w-4xl mx-auto w-full border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-center sm:text-left mb-8">
          <span className="text-xs font-bold text-[#E05D26] uppercase tracking-wider block mb-1">
            Common Questions
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-4.5 text-left flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white hover:text-[#E05D26] dark:hover:text-[#E05D26] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                      isOpen ? 'rotate-90 text-[#E05D26]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4.5 pb-4.5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          BOTTOM CALL TO ACTION: DIRECT, UNCLUTTERED
          ========================================================================= */}
      <section className="py-14 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="rounded-2xl border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-[#0F131C] p-8 sm:p-14 text-center shadow-xs">
          <span className="text-xs font-bold text-[#E05D26] uppercase tracking-wider block mb-2">
            Instant Creative Freedom
          </span>
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white mb-3">
            Open the studio and start slicing in seconds
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto mb-8">
            No signup, login, or credit card required. Drop your image or artwork and generate ready-to-post carousels or 4K motion videos right now.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={onOpenSlicer}
              className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm bg-[#E05D26] hover:bg-[#C94E1B] text-white shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Scissors className="w-4 h-4" />
              <span>Launch Storyboard Slicer</span>
            </button>
            <button
              type="button"
              onClick={onOpenVideoStudio}
              className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Film className="w-4 h-4 text-[#E05D26]" />
              <span>Open Motion Video Studio</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer onNavigate={onNavigate} onOpenAdminPanel={onOpenAdminPanel} />
    </div>
  );
};
