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
const API_URL = "https://script.google.com/macros/s/AKfycbzYuwp-rq5L4U3CoV5fsK1ZBWXjGXJ_K9kQxOW5CPoViFNGKcg424P8eeHLvWSXckD5/exec";

/* ────────────────────────────────────────
   DATA ENGINE (JSONP CORS Bypass Architecture)
──────────────────────────────────────── */
function fetchLiveLeaderboard() {
  const container = document.getElementById('lb-rows-wrap');
  
  container.innerHTML = `
    <div class="loading-state" style="text-align:center; padding: 30px; color: #7B2DFF; font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 1.3rem; letter-spacing: 2px; animation: pulse 1.5s infinite;">
      ⚡ FETCHING LIVE SCORE DATA...
    </div>
  `;

  // Create a unique global callback function name dynamically
  const callbackName = "jsonpCallback_" + Math.round(100000 * Math.random());
  
  // Yeh function tab trigger hoga jab Google Sheet data wapas script payload me return karegi
  window[callbackName] = function(data) {
    // Execution ke baad temporary script element ko clean karna
    const targetScript = document.getElementById(callbackName);
    if (targetScript) targetScript.remove();
    delete window[callbackName];

    if (Array.isArray(data)) {
      const formattedEntries = data.map(row => ({
        Team_Name: row.Team_Name,
        Total_Score: parseInt(row.Total_Score, 10) || 0,
        Timestamp: row.Timestamp || new Date().toISOString()
      }));

      fullRankings = buildLeaderboard(formattedEntries);
      globalRankMap = new Map(fullRankings.map((t, i) => [t.name, i + 1]));
      currentFiltered = fullRankings;
      currentPage = 1;
      renderCurrentPage();
    } else {
      showErrorState();
    }
  };

  // Safe Injecting JSONP script to completely eliminate CORS pre-flight browser blockage
  const script = document.createElement('script');
  script.src = `${API_URL}?callback=${callbackName}&_cb=${new Date().getTime()}`;
  script.id = callbackName;
  script.onerror = function() {
    showErrorState();
  };
  
  document.body.appendChild(script);
}

function showErrorState() {
  const container = document.getElementById('lb-rows-wrap');
  container.innerHTML = `
    <div class="error-state" style="text-align:center; padding: 30px; color: #ff4757; font-family: 'Rajdhani', sans-serif; font-weight: 700;">
      ❌ CONNECTIVITY ERROR. RE-TRYING AUTOMATICALLY...
    </div>
  `;
  setTimeout(fetchLiveLeaderboard, 8000);
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

    // Rank cell with gold/silver/bronze icons
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

    // Score cell local formatting
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

window.goToPage = function
