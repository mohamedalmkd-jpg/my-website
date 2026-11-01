/*
 * VONUMO – blaue 3D-Welt beim Scrollen
 * Glas-Würfel schweben und bilden einen Würfel-Block → Zoom in einen Würfel → Lichtstern →
 * Warp-Tunnel → Lichtstrahl und Dashboard → isometrische Würfel-Landschaft → Pixel-Mosaik →
 * leuchtender Ring mit Kontaktformular → Nacht-Szene mit Chrom-Bändern für das Studio.
 */
import * as THREE from './vendor/three.module.min.js';

const D = document, W = window;
const ADD = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };
const $ = (id) => D.getElementById(id);
const reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = W.matchMedia && W.matchMedia('(hover: none), (pointer: coarse)').matches;
const ios = /iP(hone|ad|od)/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const lite = coarse || ios || (navigator.deviceMemory && navigator.deviceMemory <= 4);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vn(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function envFrom(renderer, frag) {
  const pm = new THREE.PMREMGenerator(renderer), sc = new THREE.Scene();
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ vec3 d = vP; ' + frag + ' }'
  })));
  const t = pm.fromScene(sc, 0.02).texture; pm.dispose(); return t;
}
function makeSound() {
  let ctx = null, master = null, on = false;
  function start() {
    const AC = W.AudioContext || W.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    [55, 82.4, 110, 164.8, 220].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = i > 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 2) * 4; g.gain.value = 0.05 / (i + 1); o.connect(g); g.connect(master); o.start(); });
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 0.08; lfo.connect(lg); lg.connect(master.gain); lfo.start();
    return true;
  }
  return { toggle() { if (!ctx && !start()) return false; on = !on; if (ctx.state === 'suspended') ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(on ? 0.3 : 0, ctx.currentTime + 0.8); return on; } };
}
function starTex() {
  const c = D.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.08, 'rgba(210,228,255,.9)'); g.addColorStop(0.3, 'rgba(80,140,255,.25)'); g.addColorStop(1, 'rgba(20,60,200,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.globalCompositeOperation = 'lighter';
  [[0, 1], [1, 0]].forEach(([a, b]) => { const lg = x.createLinearGradient(128 - 128 * a, 128 - 128 * b, 128 + 128 * a, 128 + 128 * b); lg.addColorStop(0, 'rgba(120,170,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(120,170,255,0)'); x.fillStyle = lg; if (a) x.fillRect(0, 124, 256, 8); else x.fillRect(124, 0, 8, 256); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex() {
  const c = D.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(160,200,255,.5)'); g.addColorStop(1, 'rgba(40,90,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ================= Design-Objekte ================= */
const NAVY = new THREE.Color('#030a24');
const N0 = new THREE.Vector3(0, 0, -260);
const P_PEN = new THREE.Vector3(0, 0, -40), P_TYPE = new THREE.Vector3(0, 0, -70), P_BEAM = new THREE.Vector3(0, 0, -110), P_COMP = new THREE.Vector3(0, 0, -150);
const P_MOOD = new THREE.Vector3(70, 0, 0), P_DEV = new THREE.Vector3(140, 0, 0), P_RING = new THREE.Vector3(210, 0, 0);

function cv(w, h, draw) { const c = D.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData = { c, x, draw }; return t; }
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
const FONT = (w, s, f) => w + ' ' + s + 'px ' + (f === 'serif' ? '"Cormorant Garamond", Georgia, serif' : f === 'mono' ? '"JetBrains Mono", monospace' : 'Manrope, system-ui, sans-serif');

/* Glas-Panel mit Kantenlicht (Kantenbreite in Welt-Einheiten) */
function panelMat(opt) {
  opt = opt || {};
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: true,
    uniforms: { uSize: { value: new THREE.Vector3(1, 1, 1) }, uHot: { value: opt.hot || 0 }, uO: { value: 1 }, uMap: { value: opt.map || null }, uHas: { value: opt.map ? 1 : 0 }, uTint: { value: new THREE.Color(opt.tint || '#0a1d5c') }, uEdge: { value: opt.edge == null ? 1 : opt.edge }, uFog: { value: NAVY.clone() } },
    vertexShader: `varying vec3 vN, vV, vL; varying float vD;
      void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); vL = position; vD = length(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 uSize, uTint, uFog; uniform float uHot, uO, uHas, uEdge; uniform sampler2D uMap; varying vec3 vN, vV, vL; varying float vD;
      void main(){
        vec3 p = vL * uSize, hf = uSize * 0.5, d = hf - abs(p);
        float mn = min(d.x, min(d.y, d.z)), mx = max(d.x, max(d.y, d.z)), mid = d.x + d.y + d.z - mn - mx;
        float edge = (1.0 - smoothstep(0.0, 0.035, mid)) * uEdge;
        float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
        vec3 col = uTint * (0.35 + 0.65 * max(dot(normalize(vN), normalize(vec3(0.3,0.8,0.6))), 0.0)) + fres * vec3(0.12,0.3,0.9) * 0.7;
        if (uHas > 0.5 && vL.z > 0.49) { vec3 tx = texture2D(uMap, vL.xy + 0.5).rgb; col = mix(col, tx, 0.96); }
        col += edge * vec3(0.45, 0.68, 1.0) * 1.2;
        col = mix(col, vec3(0.82,0.9,1.0), uHot * 0.85);
        col = mix(col, uFog, smoothstep(18.0, 60.0, vD) * 0.9);
        gl_FragColor = vec4(col, uO);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}
function panel(w, h, d, opt) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), panelMat(opt));
  m.scale.set(w, h, d); m.material.uniforms.uSize.value.set(w, h, d); return m;
}
function setO(obj, o) { obj.traverse((n) => { if (n.material) { if (n.material.uniforms && n.material.uniforms.uO) n.material.uniforms.uO.value = o; else if ('opacity' in n.material) { n.material.opacity = o * (n.userData.baseO == null ? 1 : n.userData.baseO); n.material.transparent = true; } } }); obj.visible = o > 0.01; }

function build(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  const DPR = Math.min(W.devicePixelRatio || 1, lite ? 1.3 : 1.6);
  renderer.setPixelRatio(DPR); renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(NAVY.clone(), 14, 70);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 220);
  const nightEnv = envFrom(renderer, 'float h = d.y*0.5+0.5; vec3 c = mix(vec3(0.01,0.02,0.06), vec3(0.08,0.16,0.45), smoothstep(0.3,1.0,h)); c += vec3(0.4,0.65,1.6)*smoothstep(0.985,1.0,sin(d.x*9.0+d.y*3.0)*0.5+0.5)*1.5; c += vec3(1.2,1.5,2.2)*pow(max(dot(d, normalize(vec3(-0.5,0.6,0.5))),0.0), 18.0); c += vec3(0.5,0.8,2.0)*pow(max(dot(d, normalize(vec3(0.6,0.3,0.6))),0.0), 10.0); gl_FragColor = vec4(c,1.0);');
  scene.add(new THREE.HemisphereLight(0x9fbfff, 0x050a20, 0.4));

  /* ---- 1) Website-Fenster in Ebenen ---- */
  const artTex = cv(512, 440, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b2a8c'); g.addColorStop(1, '#030a24'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    [[180, 180, 170, '#3b7bff'], [330, 260, 150, '#7a5cff'], [250, 140, 90, '#9fd0ff']].forEach(([cx, cy, r, c]) => { const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(0, 0, w, h); });
    x.strokeStyle = 'rgba(220,235,255,.85)'; x.lineWidth = 3; x.beginPath(); x.arc(256, 220, 120, 0, 6.283); x.stroke(); });
  const headTex = cv(512, 300, (x, w, h) => { x.fillStyle = '#071334'; x.fillRect(0, 0, w, h); x.fillStyle = '#9cc2ff'; x.font = FONT(600, 18, 'mono'); x.fillText('DIGITALAGENTUR', 26, 50);
    x.fillStyle = '#fff'; x.font = FONT(300, 62); x.fillText('Ihre Marke', 22, 130); x.font = 'italic 400 62px "Cormorant Garamond", Georgia, serif'; x.fillStyle = '#cfe0ff'; x.fillText('mit Tiefe.', 22, 196);
    x.fillStyle = 'rgba(200,215,245,.45)'; [236, 258].forEach((y, i) => x.fillRect(24, y, i ? 280 : 400, 9)); });
  const navTex = cv(1024, 64, (x, w, h) => { x.fillStyle = '#081640'; x.fillRect(0, 0, w, h); x.fillStyle = '#cfe0ff'; x.beginPath(); x.arc(34, 32, 11, 0, 6.3); x.fill(); x.font = FONT(700, 22); x.fillText('VONUMO', 56, 40);
    x.fillStyle = 'rgba(210,225,255,.75)'; x.font = FONT(500, 20); ['Leistungen', 'Projekte', 'Kontakt'].forEach((t, i) => x.fillText(t, 560 + i * 140, 40)); x.fillStyle = '#2f6bff'; rr(x, 900, 14, 100, 36, 18); x.fill(); });
  const btnTex = cv(512, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#5a95ff'); g.addColorStop(1, '#1d55e6'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = FONT(700, 46); x.textAlign = 'center'; x.fillText('Projekt starten →', w / 2, 80); });
  const site = new THREE.Group(); scene.add(site);
  const L = [
    { m: panel(3.4, 2.15, 0.05, { tint: '#050f33' }), z: 0, name: 'Hintergrund' },
    { m: panel(3.1, 0.2, 0.03, { map: navTex }), z: 1, y: 0.86, name: 'Navigation' },
    { m: panel(1.45, 1.25, 0.03, { map: artTex }), z: 2, x: 0.78, y: -0.12, name: 'Bild' },
    { m: panel(1.45, 0.85, 0.03, { map: headTex }), z: 3, x: -0.8, y: 0.05, name: 'Typografie' },
    { m: panel(0.78, 0.2, 0.03, { map: btnTex, hot: 0 }), z: 4, x: -1.13, y: -0.62, name: 'Interaktion' }
  ];
  L.forEach((l) => { l.m.position.set(l.x || 0, l.y || 0, 0); site.add(l.m); });
  const cursor = new THREE.Sprite(new THREE.SpriteMaterial({ map: cv(64, 64, (x) => { x.fillStyle = '#fff'; x.strokeStyle = '#0a1838'; x.lineWidth = 3; x.beginPath(); x.moveTo(10, 6); x.lineTo(10, 52); x.lineTo(22, 40); x.lineTo(31, 58); x.lineTo(38, 54); x.lineTo(29, 37); x.lineTo(46, 37); x.closePath(); x.fill(); x.stroke(); }), transparent: true, depthTest: false }));
  cursor.scale.setScalar(0.22); site.add(cursor);

  /* ---- 2) Zeichenstift: Bézierkurve ---- */
  const pen = new THREE.Group(); pen.position.copy(P_PEN); scene.add(pen);
  const curve = new THREE.CurvePath();
  const A0 = new THREE.Vector3(-2.6, -0.6, 0), C0 = new THREE.Vector3(-1.6, 1.4, 0), C1 = new THREE.Vector3(-0.6, -1.5, 0), A1 = new THREE.Vector3(0.3, 0.1, 0), C2 = new THREE.Vector3(1.2, 1.7, 0), C3 = new THREE.Vector3(1.9, -1.0, 0), A2 = new THREE.Vector3(2.7, 0.5, 0);
  curve.add(new THREE.CubicBezierCurve3(A0, C0, C1, A1)); curve.add(new THREE.CubicBezierCurve3(A1, A1.clone().multiplyScalar(2).sub(C1), C3, A2));
  const tubeGeo = new THREE.TubeGeometry(curve, 400, 0.02, 8, false);
  const tube = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({ color: 0xcfe0ff, toneMapped: false, transparent: true }));
  pen.add(tube);
  const glowTube = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, 0.07, 8, false), new THREE.MeshBasicMaterial({ color: 0x2f6bff, transparent: true, opacity: 0.25, depthWrite: false, toneMapped: false }));
  glowTube.userData.baseO = 0.25; pen.add(glowTube);
  const anchors = [A0, A1, A2].map((p) => { const a = panel(0.14, 0.14, 0.03, { hot: 0.9 }); a.position.copy(p); pen.add(a); return a; });
  const handleMat = new THREE.LineBasicMaterial({ color: 0x8fb6ff, transparent: true });
  const hp = [A0, C0, A1, C1, A1, A1.clone().multiplyScalar(2).sub(C1), A2, C3];
  pen.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(hp), handleMat));
  [C0, C1, A1.clone().multiplyScalar(2).sub(C1), C3].forEach((p) => { const s = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true })); s.position.copy(p); pen.add(s); });
  const nib = new THREE.Sprite(new THREE.SpriteMaterial({ map: cv(64, 64, (x) => { x.translate(32, 32); x.rotate(-0.6); x.fillStyle = '#e8f0ff'; x.beginPath(); x.moveTo(0, -26); x.lineTo(12, 6); x.lineTo(0, 26); x.lineTo(-12, 6); x.closePath(); x.fill(); x.fillStyle = '#0a1838'; x.beginPath(); x.arc(0, 4, 4, 0, 6.3); x.fill(); }), transparent: true, depthTest: false }));
  nib.scale.setScalar(0.4); nib.center.set(0.5, 0.1); pen.add(nib);

  /* ---- 3) Typografie ---- */
  const typeG = new THREE.Group(); typeG.position.copy(P_TYPE); scene.add(typeG);
  const glyphs = [['Aa', 'serif'], ['Ag', 'sans'], ['&', 'serif'], ['Rg', 'sans'], ['fi', 'serif'], ['Ä', 'sans'], ['Wy', 'serif'], ['ß', 'serif']].map(([t, f], i) => {
    const tex = cv(512, 512, (x, w, h) => { x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = f === 'serif' ? 'italic 400 300px "Cormorant Garamond", Georgia, serif' : FONT(300, 280); x.fillText(t, w / 2, h / 2 + 10); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: i % 3 === 0 ? 0xcfe0ff : 0x6f9cff, toneMapped: false, side: THREE.DoubleSide }));
    const a = i / 8 * 6.283; m.userData = { a, r: 1.6 + (i % 3) * 1.2, z0: -i * 5, s: 1.3 + (i % 4) * 0.5 };
    typeG.add(m); return m;
  });
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(() => { [artTex, headTex, navTex, btnTex].concat(glyphs.map((g) => g.material.map)).forEach((t) => { const u = t.userData; u.x.clearRect(0, 0, u.c.width, u.c.height); u.draw(u.x, u.c.width, u.c.height); t.needsUpdate = true; }); });

  /* ---- 4) Lichtstrahl fürs Dashboard ---- */
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, ...ADD, uniforms: { uO: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uO, uT; varying vec2 vU; void main(){ float x = abs(vU.x-0.5)*2.0; float core = exp(-x*x*180.0); float halo = exp(-x*x*9.0)*0.35; float fall = smoothstep(0.0,0.35,vU.y); float fl = 0.9 + 0.1*sin(uT*7.0 + vU.y*30.0); vec3 c = vec3(0.75,0.87,1.0)*core*1.6 + vec3(0.2,0.45,1.0)*halo; gl_FragColor = vec4(c*fall*fl*uO, 1.0); }'
  }));
  beam.scale.set(9, 46, 1); beam.position.copy(P_BEAM).add(new THREE.Vector3(0, 13, 0)); scene.add(beam);

  /* ---- 5) UI-Komponenten ---- */
  const comp = new THREE.Group(); comp.position.copy(P_COMP); scene.add(comp);
  const toggle = new THREE.Group(); toggle.add(panel(0.9, 0.44, 0.08, { tint: '#123a9c' })); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 16), new THREE.MeshBasicMaterial({ color: 0xe8f0ff, toneMapped: false, transparent: true })); knob.position.z = 0.06; toggle.add(knob);
  toggle.position.set(-5.4, 0.6, 0); comp.add(toggle);
  const slider = new THREE.Group(); slider.add(panel(1.6, 0.06, 0.04, { tint: '#16307a' })); const sk = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 12), new THREE.MeshBasicMaterial({ color: 0x9cc2ff, toneMapped: false, transparent: true })); sk.position.z = 0.05; slider.add(sk);
  slider.position.set(4.9, 0.9, 0.5); comp.add(slider);
  const swatches = new THREE.Group(); ['#2f6bff', '#58a8ff', '#cfe0ff', '#c9a45c', '#0b1d5c'].forEach((c, i) => { const s = new THREE.Mesh(new THREE.CircleGeometry(0.16, 32), new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true })); s.position.x = i * 0.42; swatches.add(s); });
  swatches.position.set(3.9, -2.5, -0.5); comp.add(swatches);
  const check = panel(0.4, 0.4, 0.06, { hot: 0.85 }); check.position.set(-5.0, -2.3, 0.3); comp.add(check);

  /* ---- 6) Moodboard / Design-System mit Auswahlrahmen ---- */
  const mood = new THREE.Group(); mood.position.copy(P_MOOD); scene.add(mood);
  const moodTex = [
    cv(256, 256, (x) => { ['#2f6bff', '#58a8ff', '#cfe0ff', '#c9a45c', '#0b1d5c', '#ffffff'].forEach((c, i) => { x.fillStyle = c; x.fillRect((i % 3) * 85, Math.floor(i / 3) * 128, 85, 128); }); }),
    cv(256, 256, (x) => { x.fillStyle = '#071334'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#fff'; x.font = 'italic 400 130px "Cormorant Garamond", serif'; x.fillText('Aa', 30, 160); x.font = FONT(500, 16, 'mono'); x.fillStyle = '#9cc2ff'; x.fillText('Cormorant · 64', 30, 210); }),
    cv(256, 256, (x) => { x.fillStyle = '#0a1d5c'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#2f6bff'; rr(x, 40, 90, 176, 50, 25); x.fill(); x.fillStyle = '#fff'; x.font = FONT(700, 20); x.fillText('Button', 96, 122); x.strokeStyle = '#9cc2ff'; x.lineWidth = 2; rr(x, 40, 160, 176, 50, 25); x.stroke(); }),
    cv(256, 256, (x) => { x.fillStyle = '#061234'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#58a8ff'; x.lineWidth = 4; x.beginPath(); x.moveTo(20, 200); [60, 170, 100, 180, 140, 110, 180, 120, 230, 50].reduce((a, v, i, arr) => { if (i % 2) x.lineTo(arr[i - 1], v); return a; }, 0); x.stroke(); }),
    artTex,
    cv(256, 256, (x) => { x.fillStyle = '#081640'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 9; i++) { x.fillStyle = i % 4 ? '#163a9c' : '#58a8ff'; rr(x, 24 + (i % 3) * 76, 24 + Math.floor(i / 3) * 76, 56, 56, 12); x.fill(); } }),
    cv(256, 256, (x) => { x.fillStyle = '#0b1d5c'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#cfe0ff'; x.font = FONT(300, 40); x.fillText('Raster', 26, 70); x.strokeStyle = 'rgba(160,190,255,.4)'; for (let i = 0; i < 6; i++) { x.strokeRect(26 + i * 36, 100, 28, 130); } }),
    headTex
  ];
  const tiles = [];
  const layout = [[0, 0, 2.2, 1.5], [2.4, 0, 1.5, 1.5], [4.1, 0, 2.2, 2.4], [0, 1.7, 1.5, 2.1], [1.7, 1.7, 2.2, 1.4], [-2.5, 0.6, 2.3, 1.6], [-2.5, 2.4, 2.3, 1.4], [1.7, 3.3, 2.2, 1.0], [4.1, 2.6, 2.2, 1.5], [-2.5, -1.4, 2.3, 1.8], [0, -1.6, 3.9, 1.4], [4.1, -1.8, 2.2, 1.6]];
  layout.forEach(([x, z, w, d], i) => {
    const t = panel(w, d, 0.06, { map: moodTex[i % moodTex.length], tint: '#061238' });
    t.rotation.x = -Math.PI / 2; t.position.set(x + w / 2 - 1.8, 0, z + d / 2 - 1.5); t.userData = { base: t.position.y, ph: i * 0.9 };
    mood.add(t); tiles.push(t);
  });
  const sel = tiles[4];
  const selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.36, 1.56)), new THREE.LineBasicMaterial({ color: 0x58a8ff, transparent: true, toneMapped: false }));
  selBox.rotation.x = -Math.PI / 2; mood.add(selBox);
  const handles = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => { const h = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false })); h.rotation.x = -Math.PI / 2; h.userData = { sx, sz }; mood.add(h); return h; });
  const frameLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: cv(256, 48, (x) => { x.fillStyle = '#58a8ff'; x.font = FONT(600, 26, 'mono'); x.fillText('Frame · 1440', 6, 32); }), transparent: true, depthTest: false }));
  frameLabel.scale.set(1.2, 0.22, 1); mood.add(frameLabel);

  /* ---- 7) Geräte: responsiv ---- */
  const dev = new THREE.Group(); dev.position.copy(P_DEV); scene.add(dev);
  function siteScreen(seed, vertical) {
    const w = vertical ? 300 : 640, h = vertical ? 560 : 400;
    return cv(w, h, (x) => { const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b2a8c'); g.addColorStop(1, '#030a24'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,.9)'; x.font = FONT(700, vertical ? 18 : 20); x.fillText('VONUMO', 18, 32);
      x.fillStyle = '#fff'; x.font = FONT(300, vertical ? 38 : 48); x.fillText('Ihre Marke', 18, vertical ? 140 : 150); x.font = 'italic 400 ' + (vertical ? 40 : 52) + 'px "Cormorant Garamond", serif'; x.fillStyle = '#cfe0ff'; x.fillText('mit Tiefe.', 18, vertical ? 186 : 204);
      x.fillStyle = '#2f6bff'; rr(x, 18, vertical ? 214 : 232, 150, 38, 19); x.fill(); x.fillStyle = '#fff'; x.font = FONT(700, 15); x.fillText('Projekt starten', 34, vertical ? 238 : 256);
      const rg = x.createRadialGradient(w * 0.72, h * (vertical ? 0.75 : 0.5), 0, w * 0.72, h * (vertical ? 0.75 : 0.5), vertical ? 120 : 160); rg.addColorStop(0, 'rgba(120,170,255,.9)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(0, 0, w, h); });
  }
  const laptop = new THREE.Group(); laptop.add(panel(3.3, 2.1, 0.06, { map: siteScreen(1, false), tint: '#081640' })); const base = panel(3.6, 0.08, 1.6, { tint: '#0b1d5c' }); base.position.set(0, -1.08, 0.75); laptop.add(base); laptop.position.set(0, 0.3, 0); dev.add(laptop);
  const tablet = panel(1.35, 1.85, 0.06, { map: siteScreen(2, true), tint: '#081640' }); tablet.position.set(-2.55, -0.25, 0.6); tablet.rotation.y = 0.25; dev.add(tablet);
  const phone = panel(0.78, 1.5, 0.06, { map: siteScreen(3, true), tint: '#081640' }); phone.position.set(2.35, -0.45, 0.9); phone.rotation.y = -0.3; dev.add(phone);

  /* ---- 8) Ring fürs Kontaktformular ---- */
  const ringG = new THREE.Group(); ringG.position.copy(P_RING); scene.add(ringG);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd8e6ff, transparent: true, opacity: 0, toneMapped: false });
  ringG.add(new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.022, 10, 240), ringMat));
  const ringHalo = new THREE.Mesh(new THREE.RingGeometry(2.7, 3.7, 128), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, ...ADD, uniforms: { uO: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uO, uT; varying vec2 vP; void main(){ float r = length(vP); float a = atan(vP.y, vP.x); float g = exp(-pow((r-3.05)*4.2, 2.0)); float s = 0.6 + 0.4*sin(a*3.0 + uT*0.8); gl_FragColor = vec4(vec3(0.35,0.6,1.0)*g*s*uO*1.4, 1.0); }'
  }));
  ringG.add(ringHalo);

  /* ---- Staub um die Kamera ---- */
  const DN = lite ? 500 : 1100, dp = new Float32Array(DN * 3), rd = rng(9);
  for (let i = 0; i < DN; i++) { dp[i * 3] = (rd() - 0.5) * 40; dp[i * 3 + 1] = (rd() - 0.5) * 24; dp[i * 3 + 2] = (rd() - 0.5) * 40; }
  const dustMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, ...ADD, uniforms: { uC: { value: new THREE.Vector3() }, uS: { value: 2.2 * DPR } },
    vertexShader: 'uniform vec3 uC; uniform float uS; varying float vA; void main(){ vec3 p = position; p = mod(p - uC + 20.0, 40.0) - 20.0 + uC; p.y = mod(position.y - uC.y + 12.0, 24.0) - 12.0 + uC.y; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uS*(1.0+fract(position.x*3.7)); vA = smoothstep(22.0, 4.0, -mv.z); }',
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(vec3(0.45,0.6,1.0)*smoothstep(0.5,0.0,d)*vA*0.7, 1.0); }' });
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dp, 3)), dustMat); dust.frustumCulled = false; scene.add(dust);

  /* --- Studio-Kulisse: Wasser + Design- & Code-Objekte --- */
  const night = new THREE.Group(); night.position.copy(N0); scene.add(night);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: '#020713', roughness: 0.16, metalness: 0.92, envMap: nightEnv, envMapIntensity: 1.3 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.4; night.add(water);
  const chrome = new THREE.MeshPhysicalMaterial({ color: '#2f5dff', metalness: 1, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMap: nightEnv, envMapIntensity: 2.8 });
  const silver = new THREE.MeshPhysicalMaterial({ color: '#dfe8ff', metalness: 1, roughness: 0.12, clearcoat: 1, envMap: nightEnv, envMapIntensity: 2.4 });
  const gold = new THREE.MeshPhysicalMaterial({ color: '#e7b85a', metalness: 1, roughness: 0.16, clearcoat: 1, envMap: nightEnv, envMapIntensity: 2.6 });
  const EXT = { depth: 0.34, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 4, curveSegments: 18 };
  const shapeOf = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; };
  const extrude = (shape, mat) => { const g = new THREE.ExtrudeGeometry(shape, EXT); g.center(); return new THREE.Mesh(g, mat); };
  const floaters = [];
  function float(obj, ph, amp) { obj.userData.ph = ph; obj.userData.amp = amp || 0.18; obj.userData.y0 = obj.position.y; obj.userData.r0 = obj.rotation.clone(); night.add(obj); floaters.push(obj); return obj; }

  /* </> */
  const tag = new THREE.Group();
  const lt = extrude(shapeOf([[-0.8, 0], [0.6, 1.0], [0.6, 0.55], [-0.15, 0], [0.6, -0.55], [0.6, -1.0]]), chrome); lt.position.x = -1.75;
  const gt = lt.clone(); gt.rotation.y = Math.PI; gt.position.x = 1.75;
  const sl = extrude(shapeOf([[0.2, 1.05], [0.62, 1.05], [-0.2, -1.05], [-0.62, -1.05]]), silver);
  tag.add(lt, gt, sl); tag.scale.setScalar(0.95); tag.position.set(-8.3, 6.7, -6.5); tag.rotation.set(0.05, 0.42, 0.06);
  float(tag, 0, 0.2);

  /* { } */
  const braces = new THREE.Group();
  const bc = new THREE.CatmullRomCurve3([[0.55, 1.65], [0.12, 1.45], [0.02, 0.9], [0.0, 0.35], [-0.42, 0.02], [0.0, -0.35], [0.02, -0.9], [0.12, -1.45], [0.55, -1.65]].map((p) => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal');
  const braceGeo = new THREE.TubeGeometry(bc, 180, 0.13, 14, false);
  const capGeo = new THREE.SphereGeometry(0.13, 16, 12);
  [-1, 1].forEach((sx) => { const b = new THREE.Group(); b.add(new THREE.Mesh(braceGeo, chrome)); [bc.getPoint(0), bc.getPoint(1)].forEach((p) => { const c = new THREE.Mesh(capGeo, chrome); c.position.copy(p); b.add(c); }); b.scale.x = -sx; b.position.x = sx * 1.25; braces.add(b); });
  const dotM = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), gold); braces.add(dotM);
  braces.scale.setScalar(0.95); braces.position.set(8.6, 6.8, -7); braces.rotation.set(0.04, -0.42, -0.05);
  float(braces, 1.6, 0.2);

  /* Mauszeiger */
  const cur = extrude(shapeOf([[0, 0], [0, -1.6], [0.38, -1.22], [0.66, -1.86], [0.92, -1.74], [0.64, -1.12], [1.14, -1.12]]), silver);
  cur.scale.setScalar(0.85); cur.position.set(6.1, 7.6, -5.5); cur.rotation.set(0.2, -0.5, 0.12);
  float(cur, 2.4, 0.22);

  /* Zeichenstift-Spitze */
  const nibS = new THREE.Shape(); nibS.moveTo(0, -1.25); nibS.lineTo(-0.62, 0.15); nibS.quadraticCurveTo(-0.62, 0.6, -0.3, 0.75); nibS.lineTo(0.3, 0.75); nibS.quadraticCurveTo(0.62, 0.6, 0.62, 0.15); nibS.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0.05, 0.13, 0, Math.PI * 2, true); nibS.holes.push(hole);
  const nibG = new THREE.Group(); nibG.add(extrude(nibS, gold));
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.5), new THREE.MeshBasicMaterial({ color: '#2a1a05' })); slit.position.y = -0.6; nibG.add(slit);
  nibG.scale.setScalar(0.95); nibG.position.set(-6.2, 7.7, -5.5); nibG.rotation.set(0.15, 0.45, -0.55);
  float(nibG, 3.3, 0.22);

  /* Code-Fenster */
  const C = { tag: '#7fb0ff', attr: '#c9a8ff', str: '#ffd28a', txt: '#e8eeff', key: '#ff8fb8', fn: '#7ff0c8', com: '#5f74a8', num: '#ffb36b' };
  function codeTex(file, lines) {
    return cv(640, 400, (x, w, h) => {
      x.fillStyle = '#060f2c'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#0b1a45'; x.fillRect(0, 0, w, 46);
      ['#ff6b6b', '#ffcc4d', '#4fe39a'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(24 + i * 22, 23, 6.5, 0, 6.3); x.fill(); });
      x.fillStyle = '#132a6a'; rr(x, 104, 9, 150, 30, 8); x.fill(); x.fillStyle = '#cfe0ff'; x.font = FONT(500, 16, 'mono'); x.fillText(file, 120, 30);
      x.font = FONT(500, 19, 'mono');
      lines.forEach((ln, i) => {
        const y = 86 + i * 34; x.fillStyle = '#3d5288'; x.fillText(String(i + 1).padStart(2, ' '), 18, y);
        let X = 62; ln.forEach(([t, c]) => { x.fillStyle = C[c] || c; x.fillText(t, X, y); X += x.measureText(t).width; });
      });
      x.fillStyle = '#7fb0ff'; x.fillRect(62 + 2, 86 + lines.length * 34 - 20, 10, 24);
    });
  }
  const htmlTex = codeTex('index.html', [
    [['<', 'tag'], ['section ', 'tag'], ['class', 'attr'], ['="hero"', 'str'], ['>', 'tag']],
    [['  <', 'tag'], ['h1', 'tag'], ['>', 'tag'], ['Ihre Marke', 'txt'], ['</', 'tag'], ['h1', 'tag'], ['>', 'tag']],
    [['  <', 'tag'], ['Button ', 'fn'], ['glow', 'attr'], ['>', 'tag'], ['Start', 'txt'], ['</', 'tag'], ['Button', 'fn'], ['>', 'tag']],
    [['</', 'tag'], ['section', 'tag'], ['>', 'tag']],
    [['// 3D + Animation', 'com']],
    [['const ', 'key'], ['site', 'txt'], [' = ', 'txt'], ['build', 'fn'], ['({ ', 'txt'], ['depth', 'attr'], [': ', 'txt'], ['true', 'num'], [' })', 'txt']],
    [['await ', 'key'], ['deploy', 'fn'], ['(', 'txt'], ["'vercel'", 'str'], [')', 'txt']]
  ]);
  const cssTex = codeTex('style.css', [
    [['.hero ', 'fn'], ['{', 'txt']],
    [['  display', 'attr'], [': ', 'txt'], ['grid', 'str'], [';', 'txt']],
    [['  color', 'attr'], [': ', 'txt'], ['#2f6bff', 'num'], [';', 'txt']],
    [['  border-radius', 'attr'], [': ', 'txt'], ['24px', 'num'], [';', 'txt']],
    [['  backdrop-filter', 'attr'], [': ', 'txt'], ['blur', 'fn'], ['(', 'txt'], ['20px', 'num'], [');', 'txt']],
    [['}', 'txt']],
    [['/* Figma → Code */', 'com']]
  ]);
  const codeA = panel(4.4, 2.75, 0.08, { map: htmlTex, tint: '#071338' }); codeA.position.set(-11.4, 3.3, -9); codeA.rotation.set(-0.04, 0.62, 0.02);
  const codeB = panel(4.4, 2.75, 0.08, { map: cssTex, tint: '#071338' }); codeB.position.set(11.4, 3.1, -9); codeB.rotation.set(-0.04, -0.62, -0.02);
  float(codeA, 0.8, 0.12); float(codeB, 2.0, 0.12);

  const ribbons = floaters;
  const bubble = cur;
  const nl1 = new THREE.PointLight(0x3a6cff, 60, 30, 1.6); nl1.position.set(-5, 6, -2); night.add(nl1);
  const nl2 = new THREE.PointLight(0x6ab0ff, 50, 28, 1.6); nl2.position.set(6, 4, 1); night.add(nl2);
  const nl3 = new THREE.PointLight(0xffd08a, 18, 14, 1.8); nl3.position.set(-6, 9, -2); night.add(nl3);


  /* --- Nachbearbeitung (Desktop) --- */
  let rt = null, post = null, postScene = null, postCam = null;
  if (!lite) {
    rt = new THREE.WebGLRenderTarget(4, 4, { samples: 4, type: THREE.HalfFloatType });
    post = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      blending: THREE.NoBlending, depthTest: false, depthWrite: false,
      uniforms: { tD: { value: rt.texture }, uG: { value: 0 }, uT: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }',
      fragmentShader: `
        uniform sampler2D tD; uniform float uG, uT; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec2 uv = vUv, c = uv - 0.5; vec2 off = c * (0.001 + uG*0.01);
          vec4 r = texture2D(tD, uv + off), g = texture2D(tD, uv), b = texture2D(tD, uv - off);
          vec4 col = vec4(r.r, g.g, b.b, max(max(r.a,g.a),b.a));
          vec4 bl = (texture2D(tD, uv + vec2(0.004,0.0)) + texture2D(tD, uv - vec2(0.004,0.0)) + texture2D(tD, uv + vec2(0.0,0.006)) + texture2D(tD, uv - vec2(0.0,0.006))) * 0.25;
          col.rgb += max(bl.rgb - 0.6, 0.0) * 0.8;
          col.rgb += (h(uv*vec2(913.0,577.0)+uT) - 0.5) * 0.018 * col.a;
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
    camera.aspect = w / h; camera.fov = w < 700 ? 58 : 40; camera.updateProjectionMatrix();
    if (rt) rt.setSize(Math.round(w * DPR), Math.round(h * DPR));
  }
  return { renderer, scene, camera, resize, rt, post, postScene, postCam, site, L, cursor, pen, tube, tubeGeo, glowTube, nib, curve, anchors, typeG, glyphs, beam, comp, toggle, knob, slider, sk, swatches, check, mood, tiles, sel, selBox, handles, frameLabel, dev, laptop, tablet, phone, ringG, ringMat, ringHalo, dustMat, night, ribbons, bubble };
}

/* ================= Stationen ================= */
const ST = [
  { id: 'hero', cam: [-2.5, 0.35, 9.4], look: [-2.5, 0.1, 0], mob: [0, 0.2, 10.5], mobL: [0, -2.4, 0], site: 1, ex: 0.18 },
  { id: 'mission', cam: [-4.4, 1.2, 9.2], look: [-3.0, 0, 0], mob: [0, 0.8, 10.5], mobL: [0, -2.0, 0], site: 1, ex: 1 },
  { id: 'vision', cam: [0.6, -1.25, -32.4], look: [0.6, -0.55, -40], mob: [0, -1.6, -29.5], mobL: [0, -1.5, -40], pen: 1 },
  { id: 'warp', cam: [0, 0, -58], look: [0, 0, -90], type: 1 },
  { id: 'dashboard', cam: [0, -0.2, -91], look: [0, 2.0, -110], beam: 1 },
  { id: 'features', cam: [0, 0.2, -139], look: [0, 0, -150], comp: 1 },
  { id: 'welt', cam: [78.6, 8.6, 8.4], look: [72.4, -0.4, 1.4], mob: [70, 13, 6], mobL: [70, -0.4, 0], mood: 1 },
  { id: 'infra', cam: [140, 0.4, 8.8], look: [140, -0.4, 0], mob: [140, 0.2, 12.5], mobL: [140, -1.6, 0], dev: 1 },
  { id: 'kontakt', cam: [210, 0, 9.4], look: [210, 0, 0], ring: 1 },
  { id: 'studio', cam: [0, 3.0, -247], look: [0, 3.0, -262], night: 1 }
];
const KEYS = ['site', 'ex', 'pen', 'type', 'beam', 'comp', 'mood', 'dev', 'ring', 'night'];

function start() {
  const html = D.documentElement;
  const S = build($('gl'));
  const ld = $('ld'), ldPct = $('ldPct'), ldBar = $('ldBar'), t0 = performance.now();
  let introAt = 0;
  (function tick() {
    const k = clamp((performance.now() - t0) / (reduce ? 1 : 1200), 0, 1);
    ldPct.textContent = String(Math.round(ease(k) * 100)).padStart(3, '0'); ldBar.style.transform = 'scaleX(' + ease(k).toFixed(3) + ')';
    if (k < 1) requestAnimationFrame(tick); else { ld.classList.add('out'); introAt = performance.now(); }
  })();
  if (!S) { html.classList.add('nogl'); return; }
  S.resize(); W.addEventListener('resize', () => { S.resize(); measure(); });

  const sound = makeSound(), snd = $('snd');
  snd.addEventListener('click', () => { const on = sound.toggle(); snd.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  const dots = $('dots'), secs = Array.prototype.slice.call(D.querySelectorAll('.ch[data-name], #studio'));
  secs.forEach((s) => { const a = D.createElement('a'); a.href = '#' + s.id; a.setAttribute('aria-label', s.getAttribute('data-name') || 'Studio'); a.innerHTML = '<i></i>'; dots.appendChild(a); });
  D.querySelectorAll('.dots a, .tn a[href^="#"], .tn-logo').forEach((a) => a.addEventListener('click', (e) => { const t = D.querySelector(a.getAttribute('href')); if (!t) return; e.preventDefault(); t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }));

  /* Ebenen-Beschriftungen */
  const tags = S.L.map((l) => { const e = D.createElement('span'); e.className = 'layer-tag'; e.textContent = l.name; D.body.appendChild(e); return e; });

  let stations = [];
  function measure() {
    const vh = W.innerHeight, out = [];
    ST.forEach((s) => { const n = $(s.id); if (!n) return; const top = n.getBoundingClientRect().top + W.scrollY; out.push(Object.assign({}, s, { y: s.id === 'hero' ? 0 : Math.max(0, top - vh * 0.15) })); });
    out.sort((a, b) => a.y - b.y); stations = out;
  }
  measure(); setInterval(measure, 2000); W.addEventListener('load', measure);

  const progBar = $('progBar'), progN = $('progN'), dash = D.querySelector('.dashui');
  const curP = new THREE.Vector3(-2.5, 0.35, 9.4), curL = new THREE.Vector3(-2.5, 0.1, 0), tP = new THREE.Vector3(), tL = new THREE.Vector3();
  const cur = {}; KEYS.forEach((k) => { cur[k] = 0; }); cur.site = 1;
  let lastT = performance.now(), lastY = W.scrollY, vel = 0, mx = 0, my = 0, smx = 0, smy = 0, visible = true, activeDot = -1, lastJump = 0;
  W.addEventListener('pointermove', (e) => { mx = e.clientX / W.innerWidth * 2 - 1; my = e.clientY / W.innerHeight * 2 - 1; }, { passive: true });
  D.addEventListener('visibilitychange', () => { visible = !D.hidden; if (visible) { lastT = performance.now(); requestAnimationFrame(loop); } });
  const v3 = new THREE.Vector3();

  function loop(now) {
    if (!visible) return;
    const t = now / 1000, dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    const vh = W.innerHeight, vw = W.innerWidth, y = W.scrollY, maxY = Math.max(1, D.documentElement.scrollHeight - vh), mob = vw < 700;
    vel = lerp(vel, (y - lastY) / Math.max(dt, 0.001), 0.12); lastY = y;
    html.classList.toggle('scrolled', y > 30);
    let i = 0; while (i < stations.length - 1 && y >= stations[i + 1].y) i++;
    const a = stations[i], b = stations[Math.min(i + 1, stations.length - 1)];
    const local = a === b ? 0 : clamp((y - a.y) / Math.max(1, b.y - a.y), 0, 1);
    const tt = a === b ? 0 : sm(0.5, 1, local);
    const k = 1 - Math.pow(0.002, dt);
    KEYS.forEach((key) => { cur[key] = lerp(cur[key], lerp(a[key] || 0, b[key] || 0, tt), k); });

    const g = clamp(y / maxY, 0, 1);
    progBar.style.height = (g * 100).toFixed(1) + '%'; progN.textContent = Math.round(g * 100) + '%';
    let ad = 0; secs.forEach((s, si) => { if (s.getBoundingClientRect().top < vh * 0.5) ad = si; });
    if (ad !== activeDot) { activeDot = ad; Array.prototype.forEach.call(dots.children, (d, di) => d.classList.toggle('on', di === ad)); }
    html.classList.toggle('studio-on', $('studio').getBoundingClientRect().top < vh * 0.55);
    if (dash) { const r = dash.closest('.ch').getBoundingClientRect(); dash.style.setProperty('--dv', sm(0.05, 0.45, (vh - r.top) / r.height).toFixed(3)); }
    const intro = reduce ? 1 : (introAt ? ease((now - introAt) / 1800) : 0);

    /* 1) Website-Ebenen */
    setO(S.site, cur.site * intro);
    if (S.site.visible) {
      S.site.rotation.set(0.12 + smy * 0.06, -0.42 - cur.ex * 0.35 + Math.sin(t * 0.3) * 0.05 + smx * 0.12, 0);
      S.site.position.y = Math.sin(t * 0.6) * 0.06 + (1 - intro) * -0.6;
      S.L.forEach((l, li) => { l.m.position.z = li * (0.06 + cur.ex * 0.55); });
      // Cursor klickt den Button
      const cyc = (t % 4) / 4, bp = S.L[4].m.position;
      const cx = lerp(0.6, bp.x + 0.2, sm(0.0, 0.45, cyc)), cy = lerp(-0.2, bp.y - 0.06, sm(0.0, 0.45, cyc));
      S.cursor.position.set(cx, cy, bp.z + 0.12);
      const click = sm(0.5, 0.55, cyc) * (1 - sm(0.62, 0.72, cyc));
      S.L[4].m.material.uniforms.uHot.value = click * 0.5; S.L[4].m.scale.set(0.78 * (1 - click * 0.06), 0.2 * (1 - click * 0.06), 0.03);
      const showTags = cur.ex > 0.6 && !mob;
      S.L.forEach((l, li) => { const e = tags[li]; if (!showTags) { e.style.opacity = '0'; return; } v3.set(0.5, 0.5, 0).applyMatrix4(l.m.matrixWorld); v3.project(S.camera); e.style.transform = 'translate3d(' + ((v3.x * 0.5 + 0.5) * vw).toFixed(1) + 'px,' + ((-v3.y * 0.5 + 0.5) * vh).toFixed(1) + 'px,0)'; e.style.opacity = sm(0.6, 0.95, cur.ex).toFixed(2); });
    } else tags.forEach((e) => { e.style.opacity = '0'; });

    /* 2) Zeichenstift */
    setO(S.pen, cur.pen);
    if (S.pen.visible) {
      const pl = a.id === 'vision' ? local : (b.id === 'vision' ? 0 : 1);
      const draw = sm(0.0, 0.8, pl + 0.1);
      const cnt = Math.floor(S.tubeGeo.index.count * draw / 6) * 6;
      S.tube.geometry.setDrawRange(0, cnt); S.glowTube.geometry.setDrawRange(0, cnt);
      S.curve.getPointAt(clamp(draw, 0.001, 1), v3); S.nib.position.copy(v3);
      S.anchors.forEach((an, ai) => { an.visible = draw >= ai * 0.5 - 0.01; });
      S.pen.rotation.y = Math.sin(t * 0.25) * 0.12 + smx * 0.1; S.pen.rotation.x = smy * 0.05;
    }

    /* 3) Typografie */
    setO(S.typeG, cur.type);
    if (S.typeG.visible) {
      const tl = a.id === 'warp' ? local : 0;
      S.glyphs.forEach((m, gi) => { const u = m.userData; const z = ((u.z0 + t * 2.2 + tl * 30) % 40 + 40) % 40 - 34; m.position.set(Math.cos(u.a + t * 0.05) * u.r, Math.sin(u.a + t * 0.05) * u.r * 0.6, z); m.scale.setScalar(u.s); m.lookAt(S.camera.position); m.material.opacity = cur.type * sm(-34, -24, z) * (1 - sm(-6, -1, z)); });
    }

    /* 4) Strahl */
    S.beam.material.uniforms.uO.value = cur.beam; S.beam.material.uniforms.uT.value = t; S.beam.visible = cur.beam > 0.01;

    /* 5) Komponenten */
    setO(S.comp, cur.comp);
    if (S.comp.visible) {
      S.knob.position.x = lerp(-0.23, 0.23, sm(0.3, 0.7, (Math.sin(t * 1.2) + 1) / 2));
      S.toggle.children[0].material.uniforms.uHot.value = 0.15 * sm(0.4, 1, (Math.sin(t * 1.2) + 1) / 2);
      S.sk.position.x = Math.sin(t * 0.8) * 0.7;
      [S.toggle, S.slider, S.swatches, S.check].forEach((o, oi) => { o.position.y += Math.sin(t * 0.7 + oi) * 0.002; o.rotation.y = Math.sin(t * 0.4 + oi) * 0.3; o.rotation.x = Math.sin(t * 0.3 + oi) * 0.15; });
    }

    /* 6) Moodboard */
    setO(S.mood, cur.mood);
    if (S.mood.visible) {
      S.tiles.forEach((tl, ti) => { tl.position.y = tl === S.sel ? 0.35 + Math.sin(t * 1.2) * 0.05 : Math.max(0, Math.sin(t * 0.6 + tl.userData.ph)) * 0.06; });
      const sp = S.sel.position; S.selBox.position.set(sp.x, sp.y + 0.05, sp.z);
      S.handles.forEach((h) => h.position.set(sp.x + h.userData.sx * 1.18, sp.y + 0.06, sp.z + h.userData.sz * 0.78));
      S.frameLabel.position.set(sp.x - 0.55, sp.y + 0.3, sp.z - 1.0);
      S.mood.rotation.y = Math.sin(t * 0.15) * 0.04;
    }

    /* 7) Geräte */
    setO(S.dev, cur.dev);
    if (S.dev.visible) { S.dev.rotation.y = Math.sin(t * 0.3) * 0.12 + smx * 0.15; S.laptop.position.y = 0.3 + Math.sin(t * 0.8) * 0.05; S.tablet.position.y = -0.25 + Math.sin(t * 0.8 + 1) * 0.07; S.phone.position.y = -0.45 + Math.sin(t * 0.8 + 2) * 0.08; }

    /* 8) Ring */
    S.ringMat.opacity = cur.ring; S.ringHalo.material.uniforms.uO.value = cur.ring; S.ringHalo.material.uniforms.uT.value = t; S.ringG.visible = cur.ring > 0.01;

    /* Nacht */
    S.night.visible = cur.night > 0.02;
    S.ribbons.forEach((r) => { const u = r.userData, r0 = u.r0; r.position.y = u.y0 + Math.sin(t * 0.55 + u.ph) * u.amp; r.rotation.set(r0.x + Math.sin(t * 0.31 + u.ph) * 0.06, r0.y + Math.sin(t * 0.23 + u.ph) * 0.12, r0.z + Math.sin(t * 0.27 + u.ph) * 0.05); });

    /* Kamera */
    const ac = mob && a.mob ? a.mob : a.cam, bc = mob && b.mob ? b.mob : b.cam, al = mob && a.mobL ? a.mobL : a.look, bl = mob && b.mobL ? b.mobL : b.look;
    tP.set(lerp(ac[0], bc[0], tt), lerp(ac[1], bc[1], tt), lerp(ac[2], bc[2], tt));
    tL.set(lerp(al[0], bl[0], tt), lerp(al[1], bl[1], tt), lerp(al[2], bl[2], tt));
    if (mob && (a.id === 'kontakt' || a.id === 'features' || a.id === 'dashboard')) tP.z += 3;
    const ck = 1 - Math.pow(0.0008, dt);
    const jump = curP.distanceTo(tP) > 30;
    if (jump) { curP.copy(tP); curL.copy(tL); lastJump = now; } else { curP.lerp(tP, ck); curL.lerp(tL, ck); }
    smx = lerp(smx, mx, 0.04); smy = lerp(smy, my, 0.04);
    S.camera.position.set(curP.x + smx * 0.25, curP.y - smy * 0.15, curP.z);
    S.camera.lookAt(curL);
    S.dustMat.uniforms.uC.value.copy(S.camera.position);

    const gl = reduce || W.__calm ? 0 : clamp(Math.min(Math.abs(vel) / 7000, 0.25) + (now - lastJump < 350 ? 0.9 : 0), 0, 1);
    if (S.rt) {
      S.renderer.setRenderTarget(S.rt); S.renderer.clear(); S.renderer.render(S.scene, S.camera);
      S.renderer.setRenderTarget(null); S.renderer.clear();
      S.post.material.uniforms.uG.value = gl; S.post.material.uniforms.uT.value = t;
      S.renderer.render(S.postScene, S.postCam);
    } else S.renderer.render(S.scene, S.camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
