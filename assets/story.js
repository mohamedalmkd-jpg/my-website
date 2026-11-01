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

/* ================= Szene ================= */
const NAVY = new THREE.Color('#030a24');
const N0 = new THREE.Vector3(0, 0, -260);

function build(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  const DPR = Math.min(W.devicePixelRatio || 1, lite ? 1.3 : 1.6);
  renderer.setPixelRatio(DPR); renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(NAVY.clone(), 14, 70);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 160);
  const nightEnv = envFrom(renderer, 'float h = d.y*0.5+0.5; vec3 c = mix(vec3(0.01,0.02,0.06), vec3(0.08,0.16,0.45), smoothstep(0.3,1.0,h)); c += vec3(0.4,0.65,1.6)*smoothstep(0.985,1.0,sin(d.x*9.0+d.y*3.0)*0.5+0.5)*1.5; c += vec3(1.2,1.5,2.2)*pow(max(dot(d, normalize(vec3(-0.5,0.6,0.5))),0.0), 18.0); c += vec3(0.5,0.8,2.0)*pow(max(dot(d, normalize(vec3(0.6,0.3,0.6))),0.0), 10.0); gl_FragColor = vec4(c,1.0);');
  scene.add(new THREE.HemisphereLight(0x9fbfff, 0x050a20, 0.4));

  /* --- Glas-Würfel --- */
  const SIDE = lite ? 10 : 12, N = Math.max(SIDE * SIDE, 27) + (lite ? 16 : 36);
  const cubeMat = new THREE.ShaderMaterial({
    uniforms: { uFog: { value: NAVY.clone() } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying vec3 vL; varying float vHot; varying float vD;
      void main(){
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz); vL = position; vHot = instanceColor.r; vD = length(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform vec3 uFog; varying vec3 vN; varying vec3 vV; varying vec3 vL; varying float vHot; varying float vD;
      void main(){
        vec3 a = abs(vL); float mx = max(a.x, max(a.y, a.z)), mn = min(a.x, min(a.y, a.z)), mid = a.x + a.y + a.z - mx - mn;
        float edge = smoothstep(0.405, 0.492, mid);
        float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
        float ndl = max(dot(normalize(vN), normalize(vec3(0.35, 0.85, 0.45))), 0.0);
        vec2 f = vL.x > 0.49 || vL.x < -0.49 ? vL.yz : (vL.y > 0.49 || vL.y < -0.49 ? vL.xz : vL.xy);
        float inner = 1.0 - smoothstep(0.0, 0.62, length(f));
        vec3 col = mix(vec3(0.004, 0.014, 0.08), vec3(0.025, 0.09, 0.42), ndl * 0.55 + inner * 0.45);
        col += fres * vec3(0.12, 0.32, 1.0) * 0.8 + edge * vec3(0.38, 0.62, 1.0) * 1.3;
        col = mix(col, vec3(0.78, 0.88, 1.0) * (0.85 + inner * 0.3) + edge * 0.15, vHot);
        col = mix(col, uFog, smoothstep(16.0, 60.0, vD) * 0.9);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), cubeMat, N);
  cubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cubes.setColorAt(0, new THREE.Color(0, 0, 0)); cubes.instanceColor.setUsage(THREE.DynamicDrawUsage);
  cubes.frustumCulled = false;
  scene.add(cubes);
  const R = rng(17), CI = [];
  for (let i = 0; i < N; i++) {
    const u = R() * 2 - 1, th = R() * 6.283, s = Math.sqrt(1 - u * u);
    const r1 = 4.2 + Math.pow(R(), 0.7) * 7, r2 = 11 + R() * 9;
    CI.push({
      sc: new THREE.Vector3(Math.cos(th) * s * r1, u * r1 * 0.7, Math.sin(th) * s * r1 * 0.8 - 3.5),
      far: new THREE.Vector3(Math.cos(th) * s * r2, u * r2 * 0.7, Math.sin(th) * s * r2 - 3),
      size: 0.14 + R() * 0.34, ph: R() * 6.283, sp: 0.2 + R() * 0.6, delay: R(), hot: R() < 0.06 ? 0.9 : 0,
      ax: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize()
    });
  }

  /* --- Lichtstern, Strahl, Ring, Staub, Warp --- */
  const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }));
  scene.add(star);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, ...ADD, uniforms: { uO: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uO, uT; varying vec2 vU; void main(){ float x = abs(vU.x-0.5)*2.0; float core = exp(-x*x*180.0); float halo = exp(-x*x*9.0)*0.35; float fall = smoothstep(0.0,0.35,vU.y); float fl = 0.9 + 0.1*sin(uT*7.0 + vU.y*30.0); vec3 c = vec3(0.75,0.87,1.0)*core*1.6 + vec3(0.2,0.45,1.0)*halo; gl_FragColor = vec4(c*fall*fl*uO, 1.0); }'
  }));
  beam.scale.set(9, 46, 1); beam.position.set(0, 13, -63); scene.add(beam);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshBasicMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, -2.6, -63); scene.add(pool);

  const ringG = new THREE.Group(); scene.add(ringG);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd8e6ff, transparent: true, opacity: 0, toneMapped: false });
  ringG.add(new THREE.Mesh(new THREE.TorusGeometry(3.05, 0.022, 10, 240), ringMat));
  const ringHalo = new THREE.Mesh(new THREE.RingGeometry(2.7, 3.7, 128), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, ...ADD, uniforms: { uO: { value: 0 }, uT: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uO, uT; varying vec2 vP; void main(){ float r = length(vP); float a = atan(vP.y, vP.x); float g = exp(-pow((r-3.05)*4.2, 2.0)); float s = 0.6 + 0.4*sin(a*3.0 + uT*0.8); gl_FragColor = vec4(vec3(0.35,0.6,1.0)*g*s*uO*1.4, 1.0); }'
  }));
  ringG.add(ringHalo);
  const SP = lite ? 1200 : 2600, sp = new Float32Array(SP * 3), rs = rng(5);
  for (let i = 0; i < SP; i++) { const u = rs() * 2 - 1, th = rs() * 6.283, s = Math.sqrt(1 - u * u), r = 2.95 + (rs() - 0.5) * 0.12; sp[i * 3] = Math.cos(th) * s * r; sp[i * 3 + 1] = u * r; sp[i * 3 + 2] = Math.sin(th) * s * r; }
  const shell = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: 0x8fb6ff, size: 0.028, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  ringG.add(shell);

  const DN = lite ? 900 : 2200, dp = new Float32Array(DN * 3), rd = rng(9);
  for (let i = 0; i < DN; i++) { dp[i * 3] = (rd() - 0.5) * 60; dp[i * 3 + 1] = (rd() - 0.5) * 40; dp[i * 3 + 2] = -rd() * 110 + 25; }
  const dust = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dp, 3)), new THREE.PointsMaterial({ color: 0x6f9cff, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  const WN = lite ? 260 : 600, wp = new Float32Array(WN * 6), wr = new Float32Array(WN * 2), rw = rng(13);
  for (let i = 0; i < WN; i++) {
    const a = rw() * 6.283, r = 0.8 + Math.pow(rw(), 0.6) * 7, z = -20 - rw() * 70, len = 1.5 + rw() * 5;
    wp.set([Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a) * r, Math.sin(a) * r, z - len], i * 6); wr[i * 2] = wr[i * 2 + 1] = rw();
  }
  const wGeo = new THREE.BufferGeometry(); wGeo.setAttribute('position', new THREE.BufferAttribute(wp, 3)); wGeo.setAttribute('rv', new THREE.BufferAttribute(wr, 1));
  const warpMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, ...ADD, uniforms: { uT: { value: 0 }, uW: { value: 0 } },
    vertexShader: 'attribute float rv; uniform float uT, uW; varying float vA; void main(){ vec3 p = position; p.z = mod(p.z + 90.0 + uT*(28.0 + rv*40.0)*uW, 70.0) - 90.0; vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; vA = smoothstep(60.0, 8.0, -mv.z) * (0.4 + rv*0.6); }',
    fragmentShader: 'uniform float uW; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.55,0.75,1.0)*vA*uW*1.5, 1.0); }'
  });
  const warp = new THREE.LineSegments(wGeo, warpMat); warp.frustumCulled = false; scene.add(warp);
  const orbs = [];
  for (let i = 0; i < 6; i++) { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false })); o.userData = { a: i / 6 * 6.283, r: 2 + (i % 3) * 1.4, z0: -25 - i * 9 }; o.scale.setScalar(0.9); scene.add(o); orbs.push(o); }

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


  /* --- Nachbearbeitung (Desktop): leichte Aberration, Vignette, Korn --- */
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
          vec2 uv = vUv, c = uv - 0.5;
          vec2 off = c * (0.0015 + uG*0.012);
          vec4 r = texture2D(tD, uv + off), g = texture2D(tD, uv), b = texture2D(tD, uv - off);
          vec4 col = vec4(r.r, g.g, b.b, max(max(r.a,g.a),b.a));
          vec4 bl = (texture2D(tD, uv + vec2(0.004,0.0)) + texture2D(tD, uv - vec2(0.004,0.0)) + texture2D(tD, uv + vec2(0.0,0.006)) + texture2D(tD, uv - vec2(0.0,0.006))) * 0.25;
          col.rgb += max(bl.rgb - 0.55, 0.0) * 0.9;
          col.rgb += (h(uv*vec2(913.0,577.0)+uT) - 0.5) * 0.02 * col.a;
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
  return { renderer, scene, camera, resize, rt, post, postScene, postCam, cubes, CI, SIDE, N, star, beam, pool, ringG, ringMat, ringHalo, shell, dust, warpMat, orbs, night, ribbons, bubble };
}

/* ================= Würfel-Zustände ================= */
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const clusterRot = new THREE.Quaternion();
function cubeState(name, i, t, S, out) {
  const c = S.CI[i], side = S.SIDE;
  out.hot = 0; out.q.identity();
  if (name === 'cluster' || name === 'zoom') {
    if (i < 27) {
      const x = (i % 3) - 1, y = (Math.floor(i / 3) % 3) - 1, z = Math.floor(i / 9) - 1;
      out.p.set(x, y, z).multiplyScalar(1.03);
      const pop = (i === 2 || i === 15 || i === 24) && name === 'cluster' ? 0.35 + 0.25 * Math.sin(t * 1.3 + i) : 0;
      if (pop) out.p.add(new THREE.Vector3(x, y, z).normalize().multiplyScalar(pop));
      if (name === 'cluster') { out.p.applyQuaternion(clusterRot); out.q.copy(clusterRot); }
      out.s.setScalar(0.97);
      out.hot = (i === 8 || i === 24) ? 0.9 : 0;
      return;
    }
    out.p.copy(c.sc); out.p.y += Math.sin(t * c.sp + c.ph) * 0.25;
    _e.set(t * c.sp * c.ax.x + c.ph, t * c.sp * c.ax.y, t * c.sp * c.ax.z); out.q.setFromEuler(_e);
    out.s.setScalar(c.size); out.hot = c.hot; return;
  }
  if (name === 'scatter') {
    out.p.copy(c.sc).multiplyScalar(1.15); out.p.y += Math.sin(t * c.sp + c.ph) * 0.3;
    _e.set(t * c.sp * c.ax.x + c.ph, t * c.sp * c.ax.y, t * c.sp * c.ax.z); out.q.setFromEuler(_e);
    out.s.setScalar(c.size * (i < 27 ? 1.3 : 1)); out.hot = c.hot; return;
  }
  if (name === 'grid' || name === 'pixels') {
    if (i >= side * side) { out.p.copy(c.far); out.s.setScalar(0.001); return; }
    const ix = i % side, iz = Math.floor(i / side);
    const x = (ix - side / 2 + 0.5) * 1.02, z = (iz - side / 2 + 0.5) * 1.02;
    if (name === 'grid') {
      const n = vn(ix * 0.33 + 4 + t * 0.05, iz * 0.33 + 1);
      const h = 0.35 + Math.pow(n, 2.2) * 3.6;
      out.p.set(x, h / 2 - 1.2, z); out.s.set(0.94, h, 0.94);
      out.hot = n > 0.8 ? 0.9 : (hash(ix, iz) > 0.96 ? 0.6 : 0);
    } else {
      out.p.set(x, -1.2, z); out.s.set(0.95, 0.14, 0.95);
      const fl = hash(ix + Math.floor(t * 2.5) * 0.37, iz);
      out.hot = fl > 0.92 ? 0.85 : (fl > 0.8 ? 0.25 : 0);
    }
    return;
  }
  if (name === 'far') {
    out.p.copy(c.far); out.p.y += Math.sin(t * c.sp + c.ph) * 0.4;
    _e.set(t * c.sp * c.ax.x + c.ph, t * c.sp * c.ax.y, t * c.sp * c.ax.z); out.q.setFromEuler(_e);
    out.s.setScalar(c.size * 0.7); out.hot = c.hot * 0.6; return;
  }
  out.p.copy(c.far).multiplyScalar(2); out.s.setScalar(0.001);
}

/* ================= Stationen ================= */
const ST = [
  { id: 'hero', s: 'cluster', cam: [-2.6, 0.35, 10.5], look: [-2.6, 0, 0], mob: [0, -0.4, 13.5], mobL: [0, -3.6, 0] },
  { id: 'mission', s: 'cluster', cam: [-1.6, 0.8, 6.2], look: [-1.9, 0.1, 0], mob: [0, -0.2, 10], mobL: [0, -3.0, 0] },
  { id: 'vision', s: 'zoom', cam: [0, 0, 1.75], look: [0, 0, 0], star: 1 },
  { id: 'warp', s: 'far', cam: [0, 0, -24], look: [0, 0, -60], warp: 1 },
  { id: 'dashboard', s: 'far', cam: [0, -0.2, -44], look: [0, 2.0, -63], warp: 0.15, beam: 1 },
  { id: 'features', s: 'scatter', cam: [0, 0.3, 11], look: [0, 0, 0] },
  { id: 'welt', s: 'grid', cam: [8.5, 9.5, 8.5], look: [0, -0.4, 0] },
  { id: 'infra', s: 'pixels', cam: [0, 15.5, 0.01], look: [0, -1, 0] },
  { id: 'kontakt', s: 'far', cam: [0, 0, 9.4], look: [0, 0, 0], ring: 1 },
  { id: 'studio', s: 'hidden', cam: [0, 3.0, -247], look: [0, 3.0, -262], night: 1 }
];
const KEYS = ['star', 'warp', 'beam', 'ring', 'night'];

function start() {
  const html = D.documentElement;
  const S = build($('gl'));
  /* Loader */
  const ld = $('ld'), ldPct = $('ldPct'), ldBar = $('ldBar'), t0 = performance.now();
  let introAt = 0;
  (function tick() {
    const k = clamp((performance.now() - t0) / (reduce ? 1 : 1300), 0, 1);
    ldPct.textContent = String(Math.round(ease(k) * 100)).padStart(3, '0'); ldBar.style.transform = 'scaleX(' + ease(k).toFixed(3) + ')';
    if (k < 1) requestAnimationFrame(tick); else { ld.classList.add('out'); introAt = performance.now(); }
  })();
  if (!S) { html.classList.add('nogl'); return; }
  S.resize(); W.addEventListener('resize', () => { S.resize(); measure(); });

  /* Sound */
  const sound = makeSound(), snd = $('snd');
  snd.addEventListener('click', () => { const on = sound.toggle(); snd.setAttribute('aria-pressed', on ? 'true' : 'false'); });

  /* Punkte-Navigation */
  const dots = $('dots'), secs = Array.prototype.slice.call(D.querySelectorAll('.ch[data-name], #studio'));
  secs.forEach((s) => { const a = D.createElement('a'); a.href = '#' + s.id; a.setAttribute('aria-label', s.getAttribute('data-name') || 'Studio'); a.innerHTML = '<i></i>'; dots.appendChild(a); });
  D.querySelectorAll('.dots a, .tn a[href^="#"], .tn-logo').forEach((a) => a.addEventListener('click', (e) => { const t = D.querySelector(a.getAttribute('href')); if (!t) return; e.preventDefault(); t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }));

  /* Stationen messen */
  let stations = [];
  function measure() {
    const vh = W.innerHeight, out = [];
    ST.forEach((s) => { const n = $(s.id); if (!n) return; const top = n.getBoundingClientRect().top + W.scrollY; out.push(Object.assign({}, s, { y: s.id === 'hero' ? 0 : Math.max(0, top - vh * 0.15), h: n.offsetHeight, top })); });
    out.sort((a, b) => a.y - b.y); stations = out;
  }
  measure(); setInterval(measure, 2000); W.addEventListener('load', measure);

  const progBar = $('progBar'), progN = $('progN'), dash = D.querySelector('.dashui');
  const curP = new THREE.Vector3(0, 0.35, 9.6), curL = new THREE.Vector3(), tP = new THREE.Vector3(), tL = new THREE.Vector3();
  const A = { p: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion(), hot: 0 }, B = { p: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion(), hot: 0 };
  const cur = {}; KEYS.forEach((k) => { cur[k] = 0; });
  let lastT = performance.now(), lastY = W.scrollY, vel = 0, mx = 0, my = 0, smx = 0, smy = 0, visible = true, activeDot = -1, lastJump = 0;
  W.addEventListener('pointermove', (e) => { mx = e.clientX / W.innerWidth * 2 - 1; my = e.clientY / W.innerHeight * 2 - 1; }, { passive: true });
  D.addEventListener('visibilitychange', () => { visible = !D.hidden; if (visible) { lastT = performance.now(); requestAnimationFrame(loop); } });
  const fwd = new THREE.Vector3();

  function loop(now) {
    if (!visible) return;
    const t = now / 1000, dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    const vh = W.innerHeight, y = W.scrollY, maxY = Math.max(1, D.documentElement.scrollHeight - vh);
    vel = lerp(vel, (y - lastY) / Math.max(dt, 0.001), 0.12); lastY = y;
    html.classList.toggle('scrolled', y > 30);

    /* aktuelle Station */
    let i = 0; while (i < stations.length - 1 && y >= stations[i + 1].y) i++;
    const a = stations[i], b = stations[Math.min(i + 1, stations.length - 1)];
    const span = Math.max(1, b.y - a.y), local = a === b ? 0 : clamp((y - a.y) / span, 0, 1);
    // Übergang im letzten Drittel des Abschnitts
    const tt = a === b ? 0 : sm(0.45, 1, local);
    const k = 1 - Math.pow(0.002, dt);
    KEYS.forEach((key) => { cur[key] = lerp(cur[key], lerp(a[key] || 0, b[key] || 0, tt), k); });

    /* Fortschritt + Punkte */
    const g = clamp(y / maxY, 0, 1);
    progBar.style.height = (g * 100).toFixed(1) + '%'; progN.textContent = Math.round(g * 100) + '%';
    let ad = 0; secs.forEach((s, si) => { if (s.getBoundingClientRect().top < vh * 0.5) ad = si; });
    if (ad !== activeDot) { activeDot = ad; Array.prototype.forEach.call(dots.children, (d, di) => d.classList.toggle('on', di === ad)); }
    const st = $('studio').getBoundingClientRect().top;
    html.classList.toggle('studio-on', st < vh * 0.55);
    if (dash) { const r = dash.closest('.ch').getBoundingClientRect(); dash.style.setProperty('--dv', sm(0.05, 0.45, (vh - r.top) / (r.height)).toFixed(3)); }

    /* Würfel */
    clusterRot.setFromEuler(_e.set(0.42 + smy * 0.1, t * 0.22 + 0.6 + smx * 0.3, 0.1));
    const intro = reduce ? 1 : (introAt ? ease((now - introAt) / 2600) : 0);
    for (let n = 0; n < S.N; n++) {
      const c = S.CI[n];
      let sa = a.s, sb = b.s, w = clamp((tt * 1.35 - c.delay * 0.35), 0, 1);
      cubeState(sa, n, t, S, A); cubeState(sb, n, t, S, B);
      if (i === 0 && intro < 1) { // Intro: aus der Ferne zum Block
        const wi = clamp(intro * 1.4 - c.delay * 0.4, 0, 1);
        cubeState('far', n, t, S, B); _p.lerpVectors(B.p, A.p, ease(wi)); _s.lerpVectors(B.s, A.s, ease(wi)); _q.slerpQuaternions(B.q, A.q, ease(wi));
        _c.setRGB(lerp(B.hot, A.hot, wi), 0, 0);
      } else {
        const e = ease(w); _p.lerpVectors(A.p, B.p, e); _s.lerpVectors(A.s, B.s, e); _q.slerpQuaternions(A.q, B.q, e); _c.setRGB(lerp(A.hot, B.hot, e), 0, 0);
      }
      _m.compose(_p, _q, _s); S.cubes.setMatrixAt(n, _m); S.cubes.setColorAt(n, _c);
    }
    S.cubes.instanceMatrix.needsUpdate = true; S.cubes.instanceColor.needsUpdate = true;

    /* Kamera */
    const mob = W.innerWidth < 700;
    const ac = mob && a.mob ? a.mob : a.cam, bc = mob && b.mob ? b.mob : b.cam, al = mob && a.mobL ? a.mobL : a.look, bl = mob && b.mobL ? b.mobL : b.look;
    tP.set(lerp(ac[0], bc[0], tt), lerp(ac[1], bc[1], tt), lerp(ac[2], bc[2], tt));
    tL.set(lerp(al[0], bl[0], tt), lerp(al[1], bl[1], tt), lerp(al[2], bl[2], tt));
    if (mob && (a.id === 'kontakt' || a.id === 'features')) tP.z += 3;
    const ck = 1 - Math.pow(0.0008, dt);
    const jump = curP.distanceTo(tP) > 40;
    if (jump) { curP.copy(tP); curL.copy(tL); lastJump = now; } else { curP.lerp(tP, ck); curL.lerp(tL, ck); }
    smx = lerp(smx, mx, 0.04); smy = lerp(smy, my, 0.04);
    S.camera.position.set(curP.x + smx * 0.35, curP.y - smy * 0.2, curP.z);
    S.camera.lookAt(curL);

    /* Effekte */
    S.camera.getWorldDirection(fwd);
    S.star.position.copy(S.camera.position).addScaledVector(fwd, 3);
    const starA = cur.star * sm(0.55, 0.95, a.id === 'vision' ? local : (b.id === 'vision' ? 0 : 1)) * (a.id === 'vision' || b.id === 'warp' ? 1 : 0);
    S.star.material.opacity = clamp(starA * 1.2, 0, 1); S.star.scale.setScalar(1 + starA * 5 + Math.sin(t * 3) * 0.1);
    S.warpMat.uniforms.uT.value = t; S.warpMat.uniforms.uW.value = cur.warp;
    S.orbs.forEach((o, oi) => { const d = o.userData; const z = ((d.z0 + t * 9 + 90) % 70) - 90; o.position.set(Math.cos(d.a + t * 0.2) * d.r, Math.sin(d.a + t * 0.2) * d.r, z); o.material.opacity = cur.warp * 0.9; });
    S.beam.material.uniforms.uO.value = cur.beam; S.beam.material.uniforms.uT.value = t; S.pool.material.opacity = cur.beam * 0.7;
    S.ringMat.opacity = cur.ring; S.ringHalo.material.uniforms.uO.value = cur.ring; S.ringHalo.material.uniforms.uT.value = t;
    S.shell.material.opacity = cur.ring * 0.7; S.shell.rotation.y = t * 0.08; S.shell.rotation.x = t * 0.03;
    S.ringG.visible = cur.ring > 0.01; S.ringG.lookAt(S.camera.position);
    S.dust.rotation.y = t * 0.01;
    S.night.visible = cur.night > 0.02;
    S.ribbons.forEach((r) => { r.rotation.y = Math.sin(t * 0.22 + r.userData.ph) * 0.06; r.rotation.z = Math.sin(t * 0.17 + r.userData.ph) * 0.03; r.position.y = Math.sin(t * 0.35 + r.userData.ph) * 0.15; });
    S.bubble.position.y = 6.6 + Math.sin(t * 0.7) * 0.25; S.bubble.rotation.y = t * 0.2;

    /* Rendern */
    const gl = reduce || W.__calm ? 0 : clamp(Math.min(Math.abs(vel) / 6000, 0.35) + (now - lastJump < 400 ? 1 : 0) + cur.warp * 0.25, 0, 1);
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
