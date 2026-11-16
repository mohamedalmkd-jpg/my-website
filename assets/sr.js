/* VONUMO Techwear – UI-Bewegung: Scroll-Szenen, Text-Scramble, Blitze, Cursor, weiches Scrollen, Warenkorb, FAQ */
(function () {
  'use strict';
  var D = document, W = window, B = D.body;
  var $ = function (s, c) { return (c || D).querySelector(s); }, $$ = function (s, c) { return Array.prototype.slice.call((c || D).querySelectorAll(s)); };
  var reduce = W.matchMedia('(prefers-reduced-motion: reduce)').matches, fine = W.matchMedia('(pointer:fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var mob = function () { return W.innerWidth <= 760; };
  var S = W.__sr = { P: 0, TP: 0, mx: 0, my: 0, smx: 0, smy: 0 };

  /* ---------- Text-Scramble ---------- */
  var GL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$@#*%&/<>';
  var esc = function (c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c; };
  function scramble(el, ms) {
    if (reduce) return;
    if (!el.__src) el.__src = el.innerHTML;
    var lines = el.__src.split(/<br\s*\/?>/i).map(function (l) { var t = D.createElement('textarea'); t.innerHTML = l; return t.value; });
    var total = lines.reduce(function (n, l) { return n + l.length; }, 0), t0 = performance.now(), dur = ms || 900;
    cancelAnimationFrame(el.__raf);
    (function step(t) {
      var k = clamp((t - t0) / dur, 0, 1), shown = Math.floor(k * total * 1.15), n = 0;
      el.innerHTML = lines.map(function (l) {
        var o = ''; for (var i = 0; i < l.length; i++, n++) { var c = l[i]; o += (c === ' ' || n < shown) ? esc(c) : (n < shown + 6 ? esc(GL[(Math.random() * GL.length) | 0]) : '&nbsp;'); }
        return o;
      }).join('<br>');
      if (k < 1) el.__raf = requestAnimationFrame(step); else el.innerHTML = el.__src;
    })(t0);
  }
  S.scramble = scramble;

  /* ---------- Einblenden ---------- */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; el.classList.add('in');
      if (el.hasAttribute('data-scramble') && !el.__done) { el.__done = 1; scramble(el, 1000); }
      io.unobserve(el);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  $$('[data-in]').forEach(function (el) { io.observe(el); });
  $$('.sr-side').forEach(function (el, i) { setTimeout(function () { scramble(el, 1200); }, 350 + i * 180); });
  $$('[data-hover-scramble]').forEach(function (h) { var card = h.closest('.sr-card'); card.addEventListener('mouseenter', function () { scramble(h, 650); }); });

  /* ---------- Navigation + Menü ---------- */
  var nav = $('#srNav'), links = $$('.sr-links a'), secMap = [D.getElementById('kollektion'), D.getElementById('kollektion'), D.getElementById('technologie'), D.getElementById('faq')];
  function navTick() {
    nav.classList.toggle('s', W.scrollY > 30);
    var y = W.scrollY + W.innerHeight * 0.4, act = -1;
    secMap.forEach(function (s, i) { if (s && s.offsetTop <= y && i !== 0) act = i; });
    links.forEach(function (a, i) { a.classList.toggle('on', i === act); });
  }
  function menu(o) { B.classList.toggle('menu', o); $('#srBurger').setAttribute('aria-expanded', o); }
  $('#srBurger').addEventListener('click', function () { menu(!B.classList.contains('menu')); });
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });

  /* ---------- Weiches Scrollen (Trägheit für Mausrad, Touch bleibt nativ) ---------- */
  var cur = W.scrollY, target = W.scrollY, smoothing = false, own = false;
  var maxY = function () { return D.documentElement.scrollHeight - W.innerHeight; };
  if (fine && !reduce) {
    W.addEventListener('wheel', function (e) {
      if (e.ctrlKey || B.classList.contains('modal') || e.target.closest('.tw-modal')) return;
      e.preventDefault();
      if (!smoothing) { cur = target = W.scrollY; }
      target = clamp(target + e.deltaY * (e.deltaMode === 1 ? 36 : e.deltaMode === 2 ? W.innerHeight : 1), 0, maxY());
      smoothing = true;
    }, { passive: false });
    W.addEventListener('scroll', function () { if (!own) { cur = target = W.scrollY; } own = false; }, { passive: true });
  }
  function scrollToY(y) {
    y = clamp(y, 0, maxY());
    if (reduce) { W.scrollTo(0, y); return; }
    if (fine) { if (!smoothing) cur = W.scrollY; target = y; smoothing = true; S.slow = true; return; }
    var y0 = W.scrollY, d = y - y0, t0 = performance.now(), dur = clamp(Math.abs(d) / 2.2, 600, 1600);
    (function s(t) { var k = clamp((t - t0) / dur, 0, 1), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; W.scrollTo(0, y0 + d * e); if (k < 1) requestAnimationFrame(s); })(t0);
  }
  S.scrollToY = scrollToY;
  $$('[data-scr]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1), t = D.getElementById(id); if (!t) return;
      e.preventDefault(); menu(false);
      scrollToY(id === 'top' ? 0 : t.getBoundingClientRect().top + W.scrollY - (id === 'kollektion' ? 10 : 0));
    });
  });

  /* ---------- Cursor ---------- */
  var cu = $('.sr-cursor'), ci = $('.sr-cursor i'), cx = -100, cy = -100, tx = -100, ty = -100;
  if (fine && !reduce) {
    B.classList.add('cur');
    D.addEventListener('pointerover', function (e) {
      var hot = e.target.closest('a,button,.sr-card,.row,.sr-feat li,.tw-m-gl');
      ci.style.setProperty('--s', hot ? 1 : .45);
      ci.style.setProperty('--spin', e.target.closest('.row,.sr-card,.tw-m-gl') ? 1 : 0);
    });
  }
  W.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; S.mx = e.clientX / W.innerWidth * 2 - 1; S.my = e.clientY / W.innerHeight * 2 - 1; }, { passive: true });

  /* ---------- Warenkorb ---------- */
  var count = 0, cnt = $('#srCount'), cart = $('#srCart');
  S.cart = function (d) {
    count = Math.max(0, count + d); cnt.textContent = count;
    cart.classList.remove('bump'); void cart.offsetWidth; cart.classList.add('bump');
  };
  $$('.add').forEach(function (b) {
    b.addEventListener('click', function (e) { e.stopPropagation(); var on = !b.classList.contains('ok'); b.classList.toggle('ok', on); S.cart(on ? 1 : -1); });
  });
  cart.addEventListener('click', function () { scrollToY(D.getElementById('kollektion').offsetTop - 10); });

  /* ---------- FAQ-Akkordeon (abgeleitet: im Video offen; hier per Klick ein-/ausklappbar) ---------- */
  $$('.row .q').forEach(function (q) {
    q.addEventListener('click', function () { var o = q.getAttribute('aria-expanded') !== 'true'; q.setAttribute('aria-expanded', o); q.parentNode.classList.toggle('shut', !o); });
  });

  /* ---------- Blitze hinter dem Produkt ---------- */
  var cv = $('#srBolt'), ctx = cv.getContext('2d'), bw = 0, bh = 0, dpr = Math.min(1.5, W.devicePixelRatio || 1), lastBolt = 0, bolts = [];
  function sizeBolt() { bw = cv.clientWidth; bh = cv.clientHeight; cv.width = bw * dpr; cv.height = bh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function makeBolt(side) {
    var m = mob(), pts = [], x = bw / 2 + side * bw * (m ? 0.3 : 0.15 + Math.random() * 0.05), y = bh * (0.42 + Math.random() * 0.14), segs = 9 + (Math.random() * 6 | 0);
    pts.push([x, y]);
    for (var i = 0; i < segs; i++) { x += side * (10 + Math.random() * 28); y += (Math.random() - 0.35) * 46; pts.push([x, y]); }
    var br = []; for (var j = 2; j < pts.length - 2; j += 2 + (Math.random() * 3 | 0)) { var p = pts[j], q = [p.slice()], bx = p[0], by = p[1]; for (var k = 0; k < 4; k++) { bx += side * (6 + Math.random() * 16); by += (Math.random() - 0.5) * 40; q.push([bx, by]); } br.push(q); }
    return { pts: pts, br: br, life: 1 };
  }
  function strokePts(p, a, w) { ctx.globalAlpha = a; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.stroke(); }
  function drawBolts(t) {
    if (t - lastBolt > 110 + Math.random() * 120) { lastBolt = t; bolts.push(makeBolt(-1), makeBolt(1)); if (bolts.length > 14) bolts.splice(0, 2); }
    ctx.clearRect(0, 0, bw, bh); ctx.strokeStyle = '#9a9ca3';
    bolts.forEach(function (b) { b.life *= 0.93; if (b.life < 0.04) return; ctx.shadowColor = 'rgba(160,170,200,.6)'; ctx.shadowBlur = 6; strokePts(b.pts, 0.75 * b.life, 1.8); b.br.forEach(function (q) { strokePts(q, 0.5 * b.life, 1.1); }); });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  /* ---------- Szenen-Fortschritt ---------- */
  var hero = $('#srHero'), stick = $('.sr-stick', hero), feats = $$('#srFeat li'), hot = $('#srHot'), dt = $('#srDt'), tech = $('#technologie'), featCur = -1;
  function prog(sec) { var r = sec.getBoundingClientRect(), span = Math.max(1, sec.offsetHeight - W.innerHeight); return clamp(-r.top / span, 0, 1); }
  function frame(t) {
    requestAnimationFrame(frame);
    if (smoothing) {
      cur += (target - cur) * (S.slow ? 0.07 : 0.11);
      if (Math.abs(target - cur) < 0.4) { cur = target; smoothing = false; S.slow = false; }
      own = true; W.scrollTo(0, cur);
    }
    navTick();
    S.smx += (S.mx - S.smx) * 0.06; S.smy += (S.my - S.smy) * 0.06;
    if (fine && !reduce) { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cu.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)'; }

    var hr = hero.getBoundingClientRect();
    if (hr.bottom > 0 && hr.top < W.innerHeight) {
      S.P += (prog(hero) - S.P) * (reduce ? 1 : 0.12);
      var P = S.P, m = mob();
      stick.style.setProperty('--p', P.toFixed(4));
      cv.style.opacity = Math.max(0, 0.95 - P * 1.8).toFixed(3);
      hot.classList.toggle('on', P > 0.3 && P < 0.62 && !m);
      dt.classList.toggle('on', P > 0.2);
      var fc = -1;
      feats.forEach(function (li, i) { var on = P > 0.26 + i * 0.075; li.classList.toggle('on', on); if (on) fc = i; });
      if (fc !== featCur) { featCur = fc; feats.forEach(function (li, i) { li.classList.toggle('cur', i === fc); }); }
      if (P < 0.6 && !reduce) drawBolts(t); else if (bolts.length) { bolts = []; ctx.clearRect(0, 0, bw, bh); }
    } else cv.style.opacity = 0;
    var trc = tech.getBoundingClientRect();
    if (trc.bottom > 0 && trc.top < W.innerHeight) S.TP += (prog(tech) - S.TP) * (reduce ? 1 : 0.12);
  }
  sizeBolt(); W.addEventListener('resize', sizeBolt);
  requestAnimationFrame(frame);
})();
