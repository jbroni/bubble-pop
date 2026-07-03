# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo state

The full 50-level game is implemented as a static, dependency-free web app:
- `index.html` — both screens' markup: `#mapScreen` (level select) and `#app` (gameplay: HUD, board, win/lose overlays). Only one is visible at a time (`hidden` attribute), toggled by `src/main.js`.
- `src/main.js` — entry point; owns screen switching and the single `Game` instance (`showMap()` / `playLevel(n)`).
- `src/levels.js` — the palette (`PAL`, 6 colors) and `LEVELS`, a generated array of 50 data-driven level configs (`{n, cols, rows, numColors, moves, target, hasBombs}`). Level 1 is hand-specified (close to the README's fully-juiced prototype, but with `numColors: 3` to match the level 2–4 ramp); levels 2–30 ramp difficulty procedurally per the README roadmap (3→6 colors, tightening move budgets, `hasBombs: true` from level 10, every 7th level is a score-target instead of color-clear); levels 31–50 extend the move-budget and target-count ramps further past their level-30 values.
- `src/levelmap.js` — renders the level-select grid from `LEVELS` + saved progress (locked/unlocked, stars).
- `src/progress.js` — `localStorage` persistence (`bubblepop.progress`: `{unlocked, levels: {[n]: {stars, score}}}`), wrapped in try/catch. Also exposes `isLocked(n, progress)`, the single source of truth for whether a level can be entered: besides the sequential unlock (clear level *n* to open *n+1*), every block of `STAR_GATE_SIZE` (10) levels adds a decade star-gate — entering levels 11+ requires averaging `STAR_GATE_AVG` (2.5) stars or more across the preceding block of 10 (unplayed levels count as 0★). `levelmap.js`, `main.js` (the win overlay's "Next level" flow), and `game.js` (`showWin()`'s button label) all defer to this function.
- `src/game.js` — the `Game` class: per-level state, flood-fill/collapse logic, bomb special-blob logic, rendering, audio. One instance is reused across levels via `Game.loadLevel(n)`.
- `src/style.css` — all visual styling and CSS `@keyframes` animations for both screens.
- `README.md` — the original handoff spec (game rules, visuals, animation timings, roadmap). Still the source of truth for tuning values on Level 1 and for the overall design language.
- `Bubble Pop.dc.html` — the original **design reference prototype** that `src/game.js` was ported from. Built with a proprietary "DC" templating format (`<x-dc>`, `sc-for`, `sc-if`, `{{ }}`) that only renders in its authoring tool — don't run it directly. Keep it as the fidelity reference for Level 1's exact look/feel.
- `src/firebase-config.js` / `src/firebase.js` — Firebase web config (safe to commit; not a secret) and lazy SDK bootstrap, imported from Google's CDN as ES modules (`https://www.gstatic.com/firebasejs/...`) so no bundler is needed. `getFirebaseAuth()`/`getFirebaseDb()` return `null` until `firebase-config.js` is filled in, so the app degrades gracefully with leaderboard features disabled if Firebase isn't set up.
- `src/identity.js` — nickname/anonymous-uid management. Caches `{uid, name}` in `localStorage` (`bubblepop.identity`); `ensureSignedIn()` lazily calls Firebase Anonymous Auth (only once a nickname is submitted, never on cold start); `setNickname()` writes the `users/{uid}` Firestore profile doc.
- `src/leaderboard.js` — `submitScore(levelNum, score)` (transactional compare-and-swap against `leaderboard/{levelNum}/scores/{uid}`, never throws/blocks) and `fetchTop3(levelNum)` (returns `[]` on any failure) for the global top-3-per-level leaderboard.

No `package.json`, build step, or test suite exists — plain HTML/CSS/JS served as static files. Because it uses ES modules, it must be served over HTTP (not opened via `file://`):

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Deploy by pushing these static files to GitHub Pages / Netlify / Vercel as-is. Target is iOS Safari specifically (mobile-first, tap-only, one player, no backend, no app store).

`window.__bubblePopGame` is set to the live `Game` instance in `main.js` — a debug hook for poking at state from the console or from browser-automation tests (e.g. forcing `state.cleared`/`state.score` and calling `checkEnd()` to reach a win without playing it out).

## Game design (from README.md — treat as the spec for tuning values and visuals)

**Core loop**: grid of colored "blobs" (7×9 for every level currently). Tap a group of ≥2 orthogonally-adjacent same-color blobs to pop them (costs 1 move); tapping a lone blob just wiggles it (no move cost). Survivors fall via gravity, empty slots refill from the top with random colors. Each level has a move limit and an objective — either clear N of a target color, or reach a target score (`level.target.type` is `'color'` or `'score'`; the HUD's goal chip renders differently for each — see `Game.buildGoalChip()`).

**Scoring**: `n² × 5` for a popped group of size n; bomb blasts score `n × 50` instead. Stars on win: moves remaining ≥28% of the level's move limit → 3★, ≥10% → 2★, else 1★.

**Special blobs (bombs)**: from level 10 on (`level.hasBombs`), popping a group of ≥8 converts the tapped blob into a bomb instead of removing it (`Game.pop()`'s `spawnBombAt`). Tapping a bomb (`Game.explodeBomb()`) pops every non-popping blob in its 3×3 neighborhood regardless of color. Bombs are excluded from normal flood-fill matching (`flood()` skips `b.special`) but count as "a move is available" in `anyMoves()`.

**Colorblind accessibility is a hard requirement, not polish**: every blob color has a distinct accessory (curls/antenna/freckles/sprout/glasses/cap) and mouth shape, not just a hue — see `Game.accessoryNodes()`/`mouthNode()` and the color table in README.md before touching blob rendering. This also applies to the HUD goal chip's mini-blob, which is built dynamically per level's target color.

**State shape** (`Game.state`, rebuilt per level in `startLevel()`):
- `blobs[]`: fixed-size array of cell slots `{id, col, row, color, special, popping, anim, finalRow, noTrans, blink}`. Popped slots are **reused in place** for their replacement blob — DOM elements are created once per array index in `rebuildBlobEls()` and never recreated within a level, only restyled, so CSS transitions animate correctly across a pop→collapse→refill cycle.
- Transient: `particles[]`, `combo`, `toast`.
- Run state: `moves`, `score`, `cleared`, `stars`, `phase: 'play'|'win'|'lose'`, `busy` (input lock during cascade resolution, ~0.7–1s, on `Game.busy` not `state`).

**Flood fill / collapse algorithm** (`flood()`, `collapse()`): build a `row*COLS+col` index grid from current non-popping, non-special blob positions, DFS over 4-neighbors matching color. On pop, columns are collapsed independently — surviving blobs slide down to fill gaps, dead slots get reassigned a new random color and are animated in from above the board (two-phase: teleport above with transitions disabled via `noTrans`, then next frame enable transition and set final row — this is what makes new blobs "rain in").

**Audio is fully synthesized** (Web Audio, no sound files) — `AudioContext` created lazily on first tap due to iOS autoplay restrictions, `resume()`'d if suspended. See README.md "Sound" section for exact oscillator types/frequencies/envelopes (pop tone rises in pitch across a group, wiggle is a thud, win/lose are triangle-wave jingles).

**Animation timings, colors, and design tokens for Level 1 are final** per the README ("Fidelity: High-fidelity... Recreate pixel-perfectly") — pull them from README.md's "Design tokens", "Interactions, animation & juice", and colorblind table rather than improvising. Levels 2–30's difficulty numbers are procedurally generated in `levels.js` (the README doesn't hand-specify them beyond the roadmap's qualitative direction) — adjust the formulas there if playtesting shows a level is miscalibrated.

## Global leaderboard (Firebase)

Each level has a global top-3 leaderboard, backed by Firebase (Anonymous Auth + Firestore), used purely client-side — the app is still 100% static and deploys to GitHub Pages as-is. Solo progress (`src/progress.js`, `localStorage`) is untouched and remains device-local; only per-level top scores are shared. See `src/firebase.js`, `src/identity.js`, `src/leaderboard.js` above.

**First-time nickname prompt**: on a player's first level win, `Game.finishWin()` (`src/game.js`) shows `#nicknameOverlay` instead of `#winOverlay` if no identity is cached yet (players can also tap "Skip"). Saving a nickname or dismissing the win overlay's trophy (🏆) button opens `#leaderboardOverlay`, which calls `fetchTop3()`.

**Manual setup required** (cannot be done from code — do this in the Firebase console before the leaderboard will actually work):
1. Create a Firebase project; enable **Anonymous** sign-in under Authentication.
2. Create a Firestore database and publish security rules restricting each `leaderboard/{levelNum}/scores/{uid}` doc to being written only by its own uid, with score capped and monotonically non-decreasing (see the plan history / Firestore console for the exact rules text).
3. Register a Web app in Project settings and paste the generated config object into `src/firebase-config.js`.

Until that setup is done, `firebase-config.js`'s fields are empty, `getFirebaseAuth()`/`getFirebaseDb()` resolve to `null`, and the leaderboard/nickname UI still renders but shows "no scores yet" / silently no-ops submission — the rest of the game is unaffected.

Cross-device sync of solo progress (stars, unlocked levels) is explicitly **not** implemented — only leaderboard scores are shared; treat it as a separate future effort if requested.

## Not implemented

The README's roadmap also mentions, as lower-priority/"later" items not yet built: a daily streak mechanic and richer (non-synthesized) sound. These weren't specified with enough concrete detail in README.md to implement without inventing the design. Full cross-device account/progress sync (beyond the leaderboard above) is also not implemented.
