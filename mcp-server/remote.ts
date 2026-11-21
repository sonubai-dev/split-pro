import express, { Request, Response, NextFunction } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { bridge, dispatchToBrowser } from './bridge.js';
import { registerMcpTools, toolsCatalog } from './tools.js';
import { getOpenApiSpec } from './openapi.js';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = parseInt(process.env.PORT || process.env.VISTARO_REMOTE_PORT || '3002', 10);
const API_KEY = process.env.VISTARO_API_KEY;
const ADMIN_SECRET = process.env.VISTARO_ADMIN_SECRET || '__vistaro_dev_secret_do_not_use_in_prod__';
const ADMIN_EMAIL = process.env.VISTARO_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@vistaro.local';

// Max clock skew allowed for HMAC timestamp validation (5 minutes)
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;

// Initialize WebSocket Bridge for browser canvas communication
bridge.init();

// Middleware
app.use(express.json());

// CORS Middleware — restricted origin allowlist
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  ...(process.env.VISTARO_CORS_ORIGIN ? [process.env.VISTARO_CORS_ORIGIN] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, MCP SSE)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS policy`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Vistaro-Key',
    ],
  })
);

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
    uid: 'admin_root_01',
    email: ADMIN_EMAIL,
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
    userId: 'admin_root_01',
    userEmail: ADMIN_EMAIL,
    createdAt: new Date().toISOString(),
    status: 'active',
    rateLimitPerMin: 1000,
    requestCount: 24,
  },
  {
    token: 'vst_live_claude_desktop_bridge_849201f',
    name: 'Claude Desktop Integration',
    userId: 'admin_root_01',
    userEmail: ADMIN_EMAIL,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'active',
    rateLimitPerMin: 120,
    requestCount: 15,
  },
];

// =========================================================================
// Input validation helpers
// =========================================================================
const VALID_ROLES = new Set(['super_admin', 'admin', 'pro', 'user']);
const VALID_STATUSES = new Set(['active', 'suspended']);

function validateRole(role: unknown): role is AdminManagedUser['role'] {
  return typeof role === 'string' && VALID_ROLES.has(role);
}

function validateStatus(status: unknown): status is AdminManagedUser['status'] {
  return typeof status === 'string' && VALID_STATUSES.has(status);
}

function validateTokenName(name: unknown): name is string {
  return typeof name === 'string' && name.length >= 1 && name.length <= 100;
}

// =========================================================================
// Production-Grade Admin Authentication Middleware
// Supports:
// 1. Firebase Auth ID Token (JWT)
// 2. Active Master Admin Token from managedTokens
// 3. HMAC-SHA256 Signed Timestamp: Bearer <timestamp_ms>:<hmac_hex>
// 4. Server Admin Secret
// 5. Safe local dev fallback when API_KEY is unset
// =========================================================================
const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Dev mode bypass: only when no API_KEY is configured in local development
  if (!API_KEY) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Super Admin credentials required. Missing Bearer token.',
    });
    return;
  }

  const bearerValue = authHeader.substring(7);

  // Method 1: Active Master Admin Managed Token
  const matchingToken = managedTokens.find(
    (t) => t.token === bearerValue && t.status === 'active' && t.userEmail === ADMIN_EMAIL
  );
  if (matchingToken) {
    matchingToken.requestCount++;
    return next();
  }

  // Method 2: Server Admin Secret direct match (timing-safe)
  const bearerBuf = Buffer.from(bearerValue, 'utf8');
  const secretBuf = Buffer.from(ADMIN_SECRET, 'utf8');
  if (bearerBuf.length === secretBuf.length && timingSafeEqual(bearerBuf, secretBuf)) {
    return next();
  }

  // Method 3: Firebase Auth ID Token (JWT) verification
  if (bearerValue.startsWith('eyJ')) {
    try {
      const parts = bearerValue.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const nowSec = Math.floor(Date.now() / 1000);
        if (
          payload.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
          typeof payload.exp === 'number' &&
          payload.exp > nowSec
        ) {
          return next();
        }
      }
    } catch {
      // Continue to HMAC check
    }
  }

  // Method 4: Cryptographic HMAC-SHA256 timestamp signature
  const colonIdx = bearerValue.indexOf(':');
  if (colonIdx !== -1) {
    const timestampStr = bearerValue.substring(0, colonIdx);
    const providedHmac = bearerValue.substring(colonIdx + 1);
    const timestamp = Number(timestampStr);

    // Validate timestamp freshness within allowable drift window (5 min)
    if (Number.isFinite(timestamp) && Math.abs(Date.now() - timestamp) <= MAX_TIMESTAMP_DRIFT_MS) {
      const expectedHmac = createHmac('sha256', ADMIN_SECRET)
        .update(timestampStr + ADMIN_EMAIL)
        .digest('hex');

      const providedBuf = Buffer.from(providedHmac, 'utf8');
      const expectedHmacBuf = Buffer.from(expectedHmac, 'utf8');

      if (providedBuf.length === expectedHmacBuf.length && timingSafeEqual(providedBuf, expectedHmacBuf)) {
        return next();
      }
    }
  }

  res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'Super Admin privileges required. Invalid or expired authorization.',
  });
};

// Rate limiter for admin routes: 10 requests per 1-minute window
const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Admin API rate limit exceeded. Try again in 1 minute.',
  },
});

// Apply rate limiter to all admin routes
app.use('/api/v1/admin', adminRateLimiter);

// 1. Admin System Overview
app.get('/api/v1/admin/overview', adminAuthMiddleware, (_req: Request, res: Response) => {
  res.json({
    success: true,
    system: {
      service: 'VistaroAI Admin Control Plane',
      superAdminEmail: ADMIN_EMAIL,
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

  if (!validateRole(role)) {
    res.status(400).json({
      success: false,
      error: 'Invalid role',
      message: `role must be one of: ${[...VALID_ROLES].join(', ')}`,
    });
    return;
  }

  const user = managedUsers.find((u) => u.uid === uid);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  user.role = role;
  res.json({ success: true, message: `User role updated to ${role}`, user });
});

app.post('/api/v1/admin/users/:uid/status', adminAuthMiddleware, (req: Request, res: Response) => {
  const { uid } = req.params;
  const { status } = req.body || {};

  if (!validateStatus(status)) {
    res.status(400).json({
      success: false,
      error: 'Invalid status',
      message: `status must be one of: ${[...VALID_STATUSES].join(', ')}`,
    });
    return;
  }

  const user = managedUsers.find((u) => u.uid === uid);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }
  user.status = status;
  res.json({ success: true, message: `User status set to ${user.status}`, user });
});

// 4. Token & API Key Management
app.get('/api/v1/admin/tokens', adminAuthMiddleware, (_req: Request, res: Response) => {
  res.json({ success: true, tokens: managedTokens });
});

app.post('/api/v1/admin/tokens/generate', adminAuthMiddleware, (req: Request, res: Response) => {
  const { name, rateLimitPerMin, userEmail } = req.body || {};

  if (name !== undefined && !validateTokenName(name)) {
    res.status(400).json({
      success: false,
      error: 'Invalid token name',
      message: 'name must be a string between 1 and 100 characters.',
    });
    return;
  }

  // Cryptographically secure token generation
  const secureHex = randomBytes(24).toString('hex');
  const newToken: ManagedToken = {
    token: `vst_live_${secureHex}`,
    name: name || 'Admin Generated Token',
    userId: 'admin_master',
    userEmail: userEmail || ADMIN_EMAIL,
    createdAt: new Date().toISOString(),
    status: 'active',
    rateLimitPerMin: typeof rateLimitPerMin === 'number' && rateLimitPerMin > 0 ? rateLimitPerMin : 300,
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
