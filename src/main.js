import { TOTAL_LEVELS } from './levels.js?v=20260703175951-375f9a61';
import { Game } from './game.js?v=20260703175951-375f9a61';
import { renderMap } from './levelmap.js?v=20260703175951-375f9a61';
import { loadProgress, saveProgress, mergeProgress, isLocked } from './progress.js?v=20260703175951-375f9a61';
import { loadIdentity } from './identity.js?v=20260703175951-375f9a61';
import { fetchCloudProgress } from './progress-sync.js?v=20260703175951-375f9a61';
import { showLeaderboardOverlay } from './leaderboard-ui.js?v=20260703175951-375f9a61';
import { showHowToPlayOverlay } from './howto-ui.js?v=20260703175951-375f9a61';
import { APP_VERSION } from './version.js?v=20260703175951-375f9a61';

const mapScreen = document.getElementById('mapScreen');
const app = document.getElementById('app');
const mapGrid = document.getElementById('mapGrid');

document.getElementById('howToPlayBtn').onclick = () => showHowToPlayOverlay();
document.getElementById('mapVersion').textContent = `v${APP_VERSION}`;

let game = null;

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
