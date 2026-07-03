import { TOTAL_LEVELS } from './levels.js?v=20260703212255-e226876d';
import { loadProgress, isLocked, decadeStars, STAR_GATE_SIZE, STAR_GATE_AVG } from './progress.js?v=20260703212255-e226876d';

function formatScore(n) {
  if (n >= 1000) {
    const k = n / 1000;
    return (k >= 10 ? Math.round(k) : k.toFixed(1)) + 'k';
  }
  return String(n);
}

function showLockedToast(mapScreen, message) {
  const existing = mapScreen.querySelector('.map-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast map-toast';
  el.textContent = message;
  mapScreen.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function renderMap(container, onSelect, onViewScores) {
  const progress = loadProgress();
  container.innerHTML = '';
  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const locked = isLocked(n, progress);
    const info = progress.levels[n];

    const tile = document.createElement('div');
    tile.className = 'level-tile';

    const btn = document.createElement('button');
    btn.className = 'level-btn' + (locked ? ' locked' : '') + (info ? ' cleared' : '');
    btn.type = 'button';

    let lockedMessage = null;
    if (locked && n <= progress.unlocked && n > STAR_GATE_SIZE) {
      const prevDecadeIndex = Math.floor((n - 1) / STAR_GATE_SIZE) - 1;
      const prevDecadeStart = prevDecadeIndex * STAR_GATE_SIZE + 1;
      const prevDecadeEnd = prevDecadeStart + STAR_GATE_SIZE - 1;
      const have = decadeStars(progress, prevDecadeIndex);
      const need = STAR_GATE_SIZE * STAR_GATE_AVG;
      lockedMessage = `Need ${need}★ from levels ${prevDecadeStart}-${prevDecadeEnd} — you have ${have}★ (${need - have} more to go)`;
      btn.title = lockedMessage;
    }
    // Locked tiles must stay a non-disabled button so a tap can still show
    // showLockedToast() — a disabled button swallows the click before it
    // would otherwise bubble/fire.
    if (locked) btn.setAttribute('aria-disabled', 'true');

    const num = document.createElement('div');
    num.className = 'level-num';
    num.textContent = locked ? '🔒' : String(n);
    btn.appendChild(num);

    const starsWrap = document.createElement('div');
    starsWrap.className = 'level-stars';
    for (let k = 1; k <= 3; k++) {
      const s = document.createElement('span');
      s.className = 'level-star' + (info && k <= info.stars ? ' earned' : '');
      s.textContent = '★';
      starsWrap.appendChild(s);
    }
    btn.appendChild(starsWrap);

    if (info) {
      const scoreEl = document.createElement('div');
      scoreEl.className = 'level-score';
      scoreEl.textContent = formatScore(info.score);
      btn.appendChild(scoreEl);
    }

    if (!locked) {
      btn.addEventListener('click', () => onSelect(n));
    } else if (lockedMessage) {
      btn.addEventListener('click', () => showLockedToast(container.parentElement, lockedMessage));
    }
    tile.appendChild(btn);

    if (!locked) {
      const infoBtn = document.createElement('button');
      infoBtn.className = 'level-info-btn';
      infoBtn.type = 'button';
      infoBtn.textContent = '🏆';
      infoBtn.setAttribute('aria-label', `View leaderboard for level ${n}`);
      infoBtn.addEventListener('click', () => onViewScores(n));
      tile.appendChild(infoBtn);
    }

    container.appendChild(tile);
  }
}
