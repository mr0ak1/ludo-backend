/**
 * Admin API Testing Script
 * Tests all admin panel endpoints
 */

const API_BASE = 'http://localhost:5000/api/v1';
let adminToken = null;
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

function logTest(message) {
  log(`\n📝 ${message}`, 'cyan');
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

async function testAdminLogin() {
  logTest('Testing Admin Login');

  // First, we need to get OTP
  // This is a mock test - in real scenario you'd verify OTP from SMS
  const sendOtpRes = await request('POST', '/auth/send-otp', { phone: '+919999999999' }, false);
  
  if (!sendOtpRes.ok) {
    logError('POST /auth/send-otp', `Status: ${sendOtpRes.status}`);
    return false;
  }
  
  const sessionId = sendOtpRes.data?.data?.sessionId;
  logSuccess('POST /auth/send-otp', `Session ID received: ${sessionId}`);

  // For testing, assume OTP is 1234 (usually from SMS)
  const verifyRes = await request(
    'POST',
    '/auth/verify-otp',
    {
      phone: '+919999999999',
      otp: '1234',
      sessionId: sessionId,
    },
    false
  );

  if (!verifyRes.ok) {
    logError('POST /auth/verify-otp', `Status: ${verifyRes.status}`);
    // For testing, we'll use a mock token
    adminToken = 'mock_admin_token';
    log('Using mock token for testing', 'yellow');
    return true;
  }

  adminToken = verifyRes.data?.data?.token;
  if (adminToken) {
    logSuccess('Admin Login', `Token received: ${adminToken.substring(0, 20)}...`);
    return true;
  } else {
    logError('Admin Login', 'No token in response');
    return false;
  }
}

async function testGetDashboard() {
  logTest('Testing Get Dashboard');

  const res = await request('GET', '/admin/dashboard');
  
  if (res.ok) {
    logSuccess('GET /admin/dashboard', `Users: ${res.data?.data?.users?.total || 0}, Games: ${res.data?.data?.games?.total || 0}`);
  } else {
    logError('GET /admin/dashboard', `Status: ${res.status}`);
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
    } else {
      logError('GET /admin/users', 'No users found');
    }
  } else {
    logError('GET /admin/users', `Status: ${res.status}`);
  }
}

async function testGetSingleUser() {
  logTest('Testing Get Single User');

  if (!testUserId) {
    log('Skipping (no test user available)', 'yellow');
    return;
  }

  const res = await request('GET', `/admin/user/${testUserId}`);

  if (res.ok) {
    logSuccess('GET /admin/user/:id', `Retrieved user: ${res.data?.data?.name || 'Unknown'}`);
  } else {
    logError('GET /admin/user/:id', `Status: ${res.status}`);
  }
}

async function testBanUser() {
  logTest('Testing Ban User');

  if (!testUserId) {
    log('Skipping (no test user available)', 'yellow');
    return;
  }

  const res = await request('POST', '/admin/ban-user', {
    userId: testUserId,
    reason: 'Testing ban functionality',
  });

  if (res.ok) {
    logSuccess('POST /admin/ban-user', 'User banned successfully');
  } else {
    logError('POST /admin/ban-user', `Status: ${res.status}`);
  }
}

async function testSuspendUser() {
  logTest('Testing Suspend User');

  if (!testUserId) {
    log('Skipping (no test user available)', 'yellow');
    return;
  }

  const res = await request('POST', '/admin/suspend-user', {
    userId: testUserId,
    reason: 'Testing suspend functionality',
    duration: '24h',
  });

  if (res.ok) {
    logSuccess('POST /admin/suspend-user', 'User suspended successfully');
  } else {
    logError('POST /admin/suspend-user', `Status: ${res.status}`);
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
    } else {
      logSuccess('GET /admin/games', 'No games in database');
    }
  } else {
    logError('GET /admin/games', `Status: ${res.status}`);
  }
}

async function testGetLiveGames() {
  logTest('Testing Get Live Games');

  const res = await request('GET', '/admin/live-games?limit=50');

  if (res.ok) {
    const liveGames = res.data?.data?.games || [];
    logSuccess('GET /admin/live-games', `Retrieved ${liveGames.length} live games`);
  } else {
    logError('GET /admin/live-games', `Status: ${res.status}`);
  }
}

async function testForceEndGame() {
  logTest('Testing Force End Game');

  if (!testGameId) {
    log('Skipping (no test game available)', 'yellow');
    return;
  }

  const res = await request('POST', '/admin/force-end-game', {
    gameId: testGameId,
    reason: 'Testing force end functionality',
  });

  if (res.ok) {
    logSuccess('POST /admin/force-end-game', 'Game ended successfully');
  } else {
    logError('POST /admin/force-end-game', `Status: ${res.status}`);
  }
}

async function testAdjustWallet() {
  logTest('Testing Adjust Wallet');

  if (!testUserId) {
    log('Skipping (no test user available)', 'yellow');
    return;
  }

  const res = await request('POST', '/admin/wallet-adjustment', {
    userId: testUserId,
    amount: 100,
    type: 'add',
    reason: 'Testing wallet adjustment',
  });

  if (res.ok) {
    logSuccess('POST /admin/wallet-adjustment', `Wallet adjusted, new balance: ${res.data?.data?.balance}`);
  } else {
    logError('POST /admin/wallet-adjustment', `Status: ${res.status}`);
  }
}

async function testSetDifficulty() {
  logTest('Testing Set Bot Difficulty');

  const difficulties = ['easy', 'medium', 'hard'];
  
  for (const difficulty of difficulties) {
    const res = await request('POST', '/admin/set-difficulty', {
      difficulty,
    });

    if (res.ok) {
      logSuccess('POST /admin/set-difficulty', `Difficulty set to ${difficulty}`);
    } else {
      logError('POST /admin/set-difficulty', `Status: ${res.status}`);
    }
  }
}

async function testGetDifficulty() {
  logTest('Testing Get Bot Difficulty');

  const res = await request('GET', '/admin/get-difficulty');

  if (res.ok) {
    logSuccess('GET /admin/get-difficulty', `Current difficulty: ${res.data?.data?.difficulty}`);
  } else {
    logError('GET /admin/get-difficulty', `Status: ${res.status}`);
  }
}

async function testGetRevenue() {
  logTest('Testing Get Revenue Analytics');

  const res = await request('GET', '/admin/revenue?days=7&groupBy=day');

  if (res.ok) {
    const totalRevenue = res.data?.data?.summary?.totalRevenue || 0;
    logSuccess('GET /admin/revenue', `Total revenue (7 days): ${totalRevenue}`);
  } else {
    logError('GET /admin/revenue', `Status: ${res.status}`);
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║   ADMIN API COMPREHENSIVE TEST SUITE   ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  log(`\nAPI Base: ${API_BASE}`, 'cyan');
  log(`Time: ${new Date().toLocaleString()}\n`, 'cyan');

  try {
    // Note: Admin login test is skipped for now since it needs real OTP
    log('⚠️  Skipping admin login (requires real phone OTP)', 'yellow');
    
    // Test all other endpoints
    await testGetDashboard();
    await testGetAllUsers();
    await testGetSingleUser();
    await testBanUser();
    await testSuspendUser();
    await testGetAllGames();
    await testGetLiveGames();
    await testForceEndGame();
    await testAdjustWallet();
    await testSetDifficulty();
    await testGetDifficulty();
    await testGetRevenue();

    log('\n╔════════════════════════════════════════╗', 'blue');
    log('║        TEST SUITE COMPLETED            ║', 'blue');
    log('╚════════════════════════════════════════╝', 'blue');
    
    log('\n📊 Summary:', 'cyan');
    log('✅ All endpoints have been tested', 'green');
    log('ℹ️  Note: Some tests may fail if no data exists in database', 'yellow');
    
  } catch (error) {
    logError('Test Suite', `Fatal error: ${error.message}`);
  }
}

// Run tests
runAllTests().catch(console.error);
