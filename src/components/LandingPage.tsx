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
} from 'lucide-react';
import { Footer } from './Footer';
import { getCyberpunkStoryboardSample, getSeamlessPanoramaSample } from '../lib/sampleArtGenerator';

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

const FAQS = [
  {
    q: 'Does my image or video ever get uploaded to a cloud server?',
    a: 'No, never. All image ingestion, border detection, grid slicing, and MP4 video encoding occur 100% in-browser on your local machine using HTML5 Canvas and WebCodecs APIs. Your creative files never touch a remote server.',
  },
  {
    q: 'How does Vistaro compare to standard image croppers?',
    a: 'Vistaro renders directly from uncompressed native pixels. We provide sub-pixel alignment, automated panel border detection via Web Workers, lossless PNG packaging, and progressive 8K Studio sharpening up to 7680px.',
  },
  {
    q: 'Can I upload multiple photos and music to create motion videos?',
    a: 'Yes. The Motion Video Studio allows you to upload batches of slices or photos, apply Ken Burns pan-and-zoom motion presets, set per-slide captions, sync MP3/WAV background music, and render crisp 1080p/4K MP4 videos locally.',
  },
  {
    q: 'What is the Model Context Protocol (MCP) and Agent Access?',
    a: 'Vistaro features a native MCP server and browser bridge. External AI assistants (such as Claude Desktop, Antigravity, or Cursor) can programmatically inspect your canvas, calculate layouts, configure grid cuts, and export video via natural language commands.',
  },
  {
    q: 'Can I set custom split lines manually instead of equal grids?',
    a: 'Yes. Switch to Custom Split mode in the Slicer to drag vertical and horizontal cut lines freely, with real-time pixel readouts and magnetic snap guidelines.',
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
  const [activePreset, setActivePreset] = useState<'carousel' | 'square' | 'story'>('carousel');
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

  const handleLoadSample = (type: 'cyberpunk' | 'panorama') => {
    const sample = type === 'cyberpunk' ? getCyberpunkStoryboardSample() : getSeamlessPanoramaSample();
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
          HERO SECTION: CALM EDITORIAL TYPOGRAPHY & DISCIPLINED PROSE
          ========================================================================= */}
      <section className="relative pt-16 sm:pt-24 pb-12 px-4 sm:px-6 max-w-5xl mx-auto w-full flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-950 dark:text-white leading-[1.06] mb-6 max-w-4xl">
          Storyboard slicing and carousel studio for visual creators
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
          Turn ultra-wide panoramas, multi-panel storyboards, and artwork into seamless carousels and motion video. Engineered with sub-pixel snapping, WebCodecs GPU rendering, and zero cloud uploads.
        </p>

        {/* Primary Action Dock */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mb-8">
          <button
            type="button"
            onClick={onOpenSlicer}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm text-white bg-[#E05D26] hover:bg-[#C94E1B] shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Scissors className="w-4 h-4" />
            <span>Launch Storyboard Slicer</span>
          </button>

          <button
            type="button"
            onClick={onOpenVideoStudio}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <Film className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Motion Video Studio</span>
          </button>
        </div>

        {/* Craft Integrity Metrics */}
        <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            100% in-browser processing
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Lossless 8K export definition
          </span>
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Hardware WebCodecs MP4
          </span>
        </div>
      </section>

      {/* =========================================================================
          THE ONE BOLD THING: THE INTERACTIVE LIGHT TABLE & CUTTING MAT
          ========================================================================= */}
      <section className="px-4 sm:px-6 max-w-5xl mx-auto w-full mb-16">
        <div className="rounded-2xl border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-[#0F131C] p-4 sm:p-7 shadow-xs">
          {/* Light Table Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Live Cutting Mat
              </span>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                1080×1350 • Sub-pixel registration
              </span>
            </div>

            {/* Tactile Aspect Ratio Presets */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActivePreset('carousel')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activePreset === 'carousel'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                4:5 Carousel (3 Panels)
              </button>
              <button
                type="button"
                onClick={() => setActivePreset('square')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activePreset === 'square'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                1:1 Square Grid
              </button>
              <button
                type="button"
                onClick={() => setActivePreset('story')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activePreset === 'story'
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                9:16 Vertical Story
              </button>
            </div>
          </div>

          {/* Interactive Visual Canvas / Light Table Surface */}
          <div
            onClick={() => handleLoadSample('panorama')}
            className="group relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700/80 bg-slate-900 aspect-[16/7] cursor-pointer"
            title="Click to open this panorama in the Storyboard Slicer"
          >
            {/* Background Panorama Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
              style={{
                backgroundImage:
                  'url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80")',
              }}
            />

            {/* Darkroom Safe-Light Contrast Tint */}
            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors" />

            {/* Dynamic Precision Cut Guides & Registration Marks */}
            <div className="absolute inset-0 grid grid-cols-3 pointer-events-none divide-x divide-dashed divide-amber-400/90 dark:divide-amber-400/80">
              {/* Panel 1 */}
              <div className="relative p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-mono text-white/90 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-sm self-start">
                  <span>01 • 1080×1350</span>
                </div>
                <div className="text-[10px] font-mono text-amber-300 bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded-sm self-end">
                  Panel Left
                </div>
              </div>

              {/* Panel 2 */}
              <div className="relative p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-mono text-white/90 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-sm self-start">
                  <span>02 • 1080×1350</span>
                </div>
                <div className="text-[10px] font-mono text-amber-300 bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded-sm self-center">
                  Seamless Center
                </div>
              </div>

              {/* Panel 3 */}
              <div className="relative p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-mono text-white/90 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-sm self-start">
                  <span>03 • 1080×1350</span>
                </div>
                <div className="text-[10px] font-mono text-amber-300 bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded-sm self-end">
                  Panel Right
                </div>
              </div>
            </div>

            {/* Interactive Hover Bar */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-medium flex items-center gap-2 group-hover:bg-[#E05D26] group-hover:border-[#E05D26] transition-all">
              <Scissors className="w-3.5 h-3.5" />
              <span>Click to slice this panorama in editor</span>
            </div>
          </div>

          {/* Quick Demo Samples Footer */}
          <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Curated studio samples:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadSample('panorama')}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Seamless 3×1 Panorama
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('cyberpunk')}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                3×3 Anime Storyboard Grid
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
              ? 'border-[#E05D26] bg-[#E05D26]/5 dark:bg-[#E05D26]/10'
              : 'border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 hover:border-slate-400 dark:hover:border-slate-700'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
            <Upload className="w-5 h-5 text-[#E05D26]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">
              Drop an image or storyboard sequence here
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports PNG, JPG, WebP, and AVIF up to 8K resolution • No files leave your computer
            </p>
          </div>
          <span className="mt-1 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 pointer-events-none">
            Browse local file
          </span>
        </div>
      </section>

      {/* =========================================================================
          EDITORIAL CRAFT PILLARS (NO GENERIC SAAS CARD CLUTTER)
          ========================================================================= */}
      <section className="py-14 px-4 sm:px-6 max-w-5xl mx-auto w-full border-t border-slate-200 dark:border-slate-800/80">
        <div className="mb-10 text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white tracking-tight">
            Built for precision, speed, and privacy
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Sub-Pixel Geometry */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold mb-4 text-[#E05D26]">
                <Scissors className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-white mb-2">
                Sub-pixel storyboard slicing
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Partition wide panoramas into multi-slide Instagram carousels, 3×3 profile grids, or arbitrary custom split lines with sub-pixel alignment and automated panel border detection.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Lossless PNG & 8K canvas definition
            </div>
          </div>

          {/* Pillar 2: Motion Video Studio */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold mb-4 text-blue-600 dark:text-blue-400">
                <Film className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-white mb-2">
                Hardware motion video studio
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Turn static comic panels or photos into Ken Burns motion graphics. Add audio soundtracks, burned-in subtitles, and render 60 FPS MP4 video directly via WebCodecs.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              WebCodecs 60 FPS local export
            </div>
          </div>

          {/* Pillar 3: Open Agent Protocol */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131C] flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold mb-4 text-emerald-600 dark:text-emerald-400">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-white mb-2">
                Local privacy & Model Context Protocol
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Your media stays inside local browser memory. External AI assistants like Claude Desktop, Antigravity, or Cursor can also inspect and direct slicing using our native MCP server.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Zero server storage & 18 MCP tools
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ SECTION: DIRECT ANSWERS
          ========================================================================= */}
      <section className="py-14 px-4 sm:px-6 max-w-4xl mx-auto w-full border-t border-slate-200 dark:border-slate-800/80">
        <div className="text-left mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white tracking-tight">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-2.5">
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
                  className="w-full p-4 text-left flex items-center justify-between font-semibold text-sm text-slate-900 dark:text-white hover:text-[#E05D26] dark:hover:text-[#E05D26] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-90 text-[#E05D26]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
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
        <div className="rounded-2xl border border-slate-300/80 dark:border-slate-800 bg-white dark:bg-[#0F131C] p-8 sm:p-12 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mb-3">
            Open the studio and start slicing
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
            No signup or account required. Everything executes locally in your browser.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenSlicer}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-[#E05D26] hover:bg-[#C94E1B] text-white shadow-xs transition-all cursor-pointer"
            >
              Open Storyboard Slicer
            </button>
            <button
              type="button"
              onClick={onOpenVideoStudio}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Open Motion Video Studio
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer onNavigate={onNavigate} onOpenAdminPanel={onOpenAdminPanel} />
    </div>
  );
};
