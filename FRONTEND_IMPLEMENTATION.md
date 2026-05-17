# Frontend Implementation Guide — Cluster-wise

This single document maps the frontend implementation to backend clusters and API endpoints. Order is important: start from Auth (login/verify), then Home, then Matchmaking / Game flows, Gameplay, Results, Wallet, Notifications, Chat, Stats, Admin & Reports.

---

## Overview
- Platform: Web (React recommended) with `socket.io-client` for realtime gameplay.
- State: Redux or React Context + local caches for active game state.
- Networking: REST for control endpoints; WebSocket for realtime game events.
- Env vars needed in frontend:
  - `REACT_APP_API_BASE_URL` (e.g. https://api.example.com/api/v1)
  - `REACT_APP_SOCKET_URL` (e.g. wss://api.example.com)
  - No Firebase auth keys needed for OTP auth flow

### Frontend `.env` sample
Use this in the frontend app root:
```env
REACT_APP_API_BASE_URL=http://localhost:5000/api/v1
REACT_APP_SOCKET_URL=http://localhost:5001
REACT_APP_DEFAULT_COUNTRY_CODE=91
```

If you use Vite instead of CRA, replace `REACT_APP_` with `VITE_`.

---

## Cluster 1 — Auth (Priority: High)
Pages / Screens:
- `Auth/Login` — Enter mobile number to request OTP.
- `Auth/VerifyOtp` — Enter OTP and complete login.
- `Auth/Profile` — View & update profile; delete account; logout.

Components:
- `PhoneAuthForm` (phone + OTP flow)
- `ProfileForm` (name, avatar upload)
- `ProtectedRoute` wrapper (checks JWT)

State & Storage:
- Store JWT in secure httpOnly cookie via backend (preferred) or in memory/localStorage with refresh handling.
- User profile in Redux store: `{ id, name, avatar, coins, stats }`.

API Endpoints (auth):
- `POST /api/v1/auth/send-otp` — send OTP and receive session id.
- `POST /api/v1/auth/verify-otp` — verify OTP and receive JWT.
- `POST /api/v1/auth/verify` — backward-compatible alias of verify-otp.
- `POST /api/v1/auth/refresh-token` — refresh JWT.
- `POST /api/v1/auth/logout` — invalidate device token.
- `GET /api/v1/auth/profile` — fetch profile.
- `PUT /api/v1/auth/profile` — update profile.
- `DELETE /api/v1/auth/delete-account` — delete account.

Frontend flow (order):
1. Login screen submits phone to `POST /auth/send-otp`.
2. OTP screen submits `{ phone, otp, sessionId }` to `POST /auth/verify-otp`.
3. Save auth state, redirect to `Home`.

UX notes:
- Show spinner during OTP send/verify; show friendly errors for invalid or expired OTP.
- On JWT expiry, call refresh endpoint and retry original action.

---

## Cluster 2 — Home & Lobby (Priority: High)
Pages / Screens:
- `Home` — Entry page after auth: shows balance, quick play, create game, join queue, leaderboard, recent matches.
- `Lobby` — Lists waiting games, friends online, bot play shortcuts.

Components:
- `Header` (balance, avatar, notifications)
- `QuickActions` (Practice, Cash, Play with Bot)
- `GameCard` (waiting games preview)

API Endpoints:
- `GET /api/v1/game/waiting` — list waiting games.
- `GET /api/v1/game/leaderboard` — leaderboard for home view.
- `GET /api/v1/wallet` — balance for header.
- `GET /api/v1/stats/me` — small snapshot for home widgets.

Flow:
1. Home loads wallet & stats.
2. User taps `Quick Play` → show matchmaking options or create-game modal.

---

## Cluster 3 — Matchmaking (Priority: High)
Pages / Screens:
- `Matchmaking/JoinQueue` — modal or page showing queue progress and cancel option.

Components:
- `QueueStatus` (estimated wait, bots used)

API Endpoints:
- `POST /api/v1/matchmaking/join-queue` — body: `{ gameType?: 'cash'|'practice'|'tournament', betAmount? }`.
- `POST /api/v1/matchmaking/leave-queue` — leave queue.
- `GET /api/v1/matchmaking/queue-status` — poll for status.

Realtime events:
- Use socket to listen for `match_found` or server `GAME_STATE_SYNC` events to know when match is ready.

UX notes:
- Show cancel option and fallback to bot-match after X seconds if configured.

---

## Cluster 4 — Game Creation & Joining
Pages / Screens:
- `CreateGame` modal — choose practice/cash, entry fee, bot difficulty.
- `JoinGame` flow — confirm and pay entry fee for cash games.

API Endpoints:
- `POST /api/v1/game/practice/create` — creates practice game.
- `POST /api/v1/game/cash/create` — creates cash game, returns gameId.
- `POST /api/v1/game/join` — join existing game.
- `POST /api/v1/bot/create-game` — create 1v1 vs bot (optionally with difficulty).

Flow:
1. User selects create/join → call respective endpoint.
2. On success, connect to socket room for `game:{gameId}` and navigate to `GamePlay` screen.

---

## Cluster 5 — Gameplay UI (Realtime) (Priority: Critical)
Pages / Screens:
- `GamePlay` — full game board UI, tokens, dice, chat, moves list, timer, player order.

Components:
- `Board` — renders 52-tile board + home lanes, safe zones highlighted.
- `PlayerPanel` — shows player's tokens and status (consecutive sixes, inHome)
- `Dice` — shows current dice and roll button (when player's turn)
- `MovesList` — list of recent moves
- `ChatPanel` — in-game chat
- `Timer` — turn countdown

Sockets & Events:
- Connect with socket.io using JWT in auth header or token param.
- Listen for events: `DICE_ROLLED`, `TOKEN_MOVED`, `TURN_CHANGED`, `GAME_STATE_SYNC`, `GAME_ENDED`, `MATCH_FOUND` (names from backend constants — map in app boot)

REST Actions (gameplay):
- `POST /api/v1/game/roll-dice` — server returns `diceValue` and `validMoves`.
- `POST /api/v1/game/move-token` — body: `{ tokenIndex }` — apply move.
- `POST /api/v1/game/skip-turn` — skip turn.
- `POST /api/v1/game/surrender` — surrender.
- `POST /api/v1/game/reconnect` — on reconnect.
- `GET /api/v1/game/active` — fetch active game state.

Client-side move flow:
1. Player clicks `Roll` -> call `roll-dice` -> show dice animation.
2. Show `validMoves` on board (highlight tokens).
3. User picks token -> call `move-token` -> optimistically animate, then reconcile with `GAME_STATE_SYNC`.

State shape (activeGame):
```
{
  _id, gameType, currentTurn, players: [{ userId, name, tokens:[{position}], isHome:[bool] }], moves[], diceValue, results
}
```

Edge cases:
- Handle 3 consecutive sixes (backend already enforces). Show messaging to user.
- If socket disconnects, poll `GET /game/active` and call `POST /game/reconnect` to restore.

---

## Cluster 6 — Bot Play (Priority: Medium)
Pages / Screens:
- `BotPlay` similar to `CreateGame` but with bot difficulty select.

API Endpoints:
- `POST /api/v1/bot/create-game` — create vs bot.
- `GET /api/v1/bot/difficulties` — list of difficulties.

UX:
- Let user choose difficulty before create; show bot name and difficulty in match found message.

---

## Cluster 7 — Wallet & Payments (Priority: High for Cash Games)
Pages / Screens:
- `Wallet` — Balance, add coins (admin or payment integration), transaction history.
- `PaymentModal` — confirm in-app purchase if present.

API Endpoints:
- `GET /api/v1/wallet` — fetch wallet details.
- `GET /api/v1/wallet/history` — transactions.
- `POST /api/v1/wallet/add` (admin) — server-side.

UX:
- Before creating cash game, ensure `wallet.balance >= entryFee` else show top-up flow.

---

## Cluster 8 — Chat & Notifications
Chat:
- `GET /api/v1/chat/:gameId` — fetch chat history.
- `POST /api/v1/chat/:gameId/message` — send message.

Notifications:
- `GET /api/v1/notification` — fetch notifications.
- `PUT /api/v1/notification/:id/read` — mark as read.
- `POST /api/v1/notification/register-device` — register FCM token via backend.

Realtime: show ephemeral toasts for `match_found`, `game_invite`, `game_ended`.

---

## Cluster 9 — Stats, Leaderboard & History
Pages / Screens:
- `Profile/Stats` — personal stats and match history.
- `Leaderboard` — global top players.

API Endpoints:
- `GET /api/v1/stats/me` — personal stats.
- `GET /api/v1/stats/leaderboard` — leaderboard.
- `GET /api/v1/stats/history` — match history.

---

## Cluster 10 — Admin & Reports (Optional / Low Priority)
Notes:
- Admin endpoints and report endpoints are partially unimplemented (server stubs). For frontend, scaffold admin pages but gate them behind admin account.
- `POST /api/v1/report/user` and `/match` currently return 501 — backend needs implementation.

API Endpoints (admin):
- `POST /api/v1/matchmaking/set-bot-difficulty` — admin to set global bot difficulty.
- Wallet admin endpoints: `POST /api/v1/wallet/add|/deduct|/freeze|/unfreeze`.

---

## Cross-cutting Concerns
- Error handling: map HTTP 4xx/5xx to friendly UI messages; retry for network failures.
- Security: always send JWT in `Authorization: Bearer <token>` for REST; for sockets use token handshake.
- Analytics & logging: instrument important events (game start, game end, purchase).
- Testing: use Jest + React Testing Library for unit tests; Cypress or Playwright for E2E (login → create game → simulate moves).

---

## Implementation Roadmap (Suggested)
1. Auth pages + OTP send/verify integration (Cluster 1) — 2 days
2. Home + Wallet preview + Leaderboard (Cluster 2 & 7) — 2 days
3. Matchmaking & Create/Join flows (Cluster 3 & 4) — 3 days
4. Gameplay UI + Socket integration (Cluster 5) — 5 days
5. Chat, Notifications, Bot options (Cluster 6 & 8) — 2 days
6. Stats, History, Admin scaffolds (Cluster 9 & 10) — 2 days

---

## Useful Client-side code snippets (examples)
- Roll dice:
```
POST ${'{API_BASE_URL}'}/game/roll-dice
headers: { Authorization: `Bearer ${'{JWT}'}` }
body: { gameId, turnVersion }
```

- Move token:
```
POST ${'{API_BASE_URL}'}/game/move-token
body: { gameId, tokenIndex, turnVersion }
```

---

## Next steps I can do for you
- Create a React starter with routes and stubs for each page.
- Scaffold `GamePlay` board component with basic token rendering and socket hooks.
- Generate Postman collection for all listed endpoints.

---

## File mapping (backend reference):
- Auth routes: `src/routes/auth.routes.js`
- Game routes: `src/routes/game.routes.js`
- Matchmaking: `src/routes/matchmaking.routes.js`
- Wallet: `src/routes/wallet.routes.js`
- Bot: `src/routes/bot.routes.js`
- Chat: `src/routes/chat.routes.js`
- Notifications: `src/routes/notification.routes.js`
- Stats: `src/routes/stats.routes.js`

Good to go — tell me which of the "Next steps" you want me to implement first.
