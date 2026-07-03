import { TOTAL_LEVELS } from './levels.js?v=20260703202202-9fb6649c';
import { Game } from './game.js?v=20260703202202-9fb6649c';
import { renderMap } from './levelmap.js?v=20260703202202-9fb6649c';
import { loadProgress, saveProgress, mergeProgress, isLocked } from './progress.js?v=20260703202202-9fb6649c';
import { loadIdentity } from './identity.js?v=20260703202202-9fb6649c';
import { fetchCloudProgress } from './progress-sync.js?v=20260703202202-9fb6649c';
import { showLeaderboardOverlay } from './leaderboard-ui.js?v=20260703202202-9fb6649c';
import { showHowToPlayOverlay } from './howto-ui.js?v=20260703202202-9fb6649c';
import { APP_VERSION } from './version.js?v=20260703202202-9fb6649c';
import { loadSoundOn, saveSoundOn } from './sound-pref.js?v=20260703202202-9fb6649c';

const mapScreen = document.getElementById('mapScreen');
const app = document.getElementById('app');
const mapGrid = document.getElementById('mapGrid');

document.getElementById('howToPlayBtn').onclick = () => showHowToPlayOverlay();
document.getElementById('mapVersion').textContent = `v${APP_VERSION}`;

const soundBtnMap = document.getElementById('soundBtnMap');
function updateSoundBtnMap() {
  const on = game ? game.soundOn : loadSoundOn();
  soundBtnMap.textContent = on ? '🔊' : '🔇';
  soundBtnMap.setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
}
soundBtnMap.onclick = () => {
  if (game) {
    game.toggleSound();
  } else {
    saveSoundOn(!loadSoundOn());
  }
  updateSoundBtnMap();
};

// Service worker: enables offline play and instant repeat loads. The cache it
// maintains is keyed to APP_VERSION, so every deploy gets a clean slate with
// no changes needed to the .githooks/pre-commit cache-busting stamp.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { type: 'module', scope: './' });
  });
  let reloadedForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForUpdate) return;
    reloadedForUpdate = true;
    location.reload();
  });
}

let game = null;
updateSoundBtnMap();

function showMap() {
  mapScreen.hidden = false;
  app.hidden = true;
  renderMap(mapGrid, playLevel, showLeaderboardOverlay);
}

function playLevel(n) {
  mapScreen.hidden = true;
  app.hidden = false;
  if (game) {
    game.loadLevel(n);
  } else {
    game = new Game(n, {
      onBack: showMap,
      onNext: (next) => {
        const target = Math.min(TOTAL_LEVELS, next);
        if (isLocked(target, loadProgress())) {
          showMap();
        } else {
          game.loadLevel(target);
        }
      },
    });
    window.__bubblePopGame = game; // debug hook, harmless in production
  }
  requestAnimationFrame(() => game.measure());
}

showMap();

// Best-effort restore: if this browser already holds a cached anonymous
// identity (e.g. a partial storage clear or PWA reinstall spared it), pull
// any cloud-backed progress down and merge it in, then re-render the map.
if (loadIdentity()) {
  fetchCloudProgress().then((cloud) => {
    if (!cloud) return;
    const merged = mergeProgress(loadProgress(), cloud);
    saveProgress(merged);
    if (mapScreen.hidden === false) showMap();
  });
}
