# Admin Panel API Endpoints Documentation

This document contains all the necessary API endpoints required to build the Frontend Admin Panel for the Ludo application. All endpoints (except login) require an Authorization header with a valid admin Bearer token.

**Base URL**: `http://<your-server-url>/api/v1/admin`

---

## 1. Authentication

### 1.1 Admin Login
- **Endpoint**: `POST /login`
- **Description**: Authenticates the admin user and returns a token.
- **Request Body**:
```json
{
  "username": "admin_username",
  "password": "admin_password"
}
```
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Admin login successful",
  "data": {
    "user": {
      "userId": "60d5f...",
      "name": "Ludo Admin",
      "email": "admin@ludo.test",
      "isAdmin": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR..."
  }
}
```

---

## 2. Dashboard & Statistics

### 2.1 Get Dashboard Analytics
- **Endpoint**: `GET /dashboard`
- **Description**: Retrieves high-level analytics for the admin dashboard.
- **Query Params**: `page` (optional), `limit` (optional)
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Dashboard analytics retrieved",
  "data": {
    "users": {
      "total": 150,
      "banned": 5,
      "suspended": 2,
      "dailyActive": 45
    },
    "games": {
      "total": 1200,
      "active": 12
    },
    "revenue": {
      "total": 50000,
      "recentTransactions": [...]
    },
    "timestamp": "2024-05-26T10:00:00Z"
  }
}
```

### 2.2 Get Live Stats
- **Endpoint**: `GET /live-stats`
- **Description**: Real-time statistics including currently online users and today's total gameplay volume.
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Live stats retrieved",
  "data": {
    "appOpenUsers": 145,
    "playingUsers": 48,
    "todayGameplayAmount": 12500,
    "totalUserBalance": 850000
  }
}
```

### 2.3 Get Revenue Analytics
- **Endpoint**: `GET /revenue`
- **Description**: Retrieves detailed revenue data based on selected grouping.
- **Query Params**:
  - `days` (default: 7)
  - `groupBy` (default: 'day' | options: 'day', 'week', 'month')
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Revenue analytics retrieved",
  "data": {
    "period": "Last 7 days",
    "groupedBy": "day",
    "summary": {
      "totalRevenue": 25000,
      "totalTransactions": 150,
      "averagePerDay": 3571.42
    },
    "breakdown": [
      {
        "date": "2024-05-25",
        "total": 4500,
        "count": 30,
        "transactions": [...]
      }
    ]
  }
}
```

---

## 3. User Management

### 3.1 Get All Users
- **Endpoint**: `GET /users`
- **Description**: Retrieves a paginated list of all users.
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 20)
  - `search` (optional string)
  - `isBanned` (optional boolean string 'true'/'false')
  - `isSuspended` (optional boolean string 'true'/'false')
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Users retrieved",
  "data": {
    "users": [
      {
        "_id": "60d...",
        "phone": "+919876543210",
        "name": "John Doe",
        "email": "john@example.com",
        "coins": 1500,
        "totalGames": 45,
        "winRate": 55.5,
        "isBanned": false,
        "isSuspended": false,
        "createdAt": "2024-01-01T00:00:00Z",
        "lastActive": "2024-05-26T10:00:00Z"
      }
    ],
    "pagination": { "page": 1, "pages": 5, "total": 100 }
  }
}
```

### 3.2 Get Single User Profile
- **Endpoint**: `GET /user/:id`
- **Description**: Retrieves detailed information of a specific user including wallet and recent matches.
- **Path Params**: `id` (User Object ID)
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "User details retrieved",
  "data": {
    "_id": "60d...",
    "name": "John Doe",
    "phone": "+919876543210",
    "coins": 1500,
    "wins": 25,
    "losses": 20,
    "totalGames": 45,
    "winRate": 55.5,
    "isBanned": false,
    "isSuspended": false,
    "wallet": {
      "balance": 1500,
      "isLocked": false
    },
    "recentMatches": [
      {
        "_id": "match_id_1",
        "betAmount": 100,
        "status": "completed",
        "createdAt": "..."
      }
    ]
  }
}
```

### 3.3 Ban User
- **Endpoint**: `POST /ban-user`
- **Description**: Permanently bans a user from the platform.
- **Request Body**:
```json
{
  "userId": "60d...",
  "reason": "Violating terms of service"
}
```
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "User banned successfully",
  "data": {
    "userId": "60d...",
    "isBanned": true,
    "banReason": "Violating terms of service"
  }
}
```

### 3.4 Suspend User
- **Endpoint**: `POST /suspend-user`
- **Description**: Temporarily suspends a user.
- **Request Body**:
```json
{
  "userId": "60d...",
  "reason": "Suspicious activity detected",
  "duration": "7 days" // Informational string
}
```
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "User suspended successfully",
  "data": {
    "userId": "60d...",
    "isSuspended": true,
    "suspendReason": "Suspicious activity detected",
    "duration": "7 days"
  }
}
```

### 3.5 Adjust User Wallet
- **Endpoint**: `POST /wallet-adjustment`
- **Description**: Manually add or deduct coins from a user's wallet.
- **Request Body**:
```json
{
  "userId": "60d...",
  "amount": 500,
  "type": "add", // 'add' or 'deduct'
  "reason": "Promo bonus"
}
```
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Wallet adjusted successfully",
  "data": {
    "userId": "60d...",
    "balance": 2000,
    "adjustmentAmount": 500,
    "type": "add",
    "reason": "Promo bonus"
  }
}
```

---

## 4. Game Management

### 4.1 Get All Game History
- **Endpoint**: `GET /games`
- **Description**: Retrieves a paginated history of all games played on the platform.
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 20)
  - `status` (optional: 'completed', 'active', 'cancelled', 'pending')
  - `gameType` (optional)
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Games retrieved",
  "data": {
    "games": [
      {
        "_id": "game_id...",
        "gameId": "G-12345",
        "status": "completed",
        "type": "cash",
        "betAmount": 50,
        "playerCount": 4,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 1200 }
  }
}
```

### 4.2 Get Live Games
- **Endpoint**: `GET /live-games`
- **Description**: Retrieves currently active/ongoing games.
- **Query Params**: `limit` (default: 50)
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Live games retrieved",
  "data": {
    "count": 12,
    "games": [
      {
        "_id": "game_id...",
        "gameId": "G-98765",
        "status": "active",
        "betAmount": 100,
        "currentTurn": 2,
        "players": [
          {
            "userId": "user_id...",
            "playerName": "John Doe",
            "playerColor": "red",
            "isBot": false
          }
        ],
        "turnStartedAt": "...",
        "createdAt": "..."
      }
    ]
  }
}
```

### 4.3 Force End Game
- **Endpoint**: `POST /force-end-game`
- **Description**: Forcibly cancels a live game and refunds the users.
- **Request Body**:
```json
{
  "gameId": "game_id_here",
  "reason": "Server maintenance"
}
```
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Game ended successfully",
  "data": {
    "gameId": "game_id_here",
    "status": "cancelled",
    "reason": "Server maintenance"
  }
}
```

---

## 5. Bot Management

### 5.1 Set Global Bot Difficulty
- **Endpoint**: `POST /set-difficulty`
- **Description**: Sets the global difficulty level for bots in future games.
- **Request Body**:
```json
{
  "difficulty": "medium" // 'easy', 'medium', 'hard'
}
```
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Bot difficulty updated successfully",
  "data": {
    "difficulty": "medium",
    "appliedToNewGames": true,
    "message": "All new games will now use medium difficulty bots"
  }
}
```

### 5.2 Get Global Bot Difficulty
- **Endpoint**: `GET /get-difficulty`
- **Description**: Fetches the current global bot difficulty.
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Current bot difficulty retrieved",
  "data": {
    "difficulty": "medium"
  }
}
```

### 5.3 Set Specific Game Bot Difficulty
- **Endpoint**: `POST /set-game-difficulty`
- **Description**: Changes the difficulty of bots in a specific live/ongoing game.
- **Request Body**:
```json
{
  "gameId": "game_id_here",
  "difficulty": "hard" // 'easy', 'medium', 'hard'
}
```
- **Success Response (200 OK)**:
```json
{
  "status": 200,
  "message": "Bot difficulty updated for game",
  "data": {
    "gameId": "game_id_here",
    "difficulty": "hard",
    "botsUpdated": 2,
    "message": "2 bot(s) in game updated to hard difficulty"
  }
}
```
