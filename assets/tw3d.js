/* VONUMO Techwear – echtes Echtzeit-3D (Three.js): prozedurale Daunenjacke, Material-Ebenen, View-Renderer */
import * as THREE from 'three';

const W = window, D = document;
const reduce = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = W.innerWidth <= 760;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (x) => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/* ---------- Umgebung: Studio mit blauen und kupfernen Lichtflächen (für Spiegelungen) ---------- */
function makeEnv(renderer) {
  const s = new THREE.Scene();
  const box = (w, h, d, col, inten, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(inten) }));
    m.position.set(x, y, z); m.rotation.y = ry; s.add(m);
  };
  s.background = new THREE.Color(0x000000);
  box(0.4, 9, 7, 0x2f63ff, 7, -6, 1, 1);          // große blaue Fläche links
  box(0.4, 5, 3, 0x1e46ff, 5, 6, 2, -2);          // blau rechts hinten
  box(6, 0.3, 2, 0xffffff, 1.1, 0, 6, 1);          // weißer Streifen oben
  box(2.2, 2.2, 0.3, 0xff8a3a, 1.1, 4, -2, 4);     // kupfer unten rechts
  box(3, 1.2, 0.3, 0x6fd3ff, 1.6, -2, 3, 6);       // cyan vorne oben
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.02).texture; pm.dispose();
  return tex;
}

/* ---------- Geometrie der Jacke (einmal gebaut, für alle Farben geteilt) ---------- */
class Ring extends THREE.Curve {
  constructor(a, b, y, gap) { super(); this.a = a; this.b = b; this.y = y; this.gap = gap; }
  getPoint(t, o = new THREE.Vector3()) {
    const th = Math.PI / 2 + this.gap + t * (Math.PI * 2 - this.gap * 2);   // Lücke vorne (z+) für den Reißverschluss
    return o.set(this.a * Math.cos(th), this.y, this.b * Math.sin(th));
  }
}
function crinkle(geo, amp, f) {   // feine Knitter für realistische Glanzlichter
  const p = geo.attributes.position, n = geo.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = amp * (Math.sin(v.x * f + v.y * 7.3) * Math.cos(v.z * f * 0.8 - v.y * 5.1) + 0.5 * Math.sin((v.x + v.z) * f * 1.9));
    p.setXYZ(i, v.x + n.getX(i) * k, v.y + n.getY(i) * k, v.z + n.getZ(i) * k);
  }
  geo.computeVertexNormals(); return geo;
}
let JG = null;
/* Gitterfläche aus Funktion (u: rundum, v: entlang) – Grundlage für gesteppte Daunen-Kammern */
function gridGeo(nu, nv, fn) {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3), idx = [], o = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { fn(i / nu, j / nv, o); pos.set([o.x, o.y, o.z], (j * (nu + 1) + i) * 3); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const ridge = (x) => Math.pow(Math.abs(Math.sin(Math.PI * x)), 0.5);           // runde Kammer, scharfe Naht
const wob = (a, b, c) => 0.006 * Math.sin(a * 31 + b * 7) * Math.cos(b * 23 - c * 11) + 0.004 * Math.sin((a + c) * 57);
function jacketGeo() {
  if (JG) return JG;
  const U = small ? 72 : 120, V = small ? 90 : 150, puff = [], dark = [], metal = [];
  const GAP = 0.085;                                                            // Reißverschluss-Lücke vorne
  /* Rumpf: durchgehende Fläche, 7 horizontale Kammern, oben zur Schulter verjüngt */
  const y0 = -0.86, y1 = 0.66, pitch = (0.5 - y0) / 6.5;
  puff.push(gridGeo(U, V, (u, v, o) => {
    const y = y0 + (y1 - y0) * v, th = Math.PI / 2 + GAP + u * (Math.PI * 2 - GAP * 2);
    const sh = smooth((y - 0.38) / 0.28), hem = smooth((y0 + 0.12 - y) / 0.12);
    let a = 0.64 + 0.04 * Math.sin(Math.PI * clamp((y - y0) / 1.3, 0, 1)) - 0.34 * sh - 0.05 * hem, b = 0.4 - 0.16 * sh - 0.03 * hem;
    const edge = smooth(Math.min(u, 1 - u) / 0.035), top = 1 - 0.85 * smooth((y - 0.5) / 0.16);
    const pr = 0.075 * ridge((y - y0) / pitch) * edge * top + 0.012 * edge;
    const nx = Math.cos(th) / a, nz = Math.sin(th) / b, nl = Math.hypot(nx, nz);
    const w = wob(th, y, a);
    o.set(a * Math.cos(th) + (nx / nl) * (pr + w), y, b * Math.sin(th) + (nz / nl) * (pr + w));
  }));
  /* Schulterkappe (schließt den Rumpf oben bis zum Hals) */
  puff.push(gridGeo(U, 14, (u, v, o) => {
    const th = Math.PI / 2 + GAP + u * (Math.PI * 2 - GAP * 2), a = lerpN(0.3, 0.27, v), b = lerpN(0.24, 0.22, v);
    o.set(a * Math.cos(th), 0.66 + v * 0.02, b * Math.sin(th));
  }));
  /* Hoher Kragen: 3 Kammern, oben eingerollt */
  puff.push(gridGeo(U, 60, (u, v, o) => {
    const y = 0.64 + v * 0.44, th = Math.PI / 2 + 0.16 + u * (Math.PI * 2 - 0.32);
    const edge = smooth(Math.min(u, 1 - u) / 0.05), rim = Math.sin(Math.PI * Math.min(1, v * 1.04)) ;
    const a = 0.27 + 0.02 * v, b = 0.235 + 0.015 * v, pr = (0.05 * ridge(v * 3) + 0.03) * edge * (0.35 + 0.65 * rim);
    const w = wob(th, y, b);
    o.set((a + pr + w) * Math.cos(th), y, (b + pr + w) * Math.sin(th));
  }));
  /* Ärmel: Röhre entlang der Armkurve mit Kammern */
  [-1, 1].forEach((s) => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0.42 * s, 0.5, 0), new THREE.Vector3(0.78 * s, 0.34, 0.02), new THREE.Vector3(0.98 * s, -0.08, 0.06), new THREE.Vector3(1.05 * s, -0.6, 0.1)]);
    const fr = c.computeFrenetFrames(V, false), L = c.getLength();
    puff.push(gridGeo(small ? 40 : 64, V, (u, v, o) => {
      const k = Math.round(v * V), p = c.getPointAt(v), N = fr.normals[k], Bn = fr.binormals[k], th = u * Math.PI * 2;
      const R = 0.25 - v * 0.08, end = smooth(v / 0.04) * (1 - 0.5 * smooth((v - 0.96) / 0.04));
      const r = (R + 0.06 * ridge(v * L / 0.17 + 0.3) + wob(th, v * 3, s)) * (0.55 + 0.45 * end);
      o.copy(p).addScaledVector(N, Math.cos(th) * r).addScaledVector(Bn, Math.sin(th) * r);
    }));
    const end = c.getPointAt(1), dir = c.getTangentAt(1), cuff = new THREE.CylinderGeometry(0.135, 0.125, 0.17, 32, 6, false), cp = cuff.attributes.position;
    for (let i = 0; i < cp.count; i++) { const ang = Math.atan2(cp.getZ(i), cp.getX(i)), f = 1 + 0.03 * Math.sin(ang * 28); cp.setX(i, cp.getX(i) * f); cp.setZ(i, cp.getZ(i) * f); }
    cuff.computeVertexNormals();
    cuff.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); cuff.translate(end.x + dir.x * 0.05, end.y + dir.y * 0.05, end.z + dir.z * 0.05);
    dark.push(cuff);
  });
  /* Innenfutter (dunkel, verhindert Durchblick) */
  const inner = new THREE.CylinderGeometry(1, 1, 1.15, 40, 1, true); inner.scale(0.55, 1, 0.33); inner.translate(0, -0.28, 0); dark.push(inner);
  const neck = new THREE.CylinderGeometry(0.25, 0.25, 0.46, 32, 1, true); neck.scale(1, 1, 0.85); neck.translate(0, 0.86, 0); dark.push(neck);
  /* Brusttaschen mit Patte */
  const pocket = (x) => {
    const g = new THREE.BoxGeometry(0.3, 0.27, 0.06, 10, 10, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const px = p.getX(i) / 0.15, py = p.getY(i) / 0.135; const ex = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(px), 4))), ey = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(py), 4))); if (p.getZ(i) > 0) p.setZ(i, p.getZ(i) * (0.4 + 0.6 * ex * ey) + 0.055 * ex * ey + wob(px, py, x)); }
    g.computeVertexNormals();
    const ang = Math.atan2(x, 0.62); g.rotateY(ang * 0.9); g.translate(x, 0.08, 0.5 - Math.abs(x) * 0.16); puff.push(g);
    const f = new THREE.BoxGeometry(0.33, 0.08, 0.05, 8, 2, 1); f.rotateX(-0.3); f.rotateY(ang * 0.9); f.translate(x, 0.23, 0.54 - Math.abs(x) * 0.16); puff.push(f);
  };
  pocket(-0.29); pocket(0.29);
  /* Reißverschluss mit Zähnchen, Zipper, Riemen */
  const zip = new THREE.BoxGeometry(0.026, 1.9, 0.03, 1, 60, 1), zp = zip.attributes.position;
  for (let i = 0; i < zp.count; i++) zp.setX(i, zp.getX(i) * (1 + 0.25 * Math.sign(Math.sin(zp.getY(i) * 260))));
  zip.computeVertexNormals(); zip.translate(0, 0.12, 0.47); metal.push(zip);
  const pull = new THREE.BoxGeometry(0.04, 0.1, 0.014); pull.translate(0.015, 1.0, 0.52); metal.push(pull);
  const strap = new THREE.BoxGeometry(0.05, 0.44, 0.012); strap.translate(-0.08, -1.08, 0.4); dark.push(strap);
  const buckle = new THREE.BoxGeometry(0.07, 0.05, 0.02); buckle.translate(-0.08, -1.28, 0.4); metal.push(buckle);
  JG = { puff, dark, metal };
  return JG;
}
const lerpN = (a, b, k) => a + (b - a) * k;
const mergeAll = (arr) => {
  /* einfache Zusammenführung (gleiche Attribute) */
  let n = 0, idx = 0; arr.forEach((g) => { g = g.index ? g : g; n += g.attributes.position.count; idx += g.index ? g.index.count : g.attributes.position.count; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), ind = new Uint32Array(idx); let o = 0, io = 0;
  arr.forEach((g) => {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) ind[io++] = a[i] + o; }
    else { for (let i = 0; i < g.attributes.position.count; i++) ind[io++] = i + o; }
    o += g.attributes.position.count;
  });
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setIndex(new THREE.BufferAttribute(ind, 1));
  m.computeBoundingSphere(); return m;
};
let MG = null;
function merged() { if (MG) return MG; const g = jacketGeo(); MG = { puff: mergeAll(g.puff), dark: mergeAll(g.dark), metal: mergeAll(g.metal) }; return MG; }

export function makeJacket(color, env, opts = {}) {
  const g = merged(), col = new THREE.Color(color), black = color === 'black';
  const shell = new THREE.MeshPhysicalMaterial({
    color: black ? 0x04050a : col, roughness: black ? 0.2 : 0.26, metalness: black ? 0.05 : 0, clearcoat: 1, clearcoatRoughness: 0.05,
    envMap: env, envMapIntensity: black ? 1.5 : 1.0, sheen: black ? 0 : 0.4, sheenColor: col, sheenRoughness: 0.5, side: THREE.DoubleSide
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x07070a, roughness: 0.85, metalness: 0, envMap: env, envMapIntensity: 0.3 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.28, metalness: 0.95, envMap: env, envMapIntensity: 1.2 });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g.dark, dark), new THREE.Mesh(g.puff, shell), new THREE.Mesh(g.metal, metal));
  grp.userData.mats = [shell, dark, metal];
  return grp;
}

/* ---------- Materialschichten (Explosionsansicht) ---------- */
function circuitTex() {
  const c = D.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512); x.strokeStyle = '#4fe0ff'; x.lineWidth = 2.2; x.shadowColor = '#4fe0ff'; x.shadowBlur = 8;
  for (let i = 0; i < 26; i++) {
    let px = Math.random() * 512, py = Math.random() * 512; x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 5; k++) { if (Math.random() < 0.5) px += (Math.random() - 0.5) * 220; else py += (Math.random() - 0.5) * 220; x.lineTo(px, py); }
    x.stroke(); x.fillStyle = '#9ff3ff'; x.beginPath(); x.arc(px, py, 3, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function wavyPlane(size, segs, amp) {
  const g = new THREE.PlaneGeometry(size, size, segs, segs); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, amp * (Math.sin(x * 2.3 + z * 1.4) * 0.6 + Math.sin(z * 3.1 - x) * 0.4) + amp * 0.25 * Math.sin(x * 9) * Math.cos(z * 8)); }
  g.computeVertexNormals(); return g;
}
export function makeLayers(env) {
  const grp = new THREE.Group(), L = [];
  /* 1 Außenhülle */
  const shellMat = new THREE.MeshPhysicalMaterial({ color: 0x0b1546, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMap: env, envMapIntensity: 1.1, emissive: 0xffffff, emissiveMap: circuitTex(), emissiveIntensity: 1.1, side: THREE.DoubleSide });
  const shell = new THREE.Mesh(wavyPlane(2.1, 90, 0.05), shellMat);
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshPhysicalMaterial({ color: 0xbfd8ff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55, envMap: env, envMapIntensity: 2 }), small ? 40 : 90);
  const m = new THREE.Matrix4();
  for (let i = 0; i < drops.count; i++) { const s = 0.012 + Math.random() * 0.03; m.compose(new THREE.Vector3((Math.random() - 0.5) * 1.9, 0.05 + s * 0.3, (Math.random() - 0.5) * 1.9), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.55, s)); drops.setMatrixAt(i, m); }
  shell.add(drops);
  /* 2 Membran */
  const memb = new THREE.Mesh(wavyPlane(2.0, 50, 0.035), new THREE.MeshPhysicalMaterial({ color: 0x8a5cff, roughness: 0.2, transparent: true, opacity: 0.5, emissive: 0x5a33ff, emissiveIntensity: 0.35, envMap: env, side: THREE.DoubleSide, depthWrite: false }));
  /* 3 Füllung: gesteppte Kissen */
  const fill = new THREE.Group(), pil = new THREE.BoxGeometry(2, 2, 2, 24, 24, 24), pp = pil.attributes.position, pv = new THREE.Vector3();
  for (let i = 0; i < pp.count; i++) { pv.fromBufferAttribute(pp, i); const n = pv.clone().normalize().multiplyScalar(1.15); pv.lerp(n, 0.55); pp.setXYZ(i, pv.x, pv.y, pv.z); }
  pil.computeVertexNormals(); crinkle(pil, 0.012, 9);
  const pmat = new THREE.MeshPhysicalMaterial({ color: 0x5a2bd8, roughness: 0.55, sheen: 1, sheenColor: 0xc39bff, sheenRoughness: 0.4, envMap: env, envMapIntensity: 0.8 });
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const p = new THREE.Mesh(pil, pmat); p.scale.set(0.31, 0.13, 0.31); p.position.set(i * 0.64, 0, j * 0.64); fill.add(p); }
  /* 4 Futter */
  const lin = new THREE.Mesh(wavyPlane(2.0, 40, 0.03), new THREE.MeshPhysicalMaterial({ color: 0xb6a6ee, roughness: 0.28, metalness: 0.15, sheen: 1, sheenColor: 0xffffff, envMap: env, envMapIntensity: 1, side: THREE.DoubleSide }));
  [shell, memb, fill, lin].forEach((o) => { grp.add(o); L.push(o); });
  grp.userData.layers = L;
  grp.userData.anchors = [new THREE.Vector3(0.15, 0.06, 0.1), new THREE.Vector3(0.45, 0.04, -0.2), new THREE.Vector3(-0.1, 0.16, 0.5), new THREE.Vector3(0.55, 0.03, 0.55)];
  return grp;
}

/* ---------- View-Renderer: ein WebGL-Kontext, viele DOM-Fenster ---------- */
export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(W.devicePixelRatio || 1, small ? 1.4 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const env = makeEnv(renderer), views = [];
  const resize = () => renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  resize(); W.addEventListener('resize', resize);
  let last = performance.now(), running = true;
  function loop(t) {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    const H = canvas.clientHeight, Wd = canvas.clientWidth;
    renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
    const cr = canvas.getBoundingClientRect();
    for (const v of views) {
      const r = v.el.getBoundingClientRect();
      if (r.bottom < cr.top - 40 || r.top > cr.bottom + 40 || r.width < 2 || v.el.offsetParent === null) continue;
      const x = r.left - cr.left, y = cr.bottom - r.bottom;
      renderer.setViewport(x, y, r.width, r.height); renderer.setScissor(x, y, r.width, r.height);
      v.camera.aspect = r.width / r.height; v.camera.updateProjectionMatrix();
      v.update && v.update(t / 1000, dt, r);
      renderer.render(v.scene, v.camera);
    }
  }
  requestAnimationFrame(loop);
  return {
    renderer, env, views,
    add(v) { views.push(v); return v; },
    stop() { running = false; renderer.dispose(); }
  };
}
export function baseScene() {
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0x9fb4ff, 0x080810, 0.5));
  const k = new THREE.DirectionalLight(0xbcd0ff, 1.6); k.position.set(-3, 4, 3); s.add(k);
  const r = new THREE.DirectionalLight(0x3a6bff, 2.4); r.position.set(4, 1, -2); s.add(r);
  const c = new THREE.DirectionalLight(0xffa060, 0.6); c.position.set(2, -2, 3); s.add(c);
  return s;
}
export { THREE, clamp, ease, smooth, reduce, small };
