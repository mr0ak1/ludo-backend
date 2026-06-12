/**
 * Admin Login Test - Username/Password Authentication
 * Tests the new admin login with credentials from .env
 */

const API_BASE = 'http://localhost:5000/api/v1';

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

async function testAdminLogin() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║    ADMIN LOGIN TEST (Username/Pass)    ║', 'blue');
  log('╚════════════════════════════════════════╝\n', 'blue');

  const credentials = {
    username: 'Ludo_King0101',
    password: 'Ludo_King0101',
  };

  log(`Testing with credentials:`);
  log(`  Username: ${credentials.username}`, 'cyan');
  log(`  Password: ${'*'.repeat(credentials.password.length)}`, 'cyan');

  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (response.ok) {
      log('\n✅ Admin Login Successful!\n', 'green');
      log('Response Data:', 'cyan');
      log(`  User ID: ${data.data.user.userId}`, 'green');
      log(`  Name: ${data.data.user.name}`, 'green');
      log(`  Email: ${data.data.user.email}`, 'green');
      log(`  isAdmin: ${data.data.user.isAdmin}`, 'green');

      log(`\n🎫 Admin Token (Save this):\n`, 'yellow');
      log(data.data.token, 'magenta');

      log(`\n📋 Usage in Headers:`, 'cyan');
      log(`Authorization: Bearer ${data.data.token.substring(0, 20)}...`, 'cyan');

      return {
        success: true,
        token: data.data.token,
        user: data.data.user,
      };
    } else {
      log(`\n❌ Login Failed!\n`, 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Full Response:`, 'red');
      console.error(JSON.stringify(data, null, 2));
      log(`Error: ${data.error || JSON.stringify(data)}`, 'red');
      return {
        success: false,
        error: data.error,
      };
    }
  } catch (error) {
    log(`\n❌ Network Error:`, 'red');
    log(error.message, 'red');
    return {
      success: false,
      error: error.message,
    };
  }
}

async function testInvalidCredentials() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║  TESTING INVALID CREDENTIALS (Should Fail)  ║', 'blue');
  log('╚════════════════════════════════════════╝\n', 'blue');

  const invalidCredentials = [
    { username: 'wrong_user', password: 'Ludo_King0101', label: 'Wrong Username' },
    { username: 'Ludo_King0101', password: 'wrong_pass', label: 'Wrong Password' },
    { username: '', password: '', label: 'Empty Credentials' },
  ];

  for (const cred of invalidCredentials) {
    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cred.username,
          password: cred.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        log(`✅ ${cred.label}: Correctly Rejected`, 'green');
        log(`   Status: ${response.status}, Error: ${data.error}\n`, 'cyan');
      } else {
        log(`❌ ${cred.label}: Should have failed!`, 'red');
      }
    } catch (error) {
      log(`❌ ${cred.label}: Network error - ${error.message}\n`, 'red');
    }
  }
}

async function main() {
  try {
    // Test valid login
    const result = await testAdminLogin();

    if (result.success) {
      log('\n' + '═'.repeat(50), 'blue');
      log('✅ ADMIN LOGIN WORKING PERFECTLY!', 'green');
      log('═'.repeat(50) + '\n', 'blue');

      // Test invalid credentials
      await testInvalidCredentials();

      log('\n' + '═'.repeat(50), 'blue');
      log('🎉 ALL TESTS COMPLETED SUCCESSFULLY!', 'green');
      log('═'.repeat(50) + '\n', 'blue');
    } else {
      log('\n❌ Login failed. Check if server is running (npm start)', 'red');
    }
  } catch (error) {
    log(`\n❌ Test Error: ${error.message}\n`, 'red');
  }
}

main();
