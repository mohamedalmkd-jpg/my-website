/* VONUMO – Scroll-Kapitel: beim Scrollen erscheinen nacheinander Details zu den Website-Ebenen */
(function () {
  'use strict';
  var D = document, W = window;
  var DATA = {
    mission: [
      { tag: 'Hintergrund', h: 'Das Fundament', p: 'Farbe, Licht und Tiefe setzen die Stimmung. Der Hintergrund trägt Ihre Marke, noch bevor ein einziges Wort gelesen wird.' },
      { tag: 'Navigation', h: 'Orientierung in Sekunden', p: 'Klare Menüs, ein Header, der mitläuft, und logische Wege – Besucher finden, was sie suchen, ohne nachzudenken.' },
      { tag: 'Bild', h: 'Visuelle Wirkung', p: 'Fotos, Grafiken und 3D-Elemente, optimiert für jedes Gerät: gestochen scharf und trotzdem schnell geladen.' },
      { tag: 'Typografie', h: 'Worte mit Gewicht', p: 'Schriftwahl, Hierarchie und Rhythmus lenken den Blick. Überschriften wecken Interesse, Fließtext schafft Vertrauen.' },
      { tag: 'Interaktion', h: 'Der entscheidende Klick', p: 'Buttons, Formulare und Mikro-Animationen geben sofort Feedback und führen Besucher sicher bis zur Anfrage.' }
    ]
  };
  var M = W.Motion, reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  W.__stepP = W.__stepP || {};
  Object.keys(DATA).forEach(function (id) {
    var sec = D.getElementById(id); if (!sec) return;
    var STEPS = DATA[id], N = STEPS.length, q = function (c) { return sec.querySelector(c); };
    var num = q('.cd-num'), tag = q('.cd-tag'), h = q('.cd-h'), p = q('.cd-p'), rail = q('.cd-rail'), lis = rail.querySelectorAll('li');
    var cur = -1, pending = -1, busy = false;
    function prog() { var r = sec.getBoundingClientRect(), span = Math.max(1, r.height - W.innerHeight); return Math.min(1, Math.max(0, -r.top / span)); }
    function fill(i) {
      var s = STEPS[i];
      num.textContent = '0' + (i + 1) + ' / 0' + N; tag.textContent = s.tag; h.textContent = s.h; p.textContent = s.p;
      sec.setAttribute('data-step', i);
      Array.prototype.forEach.call(lis, function (li, k) { li.classList.toggle('on', k === i); li.classList.toggle('past', k < i); });
    }
    function show(i) {
      if (i === cur) return;
      var dir = i > cur ? 1 : -1; cur = i;
      if (!M || reduce) { fill(i); return; }
      if (busy) { pending = i; return; }
      busy = true;
      var parts = [num.parentNode, h, p];
      M.animate(parts, { opacity: 0, y: -24 * dir, filter: 'blur(8px)' }, { duration: 0.22, ease: 'easeIn', delay: M.stagger(0.03) }).finished.then(function () {
        fill(cur);
        M.animate(parts, { opacity: [0, 1], y: [30 * dir, 0], filter: ['blur(10px)', 'blur(0px)'] }, { type: 'spring', stiffness: 170, damping: 20, delay: M.stagger(0.06), opacity: { duration: 0.4 }, filter: { duration: 0.45 } });
        busy = false;
        if (pending >= 0 && pending !== cur) { var n = pending; pending = -1; cur = -2; show(n); } else pending = -1;
      });
    }
    function tick() {
      var g = prog(); W.__stepP[id] = g;
      var r = sec.getBoundingClientRect();
      sec.classList.toggle('live', r.top < W.innerHeight * 0.6 && r.bottom > W.innerHeight * 0.4);
      show(Math.min(N - 1, Math.floor(g * N * 0.999)));
    }
    W.addEventListener('scroll', tick, { passive: true }); W.addEventListener('resize', tick);
    rail.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var i = +b.getAttribute('data-i'), top = sec.getBoundingClientRect().top + W.scrollY, span = sec.offsetHeight - W.innerHeight;
      W.scrollTo({ top: top + span * (i + 0.5) / N, behavior: reduce ? 'auto' : 'smooth' });
    });
    fill(0); cur = 0; tick();
  });
})();
