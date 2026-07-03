import { PAL, getLevel, TOTAL_LEVELS } from './levels.js';
import { recordResult, loadProgress, isLocked } from './progress.js';
import { loadIdentity, setNickname } from './identity.js';
import { submitScore, fetchTop3 } from './leaderboard.js';

function loadBestFor(levelNum) {
  const p = loadProgress();
  return p.levels[levelNum] || null;
}

export class Game {
  constructor(levelNum, callbacks) {
    this.callbacks = callbacks || {};
    this.uid = 1;
    this.pid = 1;
    this.busy = false;
    this.bonusRunId = 0;
    this.ctx = null;
    this.soundOn = true;

    this.board = document.getElementById('board');
    this.boardWrap = document.getElementById('boardWrap');
    this.blobEls = [];

    this.els = {
      levelTitle: document.getElementById('levelTitle'),
      targetLabel: document.getElementById('targetLabel'),
      miniBlob: document.getElementById('miniBlob'),
      clearedValue: document.getElementById('clearedValue'),
      progressFill: document.getElementById('progressFill'),
      movesValue: document.getElementById('movesValue'),
      scoreValue: document.getElementById('scoreValue'),
      chipBest: document.getElementById('chipBest'),
      winOverlay: document.getElementById('winOverlay'),
      winStars: document.getElementById('winStars'),
      winScore: document.getElementById('winScore'),
      winBest: document.getElementById('winBest'),
      winNextBtn: document.getElementById('winNextBtn'),
      loseOverlay: document.getElementById('loseOverlay'),
      loseSub: document.getElementById('loseSub'),
      loseScore: document.getElementById('loseScore'),
      hint: document.getElementById('hint'),
      bonusSkipBtn: document.getElementById('bonusSkipBtn'),
      winLeaderboardBtn: document.getElementById('winLeaderboardBtn'),
      leaderboardOverlay: document.getElementById('leaderboardOverlay'),
      leaderboardLevelLabel: document.getElementById('leaderboardLevelLabel'),
      leaderboardList: document.getElementById('leaderboardList'),
      leaderboardCloseBtn: document.getElementById('leaderboardCloseBtn'),
      nicknameOverlay: document.getElementById('nicknameOverlay'),
      nicknameInput: document.getElementById('nicknameInput'),
      nicknameSaveBtn: document.getElementById('nicknameSaveBtn'),
      nicknameSkipBtn: document.getElementById('nicknameSkipBtn'),
    };

    this.els.bonusSkipBtn.onclick = () => this.skipBonusRound();
    document.getElementById('backBtn').onclick = () => this.callbacks.onBack && this.callbacks.onBack();
    document.getElementById('restartBtn').onclick = () => this.startLevel();
    document.getElementById('winMapBtn').onclick = () => this.callbacks.onBack && this.callbacks.onBack();
    document.getElementById('winReplayBtn').onclick = () => this.startLevel();
    document.getElementById('loseMapBtn').onclick = () => this.callbacks.onBack && this.callbacks.onBack();
    document.getElementById('loseRestartBtn').onclick = () => this.startLevel();
    this.els.winNextBtn.onclick = () => {
      if (this.levelNum < TOTAL_LEVELS) {
        this.callbacks.onNext && this.callbacks.onNext(this.levelNum + 1);
      } else {
        this.callbacks.onBack && this.callbacks.onBack();
      }
    };
    this.els.winLeaderboardBtn.onclick = () => this.showLeaderboard();
    this.els.leaderboardCloseBtn.onclick = () => this.hideLeaderboard();
    this.els.nicknameSaveBtn.onclick = () => this.saveNickname();
    this.els.nicknameSkipBtn.onclick = () => this.hideNickname();

    this._onResize = () => this.measure();
    window.addEventListener('resize', this._onResize);

    this.loadLevel(levelNum);
    this.measure();
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
  }

  loadLevel(levelNum) {
    this.levelNum = levelNum;
    this.level = getLevel(levelNum);
    this.COLS = this.level.cols;
    this.ROWS = this.level.rows;
    this.els.levelTitle.textContent = `Level ${levelNum}`;
    this.buildGoalChip();
    this.measure();
    this.startLevel();
  }

  buildGoalChip() {
    const t = this.level.target;
    this.els.miniBlob.innerHTML = '';
    if (t.type === 'color') {
      this.els.targetLabel.textContent = `CLEAR ${PAL[t.color].name.toUpperCase()}`;
      this.els.miniBlob.hidden = false;
      const pal = PAL[t.color];
      this.els.miniBlob.style.background = `radial-gradient(circle at 33% 28%, ${pal.hi} 0%, ${pal.c1} 45%, ${pal.c2} 100%)`;
      this.accessoryNodes(t.color, true).forEach(node => {
        node.style.background = pal.c2;
        this.els.miniBlob.appendChild(node);
      });
      const eyes = document.createElement('div');
      eyes.className = 'blob-eyes';
      for (let k = 0; k < 2; k++) {
        const eye = document.createElement('div');
        eye.className = 'eye' + (t.color === 4 ? ' ring' : '');
        const pupil = document.createElement('div');
        pupil.className = 'pupil';
        eye.appendChild(pupil);
        eyes.appendChild(eye);
      }
      this.els.miniBlob.appendChild(eyes);
      const mouthWrap = document.createElement('div');
      mouthWrap.className = 'mouth-wrap';
      mouthWrap.appendChild(this.mouthNode(t.color));
      this.els.miniBlob.appendChild(mouthWrap);
    } else {
      this.els.targetLabel.textContent = 'SCORE GOAL';
      this.els.miniBlob.hidden = true;
    }
  }

  measure() {
    const el = this.boardWrap;
    if (!el) return;
    const ar = this.COLS / this.ROWS;
    const w = el.clientWidth - 4;
    const h = el.clientHeight - 4;
    const bw = Math.min(w, h * ar, 500);
    const boardW = Math.round(bw);
    const boardH = Math.round(bw / ar);
    this.board.style.width = boardW + 'px';
    this.board.style.height = boardH + 'px';
    // Re-measure the board's actual rendered box rather than trusting boardW/boardH:
    // the flex layout can shrink .board to fit its padded container, so the requested
    // size and the real rendered size can differ (e.g. cutting off the last column).
    const rect = this.board.getBoundingClientRect();
    this.cellW = rect.width / this.COLS;
    this.cellH = rect.height / this.ROWS;
    this.blobEls.forEach((blobEl) => {
      blobEl.style.width = this.cellW + 'px';
      blobEl.style.height = this.cellH + 'px';
    });
    if (this.state) this.state.blobs.forEach((_, i) => this.renderBlob(i));
  }

  blinkStr() {
    return `${(2.6 + Math.random() * 4).toFixed(2)}s ${(Math.random() * 3).toFixed(2)}s`;
  }
  randColor() {
    return Math.floor(Math.random() * this.level.numColors);
  }

  startLevel() {
    this.busy = false;
    this.bonusRunId++;
    this.els.bonusSkipBtn.hidden = true;
    this.els.hint.hidden = false;
    const blobs = [];
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        blobs.push({
          id: this.uid++, col: c, row: r, color: this.randColor(), special: null,
          popping: false, noTrans: false, finalRow: null,
          anim: `dropIn .6s ${(this.ROWS - r) * 45 + c * 18}ms cubic-bezier(.3,.9,.4,1) backwards`,
          blink: this.blinkStr(),
        });
      }
    }
    this.state = {
      blobs, particles: [], combo: null, toast: null,
      moves: this.level.moves, score: 0, cleared: 0, stars: 0,
      phase: 'play', best: loadBestFor(this.levelNum),
    };
    this.els.winOverlay.hidden = true;
    this.els.loseOverlay.hidden = true;
    this.els.leaderboardOverlay.hidden = true;
    this.els.nicknameOverlay.hidden = true;
    this.rebuildBlobEls();
    this.render();
  }

  rebuildBlobEls() {
    this.board.querySelectorAll('.blob').forEach(el => el.remove());
    this.blobEls = this.state.blobs.map((b, i) => this.createBlobEl(i));
    this.blobEls.forEach(el => this.board.appendChild(el));
  }

  createBlobEl(i) {
    const el = document.createElement('div');
    el.className = 'blob';
    el.style.width = this.cellW + 'px';
    el.style.height = this.cellH + 'px';
    el.addEventListener('pointerdown', (e) => this.tapBlob(i, e));

    const body = document.createElement('div');
    body.className = 'blob-body';

    const gloss = document.createElement('div');
    gloss.className = 'blob-gloss';
    body.appendChild(gloss);

    const accWrap = document.createElement('div');
    accWrap.className = 'acc-wrap';
    body.appendChild(accWrap);

    const eyes = document.createElement('div');
    eyes.className = 'blob-eyes';
    for (let k = 0; k < 2; k++) {
      const eye = document.createElement('div');
      eye.className = 'eye';
      const pupil = document.createElement('div');
      pupil.className = 'pupil';
      eye.appendChild(pupil);
      eyes.appendChild(eye);
    }
    body.appendChild(eyes);

    const mouthWrap = document.createElement('div');
    mouthWrap.className = 'mouth-wrap';
    body.appendChild(mouthWrap);

    el.appendChild(body);
    el._body = body;
    el._gloss = gloss;
    el._accWrap = accWrap;
    el._eyesWrap = eyes;
    el._mouthWrap = mouthWrap;
    el._lastColor = null;
    el._lastSpecial = false;
    el._lastAnim = null;
    el._lastBlink = null;
    el._lastTransDur = null;
    return el;
  }

  accessoryNodes(ci, mini) {
    const nodes = [];
    const prefix = mini ? 'curl' : 'curl'; // classes are percentage-based, reused at any scale
    if (ci === 0) { // Pink: curls
      for (let k = 0; k < 3; k++) {
        const d = document.createElement('div');
        d.className = 'accessory curl';
        nodes.push(d);
      }
    } else if (ci === 1) { // Blue: antenna
      const stalk = document.createElement('div'); stalk.className = 'accessory antenna-stalk';
      const ball = document.createElement('div'); ball.className = 'accessory antenna-ball';
      nodes.push(stalk, ball);
    } else if (ci === 2) { // Yellow: freckles
      ['f1', 'f2', 'f3', 'f4'].forEach(cls => {
        const d = document.createElement('div');
        d.className = `accessory freckle ${cls}`;
        nodes.push(d);
      });
    } else if (ci === 3) { // Green: sprout
      const stalk = document.createElement('div'); stalk.className = 'accessory sprout-stalk';
      const leaf = document.createElement('div'); leaf.className = 'accessory sprout-leaf';
      nodes.push(stalk, leaf);
    } else if (ci === 4) { // Purple: round glasses + bridge
      const bridge = document.createElement('div'); bridge.className = 'accessory glasses-bridge';
      nodes.push(bridge);
    } else if (ci === 5) { // Orange: cap
      const band = document.createElement('div'); band.className = 'accessory cap-band';
      const nub = document.createElement('div'); nub.className = 'accessory cap-nub';
      nodes.push(band, nub);
    }
    return nodes;
  }

  mouthNode(ci) {
    const d = document.createElement('div');
    if (ci === 0 || ci === 4) d.className = 'mouth-smile';
    else if (ci === 2) d.className = 'mouth-wide';
    else if (ci === 1 || ci === 5) d.className = 'mouth-o';
    else if (ci === 3) d.className = 'mouth-flat';
    return d;
  }

  centerPct(b) {
    return { x: (b.col + 0.5) * 100 / this.COLS, y: (b.row + 0.5) * 100 / this.ROWS };
  }

  flood(start) {
    const blobs = this.state.blobs;
    const grid = new Array(this.COLS * this.ROWS).fill(-1);
    blobs.forEach((b, i) => {
      if (!b.popping && !b.special && b.row >= 0 && b.finalRow == null) grid[b.row * this.COLS + b.col] = i;
    });
    const col0 = blobs[start].color;
    const seen = new Set([start]);
    const q = [start];
    const out = [];
    while (q.length) {
      const i = q.pop();
      out.push(i);
      const b = blobs[i];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let d = 0; d < 4; d++) {
        const c = b.col + nb[d][0];
        const r = b.row + nb[d][1];
        if (c < 0 || c >= this.COLS || r < 0 || r >= this.ROWS) continue;
        const j = grid[r * this.COLS + c];
        if (j >= 0 && !seen.has(j) && blobs[j].color === col0) {
          seen.add(j);
          q.push(j);
        }
      }
    }
    return out;
  }

  tapBlob(i, e) {
    if (this.state.phase !== 'play' || this.busy) return;
    this.ensureAudio();
    const b = this.state.blobs[i];
    if (!b || b.popping || b.finalRow != null) return;

    if (b.special === 'bomb') {
      this.explodeBomb(i, e);
      return;
    }

    const group = this.flood(i);
    if (group.length < 2) {
      b.anim = 'wiggle .38s ease';
      this.renderBlob(i);
      this.thud();
      this.vib(8);
      setTimeout(() => { b.anim = 'none'; this.renderBlob(i); }, 420);
      return;
    }
    const spawnBombAt = (this.level.hasBombs && group.length >= 8) ? i : null;
    this.pop(group, e, { spawnBombAt });
  }

  explodeBomb(i, e) {
    const blast = this.computeBombBlast(i);
    this.vib([15, 15, 15, 15, 30]);
    this.pop(blast, e, { isBombBlast: true });
  }

  computeBombBlast(i) {
    const b = this.state.blobs[i];
    const blast = [];
    this.state.blobs.forEach((ob, gi) => {
      if (ob.popping || ob.finalRow != null) return;
      if (Math.max(Math.abs(ob.col - b.col), Math.abs(ob.row - b.row)) <= 1) blast.push(gi);
    });
    return blast;
  }

  bestGroup() {
    const blobs = this.state.blobs;
    const seen = new Set();
    let best = null;
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      if (b.popping || b.special || b.finalRow != null || seen.has(i)) continue;
      const group = this.flood(i);
      group.forEach(gi => seen.add(gi));
      if (group.length >= 2 && (!best || group.length > best.length)) best = group;
    }
    return best;
  }

  findBestMove() {
    const blobs = this.state.blobs;
    let bestBomb = null, bestBombGain = -1;
    blobs.forEach((b, i) => {
      if (b.special !== 'bomb') return;
      const blast = this.computeBombBlast(i);
      const gain = blast.length * 50;
      if (gain > bestBombGain) { bestBombGain = gain; bestBomb = blast; }
    });
    const group = this.bestGroup();
    const groupGain = group ? group.length * group.length * 5 : -1;
    if (bestBomb && bestBombGain >= groupGain) return { type: 'bomb', blast: bestBomb };
    if (group) return { type: 'group', group };
    return null;
  }

  runBonusRound(stars) {
    const s = this.state;
    const runId = ++this.bonusRunId;
    this.bonusStars = stars;
    s.toast = 'Bonus round! Cashing in leftover moves…';
    this.updateToast();
    this.els.hint.hidden = true;
    this.els.bonusSkipBtn.hidden = false;

    const step = () => {
      if (this.bonusRunId !== runId) return;
      if (s.moves <= 0) { this.endBonusRound(stars, runId); return; }
      const move = this.findBestMove();
      if (!move) { this.endBonusRound(stars, runId); return; }
      if (move.type === 'bomb') {
        this.pop(move.blast, null, { isBombBlast: true });
      } else {
        const spawnBombAt = (this.level.hasBombs && move.group.length >= 8) ? move.group[0] : null;
        this.pop(move.group, null, { spawnBombAt });
      }
      this.waitUntilIdle(runId, step);
    };
    step();
  }

  waitUntilIdle(runId, cb) {
    const poll = () => {
      if (this.bonusRunId !== runId) return;
      if (!this.busy) cb(); else setTimeout(poll, 12);
    };
    setTimeout(poll, 12);
  }

  endBonusRound(stars, runId) {
    if (this.bonusRunId !== runId) return;
    const s = this.state;
    s.toast = null;
    this.updateToast();
    this.els.bonusSkipBtn.hidden = true;
    this.els.hint.hidden = false;
    this.finishWin(stars);
  }

  // Instantly resolves the rest of a bonus round with no animation: settles
  // whatever is mid-flight, then tallies every remaining move's score directly.
  skipBonusRound() {
    const s = this.state;
    if (s.phase !== 'bonus') return;
    this.bonusRunId++; // cancels the animated step()/waitUntilIdle loop
    const stars = this.bonusStars;

    s.blobs.forEach(b => {
      if (b.finalRow != null) { b.row = b.finalRow; b.finalRow = null; b.noTrans = false; }
    });
    this.collapseInstant();

    while (s.moves > 0) {
      const move = this.findBestMove();
      if (!move) break;
      this.applyMoveInstant(move);
      this.collapseInstant();
    }

    this.busy = false;
    s.toast = null;
    this.updateToast();
    this.els.bonusSkipBtn.hidden = true;
    this.els.hint.hidden = false;
    this.render();
    this.finishWin(stars);
  }

  applyMoveInstant(move) {
    const s = this.state;
    const group = move.type === 'bomb' ? move.blast : move.group;
    const gain = move.type === 'bomb' ? group.length * 50 : group.length * group.length * 5;
    const bombIdx = (move.type === 'group' && this.level.hasBombs && group.length >= 8) ? group[0] : null;
    group.forEach(gi => { if (gi !== bombIdx) s.blobs[gi].popping = true; });
    if (bombIdx != null) s.blobs[bombIdx].special = 'bomb';
    const t = this.level.target;
    if (t.type === 'color') {
      const clearedAdd = group.filter(gi => gi !== bombIdx && s.blobs[gi].color === t.color).length;
      s.cleared = Math.min(t.count, s.cleared + clearedAdd);
    }
    s.moves -= 1;
    s.score += gain;
  }

  // Same column-collapse math as collapse(), applied synchronously with no
  // animation/timers — used to settle the board during an instant skip.
  collapseInstant() {
    const blobs = this.state.blobs;
    for (let c = 0; c < this.COLS; c++) {
      const colB = blobs.filter(b => b.col === c);
      const surv = colB.filter(b => !b.popping).sort((a, b) => a.row - b.row);
      const dead = colB.filter(b => b.popping);
      let r = this.ROWS - 1;
      for (let k = surv.length - 1; k >= 0; k--) surv[k].row = r--;
      dead.forEach((b, k) => {
        b.color = this.randColor();
        b.special = null;
        b.popping = false;
        b.row = r - k;
        b.finalRow = null;
        b.noTrans = true;
        b.anim = 'none';
      });
    }
  }

  finishWin(stars) {
    const s = this.state;
    const progress = recordResult(this.levelNum, { stars, score: s.score }, TOTAL_LEVELS);
    s.stars = stars;
    s.best = progress.levels[this.levelNum];
    s.phase = 'win';
    if (loadIdentity()) {
      this.showWin();
    } else {
      this.showNickname();
    }
    this.jingle(true);
    this.vib([20, 40, 20, 40, 40]);
    submitScore(this.levelNum, s.score); // fire-and-forget; no-op until a nickname exists
  }

  showNickname() {
    this.els.nicknameInput.value = '';
    this.els.nicknameOverlay.hidden = false;
  }

  hideNickname() {
    this.els.nicknameOverlay.hidden = true;
    this.showWin();
  }

  async saveNickname() {
    const name = this.els.nicknameInput.value;
    await setNickname(name);
    this.els.nicknameOverlay.hidden = true;
    this.showWin();
    submitScore(this.levelNum, this.state.score);
  }

  showLeaderboard() {
    this.els.leaderboardLevelLabel.textContent = `Level ${this.levelNum}`;
    this.els.leaderboardList.innerHTML = '<li class="leaderboard-empty">Loading…</li>';
    this.els.leaderboardOverlay.hidden = false;
    const levelNum = this.levelNum;
    fetchTop3(levelNum).then(top => {
      if (this.els.leaderboardOverlay.hidden || this.levelNum !== levelNum) return;
      this.renderLeaderboard(top);
    });
  }

  renderLeaderboard(top) {
    this.els.leaderboardList.innerHTML = '';
    if (!top.length) {
      const li = document.createElement('li');
      li.className = 'leaderboard-empty';
      li.textContent = 'No scores yet — be the first!';
      this.els.leaderboardList.appendChild(li);
      return;
    }
    top.forEach((entry, i) => {
      const li = document.createElement('li');
      li.className = 'leaderboard-row';
      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = String(i + 1);
      const name = document.createElement('span');
      name.className = 'leaderboard-name';
      name.textContent = entry.name;
      const score = document.createElement('span');
      score.className = 'leaderboard-score';
      score.textContent = entry.score.toLocaleString();
      li.appendChild(rank);
      li.appendChild(name);
      li.appendChild(score);
      this.els.leaderboardList.appendChild(li);
    });
  }

  hideLeaderboard() {
    this.els.leaderboardOverlay.hidden = true;
  }

  // Bonus-round auto-pops reuse the normal pop()/collapse() animation path,
  // just heavily sped up (stagger/settle timings scaled way down) so cashing
  // in leftover moves doesn't make the player wait through full-speed juice.
  scaleMs(ms) {
    return this.state.phase === 'bonus' ? Math.max(16, Math.round(ms * 0.18)) : ms;
  }

  pop(group, e, opts) {
    opts = opts || {};
    this.busy = true;
    const n = group.length;
    const gain = opts.isBombBlast ? n * 50 : n * n * 5;
    const bombIdx = opts.spawnBombAt != null ? opts.spawnBombAt : null;
    const newParts = [];
    const boardRect = this.board.getBoundingClientRect();
    const stagger = this.scaleMs(45);
    const popDur = this.scaleMs(300);
    const bombDur = this.scaleMs(500);
    const bombDelay = this.scaleMs(200);

    group.forEach((gi, k) => {
      if (gi === bombIdx) return; // this slot becomes a bomb instead of popping
      const b = this.state.blobs[gi];
      const pal = PAL[b.color];
      const c = this.centerPct(b);
      this.playPop(k);
      for (let j = 0; j < 6; j++) {
        const a = Math.random() * Math.PI * 2;
        const d = 30 + Math.random() * 70;
        newParts.push({
          id: this.pid++, l: +c.x.toFixed(2), t: +c.y.toFixed(2),
          s: Math.round(5 + Math.random() * 7), c: j % 2 ? pal.c1 : pal.hi,
          dx: Math.round(Math.cos(a) * d), dy: Math.round(Math.sin(a) * d - 25), d: k * stagger,
        });
      }
      b.popping = true;
      b.anim = `popOut ${popDur}ms ${k * stagger}ms cubic-bezier(.34,1.2,.64,1) forwards`;
    });

    if (bombIdx != null) {
      const bb = this.state.blobs[bombIdx];
      bb.special = 'bomb';
      bb.anim = `bombSpawn ${bombDur}ms ${bombDelay}ms cubic-bezier(.34,1.56,.64,1) backwards`;
    }

    let combo = null;
    if (n >= 5) {
      const txt = bombIdx != null ? 'BOMB!' : (n >= 10 ? 'WOW!' : n >= 7 ? 'SWEET!' : 'NICE!');
      let x = 50, y = 40;
      if (boardRect && e && e.clientX != null) {
        x = Math.min(82, Math.max(18, (e.clientX - boardRect.left) / boardRect.width * 100));
        y = Math.min(85, Math.max(12, (e.clientY - boardRect.top) / boardRect.height * 100));
      }
      combo = { key: this.pid++, text: txt, x: +x.toFixed(1), y: +y.toFixed(1) };
      this.vib([10, 30, 20]);
    } else {
      this.vib(12);
    }

    const t = this.level.target;
    let clearedAdd = 0;
    if (t.type === 'color') {
      clearedAdd = group.filter(gi => gi !== bombIdx && this.state.blobs[gi].color === t.color).length;
    }
    this.state.particles = this.state.particles.concat(newParts);
    this.state.combo = combo || this.state.combo;
    this.state.moves -= 1;
    this.state.score += gain;
    if (t.type === 'color') this.state.cleared = Math.min(t.count, this.state.cleared + clearedAdd);

    group.forEach(gi => this.renderBlob(gi));
    this.spawnParticles(newParts);
    this.updateCombo();
    this.renderHud();

    const ids = new Set(newParts.map(p => p.id));
    setTimeout(() => {
      this.state.particles = this.state.particles.filter(p => !ids.has(p.id));
      this.cleanupParticles(ids);
    }, n * stagger + this.scaleMs(900));

    if (combo) {
      setTimeout(() => {
        if (this.state.combo && this.state.combo.key === combo.key) {
          this.state.combo = null;
          this.updateCombo();
        }
      }, this.scaleMs(950));
    }

    setTimeout(() => this.collapse(), n * stagger + this.scaleMs(270));
  }

  collapse() {
    const blobs = this.state.blobs;
    const affected = [];
    for (let c = 0; c < this.COLS; c++) {
      const colIdx = [];
      blobs.forEach((b, i) => { if (b.col === c) colIdx.push(i); });
      const surv = colIdx.filter(i => !blobs[i].popping).sort((a, b) => blobs[a].row - blobs[b].row);
      const dead = colIdx.filter(i => blobs[i].popping);
      if (!dead.length) continue;
      let r = this.ROWS - 1;
      for (let k = surv.length - 1; k >= 0; k--) blobs[surv[k]].row = r--;
      dead.forEach((i, k) => {
        const b = blobs[i];
        b.color = this.randColor();
        b.special = null;
        b.popping = false;
        b.noTrans = true;
        b.anim = 'none';
        b.blink = this.blinkStr();
        b.finalRow = r - k;
        b.row = -(k + 1);
      });
      affected.push(...colIdx);
    }
    affected.forEach(i => this.renderBlob(i));
    this.renderHud();

    requestAnimationFrame(() => requestAnimationFrame(() => {
      affected.forEach(i => {
        const b = this.state.blobs[i];
        if (b.finalRow != null) {
          b.row = b.finalRow;
          b.finalRow = null;
          b.noTrans = false;
        }
      });
      affected.forEach(i => this.renderBlob(i));
      setTimeout(() => {
        this.busy = false;
        this.checkEnd();
      }, this.scaleMs(480));
    }));
  }

  anyMoves() {
    const blobs = this.state.blobs;
    if (blobs.some(b => b.special === 'bomb')) return true;
    const grid = {};
    blobs.forEach(b => { grid[b.row * this.COLS + b.col] = b.special ? null : b.color; });
    return blobs.some(b => {
      if (b.special) return false;
      if (b.col + 1 < this.COLS && grid[b.row * this.COLS + b.col + 1] === b.color) return true;
      if (b.row + 1 < this.ROWS && grid[(b.row + 1) * this.COLS + b.col] === b.color) return true;
      return false;
    });
  }

  checkEnd() {
    const s = this.state;
    if (s.phase !== 'play') return;
    const t = this.level.target;
    const goalMet = t.type === 'color' ? s.cleared >= t.count : s.score >= t.count;
    if (goalMet) {
      const stars = s.moves >= Math.ceil(this.level.moves * 0.28) ? 3 : (s.moves >= Math.ceil(this.level.moves * 0.1) ? 2 : 1);
      if (s.moves > 0 && this.findBestMove()) {
        s.phase = 'bonus';
        this.runBonusRound(stars);
      } else {
        this.finishWin(stars);
      }
      return;
    }
    if (s.moves <= 0) {
      s.phase = 'lose';
      this.showLose();
      this.jingle(false);
      return;
    }
    if (!this.anyMoves()) {
      s.toast = 'No moves left — shuffling!';
      this.updateToast();
      setTimeout(() => {
        s.toast = null;
        this.updateToast();
        s.blobs.forEach((b) => {
          if (b.special) return;
          b.color = this.randColor();
          b.anim = `dropIn .45s ${Math.round(Math.random() * 200)}ms backwards`;
        });
        this.render();
      }, 900);
    }
  }

  // ---- audio ----
  ensureAudio() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(t, f0, f1, dur, vol, type) {
    if (!this.ctx || !this.soundOn) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(Math.max(40, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  playPop(k) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + k * 0.045;
    const f = Math.min(1400, 340 * Math.pow(1.13, k));
    this.tone(t, f * 1.7, f, 0.16, 0.25, 'sine');
  }
  thud() {
    if (this.ctx) this.tone(this.ctx.currentTime, 140, 90, 0.1, 0.12, 'square');
  }
  jingle(win) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = win ? [523, 659, 784, 1046] : [392, 330, 262];
    notes.forEach((f, i) => this.tone(t + i * 0.13, f, f, 0.28, 0.18, 'triangle'));
  }
  vib(p) {
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ }
  }

  // ---- rendering ----
  render() {
    this.state.blobs.forEach((_, i) => this.renderBlob(i));
    this.renderHud();
  }

  renderBlob(i) {
    const b = this.state.blobs[i];
    const el = this.blobEls[i];
    if (!el) return;
    el.style.transform = `translate3d(${(b.col * this.cellW).toFixed(2)}px, ${(b.row * this.cellH).toFixed(2)}px, 0)`;
    el.classList.toggle('no-trans', !!b.noTrans);
    const transDur = this.state.phase === 'bonus' ? this.scaleMs(450) + 'ms' : '';
    if (el._lastTransDur !== transDur) {
      el.style.transitionDuration = transDur;
      el._lastTransDur = transDur;
    }

    const body = el._body;
    const anim = b.anim || 'none';
    if (el._lastAnim !== anim) {
      body.style.animation = anim;
      el._lastAnim = anim;
    }

    if (b.special === 'bomb') {
      body.style.background = 'radial-gradient(circle at 33% 28%, #6b6b7a 0%, #33333f 55%, #131318 100%)';
      el._gloss.style.display = 'none';
      el._accWrap.style.display = 'none';
      el._eyesWrap.style.display = 'none';
      el._mouthWrap.style.display = 'none';
      if (!el._bombIcon) {
        const ic = document.createElement('div');
        ic.className = 'bomb-icon';
        ic.textContent = '💣';
        body.appendChild(ic);
        el._bombIcon = ic;
      }
      el._bombIcon.style.display = 'flex';
      el._lastSpecial = true;
      return;
    }

    if (el._bombIcon) el._bombIcon.style.display = 'none';
    el._gloss.style.display = '';
    el._accWrap.style.display = '';
    el._eyesWrap.style.display = '';
    el._mouthWrap.style.display = '';

    const pal = PAL[b.color];
    body.style.background = `radial-gradient(circle at 33% 28%, ${pal.hi} 0%, ${pal.c1} 42%, ${pal.c2} 100%)`;

    if (el._lastColor !== b.color || el._lastSpecial) {
      el._accWrap.innerHTML = '';
      this.accessoryNodes(b.color).forEach(node => {
        node.style.background = pal.c2;
        el._accWrap.appendChild(node);
      });
      el._mouthWrap.innerHTML = '';
      el._mouthWrap.appendChild(this.mouthNode(b.color));
      for (const eye of el._eyesWrap.children) eye.classList.toggle('ring', b.color === 4);
      el._lastColor = b.color;
      el._lastSpecial = false;
    }

    const blinkAnim = `blink ${b.blink} infinite`;
    if (el._lastBlink !== blinkAnim) {
      el._eyesWrap.style.animation = blinkAnim;
      el._lastBlink = blinkAnim;
    }
  }

  spawnParticles(parts) {
    if (!this._particleEls) this._particleEls = new Map();
    parts.forEach(p => {
      const el = document.createElement('div');
      el.className = 'particle';
      el.style.left = p.l + '%';
      el.style.top = p.t + '%';
      el.style.width = p.s + 'px';
      el.style.height = p.s + 'px';
      el.style.background = p.c;
      el.style.setProperty('--dx', p.dx + 'px');
      el.style.setProperty('--dy', p.dy + 'px');
      el.style.animationDelay = p.d + 'ms';
      this.board.appendChild(el);
      this._particleEls.set(p.id, el);
    });
  }
  cleanupParticles(ids) {
    if (!this._particleEls) return;
    ids.forEach(id => {
      const el = this._particleEls.get(id);
      if (el) el.remove();
      this._particleEls.delete(id);
    });
  }

  updateCombo() {
    const existing = this.board.querySelector('.combo-text');
    if (existing) existing.remove();
    const combo = this.state.combo;
    if (!combo) return;
    const el = document.createElement('div');
    el.className = 'combo-text';
    el.style.left = combo.x + '%';
    el.style.top = combo.y + '%';
    el.textContent = combo.text;
    this.board.appendChild(el);
  }

  updateToast() {
    const existing = this.board.querySelector('.toast');
    if (existing) existing.remove();
    if (!this.state.toast) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = this.state.toast;
    this.board.appendChild(el);
  }

  renderHud() {
    const s = this.state;
    const t = this.level.target;
    if (t.type === 'color') {
      this.els.clearedValue.textContent = `${s.cleared}/${t.count}`;
      this.els.progressFill.style.width = Math.min(100, t.count ? s.cleared / t.count * 100 : 0).toFixed(1) + '%';
    } else {
      this.els.clearedValue.textContent = `${Math.min(s.score, t.count).toLocaleString()}/${t.count.toLocaleString()}`;
      this.els.progressFill.style.width = Math.min(100, t.count ? s.score / t.count * 100 : 0).toFixed(1) + '%';
    }
    this.els.movesValue.textContent = s.moves;
    const low = s.moves <= 5 && s.phase === 'play';
    this.els.movesValue.classList.toggle('low', low);
    this.els.scoreValue.textContent = s.score.toLocaleString();
    if (s.best) {
      this.els.chipBest.textContent = `Best ${s.best.score.toLocaleString()}`;
      this.els.chipBest.hidden = false;
    } else {
      this.els.chipBest.hidden = true;
    }
  }

  showWin() {
    const s = this.state;
    this.els.winStars.innerHTML = '';
    [1, 2, 3].forEach(k => {
      const star = document.createElement('span');
      star.className = 'star' + (k <= s.stars ? ' earned' : '');
      star.style.animationDelay = (200 + k * 220) + 'ms';
      star.textContent = '★';
      this.els.winStars.appendChild(star);
    });
    this.els.winScore.textContent = `Score ${s.score.toLocaleString()}`;
    if (s.best) {
      this.els.winBest.textContent = `Best: ${s.best.score.toLocaleString()} · ${s.best.stars}★`;
      this.els.winBest.hidden = false;
    } else {
      this.els.winBest.hidden = true;
    }
    const nextLocked = this.levelNum >= TOTAL_LEVELS || isLocked(this.levelNum + 1, loadProgress());
    this.els.winNextBtn.textContent = nextLocked ? 'Levels' : 'Next level';
    this.els.winOverlay.hidden = false;
  }

  showLose() {
    const s = this.state;
    const t = this.level.target;
    this.els.loseSub.textContent = t.type === 'color'
      ? `You cleared ${s.cleared} of ${t.count} ${PAL[t.color].name.toLowerCase()} blobs`
      : `You scored ${s.score.toLocaleString()} of ${t.count.toLocaleString()}`;
    this.els.loseScore.textContent = `Score ${s.score.toLocaleString()}`;
    this.els.loseOverlay.hidden = false;
  }
}
