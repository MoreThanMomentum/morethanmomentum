/* ============================================================
   MORE THAN MOMENTUM — script.js
   ============================================================ */

/* --- CURSOR --- */
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursorRing');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;

  // Detect background brightness under cursor and switch color
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

  const color = isDark ? '#ffffff' : '#0c0c0c';
  cursor.style.background   = color;
  ring.style.borderColor    = color;
});

// Smooth cursor follow animation
(function animCursor() {
  cursor.style.left = mx + 'px';
  cursor.style.top  = my + 'px';
  rx += (mx - rx) * 0.1;
  ry += (my - ry) * 0.1;
  ring.style.left = rx + 'px';
  ring.style.top  = ry + 'px';
  requestAnimationFrame(animCursor);
})();

// Cursor grow on interactive elements
document.querySelectorAll('a, button, .video-slot, .svc, .plan').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.classList.add('big');
    ring.classList.add('big');
  });
  el.addEventListener('mouseleave', () => {
    cursor.classList.remove('big');
    ring.classList.remove('big');
  });
});


/* --- NAV SCROLL --- */
window.addEventListener('scroll', () => {
  const isScrolled = scrollY > 60;
  document.getElementById('nav').classList.toggle('scrolled', isScrolled);
  const logoImg = document.getElementById('nav-logo-img');
  if (logoImg) {
    if (isScrolled) {
      logoImg.src = 'images/blackguylogo.png';
      logoImg.style.opacity = '1';
    } else {
      logoImg.src = 'images/whiteguylogo.png';
      logoImg.style.opacity = '1';
    }
  }
  const navCta = document.querySelector('.nav-cta');
  if (navCta) {
    navCta.style.background = isScrolled ? '#0c0c0c' : '#2D6BE4';
  }
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
