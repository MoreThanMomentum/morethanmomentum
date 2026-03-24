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


/* --- VIDEO CAROUSEL --- */
function initVideoCarousel() {
  const track = document.getElementById('videoTrack');
  if (!track) return;

  // Video data — update client/title when you have real videos
  const videos = [
    { num: '01', client: 'Client · Category', title: 'Project Title', src: '' },
    { num: '02', client: 'Client · Category', title: 'Project Title', src: '' },
    { num: '03', client: 'Client · Category', title: 'Project Title', src: '' },
    { num: '04', client: 'Client · Category', title: 'Project Title', src: '' },
    { num: '05', client: 'Client · Category', title: 'Project Title', src: '' },
    { num: '06', client: 'Client · Category', title: 'Project Title', src: '' },
  ];

  function createSlot(v) {
    const div = document.createElement('div');
    div.className = 'video-slot';
    div.innerHTML = v.src
      ? `<video src="${v.src}" autoplay muted loop playsinline></video>
         <div class="video-overlay"><div><div class="video-client">${v.client}</div><div class="video-title">${v.title}</div></div></div>`
      : `<div class="video-placeholder">
           <div class="video-placeholder-num">${v.num}</div>
           <div class="video-placeholder-label">Your video here</div>
         </div>
         <div class="video-overlay"><div><div class="video-client">${v.client}</div><div class="video-title">${v.title}</div></div></div>`;
    return div;
  }

  // Track: [incoming (off-left)] [slot0] [slot1] [slot2]
  // Track width: 133.34%, each slot 25% of track = 33.33% of container
  // Initial translateX: -25% hides the incoming slot off to the left

  let nextFromLeft = 5; // index of video that will come in from the left next

  // Build initial 4 slots
  const incoming = createSlot(videos[nextFromLeft]);
  track.appendChild(createSlot(videos[0]));
  track.appendChild(createSlot(videos[1]));
  track.appendChild(createSlot(videos[2]));
  track.insertBefore(incoming, track.firstChild);

  nextFromLeft = (nextFromLeft - 1 + videos.length) % videos.length; // → 4

  let animating = false;

  setInterval(() => {
    if (animating) return;
    animating = true;

    // Slide track to the right: translateX goes from -25% to 0%
    track.style.transition = 'transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    track.style.transform  = 'translateX(0%)';

    setTimeout(() => {
      // Remove the last slot (slid off right edge)
      if (track.lastChild) track.removeChild(track.lastChild);

      // Add new incoming slot at the beginning
      const newSlot = createSlot(videos[nextFromLeft]);
      track.insertBefore(newSlot, track.firstChild);

      // Snap back without transition
      track.style.transition = 'none';
      track.style.transform  = 'translateX(-25%)';

      // Advance next index
      nextFromLeft = (nextFromLeft - 1 + videos.length) % videos.length;
      animating = false;
    }, 920);

  }, 5000);
}

window.addEventListener('load', initVideoCarousel);