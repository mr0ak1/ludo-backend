const { sequelize } = require('./src/config/db');
const ProbabilityConfig = require('./src/models/probabilityConfig.model');
const BotConfig = require('./src/models/botConfig.model');

async function run() {
  try {
    const probConfig = await ProbabilityConfig.findOne();
    const botConfig = await BotConfig.findOne();

    console.log('\n=============================================');
    console.log('         DATABASE BOT RULES & DIFFICULTY     ');
    console.log('=============================================');
    
    if (botConfig) {
      console.log('1. BOT DIFFICULTY SETTINGS:');
      console.log('   - Global Bot Difficulty:       ', botConfig.globalDifficulty);
      console.log('   - Auto Hard Mode Threshold Fee: ', botConfig.hardModeThreshold);
    } else {
      console.log('1. BotConfig not found in database.');
    }

    console.log('\n2. PROBABILITY MANAGER:');
    if (probConfig) {
      console.log('   - Win Probability (%):         ', probConfig.winProbability);
      console.log('   - Enabled (Probability Mode):  ', probConfig.enabled);
      console.log('   - Force Override:              ', probConfig.forceOverrideBotManagement);
    } else {
      console.log('   - ProbabilityConfig not found.');
    }
    console.log('=============================================\n');

  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await sequelize.close();
  }
}
run();
