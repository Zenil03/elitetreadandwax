document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const navLinks = [...document.querySelectorAll('.nav a')];
  const sections = [...document.querySelectorAll('[data-section]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('load', () => body.classList.add('loaded'), { once: true });
  setTimeout(() => body.classList.add('loaded'), 900);

  const closeMenu = () => {
    header.classList.remove('menu-open');
    body.classList.remove('menu-open');
    toggle?.setAttribute('aria-expanded', 'false');
  };

  toggle?.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  document.querySelector('.nav-backdrop')?.addEventListener('click', closeMenu);

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Responsive safety: close the mobile drawer when returning to desktop.
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu();
  }, { passive: true });

  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 18);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });


  const scrollTopButton = document.querySelector('.scroll-top');
  const updateScrollTopButton = () => {
    if (!scrollTopButton) return;
    const visible = window.scrollY > Math.max(420, window.innerHeight * 0.55);
    scrollTopButton.classList.toggle('visible', visible);
  };
  updateScrollTopButton();
  window.addEventListener('scroll', updateScrollTopButton, { passive: true });
  scrollTopButton?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  // Repeat reveal animations every time an element re-enters the viewport.
  // This works in both scroll directions on desktop, tablet and mobile.
  const revealItems = [...document.querySelectorAll('.reveal-up, .reveal-scale, .reveal-left, .reveal-right')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      } else {
        entry.target.classList.remove('in-view');
      }
    });
  }, { threshold: 0.16, rootMargin: '-3% 0px -7% 0px' });

  revealItems.forEach(el => observer.observe(el));

  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-38% 0px -52% 0px', threshold: 0 });
  sections.forEach(section => sectionObserver.observe(section));

  document.querySelectorAll('.filter button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.filter;
      document.querySelectorAll('.product').forEach(card => {
        const visible = type === 'all' || card.dataset.type === type;
        card.classList.toggle('is-hidden', !visible);
        if (visible) {
          card.animate([
            { opacity: 0, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'translateY(0)' }
          ], { duration: 340, easing: 'ease-out' });
        }
      });
    });
  });


  // Interactive parlour service menu — runway transition + staggered prices
  const menuTabs = [...document.querySelectorAll('[data-menu-tab]')];
  const menuPanels = [...document.querySelectorAll('[data-menu-panel]')];
  let activeMenuIndex = 0;

  const animateMenuPanel = (panel, direction = 1) => {
    if (reducedMotion || !panel) return;
    panel.animate([
      { opacity: 0, transform: `translateX(${direction * 34}px) scale(.985)`, filter: 'blur(5px)' },
      { opacity: 1, transform: 'translateX(0) scale(1)', filter: 'blur(0)' }
    ], { duration: 520, easing: 'cubic-bezier(.16,.9,.2,1)', fill: 'both' });

    panel.querySelectorAll('.price-card').forEach((card, i) => {
      const x = (i % 3 - 1) * 34;
      const y = 16 + (i % 2) * 8;
      card.animate([
        { opacity: 0, transform: `translate(${x}px, ${y}px) scale(.965)` },
        { opacity: 1, transform: 'translate(0, 0) scale(1)' }
      ], { duration: 460, delay: 70 + i * 42, easing: 'cubic-bezier(.16,.9,.2,1)', fill: 'both' });
    });
  };

  const burstMenu = () => {
    if (reducedMotion) return;
    const stage = document.querySelector('.menu-stage');
    if (!stage) return;
    for (let i = 0; i < 9; i++) {
      const spark = document.createElement('i');
      spark.className = 'menu-burst';
      spark.style.left = `${45 + Math.random() * 10}%`;
      spark.style.top = `${15 + Math.random() * 18}%`;
      spark.style.setProperty('--bx', `${(Math.random() - .5) * 180}px`);
      spark.style.setProperty('--by', `${(Math.random() - .5) * 130}px`);
      stage.appendChild(spark);
      setTimeout(() => spark.remove(), 900);
    }
  };

  menuTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.menuTab;
      const direction = index >= activeMenuIndex ? 1 : -1;
      activeMenuIndex = index;
      menuTabs.forEach(btn => btn.classList.toggle('active', btn === tab));
      let visiblePanel = null;
      menuPanels.forEach(panel => {
        const show = panel.dataset.menuPanel === target;
        panel.hidden = !show;
        panel.classList.toggle('active', show);
        if (show) visiblePanel = panel;
      });
      requestAnimationFrame(() => animateMenuPanel(visiblePanel, direction));
      burstMenu();
      railIndicatorCtl?.refresh();
      tab.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    });
  });

  // Sliding "thread" indicators for the desktop nav and the menu rail —
  // a shared gold-line motif that glides to whichever item is active/hovered.
  const setupSlidingIndicator = (container, indicatorSelector, itemSelector, { isVertical = () => false } = {}) => {
    const track = document.querySelector(container);
    const indicator = track?.querySelector(indicatorSelector);
    if (!track || !indicator) return null;

    const moveTo = el => {
      if (!el) return;
      const trackRect = track.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      if (isVertical()) {
        indicator.style.height = `${elRect.height * 0.56}px`;
        indicator.style.transform = `translateY(${elRect.top - trackRect.top + elRect.height * 0.22}px)`;
      } else {
        indicator.style.width = `${elRect.width}px`;
        indicator.style.transform = `translateX(${elRect.left - trackRect.left}px)`;
      }
      track.classList.add('indicator-ready');
    };

    const items = () => [...track.querySelectorAll(itemSelector)];
    const activeItem = () => items().find(el => el.classList.contains('active')) || items()[0];

    moveTo(activeItem());
    items().forEach(el => {
      el.addEventListener('pointerenter', () => moveTo(el));
      el.addEventListener('focus', () => moveTo(el));
    });
    track.addEventListener('pointerleave', () => moveTo(activeItem()));
    window.addEventListener('resize', () => moveTo(activeItem()), { passive: true });

    return { refresh: () => moveTo(activeItem()) };
  };

  const navIndicatorCtl = setupSlidingIndicator('.nav', '.nav-indicator', 'a');
  const railIndicatorCtl = setupSlidingIndicator('.menu-rail', '.rail-indicator', 'button', { isVertical: () => window.innerWidth > 900 });

  // Keep the nav indicator synced as scroll-driven "active" link changes.
  const navIndicatorObserver = new MutationObserver(() => navIndicatorCtl?.refresh());
  navLinks.forEach(link => navIndicatorObserver.observe(link, { attributes: true, attributeFilter: ['class'] }));

  window.addEventListener('resize', () => {
    // Re-check orientation (vertical rail on desktop, horizontal on mobile).
    setTimeout(() => railIndicatorCtl?.refresh(), 50);
  }, { passive: true });

  document.querySelectorAll('[data-open-menu]').forEach(link => {
    link.addEventListener('click', () => {
      const target = link.dataset.openMenu;
      const tab = menuTabs.find(btn => btn.dataset.menuTab === target);
      if (tab) tab.click();
    });
  });

  const glow = document.querySelector('.cursor-glow');
  if (glow && !reducedMotion && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', e => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    }, { passive: true });
  }

  const heroArt = document.querySelector('[data-parallax] img');
  const heroWrap = document.querySelector('[data-parallax]');
  if (heroArt && heroWrap && !reducedMotion && window.matchMedia('(pointer:fine)').matches) {
    heroWrap.addEventListener('pointermove', e => {
      const rect = heroWrap.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - .5;
      const y = (e.clientY - rect.top) / rect.height - .5;
      heroArt.style.transform = `translate(${x * 10}px, ${y * 10}px) rotateX(${-y * 2}deg) rotateY(${x * 2}deg)`;
    });
    heroWrap.addEventListener('pointerleave', () => { heroArt.style.transform = ''; });
  }

  if (!reducedMotion && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * .08}px, ${y * .08}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  const contactForm = document.querySelector('.contact-form');
  contactForm?.addEventListener('submit', e => {
    e.preventDefault();
    const note = contactForm.querySelector('.form-note');
    if (!contactForm.checkValidity()) {
      note.textContent = 'Please complete all fields before sending.';
      contactForm.reportValidity();
      return;
    }
    const button = contactForm.querySelector('button');
    const original = button.innerHTML;
    button.innerHTML = 'Message ready ✓';
    note.textContent = 'Demo form only — connect this form to your email or backend before launch.';
    setTimeout(() => { button.innerHTML = original; }, 2600);
  });

});

// 2026 beauty-playground pointer light for the menu stage
(() => {
  const stage = document.querySelector('.menu-stage');
  if (!stage) return;
  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    stage.style.setProperty('--mx', `${x}%`);
    stage.style.setProperty('--my', `${y}%`);
  });
  stage.addEventListener('pointerleave', () => {
    stage.style.setProperty('--mx', '50%');
    stage.style.setProperty('--my', '30%');
  });
})();

// V11 mobile/touch animation support
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  // Touch feedback for service art and pricing rows.
  const pulseTouch = (el, className = 'touch-active', ms = 520) => {
    if (!el) return;
    el.classList.add(className);
    window.clearTimeout(el.__touchTimer);
    el.__touchTimer = window.setTimeout(() => el.classList.remove(className), ms);
  };

  document.querySelectorAll('.service-row').forEach(row => {
    row.addEventListener('touchstart', () => pulseTouch(row, 'touch-active', 650), { passive: true });
  });

  document.querySelectorAll('.price-card').forEach(card => {
    card.addEventListener('touchstart', () => pulseTouch(card), { passive: true });
  });

  // Animate newly selected menu prices on touch/mobile too.
  document.querySelectorAll('[data-menu-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      requestAnimationFrame(() => {
        const target = tab.dataset.menuTab;
        const panel = document.querySelector(`[data-menu-panel="${target}"]`);
        if (!panel || panel.hidden) return;
        panel.querySelectorAll('.price-card').forEach((card, i) => {
          card.animate([
            { opacity: 0, transform: `translateX(${i % 2 ? 18 : -18}px) translateY(6px)` },
            { opacity: 1, transform: 'translateX(0) translateY(0)' }
          ], {
            duration: 420,
            delay: Math.min(i * 48, 320),
            easing: 'cubic-bezier(.16,.9,.2,1)',
            fill: 'both'
          });
        });
      });
    });
  });

  // If the viewport changes orientation/size, reveal elements already visible
  // so they never remain stuck off-screen after a mobile rotation.
  const revealVisible = () => {
    document.querySelectorAll('.reveal-up,.reveal-scale,.reveal-left,.reveal-right').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * .96 && r.bottom > 0) el.classList.add('in-view');
    });
  };
  window.addEventListener('orientationchange', () => setTimeout(revealVisible, 180), { passive: true });
  window.addEventListener('resize', revealVisible, { passive: true });
  revealVisible();
})();

// Noir theme motion layer: scroll progress, subtle card tilt and animated thread.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<i></i>';
  document.body.appendChild(progress);

  const thread = document.createElement('div');
  thread.className = 'noir-thread';
  thread.setAttribute('aria-hidden', 'true');
  document.body.appendChild(thread);

  const bar = progress.firstElementChild;
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
    bar.style.width = pct + '%';
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });

  if (reduced || !window.matchMedia('(pointer:fine)').matches) return;
  document.querySelectorAll('.value-card, .price-card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(800px) rotateX(${-y * 2.2}deg) rotateY(${x * 2.5}deg) translateY(-3px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
})();
