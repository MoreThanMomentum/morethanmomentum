/* ============================================================
   MORE THAN MOMENTUM — script.js
   ============================================================ */

/* --- CURSOR (desktop / mouse only) --- */
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

if (!isTouchDevice) {
  const cursor        = document.getElementById('cursor');
  const ring          = document.getElementById('cursorRing');
  const cursorImg     = document.getElementById('cursor-img');
  const cursorRingImg = document.getElementById('cursor-ring-img');

  let mx = 0, my = 0;
  let rx = 0, ry = 0;
  let lastX = 0;
  let moveTimeout = null;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;

    if (mx > lastX) {
      if (cursorImg) cursorImg.style.transform = 'scaleX(1)';
      if (cursorRingImg) cursorRingImg.style.transform = 'scaleX(1)';
    } else if (mx < lastX) {
      if (cursorImg) cursorImg.style.transform = 'scaleX(-1)';
      if (cursorRingImg) cursorRingImg.style.transform = 'scaleX(-1)';
    }
    lastX = mx;

    ring.classList.add('moving');
    clearTimeout(moveTimeout);
    moveTimeout = setTimeout(() => {
      ring.classList.remove('moving');
    }, 150);

    const el = document.elementFromPoint(mx, my);
    let node = el;
    let isDark = false;

    while (node && node !== document.body) {
      const bg = window.getComputedStyle(node).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const rgb = bg.match(/\d+/g);
        if (rgb) {
          const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
          isDark = brightness < 128;
        }
        break;
      }
      node = node.parentElement;
    }

    const onServiceCard = !!el?.closest('.svc');
    const logoSrc = (!onServiceCard && isDark) ? 'images/whiteguylogo.png' : 'images/blackguylogo.png';
    if (cursorImg) cursorImg.src = logoSrc;
    if (cursorRingImg) cursorRingImg.src = logoSrc;
  });

  (function animCursor() {
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
    rx += (mx - rx) * 0.08;
    ry += (my - ry) * 0.08;
    ring.style.left = (rx - 20) + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animCursor);
  })();

  document.querySelectorAll('a, button, .nav-cta, .plan-cta, .btn-primary, .btn-ghost, .social-link, select').forEach(el => {
    el.addEventListener('mouseenter', () => { cursor.style.opacity = '0'; });
    el.addEventListener('mouseleave', () => { cursor.style.opacity = '1'; });
  });
}


/* --- NAV SCROLL ---
 * On the home page (has .hero): transparent at top, solid when scrolled.
 * On all inner pages (no .hero): always show as scrolled (solid nav).
 */
const hasHero = !!document.querySelector('.hero');

function updateNav() {
  const isScrolled = !hasHero || scrollY > 60;

  document.getElementById('nav').classList.toggle('scrolled', isScrolled);

  const logoImg = document.getElementById('nav-logo-img');
  if (logoImg) {
    logoImg.src = isScrolled ? 'images/blackguylogo.png' : 'images/whiteguylogo.png';
    logoImg.style.opacity = '1';
    logoImg.style.filter = 'none';
  }

  const navCta = document.querySelector('.nav-cta');
  if (navCta) {
    navCta.style.background = isScrolled ? '#0c0c0c' : '#2D6BE4';
    const scanLight = navCta.querySelector('.scan-light');
    if (scanLight) {
      scanLight.style.display = isScrolled ? 'none' : 'block';
    }
  }

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.style.color = isScrolled ? '#0c0c0c' : '#ffffff';
  });

  const navLogoText = document.querySelector('.nav-logo-text');
  if (navLogoText) {
    navLogoText.style.color = isScrolled ? '#0c0c0c' : '#ffffff';
  }
}

window.addEventListener('scroll', updateNav);
window.addEventListener('load', updateNav);


/* --- HAMBURGER MENU --- */
const hamburger      = document.getElementById('navHamburger');
const mobileNav      = document.getElementById('navMobile');
const mobileClose    = document.getElementById('navMobileClose');
const mobileBackdrop = document.getElementById('navMobileBackdrop');

function openMobileNav() {
  if (!hamburger || !mobileNav) return;
  hamburger.classList.add('open');
  mobileNav.classList.add('open');
  if (mobileBackdrop) mobileBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  if (!hamburger || !mobileNav) return;
  hamburger.classList.remove('open');
  mobileNav.classList.remove('open');
  if (mobileBackdrop) mobileBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}

if (hamburger) hamburger.addEventListener('click', openMobileNav);
if (mobileClose) mobileClose.addEventListener('click', closeMobileNav);
if (mobileBackdrop) mobileBackdrop.addEventListener('click', closeMobileNav);

window.addEventListener('resize', () => {
  closeMobileNav();
  updateNav();
});

document.querySelectorAll('.nav-mobile-link, .nav-mobile-cta').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});



/* --- SCROLL REVEAL (robust: no-flash on load, smooth on scroll) --- */
function revealEl(el, instant) {
  if (instant) {
    /* Skip transition for elements already in view on load */
    el.style.transition = 'none';
    el.classList.add('visible');
    /* Re-enable transition after paint so future interactions still animate */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.transition = ''; });
    });
  } else {
    el.classList.add('visible');
  }
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => revealEl(entry.target, false), i * 70);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });

/* Immediately reveal anything in viewport on load — no transition */
function revealInViewport() {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      revealEl(el, true);
    } else {
      revealObserver.observe(el);
    }
  });
}

/* Run as early as possible, then again after full load */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', revealInViewport);
} else {
  revealInViewport();
}
window.addEventListener('load', revealInViewport);





/* --- CONTACT FORM (Formspree) --- */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mgopveve';

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('.form-submit');

    if (btn.disabled) return;

    btn.textContent = 'Sending…';
    btn.disabled = true;

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: new FormData(this),
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        btn.textContent = 'Message Sent ✓';
        btn.style.background = '#1a3a1a';
        this.reset();
        setTimeout(() => {
          btn.textContent = 'Send Message';
          btn.style.background = '';
          btn.disabled = false;
        }, 4500);
      } else {
        const data = await response.json();
        const errMsg = data?.errors?.[0]?.message || 'Submission failed';
        throw new Error(errMsg);
      }
    } catch (err) {
      console.error('Form error:', err);
      btn.textContent = 'Error — please try again';
      btn.style.background = '#3a1a1a';
      setTimeout(() => {
        btn.textContent = 'Send Message';
        btn.style.background = '';
        btn.disabled = false;
      }, 3500);
    }
  });
}


/* --- FLOATING PARTICLES --- */
function initParticles(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const particles = [];

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn() {
    return {
      x:          Math.random() * canvas.width,
      y:          canvas.height + Math.random() * 30,
      size:       Math.random() * 2 + 1,
      speed:      Math.random() * 0.45 + 0.25,
      maxOpacity: Math.random() * 0.5 + 0.15,
      drift:      (Math.random() - 0.5) * 0.25,
    };
  }

  for (let i = 0; i < 30; i++) {
    const p = spawn();
    p.y = Math.random() * canvas.height;
    particles.push(p);
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (particles.length < 40 && Math.random() < 0.04) {
      particles.push(spawn());
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.y -= p.speed;
      p.x += p.drift;

      const fadeZone = canvas.height * 0.30;
      let opacity = p.maxOpacity;
      if (p.y < fadeZone) {
        opacity = p.maxOpacity * (p.y / fadeZone);
      }

      if (opacity <= 0.01) {
        particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(45, 107, 228, ${opacity})`;
      ctx.fill();
    }

    requestAnimationFrame(animate);
  }

  animate();
}

window.addEventListener('load', () => {
  initParticles('particles-hero');
  initParticles('particles-about');
  initParticles('particles-pricing');
  initParticles('particles-contact');
});


/* --- 3D VIDEO CAROUSEL --- */
function initVideoCarousel() {
  const track = document.getElementById('videoTrack');
  if (!track) return;
  track.innerHTML = '';
  track.style.width = '';
  track.style.transform = '';

  const videos = [
    { num: '01', client: 'Quantum · Consulting Content', title: 'Motion Graphics to Engage Viewers', src: 'videos/quantum1.mp4' },
    { num: '02', client: 'mattadamsonlive · Magic Content', title: 'Filmed On Site and Edited to Grow Audience Engagement', src: 'videos/FishHook1.mp4' },
    { num: '03', client: 'Outpace · Business Content', title: 'Ai B-Roll Generated For Simplifying Video Creation', src: 'videos/Outpaceskit1.mp4' },
    { num: '04', client: 'Diplomat Cigar Lounge · Promo Content', title: 'Script Created and Filmed On Site', src: 'videos/diplomat1.mp4' },
    { num: '05', client: 'colesblanco · Running Content', title: '900K+ Views — Proven Hook and Script Provided', src: 'videos/Stravarunnames1.mp4' },
    { num: '06', client: 'BaxterGaming · Gaming Content', title: 'Short Form Content Extracted From Long Form Content', src: 'videos/squidgames1.mp4' },
  ];

  const STATES = {
    entering: { tx: '-680px', tz: '-280px', ry: '65deg',  scale: 0.62, opacity: 0,   zi: 1 },
    left:     { tx: '-310px', tz: '-160px', ry: '42deg',  scale: 0.86, opacity: 0.7, zi: 3 },
    center:   { tx: '0px',   tz: '0px',    ry: '0deg',   scale: 1,    opacity: 1,   zi: 5 },
    right:    { tx: '310px', tz: '-160px', ry: '-42deg', scale: 0.86, opacity: 0.7, zi: 3 },
    exiting:  { tx: '680px', tz: '-280px', ry: '-65deg', scale: 0.62, opacity: 0,   zi: 1 },
  };

  function applyState(el, stateName, animate) {
    const s = STATES[stateName];
    el.style.transition = animate
      ? 'transform 0.88s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.88s ease'
      : 'none';
    el.style.transform = `translateX(${s.tx}) translateZ(${s.tz}) rotateY(${s.ry}) scale(${s.scale})`;
    el.style.opacity = s.opacity;
    el.style.zIndex  = s.zi;
    el.dataset.state = stateName;
  }

  function createSlot(v, stateName) {
    const div = document.createElement('div');
    div.className = 'video-slot-3d';
    div.innerHTML = v.src
      ? `<video src="${v.src}" autoplay muted loop playsinline></video>
         <div class="video-overlay"><div><div class="video-client">${v.client}</div><div class="video-title">${v.title}</div></div></div>`
      : `<div class="video-placeholder">
           <div class="video-placeholder-num">${v.num}</div>
           <div class="video-placeholder-label">Your video here</div>
         </div>
         <div class="video-overlay"><div><div class="video-client">${v.client}</div><div class="video-title">${v.title}</div></div></div>`;

    div.addEventListener('click', () => {
      const vid = div.querySelector('video');
      if (!vid) return;
      clearInterval(autoTimer);
      window._openVideoLightbox(vid, v.client, v.title);
      const waitForClose = setInterval(() => {
        const lb = document.getElementById('videoLightbox');
        if (lb && parseFloat(lb.style.opacity) === 0) {
          clearInterval(waitForClose);
          autoTimer = setInterval(() => advance('next'), 5000);
        }
      }, 400);
    });

    applyState(div, stateName, false);
    return div;
  }

  const n = videos.length;
  let centerIndex = 1;

  function getVideo(idx) {
    return videos[((idx % n) + n) % n];
  }

  const leftSlot   = createSlot(getVideo(centerIndex - 1), 'left');
  const centerSlot = createSlot(getVideo(centerIndex),     'center');
  const rightSlot  = createSlot(getVideo(centerIndex + 1), 'right');
  track.appendChild(leftSlot);
  track.appendChild(centerSlot);
  track.appendChild(rightSlot);

  let animating = false;

  function advance(direction) {
    if (animating) return;
    animating = true;

    if (direction === 'next') {
      centerIndex = ((centerIndex - 1) + n) % n;
      const entering = createSlot(getVideo(centerIndex - 1), 'entering');
      track.insertBefore(entering, track.firstChild);
      entering.offsetHeight;
      const stateOrder = ['left', 'center', 'right', 'exiting'];
      Array.from(track.children).forEach((slot, i) => applyState(slot, stateOrder[i], true));
    } else {
      centerIndex = (centerIndex + 1) % n;
      const entering = createSlot(getVideo(centerIndex + 1), 'exiting');
      entering.style.transition = 'none';
      entering.style.transform = `translateX(680px) translateZ(-280px) rotateY(-65deg) scale(0.62)`;
      entering.style.opacity = '0';
      entering.style.zIndex = '1';
      entering.dataset.state = 'entering-rev';
      track.appendChild(entering);
      entering.offsetHeight;
      const slots = Array.from(track.children);
      applyState(slots[0], 'exiting', true);
      applyState(slots[1], 'left',    true);
      applyState(slots[2], 'center',  true);
      applyState(slots[3], 'right',   true);
    }

    setTimeout(() => {
      const dead = direction === 'next'
        ? track.querySelector('[data-state="exiting"]')
        : track.children[0];
      if (dead && dead.parentNode === track) track.removeChild(dead);
      animating = false;
    }, 920);
  }

  let autoTimer = setInterval(() => advance('next'), 5000);

  function resetTimer() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => advance('next'), 5000);
  }

  const btnPrev = document.getElementById('carouselPrev');
  const btnNext = document.getElementById('carouselNext');
  if (btnNext) btnNext.addEventListener('click', () => { advance('next'); resetTimer(); });
  if (btnPrev) btnPrev.addEventListener('click', () => { advance('prev'); resetTimer(); });

  let touchStartX = 0;
  let touchEndX   = 0;
  const SWIPE_THRESHOLD = 50;

  track.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        advance('next');
      } else {
        advance('prev');
      }
      resetTimer();
    }
  }, { passive: true });
}


/* --- VIDEO LIGHTBOX --- */
function initVideoLightbox() {
  const overlay = document.createElement('div');
  overlay.id = 'videoLightbox';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,0.92);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
    transition: opacity 0.35s ease;
    cursor: pointer;
  `;

  const cursorEl = document.getElementById('cursor');
  const ringEl   = document.getElementById('cursorRing');

  const inner = document.createElement('div');
  inner.style.cssText = `
    width: min(420px, 90vw);
    max-height: 85dvh;
    aspect-ratio: 9/16;
    border-radius: 14px;
    overflow: hidden;
    transform: scale(0.88);
    transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    cursor: default;
    position: relative;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute; top: 14px; right: 14px; z-index: 10;
    background: rgba(0,0,0,0.55); color: #fff;
    border: none; border-radius: 50%;
    width: 34px; height: 34px; font-size: 15px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
  `;
  closeBtn.addEventListener('mouseenter', () => {
    if (cursorEl) cursorEl.style.opacity = '1';
  });
  closeBtn.addEventListener('mouseleave', () => {
    if (cursorEl) cursorEl.style.opacity = '1';
  });

  overlay.appendChild(inner);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  let activeVideo = null;

  function openLightbox(originalVideo, client, title) {
    if (cursorEl) cursorEl.style.zIndex = '10001';
    if (ringEl)   ringEl.style.zIndex   = '10001';
    const clone = originalVideo.cloneNode(true);
    clone.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    clone.muted = false;
    clone.loop = true;
    clone.play();

    const infoOverlay = document.createElement('div');
    infoOverlay.style.cssText = `
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 2rem 1.4rem 1.4rem;
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
      opacity: 0; transition: opacity 0.3s ease;
      pointer-events: none;
    `;
    infoOverlay.innerHTML = `
      <div style="font-size:.68rem;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:.35rem;">${client || ''}</div>
      <div style="font-size:1rem;font-weight:500;color:#fff;line-height:1.3;">${title || ''}</div>
    `;

    inner.innerHTML = '';
    inner.appendChild(clone);
    inner.appendChild(infoOverlay);
    activeVideo = clone;

    inner.addEventListener('mouseenter', () => infoOverlay.style.opacity = '1');
    inner.addEventListener('mouseleave', () => infoOverlay.style.opacity = '0');

    overlay.style.pointerEvents = 'all';
    overlay.offsetHeight;
    overlay.style.opacity = '1';
    inner.style.transform = 'scale(1)';
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    overlay.style.opacity = '0';
    inner.style.transform = 'scale(0.88)';
    overlay.style.pointerEvents = 'none';
    document.body.style.overflow = '';
    if (activeVideo) {
      activeVideo.pause();
      activeVideo = null;
    }
    setTimeout(() => { inner.innerHTML = ''; }, 350);
    if (cursorEl) cursorEl.style.zIndex = '';
    if (ringEl)   ringEl.style.zIndex   = '';
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLightbox();
  });

  closeBtn.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  window._openVideoLightbox = openLightbox;
}

window.addEventListener('load', () => {
  initVideoLightbox();
  initVideoCarousel();
});


/* ============================================================
   EASTER EGG — SPRINT TO TOOLS
   Desktop: shake the cursor rapidly left-right to unlock /tools
   Mobile:  tap the nav logo 5x quickly
   ============================================================ */
(function() {

  // ── DESKTOP: cursor shake detection ──────────────────────
  if (!window.matchMedia('(pointer: coarse)').matches) {

    // Track from last direction-change point, NOT last mousemove event.
    // mousemove fires every ~4ms so per-event dx is only 1-5px — useless.
    // Instead we measure accumulated travel since the last reversal.
    let anchorX    = 0;      // x position at last direction change
    let lastDir    = null;
    let dirChanges = 0;
    let resetTimer = null;
    let triggered  = false;

    const CHANGES_NEEDED = 5;    // direction reversals needed
    const MIN_DIST       = 160;  // px of travel per leg — wide sweeps feel like a real sprint
    const WINDOW_MS      = 1400; // wider window to allow for the bigger movements

    document.addEventListener('mousemove', e => {
      if (triggered) return;

      const dx  = e.clientX - anchorX;
      if (Math.abs(dx) < MIN_DIST) return; // haven't travelled far enough yet

      const dir = dx > 0 ? 'r' : 'l';

      if (dir === lastDir) {
        // Still going the same way — push anchor forward to keep measuring
        anchorX = e.clientX;
        return;
      }

      // Direction reversed — count it
      anchorX  = e.clientX;
      lastDir  = dir;
      dirChanges++;

      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        dirChanges = 0;
        lastDir    = null;
      }, WINDOW_MS);

      if (dirChanges >= CHANGES_NEEDED) {
        triggered  = true;
        dirChanges = 0;
        fireEasterEgg(e.clientX, e.clientY);
      }
    });

    function fireEasterEgg(x, y) {
      // Clickable badge — user must click within 3 seconds or it dismisses and resets
      const badge = document.createElement('button');
      badge.textContent = '🏃 MTM Tools →';
      badge.style.cssText = `
        position: fixed;
        left: ${Math.min(x + 18, window.innerWidth - 175)}px;
        top:  ${Math.max(y - 48, 12)}px;
        background: #2D6BE4;
        color: #f4f4f2;
        padding: 10px 18px;
        border-radius: 8px;
        border: none;
        font-family: 'DM Sans', sans-serif;
        font-size: 13px;
        font-weight: 500;
        z-index: 99999;
        cursor: pointer;
        white-space: nowrap;
        box-shadow: 0 4px 24px rgba(45,107,228,.5);
        opacity: 0;
        transform: translateY(6px) scale(0.92);
        transition: opacity .22s ease, transform .22s ease;
      `;
      document.body.appendChild(badge);

      // Animate in
      requestAnimationFrame(() => {
        badge.style.opacity   = '1';
        badge.style.transform = 'translateY(0) scale(1)';
      });

      function dismiss() {
        badge.style.opacity   = '0';
        badge.style.transform = 'translateY(6px) scale(0.92)';
        setTimeout(() => { if (badge.parentNode) badge.parentNode.removeChild(badge); }, 250);
        // Reset everything so it can be triggered again
        triggered  = false;
        dirChanges = 0;
        lastDir    = null;
        anchorX    = 0;
      }

      // Click → navigate
      badge.addEventListener('click', () => {
        clearTimeout(dismissTimer);
        window.location.href = '/tools.html';
      });

      // 3 seconds with no click → dismiss and full reset
      const dismissTimer = setTimeout(dismiss, 3000);
    }
  }

})();


/* ============================================================
   ANIMATED RESULTS CHART — homepage
   Draws a Canvas chart that animates on scroll.
   Two lines: "With MTM" (exponential) vs "Without" (flat).
   ============================================================ */
(function () {
  const canvas = document.getElementById('resultsChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const months = ['Mo 1','Mo 2','Mo 3','Mo 4','Mo 5','Mo 6'];
  const withMTM  = [5, 12, 22, 34, 44, 52];   // the "10x" growth curve
  const without  = [5, 6, 6, 7, 7, 8];         // flat baseline

  // Animated counter helpers
  function animCount(id, target, suffix, prefix, dur) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const steps = 60;
    const timer = setInterval(() => {
      current = Math.min(current + (target / steps), target);
      el.textContent = (prefix || '') + Math.round(current) + (suffix || '');
      if (current >= target) clearInterval(timer);
    }, dur / steps);
  }

  let chartDrawn = false;
  let animProgress = 0; // 0 → 1
  let animFrame = null;

  function drawChart(progress) {
    const W = canvas.width  = canvas.parentElement.clientWidth  - 48;
    const H = canvas.height = 280;

    const pad = { top: 20, right: 30, bottom: 40, left: 40 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top  - pad.bottom;

    const maxVal = 60;
    const pts = months.length;

    ctx.clearRect(0, 0, W, H);

    // ── Grid lines ──────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    [0, 15, 30, 45, 60].forEach(v => {
      const y = pad.top + plotH - (v / maxVal) * plotH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '10px DM Sans, sans-serif';
      ctx.fillText(v, pad.left - 30, y + 4);
    });

    // ── X labels ────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    months.forEach((m, i) => {
      const x = pad.left + (i / (pts - 1)) * plotW;
      ctx.fillText(m, x, H - 8);
    });
    ctx.textAlign = 'left';

    // How many points to draw based on progress
    const drawPts = Math.max(2, Math.ceil(progress * pts));
    const frac    = (progress * pts) - Math.floor(progress * pts);

    function getPoint(data, idx) {
      const x = pad.left + (idx / (pts - 1)) * plotW;
      const y = pad.top  + plotH - (data[idx] / maxVal) * plotH;
      return [x, y];
    }

    function drawLine(data, color, dashed) {
      ctx.beginPath();
      if (dashed) ctx.setLineDash([5, 4]);
      else        ctx.setLineDash([]);

      for (let i = 0; i < Math.min(drawPts, pts); i++) {
        const [x, y] = getPoint(data, i);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      // Partial last segment
      if (drawPts < pts && frac > 0) {
        const [x0, y0] = getPoint(data, drawPts - 1);
        const [x1, y1] = getPoint(data, Math.min(drawPts, pts - 1));
        ctx.lineTo(x0 + (x1 - x0) * frac, y0 + (y1 - y0) * frac);
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.5 : 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.setLineDash([]);

      // Fill under MTM line
      if (!dashed) {
        ctx.lineTo(pad.left + (Math.min(drawPts - 1, pts - 1) / (pts - 1)) * plotW, pad.top + plotH);
        ctx.lineTo(pad.left, pad.top + plotH);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
        grad.addColorStop(0, 'rgba(45,107,228,0.18)');
        grad.addColorStop(1, 'rgba(45,107,228,0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    // Draw lines
    drawLine(without, 'rgba(255,255,255,0.18)', true);
    drawLine(withMTM, '#2D6BE4', false);

    // Dots on MTM line
    ctx.fillStyle = '#2D6BE4';
    for (let i = 0; i < Math.min(drawPts, pts); i++) {
      const [x, y] = getPoint(withMTM, i);
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Last dot label
    if (progress >= 0.98) {
      const [lx, ly] = getPoint(withMTM, pts - 1);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 11px DM Sans, sans-serif';
      ctx.fillText('10×', lx + 8, ly - 6);
    }
  }

  function startAnimation() {
    if (chartDrawn) return;
    chartDrawn = true;

    // Animate stat counters
    animCount('gStatLeads',    10, '×', '',  1800);
    animCount('gStatResponse', 60, 's', '',  1200);
    animCount('gStatPipeline', 56, 'k', '$', 2000);
    animCount('gStatConvert',  98, '%', '',  1600);

    // Animate chart
    const start = performance.now();
    const dur   = 2200;
    function step(now) {
      animProgress = Math.min((now - start) / dur, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - animProgress, 3);
      drawChart(ease);
      if (animProgress < 1) animFrame = requestAnimationFrame(step);
    }
    animFrame = requestAnimationFrame(step);
  }

  // Trigger on scroll into view
  const graphObs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      graphObs.disconnect();
      startAnimation();
    }
  }, { threshold: 0.25 });
  graphObs.observe(canvas);

  // Redraw on resize (keep proportions)
  window.addEventListener('resize', () => {
    if (chartDrawn) drawChart(1);
  });
})();


/* ============================================================
   BEFORE / AFTER IMAGE SLIDER — work page
   Drag (mouse + touch) to reveal the "after" image.
   ============================================================ */
(function () {
  const slider    = document.getElementById('baSlider');
  const afterPane = document.getElementById('baAfterPane');
  const divider   = document.getElementById('baDivider');
  const handle    = document.getElementById('baHandle');
  if (!slider || !afterPane || !divider) return;

  // Add pulse hint class
  if (handle) handle.classList.add('pulse');

  let dragging = false;
  let pct = 50; // percentage from left

  function setPosition(clientX) {
    const rect = slider.getBoundingClientRect();
    pct = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 2), 98);
    afterPane.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    divider.style.left = pct + '%';
  }

  // Mouse events
  slider.addEventListener('mousedown', e => {
    dragging = true;
    if (handle) handle.classList.remove('pulse');
    setPosition(e.clientX);
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    setPosition(e.clientX);
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  // Touch events
  slider.addEventListener('touchstart', e => {
    dragging = true;
    if (handle) handle.classList.remove('pulse');
    setPosition(e.touches[0].clientX);
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    setPosition(e.touches[0].clientX);
  }, { passive: true });
  document.addEventListener('touchend', () => { dragging = false; });

  // Set initial clip (50/50)
  afterPane.style.clipPath = 'inset(0 50% 0 0)';
})();
