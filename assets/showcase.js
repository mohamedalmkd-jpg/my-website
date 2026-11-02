/* VONUMO Showroom – Branchen-Konzepte in Echtzeit-3D mit echten Modellen und echten Foto-Umgebungen
   Auto: Sportwagen-Modell (Ferrari 458 Italia von vicent091036, CC BY 4.0) fährt durch eine reale HDR-Umgebung.
   Bau:  Turm wächst in einem echten Steinbruch (HDR „Quarry 01“, Poly Haven, CC0). */
import * as THREE from 'three';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/addons/loaders/DRACOLoader.js';
import { RGBELoader } from './vendor/addons/loaders/RGBELoader.js';
import { GroundedSkybox } from './vendor/addons/objects/GroundedSkybox.js';

const W = window, D = document;
const reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(W.devicePixelRatio || 1, 2);
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

/* ================= 1) Sportwagen, der beschleunigt ================= */
function carDemo() {
  const canvas = D.getElementById('carGl'); if (!canvas) return;
  const demo = canvas.closest('.demo'), kmhEl = D.getElementById('carKmh'), gearEl = D.getElementById('carGear'), barEl = D.getElementById('carBar'), fx = demo.querySelector('.dm-speedfx');
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0x1d4fff, metalness: 1, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.03 });
  const detailsMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.25, roughness: 0, transmission: 1 });
  const target = bodyMat.color.clone();
  const wheels = []; let car = null, road = null, lines = null, speed = 0;
  const st = makeStage(canvas, {
    fov: 38, exposure: 0.95,
    update(dt, t, s) {
      /* Zyklus: Stand – Beschleunigen – Fahrt – Bremsen */
      const c = reduce ? 0 : t % 13; let a = 0;
      const want = c < 2 ? 0 : c < 6 ? ease((c - 2) / 4) : c < 9.5 ? 1 : c < 12 ? 1 - ease((c - 9.5) / 2.5) : 0;
      a = (want - speed) / Math.max(dt, 0.001); speed = want;
      const kmh = Math.round(speed * 318);
      if (kmhEl) { kmhEl.textContent = kmh; gearEl.textContent = kmh < 1 ? 'N' : String(Math.min(7, 1 + Math.floor(kmh / 48))); barEl.style.transform = 'scaleX(' + speed.toFixed(3) + ')'; }
      if (fx) fx.style.opacity = (Math.max(0, speed - 0.25) * 1.2).toFixed(2);
      bodyMat.color.lerp(target, 1 - Math.pow(0.002, dt));
      if (car) {
        wheels.forEach((w) => { w.rotation.x -= dt * speed * 60; });
        car.rotation.x = THREE.MathUtils.clamp(-a * 0.01, -0.03, 0.03) * 0.6 + car.rotation.x * 0.4; /* Heck senkt sich beim Beschleunigen */
        car.position.y = Math.sin(t * 40) * 0.004 * speed;
      }
      if (road) { road.material.map.offset.y -= dt * speed * 9; lines.position.z = ((t * speed * 24) % 8) - 4; }
      s.scene.backgroundRotation.y = s.scene.environmentRotation.y = (s.scene.backgroundRotation.y || 0) + dt * speed * 0.35;
      const yaw = s.yaw + 0.9 + Math.sin(t * 0.15) * 0.25, mob = s.camera.aspect < 1, r = mob ? 10 : 7;
      const shake = speed > 0.2 ? speed * 0.012 : 0;
      s.camera.fov = (mob ? 50 : 38) + speed * 9; s.camera.updateProjectionMatrix();
      s.camera.position.set(Math.sin(yaw) * r + (Math.random() - 0.5) * shake, (mob ? 1.9 : 1.45) + (Math.random() - 0.5) * shake, Math.cos(yaw) * r);
      const off = mob ? 0 : s.camera.aspect < 1.4 ? -0.8 : -1.5;
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      s.camera.lookAt(right.x * off, mob ? 0.1 : 0.45, right.z * off);
    }
  });
  if (!st) return failed(demo);
  const { scene } = st;
  scene.backgroundBlurriness = 0.18; scene.backgroundIntensity = 0.85;
  /* Straße mit Mittelstreifen */
  const rc = D.createElement('canvas'); rc.width = 256; rc.height = 512; const x = rc.getContext('2d');
  x.fillStyle = '#16181d'; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2600; i++) { x.fillStyle = 'rgba(' + (Math.random() > 0.5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * 0.08).toFixed(3) + ')'; x.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); }
  x.fillStyle = '#e8e2c8'; x.fillRect(122, 0, 12, 230); x.fillStyle = '#cfd3dc'; x.fillRect(6, 0, 6, 512); x.fillRect(244, 0, 6, 512);
  const rt = new THREE.CanvasTexture(rc); rt.colorSpace = THREE.SRGBColorSpace; rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(1, 6); rt.anisotropy = 8;
  road = new THREE.Mesh(new THREE.PlaneGeometry(9, 80), new THREE.MeshStandardMaterial({ map: rt, roughness: 0.82, metalness: 0.05 }));
  road.rotation.x = -Math.PI / 2; road.position.y = -0.002; road.receiveShadow = true; scene.add(road);
  /* Fahrtwind-Streifen am Boden */
  lines = new THREE.Group(); scene.add(lines);
  for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 2.4), new THREE.MeshBasicMaterial({ color: 0x9cc2ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); l.rotation.x = -Math.PI / 2; l.position.set((Math.random() - 0.5) * 8, 0.01, (i - 7) * 1.4); lines.add(l); }
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(3, 8, 4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = sc.bottom = -4; sc.right = sc.top = 4; scene.add(sun);
  loadHDR('/assets/media/pedestrian_overpass_1k.hdr').then((tex) => { scene.environment = tex; scene.background = tex; }).catch(() => {});
  const draco = new DRACOLoader(); draco.setDecoderPath('/assets/vendor/addons/draco/');
  const gl = new GLTFLoader(); gl.setDRACOLoader(draco);
  const ao = new THREE.TextureLoader().load('/assets/media/ferrari_ao.png');
  gl.load('/assets/media/ferrari.glb', (g) => {
    car = g.scene.children[0];
    car.getObjectByName('body').material = bodyMat;
    ['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl', 'trim'].forEach((n) => { const o = car.getObjectByName(n); if (o) o.material = detailsMat; });
    const gls = car.getObjectByName('glass'); if (gls) gls.material = glassMat;
    ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'].forEach((n) => { const w = car.getObjectByName(n); if (w) wheels.push(w); });
    car.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4), new THREE.MeshBasicMaterial({ map: ao, blending: THREE.MultiplyBlending, toneMapped: false, transparent: true, premultipliedAlpha: true }));
    sh.rotation.x = -Math.PI / 2; sh.renderOrder = 2; car.add(sh);
    scene.add(car); loaded(demo); st.start();
  }, undefined, () => failed(demo));
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
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2); sun.position.set(-10, 16, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = sc.bottom = -10; sc.right = sc.top = 10; sc.far = 60; sun.shadow.bias = -0.0005; scene.add(sun);
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

if (D.getElementById('carGl')) carDemo();
if (D.getElementById('bauGl')) buildDemo();
