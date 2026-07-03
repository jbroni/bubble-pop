const KEY = 'bubblepop.progress';

function defaultProgress() {
  return { unlocked: 1, levels: {} };
}

export function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return defaultProgress();
    return { unlocked: raw.unlocked || 1, levels: raw.levels || {} };
  } catch (e) {
    return defaultProgress();
  }
}

export function saveProgress(progress) {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
}

// Combines local and cloud-backed progress, taking the max of every field so
// neither source can regress the other. Used only when pulling a best-effort
// cloud backup down after app load.
export function mergeProgress(local, cloud) {
  const levels = { ...local.levels };
  for (const n of Object.keys(cloud.levels || {})) {
    const a = levels[n];
    const b = cloud.levels[n];
    levels[n] = a
      ? { stars: Math.max(a.stars, b.stars), score: Math.max(a.score, b.score) }
      : b;
  }
  return { unlocked: Math.max(local.unlocked, cloud.unlocked || 1), levels };
}

export function recordResult(levelNum, { stars, score }, totalLevels) {
  const progress = loadProgress();
  const prev = progress.levels[levelNum];
  progress.levels[levelNum] = {
    stars: Math.max(stars, prev ? prev.stars : 0),
    score: Math.max(score, prev ? prev.score : 0),
  };
  if (stars > 0) {
    progress.unlocked = Math.max(progress.unlocked, Math.min(totalLevels, levelNum + 1));
  }
  saveProgress(progress);
  return progress;
}

// Every STAR_GATE_SIZE levels adds an extra lock on top of the sequential
// unlock: entering the next block of levels requires averaging at least
// STAR_GATE_AVG stars across the whole preceding block (unplayed levels
// count as 0 stars).
export const STAR_GATE_SIZE = 10;
export const STAR_GATE_AVG = 2.5;

// decadeIndex is 0-based: decade 0 covers levels 1-10, decade 1 covers 11-20, etc.
export function decadeStars(progress, decadeIndex) {
  const start = decadeIndex * STAR_GATE_SIZE + 1;
  const end = start + STAR_GATE_SIZE - 1;
  let total = 0;
  for (let lvl = start; lvl <= end; lvl++) {
    total += (progress.levels[lvl] && progress.levels[lvl].stars) || 0;
  }
  return total;
}

export function isDecadeGateOpen(progress, decadeIndex) {
  return decadeStars(progress, decadeIndex) >= STAR_GATE_SIZE * STAR_GATE_AVG;
}

export function isLocked(n, progress) {
  if (n > progress.unlocked) return true;
  if (n <= STAR_GATE_SIZE) return false;
  const prevDecade = Math.floor((n - 1) / STAR_GATE_SIZE) - 1;
  return !isDecadeGateOpen(progress, prevDecade);
}
