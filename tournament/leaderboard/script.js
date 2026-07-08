/* developed by lucky */

'use strict';

/* ────────────────────────────────────────
   BACKGROUND IMAGES — centralised in assets/
   Path relative to tournament/leaderboard/
──────────────────────────────────────── */
const BG_IMAGES = [
  '../assets/bg-bowling.png',
];

/* ────────────────────────────────────────
   LIVE GOOGLE SHEET WEB APP API URL
──────────────────────────────────────── */
const API_URL = "https://script.google.com/macros/s/AKfycbwNr5DWVDRrG2vJoCvQ04YFPIXS8UWSTJfuo_4iyX4DKpLnswHeYr0TVMQeT3honzN_/exec";

/* ────────────────────────────────────────
   DATA ENGINE (Live Connected with Redirect Fix)
──────────────────────────────────────── */
async function fetchLiveLeaderboard() {
  const container = document.getElementById('lb-rows-wrap');
  
  // Futuristic loader state showing dynamic sync
  container.innerHTML = `
    <div class="loading-state" style="text-align:center; padding: 30px; color: #7B2DFF; font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 1.3rem; letter-spacing: 2px; animation: pulse 1.5s infinite;">
      ⚡ FETCHING LIVE SCORE DATA...
    </div>
  `;

  try {
    // FIX: Explicitly configured CORS mechanics to bypass Google Macro CORS policy blockage
    const response = await fetch(API_URL, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });
    
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      // Raw Sheet data ko standardized format me map karna
      const formattedEntries = data
        .filter(row => {
          let name = Array.isArray(row) ? row[0] : row.Team_Name;
          let score = Array.isArray(row) ? row[1] : row.Total_Score;
          // Headers ya khali rows ko skip karne ke liye filter
          return name && !isNaN(score) && name.toString().toLowerCase() !== "team name";
        })
        .map(row => ({
          Team_Name: Array.isArray(row) ? row[0] : row.Team_Name,
          Total_Score: parseInt(Array.isArray(row) ? row[1] : row.Total_Score, 10) || 0,
          Timestamp: Array.isArray(row) ? (row[2] || new Date().toISOString()) : (row.Timestamp || new Date().toISOString())
        }));

      // Tournament Engine rules apply karna (Personal Best, Tie Breaks)
      fullRankings = buildLeaderboard(formattedEntries);

      // Global ranking sequence map setup karna
      globalRankMap = new Map(fullRankings.map((t, i) => [t.name, i + 1]));

      // Interface state set karke render karna
      currentFiltered = fullRankings;
      currentPage = 1;
      renderCurrentPage();
    } else {
      throw new Error('Data format invalid');
    }
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    container.innerHTML = `
      <div class="error-state" style="text-align:center; padding: 30px; color: #ff4757; font-family: 'Rajdhani', sans-serif; font-weight: 700;">
        ❌ CONNECTIVITY ERROR. RE-TRYING AUTOMATICALLY...
      </div>
    `;
    // Fallback retry system har 8 seconds me
    setTimeout(fetchLiveLeaderboard, 8000);
  }
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
    }
  }

  return [...map.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // Highest score first
    return a.ts - b.ts;                                 // Earliest timestamp first
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
    teamEl.textContent = team.name; 
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
  if (!canvas) return;
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
      hue:  Math.random() < 0.6 ? 270 : (Math.random() < 0.5 ? 320 : 45),
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

  // Load live data from Google Sheet Web App
  fetchLiveLeaderboard();

  // Search listener
  const searchInput = document.getElementById('team-search');
  if (searchInput) {
    searchInput.addEventListener('input', onSearchInput, { passive: true });

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
  }

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
