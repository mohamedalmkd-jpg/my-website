/* VONUMO Techwear – 3D-Choreografie: Hero-Kamerafahrt, Kollektion, Material-Ebenen, FAQ, Schnellansicht */
import { THREE, createStage, baseScene, makeJacket, makeLayers, clamp, ease, smooth, reduce, small } from '/assets/tw3d.js?v=202611162357';

const D = document, W = window, B = D.body, S = W.__sr || { P: 0, TP: 0, smx: 0, smy: 0 };
const $ = (s, c) => (c || D).querySelector(s), $$ = (s, c) => Array.from((c || D).querySelectorAll(s));
const lerp = (a, b, k) => a + (b - a) * k;
const loadEl = $('#twLoad'), loadP = $('#twLoadP');

function hasGL() { try { const c = D.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (!hasGL()) { loadEl.remove(); B.classList.add('nogl'); throw new Error('WebGL nicht verfügbar – Bilder bleiben als Ersatz sichtbar'); }

loadP.textContent = '20%';
await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const stage = createStage($('#twGl'));
const env = stage.env;
loadP.textContent = '60%';

/* ---------- A+B: Hero → Details ---------- */
const hs = baseScene(), hcam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
const hj = makeJacket('black', env), hpivot = new THREE.Group(); hpivot.add(hj); hs.add(hpivot);
const glow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshBasicMaterial({ color: 0x1d3cff, transparent: true, opacity: 0.14, depthWrite: false }));
glow.rotation.x = -Math.PI / 2; glow.position.y = -1.05;
const tgt = new THREE.Vector3(), tmp = new THREE.Vector3();
let hry = 0;
stage.add({
  el: $('#vHero'), scene: hs, camera: hcam,
  update(t, dt, r) {
    const P = S.P, asp = r.width / r.height, m = r.width <= 760;
    const zBase = Math.max(5.6, 1.45 / (Math.tan(THREE.MathUtils.degToRad(15)) * asp));
    const e1 = ease((P - 0.06) / 0.5), e2 = smooth((P - 0.58) / 0.3), up = smooth((P - 0.9) / 0.1);
    const z = lerp(lerp(zBase, zBase * 0.56, e1), zBase * 0.34, e2);
    tgt.set(lerp(lerp(0, m ? 0 : 0.36, e1), m ? 0.05 : 0.22, e2), lerp(lerp(m ? 0.1 : 0.35, 0.5, e1), 0.8, e2), lerp(0, 0.28, e2));
    hcam.position.set(tgt.x + S.smx * 0.12 * (1 - e1), tgt.y + 0.05 - S.smy * 0.08, z + tgt.z);
    hcam.lookAt(tgt);
    const idle = reduce ? 0 : Math.sin(t * 0.55) * 0.42 * (1 - e1);
    const want = idle + S.smx * 0.45 * (1 - e2 * 0.7) + lerp(0, -0.38, e1) + 0.5 * e2;
    hry += (want - hry) * Math.min(1, dt * 4);
    hj.rotation.y = hry;
    hj.position.y = (reduce ? 0 : Math.sin(t * 1.1) * 0.035) + up * 1.4;
    hj.rotation.z = reduce ? 0 : Math.sin(t * 0.7) * 0.015;
    glow.material.opacity = 0.14 * (1 - e1);
  }
});

/* ---------- C: Kollektion (4 Jacken, je eigenes Fenster im selben WebGL-Kontext) ---------- */
$$('.sr-card').forEach((card, i) => {
  const el = $('.c3d', card), sc = baseScene(), cam = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
  const j = makeJacket(card.dataset.color, env); sc.add(j);
  let hov = 0, hx = 0, ry = -0.45;
  card.addEventListener('mouseenter', () => { hov = 1; });
  card.addEventListener('mouseleave', () => { hov = 0; hx = 0; });
  card.addEventListener('pointermove', (e) => { const r = card.getBoundingClientRect(); hx = (e.clientX - r.left) / r.width * 2 - 1; });
  let h = 0;
  stage.add({
    el, scene: sc, camera: cam,
    update(t, dt) {
      h += (hov - h) * Math.min(1, dt * 6);
      const idle = reduce ? -0.45 : -0.45 + Math.sin(t * 0.6 + i * 1.7) * 0.32;
      const want = lerp(idle, hx * 0.9, h);
      ry += (want - ry) * Math.min(1, dt * 5);
      j.rotation.y = ry; j.position.y = (reduce ? 0 : Math.sin(t * 1.2 + i) * 0.03) + h * 0.08;
      j.scale.setScalar(1 + h * 0.05);
      cam.position.set(0, 0.2, 5.1); cam.lookAt(0, 0.08, 0);
    }
  });
});
B.classList.add('gl');

/* ---------- D: Material-Ebenen + Callout ---------- */
const ls = baseScene(), lcam = new THREE.PerspectiveCamera(28, 1, 0.1, 40), lay = makeLayers(env);
const lpivot = new THREE.Group(); lpivot.add(lay); ls.add(lpivot);
const LAY = lay.userData.layers, ANC = lay.userData.anchors;
const INFO = [
  ['01', 'Outer shell', 'Durable outer layer that repels water and protects against wind and rain.'],
  ['02', 'Breathable membrane', 'Lets moisture escape while keeping wet weather out.'],
  ['03', 'Thermal fill', 'Quilted chambers trap warmth at minimal weight.'],
  ['04', 'Comfort lining', 'Smooth inner lining for easy layering and all-day comfort.']
];
const ldot = $('#srLdot'), line = $('#srLine'), call = $('#srCall'), ticks = $$('#srTicks li'), tstick = $('#technologie .sr-stick');
let lIdx = -1;
stage.add({
  el: $('#vLayers'), scene: ls, camera: lcam,
  update(t, dt, r) {
    const TP = S.TP, g = 0.26 + ease(TP * 1.2) * 0.36, asp = r.width / r.height;
    const dist = Math.max(6.4, 2.9 / (Math.tan(THREE.MathUtils.degToRad(14)) * asp));
    lcam.position.set(0, dist * 0.6, dist * 0.8); lcam.lookAt(0, 0, 0);
    LAY.forEach((o, i) => { o.position.y = (1.5 - i) * g + (reduce ? 0 : Math.sin(t * 1.3 + i * 0.9) * 0.025); });
    lpivot.rotation.y = 0.78 + TP * 0.5 + S.smx * 0.12;
    lpivot.rotation.x = -0.05 + S.smy * 0.05;
    lpivot.rotation.z = lerp(-0.08, 0.04, TP);
    const k = Math.min(3, Math.floor(TP * 4 * 0.999));
    if (k !== lIdx) {
      lIdx = k; const d = INFO[k];
      $('#srCallN').textContent = d[0]; $('#srCallP').textContent = d[2];
      const ct = $('#srCallT'); ct.textContent = d[1]; ct.__src = d[1]; S.scramble && S.scramble(ct, 500);
      call.classList.remove('swap'); void call.offsetWidth; call.classList.add('swap');
      ticks.forEach((li, i) => li.classList.toggle('on', i <= k));
    }
    /* Ankerpunkt der aktiven Ebene auf den Bildschirm projizieren */
    lay.updateMatrixWorld();
    tmp.copy(ANC[k]); LAY[k].localToWorld(tmp); tmp.project(lcam);
    const sr = tstick.getBoundingClientRect();
    const px = r.left + (tmp.x + 1) / 2 * r.width - sr.left, py = r.top + (1 - tmp.y) / 2 * r.height - sr.top;
    ldot.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0)`;
    if (r.width > 0 && W.innerWidth > 760) {
      const c = call.getBoundingClientRect();
      line.setAttribute('x1', px.toFixed(1)); line.setAttribute('y1', py.toFixed(1));
      line.setAttribute('x2', (c.left - sr.left).toFixed(1)); line.setAttribute('y2', (c.top + c.height / 2 - sr.top).toFixed(1));
    }
  }
});

/* ---------- E: FAQ-Jacke ---------- */
const fs = baseScene(), fcam = new THREE.PerspectiveCamera(30, 1, 0.1, 30), fj = makeJacket('black', env); fs.add(fj);
stage.add({
  el: $('#vFaq'), scene: fs, camera: fcam,
  update(t) {
    const r = $('#faq').getBoundingClientRect(), k = clamp(1 - r.top / W.innerHeight, 0, 2);
    fj.rotation.y = -0.75 + (reduce ? 0 : Math.sin(t * 0.4) * 0.18) + S.smx * 0.2;
    fj.position.y = (reduce ? 0 : Math.sin(t * 0.9) * 0.03) - 0.25 + k * 0.15;
    fcam.position.set(0.1, 0.35, 4.8); fcam.lookAt(0.1, 0.1, 0);
  }
});

/* ---------- Schnellansicht (Klick auf Karte) ---------- */
const modal = $('#twModal'), mcv = $('#twMGl');
let mstage = null, lastFocus = null, mcard = null;
function openModal(card) {
  mcard = card; lastFocus = D.activeElement;
  $('#twMNum').textContent = $('header b', card).textContent; $('#twMName').textContent = card.dataset.name; $('#twMPrice').textContent = '€' + card.dataset.price;
  modal.hidden = false; B.classList.add('modal');
  requestAnimationFrame(() => modal.classList.add('on'));
  mstage = createStage(mcv);
  const sc = baseScene(), cam = new THREE.PerspectiveCamera(28, 1, 0.1, 30), j = makeJacket(card.dataset.color, mstage.env); sc.add(j);
  let ry = -0.6, vel = 0, drag = false, lx = 0, rx = 0;
  mcv.onpointerdown = (e) => { drag = true; lx = e.clientX; mcv.setPointerCapture(e.pointerId); };
  mcv.onpointermove = (e) => { if (!drag) return; vel = (e.clientX - lx) * 0.01; ry += vel; lx = e.clientX; rx = clamp(rx + e.movementY * 0.003, -0.3, 0.3); };
  mcv.onpointerup = () => { drag = false; };
  mstage.add({
    el: mcv, scene: sc, camera: cam,
    update(t, dt) {
      if (!drag) { vel *= 0.94; ry += vel + (reduce ? 0 : dt * 0.25); }
      j.rotation.y = ry; j.rotation.x = rx; j.position.y = reduce ? 0 : Math.sin(t * 1.2) * 0.03;
      const asp = mcv.clientWidth / Math.max(1, mcv.clientHeight);
      cam.position.set(0, 0.1, Math.max(5.2, 1.5 / (Math.tan(THREE.MathUtils.degToRad(14)) * asp))); cam.lookAt(0, 0, 0);
    }
  });
  $('#twMClose').focus();
}
function closeModal() {
  if (modal.hidden) return;
  modal.classList.remove('on'); B.classList.remove('modal');
  setTimeout(() => { modal.hidden = true; if (mstage) { mstage.stop(); mstage = null; } }, 450);
  lastFocus && lastFocus.focus();
}
$$('.sr-card').forEach((card) => {
  card.addEventListener('click', (e) => { if (e.target.closest('.add')) return; openModal(card); });
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.target.closest('.add')) openModal(card); });
});
$('#twMClose').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
D.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
$$('.tw-sizes button').forEach((b) => b.addEventListener('click', () => $$('.tw-sizes button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); })));
$('#twMAdd').addEventListener('click', () => {
  const add = mcard && $('.add', mcard); if (add && !add.classList.contains('ok')) { add.classList.add('ok'); S.cart && S.cart(1); }
  else if (S.cart) S.cart(1);
  $('#twMAdd').classList.add('done'); setTimeout(() => { $('#twMAdd').classList.remove('done'); closeModal(); }, 700);
});
$('#viewAll').addEventListener('click', (e) => { e.preventDefault(); openModal($('.sr-card')); });

loadP.textContent = '100%';
setTimeout(() => loadEl.classList.add('off'), 250);
setTimeout(() => loadEl.remove(), 1100);
