/*
 * Sciame Nebulare — sistema di punti.
 * Solo funzioni pure: nessun accesso a DOM, orologio o storage.
 * I tempi sono in millisecondi del "tempo di gioco" (che si ferma in pausa).
 * Funziona sia nel browser (window.Scoring) sia in Node (require).
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.Scoring = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // 1. Punteggio base per tipo di nemico (moltiplicato per l'ondata e per la combo)
  const ENEMY_BASE = Object.freeze({ drone: 10, stalker: 20, warden: 40 });

  // 2. Combo
  const COMBO_WINDOW_MS = 1500;
  const COMBO_MAX = 5;

  // 3. Precisione: soglie dalla più alta alla più bassa (punti × ondata)
  const ACCURACY_TIERS = Object.freeze([
    Object.freeze({ percent: 90, points: 1500 }),
    Object.freeze({ percent: 75, points: 800 }),
    Object.freeze({ percent: 50, points: 300 }),
  ]);

  // 4–6. Bonus di fine ondata
  const TARGET_TIME_START_MS = 60000;
  const TARGET_TIME_STEP_MS = 3000;
  const TARGET_TIME_MIN_MS = 30000;
  const TIME_POINTS_PER_SECOND = 25;
  const NO_DAMAGE_POINTS = 1000;
  const SHIELD_BLOCK_POINTS = 5;

  // 7. Nave misteriosa: il valore dipende dai colpi sparati nell'ondata
  const MYSTERY_TABLE = Object.freeze([100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100, 50]);
  const MYSTERY_EASTER_EGG_EVERY = 23;
  const MYSTERY_EASTER_EGG_POINTS = 1000;

  // 8. Penalità colpi a vuoto
  const MISS_FREE_SHOTS = 20;
  const MISS_PENALTY = 10;

  // 9. Vite extra
  const FIRST_EXTRA_LIFE = 10000;
  const EXTRA_LIFE_STEP = 25000;

  function toCount(n) {
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  function toWave(wave) {
    return Math.max(1, toCount(wave));
  }

  function killPoints(type, wave, multiplier) {
    const base = ENEMY_BASE[type];
    if (base === undefined) throw new Error('Tipo di nemico sconosciuto: ' + type);
    const m = Math.min(COMBO_MAX, Math.max(1, toCount(multiplier)));
    return base * toWave(wave) * m;
  }

  function createCombo() {
    return { multiplier: 1, lastKillAt: null, chain: 0 };
  }

  function isComboActive(combo, now) {
    return combo.lastKillAt !== null && now - combo.lastKillAt <= COMBO_WINDOW_MS;
  }

  // Ogni uccisione entro la finestra dalla precedente alza il moltiplicatore di 1 (fino a x5)
  function registerKill(combo, now) {
    const chained = isComboActive(combo, now);
    return {
      multiplier: chained ? Math.min(COMBO_MAX, combo.multiplier + 1) : 1,
      lastKillAt: now,
      chain: chained ? combo.chain + 1 : 1,
    };
  }

  // Azzera la combo se è scaduta; altrimenti la restituisce invariata
  function expireCombo(combo, now) {
    return combo.lastKillAt !== null && !isComboActive(combo, now) ? createCombo() : combo;
  }

  // Colpito dal nemico: la combo si azzera
  function resetCombo() {
    return createCombo();
  }

  function comboRemaining(combo, now) {
    return isComboActive(combo, now) ? COMBO_WINDOW_MS - (now - combo.lastKillAt) : 0;
  }

  // Confronto con interi per evitare errori di arrotondamento sulle soglie esatte
  function accuracyBonus(hits, shots, wave) {
    const s = toCount(shots);
    const h = Math.min(toCount(hits), s);
    const tier = s === 0 ? undefined : ACCURACY_TIERS.find((t) => h * 100 >= t.percent * s);
    return {
      percent: s === 0 ? 0 : (h * 100) / s,
      threshold: tier ? tier.percent : 0,
      points: tier ? tier.points * toWave(wave) : 0,
    };
  }

  function targetTimeMs(wave) {
    return Math.max(TARGET_TIME_MIN_MS, TARGET_TIME_START_MS - (toWave(wave) - 1) * TARGET_TIME_STEP_MS);
  }

  // Punti per ogni secondo intero risparmiato rispetto al tempo obiettivo
  function timeBonus(elapsedMs, wave) {
    const target = targetTimeMs(wave);
    const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : target);
    if (elapsed >= target) return 0;
    return Math.floor((target - elapsed) / 1000) * TIME_POINTS_PER_SECOND * toWave(wave);
  }

  function noDamageBonus(damaged, wave) {
    return damaged ? 0 : NO_DAMAGE_POINTS * toWave(wave);
  }

  function shieldBonus(blocks, wave) {
    return toCount(blocks) * SHIELD_BLOCK_POINTS * toWave(wave);
  }

  function mysteryValue(shotsFired) {
    const s = toCount(shotsFired);
    if (s > 0 && s % MYSTERY_EASTER_EGG_EVERY === 0) return MYSTERY_EASTER_EGG_POINTS;
    return MYSTERY_TABLE[s % MYSTERY_TABLE.length];
  }

  // Penalità per il colpo mancato numero missCount dell'ondata
  function missPenalty(missCount) {
    return toCount(missCount) > MISS_FREE_SHOTS ? MISS_PENALTY : 0;
  }

  function totalMissPenalty(misses) {
    return Math.max(0, toCount(misses) - MISS_FREE_SHOTS) * MISS_PENALTY;
  }

  // Il punteggio non scende mai sotto zero
  function applyPenalty(score, penalty) {
    return Math.max(0, toCount(score) - toCount(penalty));
  }

  function extraLivesEarned(score) {
    const s = toCount(score);
    if (s < FIRST_EXTRA_LIFE) return 0;
    return 1 + Math.floor((s - FIRST_EXTRA_LIFE) / EXTRA_LIFE_STEP);
  }

  // Le vite già assegnate non si perdono né si riassegnano se il punteggio scende e risale
  function extraLivesToAward(score, alreadyAwarded) {
    return Math.max(0, extraLivesEarned(score) - toCount(alreadyAwarded));
  }

  function nextExtraLifeAt(alreadyAwarded) {
    return FIRST_EXTRA_LIFE + toCount(alreadyAwarded) * EXTRA_LIFE_STEP;
  }

  function summarizeWave(stats) {
    const wave = toWave(stats.wave);
    const accuracy = accuracyBonus(stats.hits, stats.shots, wave);
    const time = {
      elapsedMs: stats.elapsedMs,
      targetMs: targetTimeMs(wave),
      points: timeBonus(stats.elapsedMs, wave),
    };
    const noDamage = noDamageBonus(stats.damaged, wave);
    const shields = { blocks: toCount(stats.shieldBlocks), points: shieldBonus(stats.shieldBlocks, wave) };
    return {
      wave,
      accuracy,
      time,
      noDamage,
      shields,
      missPenalty: totalMissPenalty(stats.misses),
      total: accuracy.points + time.points + noDamage + shields.points,
    };
  }

  return Object.freeze({
    ENEMY_BASE,
    COMBO_WINDOW_MS,
    COMBO_MAX,
    ACCURACY_TIERS,
    MISS_FREE_SHOTS,
    MISS_PENALTY,
    FIRST_EXTRA_LIFE,
    EXTRA_LIFE_STEP,
    killPoints,
    createCombo,
    registerKill,
    expireCombo,
    resetCombo,
    comboRemaining,
    accuracyBonus,
    targetTimeMs,
    timeBonus,
    noDamageBonus,
    shieldBonus,
    mysteryValue,
    missPenalty,
    totalMissPenalty,
    applyPenalty,
    extraLivesEarned,
    extraLivesToAward,
    nextExtraLifeAt,
    summarizeWave,
  });
});
