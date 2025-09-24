#!/usr/bin/env node

/**
 * Test Runner for Wheel System
 * Runs all tests to verify the refactored wheel system works correctly
 */

const { spawn } = require('child_process');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, args, cwd, description) {
  return new Promise((resolve, reject) => {
    log(`\n${colors.bright}${colors.blue}🏃 ${description}${colors.reset}`);
    log(`${colors.cyan}Running: ${command} ${args.join(' ')} in ${cwd}${colors.reset}`);

    const child = spawn(command, args, {
      cwd: path.join(__dirname, cwd),
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`${colors.green}✅ ${description} - PASSED${colors.reset}`);
        resolve();
      } else {
        log(`${colors.red}❌ ${description} - FAILED (exit code ${code})${colors.reset}`);
        reject(new Error(`${description} failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      log(`${colors.red}❌ ${description} - ERROR: ${error.message}${colors.reset}`);
      reject(error);
    });
  });
}

async function runTests() {
  const startTime = Date.now();

  log(`${colors.bright}${colors.magenta}🎡 WHEEL SYSTEM TEST SUITE${colors.reset}`);
  log(`${colors.cyan}Testing refactored wheel system to verify prize alignment fixes${colors.reset}\n`);

  const tests = [
    {
      command: 'npm',
      args: ['run', 'test', '--', '--run', 'src/utils/slot-utils.test.ts'],
      cwd: 'apps/web',
      description: 'Frontend Slot Utils Tests'
    },
    {
      command: 'npm',
      args: ['run', 'test', '--', '--run', 'src/components/play-wheel/prizeResolution.test.ts'],
      cwd: 'apps/web',
      description: 'Prize Resolution Logic Tests'
    },
    {
      command: 'npm',
      args: ['test', '--', '--run', 'src/services/wheel/wheelService.test.ts'],
      cwd: 'apps/api',
      description: 'Backend Wheel Service Tests'
    },
    {
      command: 'npm',
      args: ['test', '--', '--run', 'src/services/wheel/playService.test.ts'],
      cwd: 'apps/api',
      description: 'Backend Play Service Tests'
    },
    {
      command: 'npm',
      args: ['test', '--', '--run', 'src/controllers/public.controller.integration.test.ts'],
      cwd: 'apps/api',
      description: 'Backend API Integration Tests'
    }
  ];

  // Conditionally add E2E tests if database is available
  if (process.env.DATABASE_URL || process.env.NODE_ENV === 'test') {
    tests.push({
      command: 'npm',
      args: ['test', '--', '--run', 'src/tests/wheel-flow.e2e.test.ts'],
      cwd: 'apps/api',
      description: 'End-to-End Wheel Flow Tests'
    });
  } else {
    log(`${colors.yellow}⚠️  Skipping E2E tests - DATABASE_URL not configured${colors.reset}`);
  }

  let passedTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    try {
      await runCommand(test.command, test.args, test.cwd, test.description);
      passedTests++;
    } catch (error) {
      failedTests++;
      log(`${colors.red}Test failed: ${error.message}${colors.reset}`);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  log(`\n${colors.bright}${colors.magenta}🎯 TEST SUMMARY${colors.reset}`);
  log(`${colors.green}✅ Passed: ${passedTests}${colors.reset}`);
  log(`${colors.red}❌ Failed: ${failedTests}${colors.reset}`);
  log(`${colors.cyan}⏱️  Duration: ${duration}s${colors.reset}`);

  if (failedTests === 0) {
    log(`\n${colors.bright}${colors.green}🎉 ALL TESTS PASSED! 🎉${colors.reset}`);
    log(`${colors.green}The refactored wheel system is working correctly!${colors.reset}`);
    log(`${colors.cyan}✨ Prize alignment issue has been fixed${colors.reset}`);
    log(`${colors.cyan}✨ Code is properly refactored and maintainable${colors.reset}`);
    process.exit(0);
  } else {
    log(`\n${colors.bright}${colors.red}💥 ${failedTests} TEST(S) FAILED 💥${colors.reset}`);
    log(`${colors.red}Please review the failed tests and fix any issues.${colors.reset}`);
    process.exit(1);
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  log(`\n${colors.yellow}⚠️  Test run interrupted by user${colors.reset}`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  log(`\n${colors.yellow}⚠️  Test run terminated${colors.reset}`);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runTests().catch((error) => {
    log(`${colors.red}❌ Test runner failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { runTests };