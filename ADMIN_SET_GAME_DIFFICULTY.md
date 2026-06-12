# 🎮 Admin - Set Game Difficulty Feature

## ✅ Status: COMPLETE & WORKING

Admin can now change bot difficulty for **specific live games** in real-time!

---

## 🎯 New Endpoint

**POST** `/admin/set-game-difficulty`

### Request Body
```json
{
  "gameId": "6a0c8678412862460a97360d",
  "difficulty": "hard"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Bot difficulty updated for game",
  "data": {
    "gameId": "6a0c8678412862460a97360d",
    "difficulty": "hard",
    "botsUpdated": 1,
    "message": "1 bot(s) in game updated to hard difficulty"
  }
}
```

### Error Responses

**400 - Missing Parameters:**
```json
{
  "success": false,
  "message": "gameId and difficulty are required"
}
```

**400 - Invalid Difficulty:**
```json
{
  "success": false,
  "message": "Difficulty must be one of: easy, medium, hard"
}
```

**400 - Inactive Game:**
```json
{
  "success": false,
  "message": "Can only change difficulty for active/ongoing games"
}
```

**400 - No Bots:**
```json
{
  "success": false,
  "message": "No bot players found in this game"
}
```

**404 - Game Not Found:**
```json
{
  "success": false,
  "message": "Game not found"
}
```

---

## 📋 Difficulty Levels

```
✅ easy    - Beginner difficulty
✅ medium  - Intermediate difficulty
✅ hard    - Expert difficulty
```

---

## 🔐 Authentication

**Required Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Admin Must Be:**
- ✅ Authenticated with valid token
- ✅ Have `isAdmin: true` flag

---

## 💻 Usage Examples

### cURL
```bash
curl -X POST http://localhost:5000/api/v1/admin/set-game-difficulty \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "6a0c8678412862460a97360d",
    "difficulty": "hard"
  }'
```

### JavaScript/Node.js
```javascript
const response = await fetch('http://localhost:5000/api/v1/admin/set-game-difficulty', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    gameId: '6a0c8678412862460a97360d',
    difficulty: 'hard'
  })
});

const data = await response.json();
console.log(`${data.data.botsUpdated} bots updated to ${data.data.difficulty}`);
```

### Postman
1. **Method:** POST
2. **URL:** `http://localhost:5000/api/v1/admin/set-game-difficulty`
3. **Headers:**
   - `Authorization: Bearer <token>`
   - `Content-Type: application/json`
4. **Body (raw JSON):**
```json
{
  "gameId": "6a0c8678412862460a97360d",
  "difficulty": "hard"
}
```

---

## 🔄 How It Works

### Step 1: Get Live Games
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/v1/admin/live-games
```

### Step 2: Copy Game ID
From the response, get the `_id` of any game with bot players.

### Step 3: Change Difficulty
```bash
curl -X POST http://localhost:5000/api/v1/admin/set-game-difficulty \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"gameId":"<game_id>","difficulty":"hard"}'
```

### Step 4: Bots Update Immediately
- ✅ All bots in that game use new difficulty
- ✅ Socket event sent to players
- ✅ Only affects that specific game
- ✅ Global difficulty unchanged

---

## ✨ Features

✅ **Real-time Changes** - Difficulty updates instantly  
✅ **Game-Specific** - Only affects that game's bots  
✅ **Live Games Only** - Works on active/ongoing games  
✅ **Socket Events** - Players notified via Socket.io  
✅ **Validation** - Input validation & error handling  
✅ **Logging** - Changes logged for audit trail  

---

## 🧪 Test It

### Automated Test
```bash
node test_game_difficulty.js
```

**Test Coverage:**
- ✅ Get live games with bots
- ✅ Change to easy difficulty
- ✅ Change to medium difficulty
- ✅ Change to hard difficulty
- ✅ Invalid difficulty rejection
- ✅ Missing parameters validation
- ✅ Invalid game ID handling

---

## 📊 Test Results

```
✅ EASY: Changed successfully (1 bot updated)
✅ MEDIUM: Changed successfully (1 bot updated)
✅ HARD: Changed successfully (1 bot updated)
✅ Invalid Difficulty: Rejected correctly (400)
✅ Missing Parameters: Rejected correctly (400)
✅ Invalid Game ID: Rejected correctly (404)
```

---

## 🎮 Real-World Scenarios

### Scenario 1: Adjust Difficulty Mid-Game
```
Admin sees player struggling in live game
Admin changes bot difficulty from "hard" to "easy"
Player receives notification
Bots immediately play easier
Player recovers and wins
```

### Scenario 2: Make Game Challenging
```
Admin monitors live games
Sees player beating bots too easily
Changes difficulty to "hard"
Bots play smarter strategy
Game becomes competitive
```

### Scenario 3: Event Management
```
Event: Tournament Round
Admin sees players struggling
Adjusts difficulty for fairness
Different games can have different difficulties
Event flows smoothly
```

---

## 📝 Complete Admin API List (14 Endpoints)

| # | Endpoint | Method | Purpose |
|----|----------|--------|---------|
| 1 | `/admin/login` | POST | Admin login |
| 2 | `/admin/dashboard` | GET | Dashboard stats |
| 3 | `/admin/users` | GET | List all users |
| 4 | `/admin/user/:id` | GET | User details |
| 5 | `/admin/ban-user` | POST | Ban a user |
| 6 | `/admin/suspend-user` | POST | Suspend user |
| 7 | `/admin/games` | GET | List games |
| 8 | `/admin/live-games` | GET | List live games |
| 9 | `/admin/force-end-game` | POST | End game |
| 10 | `/admin/wallet-adjustment` | POST | Adjust coins |
| 11 | `/admin/set-difficulty` | POST | **Global** bot difficulty |
| 12 | **`/admin/set-game-difficulty`** | **POST** | **🆕 Game-specific** difficulty |
| 13 | `/admin/get-difficulty` | GET | Get current difficulty |
| 14 | `/admin/revenue` | GET | Revenue analytics |

---

## 🔧 Implementation Details

### Files Modified

**1. `src/routes/admin.routes.js`**
```javascript
router.post('/set-game-difficulty', authMiddleware, adminMiddleware, adminController.setGameDifficulty);
```

**2. `src/controllers/adminController.js`**
```javascript
const setGameDifficulty = async (req, res, next) => {
  // Validates gameId and difficulty
  // Finds game and checks if active
  // Updates all bot players in game
  // Emits socket event
  // Returns updated bot count
};
```

### Logic Flow
```
1. Validate input (gameId, difficulty)
2. Find game by ID
3. Check game is active/ongoing
4. Count and update bot players
5. Save game with new bot difficulties
6. Emit socket event: "game:bot-difficulty-changed"
7. Return success with bot count
```

---

## 🔄 Difference: Global vs Game-Specific

### Global Difficulty (`/admin/set-difficulty`)
```
Effect: All NEW games use this difficulty
Scope: Affects future games only
Impact: Permanent until changed again
Use: Change default bot difficulty
```

### Game-Specific Difficulty (`/admin/set-game-difficulty`)
```
Effect: Only that LIVE game's bots
Scope: Only that game, doesn't affect others
Impact: Immediate
Use: Fine-tune active games
```

---

## 📊 Comparison Table

| Feature | Global | Game-Specific |
|---------|--------|---------------|
| Endpoint | `/set-difficulty` | `/set-game-difficulty` |
| Affects | All new games | Only that game |
| Parameter | difficulty | gameId + difficulty |
| Scope | Permanent default | Temporary for game |
| Game Status | Any status | Active/Ongoing only |
| Use Case | Default settings | Fine-tuning |

---

## ⚠️ Important Notes

⚠️ **Only Active Games** - Can only change difficulty for active/ongoing games  
⚠️ **Requires Bots** - Game must have at least 1 bot player  
⚠️ **Real-time** - Changes apply immediately, mid-game  
⚠️ **Socket Notify** - Players receive notification  
⚠️ **Admin Only** - Requires admin authentication  

---

## 🎉 Summary

| Component | Status |
|-----------|--------|
| Implementation | ✅ Complete |
| Testing | ✅ All tests passing |
| Documentation | ✅ Complete |
| Error Handling | ✅ Comprehensive |
| Socket Events | ✅ Working |
| Production Ready | ✅ Yes |

---

**Version:** 1.0  
**Added:** 25/5/2026  
**Status:** ✅ Production Ready  

**🎮 Admin now has real-time control over live game bot difficulty!**
