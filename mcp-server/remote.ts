import express, { Request, Response, NextFunction } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { bridge, dispatchToBrowser } from './bridge.js';
import { registerMcpTools, toolsCatalog } from './tools.js';
import { getOpenApiSpec } from './openapi.js';

const app = express();
const PORT = parseInt(process.env.PORT || process.env.VISTARO_REMOTE_PORT || '3002', 10);
const API_KEY = process.env.VISTARO_API_KEY;

// Initialize WebSocket Bridge for browser canvas communication
bridge.init();

// Middleware
app.use(express.json());

// Universal CORS Middleware for remote webhooks & cross-origin agents
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Vistaro-Key'
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Optional API Key Authentication Middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!API_KEY) {
    return next(); // Open development mode
  }

  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-vistaro-key'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : customHeader;

  if (token === API_KEY) {
    return next();
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Invalid or missing Vistaro API Key in Authorization header or X-Vistaro-Key.',
  });
};

// =========================================================================
// Health & System Info
// =========================================================================
app.get('/health', (_req: Request, res: Response) => {
  const status = bridge.getStatus();
  res.json({
    status: 'healthy',
    service: 'VistaroAI Remote MCP & REST Bridge',
    version: '1.0.0',
    uptime: process.uptime(),
    activeBrowserTabs: status.connectedClients,
    webSocketPort: status.wsPort,
    port: PORT,
    timestamp: new Date().toISOString(),
    apiAuthEnabled: Boolean(API_KEY),
  });
});

// =========================================================================
// OpenAPI 3.1.0 Specification for OpenAI Custom GPT Actions
// =========================================================================
app.get('/openapi.json', (req: Request, res: Response) => {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const serverUrl = `${protocol}://${host}`;
  const spec = getOpenApiSpec(serverUrl);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(spec, null, 2));
});

// =========================================================================
// Remote MCP SSE (Server-Sent Events) Transport
// Compatible with Claude Mobile, Remote Web Agents, and MCP Proxies
// =========================================================================
const sseTransports = new Map<string, SSEServerTransport>();

app.get('/sse', async (_req: Request, res: Response) => {
  console.log('[Vistaro Remote MCP] Incoming SSE connection request');

  const sseTransport = new SSEServerTransport('/message', res);
  const sessionId = sseTransport.sessionId;
  sseTransports.set(sessionId, sseTransport);

  const mcpServer = new McpServer({
    name: 'vistaro-ai-remote',
    version: '1.0.0',
  });

  registerMcpTools(mcpServer);

  res.on('close', () => {
    console.log(`[Vistaro Remote MCP] SSE connection closed for session: ${sessionId}`);
    sseTransports.delete(sessionId);
  });

  try {
    await mcpServer.connect(sseTransport);
  } catch (err) {
    console.error('[Vistaro Remote MCP] Error connecting SSE transport:', err);
  }
});

app.post('/message', async (req: Request, res: Response) => {
  const sessionId = (req.query.sessionId as string) || '';
  const transport = sseTransports.get(sessionId);

  if (!transport) {
    res.status(404).json({
      error: 'Session not found',
      message: `No active SSE transport found for session '${sessionId}'`,
    });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// =========================================================================
// OpenAI Custom GPT REST Action Endpoints
// =========================================================================

// Helper for consistent tool execution response
async function handleAction(toolName: string, args: any, res: Response) {
  try {
    const result = await dispatchToBrowser(toolName, args);
    res.json({
      success: result?.success !== false,
      tool: toolName,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Execution failed',
      tool: toolName,
    });
  }
}

app.get('/api/v1/workspace/state', authMiddleware, async (_req, res) => {
  await handleAction('get_image_info', {}, res);
});

app.post('/api/v1/workspace/state', authMiddleware, async (_req, res) => {
  await handleAction('get_image_info', {}, res);
});

app.post('/api/v1/workspace/grid', authMiddleware, async (req, res) => {
  await handleAction('set_grid', req.body, res);
});

app.post('/api/v1/workspace/spacing', authMiddleware, async (req, res) => {
  await handleAction('set_spacing', req.body, res);
});

app.post('/api/v1/workspace/output', authMiddleware, async (req, res) => {
  await handleAction('set_output', req.body, res);
});

app.post('/api/v1/workspace/layouts', authMiddleware, async (req, res) => {
  await handleAction('suggest_layouts', req.body, res);
});

app.post('/api/v1/workspace/reorder', authMiddleware, async (req, res) => {
  await handleAction('reorder_slices', req.body, res);
});

app.post('/api/v1/workspace/rename', authMiddleware, async (req, res) => {
  await handleAction('rename_slice', req.body, res);
});

app.post('/api/v1/workspace/export', authMiddleware, async (req, res) => {
  await handleAction('export_zip', req.body, res);
});

app.post('/api/v1/workspace/video', authMiddleware, async (req, res) => {
  await handleAction('set_video_settings', req.body, res);
});

app.post('/api/v1/workspace/undo', authMiddleware, async (_req, res) => {
  await handleAction('undo', {}, res);
});

app.post('/api/v1/workspace/redo', authMiddleware, async (_req, res) => {
  await handleAction('redo', {}, res);
});

app.post('/api/v1/workspace/reset', authMiddleware, async (_req, res) => {
  await handleAction('reset', {}, res);
});

app.post('/api/v1/workspace/preview', authMiddleware, async (_req, res) => {
  await handleAction('preview_slices', {}, res);
});

app.post('/api/v1/workspace/sample', authMiddleware, async (req, res) => {
  await handleAction('load_sample', req.body, res);
});

app.post('/api/v1/workspace/detect-borders', authMiddleware, async (_req, res) => {
  await handleAction('detect_borders', {}, res);
});

// Generic Tool Execution Fallback
app.post('/api/v1/execute', authMiddleware, async (req, res) => {
  const { tool, args } = req.body || {};
  if (!tool) {
    res.status(400).json({ success: false, error: 'Missing required field: tool' });
    return;
  }
  const toolDef = toolsCatalog.find((t) => t.name === tool || t.name === `vistaro_${tool}`);
  if (toolDef) {
    const result = await toolDef.handler(args || {});
    res.json({ success: true, tool, data: result });
  } else {
    await handleAction(tool, args || {}, res);
  }
});

// Start Server
export function startRemoteServer(port: number = PORT) {
  return app.listen(port, () => {
    console.log(`====================================================`);
    console.log(`  🚀 VISTARO REMOTE MCP & REST SERVER ACTIVE        `);
    console.log(`====================================================`);
    console.log(`  • HTTP/REST Port : http://localhost:${port}`);
    console.log(`  • SSE Transport  : http://localhost:${port}/sse`);
    console.log(`  • OpenAPI Spec   : http://localhost:${port}/openapi.json`);
    console.log(`  • Health Check   : http://localhost:${port}/health`);
    console.log(`  • WebSocket Port : ws://localhost:${bridge.getStatus().wsPort}`);
    console.log(`  • Auth Mode      : ${API_KEY ? 'Bearer API Key Protected' : 'Open Dev Mode'}`);
    console.log(`====================================================`);
  });
}

// Auto-run when executed directly
if (process.argv[1]?.includes('remote')) {
  startRemoteServer();
}

export default app;
