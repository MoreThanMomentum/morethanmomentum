/* ============================================================
   MORE THAN MOMENTUM — script.js
   ============================================================ */

/* --- CURSOR --- */
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
  const logoSrc = isDark ? 'images/whiteguylogo.png' : 'images/blackguylogo.png';
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
  el.addEventListener('mouseenter', () => {
    cursor.style.opacity = '0';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.opacity = '1';
  });
});


/* --- NAV SCROLL --- */
function updateNav() {
  const isScrolled = scrollY > 60;
  document.getElementById('nav').classList.toggle('scrolled', isScrolled);

  const logoImg = document.getElementById('nav-logo-img');
  if (logoImg) {
    logoImg.src = isScrolled ? 'images/blackguylogo.png' : 'images/whiteguylogo.png';
    logoImg.style.opacity = '1';
    logoImg.style.filter = isScrolled ? 'none' : 'none';
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

  // Hamburger bar color is handled by CSS (nav.scrolled .nav-hamburger span)
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
    { num: '01', client: 'Client · Category', title: 'Project Title', src: '' },
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

  setInterval(() => {
    if (animating) return;
    animating = true;

    const entering = createSlot(nextVideo(), 'entering');
    track.insertBefore(entering, track.firstChild);

    // Force reflow so no-transition positioning registers
    entering.offsetHeight;

    const stateOrder = ['left', 'center', 'right', 'exiting'];
    Array.from(track.children).forEach((slot, i) => {
      applyState(slot, stateOrder[i], true);
    });

    setTimeout(() => {
      const exiting = track.querySelector('[data-state="exiting"]');
      if (exiting && exiting.parentNode === track) {
        track.removeChild(exiting);
      }
      animating = false;
    }, 920);

  }, 5000);
}

window.addEventListener('load', initVideoCarousel);
