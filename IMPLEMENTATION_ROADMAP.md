# Ludo Backend - Implementation Roadmap

**Last Updated**: May 10, 2026  
**Project**: Realtime Ludo Game Backend with Wallet System  
**Status**: 40% Complete (Structure & Foundation) → 100% Complete (Full Implementation)

---

## 📊 Project Completion Status

| Component | Status | Progress |
|-----------|--------|----------|
| Folder Structure | ✅ Complete | 100% |
| Models & Schemas | ✅ Complete | 100% |
| Routes & Endpoints | ✅ Complete | 100% |
| Middlewares | ✅ Complete (Core) | 85% |
| Configuration | ✅ Complete | 100% |
| Controllers | ❌ Not Started | 0% |
| Services (Business Logic) | ❌ Not Started | 0% |
| Repositories (Data Access) | ❌ Not Started | 0% |
| Validators | ❌ Not Started | 0% |
| Socket.io Implementation | ❌ Not Started | 0% |
| Authentication Flow | ❌ Not Started | 0% |
| Wallet System | ❌ Not Started | 0% |
| Game Logic | ❌ Not Started | 0% |
| Matchmaking | ❌ Not Started | 0% |
| Bot AI | ❌ Not Started | 0% |
| Chat System | ❌ Not Started | 0% |
| Notifications | ❌ Not Started | 0% |
| Admin Panel | ❌ Not Started | 0% |
| Tests | ❌ Not Started | 0% |
| Documentation | ⚠️ Partial | 40% |
| CI/CD Pipeline | ❌ Not Started | 0% |

---

## 🎯 Implementation Clusters

### **CLUSTER 1: Core Authentication & User Management** (Priority: CRITICAL)
**Endpoints**: 6 | **Controllers**: 1 | **Services**: 1 | **Repositories**: 1  
**Dependencies**: Firebase Admin SDK, JWT, MongoDB

#### 1.1 Components to Implement
- **Controller**: `authController.js`
  - `verifyFirebaseToken()` - Verify Firebase token and create JWT
  - `refreshToken()` - Refresh JWT token
  - `logout()` - User logout
  - `getProfile()` - Fetch user profile
  - `updateProfile()` - Update user profile
  - `deleteAccount()` - Delete user account

- **Service**: `authService.js`
  - Firebase token verification and validation
  - JWT token generation and refresh logic
  - User creation on first login
  - User profile update logic
  - Account deletion logic

- **Repository**: `userRepository.js`
  - CRUD operations on User model
  - Query by Firebase UID
  - Query by phone
  - Update profile fields
  - Ban/suspend user operations

- **Validator**: `authValidator.js`
  - Firebase token validation schema
  - Profile update schema
  - Phone number and email validation

#### 1.2 Routes to Implement
- `POST /api/v1/auth/verify` - Verify Firebase token
- `POST /api/v1/auth/refresh-token` - Refresh JWT
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/profile` - Get profile
- `PUT /api/v1/auth/profile` - Update profile
- `DELETE /api/v1/auth/delete-account` - Delete account

#### 1.3 Data Models Used
- User model (phone, firebaseUid, name, email, avatar, coins, stats)

#### 1.4 Integration Points
- Firebase Admin SDK (verify token)
- JWT utility (generateToken, verifyToken)
- MongoDB (User model)
- Error handling middleware

#### 1.5 Testing Strategy
- Unit tests for token verification
- Integration tests for user CRUD
- Test Firebase token validation
- Test JWT refresh flow

---

### **CLUSTER 2: Wallet & Transaction Management** (Priority: HIGH)
**Endpoints**: 6 | **Controllers**: 1 | **Services**: 1 | **Repositories**: 2  
**Dependencies**: User model, Wallet model, Transaction model

#### 2.1 Components to Implement
- **Controller**: `walletController.js`
  - `getWallet()` - Get wallet balance and status
  - `getTransactionHistory()` - Get all transactions with filters
  - `addCoins()` - Add coins (admin only)
  - `deductCoins()` - Deduct coins (admin only)
  - `freezeWallet()` - Freeze wallet (admin only)
  - `unfreezeWallet()` - Unfreeze wallet (admin only)

- **Service**: `walletService.js`
  - Wallet balance management
  - Transaction recording with types (win, loss, admin_add, admin_deduct, etc.)
  - Freeze/Unfreeze logic with reason tracking
  - Coin deduction validation (insufficient balance checks)
  - Bonus/Reward distribution logic
  - Lock mechanism to prevent race conditions

- **Repositories**:
  - `walletRepository.js` - Wallet CRUD and queries
  - `transactionRepository.js` - Transaction logging and history

- **Validator**: `walletValidator.js`
  - Coin amount validation (positive, within limits)
  - Transaction history filter schema
  - Freeze/unfreeze reason validation

#### 2.2 Routes to Implement
- `GET /api/v1/wallet` - Get wallet
- `GET /api/v1/wallet/history` - Get history
- `POST /api/v1/wallet/add` - Add coins (admin)
- `POST /api/v1/wallet/deduct` - Deduct coins (admin)
- `POST /api/v1/wallet/freeze` - Freeze wallet (admin)
- `POST /api/v1/wallet/unfreeze` - Unfreeze wallet (admin)

#### 2.3 Data Models Used
- Wallet model (userId, coins, isLocked, lockedReason, createdAt)
- Transaction model (userId, type, amount, reason, before, after, timestamp)

#### 2.4 Integration Points
- User model (coins field)
- Admin middleware (verify admin role)
- MongoDB transactions (for atomic operations)
- Rate limiter (prevent abuse)

#### 2.5 Business Rules
- Cannot deduct more coins than available balance
- Admin must provide reason for freeze/deduct
- Wallet locked during game to prevent race conditions
- All operations must be logged as transactions

#### 2.6 Testing Strategy
- Unit tests for coin calculations
- Integration tests for transaction logging
- Race condition tests (concurrent deductions)
- Admin-only endpoint tests

---

### **CLUSTER 3: Game Core Logic & State Management** (Priority: CRITICAL)
**Endpoints**: 12 | **Controllers**: 1 | **Services**: 1 | **Repositories**: 1  
**Dependencies**: Game model, Wallet, Rules engine, Socket.io

#### 3.1 Components to Implement
- **Controller**: `gameController.js`
  - `createPracticeGame()` - Create practice game (no money)
  - `createCashGame()` - Create cash game (with entry fee)
  - `joinGame()` - Join existing game
  - `getGameDetails()` - Get current game state
  - `getActiveGame()` - Get user's active game
  - `rollDice()` - Roll dice in game
  - `moveToken()` - Move token on board
  - `skipTurn()` - Skip turn if no valid move
  - `surrenderGame()` - Surrender and lose
  - `endGame()` - End game and distribute rewards
  - `reconnect()` - Reconnect to ongoing game
  - `restoreGameState()` - Restore state after disconnect

- **Service**: `gameService.js`
  - Game initialization and setup
  - Turn management and player order
  - Dice roll logic (using secure random)
  - Token movement validation
  - Board position calculations (normal + safe zones)
  - Kill logic (send token home if landing on opponent)
  - Consecutive 6 handling (extra turns, 3rd cancels)
  - Home entry validation (exact dice required)
  - Winner detection (all 4 tokens home)
  - Turn timeout handling
  - Game state persistence
  - Reward distribution on game end

- **Repository**: `gameRepository.js`
  - Create/Read/Update game records
  - Query games by status
  - Query player's games
  - Update game state
  - Store move history

- **Validator**: `gameValidator.js`
  - Game creation request validation
  - Move validation (token exists, turn is valid)
  - Game join validation (game exists, not full)

#### 3.2 Routes to Implement
- `POST /api/v1/game/practice/create` - Create practice game
- `POST /api/v1/game/cash/create` - Create cash game
- `POST /api/v1/game/join` - Join game
- `GET /api/v1/game/:gameId` - Get game details
- `GET /api/v1/game/active` - Get active game
- `POST /api/v1/game/roll-dice` - Roll dice
- `POST /api/v1/game/move-token` - Move token
- `POST /api/v1/game/skip-turn` - Skip turn
- `POST /api/v1/game/surrender` - Surrender
- `POST /api/v1/game/end` - End game
- `POST /api/v1/game/reconnect` - Reconnect
- `GET /api/v1/game/restore/:gameId` - Restore state

#### 3.3 Data Models Used
- Game model (gameId, players, gameType, status, currentTurn, board, moves, startTime, endTime)
- MatchHistory model (gameId, players, winner, duration, coins_at_stake, results)
- User model (wins, losses, totalGames, winRate updated here)

#### 3.4 Game Rules Implementation
**Rules Engine**: Use `rules.constants.js` as reference
- **Token Unlock**: Dice value 6 required
- **Consecutive 6s**: 1st & 2nd give extra turn; 3rd cancels entire turn
- **Kill Rule**: Landing on opponent token sends it home + bonus turn
- **Safe Zones**: Positions [1, 9, 14, 22, 27, 35, 40, 48] - cannot be killed
- **Home Entry**: Exact dice value required
- **Winner**: All 4 tokens reach home
- **Turn Timeout**: Auto-skip after 20 seconds

#### 3.5 Integration Points
- Socket.io for real-time updates
- Wallet service (lock coins during game, distribute on end)
- Matchmaking service (find opponent)
- User service (update stats)
- Logger (log all moves for audit)
- Rate limiter (prevent move spam)

#### 3.6 Testing Strategy
- Unit tests for board calculations
- Unit tests for rule validation (kill, safe zone, consecutive 6)
- Integration tests for complete game flow
- Test winner detection
- Test turn timeout logic
- Load tests for concurrent games

---

### **CLUSTER 4: Matchmaking & Queue System** (Priority: HIGH)
**Endpoints**: 3 | **Controllers**: 1 | **Services**: 1 | **Repositories**: 1  
**Dependencies**: Game model, Queue model, Wallet

#### 4.1 Components to Implement
- **Controller**: `matchmakingController.js`
  - `joinQueue()` - Join matchmaking queue
  - `leaveQueue()` - Leave queue
  - `getQueueStatus()` - Get queue position and wait time

- **Service**: `matchmakingService.js`
  - Queue management (add/remove players)
  - Match creation logic (pair players based on skill/coin level)
  - Skill-based matching (similar win rates)
  - Coin-based matching (similar entry fee preference)
  - Timeout handling (max wait time)
  - Match found notification
  - Fallback to bot if no opponent found

- **Repository**: `queueRepository.js`
  - CRUD on Queue model
  - Query queue by status
  - Add/remove from queue
  - Track queue time

- **Validator**: `matchmakingValidator.js`
  - Queue join validation (not already in queue)
  - Game type selection

#### 4.2 Routes to Implement
- `POST /api/v1/matchmaking/join-queue` - Join queue
- `POST /api/v1/matchmaking/leave-queue` - Leave queue
- `GET /api/v1/matchmaking/queue-status` - Get status

#### 4.3 Data Models Used
- Queue model (userId, gameType, entryFee, wager, createdAt, status)
- Game model (created from queue matches)

#### 4.4 Matching Algorithm
1. Filter same game type (practice vs cash)
2. Filter by similar skill level (±5% win rate)
3. Filter by similar entry fee (for cash games)
4. Sort by wait time (oldest first)
5. Create game with first match
6. If no match after 30s timeout → create with bot

#### 4.5 Integration Points
- Game service (create match)
- Bot service (fallback)
- Socket.io (notify match found)
- Wallet service (verify funds before joining)

#### 4.6 Testing Strategy
- Unit tests for matching algorithm
- Integration tests for queue operations
- Test timeout and bot fallback
- Load tests with multiple concurrent players

---

### **CLUSTER 5: Socket.io Real-Time Events** (Priority: CRITICAL)
**Socket Events**: 15+ | **Socket Files**: 3

#### 5.1 Game Socket Events (`game.socket.js`)

**Client to Server**:
- `join_game` - Player joins game room
- `roll_dice` - Request dice roll
- `move_token` - Move token on board
- `skip_turn` - Skip turn
- `leave_game` - Leave/abandon game
- `reconnect_game` - Reconnect after disconnect

**Server to Client**:
- `game_joined` - Game successfully joined
- `dice_rolled` - Dice result (1-6)
- `token_moved` - Token moved, new position
- `turn_changed` - Turn passed to next player
- `game_ended` - Game completed, winner announced
- `player_disconnected` - Player left/disconnected
- `player_reconnected` - Player rejoined
- `game_error` - Invalid move/action error

#### 5.2 Chat Socket Events (`chat.socket.js`)

**Client to Server**:
- `chat_message` - Send chat message
- `typing` - User typing indicator

**Server to Client**:
- `chat_received` - Message received by others
- `user_typing` - Someone is typing

#### 5.3 Bot Socket Events (`bot.socket.js`)

**Server to Client**:
- `bot_joined` - Bot joined game
- `bot_roll` - Bot rolled dice
- `bot_moved` - Bot moved token
- `bot_action` - Bot action taken

#### 5.4 Implementation Details

**game.socket.js**:
```javascript
- Setup game namespace: /socket.io/game
- Authenticate socket connection with JWT
- Handle connection/disconnection
- Emit real-time game state updates
- Broadcast moves to all players in room
- Handle reconnection with state recovery
- Implement game timeout logic
- Validate all moves before broadcasting
```

**chat.socket.js**:
```javascript
- Setup chat namespace: /socket.io/chat
- Store message history
- Implement rate limiting (max 5 msgs/10sec)
- Broadcast to game room only
- Filter messages (no spam, no abuse)
- Add timestamps to all messages
```

**bot.socket.js**:
```javascript
- Simulate bot as real socket connection
- AI decision making (move selection)
- Bot turn timing (1-3 second delay)
- Difficulty levels (easy, medium, hard)
- Random move selection based on difficulty
```

#### 5.5 Socket.io Configuration
- Namespace: `/socket.io` with rooms per game
- Rooms: `game_${gameId}`, `chat_${gameId}`
- Heartbeat: 30 second ping/pong
- Timeout: 60 seconds auto-disconnect
- Reconnection: Auto state recovery within 5 minutes
- Message compression: enabled
- CORS: Allow client URLs only

#### 5.6 Error Handling
- Invalid move → send error and current state
- Disconnection → pause game, allow 5 min reconnect
- Timeout → auto skip turn
- Duplicate events → ignore (idempotency)

#### 5.7 Testing Strategy
- Unit tests for event handlers
- Integration tests for socket connections
- Test disconnection and reconnection flow
- Test real-time updates with multiple clients
- Load tests with concurrent game rooms

---

### **CLUSTER 6: Bot AI & Auto-Play** (Priority: MEDIUM)
**Controllers**: 1 | **Services**: 1  
**Dependencies**: Game service, Difficulty levels

#### 6.1 Components to Implement
- **Controller**: `botController.js`
  - `createBotGame()` - Create game with bot opponent
  - `getBotDifficulty()` - Get available difficulty levels

- **Service**: `botService.js`
  - Bot strategy selection (easy, medium, hard)
  - Move decision logic based on game state
  - Random move generation (easy)
  - Strategic move calculation (medium/hard)
  - Risk assessment
  - Turn timing (add realistic delay)
  - Difficulty level configuration

#### 6.2 Bot Difficulty Levels

**Easy**:
- Random valid moves
- 30-50% win rate
- 1-2 second delay per move
- No lookahead strategy

**Medium**:
- Prioritize killing opponent tokens
- Prefer safe zones
- Avoid risky moves
- 50-70% win rate
- 2-3 second delay per move

**Hard**:
- Simulate 2-3 moves ahead
- Optimal path to home
- Risk calculation
- Aggressive killing strategy
- 70-90% win rate
- 1-2 second delay per move

#### 6.3 Bot Strategy Algorithm
```
1. Get all valid moves for current dice roll
2. Evaluate each move:
   - Token closer to home? +5 points
   - Safe move (no kill)? +3 points
   - Can kill opponent? +7 points
   - Can block opponent? +4 points
3. Apply difficulty multiplier to scores
4. Select highest scoring move
5. Add random delay (1-3 seconds)
6. Execute move
```

#### 6.4 Routes to Implement
- `POST /api/v1/bot/create-game` - Create bot game
- `GET /api/v1/bot/difficulties` - Get difficulty levels

#### 6.5 Integration Points
- Game service (make moves)
- Socket.io (broadcast bot moves)
- Difficulty constants

#### 6.6 Testing Strategy
- Unit tests for move calculation
- Integration tests for bot game flow
- Win rate validation per difficulty
- Performance tests for decision time

---

### **CLUSTER 7: Chat & Messaging System** (Priority: LOW)
**Endpoints**: 2 | **Controllers**: 1 | **Socket Events**: 4

#### 7.1 Components to Implement
- **Controller**: `chatController.js`
  - `getChatHistory()` - Get chat messages for game
  - `sendMessage()` - Send message (via HTTP fallback)

- **Service**: `chatService.js`
  - Message validation and sanitization
  - Profanity filtering
  - Message storage
  - Chat history retrieval with pagination
  - Rate limiting (5 messages per 10 seconds)

- **Repository**: `chatRepository.js` (not in current models - needs creation)
  - Store chat messages
  - Query by game ID
  - TTL cleanup (7 days)

#### 7.2 Routes to Implement
- `GET /api/v1/chat/:gameId` - Get chat history
- `POST /api/v1/chat/:gameId/message` - Send message

#### 7.3 Socket Events
- `chat_message` (C→S) - Send message
- `chat_received` (S→C) - Receive message
- `typing` (C→S) - Typing indicator
- `user_typing` (S→C) - Show typing

#### 7.4 Chat Rules
- Max message length: 200 characters
- Rate limit: 5 messages per 10 seconds
- Only players in game can chat
- Profanity filter enabled
- No URLs allowed (prevent spam)
- Store last 100 messages per game

#### 7.5 Testing Strategy
- Unit tests for message filtering
- Integration tests for socket events
- Rate limit testing
- Profanity filter validation

---

### **CLUSTER 8: Notifications & Alerts** (Priority: MEDIUM)
**Endpoints**: 2 | **Controllers**: 1 | **Services**: 1  
**Dependencies**: Notification model, Firebase Cloud Messaging

#### 8.1 Components to Implement
- **Controller**: `notificationController.js`
  - `getNotifications()` - Get user notifications
  - `markAsRead()` - Mark notification as read

- **Service**: `notificationService.js`
  - Notification creation
  - Push notification sending (FCM)
  - In-app notification storage
  - Auto-cleanup (TTL 30 days)
  - Notification templates (match found, game won, etc.)

- **Repository**: `notificationRepository.js`
  - CRUD on Notification model
  - Query by user
  - Mark as read
  - Cleanup old notifications

#### 8.2 Notification Types
- **Match Found**: Opponent matched in queue
- **Game Started**: Game is about to start
- **Your Turn**: It's your turn to move
- **Game Ended**: Game completed, results shown
- **Wallet Update**: Coins added/deducted
- **Achievement**: New milestone reached
- **Bonus**: Daily bonus or reward claimed
- **System Alert**: Maintenance, updates, etc.

#### 8.3 Routes to Implement
- `GET /api/v1/notification` - Get notifications
- `PUT /api/v1/notification/:notificationId/read` - Mark as read

#### 8.4 Firebase Cloud Messaging Integration
- Configure FCM in environment
- Store device tokens in User model
- Send push notifications for critical events
- Handle token refresh

#### 8.5 Testing Strategy
- Unit tests for notification creation
- Integration tests for FCM sending
- Test TTL cleanup
- Test notification read status

---

### **CLUSTER 9: Player Stats & Leaderboard** (Priority: MEDIUM)
**Endpoints**: 4 | **Controllers**: 1 | **Services**: 1  
**Dependencies**: User model, MatchHistory model

#### 9.1 Components to Implement
- **Controller**: `statsController.js`
  - `getMyStats()` - Get personal stats
  - `getLeaderboard()` - Get top players
  - `getMatchHistory()` - Get user's game history
  - `getPlayerStats()` - Get another player's stats (public)

- **Service**: `statsService.js`
  - Calculate win rate
  - Update stats on game end
  - Rank calculation
  - Leaderboard generation
  - Historical data aggregation

- **Repository**:
  - Query user stats
  - Query leaderboard
  - Query match history with filters

#### 9.2 Stats Tracked
- Total Games Played
- Total Wins
- Total Losses
- Win Rate (%)
- Total Coins Won
- Total Coins Lost
- Current Rank
- Rank Points
- Best Win Streak
- Current Win Streak
- Favorite Token Color
- Games This Week/Month/Year

#### 9.3 Routes to Implement
- `GET /api/v1/stats/me` - Personal stats
- `GET /api/v1/stats/leaderboard` - Top 100 players
- `GET /api/v1/stats/history` - Match history
- `GET /api/v1/stats/player/:userId` - Public stats

#### 9.4 Leaderboard Logic
- Rank by win rate (minimum 10 games played)
- Tiebreaker: total games played
- Leaderboard updated on game end
- Cache leaderboard (refresh hourly)

#### 9.5 Testing Strategy
- Unit tests for stat calculations
- Integration tests for leaderboard updates
- Test caching logic
- Test data consistency

---

### **CLUSTER 10: Reporting & Moderation** (Priority: MEDIUM)
**Endpoints**: 2 | **Controllers**: 1 | **Services**: 1  
**Dependencies**: Report model, Admin actions

#### 10.1 Components to Implement
- **Controller**: `reportController.js`
  - `reportUser()` - Report inappropriate user
  - `reportMatch()` - Report suspicious game

- **Service**: `reportService.js`
  - Create report records
  - Auto-detect spam reports
  - Aggregate reports per user
  - Ban user if threshold exceeded
  - Notify admins of reports

- **Repository**: `reportRepository.js`
  - CRUD on Report model
  - Query reports by status
  - Query user reports

#### 10.2 Report Types
- **Abusive Chat**: Profanity, harassment
- **Suspected Cheating**: Bot usage, exploit
- **Inappropriate Avatar/Name**: Offensive content
- **Match Fixing**: Collusion detected
- **Other**: User-specified reason

#### 10.3 Auto-Moderation Rules
- 5+ reports in 24h → Auto-suspend
- 10+ reports in 7d → Auto-ban
- Verified cheating → Instant ban
- Refund coins to affected players

#### 10.4 Routes to Implement
- `POST /api/v1/report/user` - Report user
- `POST /api/v1/report/match` - Report match

#### 10.5 Admin Notifications
- Send email/notification on new report
- Batch reports for review
- Track report resolution time

#### 10.6 Testing Strategy
- Unit tests for auto-moderation rules
- Integration tests for ban workflow
- Test report aggregation
- Test false positive detection

---

### **CLUSTER 11: Admin Panel & Management** (Priority: HIGH)
**Endpoints**: 10+ | **Controllers**: 1 | **Services**: 1  
**Dependencies**: All models, Admin middleware

#### 11.1 Components to Implement
- **Controller**: `adminController.js`
  - `getDashboard()` - Admin dashboard stats
  - `getUsers()` - List all users with filters
  - `getUserDetail()` - Get user details
  - `banUser()` - Ban a user
  - `suspendUser()` - Suspend user
  - `addCoins()` - Add coins to user (bonus)
  - `deductCoins()` - Deduct coins (penalty)
  - `getReports()` - View all reports
  - `resolveReport()` - Resolve a report
  - `getSystemLogs()` - View system logs

- **Service**: `adminService.js`
  - User management
  - Ban/suspend logic with email notification
  - Coin manipulation
  - Report management
  - System statistics
  - Audit logging

- **Repository**: `adminLogRepository.js`
  - Log all admin actions
  - Query admin logs

#### 11.2 Admin-Only Routes
- `GET /api/v1/admin/dashboard` - Dashboard stats
- `GET /api/v1/admin/users` - User list
- `GET /api/v1/admin/users/:userId` - User details
- `POST /api/v1/admin/users/:userId/ban` - Ban user
- `POST /api/v1/admin/users/:userId/suspend` - Suspend
- `POST /api/v1/admin/users/:userId/add-coins` - Add coins
- `POST /api/v1/admin/users/:userId/deduct-coins` - Deduct
- `GET /api/v1/admin/reports` - All reports
- `PUT /api/v1/admin/reports/:reportId/resolve` - Resolve
- `GET /api/v1/admin/logs` - System logs

#### 11.3 Dashboard Metrics
- Total Users (today, 7d, 30d)
- Active Users Online
- Total Games (today, week, month)
- Total Revenue (coins wagered)
- New Reports (unresolved count)
- Banned Users Count
- Server Health (CPU, Memory, DB)

#### 11.4 Admin Middleware
- Role validation (admin role required)
- Action logging (who did what, when)
- Prevent non-admins from access
- IP whitelisting (optional)

#### 11.5 Testing Strategy
- Unit tests for admin operations
- Integration tests for role-based access
- Test action logging
- Test email notifications on ban

---

### **CLUSTER 12: Data Validation & Schemas** (Priority: HIGH)
**Files**: Multiple Validator files

#### 12.1 Validators to Implement
- `authValidator.js` - Auth request validation
- `walletValidator.js` - Wallet operations
- `gameValidator.js` - Game operations
- `matchmakingValidator.js` - Queue operations
- `chatValidator.js` - Message validation
- `reportValidator.js` - Report creation
- `adminValidator.js` - Admin operations

#### 12.2 Validation Approach
- Use Joi for schema validation
- Custom messages for each rule
- Request body validation middleware
- Query parameter validation
- Error responses with field details

#### 12.3 Common Validations
- Phone number format (international)
- Email format and uniqueness
- Coin amounts (positive integers)
- User IDs (valid MongoDB ObjectId)
- Game IDs (UUID format)
- Message length (1-200 chars)
- Token validity checks

#### 12.4 Testing Strategy
- Unit tests for each validator
- Test invalid input handling
- Test boundary conditions
- Test error message clarity

---

### **CLUSTER 13: Repositories (Data Access Layer)** (Priority: HIGH)
**Files**: 9 Repository files

#### 13.1 Repositories to Implement
1. **userRepository.js** - User CRUD, queries by phone/firebase
2. **gameRepository.js** - Game CRUD, state updates
3. **walletRepository.js** - Wallet balance operations
4. **transactionRepository.js** - Transaction logging
5. **matchHistoryRepository.js** - Game results storage
6. **queueRepository.js** - Queue management
7. **notificationRepository.js** - Notification CRUD
8. **reportRepository.js** - Report management
9. **adminLogRepository.js** - Audit logging

#### 13.2 Repository Pattern Implementation
```javascript
// Template structure
class UserRepository {
  async create(userData) { }
  async findById(id) { }
  async findByPhone(phone) { }
  async findByFirebaseUid(uid) { }
  async update(id, updateData) { }
  async delete(id) { }
  async findAll(filters, pagination) { }
  async ban(userId, reason) { }
  // ... other methods
}
```

#### 13.3 Key Features
- Connection pooling
- Query optimization with indexes
- Error handling and logging
- Pagination support
- Transaction support (atomic operations)
- Soft delete support where applicable

#### 13.4 Testing Strategy
- Unit tests with MongoDB mock
- Integration tests with test database
- Test all CRUD operations
- Test complex queries
- Test error handling

---

### **CLUSTER 14: Testing Suite** (Priority: HIGH)
**Files**: Multiple test files | **Framework**: Jest + Supertest

#### 14.1 Test Categories

**Unit Tests**:
- Utility functions (diceRoller, boardCalculator, winnerCalculator)
- Service business logic
- Validator schemas
- Constant definitions

**Integration Tests**:
- API endpoints with HTTP calls
- Database operations
- Authentication flow
- Game flow with multiple moves

**E2E Tests**:
- Complete game from start to finish
- User registration → game → reward
- Socket.io connections and events
- Matchmaking queue flow

#### 14.2 Test Files Structure
```
tests/
├── unit/
│   ├── utils/
│   ├── services/
│   └── validators/
├── integration/
│   ├── routes/
│   ├── controllers/
│   └── sockets/
├── e2e/
│   ├── game-flow.test.js
│   ├── matchmaking.test.js
│   └── wallet.test.js
├── fixtures/
│   └── mock-data.js
└── setup.js
```

#### 14.3 Test Coverage Goals
- Services: 80%+ coverage
- Controllers: 75%+ coverage
- Utils: 90%+ coverage
- Overall: 75%+ coverage

#### 14.4 Running Tests
```bash
npm run test           # Run all tests
npm run test:watch    # Watch mode
npm run test -- --coverage  # With coverage report
```

---

### **CLUSTER 15: Documentation & API Spec** (Priority: MEDIUM)
**Files**: Multiple markdown files | **Tool**: Swagger/OpenAPI

#### 15.1 Documentation Files

**API Documentation** (`/src/docs/API.md`):
- Complete endpoint reference
- Request/response examples
- Error codes and meanings
- Rate limits per endpoint
- Authentication requirements

**Socket.io Events** (`/src/docs/SOCKET_EVENTS.md`):
- Event definitions
- Payload structures
- Real-time flow examples
- Troubleshooting guide

**Database Schema** (`/src/docs/DATABASE_SCHEMA.md`):
- Model descriptions
- Field definitions
- Relationships
- Indexes

**Rules Engine** (`/src/docs/RULES_ENGINE.md`):
- Complete Ludo rules
- Kill logic
- Safe zones
- Home entry rules
- Winner detection

**Security Guide** (`/src/docs/SECURITY.md`):
- Authentication flow
- Rate limiting rules
- Data validation
- CORS configuration
- Ban/suspend policies

**Deployment Guide** (`/src/docs/DEPLOYMENT.md`):
- Environment setup
- Docker deployment
- PM2 configuration
- Monitoring setup
- Backup procedures

**Troubleshooting** (`/src/docs/TROUBLESHOOTING.md`):
- Common errors
- Debug steps
- Log analysis
- Performance issues

#### 15.2 Swagger/OpenAPI Setup
- Swagger spec generation from JSDoc comments
- Swagger UI at `/api/v1/docs`
- Updated on every API change
- Schema validation

#### 15.3 Code Comments
- JSDoc comments for all functions
- Explain complex logic
- Document edge cases
- Add examples in docstrings

---

### **CLUSTER 16: CI/CD & Deployment** (Priority: MEDIUM)
**Files**: GitHub Actions, Docker, PM2

#### 16.1 GitHub Actions Workflows

**On Push to develop**:
- Run linter (ESLint)
- Run formatter check (Prettier)
- Run unit tests
- Generate coverage report
- Build Docker image

**On Push to main** (Release):
- Run all above
- Run integration tests
- Deploy to staging
- Run smoke tests

**Scheduled**:
- Daily security scan
- Weekly dependency update check

#### 16.2 Docker Setup
- Dockerfile already exists
- docker-compose.yml for local dev
- Multi-stage build (dev, prod)
- Health checks configured
- Environment variable support

#### 16.3 PM2 Configuration
- ecosystem.config.js for production
- Auto-restart on crash
- Log rotation
- Load balancing (cluster mode)
- Graceful shutdown

#### 16.4 Deployment Pipeline
```
Code Push → Lint → Test → Build → Deploy → Verify
```

#### 16.5 Monitoring & Alerts
- Error tracking (Sentry optional)
- Performance monitoring
- Uptime monitoring
- Log aggregation
- Alert on critical errors

---

### **CLUSTER 17: Performance & Optimization** (Priority: MEDIUM)
**Areas**: Database, Cache, Queries, Cron Jobs

#### 17.1 Database Optimization
- Index all frequently queried fields
- Use projection (select only needed fields)
- Implement pagination (avoid loading all records)
- Use aggregation pipeline for complex queries
- Monitor slow queries (log if >100ms)

#### 17.2 Caching Strategy
- Redis for leaderboard cache (update hourly)
- Redis for user stats cache (update on game end)
- Session cache (JWT validation)
- Game state cache (during active games)

#### 17.3 Query Optimization
- Minimize database hits per request
- Batch similar operations
- Use bulk operations where possible
- Connection pooling enabled

#### 17.4 Cron Jobs to Implement
- Daily rewards distribution
- Inactive game cleanup (30 min timeout)
- Analytics report generation
- Wallet lock timeout release
- Old notification cleanup (>30 days)
- Leaderboard generation (hourly)

#### 17.5 Load Testing
- Simulate 100+ concurrent games
- Simulate matchmaking with 1000+ queue
- Measure response times
- Identify bottlenecks
- Load test database

---

### **CLUSTER 18: Security & Compliance** (Priority: CRITICAL)
**Areas**: Authentication, Authorization, Data Security

#### 18.1 Authentication & Authorization
- ✅ JWT token-based auth (implemented)
- ✅ Firebase Admin SDK integration (configured)
- ✅ Auth middleware (implemented)
- ✅ Admin role checking (middleware in place)
- Required: Token refresh logic
- Required: Session management

#### 18.2 Data Security
- ✅ XSS protection (middleware in place)
- ✅ Mongo injection prevention (middleware in place)
- ✅ Helmet security headers (configured)
- ✅ CORS configured
- Required: Rate limiting per endpoint
- Required: Input validation (validators cluster)

#### 18.3 Secrets Management
- All secrets in .env (template provided)
- Never commit .env file
- Rotate Firebase keys regularly
- Rotate JWT secret periodically

#### 18.4 Data Privacy
- User data encryption in transit (HTTPS only)
- Phone number masking in logs
- Delete user data on account deletion
- GDPR compliance (data export feature)

#### 18.5 Testing Security
- Test SQL injection attempts
- Test XSS payloads
- Test CORS violations
- Test rate limit bypass
- Test privilege escalation

---

## 📋 Implementation Priority Map

### Phase 1: Foundation (Weeks 1-2) - 🔴 CRITICAL
1. **Cluster 1**: Core Authentication & User Management
2. **Cluster 2**: Wallet & Transaction Management
3. **Cluster 12**: Data Validation & Schemas
4. **Cluster 13**: Repositories (Data Access Layer)

**Goal**: Get API endpoints working with data persistence

### Phase 2: Game Core (Weeks 3-4) - 🔴 CRITICAL
1. **Cluster 3**: Game Core Logic & State Management
2. **Cluster 5**: Socket.io Real-Time Events
3. **Cluster 4**: Matchmaking & Queue System
4. **Cluster 6**: Bot AI & Auto-Play

**Goal**: Fully playable game with real-time updates

### Phase 3: Features & Polish (Weeks 5-6) - 🟠 HIGH
1. **Cluster 7**: Chat & Messaging System
2. **Cluster 8**: Notifications & Alerts
3. **Cluster 9**: Player Stats & Leaderboard
4. **Cluster 10**: Reporting & Moderation
5. **Cluster 11**: Admin Panel & Management

**Goal**: Complete feature set for players and admins

### Phase 4: Quality & Deployment (Weeks 7-8) - 🟠 HIGH
1. **Cluster 14**: Testing Suite
2. **Cluster 15**: Documentation & API Spec
3. **Cluster 16**: CI/CD & Deployment
4. **Cluster 17**: Performance & Optimization
5. **Cluster 18**: Security & Compliance

**Goal**: Production-ready, well-tested, documented system

---

## 🔧 Implementation Checklist

### Core Implementation
- [ ] Create userRepository.js
- [ ] Create walletRepository.js
- [ ] Create transactionRepository.js
- [ ] Create gameRepository.js
- [ ] Create matchHistoryRepository.js
- [ ] Create queueRepository.js
- [ ] Create authValidator.js
- [ ] Create walletValidator.js
- [ ] Create gameValidator.js
- [ ] Create authController.js
- [ ] Create authService.js
- [ ] Create walletController.js
- [ ] Create walletService.js
- [ ] Create gameController.js
- [ ] Create gameService.js
- [ ] Create matchmakingController.js
- [ ] Create matchmakingService.js
- [ ] Create botController.js
- [ ] Create botService.js

### Socket.io Implementation
- [ ] Implement game.socket.js
- [ ] Implement chat.socket.js
- [ ] Implement bot.socket.js
- [ ] Test socket connections
- [ ] Test real-time updates
- [ ] Implement reconnection logic

### Secondary Features
- [ ] Create chatController.js
- [ ] Create chatService.js
- [ ] Create statsController.js
- [ ] Create statsService.js
- [ ] Create notificationController.js
- [ ] Create notificationService.js
- [ ] Create reportController.js
- [ ] Create reportService.js
- [ ] Create adminController.js
- [ ] Create adminService.js

### Quality & Deployment
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Generate Swagger docs
- [ ] Setup CI/CD pipelines
- [ ] Configure Docker
- [ ] Setup monitoring
- [ ] Security audit
- [ ] Load testing
- [ ] Performance optimization

---

## 📚 Dependencies & Libraries Already Installed

**Core Framework**:
- ✅ express (4.18.2)
- ✅ mongoose (7.5.0)
- ✅ socket.io (4.7.2)

**Authentication & Security**:
- ✅ jsonwebtoken (9.0.2)
- ✅ firebase-admin (12.0.0)
- ✅ bcrypt (5.1.1)
- ✅ helmet (7.1.0)
- ✅ express-rate-limit (7.1.5)
- ✅ xss-clean (0.1.1)
- ✅ express-mongo-sanitize (2.2.0)

**Validation & Utilities**:
- ✅ joi (17.11.0)
- ✅ express-validator (7.0.0)
- ✅ uuid (9.0.1)
- ✅ lodash (4.17.21)

**Logging & Monitoring**:
- ✅ winston (3.11.0)
- ✅ morgan (1.10.0)

**Caching & Jobs**:
- ✅ redis (4.6.12)
- ✅ node-cron (3.0.3)

**HTTP & APIs**:
- ✅ axios (1.6.2)
- ✅ cors (2.8.5)

**Documentation**:
- ✅ swagger-jsdoc (6.2.8)
- ✅ swagger-ui-express (5.0.0)

**Testing** (DevDependencies):
- ✅ jest (29.7.0)
- ✅ supertest (6.3.3)
- ✅ nodemon (3.0.2)
- ✅ eslint (8.53.0)
- ✅ prettier (3.1.0)

---

## 🚀 Quick Start Implementation

### Step 1: Setup Repositories (Data Access)
```
Priority: CRITICAL | Estimated Time: 3-4 hours
Files: src/repositories/*.js
- Base repository pattern with CRUD methods
- Index all database queries
- Add error handling and logging
- Test with MongoDB
```

### Step 2: Setup Validators (Input Validation)
```
Priority: CRITICAL | Estimated Time: 2-3 hours
Files: src/validators/*.js
- Joi schemas for all endpoints
- Custom validation messages
- Reusable validation functions
- Test with invalid inputs
```

### Step 3: Implement Auth Module (Cluster 1)
```
Priority: CRITICAL | Estimated Time: 4-5 hours
Files: authService.js, authController.js, authValidator.js
- Firebase token verification
- JWT generation and refresh
- User registration/login
- Profile management
- Test all auth flows
```

### Step 4: Implement Wallet Module (Cluster 2)
```
Priority: CRITICAL | Estimated Time: 3-4 hours
Files: walletService.js, walletController.js, walletValidator.js
- Coin balance management
- Transaction recording
- Atomic operations for safety
- Freeze/unfreeze logic
- Test concurrent operations
```

### Step 5: Implement Game Module (Cluster 3)
```
Priority: CRITICAL | Estimated Time: 6-8 hours
Files: gameService.js, gameController.js, gameValidator.js
- Complete game logic
- Board calculations
- Move validation
- Rule enforcement
- Winner detection
- Test all game rules
```

### Step 6: Implement Socket.io (Cluster 5)
```
Priority: CRITICAL | Estimated Time: 4-5 hours
Files: sockets/*.js
- Real-time event broadcasting
- Game state synchronization
- Disconnection handling
- Reconnection recovery
- Load test with 100+ concurrent games
```

---

## 📞 Support & Next Steps

### Key Files to Review
- [src/models/game.model.js](src/models/game.model.js) - Game schema
- [src/models/user.model.js](src/models/user.model.js) - User schema
- [src/models/wallet.model.js](src/models/wallet.model.js) - Wallet schema
- [src/constants/rules.constants.js](src/constants/rules.constants.js) - Game rules
- [src/routes/](src/routes/) - All route definitions
- [src/config/](src/config/) - Configuration files

### Getting Help
1. Check existing documentation in `src/docs/`
2. Review route definitions for endpoint expectations
3. Refer to model schemas for data structure
4. Check constants for business rules
5. Review middleware implementation for patterns

### Common Tasks
- **Adding a new endpoint**: Create route → controller → service → repository
- **Handling errors**: Throw ApiError() with status code
- **Logging**: Use logger from utils
- **Validation**: Create validator schema, use validation middleware
- **Real-time updates**: Emit socket events with data

---

**Generated**: 2026-05-10  
**Backend Version**: 1.0.0  
**Node**: >=16.0.0  
**Status**: Ready for Implementation 🚀
