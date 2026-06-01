/* =========================================================================
   FX – Premium-Animationen (Vanilla, framework-frei)
   Scroll-Fortschritt · magnetische Buttons · 3D-Tilt + Lichtspot ·
   Parallax · Count-up-Statistiken
   Selbst-deaktivierend bei prefers-reduced-motion / Touch / kleinen Screens.
   ========================================================================= */
(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Zeiger fein + genug Platz → die „großen“ Effekte (Tilt, Magnet, Parallax)
  const rich = window.matchMedia('(hover: hover) and (pointer: fine)').matches
            && window.innerWidth >= 980 && !reduce;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  /* ---- 1. Scroll-Fortschrittsbalken ---------------------------------- */
  if (!reduce) {
    const bar = document.createElement('div');
    bar.className = 'fx-progress';
    document.body.appendChild(bar);
    let ticking = false;
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? h.scrollTop / max : 0;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---- 2. Magnetische Buttons ---------------------------------------- */
  if (rich) {
    const magnets = document.querySelectorAll(
      '.btn-primary, .btn-dark, .btn-accent, .btn-light, .btn-submit, ' +
      '.nav-cta, .af-submit, .cart-checkout'
    );
    magnets.forEach((el) => {
      el.classList.add('fx-magnetic');
      const strength = 0.28;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---- 3. 3D-Tilt + Lichtspot auf Karten ----------------------------- */
  if (rich) {
    const cards = document.querySelectorAll(
      '.service-card, .service-block, [data-fx-tilt]'
    );
    const MAX = 7; // Grad
    cards.forEach((card) => {
      card.classList.add('fx-tilt');
      let raf = null, nx = 0, ny = 0;
      const render = () => {
        raf = null;
        const ry = (nx - 0.5) * (MAX * 2);
        const rx = (0.5 - ny) * (MAX * 2);
        card.style.transform =
          `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`;
      };
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        nx = clamp((e.clientX - r.left) / r.width, 0, 1);
        ny = clamp((e.clientY - r.top) / r.height, 0, 1);
        card.style.setProperty('--fx-mx', (nx * 100).toFixed(1) + '%');
        card.style.setProperty('--fx-my', (ny * 100).toFixed(1) + '%');
        if (!raf) raf = requestAnimationFrame(render);
      });
      card.addEventListener('pointerenter', () => card.classList.add('is-tilting'));
      card.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    });
  }

  /* ---- 4. Sanfte Parallax auf Bild-Blöcke ---------------------------- */
  if (rich) {
    const items = [...document.querySelectorAll(
      '.hero-visual, .highlight-visual, .about-visual, [data-fx-parallax]'
    )].map((el) => ({ el, speed: parseFloat(el.dataset.fxParallax) || 0.08 }));

    if (items.length) {
      let ticking = false;
      const update = () => {
        const vh = window.innerHeight;
        items.forEach(({ el, speed }) => {
          // Erst übernehmen, wenn die Reveal-Einblendung gelaufen ist
          if (el.classList.contains('reveal')
              && !el.classList.contains('in-view')
              && !el.classList.contains('in')) return;
          const r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          const center = r.top + r.height / 2;
          const off = (center - vh / 2);
          const shift = clamp(-off * speed, -40, 40);
          el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
        });
        ticking = false;
      };
      window.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      window.addEventListener('resize', update);
      update();
    }
  }

  /* ---- 5. Count-up-Statistiken --------------------------------------- */
  if (!reduce && 'IntersectionObserver' in window) {
    const nums = document.querySelectorAll('[data-count], .about-stats .num, .stat-num');
    const targets = [];
    nums.forEach((el) => {
      const raw = (el.textContent || '').trim();
      const m = raw.match(/(\d+(?:[.,]\d+)?)/);
      if (!m) return; // reiner Text (z. B. „Meister“) → unverändert lassen
      const num = m[1];
      const decimals = (num.split(/[.,]/)[1] || '').length;
      const value = parseFloat(num.replace(',', '.'));
      const pre = raw.slice(0, m.index);
      const suf = raw.slice(m.index + num.length);
      const useComma = num.includes(',');
      el.dataset.fxPre = pre;
      el.dataset.fxSuf = suf;
      el.dataset.fxVal = String(value);
      el.dataset.fxDec = String(decimals);
      el.dataset.fxComma = useComma ? '1' : '';
      el.textContent = pre + (0).toFixed(decimals).replace('.', useComma ? ',' : '.') + suf;
      targets.push(el);
    });

    if (targets.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          io.unobserve(el);
          const end = parseFloat(el.dataset.fxVal);
          const dec = parseInt(el.dataset.fxDec, 10);
          const comma = el.dataset.fxComma === '1';
          const pre = el.dataset.fxPre, suf = el.dataset.fxSuf;
          const dur = 1500, t0 = performance.now();
          const ease = (t) => 1 - Math.pow(1 - t, 3);
          const step = (now) => {
            const p = clamp((now - t0) / dur, 0, 1);
            const val = (lerp(0, end, ease(p))).toFixed(dec).replace('.', comma ? ',' : '.');
            el.textContent = pre + val + suf;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      }, { threshold: 0.5 });
      targets.forEach((el) => io.observe(el));
    }
  }
})();
