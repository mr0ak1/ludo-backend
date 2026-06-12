/**
 * Admin API Testing Script - With Mock Token
 * Tests all admin panel endpoints
 */

const API_BASE = 'http://localhost:5000/api/v1';

// Admin token (from get_admin_token.js)
let adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTE0Nzg2YjJjYzYyMDA2YThhNDU0MTAiLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE3Nzk3MjY0NDMsImV4cCI6MTc4MDMzMTI0M30.mjRsXLNgzjQRYcJt29mKex1Vz1SJfnQ84d3zIxFHhWk';

let testUserId = null;
let testGameId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(endpoint, message) {
  log(`✅ ${endpoint}: ${message}`, 'green');
}

function logError(endpoint, message) {
  log(`❌ ${endpoint}: ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logTest(message) {
  log(`\n📝 ${message}`, 'cyan');
}

function logSection(title) {
  log(`\n╔${'═'.repeat(title.length + 2)}╗`, 'blue');
  log(`║ ${title} ║`, 'blue');
  log(`╚${'═'.repeat(title.length + 2)}╝`, 'blue');
}

async function request(method, endpoint, body = null, useAdminToken = true) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (useAdminToken && adminToken) {
      options.headers['Authorization'] = `Bearer ${adminToken}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    return {
      status: response.status,
      data,
      ok: response.ok,
    };
  } catch (error) {
    logError(endpoint, `Network error: ${error.message}`);
    return { status: 0, data: null, ok: false };
  }
}

async function createTestAdmin() {
  logTest('Step 1: Creating Test Admin User');

  const adminData = {
    phone: '+919876543210',
    name: 'Test Admin',
    email: 'admin@ludo.test',
    isAdmin: true,
  };

  // Try to create via API (would need special endpoint or direct DB)
  logWarning('Note: Admin user creation requires database direct access');
  logWarning('Using mock token for testing');
  log('Mock admin token set successfully', 'green');
}

async function testGetDashboard() {
  logTest('Testing Get Dashboard');

  const res = await request('GET', '/admin/dashboard');

  if (res.ok) {
    const users = res.data?.data?.users || {};
    const games = res.data?.data?.games || {};
    logSuccess(
      'GET /admin/dashboard',
      `Users: ${users.total || 0}, Active Games: ${games.active || 0}`
    );
    return true;
  } else {
    logError('GET /admin/dashboard', `Status: ${res.status}`);
    return false;
  }
}

async function testGetAllUsers() {
  logTest('Testing Get All Users');

  const res = await request('GET', '/admin/users?page=1&limit=10');

  if (res.ok) {
    const users = res.data?.data?.users || [];
    if (users.length > 0) {
      testUserId = users[0]._id;
      logSuccess('GET /admin/users', `Retrieved ${users.length} users`);
      return true;
    } else {
      logWarning('No users found in database');
      return false;
    }
  } else {
    logError('GET /admin/users', `Status: ${res.status}`);
    return false;
  }
}

async function testGetSingleUser() {
  logTest('Testing Get Single User');

  if (!testUserId) {
    logWarning('Skipping (no test user available)');
    return false;
  }

  const res = await request('GET', `/admin/user/${testUserId}`);

  if (res.ok) {
    logSuccess('GET /admin/user/:id', `Retrieved user: ${res.data?.data?.name || 'Unknown'}`);
    return true;
  } else {
    logError('GET /admin/user/:id', `Status: ${res.status}`);
    return false;
  }
}

async function testBanUser() {
  logTest('Testing Ban User');

  if (!testUserId) {
    logWarning('Skipping (no test user available)');
    return false;
  }

  const res = await request('POST', '/admin/ban-user', {
    userId: testUserId,
    reason: 'Testing ban functionality',
  });

  if (res.ok) {
    logSuccess('POST /admin/ban-user', 'User banned successfully');
    return true;
  } else {
    logError('POST /admin/ban-user', `Status: ${res.status}`);
    return false;
  }
}

async function testSuspendUser() {
  logTest('Testing Suspend User');

  if (!testUserId) {
    logWarning('Skipping (no test user available)');
    return false;
  }

  const res = await request('POST', '/admin/suspend-user', {
    userId: testUserId,
    reason: 'Testing suspend functionality',
    duration: '24h',
  });

  if (res.ok) {
    logSuccess('POST /admin/suspend-user', 'User suspended successfully');
    return true;
  } else {
    logError('POST /admin/suspend-user', `Status: ${res.status}`);
    return false;
  }
}

async function testGetAllGames() {
  logTest('Testing Get All Games');

  const res = await request('GET', '/admin/games?page=1&limit=10');

  if (res.ok) {
    const games = res.data?.data?.games || [];
    if (games.length > 0) {
      testGameId = games[0]._id;
      logSuccess('GET /admin/games', `Retrieved ${games.length} games`);
      return true;
    } else {
      logWarning('No games found in database');
      return false;
    }
  } else {
    logError('GET /admin/games', `Status: ${res.status}`);
    return false;
  }
}

async function testGetLiveGames() {
  logTest('Testing Get Live Games');

  const res = await request('GET', '/admin/live-games?limit=50');

  if (res.ok) {
    const liveGames = res.data?.data?.games || [];
    logSuccess('GET /admin/live-games', `Retrieved ${liveGames.length} live games`);
    return true;
  } else {
    logError('GET /admin/live-games', `Status: ${res.status}`);
    return false;
  }
}

async function testForceEndGame() {
  logTest('Testing Force End Game');

  if (!testGameId) {
    logWarning('Skipping (no test game available)');
    return false;
  }

  const res = await request('POST', '/admin/force-end-game', {
    gameId: testGameId,
    reason: 'Testing force end functionality',
  });

  if (res.ok) {
    logSuccess('POST /admin/force-end-game', 'Game ended successfully');
    return true;
  } else {
    logError('POST /admin/force-end-game', `Status: ${res.status}`);
    return false;
  }
}

async function testAdjustWallet() {
  logTest('Testing Adjust Wallet');

  if (!testUserId) {
    logWarning('Skipping (no test user available)');
    return false;
  }

  const res = await request('POST', '/admin/wallet-adjustment', {
    userId: testUserId,
    amount: 100,
    type: 'add',
    reason: 'Testing wallet adjustment',
  });

  if (res.ok) {
    logSuccess(
      'POST /admin/wallet-adjustment',
      `Wallet adjusted, new balance: ${res.data?.data?.balance}`
    );
    return true;
  } else {
    logError('POST /admin/wallet-adjustment', `Status: ${res.status}`);
    return false;
  }
}

async function testSetDifficulty() {
  logTest('Testing Set Bot Difficulty');

  const difficulties = ['easy', 'medium', 'hard'];
  let allSuccess = true;

  for (const difficulty of difficulties) {
    const res = await request('POST', '/admin/set-difficulty', {
      difficulty,
    });

    if (res.ok) {
      logSuccess('POST /admin/set-difficulty', `Difficulty set to ${difficulty}`);
    } else {
      logError('POST /admin/set-difficulty', `Failed to set ${difficulty} (Status: ${res.status})`);
      allSuccess = false;
    }
  }

  return allSuccess;
}

async function testGetDifficulty() {
  logTest('Testing Get Bot Difficulty');

  const res = await request('GET', '/admin/get-difficulty');

  if (res.ok) {
    logSuccess('GET /admin/get-difficulty', `Current difficulty: ${res.data?.data?.difficulty}`);
    return true;
  } else {
    logError('GET /admin/get-difficulty', `Status: ${res.status}`);
    return false;
  }
}

async function testGetRevenue() {
  logTest('Testing Get Revenue Analytics');

  const res = await request('GET', '/admin/revenue?days=7&groupBy=day');

  if (res.ok) {
    const totalRevenue = res.data?.data?.summary?.totalRevenue || 0;
    logSuccess('GET /admin/revenue', `Total revenue (7 days): ${totalRevenue}`);
    return true;
  } else {
    logError('GET /admin/revenue', `Status: ${res.status}`);
    return false;
  }
}

async function runAllTests() {
  logSection('ADMIN API TEST SUITE');

  log(`\nAPI Base: ${API_BASE}`, 'cyan');
  log(`Time: ${new Date().toLocaleString()}`, 'cyan');
  log(`Token: ${adminToken.substring(0, 20)}...`, 'cyan');

  const results = [];

  try {
    // Setup
    await createTestAdmin();

    // Run all tests
    results.push(await testGetDashboard());
    results.push(await testGetAllUsers());
    results.push(await testGetSingleUser());
    results.push(await testBanUser());
    results.push(await testSuspendUser());
    results.push(await testGetAllGames());
    results.push(await testGetLiveGames());
    results.push(await testForceEndGame());
    results.push(await testAdjustWallet());
    results.push(await testSetDifficulty());
    results.push(await testGetDifficulty());
    results.push(await testGetRevenue());

    // Summary
    logSection('TEST SUMMARY');

    const passed = results.filter(r => r).length;
    const failed = results.filter(r => !r).length;

    log(`\n✅ Passed: ${passed}`, 'green');
    log(`❌ Failed: ${failed}`, 'red');
    log(`📊 Success Rate: ${Math.round((passed / results.length) * 100)}%`, 'cyan');

    log(
      '\n💡 Note: Failures are expected if data does not exist in database (e.g., no users/games)',
      'yellow'
    );

    log(
      '\n✨ To test with real data:\n' +
        '   1. Create test users/games in database\n' +
        '   2. Get a valid admin token from login\n' +
        '   3. Update adminToken variable in this script\n' +
        '   4. Re-run the tests',
      'cyan'
    );
  } catch (error) {
    logError('Test Suite', `Fatal error: ${error.message}`);
  }

  log('\n', 'reset');
}

// Run tests
runAllTests().catch(console.error);
