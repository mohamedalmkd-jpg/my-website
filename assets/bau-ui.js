/* VONUMO Showroom – kleine Bau-App: Bauphasen, Fortschrittsring, Mini-Kostenrechner, Buchungs-Button */
(function () {
  'use strict';
  var D = document, W = window, root = D.getElementById('bauUx'); if (!root) return;
  var $ = function (s) { return root.querySelector(s); }, $$ = function (s) { return Array.prototype.slice.call(root.querySelectorAll(s)); };
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tween(a, b, ms, cb) { if (reduce) return cb(b); var t0 = performance.now(); (function s(t) { var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 4); cb(a + (b - a) * e); if (k < 1) requestAnimationFrame(s); })(t0); }
  var fmt = function (n) { return Math.round(n).toLocaleString('de-DE'); };

  /* Bauphasen */
  var imgs = $$('.ph-imgs img'), chips = $$('#uxSeg button'), ind = $('#uxSeg .ind'), seg = $('#uxSeg');
  var ring = $('#uxRing'), pct = $('#uxPct'), week = $('#uxWeek'), phase = $('#uxPhase'), play = $('#uxPlay');
  var P = [4, 18, 38, 58, 80, 100], WK = [1, 6, 14, 22, 32, 41], cur = -1, shown = 0, timer = null;
  function moveInd(b) { ind.style.width = b.offsetWidth + 'px'; ind.style.transform = 'translate3d(' + b.offsetLeft + 'px,0,0)'; var l = b.offsetLeft - seg.clientWidth / 2 + b.offsetWidth / 2; seg.scrollTo({ left: l, behavior: reduce ? 'auto' : 'smooth' }); }
  function go(i) {
    if (i === cur) return; cur = i;
    imgs.forEach(function (m, k) { m.classList.toggle('on', k === i); });
    chips.forEach(function (c, k) { c.classList.toggle('on', k === i); c.setAttribute('aria-selected', k === i); });
    moveInd(chips[i]);
    ring.style.strokeDashoffset = 100 - P[i];
    var from = shown; shown = P[i]; tween(from, P[i], 900, function (v) { pct.textContent = Math.round(v) + '%'; });
    week.textContent = 'Woche ' + WK[i] + '/41'; phase.textContent = chips[i].textContent;
    phase.classList.remove('pop'); void phase.offsetWidth; phase.classList.add('pop');
  }
  chips.forEach(function (c, k) { c.addEventListener('click', function () { stop(); go(k); }); });
  function stop() { if (timer) { clearInterval(timer); timer = null; play.textContent = '▶'; play.setAttribute('aria-label', 'Zeitraffer abspielen'); } }
  play.addEventListener('click', function () {
    if (timer) return stop();
    if (cur === 5) go(0);
    play.textContent = '❚❚'; play.setAttribute('aria-label', 'Zeitraffer anhalten');
    timer = setInterval(function () { if (cur >= 5) return stop(); go(cur + 1); }, 1300);
  });

  /* Mini-Kostenrechner */
  var rng = $('#uxRange'), area = $('#uxArea'), price = $('#uxPrice'), lv = $$('#uxLvl button'), lastP = 0;
  function calc() {
    var a = +rng.value, f = +root.querySelector('#uxLvl .on').getAttribute('data-v'), t = Math.round(a * 2450 * f / 1000) * 1000;
    area.textContent = a + ' m²'; rng.style.setProperty('--f', ((a - rng.min) / (rng.max - rng.min) * 100).toFixed(1) + '%');
    var from = lastP; lastP = t; tween(from, t, 600, function (v) { price.textContent = fmt(Math.round(v / 1000) * 1000) + ' €'; });
  }
  rng.addEventListener('input', calc);
  lv.forEach(function (b) { b.addEventListener('click', function () { lv.forEach(function (x) { x.classList.toggle('on', x === b); }); calc(); }); });

  /* Buchen: Button verwandelt sich (Laden → Haken) */
  var book = $('#uxBook'), busy = false;
  book.addEventListener('click', function () {
    if (busy) return; busy = true; book.classList.add('load');
    setTimeout(function () { book.classList.remove('load'); book.classList.add('done'); }, 1100);
    setTimeout(function () { book.classList.remove('done'); busy = false; }, 3200);
  });

  /* Start, sobald sichtbar: Ring und Zahlen laufen an, Karten tauchen gestaffelt auf */
  function start() { root.classList.add('in'); go(0); calc(); setTimeout(function () { if (!timer && cur === 0) play.click(); }, 900); }
  if ('IntersectionObserver' in W) { var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { threshold: 0.35 }); io.observe(root); } else start();
  W.addEventListener('resize', function () { if (cur >= 0) moveInd(chips[cur]); });
})();
