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
