/* Isola di Sire — regno isometrico [PROVA]
   Modelli: KayKit Medieval Hexagon + Adventurers (Kay Lousberg, CC0); drago e cervo di Quaternius (CC0). */
(function () {
"use strict";
const $ = (id) => document.getElementById(id);
function fail(msg) { const d = document.createElement('div'); d.className = 'err'; d.textContent = msg; document.body.appendChild(d); $('veil').hidden = true; }
if (!window.THREE || !THREE.GLTFLoader) { fail('Non riesco a caricare il motore 3D. Controlla la connessione e ricarica.'); return; }

/* ================= dati demo [PROVA] ================= */
const STATI = {
  lavora:   { t: 'Al lavoro',      col: 0x5fbf4a },
  bloccato: { t: 'Serve te',       col: 0xe2513a },
  cantiere: { t: 'In costruzione', col: 0xe8b13a },
  riposo:   { t: 'A riposo',       col: 0x9aa3ad },
};
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // quadrati: i 4 lati
const DIR8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]; // anche le diagonali (percorsi, strade, recinti)
const AG = {
  sire:       { nome: 'Sire',       liv: 8,  hex: [0, 0],  model: 'building_castle_blue',   stato: 'lavora', ruolo: 'La capitale. Qui arrivano i report degli agenti e il riassunto del giorno. Tocca lo stemma in alto per sentire il Sire.', kpi: { 'Agenti al lavoro': '5 su 6', 'Report oggi': '14' } },
  preventivi: { nome: 'Preventivi', liv: 5,  hex: [4, -4], model: 'building_market_blue',   stato: 'lavora', ruolo: 'Prepara e segue i preventivi.', kpi: { 'Aperti': '4', 'Accettati nel mese': '2', 'Valore aperto': '€ 18.400' } },
  fatture:    { nome: 'Fatture',    liv: 6,  hex: [4, 0],  model: 'building_mine_blue',     stato: 'lavora', ruolo: 'Emette le fatture e controlla gli incassi. La miniera è il tesoro.', kpi: { 'Incassato nel mese': '€ 21.900', 'Scadute': '1' } },
  contatti:   { nome: 'Contatti',   liv: 5,  hex: [0, 4],  model: 'building_tavern_blue',   stato: 'riposo', ruolo: 'Ricorda i clienti e segnala chi è in silenzio da troppo.', kpi: { 'Clienti': '12', 'Silenziosi > 21 g': '2' } },
  outreach:   { nome: 'Outreach',   liv: 4,  hex: [-4, 4], model: 'building_tower_A_blue',  stato: 'bloccato', ruolo: 'Cerca nuovi clienti e scrive i primi messaggi.', kpi: { 'Contatti in coda': '24', 'Risposte': '4' },
                blocco: { cosa: 'Approva il nuovo modello di mail', come: 'Rispondi APPROVA su Telegram' } },
  cervello:   { nome: 'Cervello',   liv: 9,  hex: [-4, 0], model: 'building_church_blue',   stato: 'lavora', ruolo: 'Impara dalle tue correzioni e salva le regole.', kpi: { 'Regole': '48', 'Nuove questa settimana': '6' } },
  costi:      { nome: 'Costi',      liv: 3,  hex: [2, -6], model: 'building_mine_blue',     stato: 'lavora', ruolo: 'Il registro delle spese: abbonamenti fissi e servizi a consumo, con i limiti di budget.', kpi: {} },
  jarvis:     { nome: 'Jarvis',     liv: 10, hex: [0, -4], model: 'building_windmill_blue', stato: 'lavora', ruolo: 'Il motore: ascolta Telegram e smista il lavoro agli agenti. Il mulino gira quando è attivo.', kpi: { 'Messaggi oggi': '23', 'Ultima risposta': '2 min fa' } },
};
const ORDER = ['sire', 'jarvis', 'preventivi', 'fatture', 'contatti', 'outreach', 'cervello', 'costi'];
// spese del regno [PROVA]: fonte vera reports/costi.json (stessa forma). importi in euro al mese; i servizi a consumo hanno uso e limite
const COSTI = { mese: 'Ottobre 2026', budget: 450, aggiornato: 'oggi 11:00',
  fissi: [ { nome: 'Claude (abbonamento)', euro: 108, rinnovo: '12 nov' }, { nome: 'Google AI Pro', euro: 21.99, rinnovo: '3 nov' }, { nome: 'ChatGPT Plus', euro: 23, rinnovo: '20 nov' },
    { nome: 'Cloudflare Workers', euro: 5, rinnovo: '1 nov' }, { nome: 'Dominio', euro: 1.25, rinnovo: 'annuale' } ],
  consumo: [ { nome: 'API Anthropic', euro: 38.4, uso: '2,1 M token', limite: 80 }, { nome: 'Trascrizione voce', euro: 6.1, uso: '310 min', limite: 20 },
    { nome: 'Resend (email)', euro: 0, uso: '420 / 3.000 email', limite: 20 }, { nome: 'Supabase', euro: 0, uso: '0,2 / 0,5 GB', limite: 25 } ] };
const eur = (n) => '€ ' + (+n).toLocaleString('it-IT', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const costiTot = () => { const f = COSTI.fissi.reduce((a, x) => a + x.euro, 0), c = COSTI.consumo.reduce((a, x) => a + x.euro, 0); return { f, c, t: f + c }; };
{ const T = costiTot(); AG.costi.kpi = { 'Totale mese': eur(T.t), 'Budget': eur(COSTI.budget) }; }
const S = { tesoro: 21900, obiettivo: 25000, regole: 48, preventivi: 4, udienze: 2, scadute: 1, idee: 19, imp: { n: 3, tot: 8 }, quality: 'alta', suoni: false };
const CANTIERE_HEX = [7, -3], UDIENZE_HEX = [2, 2], POZZO_HEX = [-2, -2], FONTANA_HEX = [-2, 3];
const ROVINE_HEX = [[-7, 2], [-7, 4], [-6, 6], [-3, 7], [-1, 7]];
const CAMPI_HEX = [[6, 2], [5, 4], [7, 1], [4, 6], [8, 0]];
const CONTORNO = { 'building_blacksmith_blue': [2, -1], 'building_lumbermill_blue': [5, -4], 'building_archeryrange_blue': [-1, 5] };
const NEWS = [['09:10', 'Preventivi · Hotel X ha accettato € 4.800'], ['10:32', 'Fatture · fattura #118 scaduta da 3 giorni'], ['11:05', 'Outreach · fermo, serve la tua approvazione'], ['12:40', 'Cervello · salvate 3 regole nuove']];

/* ================= griglia a quadrati: 1 esagono di prima = 3×3 quadrati ================= */
const SQ3 = Math.sqrt(3);
const CELLA = 2 / 3; // lato di un quadrato, in unità del mondo
const K = (x, y) => x + ',' + y;
const hdist = (x, y) => Math.max(Math.abs(x), Math.abs(y)); // distanza in quadrati (anche in diagonale)
const W = (x, y) => new THREE.Vector3(x * CELLA, 0, y * CELLA);
const hexPos = (h) => W(h[0], h[1]);
const cellaDi = (x, z) => [Math.round(x / CELLA), Math.round(z / CELLA)]; // dal mondo al quadrato
const daEsagono = (q, r) => cellaDi((2 * q + r) * 1.25, SQ3 * r * 1.25); // posizioni di base, scritte ancora in coordinate esagonali (un po' più larghe: gli ingombri quadrati non si toccano)
const DIRH = [0, 1, 2, 3, 4, 5].map(i => new THREE.Vector3(Math.cos(i * Math.PI / 3), 0, Math.sin(i * Math.PI / 3))); // 6 direzioni decorative
// scala del regno: ogni cosa occupa un quadrato di (2·raggio+1)² quadrati e ha una larghezza coerente
const HD = (a, b) => hdist(a[0] - b[0], a[1] - b[1]);
const RAGGIO = { sire: 7, agente: 4, cantiere: 4, udienze: 1, pozzo: 1, rovina: 1,
  montagna: 10, zucchero: 10, rupe: 4, fattoria: 4, pineta: 4, cipressi: 4, uliveto: 4, vigneto: 4, grano: 4, scogli: 1, fontana: 1, casa_a: 1, casa_b: 1 };
const RW = (rg) => (rg + .5) * CELLA; // metà lato dell'ingombro, nel mondo
const LARGH = { sire: 8.2, agente: 5.2, cantiere: 4.8, pozzo: 1.7, tenda: 1.05, rovina: 2.6, casa: 2.6,
  montagna: 14, zucchero: 14, rupe: 5.8, fattoria: 5.2, pineta: 4.8, cipressi: 4.6, uliveto: 4.8, vigneto: 5, grano: 5, scogli: 2.4, fontana: 2.4, casa_a: 2.6, casa_b: 2.6 };
const raggioDi = (id) => { const [t, k] = id.split(':'); if (t === 'ag') return k === 'sire' ? RAGGIO.sire : RAGGIO.agente; if (t === 'sp') return RAGGIO[k] || 0; if (t === 'rv') return RAGGIO.rovina; return RAGGIO[DECO[+k].n] || 0; };
const tessereDi = (h, rg) => { const out = []; for (let dx = -rg; dx <= rg; dx++) for (let dy = -rg; dy <= rg; dy++) out.push([h[0] + dx, h[1] + dy]); return out; };
// le posizioni di partenza sono scritte sugli esagoni: si portano sui quadrati una volta sola
[...ORDER.map(k => AG[k].hex), CANTIERE_HEX, UDIENZE_HEX, POZZO_HEX, FONTANA_HEX, ...ROVINE_HEX, ...CAMPI_HEX, ...Object.values(CONTORNO)].forEach(h => { const c = daEsagono(h[0], h[1]); h[0] = c[0]; h[1] = c[1]; });
// riga di quadrati tra due quadrati (tratti dell'editor e strade di base)
function rigaCelle(a, b) { const out = [], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let i = 0; i <= n; i++) out.push([Math.round(a[0] + (b[0] - a[0]) * i / (n || 1)), Math.round(a[1] + (b[1] - a[1]) * i / (n || 1))]); return out; }
/* ================= skin del regno ================= */
const SKINS = {
  mediterraneo: { nome: 'Mediterraneo', dir: 'assets/sprites/', grass: 'assets/grass.jpg', dirt: 'assets/dirt.jpg', rock: 'assets/roccia.jpg',
    sky: ['#3f86c4', '#7cbde6', '#bfe3f7'], t0: [.62, .66, .4], t1: [.86, .84, .56] },
  // SKIN-AUTO-INIZIO (righe scritte dallo script di integrazione)
  ...Object.fromEntries(Object.entries(/*SKINDATA*/{"vichinghi": {"nome": "Vichinghi", "sky": ["#2e5378", "#7298bd", "#dbe7f1"], "t0": [0.62, 0.7, 0.7], "t1": [0.8, 0.86, 0.86], "pronta": true}, "cyberpunk": {"nome": "Cyberpunk", "sky": ["#120b2e", "#3b1f72", "#d9508f"], "t0": [0.9, 0.9, 0.95], "t1": [1.05, 1.05, 1.1], "pronta": true}, "steampunk": {"nome": "Steampunk", "sky": ["#6e8fb3", "#c9b48f", "#f2d9a8"], "t0": [0.62, 0.66, 0.42], "t1": [0.86, 0.84, 0.58], "pronta": true}, "giappone": {"nome": "Giappone feudale", "sky": ["#7fa7d1", "#c3d7ea", "#f6dbe3"], "t0": [0.62, 0.66, 0.42], "t1": [0.86, 0.84, 0.58], "pronta": true}, "pietra": {"nome": "Età della pietra", "sky": ["#4d78a8", "#e0a165", "#f6d29a"], "t0": [0.62, 0.62, 0.4], "t1": [0.86, 0.8, 0.55], "pronta": true}, "atomico": {"nome": "Fallout", "sky": ["#7c9cae", "#d8b98a", "#efd3a4"], "t0": [0.66, 0.62, 0.42], "t1": [0.9, 0.82, 0.58], "pronta": true}, "atlantide": {"nome": "Atlantide", "sky": ["#0b2c55", "#14608a", "#3fb5c9"], "t0": [0.9, 0.9, 0.85], "t1": [1.05, 1.05, 1], "pronta": true}, "marte": {"nome": "Base su Marte", "sky": ["#5c3a3a", "#c27a5d", "#f0b38f"], "t0": [0.95, 0.85, 0.8], "t1": [1.1, 1, 0.95], "pronta": true}, "covo": {"nome": "Covo del vigilante", "sky": ["#05070d", "#121a2b", "#26354f"], "t0": [0.85, 0.88, 0.95], "t1": [1, 1.03, 1.1], "pronta": true}}/*FINE*/)
    .map(([k, v]) => [k, Object.assign({ dir: `assets/skins/${k}/`, grass: `assets/skins/${k}/grass.jpg`, dirt: `assets/skins/${k}/dirt.jpg`, rock: `assets/skins/${k}/rock.jpg` }, v)])),
  // SKIN-AUTO-FINE
};
const SKIN_ID = (() => { let k = new URLSearchParams(location.search).get('skin'); if (!k) { try { k = localStorage.getItem('regno-skin'); } catch (e) { k = null; } } return SKINS[k] && SKINS[k].pronta !== false ? k : 'mediterraneo'; })();
const SKIN = SKINS[SKIN_ID];
function scegliSkin(k) { try { localStorage.setItem('regno-skin', k); } catch (e) { /* senza memoria del browser basta il parametro */ } const u = new URL(location.href); u.searchParams.set('skin', k); location.href = u.toString(); }
['--sea-3', '--sea-2', '--sea-1'].forEach((v, i) => document.documentElement.style.setProperty(v, SKIN.sky[i]));

function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(1729);
const pick = (arr) => arr[Math.floor(R() * arr.length)];

/* ================= renderer ================= */
const canvas = $('world');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch (e) { fail('Questo dispositivo non supporta WebGL.'); return; }
const isMobile = matchMedia('(pointer:coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);

scene.add(new THREE.HemisphereLight(0xdcecff, 0x6b5a3c, 0.6));
const sun = new THREE.DirectionalLight(0xffe7c4, 1.9);
sun.position.set(-48, 72, 30); // lontano: l'ombra copre anche un'isola molto allargata
sun.castShadow = true;
const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 160;
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.025;
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight(0x9cc4ff, 0.3); fill.position.set(14, 8, -12); scene.add(fill);

/* ================= mappa ================= */
const LAND = new Set();
for (let x = -45; x <= 45; x++) for (let y = -45; y <= 45; y++) {
  const p = W(x, y), a = Math.atan2(p.z, p.x);
  const lim = (12.6 + 1 * Math.sin(3 * a + 1.1) + .6 * Math.sin(5 * a - .4)) * 1.9; // stesso profilo dell'isola di prima, in unità del mondo
  if (p.length() <= lim) LAND.add(K(x, y));
}
const isLand = (q, r) => LAND.has(K(q, r));
/* ---- mappa modificata con l'editor (salvata su questo dispositivo) ---- */
// regni salvati su questo dispositivo: ognuno ha un nome e la sua mappa (chiave 'regno-mappa-v2:<id>')
const REGNI_KEY = 'regno-elenco-v1';
let REGNI = (() => { try { const r = JSON.parse(localStorage.getItem(REGNI_KEY) || 'null'); if (r && Array.isArray(r.lista) && r.lista.length) return r; } catch (e) {} return { attivo: 'r1', lista: [{ id: 'r1', nome: 'Regno di Sire' }] }; })();
if (!REGNI.lista.some(r => r.id === REGNI.attivo)) REGNI.attivo = REGNI.lista[0].id;
// richiesta di Andrea (26/10): il regno di prima diventa "Orix01" e si apre un regno nuovo vuoto "Regione Sire" (una volta sola)
if (!REGNI.m1) { const r1 = REGNI.lista.find(r => r.id === 'r1'); if (r1) r1.nome = 'Orix01';
  if (!REGNI.lista.some(r => r.nome === 'Regione Sire')) REGNI.lista.unshift({ id: 'rsire', nome: 'Regione Sire' });
  REGNI.attivo = 'rsire'; REGNI.m1 = 1; try { localStorage.setItem('regno-elenco-v1', JSON.stringify(REGNI)); } catch (e) {} }
// regno di esempio "prova claude": isola ordinata con tutti gli elementi (mappa generata e verificata: niente sovrapposizioni, strade libere)
const MAPPA_PROVA_CLAUDE = {"v":1,"land":["-1,-1","-1,-10","-1,-11","-1,-12","-1,-13","-1,-14","-1,-15","-1,-16","-1,-17","-1,-18","-1,-2","-1,-3","-1,-4","-1,-5","-1,-6","-1,-7","-1,-8","-1,-9","-1,0","-1,1","-1,10","-1,11","-1,12","-1,13","-1,14","-1,15","-1,16","-1,17","-1,18","-1,19","-1,2","-1,3","-1,4","-1,5","-1,6","-1,7","-1,8","-1,9","-10,-1","-10,-10","-10,-11","-10,-12","-10,-2","-10,-3","-10,-4","-10,-5","-10,-6","-10,-7","-10,-8","-10,-9","-10,0","-10,1","-10,10","-10,11","-10,12","-10,13","-10,14","-10,15","-10,16","-10,17","-10,18","-10,19","-10,2","-10,3","-10,4","-10,5","-10,6","-10,7","-10,8","-10,9","-11,-1","-11,-10","-11,-2","-11,-3","-11,-4","-11,-5","-11,-6","-11,-7","-11,-8","-11,-9","-11,0","-11,1","-11,10","-11,11","-11,12","-11,13","-11,14","-11,15","-11,16","-11,17","-11,18","-11,19","-11,2","-11,3","-11,4","-11,5","-11,6","-11,7","-11,8","-11,9","-12,-1","-12,-2","-12,-3","-12,-4","-12,-5","-12,-6","-12,-7","-12,-8","-12,-9","-12,0","-12,1","-12,10","-12,11","-12,12","-12,13","-12,14","-12,15","-12,16","-12,17","-12,18","-12,19","-12,2","-12,3","-12,4","-12,5","-12,6","-12,7","-12,8","-12,9","-13,-1","-13,-2","-13,-3","-13,-4","-13,-5","-13,-6","-13,-7","-13,0","-13,1","-13,10","-13,11","-13,12","-13,13","-13,14","-13,15","-13,16","-13,17","-13,18","-13,19","-13,2","-13,3","-13,4","-13,5","-13,6","-13,7","-13,8","-13,9","-14,-1","-14,-2","-14,-3","-14,-4","-14,-5","-14,-6","-14,0","-14,1","-14,10","-14,11","-14,12","-14,13","-14,14","-14,15","-14,16","-14,17","-14,18","-14,19","-14,2","-14,3","-14,4","-14,5","-14,6","-14,7","-14,8","-14,9","-15,-1","-15,-2","-15,-3","-15,-4","-15,-5","-15,0","-15,1","-15,10","-15,11","-15,12","-15,13","-15,14","-15,15","-15,16","-15,17","-15,18","-15,19","-15,2","-15,20","-15,3","-15,4","-15,5","-15,6","-15,7","-15,8","-15,9","-16,-1","-16,-2","-16,-3","-16,0","-16,1","-16,10","-16,11","-16,12","-16,13","-16,14","-16,15","-16,16","-16,17","-16,18","-16,19","-16,2","-16,20","-16,3","-16,4","-16,5","-16,6","-16,7","-16,8","-16,9","-17,-1","-17,-2","-17,0","-17,1","-17,10","-17,11","-17,12","-17,13","-17,14","-17,15","-17,16","-17,17","-17,18","-17,19","-17,2","-17,20","-17,3","-17,4","-17,5","-17,6","-17,7","-17,8","-17,9","-18,-1","-18,0","-18,1","-18,10","-18,11","-18,12","-18,13","-18,14","-18,15","-18,16","-18,17","-18,18","-18,19","-18,2","-18,20","-18,3","-18,4","-18,5","-18,6","-18,7","-18,8","-18,9","-19,10","-19,11","-19,12","-19,13","-19,14","-19,15","-19,16","-19,17","-19,18","-19,19","-19,4","-19,5","-19,6","-19,7","-19,8","-19,9","-2,-1","-2,-10","-2,-11","-2,-12","-2,-13","-2,-14","-2,-15","-2,-16","-2,-17","-2,-2","-2,-3","-2,-4","-2,-5","-2,-6","-2,-7","-2,-8","-2,-9","-2,0","-2,1","-2,10","-2,11","-2,12","-2,13","-2,14","-2,15","-2,16","-2,17","-2,18","-2,19","-2,2","-2,3","-2,4","-2,5","-2,6","-2,7","-2,8","-2,9","-20,10","-20,11","-20,12","-20,13","-20,14","-20,15","-20,16","-20,17","-20,18","-20,19","-20,5","-20,6","-20,7","-20,8","-20,9","-21,10","-21,11","-21,12","-21,13","-21,14","-21,15","-21,16","-21,17","-21,18","-21,7","-21,8","-21,9","-22,10","-22,11","-22,12","-22,13","-22,14","-22,15","-22,16","-22,17","-22,8","-22,9","-23,12","-23,13","-23,14","-23,15","-3,-1","-3,-10","-3,-11","-3,-12","-3,-13","-3,-14","-3,-15","-3,-16","-3,-2","-3,-3","-3,-4","-3,-5","-3,-6","-3,-7","-3,-8","-3,-9","-3,0","-3,1","-3,10","-3,11","-3,12","-3,13","-3,14","-3,15","-3,16","-3,17","-3,18","-3,19","-3,2","-3,3","-3,4","-3,5","-3,6","-3,7","-3,8","-3,9","-4,-1","-4,-10","-4,-11","-4,-12","-4,-13","-4,-14","-4,-15","-4,-16","-4,-2","-4,-3","-4,-4","-4,-5","-4,-6","-4,-7","-4,-8","-4,-9","-4,0","-4,1","-4,10","-4,11","-4,12","-4,13","-4,14","-4,15","-4,16","-4,17","-4,18","-4,19","-4,2","-4,20","-4,3","-4,4","-4,5","-4,6","-4,7","-4,8","-4,9","-5,-1","-5,-10","-5,-11","-5,-12","-5,-13","-5,-14","-5,-15","-5,-2","-5,-3","-5,-4","-5,-5","-5,-6","-5,-7","-5,-8","-5,-9","-5,0","-5,1","-5,10","-5,11","-5,12","-5,13","-5,14","-5,15","-5,16","-5,17","-5,18","-5,19","-5,2","-5,3","-5,4","-5,5","-5,6","-5,7","-5,8","-5,9","-6,-1","-6,-10","-6,-11","-6,-12","-6,-13","-6,-14","-6,-15","-6,-2","-6,-3","-6,-4","-6,-5","-6,-6","-6,-7","-6,-8","-6,-9","-6,0","-6,1","-6,10","-6,11","-6,12","-6,13","-6,14","-6,15","-6,16","-6,17","-6,18","-6,19","-6,2","-6,3","-6,4","-6,5","-6,6","-6,7","-6,8","-6,9","-7,-1","-7,-10","-7,-11","-7,-12","-7,-13","-7,-14","-7,-2","-7,-3","-7,-4","-7,-5","-7,-6","-7,-7","-7,-8","-7,-9","-7,0","-7,1","-7,10","-7,11","-7,12","-7,13","-7,14","-7,15","-7,16","-7,17","-7,18","-7,19","-7,2","-7,3","-7,4","-7,5","-7,6","-7,7","-7,8","-7,9","-8,-1","-8,-10","-8,-11","-8,-12","-8,-13","-8,-2","-8,-3","-8,-4","-8,-5","-8,-6","-8,-7","-8,-8","-8,-9","-8,0","-8,1","-8,10","-8,11","-8,12","-8,13","-8,14","-8,15","-8,16","-8,17","-8,18","-8,19","-8,2","-8,3","-8,4","-8,5","-8,6","-8,7","-8,8","-8,9","-9,-1","-9,-10","-9,-11","-9,-12","-9,-13","-9,-2","-9,-3","-9,-4","-9,-5","-9,-6","-9,-7","-9,-8","-9,-9","-9,0","-9,1","-9,10","-9,11","-9,12","-9,13","-9,14","-9,15","-9,16","-9,17","-9,18","-9,19","-9,2","-9,3","-9,4","-9,5","-9,6","-9,7","-9,8","-9,9","0,-1","0,-10","0,-11","0,-12","0,-13","0,-14","0,-15","0,-16","0,-17","0,-18","0,-19","0,-2","0,-3","0,-4","0,-5","0,-6","0,-7","0,-8","0,-9","0,0","0,1","0,10","0,11","0,12","0,13","0,14","0,15","0,16","0,17","0,18","0,19","0,2","0,3","0,4","0,5","0,6","0,7","0,8","0,9","1,-1","1,-10","1,-11","1,-12","1,-13","1,-14","1,-15","1,-16","1,-17","1,-18","1,-19","1,-2","1,-3","1,-4","1,-5","1,-6","1,-7","1,-8","1,-9","1,0","1,1","1,10","1,11","1,12","1,13","1,14","1,15","1,16","1,17","1,18","1,2","1,3","1,4","1,5","1,6","1,7","1,8","1,9","10,-1","10,-10","10,-11","10,-12","10,-13","10,-14","10,-15","10,-16","10,-17","10,-18","10,-19","10,-2","10,-20","10,-21","10,-22","10,-23","10,-3","10,-4","10,-5","10,-6","10,-7","10,-8","10,-9","10,0","10,1","10,10","10,2","10,3","10,4","10,5","10,6","10,7","10,8","10,9","11,-1","11,-10","11,-11","11,-12","11,-13","11,-14","11,-15","11,-16","11,-17","11,-18","11,-19","11,-2","11,-20","11,-21","11,-22","11,-23","11,-3","11,-4","11,-5","11,-6","11,-7","11,-8","11,-9","11,0","11,1","11,10","11,2","11,3","11,4","11,5","11,6","11,7","11,8","11,9","12,-1","12,-10","12,-11","12,-12","12,-13","12,-14","12,-15","12,-16","12,-17","12,-18","12,-19","12,-2","12,-20","12,-21","12,-22","12,-23","12,-3","12,-4","12,-5","12,-6","12,-7","12,-8","12,-9","12,0","12,1","12,2","12,3","12,4","12,5","12,6","12,7","12,8","12,9","13,-1","13,-10","13,-11","13,-12","13,-13","13,-14","13,-15","13,-16","13,-17","13,-18","13,-19","13,-2","13,-20","13,-21","13,-22","13,-23","13,-3","13,-4","13,-5","13,-6","13,-7","13,-8","13,-9","13,0","13,1","13,2","13,3","13,4","13,5","13,6","13,7","13,8","14,-1","14,-10","14,-11","14,-12","14,-13","14,-14","14,-15","14,-16","14,-17","14,-18","14,-19","14,-2","14,-20","14,-21","14,-22","14,-23","14,-3","14,-4","14,-5","14,-6","14,-7","14,-8","14,-9","14,0","14,1","14,2","14,3","14,4","14,5","14,6","14,7","14,8","15,-1","15,-10","15,-11","15,-12","15,-13","15,-14","15,-15","15,-16","15,-17","15,-18","15,-19","15,-2","15,-20","15,-21","15,-22","15,-3","15,-4","15,-5","15,-6","15,-7","15,-8","15,-9","15,0","15,1","15,2","15,3","15,4","15,5","15,6","15,7","16,-1","16,-10","16,-11","16,-12","16,-13","16,-14","16,-15","16,-16","16,-17","16,-18","16,-19","16,-2","16,-20","16,-21","16,-3","16,-4","16,-5","16,-6","16,-7","16,-8","16,-9","16,0","16,1","16,2","16,3","16,4","16,5","16,6","17,-1","17,-10","17,-11","17,-12","17,-13","17,-14","17,-15","17,-16","17,-17","17,-18","17,-2","17,-3","17,-4","17,-5","17,-6","17,-7","17,-8","17,-9","17,0","17,1","17,2","17,3","17,4","17,5","18,-1","18,-10","18,-11","18,-12","18,-13","18,-14","18,-15","18,-16","18,-2","18,-3","18,-4","18,-5","18,-6","18,-7","18,-8","18,-9","18,0","18,1","18,2","18,3","18,4","19,-1","19,-10","19,-11","19,-12","19,-13","19,-2","19,-3","19,-4","19,-5","19,-6","19,-7","19,-8","19,-9","19,0","19,1","19,2","2,-1","2,-10","2,-11","2,-12","2,-13","2,-14","2,-15","2,-16","2,-17","2,-18","2,-19","2,-2","2,-3","2,-4","2,-5","2,-6","2,-7","2,-8","2,-9","2,0","2,1","2,10","2,11","2,12","2,13","2,14","2,15","2,16","2,17","2,2","2,3","2,4","2,5","2,6","2,7","2,8","2,9","20,-1","20,-2","20,-3","20,-4","20,-5","20,-6","20,-7","20,-8","20,-9","20,0","20,1","3,-1","3,-10","3,-11","3,-12","3,-13","3,-14","3,-15","3,-16","3,-17","3,-18","3,-19","3,-2","3,-3","3,-4","3,-5","3,-6","3,-7","3,-8","3,-9","3,0","3,1","3,10","3,11","3,12","3,13","3,14","3,15","3,16","3,17","3,2","3,3","3,4","3,5","3,6","3,7","3,8","3,9","4,-1","4,-10","4,-11","4,-12","4,-13","4,-14","4,-15","4,-16","4,-17","4,-18","4,-19","4,-2","4,-20","4,-3","4,-4","4,-5","4,-6","4,-7","4,-8","4,-9","4,0","4,1","4,10","4,11","4,12","4,13","4,14","4,15","4,16","4,2","4,3","4,4","4,5","4,6","4,7","4,8","4,9","5,-1","5,-10","5,-11","5,-12","5,-13","5,-14","5,-15","5,-16","5,-17","5,-18","5,-19","5,-2","5,-20","5,-21","5,-3","5,-4","5,-5","5,-6","5,-7","5,-8","5,-9","5,0","5,1","5,10","5,11","5,12","5,13","5,14","5,15","5,2","5,3","5,4","5,5","5,6","5,7","5,8","5,9","6,-1","6,-10","6,-11","6,-12","6,-13","6,-14","6,-15","6,-16","6,-17","6,-18","6,-19","6,-2","6,-20","6,-21","6,-3","6,-4","6,-5","6,-6","6,-7","6,-8","6,-9","6,0","6,1","6,10","6,11","6,12","6,13","6,14","6,2","6,3","6,4","6,5","6,6","6,7","6,8","6,9","7,-1","7,-10","7,-11","7,-12","7,-13","7,-14","7,-15","7,-16","7,-17","7,-18","7,-19","7,-2","7,-20","7,-21","7,-22","7,-3","7,-4","7,-5","7,-6","7,-7","7,-8","7,-9","7,0","7,1","7,10","7,11","7,12","7,13","7,2","7,3","7,4","7,5","7,6","7,7","7,8","7,9","8,-1","8,-10","8,-11","8,-12","8,-13","8,-14","8,-15","8,-16","8,-17","8,-18","8,-19","8,-2","8,-20","8,-21","8,-22","8,-3","8,-4","8,-5","8,-6","8,-7","8,-8","8,-9","8,0","8,1","8,10","8,11","8,12","8,2","8,3","8,4","8,5","8,6","8,7","8,8","8,9","9,-1","9,-10","9,-11","9,-12","9,-13","9,-14","9,-15","9,-16","9,-17","9,-18","9,-19","9,-2","9,-20","9,-21","9,-22","9,-23","9,-3","9,-4","9,-5","9,-6","9,-7","9,-8","9,-9","9,0","9,1","9,10","9,11","9,2","9,3","9,4","9,5","9,6","9,7","9,8","9,9"],"strade":["-1,-10","-1,-2","-1,11","-1,3","-10,-1","-10,0","-10,10","-10,11","-11,0","-11,1","-11,10","-11,11","-11,2","-11,3","-11,4","-11,5","-11,6","-11,7","-11,8","-11,9","-2,-1","-2,-9","-2,11","-2,3","-3,-8","-3,0","-3,1","-3,11","-3,2","-3,3","-4,-7","-4,0","-4,11","-4,2","-4,4","-5,-6","-5,0","-5,11","-5,5","-6,-5","-6,0","-6,11","-6,6","-7,-4","-7,11","-8,-3","-8,11","-9,-2","-9,11","0,-10","0,-11","0,-3","0,-4","0,-5","0,-6","0,10","0,11","0,3","0,4","0,5","0,6","1,-11","1,-3","1,10","1,2","1,3","1,4","10,-10","10,-11","10,0","10,1","11,-1","11,-10","11,-11","11,-2","11,-3","11,-4","11,-5","11,-6","11,-7","11,-8","11,-9","11,0","2,-11","2,-3","2,1","2,3","2,9","3,-1","3,-11","3,-2","3,-3","3,0","3,1","3,2","3,8","4,-11","4,-4","4,0","4,1","4,7","5,-11","5,-5","5,0","5,6","6,-11","6,-6","6,0","6,5","7,-11","7,4","8,-11","8,3","9,-11","9,2"],"agenti":{"sire":[0,0,0],"fatture":[8,0,0],"contatti":[0,8,0],"outreach":[-8,8,0],"cervello":[-8,0,0],"jarvis":[0,-8,0],"preventivi":[8,-8,0]},"spec":{"cantiere":[-6,3],"udienze":[-2,4],"pozzo":[4,-2],"rotCant":0},"rovine":[[1,-10],[3,-10],[5,-10],[7,-10],[9,-10]],"deco":[{"n":"fontana","w":1.9,"q":2,"r":2,"rot":0},{"n":"casa_a","w":2.15,"q":-1,"r":5,"rot":0},{"n":"casa_b","w":2.15,"q":5,"r":-1,"rot":0},{"n":"casa_a","w":2.15,"q":-1,"r":6,"rot":0},{"n":"casa_b","w":2.15,"q":1,"r":5,"rot":0},{"n":"casa_a","w":2.15,"q":5,"r":1,"rot":0},{"n":"casa_b","w":2.15,"q":6,"r":-1,"rot":0},{"n":"casa_a","w":2.15,"q":-1,"r":7,"rot":0},{"n":"casa_b","w":2.15,"q":1,"r":6,"rot":0},{"n":"casa_a","w":2.15,"q":6,"r":1,"rot":0},{"n":"casa_b","w":2.15,"q":7,"r":-1,"rot":0},{"n":"montagna","w":2.9,"q":-11,"r":-5,"rot":0},{"n":"zucchero","w":2.9,"q":-4,"r":-12,"rot":0},{"n":"rupe","w":2.5,"q":6,"r":-14,"rot":0},{"n":"grano","w":2.3,"q":11,"r":2,"rot":0},{"n":"grano","w":2.3,"q":4,"r":9,"rot":0},{"n":"vigneto","w":2.3,"q":-2,"r":13,"rot":0},{"n":"fattoria","w":2.3,"q":-9,"r":13,"rot":0},{"n":"grano","w":2.3,"q":14,"r":0,"rot":0},{"n":"vigneto","w":2.3,"q":7,"r":7,"rot":0},{"n":"vigneto","w":2.3,"q":0,"r":14,"rot":0},{"n":"grano","w":2.3,"q":-7,"r":14,"rot":0},{"n":"vigneto","w":2.3,"q":10,"r":5,"rot":0},{"n":"fattoria","w":2.3,"q":3,"r":12,"rot":0},{"n":"grano","w":2.3,"q":-5,"r":15,"rot":0},{"n":"vigneto","w":2.3,"q":-12,"r":15,"rot":0},{"n":"vigneto","w":2.3,"q":13,"r":3,"rot":0},{"n":"grano","w":2.3,"q":6,"r":10,"rot":0},{"n":"grano","w":2.3,"q":-3,"r":16,"rot":0},{"n":"vigneto","w":2.3,"q":-10,"r":16,"rot":0},{"n":"pineta","w":2.3,"q":-15,"r":3,"rot":0},{"n":"pineta","w":2.3,"q":-16,"r":6,"rot":0},{"n":"pineta","w":2.3,"q":-13,"r":4,"rot":0},{"n":"pineta","w":2.3,"q":-14,"r":7,"rot":0},{"n":"pineta","w":2.3,"q":-15,"r":10,"rot":0},{"n":"pineta","w":2.3,"q":-16,"r":13,"rot":0},{"n":"pineta","w":2.3,"q":-13,"r":11,"rot":0},{"n":"pineta","w":2.3,"q":-14,"r":14,"rot":0},{"n":"uliveto","w":2.3,"q":14,"r":-14,"rot":0},{"n":"uliveto","w":2.3,"q":13,"r":-11,"rot":0},{"n":"uliveto","w":2.3,"q":16,"r":-13,"rot":0},{"n":"uliveto","w":2.3,"q":15,"r":-10,"rot":0},{"n":"uliveto","w":2.3,"q":14,"r":-7,"rot":0},{"n":"uliveto","w":2.3,"q":13,"r":-4,"rot":0},{"n":"uliveto","w":2.3,"q":16,"r":-6,"rot":0},{"n":"uliveto","w":2.3,"q":15,"r":-3,"rot":0},{"n":"uliveto","w":2.3,"q":3,"r":5,"rot":0},{"n":"uliveto","w":2.3,"q":6,"r":3,"rot":0},{"n":"cipressi","w":2.3,"q":-5,"r":8,"rot":0},{"n":"cipressi","w":2.3,"q":-3,"r":9,"rot":0},{"n":"vigneto","w":2.3,"q":-9,"r":6,"rot":0},{"n":"pineta","w":2.3,"q":-4,"r":-2,"rot":0},{"n":"pineta","w":2.3,"q":-3,"r":-5,"rot":0},{"n":"pineta","w":2.3,"q":-6,"r":-3,"rot":0},{"n":"grano","w":2.3,"q":6,"r":-4,"rot":0},{"n":"vigneto","w":2.3,"q":8,"r":-3,"rot":0},{"n":"grano","w":2.3,"q":9,"r":-6,"rot":0},{"n":"pineta","w":2.3,"q":-14,"r":0,"rot":0},{"n":"pineta","w":2.3,"q":-16,"r":-1,"rot":0},{"n":"cipressi","w":2.3,"q":1,"r":-13,"rot":0},{"n":"cipressi","w":2.3,"q":8,"r":-13,"rot":0},{"n":"cipressi","w":2.3,"q":4,"r":-15,"rot":0},{"n":"cipressi","w":2.3,"q":11,"r":-15,"rot":0},{"n":"cipressi","w":2.3,"q":2,"r":-16,"rot":0},{"n":"cipressi","w":2.3,"q":9,"r":-16,"rot":0},{"n":"cipressi","w":2.3,"q":0,"r":-17,"rot":0},{"n":"cipressi","w":2.3,"q":7,"r":-17,"rot":0},{"n":"cipressi","w":2.3,"q":14,"r":-17,"rot":0},{"n":"scogli","w":1.7,"q":-18,"r":-1,"rot":0},{"n":"scogli","w":1.7,"q":-12,"r":-8,"rot":0},{"n":"scogli","w":1.7,"q":-7,"r":-14,"rot":0},{"n":"scogli","w":1.7,"q":0,"r":-19,"rot":0},{"n":"scogli","w":1.7,"q":7,"r":-22,"rot":0},{"n":"scogli","w":1.7,"q":14,"r":-23,"rot":0},{"n":"scogli","w":1.7,"q":16,"r":-18,"rot":0},{"n":"scogli","w":1.7,"q":18,"r":-13,"rot":0},{"n":"scogli","w":1.7,"q":20,"r":-8,"rot":0},{"n":"scogli","w":1.7,"q":20,"r":-1,"rot":0},{"n":"scogli","w":1.7,"q":16,"r":6,"rot":0},{"n":"scogli","w":1.7,"q":9,"r":11,"rot":0},{"n":"scogli","w":1.7,"q":2,"r":17,"rot":0},{"n":"scogli","w":1.7,"q":-4,"r":19,"rot":0},{"n":"scogli","w":1.7,"q":-11,"r":19,"rot":0},{"n":"scogli","w":1.7,"q":-18,"r":20,"rot":0},{"n":"scogli","w":1.7,"q":-22,"r":17,"rot":0},{"n":"scogli","w":1.7,"q":-22,"r":11,"rot":0},{"n":"scogli","w":1.7,"q":-19,"r":4,"rot":0}]};
// una volta sola: aggiunge il regno 'prova claude' con la sua isola già salvata (non cambia il regno attivo e non sovrascrive)
if (!REGNI.m2) { if (!REGNI.lista.some(r => r.id === 'rclaude')) REGNI.lista.push({ id: 'rclaude', nome: 'prova claude' });
  try { if (!localStorage.getItem('regno-mappa-v2:rclaude')) localStorage.setItem('regno-mappa-v2:rclaude', JSON.stringify(MAPPA_PROVA_CLAUDE)); } catch (e) {}
  REGNI.m2 = 1; try { localStorage.setItem(REGNI_KEY, JSON.stringify(REGNI)); } catch (e) {} }
const salvaRegni = () => { try { localStorage.setItem(REGNI_KEY, JSON.stringify(REGNI)); } catch (e) {} };
// il primo regno usa la chiave di prima, così la mappa già fatta resta
// griglia a quadrati (27/10): mappe nuove su chiavi nuove; quelle sugli esagoni restano salvate così com'erano
const MAPPA_KEY = 'regno-quadri-v1:' + REGNI.attivo;
let MAPPA = null;
try { MAPPA = JSON.parse(localStorage.getItem(MAPPA_KEY) || 'null'); if (!MAPPA || MAPPA.v !== 2 || !Array.isArray(MAPPA.land) || MAPPA.land.length < 7) MAPPA = null; } catch (e) { MAPPA = null; }
const setHex = (dst, src) => { if (Array.isArray(src)) { dst[0] = +src[0]; dst[1] = +src[1]; } };
if (MAPPA) {
  LAND.clear(); MAPPA.land.forEach(k => LAND.add(String(k)));
  ORDER.forEach(k => { const v = MAPPA.agenti && MAPPA.agenti[k]; if (v) { AG[k].hex = [+v[0], +v[1]]; AG[k].rot = +v[2] || 0; } });
  const sp = MAPPA.spec || {}; setHex(CANTIERE_HEX, sp.cantiere); setHex(UDIENZE_HEX, sp.udienze); setHex(POZZO_HEX, sp.pozzo);
  (MAPPA.rovine || []).forEach((h, i) => { if (ROVINE_HEX[i]) setHex(ROVINE_HEX[i], h); });
}
if (!MAPPA) [CANTIERE_HEX, UDIENZE_HEX, POZZO_HEX, FONTANA_HEX, ...ROVINE_HEX, ...CAMPI_HEX, ...Object.values(CONTORNO), ...ORDER.map(k => AG[k].hex)].forEach(h => tessereDi(h, 1).forEach(t => LAND.add(K(...t))));

const ROADS = { A: [0, 3], B: [5, 3], C: [4, 3], D: [5, 3, 1], E: [0, 5, 3], F: [0, 3, 1], G: [4, 3, 2], H: [0, 4, 3, 2], I: [5, 4, 2, 1], J: [0, 3, 2, 1], K: [5, 4, 3, 2, 1], L: [0, 1, 2, 3, 4, 5], M: [3] };
const COAST = { A: [1], B: [1, 2], C: [0, 1, 2], D: [5, 0, 1, 2] };
function matchSet(table, need) {
  const want = need.slice().sort().join();
  for (const name in table) for (let s = 0; s < 6; s++) {
    const got = table[name].map(d => ((d - s) % 6 + 6) % 6).sort().join();
    if (got === want) return { name, rot: s * Math.PI / 3 };
  }
  return null;
}
const ROADSET = new Map(), LINKS = [];
function link(a, b) {
  const d = DIR8.findIndex(([dx, dy]) => a[0] + dx === b[0] && a[1] + dy === b[1]);
  if (d < 0) return;
  const ka = K(...a), kb = K(...b);
  if (!ROADSET.has(ka)) ROADSET.set(ka, new Set()); if (!ROADSET.has(kb)) ROADSET.set(kb, new Set());
  ROADSET.get(ka).add(d); ROADSET.get(kb).add((d + 4) % 8); LINKS.push([a, b]);
}
const OCC = new Map();
const occ = (h, w) => OCC.set(K(...h), w);
// strade di base: le stesse dell'isola sugli esagoni, ridisegnate a quadrati
const ESA6 = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
[...ESA6.map(([q, r]) => [[0, 0], [4 * q, 4 * r]]), [[4, 0], [5, -1]], [[-4, 0], [-5, 1]], [[0, 4], [1, 3]], [[-4, 4], [-4, 5]]]
  .forEach(([a, b]) => { const c = rigaCelle(daEsagono(...a), daEsagono(...b)); for (let i = 1; i < c.length; i++) link(c[i - 1], c[i]); });
// strade: insieme di tessere; i collegamenti nascono tra tessere vicine
const ROADT = new Set(MAPPA && Array.isArray(MAPPA.strade) ? MAPPA.strade.map(String) : ROADSET.keys());
function rebuildRoads() { ROADSET.clear(); LINKS.length = 0;
  ROADT.forEach(k => { const [q, r] = k.split(',').map(Number); for (let d = 0; d < 4; d++) { const n = [q + DIR8[d][0], r + DIR8[d][1]]; if (ROADT.has(K(...n))) link([q, r], n); } }); }
rebuildRoads();
/* recinti: muretti, staccionate, siepi e cancelli; una tessera = un pezzo, i pezzi vicini si uniscono da soli */
const TIPI_MURO = {
  muro: { nome: 'Muretto', tex: 'rock', col: 0x4a4236, h: .5, t: .36, rep: [.45, .22] },
  staccionata: { nome: 'Staccionata', tex: 'dirt', col: 0x8a5a34, h: .7, t: .1, rep: [.3, .1] },
  siepe: { nome: 'Siepe', tex: 'grass', col: 0x23401a, h: .72, t: .56, rep: [.4, .3] },
  cancello: { nome: 'Cancello', tex: 'rock', col: 0x4a4236, h: .95, t: .4, rep: [.45, .22], passa: true },
};
const MURI = new Map((MAPPA && Array.isArray(MAPPA.muri) ? MAPPA.muri : []).filter(m => Array.isArray(m) && TIPI_MURO[m[1]]).map(m => [String(m[0]), m[1]]));
const MURI_OBJ = []; const MURO_MAT = {};
function muroMat(tipo, legno) { const key = tipo + (legno ? ':l' : ''); if (MURO_MAT[key]) return MURO_MAT[key];
  const T = TIPI_MURO[tipo], src = legno ? GND.U && GND.U.tDirt.value : T.tex === 'rock' ? GND.rock : GND.U && GND.U[T.tex === 'grass' ? 'tGrass' : 'tDirt'].value;
  let map = null; if (src) { map = src.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(...T.rep); }
  return (MURO_MAT[key] = new THREE.MeshStandardMaterial({ map, color: legno ? 0x40281a : T.col, roughness: 1, metalness: 0 })); }
function muroBox(g, mat, w, h, d, x, y, z, rotY) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = rotY || 0; m.castShadow = m.receiveShadow = true; g.add(m); return m; }
function buildMuri() {
  MURI_OBJ.forEach(g => { scene.remove(g); g.traverse(m => { if (m.isMesh) m.geometry.dispose(); }); }); MURI_OBJ.length = 0;
  const has = (x, y) => MURI.has(K(x, y));
  MURI.forEach((tipo, k) => { const [x, y] = k.split(',').map(Number), T = TIPI_MURO[tipo], g = new THREE.Group(), mat = muroMat(tipo), gate = tipo === 'cancello';
    // vicini: i 4 lati sempre; le diagonali solo se l'angolo non è già chiuso da un lato
    const vicini = DIR8.map(([dx, dy], d) => !has(x + dx, y + dy) ? -1 : d % 2 === 0 ? d : (has(x + dx, y) || has(x, y + dy)) ? -1 : d).filter(d => d >= 0);
    const dirs = vicini.length ? vicini : [0, 4]; // pezzo isolato: un tratto dritto
    const a0 = gate ? .24 : 0; // il cancello lascia il passaggio al centro
    const hh = gate ? TIPI_MURO.muro.h : T.h, tt = gate ? TIPI_MURO.muro.t : T.t, mm = gate ? muroMat('muro') : mat;
    dirs.forEach(d => { const [dx, dy] = DIR8[d], v = new THREE.Vector3(dx, 0, dy).normalize(), ry = -Math.atan2(v.z, v.x);
      const a1 = vicini.length ? CELLA * Math.hypot(dx, dy) / 2 + .01 : CELLA * .45, L = a1 - a0, c = a0 + L / 2; if (L <= .02) return;
      if (tipo === 'staccionata') [.28, .56].forEach(h => muroBox(g, mat, L, .11, .09, v.x * c, h, v.z * c, ry));
      else muroBox(g, mm, L, hh, tt, v.x * c, hh / 2, v.z * c, ry); });
    const dritto = vicini.length === 2 && (vicini[1] - vicini[0]) === 4;
    if (tipo === 'staccionata') muroBox(g, mat, .17, T.h, .17, 0, T.h / 2, 0);
    else if (tipo === 'siepe') { const m = new THREE.Mesh(new THREE.CylinderGeometry(T.t * .55, T.t * .6, T.h, 8), mat); m.position.y = T.h / 2; m.castShadow = m.receiveShadow = true; g.add(m); }
    else if (tipo === 'muro') { if (!dritto) muroBox(g, mat, T.t + .1, T.h + .1, T.t + .1, 0, (T.h + .1) / 2, 0); }
    else { // cancello: due pilastri e le ante aperte in legno
      const [dx, dy] = DIR8[dirs[0]], v = new THREE.Vector3(dx, 0, dy).normalize(), ry = -Math.atan2(v.z, v.x), n = new THREE.Vector3(-v.z, 0, v.x);
      [1, -1].forEach(s => { muroBox(g, mat, .2, T.h, .2, v.x * a0 * s, T.h / 2, v.z * a0 * s); muroBox(g, mat, .26, .07, .26, v.x * a0 * s, T.h + .035, v.z * a0 * s);
        const p = v.clone().multiplyScalar(a0 * s * .55).add(n.clone().multiplyScalar(.1)); muroBox(g, muroMat(tipo, true), .22, .4, .04, p.x, .26, p.z, ry + s * .9); }); }
    const p = W(x, y); g.position.set(p.x, 0, p.z); scene.add(g); MURI_OBJ.push(g); }); }
// tessere occupate da agenti e luoghi speciali (gli elementi liberi stanno in DECO)
function rebuildOcc(gen) { OCC.clear();
  ORDER.forEach(k => tessereDi(AG[k].hex, k === 'sire' ? RAGGIO.sire : RAGGIO.agente).forEach(h => occ(h, k)));
  tessereDi(CANTIERE_HEX, RAGGIO.cantiere).forEach(h => occ(h, 'cantiere')); occ(UDIENZE_HEX, 'udienze'); occ(POZZO_HEX, 'pozzo');
  ROVINE_HEX.forEach(h => occ(h, 'rovina'));
  if (gen) { occ(FONTANA_HEX, 'fontana'); CAMPI_HEX.forEach(h => occ(h, 'campo')); Object.entries(CONTORNO).forEach(([m, h]) => { if (!OCC.has(K(...h))) occ(h, m); }); } }
rebuildOcc(!MAPPA);
const isRoadTile = (key) => ROADSET.has(key) && !OCC.has(key);

/* ================= caricamento ================= */
let KIT = null; const CH = {};
const veilBar = $('veil-bar'), veilT = $('veil-t');
function progress(p, t) { veilBar.style.width = Math.round(p * 100) + '%'; if (t) veilT.textContent = t; }
const fetchText = (url) => fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.text(); });
const loader = new THREE.GLTFLoader();
// Le anteprime bloccano fetch() su blob:/data:, che GLTFLoader usa con createImageBitmap.
// Nascondendolo durante la creazione del parser, le texture passano da <img> (consentito).
const parse = (text) => new Promise((res, rej) => {
  const cib = window.createImageBitmap;
  try { window.createImageBitmap = undefined; loader.parse(text, '', res, rej); }
  catch (e) { rej(e); }
  finally { window.createImageBitmap = cib; }
});
const texLoader = new THREE.TextureLoader();
const texOr = (u, def) => u === def ? loadTex(u) : loadTex(u).catch(() => loadTex(def));
const loadTex = (url) => new Promise((res, rej) => texLoader.load(url, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); res(t); }, undefined, rej));

function model(name) {
  const src = KIT.getObjectByName(name);
  if (!src) { console.warn('manca', name); return new THREE.Group(); }
  const o = new THREE.Group(); o.name = name; o.add(src.clone(true)); // conserva la scala del nodo quantizzato
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return o;
}

/* ---- statico unito in un'unica mesh ---- */
const STATIC = [];
function addStatic(name, pos, rotY, scale) { const o = model(name); o.position.copy(pos); o.rotation.y = rotY || 0; if (scale) o.scale.setScalar(scale); STATIC.push(o); return o; }
function toFloat(g) {
  const out = new THREE.BufferGeometry();
  ['position', 'normal', 'uv'].forEach(n => {
    const a = g.getAttribute(n); if (!a) return;
    const arr = new Float32Array(a.count * a.itemSize);
    const src = a.isInterleavedBufferAttribute ? a.data.array : a.array; // r128: getX non de-normalizza
    const div = !a.normalized ? 1 : src instanceof Int8Array ? 127 : src instanceof Uint8Array ? 255 : src instanceof Int16Array ? 32767 : src instanceof Uint16Array ? 65535 : 1;
    const f = (v) => div === 1 ? v : Math.max(v / div, -1);
    for (let i = 0; i < a.count; i++) { arr[i * a.itemSize] = f(a.getX(i)); if (a.itemSize > 1) arr[i * a.itemSize + 1] = f(a.getY(i)); if (a.itemSize > 2) arr[i * a.itemSize + 2] = f(a.getZ(i)); }
    out.setAttribute(n, new THREE.BufferAttribute(arr, a.itemSize));
  });
  if (g.index) out.setIndex(Array.from(g.index.array)); else { const idx = []; for (let i = 0; i < g.getAttribute('position').count; i++) idx.push(i); out.setIndex(idx); }
  return out;
}
function bakeStatic(groundUniforms) {
  const geos = []; let mat = null;
  STATIC.forEach(o => { o.updateMatrixWorld(true); o.traverse(m => { if (!m.isMesh) return; mat = mat || m.material; const g = toFloat(m.geometry); g.applyMatrix4(m.matrixWorld);
    const uv = g.getAttribute('uv'); if (!uv) return;
    const map = m.material.map; if (map) { map.updateMatrix(); const e = map.matrix.elements, a = uv.array;
      for (let i = 0; i < a.length; i += 2) { const x = a[i], y = a[i + 1]; a[i] = e[0] * x + e[3] * y + e[6]; a[i + 1] = e[1] * x + e[4] * y + e[7]; } }
    geos.push(g); }); });
  const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(geos, false);
  const n = merged.getAttribute('normal'); for (let i = 0; i < n.count; i++) { const x = n.getX(i), y = n.getY(i), z = n.getZ(i), l = Math.hypot(x, y, z) || 1; n.setXYZ(i, x / l, y / l, z / l); }
  mat = mat.clone(); if (mat.map) { mat.map = mat.map.clone(); mat.map.offset.set(0, 0); mat.map.repeat.set(1, 1); mat.map.rotation = 0; mat.map.center.set(0, 0); mat.map.needsUpdate = true; }
  paintGround(mat, groundUniforms);
  const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  return mesh;
}

/* ---- terreno dipinto: sostituisce il verde e le strade delle tessere con texture continue ---- */
function paintGround(mat, u) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGW; varying vec3 vGN;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvGN=normalize(mat3(modelMatrix)*objectNormal);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGW=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vGW; varying vec3 vGN; uniform sampler2D tGrass; uniform sampler2D tDirt; uniform sampler2D tRoad; uniform sampler2D tSand; uniform sampler2D tCoast; uniform float uHalf; uniform vec3 uGT0; uniform vec3 uGT1;
      float gH(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float gN(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(gH(i),gH(i+vec2(1,0)),f.x),mix(gH(i+vec2(0,1)),gH(i+vec2(1,1)),f.x),f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float gUp=smoothstep(.3,.5,normalize(vGN).y);
        float gLow=1.-smoothstep(.2,.3,vGW.y);
        vec3 gBase=diffuseColor.rgb;
        float gGreen=smoothstep(-.04,-.005,gBase.g-gBase.r);
        vec2 ruv=(vGW.xz+uHalf)/(2.*uHalf); float gRoad=texture2D(tRoad,ruv).r;
        float gRep=gUp*gLow*clamp(gGreen+gRoad*1.5,0.,1.);
        if(gRep>.001){
          vec3 gr=pow(texture2D(tGrass,vGW.xz/6.5).rgb,vec3(2.2));
          vec3 gr2=pow(texture2D(tGrass,vGW.xz/17.+.37).rgb,vec3(2.2));
          float mac=gN(vGW.xz*.09)*.6+gN(vGW.xz*.31)*.4;
          gr=mix(gr,gr2,.3)*mix(uGT0,uGT1,mac);
          vec3 dt=pow(texture2D(tDirt,vGW.xz/3.4).rgb,vec3(2.2))*(.88+.24*gN(vGW.xz*.5));
          float dAmt=smoothstep(.18,.62,gRoad+(gN(vGW.xz*1.7)-.5)*.25);
          vec3 sd=pow(texture2D(tSand,vGW.xz/3.6).rgb,vec3(2.2));
          float sAmt=0.; // isola volante: niente spiaggia (sand.jpg resta disponibile)
          diffuseColor.rgb=mix(gBase,mix(mix(gr,dt,dAmt),sd,sAmt)*.38,gRep); // il terreno piatto è molto illuminato: si abbassa per non bruciare i colori
        }`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        // terreno opaco: niente riflessi del sole che cambiano colore a seconda della vista
        roughnessFactor=mix(roughnessFactor,1.,gRep); metalnessFactor=mix(metalnessFactor,0.,gRep);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal=normalize(mix(normal,normalize((viewMatrix*vec4(0.,1.,0.,0.)).xyz),gRep));`);
  };
  mat.customProgramCacheKey = () => 'ground';
}
// maschera della costa: 1 all'interno, scende verso il mare (sabbia sulle tessere di bordo)
function coastTexture() {
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); const sc = N / (2 * SHORE.half);
  x.fillStyle = '#000'; x.fillRect(0, 0, N, N); x.fillStyle = '#fff';
  const hc = CELLA * .51; LAND.forEach(k => { const [q, r] = k.split(',').map(Number); const p = W(q, r); x.fillRect((p.x - hc + SHORE.half) * sc, (p.z - hc + SHORE.half) * sc, 2 * hc * sc, 2 * hc * sc); });
  const t = document.createElement('canvas'); t.width = t.height = N / 8; const tx = t.getContext('2d'); tx.imageSmoothingEnabled = true; tx.drawImage(c, 0, 0, N / 8, N / 8);
  const out = document.createElement('canvas'); out.width = out.height = N; const o = out.getContext('2d'); o.imageSmoothingEnabled = true; o.drawImage(t, 0, 0, N, N);
  const tex = new THREE.CanvasTexture(out); tex.minFilter = THREE.LinearFilter; tex.flipY = false; // riga del canvas = asse z del mondo return tex;
}
function roadTexture() {
  const N = 2048, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); const sc = N / (2 * SHORE.half);
  x.fillStyle = '#000'; x.fillRect(0, 0, N, N); x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineWidth = 1.05 * sc;
  const P = (h) => { const p = hexPos(h); return [(p.x + SHORE.half) * sc, (p.z + SHORE.half) * sc]; };
  LINKS.forEach(([a, b]) => { x.beginPath(); x.moveTo(...P(a)); x.lineTo(...P(b)); x.stroke(); });
  x.fillStyle = '#fff'; x.beginPath(); x.arc(...P([0, 0]), 2.1 * sc, 0, Math.PI * 2); x.fill(); // piazza del castello
  ROADT.forEach(k => { x.beginPath(); x.arc(...P(k.split(',').map(Number)), .55 * sc, 0, Math.PI * 2); x.fill(); }); // anche le tessere-strada isolate
  const out = document.createElement('canvas'); out.width = out.height = N; const o = out.getContext('2d');
  const t = document.createElement('canvas'); t.width = t.height = N / 4; const tx = t.getContext('2d'); tx.imageSmoothingEnabled = true; tx.drawImage(c, 0, 0, N / 4, N / 4);
  o.imageSmoothingEnabled = true; o.drawImage(t, 0, 0, N, N); o.globalAlpha = .55; o.drawImage(c, 0, 0); o.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(out); tex.minFilter = THREE.LinearFilter; tex.flipY = false; return tex;
}

/* ================= materiale con dissolvenza ================= */
function dissolveMat(base, edge) {
  const m = base.clone();
  m.userData.u = { uProg: { value: 1 }, uDir: { value: 1 }, uY0: { value: 0 }, uY1: { value: 1 }, uEdge: { value: new THREE.Color(edge || 0xffc35a) }, uDim: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWPos; uniform float uProg; uniform float uDir; uniform float uY0; uniform float uY1; uniform vec3 uEdge; uniform float uDim;
      float dHash(vec3 p){ return fract(sin(dot(floor(p),vec3(12.9898,78.233,37.719)))*43758.5453); }
      float dNoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(mix(dHash(i),dHash(i+vec3(1,0,0)),f.x),mix(dHash(i+vec3(0,1,0)),dHash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(dHash(i+vec3(0,0,1)),dHash(i+vec3(1,0,1)),f.x),mix(dHash(i+vec3(0,1,1)),dHash(i+vec3(1,1,1)),f.x),f.y),f.z); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float dThr=clamp((vWPos.y-uY0)/max(uY1-uY0,.001),0.,1.)*.82+dNoise(vWPos*6.)*.18;
        float dE=0.;
        if(uDir>0.){ if(dThr>uProg) discard; dE=1.-smoothstep(0.,.06,uProg-dThr); }
        else { if(dThr<uProg) discard; dE=1.-smoothstep(0.,.06,dThr-uProg); }
        dE*=step(.001,uProg)*step(uProg,.999);`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(dot(gl_FragColor.rgb,vec3(.3,.59,.11)))*.55,uDim);
        gl_FragColor.rgb+=uEdge*dE*1.8;`);
  };
  m.customProgramCacheKey = () => 'dissolve';
  return m;
}
function makeDynamic(name, edge) {
  const o = model(name); const mats = [];
  o.traverse(m => { if (m.isMesh) { m.material = dissolveMat(m.material, edge); mats.push(m.material); } });
  o.userData.mats = mats;
  o.userData.set = (k, v) => mats.forEach(mt => mt.userData.u[k].value = v);
  return o;
}
function fitDissolve(o) { if (o.isSprite) return; o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); o.userData.set('uY0', b.min.y); o.userData.set('uY1', b.max.y); }

/* ================= sprite dipinti (4 viste) ================= */
let SPR_INFO = {}; const SPR_SRC = {}; const SPR_TEX = new Map(); const SPRITES = [];
const VIEW_SFX = ['N', 'E', 'S', 'O'];
function sprTex(name) {
  if (!SPR_TEX.has(name)) { const t = texLoader.load((SPR_SRC[name] || 'assets/sprites/') + name + '.webp'); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; SPR_TEX.set(name, t); }
  return SPR_TEX.get(name);
}
function spriteMat(edge) {
  const m = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false });
  m.userData.u = { uProg: { value: 1 }, uDir: { value: 1 }, uEdge: { value: new THREE.Color(edge || 0xffc35a) }, uDim: { value: 0 }, uY0: { value: 0 }, uY1: { value: 1 }, uFlip: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uFlip;').replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_UV\nif(uFlip>.5) vUv.x=1.-vUv.x;\n#endif');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uProg; uniform float uDir; uniform vec3 uEdge; uniform float uDim;
      float sH(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float sN(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(sH(i),sH(i+vec2(1,0)),f.x),mix(sH(i+vec2(0,1)),sH(i+vec2(1,1)),f.x),f.y); }`)
      .replace('#include <alphatest_fragment>', `
        float sThr=vUv.y*.84+sN(vUv*38.)*.16; float sE=0.;
        if(uDir>0.){ if(sThr>uProg) discard; sE=1.-smoothstep(0.,.05,uProg-sThr); } else { if(sThr<uProg) discard; sE=1.-smoothstep(0.,.05,sThr-uProg); }
        sE*=step(.001,uProg)*step(uProg,.999);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.3,.59,.11)))*.6,uDim);
        diffuseColor.rgb+=uEdge*sE*1.6*diffuseColor.a;
        #include <alphatest_fragment>`);
  };
  m.customProgramCacheKey = () => 'sprite-dissolve';
  return m;
}
function setSpriteImg(o, name) {
  if (o.userData.img === name) return;
  const g = o.userData.ghost;
  if (g && o.userData.img) { g.material.map = o.material.map; g.material.needsUpdate = true; g.scale.copy(o.scale); g.center.copy(o.center); g.position.copy(o.position); o.userData.fade = 1; }
  o.userData.img = name;
  const info = SPR_INFO[name] || { w: 640, h: 640 }; const W = o.userData.width;
  o.material.map = sprTex(name); o.material.needsUpdate = true;
  o.scale.set(W, W * info.h / info.w, 1); if (o.material.userData.u && o.material.userData.u.uFlip) o.material.userData.u.uFlip.value = o.userData.flip ? 1 : 0; o.center.set(.5, Math.min(.45, o.userData.cy * info.w / info.h));
}
// base: nome con le viste (es. 'castello') oppure immagine singola (es. 'casa_a'); facing: direzione dell'ingresso nel mondo
function makeSprite(base, width, pos, facing, opt) {
  opt = opt || {}; const o = new THREE.Sprite(spriteMat(opt.edge));
  o.userData.flip = !!opt.flip; o.userData.width = width; o.userData.cy = opt.cy || .3; o.userData.views = SPR_INFO[base + '_N'] ? VIEW_SFX.map(v => base + '_' + v) : null;
  o.userData.single = base; o.userData.facing = (facing || new THREE.Vector3(0, 0, 1)).clone().normalize();
  o.userData.set = (k, v) => { o.material.userData.u[k].value = v; };
  o.userData.mats = [o.material];
  o.position.copy(pos); o.position.y = .02; o.renderOrder = 10;
  if (o.userData.views) { const gm = spriteMat(opt.edge); gm.userData.u = o.material.userData.u; const g = new THREE.Sprite(gm); g.visible = false; o.userData.ghost = g; o.userData.fade = 0; scene.add(g); }
  setSpriteImg(o, o.userData.views ? o.userData.views[0] : base);
  scene.add(o); SPRITES.push(o); return o;
}
let SPR_DT = 0;
const _p0 = new THREE.Vector3(), _p1 = new THREE.Vector3(), _fw = new THREE.Vector3();
function updateSprites(fadeDur) {
  if (!VIEW_LOCK) for (const o of SPRITES) {
    if (!o.userData.views) continue;
    _p0.copy(o.position).project(camera); _p1.copy(o.position).add(o.userData.facing).project(camera);
    const dx = _p1.x - _p0.x, dy = _p1.y - _p0.y; // y verso l'alto dello schermo
    const idx = dy <= 0 ? (dx <= 0 ? 0 : 1) : (dx >= 0 ? 2 : 3); // giù-sx N, giù-dx E, su-dx S, su-sx O
    const prima = o.userData.img; setSpriteImg(o, o.userData.views[idx]); if (fadeDur && o.userData.img !== prima) o.userData.fadeDur = fadeDur;
  }
  // ordine di disegno: dal più lontano al più vicino, insieme a persone e drago
  camera.getWorldDirection(_fw);
  const list = SPRITES.map(o => [o.position.dot(_fw), o]);
  PEOPLE.forEach(P => list.push([P.o.position.dot(_fw) - .4, P.o]));
  MURI_OBJ.forEach(g => list.push([g.position.dot(_fw), g]));
  if (D.dragon) list.push([D.dragon.o.position.dot(_fw) - 3, D.dragon.o]);
  list.sort((a, b) => b[0] - a[0]);
  list.forEach(([, o], i) => { if (o.isSprite) o.renderOrder = 10 + i; else o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) m.renderOrder = 10 + i; }); });
  for (const o of SPRITES) { const g = o.userData.ghost; if (!g) continue;
    if (o.userData.fade > 0) { o.userData.fade = Math.max(0, o.userData.fade - (reduceMotion ? 1 : SPR_DT / (o.userData.fadeDur || .28))); if (!o.userData.fade) o.userData.fadeDur = 0; }
    const f = o.userData.fade; g.visible = o.visible && f > 0; g.material.opacity = f;
    g.renderOrder = o.renderOrder; }
}

/* ================= tweens ================= */
const TW = [];
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function tween(id, dur, fn, done) { for (let i = TW.length - 1; i >= 0; i--) if (TW[i].id === id) TW.splice(i, 1); TW.push({ id, dur: reduceMotion ? Math.min(dur, .01) : dur, t: 0, fn, done }); }
function stepTweens(dt) { for (let i = TW.length - 1; i >= 0; i--) { const w = TW[i]; w.t += dt; const k = Math.min(w.t / w.dur, 1); w.fn(ease(k), k); if (k >= 1) { TW.splice(i, 1); w.done && w.done(); } } }
const later = (s, fn) => setTimeout(fn, s * 1000);
function dissolveIn(o, dur, done) { fitDissolve(o); o.visible = true; o.userData.set('uDir', 1); o.userData.set('uProg', 0); o.traverse(m => { if (m.isMesh) m.castShadow = false; });
  tween('dis' + o.id, dur || 1.6, k => o.userData.set('uProg', k), () => { o.traverse(m => { if (m.isMesh) m.castShadow = true; }); done && done(); }); }
function dissolveOut(o, dur, done) { fitDissolve(o); o.userData.set('uDir', -1); o.userData.set('uProg', 0); o.traverse(m => { if (m.isMesh) m.castShadow = false; });
  tween('dis' + o.id, dur || 1.2, k => o.userData.set('uProg', k), () => { o.visible = false; o.userData.set('uDir', 1); o.userData.set('uProg', 1); done && done(); }); }

/* ================= acqua ================= */
const SHORE = { size: 2048, half: 92 };
function shoreTexture() {
  const N = SHORE.size, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const sc = N / (2 * SHORE.half);
  x.fillStyle = '#000'; x.fillRect(0, 0, N, N); x.fillStyle = '#fff';
  LAND.forEach(k => { const [q, r] = k.split(',').map(Number); const p = W(q, r); x.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = (p.x + Math.cos(a) * 1.18 + SHORE.half) * sc, py = (p.z + Math.sin(a) * 1.18 + SHORE.half) * sc; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.closePath(); x.fill(); });
  const out = document.createElement('canvas'); out.width = out.height = N; const o = out.getContext('2d'); o.imageSmoothingEnabled = true;
  o.drawImage(c, 0, 0);
  [[N / 4, .5], [N / 16, .35], [N / 64, .3]].forEach(([s, a]) => { const t = document.createElement('canvas'); t.width = t.height = s; const tx = t.getContext('2d'); tx.imageSmoothingEnabled = true; tx.drawImage(c, 0, 0, s, s); o.globalAlpha = a; o.drawImage(t, 0, 0, N, N); });
  o.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(out); tex.minFilter = THREE.LinearFilter; return tex;
}
let water;
function buildWater() {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, tShore: { value: shoreTexture() }, uHalf: { value: SHORE.half } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime; uniform sampler2D tShore; uniform float uHalf; varying vec3 vW;
      float h(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 uv=(vW.xz+uHalf)/(2.*uHalf); float s=0.; if(uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.) s=texture2D(tShore,uv).r;
        float t=uTime;
        float w1=n(vW.xz*.55+vec2(t*.22,t*.13)), w2=n(vW.xz*1.3-vec2(t*.17,-t*.21));
        vec3 deep=vec3(.08,.33,.52), mid=vec3(.14,.52,.66), shal=vec3(.40,.78,.76);
        vec3 col=mix(deep,mid,smoothstep(.0,.35,s)); col=mix(col,shal,smoothstep(.35,.75,s));
        float rip=smoothstep(.6,.9,w1*.7+w2*.3); col+=vec3(.05,.08,.08)*rip;
        float band=sin(s*22.-t*1.4+w1*1.2)*.5+.5; float foam=smoothstep(.9,.98,band)*smoothstep(.3,.55,s)*(1.-smoothstep(.8,.92,s));
        float edge=smoothstep(.9,.97,s);
        col=mix(col,vec3(.96,.99,.97),clamp(foam*.65+edge*.9,0.,1.));
        float sp=pow(n(vW.xz*1.4+t*.35),24.)*.8; col+=sp*vec3(1.,.95,.85)*(1.-s);
        float r=length(vW.xz); float a=1.-smoothstep(32.,56.,r);
        gl_FragColor=vec4(col,a);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`
  });
  water = new THREE.Mesh(new THREE.CircleGeometry(58, 80), m); water.rotation.x = -Math.PI / 2; water.position.y = -0.14; water.renderOrder = -1;
  scene.add(water);
}


/* ================= isola volante: roccia sotto e nuvole ================= */
function buildUnderside(tRock) {
  // distanza dalla costa: più si va verso il centro, più la roccia scende (misurata in esagoni di prima = 3 quadrati)
  const cd = new Map(), Q = [];
  LAND.forEach(k => { const [a, b] = k.split(',').map(Number); if (DIRS.some(([dq, dr]) => !isLand(a + dq, b + dr))) { cd.set(k, 0); Q.push(k); } });
  for (let qi = 0; qi < Q.length; qi++) { const k = Q[qi]; const [a, b] = k.split(',').map(Number);
    DIRS.forEach(([dq, dr]) => { const n = K(a + dq, b + dr); if (LAND.has(n) && !cd.has(n)) { cd.set(n, cd.get(k) + 1); Q.push(n); } }); }
  // rumore morbido (niente colonne a scatti tra un quadrato e l'altro)
  const hsh = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
  const vn = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (hsh(ix, iy) * (1 - sx) + hsh(ix + 1, iy) * sx) * (1 - sy) + (hsh(ix, iy + 1) * (1 - sx) + hsh(ix + 1, iy + 1) * sx) * sy; };
  const dep = new Map(); let maxD = 0;
  // a blocchi di 3×3 quadrati (grandi come gli esagoni di prima): colonne di roccia larghe, non un pulviscolo di colonnine
  LAND.forEach(k => { const [a, b] = k.split(',').map(Number), d = Math.floor(cd.get(k) / 3), bx = Math.floor(a / 3), by = Math.floor(b / 3);
    const v = .9 + Math.pow(Math.min(d, 9), 1.45) * 1.25 + hsh(bx, by) * 1.4 + (d > 0 && hsh(bx + 57, by - 31) < .12 ? 2.2 : 0); dep.set(k, v); maxD = Math.max(maxD, v); });
  const pos = [], nor = [], HALF = CELLA / 2 * 1.017, TOP = .09;
  const quad = (x1, z1, x2, z2, y1, y2, nx, nz) => { pos.push(x1, y1, z1, x1, y2, z1, x2, y2, z2, x1, y1, z1, x2, y2, z2, x2, y1, z2); for (let i = 0; i < 6; i++) nor.push(nx, 0, nz); };
  LAND.forEach(k => { const [a, b] = k.split(',').map(Number); const p = W(a, b); const D = dep.get(k);
    DIRS.forEach(([dq, dr]) => { const n = K(a + dq, b + dr); const top = LAND.has(n) ? -dep.get(n) : TOP; if (top <= -D) return;
      const cx = p.x + dq * HALF, cz = p.z + dr * HALF, px = -dr * HALF, pz = dq * HALF;
      quad(cx - px, cz - pz, cx + px, cz + pz, top, -D, dq, dr); }); });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tRock = { value: tRock }; sh.uniforms.uMaxD = { value: maxD };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW; varying vec3 vRN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRW=(modelMatrix*vec4(transformed,1.)).xyz; vRN=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRW; varying vec3 vRN; uniform sampler2D tRock; uniform float uMaxD;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 an=abs(vRN)+1e-4; vec2 sc=vec2(.2,.15);
        vec3 c=(texture2D(tRock,vRW.zy*sc).rgb*an.x+texture2D(tRock,vRW.xy*sc+.31).rgb*an.z)/(an.x+an.z);
        c=pow(c,vec3(2.2));
        float f=clamp(-vRW.y/uMaxD,0.,1.);
        float strata=.85+.15*sin(vRW.y*2.3+sin(vRW.x*.7+vRW.z*.5)*1.6);   // stratificazioni orizzontali
        float lip=smoothstep(-1.4,0.,vRW.y);                              // ombra sotto il bordo erboso
        c*=strata*(1.-.45*lip);
        c=mix(c*.62,vec3(.36,.52,.72)*.55,smoothstep(.25,1.,f)*.85);        // in basso si perde nella foschia del cielo
        diffuseColor.rgb=c;`);
  };
  m.customProgramCacheKey = () => 'roccia';
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; scene.add(mesh); GND.under = mesh;
  return maxD;
}
// nuvole soffici sotto e intorno all'isola
function cloudTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const r = rng(77);
  for (let i = 0; i < 14; i++) { const rad = 12 + r() * 16, cx = 18 + rad * .3 + r() * (92 - rad * .6), cy = 40 + r() * 48; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.6, 'rgba(250,250,255,.5)'); g.addColorStop(1, 'rgba(240,245,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); return t;
}
const SKYCLOUDS = [];
function buildSkyClouds(maxD) {
  const tex = cloudTex(), r = rng(99);
  for (let i = 0; i < 46; i++) {
    const below = i < 30, a = r() * 6.28, d = below ? 18 + r() * 34 : 38 + r() * 24;
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: below ? .55 + r() * .35 : .8, color: below ? 0xe9f1ff : 0xffffff });
    const s = new THREE.Sprite(m); const k = below ? 9 + r() * 12 : 7 + r() * 8; s.scale.set(k * 1.6, k, 1);
    s.position.set(Math.cos(a) * d, below ? -maxD * (.3 + r() * .65) : -2 - r() * 5, Math.sin(a) * d); s.renderOrder = 1;
    s.userData = { a, d, v: (.004 + r() * .006) * (r() < .5 ? 1 : -1) }; scene.add(s); SKYCLOUDS.push(s);
  }
}

/* ================= terreno corrotto (agente bloccato) ================= */
function corruption(center) {
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uAmt: { value: 1 }, uHeal: { value: 0 }, uC: { value: new THREE.Vector2(center.x, center.z) } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime; uniform float uAmt; uniform float uHeal; uniform vec2 uC; varying vec3 vW;
      vec2 h2(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); }
      vec2 vor(vec2 x){ vec2 n=floor(x),f=fract(x); float a=8.,b=8.; for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 r=g+h2(n+g)-f; float d=dot(r,r); if(d<a){b=a;a=d;}else if(d<b)b=d; } return vec2(sqrt(a),sqrt(b)); }
      void main(){ float d=length(vW.xz-uC); vec2 v=vor(vW.xz*1.6);
        float m=(1.-smoothstep(2.2,3.4,d+(v.x-.5)*.9))*smoothstep(uHeal,uHeal+.6,d)*uAmt;
        float crack=1.-smoothstep(0.,.06,v.y-v.x);
        float pulse=.55+.45*sin(uTime*2.8-d*2.2);
        vec3 col=mix(vec3(.08,.10,.07),vec3(.35,1.,.55),crack*pulse);
        gl_FragColor=vec4(col,m*(.42+crack*.55)); }` });
  const g = new THREE.CircleGeometry(3.6, 48); g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m); mesh.position.set(center.x, 0.03, center.z); mesh.renderOrder = 2; scene.add(mesh); return mesh;
}
function statusRing(pos) {
  const g = new THREE.RingGeometry(1.0, 1.13, 6, 1, Math.PI / 6); g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false }));
  mesh.position.set(pos.x, 0.05, pos.z); mesh.renderOrder = 3; scene.add(mesh); return mesh;
}

/* ================= particelle ================= */
const BURSTS = [];
function burst(pos, color, n, speed, life, size, opt) {
  opt = opt || {}; const p = [], v = [], c = [], r = rng(Math.floor(Math.random() * 1e9));
  const cols = (Array.isArray(color) ? color : [color]).map(x => new THREE.Color(x));
  for (let i = 0; i < n; i++) { p.push(pos.x + (r() - .5) * (opt.spread || .6), pos.y + r() * .4, pos.z + (r() - .5) * (opt.spread || .6));
    const a = r() * 6.28, s = speed * (.4 + r() * .8);
    if (opt.sphere) { const u = r() * 2 - 1, sq = Math.sqrt(1 - u * u); v.push(Math.cos(a) * sq * s, u * s, Math.sin(a) * sq * s); }
    else v.push(Math.cos(a) * s * .5, (opt.up == null ? 1 : opt.up) * speed * (.8 + r() * .9), Math.sin(a) * s * .5);
    const cc = cols[Math.floor(r() * cols.length)]; c.push(cc.r, cc.g, cc.b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('vel', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('col', new THREE.Float32BufferAttribute(c, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: opt.normal ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uLife: { value: life }, uSize: { value: size }, uZoom: { value: camera.zoom }, uG: { value: opt.g == null ? 2.2 : opt.g } },
    vertexShader: `attribute vec3 vel; attribute vec3 col; uniform float uT; uniform float uLife; uniform float uSize; uniform float uZoom; uniform float uG; varying float vA; varying vec3 vC;
      void main(){ vec3 p=position+vel*uT+vec3(0.,-uG*uT*uT,0.); vA=1.-uT/uLife; vC=col; gl_PointSize=uSize*uZoom*8.; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `varying float vA; varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; float a=smoothstep(.5,.0,d)*clamp(vA,0.,1.); gl_FragColor=vec4(vC*a*1.4,a); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); BURSTS.push(pts);
}
function stepBursts(dt) { for (let i = BURSTS.length - 1; i >= 0; i--) { const b = BURSTS[i], u = b.material.uniforms; u.uT.value += dt; u.uZoom.value = camera.zoom; if (u.uT.value > u.uLife.value) { scene.remove(b); b.geometry.dispose(); b.material.dispose(); BURSTS.splice(i, 1); } } }

/* fumo continuo dai camini */
let SMOKE = null;
function buildSmoke(sources) {
  if (!sources.length) return;
  const N = sources.length * 14, p = [], s = [];
  for (let i = 0; i < N; i++) { const src = sources[i % sources.length]; p.push(src.x, src.y, src.z); s.push(Math.random()); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('seed', new THREE.Float32BufferAttribute(s, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uZoom: { value: 1 } },
    vertexShader: `attribute float seed; uniform float uTime; uniform float uZoom; varying float vA;
      void main(){ float t=fract(uTime*.12+seed); vec3 p=position+vec3(sin(seed*40.+t*3.)*.25+t*.9,t*3.2,cos(seed*31.)*.2+t*.4);
        vA=sin(t*3.1416)*.55; vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=(6.+t*22.)*uZoom; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vec3(.86,.86,.84),smoothstep(.5,.15,d)*vA); }` });
  SMOKE = new THREE.Points(g, m); SMOKE.frustumCulled = false; scene.add(SMOKE);
}

/* uccelli */
const BIRDS = [];
function buildBirds() {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -.35, .08, -.18, 0, 0, -.05, 0, 0, 0, .35, .08, -.18, 0, 0, -.05], 3));
  const m = new THREE.MeshBasicMaterial({ color: 0x2a2620, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(g, m); b.userData = { a: i * .35, r: 18 + (i % 3) * 1.2, h: 9 + (i % 2) * .6, ph: i }; scene.add(b); BIRDS.push(b); }
}

/* ================= costruzione del mondo ================= */
const D = {}; let fan = null, wheel = null; const flags = [], clouds = [];
const LBL = {}; const PICK = [];
function hitbox(key, p, h) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, h, 6), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(p.x, h / 2, p.z); m.userData.key = key; scene.add(m); PICK.push(m); return m; }
/* terreno: tessere unite in un'unica mesh, ricostruibile dall'editor */
const GND = { mesh: null, U: null, under: null, rock: null, sig: '' };
// suolo a quadrati: righe di quadrati uniti in rettangoli; colore e strade li dipinge il materiale (paintGround)
function groundMesh(U) {
  const rows = new Map(); LAND.forEach(k => { const [x, y] = k.split(',').map(Number); if (!rows.has(y)) rows.set(y, []); rows.get(y).push(x); });
  const pos = [], nor = [], h = CELLA / 2;
  rows.forEach((xs, y) => { xs.sort((a, b) => a - b); let i = 0;
    while (i < xs.length) { let j = i; while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
      const x0 = xs[i] * CELLA - h, x1 = xs[j] * CELLA + h, z0 = y * CELLA - h, z1 = y * CELLA + h;
      pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x1, 0, z1, x1, 0, z0); for (let n = 0; n < 6; n++) nor.push(0, 1, 0); i = j + 1; } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const mat = new THREE.MeshStandardMaterial({ color: 0x4f8f3f, roughness: 1, metalness: 0 }); paintGround(mat, U);
  const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; scene.add(mesh); return mesh;
}
const groundSig = () => [...LAND].sort().join(';') + '|' + [...ROADT].sort().join(';') + '|' + [...OCC.keys()].sort().join(';');
function rebuildGround(force) {
  const sig = groundSig(); if (!force && sig === GND.sig) return; GND.sig = sig;
  if (GND.mesh) { scene.remove(GND.mesh); GND.mesh.geometry.dispose(); GND.mesh.material.dispose(); }
  ['tRoad', 'tCoast'].forEach(t => { if (GND.U[t].value) GND.U[t].value.dispose(); });
  GND.U.tRoad.value = roadTexture(); GND.U.tCoast.value = coastTexture();
  GND.mesh = groundMesh(GND.U);
  if (GND.under) { scene.remove(GND.under); GND.under.geometry.dispose(); GND.under.material.dispose(); }
  buildUnderside(GND.rock);
}
/* elementi liberi (case, natura, campi): { n, w, q, r, rot } */
const DECO = [];
const CASE = new Set(['casa_a', 'casa_b', 'fattoria']);
function genDeco() {
  const add = (n, w, q, r) => DECO.push({ n, w: w || 2.15, q, r, rot: 0 });
  LAND.forEach(k => {
    if (OCC.has(k) || ROADSET.has(k)) return;
    const [q, r] = k.split(',').map(Number); const dist = hdist(q, r); const p = W(q, r);
    const coastal = DIRS.some(([dq, dr]) => !isLand(q + dq, r + dr));
    const ang = Math.atan2(p.z, p.x) * 180 / Math.PI;
    if (coastal) { const rr = R(); if (rr < .07) add('scogli', 1.7, q, r); else if (rr < .2) add(pick(['cipressi', 'pineta']), 2.0, q, r); return; }
    if (dist >= 7 && ang < -55 && ang > -130) { const rr = R(); if (rr < .55) add(rr < .4 ? 'montagna' : 'rupe', rr < .4 ? 2.9 : 2.5, q, r); else if (rr < .8) add('pineta', 2.3, q, r); return; }
    if (dist >= 6) { const rr = R(); if (rr < .36) add(pick(['pineta', 'cipressi', 'uliveto', 'uliveto']), 2.3, q, r);
      else if (rr < .46) add('fattoria', 2.3, q, r); else if (rr < .56) add(pick(['grano', 'vigneto']), 2.3, q, r); return; }
    const rr = R();
    if (dist <= 4 && rr < .42) { add(pick(['casa_a', 'casa_b']), 2.15, q, r); return; }
    if (rr < .2 && dist > 4) add('fattoria', 2.3, q, r);
    else if (rr < .55) add(pick(['uliveto', 'vigneto', 'cipressi']), 2.2, q, r);
  });
  CAMPI_HEX.forEach((h, i) => add(i % 3 === 2 ? 'vigneto' : 'grano', 2.3, h[0], h[1]));
  add('fontana', 1.9, FONTANA_HEX[0], FONTANA_HEX[1]);
  Object.entries(CONTORNO).forEach(([n, h]) => { if (OCC.get(K(...h)) === n) add(n.length % 2 ? 'casa_a' : 'casa_b', 2.15, h[0], h[1]); });
}
const rotFacing = (base, rot) => base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -(rot || 0) * Math.PI / 2);
function removeSprite(o) { if (!o) return; scene.remove(o); if (o.userData.ghost) scene.remove(o.userData.ghost); const i = SPRITES.indexOf(o); if (i >= 0) SPRITES.splice(i, 1); o.material.dispose(); }
function spawnDeco() {
  DECO.forEach((d, i) => { removeSprite(d.o); const single = !SPR_INFO[d.n + '_N'];
    const o = makeSprite(d.n, LARGH[d.n] || 2.6, W(d.q, d.r), rotFacing(new THREE.Vector3(0, 0, 1), d.rot), { flip: single && d.rot % 2 === 1 });
    o.userData.ent = 'dc:' + i; d.o = o; });
  // elementi con un nome proprio (es. Monte di zucchero): etichetta sull'isola
  Object.keys(LBL).filter(k => k.startsWith('dl:')).forEach(k => { LBL[k].el.remove(); delete LBL[k]; });
  DECO.forEach((d, i) => { if (ETICHETTE[d.n]) { addLabelObj('dl:' + i, ETICHETTE[d.n], W(d.q, d.r), (LARGH[d.n] || 2.6) * .75, null, 'small'); LBL['dl:' + i].obj = d.o; } });
}
const ETICHETTE = { zucchero: 'Monte di C.' };
function rebuildSmoke() {
  if (SMOKE) { scene.remove(SMOKE); SMOKE.geometry.dispose(); SMOKE.material.dispose(); SMOKE = null; }
  buildSmoke(DECO.filter(d => CASE.has(d.n)).map(d => W(d.q, d.r).add(new THREE.Vector3(.1, d.n === 'fattoria' ? 1.4 : 1.5, -.1))));
}
function buildWorld(groundU) {
  GND.U = groundU;
  if (MAPPA && Array.isArray(MAPPA.deco)) MAPPA.deco.forEach(d => { if (d && typeof d.n === 'string' && SPR_INFO[d.n]) DECO.push({ n: d.n, w: +d.w || 2.15, q: +d.q, r: +d.r, rot: +d.rot || 0 }); });
  // senza mappa salvata l'isola parte vuota: solo gli edifici principali, il resto si mette con l'editor
  ROVINE_HEX.forEach(h => LAND.add(K(...h)));
  if (sistemaSovrapposti() && MAPPA) toast('Con la nuova scala alcuni elementi sono stati spostati per non sovrapporsi');
  rebuildOcc(false); // da qui in poi campi, fontana e case di contorno sono elementi liberi
  GND.sig = groundSig(); GND.mesh = groundMesh(groundU);
  spawnDeco();
  rebuildSmoke();
  buildBirds();

  // quartieri degli agenti
  ORDER.forEach(k => {
    const a = AG[k]; const p = hexPos(a.hex);
    const wd = k === 'sire' ? LARGH.sire : LARGH.agente; const spr = SPR_INFO[SPR_OF[k] + '_N'] ? SPR_OF[k] : 'tesoro'; const o = makeSprite(spr, wd, p);
    o.userData.key = k; o.userData.ent = 'ag:' + k; PICK.push(o); a.obj = o; a.pos = p; a.top = wd * .78;
    a.ring = statusRing(p);
  });
  fan = null; // le pale sono dipinte
  D.flagOut = model('flag_red'); scene.add(D.flagOut); D.flagFat = model('flag_red'); scene.add(D.flagFat); flags.push(D.flagOut, D.flagFat);
  D.corr = corruption(AG.outreach.pos);
  D.sireFlags = [0, 2, 4].map(d => { const f = model('flag_blue'); f.userData.off = DIRH[d].clone().multiplyScalar(1.24); f.scale.setScalar(1.15); scene.add(f); flags.push(f); return f; });

  // udienze: tende davanti al castello
  D.tents = [];
  [[-.5, -.4], [.55, -.25], [0, .45]].forEach(([x, z], i) => { const t = makeSprite('tenda', LARGH.tenda, new THREE.Vector3()); t.userData.off = new THREE.Vector3(x, 0, z); t.visible = i < S.udienze; t.userData.key = 'udienze'; t.userData.ent = 'sp:udienze'; PICK.push(t); D.tents.push(t); });
  addLabelObj('udienze', 'Approvazioni', hexPos(UDIENZE_HEX), 1.2, null, 'small'); D.hitUdi = hitbox('udienze', hexPos(UDIENZE_HEX), 1.2);

  // pozzo dei desideri
  D.pozzo = makeSprite('pozzo', LARGH.pozzo, hexPos(POZZO_HEX)); D.pozzo.userData.key = 'pozzo'; D.pozzo.userData.ent = 'sp:pozzo'; PICK.push(D.pozzo); addLabelObj('pozzo', 'Pozzo dei desideri', hexPos(POZZO_HEX), 1.3, null, 'small');

  // cantiere dell'impossibile
  D.stages = {};
  ['cantiere_1', 'cantiere_2', 'cantiere_3', 'torre'].forEach(n => { const o = makeSprite(n, LARGH.cantiere, hexPos(CANTIERE_HEX)); o.visible = false; o.userData.key = 'cantiere'; o.userData.ent = 'sp:cantiere'; PICK.push(o); D.stages[n] = o; });
  D.scaff = new THREE.Object3D();
  D.stageNow = stageFor(S.imp.n); D.stages[D.stageNow].visible = true;
  addLabelObj('cantiere', 'Cantiere', hexPos(CANTIERE_HEX), 3.6, 3); D.hitCant = hitbox('cantiere', hexPos(CANTIERE_HEX), 3.6);
  D.rotCant = (MAPPA && MAPPA.spec && +MAPPA.spec.rotCant) || 0;

  // rovine = idee da costruire
  D.lots = ROVINE_HEX.map((h, i) => { const ru = makeSprite('rovina', LARGH.rovina, hexPos(h), null, { edge: 0xff8a3a }); ru.userData.key = 'rovine'; ru.userData.ent = 'rv:' + i; PICK.push(ru);
    const ho = makeSprite(i % 2 ? 'casa_a' : 'casa_b', LARGH.casa, hexPos(h)); ho.visible = false; ho.userData.key = 'rovine'; ho.userData.ent = 'rv:' + i; PICK.push(ho); return { ru, ho, done: false }; });
  addLabelObj('rovine', 'Idee da costruire', hexPos(ROVINE_HEX[2]), 1.1, null, 'small');
  placeAll();

  // mulino ad acqua sulla costa
  let wmHex = null; LAND.forEach(k => { if (wmHex) return; const [q, r] = k.split(',').map(Number); if (OCC.has(k) || ROADSET.has(k)) return; if (hdist(q, r) >= 5 && q < -2 && r > 2) wmHex = [q, r]; });
  if (false && wmHex) { const wm = model('building_watermill_blue'); wm.position.copy(hexPos(wmHex)); wm.rotation.y = -Math.PI / 3; scene.add(wm); wheel = wm.getObjectByName('building_watermill_wheel_blue'); }

  // nuvole intorno all'isola
  ['cloud_big', 'cloud_small', 'cloud_big', 'cloud_small', 'cloud_big'].forEach((n, i) => { const c = model(n); c.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = .8; m.receiveShadow = false; } });
    c.scale.setScalar(1.4 + R() * .8); c.userData.a = i * Math.PI * .4 + R(); c.userData.r = 44 + R() * 6; c.userData.v = .5 + R() * .4; c.position.y = 3 + R() * 1.5; scene.add(c); clouds.push(c); });

  ORDER.forEach(k => addLabelAgent(k));
}
function placeFlag(f, a) { f.position.copy(a.pos).add(new THREE.Vector3(.72, 0, .5)); f.scale.setScalar(1.1); }
// mette agenti e luoghi speciali sulle loro tessere (all'avvio e dopo le modifiche dell'editor)
function placeAll() {
  ORDER.forEach(k => { const a = AG[k], p = hexPos(a.hex); a.pos = p;
    const base = k === 'sire' || p.lengthSq() < .01 ? new THREE.Vector3(0, 0, 1) : p.clone().negate().normalize();
    a.obj.position.set(p.x, .02, p.z); a.obj.userData.facing = rotFacing(base, a.rot); a.ring.position.set(p.x, a.ring.position.y, p.z); });
  placeFlag(D.flagOut, AG.outreach); placeFlag(D.flagFat, AG.fatture);
  D.corr.position.set(AG.outreach.pos.x, D.corr.position.y, AG.outreach.pos.z); D.corr.material.uniforms.uC.value.set(AG.outreach.pos.x, AG.outreach.pos.z);
  D.sireFlags.forEach(f => f.position.copy(AG.sire.pos).add(f.userData.off));
  const up = hexPos(UDIENZE_HEX); D.tents.forEach(t => t.position.set(up.x + t.userData.off.x, .02, up.z + t.userData.off.z));
  LBL.udienze.p.set(up.x, LBL.udienze.p.y, up.z); D.hitUdi.position.set(up.x, D.hitUdi.position.y, up.z);
  const pp = hexPos(POZZO_HEX); D.pozzo.position.set(pp.x, .02, pp.z); LBL.pozzo.p.set(pp.x, LBL.pozzo.p.y, pp.z);
  const cp = hexPos(CANTIERE_HEX), cb = cp.lengthSq() < .01 ? new THREE.Vector3(0, 0, 1) : cp.clone().negate().normalize();
  Object.values(D.stages).forEach(o => { o.position.set(cp.x, .02, cp.z); o.userData.facing = rotFacing(cb, D.rotCant); });
  LBL.cantiere.p.set(cp.x, LBL.cantiere.p.y, cp.z); D.hitCant.position.set(cp.x, D.hitCant.position.y, cp.z);
  D.lots.forEach((l, i) => { const p = hexPos(ROVINE_HEX[i]); l.ru.position.set(p.x, .02, p.z); l.ho.position.set(p.x, .02, p.z); });
  const r2 = hexPos(ROVINE_HEX[2]); LBL.rovine.p.set(r2.x, LBL.rovine.p.y, r2.z);
  updateSprites();
}
function stageFor(n) { return n >= S.imp.tot ? 'torre' : n >= 6 ? 'cantiere_3' : n >= 3 ? 'cantiere_2' : 'cantiere_1'; }
const SPR_OF = { sire: 'castello', jarvis: 'mulino', preventivi: 'mercato', fatture: 'tesoro', contatti: 'taverna', outreach: 'torre', cervello: 'tempio', costi: 'erario' };

/* ================= personaggi e animali ================= */
const PEOPLE = [];
// Altezza vera di un modello con scheletro: le ossa danno la misura reale (il box della mesh non tiene conto della scala dell'armatura)
function realHeight(o) { o.updateMatrixWorld(true); const b = new THREE.Box3(), v = new THREE.Vector3(); let n = 0;
  o.traverse(x => { if (x.isBone) { b.expandByPoint(v.setFromMatrixPosition(x.matrixWorld)); n++; } });
  if (n < 2) { b.setFromObject(o); return b.max.y - b.min.y; } return (b.max.y - b.min.y) * 1.18; }
function person(g, opt) {
  const o = THREE.SkeletonUtils.clone(g.scene);
  o.scale.setScalar((opt.h || .62) / (opt.bones ? realHeight(o) : (() => { const b = new THREE.Box3().setFromObject(o); return b.max.y - b.min.y; })()));
  o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = true; m.frustumCulled = false; m.material.transparent = true; }
    if (!opt.keepProps && /sword|shield|staff|wand|book|axe|dagger|crossbow|mug|spellbook/i.test(m.name)) m.visible = false; });
  scene.add(o);
  const mixer = new THREE.AnimationMixer(o); const acts = {};
  g.animations.forEach(c => { const n = c.name.replace(/^.*\|/, ''); acts[n] = mixer.clipAction(c); });
  const P = Object.assign({ o, mixer, acts, cur: null, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1, len: 1, wait: 0, speed: .55 }, opt);
  P.o = o; P.mixer = mixer; P.acts = acts;
  P.play = (n, fade) => { const a = acts[n]; if (!a || P.cur === a) return; if (P.cur) P.cur.fadeOut(fade || .3); a.reset().fadeIn(fade || .3).play(); P.cur = a; };
  PEOPLE.push(P); return P;
}
/* ---- personaggi dipinti: 2 fotogrammi di camminata, davanti (F) e di spalle (B); specchiati per sinistra/destra ---- */
const hasWalker = (k) => !!(SPR_INFO[k + '_F1'] && SPR_INFO[k + '_B1']);
const _sa = new THREE.Vector3(), _sb = new THREE.Vector3();
function spritePerson(kind, opt) {
  const o = new THREE.Sprite(spriteMat()); o.userData.width = 1; o.userData.cy = .02; o.userData.set = () => {};
  const P = Object.assign({ o, kind, acts: {}, cur: 'Idle', from: new THREE.Vector3(), to: new THREE.Vector3(), t: 1, len: 1, wait: 0, speed: .55, ft: 0, fr: 1, back: false, left: false, h: .66 }, opt);
  P.acts = { Cheer: true }; P.play = (n) => { P.cur = n; };
  const nFr = (d) => { let n = 0; while (SPR_INFO[kind + '_' + d + (n + 1)]) n++; return Math.max(1, n); };
  P.frame = () => { const d = P.back ? 'B' : 'F', name = kind + '_' + d + (((P.fr - 1) % nFr(d)) + 1); const info = SPR_INFO[name];
    if (info) o.userData.width = P.h * info.w / info.h; o.userData.flip = P.left; o.userData.img = null; setSpriteImg(o, name); };
  P.mixer = { update: (dt) => { const walking = P.t < 1 && P.cur !== 'Idle';
    if (P.post) { // guardie: ai lati dell'ingresso del castello, rivolte verso l'esterno come l'ingresso
      const c = AG.sire.pos, f = AG.sire.obj.userData.facing, sx = -f.z, sz = f.x, dd = RW(RAGGIO.sire) + .2;
      P.o.position.set(c.x + f.x * dd + sx * P.post, .02, c.z + f.z * dd + sz * P.post);
      _sa.copy(P.o.position).project(camera); _sb.copy(P.o.position).add(f).project(camera); P.back = _sb.y > _sa.y; P.left = _sb.x < _sa.x; }
    if (walking) { _sa.copy(P.from).project(camera); _sb.copy(P.to).project(camera); const vx = _sb.x - _sa.x, vy = (_sb.y - _sa.y) * (cam.hh || 1) / (cam.hw || 1), vl = Math.hypot(vx, vy) || 1;
      // cambia verso solo se il movimento è deciso in quella direzione: niente scatti destra/sinistra sui tratti quasi verticali o orizzontali
      if (Math.abs(vy) > vl * .3) P.back = vy > 0; if (Math.abs(vx) > vl * .3) P.left = vx < 0; P.ft += dt * (P.speed > 1 ? 12 : 7); }
    const fr = walking ? (Math.floor(P.ft) % 4) + 1 : 2; /* fermo: posa a piedi uniti */ const hop = P.cheer > 0 ? Math.abs(Math.sin(time * 9)) * .18 : walking ? Math.abs(Math.sin(P.ft * Math.PI)) * .035 : 0;
    if (fr !== P.fr || P.back !== P._b || P.left !== P._l) { P.fr = fr; P._b = P.back; P._l = P.left; P.frame(); }
    o.center.y = .02 - hop / Math.max(.01, o.scale.y); } };
  P.frame(); o.position.y = .02; scene.add(o); PEOPLE.push(P); return P;
}
function spokePoint(d, f) { return DIRH[d % 6].clone().multiplyScalar(2 * f); }
function walkTo(P, from, to, anim) { P.from.copy(from); P.to.copy(to); P.len = Math.max(.01, from.distanceTo(to)); P.t = 0; P.o.position.copy(from); if (!P.o.isSprite) P.o.rotation.y = Math.atan2(to.x - from.x, to.z - from.z); P.play(anim || P.walkAnim || 'Walking_A'); }
/* ---- percorsi: si esce e si entra solo dalle porte, si cammina sulle tessere libere (strade preferite) ---- */
const DIRW = DIR8.map(([x, y]) => new THREE.Vector3(x, 0, y).normalize());
function dirVicina(v) { let b = 0, bd = -2; DIRW.forEach((w, i) => { const d = w.x * v.x + w.z * v.z; if (d > bd) { bd = d; b = i; } }); return b; }
function bloccate() { const s = new Set(); tuttiEnt().forEach(id => tessereDi(entHex(id), raggioDi(id)).forEach(t => s.add(K(...t)))); MURI.forEach((t, k) => { if (!TIPI_MURO[t].passa) s.add(k); }); return s; }
// porta di un edificio: tessera libera davanti all'ingresso (h) e soglia sul bordo, dove il personaggio compare e scompare
function portaDi(k) { const a = AG[k], rg = k === 'sire' ? RAGGIO.sire : RAGGIO.agente;
  const d = dirVicina((a.obj && a.obj.userData.facing) || new THREE.Vector3(0, 0, 1));
  const ideale = [a.hex[0] + DIR8[d][0] * (rg + 1), a.hex[1] + DIR8[d][1] * (rg + 1)], blk = bloccate(); let h = null;
  // la tessera davanti alla porta deve essere libera: altrimenti la più vicina libera attorno all'edificio
  for (let ring = rg + 1; ring <= rg + 3 && !h; ring++) { let best = 1e9; tessereDi(a.hex, ring).forEach(t => { if (HD(t, a.hex) !== ring || !LAND.has(K(...t)) || blk.has(K(...t))) return; const c = HD(t, ideale); if (c < best) { best = c; h = t; } }); }
  h = h || ideale;
  const verso = W(h[0] - a.hex[0], h[1] - a.hex[1]).normalize();
  return { h, soglia: a.pos.clone().setY(0).add(verso.multiplyScalar(RW(rg) - .35)), d, rg }; }
// Dijkstra su quadrati, 8 direzioni; in diagonale solo se i due lati sono liberi (niente angoli tagliati negli edifici o nei recinti)
function cammino(h0, h1) {
  const blk = bloccate(), k0 = K(...h0), k1 = K(...h1); blk.delete(k0); blk.delete(k1);
  const ok = (x, y) => { const k = K(x, y); return LAND.has(k) && !blk.has(k); };
  const dist = new Map([[k0, 0]]), prev = new Map(), heap = [[0, h0[0], h0[1]]];
  const push = (e) => { heap.push(e); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) { const [c, x, y] = pop(), kh = K(x, y); if (kh === k1) break; if (c > dist.get(kh)) continue;
    for (const [dx, dy] of DIR8) { const nx = x + dx, ny = y + dy, kn = K(nx, ny); if (!ok(nx, ny)) continue;
      const diag = dx && dy; if (diag && (!ok(x + dx, y) || !ok(x, y + dy))) continue;
      const nc = c + (ROADT.has(kn) ? 1 : 2.2) * (diag ? 1.414 : 1); if (nc < (dist.has(kn) ? dist.get(kn) : 1e9)) { dist.set(kn, nc); prev.set(kn, kh); push([nc, nx, ny]); } } }
  if (!dist.has(k1)) return null; const out = []; for (let k = k1; k; k = prev.get(k)) { const [q, r] = k.split(',').map(Number); out.unshift(W(q, r)); } return out; }
// da porta a porta; null se gli edifici non sono collegati da terra libera
function percorso(da, a, lat) { const pa = portaDi(da), pb = portaDi(a), mid = cammino(pa.h, pb.h); if (!mid) return null;
  const pts = liscia([pa.soglia, ...mid, pb.soglia]);
  if (lat) for (let i = 1; i < pts.length - 1; i++) { const v = pts[i + 1].clone().sub(pts[i - 1]); pts[i] = pts[i].clone().add(new THREE.Vector3(-v.z, 0, v.x).normalize().multiplyScalar(lat)); }
  return pts; }
// toglie le svolte inutili: tiene un punto solo se la linea dritta verso il successivo attraversa tessere occupate
function libera(a, b, blk) { const n = Math.ceil(a.distanceTo(b) / .15); for (let i = 1; i < n; i++) { const x = a.x + (b.x - a.x) * i / n, z = a.z + (b.z - a.z) * i / n, h = cellaDi(x, z), k = K(...h); if (!LAND.has(k) || blk.has(k)) return false; } return true; }
function liscia(pts) { if (pts.length <= 3) return pts; const blk = bloccate(), out = [pts[0], pts[1]]; let i = 1;
  while (i < pts.length - 2) { let j = pts.length - 2; while (j > i + 1 && !libera(pts[i], pts[j], blk)) j--; out.push(pts[j]); i = j; }
  out.push(pts[pts.length - 1]); return out; }
function setAlpha(P, a) { P.alpha = a; if (P.o.isSprite) P.o.material.opacity = a; else P.o.traverse(m => { if (m.material) m.material.opacity = a; }); }
// segue i punti; compare uscendo dalla porta (primo tratto) e scompare entrando (ultimo tratto)
function seguiPercorso(P, pts, fine) { P.route = pts; P.ri = 0; P.fine = fine; setAlpha(P, 0); walkTo(P, pts[0], pts[1]); }
function stepPeople(dt) {
  PEOPLE.forEach(P => {
    P.mixer.update(dt);
    if (P.cheer > 0) { P.cheer -= dt; if (P.cheer <= 0) P.play(P.t < 1 ? (P.walkAnim || 'Walking_A') : (P.idleAnim || 'Idle')); return; }
    if (P.t < 1 && P.route) { P.t += dt * P.speed / P.len; const k = Math.min(P.t, 1), last = P.route.length - 2; P.o.position.lerpVectors(P.from, P.to, k);
      setAlpha(P, P.ri === 0 && last === 0 ? 1 - Math.abs(k * 2 - 1) : P.ri === 0 ? k : P.ri === last ? 1 - k : 1);
      if (P.t >= 1) { if (P.ri < last) { P.ri++; walkTo(P, P.route[P.ri], P.route[P.ri + 1]); } else { const f = P.fine; P.route = null; P.fine = null; setAlpha(P, 0); P.play(P.idleAnim || 'Idle'); P.wait = 0; f && f(P); } }
      return; }
    if (P.t < 1) { P.t += dt * P.speed / P.len; P.o.position.lerpVectors(P.from, P.to, Math.min(P.t, 1)); if (P.t >= 1) { P.play(P.idleAnim || 'Idle'); P.wait = P.pause == null ? 1.5 + Math.random() * 2 : P.pause; P.arrive && P.arrive(P); } return; }
    if (P.wait > 0) { P.wait -= dt; if (P.wait <= 0 && P.next) P.next(P); }
  });
}
function spokeWalker(g, d0, h) {
  const P = typeof g === 'string' ? spritePerson(g, { h: (h || .62) * .95 }) : person(g, { h: h || .62 }); P.dir = d0; P.out = true;
  P.next = (Q) => { const a = spokePoint(Q.dir, .7), b = spokePoint(Q.dir, 3.4); const s = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(.2);
    if (Q.out) walkTo(Q, a.clone().add(s), b.clone().add(s)); else { walkTo(Q, b.clone().sub(s), a.clone().sub(s)); Q.dir = (Q.dir + 1 + Math.floor(Math.random() * 4)) % 6; }
    Q.out = !Q.out; };
  P.wait = Math.random() * 3; P.play('Idle'); P.o.position.copy(spokePoint(d0, .6)); return P;
}
// abitante: esce dalla porta di un edificio, cammina fino alla porta di un altro ed entra; poi riparte da lì
function viaggiatore(g, i, h) {
  const P = typeof g === 'string' ? spritePerson(g, { h: (h || .62) * .95 }) : person(g, { h: h || .62 });
  P.lat = (Math.random() - .5) * .5; setAlpha(P, 0);
  P.next = (Q) => { const ks = ORDER.filter(k => AG[k] && AG[k].obj); if (ks.length < 2) { Q.wait = 5; return; }
    const da = Q.da || ks[i % ks.length]; let a = pick(ks); for (let n = 0; n < 8 && a === da; n++) a = pick(ks);
    const pts = a !== da && percorso(da, a, Q.lat); if (!pts) { Q.da = pick(ks); Q.wait = 2; return; }
    Q.da = a; Q.o.position.copy(pts[0]); seguiPercorso(Q, pts, (R2) => { R2.wait = 2 + Math.random() * 5; }); };
  P.wait = 1 + i * 1.7 + Math.random() * 2; P.play('Idle'); return P;
}
function addLife(G) {
  // personaggi dipinti della skin, se ci sono; altrimenti i modelli 3D
  if (hasWalker('omino_a')) { const kinds = ['omino_a', 'omino_b', 'messaggero'].filter(hasWalker);
    for (let i = 0; i < 6; i++) viaggiatore(kinds[i % kinds.length], i, .62);
    if (hasWalker('guardia')) [.8, -.8].forEach(x => { const P = spritePerson('guardia', { h: .62, post: x * 1.6 }); P.guard = true; });
    G = Object.assign({}, G, { knight: null, mage: null, rogue: null }); }
  if (hasWalker('animale')) G = Object.assign({}, G, { deer: 'animale' });
  const chars = [G.knight, G.mage, G.rogue].filter(Boolean);
  if (chars.length) {
    for (let i = 0; i < 6; i++) viaggiatore(chars[i % chars.length], i, .62);
    if (G.knight) [[.55, 1.35], [-.55, 1.35]].forEach(([x, z]) => { const P = person(G.knight, { h: .64, keepProps: true }); P.o.position.set(x, 0, z); P.o.rotation.y = 0; P.play('Idle'); P.guard = true; });
    CAMPI_HEX.slice(0, 3).forEach((h, i) => { const P = person(chars[(i + 1) % chars.length], { h: .6, idleAnim: 'Interact', pause: 0 }); const p = hexPos(h); P.o.position.set(p.x + .3, 0, p.z - .2); P.o.rotation.y = i * 2; P.play(i % 2 ? 'PickUp' : 'Interact');
      P.next = (Q) => { Q.play(pick(['Interact', 'PickUp', 'Use_Item'])); Q.wait = 3 + Math.random() * 3; }; P.wait = 2 + i; });
  }
  if (G.deer) {
    const spots = []; LAND.forEach(k => { const [q, r] = k.split(',').map(Number); const p = W(q, r), ang = Math.atan2(p.z, p.x) * 180 / Math.PI; const L = p.length(); if (L > 7.6 && L < 8.3 && ang > -35 && ang < 35 && !OCC.has(k) && !ROADSET.has(k)) spots.push(p); });
    spots.slice(0, 3).forEach((p, i) => { const P = G.deer === 'animale' ? spritePerson('animale', { h: .55, speed: .35, walkAnim: 'Walk', idleAnim: 'Idle', pause: 4 }) : person(G.deer, { h: .5, bones: true, keepProps: true, speed: .35, walkAnim: 'Walk', idleAnim: 'Eating', pause: 4 }); P.home = p.clone().add(new THREE.Vector3(-1.1, 0, .3)); P.o.position.copy(P.home); P.play('Eating');
      P.next = (Q) => { const t = Q.home.clone().add(new THREE.Vector3((Math.random() - .5) * 1.4, 0, (Math.random() - .5) * 1.4)); const h = cellaDi(t.x, t.z);
        if (!LAND.has(K(...h)) || bloccate().has(K(...h))) { Q.wait = 3; return; } walkTo(Q, Q.o.position.clone(), t, 'Walk'); }; P.wait = 2 + i * 2; });
  }
  if (SPR_INFO.minaccia_1) { // minaccia dipinta (drago, kraken, drone…): due fotogrammi che si alternano
    const o = new THREE.Sprite(spriteMat()); o.userData.width = 5.5; o.userData.cy = .5; o.userData.set = () => {}; setSpriteImg(o, 'minaccia_1'); scene.add(o);
    let t = 0, f = 1; const nm = SPR_INFO.minaccia_4 ? 4 : SPR_INFO.minaccia_2 ? 2 : 1; const mixer = { update: (dt) => { t += dt; const nf = Math.floor(t * (nm > 2 ? 7 : 3)) % nm + 1; if (nf !== f && SPR_INFO['minaccia_' + nf]) { f = nf; o.userData.img = null; setSpriteImg(o, 'minaccia_' + nf); } } };
    D.dragon = { o, mixer, a: 0, k: S.scadute > 0 ? 1 : 0 }; o.visible = S.scadute > 0; G = Object.assign({}, G, { dragon: null }); }
  if (G.dragon) { const o = THREE.SkeletonUtils.clone(G.dragon.scene); o.scale.setScalar(1.3 / realHeight(o));
    o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = true; m.frustumCulled = false; m.material = m.material.clone(); m.material.color.multiplyScalar(.32); m.material.transparent = true; } }); scene.add(o);
    const mixer = new THREE.AnimationMixer(o); const fly = G.dragon.animations.find(c => /Fast_Flying/.test(c.name)) || G.dragon.animations[0]; if (fly) mixer.clipAction(fly).play();
    D.dragon = { o, mixer, a: 0, k: S.scadute > 0 ? 1 : 0 }; o.visible = S.scadute > 0; }
}
function cheerAll(sec) { PEOPLE.forEach(P => { if (P.acts.Cheer) { P.cheer = sec; P.play('Cheer', .2); } }); }

/* ================= camera isometrica ================= */
const VIEWS = ['Nord', 'Est', 'Sud', 'Ovest'];
const cam = { yaw: Math.PI / 4, view: 0, pitch: 0.6155, tx: 0, ty: -5.5, tz: 0.8, zoom: innerWidth < innerHeight ? .64 : .52 }; // ty: si guarda un po' sotto, per vedere la roccia
const HOME_ZOOM = cam.zoom;
function frame() { const asp = innerWidth / innerHeight; let hw, hh; if (asp < 1) { hw = 14; hh = hw / asp; } else { hh = 12.5; hw = hh * asp; }
  camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh; camera.updateProjectionMatrix(); cam.hw = hw; cam.hh = hh; }
function placeCam() {
  const c = Math.cos(cam.pitch), s = Math.sin(cam.pitch), d = 70;
  camera.position.set(cam.tx + Math.sin(cam.yaw) * c * d, cam.ty + s * d, cam.tz + Math.cos(cam.yaw) * c * d);
  camera.lookAt(cam.tx, cam.ty, cam.tz); camera.zoom = cam.zoom; camera.updateProjectionMatrix();
}
let rotating = false;
// rotazione continua attorno al centro dello schermo; gli edifici dipinti cambiano vista in dissolvenza incrociata
let VIEW_LOCK = false; // durante la rotazione le immagini degli edifici restano quelle della vista finale
function rotate(step) {
  if (rotating || !step) return; rotating = true;
  cam.view = (cam.view + step + 4) % 4; const y0 = cam.yaw, y1 = cam.yaw - step * Math.PI / 2;
  // punto del terreno al centro dello schermo: resta fermo mentre la vista gira
  const k0 = cam.ty / Math.tan(cam.pitch), gx = cam.tx - Math.sin(y0) * k0, gz = cam.tz - Math.cos(y0) * k0;
  // l'isola gira; gli edifici non cambiano immagine a metà giro: passano subito alla vista finale con una dissolvenza lunga quanto la rotazione
  const dur = .5 + .12 * (Math.abs(step) - 1);
  const s0 = { yaw: cam.yaw, tx: cam.tx, tz: cam.tz };
  cam.yaw = y1; cam.tx = gx + Math.sin(y1) * k0; cam.tz = gz + Math.cos(y1) * k0; placeCam(); camera.updateMatrixWorld();
  VIEW_LOCK = false; updateSprites(dur); VIEW_LOCK = true;
  Object.assign(cam, s0); placeCam();
  tween('rot', dur, k => { cam.yaw = y0 + (y1 - y0) * k; cam.tx = gx + Math.sin(cam.yaw) * k0; cam.tz = gz + Math.cos(cam.yaw) * k0; },
    () => { cam.yaw = y1; cam.tx = gx + Math.sin(y1) * k0; cam.tz = gz + Math.cos(y1) * k0; rotating = false; VIEW_LOCK = false; });
  $('needle').style.transform = `rotate(${cam.view * 90}deg)`; $('dir-lbl').textContent = VIEWS[cam.view];
}
const ZMIN = .15, ZMAX = 7; // zoom ravvicinato (richiesto da Andrea)
function zoomBy(f) { const z0 = cam.zoom, z1 = Math.min(ZMAX, Math.max(ZMIN, cam.zoom * f)); tween('zoom', .3, k => { cam.zoom = z0 + (z1 - z0) * k; }); }
function goTo(pos, z) { const x0 = cam.tx, z0 = cam.tz, zz0 = cam.zoom, zz1 = z || Math.max(cam.zoom, 1.8);
  tween('pan', .9, k => { cam.tx = x0 + (pos.x - x0) * k; cam.tz = z0 + (pos.z - z0) * k; cam.zoom = zz0 + (zz1 - zz0) * k; }); }
function clampCam() { const r = Math.hypot(cam.tx, cam.tz); if (r > 32) { cam.tx *= 32 / r; cam.tz *= 32 / r; } }
function panPixels(dx, dy) {
  const wpp = (2 * cam.hw / cam.zoom) / innerWidth, hpp = (2 * cam.hh / cam.zoom) / innerHeight / Math.sin(cam.pitch);
  const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  cam.tx += -rx * dx * wpp + fx * dy * hpp; cam.tz += -rz * dx * wpp + fz * dy * hpp; clampCam();
}
const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, moved = 0, edGrab = false, mid0 = null;
const midOf = () => { const [a, b] = [...ptrs.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0;
  if (ptrs.size === 1 && ED.on) edGrab = edDown(e.clientX, e.clientY);
  if (ptrs.size === 2) { if (edGrab) { edUp(); edGrab = false; } const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = cam.zoom; mid0 = midOf(); } });
canvas.addEventListener('pointermove', e => {
  if (ED.on && !ptrs.size && e.pointerType === 'mouse') { edInitMarks(); const h = ED.tool !== 'sel' && hexAt(e.clientX, e.clientY); showMark(MK.hov, h || null, 0xffffff); }
  const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy);
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) { if (edGrab) edMove(e.clientX, e.clientY); else panPixels(dx, dy); }
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) cam.zoom = Math.min(ZMAX, Math.max(ZMIN, zoom0 * d / pinch0));
    const m = midOf(); if (mid0) panPixels(m.x - mid0.x, m.y - mid0.y); mid0 = m; } });
['pointerup', 'pointercancel'].forEach(t => canvas.addEventListener(t, e => { const was = ptrs.size; ptrs.delete(e.pointerId); pinch0 = 0; mid0 = null;
  if (edGrab && was === 1) { edGrab = false; edUp(); return; }
  // un tocco sulla mappa con un pannello aperto lo chiude soltanto (non apre altro)
  if (t === 'pointerup' && was === 1 && moved < 8) { const aperto = !sheet.hidden; if (aperto) setSheet(null);
    if (ED.on) { if (ED.tool === 'sel') { ED.sel = null; edSelShow(); } } else if (!aperto) pickAt(e.clientX, e.clientY); } }));
canvas.addEventListener('wheel', e => { e.preventDefault(); cam.zoom = Math.min(ZMAX, Math.max(ZMIN, cam.zoom * (1 - e.deltaY * .0012))); }, { passive: false });
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const k = e.key;
  if (k === 'q' || k === 'Q') rotate(-1); else if (k === 'e' || k === 'E') rotate(1);
  else if (k === '+' || k === '=') zoomBy(1.25); else if (k === '-' || k === '_') zoomBy(.8);
  else if (k === 'ArrowLeft') panPixels(60, 0); else if (k === 'ArrowRight') panPixels(-60, 0);
  else if (k === 'ArrowUp') panPixels(0, 60); else if (k === 'ArrowDown') panPixels(0, -60);
  else if (k === 'Escape') { setSheet(null); closeOverlay(); } else return;
  if (k.startsWith('Arrow')) e.preventDefault();
});
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(PICK, false)[0]; if (hit) openPlace(hit.object.userData.key); }

/* ================= etichette ================= */
const lblLayer = $('labels');
function addLabelAgent(k) { const a = AG[k]; addLabelObj(k, a.nome, a.pos, a.top + .25, a.liv, '', true); LBL[k].obj = a.obj; }
function addLabelObj(key, text, pos, y, lv, cls, withState) {
  const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl ' + (cls || '');
  el.innerHTML = (lv ? `<span class="sh">${lv}</span>` : '') + `<span>${text}</span>` + (withState ? `<span class="dot" id="st-${key}"></span>` : '');
  el.addEventListener('click', () => { if (!ED.on) openPlace(key); }); lblLayer.appendChild(el);
  LBL[key] = { el, p: new THREE.Vector3(pos.x, y, pos.z) };
}
const vt = new THREE.Vector3();
function updateLabels() { const w = innerWidth, h = innerHeight, placed = [];
  const keys = Object.keys(LBL).sort((a, b) => (AG[b] ? 1 : 0) - (AG[a] ? 1 : 0));
  const up = _fw.set(0, 1, 0).applyQuaternion(camera.quaternion);
  for (const k of keys) { const L = LBL[k];
    if (L.obj) vt.copy(L.obj.position).addScaledVector(up, L.obj.scale.y * (1 - L.obj.center.y) * .92).project(camera); else vt.copy(L.p).project(camera); if (vt.x < -1.1 || vt.x > 1.1 || vt.y < -1.1 || vt.y > 1.1) { L.el.hidden = true; continue; }
    if (!L.w) { L.el.hidden = false; L.w = L.el.offsetWidth || 120; L.h = L.el.offsetHeight || 30; }
    let x = (vt.x * .5 + .5) * w, y = (-vt.y * .5 + .5) * h, ok = false;
    for (let tries = 0; tries < 2 && !ok; tries++) { const r = { l: x - L.w / 2, r: x + L.w / 2, t: y - L.h, b: y }; ok = !placed.some(p => r.l < p.r && r.r > p.l && r.t < p.b && r.b > p.t); if (ok) placed.push(r); else y -= L.h + 3; }
    L.el.hidden = !ok; if (ok) L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`; } }

/* ================= audio ================= */
const AUDIO = (() => {
  let ac = null, out = null, amb = null, nextBird = 0, CORO = null;
  function ctx() { if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = .8; out.connect(ac.destination); } if (ac.state === 'suspended') ac.resume(); return ac; }
  function noise(dur) { const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; const s = ac.createBufferSource(); s.buffer = buf; return s; }
  function sfx(fn) { if (!S.suoni) return; try { ctx(); fn(ac, out); } catch (e) { } }
  function wind(on) { if (!ac) return; if (on && !amb) { const n = noise(4); n.loop = true; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; amb = ac.createGain(); amb.gain.value = .05; n.connect(lp).connect(amb).connect(out); n.start(); amb.src = n; }
    if (!on && amb) { try { amb.src.stop(); } catch (e) { } amb.disconnect(); amb = null; } }
  const A = {
    set(on) { S.suoni = on; if (on) { try { ctx(); wind(true); } catch (e) { } } else wind(false); },
    tick(now) { if (!S.suoni || !ac) return; if (now > nextBird) { nextBird = now + 3 + Math.random() * 6; sfx((a, o) => { const t = a.currentTime; for (let i = 0; i < 3; i++) { const os = a.createOscillator(), g = a.createGain(); const s = t + i * .13; os.frequency.setValueAtTime(2600 + Math.random() * 900, s); os.frequency.exponentialRampToValueAtTime(1700, s + .09); g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(.045, s + .02); g.gain.linearRampToValueAtTime(0, s + .1); os.connect(g).connect(o); os.start(s); os.stop(s + .12); } }); } },
    fanfare() { sfx((a, o) => { const t = a.currentTime; [[0, 293.66], [.18, 293.66], [.36, 440], [.7, 587.33]].forEach(([s, fr], i) => { const os = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(); os.type = 'sawtooth'; os.frequency.value = fr; lp.type = 'lowpass'; lp.frequency.value = 2200; const d = i === 3 ? 1.2 : .16; g.gain.setValueAtTime(0, t + s); g.gain.linearRampToValueAtTime(.2, t + s + .03); g.gain.setValueAtTime(.2, t + s + d - .05); g.gain.linearRampToValueAtTime(0, t + s + d); os.connect(lp); lp.connect(g); g.connect(o); os.start(t + s); os.stop(t + s + d); }); }); },
    clink() { sfx((a, o) => { const t = a.currentTime; for (let i = 0; i < 10; i++) { const os = a.createOscillator(), g = a.createGain(); os.frequency.value = 2400 + Math.random() * 1800; const s = t + i * .07 + Math.random() * .05; g.gain.setValueAtTime(.08, s); g.gain.exponentialRampToValueAtTime(.001, s + .25); os.connect(g); g.connect(o); os.start(s); os.stop(s + .3); } }); },
    horn() { sfx((a, o) => { const t = a.currentTime; [73.42, 110].forEach((fr, i) => { const os = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(); os.type = 'sawtooth'; os.frequency.setValueAtTime(fr * .94, t); os.frequency.linearRampToValueAtTime(fr, t + .3); lp.type = 'lowpass'; lp.frequency.value = 900; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35 / (i + 1), t + .25); g.gain.setValueAtTime(.35 / (i + 1), t + 1.6); g.gain.linearRampToValueAtTime(0, t + 2.4); os.connect(lp); lp.connect(g); g.connect(o); os.start(t); os.stop(t + 2.5); }); }); },
    boom() { sfx((a, o) => { const t = a.currentTime, n = noise(.8), g = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .8); n.connect(lp).connect(g).connect(o); n.start(t); }); },
    stamp() { sfx((a, o) => { const t = a.currentTime, n = noise(.2), g = a.createGain(), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; g.gain.setValueAtTime(.7, t); g.gain.exponentialRampToValueAtTime(.001, t + .2); n.connect(lp).connect(g).connect(o); n.start(t); }); },
    roar() { sfx((a, o) => { const t = a.currentTime, os = a.createOscillator(), g = a.createGain(); os.type = 'sawtooth'; os.frequency.setValueAtTime(90, t); os.frequency.linearRampToValueAtTime(55, t + 1.8); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + .2); g.gain.linearRampToValueAtTime(0, t + 1.9); const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; os.connect(lp).connect(g).connect(o); os.start(t); os.stop(t + 2); }); },
    coro() { if (!S.suoni) return; try { CORO = CORO || new Audio('assets/coro.mp3'); CORO.currentTime = 0; const p = CORO.play(); if (p && p.catch) p.catch(() => A.coroSynth()); } catch (e) { A.coroSynth(); } },
    coroSynth() { sfx((a, o) => { const t0 = a.currentTime + .02;
      const voice = (f0, st, dur, f1, f2, gl, vol) => { const os = a.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(f0, st); os.frequency.linearRampToValueAtTime(f0 * gl, st + dur);
        const b1 = a.createBiquadFilter(), b2 = a.createBiquadFilter(); b1.type = b2.type = 'bandpass'; b1.frequency.value = f1; b2.frequency.value = f2; b1.Q.value = 6; b2.Q.value = 8;
        const g = a.createGain(); g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(vol, st + .04); g.gain.setValueAtTime(vol, st + dur - .06); g.gain.linearRampToValueAtTime(0, st + dur);
        os.connect(b1); os.connect(b2); b1.connect(g); b2.connect(g); g.connect(o); os.start(st); os.stop(st + dur + .05); };
      for (let k = 0; k < 14; k++) { const f0 = 95 + Math.random() * 120, j = Math.random() * .05; voice(f0, t0 + j, .42, 330, 800, .92, .09); voice(f0 * 1.15, t0 + .66 + j, .2, 280, 2250, 1.05, .08); voice(f0 * 1.1, t0 + .86 + j, .55, 450, 1900, .8, .09); } }); },
  };
  return A;
})();

/* ================= stato → grafica ================= */
function applyStates() {
  ORDER.forEach(k => { const a = AG[k], st = STATI[a.stato];
    a.ring.material.color.setHex(st.col); a.obj.userData.set('uDim', a.stato === 'riposo' ? .35 : a.stato === 'bloccato' ? .25 : 0);
    const s = $('st-' + k); if (s) { s.className = 'dot ' + a.stato; s.textContent = a.stato === 'bloccato' ? st.t : ''; }
    if (LBL[k]) { LBL[k].el.setAttribute('aria-label', a.nome + ': ' + st.t); LBL[k].w = 0; } });
  D.flagOut.visible = AG.outreach.stato === 'bloccato';
  D.flagFat.visible = S.scadute > 0;
  renderHud();
}
function renderHud() {
  $('tesoro').textContent = '€ ' + Math.round(S.tesoro).toLocaleString('it-IT'); $('goal').style.width = Math.min(100, S.tesoro / S.obiettivo * 100) + '%';
  $('regole').textContent = S.regole; $('n-prev').textContent = S.preventivi; $('n-udi').textContent = S.udienze; $('n-scad').textContent = S.scadute; $('n-idee').textContent = S.idee;
  $('c-scad').classList.toggle('alert', S.scadute > 0);
  const bk = ORDER.find(k => AG[k].stato === 'bloccato' && AG[k].blocco);
  $('mission-t').innerHTML = bk ? `(<em>0</em>/1) ${esc(AG[bk].blocco.cosa)}` : S.udienze ? `(<em>0</em>/${S.udienze}) Rispondi alle approvazioni in attesa` : 'Tutto in ordine nel regno';
  D.missionKey = bk || (S.udienze ? 'udienze' : 'sire');
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function flash(id) { const e = $(id); if (!e) return; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); }
const now = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
function ticker(fresh) { const t = $('ticker'); t.innerHTML = ''; NEWS.slice(-2).reverse().forEach((n, i) => { const d = document.createElement('div'); if (fresh && i === 0) d.className = 'new';
  const tm = document.createElement('time'); tm.textContent = n[0]; d.appendChild(tm); d.appendChild(document.createTextNode(n[1] + ' [PROVA]')); t.appendChild(d); }); }
function news(txt) { NEWS.push([now(), txt]); ticker(true); }
let toastT = 0;
function toast(t, sec) { const el = $('toast'); el.textContent = t; el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, (sec || 4.5) * 1000); }

/* ================= pannelli ================= */
const sheet = $('sheet'); let openSheet = null;
function syncPad() { $('pad').hidden = !sheet.hidden && innerWidth < 760; }
function setSheet(name, html, btn) {
  ['n-list', 'n-ev', 'n-info', 'n-skin', 'ed-regni'].forEach(id => $(id).setAttribute('aria-pressed', 'false'));
  if (!name || openSheet === name) { sheet.hidden = true; openSheet = null; syncPad(); return; }
  openSheet = name; sheet.innerHTML = '<button type="button" class="x-chiudi" aria-label="Chiudi" title="Chiudi">×</button>' + html; sheet.hidden = false; if (btn) $(btn).setAttribute('aria-pressed', 'true'); syncPad();
}
sheet.addEventListener('click', e => { if (e.target.closest('.x-chiudi')) { setSheet(null); $('world').focus({ preventScroll: true }); } });
/* interfaccia nascosta: resta solo l'isola e il pulsante con l'occhio (scelta ricordata su questo dispositivo) */
const UI_KEY = 'regno-ui-nascosta';
function setUi(off, salva) { document.body.classList.toggle('ui-off', off); const b = $('ui-tog'), t = off ? 'Mostra interfaccia' : 'Nascondi interfaccia';
  b.setAttribute('aria-pressed', String(off)); b.setAttribute('aria-label', t); b.title = t; $('ui-slash').hidden = !off;
  if (off) setSheet(null); if (salva) try { localStorage.setItem(UI_KEY, off ? '1' : '0'); } catch (e) {} }
$('ui-tog').onclick = () => setUi(!document.body.classList.contains('ui-off'), true);
try { setUi(localStorage.getItem(UI_KEY) === '1'); } catch (e) { setUi(false); }
function apriCosti() { const T = costiTot(), pct = Math.min(100, T.t / COSTI.budget * 100);
  const riga = (x, cons) => { const p = cons && x.limite ? Math.min(100, x.euro / x.limite * 100) : 0, al = cons && p >= 80;
    return `<li class="cst${al ? ' al' : ''}"><span class="nm"><b>${esc(x.nome)}</b><small>${cons ? esc(x.uso) + (x.limite ? ` · limite ${eur(x.limite)}` : '') : 'rinnovo ' + esc(x.rinnovo)}</small>${cons && x.limite ? `<i class="bar"><i style="width:${p.toFixed(0)}%"></i></i>` : ''}</span><b class="eu">${eur(x.euro)}</b></li>`; };
  setSheet('p-costi', `<div class="row"><h2>Costi · ${esc(COSTI.mese)}</h2><span class="st ${pct >= 90 ? 'bloccato' : 'lavora'}">${pct.toFixed(0)}% del budget</span></div>` +
    kpiHtml({ 'Totale mese': eur(T.t), 'Fissi': eur(T.f), 'A consumo': eur(T.c), 'Budget': eur(COSTI.budget) }) +
    `<i class="bar big"><i style="width:${pct.toFixed(0)}%"></i></i>` +
    `<h3>Fissi</h3><ul class="list cst-l">${COSTI.fissi.map(x => riga(x, false)).join('')}</ul>` +
    `<h3>A consumo</h3><ul class="list cst-l">${COSTI.consumo.map(x => riga(x, true)).join('')}</ul>` +
    `<p><small>Dati [PROVA], aggiornati ${esc(COSTI.aggiornato)}. Fonte vera: <code>reports/costi.json</code>. In rosso i servizi oltre l'80% del limite.</small></p>`); }
function kpiHtml(o) { return `<div class="kpis">${Object.entries(o).map(([k, v]) => `<div class="kpi"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>`; }
function openPlace(key) {
  if (String(key).startsWith('dl:')) return;
  if (key === 'costi') { goTo(AG.costi.pos); apriCosti(); return; }
  if (AG[key]) { const a = AG[key], st = STATI[a.stato]; goTo(a.pos);
    setSheet('p-' + key, `<div class="row"><h2>${esc(a.nome)} · livello ${a.liv}</h2><span class="st ${a.stato}">${st.t}</span></div><p>${esc(a.ruolo)}</p>${kpiHtml(a.kpi)}` +
      (a.stato === 'bloccato' && a.blocco ? `<div class="todo"><b>Serve da te:</b> ${esc(a.blocco.cosa)}.<br>Come: ${esc(a.blocco.come)}.</div><button class="act" data-editto="${key}">Apri l'editto<small>Demo: il sigillo approva e parte il messaggero</small></button>` : '') +
      (key === 'sire' ? `<button class="act" data-ev="parla">Il Sire parla<small>Riassunto del giorno a voce</small></button>` : '') +
      `<p><small>Dati [PROVA]. Fonte vera: <code>reports/${key}.json</code></small></p>`); return; }
  if (key === 'cantiere') { goTo(hexPos(CANTIERE_HEX)); setSheet('p-c', `<h2>Cantiere dell'impossibile</h2><p>Il progetto più grande dell'anno. Ogni traguardo raggiunto fa avanzare la costruzione: <b>${S.imp.n} su ${S.imp.tot}</b>.</p><p><small>Fonte vera: evento <code>traguardo</code>.</small></p>`); return; }
  if (key === 'rovine') { goTo(hexPos(ROVINE_HEX[2])); setSheet('p-r', `<h2>Idee da costruire</h2><p>Ogni rudere è un'idea del regno non ancora realizzata: <b>${S.idee}</b> in tutto. Quando un'idea è fatta, il rudere diventa una casa.</p><p><small>Fonte vera: <code>claude/regno-idee.md</code>.</small></p>`); return; }
  if (key === 'udienze') { goTo(hexPos(UDIENZE_HEX)); setSheet('p-u', `<h2>Approvazioni in attesa</h2><p>Una tenda davanti al castello per ogni richiesta che aspetta la tua risposta su Telegram: <b>${S.udienze}</b>.</p><p><small>Fonte vera: <code>regno.json.udienze</code>.</small></p>`); return; }
  if (key === 'pozzo') { goTo(hexPos(POZZO_HEX)); desiderio(); return; }
}
$('mission').onclick = () => { const k = D.missionKey; if (k && AG[k] && AG[k].stato === 'bloccato') { goTo(AG[k].pos); editto(k); } else openPlace(k || 'sire'); };
$('crest').onclick = () => parla();
$('n-list').onclick = () => {
  const items = ORDER.map(k => { const a = AG[k], st = STATI[a.stato]; const sub = a.stato === 'bloccato' && a.blocco ? a.blocco.cosa : a.ruolo;
    return `<li><button data-open="${k}"><span class="st ${a.stato}">${st.t}</span><span class="nm"><b>${esc(a.nome)}</b><small>${esc(sub)}</small></span></button></li>`; }).join('') +
    `<li><button data-open="udienze"><span class="st ${S.udienze ? 'bloccato' : 'lavora'}">${S.udienze}</span><span class="nm"><b>Approvazioni</b><small>Richieste in attesa di risposta</small></span></button></li>` +
    `<li><button data-open="cantiere"><span class="st cantiere">${S.imp.n}/${S.imp.tot}</span><span class="nm"><b>Cantiere dell'impossibile</b><small>Traguardi raggiunti</small></span></button></li>` +
    `<li><button data-open="rovine"><span class="st riposo">${S.idee}</span><span class="nm"><b>Idee da costruire</b><small>Una rovina per ogni idea</small></span></button></li>` +
    `<li><button data-open="pozzo"><span class="st lavora">€</span><span class="nm"><b>Pozzo dei desideri</b><small>Lancia una moneta con un'idea</small></span></button></li>`;
  setSheet('list', `<h2>Il regno in breve</h2><ul class="list">${items}</ul>`, 'n-list');
};
$('n-ev').onclick = () => setSheet('ev', `<h2>Eventi demo</h2><div class="grid">
  <button class="act" data-ev="contratto">Contratto firmato<small>Fuochi, coro "Oh Sire!" e oro</small></button>
  <button class="act" data-ev="parla">Il Sire parla<small>Riassunto del giorno a voce</small></button>
  <button class="act" data-ev="block">${AG.outreach.stato === 'bloccato' ? 'Firma l\'editto' : 'Blocca Outreach'}<small>${AG.outreach.stato === 'bloccato' ? 'Sigillo e messaggero' : 'Terreno incrinato'}</small></button>
  <button class="act" data-ev="${S.scadute ? 'pagata' : 'scaduta'}">${S.scadute ? 'Fattura pagata' : 'Fattura scaduta'}<small>${S.scadute ? 'Il drago se ne va' : 'Arriva il drago nero'}</small></button>
  <button class="act" data-ev="imp">Traguardo raggiunto<small>Cantiere ${S.imp.n}/${S.imp.tot}</small></button>
  <button class="act" data-ev="idea">Idea costruita<small>Il rudere diventa casa</small></button>
  <button class="act" data-ev="incasso">Incasso +€ 1.000<small>Oro dalla miniera</small></button>
  <button class="act" data-ev="regole">10 regole nuove<small>Luce sul Cervello</small></button>
  <button class="act" data-ev="udienza">Nuova approvazione<small>Arriva una tenda</small></button>
  <button class="act" data-ev="jarvis">${AG.jarvis.stato === 'riposo' ? 'Sveglia Jarvis' : 'Jarvis a riposo'}<small>Il mulino si ferma</small></button>
  <button class="act" data-ev="cartolina">Cartolina<small>Una foto del regno</small></button>
  <button class="act" data-open="pozzo">Pozzo dei desideri<small>Lancia una moneta</small></button></div>`, 'n-ev');
$('n-info').onclick = () => setSheet('info', `<h2>Come leggere il regno</h2>
  <div class="legend"><span class="st lavora">Al lavoro</span><span>l'agente sta lavorando</span><span class="st bloccato">Serve te</span><span>bandiera rossa e terreno incrinato: c'è un passo da fare</span>
  <span class="st cantiere">In costruzione</span><span>lavori in corso</span><span class="st riposo">A riposo</span><span>edificio spento</span></div>
  <p>Ogni edificio intorno al castello è un agente. Le <b>tende</b> davanti al castello sono approvazioni in attesa, le <b>rovine</b> sono idee da costruire, il <b>mulino</b> gira quando Jarvis è attivo, il <b>drago nero</b> arriva con le fatture scadute, la <b>barra d'oro</b> è il tesoro del mese rispetto all'obiettivo.</p>
  <p>Tocca lo <b>stemma S</b> in alto per sentire il Sire. Il pulsante in basso porta dritto alla cosa da fare.</p>
  <p><b>Comandi:</b> trascina per spostarti, pizzica o usa + e − per lo zoom, le frecce curve ruotano la vista (tasti Q ed E). Tutto è anche nell'<b>Elenco</b>.</p>
  <p><b>Skin del regno:</b></p><div class="skins">${Object.entries(SKINS).filter(([, v]) => v.pronta !== false).map(([k, v]) => `<button class="act skin-btn" data-skin="${k}" aria-pressed="${k === SKIN_ID}">${esc(v.nome)}${k === SKIN_ID ? '<small>in uso</small>' : ''}</button>`).join('')}</div>
  <button class="act" id="q-btn">Qualità grafica: ${S.quality}<small>Abbassala se il telefono scalda</small></button>
  <p id="fps-line">Misuro i fotogrammi…</p><p><small>Modelli KayKit di Kay Lousberg e animali di Quaternius (CC0). Dati [PROVA].</small></p>`, 'n-info');
$('n-skin').onclick = () => setSheet('skin', `<h2>Skin del regno</h2><p>Scegli lo stile dell'isola. La pagina si ricarica con la nuova skin.</p><div class="skins">${Object.entries(SKINS).filter(([, v]) => v.pronta !== false).map(([k, v]) => `<button class="act skin-btn" data-skin="${k}" aria-pressed="${k === SKIN_ID}">${esc(v.nome)}${k === SKIN_ID ? '<small>in uso</small>' : ''}</button>`).join('')}</div><p><b>Regno aperto:</b> ${esc(regnoNome())}</p><button class="act" id="skin-regni">I tuoi regni<small>Apri, crea o rinomina un'isola</small></button>`, 'n-skin');
$('n-snd').onclick = () => { AUDIO.set(!S.suoni); $('n-snd').setAttribute('aria-pressed', String(S.suoni)); $('snd-w').setAttribute('opacity', S.suoni ? '1' : '.3'); $('snd-lbl').textContent = S.suoni ? 'Suoni sì' : 'Suoni'; if (S.suoni) AUDIO.fanfare(); };
$('rot-l').onclick = () => rotate(-1); $('rot-r').onclick = () => rotate(1);
$('zoom-in').onclick = () => zoomBy(1.3); $('zoom-out').onclick = () => zoomBy(1 / 1.3);
$('compass').onclick = () => { if (cam.view) rotate(-cam.view); goTo(new THREE.Vector3(0, 0, .8), HOME_ZOOM); };
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]'); if (o) { openPlace(o.dataset.open); return; }
  const ed = e.target.closest('[data-editto]'); if (ed) { setSheet(null); editto(ed.dataset.editto); return; }
  const ev = e.target.closest('[data-ev]'); if (ev) { setSheet(null); EV[ev.dataset.ev](); return; }
  const sk = e.target.closest('.skin-btn'); if (sk) { if (sk.dataset.skin !== SKIN_ID) scegliSkin(sk.dataset.skin); return; }
  if (e.target.closest('#q-btn')) { S.quality = S.quality === 'alta' ? 'bassa' : 'alta'; applyQuality(); setSheet(null); $('n-info').click(); }
});

/* ================= pergamene: editto, pozzo, cartolina ================= */
const ov = $('overlay');
function openOverlay(html) { ov.innerHTML = `<div class="pergamena" role="dialog" aria-modal="true"><div class="rotolo"></div><div class="carta">${html}</div><div class="rotolo"></div></div>`; ov.hidden = false; requestAnimationFrame(() => ov.classList.add('aperto')); }
function closeOverlay() { if (ov.hidden) return; ov.classList.remove('aperto'); setTimeout(() => { ov.hidden = true; ov.innerHTML = ''; }, reduceMotion ? 0 : 450); }
ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('.annulla')) closeOverlay(); });
function editto(k) {
  const a = AG[k]; if (!a || !a.blocco) return;
  openOverlay(`<p class="intest">Editto del Sire</p><p class="testo">${esc(a.blocco.cosa)}</p><p class="nota">${esc(a.blocco.come)}</p><p class="da">Per il villaggio di ${esc(a.nome)}</p>
    <button class="sigillo" type="button" id="sigillo" aria-label="Apponi il sigillo">S</button><p class="nota">Demo: il sigillo approva. Con i dati veri l'approvazione resta su Telegram.</p><button class="annulla" type="button">Non ora</button>`);
  $('sigillo').onclick = (e) => { e.currentTarget.classList.add('timbrato'); AUDIO.stamp(); later(.7, () => { closeOverlay(); messaggero(k); }); };
}
function messaggero(k) {
  const a = AG[k]; toast(`Il messaggero corre verso ${a.nome}`); AUDIO.horn(); goTo(a.pos.clone().add(AG.sire.pos).multiplyScalar(.5), 1.7);
  const tpl = hasWalker('messaggero') ? 'messaggero' : CH.rogue || CH.knight;
  if (!tpl) { later(1.5, () => approva(k)); return; }
  const P = typeof tpl === 'string' ? spritePerson(tpl, { h: .6, speed: 2.1, walkAnim: 'Running_A', pause: 0 }) : person(tpl, { h: .64, speed: 2.1, walkAnim: 'Running_A', pause: 0 });
  const togli = (Q) => { scene.remove(Q.o); const i = PEOPLE.indexOf(Q); if (i >= 0) PEOPLE.splice(i, 1); };
  const pts = percorso('sire', k);
  if (pts) { P.o.position.copy(pts[0]); seguiPercorso(P, pts, (Q) => { approva(k); togli(Q); }); return; }
  togli(P); later(1.5, () => approva(k)); // nessuna strada libera tra il castello e l'edificio: si approva lo stesso
}
function approva(k) {
  const a = AG[k]; a.stato = 'lavora'; S.udienze = Math.max(0, S.udienze - 1); hideTent();
  tween('heal', 2.2, t => D.corr.material.uniforms.uHeal.value = t * 4.2, () => { D.corr.visible = false; D.corr.material.uniforms.uHeal.value = 0; });
  burst(a.pos.clone().setY(1.5), [0xffd27a, 0xfff2c0], 60, 2.6, 1.6, 1.4); AUDIO.fanfare();
  news(`${a.nome} · editto firmato, si riparte`); toast(`Editto ricevuto: ${a.nome} riparte!`); applyStates();
}
function desiderio() {
  let idee = []; try { idee = JSON.parse(localStorage.getItem('isola-idee') || '[]'); } catch (e) { }
  openOverlay(`<p class="intest">Pozzo dei desideri</p><p class="nota">Scrivi un'idea e lancia la moneta. In questa demo resta solo su questo dispositivo.</p>
    <form id="f-idea" class="carta-form"><input id="in-idea" maxlength="120" placeholder="La tua idea" aria-label="La tua idea" required><button class="sigillo piccolo" type="submit" aria-label="Lancia la moneta">€</button></form>
    ${idee.length ? `<p class="da">Nel pozzo: ${idee.map(esc).join(' · ')}</p>` : ''}<button class="annulla" type="button">Chiudi</button>`);
  $('f-idea').onsubmit = (e) => { e.preventDefault(); const v = $('in-idea').value.trim(); if (!v) return; idee.push(v); try { localStorage.setItem('isola-idee', JSON.stringify(idee.slice(-12))); } catch (er) { }
    closeOverlay(); const p = hexPos(POZZO_HEX); burst(p.clone().setY(1.6), 0xffc93a, 18, .6, 1.1, 1.4, { up: -.4, g: 4 }); AUDIO.clink(); toast('La moneta è caduta nel pozzo: idea custodita.'); news('Pozzo · nuova idea'); };
}
let SNAP = false;
function scattaCartolina() {
  SNAP = false; const src = renderer.domElement, Wd = 1000, Hd = Math.round(Wd * src.height / src.width), c = document.createElement('canvas'); c.width = Wd + 60; c.height = Hd + 170; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, c.width, c.height); gr.addColorStop(0, '#8a6420'); gr.addColorStop(.5, '#f2d27a'); gr.addColorStop(1, '#8a6420'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  const bg = g.createRadialGradient(c.width / 2, Hd / 2, 50, c.width / 2, Hd / 2, Wd); bg.addColorStop(0, '#4aa3c8'); bg.addColorStop(1, '#123a5c'); g.fillStyle = bg; g.fillRect(30, 30, Wd, Hd);
  g.drawImage(src, 30, 30, Wd, Hd);
  g.fillStyle = '#2a1a0a'; g.font = '700 46px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.fillText('Isola di Sire', c.width / 2, Hd + 100);
  g.font = 'italic 24px Georgia, serif'; g.fillText(new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · saluti dal regno di Jarvis', c.width / 2, Hd + 140);
  const url = c.toDataURL('image/jpeg', .9);
  openOverlay(`<p class="intest">Cartolina</p><img src="${url}" alt="Cartolina dell'Isola di Sire"><p class="nota">Tieni premuto l'immagine per salvarla.</p><a class="dl" href="${url}" download="isola-di-sire.jpg">Scarica la cartolina</a><br><button class="annulla" type="button">Chiudi</button>`);
  AUDIO.stamp();
}
function parla() {
  const att = ORDER.filter(k => AG[k].stato === 'bloccato').length, lav = ORDER.filter(k => AG[k].stato === 'lavora').length;
  const testo = `Sire, oggi ${att === 0 ? 'nessun vassallo attende' : att === 1 ? 'un vassallo attende' : att + ' vassalli attendono'} il vostro giudizio. ${lav} villaggi lavorano per la corona. Il tesoro ammonta a ${Math.round(S.tesoro).toLocaleString('it-IT')} euro.${S.scadute ? ` Un drago nero veglia su ${S.scadute} ${S.scadute > 1 ? 'fatture scadute' : 'fattura scaduta'}.` : ''} Lunga vita al Sire!`;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(testo); u.lang = 'it-IT'; u.rate = .82; u.pitch = .55; const v = speechSynthesis.getVoices().filter(x => /^it/i.test(x.lang)); const m = v.find(x => /luca|diego|cosimo|male|uomo/i.test(x.name)) || v[0]; if (m) u.voice = m; speechSynthesis.speak(u); } catch (e) { }
  AUDIO.fanfare(); toast(testo, 9); goTo(new THREE.Vector3(0, 0, .8), 1.8);
}

/* ================= eventi demo ================= */
const EV = {
  contratto() { goTo(new THREE.Vector3(0, 0, .8), 1.6); cheerAll(3.5); AUDIO.coro();
    const COL = [0xff5a4a, 0xffd34a, 0x6fe0ff, 0xb98bff, 0x7dff8a, 0xffffff];
    for (let i = 0; i < 7; i++) later(.15 + i * .42, () => { const p = new THREE.Vector3((Math.random() - .5) * 6, 7 + Math.random() * 3, (Math.random() - .5) * 6);
      burst(p, [pick(COL), pick(COL)], 70, 3.4, 1.9, 1.5, { sphere: true, g: 1.2, spread: .1 }); AUDIO.boom(); });
    later(2.2, () => { burst(new THREE.Vector3(0, 7.5, 0), [0xffc93a, 0xffe08a], 90, .5, 2.6, 1.6, { up: -.2, g: 2.4, spread: 4 }); AUDIO.clink(); S.tesoro += 4800; renderHud(); flash('c-prev'); });
    S.preventivi = Math.max(0, S.preventivi - 1); AG.preventivi.kpi['Aperti'] = String(S.preventivi);
    news('Preventivi · contratto firmato, € 4.800 nel tesoro'); toast('Oh Sire! Contratto firmato: € 4.800 nel tesoro', 5); },
  parla,
  block() { const a = AG.outreach; if (a.stato === 'bloccato') { goTo(a.pos); editto('outreach'); return; }
    a.stato = 'bloccato'; goTo(a.pos); D.corr.visible = true; D.corr.material.uniforms.uHeal.value = 0; tween('corr', 1.2, k => D.corr.material.uniforms.uAmt.value = k);
    if (S.udienze < 3) { D.tents[S.udienze].visible = true; S.udienze++; }
    news('Outreach · fermo, serve la tua approvazione'); applyStates(); },
  scaduta() { const a = AG.fatture; goTo(a.pos); S.scadute++; a.kpi['Scadute'] = String(S.scadute); AUDIO.roar();
    if (D.dragon) { D.dragon.o.visible = true; tween('drago', 2.5, k => D.dragon.k = k); }
    news('Fatture · una fattura è scaduta: arriva il drago'); toast('Un drago nero si posa sulla miniera…'); applyStates(); },
  pagata() { const a = AG.fatture; goTo(a.pos); if (!S.scadute) return; S.scadute = 0; S.tesoro += 2400; a.kpi['Scadute'] = '0';
    if (D.dragon) tween('drago', 2.5, k => D.dragon.k = 1 - k, () => D.dragon.o.visible = false);
    burst(a.pos.clone().setY(1.2), 0xffc93a, 60, 2.6, 1.6, 1.3); AUDIO.clink(); applyStates(); news('Fatture · la fattura #118 è stata pagata'); },
  imp() { const cp = hexPos(CANTIERE_HEX); goTo(cp);
    if (S.imp.n >= S.imp.tot) S.imp.n = 0;
    S.imp.n++; const next = stageFor(S.imp.n); burst(cp.clone().setY(1), 0xe8c28a, 40, 1.8, 1.4, 1.2, { normal: true });
    if (next !== D.stageNow) { const old = D.stages[D.stageNow]; D.stageNow = next; dissolveOut(old, .9, () => dissolveIn(D.stages[next], 1.6)); }
    D.scaff.visible = S.imp.n < S.imp.tot;
    if (S.imp.n === S.imp.tot) { burst(cp.clone().setY(2.5), 0xffd27a, 90, 3.2, 2, 1.6); AUDIO.fanfare(); news("Cantiere dell'impossibile · completato!"); }
    else news(`Cantiere dell'impossibile · traguardo ${S.imp.n}/${S.imp.tot}`); },
  idea() { const lot = D.lots.find(l => !l.done); if (!lot) { news('Tutte le rovine visibili sono costruite'); return; } lot.done = true; goTo(lot.ru.position);
    dissolveOut(lot.ru, 1.1, () => { dissolveIn(lot.ho, 1.8); burst(lot.ho.position.clone().setY(.6), 0xffd27a, 40, 2, 1.4, 1.2); });
    S.idee--; renderHud(); flash('c-idee'); news('Idea costruita · un rudere diventa casa'); },
  incasso() { const a = AG.fatture; goTo(a.pos); S.tesoro += 1000; renderHud(); burst(a.pos.clone().setY(1.2), 0xffc93a, 70, 3, 1.8, 1.3); AUDIO.clink(); news('Fatture · incasso di € 1.000'); },
  regole() { const a = AG.cervello; goTo(a.pos); S.regole += 10; a.kpi['Regole'] = String(S.regole); renderHud();
    burst(a.pos.clone().setY(a.top), 0x9fe8ff, 80, 2.4, 2.2, 1.3);
    tween('glow', 2.5, k => a.obj.material.color.setScalar(1 + .45 * (1 - k)));
    news('Cervello · salvate 10 regole nuove'); },
  udienza() { goTo(hexPos(UDIENZE_HEX)); if (S.udienze >= 3) { toast('Già 3 approvazioni in attesa'); return; } const t = D.tents[S.udienze]; S.udienze++; dissolveIn(t, 1.2); renderHud(); flash('c-udi'); AUDIO.horn(); news('Nuova richiesta di approvazione'); },
  jarvis() { const a = AG.jarvis; goTo(a.pos); a.stato = a.stato === 'riposo' ? 'lavora' : 'riposo'; applyStates(); news(a.stato === 'riposo' ? 'Jarvis · a riposo' : 'Jarvis · di nuovo al lavoro'); },
  cartolina() { SNAP = true; },
};
function hideTent() { const t = D.tents[S.udienze]; if (t && t.visible) dissolveOut(t, 1); renderHud(); }

/* ================= qualità e ciclo ================= */
function applyQuality() {
  const dpr = devicePixelRatio || 1, alta = S.quality === 'alta';
  renderer.setPixelRatio(alta ? Math.min(dpr, isMobile ? 1.75 : 2) : 1);
  const ms = alta ? (isMobile ? 2048 : 3072) : 1024;
  if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  renderer.shadowMap.type = alta ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; renderer.shadowMap.needsUpdate = true;
  PEOPLE.forEach(P => P.o.visible = alta || P.guard);
  resize();
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); frame(); syncPad(); }
addEventListener('resize', resize);
let last = performance.now(), frames = 0, acc = 0, time = 0;
function loop(t) {
  const dt = Math.min((t - last) / 1000, .1); last = t; time += dt;
  SPR_DT = dt; stepTweens(dt); placeCam(); stepBursts(dt);
  if (water) water.material.uniforms.uTime.value = time;
  if (D.corr) D.corr.material.uniforms.uTime.value = time;
  if (SMOKE) { SMOKE.material.uniforms.uTime.value = time; SMOKE.material.uniforms.uZoom.value = camera.zoom; }
  if (fan && AG.jarvis.stato !== 'riposo') fan.rotation.z += dt * 1.6;
  if (wheel) wheel.rotation.x -= dt * .9;
  flags.forEach((f, i) => f.rotation.y = Math.sin(time * 1.7 + i) * .12);
  clouds.forEach(c => { c.userData.a += dt * c.userData.v * .02; c.position.x = Math.cos(c.userData.a) * c.userData.r; c.position.z = Math.sin(c.userData.a) * c.userData.r; });
  BIRDS.forEach(b => { const u = b.userData; u.a += dt * .18; const a = u.a + u.ph * .25; b.position.set(Math.cos(a) * u.r + 2, u.h + Math.sin(time * 2 + u.ph) * .2, Math.sin(a) * u.r); b.rotation.y = -a; b.scale.y = .4 + Math.abs(Math.sin(time * 8 + u.ph)) * .9; });
  if (D.dragon) { const g = D.dragon; g.mixer.update(dt); g.a += dt * .6; const c = AG.fatture.pos, r = 2.2 + (1 - g.k) * 22, h = 3.6 + (1 - g.k) * 8;
    g.o.position.set(c.x + Math.cos(g.a) * r, h + Math.sin(time * 1.3) * .3, c.z + Math.sin(g.a) * r); if (!g.o.isSprite) g.o.rotation.y = -g.a;
    else { _sa.set(c.x + Math.cos(g.a) * r, h, c.z + Math.sin(g.a) * r).project(camera); _sb.set(c.x + Math.cos(g.a + .05) * r, h, c.z + Math.sin(g.a + .05) * r).project(camera);
      const dx = _sb.x - _sa.x, dy = _sb.y - _sa.y; if (Math.abs(dx) > Math.hypot(dx, dy) * .25) g.o.material.userData.u.uFlip.value = dx < 0 ? 1 : 0; } } // il drago dipinto guarda dove vola (velocità vera, non lo spostamento della camera)
  ORDER.forEach(k => { const a = AG[k]; a.ring.material.opacity = a.stato === 'bloccato' ? .55 + .45 * Math.sin(time * 4) : .9; });
  SKYCLOUDS.forEach(c => { c.userData.a += dt * c.userData.v; c.position.x = Math.cos(c.userData.a) * c.userData.d; c.position.z = Math.sin(c.userData.a) * c.userData.d; });
  stepPeople(dt);
  AUDIO.tick(time);
  updateSprites();
  renderer.render(scene, camera);
  if (SNAP) scattaCartolina(); updateLabels();
  frames++; acc += dt; if (acc >= 1) { const f = $('fps-line'); if (f) f.textContent = `Qualità ${S.quality}: ${Math.round(frames / acc)} fotogrammi al secondo.`; frames = 0; acc = 0; }
  requestAnimationFrame(loop);
}

/* ================= editor della mappa ================= */
// Strumenti: seleziona/sposta, terra +, terra −, strada, inserisci. La mappa resta salvata su questo dispositivo.
const ED = { on: false, tool: 'sel', sel: null, item: 'pineta', muro: 'muro', undo: [], redo: [], drag: null, stroke: null };
const CATALOGO = ['zucchero', 'casa_a', 'casa_b', 'fattoria', 'pineta', 'cipressi', 'uliveto', 'vigneto', 'grano', 'montagna', 'rupe', 'scogli', 'fontana'];
const NOMI_ED = { zucchero: 'Monte di C.', casa_a: 'Casa', casa_b: 'Casa', fattoria: 'Fattoria', pineta: 'Bosco', cipressi: 'Alberi', uliveto: 'Frutteto', vigneto: 'Vigneto', grano: 'Campo', montagna: 'Montagna', rupe: 'Rupe', scogli: 'Massi', fontana: 'Fontana' };
const NOMI_SP = { cantiere: 'Cantiere', udienze: 'Approvazioni', pozzo: 'Pozzo dei desideri' };
const MAX_DIST = 120; // si può allargare l'isola molto oltre la forma di partenza
function mapNow() {
  return { v: 2, land: [...LAND], strade: [...ROADT],
    agenti: Object.fromEntries(ORDER.map(k => [k, [AG[k].hex[0], AG[k].hex[1], AG[k].rot || 0]])),
    spec: { cantiere: [...CANTIERE_HEX], udienze: [...UDIENZE_HEX], pozzo: [...POZZO_HEX], rotCant: D.rotCant || 0 },
    rovine: ROVINE_HEX.map(h => [...h]), deco: DECO.map(d => ({ n: d.n, w: d.w, q: d.q, r: d.r, rot: d.rot || 0 })), muri: [...MURI] };
}
function salvaMappa() { try { localStorage.setItem(MAPPA_KEY, JSON.stringify(mapNow())); return true; } catch (e) { return false; } }
// applica una mappa completa (annulla, ripristina, importa)
function applyMap(m) {
  LAND.clear(); m.land.forEach(k => LAND.add(String(k)));
  ROADT.clear(); m.strade.forEach(k => ROADT.add(String(k))); rebuildRoads();
  ORDER.forEach(k => { const v = m.agenti[k]; if (v) { AG[k].hex = [+v[0], +v[1]]; AG[k].rot = +v[2] || 0; } });
  setHex(CANTIERE_HEX, m.spec.cantiere); setHex(UDIENZE_HEX, m.spec.udienze); setHex(POZZO_HEX, m.spec.pozzo); D.rotCant = +m.spec.rotCant || 0;
  m.rovine.forEach((h, i) => { if (ROVINE_HEX[i]) setHex(ROVINE_HEX[i], h); });
  DECO.forEach(d => removeSprite(d.o)); DECO.length = 0;
  m.deco.forEach(d => { if (SPR_INFO[d.n]) DECO.push({ n: d.n, w: +d.w || 2.15, q: +d.q, r: +d.r, rot: +d.rot || 0 }); });
  MURI.clear(); (Array.isArray(m.muri) ? m.muri : []).forEach(x => { if (Array.isArray(x) && TIPI_MURO[x[1]]) MURI.set(String(x[0]), x[1]); });
  refresh(true);
}
// dopo ogni modifica: occupazione, terreno (solo se cambiato), posizioni, sprite liberi, fumo, salvataggio
function refresh(deco) { rebuildOcc(false); rebuildGround(); buildMuri(); placeAll(); if (deco) spawnDeco(); rebuildSmoke(); salvaMappa(); edSelShow(); }
function snapshot() { ED.undo.push(JSON.stringify(mapNow())); if (ED.undo.length > 60) ED.undo.shift(); ED.redo.length = 0; edButtons(); }
function annulla() { if (!ED.undo.length) return; ED.redo.push(JSON.stringify(mapNow())); applyMap(JSON.parse(ED.undo.pop())); ED.sel = null; edSelShow(); edButtons(); }
function ripristina() { if (!ED.redo.length) return; ED.undo.push(JSON.stringify(mapNow())); applyMap(JSON.parse(ED.redo.pop())); ED.sel = null; edSelShow(); edButtons(); }

/* ---- tessere ed entità ---- */
function hexAt(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const o = ray.ray.origin, d = ray.ray.direction; if (Math.abs(d.y) < 1e-6) return null;
  const t = -o.y / d.y; return cellaDi(o.x + d.x * t, o.z + d.z * t); }
function entHex(id) { const [t, k] = id.split(':');
  if (t === 'ag') return AG[k].hex; if (t === 'rv') return ROVINE_HEX[+k]; if (t === 'dc') { const d = DECO[+k]; return [d.q, d.r]; }
  return k === 'cantiere' ? CANTIERE_HEX : k === 'udienze' ? UDIENZE_HEX : POZZO_HEX; }
function entAtHex(h, except) { const ok = (id) => id !== except && HD(entHex(id), h) <= raggioDi(id);
  for (const k of ORDER) if (ok('ag:' + k)) return 'ag:' + k;
  for (const k of ['cantiere', 'udienze', 'pozzo']) if (ok('sp:' + k)) return 'sp:' + k;
  for (let i = 0; i < ROVINE_HEX.length; i++) if (ok('rv:' + i)) return 'rv:' + i;
  for (let i = 0; i < DECO.length; i++) if (ok('dc:' + i)) return 'dc:' + i;
  return null; }
function entName(id) { const [t, k] = id.split(':'); if (t === 'ag') return AG[k].nome; if (t === 'sp') return NOMI_SP[k]; if (t === 'rv') return 'Idea da costruire'; return NOMI_ED[DECO[+k].n] || DECO[+k].n; }
function entAt(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(SPRITES.filter(o => o.visible && o.userData.ent), false);
  if (hits.length) return hits[0].object.userData.ent;
  const h = hexAt(x, y); return h ? entAtHex(h) : null; }
const freeOne = (h, except) => LAND.has(K(...h)) && !ROADT.has(K(...h)) && !MURI.has(K(...h)) && !entAtHex(h, except);
// libera = tutte le tessere che l'oggetto occuperebbe (con il suo raggio) sono terra, senza strade e senza altri oggetti
const freeHex = (h, except, rg) => { if (rg === undefined) rg = except ? raggioDi(except) : 0;
  return tessereDi(h, rg).every(t => LAND.has(K(...t)) && !ROADT.has(K(...t)) && !MURI.has(K(...t))) && !tuttiEnt().some(e => e !== except && HD(entHex(e), h) <= raggioDi(e) + rg); };
const tuttiEnt = () => [...ORDER.map(k => 'ag:' + k), 'sp:cantiere', 'sp:udienze', 'sp:pozzo', ...ROVINE_HEX.map((h, i) => 'rv:' + i), ...DECO.map((d, i) => 'dc:' + i)];
// mappe salvate prima della scala nuova: chi si sovrappone viene spostato sulla prima zona libera più vicina
function sistemaSovrapposti() { let n = 0; const fatti = [];
  tuttiEnt().forEach(id => { const h = entHex(id), rg = raggioDi(id);
    const libero = (c) => tessereDi(c, rg).every(t => LAND.has(K(...t))) && fatti.every(e => HD(entHex(e), c) > raggioDi(e) + rg);
    if (!libero(h)) { let best = null; for (let d = 1; d <= 40 && !best; d++) for (const c of tessereDi(h, d)) if (HD(c, h) === d && libero(c)) { best = c; break; }
      if (best) { moveEnt(id, best); n++; } }
    fatti.push(id); });
  return n; }

/* ---- evidenziazioni ---- */
const anelloQ = (rg) => { const R = RW(rg) * Math.SQRT2, g = new THREE.RingGeometry(R - (rg ? .11 : .07) * Math.SQRT2, R, 4, 1, Math.PI / 4); g.rotateX(-Math.PI / 2); return g; };
function hexMark(color, op) { const g = anelloQ(0);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op || .95, depthTest: false, depthWrite: false })); m.renderOrder = 100000; m.visible = false; scene.add(m); return m; }
let MK = null; const MARKS = [];
function edInitMarks() { if (MK) return; MK = { sel: hexMark(0xffc35a), hov: hexMark(0xffffff, .8) }; }
function showMark(m, h, color) { if (!h) { m.visible = false; return; } const p = W(...h); m.position.set(p.x, .07, p.z); if (color !== undefined) m.material.color.setHex(color); m.visible = true; }
function strokeMark(h, color) { let m = MARKS.find(x => !x.visible); if (!m) { m = hexMark(color, .9); MARKS.push(m); } showMark(m, h, color); }
function clearStrokeMarks() { MARKS.forEach(m => { m.visible = false; }); AREE.forEach(m => { m.visible = false; }); }
// ingombro di un oggetto: un solo contorno quadrato grande quanto le tessere che occupa
const AREE = [];
function areaMark(h, rg, color) { let m = AREE.find(x => !x.visible); if (!m) { m = hexMark(color, .9); AREE.push(m); } if (m.userData.rg !== rg) { m.geometry.dispose(); m.geometry = anelloQ(rg); m.userData.rg = rg; } showMark(m, h, color); }

/* ---- azioni ---- */
function moveEnt(id, h) { const [t, k] = id.split(':');
  if (t === 'ag') AG[k].hex = [...h]; else if (t === 'rv') setHex(ROVINE_HEX[+k], h); else if (t === 'dc') { DECO[+k].q = h[0]; DECO[+k].r = h[1]; if (DECO[+k].o) DECO[+k].o.position.set(W(...h).x, .02, W(...h).z); }
  else setHex(entHex(id), h); }
function ruota() { const id = ED.sel; if (!id) return; snapshot(); const [t, k] = id.split(':');
  if (t === 'ag') AG[k].rot = ((AG[k].rot || 0) + 1) % 4; else if (t === 'dc') DECO[+k].rot = ((DECO[+k].rot || 0) + 1) % 4; else if (k === 'cantiere') D.rotCant = ((D.rotCant || 0) + 1) % 4;
  else { toast('Questo elemento non si ruota'); ED.undo.pop(); return; }
  refresh(t === 'dc'); }
function elimina() { const id = ED.sel; if (!id) return; const [t, k] = id.split(':');
  if (t !== 'dc') { toast('Gli edifici degli agenti e i luoghi speciali si possono spostare, non eliminare'); return; }
  snapshot(); removeSprite(DECO[+k].o); DECO.splice(+k, 1); ED.sel = null; refresh(true); }
function paint(h) { if (ED.tool === 'terra' || ED.tool === 'scava') tessereDi(h, 1).forEach(paint1); else paint1(h); } // terra: pennello di 3×3 quadrati
function paint1(h) { const key = K(...h), st = ED.stroke; if (st.done.has(key)) return; st.done.add(key);
  if (ED.tool === 'terra') { if (hdist(...h) > MAX_DIST || LAND.has(key)) return; LAND.add(key); st.ch = true; strokeMark(h, 0x7dff8a); }
  else if (ED.tool === 'scava') { if (!LAND.has(key)) return; const e = entAtHex(h); if (e && !e.startsWith('dc:')) { if (!st.warn) toast('Qui c\'è ' + entName(e) + ': spostalo prima di togliere la terra'); st.warn = true; return; }
    if (LAND.size <= 7) return; if (e) { removeSprite(DECO[+e.slice(3)].o); DECO.splice(+e.slice(3), 1); st.deco = true; } LAND.delete(key); ROADT.delete(key); MURI.delete(key); st.ch = true; strokeMark(h, 0xff6a5a); }
  else if (ED.tool === 'strada') { if (!LAND.has(key)) return; if (st.mode === undefined) st.mode = !ROADT.has(key);
    const e = entAtHex(h); if (st.mode) { if (e && e.startsWith('dc:')) { removeSprite(DECO[+e.slice(3)].o); DECO.splice(+e.slice(3), 1); st.deco = true; } if (MURI.has(key) && !TIPI_MURO[MURI.get(key)].passa) MURI.delete(key); ROADT.add(key); } else ROADT.delete(key); st.ch = true; strokeMark(h, 0xe0b070); }
  else if (ED.tool === 'muro') { if (!LAND.has(key)) return; if (st.mode === undefined) st.mode = MURI.get(key) !== ED.muro;
    if (!st.mode) { if (!MURI.has(key)) return; MURI.delete(key); }
    else { const e = entAtHex(h); if (e) { if (!st.warn) toast('Qui c\'è ' + entName(e) + ': il recinto gli gira attorno'); st.warn = true; return; }
      if (ROADT.has(key) && !TIPI_MURO[ED.muro].passa) { if (!st.warnS) toast('Sulle strade va un cancello, così si passa'); st.warnS = true; return; }
      MURI.set(key, ED.muro); }
    st.ch = true; buildMuri(); strokeMark(h, 0xd8c8a8); }
  else if (ED.tool === 'metti') { if (!freeHex(h, null, RAGGIO[ED.item] || 0)) return; const n = ED.item; DECO.push({ n, w: n === 'montagna' || n === 'zucchero' ? 2.9 : n === 'rupe' ? 2.5 : n === 'scogli' ? 1.7 : n === 'fontana' ? 1.9 : CASE.has(n) && n !== 'fattoria' ? 2.15 : 2.3, q: h[0], r: h[1], rot: 0 }); st.ch = true; st.deco = true; areaMark(h, RAGGIO[n] || 0, 0x9fe8ff); }
}
function endStroke() { const st = ED.stroke; ED.stroke = null; clearStrokeMarks(); if (!st) return;
  if (!st.ch) { ED.undo.pop(); edButtons(); return; }
  if (ED.tool === 'strada' || ED.tool === 'scava') rebuildRoads();
  refresh(st.deco || ED.tool === 'metti'); }

/* ---- puntatore in modalità editor ---- */
function edDown(x, y) { edInitMarks();
  if (ED.tool === 'sel') { const id = entAt(x, y); if (!id) return false; ED.sel = id; edSelShow(); ED.drag = { id, from: [...entHex(id)], to: null }; return true; }
  const h = hexAt(x, y); if (!h) return false; snapshot(); ED.stroke = { done: new Set(), ch: false, last: h }; paint(h); return true; }
function edMove(x, y) { const h = hexAt(x, y); if (!h) return;
  if (ED.drag) { const ok = freeHex(h, ED.drag.id); ED.drag.to = ok ? h : null; clearStrokeMarks(); MK.hov.visible = false; areaMark(h, raggioDi(ED.drag.id), ok ? 0x7dff8a : 0xff6a5a); return; }
  if (ED.stroke) { rigaCelle(ED.stroke.last || h, h).forEach(paint); ED.stroke.last = h; } } // tratto continuo anche se il dito corre
function edUp() {
  if (ED.drag) { const dr = ED.drag; ED.drag = null; MK.hov.visible = false; clearStrokeMarks();
    if (dr.to && K(...dr.to) !== K(...dr.from)) { snapshot(); moveEnt(dr.id, dr.to); refresh(dr.id.startsWith('dc:')); } return; }
  if (ED.stroke) endStroke(); }
function edSelShow() { if (!MK) return; if (!ED.sel) { MK.sel.visible = false; clearStrokeMarks(); $('ed-info').textContent = ED.tool === 'sel' ? 'Tocca un elemento per selezionarlo, trascinalo per spostarlo' : $('ed-info').textContent; edButtons(); return; }
  clearStrokeMarks(); if (!ED.drag) areaMark(entHex(ED.sel), raggioDi(ED.sel), 0xffc35a); MK.sel.visible = false; $('ed-info').textContent = entName(ED.sel); edButtons(); }
function edButtons() { const t = ED.sel && ED.sel.split(':')[0];
  $('ed-rot').disabled = !ED.sel || ED.sel === 'sp:udienze' || ED.sel === 'sp:pozzo' || t === 'rv'; $('ed-del').disabled = t !== 'dc';
  $('ed-undo').disabled = !ED.undo.length; $('ed-redo').disabled = !ED.redo.length; }
const SUGG = { sel: 'Tocca un elemento per selezionarlo, trascinalo per spostarlo', terra: 'Tocca o trascina per aggiungere terra (3×3 quadrati)', scava: 'Tocca o trascina per togliere terra (3×3 quadrati)', strada: 'Tocca o trascina per tracciare o togliere una strada', metti: 'Scegli un elemento e tocca dove metterlo', muro: 'Scegli il recinto, poi tocca o trascina sulle tessere; ripassa per toglierlo' };
function setTool(t) { ED.tool = t; document.querySelectorAll('#ed-tools button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
  $('ed-cat').hidden = t !== 'metti' && t !== 'muro'; if (t === 'muro') edMuri(); else if (t === 'metti') edCatalog(); if (t !== 'sel') { ED.sel = null; if (MK) MK.sel.visible = false; } $('ed-info').textContent = SUGG[t]; edButtons(); }
function edCatalog() { const c = $('ed-cat'); c.innerHTML = CATALOGO.filter(n => SPR_INFO[n]).map(n => `<button type="button" data-item="${n}" aria-pressed="${n === ED.item}"><img src="${(SPR_SRC[n] || 'assets/sprites/') + n}.webp" alt=""><span>${esc(NOMI_ED[n])}</span></button>`).join(''); }
const ICONA_MURO = { muro: '<path d="M2 12h20v8H2z" fill="#cfc4b2"/><path d="M2 16h20M8 12v4M15 12v4M5 16v4M12 16v4M18 16v4" stroke="#7a6a55" stroke-width="1.2"/>',
  staccionata: '<path d="M4 8v13M10 8v13M16 8v13M22 8v13" stroke="#9a6638" stroke-width="2.4"/><path d="M2 12h21M2 17h21" stroke="#c08850" stroke-width="2"/>',
  siepe: '<path d="M2 20v-6c0-3 3-5 5-4 1-3 5-3 6 0 2-2 6-1 6 2 2 0 3 2 3 4v4z" fill="#6f9a45"/><path d="M6 14l2 2M12 13l1 3M17 15l1 2" stroke="#3f6a2a" stroke-width="1.4"/>',
  cancello: '<path d="M2 6h5v15H2zM17 6h5v15h-5z" fill="#cfc4b2"/><path d="M8 11l3 1v8l-3-1zM16 11l-3 1v8l3-1z" fill="#9a6638"/>' };
function edMuri() { $('ed-cat').innerHTML = Object.entries(TIPI_MURO).map(([k, v]) => `<button type="button" data-muro="${k}" aria-pressed="${k === ED.muro}"><svg viewBox="0 0 24 24" aria-hidden="true" style="width:40px;height:40px">${ICONA_MURO[k]}</svg><span>${v.nome}</span></button>`).join(''); }
function editor(on) {
  ED.on = on; document.body.classList.toggle('editing', on); $('editbar').hidden = !on; $('ed-btn').setAttribute('aria-pressed', String(on));
  if (on) { edInitMarks(); setSheet(null); edCatalog(); setTool('sel'); toast('Editor: le modifiche si salvano da sole su questo dispositivo', 4); }
  else { ED.sel = null; ED.drag = null; if (MK) { MK.sel.visible = false; MK.hov.visible = false; } clearStrokeMarks(); }
}
function esporta() { const b = new Blob([JSON.stringify(mapNow(), null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'mappa-isola-sire-quadri.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function importa(file) { const r = new FileReader(); r.onload = () => { try { const m = JSON.parse(r.result); if (m.v !== 2 || !Array.isArray(m.land) || m.land.length < 7 || !m.agenti || !m.spec || !Array.isArray(m.deco)) throw 0; snapshot(); applyMap(m); toast('Mappa importata'); } catch (e) { toast('File non valido: serve una mappa esportata da qui'); } }; r.readAsText(file); }
function regnoNome() { const r = REGNI.lista.find(x => x.id === REGNI.attivo); return r ? r.nome : 'Regno'; }
function apriRegni() {
  setSheet('regni', `<h2>I tuoi regni</h2><p>Ogni regno ha la sua isola. Si salvano su questo dispositivo.</p>
    <ul class="list">${REGNI.lista.map(r => `<li><button type="button" class="regno-btn" data-id="${r.id}" aria-pressed="${r.id === REGNI.attivo}"><span>${esc(r.nome)}</span><small>${r.id === REGNI.attivo ? 'aperto ora' : 'apri'}</small></button></li>`).join('')}</ul>
    <button class="act" id="regno-nuovo">Nuovo regno<small>Un'isola vuota con solo gli edifici principali</small></button>
    <button class="act" id="regno-rinomina">Rinomina "${esc(regnoNome())}"</button>
    ${REGNI.lista.length > 1 ? `<button class="act" id="regno-elimina">Elimina "${esc(regnoNome())}"<small>Tocca due volte per confermare</small></button>` : ''}`, 'ed-regni');
}
function nuovoNome(def) { const n = (prompt('Nome del regno', def) || '').trim().slice(0, 40); return n; }
document.addEventListener('click', e => {
  if (e.target.closest('#skin-regni')) { setSheet(null); apriRegni(); return; }
  const b = e.target.closest('.regno-btn'); if (b) { if (b.dataset.id !== REGNI.attivo) { REGNI.attivo = b.dataset.id; salvaRegni(); location.reload(); } return; }
  if (e.target.closest('#regno-nuovo')) { const nome = nuovoNome('Nuovo regno ' + (REGNI.lista.length + 1)); if (!nome) return;
    const id = 'r' + Date.now().toString(36); REGNI.lista.push({ id, nome }); REGNI.attivo = id; salvaRegni(); location.reload(); return; }
  if (e.target.closest('#regno-rinomina')) { const r = REGNI.lista.find(x => x.id === REGNI.attivo); const nome = nuovoNome(r.nome); if (!nome) return; r.nome = nome; salvaRegni(); apriRegni(); apriRegni(); toast('Regno rinominato'); return; }
  const del = e.target.closest('#regno-elimina'); if (del) { if (!del.dataset.ok) { del.dataset.ok = '1'; del.firstChild.textContent = 'Tocca ancora per eliminare'; return; }
    try { localStorage.removeItem(MAPPA_KEY); } catch (er) {} REGNI.lista = REGNI.lista.filter(x => x.id !== REGNI.attivo); REGNI.attivo = REGNI.lista[0].id; salvaRegni(); location.reload(); }
});
function originale() { if (!confirmaOriginale) { confirmaOriginale = true; $('ed-orig').textContent = 'Tocca ancora per confermare'; setTimeout(() => { confirmaOriginale = false; $('ed-orig').textContent = 'Svuota questo regno'; }, 3500); return; }
  try { localStorage.removeItem(MAPPA_KEY); } catch (e) { /* niente memoria: basta ricaricare */ } location.reload(); }
let confirmaOriginale = false;
$('ed-btn').onclick = () => editor(!ED.on);
$('ed-fine').onclick = () => editor(false);
$('ed-tools').addEventListener('click', e => { const b = e.target.closest('button[data-tool]'); if (b) setTool(b.dataset.tool); });
$('ed-cat').addEventListener('click', e => { const m = e.target.closest('button[data-muro]'); if (m) { ED.muro = m.dataset.muro; edMuri(); return; } const b = e.target.closest('button[data-item]'); if (!b) return; ED.item = b.dataset.item; $('ed-cat').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
$('ed-rot').onclick = ruota; $('ed-del').onclick = elimina; $('ed-undo').onclick = annulla; $('ed-redo').onclick = ripristina;
$('ed-exp').onclick = esporta; $('ed-imp').onclick = () => $('ed-file').click(); $('ed-file').onchange = e => { if (e.target.files[0]) importa(e.target.files[0]); e.target.value = ''; };
$('ed-orig').onclick = originale;
$('ed-regni').onclick = () => { editor(false); apriRegni(); };
addEventListener('keydown', e => { if (!ED.on || (e.target.closest && e.target.closest('input,textarea'))) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? ripristina() : annulla(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') elimina(); else if (e.key === 'r' || e.key === 'R') ruota(); });

/* ================= avvio ================= */
progress(.05, 'Carico le tessere…');
Promise.all([fetchText('assets/kit.json').then(t => { progress(.7, 'Dipingo il terreno…'); return parse(t); }), texOr(SKIN.grass, 'assets/grass.jpg'), texOr(SKIN.dirt, 'assets/dirt.jpg'), loadTex('assets/sand.jpg'), texOr(SKIN.rock, 'assets/roccia.jpg'),
  // sprite della skin; quelli che mancano vengono presi dalla skin di base
  Promise.all([fetch('assets/sprites/sprites.json').then(r => r.json()), SKIN.dir === 'assets/sprites/' ? {} : fetch(SKIN.dir + 'sprites.json').then(r => r.json()).catch(() => ({}))])
    .then(([base, sk]) => { Object.keys(sk).forEach(k => { SPR_SRC[k] = SKIN.dir; }); SPR_INFO = Object.assign({}, base, sk); Object.keys(SPR_INFO).forEach(sprTex); })])
  .then(([kit, grass, dirt, sand, roccia]) => {
    KIT = kit.scene; progress(1, 'Costruisco l\'isola…');
    GND.rock = roccia; buildSkyClouds(buildUnderside(roccia));
    buildWorld({ tGrass: { value: grass }, tDirt: { value: dirt }, tRoad: { value: roadTexture() }, tSand: { value: sand }, tCoast: { value: coastTexture() }, uHalf: { value: SHORE.half }, uGT0: { value: new THREE.Vector3(...SKIN.t0) }, uGT1: { value: new THREE.Vector3(...SKIN.t1) } });
    applyQuality(); applyStates(); buildMuri(); ticker(false);
    $('veil').hidden = true; requestAnimationFrame(loop);
    // abitanti, animali e drago arrivano dopo, senza bloccare l'isola
    const opt = (u) => fetchText(u).then(parse).catch(() => null);
    Promise.all([opt('assets/knight.json'), opt('assets/mage.json'), opt('assets/rogue.json'), opt('assets/deer.json'), opt('assets/dragon.json')])
      .then(([knight, mage, rogue, deer, dragon]) => { Object.assign(CH, { knight, mage, rogue }); addLife({ knight, mage, rogue, deer, dragon }); applyQuality(); });
  })
  .catch(err => { console.error(err); fail('Non riesco a caricare il regno. Ricarica la pagina. (' + (err && err.message ? err.message : err) + ')'); });
window.__regno = { cam, rotate, goTo, EV, AG, S, PEOPLE, ED, DECO, LAND, ROADT, MURI, MURI_OBJ, bloccate, portaDi, messaggero, scr: (q, r) => { const v = W(q, r).project(camera); return [(v.x * .5 + .5) * innerWidth, (-v.y * .5 + .5) * innerHeight]; } };
})();

/* web app: si installa sulla schermata Home e funziona offline */
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
