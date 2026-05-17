# React Native Expo Folder & File Structure

This document defines the recommended React Native Expo structure for the Ludo app, following the flow:
Auth -> Home -> Matchmaking / Create Game -> Gameplay -> Result -> Wallet / Stats / Profile.

I am using an Expo Router style structure because it is the cleanest fit for Expo apps. If you prefer React Navigation, the same screen names can be kept and only the routing layer changes.

---

## 1) Recommended Root Structure

```text
mobile-app/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── verify.tsx
│   │   └── profile-setup.tsx
│   ├── home/
│   │   ├── index.tsx
│   │   ├── leaderboard.tsx
│   │   ├── wallet.tsx
│   │   └── notifications.tsx
│   ├── matchmaking/
│   │   ├── index.tsx
│   │   ├── join-queue.tsx
│   │   └── create-game.tsx
│   ├── game/
│   │   ├── [gameId].tsx
│   │   ├── result.tsx
│   │   └── reconnect.tsx
│   ├── bot/
│   │   ├── index.tsx
│   │   └── difficulty.tsx
│   ├── chat/
│   │   └── [gameId].tsx
│   ├── stats/
│   │   ├── index.tsx
│   │   └── history.tsx
│   ├── report/
│   │   ├── user.tsx
│   │   └── match.tsx
│   └── settings/
│       └── index.tsx
│
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.api.ts
│   │   ├── game.api.ts
│   │   ├── matchmaking.api.ts
│   │   ├── wallet.api.ts
│   │   ├── bot.api.ts
│   │   ├── chat.api.ts
│   │   ├── stats.api.ts
│   │   └── notification.api.ts
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Loader.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── layout/
│   │   │   ├── Screen.tsx
│   │   │   ├── Header.tsx
│   │   │   └── BottomNav.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── OtpInput.tsx
│   │   │   └── ProfileSetupForm.tsx
│   │   ├── home/
│   │   │   ├── QuickActions.tsx
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   └── RecentMatches.tsx
│   │   ├── game/
│   │   │   ├── Board.tsx
│   │   │   ├── Token.tsx
│   │   │   ├── Dice.tsx
│   │   │   ├── PlayerPanel.tsx
│   │   │   ├── TurnTimer.tsx
│   │   │   ├── MovesList.tsx
│   │   │   └── ResultModal.tsx
│   │   ├── chat/
│   │   │   ├── ChatList.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── wallet/
│   │   │   ├── WalletCard.tsx
│   │   │   └── TransactionList.tsx
│   │   └── matchmaking/
│   │       ├── QueueCard.tsx
│   │       └── GameCreateForm.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSocket.ts
│   │   ├── useGame.ts
│   │   ├── useWallet.ts
│   │   └── useCountdown.ts
│   │
│   ├── store/
│   │   ├── index.ts
│   │   ├── auth.slice.ts
│   │   ├── game.slice.ts
│   │   ├── wallet.slice.ts
│   │   ├── chat.slice.ts
│   │   └── ui.slice.ts
│   │
│   ├── services/
│   │   ├── socket.service.ts
│   │   ├── otp.service.ts
│   │   ├── token.service.ts
│   │   └── storage.service.ts
│   │
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── validators.ts
│   │   └── game.mapper.ts
│   │
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── shadows.ts
│   │
│   └── types/
│       ├── auth.types.ts
│       ├── game.types.ts
│       ├── wallet.types.ts
│       ├── chat.types.ts
│       └── api.types.ts
│
├── assets/
│   ├── images/
│   ├── icons/
│   ├── fonts/
│   └── animations/
│
├── app.config.ts
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── package.json
└── .env
```

---

## 2) Screen Flow Order

### Auth first
1. `app/index.tsx` checks auth state.
2. If user is logged out, redirect to `app/auth/login.tsx`.
3. OTP request happens from `LoginForm` via `POST /auth/send-otp`.
4. OTP verify call goes through `src/api/auth.api.ts` (`POST /auth/verify-otp`).
5. On success, store session and redirect to `app/home/index.tsx`.

### Then home
1. Home shows wallet balance, quick actions, leaderboard preview, recent matches.
2. User chooses practice, cash, bot, or queue.

### Then game flow
1. Create or join game from matchmaking.
2. Navigate to `app/game/[gameId].tsx`.
3. Connect socket.
4. Roll dice, move token, show turn timer.
5. Show result screen on game end.

---

## 3) Feature-wise File Mapping

### Auth
- `app/auth/login.tsx` -> login screen
- `app/auth/verify.tsx` -> OTP verification screen
- `src/components/auth/LoginForm.tsx` -> sign-in UI
- `src/services/otp.service.ts` -> OTP timers, resend handling
- `src/api/auth.api.ts` -> `/auth/send-otp`, `/auth/verify-otp`, `/auth/profile`, `/auth/logout`
- `src/store/auth.slice.ts` -> auth session, profile, token state

### Home
- `app/home/index.tsx` -> main dashboard
- `src/components/home/QuickActions.tsx`
- `src/components/home/BalanceCard.tsx`
- `src/components/home/RecentMatches.tsx`
- `src/api/wallet.api.ts`
- `src/api/stats.api.ts`

### Matchmaking
- `app/matchmaking/index.tsx`
- `app/matchmaking/join-queue.tsx`
- `app/matchmaking/create-game.tsx`
- `src/components/matchmaking/GameCreateForm.tsx`
- `src/api/matchmaking.api.ts`

### Game Play
- `app/game/[gameId].tsx`
- `src/components/game/Board.tsx`
- `src/components/game/Token.tsx`
- `src/components/game/Dice.tsx`
- `src/components/game/PlayerPanel.tsx`
- `src/components/game/TurnTimer.tsx`
- `src/components/game/MovesList.tsx`
- `src/hooks/useGame.ts`
- `src/hooks/useSocket.ts`
- `src/api/game.api.ts`
- `src/services/socket.service.ts`
- `src/store/game.slice.ts`

### Chat
- `app/chat/[gameId].tsx`
- `src/components/chat/ChatList.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/api/chat.api.ts`
- `src/store/chat.slice.ts`

### Wallet
- `app/home/wallet.tsx`
- `src/components/wallet/WalletCard.tsx`
- `src/components/wallet/TransactionList.tsx`
- `src/api/wallet.api.ts`
- `src/store/wallet.slice.ts`

### Stats
- `app/stats/index.tsx`
- `app/stats/history.tsx`
- `src/api/stats.api.ts`

### Notifications
- `app/home/notifications.tsx`
- `src/api/notification.api.ts`
- `src/store/ui.slice.ts`

### Bot Play
- `app/bot/index.tsx`
- `app/bot/difficulty.tsx`
- `src/api/bot.api.ts`

### Reports / Settings
- `app/report/user.tsx`
- `app/report/match.tsx`
- `app/settings/index.tsx`

---

## 4) Navigation Design

Recommended route groups:
- `(auth)` for login and verify flow
- `(app)` for home, game, wallet, stats
- `(modals)` for create-game, surrender confirm, result popups

Example logic:
- Logged out -> `/(auth)/login`
- Logged in -> `/(app)/home`
- Active game exists -> `/(app)/game/[gameId]`

---

## 5) API Folder Structure

Every backend feature should have its own file in `src/api`:
- `auth.api.ts`
- `game.api.ts`
- `matchmaking.api.ts`
- `wallet.api.ts`
- `bot.api.ts`
- `chat.api.ts`
- `stats.api.ts`
- `notification.api.ts`

Each file should export functions like:
- `verifyToken()`
- `sendOtp()`
- `verifyOtp()`
- `getProfile()`
- `createPracticeGame()`
- `createCashGame()`
- `rollDice()`
- `moveToken()`
- `getWallet()`
- `joinQueue()`

---

## 6) State Management Structure

Use Redux Toolkit or Zustand. If Redux Toolkit is used, keep slices like this:
- `auth.slice.ts` -> token, user, login status
- `game.slice.ts` -> current game, board state, turn, moves
- `wallet.slice.ts` -> balance, transactions
- `chat.slice.ts` -> message list, unread count
- `ui.slice.ts` -> modals, loading, toast state

Suggested store shape:
```ts
{
  auth: { user, token, isLoggedIn },
  game: { activeGame, currentTurn, diceValue, validMoves },
  wallet: { balance, history },
  chat: { messages, unread },
  ui: { loading, toast, modal }
}
```

---

## 7) Environment Files

Frontend `.env` example:
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://localhost:5001
EXPO_PUBLIC_DEFAULT_COUNTRY_CODE=91
```

For Expo, prefer `EXPO_PUBLIC_` variables.

---

## 8) Recommended File Naming Rules

- Screens: lowercase kebab-case or simple names (`login.tsx`, `create-game.tsx`)
- Components: PascalCase (`Board.tsx`, `WalletCard.tsx`)
- API files: feature-based (`game.api.ts`)
- Types: feature-based (`game.types.ts`)
- Hooks: `useXxx.ts`

---

## 9) Minimum Files to Start

If you want the smallest working Expo app first, create these:
- `app/_layout.tsx`
- `app/index.tsx`
- `app/auth/login.tsx`
- `app/home/index.tsx`
- `app/game/[gameId].tsx`
- `src/api/client.ts`
- `src/api/auth.api.ts`
- `src/api/game.api.ts`
- `src/store/index.ts`
- `src/store/auth.slice.ts`
- `src/store/game.slice.ts`
- `src/services/socket.service.ts`
- `src/services/otp.service.ts`

---

## 10) Suggested Package Stack

- `expo`
- `expo-router`
- `react-native-safe-area-context`
- `react-native-screens`
- `react-native-gesture-handler`
- `socket.io-client`
- `axios`
- `@reduxjs/toolkit` or `zustand`
- `react-native-reanimated`
- `expo-linear-gradient`
- `expo-font`
- `expo-secure-store`

---

## 11) Practical Flow Mapping

Auth -> Home -> Matchmaking -> Game -> Result -> Home

Route sequence:
1. `app/index.tsx`
2. `app/auth/login.tsx`
3. `app/home/index.tsx`
4. `app/matchmaking/create-game.tsx` or `app/matchmaking/join-queue.tsx`
5. `app/game/[gameId].tsx`
6. `app/game/result.tsx`
7. back to `app/home/index.tsx`

---

## 12) What I can generate next

If you want, I can now create one of these next:
- complete Expo starter folder tree as markdown and code stubs
- `app/_layout.tsx` + navigation skeleton
- `src/api` client layer
- `src/store` boilerplate
- `GamePlay` screen structure for the board
