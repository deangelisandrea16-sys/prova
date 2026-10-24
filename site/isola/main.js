/* Regno di Sire — isola isometrica [PROVA]
   Modelli: KayKit Medieval Hexagon Pack + Adventurers (Kay Lousberg, CC0). */
(function () {
"use strict";
const $ = (id) => document.getElementById(id);
function fail(msg) { const d = document.createElement('div'); d.className = 'err'; d.textContent = msg; document.body.appendChild(d); $('veil').hidden = true; }
if (!window.THREE || !THREE.GLTFLoader) { fail('Non riesco a caricare il motore 3D. Controlla la connessione e ricarica.'); return; }

/* ================= dati demo [PROVA] ================= */
const STATI = {
  lavora:   { t: 'Al lavoro',     col: 0x5fbf4a },
  bloccato: { t: 'Serve te',      col: 0xe2513a },
  cantiere: { t: 'In costruzione', col: 0xe8b13a },
  riposo:   { t: 'A riposo',      col: 0x9aa3ad },
};
// Direzioni esagonali (assiali): 0°,60°,120°,180°,240°,300°
const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const AG = {
  sire:       { nome: 'Sire',       liv: 8, hex: [0, 0],   model: 'building_castle_blue',   stato: 'lavora', ruolo: 'La capitale. Qui arrivano i report degli agenti e il riassunto del giorno.', kpi: { 'Agenti attivi': '5 su 6', 'Report oggi': '14' } },
  preventivi: { nome: 'Preventivi', liv: 5, hex: [2, -2],  model: 'building_market_blue',   stato: 'lavora', ruolo: 'Prepara e segue i preventivi.', kpi: { 'Aperti': '4', 'Accettati nel mese': '2', 'Valore aperto': '€ 18.400' } },
  fatture:    { nome: 'Fatture',    liv: 6, hex: [2, 0],   model: 'building_mine_blue',     stato: 'lavora', ruolo: 'Emette le fatture e controlla gli incassi. La miniera è il tesoro.', kpi: { 'Incassato nel mese': '€ 21.900', 'Scadute': '1' } },
  contatti:   { nome: 'Contatti',   liv: 5, hex: [0, 2],   model: 'building_tavern_blue',   stato: 'riposo', ruolo: 'Ricorda i clienti e segnala chi è in silenzio da troppo.', kpi: { 'Clienti': '12', 'Silenziosi > 21 g': '2' } },
  outreach:   { nome: 'Outreach',   liv: 4, hex: [-2, 2],  model: 'building_tower_A_blue',  stato: 'bloccato', ruolo: 'Cerca nuovi clienti e scrive i primi messaggi.', kpi: { 'Contatti in coda': '24', 'Risposte': '4' },
                blocco: { cosa: 'Approva il nuovo modello di mail', come: 'Rispondi APPROVA su Telegram' } },
  cervello:   { nome: 'Cervello',   liv: 9, hex: [-2, 0],  model: 'building_church_blue',   stato: 'lavora', ruolo: 'Impara dalle tue correzioni e salva le regole.', kpi: { 'Regole': '48', 'Nuove questa settimana': '6' } },
  jarvis:     { nome: 'Jarvis',     liv: 10, hex: [0, -2], model: 'building_windmill_blue', stato: 'lavora', ruolo: 'Il motore: ascolta Telegram e smista il lavoro agli agenti. Il mulino gira quando è attivo.', kpi: { 'Messaggi oggi': '23', 'Ultima risposta': '2 min fa' } },
};
const ORDER = ['sire', 'jarvis', 'preventivi', 'fatture', 'contatti', 'outreach', 'cervello'];
const S = { tesoro: 21900, obiettivo: 25000, regole: 48, preventivi: 4, udienze: 2, scadute: 1, idee: 19, imp: { n: 3, tot: 8 }, quality: 'alta' };
const CANTIERE_HEX = [3, -1], UDIENZE_HEX = [1, 1];
const ROVINE_HEX = [[-3, 1], [-3, 2], [-3, 3], [-2, 3], [-1, 3]];
const NEWS = [['09:10', 'Preventivi · Hotel X ha accettato € 4.800'], ['10:32', 'Fatture · fattura #118 scaduta da 3 giorni'], ['11:05', 'Outreach · fermo, serve la tua approvazione'], ['12:40', 'Cervello · salvate 3 regole nuove']];

/* ================= hex helpers ================= */
const SQ3 = Math.sqrt(3);
const K = (q, r) => q + ',' + r;
const hdist = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(-q - r)) / 2;
const W = (q, r) => new THREE.Vector3(2 * q + r, 0, SQ3 * r);
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(1729);

/* ================= renderer ================= */
const canvas = $('world');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch (e) { fail('Questo dispositivo non supporta WebGL.'); return; }
const isMobile = matchMedia('(pointer:coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);

scene.add(new THREE.HemisphereLight(0xd8ecff, 0x7a6a4a, 0.62));
const sun = new THREE.DirectionalLight(0xfff0d8, 1.75);
sun.position.set(-14, 22, 9);
sun.castShadow = true;
const sc = sun.shadow.camera; sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 1; sc.far = 70;
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight(0x9cc4ff, 0.28); fill.position.set(12, 8, -10); scene.add(fill);

/* ================= mappa ================= */
const LAND = new Set();
for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) if (hdist(q, r) <= 4) LAND.add(K(q, r));
[[5, -2], [5, -3], [4, 1], [-5, 2], [-5, 3], [-4, 4], [1, 4], [2, -5], [-1, -4], [3, -5], [-2, 5], [-1, 5]].forEach(([q, r]) => LAND.add(K(q, r)));
[[-4, 0], [4, -4], [0, 4]].forEach(([q, r]) => LAND.delete(K(q, r)));
const isLand = (q, r) => LAND.has(K(q, r));

// canonical edge sets (indices of DIRS), from analysis of the tile meshes
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

// strade: raggi dal castello verso ogni quartiere + qualche ramo
const ROADSET = new Map();
function link(a, b) { // a,b adjacent hexes
  const d = DIRS.findIndex(([dq, dr]) => a[0] + dq === b[0] && a[1] + dr === b[1]);
  if (d < 0) return;
  const ka = K(...a), kb = K(...b);
  if (!ROADSET.has(ka)) ROADSET.set(ka, new Set()); if (!ROADSET.has(kb)) ROADSET.set(kb, new Set());
  ROADSET.get(ka).add(d); ROADSET.get(kb).add((d + 3) % 6);
}
const OCC = new Map(); // hex -> what
const occ = (h, w) => OCC.set(K(...h), w);
for (let d = 0; d < 6; d++) { const [dq, dr] = DIRS[d]; link([0, 0], [dq, dr]); link([dq, dr], [2 * dq, 2 * dr]); }
link([2, 0], [3, -1]);          // fatture -> cantiere
link([-2, 2], [-3, 2]);         // outreach -> rovine
link([0, 2], [1, 1]);           // contatti -> udienze
ORDER.forEach(k => occ(AG[k].hex, k));
occ(CANTIERE_HEX, 'cantiere'); occ(UDIENZE_HEX, 'udienze'); ROVINE_HEX.forEach(h => occ(h, 'rovina'));
const isRoadTile = (key) => ROADSET.has(key) && !OCC.has(key);

/* ================= shared assets ================= */
let KIT = null; const CH = {};
const veilBar = $('veil-bar'), veilT = $('veil-t');
function progress(p, t) { veilBar.style.width = Math.round(p * 100) + '%'; if (t) veilT.textContent = t; }
function fetchText(url, part, total) {
  return fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.text(); })
    .then(t => { progress(part / total); return t; });
}
const loader = new THREE.GLTFLoader();
// Le anteprime bloccano fetch() su blob:/data:, che GLTFLoader usa con createImageBitmap.
// Nascondendolo durante la creazione del parser, le texture passano da <img> (consentito).
const parse = (text) => new Promise((res, rej) => {
  const cib = window.createImageBitmap;
  try { window.createImageBitmap = undefined; loader.parse(text, '', res, rej); }
  catch (e) { rej(e); }
  finally { window.createImageBitmap = cib; }
});

function model(name) {
  const src = KIT.getObjectByName(name);
  if (!src) { console.warn('manca', name); return new THREE.Group(); }
  const inner = src.clone(true); // conserva la scala di de-quantizzazione del nodo radice
  const o = new THREE.Group(); o.name = name; o.add(inner);
  o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return o;
}

/* ---- statico unito in un'unica mesh ---- */
const STATIC = [];
function addStatic(name, pos, rotY, scale) {
  const o = model(name); o.position.copy(pos); o.rotation.y = rotY || 0; if (scale) o.scale.setScalar(scale);
  STATIC.push(o); return o;
}
function toFloat(g) {
  const out = new THREE.BufferGeometry();
  ['position', 'normal', 'uv'].forEach(n => {
    const a = g.getAttribute(n); if (!a) return;
    const arr = new Float32Array(a.count * a.itemSize);
    // r128 non de-normalizza in getX: lo facciamo noi per gli attributi quantizzati
    const src = a.isInterleavedBufferAttribute ? a.data.array : a.array;
    const div = !a.normalized ? 1 : src instanceof Int8Array ? 127 : src instanceof Uint8Array ? 255 : src instanceof Int16Array ? 32767 : src instanceof Uint16Array ? 65535 : 1;
    const f = (v) => div === 1 ? v : Math.max(v / div, -1);
    for (let i = 0; i < a.count; i++) { arr[i * a.itemSize] = f(a.getX(i)); if (a.itemSize > 1) arr[i * a.itemSize + 1] = f(a.getY(i)); if (a.itemSize > 2) arr[i * a.itemSize + 2] = f(a.getZ(i)); }
    out.setAttribute(n, new THREE.BufferAttribute(arr, a.itemSize));
  });
  if (g.index) out.setIndex(Array.from(g.index.array)); else { const idx = []; for (let i = 0; i < g.getAttribute('position').count; i++) idx.push(i); out.setIndex(idx); }
  return out;
}
function bakeStatic() {
  const geos = []; let mat = null;
  STATIC.forEach(o => { o.updateMatrixWorld(true); o.traverse(m => { if (!m.isMesh) return; mat = mat || m.material; const g = toFloat(m.geometry); g.applyMatrix4(m.matrixWorld);
    const uv = g.getAttribute('uv'); if (!uv) return;
    const map = m.material.map; if (map) { map.updateMatrix(); const e = map.matrix.elements, a = uv.array; // UV quantizzate: applica la trasformazione della texture
      for (let i = 0; i < a.length; i += 2) { const x = a[i], y = a[i + 1]; a[i] = e[0] * x + e[3] * y + e[6]; a[i + 1] = e[1] * x + e[4] * y + e[7]; } }
    geos.push(g); }); });
  const merged = THREE.BufferGeometryUtils.mergeBufferGeometries(geos, false);
  merged.computeVertexNormals === undefined || (function () { const n = merged.getAttribute('normal'); for (let i = 0; i < n.count; i++) { const x = n.getX(i), y = n.getY(i), z = n.getZ(i), l = Math.hypot(x, y, z) || 1; n.setXYZ(i, x / l, y / l, z / l); } })();
  mat = mat.clone(); if (mat.map) { mat.map = mat.map.clone(); mat.map.offset.set(0, 0); mat.map.repeat.set(1, 1); mat.map.rotation = 0; mat.map.center.set(0, 0); mat.map.needsUpdate = true; }
  const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
  return mesh;
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
  o.userData.get = (k) => mats[0] ? mats[0].userData.u[k].value : 0;
  return o;
}
function fitDissolve(o) { o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); o.userData.set('uY0', b.min.y); o.userData.set('uY1', b.max.y); }

/* ================= tweens ================= */
const TW = [];
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
function tween(id, dur, fn, done) { for (let i = TW.length - 1; i >= 0; i--) if (TW[i].id === id) TW.splice(i, 1); TW.push({ id, dur: reduceMotion ? Math.min(dur, .01) : dur, t: 0, fn, done }); }
function stepTweens(dt) { for (let i = TW.length - 1; i >= 0; i--) { const w = TW[i]; w.t += dt; const k = Math.min(w.t / w.dur, 1); w.fn(ease(k), k); if (k >= 1) { TW.splice(i, 1); w.done && w.done(); } } }
function dissolveIn(o, dur, done) { fitDissolve(o); o.visible = true; o.userData.set('uDir', 1); o.userData.set('uProg', 0); o.traverse(m => { if (m.isMesh) m.castShadow = false; });
  tween('dis' + o.id, dur || 1.6, k => o.userData.set('uProg', k), () => { o.traverse(m => { if (m.isMesh) m.castShadow = true; }); done && done(); }); }
function dissolveOut(o, dur, done) { fitDissolve(o); o.userData.set('uDir', -1); o.userData.set('uProg', 0); o.traverse(m => { if (m.isMesh) m.castShadow = false; });
  tween('dis' + o.id, dur || 1.2, k => o.userData.set('uProg', k), () => { o.visible = false; o.userData.set('uDir', 1); o.userData.set('uProg', 1); done && done(); }); }

/* ================= acqua ================= */
const SHORE = { size: 512, half: 34 };
function shoreTexture() {
  const N = SHORE.size, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  const sc = N / (2 * SHORE.half);
  x.fillStyle = '#000'; x.fillRect(0, 0, N, N); x.fillStyle = '#fff';
  LAND.forEach(k => { const [q, r] = k.split(',').map(Number); const p = W(q, r); x.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = (p.x + Math.cos(a) * 1.18 + SHORE.half) * sc, py = (p.z + Math.sin(a) * 1.18 + SHORE.half) * sc; i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.closePath(); x.fill(); });
  // blur leggero e largo, compatibile con tutti i browser (scala giù e su)
  const out = document.createElement('canvas'); out.width = out.height = N; const o = out.getContext('2d'); o.imageSmoothingEnabled = true;
  const layers = [[N / 4, .5], [N / 16, .35], [N / 64, .3]];
  o.drawImage(c, 0, 0);
  layers.forEach(([s, a]) => { const t = document.createElement('canvas'); t.width = t.height = s; const tx = t.getContext('2d'); tx.imageSmoothingEnabled = true; tx.drawImage(c, 0, 0, s, s); o.globalAlpha = a; o.drawImage(t, 0, 0, N, N); });
  o.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(out); tex.minFilter = THREE.LinearFilter; return tex;
}
let water;
function buildWater() {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, tShore: { value: shoreTexture() }, uHalf: { value: SHORE.half }, uSun: { value: sun.position.clone().normalize() } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime; uniform sampler2D tShore; uniform float uHalf; uniform vec3 uSun; varying vec3 vW;
      float h(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){
        vec2 uv=(vW.xz+uHalf)/(2.*uHalf); float s=0.; if(uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.) s=texture2D(tShore,uv).r;
        float t=uTime;
        float w1=n(vW.xz*.55+vec2(t*.22,t*.13)), w2=n(vW.xz*1.3-vec2(t*.17,-t*.21));
        vec3 deep=vec3(.09,.36,.56), mid=vec3(.15,.55,.68), shal=vec3(.42,.80,.78);
        vec3 col=mix(deep,mid,smoothstep(.0,.35,s)); col=mix(col,shal,smoothstep(.35,.75,s));
        // caustiche e increspature
        float rip=smoothstep(.6,.9,w1*.7+w2*.3); col+=vec3(.05,.08,.08)*rip;
        // bande di schiuma che si allontanano dalla costa
        float band=sin(s*22.-t*1.4+w1*1.2)*.5+.5; float foam=smoothstep(.9,.98,band)*smoothstep(.3,.55,s)*(1.-smoothstep(.8,.92,s));
        float edge=smoothstep(.9,.97,s);
        col=mix(col,vec3(.96,.99,.97),clamp(foam*.65+edge*.9,0.,1.));
        // scintillio del sole
        float sp=pow(n(vW.xz*1.4+t*.35),24.)*.8; col+=sp*vec3(1.,.95,.85)*(1.-s);
        float r=length(vW.xz); float a=1.-smoothstep(26.,46.,r);
        gl_FragColor=vec4(col,a);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`
  });
  water = new THREE.Mesh(new THREE.CircleGeometry(48, 72), m); water.rotation.x = -Math.PI / 2; water.position.y = -0.14; water.renderOrder = -1; water.receiveShadow = false;
  scene.add(water);
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
        float a=m*(.42+crack*.55);
        gl_FragColor=vec4(col,a); }` });
  const g = new THREE.CircleGeometry(3.6, 48); g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m); mesh.position.set(center.x, 0.03, center.z); mesh.renderOrder = 2; scene.add(mesh); return mesh;
}

/* ================= anelli di stato ================= */
function statusRing(pos) {
  const g = new THREE.RingGeometry(1.0, 1.13, 6, 1, Math.PI / 6); g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false });
  const mesh = new THREE.Mesh(g, m); mesh.position.set(pos.x, 0.05, pos.z); mesh.renderOrder = 3; scene.add(mesh); return mesh;
}

/* ================= particelle ================= */
const BURSTS = [];
function burst(pos, color, n, speed, life, size, up) {
  const p = [], v = [], r = rng(Math.floor(Math.random() * 1e9));
  for (let i = 0; i < n; i++) { p.push(pos.x + (r() - .5) * .6, pos.y + r() * .4, pos.z + (r() - .5) * .6);
    const a = r() * 6.28, s = speed * (.4 + r() * .8); v.push(Math.cos(a) * s * .5, (up || 1) * speed * (.8 + r() * .9), Math.sin(a) * s * .5); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('vel', new THREE.Float32BufferAttribute(v, 3));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uLife: { value: life }, uCol: { value: new THREE.Color(color) }, uSize: { value: size }, uZoom: { value: camera.zoom } },
    vertexShader: `attribute vec3 vel; uniform float uT; uniform float uLife; uniform float uSize; uniform float uZoom; varying float vA;
      void main(){ vec3 p=position+vel*uT+vec3(0.,-2.2*uT*uT,0.); vA=1.-uT/uLife; gl_PointSize=uSize*uZoom*8.; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform vec3 uCol; varying float vA; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; float a=smoothstep(.5,.0,d)*clamp(vA,0.,1.); gl_FragColor=vec4(uCol*a*1.4,a); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); BURSTS.push(pts);
}
function stepBursts(dt) { for (let i = BURSTS.length - 1; i >= 0; i--) { const b = BURSTS[i], u = b.material.uniforms; u.uT.value += dt; u.uZoom.value = camera.zoom; if (u.uT.value > u.uLife.value) { scene.remove(b); b.geometry.dispose(); b.material.dispose(); BURSTS.splice(i, 1); } } }

/* ================= costruzione del mondo ================= */
const D = {}; // oggetti dinamici
let fan = null, wheel = null; const flags = [], clouds = [], walkers = [];
const LBL = {}; const PICK = [];
function hexPos(h) { return W(h[0], h[1]); }

function buildWorld() {
  // tessere
  LAND.forEach(k => {
    const [q, r] = k.split(',').map(Number); const p = W(q, r);
    const water = []; for (let d = 0; d < 6; d++) if (!isLand(q + DIRS[d][0], r + DIRS[d][1])) water.push(d);
    if (isRoadTile(k)) { const need = [...ROADSET.get(k)]; const m = matchSet(ROADS, need); if (m) { addStatic('hex_road_' + m.name, p, m.rot); return; } }
    if (water.length && !OCC.has(k) && !ROADSET.has(k)) { const m = matchSet(COAST, water); if (m) { addStatic('hex_coast_' + m.name + '_waterless', p, m.rot); return; } }
    addStatic('hex_grass', p, 0);
  });

  // natura e borgo
  const free = [];
  LAND.forEach(k => { if (!OCC.has(k) && !ROADSET.has(k)) free.push(k.split(',').map(Number)); });
  const used = new Set();
  const put = (h, name, rot, sc, off) => { const p = W(h[0], h[1]); if (off) p.add(off); addStatic(name, p, rot == null ? Math.floor(R() * 6) * Math.PI / 3 : rot, sc); used.add(K(...h)); };
  free.forEach(h => {
    const [q, r] = h; const k = K(q, r); if (used.has(k)) return;
    const dist = hdist(q, r); const p = W(q, r);
    const coastal = DIRS.some(([dq, dr]) => !isLand(q + dq, r + dr));
    const ang = Math.atan2(p.z, p.x) * 180 / Math.PI;
    if (!coastal && dist >= 3 && ang < -40 && ang > -150) { put(h, ['mountain_A_grass_trees', 'mountain_B_grass_trees', 'mountain_C_grass_trees'][Math.floor(R() * 3)]); return; }
    if (dist >= 3 && ang > -40 && ang < 70) { put(h, ['trees_A_large', 'trees_B_large', 'trees_A_medium', 'trees_B_medium', 'hills_A_trees'][Math.floor(R() * 5)]); return; }
    if (coastal) { const rr = R(); if (rr < .35) put(h, ['rock_single_A', 'rock_single_B', 'rock_single_C', 'rock_single_D'][Math.floor(R() * 4)], null, 1, new THREE.Vector3((R() - .5) * .8, 0, (R() - .5) * .8));
      else if (rr < .6) put(h, ['trees_A_small', 'trees_B_small', 'tree_single_A', 'tree_single_B'][Math.floor(R() * 4)]); else used.add(k); return; }
    const rr = R();
    if (rr < .34) put(h, R() < .5 ? 'building_home_A_blue' : 'building_home_B_blue');
    else if (rr < .5) put(h, 'building_grain');
    else if (rr < .7) put(h, ['trees_A_small', 'trees_B_small', 'tree_single_A', 'tree_single_B'][Math.floor(R() * 4)]);
    else if (rr < .8) put(h, 'hill_single_' + 'ABC'[Math.floor(R() * 3)]);
    else used.add(k);
  });
  // dettagli sui bordi delle strade
  [[1, -1, 'barrel', .35], [-1, 0, 'crate_A_big', .3], [0, 1, 'sack', .3], [1, 0, 'wheelbarrow', .3]].forEach(([q, r, n, o]) => { const p = W(q, r); addStatic(n, p.add(new THREE.Vector3(o, 0, -o)), R() * 6, 1); });
  // ninfee e piante vicino alla costa
  for (let i = 0; i < 10; i++) { const a = R() * 6.28, d = 11 + R() * 3; addStatic(['waterlily_A', 'waterlily_B', 'waterplant_A', 'waterplant_B'][i % 4], new THREE.Vector3(Math.cos(a) * d, -0.14, Math.sin(a) * d), R() * 6); }

  bakeStatic();

  // quartieri degli agenti
  ORDER.forEach(k => {
    const a = AG[k]; const p = hexPos(a.hex); const o = makeDynamic(a.model);
    o.position.copy(p); o.rotation.y = Math.atan2(-p.x, -p.z) + Math.PI; // ingresso verso il castello
    if (k === 'sire') o.rotation.y = 0;
    scene.add(o); a.obj = o; a.pos = p;
    o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); a.top = b.max.y;
    a.ring = statusRing(p);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, a.top, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(p.x, a.top / 2, p.z); hit.userData.key = k; scene.add(hit); PICK.push(hit);
  });
  fan = AG.jarvis.obj.getObjectByName('building_windmill_top_fan_blue');
  // bandiera rossa per chi è bloccato o ha fatture scadute
  D.flagOut = model('flag_red'); scene.add(D.flagOut);
  D.flagFat = model('flag_red'); scene.add(D.flagFat);
  placeFlag(D.flagOut, AG.outreach); placeFlag(D.flagFat, AG.fatture);
  D.corr = corruption(AG.outreach.pos);

  // udienze: tende
  D.tents = [];
  const up = hexPos(UDIENZE_HEX); [[-.45, -.35], [.5, -.2], [0, .5]].forEach(([x, z], i) => { const t = makeDynamic('tent'); t.position.set(up.x + x, 0, up.z + z); t.rotation.y = i * 1.3; t.scale.setScalar(.85); t.visible = i < S.udienze; scene.add(t); D.tents.push(t); });
  addLabelObj('udienze', 'Approvazioni', up, 1.2, null, 'small');
  const hu = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 6), new THREE.MeshBasicMaterial({ visible: false })); hu.position.set(up.x, .6, up.z); hu.userData.key = 'udienze'; scene.add(hu); PICK.push(hu);

  // cantiere dell'impossibile: stadi
  const cp = hexPos(CANTIERE_HEX); D.stages = {};
  ['building_stage_A', 'building_stage_B', 'building_stage_C', 'building_tower_B_blue'].forEach(n => { const o = makeDynamic(n); o.position.copy(cp); o.visible = false; scene.add(o); D.stages[n] = o; });
  D.scaff = model('building_scaffolding'); D.scaff.position.copy(cp).add(new THREE.Vector3(.55, 0, .45)); D.scaff.scale.setScalar(.55); scene.add(D.scaff);
  D.crate = model('resource_stone'); D.crate.position.copy(cp).add(new THREE.Vector3(-.6, 0, .3)); D.crate.scale.setScalar(.8); scene.add(D.crate);
  D.stageNow = stageFor(S.imp.n); D.stages[D.stageNow].visible = true;
  addLabelObj('cantiere', 'Cantiere', cp, 2.0, 3);
  const hc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2, 6), new THREE.MeshBasicMaterial({ visible: false })); hc.position.set(cp.x, 1, cp.z); hc.userData.key = 'cantiere'; scene.add(hc); PICK.push(hc);

  // rovine = idee da costruire
  D.lots = ROVINE_HEX.map((h, i) => { const p = hexPos(h); const ru = makeDynamic('building_destroyed', 0xff8a3a); ru.position.copy(p); ru.rotation.y = i * 2.1; scene.add(ru);
    const ho = makeDynamic(i % 2 ? 'building_home_A_blue' : 'building_home_B_blue'); ho.position.copy(p); ho.rotation.y = Math.PI / 3 * i; ho.visible = false; scene.add(ho);
    const hh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshBasicMaterial({ visible: false })); hh.position.set(p.x, .5, p.z); hh.userData.key = 'rovine'; scene.add(hh); PICK.push(hh);
    return { ru, ho, done: false }; });
  const rc = hexPos(ROVINE_HEX[2]); addLabelObj('rovine', 'Idee da costruire', rc, 1.1, null, 'small');

  // mulino ad acqua sulla costa (vita)
  const wm = model('building_watermill_blue'); const wp = W(-4, 3); wm.position.copy(wp); wm.rotation.y = -Math.PI / 3; scene.add(wm); wheel = wm.getObjectByName('building_watermill_wheel_blue');

  // nuvole
  ['cloud_big', 'cloud_small', 'cloud_big', 'cloud_small'].forEach((n, i) => { const c = model(n); c.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = .8; m.castShadow = true; m.receiveShadow = false; } });
    c.scale.setScalar(1.2 + R() * .7); c.userData.a = i * Math.PI / 2 + R(); c.userData.r = 19 + R() * 4; c.position.y = 2.5 + R() * 1.5; c.userData.v = .5 + R() * .4; scene.add(c); clouds.push(c); });

  // etichette dei quartieri
  ORDER.forEach(k => addLabelAgent(k));
}
function placeFlag(f, a) { f.position.copy(a.pos).add(new THREE.Vector3(.72, 0, .5)); f.scale.setScalar(1.1); flags.push(f); }
function stageFor(n) { return n >= S.imp.tot ? 'building_tower_B_blue' : n >= 6 ? 'building_stage_C' : n >= 3 ? 'building_stage_B' : 'building_stage_A'; }

/* ================= personaggi ================= */
function addWalkers(gltfs) {
  gltfs.forEach((g, idx) => {
    const o = THREE.SkeletonUtils.clone(g.scene);
    const b = new THREE.Box3().setFromObject(o); const s = .62 / (b.max.y - b.min.y); o.scale.setScalar(s);
    o.traverse(m => { if (m.isMesh || m.isSkinnedMesh) { m.castShadow = true; m.frustumCulled = false; } });
    // niente armi in mano
    o.traverse(m => { if (/sword|shield|staff|wand|book|axe|dagger|crossbow/i.test(m.name)) m.visible = false; });
    scene.add(o);
    const mixer = new THREE.AnimationMixer(o);
    const clip = (n) => mixer.clipAction(THREE.AnimationClip.findByName(g.animations, n));
    const walk = clip('Walking_A'), idle = clip('Idle'), cheer = clip('Cheer');
    walk.play();
    const wk = { o, mixer, walk, idle, cheer, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, len: 1, wait: idx * 2.5, dir: (idx * 3 + 1) % 6, out: true };
    newLeg(wk); walkers.push(wk);
  });
}
function spokePoint(d, f) { const v = W(DIRS[d][0], DIRS[d][1]); return v.multiplyScalar(f); }
function newLeg(w) {
  if (w.out) { w.from.copy(spokePoint(w.dir, .62)); w.to.copy(spokePoint(w.dir, 1.5)); }
  else { w.from.copy(spokePoint(w.dir, 1.5)); w.to.copy(spokePoint(w.dir, .62)); }
  const side = new THREE.Vector3(-(w.to.z - w.from.z), 0, w.to.x - w.from.x).normalize().multiplyScalar(.18);
  w.from.add(side); w.to.add(side);
  w.len = w.from.distanceTo(w.to); w.t = 0; w.o.position.copy(w.from);
  w.o.rotation.y = Math.atan2(w.to.x - w.from.x, w.to.z - w.from.z);
}
function stepWalkers(dt) {
  walkers.forEach(w => {
    w.mixer.update(dt);
    if (w.wait > 0) { w.wait -= dt; if (w.wait <= 0) { w.idle.fadeOut(.3); w.walk.reset().fadeIn(.3).play(); newLeg(w); } return; }
    w.t += dt * .55 / w.len; w.o.position.lerpVectors(w.from, w.to, Math.min(w.t, 1));
    if (w.t >= 1) { w.walk.fadeOut(.3); w.idle.reset().fadeIn(.3).play(); w.wait = 1.5 + Math.random() * 2;
      if (!w.out) w.dir = (w.dir + 1 + Math.floor(Math.random() * 4)) % 6; w.out = !w.out; }
  });
}

/* ================= camera isometrica ================= */
const VIEWS = ['Nord', 'Est', 'Sud', 'Ovest'];
const cam = { yaw: Math.PI / 4, view: 0, pitch: 0.6155, tx: 0, tz: 0.6, zoom: innerWidth < innerHeight ? 1.6 : 1.25, half: 11 };
const HOME_ZOOM = cam.zoom;
function frame() {
  const w = innerWidth, h = innerHeight, asp = w / h;
  const halfW = asp < 1 ? 12.5 : 13.5 * Math.min(asp, 1.6) / 1.6 * 1.6 / asp * asp; // larghezza utile
  let hw, hh; if (asp < 1) { hw = 12.2; hh = hw / asp; } else { hh = 11; hw = hh * asp; }
  camera.left = -hw; camera.right = hw; camera.top = hh; camera.bottom = -hh; camera.updateProjectionMatrix(); cam.hw = hw; cam.hh = hh;
}
function placeCam() {
  const c = Math.cos(cam.pitch), s = Math.sin(cam.pitch), d = 60;
  camera.position.set(cam.tx + Math.sin(cam.yaw) * c * d, s * d, cam.tz + Math.cos(cam.yaw) * c * d);
  camera.lookAt(cam.tx, 0, cam.tz); camera.zoom = cam.zoom; camera.updateProjectionMatrix();
}
function rotate(step) {
  cam.view = (cam.view + step + 4) % 4; const from = cam.yaw, to = from - step * Math.PI / 2;
  tween('yaw', .65, k => { cam.yaw = from + (to - from) * k; });
  $('needle').style.transform = `rotate(${cam.view * 90}deg)`; $('dir-lbl').textContent = VIEWS[cam.view];
  announce('Vista ' + VIEWS[cam.view]);
}
function zoomBy(f) { const z0 = cam.zoom, z1 = Math.min(3.2, Math.max(.75, cam.zoom * f)); tween('zoom', .3, k => { cam.zoom = z0 + (z1 - z0) * k; }); }
function goTo(pos, z) { const x0 = cam.tx, z0 = cam.tz, zz0 = cam.zoom, zz1 = z || Math.max(cam.zoom, 1.7);
  tween('pan', .9, k => { cam.tx = x0 + (pos.x - x0) * k; cam.tz = z0 + (pos.z - z0) * k; cam.zoom = zz0 + (zz1 - zz0) * k; }); }
function clampCam() { const r = Math.hypot(cam.tx, cam.tz); if (r > 12) { cam.tx *= 12 / r; cam.tz *= 12 / r; } }
function panPixels(dx, dy) {
  const wpp = (2 * cam.hw / cam.zoom) / innerWidth, hpp = (2 * cam.hh / cam.zoom) / innerHeight / Math.sin(cam.pitch);
  const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw), fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
  cam.tx += -rx * dx * wpp + fx * dy * hpp; cam.tz += -rz * dx * wpp + fz * dy * hpp; clampCam();
}

/* input */
const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, moved = 0, downAt = null;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; downAt = { x: e.clientX, y: e.clientY };
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = cam.zoom; } });
canvas.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy);
  if (ptrs.size === 1) panPixels(dx, dy); p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) cam.zoom = Math.min(3.2, Math.max(.75, zoom0 * d / pinch0)); } });
['pointerup', 'pointercancel'].forEach(t => canvas.addEventListener(t, e => { const was = ptrs.size; ptrs.delete(e.pointerId); pinch0 = 0; if (t === 'pointerup' && was === 1 && moved < 8 && downAt) pick(e.clientX, e.clientY); }));
canvas.addEventListener('wheel', e => { e.preventDefault(); cam.zoom = Math.min(3.2, Math.max(.75, cam.zoom * (1 - e.deltaY * .0012))); }, { passive: false });
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const k = e.key;
  if (k === 'q' || k === 'Q') rotate(-1); else if (k === 'e' || k === 'E') rotate(1);
  else if (k === '+' || k === '=') zoomBy(1.25); else if (k === '-' || k === '_') zoomBy(.8);
  else if (k === 'ArrowLeft') panPixels(60, 0); else if (k === 'ArrowRight') panPixels(-60, 0);
  else if (k === 'ArrowUp') panPixels(0, 60); else if (k === 'ArrowDown') panPixels(0, -60);
  else if (k === 'Escape') setSheet(null); else return;
  if (k.startsWith('Arrow')) e.preventDefault();
});
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(x, y) { ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(PICK, false)[0]; if (hit) openPlace(hit.object.userData.key); }

/* ================= etichette ================= */
const lblLayer = $('labels');
function addLabelAgent(k) { const a = AG[k]; addLabelObj(k, a.nome, a.pos, a.top + .25, a.liv, '', true); }
function addLabelObj(key, text, pos, y, lv, cls, withState) {
  const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl ' + (cls || '');
  el.innerHTML = (lv ? `<span class="sh">${lv}</span>` : '') + `<span>${text}</span>` + (withState ? `<span class="st" id="st-${key}"></span>` : '');
  el.addEventListener('click', () => openPlace(key)); lblLayer.appendChild(el);
  LBL[key] = { el, p: new THREE.Vector3(pos.x, y, pos.z) };
}
const vt = new THREE.Vector3();
const LORDER = () => Object.keys(LBL).sort((a, b) => (AG[b] ? 1 : 0) - (AG[a] ? 1 : 0)); // agenti prima, poi luoghi minori
function updateLabels() { const w = innerWidth, h = innerHeight, placed = [];
  for (const k of LORDER()) { const L = LBL[k]; vt.copy(L.p).project(camera); const off = vt.x < -1.1 || vt.x > 1.1 || vt.y < -1.1 || vt.y > 1.1;
    if (off) { L.el.hidden = true; continue; }
    if (!L.w) { L.el.hidden = false; L.w = L.el.offsetWidth || 120; L.h = L.el.offsetHeight || 30; }
    let x = (vt.x * .5 + .5) * w, y = (-vt.y * .5 + .5) * h, ok = false;
    for (let tries = 0; tries < 2 && !ok; tries++) { // se si sovrappone, sale di una riga; altrimenti si nasconde
      const r = { l: x - L.w / 2, r: x + L.w / 2, t: y - L.h, b: y };
      ok = !placed.some(p => r.l < p.r && r.r > p.l && r.t < p.b && r.b > p.t);
      if (ok) placed.push(r); else y -= L.h + 3; }
    L.el.hidden = !ok; if (!ok) continue;
    L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`; } }

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
  $('tesoro').textContent = '€ ' + S.tesoro.toLocaleString('it-IT'); $('goal').style.width = Math.min(100, S.tesoro / S.obiettivo * 100) + '%';
  $('regole').textContent = S.regole; $('n-prev').textContent = S.preventivi; $('n-udi').textContent = S.udienze; $('n-scad').textContent = S.scadute; $('n-idee').textContent = S.idee;
  $('c-scad').classList.toggle('alert', S.scadute > 0);
  const blocked = ORDER.map(k => AG[k]).find(a => a.stato === 'bloccato' && a.blocco);
  $('mission-t').innerHTML = blocked ? `(<em>0</em>/1) ${esc(blocked.blocco.cosa)}` : S.udienze ? `(<em>0</em>/${S.udienze}) Rispondi alle approvazioni in attesa` : 'Tutto in ordine nel regno';
  D.missionKey = blocked ? ORDER.find(k => AG[k] === blocked) : S.udienze ? 'udienze' : 'sire';
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function flash(id) { const e = $(id); if (!e) return; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); }
const now = () => new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
function ticker(fresh) { const t = $('ticker'); t.innerHTML = ''; NEWS.slice(-2).reverse().forEach((n, i) => { const d = document.createElement('div'); if (fresh && i === 0) d.className = 'new';
  const tm = document.createElement('time'); tm.textContent = n[0]; d.appendChild(tm); d.appendChild(document.createTextNode(n[1] + ' [PROVA]')); t.appendChild(d); }); }
function news(txt) { NEWS.push([now(), txt]); ticker(true); }
let announceT = 0; function announce(t) { clearTimeout(announceT); const el = $('ticker'); el.setAttribute('aria-label', t); announceT = setTimeout(() => el.removeAttribute('aria-label'), 1500); }

/* ================= pannelli ================= */
const sheet = $('sheet'); let openSheet = null;
function setSheet(name, html, btn) {
  ['n-list', 'n-ev', 'n-info'].forEach(id => $(id).setAttribute('aria-pressed', 'false'));
  if (!name || openSheet === name) { sheet.hidden = true; openSheet = null; syncPad(); return; }
  openSheet = name; sheet.innerHTML = html; sheet.hidden = false; if (btn) $(btn).setAttribute('aria-pressed', 'true');
  syncPad();
}
function syncPad() { $('pad').hidden = !sheet.hidden && innerWidth < 760; }
function kpiHtml(o) { return `<div class="kpis">${Object.entries(o).map(([k, v]) => `<div class="kpi"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div>`; }
function openPlace(key) {
  if (AG[key]) { const a = AG[key], st = STATI[a.stato]; goTo(a.pos);
    setSheet('p-' + key, `<div class="row"><h2>${esc(a.nome)} · livello ${a.liv}</h2><span class="st ${a.stato}">${st.t}</span></div><p>${esc(a.ruolo)}</p>${kpiHtml(a.kpi)}` +
      (a.stato === 'bloccato' && a.blocco ? `<div class="todo"><b>Serve da te:</b> ${esc(a.blocco.cosa)}.<br>Come: ${esc(a.blocco.come)}.</div>` : '') +
      `<p><small>Dati [PROVA]. Fonte vera: <code>reports/${key}.json</code></small></p>`); return; }
  if (key === 'cantiere') { goTo(hexPos(CANTIERE_HEX)); setSheet('p-c', `<h2>Cantiere dell'impossibile</h2><p>Il progetto più grande dell'anno. Ogni traguardo raggiunto fa avanzare la costruzione: <b>${S.imp.n} su ${S.imp.tot}</b>.</p><p><small>Fonte vera: evento <code>traguardo</code>.</small></p>`); return; }
  if (key === 'rovine') { goTo(hexPos(ROVINE_HEX[2])); setSheet('p-r', `<h2>Idee da costruire</h2><p>Ogni rudere è un'idea del regno non ancora realizzata: <b>${S.idee}</b> in tutto. Quando un'idea è fatta, il rudere diventa una casa.</p><p><small>Fonte vera: <code>claude/regno-idee.md</code>.</small></p>`); return; }
  if (key === 'udienze') { goTo(hexPos(UDIENZE_HEX)); setSheet('p-u', `<h2>Approvazioni in attesa</h2><p>Una tenda per ogni richiesta che aspetta la tua risposta su Telegram: <b>${S.udienze}</b>.</p><p><small>Fonte vera: <code>regno.json.udienze</code>.</small></p>`); return; }
  if (key === 'sire') return openPlace('sire');
}
$('mission').onclick = () => openPlace(D.missionKey || 'sire');
$('n-list').onclick = () => {
  const items = ORDER.map(k => { const a = AG[k], st = STATI[a.stato]; const sub = a.stato === 'bloccato' && a.blocco ? a.blocco.cosa : a.ruolo;
    return `<li><button data-open="${k}"><span class="st ${a.stato}">${st.t}</span><span class="nm"><b>${esc(a.nome)}</b><small>${esc(sub)}</small></span></button></li>`; }).join('') +
    `<li><button data-open="udienze"><span class="st ${S.udienze ? 'bloccato' : 'lavora'}">${S.udienze}</span><span class="nm"><b>Approvazioni</b><small>Richieste in attesa di risposta</small></span></button></li>` +
    `<li><button data-open="cantiere"><span class="st cantiere">${S.imp.n}/${S.imp.tot}</span><span class="nm"><b>Cantiere dell'impossibile</b><small>Traguardi raggiunti</small></span></button></li>` +
    `<li><button data-open="rovine"><span class="st riposo">${S.idee}</span><span class="nm"><b>Idee da costruire</b><small>Una rovina per ogni idea</small></span></button></li>`;
  setSheet('list', `<h2>Il regno in breve</h2><ul class="list">${items}</ul>`, 'n-list');
};
$('n-ev').onclick = () => setSheet('ev', `<h2>Eventi demo</h2><div class="grid">
  <button class="act" data-ev="block">${AG.outreach.stato === 'bloccato' ? 'Approva Outreach' : 'Blocca Outreach'}<small>Terreno corrotto e bandiera</small></button>
  <button class="act" data-ev="imp">Traguardo raggiunto<small>Cantiere ${S.imp.n}/${S.imp.tot}</small></button>
  <button class="act" data-ev="idea">Idea costruita<small>Il rudere diventa casa</small></button>
  <button class="act" data-ev="incasso">Incasso +€ 1.000<small>Oro dalla miniera</small></button>
  <button class="act" data-ev="regole">10 regole nuove<small>Luce sul Cervello</small></button>
  <button class="act" data-ev="udienza">Nuova approvazione<small>Arriva una tenda</small></button>
  <button class="act" data-ev="pagata">Fattura pagata<small>Via la bandiera rossa</small></button>
  <button class="act" data-ev="jarvis">${AG.jarvis.stato === 'riposo' ? 'Sveglia Jarvis' : 'Metti Jarvis a riposo'}<small>Il mulino si ferma</small></button></div>`, 'n-ev');
$('n-info').onclick = () => setSheet('info', `<h2>Come leggere il regno</h2>
  <div class="legend"><span class="st lavora">Al lavoro</span><span>l'agente sta lavorando</span><span class="st bloccato">Serve te</span><span>bandiera rossa e terreno incrinato: c'è un passo da fare</span>
  <span class="st cantiere">In costruzione</span><span>lavori in corso</span><span class="st riposo">A riposo</span><span>edificio spento</span></div>
  <p>Ogni edificio intorno al castello è un agente. Le <b>tende</b> sono approvazioni in attesa, le <b>rovine</b> sono idee da costruire, il <b>mulino</b> gira quando Jarvis è attivo, la <b>barra d'oro</b> in alto è il tesoro del mese rispetto all'obiettivo.</p>
  <p><b>Comandi:</b> trascina per spostarti, pizzica o usa + e − per lo zoom, i pulsanti con le frecce curve ruotano la vista (tasti Q ed E). Tutto è anche nell'<b>Elenco</b>.</p>
  <p id="fps-line">Misuro i fotogrammi…</p><p><small>Modelli KayKit di Kay Lousberg (CC0). Dati [PROVA].</small></p>`, 'n-info');
$('n-q').onclick = () => { S.quality = S.quality === 'alta' ? 'bassa' : 'alta'; $('q-lbl').textContent = S.quality === 'alta' ? 'Alta' : 'Bassa'; $('q-bar').style.opacity = S.quality === 'alta' ? 1 : .25; applyQuality(); };
$('rot-l').onclick = () => rotate(-1); $('rot-r').onclick = () => rotate(1);
$('zoom-in').onclick = () => zoomBy(1.3); $('zoom-out').onclick = () => zoomBy(1 / 1.3);
$('compass').onclick = () => { if (cam.view) rotate(-cam.view); goTo(new THREE.Vector3(0, 0, .6), HOME_ZOOM); };
document.addEventListener('click', e => { const o = e.target.closest('[data-open]'); if (o) { openPlace(o.dataset.open); }
  const ev = e.target.closest('[data-ev]'); if (ev) { setSheet(null); EV[ev.dataset.ev](); } });

/* ================= eventi demo ================= */
const EV = {
  block() { const a = AG.outreach; goTo(a.pos);
    if (a.stato === 'bloccato') { a.stato = 'lavora'; S.udienze = Math.max(0, S.udienze - 1); hideTent();
      tween('heal', 2.2, k => D.corr.material.uniforms.uHeal.value = k * 4.2, () => { D.corr.visible = false; D.corr.material.uniforms.uHeal.value = 0; });
      burst(a.pos.clone().setY(1.5), 0xffd27a, 50, 2.6, 1.6, 1.4); news('Outreach · approvazione data, riparte'); }
    else { a.stato = 'bloccato'; D.corr.visible = true; D.corr.material.uniforms.uHeal.value = 0; tween('corr', 1.2, k => D.corr.material.uniforms.uAmt.value = k); news('Outreach · fermo, serve la tua approvazione'); }
    applyStates(); },
  imp() { const cp = hexPos(CANTIERE_HEX); goTo(cp);
    if (S.imp.n >= S.imp.tot) S.imp.n = 0;
    S.imp.n++; const next = stageFor(S.imp.n); burst(cp.clone().setY(1), 0xe8c28a, 40, 1.8, 1.4, 1.2);
    if (next !== D.stageNow) { const old = D.stages[D.stageNow]; D.stageNow = next; dissolveOut(old, .9, () => dissolveIn(D.stages[next], 1.6)); }
    D.scaff.visible = S.imp.n < S.imp.tot;
    if (S.imp.n === S.imp.tot) { burst(cp.clone().setY(2.5), 0xffd27a, 90, 3.2, 2, 1.6); news("Cantiere dell'impossibile · completato!"); }
    else news(`Cantiere dell'impossibile · traguardo ${S.imp.n}/${S.imp.tot}`); },
  idea() { const lot = D.lots.find(l => !l.done); if (!lot) { news('Tutte le rovine visibili sono costruite'); return; } lot.done = true; goTo(lot.ru.position);
    dissolveOut(lot.ru, 1.1, () => { dissolveIn(lot.ho, 1.8); burst(lot.ho.position.clone().setY(.6), 0xffd27a, 40, 2, 1.4, 1.2); });
    S.idee--; renderHud(); flash('c-idee'); news('Idea costruita · un rudere diventa casa'); },
  incasso() { const a = AG.fatture; goTo(a.pos); S.tesoro += 1000; renderHud(); flash('c-prev'); burst(a.pos.clone().setY(1.2), 0xffc93a, 70, 3, 1.8, 1.3); news('Fatture · incasso di € 1.000'); },
  regole() { const a = AG.cervello; goTo(a.pos); S.regole += 10; a.kpi['Regole'] = String(S.regole); renderHud();
    burst(a.pos.clone().setY(a.top), 0x9fe8ff, 80, 2.4, 2.2, 1.3);
    a.obj.userData.mats.forEach(m => { m.emissive = new THREE.Color(0x4a3a10); }); tween('glow', 2.5, k => a.obj.userData.mats.forEach(m => m.emissive.setScalar(.3 * (1 - k))));
    news('Cervello · salvate 10 regole nuove'); },
  udienza() { goTo(hexPos(UDIENZE_HEX)); if (S.udienze >= 3) { news('Già 3 approvazioni in attesa'); return; } const t = D.tents[S.udienze]; S.udienze++; dissolveIn(t, 1.2); renderHud(); flash('c-udi'); news('Nuova richiesta di approvazione'); },
  pagata() { const a = AG.fatture; goTo(a.pos); if (!S.scadute) { news('Nessuna fattura scaduta'); return; } S.scadute = 0; S.tesoro += 2400; a.kpi['Scadute'] = '0';
    burst(a.pos.clone().setY(1.2), 0xffc93a, 60, 2.6, 1.6, 1.3); applyStates(); news('Fatture · la fattura #118 è stata pagata'); },
  jarvis() { const a = AG.jarvis; goTo(a.pos); a.stato = a.stato === 'riposo' ? 'lavora' : 'riposo'; applyStates(); news(a.stato === 'riposo' ? 'Jarvis · a riposo' : 'Jarvis · di nuovo al lavoro'); },
};
function hideTent() { const t = D.tents[S.udienze]; if (t && t.visible) dissolveOut(t, 1); renderHud(); }

/* ================= qualità e ciclo ================= */
function applyQuality() {
  const dpr = devicePixelRatio || 1, alta = S.quality === 'alta';
  renderer.setPixelRatio(alta ? Math.min(dpr, isMobile ? 1.75 : 2) : 1);
  const ms = alta ? (isMobile ? 1536 : 2048) : 1024;
  if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  renderer.shadowMap.type = alta ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; renderer.shadowMap.needsUpdate = true;
  walkers.forEach(w => w.o.visible = alta);
  resize();
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); frame(); }
addEventListener('resize', resize);
let last = performance.now(), frames = 0, acc = 0, time = 0;
function loop(t) {
  const dt = Math.min((t - last) / 1000, .1); last = t; time += dt;
  stepTweens(dt); placeCam(); stepBursts(dt);
  if (water) water.material.uniforms.uTime.value = time;
  if (D.corr) D.corr.material.uniforms.uTime.value = time;
  if (fan && AG.jarvis.stato !== 'riposo') fan.rotation.z += dt * 1.6;
  if (wheel) wheel.rotation.x -= dt * .9;
  flags.forEach((f, i) => f.rotation.y = Math.sin(time * 1.7 + i) * .12);
  clouds.forEach(c => { c.userData.a += dt * c.userData.v * .02; c.position.x = Math.cos(c.userData.a) * c.userData.r; c.position.z = Math.sin(c.userData.a) * c.userData.r; });
  ORDER.forEach(k => { const a = AG[k]; if (a.stato === 'bloccato') a.ring.material.opacity = .55 + .45 * Math.sin(time * 4); else a.ring.material.opacity = .9; });
  if (S.quality === 'alta') stepWalkers(dt);
  renderer.render(scene, camera); updateLabels();
  frames++; acc += dt; if (acc >= 1) { const f = $('fps-line'); if (f) f.textContent = `Qualità ${S.quality}: ${Math.round(frames / acc)} fotogrammi al secondo.`; frames = 0; acc = 0; }
  requestAnimationFrame(loop);
}

/* ================= avvio ================= */
progress(.05, 'Carico le tessere…');
Promise.all([fetchText('assets/kit.json', 1, 3).then(parse), fetchText('assets/knight.json', 2, 3).then(parse).catch(() => null), fetchText('assets/mage.json', 3, 3).then(parse).catch(() => null)])
  .then(([kit, kn, mg]) => {
    KIT = kit.scene; progress(1, 'Costruisco l\'isola…');
    buildWater(); buildWorld();
    addWalkers([kn, mg].filter(Boolean));
    applyQuality(); applyStates(); ticker(false);
    $('needle').style.transform = 'rotate(0deg)';
    $('veil').hidden = true; requestAnimationFrame(loop);
  })
  .catch(err => { console.error(err); fail('Non riesco a caricare il regno. Ricarica la pagina. (' + (err && err.message ? err.message : err) + ')'); });
window.__regno = { cam, rotate, goTo, EV, AG, S };
})();
