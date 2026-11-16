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
  Code,
  FileText,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Sparkles,
  Zap,
  Globe,
  Share2,
  PlayCircle,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import {
  getAgentState,
  subscribeAgentState,
  setAgentPaused,
  setToolEnabled,
  clearActivityLogs,
  generateAgentPrompt,
  generateToolsJson,
  generateChatGPTToolsJson,
  generateClaudeToolsJson,
  generateExternalAgentScript,
  executeAgentTool,
  AGENT_TOOLS,
} from '../agent/tools';
import { AgentAccessState, ToolName } from '../agent/types';
import { getCyberpunkStoryboardSample } from '../lib/sampleArtGenerator';

interface AgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

type TabType = 'overview' | 'external' | 'simulator' | 'logs';

export const AgentDrawer: React.FC<AgentDrawerProps> = ({
  isOpen,
  onClose,
  onToast,
}) => {
  const [state, setState] = useState<AgentAccessState>(getAgentState);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  
  // Simulator state
  const [selectedTool, setSelectedTool] = useState<string>('load_image');
  const [simulatorArgs, setSimulatorArgs] = useState<string>(() => {
    const sample = getCyberpunkStoryboardSample();
    return JSON.stringify({ source: 'url', url: sample.url, name: sample.name }, null, 2);
  });
  const [isExecuting, setIsExecuting] = useState(false);
  const [simulatorOutput, setSimulatorOutput] = useState<string | null>(null);

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
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, label: string, toastTitle: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(label);
      onToast(toastTitle, `${label} copied to clipboard successfully.`, 'success');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      onToast('Copy Failed', 'Clipboard access denied by browser.', 'error');
    }
  };

  const handleToolSelectChange = (name: string) => {
    setSelectedTool(name);
    const toolDef = AGENT_TOOLS.find((t) => t.name === name);
    if (!toolDef) return;

    // Provide friendly initial template args based on tool
    if (name === 'load_image') {
      const sample = getCyberpunkStoryboardSample();
      setSimulatorArgs(JSON.stringify({ source: 'url', url: sample.url, name: sample.name }, null, 2));
    } else if (name === 'set_grid') {
      setSimulatorArgs('{\n  "rows": 3,\n  "columns": 3\n}');
    } else if (name === 'set_output') {
      setSimulatorArgs('{\n  "resolution": "8k",\n  "format": "png",\n  "sharpness": "studio8k"\n}');
    } else if (name === 'apply_video_preset') {
      setSimulatorArgs('{\n  "preset": "Instagram Reel"\n}');
    } else if (name === 'set_naming_convention') {
      setSimulatorArgs('{\n  "pattern": "{row}-{col}_{timestamp}"\n}');
    } else {
      const defaultObj: Record<string, any> = {};
      const props = toolDef.inputSchema?.properties || {};
      Object.keys(props).forEach((k) => {
        defaultObj[k] = props[k].default !== undefined ? props[k].default : props[k].type === 'number' ? 0 : '';
      });
      setSimulatorArgs(JSON.stringify(defaultObj, null, 2));
    }
  };

  const handleRunSimulator = async () => {
    setIsExecuting(true);
    setSimulatorOutput(null);
    try {
      let parsedArgs: any = {};
      if (simulatorArgs.trim()) {
        parsedArgs = JSON.parse(simulatorArgs);
      }
      const res = await executeAgentTool(selectedTool, parsedArgs);
      setSimulatorOutput(JSON.stringify(res, null, 2));
      if (res.ok) {
        onToast('Agent Tool Success', res.message || `${selectedTool} executed.`, 'success');
      } else {
        onToast('Agent Tool Warning', res.error || 'Check parameters.', 'warning');
      }
    } catch (err: any) {
      setSimulatorOutput(JSON.stringify({ ok: false, error: err.message }, null, 2));
      onToast('Execution Error', err.message, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleQuickAction = async (tool: string, args: any, desc: string) => {
    setIsExecuting(true);
    try {
      const res = await executeAgentTool(tool, args);
      if (res.ok) {
        onToast('Action Executed', desc, 'success');
      } else {
        onToast('Action Alert', res.error || res.message || 'Operation failed', 'warning');
      }
    } catch (e: any) {
      onToast('Error', e.message, 'error');
    } finally {
      setIsExecuting(false);
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
      {/* Drawer Container: bottom sheet on mobile, side-drawer on desktop */}
      <div
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[92vh] sm:max-h-full sm:w-[480px] bg-white dark:bg-[#111827] text-gray-800 dark:text-[#E5E7EB] border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-[#1F2937] shadow-2xl flex flex-col self-end sm:self-auto rounded-t-2xl sm:rounded-none overflow-hidden transition-all duration-300"
      >
        {/* Drawer Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-[#1F2937] flex items-center justify-between shrink-0 bg-gray-50/70 dark:bg-[#151D2C]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-mono font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white uppercase font-mono">
                  AGENT ACCESS
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-semibold">
                  WEBMCP & AI
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                ChatGPT · Claude · MCP · Web APIs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pause Agent Switch */}
            <button
              type="button"
              onClick={() => setAgentPaused(!state.isPaused)}
              aria-label={state.isPaused ? 'Resume Agent' : 'Pause Agent'}
              className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all ${
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
                  <span>Active</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close Agent Access Drawer"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#1F2937] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-gray-200 dark:border-[#1F2937] bg-gray-50/50 dark:bg-[#111827] px-4 shrink-0 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('external')}
            className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'external'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>ChatGPT / Claude</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Copilot Runner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Logs ({state.logs.length})</span>
          </button>
        </div>

        {/* Tab 1: OVERVIEW & CONTROLS */}
        {activeTab === 'overview' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Status Chip */}
            <div className="p-3.5 rounded-xl border border-gray-200 dark:border-[#1F2937] bg-gray-50 dark:bg-[#131B2B] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      state.isPaused ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      state.isPaused ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </span>
                <div>
                  <span className="text-xs font-mono font-semibold text-gray-900 dark:text-white block">
                    {state.isPaused ? 'Agent Suspended' : 'Agent Ready & Connected'}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                    window.VistaroAI · postMessage · CustomEvents active
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                  {Object.values(state.toolToggles).filter(Boolean).length}/{AGENT_TOOLS.length} ENABLED
                </span>
              </div>
            </div>

            {/* Quick 1-Tap Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                1-TAP AGENT TEST ACTIONS
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sample = getCyberpunkStoryboardSample();
                    handleQuickAction(
                      'load_image',
                      {
                        source: 'url',
                        url: sample.url,
                        name: sample.name,
                      },
                      'Loaded 4K Anime Storyboard'
                    );
                  }}
                  className="p-2.5 text-left rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131B2B] hover:border-blue-500 transition-colors group"
                >
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block group-hover:text-blue-500">
                    🎬 Load 4K Storyboard
                  </span>
                  <span className="text-[10px] text-gray-500">Built-in 4K Vector Master</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickAction('set_grid', { rows: 3, columns: 3 }, 'Configured 3×3 Instagram Mosaic')
                  }
                  className="p-2.5 text-left rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131B2B] hover:border-blue-500 transition-colors group"
                >
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block group-hover:text-blue-500">
                    📐 3×3 Grid Mosaic
                  </span>
                  <span className="text-[10px] text-gray-500">Instagram 9-panel split</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickAction(
                      'set_output',
                      { resolution: '8k', sharpness: 'studio8k', format: 'png' },
                      'Set 8K Studio Output'
                    )
                  }
                  className="p-2.5 text-left rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131B2B] hover:border-blue-500 transition-colors group"
                >
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block group-hover:text-blue-500">
                    ⚡ 8K Ultra-HD Output
                  </span>
                  <span className="text-[10px] text-gray-500">Studio sharpness & lossless PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleQuickAction(
                      'apply_video_preset',
                      { preset: 'Instagram Reel' },
                      'Applied Reel Storyboard Preset'
                    )
                  }
                  className="p-2.5 text-left rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#131B2B] hover:border-blue-500 transition-colors group"
                >
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block group-hover:text-blue-500">
                    🎬 Reel Storyboard
                  </span>
                  <span className="text-[10px] text-gray-500">9:16 Ken Burns motion preset</span>
                </button>
              </div>
            </div>

            {/* Compact Automation Boundary */}
            <div className="rounded-xl border border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#0D131F] overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200 dark:border-[#1F2937] bg-gray-50 dark:bg-[#151D2C] flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  SECURITY & CONTROL GUARANTEES
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              </div>

              <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-[#1F2937] text-xs p-3 gap-2">
                <div className="space-y-1 pr-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-blue-600 dark:text-blue-400 block">
                    AI AGENT AUTOMATES
                  </span>
                  <ul className="space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                    <li>• Slicing & grid configuration</li>
                    <li>• Spacing, margins, naming</li>
                    <li>• 8K upscaling & sharpening</li>
                    <li>• Storyboard motion & captions</li>
                  </ul>
                </div>

                <div className="space-y-1 pl-2">
                  <span className="text-[10px] font-mono font-bold uppercase text-gray-500 dark:text-gray-400 block">
                    HUMAN APPROVAL
                  </span>
                  <ul className="space-y-1 text-[11px] text-gray-600 dark:text-gray-300">
                    <li>• Local device file picking</li>
                    <li>• Final ZIP export download</li>
                    <li>• Clearing export history</li>
                    <li>• Instant agent pause switch</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tool List with Toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  TOOL REGISTRY ({AGENT_TOOLS.length})
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  Enable/disable per tool
                </span>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-[#1F2937] divide-y divide-gray-200 dark:divide-[#1F2937] overflow-hidden bg-white dark:bg-[#0D131F] max-h-64 overflow-y-auto">
                {AGENT_TOOLS.map((tool) => {
                  const isEnabled = state.toolToggles[tool.name] !== false;
                  return (
                    <div
                      key={tool.name}
                      className="p-2.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 dark:hover:bg-[#151D2C] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <code className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 block truncate">
                          {tool.name}
                        </code>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {tool.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setToolEnabled(tool.name, !isEnabled)}
                        aria-label={`Toggle tool ${tool.name}`}
                        className={`min-h-[36px] min-w-[36px] flex items-center justify-center text-xs font-mono transition-colors ${
                          isEnabled
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        {isEnabled ? (
                          <ToggleRight className="w-6 h-6" />
                        ) : (
                          <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: EXTERNAL AGENTS (ChatGPT & Claude) */}
        {activeTab === 'external' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              <span className="font-semibold block mb-1">🤖 Connect Any External AI:</span>
              Export native tool declarations for ChatGPT or Claude, or execute tools live across contexts using the <code className="bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded font-mono">window.VistaroAI</code> and <code className="bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded font-mono">postMessage</code> APIs.
            </div>

            {/* Option A: Claude (Anthropic) */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                    C
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                      Claude (Anthropic) Tool Schema
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Formatted for Claude Computer Use & Tools API
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      generateClaudeToolsJson(),
                      'Claude Tools JSON',
                      'Claude Schema Copied'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-[#1F2937] dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 transition-colors flex items-center gap-1.5"
                >
                  {copiedType === 'Claude Tools JSON' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedType === 'Claude Tools JSON' ? 'Copied!' : 'Copy Claude Tools'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Exports all 24 local canvas tools in Anthropic's <code className="text-blue-500 font-mono">input_schema</code> structure.
              </p>
            </div>

            {/* Option B: ChatGPT (OpenAI) */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    G
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                      ChatGPT (OpenAI) Function Schema
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      OpenAI Function Calling & Custom GPT Actions
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      generateChatGPTToolsJson(),
                      'ChatGPT Functions JSON',
                      'ChatGPT Schema Copied'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-[#1F2937] dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 transition-colors flex items-center gap-1.5"
                >
                  {copiedType === 'ChatGPT Functions JSON' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedType === 'ChatGPT Functions JSON' ? 'Copied!' : 'Copy ChatGPT Schema'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Formatted as <code className="text-blue-500 font-mono">{`{ type: "function", function: { ... } }`}</code> ready for OpenAI assistants.
              </p>
            </div>

            {/* Option C: Native MCP Server (Claude Desktop & Antigravity) */}
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    MCP
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                      Model Context Protocol (MCP) Server
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Claude Desktop, Antigravity & Cursor native connection
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        {
                          mcpServers: {
                            vistaro: {
                              command: 'npx',
                              args: ['-y', 'tsx', 'mcp-server/server.ts'],
                            },
                          },
                        },
                        null,
                        2
                      ),
                      'MCP Server Config',
                      'MCP Config Copied'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5"
                >
                  {copiedType === 'MCP Server Config' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedType === 'MCP Server Config' ? 'Copied!' : 'Copy MCP Config'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Connects directly to your live Vistaro window via stdio and local WebSocket bridge (<code className="text-blue-500 font-mono">ws://localhost:3001</code>).
              </p>
            </div>

            {/* Option C: Master System Instructions Prompt */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                      Full System Prompt (Chat or Agent)
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Copy & paste into ChatGPT or Claude chat
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      generateAgentPrompt(),
                      'System Prompt',
                      'System Prompt Copied'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5"
                >
                  {copiedType === 'System Prompt' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedType === 'System Prompt' ? 'Copied!' : 'Copy Prompt'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Instructs any AI model on how VistaroAI works, available canvas tools, parameters, and recommended workflows.
              </p>
            </div>

            {/* Option D: Browser Automation Script */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-[#1F2937] bg-white dark:bg-[#111827] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-purple-500" />
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                      Console / Playwright Script
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      Ready-to-run JavaScript snippet
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      generateExternalAgentScript(),
                      'Console Script',
                      'Automation Script Copied'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-[#1F2937] dark:hover:bg-[#374151] text-gray-800 dark:text-gray-200 transition-colors flex items-center gap-1.5"
                >
                  {copiedType === 'Console Script' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedType === 'Console Script' ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Paste into browser DevTools Console or browser automation agents to control VistaroAI instantly.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: COPILOT RUNNER (Simulator) */}
        {activeTab === 'simulator' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider font-mono text-gray-700 dark:text-gray-300 block">
                Select Tool to Test
              </label>
              <select
                value={selectedTool}
                onChange={(e) => handleToolSelectChange(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#131B2B] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {AGENT_TOOLS.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} — {t.description.substring(0, 48)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider font-mono text-gray-700 dark:text-gray-300">
                  Tool Arguments (JSON)
                </label>
                <span className="text-[10px] text-gray-400 font-mono">
                  {selectedTool}
                </span>
              </div>
              <textarea
                value={simulatorArgs}
                onChange={(e) => setSimulatorArgs(e.target.value)}
                rows={5}
                className="w-full p-2.5 text-xs font-mono rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0A0E17] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <button
              type="button"
              disabled={isExecuting}
              onClick={handleRunSimulator}
              className="w-full min-h-[42px] px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isExecuting ? 'Executing...' : `Execute ${selectedTool}`}</span>
            </button>

            {simulatorOutput && (
              <div className="space-y-1">
                <span className="text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300 block">
                  Execution Result:
                </span>
                <pre className="p-3 rounded-lg bg-gray-50 dark:bg-[#0A0E17] border border-gray-200 dark:border-gray-800 text-[11px] font-mono text-gray-800 dark:text-gray-200 overflow-x-auto max-h-48">
                  {simulatorOutput}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: LIVE ACTIVITY LOGS */}
        {activeTab === 'logs' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                LIVE ACTIVITY STREAM ({state.logs.length}/20)
              </span>
              {state.logs.length > 0 && (
                <button
                  type="button"
                  onClick={clearActivityLogs}
                  className="px-2 py-1 text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {state.logs.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No tool calls logged yet. Actions from ChatGPT, Claude, or Copilot runner will stream here.
                </div>
              ) : (
                state.logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-[#111827] border border-gray-200 dark:border-[#1F2937] flex items-start gap-2.5 text-[11px]"
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                        log.ok ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
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
        )}
      </div>
    </div>
  );
};
