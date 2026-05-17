# Cluster 6 - Bot AI API Quick Reference

## Endpoints

### 1. Create Bot Game
```
POST /api/v1/bot/create-game
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "difficulty": "medium",    // optional: 'easy' | 'medium' | 'hard'
  "entryFee": 100            // optional: 0-10000 (default: 0)
}

Response (201 Created):
{
  "success": true,
  "message": "Bot game created successfully",
  "data": {
    "_id": "game123",
    "gameType": "cash",
    "entryFee": 100,
    "status": "ongoing",
    "maxPlayers": 2,
    "players": [
      {
        "userId": "user123",
        "position": 0,
        "tokens": [
          { "position": -1, "active": false },
          ...
        ],
        "diceCount": 0,
        "consecutiveSixes": 0,
        "isHome": [false, false, false, false]
      },
      {
        "userId": "bot_medium_1",
        "position": 1,
        "tokens": [
          { "position": -1, "active": false },
          ...
        ],
        "diceCount": 0,
        "consecutiveSixes": 0,
        "isHome": [false, false, false, false]
      }
    ],
    "currentTurn": 0,
    "moves": [],
    "startTime": "2026-05-12T10:30:00.000Z",
    "endTime": null,
    "results": {},
    "createdAt": "2026-05-12T10:30:00.000Z",
    "updatedAt": "2026-05-12T10:30:00.000Z"
  }
}

Error Responses:
400 Bad Request: { error: "Validation failed", details: [...] }
401 Unauthorized: { error: "Authentication required" }
404 Not Found: { error: "User not found" }
500 Server Error: { error: "Internal server error" }
```

### 2. Get Bot Difficulties
```
GET /api/v1/bot/difficulties
Authorization: Bearer {token}

Response (200 OK):
{
  "success": true,
  "message": "Bot difficulties retrieved successfully",
  "data": {
    "difficulties": [
      {
        "level": "easy",
        "displayName": "Easy",
        "description": "Makes random moves with basic logic. Perfect for learning the game.",
        "winRate": "50-70%",
        "thinkingTime": "~1 second"
      },
      {
        "level": "medium",
        "displayName": "Medium",
        "description": "Balanced strategy with smart move selection. Recommended for casual play.",
        "winRate": "30-50%",
        "thinkingTime": "~1.5 seconds"
      },
      {
        "level": "hard",
        "displayName": "Hard",
        "description": "Advanced AI with lookahead planning. Challenge yourself against this level.",
        "winRate": "10-30%",
        "thinkingTime": "~2 seconds"
      }
    ],
    "recommended": "medium"
  }
}
```

---

## Difficulty Strategy Breakdown

### Easy Bot
- **Algorithm**: Random move selection
- **Scoring**: No scoring, purely random
- **Win Rate**: 50-70% against human players
- **Thinking Time**: 1 second
- **Best For**: Beginners learning the game
- **Characteristics**:
  - Unpredictable moves
  - Sometimes makes suboptimal choices
  - Good for casual practice

### Medium Bot
- **Algorithm**: Scoring-based strategy
- **Scoring Logic**:
  - Token closer to home: +10 points
  - Safe zone landing: +5 points
  - Token advancement: +3 points
  - Random variation: ±2 points
- **Win Rate**: 30-50% against human players
- **Thinking Time**: 1.5 seconds
- **Best For**: Casual players
- **Characteristics**:
  - Logical move selection
  - Prioritizes home progression
  - Prefers safe zones
  - Competitive but not overwhelming

### Hard Bot
- **Algorithm**: Advanced lookahead and risk assessment
- **Scoring Logic**:
  - Token progress percentage: 20 points
  - Close to home (within 10): +15 points
  - Safe zone preference: +8 points
  - Opponent avoidance: -5 per opponent
  - Advanced token priority: +3 points
  - Random variation: ±1 point
- **Win Rate**: 10-30% against human players
- **Thinking Time**: 2 seconds
- **Best For**: Experienced players
- **Characteristics**:
  - Strategic move planning
  - Opponent awareness
  - Risk calculation
  - Aggressive but intelligent

---

## Error Codes & Handling

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| 400 | Invalid difficulty | Wrong value | Use: easy, medium, hard |
| 400 | Entry fee exceeds max | Fee > 10000 | Use: 0-10000 |
| 400 | Entry fee must be positive | Fee < 0 | Use: >= 0 |
| 401 | Authentication required | No token | Include Bearer token |
| 404 | User not found | Invalid user | Verify user exists |
| 500 | Insufficient balance | Not enough coins | Add coins via wallet |

---

## Integration Guide

### Creating a Bot Game Flow
```
1. Client calls GET /bot/difficulties to show options
2. User selects difficulty and entry fee
3. Client calls POST /bot/create-game
4. Server creates game with bot opponent
5. Game returned in "ongoing" status
6. Client joins game room via Socket.io
7. First player turn begins (could be bot or human)
8. Game proceeds with alternating turns
9. Bot moves automatically after thinking delay
10. Game ends when someone wins or surrenders
```

### Socket Events for Bot Games
```
Server → Client:
- game_joined: Player/bot joined
- dice_rolled: Dice result
- token_moved: Token position update
- turn_changed: Turn switched to next player
- game_ended: Game completed
- bot_thinking: Bot is calculating move (optional)

Client → Server:
- join_game: Join game room
- roll_dice: Request dice roll
- move_token: Move token
- skip_turn: Skip if no valid move
- leave_game: Abandon game
```

---

## Testing

### Manual Testing Checklist
- [ ] Easy bot game creates successfully
- [ ] Medium bot game creates successfully
- [ ] Hard bot game creates successfully
- [ ] 0 entry fee games work
- [ ] 1-10000 entry fee games work
- [ ] Invalid difficulty rejected
- [ ] Negative fee rejected
- [ ] Excessive fee rejected
- [ ] GET difficulties returns all levels
- [ ] Recommended level is "medium"
- [ ] Authentication required works
- [ ] Error messages are clear

### Automated Tests
```bash
npm test -- tests/unit/controllers/botController.test.js
npm test -- tests/unit/validators/botValidator.test.js
npm test -- tests/unit/services/botService.test.js
```

---

## Development Notes

### Adding New Difficulty Level
1. Add to `BOT_LEVELS` in `bot.constants.js`
2. Add strategy method in `botService._newStrategy()`
3. Add case in `botService.decideMove()`
4. Add test cases in `botService.test.js`
5. Add metadata in `botController.getDifficultyDescription()`
6. Update this documentation

### Tuning Win Rates
1. Modify scores in strategy methods in `botService.js`
2. Test with multiple games
3. Adjust weights based on results
4. Update expected win rates in controller
5. Document changes in progress checkpoint

### Adding Bot Names/Avatars
1. Create name/avatar mapping in bot constants
2. Add to bot player creation in `botSelector.js`
3. Include in game response to client
4. Update UI to display bot name

---

## Performance Considerations

- Bot move calculation: ~10ms per decision
- Thinking delay: 1-2 seconds (configurable)
- Game creation: ~50ms (includes wallet check)
- Total game startup: ~100-200ms
- Concurrent games supported: Limited by CPU (100+ on typical server)

---

**Reference**: See CLUSTER_6_BOT_IMPLEMENTATION.md for detailed implementation guide
