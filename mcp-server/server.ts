import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';

const WS_PORT = parseInt(process.env.VISTARO_WS_PORT || '3001', 10);

// Initialize MCP Server
const server = new McpServer({
  name: 'vistaro-ai',
  version: '1.0.0',
});

// WebSocket Server for live browser communication
let wss: WebSocketServer | null = null;
const activeClients = new Set<WebSocket>();
const pendingRequests = new Map<
  string,
  {
    resolve: (val: any) => void;
    reject: (err: any) => void;
    timer: NodeJS.Timeout;
  }
>();

try {
  wss = new WebSocketServer({ port: WS_PORT });

  wss.on('connection', (ws) => {
    activeClients.add(ws);
    // Send welcome/handshake
    ws.send(JSON.stringify({ type: 'VISTARO_MCP_CONNECTED', timestamp: Date.now() }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'VISTARO_MCP_RESULT' && msg.requestId) {
          const pending = pendingRequests.get(msg.requestId);
          if (pending) {
            clearTimeout(pending.timer);
            pendingRequests.delete(msg.requestId);
            if (msg.error) {
              pending.reject(new Error(msg.error));
            } else {
              pending.resolve(msg.result);
            }
          }
        }
      } catch (err) {
        // Silently ignore malformed frames
      }
    });

    ws.on('close', () => {
      activeClients.delete(ws);
    });

    ws.on('error', () => {
      activeClients.delete(ws);
    });
  });

  wss.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Vistaro MCP] Port ${WS_PORT} is already in use. Retrying or running in headless mode.`);
    } else {
      console.error('[Vistaro MCP] WebSocket server error:', err);
    }
  });
} catch (err) {
  console.error('[Vistaro MCP] Failed to start WebSocket server:', err);
}

/**
 * Dispatch tool execution to connected Vistaro web client
 */
async function dispatchToBrowser(tool: string, args: Record<string, any> = {}): Promise<any> {
  if (activeClients.size === 0) {
    return {
      success: false,
      status: 'no_client_connected',
      message:
        'VistaroAI browser client is not connected. Please open http://localhost:3000 or https://www.vistaroai.online in your browser to execute live canvas operations.',
      tool,
      args,
    };
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      resolve({
        success: false,
        status: 'timeout',
        message: `Operation '${tool}' timed out waiting for response from VistaroAI browser window.`,
      });
    }, 15000);

    pendingRequests.set(requestId, { resolve, reject, timer });

    const payload = JSON.stringify({
      type: 'VISTARO_MCP_CALL',
      requestId,
      tool,
      args,
    });

    for (const client of activeClients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  });
}

// ==========================================
// Register MCP Tools
// ==========================================

// 1. Get Workspace State
server.tool(
  'vistaro_get_workspace_state',
  'Get current VistaroAI workspace state including loaded image dimensions, active grid rows and columns, slice count, and current panels.',
  {},
  async () => {
    const result = await dispatchToBrowser('get_image_info');
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 2. Set Slicing Grid
server.tool(
  'vistaro_set_grid',
  'Configure precision slicing grid rows and columns on the loaded image in VistaroAI.',
  {
    rows: z.number().min(1).max(50).describe('Number of horizontal slice rows'),
    columns: z.number().min(1).max(50).describe('Number of vertical slice columns'),
  },
  async ({ rows, columns }) => {
    const result = await dispatchToBrowser('set_grid', { rows, columns });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 3. Set Spacing / Gap
server.tool(
  'vistaro_set_spacing',
  'Configure spacing or border gap between slices in pixels.',
  {
    spacing: z.number().min(0).max(100).describe('Gap spacing in pixels'),
  },
  async ({ spacing }) => {
    const result = await dispatchToBrowser('set_spacing', { spacing });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 4. Set Output Quality & Format
server.tool(
  'vistaro_set_output',
  'Configure export resolution (original, 2k, 4k, 8k), image format (png, jpeg, webp), and sharpness filter level.',
  {
    resolution: z.enum(['original', '2k', '4k', '8k', 'custom']).optional().describe('Target export resolution'),
    format: z.enum(['png', 'jpeg', 'webp']).optional().describe('Target image encoding format'),
    sharpness: z.enum(['off', 'subtle', 'crisp', 'ultra', 'studio8k']).optional().describe('Unsharp masking level'),
  },
  async (args) => {
    const result = await dispatchToBrowser('set_output', args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 5. Suggest Layout Presets
server.tool(
  'vistaro_suggest_layouts',
  'Apply pre-configured storyboard and social layouts (e.g. 3x1 Instagram seamless carousel, 3x3 grid, comic sequence).',
  {
    intent: z.enum(['carousel_instagram', 'grid_3x3', 'grid_2x2', 'storyboard_horizontal', 'storyboard_vertical', 'custom'])
      .optional()
      .describe('Intended design layout type'),
  },
  async (args) => {
    const result = await dispatchToBrowser('suggest_layouts', args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 6. Reorder Slices / Panels
server.tool(
  'vistaro_reorder_panels',
  'Reorder current slice panels or storyboard panels by passing an array of new 0-based indices.',
  {
    newOrder: z.array(z.number()).describe('Array of 0-based panel indices representing desired order'),
  },
  async ({ newOrder }) => {
    const result = await dispatchToBrowser('reorder_slices', { newOrder });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 7. Rename Slice / Panel
server.tool(
  'vistaro_rename_panel',
  'Rename a specific slice or panel for exported filename tagging.',
  {
    index: z.number().min(0).describe('0-based index of panel to rename'),
    newName: z.string().describe('New custom label or filename for panel'),
  },
  async ({ index, newName }) => {
    const result = await dispatchToBrowser('rename_slice', { index, newName });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 8. Export Batch ZIP
server.tool(
  'vistaro_export_batch_zip',
  'Initiate batch ZIP packaging and browser download of all current sliced panels.',
  {
    filename: z.string().optional().describe('Custom filename prefix for downloaded ZIP archive'),
  },
  async (args) => {
    const result = await dispatchToBrowser('export_zip', args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 9. Motion Video Studio Configuration
server.tool(
  'vistaro_video_motion_studio',
  'Configure storyboard motion video settings and render video slices into an MP4 video using in-browser WebCodecs.',
  {
    fps: z.number().min(12).max(60).optional().describe('Video frames per second (default 30)'),
    durationPerSlide: z.number().min(0.5).max(10).optional().describe('Duration per slide in seconds (default 2)'),
    motionPreset: z.enum(['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'none']).optional().describe('Camera pan or zoom motion preset'),
  },
  async (args) => {
    const result = await dispatchToBrowser('set_video_settings', args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 10. Undo Last Action
server.tool(
  'vistaro_undo',
  'Undo the previous workspace adjustment in VistaroAI.',
  {},
  async () => {
    const result = await dispatchToBrowser('undo');
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 11. Redo Action
server.tool(
  'vistaro_redo',
  'Redo the previously undone workspace adjustment in VistaroAI.',
  {},
  async () => {
    const result = await dispatchToBrowser('redo');
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 12. Reset Workspace
server.tool(
  'vistaro_reset_workspace',
  'Reset the entire VistaroAI workspace back to default settings.',
  {},
  async () => {
    const result = await dispatchToBrowser('reset');
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 13. Preview Slices & Sub-Pixel Coordinates
server.tool(
  'vistaro_preview_slices',
  'Inspect all currently calculated slice panels with their sub-pixel coordinates (x, y, width, height) and filenames.',
  {},
  async () => {
    const result = await dispatchToBrowser('preview_slices');
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 14. Load Pre-Rendered Vector Sample Artwork
server.tool(
  'vistaro_load_sample',
  'Load a pre-rendered high-resolution vector anime artwork sample into the Vistaro canvas ("cyberpunk" or "panorama").',
  {
    sampleType: z.enum(['cyberpunk', 'panorama']).describe('Type of sample artwork to load into canvas'),
  },
  async ({ sampleType }) => {
    const result = await dispatchToBrowser('load_sample', { sampleType });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// 15. Intelligent Border & Panel Detection
server.tool(
  'vistaro_detect_borders',
  'Run the Web Worker intelligent border detection algorithm on the loaded image to auto-detect comic/manga panel boundaries.',
  {},
  async () => {
    const result = await dispatchToBrowser('detect_borders');
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Connect stdio transport and launch
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[Vistaro MCP] Server running on stdio (WebSocket bridge on ws://localhost:${WS_PORT})`);
}

main().catch((err) => {
  console.error('[Vistaro MCP] Fatal error starting server:', err);
  process.exit(1);
});
