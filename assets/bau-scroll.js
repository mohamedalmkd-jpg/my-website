/* VONUMO Showroom – Baustelle wächst beim Scrollen: 6 Fotos derselben Perspektive, weich und exakt an den Scroll gekoppelt */
(function () {
  'use strict';
  var D = document, W = window, pin = D.getElementById('bauPin'); if (!pin) return;
  var shots = Array.prototype.slice.call(pin.querySelectorAll('.bs-shot')), N = shots.length;
  var steps = pin.querySelectorAll('.bs-step'), bar = pin.querySelector('.bs-bar i'), pct = pin.querySelector('.bs-pct');
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var P = 0, want = 0, run = false, cur = -1, last = 0, top = 0, span = 1, lastPct = -1;
  var op = shots.map(function () { return -1; }), stage = pin.querySelector('.bs-stage'), lastCam = '';
  var scan = pin.querySelector('.bs-scan'), hots = pin.querySelectorAll('.bs-hot'), plan = pin.querySelector('.bs-plan');
  var pgs = pin.querySelectorAll('.bs-plan .pg'), nums = pin.querySelectorAll('.bs-n'), day = pin.querySelector('.bs-day');
  var pgv = [], numv = [], lastDay = -1;

  /* alle Bilder vorab dekodieren – kein Aufblitzen beim ersten Wechsel */
  shots.forEach(function (im) { im.loading = 'eager'; if (im.decode) im.decode().catch(function () {}); });

  function measure() { var r = pin.getBoundingClientRect(); top = r.top + W.scrollY; span = Math.max(1, pin.offsetHeight - W.innerHeight); }
  function target() { return Math.min(1, Math.max(0, (W.scrollY - top) / span)); }
  function smooth(x) { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (x * 6 - 15) + 10); } /* smootherstep */

  function render() {
    var f = P * (N - 1);
    /* durchgehende Kamerafahrt über die ganze Geschichte (alle Ebenen gleich -> deckungsgleich) */
    var cam = 'translate3d(0,' + (P * -1.5).toFixed(3) + '%,0) scale(' + (1.12 - P * 0.1).toFixed(4) + ')';
    if (cam !== lastCam) { stage.style.transform = cam; lastCam = cam; }
    var front = -1, frontR = 0;
    for (var i = 1; i < N; i++) {
      /* das Haus „wächst“ von unten nach oben: weiche Maske statt Bildwechsel */
      var r = smooth((f - (i - 1) - 0.08) / 0.84);
      if (Math.abs(r - op[i]) > 0.001) { shots[i].style.setProperty('--r', r.toFixed(4)); shots[i].style.visibility = r > 0 ? 'visible' : 'hidden'; op[i] = r; }
      if (r > 0.001 && r < 0.999) { front = i; frontR = r; }
    }
    /* goldene Baulinie läuft an der Wachstumskante mit */
    if (scan) {
      if (front > 0) { scan.style.setProperty('--y', (100 - (frontR * 140 - 20)).toFixed(2) + '%'); scan.style.setProperty('--o', Math.min(1, Math.sin(frontR * Math.PI) * 2.2).toFixed(3)); }
      else scan.style.setProperty('--o', '0');
    }
    /* Bauplan zeichnet sich Linie für Linie – immer einen Schritt vor dem Foto */
    Array.prototype.forEach.call(pgs, function (g, k) {
      var d = k === 0 ? Math.min(1, P * 8 + 0.35) : Math.min(1, Math.max(0, (f - (k - 1) + 0.35) / 0.9));
      if (pgv[k] === undefined || Math.abs(pgv[k] - d) > 0.002) { g.style.setProperty('--d', d.toFixed(4)); g.classList.toggle('live', d > 0.01 && d < 0.99); pgv[k] = d; }
    });
    if (plan) plan.classList.toggle('fin', f > 4.6);
    /* Hotspots tauchen auf, sobald ihre Phase sichtbar wird */
    Array.prototype.forEach.call(hots, function (h) { var k = +h.getAttribute('data-k'); h.classList.toggle('on', f > k - 0.35 && f < k + 0.75); });
    /* Zähler */
    Array.prototype.forEach.call(nums, function (el, k) {
      var mx = +el.getAttribute('data-max'), st = +(el.getAttribute('data-start') || 0), en = +(el.getAttribute('data-end') || (N - 1));
      var v = Math.round(mx * smooth((f - st) / Math.max(0.01, en - st)));
      if (v !== numv[k]) { el.textContent = v; numv[k] = v; }
    });
    var dn = 1 + Math.round(P * 285); if (dn !== lastDay && day) { day.textContent = 'Tag ' + dn; lastDay = dn; }
    var s = Math.min(N - 1, Math.max(0, Math.round(f)));
    if (s !== cur) {
      cur = s;
      Array.prototype.forEach.call(steps, function (e, k) {
        var was = e.classList.contains('on');
        e.classList.toggle('on', k === s); e.classList.toggle('done', k < s);
        if (k === s && !was) { var b = e.querySelector('b'); if (b) { var t = b.getAttribute('data-t') || b.textContent; b.setAttribute('data-t', t); b.innerHTML = t.split(' ').map(function (w, j) { return '<span class="w" style="--i:' + j + '">' + w + '</span>'; }).join(' '); } }
      });
    }
    bar.style.transform = 'scaleX(' + P.toFixed(4) + ')';
    var n = Math.round(P * 100); if (n !== lastPct) { pct.textContent = n + ' %'; lastPct = n; }
  }

  function frame(t) {
    var dt = Math.min(64, t - (last || t)); last = t;
    want = target();
    /* zeitbasierte Dämpfung: gleich weich bei 60 und 120 Hz */
    P = reduce ? want : P + (want - P) * (1 - Math.exp(-dt / 110));
    if (Math.abs(want - P) < 0.0002) P = want;
    render();
    if (P !== want) requestAnimationFrame(frame); else { run = false; last = 0; }
  }
  function kick() { if (!run) { run = true; requestAnimationFrame(frame); } }

  W.addEventListener('scroll', kick, { passive: true });
  W.addEventListener('resize', function () { measure(); kick(); });
  W.addEventListener('load', function () { measure(); kick(); });
  measure(); P = want = target(); render();
})();
