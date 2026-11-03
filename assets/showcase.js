/* VONUMO Showroom – Branchen-Konzepte in Echtzeit-3D mit echten Modellen und echten Foto-Umgebungen
   Auto: Sportwagen-Modell (Ferrari 458 Italia von vicent091036, CC BY 4.0) wird in einer Garage enthüllt.
   Kristall: eigene Scroll-Geschichte in Weiß und Silber.
   Bau:  Turm wächst in einem echten Steinbruch (HDR „Quarry 01“, Poly Haven, CC0). */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/addons/loaders/DRACOLoader.js';
import { RGBELoader } from './vendor/addons/loaders/RGBELoader.js';
import { GroundedSkybox } from './vendor/addons/objects/GroundedSkybox.js';

const W = window, D = document;
const reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
const LOW = (navigator.hardwareConcurrency || 4) <= 4 || W.innerWidth < 700;
const DPR = Math.min(W.devicePixelRatio || 1, LOW ? 1.5 : 2);
const hdr = new RGBELoader();
const cache = {};
const loadHDR = (url) => cache[url] || (cache[url] = new Promise((res, rej) => hdr.load(url, (t) => { t.mapping = THREE.EquirectangularReflectionMapping; res(t); }, undefined, rej)));
const ease = (x) => x * x * (3 - 2 * x);

function makeStage(canvas, opts) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return null; }
  renderer.setPixelRatio(DPR); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opts.exposure || 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030818);
  const camera = new THREE.PerspectiveCamera(opts.fov || 36, 1, 0.1, 500);
  const st = { renderer, scene, camera, visible: false, yaw: 0, yawV: 0, drag: false, lx: 0, ready: false };
  function size() { const r = canvas.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); }
  size(); W.addEventListener('resize', size);
  canvas.addEventListener('pointerdown', (e) => { st.drag = true; st.lx = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.classList.add('grab'); });
  canvas.addEventListener('pointermove', (e) => { if (!st.drag) return; const dx = e.clientX - st.lx; st.lx = e.clientX; st.yawV = dx * 0.005; st.yaw += st.yawV; });
  const up = () => { st.drag = false; canvas.classList.remove('grab'); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  let running = false, last = 0, t = 0;
  st.start = () => {
    if ('IntersectionObserver' in W) new IntersectionObserver((es) => es.forEach((e) => { st.visible = e.isIntersecting; if (st.visible) loop(); }), { rootMargin: '120px' }).observe(canvas);
    else { st.visible = true; loop(); }
  };
  function loop() {
    if (running) return; running = true; last = performance.now();
    (function f(now) {
      if (!st.visible) { running = false; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (!st.drag) { st.yawV *= 0.93; st.yaw += st.yawV; }
      opts.update(dt, t, st);
      renderer.render(scene, camera);
      requestAnimationFrame(f);
    })(last);
  }
  return st;
}
const loaded = (demo) => demo.classList.add('ready');
const failed = (demo) => { demo.classList.add('nogl'); };

/* Fortschritt einer gepinnten Scroll-Sektion (0 … 1) */
function pinProgress(sec) { const r = sec.getBoundingClientRect(), span = Math.max(1, r.height - W.innerHeight); return Math.min(1, Math.max(0, -r.top / span)); }
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ================= 1) Garage: der Wagen wird enthüllt ================= */
function carDemo() {
  const canvas = D.getElementById('carGl'); if (!canvas) return;
  const demo = canvas.closest('.demo'), pin = D.getElementById('carPin');
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x0c0e14, metalness: 1, roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.02 });
  const detailsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.25 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x15171c, metalness: 0.5, roughness: 0.02, transparent: true, opacity: 0.82, clearcoat: 1 });
  const target = bodyMat.color.clone();
  let car = null, cloth = null, P = 0, front = 1;
  const G = { nx: 56, nz: 96, x0: -1.75, x1: 1.75, z0: -2.85, z1: 2.85 }; let H = null, base = null;
  const st = makeStage(canvas, {
    fov: 34, exposure: 1.0,
    update(dt, t, s) {
      const want = pin ? pinProgress(pin) : 1; P += (want - P) * (1 - Math.pow(0.0015, dt));
      demo.style.setProperty('--p', P.toFixed(3));
      demo.classList.toggle('revealed', want > 0.62);
      bodyMat.color.lerp(target, 1 - Math.pow(0.002, dt));
      if (cloth) drape(P, t);
      /* Kamera: tief, 3/4 von vorn → seitlich */
      const mob = s.camera.aspect < 1;
      const yaw = s.yaw + 0.95 - sm(0.25, 1, P) * 1.15 + Math.sin(t * 0.2) * 0.04;
      const r = (mob ? 9.4 : 7.2) - sm(0, 0.5, P) * 0.6 + sm(0.6, 1, P) * 0.9;
      const h = (mob ? 1.5 : 1.0) + sm(0.6, 1, P) * 0.25;
      s.camera.position.set(Math.sin(yaw) * r, h, Math.cos(yaw) * r);
      const off = mob ? 0 : (s.camera.aspect < 1.4 ? -0.6 : -1.2) * (1 - sm(0.55, 0.9, P) * 0.0);
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      s.camera.lookAt(right.x * off, mob ? 0.15 : 0.5, right.z * off);
      beams.forEach((b, i) => { b.material.color.setScalar(3.2 + Math.sin(t * 2 + i) * 0.15 + (i === 1 ? Math.max(0, Math.sin(t * 17)) * (t % 7 < 0.4 ? 2 : 0) : 0)); });
    }
  });
  if (!st) return failed(demo);
  const { scene } = st;
  scene.background = new THREE.Color(0x07080b); scene.fog = new THREE.Fog(0x07080b, 9, 22);
  /* Betonboden mit Spiegelung */
  const fc = D.createElement('canvas'); fc.width = fc.height = 512; const fx = fc.getContext('2d');
  fx.fillStyle = '#2a2b2e'; fx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const v = Math.random(); fx.fillStyle = 'rgba(' + (v > 0.5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * 0.07).toFixed(3) + ')'; fx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 1 + Math.random() * 3); }
  for (let i = 0; i < 26; i++) { fx.fillStyle = 'rgba(0,0,0,' + (0.05 + Math.random() * 0.08).toFixed(3) + ')'; fx.beginPath(); fx.ellipse(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 90, 10 + Math.random() * 40, Math.random() * 3, 0, 7); fx.fill(); }
  const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(5, 5); ft.anisotropy = 8;
  const floorM = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.32, metalness: 0.35, envMapIntensity: 0.6 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorM); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; scene.add(fl);
  /* Schräge Betonwände */
  const wallM = new THREE.MeshStandardMaterial({ color: 0x1a1b1f, roughness: 0.9 });
  [[-6, -0.5, 0.75], [6, -0.2, -0.85], [0, -8, 0]].forEach(([x, z, ry]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallM); w.position.set(x, 4, z - 4); w.rotation.y = ry; w.receiveShadow = true; scene.add(w); });
  /* Neon-Lichtbalken */
  const beams = [];
  [[-1.2, 4.2, -1, 0.5, 0.3, 7], [1.6, 4.5, 0.6, -0.6, -0.2, 6], [0.2, 3.9, -2.4, 0.15, 1.3, 5.5], [-3.8, 3, -4, 0.2, 0.9, 5]].forEach(([x, y, z, rz, ry, len]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); m.material.color.setScalar(3.2);
    m.position.set(x, y, z); m.rotation.set(0, ry, rz); scene.add(m); beams.push(m);
  });
  const spot = new THREE.SpotLight(0xffffff, 90, 18, 0.6, 0.65, 1.4); spot.position.set(0.5, 5.5, 1); spot.target.position.set(0, 0, 0); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; scene.add(spot, spot.target);
  const s2 = new THREE.SpotLight(0xdfe8ff, 50, 16, 0.5, 0.7, 1.4); s2.position.set(-4, 3.5, 3); scene.add(s2);
  const warm = new THREE.PointLight(0xffb36b, 8, 7, 1.6); warm.position.set(3, 0.8, 2.5); scene.add(warm);
  loadHDR('/assets/media/pedestrian_overpass_1k.hdr').then((tex) => { scene.environment = tex; scene.environmentIntensity = 0.45; }).catch(() => {});

  const draco = new DRACOLoader(); draco.setDecoderPath('/assets/vendor/addons/draco/');
  const gl = new GLTFLoader(); gl.setDRACOLoader(draco);
  const ao = new THREE.TextureLoader().load('/assets/media/ferrari_ao.png');
  gl.load('/assets/media/ferrari.glb', (g) => {
    car = g.scene.children[0];
    car.getObjectByName('body').material = bodyMat;
    ['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl', 'trim'].forEach((n) => { const o = car.getObjectByName(n); if (o) o.material = detailsMat; });
    const gls = car.getObjectByName('glass'); if (gls) gls.material = glassMat;
    const meshes = []; car.traverse((o) => { if (o.isMesh) { o.castShadow = true; meshes.push(o); } });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4), new THREE.MeshBasicMaterial({ map: ao, blending: THREE.MultiplyBlending, toneMapped: false, transparent: true, premultipliedAlpha: true }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.002; sh.renderOrder = 2; car.add(sh);
    scene.add(car); car.updateMatrixWorld(true);
    /* Scheinwerfer an */
    const lt = car.getObjectByName('lights'); if (lt) { const p = new THREE.Vector3(); lt.getWorldPosition(p); front = p.z >= 0 ? 1 : -1; }
    [-0.62, 0.62].forEach((x) => { const hl = new THREE.SpotLight(0xfff2d6, 30, 9, 0.42, 0.5, 1.5); hl.position.set(x, 0.65, front * 2.1); hl.target.position.set(x * 1.6, 0, front * 7); scene.add(hl, hl.target); });
    const tail = new THREE.PointLight(0xff2030, 3, 3, 2); tail.position.set(0, 0.8, -front * 2.35); scene.add(tail);
    makeCloth(); loaded(demo); st.start();
  }, undefined, () => failed(demo));

  /* Tuch: Höhenfeld per Raycast über dem Modell, dann gefaltet */
  function makeCloth() {
    /* Höhenfeld auf der GPU: Wagen von oben rendern, Höhe als Farbe auslesen (statt tausender Raycasts) */
    const nx = G.nx, nz = G.nz, w = nx + 1, h = nz + 1; H = new Float32Array(w * h);
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.UnsignedByteType, depthBuffer: true });
    const cam = new THREE.OrthographicCamera(G.x0, G.x1, -G.z0, -G.z1, 0.1, 10); cam.up.set(0, 0, -1); cam.position.set(0, 5, 0); cam.lookAt(0, 0, 0);
    const hm = new THREE.ShaderMaterial({ side: THREE.DoubleSide, vertexShader: 'varying float vY; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vY = wp.y; gl_Position = projectionMatrix * viewMatrix * wp; }', fragmentShader: 'varying float vY; void main(){ gl_FragColor = vec4(clamp(vY / 1.6, 0.0, 1.0), 0.0, 0.0, 1.0); }' });
    const tmp = new THREE.Scene(); tmp.overrideMaterial = hm; const parent = car.parent; tmp.add(car);
    const R = st.renderer, oldC = R.getClearColor(new THREE.Color()), oldA = R.getClearAlpha(), oldT = R.toneMapping;
    R.setRenderTarget(rt); R.setClearColor(0x000000, 1); R.toneMapping = THREE.NoToneMapping; R.clear(); R.render(tmp, cam);
    const px = new Uint8Array(w * h * 4); R.readRenderTargetPixels(rt, 0, 0, w, h, px);
    R.setRenderTarget(null); R.setClearColor(oldC, oldA); R.toneMapping = oldT; rt.dispose(); hm.dispose(); parent.add(car);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = px[(j * w + i) * 4] / 255 * 1.6; H[(nz - j) * w + i] = v > 0.02 ? v + 0.07 : 0; }
    const raw = H.slice();
    for (let it = 0; it < 70; it++) for (let j = 1; j < nz; j++) for (let i = 1; i < nx; i++) {
      const k = j * (nx + 1) + i, av = (H[k - 1] + H[k + 1] + H[k - nx - 1] + H[k + nx + 1]) / 4;
      H[k] = Math.max(raw[k], av - 0.05, H[k] * 0.0);
    }
    for (let it = 0; it < 6; it++) for (let j = 1; j < nz; j++) for (let i = 1; i < nx; i++) { const k = j * (nx + 1) + i; H[k] = Math.max(raw[k] * 0.98, (H[k] * 2 + H[k - 1] + H[k + 1] + H[k - nx - 1] + H[k + nx + 1]) / 6); }
    const geo = new THREE.PlaneGeometry(G.x1 - G.x0, G.z1 - G.z0, nx, nz); geo.rotateX(-Math.PI / 2);
    base = geo.attributes.position.array.slice();
    cloth = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0x5d5c59, roughness: 0.95, sheen: 0.35, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xb8b4ac), side: THREE.DoubleSide, envMapIntensity: 0.3 }));
    cloth.castShadow = true; cloth.receiveShadow = true; scene.add(cloth);
  }
  function sampleH(x, z) {
    const fx = (x - G.x0) / (G.x1 - G.x0) * G.nx, fz = (z - G.z0) / (G.z1 - G.z0) * G.nz;
    if (fx < 0 || fz < 0 || fx > G.nx || fz > G.nz) return -1;
    const i = Math.min(G.nx - 1, Math.floor(fx)), j = Math.min(G.nz - 1, Math.floor(fz)), u = fx - i, v = fz - j, w = G.nx + 1;
    return (H[j * w + i] * (1 - u) + H[j * w + i + 1] * u) * (1 - v) + (H[(j + 1) * w + i] * (1 - u) + H[(j + 1) * w + i + 1] * u) * v;
  }
  function drape(p, t) {
    const pos = cloth.geometry.attributes.position.array, k = sm(0.08, 0.72, p), slide = k * 7.4;
    for (let n = 0; n < pos.length; n += 3) {
      const x0 = base[n], z0 = base[n + 2];
      const rel = (z0 - G.z0) / (G.z1 - G.z0), lead = front > 0 ? rel : 1 - rel; /* 1 = vorne */
      const s = slide * (0.75 + lead * 0.35);
      let z = z0 - front * s, x = x0 * (1 - k * 0.25 * (1 - lead)), y = sampleH(x, z);
      const wave = Math.sin(z0 * 3.2 + t * 2.4) * 0.03 * k + Math.sin(x0 * 5 + z0 * 2) * 0.015;
      if (y < 0) { const out = Math.abs(z - (front > 0 ? G.z0 : G.z1)); y = 0.03 + Math.max(0, 0.5 - out * 0.35) * (0.5 + 0.5 * Math.sin(x0 * 7 + z0 * 5)); x *= 1 + out * 0.08; }
      else y += Math.sin(Math.PI * Math.min(1, k * 1.6)) * 0.22 * lead + wave;
      pos[n] = x; pos[n + 1] = Math.max(0.01, y); pos[n + 2] = z;
    }
    cloth.geometry.attributes.position.needsUpdate = true; cloth.geometry.computeVertexNormals();
    cloth.visible = p < 0.98;
  }
  D.querySelectorAll('#carSw button').forEach((b) => b.addEventListener('click', () => {
    D.querySelectorAll('#carSw button').forEach((y) => y.classList.toggle('on', y === b));
    target.set(b.getAttribute('data-c')); D.getElementById('carCol').textContent = b.getAttribute('aria-label');
  }));
}

/* ================= 2) Bau: Turm im echten Steinbruch ================= */
function buildDemo() {
  const canvas = D.getElementById('bauGl'); if (!canvas) return;
  const demo = canvas.closest('.demo');
  const FLOORS = 12, floors = [];
  const pct = D.getElementById('bauPct'), lvl = D.getElementById('bauLvl'), bar = D.getElementById('bauBar');
  let prog = 0, hold = 0, jib, hook, cable, beacon, site;
  const st = makeStage(canvas, {
    fov: 40, exposure: 0.9,
    update(dt, t, s) {
      if (!site) return;
      if (!reduce) { if (prog < 1) prog = Math.min(1, prog + dt / 10); else if ((hold += dt) > 3) { prog = 0; hold = 0; } } else prog = 1;
      const f = prog * FLOORS;
      floors.forEach((fl, i) => { const k = THREE.MathUtils.clamp(f - i, 0, 1), e = 1 - Math.pow(1 - k, 3); fl.visible = k > 0; fl.position.y = 0.5 + i * 0.62 + (1 - e) * 2.4; });
      const top = Math.min(FLOORS - 1, Math.floor(f)), hy = Math.min(9.4, 0.5 + top * 0.62 + 2.6 - (f % 1) * 2.0);
      hook.position.y = hy - 10; cable.scale.y = Math.max(0.1, 10 - hy); cable.position.y = -cable.scale.y / 2;
      jib.rotation.y = Math.sin(t * 0.5) * 0.25 - 2.56;
      beacon.material.emissiveIntensity = Math.sin(t * 6) > 0 ? 4 : 0.2;
      if (pct) { pct.textContent = Math.round(prog * 100) + ' %'; lvl.textContent = Math.max(1, Math.ceil(f)) + ' / ' + FLOORS; bar.style.transform = 'scaleX(' + prog.toFixed(3) + ')'; }
      const mob = s.camera.aspect < 1, yaw = s.yaw + 0.75 + (reduce ? 0 : t * 0.04), r = mob ? 25 : 19;
      s.camera.position.set(Math.sin(yaw) * r, mob ? 6.5 : 5.2, Math.cos(yaw) * r);
      const off = mob ? 0 : s.camera.aspect < 1.4 ? 2.6 : 4.4, right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      s.camera.lookAt(-right.x * off, mob ? 4.6 : 4, -right.z * off);
    }
  });
  if (!st) return failed(demo);
  const { scene } = st;
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2); sun.position.set(-10, 16, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = sc.bottom = -10; sc.right = sc.top = 10; sc.far = 60; sun.shadow.bias = -0.0005; scene.add(sun);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 })); shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.position.y = 0.01; shadowFloor.receiveShadow = true; scene.add(shadowFloor);
  loadHDR('/assets/media/quarry_01_1k.hdr').then((tex) => {
    scene.environment = tex;
    const sky = new GroundedSkybox(tex, 15, 110); sky.position.y = 15 - 0.01; scene.add(sky);
    build(); loaded(demo); st.start();
  }).catch(() => failed(demo));

  function build() {
    site = new THREE.Group(); scene.add(site);
    const concrete = new THREE.MeshStandardMaterial({ color: 0xbdb7ab, roughness: 0.92, metalness: 0 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x9fbbd8, metalness: 0.9, roughness: 0.06, envMapIntensity: 1.4, clearcoat: 1 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.45, metalness: 0.8 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 4.4), concrete); base.position.y = 0.25; base.castShadow = base.receiveShadow = true; site.add(base);
    for (let i = 0; i < FLOORS; i++) {
      const g = new THREE.Group(), w = 4.4 - (i > 8 ? (i - 8) * 0.35 : 0), d = 3.0 - (i > 8 ? (i - 8) * 0.2 : 0);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, 0.12, d + 0.24), concrete); slab.position.y = 0.56; slab.castShadow = slab.receiveShadow = true;
      const gl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), glass); gl.position.y = 0.26; gl.castShadow = true;
      g.add(slab, gl);
      for (let k = -2; k <= 2; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), steel); m.position.set(k * w / 4, 0.26, d / 2 + 0.01); g.add(m); const m2 = m.clone(); m2.position.z = -d / 2 - 0.01; g.add(m2); }
      g.visible = false; site.add(g); floors.push(g);
    }
    /* Kran */
    const crane = new THREE.Group(); crane.position.set(3.8, 0, -2.6); site.add(crane);
    const yel = new THREE.MeshStandardMaterial({ color: 0xf2b21b, roughness: 0.5, metalness: 0.4 });
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.32, 10, 0.32), yel); mast.position.y = 5; mast.castShadow = true; crane.add(mast);
    for (let y = 0.4; y < 10; y += 0.6) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.035), yel); b.position.y = y; b.rotation.z = 0.7; b.castShadow = true; crane.add(b); }
    jib = new THREE.Group(); jib.position.y = 10; crane.add(jib);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.24, 0.24), yel); arm.position.x = 3.2; arm.castShadow = true; jib.add(arm);
    const cw = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.55), concrete); cw.position.set(-0.9, -0.25, 0); cw.castShadow = true; jib.add(cw);
    beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 2 })); beacon.position.set(0, 0.28, 0); jib.add(beacon);
    const trolley = new THREE.Group(); trolley.position.x = 4.3; jib.add(trolley);
    cable = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1, 0.02), steel); trolley.add(cable);
    hook = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.7), concrete); hook.castShadow = true; trolley.add(hook);
    /* Baumaterial am Boden */
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.8), concrete); p.position.set(-4.2 + (i % 2) * 0.1, 0.09 + Math.floor(i / 2) * 0.19, 2.4 + (i % 2) * 0.05); p.rotation.y = (i % 3) * 0.04; p.castShadow = p.receiveShadow = true; site.add(p); }
  }
}


/* ================= 3) Kristall-Labor: Scroll-Geschichte in Weiß und Silber ================= */
function crystalDemo() {
  const canvas = D.getElementById('cryGl'); if (!canvas) return;
  const demo = canvas.closest('.demo'), pin = D.getElementById('cryPin'), steps = demo.querySelectorAll('.cr-step');
  let P = 0, cur = -1;
  const bricks = [], shards = [];
  const st = makeStage(canvas, {
    fov: 38, exposure: 1.05,
    update(dt, t, s) {
      const want = pin ? pinProgress(pin) : 0.3; P += (want - P) * (1 - Math.pow(0.002, dt));
      const idx = Math.min(3, Math.floor(want * 4 * 0.999)); if (idx !== cur) { cur = idx; steps.forEach((e, i) => e.classList.toggle('on', i === idx)); }
      const a = sm(0.0, 0.22, P), b = sm(0.2, 0.45, P), c = sm(0.48, 0.7, P), d = sm(0.72, 0.95, P);
      net.material.opacity = 0.55 * a * (1 - b * 0.8); dots.material.opacity = 0.9 * a * (1 - b);
      net.rotation.y = dots.rotation.y = t * 0.08;
      bricks.forEach((m) => {
        const u = m.userData, k = sm(u.delay, u.delay + 0.35, b) * (1 - c), e = 1 - Math.pow(1 - k, 3);
        const ex = c * (1 - d);
        m.position.lerpVectors(u.from, u.to, e).addScaledVector(u.dir, ex * u.fly);
        m.position.y += Math.sin(t * 0.8 + u.ph) * 0.12 * ex;
        m.rotation.set(u.r0.x * (1 - e) + ex * u.spin.x * (1 + t * 0.1), u.r0.y + ex * u.spin.y, u.r0.z * (1 - e) + ex * u.spin.z);
        m.scale.setScalar(Math.max(0.001, (k > 0.001 || ex > 0 ? 1 : 0) * (1 - d)));
      });
      core.scale.setScalar(0.12 + a * 0.12 + d * 0.28 + Math.sin(t * 2) * 0.02);
      core.material.opacity = 0.35 + d * 0.65; glow.material.opacity = 0.5 * a + d * 0.6; glow.scale.setScalar(3 + d * 3 + Math.sin(t * 1.5) * 0.2);
      rings.forEach((r, i) => { const q = sm(0.72 + i * 0.05, 0.92 + i * 0.03, P); r.scale.setScalar(Math.max(0.001, q)); r.rotation.x = Math.PI / 2 + Math.sin(t * 0.4 + i) * 0.2 * (1 - q); r.rotation.z = t * (0.1 + i * 0.06) * (i % 2 ? -1 : 1); });
      const mob = s.camera.aspect < 1, yaw = s.yaw + 0.5 + P * 1.2 + t * 0.02;
      const r = (mob ? 15 : 11.5) - c * 2.2 + d * 1.2, h = 3.6 - P * 1.6;
      s.camera.position.set(Math.sin(yaw) * r, h, Math.cos(yaw) * r); s.camera.lookAt(0, 1.4 + d * 0.4, 0);
    }
  });
  if (!st) return failed(demo);
  const { scene } = st;
  const sky = new THREE.Color(0xb9bec8); scene.background = sky; scene.fog = new THREE.Fog(0xb9bec8, 10, 34);
  /* Studio-Licht für Eisglanz */
  const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: 0x9aa1ad, side: THREE.BackSide })));
  [[0, 12, 0, 18, 3], [10, 4, 6, 3, 10], [-10, 5, -4, 3, 10]].forEach(([x, y, z, w, h]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); });
  const pm = new THREE.PMREMGenerator(st.renderer); scene.environment = pm.fromScene(es, 0.04).texture; pm.dispose();
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(6, 12, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = sc.bottom = -8; sc.right = sc.top = 8; scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a909c, 0.8));
  /* Schneelandschaft mit Relief */
  const tg = new THREE.PlaneGeometry(80, 80, 110, 110); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position.array;
  for (let i = 0; i < tp.length; i += 3) { const x = tp[i], z = tp[i + 2], d0 = Math.hypot(x, z); tp[i + 1] = (Math.sin(x * 0.35) * Math.cos(z * 0.3) * 0.5 + Math.sin(x * 1.3 + z * 0.9) * 0.12 + Math.sin(x * 3.1 - z * 2.7) * 0.04) * Math.min(1, Math.max(0, (d0 - 3.4) / 4)) + Math.max(0, d0 - 14) * 0.25; }
  tg.computeVertexNormals();
  const terr = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.95 })); terr.receiveShadow = true; scene.add(terr);
  /* Netz aus Punkten und Linien (Idee) */
  const pts = []; for (let i = 0; i < 90; i++) { const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random()) , R = 2.2 + Math.random() * 1.8; pts.push(new THREE.Vector3(Math.sin(ph) * Math.cos(th) * R, Math.cos(ph) * R * 0.9 + 0.2, Math.sin(ph) * Math.sin(th) * R)); }
  const seg = []; pts.forEach((p, i) => { pts.forEach((q, j) => { if (j > i && p.distanceTo(q) < 1.35) seg.push(p.x, p.y, p.z, q.x, q.y, q.z); }); });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  const net = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); scene.add(net);
  const dots = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0 })); scene.add(dots);
  /* Eisblöcke, die eine Kuppel bilden */
  const iceM = new THREE.MeshPhysicalMaterial({ color: 0xeef3fb, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08,  });
  const bg = new THREE.BoxGeometry(0.62, 0.34, 0.3, 2, 2, 2);
  const rows = 7, R = 2.4;
  for (let r = 0; r < rows; r++) {
    const ph = (r / rows) * Math.PI / 2 * 0.98, ring = Math.cos(ph) * R, y = Math.sin(ph) * R + 0.17, n = Math.max(3, Math.round(2 * Math.PI * ring / 0.66));
    for (let i = 0; i < n; i++) {
      const th = (i + (r % 2) * 0.5) / n * Math.PI * 2;
      if (r < 2 && Math.abs(Math.atan2(Math.sin(th - 0.7), Math.cos(th - 0.7))) < 0.28) continue; /* Eingang */
      const m = new THREE.Mesh(bg, iceM); m.castShadow = true; m.receiveShadow = true;
      const to = new THREE.Vector3(Math.cos(th) * ring, y, Math.sin(th) * ring);
      const dir = to.clone().setY(to.y + 0.5).normalize();
      m.lookAt(0, y, 0);
      m.userData = { to, from: to.clone().add(dir.clone().multiplyScalar(5 + Math.random() * 4)).add(new THREE.Vector3(0, 3 + Math.random() * 3, 0)), dir, fly: 2.5 + Math.random() * 4, delay: (r / rows) * 0.6 + Math.random() * 0.05, ph: Math.random() * 6, r0: new THREE.Euler(0, Math.atan2(-to.x, -to.z), ph * 0.9), spin: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3) };
      m.rotation.copy(m.userData.r0); m.scale.setScalar(0.001); scene.add(m); bricks.push(m);
    }
  }
  /* Kern, Leuchten, Ringe (Marke) */
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, fog: false })); core.position.y = 1.4; scene.add(core);
  const gc = D.createElement('canvas'); gc.width = gc.height = 256; const gx = gc.getContext('2d'); const gr = gx.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(220,235,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 256, 256);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false })); glow.position.y = 1.4; scene.add(glow);
  const ringM = new THREE.MeshPhysicalMaterial({ color: 0xf4f6fa, roughness: 0.3, clearcoat: 1, metalness: 0.1 });
  const rings = [2.0, 2.8, 3.7].map((rad, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.12 + i * 0.03, 24, 160, Math.PI * (1.55 + i * 0.12)), ringM); r.position.y = 1.4; r.castShadow = true; r.scale.setScalar(0.001); scene.add(r); return r; });
  loaded(demo); st.start();
}

/* Szenen erst starten, wenn sie in die Nähe kommen – sonst blockiert die Seite beim Laden */
function lazy(id, fn) {
  const el = D.getElementById(id); if (!el) return;
  if (!('IntersectionObserver' in W)) { fn(); return; }
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); setTimeout(fn, 30); } }, { rootMargin: '0px 0px -30% 0px' });
  io.observe(el.closest('.pin') || el);
}
lazy('carGl', carDemo);
lazy('bauGl', buildDemo);
lazy('cryGl', crystalDemo);
