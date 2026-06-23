(function() {
  'use strict';

  // ── Game ID detection (same mapping as help-overlay) ──
  var PATH_MAP = [
    { pattern: /\/有机过熟-mobile\//, id: 'organic', name: '有机过熟' },
    { pattern: /\/有机过熟\//, id: 'organic', name: '有机过熟' },
    { pattern: /\/acid-arena-mobile\//, id: 'acid', name: '酸性吞噬' },
    { pattern: /\/acid-arena\//, id: 'acid', name: '酸性吞噬' },
    { pattern: /\/EvZ\//, id: 'evz', name: '元素大战僵尸' },
    { pattern: /\/丹道化学\//, id: 'alchemy', name: '丹道化学' },
    { pattern: /\/环己烷大作战-mobile\//, id: 'cyclohexane-ai', name: '环己烷大作战' },
    { pattern: /\/环己烷大作战\//, id: 'cyclohexane-ai', name: '环己烷大作战' },
    { pattern: /\/元素化学-mobile\//, id: 'turtle-soup', name: '化学海龟汤' },
    { pattern: /\/元素化学\//, id: 'turtle-soup', name: '化学海龟汤' },
    { pattern: /\/chemcraft-beta\//, id: 'chemcraft', name: 'Chemcraft元素觉醒' },
    { pattern: /\/minesweeper-beta\//, id: 'minesweeper', name: '化境探雷' },
    { pattern: /\/minesweeper\//, id: 'minesweeper', name: '化境探雷' },
    { pattern: /\/新建文件夹\//, id: 'molecular-billiards', name: '分子台球' },
  ];

  function detectGame() {
    var path = decodeURIComponent(window.location.pathname);
    for (var i = 0; i < PATH_MAP.length; i++) {
      if (PATH_MAP[i].pattern.test(path)) return PATH_MAP[i];
    }
    return null;
  }

  var gameInfo = detectGame();
  if (!gameInfo) return;

  var gameId = gameInfo.id;
  var gameName = gameInfo.name;

  // ── Inject CSS ──
  var style = document.createElement('style');
  style.textContent = `
    #hgame-lb-btn {
      position: fixed; bottom: 80px; right: 16px; z-index: 99998;
      background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
      color: #1a1a2e; border: none; border-radius: 14px;
      padding: 10px 16px; font-size: 14px; font-weight: 800;
      cursor: pointer; box-shadow: 0 4px 16px rgba(255,215,0,0.35);
      transition: transform 0.2s, box-shadow 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      -webkit-tap-highlight-color: transparent;
    }
    #hgame-lb-btn:hover { transform: scale(1.06); box-shadow: 0 6px 24px rgba(255,215,0,0.5); }
    #hgame-lb-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      width: 100vw; height: 100vh; z-index: 100001;
      background: rgba(0,0,0,0.72); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.25s; pointer-events: none;
      box-sizing: border-box;
    }
    #hgame-lb-overlay.show { opacity: 1; pointer-events: auto; }
    #hgame-lb-card {
      background: linear-gradient(160deg, #0c1829 0%, #0f1f3a 55%, #0a1425 100%);
      color: #e2e8f0; border-radius: 22px;
      max-width: 440px; width: 92vw; max-height: 82vh; max-height: 82dvh;
      overflow-y: auto; padding: 24px 20px 18px;
      box-shadow: 0 0 40px rgba(86,224,255,0.12), 0 20px 60px rgba(0,0,0,0.5);
      border: 1px solid rgba(86,224,255,0.2);
      transform: translateY(20px) scale(0.96);
      transition: transform 0.25s; box-sizing: border-box; margin: auto;
    }
    #hgame-lb-overlay.show #hgame-lb-card { transform: translateY(0) scale(1); }
    #hgame-lb-card h2 {
      margin: 0 0 4px; font-size: 1.4em; text-align: center;
      background: linear-gradient(90deg, #ffd700, #ff8c00);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    #hgame-lb-card .lb-subtitle {
      text-align: center; color: #7fb6d5; font-size: 0.85em; margin: 0 0 16px;
    }
    #hgame-lb-card .lb-empty {
      text-align: center; color: #64748b; padding: 32px 0; font-size: 0.95em;
    }
    #hgame-lb-card .lb-loading {
      text-align: center; color: #7fb6d5; padding: 32px 0; font-size: 0.95em;
    }
    .lb-table { width: 100%; border-collapse: collapse; }
    .lb-table th {
      font-size: 0.72em; letter-spacing: 0.1em; text-transform: uppercase;
      color: #5a8faa; padding: 8px 6px; text-align: left;
      border-bottom: 1px solid rgba(86,224,255,0.15);
    }
    .lb-table td {
      padding: 10px 6px; font-size: 0.9em; border-bottom: 1px solid rgba(255,255,255,0.05);
      vertical-align: middle;
    }
    .lb-table tr:hover td { background: rgba(86,224,255,0.04); }
    .lb-rank { font-weight: 800; width: 42px; text-align: center; font-size: 1.1em; }
    .lb-rank-1 { color: #ffd700; text-shadow: 0 0 8px rgba(255,215,0,0.4); }
    .lb-rank-2 { color: #c0c0c0; text-shadow: 0 0 8px rgba(192,192,192,0.3); }
    .lb-rank-3 { color: #cd7f32; text-shadow: 0 0 8px rgba(205,127,50,0.3); }
    .lb-rank-other { color: #5a8faa; }
    .lb-name { font-weight: 600; color: #e2e8f0; }
    .lb-name.lb-me { color: #56e0ff; }
    .lb-score { font-weight: 800; color: #fff; font-variant-numeric: tabular-nums; }
    .lb-time { color: #5a8faa; font-size: 0.82em; }
    .lb-my-rank {
      margin-top: 12px; padding: 10px 14px;
      background: rgba(86,224,255,0.06); border: 1px solid rgba(86,224,255,0.15);
      border-radius: 12px; font-size: 0.88em; color: #7fb6d5; text-align: center;
    }
    .lb-my-rank strong { color: #56e0ff; }
    #hgame-lb-close {
      display: block; margin: 16px auto 0; padding: 10px 32px;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px; color: #d4f0ff; font-size: 0.95em; font-weight: 700;
      cursor: pointer; transition: background 0.2s;
      font-family: inherit;
    }
    #hgame-lb-close:hover { background: rgba(255,255,255,0.14); }
    #hgame-lb-card::-webkit-scrollbar { width: 5px; }
    #hgame-lb-card::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
    @media (max-width: 480px) {
      #hgame-lb-btn { bottom: 76px; right: 12px; padding: 8px 12px; font-size: 13px; }
      #hgame-lb-card { padding: 18px 14px 14px; }
      #hgame-lb-card h2 { font-size: 1.2em; }
      .lb-table td { padding: 8px 4px; font-size: 0.82em; }
      .lb-time { display: none; }
    }
  `;
  document.head.appendChild(style);

  // ── Leaderboard button ──
  var btn = document.createElement('button');
  btn.id = 'hgame-lb-btn';
  btn.textContent = '🏆 排行榜';
  document.body.appendChild(btn);

  // ── Overlay container ──
  var overlay = document.createElement('div');
  overlay.id = 'hgame-lb-overlay';
  overlay.innerHTML = `
    <div id="hgame-lb-card">
      <h2>🏆 排行榜</h2>
      <p class="lb-subtitle">${escHtml(gameName)}</p>
      <div id="hgame-lb-body"><div class="lb-loading">加载中...</div></div>
      <button id="hgame-lb-close">关闭</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── Fetch and render ──
  var currentUsername = null;

  function fetchCurrentUser() {
    return fetch('/api/user', { credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(d) { currentUsername = d.username || null; })
      .catch(function() {});
  }

  function rankIcon(i) {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return '#' + (i + 1);
  }

  function rankClass(i) {
    if (i === 0) return 'lb-rank lb-rank-1';
    if (i === 1) return 'lb-rank lb-rank-2';
    if (i === 2) return 'lb-rank lb-rank-3';
    return 'lb-rank lb-rank-other';
  }

  function formatDate(dateStr) {
    try {
      var d = new Date(dateStr);
      var mm = d.getMonth() + 1;
      var dd = d.getDate();
      var hh = String(d.getHours()).padStart(2, '0');
      var mi = String(d.getMinutes()).padStart(2, '0');
      return mm + '/' + dd + ' ' + hh + ':' + mi;
    } catch(e) { return '-'; }
  }

  function loadLeaderboard() {
    var body = document.getElementById('hgame-lb-body');
    body.innerHTML = '<div class="lb-loading">加载中...</div>';

    Promise.all([
      fetch('/api/leaderboard/' + gameId).then(function(r) { return r.json(); }),
      fetchCurrentUser()
    ]).then(function(results) {
      var data = results[0];
      if (!data || data.length === 0) {
        body.innerHTML = '<div class="lb-empty">暂无记录，快来争夺第一！</div>';
        return;
      }

      var top10 = data.slice(0, 10);
      var myRankInfo = '';

      // Find current user's rank if not in top 10
      if (currentUsername) {
        var inTop10 = false;
        for (var k = 0; k < top10.length; k++) {
          if (top10[k].username === currentUsername) { inTop10 = true; break; }
        }
        if (!inTop10) {
          for (var j = 10; j < data.length; j++) {
            if (data[j].username === currentUsername) {
              myRankInfo = '<div class="lb-my-rank">你的排名：<strong>#' + (j + 1) + '</strong>（最高分 ' + data[j].best_score + '）</div>';
              break;
            }
          }
        }
      }

      var html = '<table class="lb-table"><thead><tr><th>排名</th><th>玩家</th><th>最高分</th><th>最近游玩</th></tr></thead><tbody>';
      for (var i = 0; i < top10.length; i++) {
        var row = top10[i];
        var isMe = currentUsername && row.username === currentUsername;
        html += '<tr>'
          + '<td class="' + rankClass(i) + '">' + rankIcon(i) + '</td>'
          + '<td class="lb-name' + (isMe ? ' lb-me' : '') + '">' + escHtml(row.username) + (isMe ? ' (你)' : '') + '</td>'
          + '<td class="lb-score">' + row.best_score + '</td>'
          + '<td class="lb-time">' + formatDate(row.last_played) + '</td>'
          + '</tr>';
      }
      html += '</tbody></table>';
      html += myRankInfo;
      body.innerHTML = html;
    }).catch(function() {
      body.innerHTML = '<div class="lb-empty">加载失败，请稍后重试</div>';
    });
  }

  // ── Show / Hide ──
  function showLB() {
    loadLeaderboard();
    overlay.classList.add('show');
  }

  function hideLB() {
    overlay.classList.remove('show');
  }

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    showLB();
  });

  document.getElementById('hgame-lb-close').addEventListener('click', function() {
    hideLB();
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) hideLB();
  });

  // ── Escape key to close ──
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.classList.contains('show')) {
      hideLB();
    }
  });

  // ── Public API for game-end integration ──
  // Games can call window.hgameLeaderboard.show() after game over
  window.hgameLeaderboard = {
    show: showLB,
    hide: hideLB,
    refresh: loadLeaderboard,
    gameId: gameId
  };

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
})();
