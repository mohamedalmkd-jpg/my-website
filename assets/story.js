/*
 * VONUMO – 3D-Geschichte beim Scrollen
 * Ablauf: Code-Loader → Drahtgitter + Plexus → Monogramm aus Eisblöcken auf Schneegelände →
 * Aufstieg in den Nebel → drei Kristalle mit Portfolio-Labels → Portal-Ringe mit Partikelkern →
 * Plattform mit Partikelfigur (VONUMO-Zeichen) und Kontakt-Auswahl → Nacht: Chrom-Bänder über Wasser → Studio.
 */
import * as THREE from './vendor/three.module.min.js';

const D = document, W = window;
const $ = (id) => D.getElementById(id);
const reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = W.matchMedia && W.matchMedia('(hover: none), (pointer: coarse)').matches;
const ios = /iP(hone|ad|od)/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const lite = coarse || ios || (navigator.deviceMemory && navigator.deviceMemory <= 4);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/* ---------- Scramble-Text ---------- */
const GL = '!<>-_\\/[]{}=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function scramble(el, text, frames) {
  if (!el) return;
  if (reduce) { el.textContent = text; return; }
  const from = el.textContent || '', len = Math.max(from.length, text.length), q = [];
  const F = frames || 40;
  for (let i = 0; i < len; i++) { const s = Math.random() * F * 0.45, e = s + F * 0.2 + Math.random() * F * 0.55; q.push({ f: from[i] || '', t: text[i] || '', s, e }); }
  let f = 0;
  if (el._s) cancelAnimationFrame(el._s);
  const step = () => {
    let out = '', done = 0;
    for (let i = 0; i < len; i++) {
      const c = q[i];
      if (f >= c.e) { done++; out += c.t; } else if (f >= c.s) out += c.t === ' ' ? ' ' : GL[(Math.random() * GL.length) | 0]; else out += c.f;
    }
    el.textContent = out; f++;
    if (done < len) el._s = requestAnimationFrame(step); else el._s = 0;
  };
  step();
}

/* ---------- Rauschen ---------- */
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vn(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); }
function fbm(x, y) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { s += a * vn(x * f, y * f); f *= 2.02; a *= 0.5; } return s; }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }


/* ---------- Digitale Texturen ---------- */
const TOKENS = ['0','1','{','}','<','>','/','*',';','=','+','(',')','[',']','#','$','&','?',':','.','_','|','~','%','@','<>','</>','=>','{}','()','[]','&&','||','!=','==','++','//','/*','#!','fn','if','js','ts','css','px','db','api','git','sql','www','.de','.io','dom','</','/>','0x','ai','3d','ui','ux','{ }','01','10','>_'];
function glyphAtlas() {
  const cols = 8, rows = Math.ceil(TOKENS.length / cols), cell = 64, c = D.createElement('canvas');
  c.width = cols * cell; c.height = rows * cell;
  const x = c.getContext('2d');
  const draw = () => { x.clearRect(0, 0, c.width, c.height); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    TOKENS.forEach((t, i) => { const fs = t.length >= 3 ? 22 : t.length === 2 ? 28 : 40; x.font = '700 ' + fs + 'px "JetBrains Mono", ui-monospace, monospace'; x.fillText(t, (i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2 + 2); }); };
  draw();
  const tx = new THREE.CanvasTexture(c); tx.generateMipmaps = false; tx.minFilter = THREE.LinearFilter; tx.magFilter = THREE.LinearFilter;
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(() => { draw(); tx.needsUpdate = true; });
  return { tx, cols, rows, n: TOKENS.length };
}
const CODE = ['<section class="hero">', '  const site = build();', '  await deploy(site);', '}', 'fetch("/api/v1")', '.then(r => r.json())', '<div id="app"></div>', 'export default App;', 'git push origin main', 'SELECT * FROM leads;', 'vercel --prod', 'style={{ gap: 24 }}', 'import * as THREE', 'return <Hero />;', 'npm run build', '// VONUMO studio', 'https://', 'domain.de', '{ "ok": true }', 'transform: 3d;'];
function glowCode(seed) {
  const c = D.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256); x.font = '700 15px "JetBrains Mono", ui-monospace, monospace'; x.textBaseline = 'top';
  for (let y = 8; y < 256; y += 21) { if (r() < 0.45) continue; x.fillStyle = '#fff'; x.globalAlpha = 0.5 + r() * 0.5; x.fillText(CODE[(r() * CODE.length) | 0], 8 + ((r() * 3) | 0) * 14, y); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function gridTexture() {
  const c = D.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#c1c6cd'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(40,46,54,.55)'; x.lineWidth = 2; x.strokeRect(1, 1, 126, 126);
  x.strokeStyle = 'rgba(40,46,54,.18)'; x.lineWidth = 1; x.beginPath(); x.moveTo(64, 0); x.lineTo(64, 128); x.moveTo(0, 64); x.lineTo(128, 64); x.stroke();
  x.fillStyle = 'rgba(40,46,54,.6)'; x.font = '600 10px "JetBrains Mono", monospace'; x.fillText('01', 6, 14);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(70, 70); tx.anisotropy = 8; return tx;
}
function codeTexture(bg, ink, accent, seed) {
  const c = D.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = bg; x.fillRect(0, 0, 256, 256);
  x.font = '600 15px "JetBrains Mono", ui-monospace, monospace'; x.textBaseline = 'top';
  for (let y = 8; y < 256; y += 21) {
    const ind = ((r() * 3) | 0) * 14, line = CODE[(r() * CODE.length) | 0];
    x.fillStyle = r() < 0.18 ? accent : ink; x.globalAlpha = 0.55 + r() * 0.45; x.fillText(line, 8 + ind, y);
  }
  x.globalAlpha = 1;
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
}

/* ---------- Abgerundete Box ---------- */
function roundedBox(r, seg) {
  const g = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg);
  const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), h = 0.5 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(clamp(v.x, -h, h), clamp(v.y, -h, h), clamp(v.z, -h, h));
    v.sub(c); if (v.lengthSq() > 0) v.normalize().multiplyScalar(r); v.add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------- Umgebungen (für Spiegelungen) ---------- */
function envFrom(renderer, frag) {
  const pm = new THREE.PMREMGenerator(renderer), sc = new THREE.Scene();
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ vec3 d = vP; ' + frag + ' }'
  })));
  const t = pm.fromScene(sc, 0.02).texture; pm.dispose(); return t;
}

/* ================= Klang ================= */
function makeSound() {
  let ctx = null, master = null, on = false;
  function start() {
    const AC = W.AudioContext || W.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 480; bp.Q.value = 0.55;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.06; lg.gain.value = 260; lfo.connect(lg); lg.connect(bp.frequency); lfo.start();
    src.connect(bp); bp.connect(master); src.start();
    [55, 82.4, 110, 164.8].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; g.gain.value = 0.045 / (i + 1); o.connect(g); g.connect(master); o.start(); });
    return true;
  }
  return { toggle() { if (!ctx && !start()) return false; on = !on; if (ctx.state === 'suspended') ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(on ? 0.32 : 0, ctx.currentTime + 0.8); return on; } };
}

/* ================= Szene ================= */
const GREY = new THREE.Color('#c3c8cf'), NAVY = new THREE.Color('#050c1e');
const C = new THREE.Vector3(0, 1.55, 0);           // Monogramm
const R0 = new THREE.Vector3(0, 0, -150);          // Portal + Plattform
const N0 = new THREE.Vector3(0, 0, -260);          // Nacht / Studio
const CRY = [new THREE.Vector3(0, 8, -60), new THREE.Vector3(0.3, 8, -80), new THREE.Vector3(-0.3, 8, -100)];

function build(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  const DPR = Math.min(W.devicePixelRatio || 1, lite ? 1.25 : 1.6);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(GREY.clone(), 6, 26);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);

  scene.environment = envFrom(renderer, 'float h = d.y*0.5+0.5; vec3 c = mix(vec3(0.38,0.40,0.44), vec3(1.05,1.07,1.1), smoothstep(0.15,0.95,h)); c += vec3(1.5)*pow(max(dot(d, normalize(vec3(0.4,0.8,0.3))),0.0), 30.0); gl_FragColor = vec4(c,1.0);');
  const nightEnv = envFrom(renderer, 'float h = d.y*0.5+0.5; vec3 c = mix(vec3(0.01,0.02,0.06), vec3(0.08,0.16,0.45), smoothstep(0.3,1.0,h)); c += vec3(0.4,0.65,1.6)*smoothstep(0.985,1.0,sin(d.x*9.0+d.y*3.0)*0.5+0.5)*1.5; c += vec3(1.2,1.5,2.2)*pow(max(dot(d, normalize(vec3(-0.5,0.6,0.5))),0.0), 18.0); c += vec3(0.5,0.8,2.0)*pow(max(dot(d, normalize(vec3(0.6,0.3,0.6))),0.0), 10.0); gl_FragColor = vec4(c,1.0);');

  const hemi = new THREE.HemisphereLight(0xf3f5f8, 0x7a8089, 1.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(-3, 8, 6); scene.add(sun);

  /* --- Gelände Station A --- */
  const tg = new THREE.PlaneGeometry(90, 90, lite ? 110 : 180, lite ? 110 : 180); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), d = Math.hypot(x, z * 1.2);
    const flat = sm(2.6, 7, d);
    let h = (fbm(x * 0.12 + 4, z * 0.12) - 0.45) * 2.2 * flat;
    h += Math.pow(Math.max(0, fbm(x * 0.04 + 2, z * 0.04 + 7) - 0.4), 1.4) * 22 * sm(12, 26, d) * (z < 0 ? 1 : 0.3);
    h += (vn(x * 2.2, z * 2.2) - 0.5) * 0.08 + (vn(x * 7, z * 7) - 0.5) * 0.025;
    tp.setY(i, h);
  }
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: '#ffffff', map: gridTexture(), roughness: 1, metalness: 0 }));
  scene.add(terrain);
  const grid = new THREE.Mesh(tg, new THREE.ShaderMaterial({
    wireframe: true, transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position + vec3(0.0,0.012,0.0),1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'uniform float uT; varying vec3 vW; void main(){ float d = length(vW.xz); float scan = smoothstep(0.92,1.0, 1.0 - abs(fract(d*0.09 - uT*0.18) - 0.5)*2.0); float fade = 1.0 - smoothstep(5.0, 24.0, distance(vW, cameraPosition)); vec3 c = mix(vec3(0.42,0.46,0.52), vec3(1.0,0.86,0.52), scan); gl_FragColor = vec4(c, (scan*0.85) * fade); }'
  }));
  scene.add(grid);

  /* --- Monogramm aus Blöcken --- */
  const R = rng(5), blocks = [];
  const RING = 1.38;
  for (let row = 0; row < 2; row++) for (let i = 0; i < 26; i++) {
    const a = (i + row * 0.5) / 26 * Math.PI * 2, r = RING + (row ? -0.17 : 0.15);
    blocks.push({ gold: false, p: new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, row ? -0.07 : 0.07), rz: a + Math.PI / 2, s: new THREE.Vector3(0.34 + R() * 0.05, row ? 0.19 : 0.23, 0.4 + R() * 0.07) });
  }
  [[[-0.9, 0.92], [0, -1.02], 7], [[0.9, 0.92], [0, -1.02], 7], [[-0.46, 0.92], [0.02, -0.2], 4]].forEach(([a, b, n], ai) => {
    const dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; blocks.push({ gold: true, p: new THREE.Vector3(lerp(a[0], b[0], t), lerp(a[1], b[1], t), ai === 2 ? 0.14 : 0), rz: dir, s: new THREE.Vector3(0.26, ai === 2 ? 0.14 : 0.23, ai === 2 ? 0.22 : 0.36) }); }
  });
  blocks.forEach((b) => {
    const dv = new THREE.Vector3(R() - 0.5, R() * 0.7 + 0.15, R() - 0.5).normalize();
    b.from = b.p.clone().add(dv.clone().multiplyScalar(2.4 + R() * 2.8));
    b.fromRot = new THREE.Euler(R() * 6, R() * 6, R() * 6);
    b.boom = new THREE.Vector3(R() - 0.5, R() * 0.8 + 0.6, R() - 0.5).normalize().multiplyScalar(4 + R() * 6);
    b.delay = R() * 0.5; b.ph = R() * 6.28;
    b.jit = new THREE.Euler((R() - 0.5) * 0.14, (R() - 0.5) * 0.14, (R() - 0.5) * 0.1);
  });
  const rb = roundedBox(0.12, 3);
  const iceMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: codeTexture('#2b3139', '#8fa3ba', '#e2c27d', 2), roughness: 0.32, metalness: 0.35, envMapIntensity: 1.1, emissive: '#a9cfff', emissiveMap: glowCode(4), emissiveIntensity: 1.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: codeTexture('#d8ae63', '#4a320e', '#fff4d6', 8), roughness: 0.28, metalness: 0.85, envMapIntensity: 1.4, emissive: '#ffe2a6', emissiveMap: glowCode(9), emissiveIntensity: 0.7 });
  const iceList = blocks.filter((b) => !b.gold), goldList = blocks.filter((b) => b.gold);
  const iceMesh = new THREE.InstancedMesh(rb, iceMat, iceList.length), goldMesh = new THREE.InstancedMesh(rb, goldMat, goldList.length);
  iceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); goldMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const mono = new THREE.Group(); mono.position.copy(C); mono.add(iceMesh, goldMesh); scene.add(mono);
  const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  glowDisc.position.copy(C).add(new THREE.Vector3(0, 0, -0.18)); scene.add(glowDisc);
  const coreL = new THREE.PointLight(0xfff4e0, 0, 6, 1.5); coreL.position.copy(C).add(new THREE.Vector3(0, 0, 0.3)); scene.add(coreL);

  // Drahtgitter der Ziel-Form
  const wpos = [], eg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)).attributes.position, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v = new THREE.Vector3();
  blocks.forEach((b) => { e3.set(0, 0, b.rz); q.setFromEuler(e3); m4.compose(b.p, q, b.s); for (let i = 0; i < eg.count; i++) { v.fromBufferAttribute(eg, i).applyMatrix4(m4); wpos.push(v.x, v.y, v.z); } });
  const wireGeo = new THREE.BufferGeometry(); wireGeo.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
  const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const wire = new THREE.LineSegments(wireGeo, wireMat); wire.position.copy(C); scene.add(wire);

  // Plexus
  const PN = lite ? 70 : 120, pp = new Float32Array(PN * 3), pr = rng(9);
  for (let i = 0; i < PN; i++) { pp[i * 3] = (pr() - 0.5) * 11; pp[i * 3 + 1] = pr() * 6 - 0.6; pp[i * 3 + 2] = (pr() - 0.5) * 8; }
  const ls = [];
  for (let i = 0; i < PN; i++) for (let j = i + 1; j < PN; j++) { const dx = pp[i * 3] - pp[j * 3], dy = pp[i * 3 + 1] - pp[j * 3 + 1], dz = pp[i * 3 + 2] - pp[j * 3 + 2]; if (dx * dx + dy * dy + dz * dz < 3.2) ls.push(pp[i * 3], pp[i * 3 + 1], pp[i * 3 + 2], pp[j * 3], pp[j * 3 + 1], pp[j * 3 + 2]); }
  const plexGeo = new THREE.BufferGeometry(); plexGeo.setAttribute('position', new THREE.Float32BufferAttribute(ls, 3));
  const plexMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const plex = new THREE.LineSegments(plexGeo, plexMat); plex.position.set(0, 0, 0); scene.add(plex);


  /* Mini-Websites mit Domain für die Kristalle */
  const SITES = [
    { host: 'flux-energy · Projekt-Demo', tld: '.3d', title: 'Pure Energie.', sub: '3D-Dose, die sich beim Scrollen dreht.', c1: '#0e1a12', c2: '#b8f26b', acc: '#d6ff7a' },
    { host: 'bausqo.vercel.app', tld: '.app', title: 'Bauen mit System.', sub: 'Planung, Bau und Übergabe aus einer Hand.', c1: '#1a1712', c2: '#c9a45c', acc: '#f3e3bf' },
    { host: 'payment-k7rl.vercel.app', tld: '.app', title: 'Sicher bezahlen.', sub: 'Checkout mit Prüfung in Echtzeit.', c1: '#0c1428', c2: '#5e8be8', acc: '#9cc2ff' }
  ];
  const tokCache = {};
  function tokenTex(t) {
    if (tokCache[t]) return tokCache[t];
    const c = D.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    x.font = '700 64px "JetBrains Mono", ui-monospace, monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(t, 128, 66);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return (tokCache[t] = tx);
  }
  function screenFor(i) {
    const s = SITES[i], c = D.createElement('canvas'); c.width = 512; c.height = 326; const x = c.getContext('2d');
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    let f = 0;
    function draw() {
      f++;
      const g = x.createLinearGradient(0, 0, 512, 326); g.addColorStop(0, s.c1); g.addColorStop(1, '#05070c'); x.fillStyle = g; x.fillRect(0, 0, 512, 326);
      // Adressleiste mit Domain
      x.fillStyle = '#11151c'; x.fillRect(0, 0, 512, 34);
      ['#ff5f57', '#febc2e', '#28c840'].forEach((col, k) => { x.fillStyle = col; x.beginPath(); x.arc(16 + k * 16, 17, 5, 0, 7); x.fill(); });
      x.fillStyle = '#1f2530'; x.fillRect(74, 8, 330, 18);
      x.fillStyle = '#9fe0a8'; x.font = '600 12px "JetBrains Mono", monospace'; x.textBaseline = 'middle'; x.fillText('🔒', 80, 17);
      x.fillStyle = '#dfe6f2'; x.fillText('https://' + s.host, 96, 17);
      // Hero
      const glow = 0.5 + 0.5 * Math.sin(f * 0.08);
      x.fillStyle = s.c2; x.globalAlpha = 0.25 + glow * 0.2; x.beginPath(); x.arc(380 + Math.sin(f * 0.03) * 20, 170, 90, 0, 7); x.fill(); x.globalAlpha = 1;
      x.fillStyle = '#fff'; x.font = '800 34px Manrope, system-ui, sans-serif'; x.textBaseline = 'alphabetic'; x.fillText(s.title, 26, 120);
      x.fillStyle = '#c9d2e3'; x.font = '500 14px Manrope, system-ui, sans-serif'; x.fillText(s.sub, 26, 148);
      x.fillStyle = s.acc; x.fillRect(26, 166, 118, 30); x.fillStyle = '#0b0f16'; x.font = '700 13px Manrope, sans-serif'; x.fillText('Jetzt ansehen →', 38, 186);
      // laufender Code unten
      x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 222, 512, 104);
      x.font = '600 12px "JetBrains Mono", monospace';
      for (let l = 0; l < 6; l++) { const li = (Math.floor(f / 6) + l) % CODE.length; x.fillStyle = l === 5 ? s.acc : 'rgba(210,225,255,' + (0.35 + l * 0.1) + ')'; x.fillText((l === 5 ? '> ' : '  ') + CODE[li], 14, 240 + l * 16); }
      if (Math.floor(f / 15) % 2) { x.fillStyle = s.acc; x.fillRect(14 + 8 * (CODE[(Math.floor(f / 6) + 5) % CODE.length].length + 2), 312, 8, 13); }
      tx.needsUpdate = true;
    }
    draw();
    return { tx, draw, tld: s.tld };
  }

  /* --- Kristalle --- */
  const cryMat = new THREE.MeshPhysicalMaterial({ color: '#c8d0da', roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.58, flatShading: true, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.8 });
  const innerMat = new THREE.MeshStandardMaterial({ color: '#1b1f25', roughness: 0.35, metalness: 0.6 });
  const innerGold = new THREE.MeshStandardMaterial({ color: '#c9a45c', roughness: 0.35, metalness: 0.9 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const crystals = CRY.map((pos, ci) => {
    const g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position, rr = rng(40 + ci);
    const map = new Map();
    for (let k = 0; k < p.count; k++) {
      const key = p.getX(k).toFixed(3) + p.getY(k).toFixed(3) + p.getZ(k).toFixed(3);
      if (!map.has(key)) map.set(key, 0.8 + rr() * 0.45);
      const f = map.get(key); p.setXYZ(k, p.getX(k) * f * 1.35, p.getY(k) * f * 2.0, p.getZ(k) * f * 1.15);
    }
    g.computeVertexNormals();
    const grp = new THREE.Group();
    const inner = new THREE.Group();
    const scr = screenFor(ci);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.06, 0.06), innerMat);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.54, 0.98), new THREE.MeshBasicMaterial({ map: scr.tx, toneMapped: false }));
    face.position.z = 0.032;
    const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.032;
    inner.add(frame, face, back);
    inner.rotation.x = -0.12;
    grp.userData.screen = scr;
    // schwebende Code-Zeichen um den Bildschirm
    ['</>', 'www', scr.tld, '{ }', '=>'].forEach((t, k) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tokenTex(t), transparent: true, depthWrite: false, color: k % 2 ? 0x2b3138 : 0xb8904f }));
      sp.scale.set(0.42, 0.21, 1); sp.userData.orbit = { a: k / 5 * Math.PI * 2, r: 1.05 + (k % 2) * 0.25, y: (k - 2) * 0.28 };
      inner.add(sp);
    });
    grp.add(inner, new THREE.Mesh(g, cryMat), new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat));
    // Splitter
    for (let s = 0; s < 7; s++) { const sh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.08 + rr() * 0.14), cryMat); sh.position.set((rr() - 0.5) * 4, (rr() - 0.5) * 4, (rr() - 0.5) * 2); sh.userData.sp = rr() * 2; grp.add(sh); }
    grp.position.copy(pos); grp.userData.base = pos.clone();
    scene.add(grp); return grp;
  });

  /* --- Portal + Plattform Station R0 --- */
  const floorMat = new THREE.MeshStandardMaterial({ color: '#9da3ac', roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 96), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.copy(R0); scene.add(floor);
  const grooveMat = new THREE.MeshBasicMaterial({ color: 0xf2f5f9, transparent: true, opacity: 0.55 });
  [3.4, 5.2, 7.4, 10].forEach((r) => { const m = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.03, 128), grooveMat); m.rotation.x = -Math.PI / 2; m.position.copy(R0).add(new THREE.Vector3(0, 0.01, 0)); scene.add(m); });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.0, 0.22, 96), new THREE.MeshStandardMaterial({ color: '#b3b9c2', roughness: 0.6 })); plate.position.copy(R0).add(new THREE.Vector3(0, 0.11, 0)); scene.add(plate);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.045, 12, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false }));
  halo.rotation.x = Math.PI / 2; halo.position.copy(R0).add(new THREE.Vector3(0, 0.24, 0)); scene.add(halo);
  const haloL = new THREE.PointLight(0xe8f2ff, 0, 9, 1.6); haloL.position.copy(R0).add(new THREE.Vector3(0, 0.6, 0)); scene.add(haloL);
  const stoneTex = codeTexture('#2b3139', '#8fa3ba', '#e2c27d', 13); stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.repeat.set(3, 1);
  const stoneGlow = glowCode(15); stoneGlow.wrapS = stoneGlow.wrapT = THREE.RepeatWrapping; stoneGlow.repeat.set(3, 1);
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: stoneTex, emissive: '#a9cfff', emissiveMap: stoneGlow, emissiveIntensity: 1.1, roughness: 0.35, metalness: 0.35, transparent: true, opacity: 1 });
  const ringGroups = [{ r: 1.6, t: 0.2, n: 6 }, { r: 2.7, t: 0.28, n: 9 }, { r: 4.0, t: 0.34, n: 12 }].map((d, ri) => {
    const g = new THREE.Group(), arc = (Math.PI * 2 / d.n) * 0.84, geo = new THREE.TorusGeometry(d.r, d.t, 12, 20, arc);
    for (let i = 0; i < d.n; i++) { const m = new THREE.Mesh(geo, stoneMat); m.rotation.z = i / d.n * Math.PI * 2; m.userData.a = m.rotation.z + arc / 2; g.add(m); }
    const glow = new THREE.Mesh(new THREE.TorusGeometry(d.r + d.t + 0.04, 0.015, 8, 200), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false }));
    g.add(glow); g.userData = { glow, ri };
    g.rotation.x = -Math.PI / 2; g.position.copy(R0).add(new THREE.Vector3(0, 0.6 + ri * 0.25, 0));
    scene.add(g); return g;
  });

  /* --- Partikel: Kern → Figur (VONUMO-Zeichen) --- */
  const PC = lite ? 3800 : 9000;
  const pGeo = new THREE.BufferGeometry();
  const aCloud = new Float32Array(PC * 3), aFig = new Float32Array(PC * 3), aR = new Float32Array(PC);
  const rp = rng(77);
  for (let i = 0; i < PC; i++) {
    const u = rp() * 2 - 1, th = rp() * 6.283, r = Math.pow(rp(), 0.5) * 1.5, s = Math.sqrt(1 - u * u);
    aCloud[i * 3] = Math.cos(th) * s * r; aCloud[i * 3 + 1] = 1.2 + u * r * 0.35; aCloud[i * 3 + 2] = Math.sin(th) * s * r;
    aR[i] = rp();
    // Ersatzform (Torusknoten), bis das Zeichen geladen ist
    const t = rp() * 6.283, kr = 0.7 + 0.3 * Math.cos(3 * t);
    aFig[i * 3] = kr * Math.cos(2 * t) * 1.2; aFig[i * 3 + 1] = 2.6 + kr * Math.sin(2 * t) * 1.2; aFig[i * 3 + 2] = Math.sin(3 * t) * 0.4;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(aCloud, 3));
  pGeo.setAttribute('fig', new THREE.BufferAttribute(aFig, 3));
  pGeo.setAttribute('rv', new THREE.BufferAttribute(aR, 1));
  const ATL = glyphAtlas();
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uForm: { value: 0 }, uStream: { value: 0 }, uBurst: { value: 0 }, uOp: { value: 0 }, uSize: { value: (lite ? 80 : 92) * DPR }, uWhite: { value: 1 }, uAtl: { value: ATL.tx }, uGrid: { value: new THREE.Vector3(ATL.cols, ATL.rows, ATL.n) } },
    vertexShader: `
      attribute vec3 fig; attribute float rv;
      uniform float uT, uForm, uStream, uBurst, uSize;
      varying float vR; varying float vK; varying float vG;
      uniform vec3 uGrid;
      void main(){
        vG = mod(floor(rv*997.0 + floor(uT*(0.6+rv*1.5))*(1.0-uForm*0.9)), uGrid.z);
        vec3 c = position; float a = uT*0.35*(0.4+rv);
        c.xz = mat2(cos(a),-sin(a),sin(a),cos(a))*c.xz;
        c.y += sin(uT*1.3 + rv*40.0)*0.05;
        float k = smoothstep(rv*0.65, rv*0.65+0.35, uForm);
        vec3 f = fig + vec3(sin(uT*0.9+rv*20.0), cos(uT*1.1+rv*13.0), sin(uT*0.7+rv*7.0))*0.015;
        vec3 flow = vec3(1.6 + rv*2.6, 1.8 + rv*3.4, -0.6) * uStream * (1.0-k) + vec3(sin(uT*2.0+rv*30.0)*0.25, cos(uT*1.7+rv*21.0)*0.25, 0.0)*uStream*(1.0-k);
        vec3 p = mix(c, f, k) + flow;
        p += normalize(p - vec3(0.0,2.4,0.0) + 0.001) * uBurst * (2.0 + rv*6.0);
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.06 + rv*0.04) * (1.0 + (1.0-k)*0.4) / -mv.z * 10.0;
        vR = rv; vK = k;
      }`,
    fragmentShader: `
      uniform float uOp, uWhite; uniform sampler2D uAtl; uniform vec3 uGrid; varying float vR; varying float vK; varying float vG;
      void main(){
        float col0 = mod(vG, uGrid.x), row0 = floor(vG / uGrid.x);
        vec2 uv = vec2((col0 + gl_PointCoord.x) / uGrid.x, 1.0 - (row0 + gl_PointCoord.y) / uGrid.y);
        float a = texture2D(uAtl, uv).a;
        if (a < 0.08) discard;
        vec3 ink = vR > 0.86 ? vec3(0.72,0.56,0.31) : vec3(0.16,0.18,0.21);
        vec3 lit = vec3(0.93,0.96,1.0);
        vec3 col = mix(ink, lit, uWhite*(1.0-vK*0.95));
        gl_FragColor = vec4(col, a * uOp);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const parts = new THREE.Points(pGeo, pMat); parts.position.copy(R0); parts.frustumCulled = false; scene.add(parts);

  // VONUMO-Zeichen abtasten
  const img = new Image(); img.decoding = 'async';
  img.onload = () => {
    const S = 180, cv = D.createElement('canvas'); cv.width = cv.height = S; const cx = cv.getContext('2d', { willReadFrequently: true });
    const sc = Math.min(S / img.width, S / img.height); cx.drawImage(img, (S - img.width * sc) / 2, (S - img.height * sc) / 2, img.width * sc, img.height * sc);
    const data = cx.getImageData(0, 0, S, S).data, pts = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (y * S + x) * 4; if (data[i + 3] > 110) pts.push([x, y, (data[i] + data[i + 1] + data[i + 2]) / 765]); }
    if (pts.length < 50) return;
    const rr = rng(3), f = pGeo.attributes.fig;
    for (let i = 0; i < PC; i++) {
      const pt = pts[(rr() * pts.length) | 0];
      f.setXYZ(i, (pt[0] / S - 0.5) * 3.6 + (rr() - 0.5) * 0.02, 2.7 + (0.5 - pt[1] / S) * 3.6, (pt[2] - 0.5) * 0.7 + (rr() - 0.5) * 0.35);
    }
    f.needsUpdate = true;
  };
  img.src = '/assets/6925aa020ce5116c12186e64c389ccd4.webp';

  /* --- Schnee um die Kamera --- */
  const SN = lite ? 520 : 1400, sp = new Float32Array(SN * 3), sr = rng(21);
  for (let i = 0; i < SN; i++) { sp[i * 3] = (sr() - 0.5) * 24; sp[i * 3 + 1] = sr() * 12; sp[i * 3 + 2] = (sr() - 0.5) * 24; }
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const snowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uOp: { value: 0.7 }, uS: { value: 11 * DPR }, uAtl: { value: ATL.tx }, uGrid: { value: new THREE.Vector3(ATL.cols, ATL.rows, ATL.n) } },
    vertexShader: 'uniform float uT; uniform vec3 uCam; uniform float uS; uniform vec3 uGrid; varying float vA; varying float vG; varying float vC; void main(){ vG = mod(floor(fract(position.x*13.17)*997.0 + floor(uT*2.0 + position.z)), uGrid.z); vC = fract(position.z*7.31); vec3 p = position; p.y = mod(p.y - uT*0.35 - uCam.y + 6.0, 12.0) - 6.0 + uCam.y; p.x = mod(p.x + sin(uT*0.3 + position.z)*0.6 - uCam.x + 12.0, 24.0) - 12.0 + uCam.x; p.z = mod(p.z - uCam.z + 12.0, 24.0) - 12.0 + uCam.z; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uS*(0.7 + fract(position.x*7.3)*0.8) * 8.0 / max(-mv.z, 2.0); vA = smoothstep(16.0, 3.0, -mv.z); }',
    fragmentShader: 'uniform float uOp; uniform sampler2D uAtl; uniform vec3 uGrid; varying float vA; varying float vG; varying float vC; void main(){ float cx = mod(vG, uGrid.x), cy = floor(vG / uGrid.x); vec2 uv = vec2((cx + gl_PointCoord.x)/uGrid.x, 1.0 - (cy + gl_PointCoord.y)/uGrid.y); float a = texture2D(uAtl, uv).a; if (a < 0.06) discard; vec3 col = vC > 0.82 ? vec3(0.72,0.56,0.31) : vec3(0.2,0.23,0.27); gl_FragColor = vec4(col, a*vA*uOp); }'
  });
  const snow = new THREE.Points(snowGeo, snowMat); snow.frustumCulled = false; scene.add(snow);

  /* --- Nacht: Wasser, Felsen, Chrom-Bänder, Glasblase --- */
  const night = new THREE.Group(); night.position.copy(N0); scene.add(night);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: '#020713', roughness: 0.16, metalness: 0.92, envMap: nightEnv, envMapIntensity: 1.3 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.4; night.add(water);
  const rockMat = new THREE.MeshStandardMaterial({ color: '#0d1834', roughness: 0.62, metalness: 0.3, envMap: nightEnv, envMapIntensity: 1.2, flatShading: true });
  const rr2 = rng(61);
  [[-9, -6, 3.2], [-13, -12, 4.6], [-6.5, -9, 1.8], [9.5, -7, 3.6], [14, -13, 5], [6.8, -4.5, 1.4], [-16, -20, 6], [17, -22, 6.5], [-3.5, -16, 1.2], [4, -15, 1.6]].forEach(([x, z, s]) => {
    const g = new THREE.DodecahedronGeometry(1, 1), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const f = 0.75 + rr2() * 0.5; p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * (0.9 + rr2() * 0.6), p.getZ(k) * f); }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, rockMat); m.scale.set(s, s * (0.7 + rr2() * 0.7), s); m.position.set(x, -0.4 + s * 0.25, z); m.rotation.set(rr2(), rr2() * 6, rr2()); night.add(m);
  });
  const chrome = new THREE.MeshPhysicalMaterial({ color: '#2f5dff', metalness: 1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMap: nightEnv, envMapIntensity: 2.8, side: THREE.DoubleSide });
  function ribbon(pts, width, twist, segs) {
    const curve = new THREE.CatmullRomCurve3(pts.map((a) => new THREE.Vector3(a[0], a[1], a[2])));
    const fr = curve.computeFrenetFrames(segs, false), pos = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, c = curve.getPointAt(t), n = fr.normals[i], b = fr.binormals[i], ang = t * twist;
      const dir = n.clone().multiplyScalar(Math.cos(ang)).add(b.clone().multiplyScalar(Math.sin(ang)));
      const w = width * Math.sin(Math.PI * clamp(t * 1.15, 0, 1)) + 0.05;
      pos.push(c.x + dir.x * w, c.y + dir.y * w, c.z + dir.z * w, c.x - dir.x * w, c.y - dir.y * w, c.z - dir.z * w);
      if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return new THREE.Mesh(g, chrome);
  }
  const ribbons = [
    ribbon([[-14, 11, -8], [-9, 7, -5], [-5.5, 3.5, -3], [-8, 1.2, -1], [-12, 2.4, 0]], 1.1, 7, 220),
    ribbon([[-11, 9.5, -12], [-6.5, 6.5, -9], [-7.5, 3.2, -6], [-10, 0.9, -4]], 0.7, 5, 180),
    ribbon([[15, 10, -9], [10, 6.5, -6], [6.5, 4, -3.5], [9, 1.6, -1.5], [13, 0.6, 0]], 1.05, -6.5, 220),
    ribbon([[12, 12, -14], [8.2, 8, -10], [10.5, 4.6, -8]], 0.6, -4, 160)
  ];
  ribbons.forEach((r, i) => { r.userData.ph = i * 1.7; night.add(r); });
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.95, 48, 32), new THREE.MeshPhysicalMaterial({ color: '#b9d4ff', metalness: 0, roughness: 0, transparent: true, opacity: 0.28, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.6, envMap: nightEnv, envMapIntensity: 3, depthWrite: false }));
  bubble.position.set(5.6, 6.6, -6); night.add(bubble);
  const nl1 = new THREE.PointLight(0x3a6cff, 60, 30, 1.6); nl1.position.set(-5, 6, -2); night.add(nl1);
  const nl2 = new THREE.PointLight(0x6ab0ff, 50, 28, 1.6); nl2.position.set(6, 4, 1); night.add(nl2);

  /* --- Nachbearbeitung (Desktop) --- */
  let rt = null, post = null, postScene = null, postCam = null;
  if (!lite) {
    rt = new THREE.WebGLRenderTarget(4, 4, { samples: 4, type: THREE.HalfFloatType });
    post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      blending: THREE.NoBlending, depthTest: false, depthWrite: false,
      uniforms: { tD: { value: rt.texture }, uG: { value: 0 }, uT: { value: 0 }, uV: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }',
      fragmentShader: `
        uniform sampler2D tD; uniform float uG, uT, uV; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec2 uv = vUv, c = uv - 0.5;
          float band = step(0.982, h(vec2(floor(uv.y*40.0), floor(uT*16.0)))) * uG;
          uv.x += band * (h(vec2(uT, uv.y)) - 0.5) * 0.08;
          vec2 off = c * (0.0005 + uG*0.014) + vec2(uG*0.003, 0.0);
          vec4 r = texture2D(tD, uv + off), g = texture2D(tD, uv), b = texture2D(tD, uv - off);
          vec4 col = vec4(r.r, g.g, b.b, max(max(r.a,g.a),b.a));
          col.rgb += (h(uv*vec2(913.0,577.0)+uT) - 0.5) * 0.025 * col.a;
          col.rgb *= 1.0 - uV * smoothstep(0.35, 0.95, length(c));
          gl_FragColor = col;
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    }));
    post.frustumCulled = false; postScene = new THREE.Scene(); postScene.add(post); postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  function resize() {
    const w = W.innerWidth, h = W.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < 700 ? 54 : 38; camera.updateProjectionMatrix();
    if (rt) rt.setSize(Math.round(w * DPR), Math.round(h * DPR));
  }

  /* Blöcke aktualisieren */
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  function setBlocks(asm, boom, t) {
    let ii = 0, gi = 0;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i], k = ease((asm * 1.5 - b.delay) / 0.85), bo = ease((boom * 1.4 - b.delay * 0.5) / 0.9);
      _p.lerpVectors(b.from, b.p, k);
      _p.y += (1 - k) * Math.sin(t * 0.7 + b.ph) * 0.15;
      _p.addScaledVector(b.boom, bo);
      _e.set(lerp(b.fromRot.x, b.jit.x, k) + bo * b.ph, lerp(b.fromRot.y, b.jit.y, k) + bo * 2, lerp(b.fromRot.z, b.rz + b.jit.z, k));
      _q.setFromEuler(_e);
      _s.copy(b.s).multiplyScalar((0.2 + 0.8 * k) * (1 - bo * 0.5));
      _m.compose(_p, _q, _s);
      if (b.gold) goldMesh.setMatrixAt(gi++, _m); else iceMesh.setMatrixAt(ii++, _m);
    }
    iceMesh.instanceMatrix.needsUpdate = true; goldMesh.instanceMatrix.needsUpdate = true;
  }

  return { grid, renderer, scene, camera, resize, rt, post, postScene, postCam, setBlocks, mono, glowDisc, coreL, wireMat, plexMat, crystals, ringGroups, stoneMat, halo, haloL, pMat, parts, snowMat, night, ribbons, bubble, hemi, sun, blocks };
}

/* ================= Kamera-Pfad ================= */
const KF = [
  [0.00, [0, 2.15, 8.6], [0, 1.45, 0]],
  [0.06, [2.4, 2.6, 7.6], [0, 1.45, 0]],
  [0.12, [4.2, 3.4, 6.2], [0, 1.6, 0]],
  [0.17, [0.5, 7.5, 2], [0, 9, -10]],
  [0.20, [0, 8, -50.5], [0, 8, -60]],
  [0.25, [0, 8, -54.3], [0, 8, -60]],
  [0.29, [0, 8.4, -58], [0, 8.6, -70]],
  [0.32, [0, 8, -70.5], [0.3, 8, -80]],
  [0.36, [0, 8, -74.3], [0.3, 8, -80]],
  [0.40, [0, 8.4, -78], [0, 8.6, -90]],
  [0.43, [0, 8, -90.5], [-0.3, 8, -100]],
  [0.47, [0, 8, -94.3], [-0.3, 8, -100]],
  [0.50, [0.01, 18, -150], [0, 0, -150.02]],
  [0.56, [0.01, 9, -150], [0, 0, -150.02]],
  [0.62, [0, 3.2, -141], [0, 1.6, -150]],
  [0.70, [0, 2.4, -141.6], [0, 2.7, -150]],
  [0.80, [-0.8, 2.2, -142.2], [0, 2.8, -150]],
  [0.86, [0, 2.6, -143], [0, 2.7, -150]],
  [0.90, [0, 3.2, -246], [0, 2.4, -262]],
  [1.00, [0, 2.6, -249], [0, 3.0, -262]]
];
function camAt(p, outP, outL) {
  let i = 0; while (i < KF.length - 2 && p > KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1], t = sm(a[0], b[0], p);
  outP.set(lerp(a[1][0], b[1][0], t), lerp(a[1][1], b[1][1], t), lerp(a[1][2], b[1][2], t));
  outL.set(lerp(a[2][0], b[2][0], t), lerp(a[2][1], b[2][1], t), lerp(a[2][2], b[2][2], t));
  return t;
}
const CHAPTERS = [[0, 'VONUMO'], [0.17, 'PORTFOLIO'], [0.48, 'PORTAL'], [0.62, 'KONTAKT'], [0.87, 'STUDIO']];
const PROJ = [
  { id: 'PORTFOLIO_01', name: 'FLUX ENERGY', k: '3D', d: 'SCROLL-STORY', date: 'D 2026', url: '#studio' },
  { id: 'PORTFOLIO_02', name: 'BAUSQO', k: 'DOMAIN', d: 'bausqo.vercel.app', date: 'D 2026', url: 'https://bausqo.vercel.app' },
  { id: 'PORTFOLIO_03', name: 'PAYMENT CHECKOUT', k: 'DOMAIN', d: 'payment-k7rl.vercel.app', date: 'D 2026', url: 'https://payment-k7rl.vercel.app' }
];
const PICKS = [
  { t: 'Projekt starten', href: '#studio' },
  { t: 'E-Mail', href: 'mailto:almoakedmohammad@gmail.com' },
  { t: 'Anrufen', href: 'tel:+4915906712485' }
];

/* ================= Start ================= */
function start() {
  const S = build($('gl'));
  const html = D.documentElement;
  if (!S) { html.classList.add('nogl'); const ld = $('ld'); if (ld) ld.classList.add('out'); return; }
  S.resize();
  W.addEventListener('resize', () => S.resize());

  /* Ladebildschirm */
  const ld = $('ld'), code = $('ldCode');
  const codes = ['=--==++==-', '==+--=+=--', '+=-==-+--=', '-==+=--=+=', '==+-=-+==+'];
  let ci = 0; const codeT = setInterval(() => { scramble(code, codes[++ci % codes.length], 10); }, 320);
  let introAt = 0;
  setTimeout(() => {
    clearInterval(codeT); ld.classList.add('out');
    introAt = performance.now();
    D.querySelectorAll('.hud .scr').forEach((el, i) => setTimeout(() => scramble(el, el.getAttribute('data-t'), 50), 300 + i * 120));
  }, reduce ? 50 : 1250);

  /* HUD */
  const sound = makeSound(), snd = $('snd'), sndT = $('sndT');
  snd.addEventListener('click', () => { const on = sound.toggle(); snd.setAttribute('aria-pressed', on ? 'true' : 'false'); scramble(sndT, on ? 'Sound: An' : 'Sound: Aus', 20); });
  const chapN = $('chapN'), chapT = $('chapT'), chapP = $('chapP');
  const lab = $('cryLab'), pick = $('pick');
  let pickI = 0;
  function setPick(i) { pickI = (i + PICKS.length) % PICKS.length; const p = PICKS[pickI]; $('pickBtn').href = p.href; scramble($('pickT'), p.t, 22); $('pickN').textContent = (pickI + 1) + ' / ' + PICKS.length; }
  $('pickPrev').addEventListener('click', () => setPick(pickI - 1));
  $('pickNext').addEventListener('click', () => setPick(pickI + 1));
  $('pickBtn').addEventListener('click', (e) => { if (PICKS[pickI].href === '#studio') { e.preventDefault(); $('studio').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } });
  lab.addEventListener('click', (e) => { const href = lab.getAttribute('href'); if (href === '#studio') { e.preventDefault(); $('studio').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } });

  /* Block-Nummern */
  const tags = $('tags'), tagEls = [];
  [3, 9, 17, 24, 33, 41, 47].forEach((bi, i) => { const t = D.createElement('span'); t.className = 'tag'; t.textContent = String([39, 31, 23, 21, 44, 18, 52][i]); tags.appendChild(t); tagEls.push({ el: t, bi }); });

  let chap = -1, cryShown = -1, lastY = W.scrollY, vel = 0, glitch = 0, lastT = performance.now(), mx = 0, my = 0, smx = 0, smy = 0, visible = true;
  W.addEventListener('pointermove', (e) => { mx = e.clientX / W.innerWidth * 2 - 1; my = e.clientY / W.innerHeight * 2 - 1; }, { passive: true });
  D.addEventListener('visibilitychange', () => { visible = !D.hidden; if (visible) { lastT = performance.now(); requestAnimationFrame(loop); } });
  const camP = new THREE.Vector3(), camL = new THREE.Vector3(), curP = new THREE.Vector3(0, 2.15, 8.6), curL = new THREE.Vector3(0, 1.45, 0);
  const fogC = new THREE.Color(), bgC = new THREE.Color(), v3 = new THREE.Vector3();
  const story = $('story');

  function loop(now) {
    if (!visible) return;
    const t = now / 1000, dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    const vh = W.innerHeight, y = W.scrollY;
    const storyLen = Math.max(1, story.offsetHeight - vh * 0.15);
    const p = clamp(y / storyLen, 0, 1);
    const after = clamp((y - storyLen) / vh, 0, 1.5);
    vel = lerp(vel, (y - lastY) / Math.max(dt, 0.001), 0.12); lastY = y;
    html.classList.toggle('scrolled', y > 30);
    const nightF = sm(0.865, 0.905, p);
    html.classList.toggle('night', p > 0.88);

    /* Kapitel */
    let c = 0; while (c < CHAPTERS.length - 1 && p >= CHAPTERS[c + 1][0]) c++;
    if (c !== chap) { chap = c; scramble(chapN, String(c + 1).padStart(2, '0'), 14); scramble(chapT, CHAPTERS[c][1], 24); if (now - introAt > 800) glitch = Math.max(glitch, 0.9); }
    chapP.textContent = String(Math.round(p * 100)).padStart(3, '0') + '%';

    /* Intro: Drahtgitter → Blöcke */
    const it = introAt ? (now - introAt) / 1000 : 0;
    const asm = reduce ? 1 : ease((it - 0.9) / 2.6);
    const wireA = reduce ? 0 : (introAt ? sm(0, 0.4, it) * (1 - sm(2.2, 3.4, it)) : 0);
    const boom = sm(0.115, 0.175, p);
    S.setBlocks(asm, boom, t);
    S.mono.rotation.y = Math.sin(t * 0.25) * 0.08 + smx * 0.1;
    S.mono.visible = p < 0.2;
    S.wireMat.opacity = wireA * 0.9;
    S.plexMat.opacity = (wireA * 0.55 + (1 - sm(0, 0.05, p)) * 0) * (1 - boom);
    const glow = sm(0.6, 1, asm) * (1 - boom);
    S.glowDisc.material.opacity = glow * (0.55 + 0.1 * Math.sin(t * 1.6));
    S.coreL.intensity = glow * 7;

    /* Nummern an Blöcken */
    const showTags = asm > 0.98 && p < 0.1 && !reduce;
    tagEls.forEach((o, i) => {
      if (!showTags) { o.el.style.opacity = '0'; return; }
      const b = S.blocks[o.bi]; v3.copy(b.p).applyMatrix4(S.mono.matrixWorld).project(S.camera);
      o.el.style.transform = 'translate3d(' + ((v3.x * 0.5 + 0.5) * W.innerWidth).toFixed(1) + 'px,' + ((-v3.y * 0.5 + 0.5) * vh).toFixed(1) + 'px,0)';
      o.el.style.opacity = (0.75 * (1 - sm(0.07, 0.1, p))).toFixed(2);
    });

    /* Kristalle */
    let focus = -1;
    S.crystals.forEach((g, i) => {
      const c0 = [0.2, 0.32, 0.43][i], loc = (p - c0) / 0.1;
      g.visible = loc > -0.6 && loc < 1.6;
      if (!g.visible) return;
      const b = g.userData.base;
      const up = sm(0.75, 1.3, loc);
      g.position.set(b.x + Math.sin(t * 0.5 + i) * 0.1, b.y + Math.sin(t * 0.8 + i) * 0.12 + up * 7, b.z);
      g.rotation.y = t * 0.18 + i + loc * 0.6; g.rotation.z = Math.sin(t * 0.4 + i) * 0.08;
      g.children.forEach((ch) => { if (ch.userData.sp) { ch.rotation.x = t * ch.userData.sp; ch.rotation.y = t * ch.userData.sp * 0.7; } });
      const inner = g.children[0];
      inner.children.forEach((ch) => { const o = ch.userData.orbit; if (o) { const a = o.a + t * 0.6; ch.position.set(Math.cos(a) * o.r, o.y + Math.sin(t + o.a) * 0.08, Math.sin(a) * o.r * 0.6); } });
      inner.rotation.y = -g.rotation.y + Math.sin(t * 0.5 + i) * 0.35;
      if (loc > -0.3 && loc < 1.1 && ((now / 60) | 0) % 2 === 0) g.userData.screen.draw();
      if (loc > 0.25 && loc < 0.85) focus = i;
    });
    if (focus !== cryShown) {
      cryShown = focus;
      if (focus >= 0) {
        const pr = PROJ[focus]; lab.classList.add('on'); lab.href = pr.url; lab.target = pr.url.charAt(0) === '#' ? '_self' : '_blank';
        if (pr.url.charAt(0) !== '#') lab.rel = 'noopener';
        scramble($('clId'), pr.id, 22); scramble($('clName'), pr.name, 30); scramble($('clK'), pr.k, 18); scramble($('clData'), pr.d, 26); scramble($('clDate'), pr.date, 20);
      } else lab.classList.remove('on');
    }

    /* Portal-Ringe und Partikel */
    const ringIn = sm(0.47, 0.56, p), ringFlat = sm(0.6, 0.66, p);
    S.ringGroups.forEach((g) => {
      const ri = g.userData.ri;
      g.visible = p > 0.44 && p < 0.9;
      g.rotation.z = t * (ri % 2 ? -0.1 : 0.07) * (1 + ri * 0.4);
      g.position.y = R0.y + lerp(0.6 + ri * 0.25, 0.05, ringFlat);
      g.scale.setScalar(lerp(1, 1.35 + ri * 0.35, ringFlat));
      g.children.forEach((m) => {
        if (m === g.userData.glow) { m.material.opacity = ringIn * (1 - ringFlat) * (0.6 + 0.4 * Math.sin(t * 2 + ri)); return; }
        const off = (1 - ringIn) * (3 + ri * 1.5);
        m.position.set(Math.cos(m.userData.a) * off, Math.sin(m.userData.a) * off, (1 - ringIn) * (ri - 1) * 2);
      });
    });
    S.stoneMat.opacity = ringIn;
    const plat = sm(0.6, 0.68, p) * (1 - nightF);
    S.halo.material.opacity = plat * (0.8 + 0.2 * Math.sin(t * 2));
    S.haloL.intensity = plat * 14;
    const pOn = sm(0.48, 0.53, p) * (1 - sm(0.86, 0.9, p));
    S.parts.visible = pOn > 0.01;
    S.pMat.uniforms.uT.value = t;
    S.pMat.uniforms.uOp.value = pOn;
    S.pMat.uniforms.uWhite.value = 1 - sm(0.62, 0.7, p);
    S.pMat.uniforms.uForm.value = sm(0.64, 0.78, p);
    S.pMat.uniforms.uStream.value = sm(0.6, 0.66, p) * (1 - sm(0.76, 0.84, p)) + sm(0.82, 0.86, p) * 0.6;
    S.pMat.uniforms.uBurst.value = sm(0.84, 0.88, p);

    /* Kontakt-Auswahl */
    pick.classList.toggle('on', p > 0.7 && p < 0.86);

    /* Nacht */
    S.night.visible = p > 0.84;
    S.ribbons.forEach((r, i) => { r.rotation.y = Math.sin(t * 0.22 + r.userData.ph) * 0.06; r.rotation.z = Math.sin(t * 0.17 + r.userData.ph) * 0.03; r.position.y = Math.sin(t * 0.35 + r.userData.ph) * 0.15; });
    S.bubble.position.y = 6.6 + Math.sin(t * 0.7) * 0.25; S.bubble.rotation.y = t * 0.2;
    fogC.copy(GREY).lerp(NAVY, nightF);
    S.scene.fog.color.copy(fogC);
    S.scene.fog.near = lerp(6, 14, nightF); S.scene.fog.far = lerp(26, 70, nightF);
    S.hemi.intensity = lerp(1.3, 0.25, nightF); S.sun.intensity = lerp(1.5, 0.2, nightF);
    S.snowMat.uniforms.uOp.value = 0.7 * (1 - nightF);
    bgC.copy(fogC);
    html.style.background = nightF > 0.001 ? 'radial-gradient(ellipse 70% 55% at 50% 38%, ' + new THREE.Color().copy(bgC).lerp(new THREE.Color('#163a8a'), nightF * 0.55).getStyle() + ', #' + bgC.getHexString() + ' 70%)' : '#' + bgC.getHexString();

    /* Kamera */
    camAt(p, camP, camL);
    if (W.innerWidth < 700) { camP.add(v3.subVectors(camP, camL).normalize().multiplyScalar(p < 0.2 ? 3.2 : 1.2)); }
    if (after > 0) { camP.y += after * 0.6; camL.y += after * 0.9; }
    const k = 1 - Math.pow(0.0006, dt);
    const jump = curP.distanceTo(camP) > 25;
    if (jump) { curP.copy(camP); curL.copy(camL); } else { curP.lerp(camP, k); curL.lerp(camL, k); }
    smx = lerp(smx, mx, 0.04); smy = lerp(smy, my, 0.04);
    S.camera.position.set(curP.x + smx * 0.3, curP.y - smy * 0.15, curP.z);
    S.camera.lookAt(curL);
    S.snowMat.uniforms.uT.value = t; S.snowMat.uniforms.uCam.value.copy(S.camera.position);
    S.grid.material.uniforms.uT.value = t; S.grid.visible = p < 0.2;

    /* Rendern */
    glitch = Math.max(0, glitch - dt * 1.5);
    const g2 = reduce || W.__calm ? 0 : clamp(glitch * 0.75 + Math.min(Math.abs(vel) / 7000, 0.3) + (jump ? 1 : 0), 0, 1);
    if (S.rt) {
      S.renderer.setRenderTarget(S.rt); S.renderer.clear(); S.renderer.render(S.scene, S.camera);
      S.renderer.setRenderTarget(null); S.renderer.clear();
      S.post.material.uniforms.uG.value = g2; S.post.material.uniforms.uT.value = t; S.post.material.uniforms.uV.value = nightF * 0.6;
      S.renderer.render(S.postScene, S.postCam);
    } else S.renderer.render(S.scene, S.camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
