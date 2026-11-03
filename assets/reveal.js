/* VONUMO Signature – eigenes Enthüllungsvideo: startet von selbst (stumm), sonst großer Play-Knopf */
(function () {
  'use strict';
  var D = document, W = window, v = D.getElementById('rvVideo'), rv = D.getElementById('rv'); if (!v || !rv) return;
  var end = rv.querySelector('.rv-end'), btn = D.getElementById('rvPlay'), big = D.getElementById('rvBig'), user = false;
  var small = W.innerWidth < 900 || (navigator.connection && navigator.connection.saveData);
  v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.playsInline = true;
  function label() { var p = v.paused; btn.textContent = p ? '▶' : '❚❚'; btn.setAttribute('aria-label', p ? 'Video abspielen' : 'Video pausieren'); big.hidden = !p || !rv.classList.contains('blocked'); }
  function play() {
    if (user) return;
    var p = v.play();
    if (p && p.then) p.then(function () { rv.classList.remove('blocked'); label(); }).catch(function () { rv.classList.add('blocked'); label(); });
  }
  v.addEventListener('timeupdate', function () { if (end) end.classList.toggle('on', v.duration && v.currentTime > v.duration - 2.4); });
  v.addEventListener('play', label); v.addEventListener('pause', label);
  v.addEventListener('error', function () { rv.classList.add('blocked'); v.controls = true; label(); }, true);
  btn.addEventListener('click', function () { if (v.paused) { user = false; play(); } else { user = true; v.pause(); } });
  big.addEventListener('click', function () { user = false; play(); });
  if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) play(); else if (!v.paused) v.pause(); }); }, { threshold: 0.25 }).observe(rv);
  else play();
  label();
})();
