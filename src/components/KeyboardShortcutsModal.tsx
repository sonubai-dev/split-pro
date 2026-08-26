import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Ctrl', 'O'], desc: 'Upload new image' },
  { keys: ['Ctrl', 'Z'], desc: 'Undo split settings' },
  { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo split settings' },
  { keys: ['Ctrl', 'S'], desc: 'Export / Download ZIP' },
  { keys: ['+'], desc: 'Zoom in canvas' },
  { keys: ['-'], desc: 'Zoom out canvas' },
  { keys: ['0'], desc: 'Fit image to screen' },
  { keys: ['Delete'], desc: 'Delete selected custom split line' },
  { keys: ['Space + Drag'], desc: 'Pan viewport' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-[#0A0A0B]/85 backdrop-blur-md">
      <div className="w-full max-w-md p-6 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] text-gray-700 dark:text-gray-200 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white uppercase tracking-wider font-mono">KEYBOARD SHORTCUTS</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2937] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-2.5 rounded bg-gray-50 dark:bg-[#0A0A0B] border border-gray-200 dark:border-[#1F2937] text-xs"
            >
              <span className="text-gray-700 dark:text-gray-300">{item.desc}</span>
              <div className="flex items-center gap-1">
                {item.keys.map((k, kIdx) => (
                  <kbd
                    key={kIdx}
                    className="px-2 py-0.5 rounded bg-white dark:bg-[#111827] text-gray-800 dark:text-gray-200 font-mono text-[10px] border border-gray-300 dark:border-[#374151] shadow-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded text-xs font-medium bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-[#374151] transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
