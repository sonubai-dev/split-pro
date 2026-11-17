import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

async function testMcpDirect() {
  console.log('Testing Vistaro MCP Server via Stdio Transport...\n');

  const serverPath = path.resolve(process.cwd(), 'mcp-server/server.ts');
  const transport = new StdioClientTransport({
    command: 'npx.cmd',
    args: ['-y', 'tsx', serverPath],
  });

  const client = new Client(
    {
      name: 'test-mcp-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  console.log('✅ Connected to Vistaro MCP Server via stdio!');

  const toolsResponse = await client.listTools();
  console.log(`✅ Retrieved ${toolsResponse.tools.length} registered tools:`);
  toolsResponse.tools.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.name}: ${t.description.substring(0, 65)}...`);
  });

  await client.close();
  console.log('\n✅ MCP Test Completed Successfully!');
  process.exit(0);
}

testMcpDirect().catch((err) => {
  console.error('❌ MCP Test Failed:', err);
  process.exit(1);
});
