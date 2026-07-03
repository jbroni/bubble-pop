import { TOTAL_LEVELS } from './levels.js';
import { Game } from './game.js';
import { renderMap } from './levelmap.js';

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
      onNext: (next) => game.loadLevel(Math.min(TOTAL_LEVELS, next)),
    });
    window.__bubblePopGame = game; // debug hook, harmless in production
  }
  requestAnimationFrame(() => game.measure());
}

showMap();
