require('dotenv').config();
const { sequelize } = require('./src/config/db');

async function fixEnum() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');
    await sequelize.query("ALTER TABLE transactions MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'failed', 'reversed') DEFAULT 'completed'");
    console.log('Enum updated successfully!');
  } catch (err) {
    console.error('Failed to update enum:', err);
  } finally {
    process.exit(0);
  }
}

fixEnum();
