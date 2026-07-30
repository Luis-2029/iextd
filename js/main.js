function animateHeroLetters() {
  const heading = document.querySelector('.hero-heading');
  if (!heading) return;

  const letters = [];

  function splitNode(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const char of node.textContent) {
        const span = document.createElement('span');
        span.className = 'hero-letter';
        span.textContent = char === ' ' ? ' ' : char;
        frag.appendChild(span);
        if (char.trim()) letters.push(span);
      }
      parent.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'BR') {
      Array.from(node.childNodes).forEach(child => splitNode(child, node));
    }
  }

  Array.from(heading.childNodes).forEach(child => splitNode(child, heading));

  gsap.from(letters, {
    opacity: 0,
    y: 48,
    rotateX: -90,
    duration: 0.55,
    stagger: 0.032,
    ease: 'back.out(1.4)',
    delay: 2.1,
  });
}

window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  const letters = document.querySelectorAll('#loaderWave span');

  letters.forEach((span, i) => {
    span.style.animationDelay = (i * 140) + 'ms';
  });

  // last letter finishes at: (4 × 140) + 550 = 1110ms → hide after 1600ms
  setTimeout(() => loader.classList.add('hidden'), 1600);
  animateHeroLetters();
});

// HERO STICKY REVEAL — oscurece el hero conforme la siguiente sección lo cubre
const heroEl = document.getElementById('hero');
const heroScrollDim = document.getElementById('heroScrollDim');

function updateHeroDim() {
  const heroHeight = heroEl.offsetHeight || 1;
  const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
  heroScrollDim.style.opacity = (progress * 0.6).toFixed(3);
}

window.addEventListener('scroll', updateHeroDim, { passive: true });
updateHeroDim();

// COMITÉ STICKY REVEAL — Registro se desliza encima; alto dinámico porque
// Comité no tiene una altura fija como el hero (depende de su contenido).
(function () {
  const wrap = document.querySelector('.comite-pin-wrap');
  const comiteEl = document.getElementById('comite');
  const registroEl = document.getElementById('registro');
  if (!wrap || !comiteEl || !registroEl) return;

  function syncComiteReveal() {
    const h = comiteEl.offsetHeight;
    const fits = h <= window.innerHeight;

    // Si Comité es más alto que la pantalla, "pegarlo" dejaría sus tarjetas
    // de abajo tapadas para siempre (Registro las cubriría antes de que se
    // pudieran ver). En ese caso se desactiva el pin y todo fluye normal.
    if (fits) {
      comiteEl.style.position = '';
      wrap.style.height = (h * 2) + 'px';
      registroEl.style.marginTop = -h + 'px';
    } else {
      // 'relative' (no 'static') para que el canvas de partículas, que se
      // posiciona absolute respecto a #comite, no se rompa.
      comiteEl.style.position = 'relative';
      wrap.style.height = 'auto';
      registroEl.style.marginTop = '';
    }
  }

  syncComiteReveal();
  window.addEventListener('resize', syncComiteReveal);
  window.addEventListener('load', syncComiteReveal);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncComiteReveal);
  }
}());

// REGISTRO — red de partículas animada de fondo
(function () {
  const canvas = document.getElementById('registroParticles');
  const section = document.getElementById('registro');
  if (!canvas || !section) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const ctx = canvas.getContext('2d');
  const DOT_COLOR  = '255, 255, 255';  // fondo oscuro de section-premios, puntos claros
  const LINE_COLOR = '255, 255, 255';
  const LINK_DIST  = 140;

  let particles = [];
  let width = 0, height = 0, dpr = 1;
  let running = false;
  let rafId;

  function resize() {
    const rect = section.getBoundingClientRect();
    width  = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const density = 9000;
    const count = Math.min(70, Math.max(20, Math.round((width * height) / density)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 1,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width)  p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${DOT_COLOR}, .45)`;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${LINE_COLOR}, ${(1 - dist / LINK_DIST) * .22})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    if (running) rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  resize();
  window.addEventListener('resize', resize);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { entry.isIntersecting ? start() : stop(); });
  }, { threshold: 0.01 });
  observer.observe(section);
}());

const navbar = document.getElementById('navbar');
const navInner = navbar.querySelector('.nav-inner');
let navWasScrolled = window.scrollY > 60;

window.addEventListener('scroll', () => {
  const isScrolled = window.scrollY > 60;
  navbar.classList.toggle('scrolled', isScrolled);

  if (isScrolled !== navWasScrolled) {
    navInner.classList.remove('navbar-pop');
    void navInner.offsetWidth;
    navInner.classList.add('navbar-pop');
    navWasScrolled = isScrolled;
  }
}, { passive: true });

const hamburger = document.getElementById('hamburger');
const navMobile = document.getElementById('navMobile');

hamburger.addEventListener('click', () => {
  const isOpen = navMobile.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});

navMobile.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navMobile.classList.remove('open');
    hamburger.classList.remove('open');
  });
});

const dayButtons = document.querySelectorAll('.day-btn');
const dayPanels  = document.querySelectorAll('.day-panel');

dayButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetDay = btn.dataset.day;

    dayButtons.forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });

    dayPanels.forEach(panel => {
      const isTarget = panel.id === `panel-${targetDay}`;
      panel.classList.toggle('active', isTarget);
      if (isTarget) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    });

    const scheduleSection = document.getElementById('agenda');
    const rect = scheduleSection.getBoundingClientRect();
    if (rect.top < -80) {
      scheduleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

document.querySelectorAll('.btn-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const card    = btn.closest('.session-card');
    const details = card.querySelector('.sc-details');
    const isOpen  = !details.hidden;

    const panel = btn.closest('.day-panel');
    panel.querySelectorAll('.sc-details').forEach(d => { d.hidden = true; });
    panel.querySelectorAll('.btn-toggle').forEach(b => {
      b.classList.remove('open');
      b.setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      details.hidden = false;
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    }
  });
});

(function () {
  const navLinks = document.querySelectorAll('.nav-links a, .nav-mobile a');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    });
  }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

  document.querySelectorAll('section[id], div[id]').forEach(sec => {
    sectionObserver.observe(sec);
  });
}());

const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -40px 0px' };

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.stat-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(28px)';
  el.style.transition = 'opacity .55s ease, transform .55s ease';
  observer.observe(el);
});

/* Guía de llegada: revelado escalonado + línea de ruta que se rellena con el scroll */
(function () {
  const wrap  = document.querySelector('.arrival-steps-wrap');
  const track = document.querySelector('.arrival-track');
  const fill  = document.getElementById('arrivalTrackFill');
  const steps = document.querySelectorAll('.arrival-step');
  const nums  = document.querySelectorAll('.arrival-step-num');
  if (!wrap || !track || !fill || !steps.length) return;

  const stepObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        stepObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4, rootMargin: '0px 0px -40px 0px' });

  steps.forEach(el => stepObserver.observe(el));

  function layoutTrack() {
    const wrapRect  = wrap.getBoundingClientRect();
    const firstRect = nums[0].getBoundingClientRect();
    const lastRect  = nums[nums.length - 1].getBoundingClientRect();
    const top    = (firstRect.top + firstRect.height / 2) - wrapRect.top;
    const bottom = (lastRect.top + lastRect.height / 2) - wrapRect.top;
    track.style.top    = top + 'px';
    track.style.height = Math.max(0, bottom - top) + 'px';
  }

  let ticking = false;
  function updateFill() {
    const rect = track.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.8;
    const end = vh * 0.35;
    const span = rect.height + (start - end);
    let progress = span > 0 ? (start - rect.top) / span : 0;
    progress = Math.max(0, Math.min(1, progress));
    fill.style.height = (progress * 100) + '%';
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateFill);
      ticking = true;
    }
  }

  layoutTrack();
  updateFill();
  window.addEventListener('resize', () => { layoutTrack(); updateFill(); });
  window.addEventListener('scroll', onScroll, { passive: true });
}());

/* Tooltip ponentes */
(function () {
  const spTooltip = document.getElementById('speakerTooltip');
  const sptAvatar = document.getElementById('sptAvatar');
  const sptName   = document.getElementById('sptName');
  const sptRole   = document.getElementById('sptRole');
  const sptBio    = document.getElementById('sptBio');
  const sptTag    = document.getElementById('sptTag');
  let hideTimer;

  function hideTooltipNow() {
    clearTimeout(hideTimer);
    spTooltip.classList.remove('visible');
    spTooltip.setAttribute('aria-hidden', 'true');
  }

  // El tooltip es position:fixed; si la página hace scroll (p. ej. al agotar
  // el scroll interno de la bio) el cursor nunca dispara mouseleave, así que
  // se cierra de inmediato en cuanto se detecta scroll de la página.
  window.addEventListener('scroll', hideTooltipNow, { passive: true });

  function positionTooltip(e) {
    const gap = 18;
    const w = spTooltip.offsetWidth  || 360;
    const h = spTooltip.offsetHeight || 240;
    let y = e.clientY - h - gap;
    if (y < 8) y = 8;
    let x = e.clientX - w / 2;
    if (x < 8) x = 8;
    if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8;
    spTooltip.style.left = x + 'px';
    spTooltip.style.top  = y + 'px';
  }

  document.querySelectorAll('.speaker-card[data-bio]').forEach(card => {
    card.style.cursor = 'pointer';

    card.addEventListener('mouseenter', e => {
      clearTimeout(hideTimer);
      const avatarEl = card.querySelector('.sp-avatar');
      const color    = getComputedStyle(avatarEl).getPropertyValue('--c').trim() || '#1e3a5f';
      const imgEl    = avatarEl.querySelector('.sp-avatar-img');
      sptAvatar.style.background = color;
      if (imgEl) {
        sptAvatar.innerHTML = `<img src="${imgEl.src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`;
      } else {
        sptAvatar.textContent = avatarEl.textContent.trim();
      }
      sptName.textContent = card.dataset.name;
      sptRole.textContent = card.dataset.role;
      sptBio.textContent  = card.dataset.bio;
      sptTag.textContent  = card.dataset.tag;
      positionTooltip(e);
      spTooltip.classList.add('visible');
      spTooltip.setAttribute('aria-hidden', 'false');
    });

    card.addEventListener('mousemove', e => {
      if (!spTooltip.matches(':hover')) positionTooltip(e);
    });

    card.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(hideTooltipNow, 200);
    });
  });

  spTooltip.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  spTooltip.addEventListener('mouseleave', () => {
    hideTimer = setTimeout(hideTooltipNow, 200);
  });
}());

/* Carrusel Ponentes */
(function () {
  const track   = document.getElementById('speakersTrack');
  const dotsEl  = document.getElementById('spCarrDots');
  const prevBtn = document.querySelector('.sp-carr-prev');
  const nextBtn = document.querySelector('.sp-carr-next');
  if (!track || !dotsEl) return;

  const viewport = track.parentElement; // .speakers-carousel (overflow:hidden)
  const cards = Array.from(track.querySelectorAll('.sp-carr-card'));
  const total = cards.length;
  const GAP = 24;
  let current = 0;

  function visibleCount() {
    if (window.innerWidth < 560) return 1;
    if (window.innerWidth < 900) return 2;
    return 3;
  }

  function cardW() {
    const vis = visibleCount();
    return (viewport.getBoundingClientRect().width - GAP * (vis - 1)) / vis;
  }

  function setWidths() {
    const w = cardW();
    cards.forEach(c => { c.style.flex = `0 0 ${w}px`; });
  }

  const dots = cards.map((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'sp-carr-dot';
    btn.setAttribute('aria-label', `Ir a ponente ${i + 1}`);
    btn.addEventListener('click', () => { goTo(i); startAuto(); });
    dotsEl.appendChild(btn);
    return btn;
  });

  function goTo(idx) {
    const vis = visibleCount();
    const max = Math.max(0, total - vis);
    current = Math.max(0, Math.min(idx, max));
    const w = cardW();
    track.style.transform = `translateX(-${current * (w + GAP)}px)`;
    const center = current + Math.floor(vis / 2);
    cards.forEach((c, i) => c.classList.toggle('sp-active', i === center));
    dots.forEach((d, i) => d.classList.toggle('sp-dot-active', i === current));
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current >= max;
  }

  let autoTimer;

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => {
      const vis = visibleCount();
      const max = Math.max(0, total - vis);
      goTo(current >= max ? 0 : current + 1);
    }, 3500);
  }

  function stopAuto() { clearInterval(autoTimer); }

  prevBtn && prevBtn.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
  nextBtn && nextBtn.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });

  window.addEventListener('resize', () => { setWidths(); goTo(current); });

  /* Pausa al pasar el cursor sobre el carrusel o los botones */
  const pauseTargets = [viewport, prevBtn, nextBtn].filter(Boolean);
  pauseTargets.forEach(el => {
    el.addEventListener('mouseenter', stopAuto);
    el.addEventListener('mouseleave', startAuto);
  });

  const section = document.getElementById('ponentes');
  if (section && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries[0].isIntersecting ? startAuto() : stopAuto();
    }, { threshold: 0.2 }).observe(section);
  } else {
    startAuto();
  }

  setWidths();
  goTo(0);
}());

/* Revelado galería: texto entra desde la izquierda, imágenes desde la derecha */
(function () {
  const intro  = document.querySelector('.galeria-intro');
  const bubble = document.querySelector('.galeria-bubble');
  const targets = [intro, bubble].filter(Boolean);
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('in-view'));
    return;
  }

  const galeriaObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      entry.target.classList.toggle('in-view', entry.isIntersecting);
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(el => galeriaObserver.observe(el));
}());

/* Galería burbuja */
(function () {
  const bg = document.getElementById('bubbleBg');
  if (!bg) return;

  const slides = [
    { src: 'images/001.png', title: 'iEXTD 2025',     desc: 'Inauguración y firma de convenios.' },
    { src: 'images/002.jpg', title: 'Talleres',        desc: 'Sesiones prácticas con herramientas de IA.' },
    { src: 'images/003.jpg', title: 'Conferencias',    desc: 'Ponentes de Microsoft, Adobe y más.' },
    { src: 'images/001.png', title: 'Networking',      desc: 'Conexiones entre universidades Anáhuac.' },
    { src: 'images/002.jpg', title: 'Innovación',      desc: 'IA, educación y transformación digital.' },
    { src: 'images/003.jpg', title: 'Comunidad',       desc: 'Más de 100 asistentes de la Red Anáhuac.' },
    { src: 'images/001.png', title: 'Ciberseguridad',  desc: 'Higiene digital y protección institucional.' },
    { src: 'images/002.jpg', title: 'Clausura',        desc: 'Ceremonia y entrega de constancias.' },
  ];

  const n        = slides.length;
  const circles  = Array.from(document.querySelectorAll('.bubble-circle'));
  const dotsWrap = document.getElementById('bubbleDots');
  const titleEl  = document.querySelector('.bubble-title');
  const descEl   = document.querySelector('.bubble-desc');
  let current    = 0;
  let autoTimer;

  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'bdot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => { goTo(i); resetAuto(); });
    dotsWrap.appendChild(dot);
  });

  function goTo(idx) {
    current = (idx + n) % n;
    bg.style.backgroundImage = `url('${slides[current].src}')`;
    if (titleEl) titleEl.textContent = slides[current].title;
    if (descEl)  descEl.textContent  = slides[current].desc;
    circles.forEach((circle, i) => {
      const adj = (current + i + 1) % n;
      circle.querySelector('img').src = slides[adj].src;
      circle.dataset.idx = adj;
    });
    dotsWrap.querySelectorAll('.bdot').forEach((d, i) => d.classList.toggle('active', i === current));
  }

  circles.forEach(circle => {
    circle.addEventListener('click', () => { goTo(+circle.dataset.idx); resetAuto(); });
  });

  document.querySelector('.bubble-prev').addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  document.querySelector('.bubble-next').addEventListener('click', () => { goTo(current + 1); resetAuto(); });

  function startAuto() { autoTimer = setInterval(() => goTo(current + 1), 4000); }
  function resetAuto() { clearInterval(autoTimer); startAuto(); }

  goTo(0);
  startAuto();

  let touchStartX = 0;
  bg.parentElement.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  bg.parentElement.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { goTo(diff > 0 ? current + 1 : current - 1); resetAuto(); }
  });
}());

/* Partículas galería burbuja */

/* Guía de llegada — modal (fondo translúcido, página visible detrás) */
(function () {
  const link     = document.getElementById('verGuiaLlegadaLink');
  const modal    = document.getElementById('llegadaModal');
  const closeBtn = document.getElementById('guideClose');
  if (!link || !modal || !closeBtn) return;

  function openGuideModal() {
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeGuideModal() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  link.addEventListener('click', e => {
    e.preventDefault();
    openGuideModal();
  });

  closeBtn.addEventListener('click', closeGuideModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closeGuideModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeGuideModal();
  });
}());

/* Modal de video — Infografía Turismo */
(function () {
  const trigger = document.getElementById('hospTurismoBtn');
  const modal   = document.getElementById('videoModal');
  if (!trigger || !modal) return;

  const closeBtn = document.getElementById('videoClose');
  const player   = document.getElementById('videoModalPlayer');

  function openVideoModal() {
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    player.currentTime = 0;
    player.play().catch(() => {});
  }

  function closeVideoModal() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    player.pause();
  }

  trigger.addEventListener('click', openVideoModal);
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openVideoModal();
    }
  });
  closeBtn.addEventListener('click', closeVideoModal);
  modal.addEventListener('click', e => {
    if (e.target === modal) closeVideoModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeVideoModal();
  });

  modal.querySelectorAll('.video-hotspot').forEach(spot => {
    spot.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = spot.classList.contains('is-open');
      modal.querySelectorAll('.video-hotspot.is-open').forEach(o => o.classList.remove('is-open'));
      if (!wasOpen) spot.classList.add('is-open');
    });
  });
}());

/* Modal de video — Infografía Gastronomía */
(function () {
  const trigger = document.getElementById('hospGastronomiaBtn');
  const modal   = document.getElementById('videoModalGastronomia');
  if (!trigger || !modal) return;

  const closeBtn = document.getElementById('videoCloseGastronomia');
  const player   = document.getElementById('videoModalPlayerGastronomia');

  function openVideoModal() {
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    player.currentTime = 0;
    player.play().catch(() => {});
  }

  function closeVideoModal() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    player.pause();
  }

  trigger.addEventListener('click', openVideoModal);
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openVideoModal();
    }
  });
  closeBtn.addEventListener('click', closeVideoModal);
  modal.addEventListener('click', e => {
    if (e.target === modal) closeVideoModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeVideoModal();
  });

  modal.querySelectorAll('.video-hotspot').forEach(spot => {
    spot.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = spot.classList.contains('is-open');
      modal.querySelectorAll('.video-hotspot.is-open').forEach(o => o.classList.remove('is-open'));
      if (!wasOpen) spot.classList.add('is-open');
    });
  });
}());

// COUNTDOWN AL EVENTO
(function initCountdown() {
  const wrap = document.getElementById('heroCountdown');
  if (!wrap) return;

  const targetTime  = new Date('2026-09-28T08:00:00-06:00').getTime();
  const elDays      = document.getElementById('cdDays');
  const elHours     = document.getElementById('cdHours');
  const elMinutes   = document.getElementById('cdMinutes');
  const elSeconds   = document.getElementById('cdSeconds');
  const elLabel     = wrap.querySelector('.countdown-label');
  const elGrid      = wrap.querySelector('.countdown-grid');

  const pad = n => String(n).padStart(2, '0');
  const daysBox    = elDays.parentElement;
  const hoursBox   = elHours.parentElement;
  const minutesBox = elMinutes.parentElement;
  const secondsBox = elSeconds.parentElement;

  const SHARD_DIRS = [
    { cls: 'shard-tl', tx: '-16px', ty: '-24px', rot: '-25deg' },
    { cls: 'shard-tr', tx: '16px',  ty: '-24px', rot: '25deg' },
    { cls: 'shard-r',  tx: '26px',  ty: '2px',   rot: '20deg' },
    { cls: 'shard-br', tx: '16px',  ty: '26px',  rot: '25deg' },
    { cls: 'shard-bl', tx: '-16px', ty: '26px',  rot: '-25deg' },
    { cls: 'shard-l',  tx: '-26px', ty: '2px',   rot: '-20deg' },
  ];

  function shatterDigit(box, valueEl, newText) {
    const oldText = valueEl.textContent;

    SHARD_DIRS.forEach((d, i) => {
      const shard = document.createElement('span');
      shard.className = `countdown-num countdown-shard ${d.cls}`;
      shard.textContent = oldText;
      shard.style.setProperty('--tx', d.tx);
      shard.style.setProperty('--ty', d.ty);
      shard.style.setProperty('--rot', d.rot);
      shard.style.animationDelay = (i * 12) + 'ms';
      shard.addEventListener('animationend', () => shard.remove());
      box.appendChild(shard);
    });

    valueEl.textContent = newText;
    valueEl.classList.remove('enter');
    void valueEl.offsetWidth;
    valueEl.classList.add('enter');
  }

  let timer;

  function tick() {
    const diff = targetTime - Date.now();

    if (diff <= 0) {
      elLabel.textContent = '¡El evento ha comenzado!';
      elGrid.style.display = 'none';
      clearInterval(timer);
      return;
    }

    const days    = pad(Math.floor(diff / 86400000));
    const hours   = pad(Math.floor((diff % 86400000) / 3600000));
    const minutes = pad(Math.floor((diff % 3600000) / 60000));
    const secs    = pad(Math.floor((diff % 60000) / 1000));

    if (elDays.textContent !== days) {
      shatterDigit(daysBox, elDays, days);
    }
    if (elHours.textContent !== hours) {
      shatterDigit(hoursBox, elHours, hours);
    }
    if (elMinutes.textContent !== minutes) {
      shatterDigit(minutesBox, elMinutes, minutes);
    }
    if (elSeconds.textContent !== secs) {
      shatterDigit(secondsBox, elSeconds, secs);
    }
  }

  tick();
  timer = setInterval(tick, 1000);
}());
