Probability Manager Module Requirements
Objective

Admin panel me ek "Probability Manager" module implement karna hai jo globally user win percentage control kare.

Configuration

Admin fields:

Win Probability (%) : 0 - 100
Enabled / Disabled Toggle
Force Override Bot Management Toggle

Example:

Win Probability = 30%

Matlab total active user games me approximately 30% games ko Easy Mode assign kiya jayega aur remaining games Hard Mode me chalenge.

Selection Logic
Step 1

Sabhi active user-vs-bot games fetch karo.

Only active games consider karni hain.

Step 2

Games ko bet amount ascending order me sort karo.

Example:

Game A = ₹10
Game B = ₹20
Game C = ₹50
Game D = ₹100
Game E = ₹200

Step 3

Easy game count calculate karo:

easyCount = floor(totalActiveGames * probabilityPercent / 100)

Example:

10 active games
Probability = 30%

easyCount = 3

Step 4

Lowest bet amount wali first 3 games ko Easy Mode assign karo.

Remaining 7 games ko Hard Mode assign karo.

Priority Rules

Probability Manager highest priority feature hoga.

Priority Order:

Probability Manager
User-specific configuration
Bot Management
Default AI Logic

Agar Probability Manager enabled hai to Bot Management ke Easy/Medium/Hard settings ignore kar di jayengi.

Edge Cases
Case 1: No Active Games

If totalActiveGames = 0

No calculation required.

Return safely.

Case 2: Probability = 0%

All games Hard Mode.

Case 3: Probability = 100%

All games Easy Mode.

Case 4: Single Active Game

Probability < 100

Avoid random behaviour.

Use deterministic calculation.

Case 5: Same Bet Amount

If multiple games have same bet amount:

Sort by:

Bet Amount
Game Creation Time
Game ID

to ensure deterministic selection.

Case 7: Large Traffic

Support:

10,000+ concurrent games
Efficient sorting
Batched recalculation

Avoid full table scans every turn.

Case 8: Race Conditions

When multiple games start simultaneously:

Use transaction locking
Prevent duplicate allocation
Ensure consistent easyCount calculation
Case 9: User Disconnect/Reconnect

Mode assignment must remain unchanged.

Store assigned mode in game session.

Case 10: Audit Logs

Maintain logs:

Timestamp
Probability value
Game ID
Assigned Mode
Bet Amount
Recalculation reason