/* VONUMO Showroom – Baustelle wächst beim Scrollen: 6 Fotos derselben Perspektive, weich und exakt an den Scroll gekoppelt */
(function () {
  'use strict';
  var D = document, W = window, pin = D.getElementById('bauPin'); if (!pin) return;
  var shots = Array.prototype.slice.call(pin.querySelectorAll('.bs-shot')), N = shots.length;
  var steps = pin.querySelectorAll('.bs-step'), bar = pin.querySelector('.bs-bar i'), pct = pin.querySelector('.bs-pct');
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var P = 0, want = 0, run = false, cur = -1, last = 0, top = 0, span = 1, lastPct = -1;
  var op = shots.map(function () { return -1; });

  /* alle Bilder vorab dekodieren – kein Aufblitzen beim ersten Wechsel */
  shots.forEach(function (im) { im.loading = 'eager'; if (im.decode) im.decode().catch(function () {}); });

  function measure() { var r = pin.getBoundingClientRect(); top = r.top + W.scrollY; span = Math.max(1, pin.offsetHeight - W.innerHeight); }
  function target() { return Math.min(1, Math.max(0, (W.scrollY - top) / span)); }
  function smooth(x) { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (x * 6 - 15) + 10); } /* smootherstep */

  function render() {
    var f = P * (N - 1);
    for (var i = 0; i < N; i++) {
      /* Bild i blendet im mittleren Teil seines Abschnitts ein (weiche S-Kurve) */
      var o = i === 0 ? 1 : smooth((f - (i - 1) - 0.25) / 0.5);
      if (Math.abs(o - op[i]) > 0.002) { shots[i].style.opacity = o.toFixed(3); op[i] = o; }
      /* jede Phase hat ihren eigenen sanften Kamera-Zoom */
      var local = Math.min(1, Math.max(0, f - i + 1)) ;
      shots[i].style.transform = 'translate3d(0,0,0) scale(' + (1.08 - local * 0.06).toFixed(4) + ')';
    }
    var s = Math.min(N - 1, Math.max(0, Math.round(f)));
    if (s !== cur) { cur = s; Array.prototype.forEach.call(steps, function (e, k) { e.classList.toggle('on', k === s); e.classList.toggle('done', k < s); }); }
    bar.style.transform = 'scaleX(' + P.toFixed(4) + ')';
    var n = Math.round(P * 100); if (n !== lastPct) { pct.textContent = n + ' %'; lastPct = n; }
  }

  function frame(t) {
    var dt = Math.min(64, t - (last || t)); last = t;
    want = target();
    /* zeitbasierte Dämpfung: gleich weich bei 60 und 120 Hz */
    P = reduce ? want : P + (want - P) * (1 - Math.exp(-dt / 70));
    if (Math.abs(want - P) < 0.0005) P = want;
    render();
    if (P !== want) requestAnimationFrame(frame); else { run = false; last = 0; }
  }
  function kick() { if (!run) { run = true; requestAnimationFrame(frame); } }

  W.addEventListener('scroll', kick, { passive: true });
  W.addEventListener('resize', function () { measure(); kick(); });
  W.addEventListener('load', function () { measure(); kick(); });
  measure(); P = want = target(); render();
})();
