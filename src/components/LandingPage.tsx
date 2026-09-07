import React, { useState, useRef } from 'react';
import {
  Upload,
  Clipboard,
  Sparkles,
  Grid,
  Zap,
  Sliders,
  FileArchive,
  ChevronRight,
  Lock,
} from 'lucide-react';

interface LandingPageProps {
  onImageSelected: (file: File) => void;
  onImagesSelected?: (files: File[]) => void;
  onSampleSelected?: (url: string, name: string) => void;
  onPasteRequested: () => void;
}

const FAQS = [
  {
    q: 'Does my image get uploaded to any server or cloud database?',
    a: 'No. All image reading, canvas slicing, and ZIP packaging happens 100% locally in your browser memory using HTML5 Canvas & Web APIs. Your images never leave your computer.',
  },
  {
    q: 'Will slicing degrade my photo quality?',
    a: 'Never. Slicing draws directly from the native full-resolution source image pixels. PNG exports are 100% lossless, and JPG/WebP quality is customizable up to 100%.',
  },
  {
    q: 'Can I set custom split lines manually instead of equal grids?',
    a: 'Yes! Split Pro includes a Custom Split mode with draggable vertical and horizontal split lines, exact pixel coordinate readouts, and snap alignments.',
  },
  {
    q: 'How large of an image can I split?',
    a: 'You can split high-resolution images up to 4K, 8K, and beyond. If an image exceeds 25 megapixels, a safety dialog will give you the option to proceed in full resolution or scale for smooth browser memory.',
  },
  {
    q: 'How does ZIP export work?',
    a: 'Once you generate your panels, click "Download ZIP" to download an organized archive containing all slice panels in proper numerical order ready for social media or print.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onImageSelected,
  onImagesSelected,
  onSampleSelected,
  onPasteRequested,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'social' | 'print'>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      if (files.length > 1 && onImagesSelected) {
        onImagesSelected(files);
      } else {
        onImageSelected(files[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (files.length > 1 && onImagesSelected) {
        onImagesSelected(files);
      } else {
        onImageSelected(files[0]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0B] text-gray-800 dark:text-gray-200 transition-colors">
      {/* Top Hero Banner */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-mono font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SPLIT PRO IMAGE SLICING ENGINE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.15] mb-6">
            Split Images With <span className="text-blue-600 dark:text-blue-500">Split Pro</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
            Turn any high-resolution image into perfectly aligned panels, grids, and custom slices — directly in your browser with zero quality loss.
          </p>
        </div>

        {/* Upload Dropzone Container */}
        <div className="max-w-2xl mx-auto">
          {/* Main Upload Dropzone */}
          <div
            id="upload-dropzone-card"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl border-2 border-dashed transition-all cursor-pointer select-none text-center shadow-md ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 scale-[1.01]'
                : 'border-gray-300 dark:border-[#374151] hover:border-blue-500 bg-white dark:bg-[#111827]/80 hover:bg-gray-50 dark:hover:bg-[#111827]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/jpg, image/avif"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-[#0A0A0B] shadow-sm border border-gray-200 dark:border-[#374151] flex items-center justify-center text-blue-600 dark:text-blue-400 mb-5 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Drop image(s) here or browse
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mb-6">
              Drag & drop single or multiple images. All images will be sliced with matching settings and can be exported as a single ZIP.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="flex-1 min-w-[120px] px-4 py-2.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95"
              >
                Upload Image(s)
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPasteRequested();
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded text-sm font-medium bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-[#374151] transition-colors"
              >
                <Clipboard className="w-4 h-4" />
                <span>Paste</span>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-[#1F2937] flex items-center justify-between w-full text-xs text-gray-500 dark:text-gray-400 font-mono">
              <span>FORMATS: JPG, PNG, WEBP, AVIF • BATCH SUPPORTED</span>
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                <Lock className="w-3 h-3" /> 100% PRIVATE & LOCAL
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Steps: How It Works */}
      <section className="py-16 border-t border-gray-200 dark:border-[#1F2937] bg-gray-100/70 dark:bg-[#0D1117]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
              How Split Pro Slicing Works
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Three seamless steps from a single high-resolution image to production-ready sliced panels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center font-bold font-mono text-base mb-4">
                01
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                Drop High-Res Source
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload JPG, PNG, or WebP up to 8K resolution. Slices retain the full native pixel resolution of your original graphic.
              </p>
            </div>

            <div className="p-6 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center font-bold font-mono text-base mb-4">
                02
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                Configure Layout & Gaps
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose Grid, Vertical, Horizontal, or Custom drag-and-drop lines with precise pixel coordinates and margin controls.
              </p>
            </div>

            <div className="p-6 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center font-bold font-mono text-base mb-4">
                03
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                Export Slices & ZIP
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Preview all slices, rename or reorder as needed, and download individual files or a clean indexed ZIP archive in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
            Engineered for Creators & Designers
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Everything you need for seamless social carousels, giant photo grids, and multi-panel gallery wall prints.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] shadow-sm">
            <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2">
              Lossless Pixel Fidelity
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Never scales down to preview dimensions before exporting. Slices are rendered straight from raw bitmap coordinates.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] shadow-sm">
            <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center mb-4">
              <Sliders className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2">
              Interactive Custom Split Handles
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add manual vertical and horizontal dividers with real-time coordinate badges, snap guides, and drag controls.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] shadow-sm">
            <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center mb-4">
              <FileArchive className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2">
              Batch ZIP & Reordering
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag to resequence panels before packaging into ZIP archives with formatted naming sequences.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] shadow-sm">
            <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2">
              Smart Aspect Suggestions
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatic geometry analysis suggests ideal Instagram 3x3 grids, 5-slide carousels, or 2x2 quadrants.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] shadow-sm">
            <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2">
              100% Private & Offline Capable
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Confidential artwork, brand assets, and personal photos remain strictly on your local browser engine.
            </p>
          </div>

          <div className="p-6 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] shadow-sm">
            <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 flex items-center justify-center mb-4">
              <Grid className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-base text-gray-900 dark:text-white mb-2">
              Flexible Sequencing & Gaps
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure Row-by-Row, Column-by-Column, or Snake Zig-Zag ordering with outer margins and gap spacing.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto border-t border-gray-200 dark:border-[#1F2937]">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Everything you need to know about browser-based precision image splitting.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-lg border border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827]/70 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between font-medium text-sm sm:text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                      isOpen ? 'rotate-90 text-blue-600 dark:text-blue-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-200 dark:border-[#1F2937]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Split Pro Footer */}
      <footer
        id="app-footer"
        className="mt-16 border-t border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#0D1117] py-8 px-4 sm:px-6 transition-colors"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div id="footer-brand" className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-sm shadow-sm">
              S
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-gray-900 dark:text-white">
                Split Pro
              </span>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                High-Quality Image Slicing & Grid Tool
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Upload Image
            </button>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <button
              type="button"
              onClick={onPasteRequested}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Paste from Clipboard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
