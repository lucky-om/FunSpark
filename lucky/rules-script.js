
  'use strict';

  /* ── Copyright Year ── */
  const yearEl = document.getElementById('copy-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Particle System ── */
  (function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    const ctx    = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let W, H, particles;
    const COUNT = 70;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function makeParticle() {
      const types = [
        { hue: 270, label: 'purple' },
        { hue: 320, label: 'pink'   },
        { hue: 45,  label: 'yellow' },
        { hue: 190, label: 'cyan'   },
      ];
      const t = types[Math.floor(Math.random() * types.length)];
      return {
        x:    Math.random() * W,
        y:    Math.random() * H,
        r:    Math.random() * 2.2 + 0.3,
        vx:   (Math.random() - 0.5) * 0.3,
        vy:   -(Math.random() * 0.4 + 0.08),
        alpha: Math.random() * 0.45 + 0.08,
        hue:  t.hue,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: (Math.random() * 0.03 + 0.01),
      };
    }

    function init() {
      resize();
      particles = Array.from({ length: COUNT }, makeParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.twinkle += p.twinkleSpeed;
        const alpha = p.alpha * (0.7 + 0.3 * Math.sin(p.twinkle));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -5)  p.y = H + 5;
        if (p.x < -5)  p.x = W + 5;
        if (p.x > W+5) p.x = -5;
      }
      requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener('resize', resize, { passive: true });
  })();

  /* ── Card stagger reveal on scroll ── */
  (function initReveal() {
    const cards = document.querySelectorAll('.rule-card');
    if (!('IntersectionObserver' in window)) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    cards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(28px)';
      card.style.transition = `opacity 0.6s ${i * 0.1}s ease, transform 0.6s ${i * 0.1}s ease, border-color 0.4s, box-shadow 0.4s`;
      obs.observe(card);
    });
  })();
  
