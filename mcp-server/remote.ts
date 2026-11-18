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

// API Key Authentication Middleware (Environment API_KEY or User Key vst_live_...)
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-vistaro-key'] as string | undefined;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : customHeader;

  // 1. If explicit API_KEY is set in environment, check exact match
  if (API_KEY) {
    if (token === API_KEY || (token && /^vst_live_[a-f0-9]{32,}$/i.test(token))) {
      return next();
    }
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or missing Vistaro API Key in Authorization header or X-Vistaro-Key.',
    });
    return;
  }

  // 2. Open development mode: allow requests, and validate token format if provided
  if (!token || /^vst_live_[a-f0-9]{32,}$/i.test(token)) {
    return next();
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Malformed Vistaro API Key. Expected format: vst_live_<hex_token>',
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

app.get('/api/v1/workspace/preview-image', authMiddleware, async (_req, res) => {
  await handleAction('capture_canvas_preview', {}, res);
});

app.post('/api/v1/workspace/preview-image', authMiddleware, async (_req, res) => {
  await handleAction('capture_canvas_preview', {}, res);
});

app.post('/api/v1/workspace/platform-preset', authMiddleware, async (req, res) => {
  await handleAction('smart_platform_preset', req.body, res);
});

app.post('/api/v1/workspace/batch-pipeline', authMiddleware, async (req, res) => {
  await handleAction('batch_pipeline', req.body, res);
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

// =========================================================================
// ADMIN CONTROL PLANE: Users, Feature Flags & Token Management
// =========================================================================
export interface AdminFeatureConfig {
  enable8KExport: boolean;
  enableVideoStudio: boolean;
  enableMcpBridge: boolean;
  enableBorderDetector: boolean;
  enablePdfExport: boolean;
  maxDailySlicesPerUser: number;
  maintenanceMode: boolean;
}

let featureFlags: AdminFeatureConfig = {
  enable8KExport: true,
  enableVideoStudio: true,
  enableMcpBridge: true,
  enableBorderDetector: true,
  enablePdfExport: true,
  maxDailySlicesPerUser: 100,
  maintenanceMode: false,
};

export interface AdminManagedUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'pro' | 'user';
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt: string;
  totalExports: number;
}

let managedUsers: AdminManagedUser[] = [
  {
    uid: 'admin_ssdd747346',
    email: 'ssdd747346@gmail.com',
    displayName: 'Super Admin',
    role: 'super_admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    totalExports: 42,
  },
  {
    uid: 'user_pro_01',
    email: 'creator@studio.com',
    displayName: 'Studio Artist',
    role: 'pro',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
    totalExports: 18,
  },
  {
    uid: 'user_free_02',
    email: 'comic.author@webtoon.dev',
    displayName: 'Webtoon Artist',
    role: 'user',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastLoginAt: new Date(Date.now() - 7200000).toISOString(),
    totalExports: 5,
  },
];

export interface ManagedToken {
  token: string;
  name: string;
  userId: string;
  userEmail: string;
  createdAt: string;
  status: 'active' | 'revoked';
  rateLimitPerMin: number;
  requestCount: number;
}

let managedTokens: ManagedToken[] = [
  {
    token: 'vst_live_master_admin_9938a1b2c3d4e5f6',
    name: 'Super Admin Master Token',
    userId: 'admin_ssdd747346',
    userEmail: 'ssdd747346@gmail.com',
    createdAt: new Date().toISOString(),
    status: 'active',
    rateLimitPerMin: 1000,
    requestCount: 24,
  },
  {
    token: 'vst_live_claude_desktop_bridge_849201f',
    name: 'Claude Desktop Integration',
    userId: 'admin_ssdd747346',
    userEmail: 'ssdd747346@gmail.com',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'active',
    rateLimitPerMin: 120,
    requestCount: 15,
  },
];

// Admin authorization middleware (Super Admin ssdd747346@gmail.com)
const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const adminHeader = req.headers['x-admin-email'] as string | undefined;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  // Allow if admin email matches or token is master admin token or local dev environment
  if (
    adminHeader?.toLowerCase() === 'ssdd747346@gmail.com' ||
    token?.includes('master_admin') ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    !API_KEY
  ) {
    return next();
  }

  res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'Super Admin privileges required (ssdd747346@gmail.com).',
  });
};

// 1. Admin System Overview
app.get('/api/v1/admin/overview', adminAuthMiddleware, (_req: Request, res: Response) => {
  res.json({
    success: true,
    system: {
      service: 'VistaroAI Admin Control Plane',
      superAdminEmail: 'ssdd747346@gmail.com',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      activeTabs: bridge.getStatus().connectedClients,
      wsPort: bridge.getStatus().wsPort,
    },
    features: featureFlags,
    stats: {
      totalUsers: managedUsers.length,
      activeUsers: managedUsers.filter((u) => u.status === 'active').length,
      activeTokens: managedTokens.filter((t) => t.status === 'active').length,
      revokedTokens: managedTokens.filter((t) => t.status === 'revoked').length,
    },
  });
});

// 2. Feature Flags Control
app.get('/api/v1/admin/features', adminAuthMiddleware, (_req: Request, res: Response) => {
  res.json({ success: true, features: featureFlags });
});

app.post('/api/v1/admin/features', adminAuthMiddleware, (req: Request, res: Response) => {
  featureFlags = { ...featureFlags, ...(req.body || {}) };
  res.json({ success: true, message: 'Feature flags updated successfully', features: featureFlags });
});

// 3. User Management
app.get('/api/v1/admin/users', adminAuthMiddleware, (_req: Request, res: Response) => {
  res.json({ success: true, users: managedUsers });
});

app.post('/api/v1/admin/users/:uid/role', adminAuthMiddleware, (req: Request, res: Response) => {
  const { uid } = req.params;
  const { role } = req.body || {};
  const user = managedUsers.find((u) => u.uid === uid);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  user.role = role || user.role;
  res.json({ success: true, message: `User role updated to ${role}`, user });
});

app.post('/api/v1/admin/users/:uid/status', adminAuthMiddleware, (req: Request, res: Response) => {
  const { uid } = req.params;
  const { status } = req.body || {};
  const user = managedUsers.find((u) => u.uid === uid);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  user.status = status === 'suspended' ? 'suspended' : 'active';
  res.json({ success: true, message: `User status set to ${user.status}`, user });
});

// 4. Token & API Key Management
app.get('/api/v1/admin/tokens', adminAuthMiddleware, (_req: Request, res: Response) => {
  res.json({ success: true, tokens: managedTokens });
});

app.post('/api/v1/admin/tokens/generate', adminAuthMiddleware, (req: Request, res: Response) => {
  const { name, rateLimitPerMin, userEmail } = req.body || {};
  const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const newToken: ManagedToken = {
    token: `vst_live_${randomHex}`,
    name: name || 'Admin Generated Token',
    userId: 'admin_ssdd747346',
    userEmail: userEmail || 'ssdd747346@gmail.com',
    createdAt: new Date().toISOString(),
    status: 'active',
    rateLimitPerMin: rateLimitPerMin || 300,
    requestCount: 0,
  };
  managedTokens.unshift(newToken);
  res.json({ success: true, message: 'New agent token provisioned', token: newToken });
});

app.post('/api/v1/admin/tokens/revoke', adminAuthMiddleware, (req: Request, res: Response) => {
  const { token } = req.body || {};
  const target = managedTokens.find((t) => t.token === token);
  if (!target) {
    res.status(404).json({ success: false, error: 'Token not found' });
    return;
  }
  target.status = 'revoked';
  res.json({ success: true, message: 'Token revoked successfully', token: target });
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
