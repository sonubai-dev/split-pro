import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bot,
  Check,
  Copy,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Activity,
  Layers,
  ChevronRight,
  ExternalLink,
  Code,
  FileText,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import {
  getAgentState,
  subscribeAgentState,
  setAgentPaused,
  setToolEnabled,
  clearActivityLogs,
  generateAgentPrompt,
  generateToolsJson,
  AGENT_TOOLS,
} from '../agent/tools';
import { AgentAccessState, ToolName } from '../agent/types';

interface AgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const AgentDrawer: React.FC<AgentDrawerProps> = ({
  isOpen,
  onClose,
  onToast,
}) => {
  const [state, setState] = useState<AgentAccessState>(getAgentState);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Subscribe to agent state changes
  useEffect(() => {
    return subscribeAgentState((newState) => {
      setState(newState);
    });
  }, []);

  // Check if WebMCP is detected
  const isWebMcpAvailable =
    typeof navigator !== 'undefined' &&
    'modelContext' in navigator &&
    Boolean((navigator as any).modelContext);

  // Keyboard accessibility: ESC to close & focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Simple focus trap inside modal
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus close button on mount
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    try {
      const prompt = generateAgentPrompt();
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      onToast('Copied Prompt', 'Agent instruction prompt copied to clipboard.', 'success');
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (e) {
      onToast('Copy Failed', 'Please grant clipboard permissions.', 'error');
    }
  };

  const handleCopyJson = async () => {
    try {
      const json = generateToolsJson();
      await navigator.clipboard.writeText(json);
      setCopiedJson(true);
      onToast('Copied Tools JSON', 'WebMCP tools schema JSON copied to clipboard.', 'success');
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (e) {
      onToast('Copy Failed', 'Please grant clipboard permissions.', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity duration-200"
      aria-modal="true"
      role="dialog"
      aria-label="Agent Access Control Panel"
      onClick={onClose}
    >
      {/* Drawer Container: bottom sheet on mobile (max-h-[80vh]), side-drawer on desktop */}
      <div
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[80vh] sm:max-h-full sm:w-[440px] bg-white dark:bg-[#111827] text-gray-800 dark:text-[#E5E7EB] border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-[#1F2937] shadow-2xl flex flex-col self-end sm:self-auto rounded-t-2xl sm:rounded-none overflow-hidden transition-all duration-300"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1F2937] flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-[#151D2C]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-mono font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white uppercase font-mono">
                  AGENT ACCESS
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  WEBMCP
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                AI Agent Bridge & Tool Registry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pause Agent Switch */}
            <button
              type="button"
              onClick={() => setAgentPaused(!state.isPaused)}
              aria-label={state.isPaused ? 'Resume Agent' : 'Pause Agent'}
              className={`min-h-[44px] px-2.5 py-1.5 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 border transition-all ${
                state.isPaused
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}
              title={state.isPaused ? 'Agent calls are blocked' : 'Agent calls are allowed'}
            >
              {state.isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              )}
            </button>

            {/* Close Button with >=44px tap target */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close Agent Access Drawer"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1F2937] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* SECTION A: Status Chip */}
          <div className="p-3.5 rounded-xl border border-gray-200 dark:border-[#1F2937] bg-gray-50 dark:bg-[#131B2B] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    state.isPaused
                      ? 'bg-amber-400'
                      : isWebMcpAvailable
                      ? 'bg-blue-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    state.isPaused
                      ? 'bg-amber-500'
                      : isWebMcpAvailable
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </span>
              <div>
                <span className="text-xs font-mono font-semibold text-gray-900 dark:text-white block">
                  {state.isPaused
                    ? 'Agent Paused'
                    : isWebMcpAvailable
                    ? 'Agent ready (WebMCP)'
                    : 'Agent ready'}
                </span>
                <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                  {isWebMcpAvailable
                    ? 'navigator.modelContext active'
                    : 'WebMCP not detected (window.VistaroAI active)'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200 dark:bg-[#1F2937] text-gray-700 dark:text-gray-300">
                {Object.values(state.toolToggles).filter(Boolean).length}/{AGENT_TOOLS.length} TOOLS
              </span>
            </div>
          </div>

          {/* SECTION B: Two Compact Columns: "Agent can" and "You do" */}
          <div className="rounded-xl border border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#0D131F] overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-[#1F2937] bg-gray-50 dark:bg-[#151D2C] flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                AUTOMATED VS MANUAL ACCESS
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-[#1F2937] text-xs p-3 gap-2">
              {/* Agent can */}
              <div className="space-y-1.5 pr-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 block">
                  AGENT CAN
                </span>
                <ul className="space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Load clipboard / URL image</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Choose split layout & grid</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Adjust spacing, sequence, 8K</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Preview, rename & reorder</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Set video storyboard & motion</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Request ZIP / video export</span>
                  </li>
                </ul>
              </div>

              {/* You do */}
              <div className="space-y-1.5 pl-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 block">
                  YOU DO
                </span>
                <ul className="space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    <span>Local file selection from device</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    <span>Final download gesture approval</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    <span>Clearing export history</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    <span>Theme toggle & reset control</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* SECTION C: Tool List with One-Line Description and On/Off Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                TOOLS REGISTRY ({AGENT_TOOLS.length})
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                Toggle to enable/disable
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-[#1F2937] divide-y divide-gray-200 dark:divide-[#1F2937] overflow-hidden bg-white dark:bg-[#0D131F]">
              {AGENT_TOOLS.map((tool) => {
                const isEnabled = state.toolToggles[tool.name] !== false;
                return (
                  <div
                    key={tool.name}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-[#151D2C] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {tool.name}
                        </code>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {tool.description}
                      </p>
                    </div>

                    {/* Toggle button with 44px min tap target */}
                    <button
                      type="button"
                      onClick={() => setToolEnabled(tool.name, !isEnabled)}
                      aria-label={`Toggle tool ${tool.name}`}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-mono transition-colors ${
                        isEnabled
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    >
                      {isEnabled ? (
                        <ToggleRight className="w-7 h-7" />
                      ) : (
                        <ToggleLeft className="w-7 h-7" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION D: Live Activity Log (Last 20 tool calls) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  LIVE ACTIVITY LOG
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  ({state.logs.length}/20)
                </span>
              </div>
              {state.logs.length > 0 && (
                <button
                  type="button"
                  onClick={clearActivityLogs}
                  aria-label="Clear activity logs"
                  className="min-h-[44px] px-2 text-[11px] font-mono text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-[#1F2937] bg-gray-50 dark:bg-[#0A0E17] p-3 max-h-56 overflow-y-auto space-y-2 font-mono text-xs">
              {state.logs.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">
                  No tool calls yet. AI agent actions will stream here live.
                </div>
              ) : (
                state.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] flex items-start gap-2.5 text-[11px]"
                  >
                    {/* Result dot: green or red */}
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                        log.ok ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                      title={log.ok ? 'Tool execution succeeded' : 'Tool execution failed'}
                    />

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {log.tool}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {log.time}
                        </span>
                      </div>

                      {log.args && Object.keys(log.args).length > 0 && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          args: {JSON.stringify(log.args)}
                        </div>
                      )}

                      <div
                        className={`text-[10px] truncate ${
                          log.ok
                            ? 'text-gray-600 dark:text-gray-300'
                            : 'text-red-600 dark:text-red-400 font-medium'
                        }`}
                      >
                        {log.message || log.error}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION E & F: Copy Agent Prompt & Copy Tools JSON Buttons */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-[#1F2937]">
            {/* Copy Agent Prompt button */}
            <button
              type="button"
              onClick={handleCopyPrompt}
              aria-label="Copy Agent Prompt"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Prompt Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Agent Prompt (for Claude / ChatGPT)</span>
                </>
              )}
            </button>

            {/* Copy tools JSON button */}
            <button
              type="button"
              onClick={handleCopyJson}
              aria-label="Copy tools JSON"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1F2937] hover:bg-gray-200 dark:hover:bg-[#374151] border border-gray-300 dark:border-[#374151] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {copiedJson ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Tools Schema JSON Copied!</span>
                </>
              ) : (
                <>
                  <Code className="w-4 h-4" />
                  <span>Copy Tools JSON</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
