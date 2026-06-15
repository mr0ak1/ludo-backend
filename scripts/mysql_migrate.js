/**
 * MySQL Migration Script
 * Run: node scripts/mysql_migrate.js
 * 
 * This script:
 * 1. Connects to MySQL
 * 2. Syncs all Sequelize models (creates tables)
 * 3. Seeds default BotConfig and ProbabilityConfig if not present
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// Load all models so Sequelize registers them
require('../src/models/index');

const { sequelize } = require('../src/config/db');
const BotConfig = require('../src/models/botConfig.model');
const ProbabilityConfig = require('../src/models/probabilityConfig.model');

async function migrate() {
  console.log('\n🔧  Ludo Backend — MySQL Migration\n');
  console.log(`  Host : ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  DB   : ${process.env.DB_NAME || 'ludo'}`);
  console.log(`  User : ${process.env.DB_USER || 'root'}\n`);

  try {
    // 0. Ensure database exists
    console.log(`⏳  Ensuring database '${process.env.DB_NAME || 'ludo'}' exists...`);
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'ludo'}\`;`);
    await connection.end();
    console.log(`✅  Database '${process.env.DB_NAME || 'ludo'}' ensured`);

    // 1. Test connection
    await sequelize.authenticate();
    console.log('✅  MySQL connected');

    // 2. Sync all models — creates tables if missing, alters existing
    console.log('⏳  Syncing tables (this may take a few seconds)...');
    await sequelize.sync({ alter: true });
    console.log('✅  All tables synced\n');

    // 3. Seed BotConfig (singleton)
    const [botConfig, createdBot] = await BotConfig.findOrCreate({
      where: { id: 1 },
      defaults: {
        globalDifficulty: 'medium',
        hardModeThreshold: 450,
        minimumBet: 10,
        referrerBonus: 50,
        referredBonus: 0,
        signUpBonus: 10,
        paymentGatewayKey: '',
        upiId: '',
        paytmMerchantId: '',
        whatsappNumber: '',
      },
    });
    console.log(createdBot ? '✅  BotConfig seeded' : 'ℹ️   BotConfig already exists');

    // 4. Seed ProbabilityConfig (singleton)
    const [probConfig, createdProb] = await ProbabilityConfig.findOrCreate({
      where: { id: 1 },
      defaults: {
        winProbability: 30,
        enabled: false,
        forceOverrideBotManagement: true,
      },
    });
    console.log(createdProb ? '✅  ProbabilityConfig seeded' : 'ℹ️   ProbabilityConfig already exists');

    console.log('\n🎉  Migration complete! You can now start the server.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌  Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();
