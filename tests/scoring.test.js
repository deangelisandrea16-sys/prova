'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../site/scoring.js');

test('punteggio base per tipo, moltiplicato per ondata e combo', () => {
  assert.equal(S.killPoints('drone', 1, 1), 10);
  assert.equal(S.killPoints('stalker', 1, 1), 20);
  assert.equal(S.killPoints('warden', 1, 1), 40);
  assert.equal(S.killPoints('warden', 3, 2), 240);
  assert.equal(S.killPoints('drone', 1, 9), 50, 'moltiplicatore limitato a x5');
  assert.throws(() => S.killPoints('ignoto', 1, 1));
});

test('combo: uccisioni entro 1,5 s alzano il moltiplicatore da x1 a x5', () => {
  let c = S.createCombo();
  const seen = [];
  for (let i = 0; i < 7; i++) {
    c = S.registerKill(c, i * 1000);
    seen.push(c.multiplier);
  }
  assert.deepEqual(seen, [1, 2, 3, 4, 5, 5, 5]);
});

test('combo: il limite di 1,5 s è incluso', () => {
  let c = S.registerKill(S.createCombo(), 0);
  c = S.registerKill(c, 1500);
  assert.equal(c.multiplier, 2);
});

test('combo: scade dopo 1,5 s senza uccisioni', () => {
  let c = S.registerKill(S.createCombo(), 0);
  c = S.registerKill(c, 1000);
  assert.equal(c.multiplier, 2);
  assert.equal(S.expireCombo(c, 2500), c, 'ancora attiva al limite');
  assert.equal(S.expireCombo(c, 2501).multiplier, 1);
  assert.equal(S.registerKill(c, 2501).multiplier, 1, 'uccisione tardiva riparte da x1');
  assert.equal(S.comboRemaining(c, 1500), 1000);
  assert.equal(S.comboRemaining(c, 3000), 0);
});

test('combo: si azzera quando il giocatore viene colpito', () => {
  let c = S.registerKill(S.createCombo(), 0);
  c = S.registerKill(c, 100);
  c = S.registerKill(c, 200);
  assert.equal(c.multiplier, 3);
  c = S.resetCombo();
  assert.equal(S.registerKill(c, 300).multiplier, 1);
});

test('precisione: soglie al 50, 75 e 90%', () => {
  assert.equal(S.accuracyBonus(0, 0, 1).points, 0, 'nessun colpo sparato');
  assert.equal(S.accuracyBonus(49, 100, 1).points, 0);
  assert.equal(S.accuracyBonus(50, 100, 1).points, 300);
  assert.equal(S.accuracyBonus(74, 100, 1).points, 300);
  assert.equal(S.accuracyBonus(3, 4, 1).points, 800);
  assert.equal(S.accuracyBonus(89, 100, 1).points, 800);
  assert.equal(S.accuracyBonus(9, 10, 1).points, 1500);
  assert.equal(S.accuracyBonus(10, 10, 2).points, 3000, 'scala con l\'ondata');
  assert.equal(S.accuracyBonus(9, 10, 1).threshold, 90);
  assert.equal(S.accuracyBonus(20, 10, 1).percent, 100, 'colpi a segno limitati ai colpi sparati');
});

test('penalità: -10 solo oltre 20 colpi a vuoto', () => {
  assert.equal(S.missPenalty(20), 0);
  assert.equal(S.missPenalty(21), 10);
  assert.equal(S.totalMissPenalty(20), 0);
  assert.equal(S.totalMissPenalty(25), 50);
});

test('penalità: il punteggio non scende mai sotto zero', () => {
  assert.equal(S.applyPenalty(100, 10), 90);
  assert.equal(S.applyPenalty(5, 10), 0);
  assert.equal(S.applyPenalty(0, 10), 0);
  let score = 15;
  for (let miss = 1; miss <= 30; miss++) score = S.applyPenalty(score, S.missPenalty(miss));
  assert.equal(score, 0);
});

test('vite extra a 10.000 e poi ogni 25.000', () => {
  assert.equal(S.extraLivesEarned(9999), 0);
  assert.equal(S.extraLivesEarned(10000), 1);
  assert.equal(S.extraLivesEarned(34999), 1);
  assert.equal(S.extraLivesEarned(35000), 2);
  assert.equal(S.extraLivesEarned(60000), 3);
  assert.equal(S.nextExtraLifeAt(0), 10000);
  assert.equal(S.nextExtraLifeAt(2), 60000);
});

test('vite extra: nessuna doppia assegnazione se il punteggio scende e risale', () => {
  let awarded = 0;
  awarded += S.extraLivesToAward(10000, awarded);
  assert.equal(awarded, 1);
  awarded += S.extraLivesToAward(9990, awarded);
  awarded += S.extraLivesToAward(10010, awarded);
  assert.equal(awarded, 1);
  assert.equal(S.extraLivesToAward(70000, awarded), 2, 'salto di più soglie in una volta');
});

test('bonus tempo, senza danni e scudi', () => {
  assert.equal(S.targetTimeMs(1), 60000);
  assert.equal(S.targetTimeMs(50), 30000);
  assert.equal(S.timeBonus(60000, 1), 0);
  assert.equal(S.timeBonus(50500, 1), 9 * 25);
  assert.equal(S.timeBonus(30000, 2), 27 * 25 * 2);
  assert.equal(S.noDamageBonus(false, 2), 2000);
  assert.equal(S.noDamageBonus(true, 2), 0);
  assert.equal(S.shieldBonus(10, 3), 150);
});

test('nave misteriosa: valore in base ai colpi sparati', () => {
  assert.equal(S.mysteryValue(8), 300);
  assert.equal(S.mysteryValue(23), 1000);
  assert.equal(S.mysteryValue(46), 1000);
  assert.equal(S.mysteryValue(0), 100);
  for (let s = 0; s < 100; s++) assert.ok(S.mysteryValue(s) >= 50);
});

test('riepilogo ondata somma i bonus', () => {
  const r = S.summarizeWave({
    wave: 1, shots: 40, hits: 36, misses: 4, elapsedMs: 40000, damaged: false, shieldBlocks: 100,
  });
  assert.equal(r.accuracy.points, 1500);
  assert.equal(r.time.points, 500);
  assert.equal(r.noDamage, 1000);
  assert.equal(r.shields.points, 500);
  assert.equal(r.missPenalty, 0);
  assert.equal(r.total, 3500);
});
