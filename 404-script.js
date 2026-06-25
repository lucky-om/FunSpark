/* developed by lucky */
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
