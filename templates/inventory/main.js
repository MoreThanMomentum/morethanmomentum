/**
 * {{BUSINESS_NAME}} — Main JavaScript
 * main.js
 *
 * Table of Contents:
 * 01. DOMContentLoaded Init
 * 02. Scroll Progress Bar
 * 03. Navigation — Sticky Scroll Behavior
 * 04. Navigation — Mobile Hamburger Menu
 * 05. Typewriter Headline Effect
 * 06. Hero — Particle Canvas Animation
 * 07. Scroll Reveal Animations (IntersectionObserver)
 * 08. Stat Counter Animation
 * 09. Lead Form — Validation & Submission
 * 10. Footer — Dynamic Year
 * 11. Smooth Scroll for Anchor Links
 * 12. Utility Functions
 * 13. Shop Page — Cart Filter System
 * 14. Phone CTA — Desktop Call Prompt
 * 15. Cart Photo Gallery — Lightbox
 */


/* ============================================================
   01. DOMContentLoaded Init
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initActiveNav();
  initScrollProgress();
  initNav();
  initMobileMenu();
  initTypewriter();
  initParticles();
  initScrollReveal();
  initStatCounters();
  initLeadForm();
  initFooterYear();
  initSmoothScroll();
  initShopFilters();
  initCallPrompt();
  initCartGallery();
});


/* ============================================================
   00. Active Nav — Auto-detect current page and highlight link
============================================================ */
function initActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    link.removeAttribute('aria-current');
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}


/* ============================================================
   02. Scroll Progress Bar
   Gold bar across the top fills as user scrolls the page
============================================================ */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;

  const update = () => {
    const scrollTop  = window.scrollY;
    const docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    const progress   = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width  = `${Math.min(progress, 100)}%`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}


/* ============================================================
   03. Navigation — Sticky Scroll Behavior
============================================================ */
function initNav() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const SCROLL_THRESHOLD = 50;

  const handleScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > SCROLL_THRESHOLD);
  };

  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });
}


/* ============================================================
   04. Navigation — Mobile Hamburger Menu
============================================================ */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');
  if (!hamburger || !navLinks) return;

  const openMenu = () => {
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    navLinks.classList.add('mobile-open');
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('mobile-open');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', () => {
    navLinks.classList.contains('mobile-open') ? closeMenu() : openMenu();
  });

  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('mobile-open')) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) closeMenu();
  });
}


/* ============================================================
   05. Typewriter Headline Effect
   Cycles through {{BUSINESS_NAME_SHORT}} tagline phrases in the hero headline
============================================================ */
function initTypewriter() {
  const el = document.getElementById('typewriter-text');
  if (!el) return;

  const phrases = JSON.parse('{{TYPEWRITER_PHRASES_JSON}}');

  let phraseIndex  = 0;
  let charIndex    = 0;
  let isDeleting   = false;
  let isPaused     = false;

  const TYPE_SPEED   = 60;   // ms per character when typing
  const DELETE_SPEED = 35;   // ms per character when deleting
  const PAUSE_AFTER  = 2200; // ms to hold a completed phrase

  const tick = () => {
    const currentPhrase = phrases[phraseIndex];

    if (isPaused) {
      isPaused = false;
      isDeleting = true;
      setTimeout(tick, DELETE_SPEED);
      return;
    }

    if (isDeleting) {
      charIndex--;
      el.textContent = currentPhrase.slice(0, charIndex);

      if (charIndex === 0) {
        isDeleting  = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setTimeout(tick, 400); // pause before next phrase
        return;
      }

      setTimeout(tick, DELETE_SPEED);
    } else {
      charIndex++;
      el.textContent = currentPhrase.slice(0, charIndex);

      if (charIndex === currentPhrase.length) {
        isPaused = true;
        setTimeout(tick, PAUSE_AFTER);
        return;
      }

      setTimeout(tick, TYPE_SPEED);
    }
  };

  // Start with a slight delay so the page renders first
  setTimeout(tick, 800);
}


/* ============================================================
   06. Hero — Particle Canvas Animation
   Floating gold + white dots in the hero background
============================================================ */
function initParticles() {
  const canvas = document.getElementById('hero-particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;

  // Resize canvas to fill hero section
  const resize = () => {
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
    buildParticles();
  };

  // Build a fresh particle array
  const buildParticles = () => {
    const count = Math.floor((canvas.width * canvas.height) / 18000); // density
    particles = Array.from({ length: Math.min(count, 60) }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      radius:  Math.random() * 1.5 + 0.4,
      // Gold or dim white
      color:   Math.random() > 0.6 ? 'rgba(201,168,76,' : 'rgba(255,255,255,',
      opacity: Math.random() * 0.35 + 0.05,
      speedX:  (Math.random() - 0.5) * 0.25,
      speedY:  (Math.random() - 0.5) * 0.18,
      drift:   Math.random() * Math.PI * 2, // for gentle sine drift
    }));
  };

  const draw = (timestamp) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      // Gentle sine drift
      p.drift += 0.008;
      p.x += p.speedX + Math.sin(p.drift) * 0.12;
      p.y += p.speedY;

      // Wrap around edges
      if (p.x < -5)             p.x = canvas.width  + 5;
      if (p.x > canvas.width + 5) p.x = -5;
      if (p.y < -5)             p.y = canvas.height + 5;
      if (p.y > canvas.height + 5) p.y = -5;

      // Twinkle
      p.opacity += (Math.random() - 0.5) * 0.01;
      p.opacity = Math.max(0.03, Math.min(0.4, p.opacity));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color + p.opacity + ')';
      ctx.fill();
    });

    animationId = requestAnimationFrame(draw);
  };

  // Pause animation when tab is hidden (performance)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      animationId = requestAnimationFrame(draw);
    }
  });

  window.addEventListener('resize', debounce(resize, 250));
  resize();
  animationId = requestAnimationFrame(draw);
}


/* ============================================================
   07. Scroll Reveal Animations (IntersectionObserver)
============================================================ */
function initScrollReveal() {
  const elements = document.querySelectorAll('[data-animate]');
  if (!elements.length) return;

  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delayMs = entry.target.dataset.delay;
        if (delayMs) entry.target.style.transitionDelay = `${delayMs}ms`;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

  elements.forEach(el => observer.observe(el));
}


/* ============================================================
   08. Stat Counter Animation
============================================================ */
function initStatCounters() {
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  if (!statNumbers.length) return;

  if (!('IntersectionObserver' in window)) {
    statNumbers.forEach(el => { el.textContent = el.dataset.target; });
    return;
  }

  const DURATION = 1800;

  const animateCount = (el, target) => {
    const isDecimal = target % 1 !== 0;
    const start = performance.now();

    const step = (timestamp) => {
      const elapsed  = timestamp - start;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = eased * target;

      el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current).toString();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = isDecimal ? target.toFixed(1) : target.toString();
      }
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        statNumbers.forEach(el => animateCount(el, parseFloat(el.dataset.target)));
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  const statsBar = document.querySelector('.stats-bar');
  if (statsBar) observer.observe(statsBar);
}


/* ============================================================
   09. Lead Form — Validation & Submission
============================================================ */
function initLeadForm() {
  const form       = document.getElementById('hero-lead-form');
  const successDiv = document.getElementById('form-success');
  if (!form) return;

  /**
   * Validates a single field and shows inline error if invalid
   */
  const validateField = (field) => {
    // Checkbox — check .checked, not .value
    if (field.type === 'checkbox') {
      const isValid  = field.checked;
      field.classList.toggle('error', !isValid);
      const formGroup = field.closest('.form-group');
      let errorEl = formGroup ? formGroup.querySelector('.form-error-msg') : null;
      if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.classList.add('form-error-msg');
        if (formGroup) formGroup.appendChild(errorEl);
      }
      errorEl.textContent = isValid ? '' : 'Please check this box to continue.';
      errorEl.classList.toggle('visible', !isValid);
      return isValid;
    }

    const value = field.value.trim();
    let isValid  = true;
    let errorMsg = '';

    if (field.required && !value) {
      isValid = false; errorMsg = 'This field is required.';
    } else if (field.type === 'email' && value) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        isValid = false; errorMsg = 'Please enter a valid email address.';
      }
    } else if (field.type === 'tel' && value) {
      if (value.replace(/\D/g, '').length < 10) {
        isValid = false; errorMsg = 'Please enter a valid phone number.';
      }
    }

    field.classList.toggle('error', !isValid);

    let errorEl = field.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains('form-error-msg')) {
      errorEl = document.createElement('p');
      errorEl.classList.add('form-error-msg');
      field.parentNode.insertBefore(errorEl, field.nextSibling);
    }
    errorEl.textContent = errorMsg;
    errorEl.classList.toggle('visible', !isValid);

    return isValid;
  };

  // Live validation
  form.querySelectorAll('input, select').forEach(field => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.classList.contains('error')) validateField(field);
    });
    // Checkboxes fire 'change', not 'input'
    if (field.type === 'checkbox') {
      field.addEventListener('change', () => validateField(field));
    }
  });

  // Phone auto-format: (xxx) xxx-xxxx
  const phoneField = document.getElementById('phone');
  if (phoneField) {
    phoneField.addEventListener('input', (e) => {
      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
      let formatted = digits;
      if (digits.length >= 7)      formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
      else if (digits.length >= 4) formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
      else if (digits.length >= 1) formatted = `(${digits}`;
      e.target.value = formatted;
    });
  }

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fields   = form.querySelectorAll('input[required], select[required]');
    let   allValid = true;
    fields.forEach(f => { if (!validateField(f)) allValid = false; });
    if (!allValid) return;

    const formData = {
      name:      document.getElementById('name').value.trim(),
      phone:     document.getElementById('phone').value.trim(),
      email:     document.getElementById('email').value.trim(),
      interest:  document.getElementById('interest').value,
      source:    'Homepage Lead Form',
      timestamp: new Date().toISOString(),
    };

    const submitBtn  = form.querySelector('button[type="submit"]');
    const originalTxt = submitBtn.textContent;

    try {
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Sending...';

      // -------------------------------------------------------
      // GHL WEBHOOK — replace the URL below with your actual
      // GoHighLevel inbound webhook URL before going live.
      // Format: https://services.leadconnectorhq.com/hooks/YOUR_LOCATION_ID/webhook-trigger/YOUR_HOOK_ID
      // -------------------------------------------------------
      const GHL_WEBHOOK = 'YOUR_GHL_WEBHOOK_URL_HERE';

      if (GHL_WEBHOOK === 'YOUR_GHL_WEBHOOK_URL_HERE') {
        // Development mode: log to console until webhook is set
        console.warn('[{{LOG_PREFIX}}] GHL webhook not yet configured. Form data (not submitted):', formData);
      } else {
        await fetch(GHL_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      form.style.display = 'none';
      successDiv.classList.add('visible');
      console.log('[{{LOG_PREFIX}}] Lead submitted:', formData);

    } catch (error) {
      submitBtn.disabled    = false;
      submitBtn.textContent = originalTxt;
      console.error('[{{LOG_PREFIX}}] Form error:', error);

      let errEl = form.querySelector('.form-general-error');
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.className = 'form-general-error';
        errEl.style.cssText = 'color:#DC2626; font-size:0.82rem; text-align:center; margin-top:0.5rem;';
        form.appendChild(errEl);
      }
      errEl.textContent = 'Something went wrong. Please call us at {{PHONE}}.';
    }
  });
}


/* ============================================================
   10. Footer — Dynamic Year
============================================================ */
function initFooterYear() {
  const el = document.getElementById('current-year');
  if (el) el.textContent = new Date().getFullYear();
}


/* ============================================================
   11. Smooth Scroll for Anchor Links
============================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault();

      const navHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-height'), 10
      ) || 72;

      window.scrollTo({
        top:      targetEl.getBoundingClientRect().top + window.scrollY - navHeight - 16,
        behavior: 'smooth',
      });
    });
  });
}


/* ============================================================
   12. Utility Functions
============================================================ */

/**
 * Escape HTML to prevent XSS in dynamic content
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

/**
 * Debounce: delays execution until after rapid events stop
 */
function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Throttle: runs function at most once per interval
 */
function throttle(fn, interval) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= interval) { lastCall = now; fn(...args); }
  };
}

/**
 * Delay: simple promise-based wait (for dev simulation)
 * REMOVE calls to this in production
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/* ============================================================
   13. Shop Page — Cart Filter System
============================================================ */
function initShopFilters() {
  const filterBtns = document.querySelectorAll('[data-filter]');
  const cartCards  = document.querySelectorAll('[data-seats]');
  if (!filterBtns.length || !cartCards.length) return;

let activeSeats     = 'all';
  let activeType      = 'all';
  let activeCondition = 'all';

  const applyFilters = () => {
    let visibleCount     = 0;
    let visibleUsedCount = 0;

    cartCards.forEach(card => {
      const seats     = card.dataset.seats;
      const type      = card.dataset.type;
      const condition = card.dataset.condition || 'new';
      const matchSeats     = activeSeats     === 'all' || seats     === activeSeats;
      const matchType      = activeType      === 'all' || type      === activeType  || type === 'used';
      const matchCondition = activeCondition === 'all' || condition === activeCondition;
      const show = matchSeats && matchType && matchCondition;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
      if (show && condition === 'used') visibleUsedCount++;
    });

    // Show/hide the used divider based on whether any used cards are visible
    const usedDivider = document.getElementById('used');
    if (usedDivider) usedDivider.style.display = visibleUsedCount > 0 ? '' : 'none';

    const noResults = document.getElementById('shop-no-results');
    if (noResults) noResults.style.display = visibleCount === 0 ? 'block' : 'none';
  };

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.filterGroup;
      const val   = btn.dataset.filter;

      // Update active state within the group
      document.querySelectorAll(`[data-filter-group="${group}"]`).forEach(b => {
        b.classList.toggle('filter-btn--active', b === btn);
      });

      if (group === 'seats')     activeSeats     = val;
      if (group === 'type')      activeType      = val;
      if (group === 'condition') activeCondition = val;

      applyFilters();
    });
  });
}


/* ============================================================
   14. Phone CTA — Desktop Call Prompt
============================================================ */
function initCallPrompt() {
  document.querySelectorAll('a[href="tel:{{PHONE_DIGITS}}"]').forEach(link => {
    link.addEventListener('click', (e) => {
      if (window.innerWidth >= 1024) {
        e.preventDefault();
        const confirmed = confirm('Call us at {{BUSINESS_NAME}}?\n\n📞 {{PHONE}}');
        if (confirmed) window.location.href = 'tel:{{PHONE_DIGITS}}';
      }
    });
  });
}


/* ============================================================
   15. Cart Photo Gallery — Lightbox
   Click any cart image to scroll through up to 8 photos.
   Works on shop.html and index.html featured carts.
   Supports keyboard arrows, Escape, and touch swipe.
============================================================ */
function initCartGallery() {
  if (document.getElementById('cart-lightbox')) return;

  // ---- Inject CSS ----
  const style = document.createElement('style');
  style.textContent = `
    #cart-lightbox {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.93);
    }
    #cart-lightbox.open { display: flex; }

    .lb-close {
      position: absolute;
      top: 18px; right: 22px;
      background: rgba(255,255,255,0.1);
      border: none; color: #fff;
      width: 42px; height: 42px;
      border-radius: 50%; font-size: 20px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
      z-index: 2;
    }
    .lb-close:hover { background: rgba(255,255,255,0.22); }

    .lb-img-wrap {
      max-width: min(92vw, 960px);
      max-height: 78vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #lb-img {
      max-width: 100%;
      max-height: 78vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 12px 60px rgba(0,0,0,0.7);
      transition: opacity 0.18s ease;
    }
    #lb-img.fading { opacity: 0; }

    .lb-nav {
      position: absolute;
      top: 50%; transform: translateY(-50%);
      background: rgba(255,255,255,0.1);
      border: none; color: #fff;
      width: 50px; height: 50px;
      border-radius: 50%; font-size: 30px; line-height: 1;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
      z-index: 2;
      user-select: none;
    }
    .lb-nav:hover { background: rgba(201,168,76,0.45); }
    .lb-nav.hidden { opacity: 0; pointer-events: none; }
    #lb-prev { left: 16px; }
    #lb-next { right: 16px; }

    .lb-dots {
      position: absolute;
      bottom: 22px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 9px;
    }
    .lb-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      border: none; cursor: pointer;
      padding: 0;
      transition: background 0.2s, transform 0.2s;
    }
    .lb-dot.active {
      background: #C9A84C;
      transform: scale(1.3);
    }
    #lb-counter {
      position: absolute;
      bottom: 22px; right: 22px;
      color: rgba(255,255,255,0.45);
      font-size: 12px;
      font-family: 'Open Sans', sans-serif;
    }

    /* Cursor cue on clickable cart images */
    .cart-img-wrap[data-photos] { cursor: zoom-in; }
    .cart-gallery-badge {
      position: absolute;
      bottom: 44px; right: 10px;
      background: rgba(0,0,0,0.62);
      color: #fff;
      font-size: 11px;
      font-family: 'Open Sans', sans-serif;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 20px;
      pointer-events: none;
      display: flex; align-items: center; gap: 4px;
    }
  `;
  document.head.appendChild(style);

  // ---- Build lightbox HTML ----
  const lb = document.createElement('div');
  lb.id = 'cart-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Cart photo gallery');
  lb.innerHTML = `
    <button class="lb-close" id="lb-close" aria-label="Close gallery">✕</button>
    <button class="lb-nav" id="lb-prev" aria-label="Previous photo">‹</button>
    <div class="lb-img-wrap">
      <img id="lb-img" src="" alt="" />
    </div>
    <button class="lb-nav" id="lb-next" aria-label="Next photo">›</button>
    <div class="lb-dots" id="lb-dots"></div>
    <div id="lb-counter"></div>
  `;
  document.body.appendChild(lb);

  // ---- State ----
  let photos      = [];
  let currentIdx  = 0;

  const img       = document.getElementById('lb-img');
  const dotsWrap  = document.getElementById('lb-dots');
  const counter   = document.getElementById('lb-counter');
  const prevBtn   = document.getElementById('lb-prev');
  const nextBtn   = document.getElementById('lb-next');

  // ---- Render current slide ----
  const render = () => {
    img.classList.add('fading');
    setTimeout(() => {
      img.src = photos[currentIdx] || '';
      img.alt = `Cart photo ${currentIdx + 1} of ${photos.length}`;
      img.classList.remove('fading');
    }, 90);

    counter.textContent = `${currentIdx + 1} / ${photos.length}`;
    prevBtn.classList.toggle('hidden', currentIdx === 0);
    nextBtn.classList.toggle('hidden', currentIdx === photos.length - 1);

    // Rebuild dots
    dotsWrap.innerHTML = '';
    if (photos.length > 1) {
      photos.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = `lb-dot${i === currentIdx ? ' active' : ''}`;
        dot.setAttribute('aria-label', `Photo ${i + 1}`);
        dot.addEventListener('click', () => { currentIdx = i; render(); });
        dotsWrap.appendChild(dot);
      });
    }
  };

  // ---- Open / Close ----
  const openGallery = (photoArr, startIdx = 0) => {
    photos     = photoArr.filter(Boolean);
    currentIdx = Math.max(0, Math.min(startIdx, photos.length - 1));
    if (!photos.length) return;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    render();
    lb.focus();
  };

  const closeGallery = () => {
    lb.classList.remove('open');
    document.body.style.overflow = '';
  };

  // ---- Controls ----
  document.getElementById('lb-close').addEventListener('click', closeGallery);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeGallery(); });

  prevBtn.addEventListener('click', () => {
    if (currentIdx > 0) { currentIdx--; render(); }
  });
  nextBtn.addEventListener('click', () => {
    if (currentIdx < photos.length - 1) { currentIdx++; render(); }
  });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape')      closeGallery();
    if (e.key === 'ArrowLeft'  && currentIdx > 0)              { currentIdx--; render(); }
    if (e.key === 'ArrowRight' && currentIdx < photos.length - 1) { currentIdx++; render(); }
  });

  // Touch swipe
  let touchStartX = 0;
  lb.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const dx = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(dx) < 40) return;
    if (dx > 0 && currentIdx < photos.length - 1) { currentIdx++; render(); }
    if (dx < 0 && currentIdx > 0)                 { currentIdx--; render(); }
  });

  // ---- Delegated click handler on cart image wraps ----
  document.addEventListener('click', (e) => {
    const wrap = e.target.closest('.cart-img-wrap[data-photos]');
    if (!wrap) return;
    try {
      const arr = JSON.parse(wrap.dataset.photos);
      if (Array.isArray(arr) && arr.length) openGallery(arr, 0);
    } catch (_) {}
  });

  // Expose globally so admin preview or other scripts can use it
  window._snh = window._snh || {};
  window._snh.openGallery = openGallery;
}
