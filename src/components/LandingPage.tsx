import React, { useState } from 'react';
import {
  Sparkles,
  Scissors,
  Film,
  Play,
  Pause,
  Upload,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Zap,
  Sliders,
  Check,
  Layers,
  FileArchive,
  Music,
  Video,
  Grid,
} from 'lucide-react';
import { Footer } from './Footer';

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
    q: 'Does my image or video get uploaded to any server or cloud database?',
    a: 'No. All image reading, canvas slicing, motion graphic generation, and MP4/WebM video rendering occurs 100% locally in your browser memory using HTML5 Canvas and WebCodecs APIs. Your media never leaves your device.',
  },
  {
    q: 'Can I upload multiple photos or videos to make a motion graphic slideshow?',
    a: 'Yes! The Motion Graphic Video Studio allows you to upload batches of images, photos, and video clips, choose custom Ken Burns pan and zoom motion for each slide, add audio soundtracks, burned-in captions, and export directly as an MP4 video.',
  },
  {
    q: 'Will slicing or upscaling degrade my original photo quality?',
    a: 'Never. Slicing draws directly from the native full-resolution source image pixels. PNG exports are 100% lossless, and our 8K Ultra-HD progressive enhancement option can upscale storyboards up to 7680px with razor-sharp contour definition.',
  },
  {
    q: 'Can I set custom split lines manually instead of equal grids?',
    a: 'Yes! VistaroAI includes a Custom Split mode with draggable vertical and horizontal split lines, exact pixel coordinate readouts, and snap alignments.',
  },
  {
    q: 'What is WebMCP Agent Access?',
    a: 'VistaroAI provides a built-in programmatic tool bridge (MCP-style) exposing tools via navigator.modelContext and window.VistaroAI. AI agents like Claude or ChatGPT can inspect, slice, configure layouts, and render videos while you keep full manual control and undo safety.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onOpenSlicer,
  onOpenVideoStudio,
  onNavigate,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-[#080B11] text-slate-900 dark:text-slate-100 transition-colors overflow-hidden flex flex-col">
      {/* =========================================================================
          HERO SECTION (Strictly matching user's reference screenshot)
          ========================================================================= */}
      <section className="relative pt-8 sm:pt-14 pb-20 px-4 sm:px-6 max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        {/* Dotted matrix background pattern radiating from center */}
        <div className="absolute inset-0 bg-dot-matrix-light dark:bg-dot-matrix-dark pointer-events-none opacity-85" />
        
        {/* Soft radial purple/violet glow behind the center */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-violet-500/10 dark:bg-violet-600/15 blur-[140px] rounded-full pointer-events-none" />

        {/* Subtle geometric connector lines (SVG) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-20 hidden md:block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line x1="50%" y1="18%" x2="16%" y2="12%" stroke="currentColor" strokeDasharray="3 4" strokeWidth="1" className="text-violet-400" />
          <line x1="50%" y1="18%" x2="84%" y2="12%" stroke="currentColor" strokeDasharray="3 4" strokeWidth="1" className="text-violet-400" />
          <line x1="50%" y1="18%" x2="10%" y2="35%" stroke="currentColor" strokeDasharray="3 4" strokeWidth="1" className="text-violet-400" />
          <line x1="50%" y1="18%" x2="90%" y2="35%" stroke="currentColor" strokeDasharray="3 4" strokeWidth="1" className="text-violet-400" />
          <line x1="50%" y1="18%" x2="22%" y2="65%" stroke="currentColor" strokeDasharray="3 4" strokeWidth="1" className="text-violet-400" />
          <line x1="50%" y1="18%" x2="78%" y2="65%" stroke="currentColor" strokeDasharray="3 4" strokeWidth="1" className="text-violet-400" />
        </svg>

        {/* Top Floating Constellation Micro-Cards (matching reference image) */}
        <div className="relative w-full max-w-5xl mx-auto hidden lg:block pointer-events-none mb-4">
          {/* Top Left: AI Shorts */}
          <div className="absolute -top-4 left-4 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-md flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs">
              <Film className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">AI Shorts & Reels</span>
              <span className="block text-[9px] text-slate-400">9:16 Ken Burns Motion</span>
            </div>
          </div>

          {/* Top Right: AI Templates */}
          <div className="absolute -top-4 right-4 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-md flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
              <Grid className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">8K Storyboard Grids</span>
              <span className="block text-[9px] text-slate-400">Precision Slicing Presets</span>
            </div>
          </div>

          {/* Mid Left: AI Captions */}
          <div className="absolute top-24 -left-12 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-md flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">Burned Captions</span>
              <span className="block text-[9px] text-slate-400">Exact Frame Timing</span>
            </div>
          </div>

          {/* Mid Right: AI Video Tools */}
          <div className="absolute top-24 -right-12 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-md flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
              <Video className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">MP4 WebCodecs</span>
              <span className="block text-[9px] text-slate-400">Zero Server Latency</span>
            </div>
          </div>
        </div>

        {/* Central Brand Emblem Tile (matching the reference image center logo) */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 flex items-center justify-center mb-6 sm:mb-8 group transition-transform hover:scale-105">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl sm:text-3xl shadow-sm">
              V
            </div>
          </div>

          {/* Main Headline (Exact typography structure from reference image) */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12] mb-4 text-balance">
            World’s First AI-Powered <br />
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Social Media & Storyboard Co-Pilot
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-6">
            Precision AI that slices images, storyboards, and animates motion graphic videos all in one place. 10x Growth. Automated.
          </p>

          {/* Social Proof: 4M+ Trusted Users (matching reference screenshot) */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex -space-x-2 overflow-hidden">
              <img
                className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Creator avatar"
              />
              <img
                className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                alt="Creator avatar"
              />
              <img
                className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
                alt="Creator avatar"
              />
              <img
                className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
                alt="Creator avatar"
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              4M+ trusted creators
            </span>
          </div>

          {/* Primary Call-to-Action: Purple "Get Started for Free" button */}
          <div className="flex flex-col items-center gap-2.5 mb-12 sm:mb-16">
            <button
              type="button"
              onClick={onGetStarted}
              className="px-8 py-3.5 sm:px-10 sm:py-4 rounded-xl text-sm sm:text-base font-bold text-white bg-violet-600 hover:bg-violet-500 shadow-xl shadow-violet-600/30 active:scale-[0.98] transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <span>Get Started for Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              No credit card required · 100% local in your browser
            </span>
          </div>

          {/* Floating Platform 3D Badges (YouTube, TikTok, Instagram, LinkedIn, X from reference image) */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap mb-12 sm:mb-16">
            {/* YouTube */}
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center hover:-translate-y-1 transition-transform">
              <span className="w-6 h-4 bg-red-600 rounded-sm flex items-center justify-center text-white text-[9px] font-bold">
                ▶
              </span>
            </div>
            {/* TikTok */}
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center hover:-translate-y-1 transition-transform">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                ♪
              </span>
            </div>
            {/* Instagram */}
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center hover:-translate-y-1 transition-transform">
              <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white text-[10px]">
                ◎
              </div>
            </div>
            {/* LinkedIn */}
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center hover:-translate-y-1 transition-transform">
              <span className="text-xs font-bold text-blue-600">
                in
              </span>
            </div>
            {/* X */}
            <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center hover:-translate-y-1 transition-transform">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                𝕏
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FEATURE SHOWCASE (Two Distinct Hubs: Slicer & Motion Video)
          ========================================================================= */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto w-full border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold tracking-wider text-violet-600 dark:text-violet-400 uppercase">
            CREATIVE ARCHITECTURE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4 tracking-tight">
            Two High-Performance Studios. One Unified Workflow.
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            From precision storyboard image grids to cinematic social video slideshows with Ken Burns motion, all running 100% in your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Studio 1: Storyboard Slicer */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                <Scissors className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Storyboard & Panel Slicer Studio
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Slice high-resolution art, storyboards, comics, and panoramas into exact Instagram carousels, 3×3 mosaics, and custom pixel cuts with 8K Ultra-HD enhancement.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Auto border detection & smart layout suggestions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Draggable custom vertical and horizontal cut lines</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>8K Studio Master sharpening & lossless ZIP/PDF export</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onOpenSlicer}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-slate-900 dark:bg-violet-600 hover:bg-slate-800 dark:hover:bg-violet-500 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Launch Storyboard Slicer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Studio 2: Motion Graphic Video Studio */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Motion Graphic Video Studio
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Upload multiple photos, storyboard slices, or video clips to create motion graphic slideshows with Ken Burns zoom effects, smooth transitions, captions, and music.
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Multi-image & video clip batch upload</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Ken Burns pan, zoom, slide transitions & audio soundtrack</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instant client-side MP4 export via WebCodecs</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onOpenVideoStudio}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Launch Motion Video Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ SECTION
          ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Everything you need to know about browser-based precision slicing & motion video generation.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between font-medium text-sm sm:text-base text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-90 text-violet-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          FOOTER (Strictly: VistaroAI by SOLITA SOLUTIONS in footer)
          ========================================================================= */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
};
