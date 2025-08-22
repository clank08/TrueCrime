import { createTRPCClient, httpBatchLink } from '@trpc/client';
import fetch from 'node-fetch';
import type { AppRouter } from './src/routers';

// Use proper ES module import
// @ts-ignore
globalThis.fetch = fetch;

// Create tRPC client
const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
    }),
  ],
});

async function testAuthFlow() {
  console.log('🚀 Starting True Crime Auth Tests with tRPC Client\n');

  try {
    // Test 1: User registration
    console.log('=== Test 1: User Registration ===');
    const registerResult = await trpc.auth.register.mutate({
      email: 'test@example.com',
      password: 'TestPassword123',
      firstName: 'Test',
      lastName: 'User',
    });
    
    console.log('✅ Registration successful:');
    console.log('- User ID:', registerResult.user.id);
    console.log('- Email:', registerResult.user.email);
    console.log('- Has access token:', !!registerResult.tokens.accessToken);
    console.log('- Has refresh token:', !!registerResult.tokens.refreshToken);
    
    const accessToken = registerResult.tokens.accessToken;
    console.log('---\n');

    // Test 2: User login (should work even if user already exists)
    console.log('=== Test 2: User Login ===');
    try {
      const loginResult = await trpc.auth.login.mutate({
        email: 'test@example.com',
        password: 'TestPassword123',
        rememberMe: false,
      });
      
      console.log('✅ Login successful:');
      console.log('- User ID:', loginResult.user.id);
      console.log('- Email:', loginResult.user.email);
      console.log('- Last login:', loginResult.user.lastLoginAt);
      console.log('---\n');
      
      // Test 3: Get current user (protected endpoint)
      console.log('=== Test 3: Get Current User ===');
      
      // Create authenticated client
      const authTrpc = createTRPCClient<AppRouter>({
        links: [
          httpBatchLink({
            url: 'http://localhost:3001/api/trpc',
            headers: {
              authorization: `Bearer ${loginResult.tokens.accessToken}`,
            },
          }),
        ],
      });
      
      const currentUser = await authTrpc.auth.me.query();
      console.log('✅ Current user retrieved:');
      console.log('- ID:', currentUser.id);
      console.log('- Email:', currentUser.email);
      console.log('- Email verified:', currentUser.emailVerified);
      console.log('- Active:', currentUser.isActive);
      console.log('---\n');
      
      // Test 4: Logout
      console.log('=== Test 4: Logout ===');
      const logoutResult = await authTrpc.auth.logout.mutate();
      console.log('✅ Logout successful:', logoutResult.message);
      console.log('---\n');
      
    } catch (loginError: any) {
      console.log('ℹ️ Login failed (expected if user already exists):', loginError.message);
      
      // If user already exists, try to test with existing user
      if (loginError.message.includes('already exists')) {
        console.log('User already exists, testing with existing user...');
        
        // Create client with registration token for testing
        const existingAuthTrpc = createTRPCClient<AppRouter>({
          links: [
            httpBatchLink({
              url: 'http://localhost:3001/api/trpc',
              headers: {
                authorization: `Bearer ${accessToken}`,
              },
            }),
          ],
        });
        
        try {
          const currentUser = await existingAuthTrpc.auth.me.query();
          console.log('✅ Existing user retrieved:');
          console.log('- ID:', currentUser.id);
          console.log('- Email:', currentUser.email);
        } catch (error: any) {
          console.log('❌ Could not get existing user:', error.message);
        }
      }
      console.log('---\n');
    }

    // Test 5: Password reset request
    console.log('=== Test 5: Password Reset Request ===');
    const resetResult = await trpc.auth.requestPasswordReset.mutate({
      email: 'test@example.com',
    });
    console.log('✅ Password reset requested:', resetResult.message);
    console.log('---\n');

    // Test 6: Token refresh
    console.log('=== Test 6: Token Refresh ===');
    try {
      const refreshResult = await trpc.auth.refresh.mutate({
        refreshToken: registerResult.tokens.refreshToken,
      });
      console.log('✅ Token refresh successful:');
      console.log('- New access token received:', !!refreshResult.accessToken);
      console.log('- New refresh token received:', !!refreshResult.refreshToken);
    } catch (refreshError: any) {
      console.log('❌ Token refresh failed:', refreshError.message);
    }
    console.log('---\n');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }

  console.log('🎉 Auth tests completed!');
}

// Run the tests
testAuthFlow().catch(console.error);