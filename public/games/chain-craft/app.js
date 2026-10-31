/* ============================================================
 * 碳链工坊 · Chain Craft v2 —— 界面层
 * 依赖 logic.js（MoleculeState / REACTIONS / LEVELS / findOptimalPath）
 * ============================================================ */
(function () {
  'use strict';

  const L = window;                        // logic.js 挂到 window
  const MOL = L.MoleculeState, RXNS = L.REACTIONS, LV = L.LEVELS;
  const CARBON_MAX = L.CARBON_MAX || 16;
  const optSteps = L.optimalSteps || (lv => (L.findOptimalPath(lv.start, lv.target, 6) || []).length);

  /* ---------------- 状态 ---------------- */
  const SAVE_KEY = 'chaincraft.v2.progress';
  const G = {
    levelIdx: 0,
    mol: null,
    steps: 0,
    history: [],      // {mol, rxnId}
    log: [],
    hintUsed: false,
    solved: false,
    sound: true,
    optimal: null,
    progress: {},     // id -> {stars, best}
  };

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };

  /* ---------------- 持久化 ---------------- */
  function loadProgress() {
    try { G.progress = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch (e) { G.progress = {}; }
    try { G.sound = localStorage.getItem(SAVE_KEY + '.sound') !== '0'; } catch (e) { }
  }
  function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.progress)); } catch (e) { }
  }
  function saveSound() {
    try { localStorage.setItem(SAVE_KEY + '.sound', G.sound ? '1' : '0'); } catch (e) { }
  }

  /* ---------------- 音效（WebAudio 合成，无需外部文件） ---------------- */
  let AC = null;
  function beep(freq, dur, type, gain) {
    if (!G.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.value = gain == null ? 0.05 : gain;
      o.connect(g); g.connect(AC.destination);
      const t = AC.currentTime;
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch (e) { }
  }
  const sfx = {
    ok: () => { beep(520, 0.09, 'triangle'); setTimeout(() => beep(760, 0.11, 'triangle'), 70); },
    no: () => beep(150, 0.14, 'square', 0.035),
    undo: () => beep(300, 0.10, 'sine'),
    win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle', 0.06), i * 110)); }
  };

  /* ============================================================
   * 键线式 SVG 渲染
   * ============================================================ */
  const COL = {
    c: '#e8e6ff', bond: '#7f7ba8', o: '#ff7d92', x: '#7ee39b', ring: '#a78bfa', hi: '#ffd479'
  };

  function atomLabelAtom(g) {
    // 官能团 → 画在端位原子上的元素符号
    if (g === '-OH') return { sym: 'OH', color: COL.o };
    if (g === '=O') return { sym: 'O', color: COL.o, double: true };
    if (g === '-CHO') return { sym: 'CHO', color: COL.o, aldehyde: true };
    if (g === '-COOH') return { sym: 'COOH', color: COL.o };
    if (g === '-COO-') return { sym: 'COO', color: COL.o, ester: true };
    if (g === '-O-') return { sym: 'O', color: COL.o, ether: true };
    if (g === '-X') return { sym: 'Cl', color: COL.x };
    return null;
  }

function svgMolecule(mol, opt) {
    opt = opt || {};
    const W = opt.w || 300, H = opt.h || 176;
    const accent = opt.accent || '#a78bfa';
    const n = Math.max(1, mol.carbonCount);
    const hasRing = mol.rings && mol.rings.length > 0;
    const dbl = mol.unsaturation ? mol.unsaturation.length : 0;
    const gid = 'g' + String(opt.uid || 'x').replace(/[^a-zA-Z0-9]/g, '');
    const parts = [];
    parts.push(`<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="${escapeAttr(mol.getName())}">`);
    parts.push(`<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity=".16"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/></linearGradient></defs>`);

    /* ── 1. 骨架顶点（骨架式：顶点即碳，不画原子球） ── */
    const cy = H / 2 + 6;
    const C = [];                                   // 碳顶点
    const B = [];                                   // 键 [i, j]
    let ringMeta = null;
    let chainStep = 34, chainAmp = 10, bondLen = 36;  // 键长：官能团顶点与碳–碳键等长
    if (hasRing) {
      const r = Math.min(W * 0.175, H * 0.30, 46);
      const extra = Math.max(0, n - 6);
      const cx = extra > 0 ? W / 2 - 40 : W / 2;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 3;
        C.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
      ringMeta = { cx, cy, r };
      for (let i = 0; i < 6; i++) B.push([i, (i + 1) % 6, 'ring']);
      // 环外碳链：从 2 号顶点（右上）沿 30° 延伸
      if (extra > 0) {
        let prev = { ...C[2] };
        const step = Math.min(38, (W - C[2].x - 46) / Math.max(1, extra));
        for (let i = 0; i < extra; i++) {
          const ang = (i % 2 === 0 ? -1 : 1) * Math.PI / 6;
          const px = prev.x + step * Math.cos(ang), py = prev.y + step * Math.sin(ang);
          C.push({ x: px, y: py });
          B.push([2 + i, 3 + i, 'chain']);
          prev = { x: px, y: py };
        }
      }
    } else {
      const k = Math.min(n, 16);
      // 左右各留出「官能团自身作为一个顶点」所需的空间（键长与 C–C 一致）
      const step = Math.min(40, (W - 96) / Math.max(1, k - 1));
      const amp = Math.min(11, step * 0.30);        // ≈30° 锯齿，接近 120° 键角
      chainStep = step; chainAmp = amp;
      bondLen = Math.hypot(step, 2 * amp);
      const x0 = (W - step * (k - 1)) / 2;
      for (let i = 0; i < k; i++) C.push({ x: x0 + step * i, y: cy + (i % 2 ? -amp : amp) });
      for (let i = 0; i < k - 1; i++) B.push([i, i + 1, 'chain']);
    }

    /* ── 2. 键：单线 + 双键平行线（双键放在末尾链段，符合烯烃直觉） ── */
    const chainBonds = B.filter(b => b[2] === 'chain');
    const dblSet = new Set();
    for (let i = 0; i < dbl; i++) {
      const b = chainBonds[chainBonds.length - 1 - i];
      if (b) dblSet.add(b[0] + '-' + b[1]);
    }
    const drawBond = (a, b, isDouble, trim) => {
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const t1 = trim ? 0.12 : 0, t2 = trim ? 0.12 : 0;
      const ax = a.x + dx * t1, ay = a.y + dy * t1;
      const bx = b.x - dx * t2, by = b.y - dy * t2;
      parts.push(`<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}"
        stroke="${COL.bond}" stroke-width="2.1" stroke-linecap="round"/>`);
      if (isDouble) {
        const off = 4.3, nx = -uy * off, ny = ux * off;
        parts.push(`<line x1="${(ax + nx).toFixed(1)}" y1="${(ay + ny).toFixed(1)}"
          x2="${(bx * 1 + nx).toFixed(1)}" y2="${(by + ny).toFixed(1)}"
          stroke="${COL.bond}" stroke-width="1.7" stroke-linecap="round" opacity=".9"/>`);
      }
    };
    B.forEach(([i, j]) => {
      drawBond(C[i], C[j], dblSet.has(i + '-' + j), false);
    });

    /* ── 3. 官能团：短键 + 元素符号，按优先级选挂点，避开彼此 ── */
    const groups = (mol.functionalGroups || []).filter(g => atomLabelAtom(g));
    const ringSlot = [0, 2, 4, 1, 3, 5];            // 环上从顶端开始顺时针
    const used = new Set();
    const slots = [];
    if (hasRing) {
      ringSlot.forEach(i => slots.push({ i, kind: 'ring' }));
    } else {
      slots.push({ i: C.length - 1, kind: 'endR' });
      slots.push({ i: 0, kind: 'endL' });
      for (let i = 1; i < C.length - 1; i++) slots.push({ i, kind: 'mid', up: i % 2 === 0 });
      if (C.length === 1) slots.push({ i: 0, kind: 'endR' });
    }
    // 羰基类：把 =O 与其配对的 -OH / -O- 画在同一个碳上（羧基、醛、酮的标准画法）
    const keyIdx = groups.indexOf('=O');
    const pairIdx = groups.findIndex(g => g === '-OH' || g === '-O-' || g === '-CHO');
    const sharedVertex = (keyIdx >= 0 && pairIdx >= 0 && pairIdx !== keyIdx) ? true : false;
    let sharedUsed = null;
    groups.forEach((g, gi) => {
      const info = atomLabelAtom(g);
      let slot;
      if (sharedVertex && (gi === keyIdx || gi === pairIdx)) {
        if (sharedUsed === null) {
          sharedUsed = slots.find(s => !used.has(s.i)) || slots[0];
          used.add(sharedUsed.i);
        }
        slot = sharedUsed;
      } else {
        slot = slots.find(s => !used.has(s.i)) || slots[gi % slots.length];
        used.add(slot.i);
      }
      const p = C[slot.i] || C[C.length - 1];
      let vx = 1, vy = 0;
      if (slot.kind === 'ring' && ringMeta) {
        vx = p.x - ringMeta.cx; vy = p.y - ringMeta.cy;
        const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
      } else if (slot.kind === 'endR') {
        const q = C[Math.max(0, slot.i - 1)] || p;
        vx = p.x - q.x; vy = p.y - q.y;
        const l = Math.hypot(vx, vy) || 1;
        if (l < 0.5) { vx = 1; vy = -0.6; }
        else { vx /= l; vy = -(vy / l); }        // 镜像延续，保证第三个点不在一条直线上
      } else if (slot.kind === 'endL') {
        const q = C[Math.min(C.length - 1, 1)] || p;
        vx = p.x - q.x; vy = p.y - q.y;
        const l = Math.hypot(vx, vy) || 1;
        if (l < 0.5) { vx = -1; vy = -0.6; }
        else { vx /= l; vy = -(vy / l); }
      } else {
        vx = 0; vy = slot.up ? -1 : 1;
      }
      if (sharedVertex && (gi === keyIdx || gi === pairIdx)) {
        // 共碳二元组：=O 朝上、配对基团朝下（羧基 / 羰基的标准画法）
        vx = 0; vy = (gi === keyIdx) ? -1 : 1;
      }
      /* 官能团自身就是折线上的一个顶点：键长与 C–C 等长，标签居中画在该顶点上 */
      const glen = slot.kind === 'ring' && ringMeta ? ringMeta.r
                 : slot.kind === 'mid' ? bondLen * 0.92
                 : bondLen;
      const ex = p.x + vx * glen, ey = p.y + vy * glen;
      const gap = info.sym.length >= 3 ? 15 : 9;      // 键线在标签前收笔
      const bx = ex - vx * gap, by = ey - vy * gap;
      parts.push(`<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}"
        stroke="${COL.bond}" stroke-width="2.1" stroke-linecap="round"/>`);
      if (info.double) {
        const off = 4.2, nx = -vy * off, ny = vx * off;
        parts.push(`<line x1="${(p.x + nx).toFixed(1)}" y1="${(p.y + ny).toFixed(1)}"
          x2="${(bx + nx).toFixed(1)}" y2="${(by + ny).toFixed(1)}"
          stroke="${COL.bond}" stroke-width="1.7" stroke-linecap="round" opacity=".9"/>`);
      }
      parts.push(`<text x="${ex.toFixed(1)}" y="${(ey + 5).toFixed(1)}" text-anchor="middle"
        font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14.5" font-weight="700"
        paint-order="stroke" stroke="#0c0a18" stroke-width="3.6" stroke-linejoin="round"
        fill="${info.color}">${info.sym}</text>`);
    });

    /* ── 4. 角标：环 / 手性 / 超长链 ── */
    if (hasRing) {
      parts.push(`<text x="${W - 12}" y="22" text-anchor="end" font-size="12" font-weight="700"
        fill="${COL.ring}">${escapeHtml(mol.rings.join(' / '))}</text>`);
    }
    if (mol.chirality) {
      parts.push(`<text x="12" y="22" font-size="12" font-weight="700" fill="${COL.hi}">${escapeHtml(mol.chirality)}-${escapeHtml(mol.stereochemistry || '')}</text>`);
    }
    if (n > 16 && !hasRing) {
      parts.push(`<text x="${W - 12}" y="22" text-anchor="end" font-size="12" fill="#9c98bd">…共 ${n} 碳</text>`);
    }
    parts.push('</svg>');
    return parts.join('');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const escapeAttr = escapeHtml;

  /* ---------------- 反应可用性（含碳数上限保护） ---------------- */
  function options(mol) {
    return RXNS.map(r => {
      let ok = false, reason = '';
      try { ok = !!r.check(mol); } catch (e) { ok = false; }
      if (ok) {
        const next = r.apply(mol);
        if (next.carbonCount > CARBON_MAX) { ok = false; reason = `碳数会超过 ${CARBON_MAX}，链太长了`; }
        else if (next.carbonCount < 1) { ok = false; reason = '碳数会归零'; }
      } else {
        reason = typeof r.why === 'function' ? r.why(mol) : '条件不满足';
      }
      return { rxn: r, ok, reason };
    });
  }

  /* ---------------- 关卡 ---------------- */
  function currentLevel() { return LV[G.levelIdx]; }

  function startLevel(idx) {
    const max = LV.length - 1;
    G.levelIdx = Math.max(0, Math.min(max, idx));
    const lv = currentLevel();
    G.mol = lv.start.clone();
    G.steps = 0;
    G.history = [];
    G.hintUsed = false;
    G.solved = false;
    G.log = [];
    G.optimal = optSteps(lv);
    pushLog(`第 ${lv.id} 关 · ${lv.title}`, 'sys');
    pushLog(`起始 ${lv.start.getName()}（${lv.start.getDescription()}）`, 'dim');
    renderAll();
  }

  function pushLog(text, kind) {
    G.log.push({ text, kind: kind || 'ok' });
    if (G.log.length > 60) G.log.shift();
  }

  function starsFor(steps, optimal) {
    if (!optimal) return 1;
    if (steps <= optimal) return 3;
    if (steps <= optimal + 1) return 2;
    return 1;
  }

  /* ---------------- 操作 ---------------- */
  function applyRxn(rxn) {
    if (G.solved) return false;
    const opt = options(G.mol).find(o => o.rxn.id === rxn.id);
    if (!opt || !opt.ok) { sfx.no(); pushLog(`✖ ${rxn.name}：${opt ? opt.reason : '不可用'}`, 'no'); renderLog(); return false; }
    const before = G.mol.clone();
    const next = rxn.apply(G.mol);
    G.history.push({ mol: before, rxnId: rxn.id });
    G.mol = next;
    G.steps++;
    pushLog(`${rxn.emoji} ${rxn.name} → ${next.getName()}（${next.getDescription()}）`, 'ok');
    sfx.ok();
    if (next.equals(currentLevel().target)) {
      finishLevel();
    }
    renderAll();
    return true;
  }

  function finishLevel() {
    G.solved = true;
    const lv = currentLevel();
    const st = starsFor(G.steps, G.optimal);
    const prev = G.progress[lv.id];
    if (!prev || st > prev.stars || (st === prev.stars && G.steps < (prev.best || 99))) {
      G.progress[lv.id] = { stars: Math.max(st, prev ? prev.stars : 0), best: Math.min(G.steps, prev && prev.best ? prev.best : 99) };
      saveProgress();
    }
    sfx.win();
    pushLog(`🏆 合成成功！${G.steps} 步（最少 ${G.optimal} 步）`, 'win');
    showWin(st);
  }

  function undo() {
    if (!G.history.length || G.solved) return;
    const h = G.history.pop();
    G.mol = h.mol;
    G.steps = Math.max(0, G.steps - 1);
    pushLog(`↩ 撤销 ${(L.RXN_MAP.get(h.rxnId) || {}).name || '一步'}`, 'dim');
    sfx.undo();
    renderAll();
  }

  function doHint() {
    const lv = currentLevel();
    G.hintUsed = true;
    const path = L.findOptimalPath(G.mol, lv.target, 6);
    const box = $('#hintBox');
    box.hidden = false;
    if (path && path.length) {
      const first = L.RXN_MAP.get(path[0]);
      box.innerHTML = `<b>💡 下一步建议</b><div>${escapeHtml(first.emoji + ' ' + first.name)} — ${escapeHtml(first.short)}</div>
        <div class="dim">从当前局面算，还有 ${path.length} 步到目标。</div>
        <div class="dim">${escapeHtml(lv.hint || '')}</div>`;
    } else {
      box.innerHTML = `<b>💡 提示</b><div>${escapeHtml(lv.hint || '试试把官能团一步步推过去。')}</div>
        <div class="dim">当前局面走不到目标了，建议撤销或重来。</div>`;
    }
    pushLog('💡 查看了提示（评级会降为最高 ⭐⭐）', 'dim');
    renderAll();
  }

  /* ---------------- 渲染 ---------------- */
  function renderAll() {
    renderNow();
    renderGoal();
    renderRxns();
    renderMetrics();
    renderLog();
    renderDots();
  }

  function renderNow() {
    $('#nowStage').innerHTML = svgMolecule(G.mol, { accent: '#a78bfa', w: 320, h: 190, uid: 'now' });
    $('#nowName').textContent = G.mol.getName();
    $('#nowDesc').textContent = G.mol.getDescription();
    const chips = $('#nowChips');
    chips.innerHTML = '';
    chips.appendChild(chip(`C${G.mol.carbonCount}`, 'c'));
    (G.mol.functionalGroups || []).forEach(g => chips.appendChild(chip(g, 'g')));
    if (G.mol.unsaturation && G.mol.unsaturation.length) chips.appendChild(chip(`${G.mol.unsaturation.length}×C=C`, 'u'));
    (G.mol.rings || []).forEach(r => chips.appendChild(chip(r, 'r')));
  }

  function renderGoal() {
    const lv = currentLevel();
    $('#goalStage').innerHTML = svgMolecule(lv.target, { accent: '#ffd479', w: 300, h: 150, uid: 'goal' });
    $('#goalName').textContent = lv.target.getName();
    $('#tierBadge').textContent = lv.tier;
    $('#goalText').textContent = lv.goal || '';
  }

  function chip(text, kind) {
    const c = el('span', 'chip chip-' + (kind || 'c'), text);
    return c;
  }

  function renderRxns() {
    const grid = $('#rxnGrid');
    grid.innerHTML = '';
    const opts = options(G.mol);
    const usable = opts.filter(o => o.ok).length;
    $('#rxCount').textContent = `${usable} / ${RXNS.length} 可用`;
    opts.forEach(o => {
      const b = el('button', 'rxn' + (o.ok ? '' : ' off'));
      b.type = 'button';
      if (!o.ok) b.disabled = false;   // 保留可点，点了给出原因
      b.innerHTML = `
        <span class="rxn-top">
          <span class="rxn-emoji">${escapeHtml(o.rxn.emoji)}</span>
          <span class="rxn-name">${escapeHtml(o.rxn.name)}</span>
          <span class="rxn-cat">${escapeHtml(o.rxn.cat || '')}</span>
        </span>
        <span class="rxn-eq">${escapeHtml(o.rxn.eq || '')}</span>
        <span class="rxn-short">${escapeHtml(o.rxn.short || '')}</span>
        <span class="rxn-why">${o.ok ? '条件满足' : escapeHtml(o.reason)}</span>`;
      b.title = o.rxn.desc || '';
      b.addEventListener('click', () => applyRxn(o.rxn));
      grid.appendChild(b);
    });
  }

  function renderMetrics() {
    $('#mSteps').textContent = G.steps;
    $('#mOpt').textContent = G.optimal == null ? '—' : G.optimal;
    $('#stepBadge').textContent = `${G.steps} 步`;
    if (G.steps === 0 && !G.solved) {
      $('#mStars').textContent = '—';
    } else {
      const st = starsFor(G.steps, G.optimal);
      const capped = G.hintUsed ? Math.min(st, 2) : st;
      $('#mStars').textContent = '★'.repeat(capped) + '☆'.repeat(3 - capped);
    }
    const hint = $('#hintBox'); if (!G.hintUsed) hint.hidden = true;
    $('#btnNext').hidden = !G.solved || G.levelIdx >= LV.length - 1;
  }

  function renderLog() {
    const box = $('#logBody');
    box.innerHTML = '';
    G.log.slice().forEach(it => {
      const d = el('div', 'log-line log-' + (it.kind || 'ok'), it.text);
      box.appendChild(d);
    });
    box.scrollTop = box.scrollHeight;
  }

  function renderDots() {
    const dots = $('#levelDots');
    dots.innerHTML = '';
    LV.forEach((lv, i) => {
      const p = G.progress[lv.id];
      const d = el('button', 'dot' + (i === G.levelIdx ? ' cur' : '') + (p ? ' done' : ''));
      d.type = 'button';
      d.title = `第 ${lv.id} 关 · ${lv.title}${p ? `（${'★'.repeat(p.stars)} 最佳 ${p.best} 步）` : ''}`;
      d.setAttribute('aria-label', d.title);
      d.addEventListener('click', () => { closeModals(); startLevel(i); });
      dots.appendChild(d);
    });
    // 关卡选择网格
    const grid = $('#levelGrid');
    if (grid) {
      grid.innerHTML = '';
      LV.forEach((lv, i) => {
        const p = G.progress[lv.id];
        const b = el('button', 'lv' + (i === G.levelIdx ? ' cur' : '') + (p ? ' done' : ''));
        b.type = 'button';
        b.innerHTML = `<span class="lv-id">${lv.id}</span>
          <span class="lv-t">${escapeHtml(lv.title)}</span>
          <span class="lv-tier">${escapeHtml(lv.tier)}</span>
          <span class="lv-stars">${p ? '★'.repeat(p.stars) + '☆'.repeat(3 - p.stars) : '☆☆☆'}</span>`;
        b.addEventListener('click', () => { closeModals(); startLevel(i); });
        grid.appendChild(b);
      });
    }
  }

  /* ---------------- 弹窗 ---------------- */
  function openModal(id) { const m = $(id); if (m) m.hidden = false; }
  function closeModals() { $$('.modal').forEach(m => m.hidden = true); }

  function showWin(stars) {
    const lv = currentLevel();
    $('#winTitle').textContent = `${lv.target.getName()} 合成完成`;
    $('#winStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const last = G.levelIdx >= LV.length - 1;
    $('#winSub').textContent = last
      ? `你走完了全部 ${LV.length} 关！${G.steps} 步完成本关（最少 ${G.optimal} 步）。`
      : `${G.steps} 步完成，最少 ${G.optimal} 步${G.hintUsed ? '（用过提示）' : ''}。`;
    $('#winNext').hidden = last;
    openModal('#winModal');
  }

  /* ---------------- 事件 ---------------- */
  function bind() {
    $('#btnUndo').addEventListener('click', undo);
    $('#btnHint').addEventListener('click', doHint);
    $('#btnRestart').addEventListener('click', () => startLevel(G.levelIdx));
    $('#btnNext').addEventListener('click', () => startLevel(G.levelIdx + 1));
    $('#winRetry').addEventListener('click', () => { closeModals(); startLevel(G.levelIdx); });
    $('#winNext').addEventListener('click', () => { closeModals(); startLevel(G.levelIdx + 1); });
    $('#btnClearLog').addEventListener('click', () => { G.log = []; renderLog(); });
    $('#btnHelp').addEventListener('click', () => openModal('#helpModal'));
    $('#btnSound').addEventListener('click', e => {
      G.sound = !G.sound; saveSound();
      e.currentTarget.textContent = G.sound ? '🔊' : '🔇';
      if (G.sound) sfx.ok();
    });
    $$('[data-close]').forEach(b => b.addEventListener('click', closeModals));
    $$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModals(); }));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModals();
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undo(); }
      if (e.key === 'h') doHint();
      if (e.key === 'r') startLevel(G.levelIdx);
      if (/^[1-9]$/.test(e.key)) {
        const o = options(G.mol).filter(o => o.ok)[parseInt(e.key, 10) - 1];
        if (o) applyRxn(o.rxn);
      }
    });
  }

  /* ---------------- 调试钩子（仅 ?debug 暴露） ---------------- */
  function exposeDebug() {
    if (!/[?&]debug/.test(location.search)) return;
    window.__cc = {
      state: () => ({
        levelId: currentLevel().id, levelIdx: G.levelIdx, steps: G.steps,
        mol: G.mol.getDescription(), carbon: G.mol.carbonCount,
        groups: [...G.mol.functionalGroups], rings: [...G.mol.rings],
        unsat: G.mol.unsaturation.length, optimal: G.optimal, solved: G.solved,
        usable: options(G.mol).filter(o => o.ok).map(o => o.rxn.id),
        allOk: RXNS.length, progress: JSON.parse(JSON.stringify(G.progress))
      }),
      levels: () => LV.map(l => ({ id: l.id, tier: l.tier, title: l.title, from: l.start.getDescription(), to: l.target.getDescription(), optimal: optSteps(l) })),
      apply: id => { const r = L.RXN_MAP.get(id); return r ? applyRxn(r) : false; },
      undo, hint: doHint, restart: () => startLevel(G.levelIdx),
      goto: n => startLevel(typeof n === 'number' ? n : LV.findIndex(l => l.id === n)),
      set: (c, groups, unsat, rings) => { G.mol = new MOL(c, groups || [], unsat || [], rings || []); renderAll(); return G.mol.getDescription(); },
      win: () => { G.mol = currentLevel().target.clone(); G.steps = G.optimal || 1; finishLevel(); renderAll(); },
      simulate: (id, n) => { for (let i = 0; i < n; i++) { const r = L.RXN_MAP.get(id); applyRxn(r); } },
      options: () => options(G.mol).map(o => ({ id: o.rxn.id, ok: o.ok, why: o.reason })),
      svg: (mol, opt) => svgMolecule(mol, opt || { w: 300, h: 176 }),
      mkMol: (c, groups, dbl, rings) => {
        const un = Array.isArray(dbl) ? dbl
          : Array.from({ length: Math.max(0, dbl | 0) }, (_, i) => 'C' + (i + 2) + '=C' + (i + 3));
        return new MOL(c, groups || [], un, rings || []);
      }
    };
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    loadProgress();
    $('#btnSound').textContent = G.sound ? '🔊' : '🔇';
    bind();
    startLevel(0);
    exposeDebug();
    window.addEventListener('error', e => {
      pushLog('⚠ ' + (e.message || '脚本错误'), 'no');
      renderLog();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
