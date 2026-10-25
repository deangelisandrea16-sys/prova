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
const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]; // 0°,60°,…,300°
const AG = {
  sire:       { nome: 'Sire',       liv: 8,  hex: [0, 0],  model: 'building_castle_blue',   stato: 'lavora', ruolo: 'La capitale. Qui arrivano i report degli agenti e il riassunto del giorno. Tocca lo stemma in alto per sentire il Sire.', kpi: { 'Agenti al lavoro': '5 su 6', 'Report oggi': '14' } },
  preventivi: { nome: 'Preventivi', liv: 5,  hex: [4, -4], model: 'building_market_blue',   stato: 'lavora', ruolo: 'Prepara e segue i preventivi.', kpi: { 'Aperti': '4', 'Accettati nel mese': '2', 'Valore aperto': '€ 18.400' } },
  fatture:    { nome: 'Fatture',    liv: 6,  hex: [4, 0],  model: 'building_mine_blue',     stato: 'lavora', ruolo: 'Emette le fatture e controlla gli incassi. La miniera è il tesoro.', kpi: { 'Incassato nel mese': '€ 21.900', 'Scadute': '1' } },
  contatti:   { nome: 'Contatti',   liv: 5,  hex: [0, 4],  model: 'building_tavern_blue',   stato: 'riposo', ruolo: 'Ricorda i clienti e segnala chi è in silenzio da troppo.', kpi: { 'Clienti': '12', 'Silenziosi > 21 g': '2' } },
  outreach:   { nome: 'Outreach',   liv: 4,  hex: [-4, 4], model: 'building_tower_A_blue',  stato: 'bloccato', ruolo: 'Cerca nuovi clienti e scrive i primi messaggi.', kpi: { 'Contatti in coda': '24', 'Risposte': '4' },
                blocco: { cosa: 'Approva il nuovo modello di mail', come: 'Rispondi APPROVA su Telegram' } },
  cervello:   { nome: 'Cervello',   liv: 9,  hex: [-4, 0], model: 'building_church_blue',   stato: 'lavora', ruolo: 'Impara dalle tue correzioni e salva le regole.', kpi: { 'Regole': '48', 'Nuove questa settimana': '6' } },
  jarvis:     { nome: 'Jarvis',     liv: 10, hex: [0, -4], model: 'building_windmill_blue', stato: 'lavora', ruolo: 'Il motore: ascolta Telegram e smista il lavoro agli agenti. Il mulino gira quando è attivo.', kpi: { 'Messaggi oggi': '23', 'Ultima risposta': '2 min fa' } },
};
const ORDER = ['sire', 'jarvis', 'preventivi', 'fatture', 'contatti', 'outreach', 'cervello'];
const S = { tesoro: 21900, obiettivo: 25000, regole: 48, preventivi: 4, udienze: 2, scadute: 1, idee: 19, imp: { n: 3, tot: 8 }, quality: 'alta', suoni: false };
const CANTIERE_HEX = [5, -1], UDIENZE_HEX = [1, 1], POZZO_HEX = [-1, -1], FONTANA_HEX = [-2, 1];
const ROVINE_HEX = [[-5, 1], [-5, 2], [-5, 3], [-3, 5], [-2, 5]];
const CAMPI_HEX = [[3, 1], [2, 2], [3, 2], [2, 3], [4, 1]];
const CONTORNO = { 'building_blacksmith_blue': [2, -1], 'building_lumbermill_blue': [5, -4], 'building_archeryrange_blue': [-1, 5] };
const NEWS = [['09:10', 'Preventivi · Hotel X ha accettato € 4.800'], ['10:32', 'Fatture · fattura #118 scaduta da 3 giorni'], ['11:05', 'Outreach · fermo, serve la tua approvazione'], ['12:40', 'Cervello · salvate 3 regole nuove']];

/* ================= hex helpers ================= */
const SQ3 = Math.sqrt(3);
const K = (q, r) => q + ',' + r;
const hdist = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(-q - r)) / 2;
const W = (q, r) => new THREE.Vector3(2 * q + r, 0, SQ3 * r);
const hexPos = (h) => W(h[0], h[1]);
/* ================= skin del regno ================= */
const SKINS = {
  mediterraneo: { nome: 'Mediterraneo', dir: 'assets/sprites/', grass: 'assets/grass.jpg', dirt: 'assets/dirt.jpg', rock: 'assets/roccia.jpg',
    sky: ['#3f86c4', '#7cbde6', '#bfe3f7'], t0: [.62, .66, .4], t1: [.86, .84, .56] },
  // SKIN-AUTO-INIZIO (righe scritte dallo script di integrazione)
  ...Object.fromEntries(Object.entries(/*SKINDATA*/{"vichinghi": {"nome": "Vichinghi", "sky": ["#2e5378", "#7298bd", "#dbe7f1"], "t0": [0.62, 0.7, 0.7], "t1": [0.8, 0.86, 0.86], "pronta": true}}/*FINE*/)
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
sun.position.set(-16, 24, 10);
sun.castShadow = true;
const sc = sun.shadow.camera; sc.left = -37; sc.right = 37; sc.top = 37; sc.bottom = -37; sc.near = 1; sc.far = 90;
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.025;
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight(0x9cc4ff, 0.3); fill.position.set(14, 8, -12); scene.add(fill);

/* ================= mappa ================= */
const LAND = new Set();
for (let q = -13; q <= 13; q++) for (let r = -13; r <= 13; r++) {
  const d = hdist(q, r); if (d > 12) continue;
  const p = W(q, r), a = Math.atan2(p.z, p.x);
  const lim = 9.4 + .9 * Math.sin(3 * a + 1.1) + .6 * Math.sin(5 * a - .4);
  if (d <= lim) LAND.add(K(q, r));
}
const isLand = (q, r) => LAND.has(K(q, r));
[CANTIERE_HEX, UDIENZE_HEX, POZZO_HEX, FONTANA_HEX, ...ROVINE_HEX, ...CAMPI_HEX, ...Object.values(CONTORNO), ...ORDER.map(k => AG[k].hex)].forEach(h => LAND.add(K(...h)));

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
  const d = DIRS.findIndex(([dq, dr]) => a[0] + dq === b[0] && a[1] + dr === b[1]);
  if (d < 0) return;
  const ka = K(...a), kb = K(...b);
  if (!ROADSET.has(ka)) ROADSET.set(ka, new Set()); if (!ROADSET.has(kb)) ROADSET.set(kb, new Set());
  ROADSET.get(ka).add(d); ROADSET.get(kb).add((d + 3) % 6); LINKS.push([a, b]);
}
const OCC = new Map();
const occ = (h, w) => OCC.set(K(...h), w);
for (let d = 0; d < 6; d++) { const [dq, dr] = DIRS[d]; for (let i = 0; i < 4; i++) link([i * dq, i * dr], [(i + 1) * dq, (i + 1) * dr]); }
link([4, 0], [5, -1]); link([-4, 0], [-5, 1]); link([0, 4], [1, 3]); link([-4, 4], [-4, 5]);
ORDER.forEach(k => occ(AG[k].hex, k));
occ(CANTIERE_HEX, 'cantiere'); occ(UDIENZE_HEX, 'udienze'); occ(POZZO_HEX, 'pozzo'); occ(FONTANA_HEX, 'fontana');
ROVINE_HEX.forEach(h => occ(h, 'rovina')); CAMPI_HEX.forEach(h => occ(h, 'campo'));
Object.entries(CONTORNO).forEach(([m, h]) => { if (!OCC.has(K(...h))) occ(h, m); });
const isRoadTile = (key) => ROADSET.has(key) && !OCC.has(key);
const dirOf = (h) => DIRS.findIndex(([dq, dr]) => dq * 4 === h[0] && dr * 4 === h[1]);

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
        float gUp=smoothstep(.45,.7,normalize(vGN).y);
        float gLow=1.-smoothstep(.2,.3,vGW.y);
        vec3 gBase=diffuseColor.rgb;
        float gGreen=smoothstep(-.01,.05,gBase.g-gBase.r);
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
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); const sc = N / (2 * SHORE.half);
  x.fillStyle = '#000'; x.fillRect(0, 0, N, N); x.fillStyle = '#fff';
  LAND.forEach(k => { const [q, r] = k.split(',').map(Number); const p = W(q, r); x.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = (p.x + Math.cos(a) * 1.16 + SHORE.half) * sc, py = (p.z + Math.sin(a) * 1.16 + SHORE.half) * sc; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.closePath(); x.fill(); });
  const t = document.createElement('canvas'); t.width = t.height = N / 8; const tx = t.getContext('2d'); tx.imageSmoothingEnabled = true; tx.drawImage(c, 0, 0, N / 8, N / 8);
  const out = document.createElement('canvas'); out.width = out.height = N; const o = out.getContext('2d'); o.imageSmoothingEnabled = true; o.drawImage(t, 0, 0, N, N);
  const tex = new THREE.CanvasTexture(out); tex.minFilter = THREE.LinearFilter; return tex;
}
function roadTexture() {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); const sc = N / (2 * SHORE.half);
  x.fillStyle = '#000'; x.fillRect(0, 0, N, N); x.strokeStyle = '#fff'; x.lineCap = 'round'; x.lineWidth = 1.05 * sc;
  const P = (h) => { const p = hexPos(h); return [(p.x + SHORE.half) * sc, (p.z + SHORE.half) * sc]; };
  LINKS.forEach(([a, b]) => { x.beginPath(); x.moveTo(...P(a)); x.lineTo(...P(b)); x.stroke(); });
  x.fillStyle = '#fff'; x.beginPath(); x.arc(...P([0, 0]), 2.1 * sc, 0, Math.PI * 2); x.fill(); // piazza del castello
  const out = document.createElement('canvas'); out.width = out.height = N; const o = out.getContext('2d');
  const t = document.createElement('canvas'); t.width = t.height = N / 4; const tx = t.getContext('2d'); tx.imageSmoothingEnabled = true; tx.drawImage(c, 0, 0, N / 4, N / 4);
  o.imageSmoothingEnabled = true; o.drawImage(t, 0, 0, N, N); o.globalAlpha = .55; o.drawImage(c, 0, 0); o.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(out); tex.minFilter = THREE.LinearFilter; return tex;
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
  m.userData.u = { uProg: { value: 1 }, uDir: { value: 1 }, uEdge: { value: new THREE.Color(edge || 0xffc35a) }, uDim: { value: 0 }, uY0: { value: 0 }, uY1: { value: 1 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
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
  o.scale.set(W, W * info.h / info.w, 1); o.center.set(.5, Math.min(.45, o.userData.cy * info.w / info.h));
}
// base: nome con le viste (es. 'castello') oppure immagine singola (es. 'casa_a'); facing: direzione dell'ingresso nel mondo
function makeSprite(base, width, pos, facing, opt) {
  opt = opt || {}; const o = new THREE.Sprite(spriteMat(opt.edge));
  o.userData.width = width; o.userData.cy = opt.cy || .3; o.userData.views = SPR_INFO[base + '_N'] ? VIEW_SFX.map(v => base + '_' + v) : null;
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
function updateSprites() {
  for (const o of SPRITES) {
    if (!o.userData.views) continue;
    _p0.copy(o.position).project(camera); _p1.copy(o.position).add(o.userData.facing).project(camera);
    const dx = _p1.x - _p0.x, dy = _p1.y - _p0.y; // y verso l'alto dello schermo
    const idx = dy <= 0 ? (dx <= 0 ? 0 : 1) : (dx >= 0 ? 2 : 3); // giù-sx N, giù-dx E, su-dx S, su-sx O
    setSpriteImg(o, o.userData.views[idx]);
  }
  // ordine di disegno: dal più lontano al più vicino, insieme a persone e drago
  camera.getWorldDirection(_fw);
  const list = SPRITES.map(o => [o.position.dot(_fw), o]);
  PEOPLE.forEach(P => list.push([P.o.position.dot(_fw) - .4, P.o]));
  if (D.dragon) list.push([D.dragon.o.position.dot(_fw) - 3, D.dragon.o]);
  list.sort((a, b) => b[0] - a[0]);
  list.forEach(([, o], i) => { if (o.isSprite) o.renderOrder = 10 + i; else o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) m.renderOrder = 10 + i; }); });
  for (const o of SPRITES) { const g = o.userData.ghost; if (!g) continue;
    if (o.userData.fade > 0) { o.userData.fade = Math.max(0, o.userData.fade - (reduceMotion ? 1 : SPR_DT / .28)); }
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
const SHORE = { size: 512, half: 46 };
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
  // distanza dalla costa in tessere: più si va verso il centro, più la roccia scende
  const cd = new Map(), Q = [];
  LAND.forEach(k => { const [a, b] = k.split(',').map(Number); if (DIRS.some(([dq, dr]) => !isLand(a + dq, b + dr))) { cd.set(k, 0); Q.push(k); } });
  while (Q.length) { const k = Q.shift(); const [a, b] = k.split(',').map(Number);
    DIRS.forEach(([dq, dr]) => { const n = K(a + dq, b + dr); if (LAND.has(n) && !cd.has(n)) { cd.set(n, cd.get(k) + 1); Q.push(n); } }); }
  const rr = rng(4242), dep = new Map(); let maxD = 0;
  LAND.forEach(k => { const d = cd.get(k); const v = .9 + Math.pow(d, 1.45) * 1.25 + rr() * 1.4 + (d === 0 ? 0 : rr() < .12 ? 2.2 : 0); dep.set(k, v); maxD = Math.max(maxD, v); });
  const pos = [], nor = [], RAD = 1.175, TOP = .09;
  const quad = (x1, z1, x2, z2, y1, y2, nx, nz) => { pos.push(x1, y1, z1, x1, y2, z1, x2, y2, z2, x1, y1, z1, x2, y2, z2, x2, y1, z2); for (let i = 0; i < 6; i++) nor.push(nx, 0, nz); };
  LAND.forEach(k => { const [a, b] = k.split(',').map(Number); const p = W(a, b); const D = dep.get(k);
    DIRS.forEach(([dq, dr]) => { const n = K(a + dq, b + dr); const top = LAND.has(n) ? -dep.get(n) : TOP; if (top <= -D) return;
      const ang = Math.atan2(Math.sqrt(3) * dr, 2 * dq + dr), a1 = ang - Math.PI / 6, a2 = ang + Math.PI / 6;
      quad(p.x + Math.cos(a1) * RAD, p.z + Math.sin(a1) * RAD, p.x + Math.cos(a2) * RAD, p.z + Math.sin(a2) * RAD, top, -D, Math.cos(ang), Math.sin(ang)); }); });
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
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; scene.add(mesh);
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
    const below = i < 30, a = r() * 6.28, d = below ? 14 + r() * 30 : 30 + r() * 22;
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
function hitbox(key, p, h) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, h, 6), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(p.x, h / 2, p.z); m.userData.key = key; scene.add(m); PICK.push(m); }
function buildWorld(groundU) {
  // tessere
  LAND.forEach(k => {
    const [q, r] = k.split(',').map(Number); const p = W(q, r);
    const water = []; for (let d = 0; d < 6; d++) if (!isLand(q + DIRS[d][0], r + DIRS[d][1])) water.push(d);
    if (isRoadTile(k)) { const m = matchSet(ROADS, [...ROADSET.get(k)]); if (m) { addStatic('hex_road_' + m.name, p, m.rot); return; } }
    addStatic('hex_grass', p, 0);
  });
  // natura e borgo
  const smokeSrc = [], HOUSES = [];
  LAND.forEach(k => {
    if (OCC.has(k) || ROADSET.has(k)) return;
    const [q, r] = k.split(',').map(Number); const dist = hdist(q, r); const p = W(q, r);
    const coastal = DIRS.some(([dq, dr]) => !isLand(q + dq, r + dr));
    const ang = Math.atan2(p.z, p.x) * 180 / Math.PI;
    const rot = Math.floor(R() * 6) * Math.PI / 3;
    const NAT = !!SPR_INFO.pineta; // natura dipinta disponibile
    const nat = (n, w, kay) => { if (NAT && SPR_INFO[n]) HOUSES.push([p, n, w]); else if (kay) addStatic(kay, p, rot); };
    // costa: spiaggia quasi libera, pochi scogli
    if (coastal) { const rr = R(); if (rr < .07) nat('scogli', 1.7, pick(['rock_single_A', 'rock_single_B', 'rock_single_C']));
      else if (rr < .2) nat(pick(['cipressi', 'pineta']), 2.0, pick(['trees_A_small', 'trees_B_small'])); return; }
    // montagne solo nel cuore del nord, raggruppate
    if (dist >= 7 && ang < -55 && ang > -130) { const rr = R(); if (rr < .55) nat(rr < .4 ? 'montagna' : 'rupe', rr < .4 ? 2.9 : 2.5, pick(['mountain_A_grass_trees', 'mountain_B_grass_trees', 'hills_A_trees'])); else if (rr < .8) nat('pineta', 2.3, 'trees_A_large'); return; }
    if (dist >= 6) { const rr = R(); if (rr < .36) nat(pick(['pineta', 'cipressi', 'uliveto', 'uliveto']), 2.3, pick(['trees_A_large', 'trees_B_large', 'trees_A_medium']));
      else if (rr < .46) { HOUSES.push([p, NAT ? 'fattoria' : 'casa_a', 2.3]); smokeSrc.push(p.clone().add(new THREE.Vector3(.1, 1.4, -.1))); }
      else if (rr < .56 && SPR_INFO.grano) nat(pick(['grano', 'vigneto']), 2.3); return; }
    const rr = R();
    if (dist <= 4 && rr < .42) { HOUSES.push([p, pick(['casa_a', 'casa_b'])]); smokeSrc.push(p.clone().add(new THREE.Vector3(.1, 1.5, -.1))); return; }
    if (rr < .2 && dist > 4) { HOUSES.push([p, NAT ? 'fattoria' : 'casa_a', 2.3]); smokeSrc.push(p.clone().add(new THREE.Vector3(.1, 1.4, -.1))); }
    else if (rr < .55) nat(pick(['uliveto', 'vigneto', 'cipressi']), 2.2, pick(['trees_A_small', 'trees_B_small', 'tree_single_A', 'trees_A_medium']));
  });
  // campi coltivati con staccionate
  CAMPI_HEX.forEach((h, i) => { const p = hexPos(h);
    if (SPR_INFO.grano) { HOUSES.push([p, i % 3 === 2 ? 'vigneto' : 'grano', 2.3]); return; }
    addStatic('building_grain', p, i * Math.PI / 3);
    [0, 2, 4].forEach(e => { const a = Math.PI / 6 + e * Math.PI / 3, rp = p.clone().add(new THREE.Vector3(Math.cos(a) * .86, 0, Math.sin(a) * .86)); addStatic('fence_wood_straight', rp, -a + Math.PI / 2, .9); }); });
  if (SPR_INFO.fontana) HOUSES.push([hexPos(FONTANA_HEX), 'fontana', 1.9]);
  // edifici di contorno
  Object.entries(CONTORNO).forEach(([n, h]) => { if (OCC.get(K(...h)) !== n) return; const p = hexPos(h); HOUSES.push([p, n.length % 2 ? 'casa_a' : 'casa_b']);
    smokeSrc.push(p.clone().add(new THREE.Vector3(.1, 1.5, -.1))); });
  // piazza del castello: merci ai lati delle strade
  for (let d = 0; d < 6; d++) { const v = W(...DIRS[d]).multiplyScalar(.5), side = new THREE.Vector3(-v.z, 0, v.x).normalize().multiplyScalar(.62);
    addStatic(pick(['barrel', 'crate_A_big', 'sack', 'wheelbarrow', 'crate_long_A', 'resource_lumber']), W(...DIRS[d]).multiplyScalar(1.5).add(side), R() * 6); }
  // ninfee

  bakeStatic(groundU);
  HOUSES.forEach(([p, n, w]) => makeSprite(n, w || 2.15, p));
  buildSmoke(smokeSrc);
  buildBirds();

  // quartieri degli agenti
  ORDER.forEach(k => {
    const a = AG[k]; const p = hexPos(a.hex);
    const o = makeSprite(SPR_OF[k], k === 'sire' ? 4.3 : 2.75, p, k === 'sire' ? new THREE.Vector3(0, 0, 1) : p.clone().negate());
    o.userData.key = k; PICK.push(o); a.obj = o; a.pos = p; a.top = 2.2;
    a.ring = statusRing(p);
  });
  fan = null; // le pale sono dipinte
  D.flagOut = model('flag_red'); scene.add(D.flagOut); D.flagFat = model('flag_red'); scene.add(D.flagFat);
  placeFlag(D.flagOut, AG.outreach); placeFlag(D.flagFat, AG.fatture);
  D.corr = corruption(AG.outreach.pos);
  [0, 2, 4].forEach(d => { const f = model('flag_blue'); f.position.copy(W(...DIRS[d]).multiplyScalar(.62)); f.scale.setScalar(1.15); scene.add(f); flags.push(f); });

  // udienze: tende davanti al castello
  D.tents = [];
  const up = hexPos(UDIENZE_HEX); [[-.5, -.4], [.55, -.25], [0, .45]].forEach(([x, z], i) => { const t = makeSprite('tenda', 1.15, new THREE.Vector3(up.x + x, 0, up.z + z)); t.visible = i < S.udienze; t.userData.key = 'udienze'; PICK.push(t); D.tents.push(t); });
  addLabelObj('udienze', 'Approvazioni', up, 1.2, null, 'small'); hitbox('udienze', up, 1.2);

  // pozzo dei desideri
  const pp = hexPos(POZZO_HEX); const pz = makeSprite('pozzo', 1.8, pp); pz.userData.key = 'pozzo'; PICK.push(pz); addLabelObj('pozzo', 'Pozzo dei desideri', pp, 1.3, null, 'small');

  // cantiere dell'impossibile
  const cp = hexPos(CANTIERE_HEX); D.stages = {};
  ['cantiere_1', 'cantiere_2', 'cantiere_3', 'torre'].forEach(n => { const o = makeSprite(n, 2.5, cp, cp.clone().negate()); o.visible = false; o.userData.key = 'cantiere'; PICK.push(o); D.stages[n] = o; });
  D.scaff = new THREE.Object3D();
  D.stageNow = stageFor(S.imp.n); D.stages[D.stageNow].visible = true;
  addLabelObj('cantiere', 'Cantiere', cp, 2.0, 3); hitbox('cantiere', cp, 2);

  // rovine = idee da costruire
  D.lots = ROVINE_HEX.map((h, i) => { const p = hexPos(h); const ru = makeSprite('rovina', 2.1, p, null, { edge: 0xff8a3a }); ru.userData.key = 'rovine'; PICK.push(ru);
    const ho = makeSprite(i % 2 ? 'casa_a' : 'casa_b', 2.15, p); ho.visible = false; ho.userData.key = 'rovine'; PICK.push(ho); return { ru, ho, done: false }; });
  addLabelObj('rovine', 'Idee da costruire', hexPos(ROVINE_HEX[2]), 1.1, null, 'small');

  // mulino ad acqua sulla costa
  let wmHex = null; LAND.forEach(k => { if (wmHex) return; const [q, r] = k.split(',').map(Number); if (OCC.has(k) || ROADSET.has(k)) return; if (hdist(q, r) >= 5 && q < -2 && r > 2) wmHex = [q, r]; });
  if (false && wmHex) { const wm = model('building_watermill_blue'); wm.position.copy(hexPos(wmHex)); wm.rotation.y = -Math.PI / 3; scene.add(wm); wheel = wm.getObjectByName('building_watermill_wheel_blue'); }

  // nuvole intorno all'isola
  ['cloud_big', 'cloud_small', 'cloud_big', 'cloud_small', 'cloud_big'].forEach((n, i) => { const c = model(n); c.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = .8; m.receiveShadow = false; } });
    c.scale.setScalar(1.4 + R() * .8); c.userData.a = i * Math.PI * .4 + R(); c.userData.r = 36 + R() * 6; c.userData.v = .5 + R() * .4; c.position.y = 3 + R() * 1.5; scene.add(c); clouds.push(c); });

  ORDER.forEach(k => addLabelAgent(k));
}
function placeFlag(f, a) { f.position.copy(a.pos).add(new THREE.Vector3(.72, 0, .5)); f.scale.setScalar(1.1); flags.push(f); }
function stageFor(n) { return n >= S.imp.tot ? 'torre' : n >= 6 ? 'cantiere_3' : n >= 3 ? 'cantiere_2' : 'cantiere_1'; }
const SPR_OF = { sire: 'castello', jarvis: 'mulino', preventivi: 'mercato', fatture: 'tesoro', contatti: 'taverna', outreach: 'torre', cervello: 'tempio' };

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
function spokePoint(d, f) { return W(DIRS[d][0], DIRS[d][1]).multiplyScalar(f); }
function walkTo(P, from, to, anim) { P.from.copy(from); P.to.copy(to); P.len = Math.max(.01, from.distanceTo(to)); P.t = 0; P.o.position.copy(from); P.o.rotation.y = Math.atan2(to.x - from.x, to.z - from.z); P.play(anim || P.walkAnim || 'Walking_A'); }
function stepPeople(dt) {
  PEOPLE.forEach(P => {
    P.mixer.update(dt);
    if (P.cheer > 0) { P.cheer -= dt; if (P.cheer <= 0) P.play(P.t < 1 ? (P.walkAnim || 'Walking_A') : (P.idleAnim || 'Idle')); return; }
    if (P.t < 1) { P.t += dt * P.speed / P.len; P.o.position.lerpVectors(P.from, P.to, Math.min(P.t, 1)); if (P.t >= 1) { P.play(P.idleAnim || 'Idle'); P.wait = P.pause == null ? 1.5 + Math.random() * 2 : P.pause; P.arrive && P.arrive(P); } return; }
    if (P.wait > 0) { P.wait -= dt; if (P.wait <= 0 && P.next) P.next(P); }
  });
}
function spokeWalker(g, d0, h) {
  const P = person(g, { h: h || .62 }); P.dir = d0; P.out = true;
  P.next = (Q) => { const a = spokePoint(Q.dir, .7), b = spokePoint(Q.dir, 3.4); const s = new THREE.Vector3(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(.2);
    if (Q.out) walkTo(Q, a.clone().add(s), b.clone().add(s)); else { walkTo(Q, b.clone().sub(s), a.clone().sub(s)); Q.dir = (Q.dir + 1 + Math.floor(Math.random() * 4)) % 6; }
    Q.out = !Q.out; };
  P.wait = Math.random() * 3; P.play('Idle'); P.o.position.copy(spokePoint(d0, .6)); return P;
}
function addLife(G) {
  const chars = [G.knight, G.mage, G.rogue].filter(Boolean);
  if (chars.length) {
    for (let i = 0; i < 6; i++) spokeWalker(chars[i % chars.length], i, .62);
    if (G.knight) [[.55, 1.35], [-.55, 1.35]].forEach(([x, z]) => { const P = person(G.knight, { h: .64, keepProps: true }); P.o.position.set(x, 0, z); P.o.rotation.y = 0; P.play('Idle'); P.guard = true; });
    CAMPI_HEX.slice(0, 3).forEach((h, i) => { const P = person(chars[(i + 1) % chars.length], { h: .6, idleAnim: 'Interact', pause: 0 }); const p = hexPos(h); P.o.position.set(p.x + .3, 0, p.z - .2); P.o.rotation.y = i * 2; P.play(i % 2 ? 'PickUp' : 'Interact');
      P.next = (Q) => { Q.play(pick(['Interact', 'PickUp', 'Use_Item'])); Q.wait = 3 + Math.random() * 3; }; P.wait = 2 + i; });
  }
  if (G.deer) {
    const spots = []; LAND.forEach(k => { const [q, r] = k.split(',').map(Number); const p = W(q, r), ang = Math.atan2(p.z, p.x) * 180 / Math.PI; if (hdist(q, r) === 4 && ang > -35 && ang < 35 && !OCC.has(k) && !ROADSET.has(k)) spots.push(p); });
    spots.slice(0, 3).forEach((p, i) => { const P = person(G.deer, { h: .5, bones: true, keepProps: true, speed: .35, walkAnim: 'Walk', idleAnim: 'Eating', pause: 4 }); P.home = p.clone().add(new THREE.Vector3(-1.1, 0, .3)); P.o.position.copy(P.home); P.play('Eating');
      P.next = (Q) => { const t = Q.home.clone().add(new THREE.Vector3((Math.random() - .5) * 1.4, 0, (Math.random() - .5) * 1.4)); walkTo(Q, Q.o.position.clone(), t, 'Walk'); }; P.wait = 2 + i * 2; });
  }
  if (G.dragon) { const o = THREE.SkeletonUtils.clone(G.dragon.scene); o.scale.setScalar(1.3 / realHeight(o));
    o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = true; m.frustumCulled = false; m.material = m.material.clone(); m.material.color.multiplyScalar(.32); m.material.transparent = true; } }); scene.add(o);
    const mixer = new THREE.AnimationMixer(o); const fly = G.dragon.animations.find(c => /Fast_Flying/.test(c.name)) || G.dragon.animations[0]; if (fly) mixer.clipAction(fly).play();
    D.dragon = { o, mixer, a: 0, k: S.scadute > 0 ? 1 : 0 }; o.visible = S.scadute > 0; }
}
function cheerAll(sec) { PEOPLE.forEach(P => { if (P.acts.Cheer) { P.cheer = sec; P.play('Cheer', .2); } }); }

/* ================= camera isometrica ================= */
const VIEWS = ['Nord', 'Est', 'Sud', 'Ovest'];
const cam = { yaw: Math.PI / 4, view: 0, pitch: 0.6155, tx: 0, ty: -5.5, tz: 0.8, zoom: innerWidth < innerHeight ? .8 : .66 }; // ty: si guarda un po' sotto, per vedere la roccia
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
function rotate(step) {
  if (rotating || !step) return; rotating = true;
  cam.view = (cam.view + step + 4) % 4; const y0 = cam.yaw, y1 = cam.yaw - step * Math.PI / 2;
  // a zoom d'insieme l'isola torna al centro mentre gira (niente isola "decentrata" dopo la rotazione)
  const home = cam.zoom <= HOME_ZOOM * 1.15, x0 = cam.tx, z0 = cam.tz;
  tween('rot', .5 + .12 * (Math.abs(step) - 1), k => { cam.yaw = y0 + (y1 - y0) * k; if (home) { cam.tx = x0 * (1 - k); cam.tz = z0 + (.8 - z0) * k; } },
    () => { cam.yaw = y1; rotating = false; });
  $('needle').style.transform = `rotate(${cam.view * 90}deg)`; $('dir-lbl').textContent = VIEWS[cam.view];
}
const ZMIN = .45, ZMAX = 3.4;
function zoomBy(f) { const z0 = cam.zoom, z1 = Math.min(ZMAX, Math.max(ZMIN, cam.zoom * f)); tween('zoom', .3, k => { cam.zoom = z0 + (z1 - z0) * k; }); }
function goTo(pos, z) { const x0 = cam.tx, z0 = cam.tz, zz0 = cam.zoom, zz1 = z || Math.max(cam.zoom, 1.8);
  tween('pan', .9, k => { cam.tx = x0 + (pos.x - x0) * k; cam.tz = z0 + (pos.z - z0) * k; cam.zoom = zz0 + (zz1 - zz0) * k; }); }
function clampCam() { const r = Math.hypot(cam.tx, cam.tz); if (r > 24) { cam.tx *= 24 / r; cam.tz *= 24 / r; } }
function panPixels(dx, dy) {
  const wpp = (2 * cam.hw / cam.zoom) / innerWidth, hpp = (2 * cam.hh / cam.zoom) / innerHeight / Math.sin(cam.pitch);
  const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  cam.tx += -rx * dx * wpp + fx * dy * hpp; cam.tz += -rz * dx * wpp + fz * dy * hpp; clampCam();
}
const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, moved = 0;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = cam.zoom; } });
canvas.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy);
  if (ptrs.size === 1) panPixels(dx, dy); p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) cam.zoom = Math.min(ZMAX, Math.max(ZMIN, zoom0 * d / pinch0)); } });
['pointerup', 'pointercancel'].forEach(t => canvas.addEventListener(t, e => { const was = ptrs.size; ptrs.delete(e.pointerId); pinch0 = 0; if (t === 'pointerup' && was === 1 && moved < 8) pickAt(e.clientX, e.clientY); }));
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
  el.addEventListener('click', () => openPlace(key)); lblLayer.appendChild(el);
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
  ['n-list', 'n-ev', 'n-info', 'n-skin'].forEach(id => $(id).setAttribute('aria-pressed', 'false'));
  if (!name || openSheet === name) { sheet.hidden = true; openSheet = null; syncPad(); return; }
  openSheet = name; sheet.innerHTML = html; sheet.hidden = false; if (btn) $(btn).setAttribute('aria-pressed', 'true'); syncPad();
}
function kpiHtml(o) { return `<div class="kpis">${Object.entries(o).map(([k, v]) => `<div class="kpi"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>`; }
function openPlace(key) {
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
$('n-skin').onclick = () => setSheet('skin', `<h2>Skin del regno</h2><p>Scegli lo stile dell'isola. La pagina si ricarica con la nuova skin.</p><div class="skins">${Object.entries(SKINS).filter(([, v]) => v.pronta !== false).map(([k, v]) => `<button class="act skin-btn" data-skin="${k}" aria-pressed="${k === SKIN_ID}">${esc(v.nome)}${k === SKIN_ID ? '<small>in uso</small>' : ''}</button>`).join('')}</div>`, 'n-skin');
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
  const a = AG[k], d = dirOf(a.hex); toast(`Il messaggero corre verso ${a.nome}`); AUDIO.horn(); goTo(spokePoint(d < 0 ? 0 : d, 2), 1.7);
  const tpl = CH.rogue || CH.knight;
  if (!tpl || d < 0) { later(1.5, () => approva(k)); return; }
  const P = person(tpl, { h: .64, speed: 2.1, walkAnim: 'Running_A', pause: 0 });
  walkTo(P, spokePoint(d, .7), spokePoint(d, 3.4), 'Running_A');
  P.arrive = (Q) => { Q.arrive = null; Q.play('Cheer'); approva(k); later(2.2, () => { scene.remove(Q.o); const i = PEOPLE.indexOf(Q); if (i >= 0) PEOPLE.splice(i, 1); }); };
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
    g.o.position.set(c.x + Math.cos(g.a) * r, h + Math.sin(time * 1.3) * .3, c.z + Math.sin(g.a) * r); g.o.rotation.y = -g.a; }
  ORDER.forEach(k => { const a = AG[k]; a.ring.material.opacity = a.stato === 'bloccato' ? .55 + .45 * Math.sin(time * 4) : .9; });
  SKYCLOUDS.forEach(c => { c.userData.a += dt * c.userData.v; c.position.x = Math.cos(c.userData.a) * c.userData.d; c.position.z = Math.sin(c.userData.a) * c.userData.d; });
  stepPeople(dt);
  AUDIO.tick(time);
  updateSprites();
  renderer.render(scene, camera); if (SNAP) scattaCartolina(); updateLabels();
  frames++; acc += dt; if (acc >= 1) { const f = $('fps-line'); if (f) f.textContent = `Qualità ${S.quality}: ${Math.round(frames / acc)} fotogrammi al secondo.`; frames = 0; acc = 0; }
  requestAnimationFrame(loop);
}

/* ================= avvio ================= */
progress(.05, 'Carico le tessere…');
Promise.all([fetchText('assets/kit.json').then(t => { progress(.7, 'Dipingo il terreno…'); return parse(t); }), texOr(SKIN.grass, 'assets/grass.jpg'), texOr(SKIN.dirt, 'assets/dirt.jpg'), loadTex('assets/sand.jpg'), texOr(SKIN.rock, 'assets/roccia.jpg'),
  // sprite della skin; quelli che mancano vengono presi dalla skin di base
  Promise.all([fetch('assets/sprites/sprites.json').then(r => r.json()), SKIN.dir === 'assets/sprites/' ? {} : fetch(SKIN.dir + 'sprites.json').then(r => r.json()).catch(() => ({}))])
    .then(([base, sk]) => { Object.keys(sk).forEach(k => { SPR_SRC[k] = SKIN.dir; }); SPR_INFO = Object.assign({}, base, sk); Object.keys(SPR_INFO).forEach(sprTex); })])
  .then(([kit, grass, dirt, sand, roccia]) => {
    KIT = kit.scene; progress(1, 'Costruisco l\'isola…');
    buildSkyClouds(buildUnderside(roccia));
    buildWorld({ tGrass: { value: grass }, tDirt: { value: dirt }, tRoad: { value: roadTexture() }, tSand: { value: sand }, tCoast: { value: coastTexture() }, uHalf: { value: SHORE.half }, uGT0: { value: new THREE.Vector3(...SKIN.t0) }, uGT1: { value: new THREE.Vector3(...SKIN.t1) } });
    applyQuality(); applyStates(); ticker(false);
    $('veil').hidden = true; requestAnimationFrame(loop);
    // abitanti, animali e drago arrivano dopo, senza bloccare l'isola
    const opt = (u) => fetchText(u).then(parse).catch(() => null);
    Promise.all([opt('assets/knight.json'), opt('assets/mage.json'), opt('assets/rogue.json'), opt('assets/deer.json'), opt('assets/dragon.json')])
      .then(([knight, mage, rogue, deer, dragon]) => { Object.assign(CH, { knight, mage, rogue }); addLife({ knight, mage, rogue, deer, dragon }); applyQuality(); });
  })
  .catch(err => { console.error(err); fail('Non riesco a caricare il regno. Ricarica la pagina. (' + (err && err.message ? err.message : err) + ')'); });
window.__regno = { cam, rotate, goTo, EV, AG, S };
})();
