/* VONUMO Signature – Kamerafahrt aus eigenen Standbildern: harte Schnitte, Nahaufnahmen,
   gekippte Kamera, Scheinwerfer-Blendung und großer Titel am Ende (Film-Schnitt, läuft von selbst) */
(function () {
  'use strict';
  var D = document, W = window, rv = D.getElementById('rv'); if (!rv) return;
  var imgs = rv.querySelectorAll('.rv-shot'), copies = rv.querySelectorAll('.rv-c'), bar = rv.querySelector('.rv-prog i');
  var flare = rv.querySelector('.rv-flare'), flash = rv.querySelector('.rv-flash'), sweep = rv.querySelector('.rv-sweep'), stage = rv.querySelector('.rv-stage'), title = rv.querySelector('.rv-title');
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Bild: 0 Tuch, 1 Tuch fliegt, 2 Front, 3 Heck · Fokuspunkt fx/fy (0–1), Zoom s, Neigung r (Grad) */
  var SHOTS = [
    { i: 0, d: 1.7, a: { fx: .5, fy: .55, s: 1.02, r: 0 }, b: { fx: .5, fy: .58, s: 1.12, r: 0 }, ph: 0 },
    { i: 1, d: 1.0, a: { fx: .4, fy: .6, s: 2.0, r: -7 }, b: { fx: .46, fy: .6, s: 1.75, r: -5 }, ph: 0, flare: 1 },
    { i: 1, d: 1.2, a: { fx: .62, fy: .5, s: 1.32, r: -3 }, b: { fx: .38, fy: .52, s: 1.18, r: 0 }, ph: 1 },
    { i: 3, d: 1.0, a: { fx: .66, fy: .42, s: 1.55, r: 5 }, b: { fx: .64, fy: .45, s: 1.85, r: 3 }, ph: 1, tail: 1 },
    { i: 2, d: 1.3, a: { fx: .42, fy: .58, s: 1.45, r: 9 }, b: { fx: .45, fy: .6, s: 1.7, r: 7 }, ph: 1, flare: 1 },
    { i: 2, d: 1.4, a: { fx: .44, fy: .58, s: 1.6, r: 3 }, b: { fx: .5, fy: .52, s: 1.0, r: 0 }, ph: 2, end: 1 }
  ];
  var TOTAL = SHOTS.reduce(function (a, s) { return a + s.d; }, 0), HOLD = 3.2;
  var clock = 0, last = 0, vis = false, run = false, cur = -1, ph = -1, mx = 0, my = 0, smx = 0, smy = 0;
  var ease = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  function place(el, k, blur, op) {
    var tx = -(k.fx - .5) * k.s * 100, ty = -(k.fy - .5) * k.s * 100, lim = (k.s * 1.08 - 1) / 2 * 100 / 1.08;
    tx = Math.max(-lim, Math.min(lim, tx)) + smx * -0.8; ty = Math.max(-lim, Math.min(lim, ty)) + smy * -0.5;
    el.style.transform = 'translate3d(' + tx.toFixed(2) + '%,' + ty.toFixed(2) + '%,0) rotate(' + k.r.toFixed(2) + 'deg) scale(' + k.s.toFixed(4) + ')';
    el.style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(1) + 'px)' : 'none'; el.style.opacity = op;
  }
  function frame(now) {
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    if (vis && !reduce) clock += dt; if (clock > TOTAL + HOLD) clock = 0;
    smx += (mx - smx) * 0.06; smy += (my - smy) * 0.06;
    var t = reduce ? TOTAL - 0.01 : Math.min(clock, TOTAL - 0.001), acc = 0, n = 0;
    while (n < SHOTS.length - 1 && t >= acc + SHOTS[n].d) { acc += SHOTS[n].d; n++; }
    var S = SHOTS[n], loc = Math.min(1, (t - acc) / S.d), e = ease(loc), since = t - acc;
    var k = { fx: lerp(S.a.fx, S.b.fx, e), fy: lerp(S.a.fy, S.b.fy, e), s: lerp(S.a.s, S.b.s, e), r: lerp(S.a.r, S.b.r, e) };
    var cutBlur = Math.max(0, 1 - since / 0.18) * 14 * (n > 0 ? 1 : 0);
    Array.prototype.forEach.call(imgs, function (el, i) { if (i === S.i) place(el, k, cutBlur, 1); else el.style.opacity = 0; });
    if (n !== cur) { cur = n; rv.setAttribute('data-shot', n); }
    /* Blitz beim Schnitt, Blendung bei Scheinwerfern */
    flash.style.opacity = (n > 0 ? Math.max(0, 1 - since / 0.22) * 0.8 : 0).toFixed(3);
    var fl = S.flare ? Math.min(1, since / 0.25) * (0.75 + Math.sin(now / 90) * 0.08) * (1 - Math.max(0, (loc - 0.8) / 0.2)) : (S.end ? Math.max(0, 0.7 - since * 0.8) : 0);
    flare.style.opacity = fl.toFixed(3); flare.style.transform = 'translate(-50%,-50%) scale(' + (0.8 + fl * 0.5).toFixed(3) + ')';
    flare.classList.toggle('red', !!S.tail);
    var se = S.end ? Math.max(0, clock - acc) : 0; sweep.style.transform = 'translateX(' + (S.end ? -120 + Math.min(1, se / 1.6) * 240 : -130) + '%)';
    /* Großer Titel am Ende */
    var tv = S.end ? Math.min(1, Math.max(0, (since - 0.35) / 0.6)) : 0;
    title.style.opacity = tv.toFixed(3); title.style.transform = 'translateX(' + ((1 - ease(tv)) * -60).toFixed(1) + 'px)'; title.style.filter = 'blur(' + ((1 - tv) * 12).toFixed(1) + 'px)';
    var p2 = S.ph;
    if (p2 !== ph) { ph = p2; Array.prototype.forEach.call(copies, function (c) { c.classList.toggle('on', +c.getAttribute('data-ph') === p2); }); }
    stage.style.transform = 'translate3d(' + (smx * 0.4).toFixed(2) + '%,' + (smy * 0.3).toFixed(2) + '%,0)';
    bar.style.transform = 'scaleY(' + (Math.min(clock, TOTAL) / TOTAL).toFixed(3) + ')';
    if (vis) requestAnimationFrame(frame); else { run = false; last = 0; }
  }
  function kick() { if (!run) { run = true; requestAnimationFrame(frame); } }
  if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) kick(); }, { threshold: 0.35 }).observe(rv);
  else { vis = true; kick(); }
  rv.addEventListener('click', function (e) { if (!e.target.closest('a')) clock = 0; });
  rv.addEventListener('pointermove', function (e) { var r = rv.getBoundingClientRect(); mx = ((e.clientX - r.left) / r.width - 0.5) * 2; my = ((e.clientY - r.top) / r.height - 0.5) * 2; });
  rv.addEventListener('pointerleave', function () { mx = my = 0; });
  Array.prototype.forEach.call(imgs, function (s) { if (s.decode) s.decode().catch(function () {}); });
})();
