import fetch from 'node-fetch';

// Test configuration
const API_BASE = 'http://localhost:3001/api/trpc';

// Helper function to make tRPC requests
async function callTRPC(procedure, input, method = 'POST') {
  const url = `${API_BASE}/${procedure}`;
  
  const body = input ? JSON.stringify(input) : undefined;
  
  console.log(`🔄 Testing ${method} ${procedure}`);
  console.log('📤 Input:', input ? JSON.stringify(input, null, 2) : 'none');
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });
    
    const data = await response.text();
    let parsed;
    
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      parsed = data;
    }
    
    console.log(`📊 Status: ${response.status}`);
    console.log('📥 Response:', JSON.stringify(parsed, null, 2));
    console.log('---');
    
    return { status: response.status, data: parsed };
  } catch (error) {
    console.error(`❌ Error calling ${procedure}:`, error.message);
    console.log('---');
    return { error: error.message };
  }
}

// Test cases
async function runTests() {
  console.log('🚀 Starting Auth API Tests\n');
  
  // Test 1: Health check
  console.log('=== Test 1: Health Check ===');
  const healthResponse = await fetch('http://localhost:3001/health');
  const healthData = await healthResponse.json();
  console.log('📊 Health Status:', healthResponse.status);
  console.log('📥 Health Data:', JSON.stringify(healthData, null, 2));
  console.log('---\n');
  
  // Test 2: User registration
  console.log('=== Test 2: User Registration ===');
  const registerResult = await callTRPC('auth.register', {
    email: 'test@example.com',
    password: 'TestPassword123',
    firstName: 'Test',
    lastName: 'User',
  });
  
  let accessToken = null;
  if (registerResult.status === 200 && registerResult.data?.result?.data?.tokens?.accessToken) {
    accessToken = registerResult.data.result.data.tokens.accessToken;
    console.log('✅ Registration successful, got access token');
  }
  
  // Test 3: User login
  console.log('=== Test 3: User Login ===');
  const loginResult = await callTRPC('auth.login', {
    email: 'test@example.com',
    password: 'TestPassword123',
    rememberMe: false,
  });
  
  if (loginResult.status === 200 && loginResult.data?.result?.data?.tokens?.accessToken) {
    accessToken = loginResult.data.result.data.tokens.accessToken;
    console.log('✅ Login successful, got access token');
  }
  
  // Test 4: Get current user (protected endpoint)
  if (accessToken) {
    console.log('=== Test 4: Get Current User (Protected) ===');
    const meResult = await callTRPC('auth.me', null, 'GET');
    
    // For protected endpoints, we need to test with Authorization header
    const meWithAuthResponse = await fetch(`${API_BASE}/auth.me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    const meWithAuthData = await meWithAuthResponse.text();
    let meWithAuthParsed;
    
    try {
      meWithAuthParsed = JSON.parse(meWithAuthData);
    } catch (e) {
      meWithAuthParsed = meWithAuthData;
    }
    
    console.log('📤 With Authorization header');
    console.log('📊 Status:', meWithAuthResponse.status);
    console.log('📥 Response:', JSON.stringify(meWithAuthParsed, null, 2));
  } else {
    console.log('⚠️ Skipping protected endpoint test - no access token');
  }
  
  // Test 5: Password reset request
  console.log('\n=== Test 5: Password Reset Request ===');
  await callTRPC('auth.requestPasswordReset', {
    email: 'test@example.com',
  });
  
  // Test 6: Token refresh
  console.log('=== Test 6: Token Refresh ===');
  await callTRPC('auth.refresh', {
    refreshToken: 'dummy-refresh-token',
  });
  
  console.log('🎉 Auth API Tests Complete!');
}

// Run the tests
runTests().catch(console.error);