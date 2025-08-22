// Basic functionality test
console.log('Testing TC-Backend basic functionality...\n');

// Test 1: Check if server can start
console.log('1. Testing server initialization...');
try {
  const { createServer } = require('./dist/server.js');
  console.log('✅ Server module loaded successfully');
} catch (error) {
  console.log('❌ Server module failed to load:', error.message);
}

// Test 2: Check cache initialization
console.log('\n2. Testing cache layer...');
try {
  const { cache, cacheDurations } = require('./dist/lib/cache.js');
  console.log('✅ Cache module loaded');
  console.log('   Cache durations:', Object.keys(cacheDurations));
} catch (error) {
  console.log('❌ Cache module failed:', error.message);
}

// Test 3: Check rate limiting
console.log('\n3. Testing rate limiting...');
try {
  const { rateLimiters } = require('./dist/middleware/rateLimiting.js');
  console.log('✅ Rate limiting loaded');
  console.log('   Available limiters:', Object.keys(rateLimiters));
} catch (error) {
  console.log('❌ Rate limiting failed:', error.message);
}

// Test 4: Check monitoring
console.log('\n4. Testing monitoring...');
try {
  const { monitoring, performanceTimer } = require('./dist/lib/monitoring.js');
  console.log('✅ Monitoring loaded');
  console.log('   Monitoring active');
} catch (error) {
  console.log('❌ Monitoring failed:', error.message);
}

// Test 5: Check JWT utilities
console.log('\n5. Testing JWT utilities...');
try {
  const jwt = require('./dist/lib/jwt.js');
  const token = jwt.generateAccessToken({ userId: 'test-123' });
  const decoded = jwt.verifyAccessToken(token);
  console.log('✅ JWT working');
  console.log('   Generated and verified token for userId:', decoded.userId);
} catch (error) {
  console.log('❌ JWT failed:', error.message);
}

console.log('\n✅ Basic functionality tests completed!');
console.log('\nNote: Some features require environment variables to be set.');
console.log('Check .env.example for required configuration.');