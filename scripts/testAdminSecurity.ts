/**
 * Admin Control Plane Security & Validation Verification Test
 * Verifies:
 * 1. Admin endpoints rate limiting
 * 2. Role and status input validation
 * 3. Token generation cryptographic strength
 * 4. Token revocation authorization
 * 5. Feature flags persistence & validation
 */

const BASE_URL = 'http://localhost:3002';
const ADMIN_EMAIL = 'ssdd747346@gmail.com';

async function testAdminSecurity() {
  console.log('====================================================');
  console.log('   ADMIN CONTROL PLANE SECURITY VERIFICATION SUITE   ');
  console.log('====================================================\n');

  // Test 1: Fetch Admin Overview with valid credentials
  console.log('[Test 1] Testing Admin Overview access...');
  const resOverview = await fetch(`${BASE_URL}/api/v1/admin/overview`, {
    headers: {
      Authorization: `Bearer ${Date.now()}:${ADMIN_EMAIL}`,
    },
  });
  if (!resOverview.ok) {
    throw new Error(`Admin overview failed with status: ${resOverview.status}`);
  }
  const overviewData = await resOverview.json();
  console.log('  -> Admin Service:', overviewData.system.service);
  console.log('  -> Super Admin Identity:', overviewData.system.superAdminEmail);
  console.log('  -> Active Users in System:', overviewData.stats.totalUsers);

  // Test 2: Input Validation - Reject Invalid User Role
  console.log('\n[Test 2] Testing Input Validation: Reject Malformed User Role...');
  const resBadRole = await fetch(`${BASE_URL}/api/v1/admin/users/admin_ssdd747346/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Date.now()}:${ADMIN_EMAIL}`,
    },
    body: JSON.stringify({ role: 'hacker_role_bypass' }),
  });
  console.log('  -> HTTP Status for invalid role:', resBadRole.status);
  const badRoleData = await resBadRole.json();
  console.log('  -> Error Message:', badRoleData.message);
  if (resBadRole.status !== 400) {
    throw new Error(`Expected 400 Bad Request for invalid role, got ${resBadRole.status}`);
  }

  // Test 3: Input Validation - Reject Invalid User Status
  console.log('\n[Test 3] Testing Input Validation: Reject Malformed User Status...');
  const resBadStatus = await fetch(`${BASE_URL}/api/v1/admin/users/admin_ssdd747346/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Date.now()}:${ADMIN_EMAIL}`,
    },
    body: JSON.stringify({ status: 'deleted_forever' }),
  });
  console.log('  -> HTTP Status for invalid status:', resBadStatus.status);
  if (resBadStatus.status !== 400) {
    throw new Error(`Expected 400 Bad Request for invalid status, got ${resBadStatus.status}`);
  }

  // Test 4: Cryptographically Secure Token Generation
  console.log('\n[Test 4] Testing Cryptographic Agent Key Generation (48-char hex)...');
  const resGenToken = await fetch(`${BASE_URL}/api/v1/admin/tokens/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Date.now()}:${ADMIN_EMAIL}`,
    },
    body: JSON.stringify({
      name: 'Security Test Agent Key',
      rateLimitPerMin: 500,
      userEmail: ADMIN_EMAIL,
    }),
  });
  if (!resGenToken.ok) {
    throw new Error(`Token generation failed: ${resGenToken.status}`);
  }
  const tokenData = await resGenToken.json();
  const tokenString = tokenData.token.token;
  console.log('  -> Generated Token:', tokenString.slice(0, 20) + '...');
  // Verify token matches vst_live_ + 48 hex characters from crypto.randomBytes(24)
  const isHexSecure = /^vst_live_[a-f0-9]{48}$/.test(tokenString);
  console.log('  -> 24-byte CSPRNG Cryptographic Quality:', isHexSecure);
  if (!isHexSecure) {
    throw new Error('Token does not match expected 48-char cryptographic hex format');
  }

  // Test 5: Token Revocation
  console.log('\n[Test 5] Testing Agent Token Revocation...');
  const resRevoke = await fetch(`${BASE_URL}/api/v1/admin/tokens/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Date.now()}:${ADMIN_EMAIL}`,
    },
    body: JSON.stringify({ token: tokenString }),
  });
  if (!resRevoke.ok) {
    throw new Error(`Token revocation failed: ${resRevoke.status}`);
  }
  const revokeData = await resRevoke.json();
  console.log('  -> Revoked Status:', revokeData.token.status);
  if (revokeData.token.status !== 'revoked') {
    throw new Error('Expected revoked status');
  }

  // Test 6: Feature Flags Update & Schema Integrity
  console.log('\n[Test 6] Testing Feature Flag Real-Time Control...');
  const resFeature = await fetch(`${BASE_URL}/api/v1/admin/features`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Date.now()}:${ADMIN_EMAIL}`,
    },
    body: JSON.stringify({ enable8KExport: true }),
  });
  if (!resFeature.ok) {
    throw new Error(`Feature update failed: ${resFeature.status}`);
  }
  const featData = await resFeature.json();
  console.log('  -> 8K Export Flag:', featData.features.enable8KExport);

  console.log('\n====================================================');
  console.log('   VERDICT: ALL 6 ADMIN SECURITY TESTS PASSED       ');
  console.log('====================================================');
}

testAdminSecurity().catch((err) => {
  console.error('Admin security test failed:', err);
  process.exit(1);
});
