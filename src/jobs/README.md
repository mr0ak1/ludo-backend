# Cron Jobs Structure

## Daily Reward Cron
- File: `dailyReward.job.js`
- Run: Every 24 hours
- Action: Distribute daily reward coins to active players

## Cleanup Cron
- File: `cleanup.job.js`
- Run: Every 6 hours
- Action: Remove inactive games, expired queue entries

## Analytics Cron
- File: `analytics.job.js`
- Run: Every 24 hours (end of day)
- Action: Generate daily analytics reports

## Match Timeout Cron
- File: `matchTimeout.job.js`
- Run: Every minute
- Action: Check for timed-out games and handle them

## Wallet Reset Cron
- File: `walletReset.job.js`
- Run: As needed
- Action: Reset wallet locks and frozen states

# Usage in src/cron/index.js:
Each job can be scheduled using node-cron or agenda.
See schedules.js for schedule definitions.
