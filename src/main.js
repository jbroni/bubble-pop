import { TOTAL_LEVELS } from './levels.js';
import { Game } from './game.js';
import { renderMap } from './levelmap.js';
import { loadProgress, isLocked } from './progress.js';

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
