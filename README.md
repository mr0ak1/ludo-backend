# Realtime Ludo Game Backend

A production-grade Node.js/Express backend for a realtime multiplayer Ludo game with wallet system, matchmaking, and bot gameplay.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Realtime**: Socket.io
- **Authentication**: JWT + Firebase Admin SDK
- **Caching**: Redis (future scaling)
- **Security**: Helmet, Express Rate Limit, XSS Clean, Mongo Sanitize
- **Logging**: Winston + Morgan
- **Validation**: Joi + Express Validator

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/       # Request handlers
│   ├── services/         # Business logic
│   ├── repositories/     # Database operations
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── sockets/          # Socket.io handlers
│   ├── middlewares/      # Express middlewares
│   ├── validators/       # Request validation schemas
│   ├── constants/        # Application constants (NO hardcoding)
│   ├── utils/            # Helper functions
│   ├── jobs/             # Background jobs
│   ├── cron/             # Cron job schedulers
│   ├── logs/             # Application logs
│   ├── docs/             # Internal documentation
│   ├── app.js            # Express app setup
│   └── server.js         # Server entry point
├── tests/                # Test files
├── scripts/              # Deployment & utility scripts
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies
└── README.md             # This file
```

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB (local or Atlas)
- Redis (optional, for future scaling)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ludo_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup MongoDB**
   - Create MongoDB Atlas cluster or use local MongoDB
   - Update `MONGO_URI` in `.env`

5. **Setup Firebase**
   - Create Firebase project
   - Download service account JSON
   - Extract and add to `.env`: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`

### Running the Server

**Development**
```bash
npm run dev
```

**Production**
```bash
npm start
```

## API Documentation

### Base URL
```
/api/v1
```

### Main Modules

1. **Auth** - Firebase OTP + JWT authentication
2. **Wallet** - Coin management and transactions
3. **Game** - Practice and cash games
4. **Matchmaking** - Player queue and opponent matching
5. **Bot** - AI opponent with difficulty levels
6. **Chat** - Quick predefined messages
7. **Stats** - Player statistics and leaderboards
8. **Notifications** - Push notifications (FCM)
9. **Reports** - User and match reporting
10. **Admin** - Admin dashboard and user management

### Response Format

**Success**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

**Error**
```json
{
  "success": false,
  "message": "Error message",
  "error": {}
}
```

## Socket.io Events

### Client → Server
- `join_game` - Join a game room
- `roll_dice` - Roll dice
- `move_token` - Move token on board
- `chat_message` - Send chat message
- `leave_game` - Leave game
- `reconnect_game` - Reconnect to active game

### Server → Client
- `game_joined` - Game started
- `dice_rolled` - Dice result
- `token_moved` - Token moved
- `turn_changed` - Turn switched
- `chat_received` - Chat message received
- `game_ended` - Game finished
- `player_disconnected` - Player disconnected
- `match_found` - Opponent found

## Database Models

1. **User** - User profile and statistics
2. **Game** - Game state and history
3. **Wallet** - User coins and balance
4. **Transaction** - Wallet transactions
5. **MatchHistory** - Game results
6. **Notification** - Push notifications
7. **Report** - User reports
8. **Queue** - Matchmaking queue
9. **AdminLog** - Admin activities

## Security Features

- JWT authentication (7-day expiry)
- Helmet headers protection
- Rate limiting (100 req/15min)
- XSS protection
- MongoDB injection prevention
- Transaction locking for wallet operations
- Admin role verification
- Socket authentication

## Game Rules

- **Token Unlock**: Requires dice value = 6
- **Consecutive 6**: Extra turn for 1st and 2nd; 3rd cancels entire turn
- **Kill Rule**: Landing on opponent token sends it home + bonus turn
- **Safe Zones**: Cannot be killed at [1, 9, 14, 22, 27, 35, 40, 48]
- **Home Entry**: Exact dice value required
- **Winner**: All 4 tokens reach home

## Testing

```bash
# Run tests
npm test

# Watch mode
npm test:watch

# With coverage
npm test -- --coverage
```

## Linting & Formatting

```bash
# Check code
npm run lint

# Fix automatically
npm run lint:fix

# Format code
npm run format
```

## Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

### Using Docker
```bash
docker build -t ludo-backend .
docker run -p 5000:5000 ludo-backend
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Update all URLs to production domains
- Use strong JWT_SECRET
- Enable HTTPS
- Use MongoDB Atlas with credentials
- Configure Redis for scaling

## Performance Optimization

- MongoDB indexing on frequently queried fields
- Lean queries for read-only operations
- Redis caching (future)
- Socket room optimization
- Pagination for all list endpoints
- Request compression

## Monitoring & Logging

- Winston logging for errors and info
- Morgan for HTTP request logging
- Sentry integration (optional)
- Firebase Analytics
- Admin dashboard with metrics

## Contributing

1. Create a feature branch
2. Follow the existing code structure
3. Run linting before committing
4. Write tests for new features
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please create an issue in the repository.

## Roadmap

- [ ] Multiplayer rooms (4+ players)
- [ ] Tournament mode
- [ ] Clan system
- [ ] Leaderboards with rankings
- [ ] Daily rewards system
- [ ] In-app purchases
- [ ] Real money integration
- [ ] Friends system
- [ ] Chat system (general)
- [ ] Replay system
