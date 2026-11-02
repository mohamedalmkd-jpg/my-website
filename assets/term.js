/* VONUMO – Live-Build: Code schreibt sich beim Scrollen selbst, danach „Erfolgreich“ */
(function () {
  'use strict';
  var D = document, W = window, box = D.getElementById('term'); if (!box) return;
  var pre = D.getElementById('termCode'), ok = D.getElementById('termOk'), st = D.getElementById('termSt');
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* [Text, Klasse] je Zeile */
  var L = [
    [['import ', 'k'], ['{ vonumo }', 't'], [' from ', 'k'], ["'@vonumo/studio'", 's'], [';', 'p']],
    [['', 't']],
    [['const ', 'k'], ['website', 'v'], [' = ', 'p'], ['await ', 'k'], ['vonumo', 't'], ['.', 'p'], ['build', 'f'], ['({', 'p']],
    [['  design', 'a'], [': ', 'p'], ["'premium'", 's'], [',', 'p']],
    [['  motion', 'a'], [': ', 'p'], ["'3D'", 's'], [',', 'p']],
    [['  database', 'a'], [': ', 'p'], ["'postgres'", 's'], [',', 'p']],
    [['  ai', 'a'], [': ', 'p'], ['true', 'n'], [',', 'p']],
    [['});', 'p']],
    [['', 't']],
    [['await ', 'k'], ['website', 'v'], ['.', 'p'], ['test', 'f'], ['();', 'p'], ['  // 15/15 bestanden', 'c']],
    [['await ', 'k'], ['website', 'v'], ['.', 'p'], ['deploy', 'f'], ['(', 'p'], ["'vercel'", 's'], [');', 'p']]
  ];
  var run = 0, done = false;
  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function render(n) { /* n = Anzahl sichtbarer Zeichen */
    var out = '', c = 0, ln = 1;
    for (var i = 0; i < L.length; i++) {
      var line = '<span class="ln">' + (ln++ < 10 ? ' ' : '') + (i + 1) + '</span>';
      for (var j = 0; j < L[i].length; j++) {
        var t = L[i][j][0], take = Math.max(0, Math.min(t.length, n - c)); c += t.length;
        if (take) line += '<span class="' + L[i][j][1] + '">' + esc(t.slice(0, take)) + '</span>';
        if (take < t.length) return out + line + '<span class="cur"></span>';
      }
      out += line + '\n'; c += 1; if (c > n) return out + '<span class="cur"></span>';
    }
    return out;
  }
  var total = L.reduce(function (a, l) { return a + l.reduce(function (b, p) { return b + p[0].length; }, 0) + 1; }, 0);
  function reset() { run++; done = false; box.classList.remove('ok', 'run'); pre.innerHTML = render(0); st.textContent = 'bereit'; }
  function play() {
    var id = ++run, n = 0, last = 0; box.classList.add('run'); box.classList.remove('ok'); st.textContent = 'schreibt …';
    if (reduce) { pre.innerHTML = render(total); finish(id); return; }
    (function step(now) {
      if (id !== run) return;
      if (!last) last = now;
      n += Math.max(1, Math.round((now - last) / 22)); last = now;
      pre.innerHTML = render(n);
      if (n < total) requestAnimationFrame(step); else { st.textContent = 'baut …'; setTimeout(function () { finish(id); }, 900); }
    })(0);
  }
  function finish(id) {
    if (id !== run) return; done = true;
    pre.innerHTML = render(total); box.classList.remove('run'); box.classList.add('ok'); st.textContent = '✓ live';
    if (W.Motion && !reduce) W.Motion.animate(ok, { opacity: [0, 1], y: [16, 0], scale: [0.94, 1] }, { type: 'spring', stiffness: 260, damping: 18 });
  }
  reset();
  if ('IntersectionObserver' in W) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio > 0.45) { if (!box.classList.contains('run') && !done) play(); } else if (!e.isIntersecting) reset(); });
    }, { threshold: [0, 0.45, 0.6] }).observe(box);
  } else { pre.innerHTML = render(total); finish(run); }
})();
