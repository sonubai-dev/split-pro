import React, { useState, useRef } from 'react';
import {
  Scissors,
  Film,
  Upload,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Zap,
  Check,
  Layers,
  Cpu,
  Lock,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Tv,
  FileArchive,
  Sliders,
  Grid,
  FileImage,
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
}

const FAQS = [
  {
    q: 'Does my image or video ever get uploaded to a cloud server?',
    a: 'No, never. All image ingestion, border detection math, grid slicing, and MP4 video encoding occur 100% in-browser on your local machine using HTML5 Canvas and WebCodecs APIs. Your creative files never touch our servers.',
  },
  {
    q: 'How does the Storyboard Slicer compare to standard image croppers?',
    a: 'VistaroAI draws directly from uncompressed native pixels. We offer sub-pixel alignment, intelligent border edge detection via Web Workers, lossless PNG packaging, and progressive 8K Studio sharpening up to 7680px.',
  },
  {
    q: 'Can I upload multiple photos and music to create motion videos?',
    a: 'Yes. The Motion Video Studio lets you upload batches of slices or photos, apply Ken Burns pan-and-zoom motion presets, set custom per-slide captions, sync MP3/WAV background music, and render crisp 1080p/4K MP4 videos instantly.',
  },
  {
    q: 'What is the Model Context Protocol (MCP) and Agent Access?',
    a: 'VistaroAI features a native MCP server and browser bridge. External AI assistants (like Claude Desktop, Antigravity, or Cursor) can programmatically inspect your canvas, calculate layouts, configure grid cuts, and export video via natural language commands.',
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
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'slicer' | 'video'>('slicer');
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
    <div className="min-h-screen bg-white dark:bg-[#080B11] text-slate-900 dark:text-slate-100 transition-colors flex flex-col selection:bg-violet-500/20 selection:text-violet-600">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* =========================================================================
          MINIMALIST HERO SECTION
          ========================================================================= */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-6 max-w-5xl mx-auto w-full flex flex-col items-center text-center">
        {/* Subtle ambient light */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-violet-500/10 dark:bg-violet-600/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        {/* Minimal pill badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs font-medium text-slate-600 dark:text-slate-400 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>VistaroAI 2.0 • Local In-Browser Processing</span>
        </div>

        {/* Clean, high-impact headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.08] mb-6 max-w-4xl">
          Precision Storyboard Slicing &{' '}
          <span className="text-violet-600 dark:text-violet-400">Motion Video</span> Suite
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
          Split multi-panel artwork and carousels into sub-pixel social grids, or turn sequential panels into smooth Ken Burns motion videos. 100% private, hardware-accelerated.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mb-8">
          <button
            type="button"
            onClick={onOpenSlicer}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm text-white bg-violet-600 hover:bg-violet-500 shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Scissors className="w-4 h-4" />
            <span>Launch Storyboard Slicer</span>
          </button>

          <button
            type="button"
            onClick={onOpenVideoStudio}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Film className="w-4 h-4 text-violet-500" />
            <span>Motion Video Studio</span>
          </button>
        </div>

        {/* Trust Guarantees */}
        <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Zero Cloud Storage
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> 8K Lossless Definition
          </span>
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-500" /> WebCodecs Hardware MP4
          </span>
        </div>
      </section>

      {/* =========================================================================
          MINIMALIST WORKSPACE INGESTION & QUICK ACTIONS
          ========================================================================= */}
      <section className="px-4 sm:px-6 max-w-4xl mx-auto w-full mb-20">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-6 sm:p-8">
          {/* Segmented Mode Switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2 bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('slicer')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'slicer'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Storyboard Slicer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('video')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'video'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Motion Video Studio
              </button>
            </div>

            <button
              type="button"
              onClick={activeTab === 'slicer' ? onOpenSlicer : onOpenVideoStudio}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clean Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full py-12 px-6 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
              isDragOver
                ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Drop your image, storyboard, or video frames here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                PNG, JPG, WebP, AVIF up to 8K (7680px) • Zero cloud upload
              </p>
            </div>
            <button
              type="button"
              className="mt-1 px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors pointer-events-none"
            >
              Browse Files
            </button>
          </div>

          {/* Minimalist 1-Click Sample Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
            <span className="font-medium">Quick Demo Samples:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleLoadSample('cyberpunk')}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-400 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
              >
                3×3 Anime Storyboard Grid
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('panorama')}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-400 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
              >
                3×1 Seamless Swipe Carousel
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MINIMALIST 3-COLUMN CORE CAPABILITIES
          ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="text-left mb-12">
          <p className="text-xs font-mono font-bold tracking-wider text-violet-600 dark:text-violet-400 uppercase mb-2">
            CORE CAPABILITIES
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Engineered for Precision & Absolute Privacy
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Precision Slicing */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold mb-4">
                <Scissors className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Sub-Pixel Storyboard Slicing
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Divide large art into Instagram carousels, 3×3 grids, or custom split lines with sub-pixel alignment and automated panel border detection.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-medium">
              <Check className="w-3.5 h-3.5" /> Lossless PNG & 8K Upscaling
            </div>
          </div>

          {/* Card 2: Motion Video Studio */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold mb-4">
                <Film className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                Hardware Motion Video Studio
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Transform sequential panels into Ken Burns motion graphics. Add audio soundtracks, burned-in subtitles, and export 1080p/4K MP4 videos locally.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-3.5 h-3.5" /> WebCodecs 60 FPS Export
            </div>
          </div>

          {/* Card 3: 100% In-Browser Privacy & MCP */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mb-4">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                100% Client-Side & MCP Bridge
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Your media stays inside local browser memory. AI assistants can also inspect and direct slicing using our native Model Context Protocol bridge.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <Check className="w-3.5 h-3.5" /> Zero Server Storage
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SIMPLE WORKFLOW (1 - 2 - 3)
          ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="text-left mb-12">
          <p className="text-xs font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mb-2">
            HOW IT WORKS
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Three Steps from Raw Art to Finished Content
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">01</span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2 mb-1.5">Ingest Media</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Drop any native-resolution PNG, JPG, or WebP. Multi-image batches are loaded directly into browser memory.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">02</span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2 mb-1.5">Configure Split or Motion</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Select presets (3×3 mosaic, 3×1 swipe), drag custom magnetic cut lines, or configure Ken Burns camera zoom easing.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">03</span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2 mb-1.5">Export Instantly</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Download lossless ZIP archives with sequential naming, export multi-page PDFs, or render 60 FPS MP4 video.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ SECTION
          ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto w-full border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="text-left mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-2.5">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between font-semibold text-sm text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-90 text-violet-600' : ''
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
          MINIMALIST BOTTOM CALL TO ACTION
          ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto w-full">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-8 sm:p-12 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white mb-3">
            Start Slicing or Creating Motion Videos
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
            No account required. Instant, client-side, zero cloud storage.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenSlicer}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-violet-600 hover:bg-violet-500 text-white shadow-xs transition-all cursor-pointer"
            >
              Open Storyboard Slicer
            </button>
            <button
              type="button"
              onClick={onOpenVideoStudio}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Open Motion Video Studio
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
