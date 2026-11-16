/* VONUMO Showroom – Bewegung: Pin-Szenen, Text-Scramble, Blitze, Cursor, Ebenen-Callout */
(function () {
  'use strict';
  var D = document, W = window, B = D.body;
  var $ = function (s, c) { return (c || D).querySelector(s); }, $$ = function (s, c) { return Array.prototype.slice.call((c || D).querySelectorAll(s)); };
  var reduce = W.matchMedia('(prefers-reduced-motion: reduce)').matches, fine = W.matchMedia('(pointer:fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var ease = function (x) { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
  var smooth = function (x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  var mob = function () { return W.innerWidth <= 760; };

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
  $$('.sr-side').forEach(function (el, i) { setTimeout(function () { scramble(el, 1200); }, 250 + i * 180); });
  $$('[data-hover-scramble]').forEach(function (h) { var card = h.closest('.sr-card'); card.addEventListener('mouseenter', function () { scramble(h, 650); }); });

  /* ---------- Navigation ---------- */
  var nav = $('#srNav'), links = $$('.sr-links a'), secs = ['top', 'kollektion', 'technologie', 'faq'].map(function (id) { return D.getElementById(id); });
  function navTick() {
    nav.classList.toggle('s', W.scrollY > 30);
    var y = W.scrollY + W.innerHeight * 0.4, act = 0;
    secs.forEach(function (s, i) { if (s && s.offsetTop <= y) act = i; });
    links.forEach(function (a, i) { a.classList.toggle('on', i === act); });
  }
  function menu(o) { B.classList.toggle('menu', o); $('#srBurger').setAttribute('aria-expanded', o); }
  $('#srBurger').addEventListener('click', function () { menu(!B.classList.contains('menu')); });
  /* weiches Scrollen zu Ankern */
  function scrollToY(y) {
    if (reduce) { W.scrollTo(0, y); return; }
    var y0 = W.scrollY, d = y - y0, t0 = performance.now(), dur = clamp(Math.abs(d) / 2.2, 600, 1600);
    (function s(t) { var k = clamp((t - t0) / dur, 0, 1), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; W.scrollTo(0, y0 + d * e); if (k < 1) requestAnimationFrame(s); })(t0);
  }
  $$('[data-scr]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1), t = id === 'top' ? D.body : D.getElementById(id); if (!t) return;
      e.preventDefault(); menu(false);
      scrollToY(id === 'top' ? 0 : t.getBoundingClientRect().top + W.scrollY - (id === 'kollektion' ? 20 : 0));
    });
  });

  /* ---------- Cursor ---------- */
  var cur = $('.sr-cursor'), ci = $('.sr-cursor i'), cx = -100, cy = -100, tx = -100, ty = -100;
  if (fine && !reduce) {
    B.classList.add('cur');
    W.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    D.addEventListener('pointerover', function (e) {
      var hot = e.target.closest('a,button,.sr-card,.row,.sr-feat li');
      ci.style.setProperty('--s', hot ? 1 : .45);
      ci.style.setProperty('--spin', e.target.closest('.row,.sr-card') ? 1 : 0);
    });
  }

  /* ---------- Anfrage-Zähler ---------- */
  var count = 0, cnt = $('#srCount'), cart = $('.sr-cart');
  $$('.add').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = !b.classList.contains('ok'); b.classList.toggle('ok', on); count += on ? 1 : -1; cnt.textContent = count;
      cart.classList.remove('bump'); void cart.offsetWidth; cart.classList.add('bump');
    });
  });

  /* ---------- Blitze hinter dem Produkt ---------- */
  var cv = $('#srBolt'), ctx = cv.getContext('2d'), bw = 0, bh = 0, dpr = Math.min(1.5, W.devicePixelRatio || 1), lastBolt = 0, bolts = [];
  function sizeBolt() { bw = cv.clientWidth; bh = cv.clientHeight; cv.width = bw * dpr; cv.height = bh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function makeBolt(side) {
    var pts = [], x = bw / 2 + side * bw * (0.14 + Math.random() * 0.05), y = bh * (0.36 + Math.random() * 0.12), segs = 9 + (Math.random() * 6 | 0);
    pts.push([x, y]);
    for (var i = 0; i < segs; i++) { x += side * (10 + Math.random() * 28); y += (Math.random() - 0.35) * 46; pts.push([x, y]); }
    var br = []; for (var j = 2; j < pts.length - 2; j += 2 + (Math.random() * 3 | 0)) { var p = pts[j], q = [p.slice()]; var bx = p[0], by = p[1]; for (var k = 0; k < 4; k++) { bx += side * (6 + Math.random() * 16); by += (Math.random() - 0.5) * 40; q.push([bx, by]); } br.push(q); }
    return { pts: pts, br: br, life: 1 };
  }
  function strokePts(p, a, w) { ctx.globalAlpha = a; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.stroke(); }
  function drawBolts(t) {
    if (t - lastBolt > 110 + Math.random() * 120) { lastBolt = t; bolts.push(makeBolt(-1), makeBolt(1)); if (bolts.length > 14) bolts.splice(0, 2); }
    ctx.clearRect(0, 0, bw, bh); ctx.strokeStyle = '#9a9ca3'; ctx.lineJoin = 'miter';
    bolts.forEach(function (b) {
      b.life *= 0.93; if (b.life < 0.04) return;
      ctx.shadowColor = 'rgba(160,170,200,.6)'; ctx.shadowBlur = 6;
      strokePts(b.pts, 0.75 * b.life, 1.8); b.br.forEach(function (q) { strokePts(q, 0.5 * b.life, 1.1); });
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }

  /* ---------- Szenen ---------- */
  var hero = $('#srHero'), stick = $('.sr-stick', hero), prod = $('#srProd'), views = { front: $('.v-front'), left: $('.v-left'), right: $('.v-right'), detail: $('.v-detail') };
  var feats = $$('#srFeat li'), hot = $('#srHot'), dt = $('#srDt'), shown = 'front';
  var tech = $('#technologie'), tstick = $('.sr-stick', tech), layers = $('#srLayers'), ldot = $('#srLdot'), line = $('#srLine'), call = $('#srCall'), ticks = $$('#srTicks li');
  var L = [
    { n: '01', t: 'Außenhülle', p: 'Robuste Außenschicht, die Wasser abweist und vor Wind und Regen schützt.', x: 50, y: 20 },
    { n: '02', t: 'Atmungsaktive Membran', p: 'Lässt Feuchtigkeit nach außen und hält Nässe draußen.', x: 52, y: 40 },
    { n: '03', t: 'Thermo-Füllung', p: 'Gesteppte Kammern speichern Wärme bei minimalem Gewicht.', x: 46, y: 62 },
    { n: '04', t: 'Komfort-Futter', p: 'Glattes Innenfutter für bequemes Tragen und leichtes Layering.', x: 56, y: 86 }
  ];
  var faqImg = $('.sr-faq-img'), faq = $('#faq');
  var mx = 0, my = 0, smx = 0, smy = 0, P = 0, TP = 0, layerIdx = -1, featCur = -1;
  W.addEventListener('pointermove', function (e) { mx = e.clientX / W.innerWidth * 2 - 1; my = e.clientY / W.innerHeight * 2 - 1; }, { passive: true });

  function prog(sec) { var r = sec.getBoundingClientRect(), span = Math.max(1, sec.offsetHeight - W.innerHeight); return clamp(-r.top / span, 0, 1); }
  function setView(v) { if (v === shown) return; shown = v; Object.keys(views).forEach(function (k) { views[k].classList.toggle('on', k === v); }); }

  function frame(t) {
    requestAnimationFrame(frame);
    navTick();
    smx += (mx - smx) * 0.06; smy += (my - smy) * 0.06;
    if (fine && !reduce) { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)'; }

    /* Hero → Details */
    var hr = hero.getBoundingClientRect();
    if (hr.bottom > 0 && hr.top < W.innerHeight) {
      var want = prog(hero); P += (want - P) * (reduce ? 1 : 0.12);
      stick.style.setProperty('--p', P.toFixed(4));
      var z = ease((P - 0.06) / 0.5), m = mob();
      var sc = 1 + z * (m ? 0.5 : 0.75) + smooth((P - 0.62) / 0.3) * 0.12;
      var px = (m ? 0 : -z * W.innerWidth * 0.1) + smx * 14 * (1 - z), py = z * W.innerHeight * (m ? 0.02 : 0.1) + Math.sin(t / 1400) * 6 - smooth((P - 0.9) / 0.1) * W.innerHeight * 0.15;
      var ry = reduce ? 0 : Math.sin(t / 2600) * 5 * (1 - z) + smx * 6;
      prod.style.setProperty('--ps', sc.toFixed(4)); prod.style.setProperty('--px', px.toFixed(1)); prod.style.setProperty('--py', py.toFixed(1)); prod.style.setProperty('--ry', ry.toFixed(2));
      /* Drehung über Blickwinkel-Bilder, später Nahaufnahme */
      var turn = reduce ? 0 : Math.sin(t / 2600) * 0.9 + smx * 0.8;
      setView(P > 0.58 ? 'detail' : (z > 0.5 ? 'front' : (turn < -0.55 ? 'left' : turn > 0.55 ? 'right' : 'front')));
      hot.classList.toggle('on', P > 0.3 && P < 0.62 && !m);
      dt.classList.toggle('on', P > 0.2);
      var fc = -1;
      feats.forEach(function (li, i) { var on = P > 0.26 + i * 0.075; li.classList.toggle('on', on); if (on) fc = i; });
      if (fc !== featCur) { featCur = fc; feats.forEach(function (li, i) { li.classList.toggle('cur', i === fc); }); }
      if (P < 0.6 && !reduce) drawBolts(t); else if (bolts.length) { bolts = []; ctx.clearRect(0, 0, bw, bh); }
    }

    /* Technologie: Ebenen + Callout */
    var trc = tech.getBoundingClientRect();
    if (trc.bottom > 0 && trc.top < W.innerHeight) {
      var tw = prog(tech); TP += (tw - TP) * (reduce ? 1 : 0.12);
      layers.style.setProperty('--tx', (14 - TP * 14 + smy * 3).toFixed(2));
      layers.style.setProperty('--tz', (-4 + TP * 6 + smx * 2).toFixed(2));
      layers.style.setProperty('--tsc', (0.9 + ease(TP * 1.4) * 0.12).toFixed(4));
      var k = Math.min(3, Math.floor(TP * 4 * 0.999));
      if (k !== layerIdx) {
        layerIdx = k; var d = L[k];
        $('#srCallN').textContent = d.n; $('#srCallT').textContent = d.t; $('#srCallP').textContent = d.p;
        call.classList.remove('swap'); void call.offsetWidth; call.classList.add('swap');
        ldot.style.setProperty('--lx', d.x + '%'); ldot.style.setProperty('--ly', d.y + '%');
        ticks.forEach(function (li, i) { li.classList.toggle('on', i <= k); });
        var ct = $('#srCallT'); ct.__src = d.t; scramble(ct, 500);
      }
      if (!mob()) {
        var a = ldot.getBoundingClientRect(), c = call.getBoundingClientRect(), s0 = tstick.getBoundingClientRect();
        line.setAttribute('x1', (a.left + a.width / 2 - s0.left).toFixed(1)); line.setAttribute('y1', (a.top + a.height / 2 - s0.top).toFixed(1));
        line.setAttribute('x2', (c.left - s0.left).toFixed(1)); line.setAttribute('y2', (c.top + c.height / 2 - s0.top).toFixed(1));
      }
    }

    /* FAQ-Bild Parallaxe */
    var fr = faq.getBoundingClientRect();
    if (fr.bottom > 0 && fr.top < W.innerHeight) { var fp = 1 - clamp(fr.top / W.innerHeight, -1, 1); faqImg.style.setProperty('--fy', (60 - fp * 60).toFixed(1) + 'px'); }
  }

  sizeBolt(); W.addEventListener('resize', sizeBolt);
  requestAnimationFrame(frame);
})();
