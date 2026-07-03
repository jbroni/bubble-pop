import { getFirebaseDb } from './firebase.js?v=20260703180634-3b255d79';
import { loadIdentity } from './identity.js?v=20260703180634-3b255d79';

// Fire-and-forget: backs up the whole local progress object to Firestore
// under the current identity's uid. No-ops if no nickname has been set yet
// (mirrors leaderboard.js's submitScore). Never throws.
export async function syncProgressToCloud(progress) {
  try {
    const identity = loadIdentity();
    if (!identity) return;
    const res = await getFirebaseDb();
    if (!res) return;
    const { db, mod } = res;
    const ref = mod.doc(db, 'progress', identity.uid);
    await mod.setDoc(ref, {
      unlocked: progress.unlocked,
      levels: progress.levels,
      updatedAt: mod.serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    // offline, not configured, or rejected by rules — ignore
  }
}

// Returns the cloud-backed { unlocked, levels } for the current identity, or
// null on any failure/absence (no identity, offline, not configured, no doc).
export async function fetchCloudProgress() {
  try {
    const identity = loadIdentity();
    if (!identity) return null;
    const res = await getFirebaseDb();
    if (!res) return null;
    const { db, mod } = res;
    const snap = await mod.getDoc(mod.doc(db, 'progress', identity.uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { unlocked: data.unlocked || 1, levels: data.levels || {} };
  } catch (e) {
    return null;
  }
}
