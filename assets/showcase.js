/* VONUMO Showroom – Branchen-Konzepte in Echtzeit-3D (Auto & Bau) */
import * as THREE from './vendor/three.module.min.js';

const W = window, D = document;
const reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(W.devicePixelRatio || 1, 2);

/* Studio-Licht als Umgebung: Softboxen für echte Spiegelungen */
function studioEnv(renderer, tint) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), new THREE.MeshBasicMaterial({ color: tint || 0x060b1c, side: THREE.BackSide })));
  const box = (w, h, x, y, z, ry, rx, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c || 0xffffff, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); s.add(m); };
  box(14, 2.2, 0, 9, 0, 0, Math.PI / 2);
  box(10, 1.4, 0, 6, -6, 0, Math.PI / 3);
  box(2, 8, -12, 3, 0, Math.PI / 2, 0, 0x9cc2ff);
  box(2, 8, 12, 3, 0, -Math.PI / 2, 0, 0xcfe0ff);
  box(16, 0.6, 0, 1.5, 10, Math.PI, 0, 0x6a9bff);
  const pm = new THREE.PMREMGenerator(renderer);
  const t = pm.fromScene(s, 0.035).texture; pm.dispose(); return t;
}

function makeStage(canvas, opts) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  renderer.setPixelRatio(DPR); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opts.exposure || 1.1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.environment = studioEnv(renderer, opts.envTint);
  const camera = new THREE.PerspectiveCamera(opts.fov || 32, 1, 0.1, 200);
  const st = { renderer, scene, camera, visible: false, yaw: 0, yawV: 0, drag: false, lx: 0, t0: performance.now() };
  function size() { const r = canvas.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); if (opts.onResize) opts.onResize(r.width / r.height); }
  st.size = size; size(); W.addEventListener('resize', size);
  /* Ziehen zum Drehen */
  canvas.addEventListener('pointerdown', (e) => { st.drag = true; st.lx = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.classList.add('grab'); });
  canvas.addEventListener('pointermove', (e) => { if (!st.drag) return; const dx = e.clientX - st.lx; st.lx = e.clientX; st.yawV = dx * 0.006; st.yaw += st.yawV; });
  const up = () => { st.drag = false; canvas.classList.remove('grab'); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  if ('IntersectionObserver' in W) new IntersectionObserver((es) => es.forEach((e) => { st.visible = e.isIntersecting; if (st.visible) loop(); }), { rootMargin: '100px' }).observe(canvas);
  else st.visible = true;
  let last = performance.now(), running = false;
  function loop() {
    if (running) return; running = true;
    (function f(now) {
      if (!st.visible) { running = false; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!st.drag) { st.yawV *= 0.94; st.yaw += st.yawV + (reduce ? 0 : dt * (opts.spin || 0)); }
      opts.update(dt, (now - st.t0) / 1000, st);
      renderer.render(scene, camera);
      requestAnimationFrame(f);
    })(last = performance.now());
  }
  st.loop = loop;
  return st;
}

/* Spiegelnder Boden mit Lichtkegel */
function floor(scene, r, col) {
  const g = new THREE.Mesh(new THREE.CircleGeometry(r, 96), new THREE.MeshStandardMaterial({ color: col || 0x070d22, metalness: 0.15, roughness: 0.62 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
  const c = D.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(110,160,255,.55)'); gr.addColorStop(0.5, 'rgba(47,107,255,.15)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.6, r * 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.005; scene.add(glow);
  return g;
}

/* ================= 1) Auto: AURON GT-E ================= */
function carDemo() {
  const canvas = D.getElementById('carGl'); if (!canvas) return;
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x1d4fff, metalness: 0.75, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 });
  const car = new THREE.Group();
  let st = null;
  st = makeStage(canvas, {
    fov: 30, spin: 0.22, exposure: 1.15,
    onResize(a) { st && fit(a); },
    update(dt, t, s) {
      car.rotation.y = s.yaw - 0.6;
      wheels.forEach((w) => { w.children[0].rotation.z -= dt * 3.2; });
      lightMat.emissiveIntensity = 2.4 + Math.sin(t * 3) * 0.3;
      sweep.position.x = ((t * 2.2) % 10) - 5;
      paint.color.lerp(target, 1 - Math.pow(0.002, dt));
    }
  });
  if (!st) return canvas.closest('.demo').classList.add('nogl');
  const { scene, camera } = st;
  function fit(a) { const far = a < 1 ? 15 : a < 1.4 ? 13.5 : 12.6, lx = a < 1 ? 0 : a < 1.4 ? -1.1 : -1.9; camera.position.set(lx, a < 1 ? 2.4 : 2.3, far); camera.lookAt(lx, a < 1 ? 0.7 : 0.8, 0); }
  fit(camera.aspect);
  floor(scene, 7);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 8, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -4; key.shadow.camera.right = 4; key.shadow.camera.top = 4; key.shadow.camera.bottom = -4; key.shadow.radius = 6; scene.add(key);
  scene.add(new THREE.HemisphereLight(0x9cc2ff, 0x020617, 0.6));
  const rim = new THREE.PointLight(0x4f8bff, 22, 9, 1.8); rim.position.set(0.5, 2.4, -3.2); scene.add(rim);

  /* Karosserie aus Seitenprofil */
  const prof = (pts) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) { const p = pts[i]; if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]); else s.lineTo(p[0], p[1]); } s.closePath(); return s; };
  const ext = (shape, depth, bevel, mat) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 8, curveSegments: 24 }); g.translate(0, 0, -depth / 2); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
  const body = prof([[2.3, 0.3], [2.48, 0.36, 2.42, 0.5], [2.32, 0.62, 2.0, 0.68], [0.9, 0.8], [-1.3, 0.9], [-2.05, 0.92, -2.3, 0.78], [-2.42, 0.6, -2.36, 0.36], [-2.3, 0.26, -2.0, 0.26], [-1.78, 0.26], [-1.62, 0.7, -1.33, 0.7], [-1.04, 0.7, -0.88, 0.26], [0.92, 0.26], [1.08, 0.7, 1.37, 0.7], [1.66, 0.7, 1.8, 0.26], [2.15, 0.26]]);
  car.add(ext(body, 1.34, 0.22, paint));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x050a18, metalness: 0.2, roughness: 0.05, clearcoat: 1, envMapIntensity: 2.2 });
  const cabin = prof([[1.0, 0.8], [0.3, 1.2, -0.25, 1.24], [-0.75, 1.24], [-1.5, 1.16, -2.05, 0.9], [-1.0, 0.88]]);
  car.add(ext(cabin, 1.06, 0.16, glass));
  /* Lichter */
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xcfe0ff, emissiveIntensity: 2.4 });
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2040, emissive: 0xff1a3c, emissiveIntensity: 2.6 });
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 1.5), lightMat); hl.position.set(2.5, 0.52, 0); car.add(hl);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.7), tailMat); tl.position.set(-2.55, 0.7, 0); car.add(tl);
  /* Räder */
  const tire = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.75 });
  const rimM = new THREE.MeshPhysicalMaterial({ color: 0xe8eeff, metalness: 0.9, roughness: 0.2, clearcoat: 1, emissive: 0x1a2a55, emissiveIntensity: 0.6, envMapIntensity: 2 });
  const wheels = [];
  [[1.37, 0.84], [1.37, -0.84], [-1.33, 0.84], [-1.33, -0.84]].forEach(([x, z]) => {
    const w = new THREE.Group(), spin = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.1, 18, 48), tire); spin.add(t);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 40), new THREE.MeshStandardMaterial({ color: 0x1a1f2b, metalness: 0.8, roughness: 0.35 })); disc.rotation.x = Math.PI / 2; spin.add(disc);
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.05), rimM); sp.rotation.z = i * Math.PI / 5 * 2; sp.position.z = z > 0 ? 0.08 : -0.08; spin.add(sp); }
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.06), new THREE.MeshStandardMaterial({ color: 0xe7b85a, metalness: 0.6, roughness: 0.3 })); cal.position.set(0.12, 0.08, z > 0 ? -0.02 : 0.02);
    spin.children.forEach((c) => { c.castShadow = true; });
    w.add(spin, cal); w.position.set(x, 0.38, z);
    car.add(w); wheels.push(w);
  });
  /* Lichtband, das über den Lack läuft */
  const sweep = new THREE.PointLight(0xffffff, 18, 3.2, 2); sweep.position.set(0, 1.9, 1.6); car.add(sweep);
  scene.add(car); car.position.y = 0.02;
  st.loop();
  /* Lackfarbe wählen */
  const target = paint.color.clone();
  D.querySelectorAll('#carSw button').forEach((b) => b.addEventListener('click', () => {
    D.querySelectorAll('#carSw button').forEach((x) => x.classList.toggle('on', x === b));
    target.set(b.getAttribute('data-c')); D.getElementById('carCol').textContent = b.getAttribute('aria-label');
  }));
}

/* ================= 2) Bau: NORDBAU Hafenturm ================= */
function buildDemo() {
  const canvas = D.getElementById('bauGl'); if (!canvas) return;
  const FLOORS = 12, floors = [];
  const pct = D.getElementById('bauPct'), lvl = D.getElementById('bauLvl'), bar = D.getElementById('bauBar');
  let prog = 0, hold = 0;
  let st = null;
  st = makeStage(canvas, {
    fov: 34, spin: 0.12, exposure: 1.05,
    onResize(a) { st && fit(a); },
    update(dt, t, s) {
      site.rotation.y = s.yaw + 0.25;
      if (!reduce) { if (prog < 1) prog = Math.min(1, prog + dt / 9); else if ((hold += dt) > 3) { prog = 0; hold = 0; } } else prog = 1;
      const f = prog * FLOORS;
      floors.forEach((fl, i) => {
        const k = THREE.MathUtils.clamp(f - i, 0, 1), e = 1 - Math.pow(1 - k, 3);
        fl.visible = k > 0; fl.position.y = 0.6 + i * 0.62 + (1 - e) * 2.4; fl.scale.setScalar(0.85 + e * 0.15);
        fl.userData.glass.material.opacity = 0.2 + e * 0.6;
      });
      const top = Math.min(FLOORS - 1, Math.floor(f));
      const hy = Math.min(9.4, 0.6 + top * 0.62 + 2.6 - (f % 1) * 2.0);
      hook.position.y = hy - 10; cable.scale.y = Math.max(0.1, 10 - hy); cable.position.y = -cable.scale.y / 2;
      jib.rotation.y = Math.sin(t * 0.5) * 0.25 - 2.56;
      beacon.material.emissiveIntensity = (Math.sin(t * 6) > 0) ? 3 : 0.2;
      const p = Math.round(prog * 100);
      if (pct) { pct.textContent = p + ' %'; lvl.textContent = Math.max(1, Math.ceil(f)) + ' / ' + FLOORS; bar.style.transform = 'scaleX(' + prog.toFixed(3) + ')'; }
    }
  });
  if (!st) return canvas.closest('.demo').classList.add('nogl');
  const { scene, camera } = st;
  function fit(a) { const far = a < 1 ? 24 : a < 1.4 ? 21 : 19, lx = a < 1 ? 0 : a < 1.4 ? -2.5 : -4.2; camera.position.set(far * 0.5 + lx, a < 1 ? 7 : 6.4, far); camera.lookAt(lx, a < 1 ? 4.4 : 4.2, 0); }
  fit(camera.aspect);
  const site = new THREE.Group(); scene.add(site);
  floor(scene, 11, 0x060b1a);
  const grid = new THREE.GridHelper(18, 36, 0x2f6bff, 0x13306f); grid.position.y = 0.01; grid.material.transparent = true; grid.material.opacity = 0.45; site.add(grid);
  const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(8, 14, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); const sc = key.shadow.camera; sc.left = sc.bottom = -9; sc.right = sc.top = 9; scene.add(key);
  scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x020617, 0.7));
  const warm = new THREE.PointLight(0xffc27a, 40, 16, 1.6); warm.position.set(-5, 3, 4); scene.add(warm);
  /* Fundament */
  const slabM = new THREE.MeshStandardMaterial({ color: 0xc9d3e8, roughness: 0.55, metalness: 0.1 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.5, 3.6), slabM); base.position.y = 0.25; base.castShadow = base.receiveShadow = true; site.add(base);
  /* Etagen: Decke, Glasfassade, Stützen */
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x2f6bff, metalness: 0.2, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.8, envMapIntensity: 2.4, clearcoat: 1 });
  const colM = new THREE.MeshStandardMaterial({ color: 0xe7ecf7, roughness: 0.4, metalness: 0.2 });
  const finM = new THREE.MeshStandardMaterial({ color: 0xe7b85a, roughness: 0.3, metalness: 0.8 });
  for (let i = 0; i < FLOORS; i++) {
    const g = new THREE.Group(), w = 4.4 - (i > 8 ? (i - 8) * 0.35 : 0), d = 3.0 - (i > 8 ? (i - 8) * 0.2 : 0);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.1, d + 0.2), slabM); slab.position.y = 0.56; slab.castShadow = slab.receiveShadow = true;
    const gl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), glassM.clone()); gl.position.y = 0.26; gl.castShadow = true;
    g.add(slab, gl);
    [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 1], [0, -1]].forEach(([sx, sz]) => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.08), colM); c.position.set(sx * w / 2, 0.26, sz * d / 2); g.add(c); });
    if (i % 3 === 2) { const fin = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, 0.04, 0.04), finM); fin.position.set(0, 0.6, d / 2 + 0.11); g.add(fin); }
    g.userData.glass = gl; g.visible = false; site.add(g); floors.push(g);
  }
  /* Kran */
  const crane = new THREE.Group(); crane.position.set(3.6, 0, -2.4); site.add(crane);
  const yel = new THREE.MeshStandardMaterial({ color: 0xffc23d, roughness: 0.4, metalness: 0.5 });
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.3, 10, 0.3), yel); mast.position.y = 5; mast.castShadow = true; crane.add(mast);
  for (let y = 0.5; y < 10; y += 0.7) { const x = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), yel); x.position.y = y; x.rotation.z = 0.6; crane.add(x); }
  const jib = new THREE.Group(); jib.position.y = 10; crane.add(jib);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.22, 0.22), yel); arm.position.x = 3.2; arm.castShadow = true; jib.add(arm);
  const cw = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x39425a })); cw.position.set(-0.9, -0.2, 0); jib.add(cw);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.45), glassM); cab.position.set(0.2, -0.35, 0); jib.add(cab);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 2 })); beacon.position.set(0, 0.25, 0); jib.add(beacon);
  const trolley = new THREE.Group(); trolley.position.x = 4.2; jib.add(trolley);
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1, 0.02), new THREE.MeshBasicMaterial({ color: 0x9aa6c4 })); trolley.add(cable);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.6), slabM); hook.castShadow = true;
  trolley.add(hook);
  st.loop();
}

if (D.getElementById('carGl')) carDemo();
if (D.getElementById('bauGl')) buildDemo();
