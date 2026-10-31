/* 元素自走棋 · 渲染与交互层
   纯逻辑在 logic.js（可在 Node 里跑断言），这里只负责画和点。 */
(function () {
  'use strict';

  var A = window.AutoChess;
  var el = function (id) { return document.getElementById(id); };

  if (!A) {
    showError('logic.js 未加载，无法启动。');
    return;
  }

  var S = {
    g: null,
    selBench: null,   // 选中的备战席单位 uid
    selBoard: null,   // 选中的棋盘单位 key（r+','+c）
    timer: null,
    speed: 1,
    preview: null,
    previewRound: -1
  };

  var CV = el('board');
  var CX = CV.getContext('2d');
  var CW = CV.width, CH = CV.height;
  var COLS = A.COLS, ROWS = A.ROWS;
  var CELL_W = CW / COLS, CELL_H = CH / ROWS;

  function showError(msg) {
    var b = el('errorBanner');
    if (!b) return;
    b.textContent = msg;
    b.hidden = false;
  }

  window.addEventListener('error', function (e) {
    showError('运行时错误：' + (e.message || e.error));
  });

  /* ---------------- 工具 ---------------- */
  function findBoardAt(r, c) {
    var b = S.g.board;
    for (var i = 0; i < b.length; i++) if (b[i].r === r && b[i].c === c) return b[i];
    return null;
  }
  function findBench(uid) {
    var b = S.g.bench;
    for (var i = 0; i < b.length; i++) if (b[i].uid === uid) return b[i];
    return null;
  }
  function stars(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '★';
    return s;
  }
  function costClass(cost) { return 'cost' + Math.max(1, Math.min(5, cost)); }

  /* ---------------- 顶栏 ---------------- */
  function renderStats() {
    var g = S.g;
    el('stRound').textContent = '回合 ' + g.round;
    el('stGold').textContent = '金币 ' + g.gold;
    el('stHp').textContent = '血量 ' + Math.max(0, g.hp);
    el('stLevel').textContent = '等级 ' + g.level + '（' + g.xp + '/' + A.xpNeed(g.level) + '）';
    var tr = A.activeTraits(g.board);
    el('stTraits').textContent = '羁绊 ' + tr.length;
    el('stBoard').textContent = '上阵 ' + g.board.length + '/' + A.boardMax(g);

    var tag = el('phaseTag');
    var fighting = g.phase === 'combat';
    tag.textContent = fighting ? '战斗中' : (g.phase === 'over' ? '已结束' : '备战');
    tag.classList.toggle('combat', fighting);
    el('enemyTag').textContent = '对手：第 ' + g.round + ' 回合 · 强度 ×' + (g.enemyScale || 1).toFixed(1);
  }

  /* ---------------- 羁绊面板 ---------------- */
  function renderTraits() {
    var g = S.g;
    var counts = A.traitCounts(g.board);
    var box = el('traitList');
    var rows = [];

    Object.keys(A.TRAITS).forEach(function (axis) {
      var defs = A.TRAITS[axis];
      Object.keys(defs).forEach(function (key) {
        var def = defs[key];
        var n = (counts[axis] && counts[axis][key]) || 0;
        var best = null;
        (def.tiers || []).forEach(function (t) { if (n >= t.n) best = t; });
        rows.push({ axis: axis, key: key, def: def, n: n, best: best });
      });
    });

    // 有进度的排前面，同级按达成档位降序
    rows.sort(function (a, b) {
      var sa = (a.best ? 100 : 0) + a.n, sb = (b.best ? 100 : 0) + b.n;
      return sb - sa;
    });

    var html = '';
    rows.forEach(function (r) {
      var tiers = r.def.tiers || [];
      var maxN = tiers.length ? tiers[tiers.length - 1].n : 1;
      var bars = '';
      tiers.forEach(function (t) {
        bars += '<span class="' + (r.n >= t.n ? 'hit' : '') + '"></span>';
      });
      var nextTxt = r.best ? ('生效：' + r.best.desc)
        : (function () {
          var nx = null;
          tiers.forEach(function (t) { if (!nx && r.n < t.n) nx = t; });
          return nx ? ('再 ' + (nx.n - r.n) + ' 个 → ' + nx.desc) : '无';
        })();
      html += '<div class="trait' + (r.best ? ' on' : '') + '">'
        + '<div class="tl"><b>' + r.def.name + '</b><i>' + r.n + ' / ' + maxN + '</i></div>'
        + '<div class="td">' + nextTxt + '</div>'
        + '<div class="tiers">' + bars + '</div>'
        + '</div>';
    });
    box.innerHTML = html || '<div class="trait"><div class="td">棋盘上还没有单位</div></div>';
  }

  /* ---------------- 战报 ---------------- */
  function renderLog() {
    var g = S.g;
    var box = el('log');
    var lines = (g.log || []).slice(-40).reverse();
    box.innerHTML = lines.map(function (t) {
      var cls = /胜|胜利/.test(t) ? 'hl' : (/负|失败|断电/.test(t) ? 'bad' : '');
      return '<div class="' + cls + '">' + t + '</div>';
    }).join('');
  }

  /* ---------------- 商店 ---------------- */
  function renderShop() {
    var g = S.g;
    var box = el('shop');
    box.innerHTML = '';
    g.shop.forEach(function (id, i) {
      var card = document.createElement('div');
      if (!id) {
        card.className = 'ucard empty';
        card.innerHTML = '<span class="nm">已售</span>';
        box.appendChild(card);
        return;
      }
      var u = A.UNITS[id];
      var cant = g.gold < u.cost || g.phase !== 'prep';
      card.className = 'ucard ' + costClass(u.cost) + (cant ? ' cant' : '');
      card.dataset.idx = i;
      card.innerHTML = '<span class="price">' + u.cost + '</span>'
        + '<span class="sym" style="color:' + u.color + '">' + u.sym + '</span>'
        + '<span class="nm">' + u.name + '</span>';
      card.title = u.name + ' · ' + u.tag + '\nHP ' + u.hp + ' / 攻击 ' + u.atk
        + ' / 护甲 ' + u.armor + ' / 射程 ' + u.range + '\n电负性 ' + u.chi
        + ' · ' + u.family + ' · 第 ' + u.period + ' 周期 · ' + u.block + ' 区';
      card.addEventListener('click', function () { onBuy(i); });
      box.appendChild(card);
    });

    el('rerollCost').textContent = A.REROLL_COST;
    el('xpCost').textContent = A.XP_PER_BUY_COST;
    el('lockBtn').textContent = g.locked ? '已锁定' : '锁定';
    el('rerollBtn').disabled = g.gold < A.REROLL_COST || g.phase !== 'prep';
    el('xpBtn').disabled = g.gold < A.XP_PER_BUY_COST || g.phase !== 'prep';
    el('fightBtn').disabled = g.phase !== 'prep' || g.board.length === 0;
    var odds = A.SHOP_ODDS[Math.max(0, Math.min(A.SHOP_ODDS.length - 1, g.level - 1))];
    el('oddsHint').textContent = '成本概率 1~5 费：' + odds.map(function (p) { return Math.round(p * 100) + '%'; }).join(' / ');
  }

  /* ---------------- 备战席 ---------------- */
  function renderBench() {
    var g = S.g;
    var box = el('bench');
    box.innerHTML = '';
    if (!g.bench.length) {
      box.innerHTML = '<div class="empty">空 —— 从下方招募元素，或把棋盘上的单位拿回来</div>';
      return;
    }
    g.bench.forEach(function (p) {
      var u = A.UNITS[p.id];
      var card = document.createElement('div');
      card.className = 'ucard ' + costClass(u.cost) + (S.selBench === p.uid ? ' sel' : '');
      card.dataset.uid = p.uid;
      card.innerHTML = '<span class="st">' + stars(p.star) + '</span>'
        + '<span class="sym" style="color:' + u.color + '">' + u.sym + '</span>'
        + '<span class="nm">' + u.name + '</span>';
      card.title = u.name + ' ' + stars(p.star) + '\nHP ' + p.maxHp + ' / 攻击 ' + p.atk
        + '\n点击选中后点棋盘落子；右键出售';
      card.addEventListener('click', function () {
        S.selBench = (S.selBench === p.uid ? null : p.uid);
        S.selBoard = null;
        renderBench(); renderBoard();
      });
      card.addEventListener('contextmenu', function (ev) {
        ev.preventDefault();
        var r = A.sell(g, p.uid);
        if (r && r.ok) { S.selBench = null; renderAll(); }
      });
      box.appendChild(card);
    });
  }

  /* ---------------- 棋盘 ---------------- */
  function renderBoard() {
    var g = S.g;
    CX.clearRect(0, 0, CW, CH);

    // 底色：敌方区偏红、己方区偏绿
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = c * CELL_W, y = r * CELL_H;
        var mine = r >= Math.floor(ROWS / 2);
        CX.fillStyle = mine
          ? ((r + c) % 2 ? '#12241c' : '#142a20')
          : ((r + c) % 2 ? '#241318' : '#2a171d');
        CX.fillRect(x, y, CELL_W, CELL_H);
        CX.strokeStyle = 'rgba(90,140,160,.10)';
        CX.lineWidth = 1;
        CX.strokeRect(x + .5, y + .5, CELL_W - 1, CELL_H - 1);
      }
    }
    // 中线
    var mid = Math.floor(ROWS / 2) * CELL_H;
    CX.strokeStyle = 'rgba(240,192,74,.28)';
    CX.setLineDash([8, 8]);
    CX.beginPath();
    CX.moveTo(0, mid);
    CX.lineTo(CW, mid);
    CX.stroke();
    CX.setLineDash([]);

    // 落子提示
    if (S.selBench) {
      for (var rr = Math.floor(ROWS / 2); rr < ROWS; rr++) {
        for (var cc = 0; cc < COLS; cc++) {
          if (!findBoardAt(rr, cc)) {
            CX.fillStyle = 'rgba(240,192,74,.10)';
            CX.fillRect(cc * CELL_W + 3, rr * CELL_H + 3, CELL_W - 6, CELL_H - 6);
          }
        }
      }
    }

    // 单位
    var fight = g.phase === 'combat' && g.match;
    var units = [];
    if (fight) {
      units = (g.match.units || []).filter(function (u) { return u.alive; });
    } else {
      g.board.forEach(function (b) { units.push(Object.assign({ side: 'ally', r: b.r, c: b.c }, b.piece)); });
      (g.match && g.match.enemySnap ? g.match.enemySnap : []).forEach(function (b) {
        units.push(Object.assign({ side: 'enemy', r: b.r, c: b.c }, b.piece));
      });
      if (!g.match || !g.match.enemySnap) {
        // 备战阶段预演对手站位（按回合缓存，且用独立 rng，避免污染对局随机序列）
        if (!S.preview || S.previewRound !== g.round) {
          try {
            var fake = Object.assign({}, g, { rng: A.mulberry(1000 + g.round * 37) });
            S.preview = A.makeEnemy(fake) || [];
          } catch (e) { S.preview = []; }
          S.previewRound = g.round;
        }
        (S.preview || []).forEach(function (b) {
          units.push(Object.assign({ side: 'enemy', r: b.r, c: b.c }, b.piece));
        });
      }
    }

    units.forEach(function (u) { drawUnit(u, fight); });

    // 伤害飘字
    if (fight && g.match.fx) {
      g.match.fx.forEach(function (f) {
        if (f.life > 0) {
          var px = f.c * CELL_W + CELL_W / 2;
          var py = f.r * CELL_H + CELL_H * 0.35;
          CX.globalAlpha = Math.max(0, Math.min(1, f.life));
          CX.fillStyle = f.side === 'ally' ? '#ffe08a' : '#ff9b9b';
          CX.font = 'bold 15px system-ui';
          CX.textAlign = 'center';
          CX.fillText('-' + f.text, px, py);
          CX.globalAlpha = 1;
        }
      });
    }

    // 选中框
    if (S.selBoard) {
      var parts = S.selBoard.split(',');
      CX.strokeStyle = '#f0c04a';
      CX.lineWidth = 2;
      CX.strokeRect(+parts[1] * CELL_W + 2, +parts[0] * CELL_H + 2, CELL_W - 4, CELL_H - 4);
    }
  }

  function drawUnit(u, fight) {
    var x = u.c * CELL_W, y = u.r * CELL_H;
    var pad = 5, w = CELL_W - pad * 2, h = CELL_H - pad * 2;
    var def = A.UNITS[u.id] || {};
    var col = u.color || def.color || '#cfd8dd';
    var symTxt = u.sym || def.sym || '?';
    var nameTxt = u.name || def.name || '';
    var ally = u.side === 'ally';

    // 底卡
    var grd = CX.createLinearGradient(x, y, x, y + CELL_H);
    if (ally) { grd.addColorStop(0, '#1b3a2c'); grd.addColorStop(1, '#24503a'); }
    else { grd.addColorStop(0, '#3a1b22'); grd.addColorStop(1, '#50242c'); }
    roundRect(x + pad, y + pad, w, h, 9);
    CX.fillStyle = grd;
    CX.fill();
    CX.strokeStyle = ally ? 'rgba(120,220,170,.55)' : 'rgba(240,140,150,.55)';
    CX.lineWidth = 1.4;
    CX.stroke();

    // 符号
    CX.textAlign = 'center';
    CX.textBaseline = 'middle';
    CX.fillStyle = col;
    CX.font = 'bold ' + Math.round(CELL_H * 0.3) + 'px system-ui';
    CX.fillText(symTxt, x + CELL_W / 2, y + CELL_H * 0.44);

    // 名
    CX.fillStyle = 'rgba(226,240,246,.78)';
    CX.font = Math.round(CELL_H * 0.14) + 'px system-ui';
    CX.fillText(nameTxt, x + CELL_W / 2, y + CELL_H * 0.72);

    // 星级
    if (u.star > 1) {
      CX.fillStyle = '#f0c04a';
      CX.font = Math.round(CELL_H * 0.13) + 'px system-ui';
      CX.fillText(stars(u.star), x + CELL_W / 2, y + CELL_H * 0.16);
    }

    // 血条
    var hpR = Math.max(0, Math.min(1, (u.hp || 0) / (u.maxHp || 1)));
    var bw = w - 10, bx = x + pad + 5, by = y + CELL_H - pad - 9;
    CX.fillStyle = 'rgba(0,0,0,.55)';
    CX.fillRect(bx, by, bw, 4);
    CX.fillStyle = hpR > .5 ? '#4ade80' : (hpR > .22 ? '#f5c451' : '#f87171');
    CX.fillRect(bx, by, bw * hpR, 4);

    // 蓝条（战斗中）
    if (fight) {
      var mR = Math.max(0, Math.min(1, (u.bar || 0) / 100));
      CX.fillStyle = 'rgba(0,0,0,.5)';
      CX.fillRect(bx, by - 6, bw, 3);
      CX.fillStyle = '#60a5fa';
      CX.fillRect(bx, by - 6, bw * mR, 3);
    }
  }

  function roundRect(x, y, w, h, r) {
    CX.beginPath();
    CX.moveTo(x + r, y);
    CX.arcTo(x + w, y, x + w, y + h, r);
    CX.arcTo(x + w, y + h, x, y + h, r);
    CX.arcTo(x, y + h, x, y, r);
    CX.arcTo(x, y, x + w, y, r);
    CX.closePath();
  }

  /* ---------------- 交互 ---------------- */
  function onBuy(i) {
    var g = S.g;
    if (g.phase !== 'prep') return;
    var r = A.buy(g, i);
    if (!r || !r.ok) {
      if (r && r.reason === 'gold') flash('stGold');
      else if (r && r.reason === 'bench') flash('stBoard');
      return;
    }
    S.selBench = r.piece.uid;
    renderAll();
  }

  CV.addEventListener('click', function (ev) {
    var g = S.g;
    if (g.phase === 'combat') return;
    var rect = CV.getBoundingClientRect();
    var sx = (ev.clientX - rect.left) * (CW / rect.width);
    var sy = (ev.clientY - rect.top) * (CH / rect.height);
    var c = Math.floor(sx / CELL_W), r2 = Math.floor(sy / CELL_H);
    if (c < 0 || c >= COLS || r2 < 0 || r2 >= ROWS) return;
    var mine = r2 >= Math.floor(ROWS / 2);
    var at = findBoardAt(r2, c);

    if (S.selBench) {
      if (!mine) return;
      var res = A.place(g, S.selBench, r2, c);
      if (res && res.ok) { S.selBench = null; renderAll(); }
      return;
    }
    if (at) {
      if (mine) {
        var key = r2 + ',' + c;
        if (S.selBoard === key) {
          // 再点一次 → 拿回备战席
          var up = A.unplace(g, at.piece.uid);
          if (up && up.ok) S.selBoard = null;
          renderAll();
        } else {
          S.selBoard = key;
          renderBoard();
        }
      }
      return;
    }
    S.selBoard = null;
    renderBoard();
  });

  CV.addEventListener('contextmenu', function (ev) {
    ev.preventDefault();
    var g = S.g;
    if (g.phase === 'combat') return;
    var rect = CV.getBoundingClientRect();
    var sx = (ev.clientX - rect.left) * (CW / rect.width);
    var sy = (ev.clientY - rect.top) * (CH / rect.height);
    var c = Math.floor(sx / CELL_W), r2 = Math.floor(sy / CELL_H);
    var at = findBoardAt(r2, c);
    if (!at) return;
    var r = A.sell(g, at.piece.uid);
    if (r && r.ok) { S.selBoard = null; renderAll(); }
  });

  function flash(id) {
    var n = el(id);
    if (!n) return;
    n.classList.remove('flash');
    void n.offsetWidth;
    n.classList.add('flash');
  }

  /* ---------------- 按钮 ---------------- */
  el('rerollBtn').addEventListener('click', function () {
    var r = A.reroll(S.g);
    if (r && r.ok) renderAll();
  });
  el('xpBtn').addEventListener('click', function () {
    var r = A.buyXp(S.g);
    if (r && r.ok) renderAll();
  });
  el('lockBtn').addEventListener('click', function () {
    S.g.locked = !S.g.locked;
    renderShop();
  });
  el('fightBtn').addEventListener('click', startFight);
  el('restartBtn').addEventListener('click', function () { newRun(); });
  el('helpBtn').addEventListener('click', function () {
    showOverlay({
      eyebrow: 'HOW TO PLAY',
      title: '元素自走棋 · 玩法',
      body: '招募 12 种元素上场，凑出「族 / 周期 / 区块」双轴羁绊；相邻两枚友军电负性差 ≥ 1.8 时会触发电负性离子键合击（伤害 ×1.35）。每回合自动开打，输了掉血，血量归零或打满 40 回合结束。',
      stats: [['操作', '点商店招募'], ['落子', '选中后点棋盘'], ['出售', '右键单位']],
      primary: '知道了', secondary: null
    });
  });

  /* ---------------- 战斗 ---------------- */
  function startFight() {
    var g = S.g;
    if (g.phase !== 'prep' || !g.board.length) return;
    var r = A.startCombat(g);
    if (!r || !r.ok) return;
    S.selBench = null; S.selBoard = null;
    renderAll();

    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    S.timer = setInterval(function () {
      var m = g.match;
      if (!m || m.done) {
        clearInterval(S.timer); S.timer = null;
        finishFight();
        return;
      }
      A.stepCombat(m);
      renderBoard();
      if (m.done) {
        clearInterval(S.timer); S.timer = null;
        setTimeout(finishFight, 550);
      }
    }, A.TICK_MS);
  }

  function finishFight() {
    var g = S.g;
    var m = g.match;
    var res = A.endCombat(g);
    S.g.match = null;
    renderAll();
    if (g.phase === 'over') {
      var stats = g.stats || { wins: 0, losses: 0 };
      showOverlay({
        eyebrow: 'RUN OVER',
        title: g.hp <= 0 ? '实验室断电 · 挑战结束' : '通关！',
        body: '你打到了第 ' + g.round + ' 回合。',
        stats: [['胜', stats.wins], ['负', stats.losses], ['回合', g.round]],
        primary: '再来一局', secondary: '重开'
      });
      return;
    }
    // 单回合结果用浮层轻提示
    var win = res && res.win;
    showOverlay({
      eyebrow: 'ROUND ' + (g.round - 1),
      title: win ? '本回合胜利' : '本回合失败',
      body: (win ? '对手全灭，' : '我方全灭，') + '获得 ' + ((res && res.income) || 0) + ' 金币。当前血量 ' + Math.max(0, g.hp) + '。',
      stats: [['血量', Math.max(0, g.hp)], ['金币', g.gold], ['连胜/连败', Math.max(g.winStreak, g.loseStreak)]],
      primary: '继续',
      secondary: null
    });
    void m;
  }

  /* ---------------- 浮层 ---------------- */
  function showOverlay(o) {
    el('ovEyebrow').textContent = o.eyebrow || '';
    el('ovTitle').textContent = o.title || '';
    el('ovBody').textContent = o.body || '';
    el('ovStats').innerHTML = (o.stats || []).map(function (s) {
      return '<span>' + s[0] + ' <b>' + s[1] + '</b></span>';
    }).join('');
    var p = el('ovPrimary'), s2 = el('ovSecondary');
    p.textContent = o.primary || '继续';
    p.onclick = function () {
      el('overlay').hidden = true;
      if (o.primary === '再来一局' || o.primary === '知道了') {
        if (o.primary === '再来一局') newRun();
      }
    };
    if (o.secondary) {
      s2.hidden = false;
      s2.textContent = o.secondary;
      s2.onclick = function () { el('overlay').hidden = true; newRun(); };
    } else {
      s2.hidden = true;
    }
    el('overlay').hidden = false;
  }

  /* ---------------- 全量渲染 ---------------- */
  function renderAll() {
    renderStats();
    renderShop();
    renderBench();
    renderTraits();
    renderLog();
    renderBoard();
  }

  function newRun() {
    if (S.timer) { clearInterval(S.timer); S.timer = null; }
    S.g = A.createGame({ seed: (Date.now() % 2147483647) });
    S.selBench = null; S.selBoard = null;
    el('overlay').hidden = true;
    renderAll();
    // 开局送一次免费提示
    if (S.g.log && S.g.log.length) renderLog();
  }

  /* ---------------- 启动 ---------------- */
  try {
    newRun();
    // 调试钩子
    window.__ac = { A: A, S: S, render: renderAll, fight: startFight };
  } catch (e) {
    showError('启动失败：' + (e && e.message));
    if (window.console) console.error(e);
  }
})();
