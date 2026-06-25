'use strict';

/* ── Copyright Year ── */
(function setCopyrightYear() {
  const el = document.getElementById('copy-year');
  if (el) el.textContent = new Date().getFullYear();
})();

/* ── Particle System ── */
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  let W, H, particles;
  const COUNT = 60;

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
      r:    Math.random() * 2.5 + 0.5,
      vx:   (Math.random() - 0.5) * 0.4,
      vy:   -(Math.random() * 0.5 + 0.1),
      alpha: Math.random() * 0.5 + 0.1,
      hue:  t.hue,
    };
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    particles = Array.from({ length: COUNT }, makeParticle);
    requestAnimationFrame(draw);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) {
        Object.assign(p, makeParticle());
        p.y = H + 10;
      }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  init();
})();
