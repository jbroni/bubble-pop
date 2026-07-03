import { TOTAL_LEVELS } from './levels.js';
import { loadProgress } from './progress.js';

export function renderMap(container, onSelect) {
  const progress = loadProgress();
  container.innerHTML = '';
  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const locked = n > progress.unlocked;
    const info = progress.levels[n];

    const btn = document.createElement('button');
    btn.className = 'level-btn' + (locked ? ' locked' : '') + (info ? ' cleared' : '');
    btn.type = 'button';
    btn.disabled = locked;

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

    if (!locked) btn.addEventListener('click', () => onSelect(n));
    container.appendChild(btn);
  }
}
