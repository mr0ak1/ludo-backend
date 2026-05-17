const admin = require('firebase-admin');
const config = require('./env');

let firebaseApp;

const hasFirebaseCredentials = () => {
  return Boolean(
    config.firebase.projectId &&
    config.firebase.privateKey &&
    config.firebase.clientEmail &&
    config.firebase.projectId !== 'your_firebase_project_id' &&
    config.firebase.privateKey !== 'your_firebase_private_key' &&
    config.firebase.clientEmail !== 'your_firebase_client_email'
  );
};

const initializeFirebase = () => {
  try {
    if (!hasFirebaseCredentials()) {
      console.warn('Firebase credentials not set. Push notifications are disabled.');
      return null;
    }

    const privateKey = config.firebase.privateKey.replace(/\\n/g, '\n');

    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      if (config.isDevelopment) {
        console.warn('Firebase private key is not a valid PEM. Push notifications are disabled in development.');
        return null;
      }
      throw new Error('Invalid Firebase private key format');
    }

    if (!firebaseApp) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          privateKey,
          clientEmail: config.firebase.clientEmail,
        }),
      });
      console.log('Firebase initialized successfully');
    }
    return firebaseApp;
  } catch (error) {
    if (config.isDevelopment) {
      console.warn('Firebase initialization failed (disabled in development):', error.message);
      return null;
    }
    console.error('Firebase initialization error:', error.message);
    throw error;
  }
};

const verifyFirebaseToken = async (idToken) => {
  try {
    const app = initializeFirebase();
    if (!app) {
      throw new Error('Firebase is not configured');
    }
    const auth = admin.auth(app);
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Firebase token verification error:', error.message);
    throw new Error('Invalid Firebase token');
  }
};

/**
 * Send FCM data + notification payload to multiple device tokens.
 * @returns {{ successCount: number, failureCount: number, invalidTokens: string[] }}
 */
const sendMulticastNotification = async (deviceTokens, { title, body, data = {} }) => {
  const tokens = (deviceTokens || []).filter(Boolean);
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const app = initializeFirebase();
  if (!app) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }
  const messaging = admin.messaging(app);

  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v == null ? '' : String(v)])
  );

  const invalidTokens = [];
  let successCount = 0;
  let failureCount = 0;

  const chunkSize = 500;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const response = await messaging.sendEachForMulticast({
      tokens: chunk,
      notification: { title, body },
      data: stringData,
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((r, idx) => {
      if (r.success) return;
      const code = r.error?.code || '';
      if (
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered'
      ) {
        invalidTokens.push(chunk[idx]);
      }
    });
  }

  return { successCount, failureCount, invalidTokens };
};

module.exports = {
  initializeFirebase,
  verifyFirebaseToken,
  sendMulticastNotification,
  admin,
};
