import { firebaseConfig } from './firebase-config.js?v=20260703175951-375f9a61';

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
      .then(([app, mod]) => ({ auth: mod.getAuth(app), mod }));
  }
  return authPromise;
}

export async function getFirebaseDb() {
  if (!configured()) return null;
  if (!dbPromise) {
    dbPromise = Promise.all([getApp(), import(cdn('firebase-firestore'))])
      .then(([app, mod]) => ({ db: mod.getFirestore(app), mod }));
  }
  return dbPromise;
}
