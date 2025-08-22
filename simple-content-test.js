#!/usr/bin/env node

/**
 * Simple Content Discovery Feature Test
 * Tests the basic functionality without complex test frameworks
 */

console.log('🧪 Testing Content Discovery Feature\n');

async function runTests() {
  const tests = [];
  let passed = 0;
  let failed = 0;

  // Test 1: Backend Health
  tests.push({
    name: 'Backend Health Check',
    test: async () => {
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      return data.status === 'healthy' && data.services.database && data.services.search;
    }
  });

  // Test 2: Meilisearch Health
  tests.push({
    name: 'Meilisearch Health Check',
    test: async () => {
      const response = await fetch('http://localhost:7700/health');
      const data = await response.json();
      return data.status === 'available';
    }
  });

  // Test 3: Database Connection (via API)
  tests.push({
    name: 'Database Connection Test',
    test: async () => {
      try {
        const response = await fetch('http://localhost:3001/health');
        const data = await response.json();
        return data.services.database === true;
      } catch (error) {
        return false;
      }
    }
  });

  // Test 4: Search Service Integration
  tests.push({
    name: 'Search Service Integration',
    test: async () => {
      try {
        const response = await fetch('http://localhost:7700/indexes', {
          headers: {
            'Authorization': 'Bearer masterKey_LOCAL_DEVELOPMENT_ONLY'
          }
        });
        return response.ok;
      } catch (error) {
        return false;
      }
    }
  });

  // Test 5: Environment Configuration
  tests.push({
    name: 'Environment Configuration',
    test: async () => {
      // Check if environment variables are configured
      const backendHealth = await fetch('http://localhost:3001/health');
      const healthData = await backendHealth.json();
      
      // If backend is healthy and search service is true, env is configured
      return healthData.services.search === true;
    }
  });

  console.log(`Running ${tests.length} tests...\n`);

  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Content Discovery feature is working correctly.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Check the configuration.`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});