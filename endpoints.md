# Ludo Arena Master API Directory

This document provides a comprehensive catalog of all REST API endpoints utilized across the Ludo Arena frontend and backend codebases. It is organized by functional clusters matching the system architecture.

---

## 🛠️ Global Configuration
- **API Base URL**: Configured via `EXPO_PUBLIC_API_BASE_URL` in `.env` (maps to `/api/v1`).
- **Authorization**: All private endpoints require a JSON Web Token (JWT) sent in the HTTP Headers:
  `Authorization: Bearer <JWT_TOKEN>`

---

## 🔑 Cluster 1 — Authentication & Profile
Handles OTP requests, session verification, profile audits, and account closures.

### 1. Request Login OTP
- **Endpoint**: `POST /api/v1/auth/send-otp`
- **Helper**: `sendOtp(phone: string)` in `src/api/auth.api.ts`
- **Request Body**:
  ```json
  {
    "phone": "+919876543210"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "OTP sent successfully",
    "data": {
      "sessionId": "otp_sess_82f1b0a9cd3e"
    }
  }
  ```

### 2. Verify OTP & Authenticate
- **Endpoint**: `POST /api/v1/auth/verify-otp` (Alias: `POST /api/v1/auth/verify`)
- **Helper**: `verifyOtp(phone: string, otp: string, sessionId: string)` in `src/api/auth.api.ts`
- **Request Body**:
  ```json
  {
    "phone": "+919876543210",
    "otp": "123456",
    "sessionId": "otp_sess_82f1b0a9cd3e"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Authenticated successfully",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "usr_654321abcd",
        "name": "Ludo Champ",
        "phone": "+919876543210",
        "role": "user",
        "avatar": "https://avatar.url/avatar.png"
      }
    }
  }
  ```

### 3. Fetch User Profile
- **Endpoint**: `GET /api/v1/auth/profile`
- **Helper**: `getProfile()` in `src/api/auth.api.ts`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "usr_654321abcd",
      "name": "Ludo Champ",
      "phone": "+919876543210",
      "role": "user",
      "avatar": "https://avatar.url/avatar.png"
    }
  }
  ```

### 4. Update Profile Info
- **Endpoint**: `PUT /api/v1/auth/profile`
- **Helper**: `updateProfile(payload)` in `src/api/auth.api.ts`
- **Request Body**:
  ```json
  {
    "name": "Master Player",
    "avatar": "https://avatar.url/avatar2.png"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "data": {
      "id": "usr_654321abcd",
      "name": "Master Player",
      "avatar": "https://avatar.url/avatar2.png"
    }
  }
  ```

### 5. Terminate Session / Logout
- **Endpoint**: `POST /api/v1/auth/logout`
- **Helper**: `logout()` in `src/api/auth.api.ts`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### 6. Delete User Account
- **Endpoint**: `DELETE /api/v1/auth/delete-account`
- **Helper**: `deleteAccount()` in `src/api/auth.api.ts`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Account deleted permanently"
  }
  ```

---

## 🎮 Clusters 2, 3 & 4 — Matchmaking & Lobby
Handles waiting lists, online queues, and match setups.

### 1. List Waiting Rooms
- **Endpoint**: `GET /api/v1/game/waiting`
- **Helper**: `getWaitingGames()` in `src/api/game.api.ts`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "gameId": "game_98765",
        "gameType": "practice",
        "betAmount": 0,
        "playersJoined": 1
      }
    ]
  }
  ```

### 2. Enter Matchmaking Queue
- **Endpoint**: `POST /api/v1/matchmaking/join-queue`
- **Helper**: `joinQueue(gameType, betAmount)` in `src/api/matchmaking.api.ts`
- **Request Body**:
  ```json
  {
    "gameType": "cash",
    "betAmount": 500
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Entered matchmaking queue"
  }
  ```

### 3. Exit Matchmaking Queue
- **Endpoint**: `POST /api/v1/matchmaking/leave-queue`
- **Helper**: `leaveQueue()` in `src/api/matchmaking.api.ts`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Exited queue successfully"
  }
  ```

### 4. Create Private Battle
- **Endpoint**: `POST /api/v1/game/cash/create` (Alias: `/game/practice/create`)
- **Helper**: `createCashGame(payload)` in `src/api/game.api.ts`
- **Request Body**:
  ```json
  {
    "betAmount": 100
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "gameId": "game_arena_83fd10b"
    }
  }
  ```

---

## 🎲 Cluster 5 — Realtime Gameplay Operations
Handles active board controls, turn management, and reconnect checks.

### 1. Get Live Game Details
- **Endpoint**: `GET /api/v1/game/:gameId`
- **Helper**: `getGameDetails(gameId)` in `src/api/game.api.ts`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "game_arena_83fd10b",
      "status": "active",
      "currentTurn": 0,
      "turnVersion": 3,
      "players": [
        { "userId": "usr_me", "name": "You", "tokens": [{ "position": 12 }] }
      ]
    }
  }
  ```

### 2. Roll Interactive Dice
- **Endpoint**: `POST /api/v1/game/roll-dice`
- **Helper**: `rollDice(gameId, turnVersion)` in `src/api/game.api.ts`
- **Request Body**:
  ```json
  {
    "gameId": "game_arena_83fd10b",
    "turnVersion": 3
  }
  ```

### 3. Execute Pawn Move
- **Endpoint**: `POST /api/v1/game/move-token`
- **Helper**: `moveToken(gameId, tokenIndex, turnVersion)` in `src/api/game.api.ts`
- **Request Body**:
  ```json
  {
    "gameId": "game_arena_83fd10b",
    "tokenIndex": 1,
    "turnVersion": 3
  }
  ```

### 4. Skip Current Turn (Time out / Manual pass)
- **Endpoint**: `POST /api/v1/game/skip-turn`
- **Helper**: `skipTurn(gameId, turnVersion)` in `src/api/game.api.ts`

### 5. Surrender Active Match
- **Endpoint**: `POST /api/v1/game/surrender`
- **Helper**: `surrenderGame(gameId)` in `src/api/game.api.ts`

### 6. Sweep Active Reconnect Session
- **Endpoint**: `GET /api/v1/game/active`
- **Helper**: `getActiveGame()` in `src/api/game.api.ts`

---

## 🤖 Cluster 6 — Play vs Computer / AI Bot
Lobby routing for bot difficulty configurations.

### 1. Create Game vs Robot Master
- **Endpoint**: `POST /api/v1/bot/create-game`
- **Helper**: Built-in REST trigger in `app/(app)/bot/index.tsx`
- **Request Body**:
  ```json
  {
    "difficulty": "medium",
    "entryFee": 500
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "game": {
        "id": "game_bot_57ad19ff"
      }
    }
  }
  ```

---

## 🪙 Cluster 7 — Wallet & UPI Transaction Logs
Handles account balances, withdrawal receipts, and credit statements.

### 1. Get Wallet Balance
- **Endpoint**: `GET /api/v1/wallet`
- **Helper**: `getWallet()` in `src/api/wallet.api.ts`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "coins": 1500,
      "isLocked": false
    }
  }
  ```

### 2. Get Transaction Ledgers
- **Endpoint**: `GET /api/v1/wallet/history`
- **Helper**: `getWalletHistory()` in `src/api/wallet.api.ts`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "tx_deposit_910b84",
        "amount": 500,
        "type": "credit",
        "status": "completed",
        "description": "Chips added via UPI Gateway",
        "createdAt": "2026-05-17T09:00:00.000Z"
      }
    ]
  }
  ```

### 3. Get Wallet Statistics
- **Endpoint**: `GET /api/v1/wallet/stats`
- **Response (200 OK)**: Detailed aggregates of coins won vs coins lost.

---

## 🔔 Cluster 8 — Chat & Notification Feeds
Synchronizing real-time alert modules.

### 1. Get Live In-Game Chat History
- **Endpoint**: `GET /api/v1/chat/:gameId`
- **Response (200 OK)**: Restores previous Quick Chats and board messages.

### 2. Fetch Notifications List
- **Endpoint**: `GET /api/v1/notification`
- **Helper**: `getNotifications()` in `src/api/notification.api.ts`

### 3. Mark Notification as Read
- **Endpoint**: `PUT /api/v1/notification/:id/read`
- **Helper**: `markNotificationRead(id)` in `src/api/notification.api.ts`

---

## 📈 Cluster 9 — Leaderboards & History
Analyzes records, streaks, and global earnings.

### 1. Personal Player Stats
- **Endpoint**: `GET /api/v1/stats/me`
- **Helper**: `getMyStats()` in `src/api/stats.api.ts`

### 2. Fetch Global Leaderboards
- **Endpoint**: `GET /api/v1/stats/leaderboard`
- **Helper**: `getLeaderboard()` in `src/api/stats.api.ts`

### 3. Paginated Match Histories
- **Endpoint**: `GET /api/v1/stats/history`
- **Helper**: `getHistory(page, limit)` in `src/api/stats.api.ts`

---

## 🚨 Cluster 10 — Safety & Bug Reports
Incident logging (resiliently handles backend stubs fallback).

### 1. File Player Safety Violation
- **Endpoint**: `POST /api/v1/report/user`
- **Request Body**:
  ```json
  {
    "targetUserId": "usr_target_id",
    "targetUsername": "CheaterChamp",
    "category": "hack",
    "description": "Triggered double moves consecutively in game."
  }
  ```

### 2. File Match Incident Bug
- **Endpoint**: `POST /api/v1/report/match`
- **Request Body**:
  ```json
  {
    "gameId": "game_arena_83fd10b",
    "category": "desync",
    "description": "Pawn coordinates went out of bounds on safe tile."
  }
  ```
