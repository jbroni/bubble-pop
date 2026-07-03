import { TOTAL_LEVELS } from './levels.js';
import { Game } from './game.js';
import { renderMap } from './levelmap.js';
import { loadProgress, saveProgress, mergeProgress, isLocked } from './progress.js';
import { loadIdentity } from './identity.js';
import { fetchCloudProgress } from './progress-sync.js';

const mapScreen = document.getElementById('mapScreen');
const app = document.getElementById('app');
const mapGrid = document.getElementById('mapGrid');

let game = null;

function showMap() {
  mapScreen.hidden = false;
  app.hidden = true;
  renderMap(mapGrid, playLevel);
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
