/* VONUMO Showroom – Marken-Studio: echte Schneelandschaft, 4 Phasen (Idee → Iglu → Bruch → Marke), an den Scroll gekoppelt */
(function () {
  'use strict';
  var D = document, W = window, pin = D.getElementById('cryPin'); if (!pin) return;
  var body = pin.querySelector('.dm-body'), stage = pin.querySelector('.ic-stage'); if (!stage) return;
  var shots = Array.prototype.slice.call(stage.querySelectorAll('.ic-shot')), N = shots.length;
  var steps = pin.querySelectorAll('.cr-step'), flash = pin.querySelector('.ic-flash'), snow = pin.querySelector('.ic-snow'), ctx = snow && snow.getContext('2d');
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches, fine = W.matchMedia && W.matchMedia('(pointer:fine)').matches;
  var P = 0, top = 0, span = 1, cur = -1, run = false, last = 0, op = [], sc = [];
  shots.forEach(function (im) { im.loading = 'eager'; if (im.decode) im.decode().catch(function () {}); });

  function measure() { var r = pin.getBoundingClientRect(); top = r.top + W.scrollY; span = Math.max(1, pin.offsetHeight - W.innerHeight); }
  function target() { return Math.min(1, Math.max(0, (W.scrollY - top) / span)); }
  function sm(x) { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (x * 6 - 15) + 10); }

  function render() {
    var f = P * (N - 1);
    stage.style.setProperty('--cz', (1.1 - P * 0.08).toFixed(4));
    for (var i = 0; i < N; i++) {
      /* Überblendung mit „Durchflug“: neues Bild wächst aus leichter Vergrößerung heran */
      var o = i === 0 ? 1 : sm((f - (i - 1) - 0.18) / 0.64), z = 1 + (1 - o) * 0.08;
      if (op[i] === undefined || Math.abs(o - op[i]) > 0.001) { shots[i].style.opacity = o.toFixed(3); op[i] = o; }
      if (sc[i] === undefined || Math.abs(z - sc[i]) > 0.0005) { shots[i].style.transform = 'translate3d(0,0,0) scale(' + z.toFixed(4) + ')'; sc[i] = z; }
    }
    var s = Math.min(N - 1, Math.max(0, Math.round(f)));
    if (s !== cur) {
      if (cur >= 0 && flash) { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); }
      cur = s; Array.prototype.forEach.call(steps, function (e, k) { e.classList.toggle('on', k === s); });
    }
  }
  function frame(t) {
    var dt = Math.min(64, t - (last || t)); last = t;
    var want = target();
    P = reduce ? want : P + (want - P) * (1 - Math.exp(-dt / 150));
    if (Math.abs(want - P) < 0.0002) P = want;
    render();
    if (P !== want) requestAnimationFrame(frame); else { run = false; last = 0; }
  }
  function kick() { if (!run) { run = true; requestAnimationFrame(frame); } }

  /* Schneefall + Maus-Tiefe – läuft nur, solange die Szene sichtbar ist */
  var vis = false, amb = false, flakes = [], w = 0, h = 0, dpr = Math.min(1.5, W.devicePixelRatio || 1), mx = 0, my = 0, tx = 0, ty = 0, wind = 0;
  function size() { if (!snow) return; w = snow.clientWidth; h = snow.clientHeight; snow.width = w * dpr; snow.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function seed() { flakes = []; var n = W.innerWidth < 820 ? 70 : 150; for (var i = 0; i < n; i++) flakes.push({ x: Math.random(), y: Math.random(), z: 0.25 + Math.random() * 0.75, a: Math.random() * 6.28 }); }
  function ambient(t) {
    if (!vis) { amb = false; return; }
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06; wind = Math.sin(t * 0.0004) * 0.0006;
    pin.style.setProperty('--mx', mx.toFixed(4)); pin.style.setProperty('--my', my.toFixed(4));
    if (ctx) {
      ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#fff';
      for (var i = 0; i < flakes.length; i++) {
        var q = flakes[i]; q.a += 0.02 * q.z;
        q.y += (0.0006 + q.z * 0.0016); q.x += wind * q.z + Math.sin(q.a) * 0.0004 * q.z;
        if (q.y > 1.03) { q.y = -0.03; q.x = Math.random(); } if (q.x > 1.03) q.x = -0.03; if (q.x < -0.03) q.x = 1.03;
        ctx.globalAlpha = 0.35 + q.z * 0.6;
        ctx.beginPath(); ctx.arc(q.x * w - mx * 26 * q.z, q.y * h - my * 16 * q.z, 0.5 + q.z * 2.1, 0, 6.283); ctx.fill();
      }
    }
    requestAnimationFrame(ambient);
  }
  function startAmb() { if (!amb && vis && !reduce) { amb = true; requestAnimationFrame(ambient); } }
  if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { es.forEach(function (e) { vis = e.isIntersecting; if (vis) { pin.classList.add('in'); startAmb(); } }); }, { threshold: 0.05 }).observe(body);
  else { vis = true; pin.classList.add('in'); startAmb(); }
  if (fine) { body.addEventListener('pointermove', function (e) { var r = body.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width * 2 - 1; ty = (e.clientY - r.top) / r.height * 2 - 1; }); body.addEventListener('pointerleave', function () { tx = ty = 0; }); }
  if (snow) { size(); seed(); }

  W.addEventListener('scroll', kick, { passive: true });
  W.addEventListener('resize', function () { measure(); size(); kick(); });
  W.addEventListener('load', function () { measure(); kick(); });
  measure(); P = target(); render();
})();
