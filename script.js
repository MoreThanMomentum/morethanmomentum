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


/* --- SCROLL REVEAL --- */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 70);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


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
    const MIN_DIST       = 80;   // px of travel per leg to count
    const WINDOW_MS      = 900;  // full shake must complete within this

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
      // Badge that appears near the cursor
      const badge = document.createElement('div');
      badge.textContent = '🏃 MTM Tools →';
      badge.style.cssText = `
        position: fixed;
        left: ${Math.min(x + 18, window.innerWidth - 160)}px;
        top:  ${Math.max(y - 48, 12)}px;
        background: #2D6BE4;
        color: #f4f4f2;
        padding: 9px 16px;
        border-radius: 8px;
        font-family: 'DM Sans', sans-serif;
        font-size: 13px;
        font-weight: 500;
        z-index: 99999;
        pointer-events: none;
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

      // Navigate after short pause
      setTimeout(() => {
        window.location.href = '/tools.html';
      }, 650);
    }
  }



})();
