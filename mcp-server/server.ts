import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { bridge, WS_PORT } from './bridge.js';
import { registerMcpTools } from './tools.js';
import { startRemoteServer } from './remote.js';

// Initialize MCP Server instance
const server = new McpServer({
  name: 'vistaro-ai',
  version: '1.0.0',
});

// Initialize WebSocket Bridge
bridge.init();

// Register all 15 Studio Tools onto the MCP server
registerMcpTools(server);

// Connect stdio transport and launch
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[Vistaro MCP] Server running on stdio (WebSocket bridge on ws://localhost:${WS_PORT})`);

  // Launch remote HTTP/SSE bridge in dual-mode (unless explicitly disabled)
  const enableRemote = process.env.VISTARO_REMOTE !== 'false';
  if (enableRemote) {
    try {
      startRemoteServer();
    } catch (err) {
      console.error('[Vistaro MCP] Remote server start notice:', err);
    }
  }
}

main().catch((err) => {
  console.error('[Vistaro MCP] Fatal error starting server:', err);
  process.exit(1);
});
