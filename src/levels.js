// Shared 6-color palette (README "Colorblind accessibility" table).
export const PAL = [
  { name: 'Pink',   hi: '#ffd6ea', c1: '#ff5fa8', c2: '#cf1470' },
  { name: 'Blue',   hi: '#c8ecff', c1: '#3fb9ff', c2: '#0e7fd4' },
  { name: 'Yellow', hi: '#fff3c4', c1: '#ffd23f', c2: '#ef9c06' },
  { name: 'Green',  hi: '#d2ffd9', c1: '#4ade63', c2: '#149e38' },
  { name: 'Purple', hi: '#e9d5ff', c1: '#a86bff', c2: '#7226e0' },
  { name: 'Orange', hi: '#ffe3c4', c1: '#ff9440', c2: '#e05e08' },
];

export const TOTAL_LEVELS = 50;
const COLS = 7;
const ROWS = 9;

// Level config is data: {cols, rows, colors, moves, target, hasBombs}.
// Level 1 matches the README's fully-juiced prototype spec, except numColors
// is dropped to 3 to match the level 2-4 ramp (see level-progression plan).
// Levels 2-30 are generated to satisfy the roadmap: ramp 3->6 colors,
// tighter move budgets, varied objectives (color-clear + score targets),
// and special "bomb" blobs unlocked around level 10. Levels 31-50 extend
// the move-budget and target-count ramps further past their level-30 values.
// The ramp is intentionally gentler past level 10 than the numbers alone
// might suggest is "enough" — playtesting showed the naive ramp made players
// dependent on landing a rainbow booster on the target color to have any
// chance of winning, which undercuts the core clear-groups-by-hand loop.
function buildLevel(n) {
  if (n === 1) {
    return {
      n, cols: COLS, rows: ROWS, numColors: 3, moves: 22,
      target: { type: 'color', color: 0, count: 25 },
      hasBombs: false,
    };
  }

  const numColors = n <= 4 ? 3 : n <= 9 ? 4 : n <= 24 ? 5 : 6;
  const moves = n <= 30
    ? Math.max(17, 24 - Math.floor((n - 2) / 4))
    : Math.max(13, 17 - Math.floor((n - 31) / 4));
  const hasBombs = n >= 10;

  // Every 7th level is a score-target level (README: "later possibly score targets").
  if (n % 7 === 0) {
    const scoreTarget = 800 + n * 75;
    return { n, cols: COLS, rows: ROWS, numColors, moves, target: { type: 'score', count: scoreTarget }, hasBombs };
  }

  const color = (n - 1) % numColors;
  const count = n <= 30
    ? Math.min(42, 18 + Math.floor(n * 1.0))
    : Math.min(52, 42 + Math.floor((n - 30) * 0.5));
  return { n, cols: COLS, rows: ROWS, numColors, moves, target: { type: 'color', color, count }, hasBombs };
}

export const LEVELS = Array.from({ length: TOTAL_LEVELS }, (_, i) => buildLevel(i + 1));

export function getLevel(n) {
  return LEVELS[Math.max(1, Math.min(TOTAL_LEVELS, n)) - 1];
}
