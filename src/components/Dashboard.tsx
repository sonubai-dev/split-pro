import React, { useRef, useState } from 'react';
import {
  Scissors,
  Film,
  Upload,
  ArrowRight,
  Clock,
  Sparkles,
  Layers,
  FileArchive,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { Footer } from './Footer';
import { RecentExport } from '../hooks/useRecentExports';
import { getCyberpunkStoryboardSample } from '../lib/sampleArtGenerator';

interface DashboardProps {
  onOpenSlicer: () => void;
  onOpenVideoStudio: () => void;
  onImageSelected: (file: File) => void;
  onImagesSelected: (files: File[]) => void;
  onSampleSelected?: (url: string, name: string) => void;
  recentExports: RecentExport[];
  onClearRecentExports: () => void;
  onNavigate: (view: 'home' | 'dashboard' | 'slicer' | 'video') => void;
  onOpenAdminPanel?: () => void;
}

const TOP_PRESETS = [
  {
    id: 'carousel',
    title: 'Seamless Swipe Carousel',
    ratio: '4:5',
    desc: 'Panorama split into 3 continuous seamless slides for Instagram.',
    target: 'slicer' as const,
  },
  {
    id: 'grid3x3',
    title: '3×3 Profile Mosaic Grid',
    ratio: '1:1',
    desc: 'Precision 9-panel split grid for square profile feed layouts.',
    target: 'slicer' as const,
  },
  {
    id: 'reel',
    title: 'Vertical Reel & Story',
    ratio: '9:16',
    desc: 'Ken Burns pan & zoom motion video with transitions & music.',
    target: 'video' as const,
  },
  {
    id: 'widescreen',
    title: 'Widescreen Motion Video',
    ratio: '16:9',
    desc: 'Cinematic horizontal storyboard slideshow with smooth pacing.',
    target: 'video' as const,
  },
];

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenSlicer,
  onOpenVideoStudio,
  onImageSelected,
  onImagesSelected,
  onSampleSelected,
  recentExports,
  onClearRecentExports,
  onNavigate,
  onOpenAdminPanel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [targetStudio, setTargetStudio] = useState<'slicer' | 'video'>('slicer');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (targetStudio === 'video' || files.length > 1) {
        onImagesSelected(files);
        if (targetStudio === 'video') {
          onOpenVideoStudio();
        } else {
          onOpenSlicer();
        }
      } else {
        onImageSelected(files[0]);
        onOpenSlicer();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (targetStudio === 'video' || files.length > 1) {
        onImagesSelected(files);
        if (targetStudio === 'video') {
          onOpenVideoStudio();
        } else {
          onOpenSlicer();
        }
      } else {
        onImageSelected(files[0]);
        onOpenSlicer();
      }
    }
  };

  const handleLoadDemoSample = () => {
    const sample = getCyberpunkStoryboardSample();
    if (onSampleSelected) {
      onSampleSelected(sample.url, sample.name);
    } else {
      onOpenSlicer();
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/jpg, image/avif"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono tracking-wider text-[#E05D26] uppercase font-bold">
                CREATIVE STUDIO
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium">
                100% In-Browser Private
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              What do you want to create?
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
              Drop artwork to slice into seamless carousels, or create an animated video slideshow.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSlicer}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Scissors className="w-3.5 h-3.5 text-[#E05D26]" />
              <span>Storyboard Slicer</span>
            </button>
            <button
              type="button"
              onClick={onOpenVideoStudio}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Motion Video Studio</span>
            </button>
          </div>
        </div>

        {/* 2. Universal Dropzone (Hero Choice 1B) */}
        <section
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
            isDragging
              ? 'border-[#E05D26] bg-[#E05D26]/5 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-600'
          }`}
        >
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 mx-auto flex items-center justify-center shadow-xs">
              <Upload className="w-6 h-6 text-[#E05D26]" />
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Drag & Drop Photos or Storyboards
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports ultra-wide panoramas, comics, PNG, JPG, and WebP up to 8K resolution.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTargetStudio('slicer');
                  fileInputRef.current?.click();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#E05D26] hover:bg-[#C94E1B] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Upload to Slice Image</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetStudio('video');
                  fileInputRef.current?.click();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Upload for Motion Video</span>
              </button>
            </div>

            {/* Quick Demo Sample Action */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500">
              <span>Don't have a file ready?</span>
              <button
                type="button"
                onClick={handleLoadDemoSample}
                className="font-semibold text-[#E05D26] hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Try with Demo Artwork</span>
              </button>
            </div>
          </div>
        </section>

        {/* 3. Collapsible 3-Step Guide (Choice 3 Yes) */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 transition-colors">
          <button
            type="button"
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="w-full flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#E05D26]" />
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                How Vistaro works in 3 simple steps
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                Guide
              </span>
            </div>
            {isGuideOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200" />
            )}
          </button>

          {isGuideOpen && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <span className="w-4 h-4 rounded-full bg-[#E05D26] text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Add Your Image</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Drop any panorama, photo strip, or multi-panel art. Zero files are ever uploaded to cloud servers.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <span className="w-4 h-4 rounded-full bg-[#E05D26] text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>Pick Grid or Draw Cuts</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select 4:5 swipe carousels, 3×3 grids, or drag cut lines manually with sub-pixel snapping.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <span className="w-4 h-4 rounded-full bg-[#E05D26] text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>Export Lossless</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Download 8K ultra-clear slices packed into a clean ZIP or PDF, or animate into a full MP4 video.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* 4. Top 4 Formats (Choice 2B) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              POPULAR FORMATS
            </h2>
            <span className="text-[11px] text-slate-400">Click any format to start</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOP_PRESETS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => {
                  if (preset.target === 'video') {
                    onOpenVideoStudio();
                  } else {
                    onOpenSlicer();
                  }
                }}
                className="group rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md hover:border-[#E05D26]/60 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {preset.ratio}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#E05D26] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#E05D26] transition-colors">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {preset.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Recent Exports Section */}
        {recentExports.length > 0 ? (
          <section className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-[#E05D26]" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  RECENT EXPORTS ({recentExports.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={onClearRecentExports}
                className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recentExports.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.count} Slices
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    {item.previewThumb ? (
                      <div className="h-28 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={item.previewThumb}
                          alt={item.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-28 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6 opacity-40" />
                      </div>
                    )}

                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.filename}
                    </h4>
                  </div>

                  {item.zipBlob && (
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <a
                        href={URL.createObjectURL(item.zipBlob)}
                        download={item.filename.replace(/\.[^/.]+$/, '') + '_slices.zip'}
                        className="text-xs font-semibold text-[#E05D26] hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download ZIP</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="border-t border-slate-200 dark:border-slate-800 pt-8 text-center py-6">
            <p className="text-xs text-slate-400">
              No recent exports yet. Drop any photo above to start your first project!
            </p>
          </section>
        )}
      </main>

      {/* Footer strictly with "VistaroAI by SOLITA SOLUTIONS" and Admin Control */}
      <Footer onNavigate={onNavigate} onOpenAdminPanel={onOpenAdminPanel} />
    </div>
  );
};
