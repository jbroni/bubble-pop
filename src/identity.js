import { getFirebaseAuth, getFirebaseDb } from './firebase.js';

const KEY = 'bubblepop.identity';

export function loadIdentity() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object' || !raw.uid || !raw.name) return null;
    return { uid: raw.uid, name: raw.name };
  } catch (e) {
    return null;
  }
}

function saveIdentity(identity) {
  try { localStorage.setItem(KEY, JSON.stringify(identity)); } catch (e) { /* ignore */ }
}

let signInPromise = null;

// Signs in anonymously (once) and resolves with the Firebase uid. Returns null
// if Firebase isn't configured or the network/auth call fails — callers must
// treat a null uid as "leaderboard unavailable", not throw.
export async function ensureSignedIn() {
  const cached = loadIdentity();
  if (cached) return cached.uid;

  if (!signInPromise) {
    signInPromise = (async () => {
      try {
        const res = await getFirebaseAuth();
        if (!res) return null;
        const { auth, mod } = res;
        const cred = await mod.signInAnonymously(auth);
        return cred.user.uid;
      } catch (e) {
        return null;
      }
    })();
  }
  return signInPromise;
}

// Signs in if needed, writes the users/{uid} profile doc, and caches the
// nickname locally. Returns true on success, false if unavailable/offline.
export async function setNickname(name) {
  const trimmed = String(name || '').trim().slice(0, 20);
  if (!trimmed) return false;
  try {
    const uid = await ensureSignedIn();
    if (!uid) return false;
    const res = await getFirebaseDb();
    if (!res) return false;
    const { db, mod } = res;
    await mod.setDoc(mod.doc(db, 'users', uid), { name: trimmed, updatedAt: mod.serverTimestamp() }, { merge: true });
    saveIdentity({ uid, name: trimmed });
    return true;
  } catch (e) {
    return false;
  }
}
