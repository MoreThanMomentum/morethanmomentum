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

// Cursor grow on interactive elements
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
}

// Run on scroll AND on first load
window.addEventListener('scroll', updateNav);
window.addEventListener('load', updateNav);

/* --- SCROLL REVEAL --- */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 70);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* --- CONTACT FORM --- */
function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.form-submit');
  btn.textContent = 'Message Sent ✓';
  btn.style.background = '#2a2a2a';
  setTimeout(() => {
    btn.textContent = 'Send Message';
    btn.style.background = '';
  }, 3000);
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
      x:       Math.random() * canvas.width,
      y:       canvas.height + Math.random() * 30,
      size:    Math.random() * 2 + 1,
      speed:   Math.random() * 0.45 + 0.25,
      maxOpacity: Math.random() * 0.5 + 0.15,
      drift:   (Math.random() - 0.5) * 0.25,
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

    // Occasionally add new particle
    if (particles.length < 40 && Math.random() < 0.04) {
      particles.push(spawn());
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.y -= p.speed;
      p.x += p.drift;

      // Fade out in top 30% of canvas so they disappear before white bg
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

// Initialize particles on all dark sections
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
    left:     { tx: '-310px', tz: '-160px', ry: '42deg',  scale: 0.86, opacity: 0.7,  zi: 3 },
    center:   { tx: '0px',   tz: '0px',    ry: '0deg',   scale: 1,    opacity: 1,    zi: 5 },
    right:    { tx: '310px', tz: '-160px', ry: '-42deg', scale: 0.86, opacity: 0.7,  zi: 3 },
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

  // Initialise with 3 visible slots: left, center, right
  let nextIndex = 0;
  function nextVideo() {
    const v = videos[nextIndex % videos.length];
    nextIndex++;
    return v;
  }

  // Start: left=v0, center=v1, right=v2, next incoming=v3
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

    // Create new entering slot (instantly at entering position, off-left)
    const entering = createSlot(nextVideo(), 'entering');
    track.insertBefore(entering, track.firstChild);

    // Force reflow so the no-transition positioning registers
    entering.offsetHeight;

    // Now animate all 4 slots through their next states
    const stateOrder = ['left', 'center', 'right', 'exiting'];
    Array.from(track.children).forEach((slot, i) => {
      applyState(slot, stateOrder[i], true);
    });

    // After animation ends, remove the exiting slot
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