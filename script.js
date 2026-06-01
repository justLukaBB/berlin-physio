(() => {
  'use strict';

  // ---- Jahr im Footer ----
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // ---- Header Scroll-State ----
  const header = document.getElementById('header');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Mobile Drawer ----
  const toggle = document.getElementById('menuToggle');
  const drawer = document.getElementById('drawer');
  const closeDrawer = () => {
    toggle?.classList.remove('open');
    drawer?.classList.remove('open');
    document.body.style.overflow = '';
    document.body.classList.remove('drawer-open');
  };
  toggle?.addEventListener('click', () => {
    const open = toggle.classList.toggle('open');
    drawer?.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    document.body.classList.toggle('drawer-open', open);
  });
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
  // Klick auf den abgedunkelten Bereich neben dem Panel schließt das Menü
  drawer?.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) closeDrawer();
  });

  // ---- Reveal on Scroll ----
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in-view'));
  }

  // ---- Übungen & Leistungen: Stichpunkte aufklappen ----
  document.querySelectorAll('.exercise-toggle, .service-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  // ---- Carousels (Praxis · Team · Im Einsatz) — nahtloser Endlos-Autoplay ----
  document.querySelectorAll('[data-carousel]').forEach(car => {
    const track = car.querySelector('.carousel-track');
    const prevBtn = car.querySelector('[data-prev]');
    const nextBtn = car.querySelector('[data-next]');
    if (!track) return;

    const originals = Array.from(track.children);
    if (!originals.length) return;

    // Bilder einmal duplizieren → nahtlose Endlosschleife ohne Rücksprung
    originals.forEach(node => {
      const clone = node.cloneNode(true);
      clone.classList.add('carousel-clone');
      clone.classList.remove('reveal');
      clone.classList.add('in-view');
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      clone.removeAttribute('data-lightbox');
      if (clone.tagName === 'A') clone.removeAttribute('href');
      track.appendChild(clone);
    });

    // Kontinuierliches Scrollen statt Snap
    track.style.scrollSnapType = 'none';
    track.style.scrollBehavior = 'auto';

    // Randverläufe dauerhaft anzeigen (es geht immer weiter in beide Richtungen)
    car.classList.add('can-prev', 'can-next');

    // Breite eines kompletten Original-Durchlaufs (für nahtlosen Reset)
    let loopW = 0;
    const measure = () => {
      const firstClone = track.children[originals.length];
      loopW = firstClone
        ? firstClone.offsetLeft - originals[0].offsetLeft
        : track.scrollWidth / 2;
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);

    const SPEED = 45; // Pixel pro Sekunde — sanfter Dauerlauf
    let paused = false;
    let rafId = null;
    let lastTs = null;
    let pos = track.scrollLeft;

    const tick = (ts) => {
      if (lastTs == null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05); // gegen Sprünge nach Tab-Wechsel
      lastTs = ts;
      if (!paused) {
        pos += SPEED * dt;
        if (loopW > 0 && pos >= loopW) pos -= loopW;
        track.scrollLeft = pos;
      }
      rafId = requestAnimationFrame(tick);
    };
    const startLoop = () => {
      if (rafId == null) { lastTs = null; pos = track.scrollLeft; rafId = requestAnimationFrame(tick); }
    };
    const stopLoop = () => {
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
    };

    // Manuelles Scrollen (Pfeile) — kurz pausieren, dann weiterlaufen
    let resumeTimeout = null;
    const pauseBrief = (delay = 4000) => {
      paused = true;
      clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => { paused = false; pos = track.scrollLeft; }, delay);
    };
    const itemStep = () => {
      const item = track.querySelector('.carousel-item');
      if (!item) return 0;
      const gap = parseFloat(getComputedStyle(track).gap) || 16;
      return item.offsetWidth + gap;
    };
    prevBtn?.addEventListener('click', () => { track.scrollBy({ left: -itemStep(), behavior: 'smooth' }); pauseBrief(); });
    nextBtn?.addEventListener('click', () => { track.scrollBy({ left: itemStep(), behavior: 'smooth' }); pauseBrief(); });

    // Pause bei Hover (Desktop), kurze Pause bei Touch / Swipe
    car.addEventListener('mouseenter', () => { paused = true; });
    car.addEventListener('mouseleave', () => { paused = false; pos = track.scrollLeft; });
    car.addEventListener('touchstart', () => pauseBrief(), { passive: true });

    // Pause, wenn Tab nicht sichtbar (Performance)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop(); else startLoop();
    });

    // Start, sobald das Carousel sichtbar ist
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) startLoop(); else stopLoop(); });
      }, { threshold: 0 });
      io.observe(car);
    } else {
      startLoop();
    }
  });

  // ---- Lightbox für Galerien ----
  const lightboxTargets = document.querySelectorAll('[data-lightbox]');
  if (lightboxTargets.length) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.innerHTML = `
      <button class="lightbox-close" aria-label="Schließen">×</button>
      <button class="lightbox-prev" aria-label="Zurück">‹</button>
      <img class="lightbox-img" alt="">
      <button class="lightbox-next" aria-label="Weiter">›</button>
    `;
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = `
      .lightbox {
        position: fixed; inset: 0;
        background: rgba(15, 41, 55, 0.92);
        backdrop-filter: blur(8px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 24px;
      }
      .lightbox.open { display: flex; }
      .lightbox-img {
        max-width: 90vw;
        max-height: 86vh;
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.5);
        animation: lbIn .4s cubic-bezier(0.32, 0.72, 0, 1);
      }
      .lightbox button {
        position: absolute;
        background: rgba(255,255,255,0.12);
        color: #fff;
        width: 48px; height: 48px;
        border-radius: 999px;
        font-size: 24px;
        display: grid; place-items: center;
        transition: background .2s;
      }
      .lightbox button:hover { background: rgba(255,255,255,0.22); }
      .lightbox-close { top: 24px; right: 24px; }
      .lightbox-prev { left: 24px; }
      .lightbox-next { right: 24px; }
      @keyframes lbIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      @media (max-width: 600px) {
        .lightbox-prev, .lightbox-next { bottom: 24px; top: auto; }
        .lightbox-prev { left: 24px; }
        .lightbox-next { right: 24px; }
      }
    `;
    document.head.appendChild(style);

    const img = overlay.querySelector('.lightbox-img');
    const btnClose = overlay.querySelector('.lightbox-close');
    const btnPrev = overlay.querySelector('.lightbox-prev');
    const btnNext = overlay.querySelector('.lightbox-next');

    let currentList = [];
    let currentIdx = 0;

    const open = (list, idx) => {
      currentList = list;
      currentIdx = idx;
      img.src = list[idx];
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    const close = () => {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    };
    const next = () => {
      currentIdx = (currentIdx + 1) % currentList.length;
      img.src = currentList[currentIdx];
    };
    const prev = () => {
      currentIdx = (currentIdx - 1 + currentList.length) % currentList.length;
      img.src = currentList[currentIdx];
    };

    btnClose.addEventListener('click', close);
    btnNext.addEventListener('click', next);
    btnPrev.addEventListener('click', prev);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    });

    // Gruppieren nach Container (parent section)
    const groups = new Map();
    lightboxTargets.forEach(a => {
      const section = a.closest('section') || document.body;
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push(a);
    });

    groups.forEach((targets) => {
      const urls = targets.map(t => t.getAttribute('href'));
      targets.forEach((t, i) => {
        t.addEventListener('click', (e) => {
          e.preventDefault();
          open(urls, i);
        });
      });
    });
  }

  // ---- Termin-Form: Submit per mailto ----
  const form = document.getElementById('terminForm');
  if (form) {
    const dateInput = form.querySelector('#datum');
    if (dateInput) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      dateInput.min = `${yyyy}-${mm}-${dd}`;
    }

    const success = form.querySelector('.form-success');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;

      form.querySelectorAll('[required]').forEach(el => {
        const wrap = el.closest('.field') || el.closest('.checkbox');
        if (!el.checkValidity() || (el.type === 'checkbox' && !el.checked)) {
          wrap?.classList.add('invalid');
          valid = false;
        } else {
          wrap?.classList.remove('invalid');
        }
      });

      if (!valid) {
        form.querySelector('.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const get = (n) => (form.elements[n]?.value || '').trim();
      const datum = get('datum');
      const datumDe = datum
        ? new Date(datum).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
        : '';

      const subject = `Terminanfrage — ${get('vorname')} ${get('nachname')}`;
      const lines = [
        'Neue Terminanfrage über die Website:',
        '',
        `Name:       ${get('vorname')} ${get('nachname')}`,
        `E-Mail:     ${get('email')}`,
        `Telefon:    ${get('telefon') || '—'}`,
        `Thema:      ${get('thema')}`,
        `Wunsch:     ${datumDe} um ${get('uhrzeit')} Uhr`,
        '',
        'Nachricht:',
        get('nachricht') || '—',
        '',
        '— gesendet via physio-berlinertor.de'
      ];

      const mailto = 'mailto:info@physio-berlinertor.de'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(lines.join('\n'));

      success.hidden = false;
      window.location.href = mailto;
    });

    // Reset invalid state beim Tippen
    form.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('input', () => {
        const wrap = el.closest('.field') || el.closest('.checkbox');
        wrap?.classList.remove('invalid');
      });
      el.addEventListener('change', () => {
        const wrap = el.closest('.field') || el.closest('.checkbox');
        wrap?.classList.remove('invalid');
      });
    });
  }

  // ---- Smooth-Anchor mit Header-Offset ----
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - headerH - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();
