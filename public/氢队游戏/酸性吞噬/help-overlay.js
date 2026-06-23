(function() {
  'use strict';

  // Path → gameId mapping
  var PATH_MAP = [
    { pattern: /\/有机过熟-mobile\//, id: 'organic' },
    { pattern: /\/有机过熟\//, id: 'organic' },
    { pattern: /\/acid-arena-mobile\//, id: 'acid' },
    { pattern: /\/acid-arena\//, id: 'acid' },
    { pattern: /\/EvZ\//, id: 'evz' },
    { pattern: /\/丹道化学\//, id: 'alchemy' },
    { pattern: /\/环己烷大作战-mobile\//, id: 'cyclohexane' },
    { pattern: /\/环己烷大作战\//, id: 'cyclohexane' },
    { pattern: /\/元素化学-mobile\//, id: 'turtle' },
    { pattern: /\/元素化学\//, id: 'turtle' },
    { pattern: /\/新建文件夹\//, id: 'billiards' },
  ];

  function detectGame() {
    var path = decodeURIComponent(window.location.pathname);
    for (var i = 0; i < PATH_MAP.length; i++) {
      if (PATH_MAP[i].pattern.test(path)) return PATH_MAP[i].id;
    }
    return null;
  }

  var gameId = detectGame();
  if (!gameId || typeof HELP_CONFIG === 'undefined' || !HELP_CONFIG[gameId]) return;

  var config = HELP_CONFIG[gameId];
  var storageKey = 'hgame-help-seen-' + gameId;

  // ── Inject CSS ──
  var style = document.createElement('style');
  style.textContent = [
    '#hgame-help-btn{position:fixed;top:12px;right:12px;z-index:99999;width:40px;height:40px;border-radius:50%;background:#fff;color:#1a1a2e;border:none;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;-webkit-tap-highlight-color:transparent}',
    '#hgame-help-btn:hover{transform:scale(1.1);box-shadow:0 4px 16px rgba(0,0,0,.45)}',
    '#hgame-help-overlay{position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;z-index:100000;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s;pointer-events:none;box-sizing:border-box}',
    '#hgame-help-overlay.show{opacity:1;pointer-events:auto}',
    '#hgame-help-card{background:#0f172a;color:#e2e8f0;border-radius:16px;max-width:420px;width:92vw;max-height:80vh;max-height:80dvh;overflow-y:auto;padding:28px 24px 20px;box-shadow:0 8px 32px rgba(0,0,0,.5);transform:translateY(20px);transition:transform .25s;box-sizing:border-box;margin:auto}',
    '#hgame-help-overlay.show #hgame-help-card{transform:translateY(0)}',
    '#hgame-help-card h2{margin:0 0 6px;font-size:1.5em;text-align:center}',
    '#hgame-help-card .goal{text-align:center;color:#94a3b8;margin:0 0 18px;font-size:.95em;line-height:1.5}',
    '#hgame-help-card .section-title{font-size:.85em;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin:16px 0 8px;display:flex;align-items:center;gap:6px}',
    '#hgame-help-card table{width:100%;border-collapse:collapse;margin-bottom:4px}',
    '#hgame-help-card table td{padding:8px 10px;font-size:.9em;line-height:1.4}',
    '#hgame-help-card table tr:nth-child(odd){background:rgba(255,255,255,.04)}',
    '#hgame-help-card table tr:nth-child(even){background:rgba(255,255,255,.08)}',
    '#hgame-help-card table td:first-child{font-weight:600;color:#60a5fa;white-space:nowrap;width:40%}',
    '#hgame-help-card .tips{list-style:none;padding:0;margin:0 0 8px}',
    '#hgame-help-card .tips li{position:relative;padding:5px 0 5px 18px;font-size:.9em;line-height:1.5;color:#cbd5e1}',
    '#hgame-help-card .tips li::before{content:"";position:absolute;left:0;top:12px;width:8px;height:8px;border-radius:50%;background:#22c55e}',
    '#hgame-help-footer{display:flex;align-items:center;justify-content:space-between;margin-top:18px;gap:10px;flex-wrap:wrap}',
    '#hgame-help-footer label{font-size:.8em;color:#64748b;cursor:pointer;display:flex;align-items:center;gap:6px;user-select:none}',
    '#hgame-help-footer label input{accent-color:#22c55e;width:15px;height:15px}',
    '#hgame-start-btn{background:#22c55e;color:#fff;border:none;border-radius:10px;padding:10px 32px;font-size:1.05em;font-weight:700;cursor:pointer;transition:background .2s;flex-shrink:0}',
    '#hgame-start-btn:hover{background:#16a34a}',
    '#hgame-help-card::-webkit-scrollbar{width:5px}',
    '#hgame-help-card::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:3px}',
    '@media(max-width:480px){#hgame-help-card{padding:20px 16px 16px}#hgame-help-card h2{font-size:1.3em}#hgame-help-footer{flex-direction:column;align-items:stretch;text-align:center}#hgame-start-btn{width:100%}}'
  ].join('\n');
  document.head.appendChild(style);

  // ── Build help button ──
  var btn = document.createElement('button');
  btn.id = 'hgame-help-btn';
  btn.textContent = '❓';
  btn.title = '怎么玩';
  document.body.appendChild(btn);

  // ── Build overlay ──
  var overlay = document.createElement('div');
  overlay.id = 'hgame-help-overlay';

  var controlsHTML = '<table>';
  for (var c = 0; c < config.controls.length; c++) {
    controlsHTML += '<tr><td>' + escHtml(config.controls[c][0]) + '</td><td>' + escHtml(config.controls[c][1]) + '</td></tr>';
  }
  controlsHTML += '</table>';

  var tipsHTML = '<ul class="tips">';
  for (var t = 0; t < config.tips.length; t++) {
    tipsHTML += '<li>' + escHtml(config.tips[t]) + '</li>';
  }
  tipsHTML += '</ul>';

  overlay.innerHTML = [
    '<div id="hgame-help-card">',
    '  <h2>' + escHtml(config.title) + '</h2>',
    '  <p class="goal">🎯 ' + escHtml(config.goal) + '</p>',
    '  <div class="section-title">🕹️ 操作</div>',
         controlsHTML,
    '  <div class="section-title">💡 提示</div>',
         tipsHTML,
    '  <div id="hgame-help-footer">',
    '    <label><input type="checkbox" id="hgame-no-show">下次不再显示</label>',
    '    <button id="hgame-start-btn">开始！</button>',
    '  </div>',
    '</div>'
  ].join('\n');

  document.body.appendChild(overlay);

  // ── Interactions ──
  function showHelp() { overlay.classList.add('show'); }
  function hideHelp() {
    overlay.classList.remove('show');
    var cb = document.getElementById('hgame-no-show');
    if (cb && cb.checked) {
      try { localStorage.setItem(storageKey, '1'); } catch(e) {}
    }
  }

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    showHelp();
  });

  document.getElementById('hgame-start-btn').addEventListener('click', function() {
    hideHelp();
  });

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) hideHelp();
  });

  // ── Auto-show on first visit ──
  var seen = false;
  try { seen = localStorage.getItem(storageKey) === '1'; } catch(e) {}
  if (!seen) {
    // Small delay so game canvas can initialise first
    setTimeout(showHelp, 600);
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
})();
