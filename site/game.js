/*
 * Sciame Nebulare — logica di gioco e disegno su canvas.
 * Il punteggio è calcolato da scoring.js (window.Scoring).
 */
(function () {
  'use strict';

  const S = window.Scoring;
  const W = 480;
  const H = 640;
  const HUD_H = 44;

  const KEY_RECORD = 'sciameNebulare.record';
  const KEY_SETTINGS = 'sciameNebulare.settings';

  const ENEMY_W = 30;
  const ENEMY_H = 22;
  const GRID_COLS = 8;
  const GRID_ROWS = ['warden', 'stalker', 'stalker', 'drone', 'drone'];
  const GRID_DX = 46;
  const GRID_DY = 38;
  const ENEMY_COLORS = { drone: '#53f3c3', stalker: '#6fa8ff', warden: '#ff4fd8' };

  const PLAYER_W = 36;
  const PLAYER_H = 20;
  const PLAYER_Y = H - 64;
  const PLAYER_SPEED = 250;
  const BULLET_SPEED = 540;
  const FIRE_COOLDOWN = 0.22;
  const START_LIVES = 3;
  const INVULN_TIME = 1.6;

  const SHIELD_BLOCK = 5;
  const SHIELD_Y = H - 160;
  const SHIELD_MASK = [
    '..######..',
    '.########.',
    '##########',
    '##########',
    '###....###',
    '##......##',
  ];

  const MYSTERY_W = 42;
  const MYSTERY_H = 16;
  const MYSTERY_Y = HUD_H + 14;
  const MYSTERY_SPEED = 120;

  // ---------- Storage (solo record e impostazioni) ----------

  const store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        // storage non disponibile (navigazione privata, quota): si gioca senza salvare
      }
    },
  };

  function loadRecord() {
    const v = store.get(KEY_RECORD, 0);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }

  function loadSettings() {
    const v = store.get(KEY_SETTINGS, null);
    return { sound: !(v && v.sound === false) };
  }

  const settings = loadSettings();

  // ---------- Audio (WebAudio, creato al primo gesto dell'utente) ----------

  let audioCtx = null;

  function ensureAudio() {
    if (!settings.sound) return;
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {
      audioCtx = null;
    }
  }

  function beep(freq, dur, type, vol) {
    if (!settings.sound || !audioCtx || audioCtx.state !== 'running') return;
    try {
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {
      // audio non essenziale
    }
  }

  // ---------- DOM ----------

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const btnPause = document.getElementById('btn-pause');
  const btnSound = document.getElementById('btn-sound');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------- Stato ----------

  const stars = Array.from({ length: 70 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    speed: 10 + Math.random() * 40,
    size: Math.random() < 0.2 ? 2 : 1,
  }));

  const game = {
    state: 'title',
    clock: 0,
    score: 0,
    record: loadRecord(),
    recordAtStart: 0,
    lives: START_LIVES,
    wave: 1,
    extraAwarded: 0,
    combo: S.createCombo(),
    player: { x: W / 2, invuln: 0, cooldown: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    shields: [],
    popups: [],
    particles: [],
    dir: 1,
    enemyFireTimer: 1,
    mystery: null,
    mysteryTimer: 15,
    banner: null,
    stats: null,
    lastSummary: null,
  };

  const input = { left: false, right: false, fire: false, fireLocked: false };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function fmt(n) {
    return String(Math.floor(n)).padStart(6, '0');
  }

  // ---------- Costruzione ondata ----------

  function buildEnemies(wave) {
    const enemies = [];
    const startX = (W - ((GRID_COLS - 1) * GRID_DX + ENEMY_W)) / 2;
    const startY = HUD_H + 44 + Math.min(wave - 1, 6) * 10;
    GRID_ROWS.forEach((type, row) => {
      for (let col = 0; col < GRID_COLS; col++) {
        enemies.push({ type, col, x: startX + col * GRID_DX, y: startY + row * GRID_DY, w: ENEMY_W, h: ENEMY_H, alive: true });
      }
    });
    return enemies;
  }

  function buildShields() {
    const blocks = [];
    const width = SHIELD_MASK[0].length * SHIELD_BLOCK;
    for (let i = 0; i < 4; i++) {
      const left = Math.round((W * (i + 1)) / 5 - width / 2);
      SHIELD_MASK.forEach((line, r) => {
        for (let c = 0; c < line.length; c++) {
          if (line[c] === '#') {
            blocks.push({ x: left + c * SHIELD_BLOCK, y: SHIELD_Y + r * SHIELD_BLOCK, w: SHIELD_BLOCK, h: SHIELD_BLOCK, alive: true });
          }
        }
      });
    }
    return blocks;
  }

  function newGame() {
    game.score = 0;
    game.lives = START_LIVES;
    game.extraAwarded = 0;
    game.recordAtStart = game.record;
    startWave(1);
  }

  function startWave(wave) {
    game.wave = wave;
    game.enemies = buildEnemies(wave);
    game.shields = buildShields();
    game.bullets = [];
    game.enemyBullets = [];
    game.popups = [];
    game.mystery = null;
    game.mysteryTimer = rand(12, 20);
    game.enemyFireTimer = 1.2;
    game.dir = 1;
    game.combo = S.createCombo();
    game.player.x = W / 2;
    game.player.invuln = 0;
    game.player.cooldown = 0.3;
    game.stats = { shots: 0, hits: 0, misses: 0, startClock: game.clock, damaged: false };
    game.banner = { text: 'ONDATA ' + wave, color: '#e8ecff', life: 1.6 };
    setState('playing');
  }

  // ---------- Punteggio ----------

  function addScore(points) {
    game.score += points;
    const add = S.extraLivesToAward(game.score, game.extraAwarded);
    if (add > 0) {
      game.lives += add;
      game.extraAwarded += add;
      game.banner = { text: 'VITA EXTRA!', color: '#53f3c3', life: 1.8 };
      beep(660, 0.25, 'triangle', 0.06);
    }
  }

  // Il record è il punteggio a fine ondata o a fine partita (dopo le penalità)
  function saveRecord() {
    game.record = Math.max(game.record, game.score);
    if (game.record > loadRecord()) store.set(KEY_RECORD, game.record);
  }

  function popup(x, y, text, color, size) {
    game.popups.push({ x, y, text, color, size: size || 14, life: 1 });
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(40, 180);
      game.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.7), color });
    }
  }

  function registerMiss(x, y) {
    game.stats.misses++;
    const penalty = S.missPenalty(game.stats.misses);
    if (penalty > 0) {
      game.score = S.applyPenalty(game.score, penalty);
      popup(x, y, '-' + penalty, '#ff6b6b', 12);
    }
  }

  function killEnemy(e) {
    e.alive = false;
    game.stats.hits++;
    game.combo = S.registerKill(game.combo, game.clock);
    const mult = game.combo.multiplier;
    const pts = S.killPoints(e.type, game.wave, mult);
    addScore(pts);
    popup(e.x + e.w / 2, e.y, '+' + pts + (mult > 1 ? ' x' + mult : ''), mult > 1 ? '#ffd166' : '#e8ecff', 12 + mult * 2);
    burst(e.x + e.w / 2, e.y + e.h / 2, ENEMY_COLORS[e.type], 14);
    beep(220 + mult * 80, 0.12, 'sawtooth', 0.04);
  }

  function hitMystery() {
    const m = game.mystery;
    game.stats.hits++;
    const value = S.mysteryValue(game.stats.shots);
    addScore(value);
    popup(m.x + m.w / 2, m.y + m.h + 6, '+' + value, '#ffd166', 20);
    game.banner = {
      text: value >= 1000 ? 'NAVE MISTERIOSA — JACKPOT +' + value : 'NAVE MISTERIOSA +' + value,
      color: '#ffd166',
      life: 2.2,
    };
    burst(m.x + m.w / 2, m.y + m.h / 2, '#ffd166', 30);
    beep(990, 0.4, 'triangle', 0.06);
    game.mystery = null;
  }

  function playerHit() {
    game.lives--;
    game.stats.damaged = true;
    game.combo = S.resetCombo();
    game.player.invuln = INVULN_TIME;
    game.enemyBullets = [];
    burst(game.player.x, PLAYER_Y + PLAYER_H / 2, '#ff6b6b', 40);
    beep(110, 0.5, 'sawtooth', 0.08);
    if (game.lives <= 0) gameOver();
  }

  function endWave() {
    const aliveBlocks = game.shields.filter((b) => b.alive).length;
    const summary = S.summarizeWave({
      wave: game.wave,
      shots: game.stats.shots,
      hits: game.stats.hits,
      misses: game.stats.misses,
      elapsedMs: game.clock - game.stats.startClock,
      damaged: game.stats.damaged,
      shieldBlocks: aliveBlocks,
    });
    addScore(summary.total);
    saveRecord();
    game.lastSummary = summary;
    game.bullets = [];
    game.enemyBullets = [];
    game.mystery = null;
    setState('summary');
  }

  function gameOver() {
    game.lives = 0;
    saveRecord();
    setState('gameover');
  }

  // ---------- Stati e overlay ----------

  function setState(state) {
    game.state = state;
    btnPause.textContent = state === 'paused' ? 'Riprendi (P)' : 'Pausa (P)';
    if (state === 'playing') {
      overlay.hidden = true;
      overlay.innerHTML = '';
      return;
    }
    overlay.innerHTML = overlayHtml(state);
    overlay.hidden = false;
  }

  function overlayHtml(state) {
    if (state === 'title') {
      return (
        '<h1>SCIAME NEBULARE</h1>' +
        '<p>Respingi le ondate. Concatena le uccisioni entro 1,5 s per arrivare a x5.</p>' +
        '<p class="legend">' +
        '<span style="color:#ff4fd8">&#9632;</span> Guardiano 40 · ' +
        '<span style="color:#6fa8ff">&#9632;</span> Predatore 20 · ' +
        '<span style="color:#53f3c3">&#9632;</span> Drone 10 (× ondata)</p>' +
        '<p>Frecce / A D per muoverti · Spazio per sparare · P pausa · M audio</p>' +
        '<p>Record: ' + fmt(game.record) + '</p>' +
        '<p class="cta">Premi Spazio o tocca per iniziare</p>'
      );
    }
    if (state === 'paused') {
      return '<h2>PAUSA</h2><p class="cta">Premi P, Spazio o tocca per riprendere</p>';
    }
    if (state === 'summary') {
      const s = game.lastSummary;
      const secs = (ms) => (ms / 1000).toFixed(1) + ' s';
      const rows = [
        ['Precisione ' + Math.round(s.accuracy.percent) + '%' + (s.accuracy.threshold ? ' (soglia ' + s.accuracy.threshold + '%)' : ''), '+' + s.accuracy.points],
        ['Tempo ' + secs(s.time.elapsedMs) + ' / ' + secs(s.time.targetMs), '+' + s.time.points],
        ['Senza danni', '+' + s.noDamage],
        ['Scudi intatti: ' + s.shields.blocks + ' blocchi', '+' + s.shields.points],
      ];
      let html = '<h2>ONDATA ' + s.wave + ' COMPLETATA</h2><table>';
      rows.forEach((r) => {
        html += '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>';
      });
      if (s.missPenalty > 0) {
        html += '<tr class="neg"><td>Colpi a vuoto (già scalati)</td><td>-' + s.missPenalty + '</td></tr>';
      }
      html += '<tr class="total"><td>Bonus ondata</td><td>+' + s.total + '</td></tr>';
      html += '<tr><td>Punteggio</td><td>' + fmt(game.score) + '</td></tr></table>';
      html += '<p class="cta">Spazio o tocca per l\'ondata ' + (s.wave + 1) + '</p>';
      return html;
    }
    // gameover
    const isRecord = game.score > 0 && game.score > game.recordAtStart;
    return (
      '<h2>FINE PARTITA</h2>' +
      '<p class="big">' + fmt(game.score) + '</p>' +
      (isRecord ? '<p class="new-record">Nuovo record!</p>' : '<p>Record: ' + fmt(game.record) + '</p>') +
      '<p>Ondata raggiunta: ' + game.wave + '</p>' +
      '<p class="cta">Spazio o tocca per rigiocare</p>'
    );
  }

  function primaryAction() {
    ensureAudio();
    input.fireLocked = true;
    if (game.state === 'title' || game.state === 'gameover') newGame();
    else if (game.state === 'summary') startWave(game.wave + 1);
    else if (game.state === 'paused') setState('playing');
  }

  function togglePause() {
    if (game.state === 'playing') setState('paused');
    else if (game.state === 'paused') setState('playing');
  }

  function toggleSound() {
    settings.sound = !settings.sound;
    store.set(KEY_SETTINGS, settings);
    updateSoundButton();
    if (settings.sound) ensureAudio();
  }

  function updateSoundButton() {
    btnSound.textContent = 'Audio: ' + (settings.sound ? 'sì' : 'no') + ' (M)';
  }

  // ---------- Aggiornamento ----------

  function update(dt) {
    for (const s of stars) {
      s.y += s.speed * dt;
      if (s.y > H) {
        s.y = 0;
        s.x = Math.random() * W;
      }
    }
    updateEffects(dt);
    if (game.state !== 'playing') return;

    game.clock += dt * 1000;
    const p = game.player;

    // Giocatore
    const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.x = Math.min(W - PLAYER_W / 2 - 6, Math.max(PLAYER_W / 2 + 6, p.x + move * PLAYER_SPEED * dt));
    p.cooldown -= dt;
    p.invuln = Math.max(0, p.invuln - dt);
    if (!input.fire) input.fireLocked = false;
    if (input.fire && !input.fireLocked && p.cooldown <= 0 && game.bullets.length === 0) {
      game.bullets.push({ x: p.x - 1.5, y: PLAYER_Y - 12, w: 3, h: 12 });
      game.stats.shots++;
      p.cooldown = FIRE_COOLDOWN;
      beep(880, 0.07, 'square', 0.03);
    }

    updateFormation(dt);
    if (game.state !== 'playing') return;
    updateEnemyFire(dt);
    updateMystery(dt);
    updatePlayerBullets(dt);
    updateEnemyBullets(dt);
    if (game.state !== 'playing') return;

    game.combo = S.expireCombo(game.combo, game.clock);

    if (!game.enemies.some((e) => e.alive)) endWave();
  }

  function updateFormation(dt) {
    const alive = game.enemies.filter((e) => e.alive);
    if (alive.length === 0) return;
    const fraction = alive.length / game.enemies.length;
    const speed = (22 + game.wave * 4) * (1 + (1 - fraction) * 3);
    const dx = game.dir * speed * dt;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const e of alive) {
      minX = Math.min(minX, e.x);
      maxX = Math.max(maxX, e.x + e.w);
    }
    if (maxX + dx > W - 10 || minX + dx < 10) {
      game.dir *= -1;
      for (const e of alive) e.y += 14;
    } else {
      for (const e of alive) e.x += dx;
    }

    for (const e of alive) {
      if (e.y + e.h >= SHIELD_Y) {
        for (const b of game.shields) if (b.alive && overlaps(e, b)) b.alive = false;
      }
      if (e.y + e.h >= PLAYER_Y) {
        gameOver();
        return;
      }
    }
  }

  function updateEnemyFire(dt) {
    game.enemyFireTimer -= dt;
    const maxBullets = 2 + Math.min(game.wave, 4);
    if (game.enemyFireTimer > 0 || game.enemyBullets.length >= maxBullets) return;
    game.enemyFireTimer = rand(0.35, Math.max(0.6, 1.3 - game.wave * 0.08));
    const lowest = new Map();
    for (const e of game.enemies) {
      if (!e.alive) continue;
      const cur = lowest.get(e.col);
      if (!cur || e.y > cur.y) lowest.set(e.col, e);
    }
    const shooters = Array.from(lowest.values());
    if (shooters.length === 0) return;
    const e = shooters[Math.floor(Math.random() * shooters.length)];
    game.enemyBullets.push({ x: e.x + e.w / 2 - 2, y: e.y + e.h, w: 4, h: 10, vy: 170 + game.wave * 12 });
  }

  function updateMystery(dt) {
    const m = game.mystery;
    if (m) {
      m.x += m.dir * MYSTERY_SPEED * dt;
      if (m.x > W + 60 || m.x < -60 - m.w) game.mystery = null;
      return;
    }
    game.mysteryTimer -= dt;
    if (game.mysteryTimer <= 0 && game.enemies.filter((e) => e.alive).length > 4) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      game.mystery = { x: dir > 0 ? -MYSTERY_W : W, y: MYSTERY_Y, w: MYSTERY_W, h: MYSTERY_H, dir };
      game.mysteryTimer = rand(16, 26);
      beep(520, 0.3, 'sine', 0.03);
    }
  }

  function updatePlayerBullets(dt) {
    const kept = [];
    for (const b of game.bullets) {
      b.y -= BULLET_SPEED * dt;
      const enemy = game.enemies.find((e) => e.alive && overlaps(b, e));
      if (enemy) {
        killEnemy(enemy);
        continue;
      }
      if (game.mystery && overlaps(b, game.mystery)) {
        hitMystery();
        continue;
      }
      const block = game.shields.find((s) => s.alive && overlaps(b, s));
      if (block) {
        block.alive = false;
        registerMiss(b.x, b.y);
        continue;
      }
      if (b.y + b.h < HUD_H) {
        registerMiss(b.x, HUD_H + 10);
        continue;
      }
      kept.push(b);
    }
    game.bullets = kept;
  }

  function updateEnemyBullets(dt) {
    const p = game.player;
    const playerBox = { x: p.x - PLAYER_W / 2 + 4, y: PLAYER_Y + 4, w: PLAYER_W - 8, h: PLAYER_H - 4 };
    const kept = [];
    for (const b of game.enemyBullets) {
      b.y += b.vy * dt;
      const block = game.shields.find((s) => s.alive && overlaps(b, s));
      if (block) {
        block.alive = false;
        // erosione: a volte cade anche il blocco sotto
        const below = game.shields.find((s) => s.alive && s.x === block.x && s.y === block.y + SHIELD_BLOCK);
        if (below && Math.random() < 0.5) below.alive = false;
        continue;
      }
      if (p.invuln <= 0 && overlaps(b, playerBox)) {
        playerHit();
        return;
      }
      if (b.y < H) kept.push(b);
    }
    game.enemyBullets = kept;
  }

  function updateEffects(dt) {
    for (const pt of game.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    game.particles = game.particles.filter((pt) => pt.life > 0);
    for (const pp of game.popups) {
      pp.y -= 32 * dt;
      pp.life -= dt;
    }
    game.popups = game.popups.filter((pp) => pp.life > 0);
    if (game.banner) {
      game.banner.life -= dt;
      if (game.banner.life <= 0) game.banner = null;
    }
  }

  // ---------- Disegno ----------

  function drawEnemy(e, frame) {
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    const color = ENEMY_COLORS[e.type];
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (e.type === 'drone') {
      // drone: cuneo rovesciato con occhio e alette che sbattono
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy - 7);
      ctx.lineTo(cx + 11, cy - 7);
      ctx.lineTo(cx, cy + 9);
      ctx.closePath();
      ctx.fill();
      const flap = frame ? -4 : 2;
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy - 6);
      ctx.lineTo(cx - 16, cy + flap);
      ctx.moveTo(cx + 11, cy - 6);
      ctx.lineTo(cx + 16, cy + flap);
      ctx.stroke();
      ctx.fillStyle = '#05060f';
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'stalker') {
      // predatore: esagono con antenne curve e zampe alternate
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        ctx.lineTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 9);
      }
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 8);
      ctx.quadraticCurveTo(cx - 10, cy - 14, cx - 13, cy - 10);
      ctx.moveTo(cx + 4, cy - 8);
      ctx.quadraticCurveTo(cx + 10, cy - 14, cx + 13, cy - 10);
      const leg = frame ? 4 : -2;
      ctx.moveTo(cx - 7, cy + 6);
      ctx.lineTo(cx - 12 - leg, cy + 11);
      ctx.moveTo(cx + 7, cy + 6);
      ctx.lineTo(cx + 12 + leg, cy + 11);
      ctx.stroke();
      ctx.fillStyle = '#05060f';
      ctx.fillRect(cx - 5, cy - 2, 3, 3);
      ctx.fillRect(cx + 2, cy - 2, 3, 3);
    } else {
      // guardiano: guscio corazzato con tre occhi e aculei pulsanti
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy + 4);
      ctx.quadraticCurveTo(cx - 14, cy - 10, cx, cy - 10);
      ctx.quadraticCurveTo(cx + 14, cy - 10, cx + 14, cy + 4);
      ctx.closePath();
      ctx.fill();
      const spike = frame ? 9 : 6;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(cx + i * 6 - 2, cy + 4);
        ctx.lineTo(cx + i * 6, cy + 4 + spike);
        ctx.lineTo(cx + i * 6 + 2, cy + 4);
      }
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * 6, cy - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawMystery(m) {
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2;
    ctx.fillStyle = 'rgba(255, 209, 102, 0.25)';
    ctx.fillRect(m.dir > 0 ? m.x - 30 : m.x + m.w, cy - 2, 30, 4);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(cx - m.w / 2, cy);
    ctx.lineTo(cx - 8, cy - m.h / 2);
    ctx.lineTo(cx + 8, cy - m.h / 2);
    ctx.lineTo(cx + m.w / 2, cy);
    ctx.lineTo(cx + 8, cy + m.h / 2);
    ctx.lineTo(cx - 8, cy + m.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#05060f';
    ctx.font = 'bold 11px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', cx, cy + 1);
  }

  function drawShip(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#53f3c3';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(18, 10);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 10);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-18, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff4fd8';
    ctx.beginPath();
    ctx.arc(0, 1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHud() {
    ctx.fillStyle = 'rgba(8, 10, 28, 0.9)';
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = '#1d2252';
    ctx.fillRect(0, HUD_H - 1, W, 1);

    ctx.font = 'bold 13px ui-monospace, Menlo, Consolas, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#e8ecff';
    ctx.textAlign = 'left';
    ctx.fillText('PUNTI ' + fmt(game.score), 10, 7);
    ctx.textAlign = 'center';
    ctx.fillText('ONDATA ' + game.wave, W / 2, 7);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8b93c7';
    ctx.fillText('REC ' + fmt(Math.max(game.record, game.score)), W - 10, 7);

    // moltiplicatore con barra del tempo residuo della combo
    const mult = game.combo.multiplier;
    ctx.textAlign = 'left';
    ctx.fillStyle = mult > 1 ? '#ffd166' : '#8b93c7';
    ctx.fillText('x' + mult, 10, 25);
    const remaining = S.comboRemaining(game.combo, game.clock) / S.COMBO_WINDOW_MS;
    ctx.fillStyle = '#1d2252';
    ctx.fillRect(34, 28, 80, 6);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(34, 28, 80 * remaining, 6);

    ctx.fillStyle = '#8b93c7';
    ctx.textAlign = 'center';
    ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText('vita extra a ' + S.nextExtraLifeAt(game.extraAwarded), W / 2, 26);

    const shown = Math.min(game.lives, 6);
    for (let i = 0; i < shown; i++) drawShip(W - 18 - i * 22, 32, 0.5);
    if (game.lives > shown) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e8ecff';
      ctx.fillText('+' + (game.lives - shown), W - 18 - shown * 22, 26);
    }
  }

  function render() {
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, W, H);

    for (const s of stars) {
      ctx.fillStyle = s.speed > 35 ? '#8b93c7' : '#3a4080';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    if (game.state !== 'title') {
      ctx.fillStyle = '#53f3c3';
      for (const b of game.shields) if (b.alive) ctx.fillRect(b.x, b.y, b.w - 0.5, b.h - 0.5);

      const frame = Math.floor(game.clock / 450) % 2;
      for (const e of game.enemies) if (e.alive) drawEnemy(e, frame);
      if (game.mystery) drawMystery(game.mystery);

      const p = game.player;
      const blink = p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0;
      if (game.lives > 0 && !blink) drawShip(p.x, PLAYER_Y + PLAYER_H / 2, 1);

      ctx.fillStyle = '#e8ecff';
      for (const b of game.bullets) ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#ff6b6b';
      for (const b of game.enemyBullets) {
        const zig = Math.floor(b.y / 6) % 2 ? 1 : -1;
        ctx.fillRect(b.x + zig, b.y, b.w, b.h / 2);
        ctx.fillRect(b.x - zig, b.y + b.h / 2, b.w, b.h / 2);
      }

      ctx.fillStyle = '#1d2252';
      ctx.fillRect(0, H - 30, W, 2);
    }

    for (const pt of game.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pt.life * 2));
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, 2, 2);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const pp of game.popups) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pp.life * 1.5));
      ctx.fillStyle = pp.color;
      ctx.font = 'bold ' + pp.size + 'px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText(pp.text, pp.x, pp.y);
    }
    ctx.globalAlpha = 1;

    if (game.banner && game.state === 'playing') {
      ctx.globalAlpha = Math.min(1, game.banner.life);
      ctx.fillStyle = game.banner.color;
      ctx.font = 'bold 18px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText(game.banner.text, W / 2, H / 2 + 40);
      ctx.globalAlpha = 1;
    }

    drawHud();
  }

  // ---------- Input ----------

  const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'fire' };

  window.addEventListener('keydown', (ev) => {
    ensureAudio();
    const action = KEYMAP[ev.code];
    if (action || ev.code === 'Enter') ev.preventDefault();
    if (ev.code === 'KeyP' || ev.code === 'Escape') {
      togglePause();
      return;
    }
    if (ev.code === 'KeyM') {
      toggleSound();
      return;
    }
    if ((ev.code === 'Space' || ev.code === 'Enter') && game.state !== 'playing' && !ev.repeat) {
      primaryAction();
    }
    if (action) input[action] = true;
  });

  window.addEventListener('keyup', (ev) => {
    const action = KEYMAP[ev.code];
    if (action) input[action] = false;
  });

  window.addEventListener('blur', () => {
    input.left = input.right = input.fire = false;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing') setState('paused');
  });

  overlay.addEventListener('click', primaryAction);

  document.querySelectorAll('[data-hold]').forEach((btn) => {
    const action = btn.dataset.hold;
    const press = (ev) => {
      ev.preventDefault();
      ensureAudio();
      if (action === 'fire' && game.state !== 'playing' && game.state !== 'paused') {
        primaryAction();
      }
      input[action] = true;
      btn.classList.add('active');
      if (btn.setPointerCapture && ev.pointerId !== undefined) {
        try {
          btn.setPointerCapture(ev.pointerId);
        } catch (e) {
          // cattura non supportata
        }
      }
    };
    const release = () => {
      input[action] = false;
      btn.classList.remove('active');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    btn.addEventListener('contextmenu', (ev) => ev.preventDefault());
  });

  btnPause.addEventListener('click', () => {
    ensureAudio();
    togglePause();
  });
  btnSound.addEventListener('click', toggleSound);

  // ---------- Avvio ----------

  window.addEventListener('resize', resize);
  resize();
  updateSoundButton();
  setState('title');

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // aggancio per i test automatici nel browser
  window.__sciame = game;
})();
