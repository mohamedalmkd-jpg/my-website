/* VONUMO Showroom – Baustelle wächst beim Scrollen: 6 Fotos derselben Perspektive werden überblendet */
(function () {
  'use strict';
  var D = document, W = window, pin = D.getElementById('bauPin'); if (!pin) return;
  var shots = pin.querySelectorAll('.bs-shot'), N = shots.length, steps = pin.querySelectorAll('.bs-step'), bar = pin.querySelector('.bs-bar i'), pct = pin.querySelector('.bs-pct');
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches, P = 0, run = false, cur = -1;
  function prog() { var r = pin.getBoundingClientRect(), span = Math.max(1, r.height - W.innerHeight); return Math.min(1, Math.max(0, -r.top / span)); }
  function frame() {
    var want = prog(); P += (want - P) * (reduce ? 1 : 0.14);
    var f = P * (N - 1);
    for (var i = 0; i < N; i++) { var o = Math.max(0, 1 - Math.abs(f - i)); shots[i].style.opacity = i === 0 ? 1 : (f >= i - 1 ? Math.min(1, Math.max(0, f - (i - 1))) : 0).toFixed(3); shots[i].style.transform = 'scale(' + (1.06 - P * 0.06).toFixed(4) + ')'; void o; }
    var s = Math.min(N - 1, Math.round(f)); if (s !== cur) { cur = s; Array.prototype.forEach.call(steps, function (e, k) { e.classList.toggle('on', k === s); e.classList.toggle('done', k < s); }); }
    bar.style.transform = 'scaleX(' + P.toFixed(3) + ')'; pct.textContent = Math.round(P * 100) + ' %';
    if (Math.abs(want - P) > 0.0008) requestAnimationFrame(frame); else run = false;
  }
  function kick() { if (!run) { run = true; requestAnimationFrame(frame); } }
  W.addEventListener('scroll', kick, { passive: true }); W.addEventListener('resize', kick); kick();
})();
