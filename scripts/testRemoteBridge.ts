import app, { startRemoteServer } from '../mcp-server/remote.js';
import http from 'http';

async function runTests() {
  console.log('Testing VistaroAI Remote MCP & REST Bridge...');

  const TEST_PORT = 3099;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[Test Server] Running on http://localhost:${TEST_PORT}`);
      resolve();
    });
  });

  try {
    // Test 1: Health check
    console.log('\n--- 1. Testing GET /health ---');
    const healthRes = await fetch(`http://localhost:${TEST_PORT}/health`);
    const healthData = await healthRes.json();
    console.log('Health response status:', healthRes.status);
    console.log('Service:', healthData.service);
    if (healthRes.status !== 200 || healthData.status !== 'healthy') {
      throw new Error('Health check failed');
    }
    console.log('✅ Health check passed!');

    // Test 2: OpenAPI Specification
    console.log('\n--- 2. Testing GET /openapi.json ---');
    const openApiRes = await fetch(`http://localhost:${TEST_PORT}/openapi.json`);
    const openApiData = await openApiRes.json();
    console.log('OpenAPI version:', openApiData.openapi);
    console.log('Endpoints registered:', Object.keys(openApiData.paths).length);
    if (openApiData.openapi !== '3.1.0' || !openApiData.paths['/api/v1/workspace/grid']) {
      throw new Error('OpenAPI specification invalid');
    }
    console.log('✅ OpenAPI spec verified!');

    // Test 3: REST Action (Workspace State)
    console.log('\n--- 3. Testing POST /api/v1/workspace/state ---');
    const stateRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/workspace/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const stateData = await stateRes.json();
    console.log('Workspace state call response:', stateData);
    // When no browser is open, it gracefully reports no_client_connected
    if (stateData.data?.status !== 'no_client_connected' && !stateData.data?.dimensions) {
      throw new Error('Workspace state unexpected format');
    }
    console.log('✅ Workspace state handler verified!');

    // Test 4: REST Action (Set Grid)
    console.log('\n--- 4. Testing POST /api/v1/workspace/grid ---');
    const gridRes = await fetch(`http://localhost:${TEST_PORT}/api/v1/workspace/grid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: 3, columns: 3 }),
    });
    const gridData = await gridRes.json();
    console.log('Set grid call response:', gridData);
    if (!gridData.tool || gridData.tool !== 'set_grid') {
      throw new Error('Set grid handler failed');
    }
    console.log('✅ Set grid handler verified!');

    console.log('\n🎉 ALL REMOTE BRIDGE TESTS PASSED (100% HEALTHY)!');
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
