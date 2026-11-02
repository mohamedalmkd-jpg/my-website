/* VONUMO – Logik der eigenständigen Seiten: Abos, Termin, Showroom */
(function () {
  'use strict';
  var D = document, W = window, $ = function (id) { return D.getElementById(id); };
  var M = W.Motion, reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = W.matchMedia && W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var MAIL = 'almoakedmohammad@gmail.com';
  var PRICE = { Basic: [49, 39], Business: [99, 79], Premium: [199, 159] };

  /* Einblenden */
  if (M && !reduce) {
    var els = D.querySelectorAll('.pg-hero > *, .plan, .pr-head, .cmp, .faq details, .sr, .tm-wrap > *');
    M.animate(els, { opacity: [0, 1], y: [28, 0] }, { type: 'spring', stiffness: 140, damping: 20, delay: M.stagger(0.06) });
  }

  /* Abos: monatlich / jährlich */
  Array.prototype.forEach.call(D.querySelectorAll('.pr-bill button'), function (b) {
    b.addEventListener('click', function () {
      var bill = b.getAttribute('data-bill');
      Array.prototype.forEach.call(D.querySelectorAll('.pr-bill button'), function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      Array.prototype.forEach.call(D.querySelectorAll('.pl-price'), function (pp) {
        var v = pp.querySelector('b'), s = pp.querySelector('s');
        v.textContent = v.getAttribute('data-' + bill) + ' €'; s.textContent = bill === 'y' ? s.getAttribute('data-y') : '';
        if (M && !reduce) M.animate(v, { scale: [0.8, 1], opacity: [0.3, 1] }, { type: 'spring', stiffness: 300, damping: 18 });
      });
      Array.prototype.forEach.call(D.querySelectorAll('a.pl-go'), function (a) { a.href = a.href.replace(/&abo=\w/, '') + '&abo=' + bill; });
    });
  });

  /* 3D-Neigung für Karten */
  if (fine && M) Array.prototype.forEach.call(D.querySelectorAll('.plan'), function (el) {
    el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); M.animate(el, { rotateX: -((e.clientY - r.top) / r.height - 0.5) * 6, rotateY: ((e.clientX - r.left) / r.width - 0.5) * 6 }, { type: 'spring', stiffness: 220, damping: 22 }); });
    el.addEventListener('pointerleave', function () { M.animate(el, { rotateX: 0, rotateY: 0 }, { type: 'spring', stiffness: 120, damping: 14 }); });
  });

  /* Termin */
  var form = $('termin');
  if (form) {
    var q = new URLSearchParams(location.search), plan = q.get('paket'), abo = q.get('abo');
    if (plan && PRICE[plan]) $('bkPlan').value = plan;
    if (abo === 'y') $('bkBill').value = 'y';
    var d = new Date(); $('bkDate').min = d.toISOString().slice(0, 10);
    function defDate() { var x = new Date(); x.setDate(x.getDate() + 2); $('bkDate').value = x.toISOString().slice(0, 10); }
    defDate();
    function side() {
      var p = $('bkPlan').value, y = $('bkBill').value === 'y', box = $('tmPlan');
      box.innerHTML = PRICE[p] ? '<b>' + p + '</b> · ' + PRICE[p][y ? 1 : 0] + ' € / Monat inkl. Wartung' + (y ? ' · jährlich −20 %' : '') : '<b>Noch unsicher?</b> Wir beraten Sie gern im Gespräch.';
    }
    $('bkPlan').addEventListener('change', side); $('bkBill').addEventListener('change', side); side();
    fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.ok || !j.user) return; var u = j.user;
      if (!$('bkName').value && (u.fullName || u.name)) $('bkName').value = u.fullName || u.name;
      if (!$('bkMail').value && u.email) $('bkMail').value = u.email;
    }).catch(function () {});
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = $('bkOut'), name = $('bkName').value.trim(), mail = $('bkMail').value.trim(), tel = $('bkTel').value.trim(), p = $('bkPlan').value, y = $('bkBill').value === 'y', date = $('bkDate').value, time = $('bkTime').value, note = $('bkMsg').value.trim();
      out.className = 'msg';
      if (!name) { out.textContent = 'Bitte geben Sie Ihren Namen an.'; $('bkName').focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { out.textContent = 'Bitte eine gültige E-Mail-Adresse angeben.'; $('bkMail').focus(); return; }
      if (!date) { out.textContent = 'Bitte wählen Sie einen Wunschtermin.'; $('bkDate').focus(); return; }
      if (!$('bkOk').checked) { out.textContent = 'Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.'; return; }
      var when = date.split('-').reverse().join('.') + ' um ' + time + ' Uhr', billT = y ? 'jährlich (−20 %)' : 'monatlich';
      var text = 'Terminanfrage (Beratungsgespräch, 30 Min.)\nWunschtermin: ' + when + '\nPaket: ' + p + ' · ' + billT + (note ? '\n\n' + note : '');
      var btn = $('bkGo'); btn.disabled = true; btn.querySelector('span').textContent = 'Wird gesendet …';
      fetch('/api/inquiries', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'project', name: name, email: mail, phone: tel, service: 'Website-Entwicklung', preferred_time: when, selection: ('Paket: ' + p + ' · ' + billT).slice(0, 300), message: text, consent: true, source: 'termin-seite', hp: $('bkHp').value }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
        .then(function (res) {
          btn.disabled = false; btn.querySelector('span').textContent = 'Termin anfragen';
          if (res.s === 201 && res.j.ok) {
            out.className = 'msg ok';
            out.textContent = 'Danke! Ihre Terminanfrage für den ' + when + ' ist eingegangen (' + res.j.reference + '). Wir bestätigen den Termin per E-Mail.';
            form.reset(); defDate(); side();
          } else if (res.s === 400) out.textContent = 'Bitte prüfen Sie Ihre Angaben.';
          else if (res.s === 429) out.textContent = 'Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es in einigen Minuten erneut.';
          else offline();
        }).catch(function () { btn.disabled = false; btn.querySelector('span').textContent = 'Termin anfragen'; offline(); });
      function offline() {
        out.innerHTML = '';
        out.appendChild(D.createTextNode('Die Online-Übermittlung ist gerade nicht verfügbar. '));
        var a = D.createElement('a'); a.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Terminanfrage von ' + name) + '&body=' + encodeURIComponent(text + '\n\n' + name + ' · ' + mail); a.textContent = 'Per E-Mail senden'; a.style.color = '#9cc2ff';
        out.appendChild(a);
      }
    });
  }

  /* Showroom 1: 3D-Karte */
  var card = $('d3'), stage = $('d3Stage');
  if (card) {
    var move = function (x, y) {
      var r = stage.getBoundingClientRect(), px = (x - r.left) / r.width - 0.5, py = (y - r.top) / r.height - 0.5;
      card.style.setProperty('--gx', (px + 0.5) * 100 + '%'); card.style.setProperty('--gy', (py + 0.5) * 100 + '%');
      if (M) M.animate(card, { rotateY: px * 40, rotateX: -py * 34 }, { type: 'spring', stiffness: 180, damping: 16 }); else card.style.transform = 'rotateY(' + px * 40 + 'deg) rotateX(' + -py * 34 + 'deg)';
    };
    stage.addEventListener('pointermove', function (e) { move(e.clientX, e.clientY); });
    stage.addEventListener('pointerleave', function () { if (M) M.animate(card, { rotateX: 0, rotateY: 0 }, { type: 'spring', stiffness: 90, damping: 10 }); });
    if (!fine && !reduce) { var t0 = performance.now(); (function idle(now) { var a = (now - t0) / 1000; if (M) { card.style.transform = 'rotateY(' + Math.sin(a) * 18 + 'deg) rotateX(' + Math.cos(a * 0.8) * 10 + 'deg)'; } requestAnimationFrame(idle); })(t0); }
  }

  /* Showroom 2: Code schreibt sich selbst */
  var pre = $('dCode'), ok = $('dOk');
  if (pre) {
    var L = [[['const ', 'k'], ['site', 'v'], [' = ', 'p'], ['await ', 'k'], ['vonumo', 'v'], ['.', 'p'], ['build', 'f'], ['({', 'p']], [["  stil: ", 'p'], ["'premium'", 's'], [',', 'p']], [["  motion: ", 'p'], ["'3D'", 's'], [',', 'p']], [['});', 'p']], [['await ', 'k'], ['site', 'v'], ['.', 'p'], ['test', 'f'], ['();', 'p'], ['  // ✓ bestanden', 'c']], [['await ', 'k'], ['site', 'v'], ['.', 'p'], ['deploy', 'f'], ['();', 'p']]];
    var total = L.reduce(function (a, l) { return a + l.reduce(function (b, p) { return b + p[0].length; }, 0) + 1; }, 0), run = 0;
    var esc = function (t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    var render = function (n) { var o = '', c = 0; for (var i = 0; i < L.length; i++) { for (var j = 0; j < L[i].length; j++) { var t = L[i][j][0], k = Math.max(0, Math.min(t.length, n - c)); c += t.length; if (k) o += '<span class="' + L[i][j][1] + '">' + esc(t.slice(0, k)) + '</span>'; if (k < t.length) return o + '<span class="cur"></span>'; } c++; o += '\n'; if (c > n) return o + '<span class="cur"></span>'; } return o; };
    var play = function () {
      var id = ++run, n = 0; ok.classList.remove('on');
      if (reduce) { pre.innerHTML = render(total); ok.classList.add('on'); return; }
      (function step() { if (id !== run) return; n += 2; pre.innerHTML = render(n); if (n < total) setTimeout(step, 30); else setTimeout(function () { if (id !== run) return; ok.classList.add('on'); setTimeout(function () { if (id === run) play(); }, 3500); }, 600); })();
    };
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) play(); else run++; }); }, { threshold: 0.4 }).observe(pre);
    else play();
  }

  /* Showroom 3: Magnetische Buttons */
  Array.prototype.forEach.call(D.querySelectorAll('.mg'), function (b) {
    if (fine && M) {
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); M.animate(b, { x: (e.clientX - r.left - r.width / 2) * 0.4, y: (e.clientY - r.top - r.height / 2) * 0.5 }, { type: 'spring', stiffness: 220, damping: 16 }); });
      b.addEventListener('pointerleave', function () { M.animate(b, { x: 0, y: 0 }, { type: 'spring', stiffness: 260, damping: 10 }); });
    }
    b.addEventListener('click', function (e) {
      var host = $('balls'), r = $('magStage').getBoundingClientRect();
      for (var i = 0; i < 14; i++) {
        var dot = D.createElement('i'); dot.style.left = (e.clientX - r.left) + 'px'; dot.style.top = (e.clientY - r.top) + 'px'; host.appendChild(dot);
        var a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 90;
        if (M) M.animate(dot, { x: Math.cos(a) * s, y: Math.sin(a) * s, opacity: [1, 0], scale: [1, 0.3] }, { duration: 0.9, ease: 'easeOut' }).finished.then((function (d) { return function () { d.remove(); }; })(dot));
        else setTimeout((function (d) { return function () { d.remove(); }; })(dot), 50);
      }
      if (M) M.animate(b, { scale: [0.9, 1] }, { type: 'spring', stiffness: 400, damping: 10 });
    });
  });

  /* Showroom 4: Stile wechseln */
  var TH = { blue: ['#0a1a4a', '#ffffff', '#2f6bff', '#b8c8f0', 'rgba(255,255,255,.1)'], gold: ['#14100a', '#fff4dc', '#e7b85a', '#cdbb94', 'rgba(231,184,90,.18)'], light: ['#f4f4f0', '#111827', '#111827', '#4b5563', '#e5e7eb'], rose: ['#2a0d1a', '#ffe8f0', '#ff5f8f', '#e7a9bf', 'rgba(255,95,143,.18)'] };
  var box = $('dth');
  var setT = function (k) { var t = TH[k]; box.style.setProperty('--bg', t[0]); box.style.setProperty('--ink', t[1]); box.style.setProperty('--ac', t[2]); box.style.setProperty('--mute', t[3]); box.style.setProperty('--card', t[4]); };
  if (box) {
    setT('blue');
    Array.prototype.forEach.call(D.querySelectorAll('#dsw button'), function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(D.querySelectorAll('#dsw button'), function (x) { x.classList.toggle('on', x === b); });
        setT(b.getAttribute('data-t'));
        if (M && !reduce) M.animate(box.querySelector('h4'), { y: [12, 0], opacity: [0, 1] }, { type: 'spring', stiffness: 200, damping: 18 });
      });
    });
  }
})();
