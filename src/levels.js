// Shared 6-color palette (README "Colorblind accessibility" table).
export const PAL = [
  { name: 'Pink',   hi: '#ffd6ea', c1: '#ff5fa8', c2: '#cf1470' },
  { name: 'Blue',   hi: '#c8ecff', c1: '#3fb9ff', c2: '#0e7fd4' },
  { name: 'Yellow', hi: '#fff3c4', c1: '#ffd23f', c2: '#ef9c06' },
  { name: 'Green',  hi: '#d2ffd9', c1: '#4ade63', c2: '#149e38' },
  { name: 'Purple', hi: '#e9d5ff', c1: '#a86bff', c2: '#7226e0' },
  { name: 'Orange', hi: '#ffe3c4', c1: '#ff9440', c2: '#e05e08' },
];

export const TOTAL_LEVELS = 30;
const COLS = 7;
const ROWS = 9;

// Level config is data: {cols, rows, colors, moves, target, hasBombs}.
// Level 1 matches the README's fully-juiced prototype spec exactly.
// Levels 2-30 are generated to satisfy the roadmap: ramp 3->6 colors,
// tighter move budgets, varied objectives (color-clear + score targets),
// and special "bomb" blobs unlocked around level 10.
function buildLevel(n) {
  if (n === 1) {
    return {
      n, cols: COLS, rows: ROWS, numColors: 4, moves: 22,
      target: { type: 'color', color: 0, count: 25 },
      hasBombs: false,
    };
  }

  const numColors = n <= 4 ? 3 : n <= 9 ? 4 : n <= 17 ? 5 : 6;
  const moves = Math.max(14, 24 - Math.floor((n - 2) / 3));
  const hasBombs = n >= 10;

  // Every 7th level is a score-target level (README: "later possibly score targets").
  if (n % 7 === 0) {
    const scoreTarget = 900 + n * 90;
    return { n, cols: COLS, rows: ROWS, numColors, moves, target: { type: 'score', count: scoreTarget }, hasBombs };
  }

  const color = (n - 1) % numColors;
  const count = Math.min(48, 18 + Math.floor(n * 1.3));
  return { n, cols: COLS, rows: ROWS, numColors, moves, target: { type: 'color', color, count }, hasBombs };
}

export const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, i) => buildLevel(i + 1));

export function getLevel(n) {
  return LEVELS[Math.max(1, Math.min(TOTAL_LEVELS, n)) - 1];
}
