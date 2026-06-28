/* ============================================================
   DEGLA.ai — interactions  ·  Ovyon framework
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };


  /* (loading screen removed) */

  /* (live clock removed — no #clock / #clock2 / #clockHero elements in the markup,
     yet it ran a 1 Hz setInterval forever) */

  /* ---------- Hero video — robust autoplay (muted ambient loop, incl. mobile / iOS) ----------
     Plays on every device, including reduced-motion (it's a silent background loop, the brand
     centrepiece). iOS only autoplays when muted + playsinline are set on the element in JS, so
     we force them, retry on load events, and fall back to the first touch (covers Low Power Mode). */
  var heroVideo = $('#heroVideo');
  if (heroVideo) {
    /* force muted + inline both ways (iOS checks the attribute, not just the property) */
    heroVideo.muted = true; heroVideo.defaultMuted = true; heroVideo.setAttribute('muted', '');
    heroVideo.playsInline = true; heroVideo.setAttribute('playsinline', ''); heroVideo.setAttribute('webkit-playsinline', '');
    var tryPlay = function () { var p = heroVideo.play(); if (p && p.catch) p.catch(function () {}); };
    /* crop the loop to the first 19s (no re-encode — keeps full source quality) */
    heroVideo.addEventListener('timeupdate', function () {
      if (heroVideo.currentTime >= 19) heroVideo.currentTime = 0;
    });
    /* retry on every readiness event (not once) + timed attempts — covers slow mobile loads */
    ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'stalled', 'suspend'].forEach(function (ev) {
      heroVideo.addEventListener(ev, tryPlay);
    });
    [0, 200, 500, 1000, 2000, 3500].forEach(function (ms) { setTimeout(tryPlay, ms); });
    /* resume when the hero scrolls back in view or the tab regains focus */
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tryPlay(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) tryPlay(); }); }).observe(heroVideo);
    }
    /* last resort: first user gesture (covers iOS Low Power Mode, which hard-blocks autoplay) */
    var kick = function () { tryPlay(); document.removeEventListener('touchstart', kick); document.removeEventListener('click', kick); };
    document.addEventListener('touchstart', kick, { passive: true, once: true });
    document.addEventListener('click', kick, { once: true });
  }


  /* ---------- Speed: boot the 01 orb right after page load ----------
     The orb iframe is loading="lazy", so its 589KB Three.js scene only STARTS
     when you scroll near it (slow first paint of the animation). Flip it to
     eager once the page is loaded: it boots in the background while the user
     reads the hero, and is already animating when they arrive. The 03 map then
     reuses three.min.js straight from HTTP cache. */
  (function () {
    var orbFrame = $('.orb-frame');
    if (!orbFrame) return;
    var warm = function () { try { orbFrame.loading = 'eager'; } catch (e) {} };
    if (document.readyState === 'complete') warm();
    else window.addEventListener('load', function () { setTimeout(warm, 300); }, { once: true });
  })();

  /* ---------- Step 01 orb: type out the script on click + drive the orb's "talking" animation (no audio) ---------- */
  (function () {
    var stage = $('#orbStage');
    if (!stage) return;
    var frame = stage.querySelector('.orb-frame');
    var cta = stage.querySelector('.orb-cta');
    var hit = stage.querySelector('.orb-hit');
    if (!frame) return;
    var IDLE = '<span class="bk">(</span>&nbsp;Click to plan a mission&nbsp;<span class="bk">)</span>';
    var STOP = '<span class="bk">(</span>&nbsp;Stop&nbsp;<span class="bk">)</span>';

    // the spoken "script" — types itself out on its own timing
    var txtEl = $('#orbTranscriptText');
    var TRANSCRIPT = 'Building collapse on West 54th Street, Hell\u2019s Kitchen. Search for survivors and coordinate with the teams on the ground.';
    var words = TRANSCRIPT.split(' ');
    var DUR = Math.max(3, words.length * 0.34); // seconds, ~natural reading pace
    function renderTranscript(prog) {
      if (!txtEl) return;
      var n = Math.max(0, Math.min(words.length, Math.ceil(prog * words.length)));
      txtEl.innerHTML = words.slice(0, n).join(' ') + (n < words.length ? ' <span class="caret"></span>' : '');
    }

    var raf, startT = 0, playing = false;
    function post(active, out) {
      try { frame.contentWindow.postMessage({ type: 'orbVolume', active: active, out: out }, '*'); } catch (e) {}
    }
    function loop(now) {
      if (!startT) startT = now;
      var t = (now - startT) / 1000, prog = Math.min(1, t / DUR);
      renderTranscript(prog);
      // synthetic "talking" energy: speech-like wobble, tapered in & out
      var env = Math.sin(prog * Math.PI);
      var wob = 0.5 + 0.3 * Math.sin(t * 8.5) + 0.2 * Math.sin(t * 13.0 + 1.0);
      post(true, Math.max(0, Math.min(1, env * (0.4 + 0.6 * wob))));
      if (prog < 1) { raf = requestAnimationFrame(loop); }
      else { renderTranscript(1); finish(); }
    }
    function finish() {          // script done: orb settles, transcript fades out, hint resets
      playing = false;
      if (raf) cancelAnimationFrame(raf);
      post(false, 0);
      stage.classList.remove('is-playing');
      if (cta) cta.innerHTML = IDLE;
    }
    function stop() {            // manual stop: clear + hide
      playing = false;
      if (raf) cancelAnimationFrame(raf);
      post(false, 0);
      if (txtEl) txtEl.innerHTML = '';
      stage.classList.remove('is-playing');
      if (cta) cta.innerHTML = IDLE;
    }
    function start() {
      playing = true; startT = 0;
      stage.classList.add('is-playing');
      if (cta) cta.innerHTML = STOP;
      if (txtEl) txtEl.innerHTML = '<span class="caret"></span>';
      raf = requestAnimationFrame(loop);
    }
    // hover + click are scoped to the orb circle (the .orb-hit overlay), not the whole card
    var trigger = hit || stage;
    trigger.addEventListener('mouseenter', function () { stage.classList.add('orb-hover'); });
    trigger.addEventListener('mouseleave', function () { stage.classList.remove('orb-hover'); });
    trigger.addEventListener('click', function () { playing ? stop() : start(); });
  })();

  /* ---------- Nav: shrink + mobile + active link ---------- */
  var nav = $('#nav');
  var onScroll = function () { nav.classList.toggle('shrink', window.scrollY > 24); };
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  var toggle = $('#navToggle');
  function closeNav(){ nav.classList.remove('open'); toggle && toggle.setAttribute('aria-expanded','false'); }
  toggle && toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $$('#navMenu a').forEach(function (a) { a.addEventListener('click', closeNav); });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !e.target.closest('.nav-wrap')) closeNav();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });

  var navMap = {};
  $$('#navMenu a').forEach(function (a) { navMap[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && navMap[e.target.id]) {
          Object.keys(navMap).forEach(function (k) { navMap[k].classList.remove('active'); });
          navMap[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['what','features','why'].forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Reveals (IntersectionObserver + CSS) ---------- */
  function revealGroup(container) {
    var items = $$('[data-reveal]', container);
    if (container.hasAttribute('data-reveal')) items.unshift(container);
    items.forEach(function (el, i) {
      if (!reduce) {
        var d = Math.min(i * 90, 480);
        el.style.transitionDelay = d + 'ms';
        /* clear the stagger delay once the entrance has played — otherwise this inline
           transition-delay also delays the hover/magnetic transitions on interactive
           reveal elements (e.g. the "Request early access" CTA), making hovers feel laggy */
        setTimeout(function () { el.style.transitionDelay = ''; }, d + 1100);
      }
      el.classList.add('in');
    });
  }
  if ('IntersectionObserver' in window) {
    var revObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { revealGroup(e.target); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    $$('section').forEach(function (s) { revObs.observe(s); });
  } else {
    $$('[data-reveal]').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Hero video scroll parallax (subtle scale; vanilla rAF, no GSAP) ---------- */
  if (!reduce && heroVideo) {
    var heroEl = $('#hero'), hpTicking = false;
    function heroParallax() {
      hpTicking = false;
      var h = (heroEl ? heroEl.offsetHeight : window.innerHeight) || 1;
      var p = Math.min(1, Math.max(0, window.scrollY / h));   // 0 at top → 1 when hero scrolled out
      heroVideo.style.transform = 'scale(' + (1 + 0.14 * p) + ')';
    }
    window.addEventListener('scroll', function () {
      if (!hpTicking) { hpTicking = true; requestAnimationFrame(heroParallax); }
    }, { passive: true });
    heroParallax();
  }

  /* ---------- helper: run once when element enters ---------- */
  function whenInView(el, cb, opts) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var o = new IntersectionObserver(function (en, obs) {
      en.forEach(function (e) { if (e.isIntersecting) { cb(); obs.disconnect(); } });
    }, opts || { threshold: 0.35 });
    o.observe(el);
  }

  /* (how-it-works showcase sync removed — the stacked .fs-card layout doesn't use the
     .is-active toggle, and there are no .fs-menu-item elements) */

  /* ---------- Cookie notice ---------- */
  var cookie = $('#cookie');
  if (cookie) {
    var CKEY = 'degla-cookie-consent';
    var prior = null;
    try { prior = localStorage.getItem(CKEY); } catch (e) {}
    function dismissCookie(value) {
      try { localStorage.setItem(CKEY, value); } catch (e) {}
      cookie.classList.remove('show');
      cookie.setAttribute('aria-hidden', 'true');
    }
    if (!prior) {
      setTimeout(function () {
        cookie.classList.add('show');
        cookie.setAttribute('aria-hidden', 'false');
      }, reduce ? 0 : 1100);
    }
    var ckAccept = $('#cookieAccept'), ckReject = $('#cookieReject'), ckCustom = $('#cookieCustomize');
    ckAccept && ckAccept.addEventListener('click', function () { dismissCookie('accepted'); });
    ckReject && ckReject.addEventListener('click', function () { dismissCookie('rejected'); });
    ckCustom && ckCustom.addEventListener('click', function (e) { e.preventDefault(); dismissCookie('essential'); });
  }

  /* (magnetic-button effect removed — buttons keep only their CSS :hover animation) */

  /* ---------- Step 02 Mission IDE: planning chat (left) + LIVE fleet feed (right) ----------
     The left thread reveals the order once. The right pane is a live console: each drone keeps
     generating changing telemetry (grids, thermals, coverage, confirms) on its own cadence,
     rolling the last few lines. Pauses when off-screen. Reduced-motion = static fallback. */
  (function () {
    var win = $('#ideWin'); if (!win) return;
    var thread = $('#ideThread'), fleet = $('#fleetBody'), type = $('#ccType');
    var items = thread ? [].slice.call(thread.children) : [];
    var ORDERS = ['Reroute Bravo to the 10th Ave face', 'Hold Delta over W 54th for FDNY',
                  'Add 2 drones to the W 51st grid', 'Prioritize the 9th Ave stairwell'];
    if (reduce) return;                                   // static seed stays visible

    items.forEach(function (el) { el.classList.add('ag--off'); });

    var timers = [];
    function after(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function rnd(n) { return Math.floor(Math.random() * n); }
    function pick(a) { return a[rnd(a.length)]; }
    var AVE = ['8th', '9th', '10th', '11th'], SITE = '9th & W54';
    function loc() { return pick(AVE) + ' & W' + (48 + rnd(11)); }

    function revealItem(i, delay) {
      if (i >= items.length) return;
      after(delay, function () { items[i].classList.remove('ag--off'); items[i].classList.add('ag--in'); if (thread) thread.scrollTop = thread.scrollHeight; });
    }

    /* ---- live fleet telemetry: one generator per drone ---- */
    var sec = 30;                                         // mission clock [mm:ss]
    function stamp() { var m = Math.floor(sec / 60), s = sec % 60; return '[' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + ']'; }

    var GEN = {
      a: (function () { var cov = 80; return function () {
        var r = Math.random();
        if (r < 0.22) { cov = Math.min(99, cov + 1 + rnd(3)); return { t: cov + '% block coverage', s: 'Searching' }; }
        if (r < 0.40) return { t: 'advancing up ' + pick(['9th Ave', '10th Ave', '11th Ave']), s: 'Searching' };
        if (r < 0.50) return { t: loc() + ' \u2014 debris, re-routing', s: 'Searching' };
        return { t: loc() + ' \u2014 clear', s: 'Searching' };
      }; })(),
      b: (function () { var n = 0; return function () {
        n++;
        if (n % 12 === 0) return { t: 'survivor confirmed \u00b7 ' + SITE, key: true, s: 'Contact' };
        var r = Math.random();
        if (r < 0.25) return { t: 'thermal ' + (37 + rnd(35) / 10).toFixed(1) + '\u00b0C \u2014 flagging ' + loc(), s: 'Scanning' };
        if (r < 0.40) return { t: 'holding overwatch \u00b7 ' + SITE, s: 'Scanning' };
        return { t: 'thermal ' + (34 + rnd(35) / 10).toFixed(1) + '\u00b0C ambient', s: 'Scanning' };
      }; })(),
      c: (function () { var p = 30, seg = 2; return function () {
        p += 6 + rnd(12);
        if (p >= 100) { p = 0; var done = seg; seg++; return { t: '3D map \u00b7 W53\u201355 blocks uploaded', key: true, s: 'Complete' }; }
        if (Math.random() < 0.2) return { t: 'scanning ' + pick(['9th Ave', '10th Ave', 'W 53rd', 'W 55th']) + ' face', s: 'Mapping' };
        return { t: 'mapping W53\u201355 \u00b7 ' + p + '%', s: 'Mapping' };
      }; })(),
      d: (function () { var n = 0; return function () {
        n++; var m = n % 8;
        if (m === 3) return { t: '\u2192 vectoring to ' + SITE, s: 'Tasked' };
        if (m === 4) return { t: 'visual on thermal source', s: 'Tasked' };
        if (m === 5) return { t: 'confirmed \u00b7 1 survivor', key: true, s: 'Confirmed' };
        if (m === 6) return { t: 'relay active \u2014 guiding FDNY', s: 'Confirmed' };
        return { t: pick(['orbit ' + loc(), 'standby \u2014 awaiting tasking', 'relay link nominal', 'battery ' + (72 + rnd(20)) + '% \u00b7 nominal']), s: 'Standby' };
      }; })()
    };

    var drones = ['a', 'b', 'c', 'd'].map(function (k) {
      var el = fleet && fleet.querySelector('.dr--' + k);
      return el ? { gen: GEN[k], roll: el.querySelector('.dr__roll'), bt: el.querySelector('.dr__bt') } : null;
    }).filter(Boolean);

    var LH = 0;
    function addLine(d) {
      var o = d.gen();
      var p = document.createElement('p');
      p.className = 'dl dl--in' + (o.key ? ' dl--key' : '');
      p.innerHTML = '<span class="dl__t">' + stamp() + '</span>' + (o.key ? '<i class="dl__ic">✓</i>' : '') + o.t;
      d.roll.appendChild(p);
      if (!LH) LH = p.offsetHeight || 18;
      var n = d.roll.children.length;
      if (n > 3) d.roll.style.transform = 'translateY(' + (-(n - 3) * LH) + 'px)';
      if (o.s && d.bt) d.bt.textContent = o.s;
      if (n > 9) {                                   // drop the off-screen lines, keep the scroll seamless
        for (var i = 0; i < 3; i++) d.roll.removeChild(d.roll.firstChild);
        var m = d.roll.children.length;
        d.roll.style.transition = 'none';
        d.roll.style.transform = 'translateY(' + (-(m - 3) * LH) + 'px)';
        void d.roll.offsetHeight;
        d.roll.style.transition = '';
      }
    }

    var onscreen = true;
    function startDrone(d, first, spread) {
      after(first, function tick() {
        if (onscreen) addLine(d);
        timers.push(setTimeout(tick, spread + rnd(spread)));
      });
    }
    function startFleet() {
      drones.forEach(function (d) { d.roll.style.transform = ''; d.roll.innerHTML = ''; });   // drop the static seed
      var pr; for (pr = 0; pr < 3; pr++) { drones.forEach(function (d) { addLine(d); }); sec += 2; }
      timers.push(setInterval(function () { sec += 1; }, 700));
      startDrone(drones[0], 300, 1700);
      startDrone(drones[1], 700, 2000);
      startDrone(drones[2], 500, 1800);
      startDrone(drones[3], 1100, 2300);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { en.forEach(function (e) { onscreen = e.isIntersecting; }); }, { threshold: 0.05 }).observe(win);
      }
    }

    function typewriter() {
      if (!type) return;
      var oi = 0;
      (function nextOrder() {
        var txt = ORDERS[oi % ORDERS.length]; oi++;
        var ci = 0;
        (function typeIn() {
          type.textContent = txt.slice(0, ci);
          if (ci++ < txt.length) after(42 + rnd(46), typeIn);
          else after(1700, eraseOut);
        })();
        function eraseOut() {
          var t = type.textContent;
          if (t.length) { type.textContent = t.slice(0, -1); after(22, eraseOut); }
          else after(420, nextOrder);
        }
      })();
    }

    var started = false;
    function begin() {
      if (started) return; started = true;
      revealItem(0, 120); revealItem(1, 820); revealItem(2, 1420); revealItem(3, 2050);
      revealItem(4, 2650); revealItem(5, 3450);
      after(1900, startFleet);     // fleet goes live as the tasking lands
      after(4200, typewriter);
    }
    function onScrollCheck() {
      var r = win.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 0.8 && r.bottom > vh * 0.2) begin();
    }
    window.addEventListener('scroll', onScrollCheck, { passive: true });
    onScrollCheck();
  })();

  /* ---------- Live drone map (step 03) — lazy-load the heavy iframe ----------
     Scroll/rect based (not IntersectionObserver) so it fires reliably; the map
     is a second Three.js build, so we only fetch it once it's near the viewport. */
  var flyMap = $('#flyMap');
  if (flyMap) {                                   // load for everyone (incl. reduced-motion: map renders calm, no auto-spin)
    var mapLoaded = false;
    function loadMap() {
      if (mapLoaded) return;
      mapLoaded = true;
      flyMap.addEventListener('load', function () { flyMap.classList.add('is-loaded'); }, { once: true });
      var src = flyMap.getAttribute('data-src');
      if (reduce) src += (src.indexOf('?') > -1 ? '&' : '?') + 'reduce=1';
      flyMap.src = src;
      window.removeEventListener('scroll', checkMap);
      window.removeEventListener('resize', checkMap);
    }
    function checkMap() {
      var r = flyMap.getBoundingClientRect();
      if (r.top < window.innerHeight + 800 && r.bottom > -800) loadMap();
    }
    checkMap();                                   // already in view on load?
    window.addEventListener('scroll', checkMap, { passive: true });
    window.addEventListener('resize', checkMap, { passive: true });
  }

  /* (step-02 "thinking out loud" typed sequence removed — no #planStream element in the markup) */

  /* ---------- Rolling planner console (step 03) — 3-line writing loop ----------
     A live "Degla planner" log: adaptation events type in at the bottom, the
     stack rolls upward, and the oldest line dissolves out the top behind the
     CSS mask. Loops forever. Reduced-motion = static 3-line snapshot, no typing. */
  var planRoll = $('#planRoll');
  if (planRoll) {
    var PLAN_EVENTS = [
      { head: 'BATTERY 14%',    tail: 'drone 3 returns, its grid handed to drone 5' },
      { head: 'SIGNAL LOST',    tail: 'relinked via mesh node 2, path rejoined' },
      { head: 'WIND 38 KM/H',   tail: 'altitude trimmed, sweep lines spread out' },
      { head: 'HEAT SIGNATURE', tail: 'drone 2 vectored in to confirm' },
      { head: 'SECTOR 7 CLEAR', tail: 'marked searched, fleet pushes north' },
      { head: 'LIGHT FADING',   tail: 'switched to thermal, coverage held' },
      { head: 'NEW LAST SEEN',  tail: 'search centered on the ridge line' }
    ];

    var track = document.createElement('div');
    track.className = 'pl-track';
    planRoll.appendChild(track);

    function buildLine(ev, withCaret) {
      var line = document.createElement('p');
      line.className = 'pl-line';
      var h = document.createElement('span'); h.className = 'pl-head'; h.textContent = ev.head;
      var s = document.createElement('span'); s.className = 'pl-sep';  s.textContent = '→';
      var t = document.createElement('span'); t.className = 'pl-tail';
      line.appendChild(h); line.appendChild(s); line.appendChild(t);
      if (withCaret) {
        var c = document.createElement('span'); c.className = 'pl-caret';
        line.appendChild(c);
        line._tail = t; line._caret = c;
      } else {
        t.textContent = ev.tail;
      }
      return line;
    }

    function trim() { while (track.children.length > 4) track.removeChild(track.firstChild); }

    if (reduce) {
      // static snapshot: three finished lines, no animation
      for (var i = 0; i < 3; i++) track.appendChild(buildLine(PLAN_EVENTS[i], false));
    } else {
      var idx = 0, onScreen = true;
      // seed two completed lines so the console never reads empty
      track.appendChild(buildLine(PLAN_EVENTS[PLAN_EVENTS.length - 2], false));
      track.appendChild(buildLine(PLAN_EVENTS[PLAN_EVENTS.length - 1], false));

      function typeNext() {
        if (!onScreen) { setTimeout(typeNext, 400); return; }   // pause when off-screen
        var ev = PLAN_EVENTS[idx % PLAN_EVENTS.length]; idx++;
        var line = buildLine(ev, true);
        track.appendChild(line); trim();
        var tEl = line._tail, caret = line._caret, full = ev.tail, ci = 0;
        (function type() {
          tEl.textContent = full.slice(0, ci);
          if (ci++ < full.length) { setTimeout(type, 26 + Math.random() * 34); }
          else {
            if (caret && caret.parentNode) caret.parentNode.removeChild(caret);
            setTimeout(typeNext, 1500 + Math.random() * 900);
          }
        })();
      }

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) {
          en.forEach(function (e) { onScreen = e.isIntersecting; });
        }, { threshold: 0.2 }).observe(planRoll);
      }
      typeNext();
    }
  }

  /* ---------- Contact — inline simple form (front-end only) ---------- */
  (function () {
    var form = $('#contactForm');
    if (!form) return;

    var errEl   = $('#ctError');
    var success = $('#ctSuccess');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function fail(msg, el) {
      errEl.textContent = msg; errEl.hidden = false;
      var f = el && el.closest ? el.closest('.rq-field') : null;
      if (f) f.classList.add('is-invalid');
      if (el && el.focus) el.focus();
      return false;
    }

    form.addEventListener('input', function (e) {
      var f = e.target.closest && e.target.closest('.rq-field');
      if (f) f.classList.remove('is-invalid');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      $$('.rq-field.is-invalid', form).forEach(function (f) { f.classList.remove('is-invalid'); });
      errEl.hidden = true;

      var name = $('#ctName'), email = $('#ctEmail'), message = $('#ctMsg');
      if (!name.value.trim())                 return fail('Please enter your name.', name);
      if (!emailRe.test(email.value.trim()))  return fail('Please enter a valid work email.', email);
      if (!message.value.trim())              return fail('Tell us what you’re searching for.', message);

      /* Static site — deliver via the visitor's mail client: open a prefilled
         email to ceo@deglai.ai composed from the form fields. */
      var size = $('#ctSize');
      var subject = 'Early access request — ' + name.value.trim();
      var body = 'Name: ' + name.value.trim() +
                 '\nEmail: ' + email.value.trim() +
                 '\nTeam size: ' + (size ? size.value : '') +
                 '\n\nMission context:\n' + message.value.trim();
      window.location.href = 'mailto:ceo@deglai.ai?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);

      var first = name.value.trim().split(/\s+/)[0];
      var msg = $('#ctSuccessMsg');
      if (msg) msg.textContent =
        'Thanks, ' + first + '. Your email draft is ready — just hit send.';

      form.hidden = true;
      if (success) { success.hidden = false; if (success.focus) success.focus(); }
    });
  })();

  /* (voice-recorder prototype removed — no #voiceRec element in the markup) */

})();
