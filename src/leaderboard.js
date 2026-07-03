import { getFirebaseDb } from './firebase.js?v=20260703175951-375f9a61';
import { loadIdentity } from './identity.js?v=20260703175951-375f9a61';

// Fire-and-forget: submits `score` for `levelNum` under the current identity's
// uid, only if it beats the existing stored score (server-enforced too, via
// Firestore rules). Never throws and never rejects unhandled — a network
// failure or missing identity must not affect the win flow that calls this.
export async function submitScore(levelNum, score) {
  try {
    const identity = loadIdentity();
    if (!identity) return;
    const res = await getFirebaseDb();
    if (!res) return;
    const { db, mod } = res;
    const ref = mod.doc(db, 'leaderboard', String(levelNum), 'scores', identity.uid);
    await mod.runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists() && snap.data().score >= score) return;
      tx.set(ref, { name: identity.name, score, updatedAt: mod.serverTimestamp() }, { merge: true });
    });
  } catch (e) {
    // offline, not configured, or rejected by rules — ignore
  }
}

// Returns the top 3 { name, score } for a level, or [] on any failure.
export async function fetchTop3(levelNum) {
  try {
    const res = await getFirebaseDb();
    if (!res) return [];
    const { db, mod } = res;
    const q = mod.query(
      mod.collection(db, 'leaderboard', String(levelNum), 'scores'),
      mod.orderBy('score', 'desc'),
      mod.limit(3)
    );
    const snap = await mod.getDocs(q);
    return snap.docs.map(d => ({ name: d.data().name, score: d.data().score }));
  } catch (e) {
    return [];
  }
}
