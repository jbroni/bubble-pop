# Handoff: Bubble Pop

## Overview
Bubble Pop is a browser-based, mobile-first, tap-only puzzle game (Candy Crush-adjacent). The player taps groups of 2+ adjacent same-colored blobs to pop them; remaining blobs fall, new blobs rain in from the top. Each level has a move limit and a color-clearing objective (e.g. "clear 25 pink"). Designed for one specific player on an iPhone, played in Safari — no app store, no backend.

This handoff covers the fully-juiced prototype of **Level 1**. The intended full game is **30 levels with a level map** (see "Roadmap" below).

## About the Design Files
`Bubble Pop.dc.html` is a **design reference built in HTML** — a working prototype showing the intended look, feel, and behavior. It is not production code to ship directly. Recreate it in your chosen environment. Since no codebase exists yet, a recommendation: a single-page vanilla JS or React app, no build step required beyond a bundler, deployable as static files (GitHub Pages / Netlify / Vercel). It must run well in iOS Safari.

The prototype's logic (in the `<script data-dc-script>` block) is real, working game logic — flood fill, gravity, scoring, audio synthesis — and can be ported nearly as-is.

## Fidelity
**High-fidelity.** Colors, typography, spacing, animation timings, and sounds are final unless noted. Recreate pixel-perfectly.

## Screens / Views

### Game screen (the only screen in this prototype)
Fixed full-viewport (`position:fixed; inset:0`), portrait, no scrolling. Vertical flex layout:

1. **Header row** — padding `calc(10px + env(safe-area-inset-top)) 16px 4px`
   - Title "Bubble Pop": Fredoka 700, 24px, white; "Pop" in #ff8ec6; text-shadow `0 2px 0 rgba(0,0,0,.28)`
   - Restart button (right): 38px circle, `rgba(255,255,255,.13)` bg, 1px `rgba(255,255,255,.25)` border, "↻" glyph
2. **HUD chip row** — flex, gap 8px, padding `6px 14px 8px`. Three chips, each: bg `rgba(255,255,255,.12)`, border 1px `rgba(255,255,255,.16)`, radius 16px, centered text, label 10px/600/1.2px-tracking `rgba(255,255,255,.65)` uppercase.
   - **CLEAR PINK** (flex 1.2): mini pink blob (18px, with its hair curls — see colorblind section) + "N/25" 19px/700; below it a 4px progress bar (track `rgba(0,0,0,.3)`, fill gradient `#ff8ec6→#ff5fa8`, `width .4s ease`)
   - **MOVES** (flex 1): value 26px/700. When moves ≤ 5: color #ff6d6d + `pulseRed` scale pulse (1→1.14, .85s infinite)
   - **SCORE** (flex 1): value 26px/700, locale-formatted
3. **Board** — centered in remaining space. 7 columns × 9 rows, aspect ratio 7:9, max width 500px (size computed in JS from container). Bg `rgba(14,4,38,.38)`, border 1px `rgba(255,255,255,.13)`, radius 22px, `overflow:hidden`, inset shadow `inset 0 4px 18px rgba(0,0,0,.35)`.
4. **Hint caption** — "Tap groups of 2 or more matching blobs", 12px `rgba(255,255,255,.5)`, bottom safe-area padding.

**Page background** (behind everything): `linear-gradient(175deg,#5b1e9e 0%,#3a1272 55%,#250b4e 100%)` plus three faint white radial circles (opacity .04–.06) as decoration.

### Blob (cell)
Each cell is `100/7`% × `100/9`% of the board; the blob body is inset 4% within its cell.
- Body: circle, `radial-gradient(circle at 33% 28%, <hi> 0%, <c1> 42%, <c2> 100%)`
- Shadows: `inset -3px -6px 10px rgba(0,0,0,.25), inset 3px 5px 8px rgba(255,255,255,.35), 0 4px 8px rgba(0,0,0,.28)`
- Gloss highlight: white ellipse (34%×20%, opacity .75, rotated −24°, 1px blur) at top-left
- Eyes: two white circles (36% of body width) at 34% from top, dark pupils #2b2340 (46% of eye, slightly low-center). Wrapper animates `blink` (scaleY 1→.08 at 94%) with a **random duration 2.6–6.6s and random delay 0–3s per blob** so blinking is unsynchronized.
- Minimum tap target: at 7 columns on a 390px screen a cell is ~50px — keep columns ≤ 8 on phones so targets stay ≥ 44px.

### Win overlay
Full-screen `rgba(22,7,46,.72)` + 6px backdrop blur. Card: gradient `#ffffff→#ffe7f3`, radius 26px, padding ~28px 32px, entrance `fadeUp` (.45s, spring cubic-bezier(.34,1.56,.64,1)).
- "Level clear!" 30px/700 #d81b77
- Three stars (★, 52px): earned = #ffc93c, unearned = `rgba(60,20,80,.15)`; each pops in with `starPop` (scale 0→1.35→1 with rotation), staggered 220ms
- Score line, best line ("Best: 1,240 · 3★"), pink pill button "Play again" (gradient #ff6cb1→#e0257c, 3D shadow `0 5px 0 #b21360`, pressed state translates down 4px)

### Lose overlay
Same structure, purple: "Out of moves!" #6b46ff, subtitle "You cleared N of 25 pink blobs", button gradient #8f6cff→#6b46ff / shadow #4c2fd0.

## Game rules & tuning (Level 1)
- Grid: 7×9 = 63 blobs. 4 colors (pink, blue, yellow, green).
- Objective: clear **25 pink**. Move limit: **22**.
- Tap a group of ≥2 orthogonally-adjacent same-color blobs → they pop; costs 1 move.
- Tap a lone blob → it wiggles (rotate ±11°, .38s), a low "thud" plays, **no move is spent**. This keeps every tap feeling responsive.
- Score: `n² × 5` for a group of n (2→20, 5→125, 10→500).
- Gravity: survivors fall straight down in their column; empty slots refill from above with random colors dropping in.
- Dead board (no groups of 2+): toast "No moves left — shuffling!" then all colors rerandomize (no move cost).
- Win: objective reached (even on the last move). Stars: moves remaining ≥ 28% of limit → 3★, ≥ 10% → 2★, else 1★.
- Lose: moves hit 0 before objective.
- Input is locked during pop/cascade resolution (~0.7–1s depending on group size).

## Colorblind accessibility (required)
Every color has a unique accessory + mouth so no color relies on hue alone:

| Color  | hi      | c1      | c2      | Accessory              | Mouth        |
|--------|---------|---------|---------|------------------------|--------------|
| Pink   | #ffd6ea | #ff5fa8 | #cf1470 | 3 hair curls on top    | smile arc    |
| Blue   | #c8ecff | #3fb9ff | #0e7fd4 | antenna with ball      | "o" mouth    |
| Yellow | #fff3c4 | #ffd23f | #ef9c06 | 4 cheek freckles       | wide grin    |
| Green  | #d2ffd9 | #4ade63 | #149e38 | leaf sprout            | flat mouth   |
| Purple | #e9d5ff | #a86bff | #7226e0 | round glasses + bridge | smile arc    |
| Orange | #ffe3c4 | #ff9440 | #e05e08 | cap/beret band         | "o" mouth    |

Accessories are drawn with the color's own `c2` shade; mouths/pupils are #2b2340. The objective chip's mini blob must show the target color's accessory (curls for pink).

## Interactions, animation & juice
All timings from the prototype:
- **Pop**: each blob in the group scales 1→1.28→0 (`popOut`, .3s, overshoot bezier), **staggered 45ms in flood-fill order** so pops ripple outward from the tap.
- **Particles**: 6 per blob (5–12px circles, blob's c1/hi colors), fly outward `30–100px` with upward bias, shrink + fade over .6s, delay matching their blob's stagger.
- **Combo text**: group ≥5 → "NICE!", ≥7 → "SWEET!", ≥10 → "WOW!" — Fredoka 700 44px white, text-shadow `0 3px 0 #c2186f`, spawns at tap point (clamped inside board), pops in with rotation then drifts up and fades (.9s).
- **Falling**: `top` transition `.45s cubic-bezier(.25,1.3,.45,1)` (slight bounce). New blobs are placed above the board (hidden by overflow) then released, so they visibly rain in. Two-phase: teleport above with transitions disabled, next frame enable transition + set final row.
- **Level start**: all 63 blobs cascade in with `dropIn` (fall from off-screen with a small bounce), staggered by row+column (~45ms/row).
- **Haptics**: `navigator.vibrate` — 12ms on pop, pattern [10,30,20] on combo, [20,40,20,40,40] on win, 8ms on wiggle. (No-op on iOS Safari; harmless.)

## Sound (Web Audio, synthesized — no files)
Create AudioContext lazily on first tap (iOS autoplay policy); `resume()` if suspended.
- **Pop**: sine osc per blob, staggered 45ms. Frequency `min(1400, 340 × 1.13^k)` for k-th blob — rising pitch across the group. Each: start at 1.7×f, exponential ramp down to f over 60% of 0.16s; gain attack to 0.25 in 12ms, exponential decay to silence.
- **Wiggle thud**: square, 140→90Hz, 0.1s, gain 0.12.
- **Win jingle**: triangle notes 523/659/784/1046Hz, 130ms apart, 0.28s each.
- **Lose**: triangle 392/330/262Hz descending.
- Sound toggle should exist in a settings affordance.

## State management
Prototype state (port as-is):
- `blobs[63]`: fixed array of slots `{id, col, row, color, popping, anim, finalRow, noTrans, blink}` — popped slots are **reused in place** for their replacement blob (keeps React keys/DOM stable so CSS transitions animate correctly)
- `particles[]` (transient), `combo` (transient), `toast`
- `moves`, `score`, `cleared`, `stars`, `phase: 'play'|'win'|'lose'`
- `busy` lock during cascade resolution
- Persistence: `localStorage['bubble-pop-best'] = {stars, score}` in prototype. Real game: persist per-level `{stars, score}` + highest unlocked level, e.g. `bubblepop.progress` JSON. Wrap all storage access in try/catch.

## Design tokens
- **Font**: Fredoka (Google Fonts), weights 400–700. Single family throughout.
- **Background**: #5b1e9e → #3a1272 → #250b4e (175°)
- **Ink on light cards**: #2b2340 (also pupils/mouths); accents #d81b77 (win), #6b46ff (lose)
- **Chips/glass**: white at 12–13% opacity, borders white 16–25%
- **Star gold**: #ffc93c
- **Radii**: chips 16px, board 22px, cards 26px, pills 999px
- **Blob palette**: see colorblind table
- Text minimums: labels 10px, captions 12px — never smaller.

## Roadmap (agreed direction, not in prototype)
1. **30 levels + level map**: ramp 3→6 colors, tighter move budgets, varied objectives ("clear N <color>", later possibly score targets). Level map with star counts per level.
2. Level config is data: `{colors, cols, rows, moves, target: {color, count}}` — the prototype already reads colors/moves/goal as parameters.
3. Around level 10: special blobs (e.g. bomb spawned by 8+ group) to keep the mechanic fresh.
4. Later: daily streak, richer sounds.

## Assets
None. Everything is CSS/DOM-drawn (gradients, circles, unicode ★/↻) plus the Fredoka webfont. No images to export.

## Files
- `Bubble Pop.dc.html` — the complete prototype: markup/styles in the `<x-dc>` template (all inline styles + a few keyframes in the header `<style>`), full game logic in the `<script data-dc-script>` class (`renderVals()` feeds the template; ignore the DC plumbing and read it as a React class component).
