import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { dispatchToBrowser } from './bridge.js';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, z.ZodTypeAny>;
  handler: (args: any) => Promise<any>;
}

export const toolsCatalog: ToolDefinition[] = [
  {
    name: 'vistaro_get_workspace_state',
    description:
      'Get current VistaroAI workspace state including loaded image dimensions, active grid rows and columns, slice count, and current panels.',
    schema: {},
    handler: async () => dispatchToBrowser('get_image_info'),
  },
  {
    name: 'vistaro_set_grid',
    description: 'Configure precision slicing grid rows and columns on the loaded image in VistaroAI.',
    schema: {
      rows: z.number().min(1).max(50).describe('Number of horizontal slice rows'),
      columns: z.number().min(1).max(50).describe('Number of vertical slice columns'),
    },
    handler: async (args: { rows: number; columns: number }) =>
      dispatchToBrowser('set_grid', args),
  },
  {
    name: 'vistaro_set_spacing',
    description: 'Configure spacing or border gap between slices in pixels.',
    schema: {
      spacing: z.number().min(0).max(100).describe('Gap spacing in pixels'),
    },
    handler: async (args: { spacing: number }) => dispatchToBrowser('set_spacing', args),
  },
  {
    name: 'vistaro_set_output',
    description:
      'Configure export resolution (original, 2k, 4k, 8k), image format (png, jpeg, webp), and sharpness filter level.',
    schema: {
      resolution: z
        .enum(['original', '2k', '4k', '8k', 'custom'])
        .optional()
        .describe('Target export resolution'),
      format: z.enum(['png', 'jpeg', 'webp']).optional().describe('Target image encoding format'),
      sharpness: z
        .enum(['off', 'subtle', 'crisp', 'ultra', 'studio8k'])
        .optional()
        .describe('Unsharp masking level'),
    },
    handler: async (args: any) => dispatchToBrowser('set_output', args),
  },
  {
    name: 'vistaro_suggest_layouts',
    description:
      'Apply pre-configured storyboard and social layouts (e.g. 3x1 Instagram seamless carousel, 3x3 grid, comic sequence).',
    schema: {
      intent: z
        .enum([
          'carousel_instagram',
          'grid_3x3',
          'grid_2x2',
          'storyboard_horizontal',
          'storyboard_vertical',
          'custom',
        ])
        .optional()
        .describe('Intended design layout type'),
    },
    handler: async (args: any) => dispatchToBrowser('suggest_layouts', args),
  },
  {
    name: 'vistaro_reorder_panels',
    description:
      'Reorder current slice panels or storyboard panels by passing an array of new 0-based indices.',
    schema: {
      newOrder: z.array(z.number()).describe('Array of 0-based panel indices representing desired order'),
    },
    handler: async (args: { newOrder: number[] }) => dispatchToBrowser('reorder_slices', args),
  },
  {
    name: 'vistaro_rename_panel',
    description: 'Rename a specific slice or panel for exported filename tagging.',
    schema: {
      index: z.number().min(0).describe('0-based index of panel to rename'),
      newName: z.string().describe('New custom label or filename for panel'),
    },
    handler: async (args: { index: number; newName: string }) =>
      dispatchToBrowser('rename_slice', args),
  },
  {
    name: 'vistaro_export_batch_zip',
    description: 'Initiate batch ZIP packaging and browser download of all current sliced panels.',
    schema: {
      filename: z.string().optional().describe('Custom filename prefix for downloaded ZIP archive'),
    },
    handler: async (args: any) => dispatchToBrowser('export_zip', args),
  },
  {
    name: 'vistaro_video_motion_studio',
    description:
      'Configure storyboard motion video settings and render video slices into an MP4 video using in-browser WebCodecs.',
    schema: {
      fps: z.number().min(12).max(60).optional().describe('Video frames per second (default 30)'),
      durationPerSlide: z
        .number()
        .min(0.5)
        .max(10)
        .optional()
        .describe('Duration per slide in seconds (default 2)'),
      motionPreset: z
        .enum(['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'none'])
        .optional()
        .describe('Camera pan or zoom motion preset'),
    },
    handler: async (args: any) => dispatchToBrowser('set_video_settings', args),
  },
  {
    name: 'vistaro_undo',
    description: 'Undo the previous workspace adjustment in VistaroAI.',
    schema: {},
    handler: async () => dispatchToBrowser('undo'),
  },
  {
    name: 'vistaro_redo',
    description: 'Redo the previously undone workspace adjustment in VistaroAI.',
    schema: {},
    handler: async () => dispatchToBrowser('redo'),
  },
  {
    name: 'vistaro_reset_workspace',
    description: 'Reset the entire VistaroAI workspace back to default settings.',
    schema: {},
    handler: async () => dispatchToBrowser('reset'),
  },
  {
    name: 'vistaro_preview_slices',
    description:
      'Inspect all currently calculated slice panels with their sub-pixel coordinates (x, y, width, height) and filenames.',
    schema: {},
    handler: async () => dispatchToBrowser('preview_slices'),
  },
  {
    name: 'vistaro_load_sample',
    description:
      'Load a pre-rendered high-resolution vector anime artwork sample into the Vistaro canvas ("cyberpunk" or "panorama").',
    schema: {
      sampleType: z
        .enum(['cyberpunk', 'panorama'])
        .describe('Type of sample artwork to load into canvas'),
    },
    handler: async (args: { sampleType: 'cyberpunk' | 'panorama' }) =>
      dispatchToBrowser('load_sample', args),
  },
  {
    name: 'vistaro_detect_borders',
    description:
      'Run the Web Worker intelligent border detection algorithm on the loaded image to auto-detect comic/manga panel boundaries.',
    schema: {},
    handler: async () => dispatchToBrowser('detect_borders'),
  },
  {
    name: 'vistaro_capture_canvas_preview',
    description:
      'Capture a visual snapshot of the active canvas with slice grid lines overlaid, returning an image preview data URL for multimodal visual inspection.',
    schema: {},
    handler: async () => dispatchToBrowser('capture_canvas_preview'),
  },
  {
    name: 'vistaro_smart_platform_preset',
    description:
      'Automatically configure canvas layout, aspect ratio, rows, columns, and quality presets optimized for specific social platforms (Instagram Carousel, Instagram 3x3 Mosaic, TikTok/Reel 9:16 vertical, Discord 2x2, Webtoon Strip).',
    schema: {
      platform: z
        .enum([
          'instagram_carousel',
          'instagram_mosaic_9',
          'tiktok_reel',
          'discord_quad',
          'webtoon_strip',
        ])
        .describe('Target social media platform layout'),
    },
    handler: async (args: any) => dispatchToBrowser('smart_platform_preset', args),
  },
  {
    name: 'vistaro_batch_pipeline',
    description:
      'Execute a multi-step sequence of canvas adjustments sequentially in a single compound atomic transaction.',
    schema: {
      steps: z
        .array(
          z.object({
            tool: z.string().describe('Tool name to execute in pipeline'),
            args: z.record(z.string(), z.any()).optional().describe('Arguments for tool'),
          })
        )
        .describe('List of sequential tool steps to execute'),
    },
    handler: async (args: any) => dispatchToBrowser('batch_pipeline', args),
  },
];

export function registerMcpTools(server: McpServer) {
  for (const tool of toolsCatalog) {
    server.tool(tool.name, tool.description, tool.schema, async (args: any) => {
      const result = await tool.handler(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    });
  }
}
