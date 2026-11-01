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
  Array.prototype.forEach.call(document.querySelectorAll('.st-links a[href^="#"], .c3[href^="#"], .tn-cta'), function (a) {
    a.addEventListener('click', function (e) {
      var t = document.querySelector(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: a.getAttribute('href') === '#studio' ? 'start' : 'center' });
      if (a.getAttribute('data-focus')) setTimeout(function () { $(a.getAttribute('data-focus')).focus(); }, 700);
      Array.prototype.forEach.call(document.querySelectorAll('.st-links a'), function (x) { x.classList.toggle('on', x === a); });
    });
  });

  /* Konto-Status */
  fetch('/api/auth/me', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.ok || !j.user) return;
    var u = j.user, n = (u.fullName || u.name || u.email || '?').trim();
    var ava = $('ava'), tl = $('tnLogin'); if (tl) { tl.href = '/konto'; tl.textContent = 'Mein Konto'; }
    ava.href = '/konto'; ava.setAttribute('aria-label', 'Mein Konto'); ava.classList.add('in');
    ava.textContent = n.split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
    $('bellTxt').textContent = 'Angemeldet als ' + (u.email || n) + '. Ihre Anfragen und deren Status finden Sie unter „Konto“.';
    var f = $('fName'), m = $('fMail');
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

  /* Upload und Figma */
  var file = $('file'), drop = $('drop'), chosen = null, figBtn = $('figBtn'), figma = $('figma');
  function pick(accept) { file.accept = accept || 'image/png,image/jpeg'; file.click(); }
  Array.prototype.forEach.call(document.querySelectorAll('.chip[data-accept]'), function (c) { c.addEventListener('click', function () { pick(c.getAttribute('data-accept')); }); });
  figBtn.addEventListener('click', function () { var o = figma.hidden; figma.hidden = !o; figBtn.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) figma.focus(); });
  drop.addEventListener('click', function (e) { if (e.target.closest('#dropX')) return; pick(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setFile(f); });
  file.addEventListener('change', function () { if (file.files && file.files[0]) setFile(file.files[0]); });
  function setFile(f) {
    var msg = $('buildMsg');
    if (!/^image\/(png|jpeg)$/.test(f.type)) { msg.className = 'build-msg'; msg.textContent = 'Bitte eine PNG- oder JPG-Datei wählen.'; return; }
    if (f.size > 15 * 1024 * 1024) { msg.className = 'build-msg'; msg.textContent = 'Die Datei ist größer als 15 MB.'; return; }
    chosen = f; msg.textContent = '';
    $('dropImg').src = URL.createObjectURL(f);
    $('dropName').textContent = f.name;
    $('dropIn').hidden = true; $('dropFile').hidden = false;
  }
  $('dropX').addEventListener('click', function (e) { e.stopPropagation(); chosen = null; file.value = ''; $('dropIn').hidden = false; $('dropFile').hidden = true; });

  /* Design-Vorschläge */
  var sugg = $('sugg'), style = '';
  Array.prototype.forEach.call(sugg.querySelectorAll('.sg'), function (b) {
    b.addEventListener('click', function () {
      var on = !b.classList.contains('sel');
      Array.prototype.forEach.call(sugg.querySelectorAll('.sg'), function (x) { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); });
      style = on ? b.getAttribute('data-style') : '';
      if (on) { b.classList.add('sel'); b.setAttribute('aria-pressed', 'true'); }
      var p = $('prompt'), lines = p.value.split('\n').filter(function (l) { return !/^Stil: /.test(l); });
      if (style) lines.push(style);
      p.value = lines.join('\n').trim();
    });
  });
  function slide(dir) { var c = sugg.querySelector('.sg'); sugg.scrollBy({ left: dir * (c ? c.getBoundingClientRect().width + 20 : 300), behavior: reduce ? 'auto' : 'smooth' }); }
  $('sPrev').addEventListener('click', function () { slide(-1); });
  $('sNext').addEventListener('click', function () { slide(1); });

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

  /* Anfrage senden */
  var dlg = $('dlg'), msg = $('buildMsg');
  function openDlg() {
    $('dlgErr').textContent = '';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(function () { ($('fName').value ? $('fMail') : $('fName')).focus(); }, 30);
  }
  function closeDlg() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  $('dlgX').addEventListener('click', closeDlg);
  $('build').addEventListener('submit', function (e) {
    e.preventDefault();
    var p = $('prompt').value.trim();
    if (p.length < 10) { msg.className = 'build-msg'; msg.textContent = 'Beschreiben Sie Ihre Website in ein paar Worten (mindestens 10 Zeichen).'; $('prompt').focus(); return; }
    if (!figma.hidden && figma.value && !/^https?:\/\/\S+\.\S+/.test(figma.value.trim())) { msg.className = 'build-msg'; msg.textContent = 'Der Figma-Link sieht nicht gültig aus.'; figma.focus(); return; }
    msg.textContent = '';
    openDlg();
  });
  $('dlgForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('fName').value.trim(), mail = $('fMail').value.trim(), tel = $('fTel').value.trim(), ok = $('fOk').checked, err = $('dlgErr');
    if (!name) { err.textContent = 'Bitte geben Sie Ihren Namen an.'; $('fName').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { err.textContent = 'Bitte eine gültige E-Mail-Adresse angeben.'; $('fMail').focus(); return; }
    if (!ok) { err.textContent = 'Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu.'; return; }
    var text = $('prompt').value.trim();
    var fig = (!figma.hidden && figma.value.trim()) ? figma.value.trim() : '';
    if (fig) text += '\nFigma: ' + fig;
    if (chosen) text += '\nDesign-Datei: ' + chosen.name + ' (wird per E-Mail nachgereicht)';
    var btn = $('dlgGo'); btn.disabled = true; btn.querySelector('span').textContent = 'Wird gesendet …';
    fetch('/api/inquiries', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'project', name: name, email: mail, phone: tel, service: 'Website-Entwicklung', selection: (style || 'Studio').slice(0, 300), message: text.slice(0, 5000), consent: true, source: 'studio', hp: $('fHp').value })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (res) {
        btn.disabled = false; btn.querySelector('span').textContent = 'Anfrage senden';
        if (res.s === 201 && res.j.ok) {
          closeDlg(); success(res.j.reference, res.j.confirmationSent);
        } else if (res.s === 400 && res.j.fields) {
          var f = res.j.fields;
          err.textContent = f.email ? 'Bitte prüfen Sie die E-Mail-Adresse.' : f.message ? 'Die Beschreibung ist zu kurz.' : f.name ? 'Bitte geben Sie Ihren Namen an.' : 'Bitte prüfen Sie Ihre Angaben.';
        } else if (res.s === 429) {
          err.textContent = 'Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es in einigen Minuten erneut.';
        } else offline(err, name, mail, text);
      })
      .catch(function () { btn.disabled = false; btn.querySelector('span').textContent = 'Anfrage senden'; offline(err, name, mail, text); });
  });
  function offline(err, name, mail, text) {
    var href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Projektanfrage von ' + name) + '&body=' + encodeURIComponent(text + '\n\n' + name + ' · ' + mail);
    err.innerHTML = '';
    err.appendChild(document.createTextNode('Die Online-Übermittlung ist gerade nicht verfügbar. '));
    var a = document.createElement('a'); a.href = href; a.textContent = 'Per E-Mail senden'; a.style.color = '#9cc2ff'; a.style.textDecoration = 'underline';
    err.appendChild(a);
  }
  function success(ref, mailed) {
    real = true; if (demoT) clearInterval(demoT);
    $('stepsTitle').textContent = 'Ihr Projekt · ' + ref;
    $('stepsEta').textContent = 'Rückmeldung in 2 Werktagen';
    setStep(items[0], 'done', 'Eingegangen ✓');
    setStep(items[1], 'run', 'In Bearbeitung');
    for (var i = 2; i < items.length; i++) setStep(items[i], '', 'Ausstehend');
    msg.className = 'build-msg ok';
    msg.textContent = 'Danke! Ihre Anfrage ' + ref + ' ist eingegangen.' + (mailed ? ' Eine Bestätigung ist unterwegs.' : '') + (chosen ? ' Bitte senden Sie die Design-Datei als Antwort auf unsere E-Mail.' : '');
    $('bellTxt').textContent = 'Anfrage ' + ref + ' eingegangen. Wir melden uns innerhalb von zwei Werktagen.';
    document.querySelector('.st-bell .dot').style.background = '#3ddc8c';
    $('steps').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }
})();
