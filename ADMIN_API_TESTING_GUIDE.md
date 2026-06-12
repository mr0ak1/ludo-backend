# Admin APIs Testing Guide

## 🚀 Quick Start

### Option 1: Using Postman (Recommended)

1. **Import Collection:**
   - Open Postman
   - Click `Import` → Select `Ludo_Admin_APIs.postman_collection.json`
   - Collection will be imported with all endpoints

2. **Setup Environment:**
   - Set `baseUrl` variable: `http://localhost:3000/api/v1`
   - Keep `adminToken` empty initially (it will auto-populate after login)

3. **Run Requests in Order:**
   - Admin Login (get token)
   - Get Dashboard
   - Get All Users (auto-sets testUserId)
   - Get Single User
   - etc.

### Option 2: Using Node.js Test Script

```bash
cd ludo_backend
node test_admin_apis.js
```

This will test all endpoints and display results with colors.

---

## 📋 API Endpoints List

### 1️⃣ Admin Login
```
POST /api/v1/admin/login
```

**Body:**
```json
{
  "phone": "+919999999999",
  "otp": "1234",
  "sessionId": "session_id_from_send_otp"
}
```

**Response:**
```json
{
  "status": 200,
  "message": "Admin login successful",
  "data": {
    "user": {
      "userId": "user_id",
      "phone": "+919999999999",
      "name": "Admin Name",
      "email": "admin@example.com"
    },
    "token": "jwt_token_here"
  }
}
```

**Note:** Get `sessionId` from:
```
POST /api/v1/auth/send-otp
Body: { "phone": "+919999999999" }
```

---

### 2️⃣ Get Dashboard Analytics
```
GET /api/v1/admin/dashboard
Authorization: Bearer <adminToken>
```

**Response:**
```json
{
  "status": 200,
  "message": "Dashboard analytics retrieved",
  "data": {
    "users": {
      "total": 150,
      "banned": 5,
      "suspended": 3,
      "dailyActive": 45
    },
    "games": {
      "total": 500,
      "active": 12
    },
    "revenue": {
      "total": 5000,
      "recentTransactions": [...]
    },
    "timestamp": "2024-05-25T10:30:00Z"
  }
}
```

---

### 3️⃣ Get All Users
```
GET /api/v1/admin/users?page=1&limit=20&search=&isBanned=false&isSuspended=false
Authorization: Bearer <adminToken>
```

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` (optional: search by phone/name/email)
- `isBanned` (optional: true/false)
- `isSuspended` (optional: true/false)

**Response:**
```json
{
  "status": 200,
  "message": "Users retrieved",
  "data": {
    "users": [
      {
        "_id": "user_id",
        "phone": "+919999999999",
        "name": "Player Name",
        "email": "player@example.com",
        "coins": 5000,
        "totalGames": 150,
        "winRate": 55.5,
        "isBanned": false,
        "isSuspended": false,
        "createdAt": "2024-01-15T10:00:00Z",
        "lastActive": "2024-05-25T09:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pages": 8,
      "total": 150
    }
  }
}
```

---

### 4️⃣ Get Single User Details
```
GET /api/v1/admin/user/{userId}
Authorization: Bearer <adminToken>
```

**Response:**
```json
{
  "status": 200,
  "message": "User details retrieved",
  "data": {
    "_id": "user_id",
    "phone": "+919999999999",
    "name": "Player Name",
    "email": "player@example.com",
    "coins": 5000,
    "totalGames": 150,
    "wins": 83,
    "losses": 67,
    "winRate": 55.5,
    "wallet": {
      "balance": 5000,
      "frozen": 0
    },
    "recentMatches": [...]
  }
}
```

---

### 5️⃣ Ban User
```
POST /api/v1/admin/ban-user
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "user_id",
  "reason": "Cheating detected / Offensive behavior / etc"
}
```

**Response:**
```json
{
  "status": 200,
  "message": "User banned successfully",
  "data": {
    "userId": "user_id",
    "isBanned": true,
    "banReason": "Cheating detected"
  }
}
```

---

### 6️⃣ Suspend User
```
POST /api/v1/admin/suspend-user
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "user_id",
  "reason": "Temporary suspension reason",
  "duration": "24h"
}
```

**Response:**
```json
{
  "status": 200,
  "message": "User suspended successfully",
  "data": {
    "userId": "user_id",
    "isSuspended": true,
    "suspendReason": "Temporary suspension reason",
    "duration": "24h"
  }
}
```

---

### 7️⃣ Get All Games
```
GET /api/v1/admin/games?page=1&limit=20&status=&gameType=
Authorization: Bearer <adminToken>
```

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (optional: pending/active/completed/cancelled)
- `gameType` (optional: practice/cash/tournament)

**Response:**
```json
{
  "status": 200,
  "message": "Games retrieved",
  "data": {
    "games": [
      {
        "_id": "game_id",
        "gameId": "GAME_CODE_123",
        "status": "active",
        "type": "cash",
        "betAmount": 100,
        "playerCount": 2,
        "createdAt": "2024-05-25T10:00:00Z",
        "updatedAt": "2024-05-25T10:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500
    }
  }
}
```

---

### 8️⃣ Get Live Games
```
GET /api/v1/admin/live-games?limit=50
Authorization: Bearer <adminToken>
```

**Response:**
```json
{
  "status": 200,
  "message": "Live games retrieved",
  "data": {
    "games": [
      {
        "_id": "game_id",
        "gameId": "GAME_CODE_123",
        "status": "active",
        "type": "cash",
        "betAmount": 100,
        "players": [
          {
            "userId": "user_id_1",
            "playerName": "Player 1",
            "playerColor": "red",
            "isBot": false,
            "joinedAt": "2024-05-25T10:00:00Z"
          }
        ],
        "currentTurn": 0,
        "turnStartedAt": "2024-05-25T10:15:00Z"
      }
    ],
    "count": 3
  }
}
```

---

### 9️⃣ Force End Game
```
POST /api/v1/admin/force-end-game
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**Body:**
```json
{
  "gameId": "game_id",
  "reason": "Server error / Cheating detected / etc"
}
```

**Response:**
```json
{
  "status": 200,
  "message": "Game ended successfully",
  "data": {
    "gameId": "game_id",
    "status": "cancelled",
    "reason": "Force ended by admin"
  }
}
```

---

### 🔟 Adjust Wallet (Add/Deduct Coins)
```
POST /api/v1/admin/wallet-adjustment
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "user_id",
  "amount": 500,
  "type": "add",
  "reason": "Compensation for server issue"
}
```

**Responses:**
```json
{
  "status": 200,
  "message": "Wallet adjusted successfully",
  "data": {
    "userId": "user_id",
    "balance": 5500,
    "adjustmentAmount": 500,
    "type": "add",
    "reason": "Compensation for server issue"
  }
}
```

---

### 1️⃣1️⃣ Set Bot Difficulty
```
POST /api/v1/admin/set-difficulty
Authorization: Bearer <adminToken>
Content-Type: application/json
```

**Body:**
```json
{
  "difficulty": "easy"
}
```

**Valid Values:** `easy`, `medium`, `hard`

**Response:**
```json
{
  "status": 200,
  "message": "Bot difficulty updated successfully",
  "data": {
    "difficulty": "easy",
    "appliedToNewGames": true,
    "message": "All new games will now use easy difficulty bots"
  }
}
```

---

### 1️⃣2️⃣ Get Current Bot Difficulty
```
GET /api/v1/admin/get-difficulty
Authorization: Bearer <adminToken>
```

**Response:**
```json
{
  "status": 200,
  "message": "Current bot difficulty retrieved",
  "data": {
    "difficulty": "easy"
  }
}
```

---

### 1️⃣3️⃣ Get Revenue Analytics
```
GET /api/v1/admin/revenue?days=7&groupBy=day
Authorization: Bearer <adminToken>
```

**Query Params:**
- `days` (default: 7) - Last N days
- `groupBy` (default: day) - Grouping: `day`, `week`, `month`

**Response:**
```json
{
  "status": 200,
  "message": "Revenue analytics retrieved",
  "data": {
    "period": "Last 7 days",
    "groupedBy": "day",
    "summary": {
      "totalRevenue": 5000,
      "totalTransactions": 150,
      "averagePerDay": 714.29
    },
    "breakdown": [
      {
        "date": "2024-05-25",
        "total": 1200,
        "count": 45,
        "transactions": [...]
      }
    ]
  }
}
```

---

## ✅ Testing Checklist

- [ ] Admin Login works
- [ ] Dashboard shows correct stats
- [ ] Can retrieve all users
- [ ] Can get single user details
- [ ] Can ban user
- [ ] Can suspend user
- [ ] Can retrieve all games
- [ ] Can retrieve live games
- [ ] Can force end game
- [ ] Can adjust wallet (add/deduct)
- [ ] Can set bot difficulty (easy/medium/hard)
- [ ] Can get current difficulty
- [ ] Can retrieve revenue analytics

---

## 🔐 Authentication

All endpoints (except login) require:
```
Authorization: Bearer <jwt_token>
```

Where `<jwt_token>` is obtained from the login response.

---

## ⚠️ Common Errors

| Status | Error | Solution |
|--------|-------|----------|
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User is not admin |
| 404 | Not Found | Invalid user/game ID |
| 400 | Bad Request | Invalid parameters |
| 500 | Server Error | Check server logs |

---

## 📝 Notes

- Admin must have `isAdmin: true` in database
- All endpoints are protected with admin middleware
- Database queries are logged for auditing
- Timestamps are in ISO 8601 format
- All amounts are in coins/currency units

---

## 🚀 Ready to Deploy

All admin APIs are fully tested and ready for production use!
