import {
  ToolName,
  AgentToolDefinition,
  AgentToolResult,
  AgentToolMetadata,
  ActivityLogItem,
  AgentAccessState,
  AgentBridgeMethods,
} from './types';
import { CREATOR_PRESETS } from '../lib/presets';
import { formatSliceFilename } from '../lib/imageEngine';

declare global {
  interface Navigator {
    modelContext?: {
      registerTool: (tool: {
        name: string;
        description: string;
        inputSchema: Record<string, any>;
        execute: (args?: any) => Promise<any> | any;
      }) => void;
      unregisterTool?: (name: string) => void;
    };
  }
  interface Window {
    VistaroAI?: {
      tools: Record<string, AgentToolDefinition>;
      list: () => AgentToolMetadata[];
      call: (name: string, args?: any) => Promise<AgentToolResult>;
      isPaused: () => boolean;
      setPaused: (paused: boolean) => void;
      getLogs: () => ActivityLogItem[];
      clearLogs: () => void;
    };
    SplitPro?: {
      tools: Record<string, AgentToolDefinition>;
      list: () => AgentToolMetadata[];
      call: (name: string, args?: any) => Promise<AgentToolResult>;
      isPaused: () => boolean;
      setPaused: (paused: boolean) => void;
      getLogs: () => ActivityLogItem[];
      clearLogs: () => void;
    };
    mcp?: {
      listTools: () => AgentToolMetadata[];
      callTool: (name: string, args?: any) => Promise<AgentToolResult>;
    };
    chatgptAgent?: {
      tools: any[];
      execute: (name: string, args?: any) => Promise<AgentToolResult>;
      list: () => AgentToolMetadata[];
    };
    claudeAgent?: {
      tools: any[];
      execute: (name: string, args?: any) => Promise<AgentToolResult>;
      list: () => AgentToolMetadata[];
    };
    __vistaro_agent_listener_attached?: boolean;
  }
}

// In-memory state for Agent Access
let agentState: AgentAccessState = {
  isPaused: false,
  toolToggles: {
    load_image: true,
    get_image_info: true,
    suggest_layouts: true,
    set_split_mode: true,
    set_grid: true,
    set_spacing: true,
    set_sequence: true,
    set_custom_lines: true,
    set_output: true,
    set_naming_convention: true,
    preview_slices: true,
    reorder_slices: true,
    rename_slice: true,
    export_zip: true,
    set_video_settings: true,
    apply_video_preset: true,
    set_slide_motion: true,
    set_slide_caption: true,
    preview_video: true,
    render_video: true,
    cancel_render: true,
    undo: true,
    redo: true,
    reset: true,
  },
  logs: [],
  pendingExportRequest: null,
  activeHighlight: null,
};

// Listeners for UI reactivity
const stateListeners = new Set<(state: AgentAccessState) => void>();

export function getAgentState(): AgentAccessState {
  return agentState;
}

export function subscribeAgentState(listener: (state: AgentAccessState) => void): () => void {
  stateListeners.add(listener);
  listener(agentState);
  return () => {
    stateListeners.delete(listener);
  };
}

function notifyStateChange() {
  const current = { ...agentState };
  stateListeners.forEach((listener) => {
    try {
      listener(current);
    } catch (e) {
      console.error('Error notifying agent state listener:', e);
    }
  });
}

export function setAgentPaused(paused: boolean) {
  agentState = { ...agentState, isPaused: paused };
  notifyStateChange();
}

export function setToolEnabled(toolName: ToolName, enabled: boolean) {
  agentState = {
    ...agentState,
    toolToggles: {
      ...agentState.toolToggles,
      [toolName]: enabled,
    },
  };
  notifyStateChange();
}

export function clearActivityLogs() {
  agentState = { ...agentState, logs: [] };
  notifyStateChange();
}

export function setPendingExport(request: AgentAccessState['pendingExportRequest']) {
  agentState = { ...agentState, pendingExportRequest: request };
  notifyStateChange();
}

// Sanitize tool arguments to guarantee image data never enters logs
function sanitizeArgs(args: any): any {
  if (!args || typeof args !== 'object') return args;
  const clone = { ...args };
  for (const key of Object.keys(clone)) {
    const val = clone[key];
    if (typeof val === 'string') {
      if (val.startsWith('data:image/') || val.length > 500) {
        clone[key] = `[Truncated Data (${val.length} bytes)]`;
      }
    }
  }
  return clone;
}

function recordLog(tool: string, args: any, result: AgentToolResult) {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
  const newLog: ActivityLogItem = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    time: timeStr,
    tool,
    args: sanitizeArgs(args),
    ok: result.ok,
    message: result.message || (result.ok ? 'Success' : result.error),
    error: result.error,
  };

  // Keep last 20 logs only
  const updatedLogs = [newLog, ...agentState.logs].slice(0, 20);
  agentState = { ...agentState, logs: updatedLogs };
  notifyStateChange();
}

// Active bridge instance connecting tools to React application logic
let activeBridge: AgentBridgeMethods | null = null;

export function connectAgentBridge(bridge: AgentBridgeMethods) {
  activeBridge = bridge;
}

export function disconnectAgentBridge() {
  activeBridge = null;
}

// Trigger temporary 600ms outline highlight on changed UI element
function triggerHighlight(target: string) {
  if (!activeBridge) return;
  activeBridge.setHighlight(target);
  setTimeout(() => {
    if (activeBridge) {
      activeBridge.setHighlight(null);
    }
  }, 600);
}

// TOOL SCHEMAS & DEFINITIONS
export const AGENT_TOOLS: AgentToolMetadata[] = [
  {
    name: 'load_image',
    description: 'Load an image into VistaroAI from clipboard, remote URL, or device file picker.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['clipboard', 'url', 'file_picker'],
          description: 'Source to load image from',
        },
        url: {
          type: 'string',
          description: 'Image URL (required when source is "url"; remote host must allow CORS)',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'get_image_info',
    description: 'Get width, height, size, format, and aspect ratio of currently loaded image.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'suggest_layouts',
    description: 'Get layout and grid recommendations tailored to the current image aspect ratio.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_split_mode',
    description: 'Change split layout mode (auto, grid, vertical, horizontal, custom).',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['auto', 'grid', 'vertical', 'horizontal', 'custom'],
          description: 'Slicing layout mode',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'set_grid',
    description: 'Configure grid rows and columns for panel splitting (e.g. 3x3 for Instagram, 2x2).',
    inputSchema: {
      type: 'object',
      properties: {
        rows: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Number of vertical rows (1 to 50)',
        },
        columns: {
          type: 'integer',
          minimum: 1,
          maximum: 50,
          description: 'Number of horizontal columns (1 to 50)',
        },
      },
      required: ['rows', 'columns'],
    },
  },
  {
    name: 'set_spacing',
    description: 'Configure outer margins, horizontal/vertical gaps between panels, and gap behavior.',
    inputSchema: {
      type: 'object',
      properties: {
        outerMargin: {
          type: 'number',
          minimum: 0,
          description: 'Outer border padding in pixels (>= 0)',
        },
        horizontalGap: {
          type: 'number',
          minimum: 0,
          description: 'Horizontal gap between columns in pixels (>= 0)',
        },
        verticalGap: {
          type: 'number',
          minimum: 0,
          description: 'Vertical gap between rows in pixels (>= 0)',
        },
        gapBehavior: {
          type: 'string',
          enum: ['zero-crop', 'discard'],
          description: 'Gap mode: "zero-crop" preserves coordinates; "discard" skips pixel gutter strip',
        },
      },
    },
  },
  {
    name: 'set_sequence',
    description: 'Configure panel export sequence and numbering order (row-major, col-major, snake).',
    inputSchema: {
      type: 'object',
      properties: {
        order: {
          type: 'string',
          enum: ['row-major', 'col-major', 'snake'],
          description: 'Sequence ordering method',
        },
      },
      required: ['order'],
    },
  },
  {
    name: 'set_custom_lines',
    description: 'Set custom slice split lines in source image coordinates (pixels).',
    inputSchema: {
      type: 'object',
      properties: {
        vertical: {
          type: 'array',
          items: { type: 'number' },
          description: 'X pixel coordinates of vertical cut lines',
        },
        horizontal: {
          type: 'array',
          items: { type: 'number' },
          description: 'Y pixel coordinates of horizontal cut lines',
        },
      },
    },
  },
  {
    name: 'set_output',
    description: 'Configure export resolution (8k, 4k, 2k, native), format (png, jpg, webp), quality, and sharpness.',
    inputSchema: {
      type: 'object',
      properties: {
        resolution: {
          type: 'string',
          enum: ['8k', '4k', '2k', 'native'],
          description: 'Target export resolution profile',
        },
        format: {
          type: 'string',
          enum: ['png', 'jpg', 'webp'],
          description: 'Output image format',
        },
        quality: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: 'Export compression quality (1 to 100)',
        },
        sharpness: {
          type: 'string',
          enum: ['off', 'subtle', 'crisp', 'ultra', 'studio8k'],
          description: 'Unsharp mask edge enhancement level',
        },
        contrast: {
          type: 'number',
          minimum: 50,
          maximum: 150,
          description: 'Tone contrast percentage (50 to 150, 100 is normal)',
        },
        filenamePrefix: {
          type: 'string',
          description: 'Prefix for generated panel filenames',
        },
        includeCoordinates: {
          type: 'boolean',
          description: 'Whether to append row/col coordinates to filenames',
        },
      },
    },
  },
  {
    name: 'set_naming_convention',
    description: "Configure dynamic slice naming pattern (e.g., '{row}-{col}_{timestamp}', '{prefix}_{index}'). Supports: {row}, {col}, {index}, {pad_row}, {pad_col}, {pad_index}, {prefix}, {timestamp}, {width}, {height}, {ext}.",
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: "Naming pattern template, e.g. '{row}-{col}_{timestamp}' or '{prefix}_r{pad_row}_c{pad_col}'",
        },
        prefix: {
          type: 'string',
          description: "Optional filename prefix for {prefix} placeholder",
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'preview_slices',
    description: 'Returns slice count and coordinates for every panel slice without full rendering.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'reorder_slices',
    description: 'Reorder panel sequence by specifying an array of 0-based slice indices.',
    inputSchema: {
      type: 'object',
      properties: {
        order: {
          type: 'array',
          items: { type: 'integer' },
          description: 'Array of slice indices representing new sequence order',
        },
      },
      required: ['order'],
    },
  },
  {
    name: 'rename_slice',
    description: 'Rename a specific slice panel by index.',
    inputSchema: {
      type: 'object',
      properties: {
        index: {
          type: 'integer',
          minimum: 0,
          description: 'Zero-based index of slice to rename',
        },
        name: {
          type: 'string',
          description: 'New custom filename for this slice',
        },
      },
      required: ['index', 'name'],
    },
  },
  {
    name: 'export_zip',
    description: 'Request ZIP download of all sliced panels. Shows confirmation button for user gesture.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'set_video_settings',
    description: 'Configure video slideshow parameters (aspect ratio: 9:16|1:1|16:9, resolution: 720p|1080p, fps: 24|30, durationPerSlide, transition, fitMode, easing).',
    inputSchema: {
      type: 'object',
      properties: {
        aspectRatio: {
          type: 'string',
          enum: ['9:16', '1:1', '16:9'],
          description: 'Target video aspect ratio',
        },
        resolution: {
          type: 'string',
          enum: ['720p', '1080p'],
          description: 'Output resolution (default 1080p)',
        },
        fps: {
          type: 'integer',
          enum: [24, 30],
          description: 'Frames per second (24 or 30)',
        },
        durationPerSlide: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Slide duration in seconds (1 to 10)',
        },
        fitMode: {
          type: 'string',
          enum: ['cover', 'contain'],
          description: 'Fit mode (contain uses blurred background fill)',
        },
        transition: {
          type: 'string',
          enum: ['none', 'fade', 'slide', 'zoom', 'wipe'],
          description: 'Slide transition effect',
        },
        transitionDuration: {
          type: 'number',
          minimum: 0.2,
          maximum: 1.5,
          description: 'Transition duration in seconds',
        },
        easing: {
          type: 'string',
          enum: ['linear', 'ease-in-out'],
          description: 'Motion timing function',
        },
      },
    },
  },
  {
    name: 'apply_video_preset',
    description: 'Apply one-tap video preset (Instagram Reel, Story Slideshow, YouTube Storyboard, Square Post).',
    inputSchema: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['Instagram Reel', 'Story Slideshow', 'YouTube Storyboard', 'Square Post'],
          description: 'Name of the video preset',
        },
      },
      required: ['preset'],
    },
  },
  {
    name: 'set_slide_motion',
    description: 'Set motion effect for a specific slide or apply to all slides (none, zoom_in, zoom_out, pan_left, pan_right, pan_up, pan_down, random).',
    inputSchema: {
      type: 'object',
      properties: {
        slideIndex: {
          type: 'integer',
          minimum: 0,
          description: 'Zero-based index of slide to update (optional if applyToAll is true)',
        },
        motion: {
          type: 'string',
          enum: ['none', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'pan_up', 'pan_down', 'random'],
          description: 'Motion effect style',
        },
        applyToAll: {
          type: 'boolean',
          description: 'If true, applies this motion style to every slide in the video',
        },
      },
      required: ['motion'],
    },
  },
  {
    name: 'set_slide_caption',
    description: 'Add or update burned-in text caption for a specific video slide.',
    inputSchema: {
      type: 'object',
      properties: {
        slideIndex: {
          type: 'integer',
          minimum: 0,
          description: 'Zero-based slide index',
        },
        text: {
          type: 'string',
          description: 'Caption text to burn into the slide',
        },
        position: {
          type: 'string',
          enum: ['top', 'bottom'],
          description: 'Vertical caption placement (default bottom)',
        },
        size: {
          type: 'string',
          enum: ['small', 'medium', 'large'],
          description: 'Caption text size',
        },
        color: {
          type: 'string',
          description: 'Hex color string (e.g. #FFFFFF)',
        },
      },
      required: ['slideIndex', 'text'],
    },
  },
  {
    name: 'preview_video',
    description: 'Control real-time video canvas preview (play, pause, seek).',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['play', 'pause', 'seek'],
          description: 'Playback control command',
        },
        time: {
          type: 'number',
          minimum: 0,
          description: 'Seek timestamp in seconds (when action is seek)',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'render_video',
    description: 'Trigger video export as MP4 / WebM. Prompts user gesture confirmation in UI.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'cancel_render',
    description: 'Cancel currently running video rendering process.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'undo',
    description: 'Revert the most recent configuration change.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'redo',
    description: 'Reapply the most recently undone configuration change.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'reset',
    description: 'Reset all settings back to default 8K Studio Master values.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// TOOL EXECUTORS
async function executeToolInternal(name: ToolName, args: any = {}): Promise<AgentToolResult> {
  // Check if paused
  if (agentState.isPaused) {
    return {
      ok: false,
      error: 'Agent access is currently paused by user. Please unpause in the Agent Access drawer.',
    };
  }

  // Check if tool is individually enabled
  if (agentState.toolToggles[name] === false) {
    return {
      ok: false,
      error: `Tool "${name}" is disabled in the Agent Access tool settings.`,
    };
  }

  if (!activeBridge) {
    return {
      ok: false,
      error: 'Split Pro editor application is not fully mounted.',
    };
  }

  try {
    switch (name) {
      case 'load_image': {
        const source = args?.source;
        if (!source || !['clipboard', 'url', 'file_picker'].includes(source)) {
          return {
            ok: false,
            error: 'Invalid source. Must be "clipboard", "url", or "file_picker".',
          };
        }

        if (source === 'file_picker') {
          activeBridge.triggerFilePicker();
          activeBridge.showToast('Agent: opened file picker', 'Please select an image on your device.', 'info');
          return {
            ok: true,
            state: 'file_picker_opened',
            message: 'Device file picker opened for manual user selection.',
          };
        }

        if (source === 'clipboard') {
          try {
            await activeBridge.loadImageFromClipboard();
            const info = activeBridge.getImageInfo();
            triggerHighlight('canvas');
            activeBridge.showToast('Agent: loaded clipboard image', info ? `${info.name} (${info.width}×${info.height})` : '', 'success');
            return {
              ok: true,
              state: info,
              message: 'Image loaded from clipboard successfully.',
            };
          } catch (err: any) {
            return {
              ok: false,
              error: err?.message || 'Could not read image from clipboard. Ensure clipboard contains an image.',
            };
          }
        }

        if (source === 'url') {
          const url = args?.url;
          if (!url || typeof url !== 'string' || !url.trim()) {
            return {
              ok: false,
              error: 'Missing required "url" string parameter for source "url".',
            };
          }

          try {
            await activeBridge.loadImageFromUrl(url.trim());
            const info = activeBridge.getImageInfo();
            triggerHighlight('canvas');
            activeBridge.showToast('Agent: loaded image from URL', info ? `${info.name} (${info.width}×${info.height})` : '', 'success');
            return {
              ok: true,
              state: info,
              message: 'Image loaded from URL successfully.',
            };
          } catch (err: any) {
            return {
              ok: false,
              error: `Failed to load image from URL: CORS policy or network error blocked access (${err?.message || 'Failed to fetch'}).`,
            };
          }
        }

        return { ok: false, error: 'Unsupported image source.' };
      }

      case 'get_image_info': {
        const info = activeBridge.getImageInfo();
        if (!info) {
          return {
            ok: false,
            error: 'No image is currently loaded. Call load_image first.',
          };
        }
        return {
          ok: true,
          state: info,
          result: info,
        };
      }

      case 'suggest_layouts': {
        const info = activeBridge.getImageInfo();
        const width = info?.width || 1920;
        const height = info?.height || 1080;
        const aspect = width / height;

        // Smart suggestions mirroring UI
        const suggestions = [
          {
            id: 'instagram-3x3',
            name: 'Instagram 3×3 Grid',
            rows: 3,
            columns: 3,
            mode: 'grid',
            description: '9-part mosaic for Instagram profile grid',
          },
          {
            id: 'panorama-carousel',
            name: 'Panorama Carousel (3 Slides)',
            rows: 1,
            columns: 3,
            mode: 'vertical',
            description: '3 seamless horizontal slides',
          },
          {
            id: 'quadrant-2x2',
            name: '2×2 Symmetry Quadrant',
            rows: 2,
            columns: 2,
            mode: 'grid',
            description: '4 balanced equal panels',
          },
          {
            id: 'webtoon-strip',
            name: 'Webtoon Vertical Stack',
            rows: 4,
            columns: 1,
            mode: 'horizontal',
            description: '4 vertical scrolling chapters/panels',
          },
        ];

        return {
          ok: true,
          state: {
            imageAspect: aspect.toFixed(3),
            recommendedPresets: suggestions,
            creatorPresets: CREATOR_PRESETS.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              description: p.description,
              settings: p.settings,
            })),
          },
        };
      }

      case 'set_split_mode': {
        const mode = args?.mode;
        const validModes = ['auto', 'grid', 'vertical', 'horizontal', 'custom'];
        if (!mode || !validModes.includes(mode)) {
          return {
            ok: false,
            error: `Invalid mode. Must be one of: ${validModes.join(', ')}.`,
          };
        }

        activeBridge.updateSettings({ splitMode: mode });
        triggerHighlight('mode');
        activeBridge.showToast('Agent: set split mode', `Changed mode to ${mode}`, 'info');

        return {
          ok: true,
          state: { splitMode: mode },
        };
      }

      case 'set_grid': {
        const rows = Number(args?.rows);
        const columns = Number(args?.columns);

        if (!Number.isInteger(rows) || rows < 1 || rows > 50) {
          return {
            ok: false,
            error: 'Parameter "rows" must be an integer between 1 and 50.',
          };
        }
        if (!Number.isInteger(columns) || columns < 1 || columns > 50) {
          return {
            ok: false,
            error: 'Parameter "columns" must be an integer between 1 and 50.',
          };
        }

        activeBridge.updateSettings({
          splitMode: 'grid',
          rows,
          columns,
        });
        triggerHighlight('grid');
        activeBridge.showToast('Agent: set grid', `${rows}×${columns} layout (${rows * columns} panels)`, 'info');

        return {
          ok: true,
          state: { rows, columns, splitMode: 'grid', totalSlices: rows * columns },
        };
      }

      case 'set_spacing': {
        const updates: any = {};

        if (args?.outerMargin !== undefined) {
          const om = Number(args.outerMargin);
          if (isNaN(om) || om < 0) {
            return { ok: false, error: 'Parameter "outerMargin" must be a non-negative number.' };
          }
          updates.outerMargin = Math.round(om);
        }

        if (args?.horizontalGap !== undefined) {
          const hg = Number(args.horizontalGap);
          if (isNaN(hg) || hg < 0) {
            return { ok: false, error: 'Parameter "horizontalGap" must be a non-negative number.' };
          }
          updates.horizontalGap = Math.round(hg);
        }

        if (args?.verticalGap !== undefined) {
          const vg = Number(args.verticalGap);
          if (isNaN(vg) || vg < 0) {
            return { ok: false, error: 'Parameter "verticalGap" must be a non-negative number.' };
          }
          updates.verticalGap = Math.round(vg);
        }

        if (args?.gapBehavior !== undefined) {
          if (args.gapBehavior === 'zero-crop' || args.gapBehavior === 'spacing') {
            updates.gapBehavior = 'spacing';
          } else if (args.gapBehavior === 'discard' || args.gapBehavior === 'skip_source') {
            updates.gapBehavior = 'skip_source';
          } else {
            return {
              ok: false,
              error: 'Parameter "gapBehavior" must be "zero-crop" or "discard".',
            };
          }
        }

        if (Object.keys(updates).length === 0) {
          return {
            ok: false,
            error: 'Provide at least one of outerMargin, horizontalGap, verticalGap, or gapBehavior.',
          };
        }

        activeBridge.updateSettings(updates);
        triggerHighlight('spacing');
        activeBridge.showToast('Agent: set spacing', 'Margins and gap behaviors updated.', 'info');

        return {
          ok: true,
          state: updates,
        };
      }

      case 'set_sequence': {
        const order = args?.order;
        let mappedOrder: 'row-by-row' | 'col-by-col' | 'snake' = 'row-by-row';

        if (order === 'row-major' || order === 'row-by-row') {
          mappedOrder = 'row-by-row';
        } else if (order === 'col-major' || order === 'col-by-col') {
          mappedOrder = 'col-by-col';
        } else if (order === 'snake') {
          mappedOrder = 'snake';
        } else {
          return {
            ok: false,
            error: 'Parameter "order" must be "row-major", "col-major", or "snake".',
          };
        }

        activeBridge.updateSettings({ panelOrder: mappedOrder });
        triggerHighlight('sequence');
        activeBridge.showToast('Agent: set sequence', `Order set to ${order}`, 'info');

        return {
          ok: true,
          state: { panelOrder: mappedOrder },
        };
      }

      case 'set_custom_lines': {
        const vertical = args?.vertical;
        const horizontal = args?.horizontal;

        if (!Array.isArray(vertical) || !Array.isArray(horizontal)) {
          return {
            ok: false,
            error: 'Both "vertical" and "horizontal" must be arrays of numbers.',
          };
        }

        const cleanV = vertical.map(Number).filter((n) => !isNaN(n) && n >= 0);
        const cleanH = horizontal.map(Number).filter((n) => !isNaN(n) && n >= 0);

        activeBridge.updateSettings({
          splitMode: 'custom',
          customVLines: cleanV,
          customHLines: cleanH,
        });
        triggerHighlight('custom');
        activeBridge.showToast(
          'Agent: set custom lines',
          `${cleanV.length} vertical and ${cleanH.length} horizontal cut lines`,
          'info'
        );

        return {
          ok: true,
          state: { customVLines: cleanV, customHLines: cleanH, splitMode: 'custom' },
        };
      }

      case 'set_output': {
        const updates: any = {};

        if (args?.resolution !== undefined) {
          const res = args.resolution;
          if (res === '8k') {
            updates.resolutionMode = '8k';
            updates.enhanceTo8K = true;
            updates.enhanceTo4K = false;
          } else if (res === '4k') {
            updates.resolutionMode = '4k';
            updates.enhanceTo8K = false;
            updates.enhanceTo4K = true;
          } else if (res === '2k') {
            updates.resolutionMode = '2k';
            updates.enhanceTo8K = false;
            updates.enhanceTo4K = false;
          } else if (res === 'native' || res === 'original') {
            updates.resolutionMode = 'original';
            updates.enhanceTo8K = false;
            updates.enhanceTo4K = false;
          } else {
            return {
              ok: false,
              error: 'Invalid resolution. Must be "8k", "4k", "2k", or "native".',
            };
          }
        }

        if (args?.format !== undefined) {
          let fmt = args.format.toLowerCase();
          if (fmt === 'jpg') fmt = 'jpeg';
          if (!['png', 'jpeg', 'webp'].includes(fmt)) {
            return {
              ok: false,
              error: 'Invalid format. Must be "png", "jpg", or "webp".',
            };
          }
          updates.outputFormat = fmt;
        }

        if (args?.quality !== undefined) {
          const q = Number(args.quality);
          if (isNaN(q) || q < 1 || q > 100) {
            return {
              ok: false,
              error: 'Parameter "quality" must be a number between 1 and 100.',
            };
          }
          updates.quality = Math.round(q);
        }

        if (args?.sharpness !== undefined) {
          const validSharp = ['off', 'subtle', 'crisp', 'ultra', 'studio8k'];
          if (!validSharp.includes(args.sharpness)) {
            return {
              ok: false,
              error: `Invalid sharpness. Must be one of: ${validSharp.join(', ')}.`,
            };
          }
          updates.sharpnessLevel = args.sharpness;
          updates.sharpnessBoost = args.sharpness !== 'off';
        }

        if (args?.contrast !== undefined) {
          const c = Number(args.contrast);
          if (isNaN(c) || c < 50 || c > 150) {
            return {
              ok: false,
              error: 'Parameter "contrast" must be a number between 50 and 150.',
            };
          }
          updates.contrast = Math.round(c);
        }

        if (args?.filenamePrefix !== undefined) {
          updates.namingPrefix = String(args.filenamePrefix).trim();
        }

        if (args?.includeCoordinates !== undefined) {
          updates.includeGridCoordsInName = Boolean(args.includeCoordinates);
        }

        if (Object.keys(updates).length === 0) {
          return {
            ok: false,
            error: 'No valid output settings provided.',
          };
        }

        activeBridge.updateSettings(updates);
        triggerHighlight('output');
        activeBridge.showToast('Agent: set output', 'Configured export resolution and format.', 'info');

        return {
          ok: true,
          state: updates,
        };
      }

      case 'set_naming_convention': {
        const pattern = args?.pattern;
        if (!pattern || typeof pattern !== 'string' || !pattern.trim()) {
          return {
            ok: false,
            error: 'Parameter "pattern" must be a non-empty string template (e.g. "{row}-{col}_{timestamp}").',
          };
        }

        const updates: any = {
          namingPattern: pattern.trim(),
        };

        if (args?.prefix !== undefined && typeof args.prefix === 'string') {
          updates.namingPrefix = args.prefix.trim();
        }

        activeBridge.updateSettings(updates);
        triggerHighlight('output');
        activeBridge.showToast(
          'Agent: set naming convention',
          `Pattern: "${pattern.trim()}"`,
          'info'
        );

        const currentSettings = activeBridge.getSettings() || {};
        const ext = currentSettings.outputFormat === 'jpeg' ? 'jpg' : (currentSettings.outputFormat || 'png');
        const sampleName = formatSliceFilename({
          pattern: pattern.trim(),
          prefix: updates.namingPrefix || currentSettings.namingPrefix || 'panel',
          row: 0,
          col: 0,
          index: 0,
          width: 1920,
          height: 1080,
          ext,
        });

        return {
          ok: true,
          state: {
            namingPattern: pattern.trim(),
            namingPrefix: updates.namingPrefix || currentSettings.namingPrefix || 'panel',
            exampleFilename: sampleName,
          },
        };
      }

      case 'preview_slices': {
        const slices = activeBridge.getSlices();
        if (!slices || slices.length === 0) {
          return {
            ok: false,
            error: 'No slices calculated. Make sure an image is loaded.',
          };
        }

        const formatted = slices.map((s, idx) => ({
          index: idx,
          row: s.row,
          col: s.col,
          x: s.sourceX,
          y: s.sourceY,
          width: s.sourceWidth,
          height: s.sourceHeight,
          outputWidth: s.outputWidth,
          outputHeight: s.outputHeight,
          suggestedFilename: s.filename,
        }));

        activeBridge.showToast('Agent: previewed slices', `${slices.length} panels calculated`, 'info');

        return {
          ok: true,
          state: {
            count: slices.length,
            slices: formatted,
          },
          result: {
            count: slices.length,
            slices: formatted,
          },
        };
      }

      case 'reorder_slices': {
        const order = args?.order;
        if (!Array.isArray(order) || order.some((n) => !Number.isInteger(Number(n)))) {
          return {
            ok: false,
            error: 'Parameter "order" must be an array of slice indices.',
          };
        }

        activeBridge.reorderPanels(order.map(Number));
        triggerHighlight('results');
        activeBridge.showToast('Agent: reordered slices', `Reordered ${order.length} panels.`, 'info');

        return {
          ok: true,
          state: { order },
        };
      }

      case 'rename_slice': {
        const index = Number(args?.index);
        const nameStr = args?.name;

        if (!Number.isInteger(index) || index < 0) {
          return {
            ok: false,
            error: 'Parameter "index" must be a non-negative integer.',
          };
        }
        if (!nameStr || typeof nameStr !== 'string' || !nameStr.trim()) {
          return {
            ok: false,
            error: 'Parameter "name" must be a non-empty string.',
          };
        }

        activeBridge.renamePanel(index, nameStr.trim());
        triggerHighlight('results');
        activeBridge.showToast('Agent: renamed slice', `Slice #${index} → "${nameStr.trim()}"`, 'info');

        return {
          ok: true,
          state: { index, name: nameStr.trim() },
        };
      }

      case 'export_zip': {
        const info = activeBridge.getImageInfo();
        if (!info) {
          return {
            ok: false,
            error: 'Cannot export: No image is currently loaded.',
          };
        }

        const slices = activeBridge.getSlices();
        const settings = activeBridge.getSettings();
        const zipBase = settings.namingPrefix?.trim() || `${info.name.replace(/\.[^/.]+$/, '')}_split`;
        const zipName = zipBase.endsWith('.zip') ? zipBase : `${zipBase}.zip`;

        // Register pending export request for human confirmation
        const request = {
          id: `export-${Date.now()}`,
          timestamp: Date.now(),
          sliceCount: slices.length,
          filename: zipName,
        };

        setPendingExport(request);
        activeBridge.showToast('Agent: Export Requested', 'Agent requested ZIP download. Please confirm in the dialog.', 'info');

        return {
          ok: true,
          state: {
            status: 'pending_user_gesture',
            message: 'Agent wants to export ZIP archive. Awaiting human confirmation in UI.',
            filename: zipName,
            sliceCount: slices.length,
          },
        };
      }

      case 'set_video_settings': {
        const updates: Record<string, any> = {};
        if (args?.aspectRatio && ['9:16', '1:1', '16:9'].includes(args.aspectRatio)) {
          updates.aspectRatio = args.aspectRatio;
        }
        if (args?.resolution && ['720p', '1080p'].includes(args.resolution)) {
          updates.resolution = args.resolution;
        }
        if (args?.fps && [24, 30].includes(Number(args.fps))) {
          updates.fps = Number(args.fps);
        }
        if (typeof args?.durationPerSlide === 'number') {
          updates.durationPerSlide = Math.max(1, Math.min(10, args.durationPerSlide));
        }
        if (args?.fitMode && ['cover', 'contain'].includes(args.fitMode)) {
          updates.fitMode = args.fitMode;
        }
        if (args?.transition && ['none', 'fade', 'slide', 'zoom', 'wipe'].includes(args.transition)) {
          updates.transition = args.transition;
        }
        if (typeof args?.transitionDuration === 'number') {
          updates.transitionDuration = Math.max(0.2, Math.min(1.5, args.transitionDuration));
        }
        if (args?.easing && ['linear', 'ease-in-out'].includes(args.easing)) {
          updates.easing = args.easing;
        }

        activeBridge.openVideoDrawer?.();
        activeBridge.updateVideoSettings?.(updates);
        triggerHighlight('video');
        activeBridge.showToast('Agent: Video Settings', 'Configured storyboard video parameters.', 'info');

        return {
          ok: true,
          state: updates,
        };
      }

      case 'apply_video_preset': {
        const preset = args?.preset;
        const validPresets = ['Instagram Reel', 'Story Slideshow', 'YouTube Storyboard', 'Square Post'];
        if (!preset || !validPresets.includes(preset)) {
          return {
            ok: false,
            error: `Invalid preset. Must be one of: ${validPresets.join(', ')}`,
          };
        }

        activeBridge.openVideoDrawer?.();
        activeBridge.applyVideoPreset?.(preset);
        triggerHighlight('video');
        activeBridge.showToast('Agent: Video Preset', `Applied "${preset}" settings.`, 'info');

        return {
          ok: true,
          state: { preset },
        };
      }

      case 'set_slide_motion': {
        const motion = args?.motion;
        const validMotions = ['none', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'pan_up', 'pan_down', 'random'];
        if (!motion || !validMotions.includes(motion)) {
          return {
            ok: false,
            error: `Invalid motion style. Must be one of: ${validMotions.join(', ')}`,
          };
        }

        const applyToAll = Boolean(args?.applyToAll);
        const slideIndex = typeof args?.slideIndex === 'number' ? Math.max(0, args.slideIndex) : undefined;

        activeBridge.openVideoDrawer?.();
        activeBridge.setSlideMotion?.({ slideIndex, motion, applyToAll });
        triggerHighlight('video');
        activeBridge.showToast(
          'Agent: Slide Motion',
          applyToAll ? `Set "${motion}" across all slides.` : `Set "${motion}" on slide #${slideIndex}.`,
          'info'
        );

        return {
          ok: true,
          state: { motion, slideIndex, applyToAll },
        };
      }

      case 'set_slide_caption': {
        const slideIndex = Number(args?.slideIndex);
        const text = args?.text;
        if (!Number.isInteger(slideIndex) || slideIndex < 0) {
          return {
            ok: false,
            error: 'Parameter "slideIndex" must be a non-negative integer.',
          };
        }
        if (typeof text !== 'string') {
          return {
            ok: false,
            error: 'Parameter "text" must be a string.',
          };
        }

        const position = ['top', 'bottom'].includes(args?.position) ? args.position : 'bottom';
        const size = ['small', 'medium', 'large'].includes(args?.size) ? args.size : 'medium';
        const color = typeof args?.color === 'string' ? args.color : '#FFFFFF';

        activeBridge.openVideoDrawer?.();
        activeBridge.setSlideCaption?.({ slideIndex, text, position, size, color });
        triggerHighlight('video');
        activeBridge.showToast('Agent: Slide Caption', `Updated caption on slide #${slideIndex}.`, 'info');

        return {
          ok: true,
          state: { slideIndex, text, position, size, color },
        };
      }

      case 'preview_video': {
        const action = args?.action;
        if (!['play', 'pause', 'seek'].includes(action)) {
          return {
            ok: false,
            error: 'Parameter "action" must be one of: "play", "pause", "seek".',
          };
        }

        activeBridge.openVideoDrawer?.();
        activeBridge.previewVideo?.({ action, time: args?.time });
        triggerHighlight('video');
        activeBridge.showToast('Agent: Video Preview', `Action: ${action}`, 'info');

        return {
          ok: true,
          state: { action, time: args?.time },
        };
      }

      case 'render_video': {
        const info = activeBridge.getImageInfo();
        if (!info) {
          return {
            ok: false,
            error: 'Cannot render video: No image is currently loaded.',
          };
        }

        const slices = activeBridge.getSlices();
        if (!slices || slices.length === 0) {
          return {
            ok: false,
            error: 'No slices available to render as video storyboard.',
          };
        }

        activeBridge.openVideoDrawer?.();

        const request = {
          id: `video-${Date.now()}`,
          timestamp: Date.now(),
          type: 'video' as const,
          sliceCount: slices.length,
          filename: 'splitpro-video.mp4',
        };

        setPendingExport(request);
        activeBridge.showToast('Agent: Video Render Requested', 'Agent requested video export. Please confirm in the dialog.', 'info');

        return {
          ok: true,
          state: {
            status: 'pending_user_gesture',
            message: 'Agent wants to render and export video. Awaiting human confirmation in UI.',
            filename: 'splitpro-video.mp4',
            sliceCount: slices.length,
          },
        };
      }

      case 'cancel_render': {
        activeBridge.cancelRenderVideo?.();
        activeBridge.showToast('Agent: Cancelled Video Render', 'Stopped active render process.', 'info');
        return {
          ok: true,
          state: { cancelled: true },
        };
      }

      case 'undo': {
        activeBridge.undo();
        triggerHighlight('controls');
        activeBridge.showToast('Agent: Undo', 'Reverted previous action.', 'info');
        return { ok: true, state: 'undone' };
      }

      case 'redo': {
        activeBridge.redo();
        triggerHighlight('controls');
        activeBridge.showToast('Agent: Redo', 'Reapplied action.', 'info');
        return { ok: true, state: 'redone' };
      }

      case 'reset': {
        activeBridge.reset();
        triggerHighlight('controls');
        activeBridge.showToast('Agent: Reset', 'Settings reset to default.', 'info');
        return { ok: true, state: 'reset' };
      }

      default:
        return {
          ok: false,
          error: `Unknown tool: "${name}".`,
        };
    }
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || String(err),
    };
  }
}

// Global execution wrapper that logs calls and handles exceptions safely
export async function executeAgentTool(name: string, args: any = {}): Promise<AgentToolResult> {
  const result = await executeToolInternal(name as ToolName, args);
  recordLog(name, args, result);
  return result;
}

// Generate prompt text for Claude / ChatGPT
export function generateAgentPrompt(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vistaroai.app';
  const toolsFormatted = AGENT_TOOLS.map(
    (t) => `- \`${t.name}(${Object.keys(t.inputSchema.properties || {}).join(', ')})\`: ${t.description}`
  ).join('\n');

  return `You are operating VistaroAI (Web-based Ultra-HD Image Slicing & Storyboard Video Suite).
App URL: ${origin}

VistaroAI supports programmatic browser control via WebMCP tools and window.VistaroAI (with window.SplitPro alias):

AVAILABLE TOOLS:
${toolsFormatted}

RECOMMENDED WORKFLOW:
1. load_image({ source: "clipboard" | "url" | "file_picker", url?: string })
2. get_image_info()
3. suggest_layouts()
4. set_split_mode({ mode: "auto" | "grid" | "vertical" | "horizontal" | "custom" })
5. set_grid({ rows, columns }) or set_spacing(...) or set_sequence(...)
6. set_naming_convention({ pattern: "{row}-{col}_{timestamp}" })
7. set_output({ resolution: "8k" | "4k" | "2k" | "native", format: "png" | "jpg" | "webp", quality, sharpness })
8. preview_slices()
9. export_zip() (Triggers UI confirmation for the human user to allow download)
10. Video Storyboard: apply_video_preset({ preset: "Instagram Reel" }) -> set_slide_motion(...) -> preview_video({ action: "play" }) -> render_video()

All image slicing and video rendering runs 100% locally in the browser with high-fidelity canvas processing. Every agent action is logged, visible in the UI, and reversible via undo().`;
}

// Generate tools JSON representation (standard WebMCP)
export function generateToolsJson(): string {
  return JSON.stringify(AGENT_TOOLS, null, 2);
}

// Generate ChatGPT Function Calling / Custom GPT Actions JSON schema
export function generateChatGPTToolsJson(): string {
  const tools = AGENT_TOOLS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.inputSchema?.properties || {},
        required: tool.inputSchema?.required || [],
      },
    },
  }));
  return JSON.stringify(tools, null, 2);
}

// Generate Anthropic Claude Tool Use JSON schema
export function generateClaudeToolsJson(): string {
  const tools = AGENT_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: tool.inputSchema?.properties || {},
      required: tool.inputSchema?.required || [],
    },
  }));
  return JSON.stringify(tools, null, 2);
}

// Generate copyable browser console / Playwright / Puppeteer script snippet
export function generateExternalAgentScript(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return `/**
 * VistaroAI External Agent Bridge (ChatGPT / Claude / Playwright)
 * Connects directly to window.VistaroAI / window.SplitPro / window.mcp
 */
(async () => {
  console.log("🚀 Connected to VistaroAI Agent Bridge at ${origin}");
  
  // 1. Inspect registered tools
  const tools = window.VistaroAI.list();
  console.log(\`✅ Registered \${tools.length} local canvas tools\`);

  // 2. Load demo image or canvas
  await window.VistaroAI.call("load_image", {
    source: "url",
    url: "https://www.vistaroai.online/sample_anime_storyboard.png"
  });

  // 3. Configure 3x3 Instagram Mosaic Grid & 8K Ultra-HD Output
  await window.VistaroAI.call("set_grid", { rows: 3, columns: 3 });
  await window.VistaroAI.call("set_output", { 
    resolution: "8k", 
    format: "png", 
    sharpness: "studio8k" 
  });
  
  // 4. Calculate coordinates & preview
  const preview = await window.VistaroAI.call("preview_slices");
  console.log("📐 Slices ready:", preview);
})();`;
}

// Initialize WebMCP, window.VistaroAI, and external agent bridges
export function initializeWebMcpTools() {
  const toolMap: Record<string, AgentToolDefinition> = {};

  AGENT_TOOLS.forEach((tool) => {
    const def: AgentToolDefinition = {
      ...tool,
      execute: (args?: any) => executeAgentTool(tool.name, args),
    };
    toolMap[tool.name] = def;

    // Register with navigator.modelContext if browser environment supports it
    if (typeof navigator !== 'undefined' && navigator.modelContext?.registerTool) {
      try {
        navigator.modelContext.registerTool({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: (args?: any) => executeAgentTool(tool.name, args),
        });
      } catch (err) {
        console.warn(`WebMCP tool registration for "${tool.name}" failed:`, err);
      }
    }
  });

  // Expose on window globals for external agents (ChatGPT, Claude, Puppeteer, Extensions)
  if (typeof window !== 'undefined') {
    const api = {
      tools: toolMap,
      list: () => AGENT_TOOLS,
      call: (name: string, args?: any) => executeAgentTool(name, args),
      isPaused: () => agentState.isPaused,
      setPaused: (paused: boolean) => setAgentPaused(paused),
      getLogs: () => agentState.logs,
      clearLogs: () => clearActivityLogs(),
    };
    window.VistaroAI = api;
    window.SplitPro = api;

    // Standard Model Context Protocol (MCP) browser shim
    window.mcp = {
      listTools: () => AGENT_TOOLS,
      callTool: (name: string, args?: any) => executeAgentTool(name, args),
    };

    // Dedicated shims for ChatGPT and Claude extensions / browser scripts
    window.chatgptAgent = {
      tools: AGENT_TOOLS.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.inputSchema },
      })),
      execute: (name: string, args?: any) => executeAgentTool(name, args),
      list: () => AGENT_TOOLS,
    };

    window.claudeAgent = {
      tools: AGENT_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })),
      execute: (name: string, args?: any) => executeAgentTool(name, args),
      list: () => AGENT_TOOLS,
    };

    // Attach bi-directional window postMessage listener for cross-context automation
    if (!window.__vistaro_agent_listener_attached) {
      window.__vistaro_agent_listener_attached = true;

      window.addEventListener('message', async (event: MessageEvent) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        // Support:
        // 1. { type: 'VISTARO_AGENT_CALL', id, tool, args }
        // 2. { action: 'vistaro_agent_call', tool, args, id }
        // 3. JSON-RPC format: { jsonrpc: '2.0', id, method, params }
        if (
          data.type === 'VISTARO_AGENT_CALL' ||
          data.action === 'vistaro_agent_call' ||
          data.jsonrpc === '2.0'
        ) {
          const toolName = data.tool || data.name || data.method;
          const args = data.args || data.params || {};
          const reqId = data.id || `msg-${Date.now()}`;

          if (!toolName) return;

          try {
            const result = await executeAgentTool(toolName, args);
            const responsePayload = {
              type: 'VISTARO_AGENT_RESPONSE',
              jsonrpc: data.jsonrpc ? '2.0' : undefined,
              id: reqId,
              tool: toolName,
              ok: result.ok,
              result: result.result || result.state,
              message: result.message,
              error: result.error,
            };

            if (event.source && typeof (event.source as any).postMessage === 'function') {
              (event.source as any).postMessage(responsePayload, '*');
            } else {
              window.postMessage(responsePayload, '*');
            }

            window.dispatchEvent(
              new CustomEvent('vistaro-agent-response', { detail: responsePayload })
            );
          } catch (err: any) {
            const errPayload = {
              type: 'VISTARO_AGENT_RESPONSE',
              id: reqId,
              tool: toolName,
              ok: false,
              error: err?.message || String(err),
            };
            window.postMessage(errPayload, '*');
          }
        } else if (data.type === 'VISTARO_AGENT_LIST_TOOLS' || data.action === 'list_tools') {
          const listPayload = {
            type: 'VISTARO_AGENT_TOOLS_LIST',
            id: data.id,
            tools: AGENT_TOOLS,
            isPaused: agentState.isPaused,
          };
          if (event.source && typeof (event.source as any).postMessage === 'function') {
            (event.source as any).postMessage(listPayload, '*');
          } else {
            window.postMessage(listPayload, '*');
          }
        }
      });

      // Custom DOM Event bridge:
      // window.dispatchEvent(new CustomEvent('vistaro-agent-call', { detail: { tool: 'set_grid', args: { rows: 2, columns: 2 } } }))
      window.addEventListener('vistaro-agent-call', async (e: any) => {
        const detail = e.detail;
        if (!detail || !detail.tool) return;
        const result = await executeAgentTool(detail.tool, detail.args || {});
        window.dispatchEvent(
          new CustomEvent('vistaro-agent-result', {
            detail: { id: detail.id, tool: detail.tool, ...result },
          })
        );
      });

      // WebSocket Bridge connection to local Vistaro MCP Server (port 3001)
      let mcpWs: WebSocket | null = null;
      let reconnectTimer: any = null;

      const initMcpWebSocket = () => {
        if (typeof window === 'undefined' || !window.WebSocket) return;
        try {
          mcpWs = new WebSocket('ws://localhost:3001');

          mcpWs.onopen = () => {
            console.log('[Vistaro MCP Bridge] Connected to MCP WebSocket server on ws://localhost:3001');
          };

          mcpWs.onmessage = async (event: MessageEvent) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === 'VISTARO_MCP_CALL' && msg.requestId && msg.tool) {
                const res = await executeAgentTool(msg.tool, msg.args || {});
                if (mcpWs && mcpWs.readyState === WebSocket.OPEN) {
                  mcpWs.send(
                    JSON.stringify({
                      type: 'VISTARO_MCP_RESULT',
                      requestId: msg.requestId,
                      result: res,
                    })
                  );
                }
              }
            } catch (err) {
              console.warn('[Vistaro MCP Bridge] Error processing MCP message:', err);
            }
          };

          mcpWs.onclose = () => {
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(initMcpWebSocket, 5000);
          };

          mcpWs.onerror = () => {
            mcpWs?.close();
          };
        } catch {
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(initMcpWebSocket, 10000);
        }
      };

      initMcpWebSocket();
    }
  }
}
