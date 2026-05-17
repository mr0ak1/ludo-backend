require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Script to completely reset/drop the match_history collection.
 * WARNING: This will delete ALL match history data permanently.
 */
async function resetMatchHistory() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('ERROR: MONGO_URI is missing in .env');
      process.exit(1);
    }

    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const db = mongoose.connection.db;
    
    console.log('Dropping match_history collection...');
    
    // Check if collection exists first to avoid error
    const collections = await db.listCollections({ name: 'match_history' }).toArray();
    
    if (collections.length > 0) {
      await db.collection('match_history').drop();
      console.log('SUCCESS: match_history collection has been reset.');
    } else {
      console.log('Collection match_history does not exist. Nothing to reset.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  }
}

resetMatchHistory();
