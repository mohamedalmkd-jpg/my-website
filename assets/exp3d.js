/*
 * VONUMO – scrollgesteuerte 3D-Erfahrung
 * Silber-Eis und Gold. Ein Monogramm aus Blöcken baut sich auf, zerfällt, wird zu Ringen,
 * Kristallen und Partikeln – gesteuert vom Scrollen. Dazu: Loader, HUD, Scramble-Text,
 * flüssiger Blob im Opening und optionaler Klang.
 */
import * as THREE from './vendor/three.module.min.js';

const doc = document, win = window;
const reduce = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = win.matchMedia && win.matchMedia('(hover: none), (pointer: coarse)').matches;
const ios = /iP(hone|ad|od)/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const lite = coarse || ios || (navigator.deviceMemory && navigator.deviceMemory <= 4);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const ease = (t) => 1 - Math.pow(1 - t, 3);

/* ---------- Scramble-Text ---------- */
const GLYPHS = '!<>-_\\/[]{}=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export function scramble(el, text, dur) {
  if (!el) return;
  if (reduce) { el.textContent = text; return; }
  const from = el.textContent || '';
  const len = Math.max(from.length, text.length);
  const q = [];
  for (let i = 0; i < len; i++) {
    const s = Math.floor(Math.random() * 18), e = s + 8 + Math.floor(Math.random() * 22);
    q.push({ from: from[i] || '', to: text[i] || '', s, e });
  }
  const total = dur || 40;
  let f = 0;
  if (el._scr) cancelAnimationFrame(el._scr);
  const step = () => {
    let out = '', done = 0;
    for (let i = 0; i < len; i++) {
      const it = q[i];
      if (f >= it.e * (total / 40)) { done++; out += it.to; }
      else if (f >= it.s * (total / 40)) out += it.to === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      else out += it.from;
    }
    el.textContent = out;
    f++;
    if (done < len) el._scr = requestAnimationFrame(step); else el._scr = 0;
  };
  step();
}

/* ---------- DOM-Gerüst: Wortmarke, Canvas, Loader, HUD ---------- */
function el(tag, cls, html) { const e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

function buildDom() {
  const host = doc.body;
  const wm = el('div', 'x-wm', '<div class="x-wm-in"><span class="x-wm-word">VONUMO</span><span class="x-wm-script">digital</span><span class="x-wm-cap">DER GOLDSTANDARD FÜR WEBSITES, 3D UND KI</span></div>');
  wm.setAttribute('aria-hidden', 'true');
  const cv = el('canvas', 'x-gl'); cv.setAttribute('aria-hidden', 'true');
  const blob = el('canvas', 'x-blob'); blob.setAttribute('aria-hidden', 'true');
  const labels = el('div', 'x-labels'); labels.setAttribute('aria-hidden', 'true');
  host.appendChild(wm); host.appendChild(cv); host.appendChild(blob); host.appendChild(labels);

  const hud = el('div', 'x-hud');
  hud.innerHTML =
    '<div class="x-hud-tr"><span class="x-mission"></span></div>' +
    '<div class="x-hud-bl"><span class="x-scroll">Scrollen zum Entdecken</span><button type="button" class="x-sound" aria-pressed="false"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path class="x-snd-on" d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/><path class="x-snd-off" d="M17 9l5 6M22 9l-5 6"/></svg><span>Sound: Aus</span></button></div>' +
    '<div class="x-hud-br"><span class="x-chap-n">00</span><span class="x-chap-t">OPENING</span><span class="x-chap-p">000%</span></div>';
  doc.body.appendChild(hud);

  let loader = null;
  const seen = (() => { try { return sessionStorage.getItem('vonumo-x') === '1'; } catch (e) { return false; } })();
  if (!seen && !reduce) {
    loader = el('div', 'x-loader', '<span class="x-ld-code">=--==++==-</span><span class="x-ld-word"></span><span class="x-ld-pct">000</span><span class="x-ld-bar"><i></i></span>');
    doc.body.appendChild(loader);
    try { sessionStorage.setItem('vonumo-x', '1'); } catch (e) {}
  }
  return { wm, cv, blob, labels, hud, loader };
}

/* ---------- Kapitel (Scroll-Stationen) ---------- */
const ST = [
  { id: 'top', name: 'OPENING', cam: [0, 1.75, 7.6], look: [0, 2.05, 0], asm: 1, plex: 0, glow: .85, rings: 0, cry: 0, pmix: 0, pop: .55, rot: 0 },
  { id: 'leistungen', name: 'LEISTUNGEN', cam: [4.6, 3.3, 9.6], look: [0, 1.6, 0], asm: .3, plex: .9, glow: .35, rings: 0, cry: 0, pmix: 0, pop: .5, rot: .7 },
  { id: 'ki-demo', name: 'KI LIVE', cam: [0, 2.0, 6.3], look: [0, 1.9, 0], asm: 0, plex: .15, glow: 1, rings: 1, cry: 0, pmix: 1, pop: .95, rot: 0 },
  { id: 'vorher-nachher', name: 'REDESIGN', cam: [-3.6, 2.3, 7.1], look: [0, 1.9, 0], asm: 1, plex: 0, glow: .6, rings: .12, cry: 0, pmix: .2, pop: .5, rot: -.55 },
  { id: 'projekte', name: 'PORTFOLIO', cam: [0, 2.2, 7.6], look: [0, 1.9, 0], asm: 0, plex: .1, glow: .25, rings: 0, cry: 1, pmix: 0, pop: .6, rot: 0 },
  { id: 'konfigurator', name: 'BAUPLAN', cam: [3.2, 4.1, 8.6], look: [0, 1.5, 0], asm: .7, plex: .55, glow: .5, rings: 0, cry: 0, pmix: 0, pop: .5, rot: .4 },
  { id: 'rechner', name: 'KI-RECHNER', cam: [-2.1, 2.1, 6.6], look: [0, 1.9, 0], asm: 0, plex: 0, glow: .4, rings: .3, cry: 0, pmix: 2, pop: .95, rot: 0 },
  { id: 'pakete', name: 'PAKETE', cam: [0, 2.6, 8.2], look: [0, 1.9, 0], asm: 0, plex: .2, glow: .3, rings: 0, cry: .8, pmix: 2, pop: .6, rot: 0 },
  { id: 'prozess', name: 'PROZESS', cam: [0, 0.95, 12.5], look: [0, 1.3, -4], asm: .25, plex: 0, glow: .5, rings: 0, cry: 0, pmix: 0, pop: .65, rot: 0 },
  { id: 'vergleich', name: 'VERGLEICH', cam: [2.6, 1.5, 5.2], look: [0, 1.9, 0], asm: 0, plex: 0, glow: .6, rings: .45, cry: 0, pmix: 3, pop: .95, rot: 0 },
  { id: 'ueber-uns', name: 'STUDIO', cam: [-2.6, 2.3, 7.1], look: [0, 1.9, 0], asm: 1, plex: 0, glow: .9, rings: 0, cry: 0, pmix: 3, pop: .4, rot: -.35 },
  { id: 'faq', name: 'FAQ', cam: [0, 3.6, 10.2], look: [0, 1.6, 0], asm: .5, plex: .75, glow: .4, rings: 0, cry: 0, pmix: 0, pop: .5, rot: .3 },
  { id: 'website-check', name: 'CHECK', cam: [0, 2.0, 6.6], look: [0, 1.9, 0], asm: 0, plex: .1, glow: 1, rings: 1, cry: 0, pmix: 1, pop: .9, rot: 0 },
  { id: 'kontakt', name: 'KONTAKT', cam: [0, 2.1, 7.8], look: [0, 1.9, 0], asm: 1, plex: 0, glow: 1, rings: .35, cry: 0, pmix: 0, pop: .55, rot: 0 }
];
const KEYS = ['asm', 'plex', 'glow', 'rings', 'cry', 'pmix', 'pop', 'rot'];

/* ---------- Hilfen: Rauschen ---------- */
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y) { let s = 0, a = .5, f = 1; for (let i = 0; i < 5; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= .5; } return s; }
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* ---------- Szene ---------- */
function makeScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  const DPR = Math.min(win.devicePixelRatio || 1, lite ? 1.25 : 1.6);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const FOG = new THREE.Color('#c4c9d0');
  scene.fog = new THREE.Fog(FOG, 9, 34);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);

  /* Umgebung für Spiegelungen */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = vP.y*0.5+0.5; vec3 c = mix(vec3(0.42,0.44,0.48), vec3(1.05,1.07,1.1), smoothstep(0.2,0.9,h)); c += vec3(1.6,1.4,1.0)*pow(max(dot(vP, normalize(vec3(0.5,0.7,0.4))),0.0), 40.0); gl_FragColor = vec4(c,1.0); }'
  }));
  envScene.add(envSky);
  const envMap = pmrem.fromScene(envScene, 0.02).texture;
  scene.environment = envMap;

  const hemi = new THREE.HemisphereLight(0xf4f6f9, 0x7d838c, 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 7, 5);
  scene.add(sun);
  const core = new THREE.PointLight(0xfff1d6, 0, 7, 1.6);
  core.position.set(0, 1.9, 0.2);
  scene.add(core);

  /* Gelände */
  const tSeg = lite ? 90 : 150;
  const tGeo = new THREE.PlaneGeometry(70, 70, tSeg, tSeg);
  tGeo.rotateX(-Math.PI / 2);
  const tp = tGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i);
    const d = Math.hypot(x, z);
    const flat = smooth(clamp((d - 3.2) / 6, 0, 1));
    let h = (fbm(x * 0.09 + 3, z * 0.09 - 1) - 0.42) * 3.4 * flat;
    h += Math.max(0, fbm(x * 0.035 + 9, z * 0.035) - 0.45) * 14 * smooth(clamp((d - 14) / 12, 0, 1)) * (z < 0 ? 1 : 0.35);
    h += (vnoise(x * 1.7, z * 1.7) - .5) * 0.06;
    tp.setY(i, h - 0.02);
  }
  tGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ color: '#c3c8ce', roughness: .96, metalness: 0, flatShading: false }));
  scene.add(terrain);

  /* Kontaktschatten */
  const shCan = doc.createElement('canvas'); shCan.width = shCan.height = 128;
  const sg = shCan.getContext('2d'); const gr = sg.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(30,34,40,.55)'); gr.addColorStop(1, 'rgba(30,34,40,0)'); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shCan), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.02, 0.1); shadow.scale.setScalar(0.65);
  scene.add(shadow);

  /* Monogramm aus Blöcken: Ring (Silber-Eis) + V (Gold) */
  const C = new THREE.Vector3(0, 1.9, 0);
  const R = rnd(7);
  const ringN = 30, ringR = 1.62;
  const ringT = [];
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < ringN; i++) {
      const a = (i + row * 0.5) / ringN * Math.PI * 2;
      const r = ringR + (row ? -0.2 : 0.17);
      ringT.push({ p: new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, (row ? -0.06 : 0.06)), rz: a + Math.PI / 2, s: new THREE.Vector3(0.36 + R() * 0.06, row ? 0.2 : 0.24, 0.42 + R() * 0.08) });
    }
  }
  const vT = [];
  const arms = [[[-1.05, 1.08], [0, -1.18]], [[1.05, 1.08], [0, -1.18]], [[-0.55, 1.08], [0.02, -0.25]]];
  arms.forEach((arm, ai) => {
    const [a, b] = arm, n = ai === 2 ? 5 : 8;
    const dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      vT.push({ p: new THREE.Vector3(lerp(a[0], b[0], t), lerp(a[1], b[1], t), ai === 2 ? 0.16 : 0), rz: dir, s: new THREE.Vector3(0.3, ai === 2 ? 0.16 : 0.26, ai === 2 ? 0.26 : 0.4) });
    }
  });
  function blockSet(list, mat) {
    const geo = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    list.forEach((b, i) => {
      const dirv = new THREE.Vector3(R() - .5, R() - .3, R() - .5).normalize();
      b.from = C.clone().add(b.p).add(dirv.multiplyScalar(2.2 + R() * 3.2));
      b.fromRot = new THREE.Euler(R() * 6, R() * 6, R() * 6);
      b.delay = R() * 0.55;
      b.jit = new THREE.Euler((R() - .5) * 0.12, (R() - .5) * 0.12, (R() - .5) * 0.08);
      b.ph = R() * 6.28;
    });
    m.userData.list = list;
    return m;
  }
  const iceMat = new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: .42, metalness: .05, envMapIntensity: 1.1 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#d6ad62', roughness: .22, metalness: .95, envMapIntensity: 1.5 });
  const ringBlocks = blockSet(ringT, iceMat), vBlocks = blockSet(vT, goldMat);
  const mono = new THREE.Group();
  mono.add(ringBlocks, vBlocks);
  scene.add(mono);
  const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), new THREE.MeshBasicMaterial({ color: 0xfff7e6, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  glowDisc.position.copy(C).add(new THREE.Vector3(0, 0, -0.2));
  scene.add(glowDisc);

  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  function updateBlocks(mesh, asm, t) {
    const list = mesh.userData.list;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const k = ease(clamp((asm * 1.55 - b.delay) / 0.85, 0, 1));
      const bob = (1 - k) * Math.sin(t * 0.6 + b.ph) * 0.25;
      _p.set(lerp(b.from.x, C.x + b.p.x, k), lerp(b.from.y, C.y + b.p.y, k) + bob, lerp(b.from.z, C.z + b.p.z, k));
      _e.set(lerp(b.fromRot.x + t * 0.15, b.jit.x, k), lerp(b.fromRot.y + t * 0.1, b.jit.y, k), lerp(b.fromRot.z, b.rz + b.jit.z, k));
      _q.setFromEuler(_e);
      const sc = 0.12 + 0.88 * k;
      _s.copy(b.s).multiplyScalar(sc);
      _m.compose(_p.sub(C), _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  mono.position.copy(C);
  const MS = 0.6;
  mono.scale.setScalar(MS);

  /* Plexus */
  const PN = lite ? 80 : 130;
  const pPos = new Float32Array(PN * 3);
  const pr = rnd(11);
  for (let i = 0; i < PN; i++) {
    const u = pr() * 2 - 1, th = pr() * Math.PI * 2, rr = 1.2 + Math.pow(pr(), 0.6) * 2.6;
    const s = Math.sqrt(1 - u * u);
    pPos[i * 3] = Math.cos(th) * s * rr; pPos[i * 3 + 1] = u * rr * 0.8; pPos[i * 3 + 2] = Math.sin(th) * s * rr * 0.7;
  }
  const lines = [];
  for (let i = 0; i < PN && lines.length < 420 * 6; i++) for (let j = i + 1; j < PN; j++) {
    const dx = pPos[i * 3] - pPos[j * 3], dy = pPos[i * 3 + 1] - pPos[j * 3 + 1], dz = pPos[i * 3 + 2] - pPos[j * 3 + 2];
    if (dx * dx + dy * dy + dz * dz < 1.15) lines.push(pPos[i * 3], pPos[i * 3 + 1], pPos[i * 3 + 2], pPos[j * 3], pPos[j * 3 + 1], pPos[j * 3 + 2]);
  }
  const plex = new THREE.Group();
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  plex.add(new THREE.LineSegments(lineGeo, lineMat));
  const dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const dotMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0, depthWrite: false });
  plex.add(new THREE.Points(dotGeo, dotMat));
  plex.position.copy(C);
  plex.scale.setScalar(0.72);
  scene.add(plex);

  /* Ringe (Portal) */
  const rings = new THREE.Group(); rings.position.copy(C);
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#9aa0a8', roughness: .78, metalness: .05, transparent: true, opacity: 1 });
  const ringDefs = [{ r: 1.25, tube: .11, n: 7 }, { r: 2.0, tube: .17, n: 9 }, { r: 2.9, tube: .23, n: 12 }];
  const ringSegs = [];
  ringDefs.forEach((d, ri) => {
    const g = new THREE.Group();
    const arc = (Math.PI * 2 / d.n) * 0.86;
    const geo = new THREE.TorusGeometry(d.r, d.tube, 10, 18, arc);
    for (let i = 0; i < d.n; i++) {
      const m = new THREE.Mesh(geo, stoneMat);
      const a0 = i / d.n * Math.PI * 2;
      m.rotation.z = a0;
      m.userData = { a: a0 + arc / 2, ri };
      g.add(m); ringSegs.push(m);
    }
    const glow = new THREE.Mesh(new THREE.TorusGeometry(d.r * (ri === 1 ? 1 : 1.02), 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: ri === 1 ? 0xf3dfae : 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    g.add(glow); g.userData.glow = glow;
    rings.add(g);
  });
  rings.scale.setScalar(0.7);
  scene.add(rings);

  /* Kristalle (Portfolio) */
  const crystals = new THREE.Group();
  const cryMat = new THREE.MeshPhysicalMaterial({ color: '#d9e2ec', roughness: .06, metalness: .15, clearcoat: 1, clearcoatRoughness: .05, transparent: true, opacity: .5, envMapIntensity: 2.2, flatShading: true, side: THREE.DoubleSide, depthWrite: false });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#555b64', roughness: .55, metalness: .2, flatShading: true });
  const goldCoreMat = new THREE.MeshStandardMaterial({ color: '#c9a45c', roughness: .3, metalness: .9, flatShading: true });
  const cxs = [-2.45, 0, 2.45];
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7 });
  const cryList = cxs.map((x, i) => {
    const g = new THREE.OctahedronGeometry(0.85, 0);
    const p = g.attributes.position, rr = rnd(30 + i);
    for (let k = 0; k < p.count; k++) p.setY(k, p.getY(k) * (1.75 + rr() * 0.1));
    g.computeVertexNormals();
    const grp = new THREE.Group();
    const shell = new THREE.Mesh(g, cryMat);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat);
    const inner = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), i === 1 ? goldCoreMat : coreMat);
    inner.scale.y = 1.4;
    grp.add(inner, shell, edges);
    grp.position.set(x, 1.9, 0);
    grp.userData = { ph: i * 2.1, x };
    crystals.add(grp);
    return grp;
  });
  crystals.scale.setScalar(0.78);
  crystals.position.set(0, 1.9 * (1 - 0.78), 0);
  scene.add(crystals);

  /* Partikel: Schnee → Kern → Strom → Figur */
  const PC = lite ? 2600 : 7000;
  const pg = new THREE.BufferGeometry();
  const s0 = new Float32Array(PC * 3), s1 = new Float32Array(PC * 3), s2 = new Float32Array(PC * 3), s3 = new Float32Array(PC * 3), rv = new Float32Array(PC);
  const rr2 = rnd(99);
  for (let i = 0; i < PC; i++) {
    s0[i * 3] = (rr2() - .5) * 26; s0[i * 3 + 1] = rr2() * 9; s0[i * 3 + 2] = (rr2() - .5) * 18 - 2;
    const u = rr2() * 2 - 1, th = rr2() * Math.PI * 2, r = Math.cbrt(rr2()) * 0.62, sq = Math.sqrt(1 - u * u);
    s1[i * 3] = Math.cos(th) * sq * r; s1[i * 3 + 1] = 1.9 + u * r; s1[i * 3 + 2] = Math.sin(th) * sq * r;
    const t = rr2(), ang = t * Math.PI * 9, hr = 0.55 + rr2() * 0.35;
    s2[i * 3] = (t - .5) * 12; s2[i * 3 + 1] = 1.9 + Math.sin(ang) * hr + (rr2() - .5) * .15; s2[i * 3 + 2] = Math.cos(ang) * hr + (rr2() - .5) * .15;
    const tk = rr2() * Math.PI * 2, P = 2, Q = 3, kr = 0.75 + 0.32 * Math.cos(Q * tk), j = (rr2() - .5) * .14;
    s3[i * 3] = kr * Math.cos(P * tk) * 1.1 + j; s3[i * 3 + 1] = 1.9 + kr * Math.sin(P * tk) * 1.1 + j; s3[i * 3 + 2] = -0.32 * Math.sin(Q * tk) * 1.6 + j;
    rv[i] = rr2();
  }
  pg.setAttribute('position', new THREE.BufferAttribute(s0, 3));
  pg.setAttribute('s1', new THREE.BufferAttribute(s1, 3));
  pg.setAttribute('s2', new THREE.BufferAttribute(s2, 3));
  pg.setAttribute('s3', new THREE.BufferAttribute(s3, 3));
  pg.setAttribute('rv', new THREE.BufferAttribute(rv, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uMix: { value: 0 }, uOp: { value: .5 }, uSize: { value: (lite ? 20 : 26) * DPR }, uFogC: { value: FOG } },
    vertexShader: `
      attribute vec3 s1; attribute vec3 s2; attribute vec3 s3; attribute float rv;
      uniform float uT; uniform float uMix; uniform float uSize;
      varying float vA; varying float vD;
      vec3 snow(vec3 p){ p.y = mod(p.y - uT*(0.18+rv*0.25), 9.0); p.x += sin(uT*0.3+rv*20.0)*0.4; return p; }
      vec3 shape(float k, vec3 p0){
        if(k < 0.5) return snow(p0);
        if(k < 1.5){ vec3 c = s1 - vec3(0.0,1.9,0.0); float a = uT*0.6*(0.5+rv); c.xz = mat2(cos(a),-sin(a),sin(a),cos(a))*c.xz; return c*(1.0+0.08*sin(uT*2.0+rv*30.0)) + vec3(0.0,1.9,0.0); }
        if(k < 2.5){ vec3 c = s2; c.x = mod(c.x + uT*0.9 + 6.0, 12.0) - 6.0; return c; }
        vec3 c = s3 - vec3(0.0,1.9,0.0); float a = uT*0.25; c.xz = mat2(cos(a),-sin(a),sin(a),cos(a))*c.xz; return c + vec3(0.0,1.9,0.0);
      }
      void main(){
        float m = clamp(uMix, 0.0, 3.0);
        float a = floor(m); float f = m - a;
        f = smoothstep(rv*0.35, 0.65 + rv*0.35, f);
        vec3 p = mix(shape(a, position), shape(min(a+1.0,3.0), position), f);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float sz = uSize * (0.35 + rv*0.65) / -mv.z;
        gl_PointSize = clamp(sz, 1.0, 22.0);
        vA = 0.5 + 0.5*sin(uT*1.5 + rv*40.0);
        vD = -mv.z;
      }`,
    fragmentShader: `
      uniform float uOp; uniform float uMix; uniform vec3 uFogC; varying float vA; varying float vD;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float a = smoothstep(0.5, 0.0, d);
        a *= uOp * (0.55 + 0.45*vA) * (1.0 - 0.55*smoothstep(0.6,1.0,1.0-abs(uMix-1.0)));
        float fogf = smoothstep(9.0, 30.0, vD);
        gl_FragColor = vec4(mix(vec3(1.0), uFogC, fogf*0.6), a*(1.0-fogf*0.7));
      }`
  });
  const points = new THREE.Points(pg, pMat);
  points.frustumCulled = false;
  scene.add(points);

  /* Nachbearbeitung: Chromatische Aberration, Vignette, Korn (nur Desktop) */
  let rt = null, post = null;
  if (!lite) {
    rt = new THREE.WebGLRenderTarget(4, 4, { samples: 4, type: THREE.HalfFloatType });
    post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      blending: THREE.NoBlending, depthTest: false, depthWrite: false,
      uniforms: { tD: { value: rt.texture }, uG: { value: 0 }, uT: { value: 0 }, uR: { value: new THREE.Vector2(1, 1) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }',
      fragmentShader: `
        uniform sampler2D tD; uniform float uG; uniform float uT; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec2 uv = vUv; vec2 c = uv - 0.5;
          float band = step(0.985, h(vec2(floor(uv.y*38.0), floor(uT*14.0)))) * uG;
          uv.x += band * (h(vec2(uT, uv.y)) - 0.5) * 0.06;
          vec2 off = c * (0.0016 + uG*0.010) + vec2(uG*0.0025, 0.0);
          vec4 r = texture2D(tD, uv + off), g = texture2D(tD, uv), b = texture2D(tD, uv - off);
          vec4 col = vec4(r.r, g.g, b.b, (r.a+g.a+b.a)/3.0);
          col.rgb += (h(uv*vec2(913.0,577.0)+uT) - 0.5) * 0.03 * col.a;
          gl_FragColor = col;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }));
    post.frustumCulled = false;
  }
  const postScene = new THREE.Scene(); if (post) postScene.add(post);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function resize() {
    const w = win.innerWidth, h = win.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 700 ? 52 : 36;
    mono.scale.setScalar(w < 700 ? 0.78 : MS);
    camera.updateProjectionMatrix();
    if (rt) rt.setSize(Math.round(w * DPR), Math.round(h * DPR));
  }

  return {
    renderer, scene, camera, resize, rt, post, postScene, postCam, pMat, points,
    upd: { ringBlocks, vBlocks, updateBlocks, mono, glowDisc, core, lineMat, dotMat, plex, rings, ringSegs, crystals, cryList, cryMat, coreMat, stoneMat, C }
  };
}

/* ---------- Flüssiger Blob (Opening) ---------- */
function makeBlob(canvas) {
  let gl;
  try { gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true, antialias: false }); } catch (e) { gl = null; }
  if (!gl) return null;
  const N = 12;
  const vs = 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }';
  const fs = `precision mediump float;
    uniform vec2 uR; uniform vec3 uP[${N}]; uniform float uT; uniform float uOn;
    float field(vec2 q){ float f = 0.0; for(int i=0;i<${N};i++){ vec2 d = q - uP[i].xy; f += uP[i].z*uP[i].z / (dot(d,d) + 1.0); } return f; }
    void main(){
      vec2 q = gl_FragCoord.xy;
      float f = field(q);
      float a = smoothstep(0.92, 1.02, f) * uOn;
      if (a <= 0.001) { gl_FragColor = vec4(0.0); return; }
      vec2 e = vec2(2.0, 0.0);
      vec2 grad = vec2(field(q+e.xy) - field(q-e.xy), field(q+e.yx) - field(q-e.yx));
      vec3 n = normalize(vec3(-grad * 9.0, 1.0));
      float edge = 1.0 - smoothstep(1.0, 1.35, f);
      vec3 film = 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67) + edge*1.2 + uT*0.04));
      float spec = pow(max(dot(n, normalize(vec3(-0.45,0.55,0.7))), 0.0), 60.0);
      vec3 col = vec3(1.0) - film * edge * 0.28 - spec * 0.75;
      gl_FragColor = vec4(col, a);
    }`;
  function sh(t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; }
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, 'uR'), uP = gl.getUniformLocation(pr, 'uP'), uT = gl.getUniformLocation(pr, 'uT'), uOn = gl.getUniformLocation(pr, 'uOn');
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const scale = lite ? 0.5 : 0.75;
  const pts = []; for (let i = 0; i < N; i++) pts.push({ x: win.innerWidth * 0.6, y: win.innerHeight * 0.5, vx: 0, vy: 0 });
  const tgt = { x: win.innerWidth * 0.6, y: win.innerHeight * 0.45, live: false, last: 0 };
  const arr = new Float32Array(N * 3);
  function resize() { canvas.width = Math.round(win.innerWidth * scale); canvas.height = Math.round(win.innerHeight * scale); gl.viewport(0, 0, canvas.width, canvas.height); }
  resize();
  const onMove = (e) => { tgt.x = e.clientX; tgt.y = e.clientY; tgt.live = true; tgt.last = performance.now(); };
  win.addEventListener('pointermove', onMove, { passive: true });
  win.addEventListener('pointerdown', onMove, { passive: true });
  let on = 1;
  return {
    resize,
    set on(v) { on = v; },
    frame(t) {
      const idle = !tgt.live || performance.now() - tgt.last > 2600;
      let tx = tgt.x, ty = tgt.y;
      if (idle) { tx = win.innerWidth * (0.5 + 0.3 * Math.sin(t * 0.37)); ty = win.innerHeight * (0.48 + 0.18 * Math.sin(t * 0.53 + 1.3)); }
      for (let i = 0; i < N; i++) {
        const p = pts[i], lead = i === 0 ? { x: tx, y: ty } : pts[i - 1];
        const k = i === 0 ? 0.12 : 0.42;
        p.vx = p.vx * 0.55 + (lead.x - p.x) * k; p.vy = p.vy * 0.55 + (lead.y - p.y) * k;
        p.x += p.vx; p.y += p.vy;
        const base = Math.min(win.innerWidth, 1200) * (lite ? 0.1 : 0.075);
        const r = base * (1.0 - i / N * 0.7) * (1 + 0.07 * Math.sin(t * 1.6 + i * 0.7));
        arr[i * 3] = p.x * scale; arr[i * 3 + 1] = (win.innerHeight - p.y) * scale; arr[i * 3 + 2] = r * scale * 0.55;
      }
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uR, canvas.width, canvas.height); gl.uniform3fv(uP, arr); gl.uniform1f(uT, t); gl.uniform1f(uOn, on);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
}

/* ---------- Klang: Wind + tiefer Ton (WebAudio, nur auf Wunsch) ---------- */
function makeSound() {
  let ctx = null, master = null, on = false;
  function start() {
    const AC = win.AudioContext || win.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.6;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 300; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    const wg = ctx.createGain(); wg.gain.value = 0.5; src.connect(bp); bp.connect(wg); wg.connect(master); src.start();
    [55, 82.4, 110].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.05 / (i + 1); o.connect(g); g.connect(master); o.start(); });
    return true;
  }
  return {
    toggle() {
      if (!ctx && !start()) return false;
      on = !on;
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(on ? 0.35 : 0, ctx.currentTime + 0.8);
      return on;
    }
  };
}

/* ---------- Start ---------- */
function init() {
  if (doc.documentElement.classList.contains('x-on')) return;
  if (!doc.querySelector('.layer')) { setTimeout(init, 120); return; }
  doc.documentElement.classList.add('x-on');
  const D = buildDom();
  const S = makeScene(D.cv);
  if (!S) { doc.documentElement.classList.add('x-nogl'); }
  const blob = (!reduce && D.blob) ? makeBlob(D.blob) : null;
  if (!blob) D.blob.style.display = 'none';
  const sound = makeSound();

  /* HUD */
  const mission = D.hud.querySelector('.x-mission');
  const chapN = D.hud.querySelector('.x-chap-n'), chapT = D.hud.querySelector('.x-chap-t'), chapP = D.hud.querySelector('.x-chap-p');
  const sBtn = D.hud.querySelector('.x-sound');
  sBtn.addEventListener('click', () => {
    const on = sound.toggle();
    sBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    scramble(sBtn.querySelector('span'), on ? 'Sound: An' : 'Sound: Aus', 22);
  });
  setTimeout(() => scramble(mission, 'Wir bauen die nächste Generation digitaler Marken – an der Schnittstelle von Web, 3D und KI.', 70), 900);

  /* Abschnitts-Eyebrows entschlüsseln sich beim Erscheinen */
  if ('IntersectionObserver' in win) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const t = e.target; io.unobserve(t);
      const txt = t.getAttribute('data-x') || t.textContent; t.setAttribute('data-x', txt);
      scramble(t, txt, 46);
    }), { threshold: 0.6 });
    const watch = () => doc.querySelectorAll('.layer .eyebrow:not([data-xw])').forEach((n) => { n.setAttribute('data-xw', '1'); io.observe(n); });
    watch(); setInterval(watch, 2500);
  }

  /* Loader */
  let introStart = performance.now() + (D.loader ? 1700 : 150);
  if (D.loader) {
    const code = D.loader.querySelector('.x-ld-code'), word = D.loader.querySelector('.x-ld-word'), pct = D.loader.querySelector('.x-ld-pct'), bar = D.loader.querySelector('.x-ld-bar i');
    const t0 = performance.now();
    let k = setInterval(() => { scramble(code, ['=--==++==-', '-==+--=+=-', '+=-==-+--=', '==+-=-+==+'][(Math.random() * 4) | 0], 10); }, 380);
    setTimeout(() => scramble(word, 'VONUMO', 36), 450);
    const tick = () => {
      const p = clamp((performance.now() - t0) / 1500, 0, 1);
      pct.textContent = String(Math.round(ease(p) * 100)).padStart(3, '0');
      bar.style.transform = 'scaleX(' + ease(p).toFixed(3) + ')';
      if (p < 1) requestAnimationFrame(tick);
      else { clearInterval(k); D.loader.classList.add('x-out'); setTimeout(() => D.loader.remove(), 900); }
    };
    tick();
  }

  /* Labels für Kristalle */
  const labelTexts = [['PORTFOLIO_01', 'FLUX ENERGY', '3D · SCROLL-STORY'], ['PORTFOLIO_02', 'BAUSQO', 'UI/UX · MOTION'], ['PORTFOLIO_03', 'PAYMENT CHECKOUT', 'WEB-APP · ZAHLUNG']];
  const labels = labelTexts.map((t) => {
    const n = el('div', 'x-label', '<i></i><b>' + t[0] + '</b><span>' + t[1] + '</span><small>' + t[2] + '</small>');
    D.labels.appendChild(n); n._t = t; n._shown = false;
    return n;
  });

  /* Stationen messen */
  let stations = [];
  function measure() {
    const vh = win.innerHeight, max = Math.max(1, doc.documentElement.scrollHeight - vh);
    const out = [];
    ST.forEach((s) => {
      const node = doc.getElementById(s.id);
      if (!node || node.offsetParent === null) return;
      const top = node.getBoundingClientRect().top + win.scrollY;
      const g = s.id === 'top' ? 0 : clamp((top - vh * 0.35) / max, 0, 1);
      out.push(Object.assign({}, s, { g }));
    });
    out.sort((a, b) => a.g - b.g);
    for (let i = 1; i < out.length; i++) if (out[i].g <= out[i - 1].g) out[i].g = out[i - 1].g + 0.0001;
    stations = out.length ? out : [Object.assign({}, ST[0], { g: 0 })];
  }
  measure();
  win.addEventListener('resize', () => { measure(); if (S) S.resize(); if (blob) blob.resize(); });
  setInterval(measure, 1500);
  win.addEventListener('load', measure);
  if (S) S.resize();

  const cur = { cam: new THREE.Vector3(0, 2.05, 7.4), look: new THREE.Vector3(0, 1.9, 0) };
  KEYS.forEach((k) => { cur[k] = ST[0][k]; });
  const tgtCam = new THREE.Vector3(), tgtLook = new THREE.Vector3();
  let mx = 0, my = 0, smx = 0, smy = 0, lastY = win.scrollY, vel = 0, glitch = 0, chapIdx = -1, visible = true, lastT = performance.now();
  win.addEventListener('pointermove', (e) => { mx = e.clientX / win.innerWidth * 2 - 1; my = e.clientY / win.innerHeight * 2 - 1; }, { passive: true });
  doc.addEventListener('visibilitychange', () => { visible = !doc.hidden; if (visible) { lastT = performance.now(); requestAnimationFrame(loop); } });

  const v3 = new THREE.Vector3();
  function project(obj, ox, oy) {
    v3.set(ox, oy, 0); obj.localToWorld(v3); v3.project(S.camera);
    return { x: (v3.x * 0.5 + 0.5) * win.innerWidth, y: (-v3.y * 0.5 + 0.5) * win.innerHeight, z: v3.z };
  }

  function loop(now) {
    if (!visible) return;
    const t = now / 1000, dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    const vh = win.innerHeight, y = win.scrollY, max = Math.max(1, doc.documentElement.scrollHeight - vh);
    const g = clamp(y / max, 0, 1);
    vel = lerp(vel, (y - lastY) / Math.max(dt, 0.001), 0.15); lastY = y;

    /* Station finden und interpolieren */
    let i = 0; while (i < stations.length - 1 && g > stations[i + 1].g) i++;
    const a = stations[i], b = stations[Math.min(i + 1, stations.length - 1)];
    const span = Math.max(1e-4, b.g - a.g);
    const tt = a === b ? 0 : smooth(clamp((g - a.g) / span, 0, 1));
    const idx = tt > 0.5 && a !== b ? i + 1 : i;
    const st = stations[idx];
    if (idx !== chapIdx) {
      chapIdx = idx;
      scramble(chapN, String(ST.findIndex((s) => s.id === st.id) + 1).padStart(2, '0'), 16);
      scramble(chapT, st.name, 26);
      glitch = Math.max(glitch, 0.85);
    }
    chapP.textContent = String(Math.round(g * 100)).padStart(3, '0') + '%';
    doc.documentElement.classList.toggle('x-scrolled', y > 40);
    const ft = doc.querySelector('.layer > footer'); doc.documentElement.classList.toggle('x-dark', !!ft && ft.getBoundingClientRect().top < vh * 0.6);

    const k = 1 - Math.pow(0.0025, dt);
    tgtCam.set(lerp(a.cam[0], b.cam[0], tt), lerp(a.cam[1], b.cam[1], tt), lerp(a.cam[2], b.cam[2], tt));
    tgtLook.set(lerp(a.look[0], b.look[0], tt), lerp(a.look[1], b.look[1], tt), lerp(a.look[2], b.look[2], tt));
    if (win.innerWidth < 700) tgtCam.z += 2.6;
    KEYS.forEach((key) => { cur[key] = lerp(cur[key], lerp(a[key], b[key], tt), k); });
    smx = lerp(smx, mx, 0.05); smy = lerp(smy, my, 0.05);

    /* Opening: Wortmarke und Blob */
    const hp = clamp(y / (vh * 0.9), 0, 1);
    D.wm.style.opacity = (1 - hp).toFixed(3);
    D.wm.style.transform = 'translate3d(0,' + (-hp * vh * 0.25).toFixed(1) + 'px,0) scale(' + (1 + hp * 0.06).toFixed(3) + ')';
    D.wm.style.visibility = hp >= 1 ? 'hidden' : 'visible';
    if (blob) {
      const bOn = 1 - smooth(clamp((y - vh * 0.2) / (vh * 0.6), 0, 1));
      if (bOn > 0.002) { D.blob.style.visibility = 'visible'; blob.on = bOn; blob.frame(t); }
      else D.blob.style.visibility = 'hidden';
    }

    if (S) {
      const U = S.upd;
      const intro = clamp((now - introStart) / 2600, 0, 1);
      const asm = cur.asm * (idx === 0 || i === 0 ? ease(intro) : 1);
      U.updateBlocks(U.ringBlocks, asm, t);
      U.updateBlocks(U.vBlocks, clamp(asm * 1.1 - 0.05, 0, 1), t);
      U.mono.rotation.y = cur.rot + Math.sin(t * 0.3) * 0.06 + smx * 0.12;
      U.mono.rotation.x = Math.sin(t * 0.21) * 0.03 - smy * 0.05;
      const glow = cur.glow * smooth(clamp(asm * 1.2 - 0.2, 0, 1)) + cur.rings * 0.6;
      U.glowDisc.material.opacity = clamp(glow, 0, 1) * 0.55 * (0.85 + 0.15 * Math.sin(t * 1.7));
      U.glowDisc.scale.setScalar((0.6 + 0.4 * smooth(clamp(asm, 0, 1))) * U.mono.scale.x + cur.rings * 0.25);
      U.core.intensity = clamp(glow, 0, 1.2) * 6;
      const plexA = Math.max(cur.plex, (1 - ease(intro)) * 0.9);
      U.lineMat.opacity = plexA * 0.5; U.dotMat.opacity = plexA * 0.9;
      U.plex.visible = plexA > 0.01;
      U.plex.rotation.y = t * 0.05; U.plex.rotation.x = Math.sin(t * 0.1) * 0.1;

      /* Ringe */
      const rg = cur.rings;
      U.rings.visible = rg > 0.01;
      if (U.rings.visible) {
        U.rings.children.forEach((grp, ri) => {
          grp.rotation.z = t * (ri % 2 ? -0.12 : 0.08) * (1 + ri * 0.3);
          grp.rotation.x = (1 - rg) * (0.6 + ri * 0.3);
          grp.userData.glow.material.opacity = smooth(clamp(rg * 1.3 - 0.3, 0, 1)) * (0.65 + 0.35 * Math.sin(t * 2 + ri));
        });
        U.ringSegs.forEach((m) => {
          const off = (1 - rg) * (2.5 + m.userData.ri * 1.2);
          m.position.set(Math.cos(m.userData.a) * off, Math.sin(m.userData.a) * off, (1 - rg) * (m.userData.ri - 1) * 1.5);
          m.scale.setScalar(0.4 + 0.6 * rg);
        });
        U.stoneMat.opacity = smooth(clamp(rg * 1.4, 0, 1));
      }

      /* Kristalle */
      const cr = cur.cry;
      U.crystals.visible = cr > 0.01;
      U.cryList.forEach((grp, ci) => {
        const ph = grp.userData.ph;
        const sc = Math.max(0.001, ease(clamp(cr * 1.3 - ci * 0.12, 0, 1)));
        grp.scale.setScalar(sc);
        grp.position.y = 1.9 + Math.sin(t * 0.8 + ph) * 0.12 + (1 - sc) * 1.5;
        grp.position.x = grp.userData.x * (win.innerWidth < 700 ? 0.62 : 1);
        grp.rotation.y = t * 0.25 + ph; grp.rotation.z = Math.sin(t * 0.4 + ph) * 0.12;
        const lb = labels[ci];
        if (cr > 0.6 && sc > 0.6) {
          const p = project(grp, 0.9, 1.2);
          lb.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0)';
          lb.style.opacity = ((cr - 0.6) / 0.4).toFixed(3);
          if (!lb._shown) { lb._shown = true; lb.classList.add('on'); scramble(lb.querySelector('b'), lb._t[0], 20); scramble(lb.querySelector('span'), lb._t[1], 30); }
        } else if (lb._shown) { lb._shown = false; lb.classList.remove('on'); lb.style.opacity = '0'; }
      });

      /* Partikel */
      S.pMat.uniforms.uT.value = t;
      S.pMat.uniforms.uMix.value = cur.pmix;
      S.pMat.uniforms.uOp.value = cur.pop;

      /* Kamera */
      const cam = S.camera;
      cur.cam.lerp(tgtCam, k); cur.look.lerp(tgtLook, k);
      cam.position.set(cur.cam.x + smx * 0.35, cur.cam.y - smy * 0.18, cur.cam.z);
      cam.lookAt(cur.look);

      glitch = Math.max(0, glitch - dt * 1.6);
      const g2 = win.__xcalm ? 0 : clamp(glitch * 0.8 + Math.min(Math.abs(vel) / 9000, 0.22), 0, 1);
      if (S.rt) {
        S.renderer.setRenderTarget(S.rt);
        S.renderer.clear();
        S.renderer.render(S.scene, cam);
        S.renderer.setRenderTarget(null);
        S.renderer.clear();
        S.post.material.uniforms.uG.value = reduce ? 0 : g2;
        S.post.material.uniforms.uT.value = t;
        S.renderer.render(S.postScene, S.postCam);
      } else {
        S.renderer.render(S.scene, cam);
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => setTimeout(init, 50));
else setTimeout(init, 50);
