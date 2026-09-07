import React, { useState } from 'react';
import {
  Grid,
  Columns,
  Rows,
  Sliders,
  Sparkles,
  RefreshCw,
  Trash2,
  Plus,
  FileText,
  SlidersHorizontal,
  ArrowDownUp,
  LayoutGrid,
  Check,
  Info,
  Layers,
} from 'lucide-react';
import {
  EditorSettings,
  LoadedImage,
  OutputFormat,
  PanelOrder,
  SmartSuggestion,
  SplitMode,
} from '../types';
import { CREATOR_PRESETS } from '../lib/presets';
import { calculateAutoSplitGrid, detectPictureBorders, formatBytes } from '../lib/imageEngine';

interface ControlPanelProps {
  image: LoadedImage;
  batchCount?: number;
  settings: EditorSettings;
  smartSuggestions: SmartSuggestion[];
  sliceCount: number;
  isGenerating: boolean;
  onUpdateSettings: (updater: Partial<EditorSettings> | ((prev: EditorSettings) => EditorSettings)) => void;
  onGenerate: () => void;
  onReplaceImage: () => void;
  onRemoveImage: () => void;
  onToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const AUTO_PARTS_PRESETS = [1, 10, 20];

const GRID_PRESETS = [
  { r: 1, c: 2, label: '1 × 2' },
  { r: 1, c: 3, label: '1 × 3' },
  { r: 2, c: 2, label: '2 × 2' },
  { r: 2, c: 3, label: '2 × 3' },
  { r: 3, c: 3, label: '3 × 3' },
  { r: 3, c: 4, label: '3 × 4' },
  { r: 4, c: 4, label: '4 × 4' },
];

const VERTICAL_PRESETS = [2, 3, 4, 5, 6, 8, 10];
const HORIZONTAL_PRESETS = [2, 3, 4, 5, 6, 8, 10];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  image,
  batchCount,
  settings,
  smartSuggestions,
  sliceCount,
  isGenerating,
  onUpdateSettings,
  onGenerate,
  onReplaceImage,
  onRemoveImage,
  onToast,
}) => {
  const [showPresetsDrawer, setShowPresetsDrawer] = useState(false);
  const [detectSensitivity, setDetectSensitivity] = useState<number>(10);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  const handleRunBorderDetection = (sens: number = detectSensitivity) => {
    setIsDetecting(true);
    setTimeout(() => {
      try {
        const { vLines, hLines, detectedCount } = detectPictureBorders(image, sens);
        if (vLines.length > 0 || hLines.length > 0) {
          onUpdateSettings({
            splitMode: 'custom',
            customVLines: vLines,
            customHLines: hLines,
          });
          onToast?.(
            'Borders Detected',
            `Found ${vLines.length} vertical and ${hLines.length} horizontal borders (${detectedCount} panels).`,
            'success'
          );
        } else {
          // If no high-contrast line borders, set auto split parts to sensitivity preset (1, 10, or 20)
          const targetParts = sens <= 1 ? 1 : sens >= 20 ? 20 : 10;
          onUpdateSettings({
            splitMode: 'auto',
            autoPartsCount: targetParts,
          });
          onToast?.(
            'Border Detection Complete',
            `Applied ${targetParts === 1 ? '1 full frame' : `${targetParts} auto panels`} across image.`,
            'info'
          );
        }
      } catch (err) {
        console.error('Border detection error:', err);
      } finally {
        setIsDetecting(false);
      }
    }, 50);
  };

  const handleModeChange = (mode: SplitMode) => {
    onUpdateSettings((prev) => {
      // If switching to custom and no lines exist, seed with 1 vertical and 1 horizontal
      let vLines = prev.customVLines;
      let hLines = prev.customHLines;
      if (mode === 'custom' && vLines.length === 0 && hLines.length === 0) {
        vLines = [Math.round(image.width * 0.5)];
        hLines = [Math.round(image.height * 0.5)];
      }
      return {
        ...prev,
        splitMode: mode,
        customVLines: vLines,
        customHLines: hLines,
      };
    });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-white dark:bg-[#0D1117] border-r border-gray-200 dark:border-[#1F2937] overflow-y-auto text-gray-800 dark:text-[#E5E7EB] select-none transition-colors">
      <div className="p-4 space-y-5">
        {/* Section 1: Source Image Information Card */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold block">
                  Source Image
                </span>
                {batchCount && batchCount > 1 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono">
                    Batch ({batchCount})
                  </span>
                )}
              </div>
              <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate" title={image.name}>
                {image.name}
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300 font-mono mt-0.5">
                <span>{image.width} × {image.height} px</span>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>{formatBytes(image.size)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onReplaceImage}
                className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#374151] transition-colors"
                title="Replace Image"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRemoveImage}
                className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-[#374151] transition-colors"
                title="Remove Image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {batchCount && batchCount > 1 && (
            <p className="mt-2 pt-2 border-t border-gray-200 dark:border-[#374151] text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              ⚡ Settings apply to all {batchCount} images in batch.
            </p>
          )}
        </div>

        {/* Section 2: Smart Suggestions Banner */}
        {smartSuggestions.length > 0 && (
          <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-[#111827] border border-blue-200 dark:border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <Sparkles className="w-3.5 h-3.5" />
                Recommendations
              </span>
              <button
                type="button"
                onClick={() => setShowPresetsDrawer((v) => !v)}
                className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline font-mono"
              >
                {showPresetsDrawer ? 'Hide' : 'Presets'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {smartSuggestions.slice(0, 3).map((sug) => (
                <button
                  key={sug.id}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      splitMode: sug.mode,
                      rows: sug.rows,
                      columns: sug.columns,
                      verticalCount: sug.columns,
                      horizontalCount: sug.rows,
                    });
                  }}
                  className="px-2.5 py-1 rounded text-xs font-mono bg-white dark:bg-[#1F2937] hover:bg-blue-50 dark:hover:bg-[#374151] text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-[#374151] hover:border-blue-500 transition-colors truncate"
                  title={sug.description}
                >
                  {sug.title}
                </button>
              ))}
            </div>

            {/* Expanded Creator Presets List */}
            {showPresetsDrawer && (
              <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-[#374151] space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest block mb-1">
                  Preset Templates
                </span>
                <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {CREATOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        onUpdateSettings(preset.settings);
                        setShowPresetsDrawer(false);
                      }}
                      className="text-left p-2 rounded bg-white dark:bg-[#1F2937] hover:bg-gray-100 dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 text-xs flex items-center justify-between group transition-colors border border-gray-200 dark:border-[#374151]"
                    >
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{preset.name}</div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{preset.description}</div>
                      </div>
                      <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Split Mode Segmented Control */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold block mb-2">
            Split Mode
          </label>
          <div className="grid grid-cols-5 gap-1 p-1 rounded-md bg-gray-100 dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937]">
            <button
              type="button"
              onClick={() => handleModeChange('auto')}
              className={`py-1.5 px-1.5 rounded text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                settings.splitMode === 'auto'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Auto</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('grid')}
              className={`py-1.5 px-1.5 rounded text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                settings.splitMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Grid</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('vertical')}
              className={`py-1.5 px-1.5 rounded text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                settings.splitMode === 'vertical'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span>Vertical</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('horizontal')}
              className={`py-1.5 px-1.5 rounded text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                settings.splitMode === 'horizontal'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Rows className="w-4 h-4" />
              <span>Horizontal</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('custom')}
              className={`py-1.5 px-1.5 rounded text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                settings.splitMode === 'custom'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Custom</span>
            </button>
          </div>
        </div>

        {/* Section 4: Mode Dynamic Parameters */}
        {settings.splitMode === 'auto' && (
          <div className="space-y-3.5 p-3 rounded-lg bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151]">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold block">
                  Auto Border Detect & Presets
                </span>
                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                  {settings.autoPartsCount === 1 ? '1 Full Image' : `${settings.autoPartsCount || 10} Panels`}
                </span>
              </div>

              {/* 1 - 10 - 20 & Auto Detect Action Buttons */}
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ autoPartsCount: 1 })}
                  className={`py-2 text-xs font-mono rounded border transition-all flex flex-col items-center justify-center gap-0.5 ${
                    settings.autoPartsCount === 1
                      ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm'
                      : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-blue-500/50'
                  }`}
                  title="1 Part (Full Picture / Single Frame)"
                >
                  <span className="font-bold text-sm">1</span>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase">Full</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ autoPartsCount: 10 })}
                  className={`py-2 text-xs font-mono rounded border transition-all flex flex-col items-center justify-center gap-0.5 ${
                    settings.autoPartsCount === 10
                      ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm'
                      : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-blue-500/50'
                  }`}
                  title="10 Balanced Panels"
                >
                  <span className="font-bold text-sm">10</span>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase">Panels</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ autoPartsCount: 20 })}
                  className={`py-2 text-xs font-mono rounded border transition-all flex flex-col items-center justify-center gap-0.5 ${
                    settings.autoPartsCount === 20
                      ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm'
                      : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-blue-500/50'
                  }`}
                  title="20 Balanced Panels"
                >
                  <span className="font-bold text-sm">20</span>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase">Panels</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunBorderDetection(detectSensitivity)}
                  disabled={isDetecting}
                  className="py-2 px-1 text-xs font-semibold rounded border border-blue-500/50 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all flex flex-col items-center justify-center gap-0.5 shadow-sm active:scale-[0.98] disabled:opacity-50"
                  title="Scan picture pixels for natural borders, gutters, frames and comic dividers"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isDetecting ? 'animate-spin' : 'animate-pulse'}`} />
                  <span className="text-[9px] font-bold uppercase tracking-tight">
                    {isDetecting ? 'Scanning...' : 'Detect'}
                  </span>
                </button>
              </div>

              {/* Automatic Border Detection Sensitivity Bar (1 - 10 - 20) */}
              <div className="pt-2 border-t border-gray-200 dark:border-[#374151]/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Border Sensitivity (1–20):</span>
                  <div className="flex items-center gap-1">
                    {[1, 10, 20].map((sens) => (
                      <button
                        key={sens}
                        type="button"
                        onClick={() => {
                          setDetectSensitivity(sens);
                          handleRunBorderDetection(sens);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-all ${
                          detectSensitivity === sens
                            ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-xs'
                            : 'bg-white dark:bg-[#111827] text-gray-600 dark:text-gray-400 border-gray-300 dark:border-[#374151] hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {sens === 1 ? '1 Coarse' : sens === 10 ? '10 Balanced' : '20 Fine'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={detectSensitivity}
                    onChange={(e) => setDetectSensitivity(parseInt(e.target.value, 10) || 10)}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 w-6 text-right">
                    {detectSensitivity}
                  </span>
                </div>
              </div>
            </div>

            {/* Calculated Auto Layout Breakdown */}
            {(() => {
              const autoGrid = calculateAutoSplitGrid(
                image.width,
                image.height,
                settings.autoPartsCount || 10,
                settings.autoOrientation || 'balanced'
              );
              const approxW = Math.round(image.width / autoGrid.cols);
              const approxH = Math.round(image.height / autoGrid.rows);

              return (
                <div className="pt-2.5 border-t border-gray-200 dark:border-[#374151] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Intelligent Grid:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {autoGrid.rows} {autoGrid.rows === 1 ? 'row' : 'rows'} × {autoGrid.cols} {autoGrid.cols === 1 ? 'col' : 'cols'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>Panel Dimensions:</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      ≈ {approxW} × {approxH} px
                    </span>
                  </div>

                  {/* Orientation options */}
                  <div className="pt-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold block mb-1.5">
                      Grid Distribution
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'balanced', label: 'Balanced' },
                        { id: 'vertical', label: 'Columns' },
                        { id: 'horizontal', label: 'Rows' },
                      ].map((arr) => (
                        <button
                          key={arr.id}
                          type="button"
                          onClick={() => onUpdateSettings({ autoOrientation: arr.id as any })}
                          className={`py-1 text-[11px] font-medium rounded border transition-all ${
                            (settings.autoOrientation || 'balanced') === arr.id
                              ? 'bg-blue-600/10 dark:bg-blue-600/40 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-500/80 font-semibold'
                              : 'bg-white dark:bg-[#111827] text-gray-600 dark:text-gray-400 border-gray-300 dark:border-[#374151] hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          {arr.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {settings.splitMode === 'grid' && (
          <div className="space-y-3.5 p-3 rounded-lg bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151]">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold block mb-2">
                Grid Matrix Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {GRID_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onUpdateSettings({ rows: p.r, columns: p.c })}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-all ${
                      settings.rows === p.r && settings.columns === p.c
                        ? 'bg-blue-600 text-white border-blue-500 font-bold'
                        : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-blue-500/50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Rows / Cols inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Rows</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {settings.rows}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={settings.rows}
                  onChange={(e) => onUpdateSettings({ rows: parseInt(e.target.value, 10) || 1 })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Columns</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {settings.columns}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={settings.columns}
                  onChange={(e) => onUpdateSettings({ columns: parseInt(e.target.value, 10) || 1 })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-[#374151]">
              <span>Calculated Output:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {settings.rows * settings.columns} Panels
              </span>
            </div>
          </div>
        )}

        {settings.splitMode === 'vertical' && (
          <div className="space-y-3.5 p-3 rounded-lg bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151]">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold block mb-2">
                Column Slices
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VERTICAL_PRESETS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onUpdateSettings({ verticalCount: count })}
                    className={`px-3 py-1 text-xs font-mono rounded border transition-all ${
                      settings.verticalCount === count
                        ? 'bg-blue-600 text-white border-blue-500 font-bold'
                        : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-blue-500/50'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Total Columns</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {settings.verticalCount}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                value={settings.verticalCount}
                onChange={(e) =>
                  onUpdateSettings({ verticalCount: parseInt(e.target.value, 10) || 2 })
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {settings.splitMode === 'horizontal' && (
          <div className="space-y-3.5 p-3 rounded-lg bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151]">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold block mb-2">
                Row Slices
              </span>
              <div className="flex flex-wrap gap-1.5">
                {HORIZONTAL_PRESETS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onUpdateSettings({ horizontalCount: count })}
                    className={`px-3 py-1 text-xs font-mono rounded border transition-all ${
                      settings.horizontalCount === count
                        ? 'bg-blue-600 text-white border-blue-500 font-bold'
                        : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#374151] hover:border-blue-500/50'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Total Rows</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {settings.horizontalCount}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                value={settings.horizontalCount}
                onChange={(e) =>
                  onUpdateSettings({ horizontalCount: parseInt(e.target.value, 10) || 2 })
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {settings.splitMode === 'custom' && (
          <div className="space-y-3 p-3 rounded-lg bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                Custom Dividers
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    customVLines: [Math.round(image.width * 0.5)],
                    customHLines: [Math.round(image.height * 0.5)],
                  })
                }
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-mono"
              >
                Reset Center
              </button>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Drag lines directly on canvas or calibrate coordinates:
            </p>

            {/* Vertical Lines List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-gray-600 dark:text-gray-400">
                <span>Vertical Lines ({settings.customVLines.length})</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      customVLines: [...prev.customVLines, Math.round(image.width / 2)].sort(
                        (a, b) => a - b
                      ),
                    }))
                  }
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-[10px]"
                >
                  <Plus className="w-3 h-3" /> ADD
                </button>
              </div>

              {settings.customVLines.map((pos, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">X:</span>
                  <input
                    type="number"
                    min={1}
                    max={image.width - 1}
                    value={pos}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(image.width - 1, parseInt(e.target.value, 10) || 1));
                      onUpdateSettings((prev) => {
                        const copy = [...prev.customVLines];
                        copy[idx] = val;
                        return { ...prev, customVLines: copy };
                      });
                    }}
                    className="flex-1 px-2 py-1 text-xs font-mono rounded bg-white dark:bg-[#111827] border border-gray-300 dark:border-[#374151] text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                  />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    {Math.round((pos / image.width) * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => {
                        const copy = [...prev.customVLines];
                        copy.splice(idx, 1);
                        return { ...prev, customVLines: copy };
                      })
                    }
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Horizontal Lines List */}
            <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-[#374151]">
              <div className="flex items-center justify-between text-[11px] font-medium text-gray-600 dark:text-gray-400">
                <span>Horizontal Lines ({settings.customHLines.length})</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      customHLines: [...prev.customHLines, Math.round(image.height / 2)].sort(
                        (a, b) => a - b
                      ),
                    }))
                  }
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-[10px]"
                >
                  <Plus className="w-3 h-3" /> ADD
                </button>
              </div>

              {settings.customHLines.map((pos, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">Y:</span>
                  <input
                    type="number"
                    min={1}
                    max={image.height - 1}
                    value={pos}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(image.height - 1, parseInt(e.target.value, 10) || 1));
                      onUpdateSettings((prev) => {
                        const copy = [...prev.customHLines];
                        copy[idx] = val;
                        return { ...prev, customHLines: copy };
                      });
                    }}
                    className="flex-1 px-2 py-1 text-xs font-mono rounded bg-white dark:bg-[#111827] border border-gray-300 dark:border-[#374151] text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                  />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    {Math.round((pos / image.height) * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => {
                        const copy = [...prev.customHLines];
                        copy.splice(idx, 1);
                        return { ...prev, customHLines: copy };
                      })
                    }
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Spacing (Outer Margin, Horizontal Gap, Vertical Gap) 0-500px */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold block">
              Spacing & Margins
            </label>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">0–500 px</span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-400">Outer Margin</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">
                {settings.outerMargin} px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={500}
              value={settings.outerMargin}
              onChange={(e) => onUpdateSettings({ outerMargin: parseInt(e.target.value, 10) || 0 })}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Horizontal Gap</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {settings.horizontalGap} px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={500}
                value={settings.horizontalGap}
                onChange={(e) =>
                  onUpdateSettings({ horizontalGap: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Vertical Gap</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {settings.verticalGap} px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={500}
                value={settings.verticalGap}
                onChange={(e) =>
                  onUpdateSettings({ verticalGap: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Gap Mode switch: Source splitting vs Output Spacing */}
          <div className="pt-2 border-t border-gray-200 dark:border-[#374151] flex items-center justify-between text-[11px]">
            <span className="text-gray-600 dark:text-gray-400">Gap Behavior:</span>
            <div className="flex rounded bg-gray-200 dark:bg-[#111827] p-0.5 border border-gray-300 dark:border-[#374151]">
              <button
                type="button"
                onClick={() => onUpdateSettings({ gapBehavior: 'spacing' })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  settings.gapBehavior === 'spacing'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Exact partition boundaries without discarding source pixels"
              >
                Zero-Crop
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ gapBehavior: 'skip_source' })}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  settings.gapBehavior === 'skip_source'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Discard source pixel strips between panels"
              >
                Discard Gaps
              </button>
            </div>
          </div>
        </div>

        {/* Section 6: Panel Sequence Ordering */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] space-y-2.5">
          <label className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold block">
            Panel Sequence Order
          </label>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onUpdateSettings({ panelOrder: 'row-by-row' })}
              className={`p-2 rounded text-xs font-medium border text-center transition-all ${
                settings.panelOrder === 'row-by-row'
                  ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm'
                  : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#374151]'
              }`}
              title="Left-to-right, row by row"
            >
              Row-Major
            </button>

            <button
              type="button"
              onClick={() => onUpdateSettings({ panelOrder: 'col-by-col' })}
              className={`p-2 rounded text-xs font-medium border text-center transition-all ${
                settings.panelOrder === 'col-by-col'
                  ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm'
                  : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#374151]'
              }`}
              title="Top-to-bottom, col by col"
            >
              Col-Major
            </button>

            <button
              type="button"
              onClick={() => onUpdateSettings({ panelOrder: 'snake' })}
              className={`p-2 rounded text-xs font-medium border text-center transition-all ${
                settings.panelOrder === 'snake'
                  ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm'
                  : 'bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-[#374151]'
              }`}
              title="Alternating direction (1 2 3 -> 6 5 4 -> 7 8 9)"
            >
              Snake
            </button>
          </div>
        </div>

        {/* Section 7: Output Settings */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#1F2937] border border-gray-200 dark:border-[#374151] space-y-3">
          <label className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold block">
            Output Settings
          </label>

          {/* Format Picker */}
          <div>
            <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Format</span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded bg-gray-100 dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937]">
              {(['png', 'jpeg', 'webp'] as OutputFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => onUpdateSettings({ outputFormat: fmt })}
                  className={`py-1 text-xs font-semibold uppercase rounded transition-all ${
                    settings.outputFormat === fmt
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {fmt === 'jpeg' ? 'JPG' : fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Slider for JPG / WebP */}
          {settings.outputFormat !== 'png' ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Quality Compression</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {settings.quality}%
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={settings.quality}
                onChange={(e) => onUpdateSettings({ quality: parseInt(e.target.value, 10) || 95 })}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <Check className="w-3.5 h-3.5" /> 100% Lossless Raw Pixels
            </div>
          )}

          {/* Resolution Mode: 4K Ultra HD vs 2K vs Original vs Custom */}
          <div className="pt-2 border-t border-gray-200 dark:border-[#374151] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-gray-900 dark:text-white">Export Quality & Resolution</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                4K BOOST
              </span>
            </div>

            {/* 4K Enhancement Toggle Card */}
            <div className="p-2.5 rounded bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.enhanceTo4K || settings.resolutionMode === '4k'}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      onUpdateSettings({
                        enhanceTo4K: enabled,
                        resolutionMode: enabled ? '4k' : 'original',
                        sharpnessBoost: enabled,
                        quality: enabled ? 100 : settings.quality,
                      });
                    }}
                    className="rounded border-amber-500 text-amber-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Auto 4K Ultra-HD Enhancement</span>
                </label>
                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-bold">
                  {(settings.enhanceTo4K || settings.resolutionMode === '4k') ? '3840px Max' : 'OFF'}
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                Automatically elevates uploaded images up to 4K Ultra HD on export with crystal-clear sharpness.
              </p>
            </div>

            {/* Resolution Selector Buttons */}
            <div className="grid grid-cols-4 gap-1 p-0.5 rounded bg-gray-200 dark:bg-[#111827] border border-gray-300 dark:border-[#374151]">
              <button
                type="button"
                onClick={() => onUpdateSettings({ resolutionMode: '4k', enhanceTo4K: true, sharpnessBoost: true })}
                className={`py-1 text-[11px] font-mono font-bold rounded transition-colors ${
                  settings.resolutionMode === '4k' || settings.enhanceTo4K
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Scale image up to 4K Ultra-HD (3840px)"
              >
                4K UHD
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ resolutionMode: '2k', enhanceTo4K: false, sharpnessBoost: true })}
                className={`py-1 text-[11px] font-mono font-bold rounded transition-colors ${
                  settings.resolutionMode === '2k' && !settings.enhanceTo4K
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Scale image up to 2K QHD (2560px)"
              >
                2K QHD
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ resolutionMode: 'original', enhanceTo4K: false, customScalePercent: 100 })}
                className={`py-1 text-[11px] font-mono font-bold rounded transition-colors ${
                  settings.resolutionMode === 'original' && !settings.enhanceTo4K
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Keep original raw resolution (1:1)"
              >
                1:1 Native
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ resolutionMode: 'custom', enhanceTo4K: false })}
                className={`py-1 text-[11px] font-mono font-bold rounded transition-colors ${
                  settings.resolutionMode === 'custom' && !settings.enhanceTo4K
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Custom scaling percentage"
              >
                Custom
              </button>
            </div>

            {/* Custom Scale Slider if custom selected */}
            {settings.resolutionMode === 'custom' && !settings.enhanceTo4K && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Custom Scale Factor</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {settings.customScalePercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={300}
                  step={5}
                  value={settings.customScalePercent}
                  onChange={(e) =>
                    onUpdateSettings({ customScalePercent: parseInt(e.target.value, 10) || 100 })
                  }
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            )}

            {/* Detail Sharpening Toggle */}
            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={settings.sharpnessBoost !== false}
                onChange={(e) => onUpdateSettings({ sharpnessBoost: e.target.checked })}
                className="rounded border-gray-300 dark:border-[#374151] text-blue-600 focus:ring-0"
              />
              <span>Smart Detail & Edge Sharpening (prevents upscaling blur)</span>
            </label>

            {/* Calculated Output Dimension Status */}
            {(() => {
              const maxDim = Math.max(image.width, image.height);
              let mult = 1.0;
              let label = 'Native 1:1';
              let badgeColor = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/40';

              if (settings.enhanceTo4K || settings.resolutionMode === '4k') {
                mult = maxDim < 3840 ? (3840 / maxDim) : 1.0;
                label = maxDim < 3840 ? `4K Enhanced (${(mult).toFixed(1)}× Upscale)` : 'Native 4K+ Lossless';
                badgeColor = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/40';
              } else if (settings.resolutionMode === '2k') {
                mult = maxDim < 2560 ? (2560 / maxDim) : 1.0;
                label = maxDim < 2560 ? `2K Enhanced (${(mult).toFixed(1)}×)` : 'Native 2K+ Lossless';
                badgeColor = 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/40';
              } else if (settings.resolutionMode === 'custom') {
                mult = (settings.customScalePercent || 100) / 100;
                label = `Custom (${settings.customScalePercent}%)`;
              }

              const targetW = Math.round(image.width * mult);
              const targetH = Math.round(image.height * mult);

              return (
                <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-gray-500 dark:text-gray-400">
                  <span>Export Canvas:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                    {targetW} × {targetH} px • {label}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Naming Options */}
          <div className="pt-2 border-t border-gray-200 dark:border-[#374151] space-y-2">
            <div>
              <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Filename Prefix</span>
              <input
                type="text"
                value={settings.namingPrefix}
                onChange={(e) => onUpdateSettings({ namingPrefix: e.target.value })}
                placeholder="e.g. image"
                className="w-full px-2.5 py-1.5 text-xs rounded bg-white dark:bg-[#111827] border border-gray-300 dark:border-[#374151] text-gray-900 dark:text-white focus:border-blue-500 outline-none font-mono"
              />
            </div>

            {settings.splitMode === 'grid' && (
              <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.includeGridCoordsInName}
                  onChange={(e) => onUpdateSettings({ includeGridCoordsInName: e.target.checked })}
                  className="rounded border-gray-300 dark:border-[#374151] text-blue-600 focus:ring-0"
                />
                <span>Include grid coordinates (<code className="text-blue-600 dark:text-blue-400 font-mono text-[10px]">_r01_c01</code>)</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Primary Sticky Bottom CTA */}
      <div className="p-4 bg-gray-50 dark:bg-[#111827] border-t border-gray-200 dark:border-[#1F2937] transition-colors">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-wider bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-black" />
              <span>Generating {sliceCount} Panels...</span>
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 text-white dark:text-black" />
              <span>Generate {sliceCount} Panels</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
