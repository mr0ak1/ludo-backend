const admin = require('firebase-admin');
const config = require('./env');

let firebaseApp;

const initializeFirebase = () => {
  try {
    if (!firebaseApp) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKey: config.firebase.privateKey.replace(/\\n/g, '\n'),
          clientEmail: config.firebase.clientEmail,
        }),
      });
      console.log('Firebase initialized successfully');
    }
    return firebaseApp;
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    throw error;
  }
};

const verifyFirebaseToken = async (idToken) => {
  try {
    const app = initializeFirebase();
    const auth = admin.auth(app);
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Firebase token verification error:', error.message);
    throw new Error('Invalid Firebase token');
  }
};

module.exports = {
  initializeFirebase,
  verifyFirebaseToken,
  admin,
};
