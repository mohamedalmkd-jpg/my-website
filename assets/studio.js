/* VONUMO Studio – Oberfläche am Ende der 3D-Geschichte (funktioniert auch ohne WebGL) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MAIL = 'almoakedmohammad@gmail.com';
  var studio = $('studio');

  /* Einblenden mit Staffelung */
  Array.prototype.forEach.call(document.querySelectorAll('.studio .rv'), function (el, i) { el.style.setProperty('--d', (0.08 + i * 0.09).toFixed(2) + 's'); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) studio.classList.add('in'); }); }, { threshold: 0.04 }).observe(studio);
  } else studio.classList.add('in');

  /* Navigation */
  Array.prototype.forEach.call(document.querySelectorAll('.st-links a[href^="#"], .c3[href^="#"]'), function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: a.getAttribute('href') === '#studio' ? 'start' : 'center' });
      if (a.getAttribute('data-focus')) setTimeout(function () { $(a.getAttribute('data-focus')).focus(); }, 700);
      Array.prototype.forEach.call(document.querySelectorAll('.st-links a'), function (x) { x.classList.toggle('on', x === a); });
    });
  });

  /* Seiten-Menü oben */
  var pgB = $('tnPg'), pgM = $('tnPgMenu');
  if (pgB) {
    var setPg = function (o) { pgM.hidden = !o; pgB.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o && window.Motion && !reduce) window.Motion.animate(pgM.children, { opacity: [0, 1], y: [-8, 0] }, { duration: 0.25, delay: window.Motion.stagger(0.04) }); };
    pgB.addEventListener('click', function (e) { e.stopPropagation(); setPg(pgM.hidden); });
    document.addEventListener('click', function (e) { if (!pgM.hidden && !e.target.closest('.tn-pg')) setPg(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pgM.hidden) { setPg(false); pgB.focus(); } });
  }

  /* Konto-Status */
  fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.ok || !j.user) return;
    var u = j.user, n = (u.fullName || u.name || u.email || '?').trim();
    var ava = $('ava'), tl = $('tnLogin'); if (tl) { tl.href = '/konto'; tl.textContent = 'Mein Konto'; }
    ava.href = '/konto'; ava.setAttribute('aria-label', 'Mein Konto'); ava.classList.add('in');
    ava.textContent = n.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
    $('bellTxt').textContent = 'Angemeldet als ' + (u.email || n) + '. Ihre Anfragen und deren Status finden Sie unter „Konto“.';
    var f = $('bkName'), m = $('bkMail');
    if (f && !f.value && (u.fullName || u.name)) f.value = u.fullName || u.name;
    if (m && !m.value && u.email) m.value = u.email;
  }).catch(function () {});

  /* Kontaktformular im Ring */
  var rf = $('rf');
  if (rf) rf.addEventListener('submit', function (e) {
    e.preventDefault();
    var first = $('rfFirst').value.trim(), last = $('rfLast').value.trim(), mail = $('rfMail').value.trim(), tel = $('rfTel').value.trim(), msgT = $('rfMsg').value.trim(), out = $('rfMsgOut');
    out.className = 'rf-msg';
    if (!first) { out.textContent = 'Bitte geben Sie Ihren Vornamen an.'; $('rfFirst').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { out.textContent = 'Bitte eine gültige E-Mail-Adresse angeben.'; $('rfMail').focus(); return; }
    if (msgT.length < 10) { out.textContent = 'Ihre Nachricht ist etwas kurz (mindestens 10 Zeichen).'; $('rfMsg').focus(); return; }
    if (!$('rfOk').checked) { out.textContent = 'Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.'; return; }
    var btn = $('rfGo'); btn.disabled = true; btn.textContent = 'Wird gesendet …';
    fetch('/api/inquiries', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'project', name: (first + ' ' + last).trim(), email: mail, phone: tel, service: 'Noch offen', message: msgT, consent: true, source: 'kontakt-ring', hp: $('rfHp').value }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (res) {
        btn.disabled = false; btn.textContent = 'Kontakt aufnehmen';
        if (res.s === 201 && res.j.ok) { out.className = 'rf-msg ok'; out.textContent = 'Danke! Anfrage ' + res.j.reference + ' ist eingegangen – wir melden uns innerhalb von zwei Werktagen.'; rf.reset(); }
        else if (res.s === 429) out.textContent = 'Zu viele Anfragen. Bitte in einigen Minuten erneut versuchen.';
        else if (res.s === 400) out.textContent = 'Bitte prüfen Sie Ihre Angaben.';
        else { out.innerHTML = 'Die Online-Übermittlung ist gerade nicht verfügbar. <a style="color:#9cc2ff" href="mailto:' + MAIL + '">Per E-Mail schreiben</a>'; }
      }).catch(function () { btn.disabled = false; btn.textContent = 'Kontakt aufnehmen'; out.innerHTML = 'Keine Verbindung. <a style="color:#9cc2ff" href="mailto:' + MAIL + '">Per E-Mail schreiben</a>'; });
  });

  /* Glocke */
  var bell = $('bell'), pop = $('bellPop');
  bell.addEventListener('click', function () { var o = pop.hidden; pop.hidden = !o; bell.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  document.addEventListener('click', function (e) { if (!pop.hidden && !e.target.closest('#bell,#bellPop')) { pop.hidden = true; bell.setAttribute('aria-expanded', 'false'); } });

  /* Preise: monatlich / jährlich und Paketwahl */
  var bill = 'm';
  Array.prototype.forEach.call(document.querySelectorAll('.pr-bill button'), function (b) {
    b.addEventListener('click', function () {
      bill = b.getAttribute('data-bill');
      Array.prototype.forEach.call(document.querySelectorAll('.pr-bill button'), function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      Array.prototype.forEach.call(document.querySelectorAll('.pl-price'), function (pp) {
        var v = pp.querySelector('b'), s = pp.querySelector('s');
        v.textContent = v.getAttribute('data-' + bill) + ' €'; s.textContent = bill === 'y' ? s.getAttribute('data-y') : '';
        if (window.Motion && !reduce) window.Motion.animate(v, { scale: [0.8, 1], opacity: [0.3, 1] }, { type: 'spring', stiffness: 300, damping: 18 });
      });
      document.querySelector('.plans').classList.toggle('yearly', bill === 'y');
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.pl-go'), function (b) {
    b.addEventListener('click', function () {
      $('bkPlan').value = b.getAttribute('data-pick');
      Array.prototype.forEach.call(document.querySelectorAll('.plan'), function (pl) { pl.classList.toggle('sel', pl.getAttribute('data-plan') === b.getAttribute('data-pick')); });
      $('termin').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      setTimeout(function () { $('bkName').focus({ preventScroll: true }); }, 600);
    });
  });
  function defDate() { var d = new Date(); d.setDate(d.getDate() + 2); $('bkDate').min = new Date().toISOString().slice(0, 10); $('bkDate').value = d.toISOString().slice(0, 10); }
  defDate();

  /* Ablauf: Beispiel bis zur echten Anfrage */
  var items = document.querySelectorAll('#sl li'), demoK = 2, demoT = null, real = false;
  function setStep(li, state, txt) { li.className = state; li.querySelector('em').textContent = txt; }
  function renderDemo() {
    Array.prototype.forEach.call(items, function (li, i) {
      if (i < demoK) setStep(li, 'done', 'Abgeschlossen ✓');
      else if (i === demoK) setStep(li, 'run', 'In Arbeit …');
      else setStep(li, '', 'Ausstehend');
    });
  }
  renderDemo();
  if (!reduce) demoT = setInterval(function () { if (real) return; demoK = (demoK + 1) % (items.length + 2); renderDemo(); }, 2600);

  /* Termin anfragen */
  var msg = $('buildMsg');
  $('termin').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('bkName').value.trim(), mail = $('bkMail').value.trim(), tel = $('bkTel').value.trim(), plan = $('bkPlan').value, date = $('bkDate').value, time = $('bkTime').value, note = $('bkMsg').value.trim();
    msg.className = 'build-msg';
    if (!name) { msg.textContent = 'Bitte geben Sie Ihren Namen an.'; $('bkName').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { msg.textContent = 'Bitte eine gültige E-Mail-Adresse angeben.'; $('bkMail').focus(); return; }
    if (!date) { msg.textContent = 'Bitte wählen Sie einen Wunschtermin.'; $('bkDate').focus(); return; }
    if (!$('bkOk').checked) { msg.textContent = 'Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.'; return; }
    var when = date.split('-').reverse().join('.') + ' um ' + time + ' Uhr';
    var text = 'Terminanfrage (Beratungsgespräch, 30 Min.)\nWunschtermin: ' + when + '\nPaket: ' + plan + ' · ' + (bill === 'y' ? 'jährlich (−20 %)' : 'monatlich') + (note ? '\n\n' + note : '');
    var btn = $('go'); btn.disabled = true; btn.querySelector('span').textContent = 'Wird gesendet …';
    fetch('/api/inquiries', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'project', name: name, email: mail, phone: tel, service: 'Website-Entwicklung', preferred_time: when, selection: ('Paket: ' + plan + ' · ' + (bill === 'y' ? 'jährlich' : 'monatlich')).slice(0, 300), message: text.slice(0, 5000), consent: true, source: 'termin', hp: $('bkHp').value })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (res) {
        btn.disabled = false; btn.querySelector('span').textContent = 'Termin anfragen';
        if (res.s === 201 && res.j.ok) success(res.j.reference, res.j.confirmationSent, when);
        else if (res.s === 400 && res.j.fields) { var f = res.j.fields; msg.textContent = f.email ? 'Bitte prüfen Sie die E-Mail-Adresse.' : f.name ? 'Bitte geben Sie Ihren Namen an.' : 'Bitte prüfen Sie Ihre Angaben.'; }
        else if (res.s === 429) msg.textContent = 'Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es in einigen Minuten erneut.';
        else offline(msg, name, mail, text);
      })
      .catch(function () { btn.disabled = false; btn.querySelector('span').textContent = 'Termin anfragen'; offline(msg, name, mail, text); });
  });
  function offline(err, name, mail, text) {
    var href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Terminanfrage von ' + name) + '&body=' + encodeURIComponent(text + '\n\n' + name + ' · ' + mail);
    err.innerHTML = '';
    err.appendChild(document.createTextNode('Die Online-Übermittlung ist gerade nicht verfügbar. '));
    var a = document.createElement('a'); a.href = href; a.textContent = 'Per E-Mail senden'; a.style.color = '#9cc2ff'; a.style.textDecoration = 'underline';
    err.appendChild(a);
  }
  function success(ref, mailed, when) {
    real = true; if (demoT) clearInterval(demoT);
    $('stepsTitle').textContent = 'Ihre Terminanfrage · ' + ref;
    $('stepsEta').textContent = 'Bestätigung innerhalb von 1 Werktag';
    setStep(items[0], 'run', 'Angefragt ✓');
    for (var i = 1; i < items.length; i++) setStep(items[i], '', 'Ausstehend');
    msg.className = 'build-msg ok';
    msg.textContent = 'Danke! Ihre Terminanfrage für den ' + when + ' ist eingegangen (' + ref + '). Wir bestätigen den Termin per E-Mail.' + (mailed ? ' Eine Eingangsbestätigung ist unterwegs.' : '');
    $('bellTxt').textContent = 'Terminanfrage ' + ref + ' eingegangen. Wir bestätigen innerhalb von einem Werktag.';
    document.querySelector('.st-bell .dot').style.background = '#3ddc8c';
    $('termin').reset(); $('bkPlan').value = 'Business'; defDate();
  }
})();
