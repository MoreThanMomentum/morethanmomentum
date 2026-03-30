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

    // Flip direction based on mouse movement
    if (mx > lastX) {
      if (cursorImg) cursorImg.style.transform = 'scaleX(1)';
      if (cursorRingImg) cursorRingImg.style.transform = 'scaleX(1)';
    } else if (mx < lastX) {
      if (cursorImg) cursorImg.style.transform = 'scaleX(-1)';
      if (cursorRingImg) cursorRingImg.style.transform = 'scaleX(-1)';
    }
    lastX = mx;

    // Show shadow trail when moving, hide when stopped
    ring.classList.add('moving');
    clearTimeout(moveTimeout);
    moveTimeout = setTimeout(() => {
      ring.classList.remove('moving');
    }, 150);

    // Detect background brightness and swap logo color
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

    // Swap between white and black logo based on background
    const onServiceCard = !!el?.closest('.svc');
const logoSrc = (!onServiceCard && isDark) ? 'images/whiteguylogo.png' : 'images/blackguylogo.png';
    if (cursorImg) cursorImg.src = logoSrc;
    if (cursorRingImg) cursorRingImg.src = logoSrc;
  });

  // Smooth cursor follow animation
  (function animCursor() {
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
    rx += (mx - rx) * 0.08;
    ry += (my - ry) * 0.08;
    ring.style.left = (rx - 20) + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animCursor);
  })();

  // Cursor hide on interactive elements
  document.querySelectorAll('a, button, .nav-cta, .plan-cta, .btn-primary, .btn-ghost, .social-link, select').forEach(el => {
    el.addEventListener('mouseenter', () => { cursor.style.opacity = '0'; });
    el.addEventListener('mouseleave', () => { cursor.style.opacity = '1'; });
  });
}


/* --- NAV SCROLL --- */
let isInnerPage = false; // set by mobile multipage logic

function updateNav() {
  // On mobile inner pages, always treat as scrolled (white nav)
  const forceScrolled = isInnerPage && window.innerWidth <= 1024;
  const isScrolled = forceScrolled || scrollY > 60;

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

/* --- CLOSE MOBILE NAV ON RESIZE --- */
let lastWindowWidth = window.innerWidth;

window.addEventListener('resize', () => {
  const currentWidth = window.innerWidth;
  closeMobileNav();

  // Crossed back to desktop — restore all sections
  if (currentWidth > 1024 && lastWindowWidth <= 1024) {
    document.querySelectorAll('.hero, #about, #services, #pricing, #work, .process, #contact, footer').forEach(el => {
      if (el) el.style.display = '';
    });
    const ticker = document.querySelector('.ticker');
    if (ticker) {
      ticker.style.position = '';
      ticker.style.top = '';
      ticker.style.left = '';
      ticker.style.right = '';
      ticker.style.zIndex = '';
      ticker.style.display = '';
    }
    isInnerPage = false;
    updateNav();
  }

  lastWindowWidth = currentWidth;
});

// Close when a mobile nav link is tapped
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


/* --- CONTACT FORM (Formspree) ---
 *
 * HOW TO SET UP:
 * 1. Go to https://formspree.io and create a free account
 * 2. Click "New Form" — set the destination email to morethanmomentum@gmail.com
 * 3. Formspree will give you a unique form ID (e.g. xyzabc12)
 * 4. Replace YOUR_FORM_ID below with that ID — done.
 *
 * Example: 'https://formspree.io/f/xyzabc12'
 */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mgopveve';

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('.form-submit');

    // Prevent double-submit
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


/* --- MOBILE MULTI-PAGE MODE ---
 * On screens ≤1024px, each section acts as its own page.
 * Nav/hamburger links switch sections instead of scrolling.
 * Desktop is completely unaffected.
 */
function initMobileMultipage() {
  if (window.innerWidth > 1024) return;

  const heroEl     = document.querySelector('.hero');
  const tickerEl   = document.querySelector('.ticker');
  const aboutEl    = document.getElementById('about');
  const servicesEl = document.getElementById('services');
  const pricingEl  = document.getElementById('pricing');
  const workEl     = document.getElementById('work');
  const processEl  = document.querySelector('.process');
  const contactEl  = document.getElementById('contact');
  const footerEl   = document.querySelector('footer');

  // Give process a hookable id if missing
  if (processEl && !processEl.id) processEl.id = 'process';

  // Ticker is fixed below nav on mobile hero page only
  if (tickerEl) {
    tickerEl.style.position = 'fixed';
    tickerEl.style.top      = '56px';
    tickerEl.style.left     = '0';
    tickerEl.style.right    = '0';
    tickerEl.style.zIndex   = '199';
    tickerEl.style.display  = 'none';
  }

  const allSections = [heroEl, aboutEl, servicesEl, pricingEl,
                       workEl, processEl, contactEl].filter(Boolean);

  function hideAll() {
    allSections.forEach(el => { el.style.display = 'none'; });
    if (tickerEl) tickerEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'none';
  }

  function showSection(targetId) {
    hideAll();

    if (!targetId || targetId === '' || targetId === 'hero') {
      // Hero page: show hero + fixed ticker below nav
      if (heroEl)   heroEl.style.display   = '';
      if (tickerEl) tickerEl.style.display = '';
      isInnerPage = false;
    } else {
      // Inner page: no ticker, show section + footer
      const target = document.getElementById(targetId);
      if (target) target.style.display = '';
      if (footerEl) footerEl.style.display = '';
      isInnerPage = true;

      if (targetId === 'work') initVideoCarousel();
      if (targetId === 'about')   initParticles('particles-about');
      if (targetId === 'pricing') initParticles('particles-pricing');
      if (targetId === 'contact') initParticles('particles-contact');
    }

    // Scroll to top & update nav colour
    window.scrollTo(0, 0);
    updateNav();

    // Re-trigger reveal animations for newly visible elements
    document.querySelectorAll('.reveal').forEach(el => el.classList.remove('visible'));
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) el.classList.add('visible');
      });
    }, 80);
  }

  // Start on hero
  showSection('hero');

  // Intercept ALL hash-link clicks on mobile
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    e.preventDefault();
    const targetId = href.slice(1);
    closeMobileNav();
    showSection(targetId);
  });

  // Logo click always goes back to hero
  const navLogo = document.querySelector('.nav-logo');
  if (navLogo) {
    navLogo.addEventListener('click', e => {
      if (window.innerWidth > 1024) return;
      e.preventDefault();
      showSection('hero');
    });
  }
}

window.addEventListener('load', initMobileMultipage);


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

  // Seed particles at random positions on load
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

      // Fade out in top 30% of canvas
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
    { num: '01', client: 'Blanco · Running Content', title: '900K+ Views — Niche Running Video', src: 'videos/StravaRunNames.mp4' },
    { num: '02', client: 'Client · Category', title: 'Project Title', src: '' },
    { num: '03', client: 'Client · Category', title: 'Project Title', src: '' },
    { num: '04', client: 'Client · Category', title: 'Project Title', src: '' },
    { num: '05', client: 'Client · Category', title: 'Project Title', src: '' },
    { num: '06', client: 'Client · Category', title: 'Project Title', src: '' },
  ];

  // 3D transform states
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
         // Click to expand
div.addEventListener('click', () => {
  const vid = div.querySelector('video');
  if (!vid) return;

  // Pause the carousel auto-advance
  clearInterval(autoTimer);

  window._openVideoLightbox(vid);

  // Resume carousel when lightbox closes
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

let nextIndex = 0;
  function nextVideo() {
    const v = videos[nextIndex % videos.length];
    nextIndex++;
    return v;
  }

  const leftSlot   = createSlot(nextVideo(), 'left');
  const centerSlot = createSlot(nextVideo(), 'center');
  const rightSlot  = createSlot(nextVideo(), 'right');
  track.appendChild(leftSlot);
  track.appendChild(centerSlot);
  track.appendChild(rightSlot);

  let animating = false;

  function advance(direction) {
    if (animating) return;
    animating = true;

    if (direction === 'next') {
      const entering = createSlot(nextVideo(), 'entering');
      track.insertBefore(entering, track.firstChild);
      entering.offsetHeight;
      const stateOrder = ['left', 'center', 'right', 'exiting'];
      Array.from(track.children).forEach((slot, i) => applyState(slot, stateOrder[i], true));
    } else {
      nextIndex = ((nextIndex - 4) % videos.length + videos.length) % videos.length;
      const entering = createSlot(nextVideo(), 'entering');
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

  // Swipe support for touch devices
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
        advance('next'); // swipe left = next
      } else {
        advance('prev'); // swipe right = prev
      }
      resetTimer();
    }
  }, { passive: true });
}

/* --- VIDEO LIGHTBOX --- */
function initVideoLightbox() {
  // Create overlay element once
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

  // Keep custom cursor visible above the lightbox
const cursorEl = document.getElementById('cursor');
const ringEl   = document.getElementById('cursorRing');
if (cursorEl) cursorEl.style.zIndex = '10001';
if (ringEl)   ringEl.style.zIndex   = '10001';

  const inner = document.createElement('div');
  inner.style.cssText = `
    width: min(420px, 90vw);
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

  function openLightbox(originalVideo) {
    // Clone the video so we have a fresh independent element
    const clone = originalVideo.cloneNode(true);
    clone.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    clone.muted = false;  // unmute in lightbox
    clone.loop = true;
    clone.play();

    inner.innerHTML = '';
    inner.appendChild(clone);
    activeVideo = clone;

    overlay.style.pointerEvents = 'all';
    overlay.offsetHeight; // force reflow
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

  // Click on dark overlay background = close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLightbox();
  });

  closeBtn.addEventListener('click', closeLightbox);

  // ESC key closes too
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // Expose so the carousel can call openLightbox
  window._openVideoLightbox = openLightbox;
}

window.addEventListener('load', () => {
  initVideoLightbox();
  initVideoCarousel();
});
