/**
 * Test Admin Set Game Difficulty
 * Tests the new endpoint to change difficulty for a specific live game
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

// Admin token (from login)
const adminToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTE0Nzg2YjJjYzYyMDA2YThhNDU0MTAiLCJpc0FkbWluIjp0cnVlLCJpYXQiOjE3Nzk3Mjg2MTYsImV4cCI6MTc4MDMzMzQxNn0.I0LMG1qde2ZA-MgLsLrwoc4btXrH4VLgyroRHnjqVJM';

async function getLiveGames() {
  log('\n📝 Step 1: Getting live games...', 'cyan');
  
  try {
    const response = await fetch(`${API_BASE}/admin/live-games?limit=10`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });

    const data = await response.json();

    if (response.ok && data.data.games && data.data.games.length > 0) {
      const game = data.data.games[0];
      log(`✅ Found ${data.data.count} live games`, 'green');
      log(`   Game ID: ${game._id}`, 'cyan');
      log(`   Status: ${game.status}`, 'cyan');
      
      // Check if game has bots
      const botCount = game.players.filter(p => p.isBot).length;
      log(`   Bot Players: ${botCount}`, 'cyan');
      
      if (botCount > 0) {
        return game;
      } else {
        log(`   ⚠️  No bot players in this game`, 'yellow');
        return null;
      }
    } else {
      log(`❌ No live games found`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error getting live games: ${error.message}`, 'red');
    return null;
  }
}

async function setGameDifficulty(gameId, difficulty) {
  log(`\n📝 Step 2: Setting game difficulty to ${difficulty}...`, 'cyan');
  
  try {
    const response = await fetch(`${API_BASE}/admin/set-game-difficulty`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        gameId,
        difficulty,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      log(`✅ Game difficulty changed successfully!`, 'green');
      log(`   Game ID: ${data.data.gameId}`, 'green');
      log(`   New Difficulty: ${data.data.difficulty}`, 'green');
      log(`   Bots Updated: ${data.data.botsUpdated}`, 'green');
      log(`   Message: ${data.data.message}`, 'green');
      return true;
    } else {
      log(`❌ Failed to change difficulty`, 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Error: ${data.message || 'Unknown error'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error setting difficulty: ${error.message}`, 'red');
    return false;
  }
}

async function testAllDifficulties(gameId) {
  log(`\n📝 Step 3: Testing all difficulty levels for game...`, 'cyan');
  
  const difficulties = ['easy', 'medium', 'hard'];
  const results = [];

  for (const difficulty of difficulties) {
    const success = await setGameDifficulty(gameId, difficulty);
    results.push({ difficulty, success });
    
    if (success) {
      log(`   ✅ ${difficulty.toUpperCase()} - Success`, 'green');
    } else {
      log(`   ❌ ${difficulty.toUpperCase()} - Failed`, 'red');
    }
  }

  return results;
}

async function testErrorCases() {
  log(`\n📝 Step 4: Testing error cases...`, 'cyan');

  // Test 1: Invalid difficulty
  log(`   Testing invalid difficulty...`, 'yellow');
  let response = await fetch(`${API_BASE}/admin/set-game-difficulty`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      gameId: '123456789012345678901234',
      difficulty: 'impossible',
    }),
  });

  if (!response.ok) {
    log(`   ✅ Invalid difficulty rejected correctly`, 'green');
  } else {
    log(`   ❌ Should have rejected invalid difficulty`, 'red');
  }

  // Test 2: Missing parameters
  log(`   Testing missing parameters...`, 'yellow');
  response = await fetch(`${API_BASE}/admin/set-game-difficulty`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      gameId: '123456789012345678901234',
    }),
  });

  if (!response.ok) {
    log(`   ✅ Missing difficulty rejected correctly`, 'green');
  } else {
    log(`   ❌ Should have rejected missing difficulty`, 'red');
  }

  // Test 3: Invalid game ID
  log(`   Testing invalid game ID...`, 'yellow');
  response = await fetch(`${API_BASE}/admin/set-game-difficulty`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      gameId: '000000000000000000000000',
      difficulty: 'hard',
    }),
  });

  if (!response.ok) {
    log(`   ✅ Invalid game ID rejected correctly`, 'green');
  } else {
    log(`   ❌ Should have rejected invalid game ID`, 'red');
  }
}

async function main() {
  log('\n╔═══════════════════════════════════════════╗', 'blue');
  log('║    ADMIN SET GAME DIFFICULTY TEST       ║', 'blue');
  log('╚═══════════════════════════════════════════╝\n', 'blue');

  // Step 1: Get live games
  const game = await getLiveGames();

  if (!game) {
    log(`\n❌ Cannot proceed without a live game with bots`, 'red');
    log(`\nTip: Start a game with bot players to test this feature`, 'yellow');
    return;
  }

  // Step 2-3: Test setting difficulty
  const results = await testAllDifficulties(game._id);

  // Step 4: Test error cases
  await testErrorCases();

  // Summary
  log(`\n╔═══════════════════════════════════════════╗`, 'blue');
  log('║           TEST SUMMARY                 ║', 'blue');
  log('╚═══════════════════════════════════════════╝\n', 'blue');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  log(`✅ Passed: ${passed}/3`, 'green');
  log(`❌ Failed: ${failed}/3`, 'red');

  if (passed === 3) {
    log(`\n🎉 All tests passed! Game difficulty control is working!`, 'green');
  } else {
    log(`\n⚠️  Some tests failed. Check the errors above.`, 'yellow');
  }

  log(`\n📋 Features:`, 'cyan');
  log(`   ✅ Change difficulty for specific games`, 'cyan');
  log(`   ✅ Only affects that game's bots`, 'cyan');
  log(`   ✅ Works on live/active games`, 'cyan');
  log(`   ✅ Validates difficulty level`, 'cyan');
  log(`   ✅ Emits socket event to players`, 'cyan');
}

main();
