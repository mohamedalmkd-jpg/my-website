/* VONUMO Showroom – Karussell: Pfeile, Ziehen, Wischen, magnetische 3D-Neigung, Vorschau-Videos, Zoom-Übergang */
(function () {
  'use strict';
  var D = document, W = window, track = D.getElementById('srxTrack'); if (!track) return;
  var cards = Array.prototype.slice.call(track.querySelectorAll('.srx-card')), N = cards.length;
  var prev = D.getElementById('srxPrev'), next = D.getElementById('srxNext'), bar = D.getElementById('srxBar'), count = D.getElementById('srxCount');
  var reduce = W.matchMedia('(prefers-reduced-motion: reduce)').matches, fine = W.matchMedia('(pointer:fine)').matches;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  function idx() {
    var l = track.scrollLeft, best = 0, d = 1e9;
    cards.forEach(function (c, i) { var x = Math.abs(c.offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft) - l); if (x < d) { d = x; best = i; } });
    return best;
  }
  function go(i) {
    i = Math.max(0, Math.min(N - 1, i));
    var pl = parseFloat(getComputedStyle(track).paddingLeft);
    track.scrollTo({ left: cards[i].offsetLeft - track.offsetLeft - pl, behavior: reduce ? 'auto' : 'smooth' });
  }
  function upd() {
    var max = track.scrollWidth - track.clientWidth, i = track.scrollLeft > max - 8 ? N - 1 : idx();
    count.textContent = pad(i + 1) + ' / ' + pad(N);
    bar.parentNode.style.setProperty('--p', (max > 0 ? 0.25 + 0.75 * track.scrollLeft / max : 1).toFixed(3));
    prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft > max - 8;
  }
  prev.addEventListener('click', function () { go(idx() - 1); });
  next.addEventListener('click', function () { go(idx() + 1); });
  track.addEventListener('scroll', upd, { passive: true });
  track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(idx() + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx() - 1); } });
  W.addEventListener('resize', upd); upd();

  /* Ziehen mit der Maus (Touch scrollt nativ) */
  var down = false, sx = 0, sl = 0, moved = 0, vel = 0, lx = 0;
  track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = lx = e.clientX; sl = track.scrollLeft; vel = 0; });
  W.addEventListener('pointermove', function (e) {
    if (!down) return; var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
    if (moved > 6) track.classList.add('drag');
    vel = e.clientX - lx; lx = e.clientX; track.scrollLeft = sl - dx;
  });
  W.addEventListener('pointerup', function () {
    if (!down) return; down = false;
    if (track.classList.contains('drag')) {
      setTimeout(function () { track.classList.remove('drag'); }, 30);
      var i = idx(); go(vel < -4 ? i + (track.scrollLeft > cards[i].offsetLeft ? 1 : 0) : vel > 4 ? i - (track.scrollLeft < cards[i].offsetLeft ? 1 : 0) : i);
    }
  });
  track.addEventListener('click', function (e) { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  /* Mausrad vertikal → horizontal, solange das Karussell scrollen kann */
  track.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    var max = track.scrollWidth - track.clientWidth;
    if ((e.deltaY > 0 && track.scrollLeft < max - 2) || (e.deltaY < 0 && track.scrollLeft > 2)) { e.preventDefault(); track.scrollLeft += e.deltaY; }
  }, { passive: false });

  /* Magnetische Neigung + Lichtreflex */
  cards.forEach(function (c) {
    var fr = c.querySelector('.srx-frame'), gl = c.querySelector('.srx-glare'), v = c.querySelector('video');
    if (fine && !reduce) {
      c.addEventListener('pointermove', function (e) {
        var r = fr.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        fr.style.setProperty('--rx', ((x - 0.5) * 10).toFixed(2)); fr.style.setProperty('--ry', ((0.5 - y) * 8).toFixed(2));
        gl.style.setProperty('--gx', (x * 100).toFixed(1) + '%'); gl.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', function () { fr.style.setProperty('--rx', 0); fr.style.setProperty('--ry', 0); });
    }
    if (v) {
      v.muted = true;
      c.addEventListener('mouseenter', function () { v.playbackRate = 1.25; });
      c.addEventListener('mouseleave', function () { v.playbackRate = 1; });
    }
  });
  /* Vorschau-Videos nur abspielen, solange sie sichtbar sind */
  if ('IntersectionObserver' in W) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var v = e.target; if (e.isIntersecting && !reduce) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
    }, { root: null, threshold: 0.4 });
    cards.forEach(function (c) { var v = c.querySelector('video'); if (v) io.observe(v); });
  }

  /* Zoom-Übergang: die Vorschau wächst auf Vollbild, dann öffnet das Projekt */
  var zoom = D.getElementById('srxZoom');
  cards.forEach(function (c) {
    c.addEventListener('click', function (e) {
      if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      var r = c.querySelector('.srx-media').getBoundingClientRect();
      zoom.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px;background:' + (c.dataset.bg || '#000');
      zoom.className = 'srx-zoom';
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        zoom.classList.add('go'); zoom.style.left = '0px'; zoom.style.top = '0px'; zoom.style.width = W.innerWidth + 'px'; zoom.style.height = W.innerHeight + 'px'; zoom.style.borderRadius = '0px';
      }); });
      setTimeout(function () { W.location.href = c.getAttribute('href'); }, 760);
    });
  });
  /* Zurück-Navigation aus dem Cache: Overlay entfernen */
  W.addEventListener('pageshow', function () { zoom.className = 'srx-zoom'; zoom.style.cssText = ''; });
})();
