/* 键能对决 PLUS —— 渲染层
 * 逻辑全部在 fight.js（纯函数、可 Node 直跑）；本文件只负责：
 *   大厅选人选场 → 输入采集（键盘/触屏多来源）→ 固定步长驱动 → Canvas 绘制 → HUD 同步
 * 绘制角色复用 art.js 的 FighterArt.actor()。
 */
(() => {
  'use strict';

  const F = window.Fight;
  const Art = window.FighterArt;
  if (!F) { document.getElementById('errorBanner')?.removeAttribute('hidden'); console.error('fight.js 未加载'); return; }

  const $ = (id) => document.getElementById(id);
  const C = $('game');
  const X = C.getContext('2d');
  const W = C.width, H = C.height;
  const STEP = 1000 / F.FPS;

  const MODE_LABEL = {
    easy: '简单 AI', normal: '标准 AI', hard: '困难 AI', training: '训练场', pvp: '双人同屏'
  };
  const MODE_HINT = {
    easy: 'AI 反应慢、少用终式 —— 适合熟悉手感。',
    normal: '完整 AI 对抗 · 三局两胜 · 每回合 60 秒，剩余稳定度比例判胜。',
    hard: 'AI 反应 6 帧、会接连续技 —— 请先练熟格挡与完美防御。',
    training: '无计时、AI 只做陪练，专注练连段与帧数。'
  };

  /* ---------------- 状态 ---------------- */
  const S = {
    pickP: 'H', pickE: 'O', pickStage: 'lab', mode: 'normal',
    sound: false, match: null, raf: 0, acc: 0, last: 0, hudT: 0, t: 0,
    sources: new Map(), buffer: {}, started: false
  };

  const KEYMAP = {
    a: 'left', d: 'right', w: 'up', s: 'block',
    j: 'light', k: 's1', l: 's2', u: 'ult'
  };
  const GLYPH = { left: '←', right: '→', up: '↑', block: '防', light: 'J', s1: 'K', s2: 'L', ult: 'U' };

  /* ---------------- 工具 ---------------- */
  function fighterIds() {
    const f = F.FIGHTERS;
    if (Array.isArray(f)) return f.map((x) => x && x.sym).filter(Boolean);
    return Object.keys(f);
  }
  function stageIds() {
    const s = F.STAGES;
    if (Array.isArray(s)) return s.map((x, i) => x && x.id ? x.id : Object.keys(F.STAGES)[i]);
    return Object.keys(s);
  }
  function fdata(id) { return (F.FIGHTERS[id] || (Array.isArray(F.FIGHTERS) ? F.FIGHTERS.find((x) => x.sym === id) : null)); }
  function sdata(id) { return F.STAGES[id] || (Array.isArray(F.STAGES) ? F.STAGES.find((x) => x.id === id) : null); }

  /* ---------------- 音效 ---------------- */
  let AC = null;
  function tone(freq, dur, type, gain) {
    if (!S.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.value = gain == null ? 0.045 : gain;
      o.connect(g); g.connect(AC.destination);
      const t0 = AC.currentTime;
      g.gain.setValueAtTime(g.gain.value, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* 忽略音频错误 */ }
  }

  /* ---------------- 大厅 ---------------- */
  function renderRoster() {
    const box = $('fighterList');
    if (!box) return;
    box.innerHTML = '';
    fighterIds().forEach((id) => {
      const d = fdata(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fighter' + (id === S.pickP ? ' sel' : '');
      b.dataset.id = id;
      b.innerHTML = '<span class="sym">' + (d ? d.sym : id) + '</span>' +
        '<b>' + (d ? d.name : id) + '</b>' +
        '<small>' + (d ? d.type : '') + '</small>';
      b.addEventListener('click', () => { S.pickP = id; renderRoster(); renderProfile(); });
      box.appendChild(b);
    });
  }

  function renderEnemyPicks() {
    const box = $('enemyPicks');
    if (!box) return;
    box.innerHTML = '';
    fighterIds().forEach((id) => {
      const d = fdata(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'enemy-pick' + (id === S.pickE ? ' sel' : '');
      b.dataset.id = id;
      b.innerHTML = '<b>' + (d ? d.sym : id) + '</b><small>' + (d ? d.name : '') + '</small>';
      b.addEventListener('click', () => { S.pickE = id; renderEnemyPicks(); });
      box.appendChild(b);
    });
    const sel = $('enemySel');
    if (sel) sel.value = S.pickE;
  }

  function renderStagePicks() {
    const box = $('stagePicks');
    if (!box) return;
    box.innerHTML = '';
    stageIds().forEach((id) => {
      const d = sdata(id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'stage-card' + (id === S.pickStage ? ' sel' : '');
      b.dataset.id = id;
      b.dataset.icon = d ? d.icon : '';
      b.innerHTML = '<b>' + (d ? d.name : id) + '</b><small>' + (d ? (d.note || d.tip || '') : '') + '</small>';
      b.addEventListener('click', () => { S.pickStage = id; renderStagePicks(); });
      box.appendChild(b);
    });
    const sel = $('stageSel');
    if (sel) sel.value = S.pickStage;
  }

  function renderProfile() {
    const d = fdata(S.pickP);
    if (!d) return;
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set('profileFormula', d.formula || d.sym);
    set('profileRole', d.role || d.type);
    set('profileName', d.name);
    set('profileDesc', d.desc || '');
    set('profileTip', d.tip || '');
    const st = $('profileStats');
    if (st) {
      st.innerHTML = '';
      [['稳定度', d.max], ['速度', d.speed], ['跳跃', d.jump]].forEach(([k, v]) => {
        const row = document.createElement('span');
        row.className = 'stat';
        row.innerHTML = '<small>' + k + '</small><b>' + v + '</b>';
        st.appendChild(row);
      });
    }
    const mv = $('moveList');
    if (mv) {
      mv.innerHTML = '';
      const list = [
        ['J', '连击 · 三连', 0, '轻攻击三段 · 命中可续接'],
        ['S+J', d.moves?.cr?.name || '—', 0, '蹲攻 · 下段，只能蹲防'],
        ['空中J', d.moves?.air?.name || '—', 0, '跳攻 · 中段，只能站防'],
        ['冲刺J', d.moves?.dash?.name || '—', 0, '冲刺攻击 · 突进追击'],
        ['S+K', d.moves?.launch?.name || '—', d.moves?.launch?.cost || 0, '上挑 · 把对手打浮空'],
        ['K', d.moves?.s1?.name || '—', d.moves?.s1?.cost || 0, d.moves?.s1?.note || '突进 / 位移技'],
        ['L', d.moves?.s2?.name || '—', d.moves?.s2?.cost || 0, d.moves?.s2?.note || '主力输出技'],
        ['U', d.moves?.ult?.name || '—', d.moves?.ult?.cost || 0, d.moves?.ult?.note || '超必杀 · 需气槽']
      ];
      list.forEach(([key, name, cost, note]) => {
        const row = document.createElement('div');
        row.className = 'move-item';
        row.innerHTML = '<kbd>' + key + '</kbd>' +
          '<span><b>' + name + '</b><small>' + note + '</small></span>' +
          '<span class="cost">' + (cost || '—') + '</span>';
        mv.appendChild(row);
      });
    }
    drawPortrait(d);
  }

  function drawPortrait(d) {
    const cv = $('portrait');
    if (!cv || !Art) return;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    const stub = {
      id: d.sym, vx: 0, guard: false, attack: null, face: 1,
      diamond: false, graphite: false, passiveShield: 0
    };
    g.save();
    g.translate(cv.width / 2, cv.height - 26);
    try { Art.actor(g, stub, S.t, 1.35); } catch (e) { /* 忽略 */ }
    g.restore();
  }

  /* ---------------- 输入 ---------------- */
  function setInput(action, down, source) {
    let set = S.sources.get(action);
    if (!set) { set = new Set(); S.sources.set(action, set); }
    if (down) set.add(source); else set.delete(source);
    // 高亮触屏键
    document.querySelectorAll('.ctrl[data-key]').forEach((el) => {
      const k = KEYMAP[el.dataset.key];
      if (k === action) el.classList.toggle('on', set.size > 0);
    });
  }
  function readInput() {
    const inp = F.emptyInput();
    S.sources.forEach((set, action) => { if (set.size && action in inp) inp[action] = true; });
    if (inp.block && inp.light) { inp.throw = true; inp.light = false; }
    return inp;
  }
  function releaseAll() {
    S.sources.forEach((set) => set.clear());
    document.querySelectorAll('.ctrl[data-key]').forEach((el) => el.classList.remove('on'));
  }

  const KEY_ALIAS = { arrowleft: 'a', arrowright: 'd', arrowup: 'w', arrowdown: 's', ' ': 'w' };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { togglePause(); return; }
    const k = KEY_ALIAS[e.key.toLowerCase()] || e.key.toLowerCase();
    const act = KEYMAP[k];
    if (!act) return;
    e.preventDefault();
    if (!S.sources.get(act)?.has('kb')) tone(act === 'block' ? 180 : 320, 0.04, 'triangle', 0.02);
    setInput(act, true, 'kb');
  });
  window.addEventListener('keyup', (e) => {
    const k = KEY_ALIAS[e.key.toLowerCase()] || e.key.toLowerCase();
    const act = KEYMAP[k];
    if (!act) return;
    e.preventDefault();
    setInput(act, false, 'kb');
  });

  function bindTouch() {
    document.querySelectorAll('#touch .ctrl[data-key]').forEach((el) => {
      const act = KEYMAP[el.dataset.key];
      if (!act) return;
      const down = (ev) => {
        ev.preventDefault();
        if (el.setPointerCapture && ev.pointerId != null) { try { el.setPointerCapture(ev.pointerId); } catch (e) {} }
        setInput(act, true, 'pt' + (el.dataset.key));
      };
      const up = (ev) => { ev.preventDefault(); setInput(act, false, 'pt' + (el.dataset.key)); };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    });
  }

  /* ---------------- 战斗流程 ---------------- */
  const SLOT_OF = { k: 's1', l: 's2', u: 'ult' };

  function syncMoveNames(id) {
    const d = fdata(id);
    if (!d || !d.moves) return;
    document.querySelectorAll('#touch .actions .ctrl[data-key]').forEach((el) => {
      const key = el.dataset.key;
      const b = el.querySelector('b');
      const sm = el.querySelector('small');
      if (key === 'j') {
        if (b) b.textContent = '连击 · 三连';
        if (sm) sm.textContent = '轻攻击·可续接';
        el.setAttribute('title',
          '轻攻击键按状态自动分派：\n' +
          '· 站立 → 连击 · 三连（三段，命中可继续出招）\n' +
          '· 下蹲 → ' + (d.moves?.cr?.name || '蹲攻') + '（下段，只能蹲防）\n' +
          '· 空中 → ' + (d.moves?.air?.name || '跳攻') + '（中段，只能站防）\n' +
          '· 冲刺中 → ' + (d.moves?.dash?.name || '冲刺攻击') + '（带前冲位移）\n' +
          '· 防御中贴身 → 投技（18 点，不可防御）');
        return;
      }
      const m = d.moves[SLOT_OF[key]];
      if (!m) return;
      if (b) b.textContent = m.name;
      if (sm) sm.textContent = '耗能 ' + m.cost + (m.meterCost ? ' · 气 ' + m.meterCost : '');
      let tip = m.name + '：' + (m.note || '') + (m.log ? '\n' + m.log : '');
      if (key === 'k' && d.moves?.launch) {
        tip += '\n\n按住 S（下）再按 K → ' + d.moves.launch.name +
          '：上挑，把对手打浮空（耗能 ' + d.moves.launch.cost + '）';
      }
      el.setAttribute('title', tip);
    });
  }

  function startMatch() {
    S.match = F.createMatch({
      p: S.pickP, e: S.pickE, stage: S.pickStage, mode: S.mode,
      aiLevel: S.mode === 'pvp' ? null : S.mode
    });
    S.acc = 0; S.last = 0; S.started = true;
    releaseAll();
    $('select').hidden = true;
    $('battle').hidden = false;
    $('overlay').hidden = true;
    const st = sdata(S.pickStage);
    const sn = $('stageName'), mn = $('modeName');
    if (sn) sn.textContent = st ? st.name : S.pickStage;
    if (mn) mn.textContent = MODE_LABEL[S.mode] || S.mode;
    const cl = $('conditions');
    if (cl) cl.textContent = st ? (st.icon + ' ' + st.name + ' · ' + (st.tip || st.note || '')) : '';
    syncMoveNames(S.pickP);
    syncHud(true);
    if (!S.raf) loop(performance.now());
  }

  function backToLobby() {
    S.started = false;
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0; }
    releaseAll();
    $('battle').hidden = true;
    $('select').hidden = false;
    $('overlay').hidden = true;
  }

  function togglePause() {
    if (!S.match || S.match.over) return;
    const m = S.match;
    m.paused = !m.paused;
    const ov = $('overlay');
    if (!ov) return;
    ov.hidden = !m.paused;
    if (m.paused) {
      $('overlayEyebrow').textContent = 'PAUSED';
      $('overlayTitle').textContent = '暂停中';
      $('overlayDetail').textContent = '按 Esc 继续，或回到大厅重新选人。';
      $('resumeBtn').hidden = false;
    }
  }

  function showResult() {
    const m = S.match;
    if (!m) return;
    const ov = $('overlay');
    if (!ov) return;
    ov.hidden = false;
    const win = m.winner === 'p';
    $('overlayEyebrow').textContent = m.winner === 'draw' ? 'DRAW' : (win ? 'VICTORY' : 'DEFEAT');
    $('overlayTitle').textContent = m.winner === 'draw' ? '平局' : (win ? '你赢了' : '你输了');
    const you = Math.round((m.p.stable / m.p.max) * 100);
    const cpu = Math.round((m.e.stable / m.e.max) * 100);
    $('overlayDetail').textContent = '比分 ' + m.p.wins + ' : ' + m.e.wins +
      ' · 剩余稳定度 ' + you + '% vs ' + cpu + '% · 最长连段 ' + (m.maxCombo || 0) + ' hit';
    $('resumeBtn').hidden = true;
  }

  /* ---------------- 主循环 ---------------- */
  function loop(now) {
    S.raf = requestAnimationFrame(loop);
    if (!S.started || !S.match) return;
    if (!S.last) S.last = now;
    let dt = now - S.last;
    S.last = now;
    if (dt > 200) dt = 200;
    S.t += dt;

    const m = S.match;
    if (!m.paused && !m.over) {
      S.acc += dt;
      let guard = 0;
      while (S.acc >= STEP && guard++ < 8) {
        F.step(m, readInput(), null);
        S.acc -= STEP;
      }
      if (m.over && !showResult.done) { showResult.done = true; showResult(); }
    }

    draw();
    if (now - S.hudT > 66) { S.hudT = now; syncHud(); }
  }

  /* ---------------- 绘制 ---------------- */
  const STAGE_PAINT = {
    lab: { sky: ['#1b2422', '#0f1413'], floor: '#243230', line: '#3c524c', far: '#2a3a36' },
    hot: { sky: ['#2a1a12', '#120b08'], floor: '#3a2318', line: '#7a3a1c', far: '#4a2a18' },
    sealed: { sky: ['#121a20', '#0a0f14'], floor: '#1b2830', line: '#2f5a6a', far: '#20353f' },
    cold: { sky: ['#141b26', '#0a0e15'], floor: '#1d2733', line: '#4a6f8c', far: '#243444' },
    electro: { sky: ['#111a1f', '#080d10'], floor: '#152229', line: '#2f6f6a', far: '#1b2f33' },
    catalyst: { sky: ['#1c1720', '#0f0b12'], floor: '#241d2a', line: '#5a3f6a', far: '#2c2334' }
  };

  /* 普通实验室：水槽（玻璃槽 + 水位 + 龙头 + 气泡）—— 这是「水槽/空气」里的水槽 */
  function drawSink() {
    const x = 40, top = F.GROUND - 118, w = 116, h = 96;
    X.save();
    // 支架
    X.fillStyle = '#2f4440';
    X.fillRect(x + 8, top + h, 10, F.GROUND - (top + h));
    X.fillRect(x + w - 18, top + h, 10, F.GROUND - (top + h));
    X.fillRect(x, top + h, w, 7);
    // 玻璃槽本体
    X.fillStyle = 'rgba(150,200,205,0.10)';
    X.fillRect(x, top, w, h);
    X.strokeStyle = 'rgba(180,230,230,0.55)'; X.lineWidth = 2;
    X.strokeRect(x, top, w, h);
    // 水位（水区存在时液面轻微波动，否则静止）
    const lvl = 0.62 + (S.match && S.match.water > 0 ? Math.sin(S.t / 7) * 0.02 : 0);
    const wy = top + h * (1 - lvl);
    const wg = X.createLinearGradient(0, wy, 0, top + h);
    wg.addColorStop(0, 'rgba(120,205,220,0.42)');
    wg.addColorStop(1, 'rgba(60,130,160,0.30)');
    X.fillStyle = wg;
    X.beginPath();
    X.moveTo(x + 2, wy);
    for (let i = 0; i <= 10; i++) {
      const px = x + 2 + (w - 4) * (i / 10);
      X.lineTo(px, wy + Math.sin(S.t / 14 + i * 0.8) * 2.2);
    }
    X.lineTo(x + w - 2, top + h - 2); X.lineTo(x + 2, top + h - 2);
    X.closePath(); X.fill();
    // 气泡
    X.fillStyle = 'rgba(200,240,245,0.35)';
    for (let i = 0; i < 5; i++) {
      const bx = x + 16 + ((i * 27 + (S.t * 0.35) % w) % (w - 32));
      const by = top + h - 8 - ((S.t * 0.9 + i * 31) % (h * lvl - 14));
      X.beginPath(); X.arc(bx, by, 1.8 + (i % 2), 0, Math.PI * 2); X.fill();
    }
    // 龙头
    X.strokeStyle = '#8fb6ae'; X.lineWidth = 5; X.lineCap = 'round';
    X.beginPath();
    X.moveTo(x + w * 0.5, top - 34);
    X.lineTo(x + w * 0.5, top - 12);
    X.lineTo(x + w * 0.5 + 22, top - 12);
    X.stroke();
    X.beginPath(); X.moveTo(x + w * 0.5, top - 34); X.lineTo(x + w * 0.5, top - 52); X.stroke();
    X.lineCap = 'butt';
    // 标签
    X.fillStyle = 'rgba(200,240,235,0.62)';
    X.font = '600 11px "IBM Plex Mono", monospace';
    X.textAlign = 'center';
    X.fillText('H₂O 水槽', x + w / 2, top - 62);
    X.restore();
  }

  /* 高温坩埚台：陶坩埚 + 上升热浪 */
  function drawCrucible() {
    const x = 118, base = F.GROUND, w = 120, h = 74;
    X.save();
    X.fillStyle = '#3a2418';
    X.beginPath(); X.ellipse(x + w / 2, base, w * 0.55, 12, 0, 0, Math.PI * 2); X.fill();
    X.fillStyle = '#4a2c1c';
    X.beginPath();
    X.moveTo(x, base - 6); X.lineTo(x + 16, base - h); X.lineTo(x + w - 16, base - h); X.lineTo(x + w, base - 6);
    X.closePath(); X.fill();
    X.fillStyle = 'rgba(255,150,60,0.55)';
    X.beginPath(); X.ellipse(x + w / 2, base - h + 2, w * 0.36, 8, 0, 0, Math.PI * 2); X.fill();
    for (let i = 0; i < 7; i++) {
      X.globalAlpha = 0.16 + (i % 3) * 0.05;
      X.fillStyle = '#ff9a4d';
      const t = (S.t * 0.8 + i * 40) % 120;
      X.beginPath();
      X.ellipse(x + 30 + i * 13 + Math.sin((S.t + i * 30) / 22) * 5, base - h - t, 7 - i * 0.5, 16 - i, 0, 0, Math.PI * 2);
      X.fill();
    }
    X.restore();
  }

  /* 低温液氮舱：立式杜瓦罐 + 冷雾 */
  function drawTank() {
    const x = 112, base = F.GROUND, w = 96, h = 150;
    X.save();
    X.fillStyle = 'rgba(150,200,235,0.12)';
    X.fillRect(x, base - h, w, h);
    X.strokeStyle = 'rgba(170,215,245,0.5)'; X.lineWidth = 2;
    X.strokeRect(x, base - h, w, h);
    X.fillStyle = 'rgba(180,225,255,0.20)';
    X.fillRect(x + 2, base - h * 0.55, w - 4, h * 0.55 - 2);
    X.fillStyle = 'rgba(210,240,255,0.14)';
    X.fillRect(x - 6, base - h - 12, w + 12, 14);
    X.restore();
  }

  function drawBg(stage) {
    const p = STAGE_PAINT[stage] || STAGE_PAINT.lab;
    const g = X.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, p.sky[0]); g.addColorStop(1, p.sky[1]);
    X.fillStyle = g; X.fillRect(0, 0, W, H);

    // 远景：反应舱轮廓
    X.fillStyle = p.far;
    for (let i = 0; i < 5; i++) {
      const w = 90 + (i % 3) * 26, h = 120 + (i % 2) * 60;
      X.globalAlpha = 0.5;
      X.fillRect(60 + i * 210, F.GROUND - h - 30, w, h);
    }
    X.globalAlpha = 1;

    // ── 场景前景道具（每座场地一件身份物品）──
    if (stage === 'lab') drawSink();
    else if (stage === 'hot') drawCrucible();
    else if (stage === 'cold') drawTank();

    // 地面
    X.fillStyle = p.floor;
    X.fillRect(0, F.GROUND, W, H - F.GROUND);
    X.strokeStyle = p.line; X.lineWidth = 2;
    X.beginPath(); X.moveTo(0, F.GROUND + 1); X.lineTo(W, F.GROUND + 1); X.stroke();
    for (let i = 0; i < 8; i++) {
      X.globalAlpha = 0.35;
      X.beginPath();
      X.moveTo(i * 150 + 20, H);
      X.lineTo(i * 150 - 40 + 120, F.GROUND + 2);
      X.stroke();
    }
    X.globalAlpha = 1;

    // 场景特征
    if (stage === 'hot') {
      X.fillStyle = 'rgba(255,140,60,0.10)';
      for (let i = 0; i < 3; i++) X.fillRect(140 + i * 380, F.GROUND - 90, 70, 90);
    } else if (stage === 'cold') {
      X.fillStyle = 'rgba(180,220,255,0.5)';
      for (let i = 0; i < 40; i++) {
        const x = (i * 137 + (S.t * 0.01) % 200) % W;
        const y = (i * 71 + (S.t * 0.02) % 300) % (F.GROUND - 40);
        X.fillRect(x, y, 2, 2);
      }
    } else if (stage === 'electro') {
      X.strokeStyle = 'rgba(120,220,210,0.35)'; X.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        X.beginPath();
        X.moveTo(120 + i * 380, F.GROUND - 10);
        for (let k = 0; k < 6; k++) X.lineTo(120 + i * 380 + (k % 2 ? 26 : -18), F.GROUND - 30 - k * 22);
        X.stroke();
      }
    } else if (stage === 'catalyst') {
      X.fillStyle = 'rgba(170,120,220,0.10)';
      for (let i = 0; i < 6; i++) X.fillRect(120 + i * 170, F.GROUND - 26, 120, 26);
    }
  }

  /* 冲刺残影 + 气流线（替代原来的「前冲/后撤」文字） */
  function drawDashes(m) {
    if (!m.dashes || !m.dashes.length) return;
    m.dashes.forEach((d) => {
      const k = d.life / d.max;                     // 1 → 0
      const back = d.dir * (1 - k) * 16;            // 随残影淡出向后拖
      const x = d.x - d.dir * 26 - back;
      X.save();
      // 残影：3 层递减透明度的影子
      for (let i = 3; i >= 1; i--) {
        X.globalAlpha = k * 0.55 * (i / 3);
        X.fillStyle = d.side === 'p' ? '#9fd8d0' : '#e6a68c';
        X.beginPath();
        X.ellipse(x + i * d.dir * 7, d.y + 82, 17 - i * 2, 60 - i * 6, 0, 0, Math.PI * 2);
        X.fill();
      }
      // 气流线：身后 4 条短线
      X.globalAlpha = k * 0.8;
      X.strokeStyle = d.side === 'p' ? '#d8fff4' : '#ffdcc2';
      X.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const ly = d.y + 34 + i * 26;
        const len = 16 + (i % 2) * 12;
        X.beginPath();
        X.moveTo(x - d.dir * (8 + i * 5), ly);
        X.lineTo(x - d.dir * (8 + i * 5 + len * k), ly);
        X.stroke();
      }
      X.restore();
    });
  }

  function drawZones(m) {
    m.zones.forEach((z) => {
      const life = z.max ? Math.max(0, 1 - z.t / z.max) : 1;
      const owner = z.owner === 'p' ? '90,190,230' : '230,120,90';
      X.save();
      X.globalAlpha = 0.16 + life * 0.14;
      X.fillStyle = 'rgb(' + owner + ')';
      X.fillRect(z.x, z.y, z.w, z.h);
      X.globalAlpha = 0.7;
      X.strokeStyle = 'rgb(' + owner + ')';
      X.lineWidth = 1.5;
      X.setLineDash([6, 5]);
      X.strokeRect(z.x, z.y, z.w, z.h);
      X.setLineDash([]);
      X.globalAlpha = 0.85;
      X.fillStyle = 'rgba(240,240,240,0.75)';
      X.font = '600 12px "IBM Plex Mono", monospace';
      X.fillText(KIND_LABEL[z.kind] || z.kind, z.x + 8, z.y + 16);
      X.restore();
    });
  }
  const KIND_LABEL = {
    water: '水区', chlorine: '氯气', ozone: '臭氧', acid: '酸雾', alkali: '碱雾',
    flame: '高温区', cold: '低温区', electro: '电场', catalyst: '催化床', salt: '盐桥'
  };

  function drawProjectiles(m) {
    m.projectiles.forEach((p) => {
      X.save();
      X.globalAlpha = 0.9;
      const col = p.owner === 'p' ? '#9fe6ff' : '#ffb59a';
      X.fillStyle = col;
      X.beginPath(); X.arc(p.x, p.y, (p.r || 10), 0, Math.PI * 2); X.fill();
      X.globalAlpha = 0.28;
      X.beginPath(); X.arc(p.x - (p.vx || 0) * 1.4, p.y - (p.vy || 0) * 1.4, (p.r || 10) * 1.5, 0, Math.PI * 2); X.fill();
      X.restore();
    });
  }

  function drawFx(m) {
    m.fx.forEach((f) => {
      const k = f.max ? f.life / f.max : 1;
      const col = f.color || '#fff';
      X.save();
      // 核心闪光
      X.globalAlpha = Math.max(0, k) * 0.9;
      X.fillStyle = col;
      X.beginPath(); X.arc(f.x, f.y, Math.max(1, 4.5 * k + 1.6), 0, Math.PI * 2); X.fill();
      // 方向性火花：沿速度反方向的短放射线
      X.globalAlpha = Math.max(0, k) * 0.7;
      X.strokeStyle = col; X.lineWidth = 1.6;
      const ang = Math.atan2(f.vy, f.vx) || 0;
      for (let i = 0; i < 5; i++) {
        const a = ang + (i - 2) * 0.42;
        const r0 = 4 + 3 * (1 - k), r1 = r0 + 9 * k + 5;
        X.beginPath();
        X.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0);
        X.lineTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1);
        X.stroke();
      }
      X.restore();
    });
    m.numbers.forEach((n) => {
      const k = n.life / 60;
      X.save();
      X.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
      const big = !n.minor;
      X.font = (big ? '800 22px ' : '700 13px ') + '"IBM Plex Mono", monospace';
      X.textAlign = 'center';
      X.lineWidth = big ? 4 : 3;
      X.strokeStyle = 'rgba(8,10,9,0.85)';
      X.strokeText(n.text, n.x, n.y - (1 - k) * 26);
      X.fillStyle = n.color || '#ffd479';
      X.fillText(n.text, n.x, n.y - (1 - k) * 26);
      X.restore();
    });
  }

  function viewOf(f) {
    return {
      id: f.id, vx: f.vx, face: f.face,
      guard: !!f.blockHeld,
      attack: f.action ? { age: f.action.age, key: f.action.key, name: f.action.name } : null,
      diamond: !!(f.buffs && f.buffs.diamond > 0),
      graphite: !!(f.buffs && f.buffs.graphite > 0),
      passiveShield: (f.buffs && f.buffs.passiveShield) || 0
    };
  }

  function drawFighter(f, scale) {
    X.save();
    X.translate(f.x + f.w / 2, f.y + f.h);
    // 朝向：art.js 画的是「朝右」原型，文字内部已用 f.face 反镜像
    if (f.face < 0) X.scale(-1, 1);
    X.scale(scale, scale);
    if (f.flash > 0) X.globalAlpha = 0.85;
    if (f.inv > 0) X.globalAlpha = 0.6;
    try { Art.actor(X, viewOf(f), S.t, 1.0); } catch (e) { /* 忽略绘制异常 */ }
    X.restore();

    // 阴影
    X.save();
    X.globalAlpha = 0.28;
    X.fillStyle = '#000';
    X.beginPath();
    X.ellipse(f.x + f.w / 2, F.GROUND + 6, f.w * 0.62, 9, 0, 0, Math.PI * 2);
    X.fill();
    X.restore();

    // 状态不再用文字标注（读起来像调试信息），改为视觉符号
    const cx2 = f.x + f.w / 2, cy2 = f.y + f.h * 0.45;
    if (f.blockHeld || f.state === 'blockstun') {
      // 格挡：身前一道弧形护盾，完美防御时更亮
      const strong = f.justGuarded > 0 || f.state === 'blockstun';
      X.save();
      X.globalAlpha = strong ? 0.85 : 0.45;
      X.strokeStyle = strong ? '#ffe9a8' : '#bfe6dd';
      X.lineWidth = strong ? 4 : 2.5;
      // 护盾画在「面朝方向」那一侧
      const a0 = f.face >= 0 ? -1.15 : Math.PI - 1.15;
      const a1 = f.face >= 0 ? 1.15 : Math.PI + 1.15;
      X.beginPath();
      X.arc(cx2, cy2, f.w * 0.72, a0, a1);
      X.stroke();
      X.globalAlpha = strong ? 0.18 : 0.09;
      X.fillStyle = strong ? '#ffe9a8' : '#bfe6dd';
      X.beginPath();
      X.arc(cx2, cy2, f.w * 0.72, a0, a1);
      X.closePath();
      X.fill();
      X.restore();
    }
    if (f.juggle > 0) {
      // 浮空：脚下旋转的能量环
      X.save();
      X.globalAlpha = 0.55;
      X.strokeStyle = '#ffd479';
      X.lineWidth = 2;
      X.beginPath();
      X.ellipse(cx2, f.y + f.h + 8, f.w * 0.5, 8, 0, 0, Math.PI * 2);
      X.stroke();
      X.restore();
    }
    if (f.state === 'hitstun' && f.hitstun > 2) {
      // 受击：躯干处一闪白
      X.save();
      X.globalAlpha = 0.22 + 0.18 * Math.sin(S.t / 3);
      X.fillStyle = '#fff';
      X.beginPath();
      X.ellipse(cx2, f.y + f.h * 0.5, f.w * 0.34, f.h * 0.3, 0, 0, Math.PI * 2);
      X.fill();
      X.restore();
    }

  }

  function draw() {
    const m = S.match;
    if (!m) return;
    drawBg(m.stage);

    // 屏幕震动
    const shake = m.shake || 0;
    X.save();
    if (shake > 0) X.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    drawZones(m);
    drawDashes(m);
    drawFighter(m.p, 1);
    drawFighter(m.e, 1);
    drawProjectiles(m);
    drawFx(m);
    X.restore();

    // 连段提示
    if (m.callout > 0 && m.calloutText) {
      X.save();
      X.globalAlpha = Math.min(1, m.callout / 18);
      X.fillStyle = '#ffd479';
      X.font = '800 30px "IBM Plex Mono", monospace';
      X.textAlign = 'center';
      X.fillText(m.calloutText, W / 2, 120);
      X.restore();
    }
    // 开局倒数
    if (m.intro > 0) {
      X.save();
      X.fillStyle = 'rgba(0,0,0,0.35)';
      X.fillRect(0, 0, W, H);
      X.globalAlpha = 0.9;
      X.fillStyle = '#f2f2f2';
      X.font = '900 96px "IBM Plex Mono", monospace';
      X.textAlign = 'center';
      X.fillText(Math.ceil(m.intro / 23) > 3 ? 'READY' : String(Math.ceil(m.intro / 23)), W / 2, H / 2);
      X.restore();
    }
  }

  /* ---------------- HUD ---------------- */
  function pips(n) { return '●●○'.slice(0, n) + '○'.repeat(Math.max(0, 2 - n)); }

  function syncHud(full) {
    const m = S.match;
    if (!m) return;
    const put = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    const wid = (id, pct) => { const e = $(id); if (e) e.style.width = Math.max(0, Math.min(100, pct)) + '%'; };

    put('pname', m.p.name); put('ename', m.e.name);
    wid('php', (m.p.stable / m.p.max) * 100);
    wid('ehp', (m.e.stable / m.e.max) * 100);
    put('phealth', Math.max(0, Math.round((m.p.stable / m.p.max) * 100)) + '%');
    put('ehealth', Math.max(0, Math.round((m.e.stable / m.e.max) * 100)) + '%');
    wid('peng', (m.p.meter / F.METER_MAX) * 100);
    wid('eeng', (m.e.meter / F.METER_MAX) * 100);
    put('penergy', Math.round(m.p.meter / 10));
    put('eenergy', Math.round(m.e.meter / 10));
    wid('pmeter', (m.p.meter / F.METER_MAX) * 100);
    wid('emeter', (m.e.meter / F.METER_MAX) * 100);
    put('pwins', pips(m.p.wins));
    put('ewins', pips(m.e.wins));
    put('timer', Math.ceil(m.timer / F.FPS));
    put('roundLabel', 'ROUND ' + String(m.round).padStart(2, '0'));
    put('roundOf', 'BO3 · 第 ' + m.round + ' 回合 · ' + m.p.wins + ':' + m.e.wins);

    const tag = (box, f) => {
      const el = $(box);
      if (!el) return;
      const arr = (f.statuses || []).map((s) => STATUS_LABEL[s.type] || s.type);
      if (f.buffs && f.buffs.passiveShield > 0) arr.push('护盾' + f.buffs.passiveShield);
      if (f.guardMeter < F.GUARD_MAX) arr.push('防御' + Math.round(f.guardMeter));
      el.innerHTML = arr.map((t) => '<span>' + t + '</span>').join('');
    };
    tag('pstatuses', m.p); tag('estatuses', m.e);

    if (full || !syncHud.last || m.log.length !== syncHud.last) {
      syncHud.last = m.log.length;
      const msg = $('message');
      if (msg && m.log.length) msg.textContent = m.log[m.log.length - 1];
      const cl = $('chemLog');
      if (cl) cl.textContent = m.log.slice(-6).join('\n');
    }
  }
  const STATUS_LABEL = {
    corrosion: '腐蚀', oxidation: '氧化', precip: '沉淀', blind: '致盲',
    poison: '中毒', passive: '钝化', burn: '灼烧', freeze: '冻结'
  };

  /* ---------------- 绑定 ---------------- */
  function bindLobby() {
    document.querySelectorAll('.mode-picks button').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.mode-picks button').forEach((x) => { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('sel'); b.setAttribute('aria-pressed', 'true');
        S.mode = b.dataset.mode;
        const hint = $('modeHint');
        if (hint) hint.textContent = MODE_HINT[S.mode] || '';
      });
    });
    $('startBtn')?.addEventListener('click', startMatch);
    $('rematchBtn')?.addEventListener('click', () => { showResult.done = false; $('overlay').hidden = true; startMatch(); });
    $('restart')?.addEventListener('click', () => { showResult.done = false; backToLobby(); });
    $('resumeBtn')?.addEventListener('click', togglePause);
    $('pauseBtn')?.addEventListener('click', togglePause);
    $('fullscreenBtn')?.addEventListener('click', () => {
      const el = document.querySelector('#battle') || document.documentElement;
      if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.();
    });
    $('soundBtn')?.addEventListener('click', (e) => {
      S.sound = !S.sound;
      e.currentTarget.setAttribute('aria-pressed', String(S.sound));
      e.currentTarget.textContent = S.sound ? '音效 开' : '音效 关';
      if (S.sound) tone(520, 0.08, 'square', 0.05);
    });
    $('helpBtn')?.addEventListener('click', () => $('helpDialog')?.showModal?.());
    $('notesBtn')?.addEventListener('click', () => {
      const c = $('notesContent');
      if (c) c.textContent = (S.match?.log || []).join('\n') || '（暂无记录）';
      $('notesDialog')?.showModal?.();
    });
    $('enemySel')?.addEventListener('change', (e) => { S.pickE = e.target.value; renderEnemyPicks(); });
    $('stageSel')?.addEventListener('change', (e) => { S.pickStage = e.target.value; renderStagePicks(); });
    window.addEventListener('blur', () => { releaseAll(); if (S.match && !S.match.over && !S.match.paused) togglePause(); });
  }

  function boot() {
    renderRoster(); renderEnemyPicks(); renderStagePicks(); renderProfile();
    bindLobby(); bindTouch();
    const hint = $('modeHint');
    if (hint) hint.textContent = MODE_HINT[S.mode] || '';
    requestAnimationFrame(() => { if (S.started) loop(performance.now()); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // 本地测试钩子
  if (['127.0.0.1', 'localhost'].includes(location.hostname) && new URLSearchParams(location.search).has('test')) {
    window.__plusTest = {
      state: S,
      ids: fighterIds,
      stages: stageIds,
      start(opts) { Object.assign(S, opts || {}); startMatch(); return S.match; },
      step(n) { const m = S.match; for (let i = 0; i < (n || 1); i++) F.step(m, readInput(), null); return m; },
      input(inp) { S.sources.clear(); Object.entries(inp || {}).forEach(([k, v]) => { if (v) setInput(k, true, 'test'); }); },
      draw, syncHud, back: backToLobby
    };
  }
})();
