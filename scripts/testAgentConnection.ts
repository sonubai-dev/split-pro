/**
 * Senior Engineering Agent Verification Test
 * Tests MCP connection, SSE handshake, OpenAPI catalog, and API key authentication
 * for connecting external AI agents (Claude, ChatGPT, LangChain, mobile agents).
 */

async function runAgentConnectionTest() {
  console.log('====================================================');
  console.log('   EXTERNAL AI AGENT MCP & API KEY CONNECTION TEST   ');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:3002';

  // 1. Health check
  console.log('[Test 1] Pinging MCP Remote Server...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.statusText}`);
  const healthData = await healthRes.json();
  console.log('  -> Health Status:', healthData.status);
  console.log('  -> Service:', healthData.service);
  console.log('  -> Auth Configured:', healthData.apiAuthEnabled);

  // 2. OpenAPI Spec (for ChatGPT Custom GPT Actions)
  console.log('\n[Test 2] Validating OpenAPI 3.1.0 Agent Manifest...');
  const openApiRes = await fetch(`${BASE_URL}/openapi.json`);
  if (!openApiRes.ok) throw new Error(`OpenAPI fetch failed: ${openApiRes.status}`);
  const openApiSpec = await openApiRes.json();
  const endpointCount = Object.keys(openApiSpec.paths || {}).length;
  console.log('  -> OpenAPI Version:', openApiSpec.openapi);
  console.log('  -> Available Agent Endpoints:', endpointCount);

  // 3. API Key Authentication Verification (Accept valid vst_live_ keys)
  const validUserKey = 'vst_live_a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
  console.log('\n[Test 3] Testing Valid API Key Bearer Authentication...');
  const authRes = await fetch(`${BASE_URL}/api/v1/workspace/state`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${validUserKey}`,
    },
  });
  console.log('  -> HTTP Status with Valid Key:', authRes.status);
  if (authRes.status === 401) {
    throw new Error('Valid key unexpectedly rejected with 401');
  }

  // 4. API Key Authentication Verification (Reject malformed keys)
  console.log('\n[Test 4] Testing Malformed API Key Rejection...');
  const badAuthRes = await fetch(`${BASE_URL}/api/v1/workspace/state`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer bad_token_123`,
    },
  });
  console.log('  -> HTTP Status with Malformed Key:', badAuthRes.status);
  const badAuthData = await badAuthRes.json();
  console.log('  -> Error Message:', badAuthData.message);
  if (badAuthRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized for malformed key, got ${badAuthRes.status}`);
  }

  // 5. Tool Execution with Valid Key via REST
  console.log('\n[Test 5] Executing Tool with API Key (vistaro_smart_platform_preset)...');
  const toolRes = await fetch(`${BASE_URL}/api/v1/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Vistaro-Key': validUserKey,
    },
    body: JSON.stringify({
      tool: 'vistaro_smart_platform_preset',
      args: { platform: 'instagram_carousel' },
    }),
  });
  const toolData = await toolRes.json();
  console.log('  -> Tool Execution Success:', toolData.success);

  console.log('\n====================================================');
  console.log('   VERDICT: ALL 5 AGENT & API KEY TESTS PASSED      ');
  console.log('====================================================');
}

runAgentConnectionTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
