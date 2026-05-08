const { TOTAL_TOKENS_PER_PLAYER } = require('../constants/game.constants');

/**
 * Check if player has won
 */
const hasPlayerWon = (playerTokens) => {
  if (!playerTokens || playerTokens.length === 0) {
    return false;
  }

  // Check if all tokens are at home position (-1)
  const allTokensHome = playerTokens.every((token) => token.position === -1);
  return allTokensHome;
};

/**
 * Get player completion percentage
 */
const getCompletionPercentage = (playerTokens) => {
  if (!playerTokens || playerTokens.length === 0) {
    return 0;
  }

  const tokensHome = playerTokens.filter((token) => token.position === -1).length;
  return Math.round((tokensHome / playerTokens.length) * 100);
};

/**
 * Detect winner from game state
 */
const detectWinner = (gameState) => {
  if (!gameState || !gameState.players) {
    return null;
  }

  for (const playerKey of Object.keys(gameState.players)) {
    const player = gameState.players[playerKey];
    if (hasPlayerWon(player.tokens)) {
      return {
        playerId: player.playerId,
        playerKey,
        completionPercentage: 100,
      };
    }
  }

  return null;
};

/**
 * Get player rankings by completion
 */
const getPlayerRankings = (gameState) => {
  if (!gameState || !gameState.players) {
    return [];
  }

  const rankings = Object.keys(gameState.players).map((playerKey) => {
    const player = gameState.players[playerKey];
    return {
      playerId: player.playerId,
      playerKey,
      completionPercentage: getCompletionPercentage(player.tokens),
      tokensHome: player.tokens.filter((t) => t.position === -1).length,
    };
  });

  // Sort by completion percentage (descending)
  return rankings.sort((a, b) => b.completionPercentage - a.completionPercentage);
};

module.exports = {
  hasPlayerWon,
  getCompletionPercentage,
  detectWinner,
  getPlayerRankings,
};
