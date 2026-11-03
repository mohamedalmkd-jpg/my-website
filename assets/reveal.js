/* VONUMO Signature – eigenes Enthüllungsvideo: startet in Sicht, pausiert außerhalb, Abschluss-Text am Ende */
(function () {
  'use strict';
  var D = document, W = window, v = D.getElementById('rvVideo'), rv = D.getElementById('rv'); if (!v || !rv) return;
  var end = rv.querySelector('.rv-end'), btn = D.getElementById('rvPlay'), user = false, loaded = false;
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function load() { if (loaded) return; loaded = true; v.src = (W.innerWidth < 900 || (navigator.connection && navigator.connection.saveData)) ? v.getAttribute('data-sd') : v.getAttribute('data-hd'); v.load(); }
  function play() { if (user || reduce) return; load(); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function label() { btn.textContent = v.paused ? '▶' : '❚❚'; btn.setAttribute('aria-label', v.paused ? 'Video abspielen' : 'Video pausieren'); }
  v.addEventListener('timeupdate', function () { end.classList.toggle('on', v.duration && v.currentTime > v.duration - 2.4); });
  v.addEventListener('play', label); v.addEventListener('pause', label);
  btn.addEventListener('click', function () { load(); if (v.paused) { user = false; v.play(); } else { user = true; v.pause(); } });
  if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) play(); else if (!v.paused) v.pause(); }); }, { threshold: 0.4 }).observe(rv);
  else play();
  if (reduce) { load(); label(); }
})();
