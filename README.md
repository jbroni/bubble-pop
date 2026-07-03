# Bubble Pop

A browser-based, mobile-first, tap-only puzzle game (Candy Crush-adjacent). Tap groups of 2+ adjacent same-colored blobs to pop them; survivors fall via gravity and new blobs rain in from the top. 30 levels, a level map, and score/star persistence — built as a static, dependency-free web app targeting iOS Safari (mobile-first, tap-only, one player, no backend, no app store).

## Status

Complete: all 30 levels, level map, bombs, bonus round, best-score tracking, and full audio/animation juice are implemented and playable end to end. See "Not yet implemented" below for the remaining roadmap items.

## Running locally

No `package.json`, build step, or test suite — plain HTML/CSS/JS served as static files. Because it uses ES modules, it must be served over HTTP (not opened via `file://`):

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Deploy by pushing the static files as-is to GitHub Pages, Netlify, or Vercel.

## Files

- `index.html` — both screens' markup: `#mapScreen` (level select) and `#app` (gameplay: HUD, board, win/lose overlays). Only one is visible at a time (`hidden` attribute), toggled by `src/main.js`.
- `src/main.js` — entry point; owns screen switching and the single `Game` instance (`showMap()` / `playLevel(n)`).
- `src/levels.js` — the palette (`PAL`, 6 colors) and `LEVELS`, a generated array of 30 data-driven level configs (`{n, cols, rows, numColors, moves, target, hasBombs}`). Level 1 is hand-specified to match the original design prototype exactly; levels 2–30 ramp difficulty procedurally (3→6 colors, tightening move budgets, `hasBombs: true` from level 10, every 7th level is a score-target instead of color-clear).
- `src/levelmap.js` — renders the level-select grid from `LEVELS` + saved progress (locked/unlocked, stars).
- `src/progress.js` — `localStorage` persistence (`bubblepop.progress`: `{unlocked, levels: {[n]: {stars, score}}}`), wrapped in try/catch.
- `src/game.js` — the `Game` class: per-level state, flood-fill/collapse logic, bomb special-blob logic, rendering, audio. One instance is reused across levels via `Game.loadLevel(n)`.
- `src/style.css` — all visual styling and CSS `@keyframes` animations for both screens.
- `Bubble Pop.dc.html` — the original **design reference prototype** that `src/game.js` was ported from. Built with a proprietary "DC" templating format (`<x-dc>`, `sc-for`, `sc-if`, `{{ }}`) that only renders in its authoring tool — don't run it directly. Kept as the fidelity reference for Level 1's exact look/feel.
- `CLAUDE.md` — guidance for Claude Code when working in this repo (architecture map, invariants, debug hooks).

## Game design

**Core loop**: grid of colored "blobs" (7×9 for every level currently). Tap a group of ≥2 orthogonally-adjacent same-color blobs to pop them (costs 1 move); tapping a lone blob just wiggles it (no move cost). Survivors fall via gravity, empty slots refill from the top with random colors. Each level has a move limit and an objective — either clear N of a target color, or reach a target score (`level.target.type` is `'color'` or `'score'`; the HUD's goal chip renders differently for each — see `Game.buildGoalChip()`).

**Scoring**: `n² × 5` for a popped group of size n; booster blasts score `n × 50` (bomb), `n × 70` (rocket), or `n × 90` (rainbow) instead. Stars on win: moves remaining ≥28% of the level's move limit → 3★, ≥10% → 2★, else 1★.

**Special blobs (boosters)**: from level 10 on (`level.hasBombs`), popping a big enough group converts the tapped blob into a booster instead of removing it (`Game.pop()`'s `spawnSpecialAt`/`spawnSpecialType`, chosen by `specialForGroupSize()`): 5–pop groups spawn a **bomb**, 6–7 spawn a **rocket**, 8+ spawn a **rainbow** — the more you pop at once, the better the booster.
- **Bomb**: tapping it (`Game.explodeBomb()`) pops every non-popping blob in its 3×3 neighborhood regardless of color.
- **Rocket**: tapping it (`Game.explodeRocket()`) clears its entire row or column. The direction is decided automatically from the shape of the group that spawned it (wider than tall → clears its row, taller than wide → clears its column) and shown via a 90°-rotated icon.
- **Rainbow**: tapping it (`Game.explodeRainbow()`) clears every blob of whichever color currently has the most blobs on the board. The target color is computed fresh at tap time (not fixed at spawn), so it always reflects the live board.

Boosters are excluded from normal flood-fill matching (`flood()` skips any `b.special`) but count as "a move is available" in `anyMoves()`. Overlapping boosters caught in another booster's blast are force-popped like a normal blob — there's no chain-reaction detonation.

**Colorblind accessibility** is a hard requirement, not polish: every blob color has a distinct accessory (curls/antenna/freckles/sprout/glasses/cap) and mouth shape, not just a hue.

| Color  | hi      | c1      | c2      | Accessory              | Mouth        |
|--------|---------|---------|---------|-------------------------|--------------|
| Pink   | #ffd6ea | #ff5fa8 | #cf1470 | 3 hair curls on top    | smile arc    |
| Blue   | #c8ecff | #3fb9ff | #0e7fd4 | antenna with ball      | "o" mouth    |
| Yellow | #fff3c4 | #ffd23f | #ef9c06 | 4 cheek freckles       | wide grin    |
| Green  | #d2ffd9 | #4ade63 | #149e38 | leaf sprout            | flat mouth   |
| Purple | #e9d5ff | #a86bff | #7226e0 | round glasses + bridge | smile arc    |
| Orange | #ffe3c4 | #ff9440 | #e05e08 | cap/beret band         | "o" mouth    |

This also applies to the HUD goal chip's mini-blob, which is built dynamically per level's target color.

**Audio** is fully synthesized (Web Audio, no sound files) — `AudioContext` created lazily on first tap due to iOS autoplay restrictions, `resume()`'d if suspended. Pop tone rises in pitch across a group, wiggle is a thud, win/lose are triangle-wave jingles.

**State shape** (`Game.state`, rebuilt per level in `startLevel()`):
- `blobs[]`: fixed-size array of cell slots `{id, col, row, color, special, dir, popping, anim, finalRow, noTrans, blink}`. `dir` (`'row'|'col'`) is only meaningful when `special === 'rocket'` — it picks which line the rocket clears. Popped slots are **reused in place** for their replacement blob — DOM elements are created once per array index in `rebuildBlobEls()` and never recreated within a level, only restyled, so CSS transitions animate correctly across a pop→collapse→refill cycle.
- Transient: `particles[]`, `combo`, `toast`.
- Run state: `moves`, `score`, `cleared`, `stars`, `phase: 'play'|'win'|'lose'`, `busy` (input lock during cascade resolution, ~0.7–1s, on `Game.busy` not `state`).

**Flood fill / collapse algorithm** (`flood()`, `collapse()`): build a `row*COLS+col` index grid from current non-popping, non-special blob positions, DFS over 4-neighbors matching color. On pop, columns are collapsed independently — surviving blobs slide down to fill gaps, dead slots get reassigned a new random color and are animated in from above the board (two-phase: teleport above with transitions disabled via `noTrans`, then next frame enable transition and set final row — this is what makes new blobs "rain in").

## Debugging

`window.__bubblePopGame` is set to the live `Game` instance in `main.js` — a hook for poking at state from the console or from browser-automation tests (e.g. forcing `state.cleared`/`state.score` and calling `checkEnd()` to reach a win without playing it out).

## Not yet implemented

Lower-priority roadmap items not built yet: a daily streak mechanic and richer (non-synthesized) sound.
