/* VONUMO – Bewegungsebene mit Motion (Framer Motion für Vanilla JS) */
(function () {
  'use strict';
  var M = window.Motion, D = document, W = window;
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!M || reduce) return;
  var animate = M.animate, inView = M.inView, stagger = M.stagger, hover = M.hover;
  var fine = W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var SPRING = { type: 'spring', stiffness: 140, damping: 18, mass: 0.9 };
  var SOFT = { type: 'spring', stiffness: 220, damping: 22 };

  /* 1) Überschriften Wort für Wort mit Feder-Animation */
  function split(el) {
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = D.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(D.createTextNode(p)); return; }
            var o = D.createElement('span'); o.className = 'fx-w';
            var i = D.createElement('span'); i.className = 'fx-wi'; i.textContent = p;
            o.appendChild(i); frag.appendChild(o); words.push(i);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    })(el);
    return words;
  }
  var HIDDEN = { opacity: 0, y: 34, rotateX: -55, filter: 'blur(10px)' };
  D.querySelectorAll('.ch h1, .ch h2, .ch .big').forEach(function (el) {
    var words = split(el);
    if (!words.length) return;
    animate(words, HIDDEN, { duration: 0 });
    inView(el, function () {
      animate(words, { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }, Object.assign({}, SPRING, { delay: stagger(0.055), opacity: { duration: 0.6 }, filter: { duration: 0.7 } }));
      return function () { animate(words, HIDDEN, { duration: 0.35, ease: 'easeIn' }); };
    }, { amount: 0.5 });
  });

  /* 2) Kleintexte und Karten gleiten nacheinander herein */
  function rise(sel, root, opts) {
    D.querySelectorAll(root).forEach(function (r) {
      var items = r.querySelectorAll(sel);
      if (!items.length) return;
      animate(items, { opacity: 0, y: 40, scale: 0.96 }, { duration: 0 });
      inView(r, function () {
        animate(items, { opacity: 1, y: 0, scale: 1 }, Object.assign({}, SOFT, { delay: stagger(0.08, { startDelay: 0.15 }), opacity: { duration: 0.5 } }, opts || {}));
        return function () { animate(items, { opacity: 0, y: 40, scale: 0.96 }, { duration: 0.3 }); };
      }, { amount: 0.25 });
    });
  }
  rise('.c3', '.cards3');
  rise('.du-card, .du-top', '.dashui');
  rise('.ring-form > *', '#kontakt .ch-in');
  rise('.ch-in > p, .ch-in > small, .ch-in > .eyebrow, .ch-in > .kicker', '.ch:not(.hero):not(.contact)');

  /* 3) Code-Symbole schweben und drehen sich bei Berührung */
  D.querySelectorAll('.ic-code').forEach(function (ic, i) {
    animate(ic, { rotateY: [0, 22, 0, -22, 0], z: [0, 12, 0] }, { duration: 5 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 });
  });

  if (fine) {
    /* 4) 3D-Neigung der Karten, gefedert */
    D.querySelectorAll('.c3, .sg, .studio .card, .dashui, .ring-form').forEach(function (el) {
      var max = el.matches('.dashui, .ring-form, .studio .card') ? 4 : 9;
      el.style.transformStyle = 'preserve-3d';
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        animate(el, { rotateX: -py * max, rotateY: px * max, scale: 1.015 }, SOFT);
        el.style.setProperty('--mx', (px + 0.5) * 100 + '%'); el.style.setProperty('--my', (py + 0.5) * 100 + '%');
        var ic = el.querySelector('.ic-code'); if (ic) animate(ic, { x: px * 10, y: py * 8 }, SOFT);
      });
      el.addEventListener('pointerleave', function () {
        animate(el, { rotateX: 0, rotateY: 0, scale: 1 }, { type: 'spring', stiffness: 120, damping: 14 });
        var ic = el.querySelector('.ic-code'); if (ic) animate(ic, { x: 0, y: 0 }, SOFT);
      });
    });

    /* 5) Magnetische Buttons */
    D.querySelectorAll('.tn-cta, #tnLogin, .go, #rfGo, #dlgGo, .st-links a, .chip').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        animate(b, { x: (e.clientX - r.left - r.width / 2) * 0.22, y: (e.clientY - r.top - r.height / 2) * 0.3 }, SOFT);
      });
      b.addEventListener('pointerleave', function () { animate(b, { x: 0, y: 0 }, { type: 'spring', stiffness: 260, damping: 12 }); });
    });
    if (hover) hover('.c3', function (el) {
      var ic = el.querySelector('.ic-code'); if (ic) animate(ic, { rotateZ: [0, -8, 0] }, { duration: 0.6 });
    });
  }

  /* 6) Fortschrittsanzeige federt nach */
  var bar = D.getElementById('progBar');
  if (bar && M.scroll) {
    M.scroll(function (p) { bar.style.transform = 'scaleY(' + (0.985 + Math.sin(p * Math.PI) * 0.015) + ')'; });
  }

  /* 7) Weiches Scrollen mit dem Mausrad (Trägheit) */
  if (fine && !/Mac OS X/.test(navigator.userAgent) || fine && W.__smoothWheel) {
    var target = W.scrollY, cur = W.scrollY, running = false, last = 0, setY = -1;
    function maxY() { return D.documentElement.scrollHeight - W.innerHeight; }
    function blocked(t) {
      for (var n = t; n && n !== D.body; n = n.parentElement) {
        if (n.tagName === 'TEXTAREA' || n.tagName === 'DIALOG' || n.tagName === 'SELECT') return true;
        var cs = n.nodeType === 1 && getComputedStyle(n);
        if (cs && /(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2) return true;
      }
      return false;
    }
    function step(now) {
      if (setY >= 0 && Math.abs(W.scrollY - setY) > 3) { running = false; last = 0; setY = -1; cur = target = W.scrollY; return; }
      var dt = Math.min(0.05, (now - (last || now)) / 1000) || 0.016; last = now;
      cur += (target - cur) * (1 - Math.pow(0.0006, dt));
      if (Math.abs(target - cur) < 0.4) { cur = target; running = false; last = 0; }
      W.scrollTo(0, cur); setY = W.scrollY;
      if (running) requestAnimationFrame(step);
    }
    W.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.defaultPrevented || D.querySelector('dialog[open]') || blocked(e.target)) return;
      e.preventDefault();
      if (!running) { cur = W.scrollY; target = W.scrollY; setY = -1; }
      var dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * W.innerHeight : e.deltaY;
      target = Math.max(0, Math.min(maxY(), target + dy));
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: false });
    W.addEventListener('scroll', function () { if (!running) { cur = target = W.scrollY; } }, { passive: true });
  }
})();
