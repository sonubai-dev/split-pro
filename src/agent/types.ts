export type ToolName =
  | 'load_image'
  | 'get_image_info'
  | 'suggest_layouts'
  | 'set_split_mode'
  | 'set_grid'
  | 'set_spacing'
  | 'set_sequence'
  | 'set_custom_lines'
  | 'set_output'
  | 'set_naming_convention'
  | 'preview_slices'
  | 'reorder_slices'
  | 'rename_slice'
  | 'export_zip'
  | 'set_video_settings'
  | 'apply_video_preset'
  | 'set_slide_motion'
  | 'set_slide_caption'
  | 'preview_video'
  | 'render_video'
  | 'cancel_render'
  | 'undo'
  | 'redo'
  | 'reset';

export interface AgentToolResult<T = any> {
  ok: boolean;
  state?: T;
  result?: T;
  error?: string;
  message?: string;
}

export interface AgentToolMetadata {
  name: ToolName;
  description: string;
  inputSchema: Record<string, any>;
}

export interface AgentToolDefinition extends AgentToolMetadata {
  execute: (args?: any) => Promise<AgentToolResult> | AgentToolResult;
}

export interface ActivityLogItem {
  id: string;
  time: string;
  tool: ToolName | string;
  args?: any;
  ok: boolean;
  message?: string;
  error?: string;
}

export interface PendingExportRequest {
  id: string;
  timestamp: number;
  type?: 'zip' | 'video';
  sliceCount: number;
  filename: string;
}

export interface AgentAccessState {
  isPaused: boolean;
  toolToggles: Record<ToolName, boolean>;
  logs: ActivityLogItem[];
  pendingExportRequest: PendingExportRequest | null;
  activeHighlight: string | null;
}

export interface AgentBridgeMethods {
  // Image operations
  loadImageFromUrl: (url: string) => Promise<void>;
  loadImageFromClipboard: () => Promise<void>;
  triggerFilePicker: () => void;
  getImageInfo: () => {
    name: string;
    width: number;
    height: number;
    size: number;
    type: string;
    aspectRatio: string;
  } | null;

  // Settings & actions
  getSettings: () => any;
  updateSettings: (updater: any) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  getSlices: () => any[];
  getGeneratedPanels: () => any[];
  reorderPanels: (newOrder: number[]) => void;
  renamePanel: (index: number, newName: string) => void;
  triggerExportZip: () => Promise<void>;

  // Video storyboard automation
  openVideoDrawer?: () => void;
  closeVideoDrawer?: () => void;
  getVideoSettings?: () => any;
  updateVideoSettings?: (updates: any) => void;
  applyVideoPreset?: (presetName: string) => void;
  setSlideMotion?: (args: { slideIndex?: number; motion: string; applyToAll?: boolean }) => void;
  setSlideCaption?: (args: {
    slideIndex: number;
    text: string;
    position?: 'top' | 'bottom';
    size?: 'small' | 'medium' | 'large';
    color?: string;
  }) => void;
  previewVideo?: (args: { action: 'play' | 'pause' | 'seek'; time?: number }) => void;
  triggerRenderVideo?: () => Promise<void>;
  cancelRenderVideo?: () => void;
  isRenderingVideo?: () => boolean;

  // UI feedback
  showToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  setHighlight: (target: string | null) => void;
}
