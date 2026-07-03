import { fetchTop3 } from './leaderboard.js?v=20260703202202-9fb6649c';
import { loadProgress } from './progress.js?v=20260703202202-9fb6649c';

const els = {
  overlay: document.getElementById('leaderboardOverlay'),
  levelLabel: document.getElementById('leaderboardLevelLabel'),
  personal: document.getElementById('leaderboardPersonal'),
  list: document.getElementById('leaderboardList'),
  closeBtn: document.getElementById('leaderboardCloseBtn'),
};
els.closeBtn.onclick = () => hideLeaderboardOverlay();

let activeLevelNum = null;

export function showLeaderboardOverlay(levelNum) {
  activeLevelNum = levelNum;
  els.levelLabel.textContent = `Level ${levelNum}`;

  const info = loadProgress().levels[levelNum];
  if (info) {
    els.personal.textContent = `Your best: ${info.score.toLocaleString()} (${info.stars}★)`;
    els.personal.hidden = false;
  } else {
    els.personal.hidden = true;
  }

  els.list.innerHTML = '<li class="leaderboard-empty">Loading…</li>';
  els.overlay.hidden = false;
  fetchTop3(levelNum).then(top => {
    if (els.overlay.hidden || activeLevelNum !== levelNum) return;
    renderLeaderboardList(top);
  });
}

function renderLeaderboardList(top) {
  els.list.innerHTML = '';
  if (!top.length) {
    const li = document.createElement('li');
    li.className = 'leaderboard-empty';
    li.textContent = 'No scores yet — be the first!';
    els.list.appendChild(li);
    return;
  }
  top.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-row';
    const rank = document.createElement('span');
    rank.className = 'leaderboard-rank';
    rank.textContent = String(i + 1);
    const name = document.createElement('span');
    name.className = 'leaderboard-name';
    name.textContent = entry.name;
    const score = document.createElement('span');
    score.className = 'leaderboard-score';
    score.textContent = entry.score.toLocaleString();
    li.appendChild(rank);
    li.appendChild(name);
    li.appendChild(score);
    els.list.appendChild(li);
  });
}

export function hideLeaderboardOverlay() {
  els.overlay.hidden = true;
}
