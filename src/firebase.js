import { firebaseConfig } from './firebase-config.js?v=20260703212533-bc194ddb';

const FIREBASE_JS_VERSION = '10.14.1';
const cdn = (name) => `https://www.gstatic.com/firebasejs/${FIREBASE_JS_VERSION}/${name}.js`;

let appPromise = null;
let authPromise = null;
let dbPromise = null;

function configured() {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

async function getApp() {
  if (!configured()) return null;
  if (!appPromise) {
    appPromise = import(cdn('firebase-app')).then(({ initializeApp }) => initializeApp(firebaseConfig));
  }
  return appPromise;
}

export async function getFirebaseAuth() {
  if (!configured()) return null;
  if (!authPromise) {
    authPromise = Promise.all([getApp(), import(cdn('firebase-auth'))])
      .then(async ([app, mod]) => {
        const auth = mod.getAuth(app);
        // Firebase restores a persisted anonymous session from IndexedDB
        // asynchronously; without waiting for it, a write that races ahead
        // of restoration sees `request.auth == null` and gets silently
        // rejected by Firestore rules even though we have a cached uid.
        await auth.authStateReady();
        return { auth, mod };
      });
  }
  return authPromise;
}

export async function getFirebaseDb() {
  if (!configured()) return null;
  if (!dbPromise) {
    dbPromise = Promise.all([getApp(), getFirebaseAuth(), import(cdn('firebase-firestore'))])
      .then(([app, , mod]) => ({ db: mod.getFirestore(app), mod }));
  }
  return dbPromise;
}
