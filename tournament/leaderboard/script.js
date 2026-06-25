/* developed by lucky */


  'use strict';

  /* ────────────────────────────────────────
     BACKGROUND IMAGES — centralised in assets/
     Path relative to tournament/leaderboard/
  ──────────────────────────────────────── */
  const BG_IMAGES = [
    '../assets/bg-bowling.png',
    '../assets/funspark_bowling.jpg',
  ];

  /* ────────────────────────────────────────
     MOCK TOURNAMENT DATA

     Demonstrates: re-entries, tie-break,
     highest-score retention
  ──────────────────────────────────────── */
  const RAW_ENTRIES = [
    { Team_Name: "Strike Masters",     Total_Score: 825, Timestamp: "2026-06-01T09:15:00" },
    { Team_Name: "Lane Legends",       Total_Score: 812, Timestamp: "2026-06-01T10:30:00" },
    { Team_Name: "Surat Strikers",     Total_Score: 760, Timestamp: "2026-06-01T11:00:00" },
    { Team_Name: "Citylight Rollers",  Total_Score: 798, Timestamp: "2026-06-02T14:00:00" },
    { Team_Name: "Pin Destroyers",     Total_Score: 745, Timestamp: "2026-06-02T15:20:00" },
    { Team_Name: "Gutter Avengers",    Total_Score: 715, Timestamp: "2026-06-03T10:00:00" },
    { Team_Name: "Strike Masters",     Total_Score: 760, Timestamp: "2026-06-03T11:30:00" }, // Lower re-entry – skipped
    { Team_Name: "Panda Gang",         Total_Score: 798, Timestamp: "2026-06-03T16:00:00" }, // Tie with Citylight Rollers – later time (rank 2nd)
    { Team_Name: "Thunder Bowlers",    Total_Score: 690, Timestamp: "2026-06-04T09:45:00" },
    { Team_Name: "Surat Strikers",     Total_Score: 812, Timestamp: "2026-06-04T12:00:00" }, // Tie with Lane Legends – later time (rank 3rd)
    { Team_Name: "Dumbbell Army",      Total_Score: 672, Timestamp: "2026-06-05T10:10:00" },
    { Team_Name: "Lane Legends",       Total_Score: 720, Timestamp: "2026-06-05T11:30:00" }, // Lower re-entry – skipped
    { Team_Name: "The Spare Pair",     Total_Score: 650, Timestamp: "2026-06-05T14:00:00" },
    { Team_Name: "Frame Breakers",     Total_Score: 638, Timestamp: "2026-06-06T09:30:00" },
    { Team_Name: "Pin Destroyers",     Total_Score: 812, Timestamp: "2026-06-06T12:40:00" }, // Higher re-entry – keeps this score
    { Team_Name: "Citylight Rollers",  Total_Score: 810, Timestamp: "2026-06-06T15:00:00" }, // Lower re-entry – skipped
    { Team_Name: "Neon Rollers",       Total_Score: 620, Timestamp: "2026-06-07T10:00:00" },
    { Team_Name: "Gutter Avengers",    Total_Score: 780, Timestamp: "2026-06-07T13:00:00" }, // Higher re-entry – updates
    { Team_Name: "Citylight Rollers",  Total_Score: 845, Timestamp: "2026-06-08T10:15:00" }, // Highest – champion candidate
    { Team_Name: "Alley Cats",         Total_Score: 598, Timestamp: "2026-06-08T14:30:00" },
    { Team_Name: "Thunder Bowlers",    Total_Score: 740, Timestamp: "2026-06-08T16:00:00" }, // Higher re-entry
    { Team_Name: "The Spare Pair",     Total_Score: 700, Timestamp: "2026-06-09T11:00:00" }, // Higher re-entry
    { Team_Name: "Missile Strikes",    Total_Score: 560, Timestamp: "2026-06-09T13:45:00" },
    { Team_Name: "Dumbbell Army",      Total_Score: 712, Timestamp: "2026-06-10T09:00:00" }, // Higher re-entry
    { Team_Name: "Frame Breakers",     Total_Score: 680, Timestamp: "2026-06-10T10:30:00" }, // Higher re-entry
    { Team_Name: "Strike Masters",     Total_Score: 790, Timestamp: "2026-06-11T11:00:00" }, // Lower than 825 – skipped
  ];

  /* ────────────────────────────────────────
     DATA ENGINE
  ──────────────────────────────────────── */
  function sanitizeText(str) {
    const el = document.createElement('div');
    el.appendChild(document.createTextNode(String(str)));
    return el.innerHTML; // Not used in DOM rendering; just for safety reference
  }

  function buildLeaderboard(entries) {
    const map = new Map();

    for (const entry of entries) {
      const name  = String(entry.Team_Name).trim();
      const score = parseInt(entry.Total_Score, 10);
      const ts    = new Date(entry.Timestamp).getTime();

      if (!name || Number.isNaN(score) || Number.isNaN(ts)) continue;

      if (!map.has(name)) {
        map.set(name, { name, score, ts });
      } else {
        const existing = map.get(name);
        if (score > existing.score) {
          // New personal best — update score AND timestamp
          map.set(name, { name, score, ts });
        } else if (score === existing.score && ts < existing.ts) {
          // Same score achieved earlier — keep earliest timestamp for tie-break
          map.set(name, { name, score, ts });
        }
        // Lower score or later timestamp at same score → ignore
      }
    }

    return [...map.values()].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score; // highest score first
      return a.ts - b.ts;                                 // earliest timestamp first
    });
  }

  /* ────────────────────────────────────────
     RENDERING ENGINE (XSS-safe)
  ──────────────────────────────────────── */
  function renderRows(data, globalRankMap) {
    const container = document.getElementById('lb-rows-wrap');

    if (data.length === 0) {
      container.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.setAttribute('role', 'listitem');
      empty.textContent = 'NO TEAMS MATCHING YOUR SEARCH';
      container.appendChild(empty);
      return;
    }

    // Build a document fragment for performance
    const frag = document.createDocumentFragment();

    data.forEach((team, idx) => {
      const globalRank = globalRankMap.get(team.name) ?? (idx + 1);

      const row = document.createElement('div');
      row.className = 'lb-row' + (globalRank === 1 ? ' rank-1' : globalRank === 2 ? ' rank-2' : globalRank === 3 ? ' rank-3' : '');
      row.setAttribute('role', 'listitem');
      row.style.animationDelay = `${idx * 0.055}s`;

      // Rank cell
      const rankEl = document.createElement('div');
      rankEl.className = 'lb-rank';
      rankEl.setAttribute('aria-label', `Rank ${globalRank}`);
      if (globalRank === 1) rankEl.textContent = '🥇';
      else if (globalRank === 2) rankEl.textContent = '🥈';
      else if (globalRank === 3) rankEl.textContent = '🥉';
      else rankEl.textContent = String(globalRank);

      // Team name cell
      const teamEl = document.createElement('div');
      teamEl.className = 'lb-team';
      teamEl.textContent = team.name; // textContent = XSS safe
      teamEl.title = team.name;

      // Score cell
      const scoreEl = document.createElement('div');
      scoreEl.className = 'lb-score';
      scoreEl.setAttribute('aria-label', `Score: ${team.score}`);
      scoreEl.textContent = team.score.toLocaleString('en-IN');

      row.appendChild(rankEl);
      row.appendChild(teamEl);
      row.appendChild(scoreEl);
      frag.appendChild(row);
    });

    container.innerHTML = '';
    container.appendChild(frag);
  }

  /* ────────────────────────────────────────
     SEARCH ENGINE (debounced, XSS-safe)
  ──────────────────────────────────────── */
  let fullRankings  = [];
  let globalRankMap = new Map();
  let debounceTimer = null;
  let currentFiltered = [];
  let currentPage = 1;
  const itemsPerPage = 5;

  function updatePaginationUI() {
    const totalPages = Math.ceil(currentFiltered.length / itemsPerPage);
    const wrap = document.getElementById('pagination-wrap');
    if (!wrap) return;
    
    if (totalPages <= 1) {
      wrap.innerHTML = '';
      return;
    }
    
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    wrap.innerHTML = html;
  }

  window.goToPage = function(page) {
    const totalPages = Math.ceil(currentFiltered.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderCurrentPage();
  };

  function renderCurrentPage() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = currentFiltered.slice(start, end);
    renderRows(pageData, globalRankMap);
    updatePaginationUI();
  }

  function filterAndRender(query) {
    if (!query) {
      currentFiltered = fullRankings;
    } else {
      const lower = query.toLowerCase();
      currentFiltered = fullRankings.filter(t => t.name.toLowerCase().includes(lower));
    }
    currentPage = 1;
    renderCurrentPage();
  }

  function onSearchInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Sanitize: only allow printable unicode, strip control chars
      const raw = document.getElementById('team-search').value
        .replace(/[<>"'&/\\]/g, '')
        .trim()
        .slice(0, 60);
      filterAndRender(raw);
    }, 120);
  }

  /* ────────────────────────────────────────
     PARTICLE SYSTEM (GPU-accelerated)
  ──────────────────────────────────────── */
  function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    const ctx    = canvas.getContext('2d');

    let W, H, particles;
    const PARTICLE_COUNT = 55;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) return;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function makeParticle() {
      return {
        x:    Math.random() * W,
        y:    Math.random() * H,
        r:    Math.random() * 1.8 + 0.4,
        vx:   (Math.random() - 0.5) * 0.25,
        vy:   -(Math.random() * 0.3 + 0.1),
        alpha: Math.random() * 0.4 + 0.1,
        hue:  Math.random() < 0.6 ? 270 : (Math.random() < 0.5 ? 320 : 45), // purple/pink/yellow
      };
    }

    function init() {
      resize();
      particles = Array.from({ length: PARTICLE_COUNT }, makeParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.y < -5)  p.y = H + 5;
        if (p.x < -5)  p.x = W + 5;
        if (p.x > W+5) p.x = -5;
      }

      requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener('resize', resize, { passive: true });
  }

  /* ────────────────────────────────────────
     BACKGROUND SLIDESHOW
  ──────────────────────────────────────── */
  function initSlideshow() {
    const container = document.getElementById('bg-slideshow');
    if (!container) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Inject slides from centralised BG_IMAGES list
    BG_IMAGES.forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'bg-slide' + (i === 0 ? ' active' : '');
      slide.style.backgroundImage = `url('${src}')`;
      container.appendChild(slide);
    });

    if (reduced) return;

    const slides = container.querySelectorAll('.bg-slide');
    if (slides.length < 2) return;

    let current = 0;
    const INTERVAL = 5500;

    function next() {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }

    setInterval(next, INTERVAL);
  }


  /* ────────────────────────────────────────
     INIT
  ──────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {

    // Set copyright year
    const yearEl = document.getElementById('copy-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Build rankings
    fullRankings = buildLeaderboard(RAW_ENTRIES);

    // Build global rank map (name → 1-based rank)
    globalRankMap = new Map(fullRankings.map((t, i) => [t.name, i + 1]));

    // Initial render
    currentFiltered = fullRankings;
    renderCurrentPage();

    // Search listener
    const searchInput = document.getElementById('team-search');
    searchInput.addEventListener('input', onSearchInput, { passive: true });

    // Prevent paste of dangerous characters
    searchInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/[<>"'&/\\]/g, '')
        .slice(0, 60);
      const start = searchInput.selectionStart;
      const end   = searchInput.selectionEnd;
      const current = searchInput.value;
      searchInput.value = (current.slice(0, start) + pasted + current.slice(end)).slice(0, 60);
      onSearchInput();
    });

    // Init visual systems
    initSlideshow();
    initParticles();

    // Smooth anchor scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

  });
  

