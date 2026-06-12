# 🎮 Admin - Live Game Difficulty Control (Quick Reference)

## 🆕 New Endpoint

**POST** `/admin/set-game-difficulty`

---

## 📋 Request Format

```json
{
  "gameId": "6a0c8678412862460a97360d",
  "difficulty": "hard"
}
```

---

## ⚡ 30-Second Usage

### Step 1: Get Live Game ID
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:5000/api/v1/admin/live-games
```

### Step 2: Change Bot Difficulty
```bash
curl -X POST http://localhost:5000/api/v1/admin/set-game-difficulty \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"gameId":"GAME_ID","difficulty":"hard"}'
```

---

## 🎯 Difficulty Levels

```
✅ easy   - Beginner
✅ medium - Intermediate  
✅ hard   - Expert
```

---

## ✨ Features

✅ **Real-time** - Changes apply instantly  
✅ **Game-specific** - Only affects that game  
✅ **Live games** - Works on active games  
✅ **Bot only** - Updates all bots in game  
✅ **Notify players** - Socket event sent  

---

## 📊 Response Example

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

---

## 🧪 Test It

```bash
node test_game_difficulty.js
```

---

## 📚 Full Documentation

See: [ADMIN_SET_GAME_DIFFICULTY.md](ADMIN_SET_GAME_DIFFICULTY.md)

---

**Version:** 1.0  
**Status:** ✅ Working
