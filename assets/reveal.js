/* VONUMO Signature – Standbilder werden beim Scrollen zu einer filmischen Enthüllung */
(function () {
  'use strict';
  var D = document, W = window, pin = D.getElementById('carPin'), rv = D.getElementById('rv'); if (!pin || !rv) return;
  var shots = rv.querySelectorAll('.rv-shot'), copies = rv.querySelectorAll('.rv-c'), bar = rv.querySelector('.rv-prog i');
  var g = function (c) { return rv.querySelector(c); };
  var hl1 = g('.hl1'), hl2 = g('.hl2'), tl1 = g('.tl1'), tl2 = g('.tl2'), sweep = g('.rv-sweep'), flash = g('.rv-flash'), stage = g('.rv-stage');
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var P = 0, want = 0, mx = 0, my = 0, smx = 0, smy = 0, run = false, ph = -1;
  var sm = function (a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  /* Zeitachse: 4 Einstellungen mit weichen Überblendungen */
  var K = [[0, 0.24], [0.2, 0.5], [0.46, 0.76], [0.72, 1]];
  function prog() { var r = pin.getBoundingClientRect(), span = Math.max(1, r.height - W.innerHeight); return Math.min(1, Math.max(0, -r.top / span)); }
  function frame(now) {
    want = prog(); P += (want - P) * (reduce ? 1 : 0.12);
    smx += (mx - smx) * 0.06; smy += (my - smy) * 0.06;
    var t = now / 1000;
    for (var i = 0; i < 4; i++) {
      var a = K[i][0], b = K[i][1], fin = i === 0 ? 1 : sm(a, a + 0.06, P), fout = i === 3 ? 1 : 1 - sm(b - 0.06, b, P);
      var o = Math.min(fin, fout), loc = Math.min(1, Math.max(0, (P - a) / (b - a)));
      var sc = 1.04 - loc * 0.04, tx = smx * -1.2, ty = smy * -0.8, fx = shots[i].getAttribute('data-fx');
      if (fx === 'pull') tx += -2 + loc * 4;               /* Kamera folgt dem Tuch */
      if (fx === 'front') { sc = 1.09 - loc * 0.09; ty += 1 - loc * 1; }
      if (fx === 'rear') { tx += 1 - loc * 2; }
      if (fx === 'cover') sc = 1.0 + Math.sin(t * 0.4) * 0.006 + loc * 0.05;
      var blur = (1 - o) * 10;
      shots[i].style.opacity = o.toFixed(3);
      shots[i].style.transform = 'translate3d(' + tx.toFixed(2) + '%,' + ty.toFixed(2) + '%,0) scale(' + sc.toFixed(4) + ')';
      shots[i].style.filter = 'blur(' + blur.toFixed(1) + 'px) brightness(' + (0.9 + o * 0.1 + (fx === 'front' ? sm(0.5, 0.56, P) * 0.15 * (1 - sm(0.6, 0.7, P)) : 0)).toFixed(3) + ')';
    }
    /* Scheinwerfer zünden bei der Enthüllung, Rücklichter am Ende */
    var head = sm(0.36, 0.44, P) * (1 - sm(0.72, 0.78, P)), on = sm(0.5, 0.56, P) * (1 - sm(0.72, 0.78, P));
    var pulse = 0.85 + Math.sin(t * 2.2) * 0.15;
    [hl1, hl2].forEach(function (e) { e.style.opacity = (Math.max(head * 0.5, on) * pulse * 0.9).toFixed(3); e.style.transform = 'scale(' + (0.8 + on * 0.4).toFixed(3) + ')'; });
    var tail = sm(0.76, 0.84, P);
    [tl1, tl2].forEach(function (e) { e.style.opacity = (tail * (0.75 + Math.sin(t * 3.1) * 0.25)).toFixed(3); });
    /* Lichtstreif über den Lack und Blitz beim Wechsel */
    var sw = sm(0.5, 0.66, P); sweep.style.transform = 'translateX(' + (-120 + sw * 240).toFixed(1) + '%)'; sweep.style.opacity = (sw > 0 && sw < 1 ? 1 : 0);
    var fl = Math.max(0, 1 - Math.abs(P - 0.48) / 0.035) * 0.9 + Math.max(0, 1 - Math.abs(P - 0.74) / 0.03) * 0.5;
    flash.style.opacity = fl.toFixed(3);
    stage.style.transform = 'translate3d(' + (smx * 0.4).toFixed(2) + '%,' + (smy * 0.3).toFixed(2) + '%,0)';
    /* Texte */
    var p2 = P < 0.42 ? 0 : P < 0.74 ? 1 : 2;
    if (p2 !== ph) { ph = p2; Array.prototype.forEach.call(copies, function (c) { c.classList.toggle('on', +c.getAttribute('data-ph') === p2); }); }
    bar.style.transform = 'scaleY(' + P.toFixed(3) + ')';
    if (Math.abs(want - P) > 0.0005 || vis) requestAnimationFrame(frame); else run = false;
  }
  var vis = false;
  function kick() { if (!run) { run = true; requestAnimationFrame(frame); } }
  if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) kick(); }, { rootMargin: '200px' }).observe(rv);
  else { vis = true; kick(); }
  W.addEventListener('scroll', kick, { passive: true });
  rv.addEventListener('pointermove', function (e) { var r = rv.getBoundingClientRect(); mx = ((e.clientX - r.left) / r.width - 0.5) * 2; my = ((e.clientY - r.top) / r.height - 0.5) * 2; kick(); });
  rv.addEventListener('pointerleave', function () { mx = my = 0; });
  /* Bilder vorladen */
  Array.prototype.forEach.call(shots, function (s) { if (s.decode) s.decode().catch(function () {}); });
})();
