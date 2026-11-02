/* VONUMO – Code-Kapitel: beim Scrollen erscheinen Details zu jedem Code-Symbol */
(function () {
  'use strict';
  var D = document, W = window, sec = D.getElementById('code');
  if (!sec) return;
  var STEPS = [
    { tag: 'Struktur', h: 'Semantisches HTML', p: 'Jede Seite beginnt mit einem sauberen Gerüst: klare Hierarchie, kurze Ladezeit und Inhalte, die Google und Screenreader sofort verstehen.' },
    { tag: 'Design-System', h: 'Stil mit System', p: 'Farben, Abstände und Schriften als wiederverwendbare Tokens. Jede Komponente sieht überall gleich aus – vom Button bis zum Footer.' },
    { tag: 'Interaktion', h: 'Bewegung mit Sinn', p: 'JavaScript, WebGL und Motion erwecken die Oberfläche zum Leben: 3D-Szenen, Mikro-Animationen und flüssiges Scrollen – auch auf dem Smartphone.' },
    { tag: 'Daten & Funktionen', h: 'Logik im Hintergrund', p: 'Formulare, Konten und Anfragen laufen über eigene Server-Funktionen und eine PostgreSQL-Datenbank – geprüft, geschützt und skalierbar.' },
    { tag: 'Qualität', h: 'Jedes Detail sitzt', p: 'Automatische Tests und Vorschau-Links vor jedem Livegang. Erst wenn alles stimmt, geht Ihre Seite online – und bleibt jederzeit zurücksetzbar.' }
  ];
  var N = STEPS.length, num = D.getElementById('cdNum'), tag = D.getElementById('cdTag'), h = D.getElementById('cdH'), p = D.getElementById('cdP');
  var rail = D.getElementById('cdRail'), lis = rail.querySelectorAll('li'), txt = sec.querySelector('.cd-txt');
  var M = W.Motion, reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = -1, pending = -1, busy = false;

  function prog() {
    var r = sec.getBoundingClientRect(), span = Math.max(1, r.height - W.innerHeight);
    return Math.min(1, Math.max(0, -r.top / span));
  }
  function fill(i) {
    var s = STEPS[i];
    num.textContent = ('0' + (i + 1)) + ' / 0' + N; tag.textContent = s.tag; h.textContent = s.h; p.textContent = s.p;
    sec.setAttribute('data-step', i);
    Array.prototype.forEach.call(lis, function (li, k) { li.classList.toggle('on', k === i); li.classList.toggle('past', k < i); });
  }
  function show(i) {
    if (i === cur) return;
    var dir = i > cur ? 1 : -1, first = cur < 0; cur = i;
    if (!M || reduce || first) { fill(i); return; }
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
    var g = prog(), i = Math.min(N - 1, Math.floor(g * N * 0.999));
    W.__codeP = g;
    var r = sec.getBoundingClientRect(), vis = r.top < W.innerHeight * 0.6 && r.bottom > W.innerHeight * 0.4;
    sec.classList.toggle('live', vis);
    show(i);
  }
  W.addEventListener('scroll', tick, { passive: true }); W.addEventListener('resize', tick);
  rail.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var i = +b.getAttribute('data-i'), top = sec.getBoundingClientRect().top + W.scrollY, span = sec.offsetHeight - W.innerHeight;
    W.scrollTo({ top: top + span * (i + 0.5) / N, behavior: reduce ? 'auto' : 'smooth' });
  });
  fill(0); cur = 0; tick();
})();
