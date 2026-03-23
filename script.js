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
    logoImg.style.filter = isScrolled ? 'none' : 'invert(100%) brightness(0%) saturate(100%) invert(29%) sepia(98%) saturate(500%) hue-rotate(210deg) brightness(110%)';
  }

  const navCta = document.querySelector('.nav-cta');
  if (navCta) {
    navCta.style.background = isScrolled ? '#0c0c0c' : '#2D6BE4';
  }
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.style.color = isScrolled ? '#0c0c0c' : '#2D6BE4';
  });
  const navLogoText = document.querySelector('.nav-logo-text');
  if (navLogoText) {
    navLogoText.style.color = isScrolled ? '#0c0c0c' : '#2D6BE4';
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