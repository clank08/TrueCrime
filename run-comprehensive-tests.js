#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Content Discovery Feature
 * Runs all test suites for backend and frontend with reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSubsection(title) {
  log(`\n${'-'.repeat(40)}`, 'blue');
  log(`  ${title}`, 'blue');
  log('-'.repeat(40), 'blue');
}

const testSuites = {
  backend: {
    unit: {
      name: 'Backend Unit Tests',
      command: 'npm run test:unit',
      path: './TC-backend',
      description: 'Content router helper functions, validation schemas, and utility tests'
    },
    integration: {
      name: 'Backend Integration Tests', 
      command: 'npm run test:integration',
      path: './TC-backend',
      description: 'tRPC router integration, database operations, and external API tests'
    },
    performance: {
      name: 'Backend Performance Tests',
      command: 'npm run test:performance', 
      path: './TC-backend',
      description: 'Search response time validation and load testing'
    },
    contracts: {
      name: 'Backend Contract Tests',
      command: 'npm run test:contracts',
      path: './TC-backend', 
      description: 'API schema validation and type safety verification'
    },
    security: {
      name: 'Backend Security Tests',
      command: 'npm run test:security',
      path: './TC-backend',
      description: 'Input validation, SQL injection prevention, and auth security'
    },
    e2e: {
      name: 'Backend E2E Tests',
      command: 'npm run test:e2e',
      path: './TC-backend',
      description: 'Complete API workflow testing'
    }
  },
  frontend: {
    unit: {
      name: 'Frontend Unit Tests',
      command: 'npm run test:unit',
      path: './TC-frontend/TrueCrime',
      description: 'Component testing for SearchBar, ContentCard, and discovery components'
    },
    integration: {
      name: 'Frontend Integration Tests',
      command: 'npm run test:integration', 
      path: './TC-frontend/TrueCrime',
      description: 'Search functionality and user flow integration tests'
    },
    e2e: {
      name: 'Frontend E2E Tests',
      command: 'npm run test:e2e',
      path: './TC-frontend/TrueCrime',
      description: 'Complete user journey testing with Detox'
    },
    accessibility: {
      name: 'Accessibility Tests',
      command: 'npm run test -- --testNamePattern="Accessibility"',
      path: './TC-frontend/TrueCrime',
      description: 'Screen reader compatibility and keyboard navigation'
    }
  }
};

class TestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      suites: {}
    };
    this.startTime = Date.now();
  }

  async runCommand(command, cwd) {
    return new Promise((resolve) => {
      try {
        const result = execSync(command, {
          cwd,
          stdio: 'pipe',
          encoding: 'utf8',
          timeout: 300000 // 5 minutes timeout
        });
        resolve({ success: true, output: result });
      } catch (error) {
        resolve({ 
          success: false, 
          output: error.stdout || error.stderr || error.message 
        });
      }
    });
  }

  async runTestSuite(category, suite, config) {
    logSubsection(`${config.name}`);
    log(`Description: ${config.description}`, 'yellow');
    log(`Command: ${config.command}`, 'blue');
    log(`Path: ${config.path}`, 'blue');
    
    if (!fs.existsSync(config.path)) {
      log(`⚠️  Path not found: ${config.path}`, 'yellow');
      this.results.skipped++;
      this.results.suites[`${category}.${suite}`] = 'skipped';
      return;
    }

    const startTime = Date.now();
    log('\n🔄 Running tests...', 'blue');
    
    const result = await this.runCommand(config.command, config.path);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      log(`✅ PASSED in ${duration}ms`, 'green');
      this.results.passed++;
      this.results.suites[`${category}.${suite}`] = 'passed';
      
      // Extract test metrics from output if available
      this.extractTestMetrics(result.output);
    } else {
      log(`❌ FAILED in ${duration}ms`, 'red');
      this.results.failed++;
      this.results.suites[`${category}.${suite}`] = 'failed';
      
      // Show error details
      log('\nError Details:', 'red');
      log(result.output.substring(0, 1000) + (result.output.length > 1000 ? '...' : ''), 'red');
    }
  }

  extractTestMetrics(output) {
    // Extract useful metrics from test output
    const testCount = (output.match(/\d+ (test|spec)s? passed/i) || [])[0];
    const coverage = (output.match(/All files[\s\S]*?(\d+\.\d+)%/i) || [])[1];
    const duration = (output.match(/Time:\s*(\d+\.?\d*)\s*s/i) || [])[1];
    
    if (testCount) log(`   Tests: ${testCount}`, 'green');
    if (coverage) log(`   Coverage: ${coverage}%`, 'green');
    if (duration) log(`   Duration: ${duration}s`, 'green');
  }

  async runHealthChecks() {
    logSection('Pre-Test Health Checks');
    
    const checks = [
      {
        name: 'Node.js version',
        command: 'node --version',
        path: './'
      },
      {
        name: 'Backend dependencies',
        command: 'npm list --depth=0',
        path: './TC-backend'
      },
      {
        name: 'Frontend dependencies', 
        command: 'npm list --depth=0',
        path: './TC-frontend/TrueCrime'
      },
      {
        name: 'TypeScript compilation (Backend)',
        command: 'npm run type-check',
        path: './TC-backend'
      },
      {
        name: 'TypeScript compilation (Frontend)',
        command: 'npx tsc --noEmit',
        path: './TC-frontend/TrueCrime'
      }
    ];
    
    for (const check of checks) {
      log(`\n🔍 ${check.name}...`, 'blue');
      
      if (!fs.existsSync(check.path)) {
        log(`⚠️  Path not found: ${check.path}`, 'yellow');
        continue;
      }
      
      const result = await this.runCommand(check.command, check.path);
      
      if (result.success) {
        log(`✅ OK`, 'green');
      } else {
        log(`❌ FAILED`, 'red');
        log(result.output.substring(0, 500), 'red');
      }
    }
  }

  async runAllTests() {
    log('🚀 Starting Comprehensive Content Discovery Test Suite\n', 'bright');
    
    // Run health checks first
    await this.runHealthChecks();
    
    // Run backend tests
    logSection('Backend Tests');
    for (const [suite, config] of Object.entries(testSuites.backend)) {
      await this.runTestSuite('backend', suite, config);
    }
    
    // Run frontend tests
    logSection('Frontend Tests');
    for (const [suite, config] of Object.entries(testSuites.frontend)) {
      await this.runTestSuite('frontend', suite, config);
    }
    
    // Generate final report
    this.generateReport();
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const totalTests = this.results.passed + this.results.failed + this.results.skipped;
    
    logSection('Test Execution Report');
    
    log(`\n📊 Summary:`, 'bright');
    log(`   Total Test Suites: ${totalTests}`, 'blue');
    log(`   ✅ Passed: ${this.results.passed}`, 'green');
    log(`   ❌ Failed: ${this.results.failed}`, 'red');
    log(`   ⚠️  Skipped: ${this.results.skipped}`, 'yellow');
    log(`   ⏱️  Total Time: ${(totalTime / 1000).toFixed(2)}s`, 'blue');
    
    const successRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;
    log(`   📈 Success Rate: ${successRate}%`, successRate > 80 ? 'green' : 'red');
    
    log(`\n📋 Detailed Results:`, 'bright');
    for (const [suite, status] of Object.entries(this.results.suites)) {
      const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
      const color = status === 'passed' ? 'green' : status === 'failed' ? 'red' : 'yellow';
      log(`   ${icon} ${suite}`, color);
    }
    
    // Coverage and performance recommendations
    log(`\n🎯 Recommendations:`, 'bright');
    
    if (this.results.failed > 0) {
      log(`   • Fix ${this.results.failed} failing test suite(s)`, 'red');
    }
    
    if (this.results.skipped > 0) {
      log(`   • Set up ${this.results.skipped} skipped test suite(s)`, 'yellow');
    }
    
    if (successRate < 90) {
      log(`   • Improve test success rate (target: >90%)`, 'yellow');
    }
    
    log(`   • Ensure search response times are <100ms`, 'blue');
    log(`   • Maintain test coverage >85% for critical components`, 'blue');
    log(`   • Run E2E tests on multiple devices/platforms`, 'blue');
    
    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: totalTime,
      results: this.results,
      successRate: parseFloat(successRate)
    };
    
    const reportPath = './test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    log(`\n📝 Report saved to: ${reportPath}`, 'blue');
    
    // Exit with appropriate code
    const exitCode = this.results.failed > 0 ? 1 : 0;
    
    if (exitCode === 0) {
      log(`\n🎉 All tests passed! Content Discovery feature is ready.`, 'green');
    } else {
      log(`\n🚨 ${this.results.failed} test suite(s) failed. Please review and fix.`, 'red');
    }
    
    process.exit(exitCode);
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const options = {
  backend: args.includes('--backend') || args.includes('-b'),
  frontend: args.includes('--frontend') || args.includes('-f'),
  unit: args.includes('--unit') || args.includes('-u'),
  integration: args.includes('--integration') || args.includes('-i'),
  e2e: args.includes('--e2e') || args.includes('-e'),
  performance: args.includes('--performance') || args.includes('-p'),
  security: args.includes('--security') || args.includes('-s'),
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  log('Content Discovery Test Runner', 'bright');
  log('\nUsage: node run-comprehensive-tests.js [options]\n', 'blue');
  log('Options:', 'bright');
  log('  --backend, -b     Run only backend tests', 'blue');
  log('  --frontend, -f    Run only frontend tests', 'blue');
  log('  --unit, -u        Run only unit tests', 'blue');
  log('  --integration, -i Run only integration tests', 'blue');
  log('  --e2e, -e         Run only E2E tests', 'blue');
  log('  --performance, -p Run only performance tests', 'blue');
  log('  --security, -s    Run only security tests', 'blue');
  log('  --help, -h        Show this help message', 'blue');
  log('\nExamples:', 'bright');
  log('  node run-comprehensive-tests.js              # Run all tests', 'green');
  log('  node run-comprehensive-tests.js --backend    # Run only backend tests', 'green');
  log('  node run-comprehensive-tests.js --unit       # Run only unit tests', 'green');
  process.exit(0);
}

// Filter test suites based on CLI options
if (Object.values(options).some(Boolean) && !options.help) {
  // Filter based on selected options
  const filteredSuites = { backend: {}, frontend: {} };
  
  if (options.backend || (!options.frontend && !options.unit && !options.integration && !options.e2e && !options.performance && !options.security)) {
    Object.assign(filteredSuites.backend, testSuites.backend);
  }
  
  if (options.frontend || (!options.backend && !options.unit && !options.integration && !options.e2e && !options.performance && !options.security)) {
    Object.assign(filteredSuites.frontend, testSuites.frontend);
  }
  
  // Filter by test type
  if (options.unit) {
    filteredSuites.backend = { unit: testSuites.backend.unit };
    filteredSuites.frontend = { unit: testSuites.frontend.unit };
  }
  
  if (options.integration) {
    if (testSuites.backend.integration) filteredSuites.backend.integration = testSuites.backend.integration;
    if (testSuites.frontend.integration) filteredSuites.frontend.integration = testSuites.frontend.integration;
  }
  
  if (options.e2e) {
    if (testSuites.backend.e2e) filteredSuites.backend.e2e = testSuites.backend.e2e;
    if (testSuites.frontend.e2e) filteredSuites.frontend.e2e = testSuites.frontend.e2e;
  }
  
  if (options.performance) {
    if (testSuites.backend.performance) filteredSuites.backend.performance = testSuites.backend.performance;
  }
  
  if (options.security) {
    if (testSuites.backend.security) filteredSuites.backend.security = testSuites.backend.security;
  }
  
  // Update test suites
  Object.assign(testSuites, filteredSuites);
}

// Run the tests
const runner = new TestRunner();
runner.runAllTests().catch(error => {
  log(`\n🚨 Test runner error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
