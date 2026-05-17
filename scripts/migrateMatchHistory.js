require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Migration Script to convert old match_history documents 
 * using the 'player1' / 'player2' shape to the new 'participants' array shape.
 */
async function migrateMatchHistory() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('ERROR: MONGO_URI is missing in .env');
      process.exit(1);
    }

    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const db = mongoose.connection.db;
    const collection = db.collection('match_history');

    const oldDocs = await collection.find({ player1: { $exists: true } }).toArray();
    console.log(`Found ${oldDocs.length} documents with the old 'player1' shape.`);

    if (oldDocs.length === 0) {
      console.log('No migration needed. Exiting.');
      process.exit(0);
    }

    let successCount = 0;
    for (const doc of oldDocs) {
      const participants = [];

      // Helper function to extract and map old player data to new participant schema
      const addPlayer = (playerInfo, defaultPlacement) => {
        if (!playerInfo) return;

        // If playerInfo is just an ObjectId string or mongoose ObjectId
        if (mongoose.Types.ObjectId.isValid(playerInfo) && typeof playerInfo !== 'object' || playerInfo instanceof mongoose.Types.ObjectId) {
          const isWinner = doc.winnerId && doc.winnerId.toString() === playerInfo.toString();
          participants.push({
            userId: playerInfo,
            isBot: false,
            playerColor: null,
            placement: isWinner ? 1 : defaultPlacement,
            coinsWon: isWinner ? (doc.betAmount || 0) : 0,
            coinsLost: !isWinner ? (doc.betAmount || 0) : 0,
          });
        } 
        // If playerInfo is an object
        else if (typeof playerInfo === 'object') {
          const userId = playerInfo.id || playerInfo.userId || playerInfo._id;
          if (!userId) return; // Cannot map without user ID

          const isWinner = doc.winnerId && doc.winnerId.toString() === userId.toString();
          
          participants.push({
            userId: new mongoose.Types.ObjectId(userId),
            isBot: playerInfo.isBot || false,
            playerColor: playerInfo.color || playerInfo.playerColor || null,
            placement: playerInfo.placement || (isWinner ? 1 : defaultPlacement),
            coinsWon: playerInfo.coinsWon || (isWinner ? (doc.betAmount || 0) : 0),
            coinsLost: playerInfo.coinsLost || (!isWinner ? (doc.betAmount || 0) : 0),
          });
        }
      };

      // Add players, passing default placements (2 for loser if not winner)
      addPlayer(doc.player1, 2);
      addPlayer(doc.player2, 2);
      if (doc.player3) addPlayer(doc.player3, 3);
      if (doc.player4) addPlayer(doc.player4, 4);

      if (participants.length > 0) {
        await collection.updateOne(
          { _id: doc._id },
          { 
            $set: { participants },
            $unset: { player1: "", player2: "", player3: "", player4: "" }
          }
        );
        successCount++;
      } else {
        console.warn(`Could not extract participants for document ${doc._id}. Skipping.`);
      }
    }

    console.log(`Successfully migrated ${successCount} out of ${oldDocs.length} documents.`);
    process.exit(0);

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateMatchHistory();
