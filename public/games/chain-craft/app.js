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
    const parts = [];
    parts.push(`<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="${escapeAttr(mol.getName())}">`);
    parts.push(`<defs><linearGradient id="g${opt.uid || 'a'}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity=".30"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/></linearGradient></defs>`);

    // 碳骨架顶点
    let pts = [];
    if (hasRing) {
      const cx = W / 2, cy = H / 2 + 4, r = Math.min(W, H) * 0.26;
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 3;
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
      // 环上的碳数若大于 6，多出的碳挂在顶端顶点外
      const extra = Math.max(0, n - 6);
      for (let i = 0; i < extra; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        pts.push({ x: W / 2 + 34 * (Math.floor(i / 2) + 1) * dir, y: cy - r - 4 - 20 });
      }
    } else {
      const k = Math.min(n, 14);
      const stepX = Math.min(52, (W - 84) / Math.max(1, k - 1 || 1));
      const marginX = (W - stepX * (k - 1)) / 2;
      const baseY = H / 2 + 10, amp = 26;
      for (let i = 0; i < k; i++) {
        pts.push({ x: marginX + stepX * i, y: baseY + (i % 2 ? -amp : 0) });
      }
    }

    // 键
    const dbl = mol.unsaturation ? mol.unsaturation.length : 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const isRingEdge = hasRing && i === pts.length - 2 && pts.length > 6 ? false : hasRing;
      parts.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"
        stroke="${COL.bond}" stroke-width="2.2" stroke-linecap="round"/>`);
      // 双键：前 dbl 条边加一条平行线
      if (!isRingEdge && i < dbl) {
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        const off = 4.2, ux = -dy / len * off, uy = dx / len * off;
        parts.push(`<line x1="${(a.x + ux).toFixed(1)}" y1="${(a.y + uy).toFixed(1)}"
          x2="${(b.x - ux * 0.15 + ux).toFixed(1)}" y2="${(b.y - uy * 0.15 + uy).toFixed(1)}"
          stroke="${COL.bond}" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>`);
      }
      if (hasRing && i === pts.length - 1) {
        const z = pts[0];
        parts.push(`<line x1="${b.x.toFixed(1)}" y1="${b.y.toFixed(1)}" x2="${z.x.toFixed(1)}" y2="${z.y.toFixed(1)}"
          stroke="${COL.bond}" stroke-width="2.2" stroke-linecap="round"/>`);
      }
    }

    // 碳顶点小点
    pts.forEach((p, i) => {
      const isEnd = i === 0 || i === pts.length - 1;
      parts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isEnd ? 3.6 : 2.6}"
        fill="${isEnd ? COL.c : '#b9b5d8'}" opacity="${isEnd ? 0.95 : 0.55}"/>`);
    });

    // 官能团：按顺序挂在合适顶点（环上向外径向伸出，链上挂在两端）
    const groups = mol.functionalGroups || [];
    const ringCx = W / 2, ringCy = H / 2 + 4;
    // 环上挂点顺序：右上、左上、右下、左下、正下、正上
    const ringSlot = [1, 0, 2, 5, 3, 4];
    const chainSlot = [pts.length - 1, 0, pts.length - 2, 1, 2, 3];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const info = atomLabelAtom(g);
      if (!info) continue;
      let ai, dirX = 1, dirY = -1, ex, ey;
      if (hasRing) {
        ai = ringSlot[i % ringSlot.length] % pts.length;
        const p = pts[ai];
        // 从环心指向该顶点，向外延伸
        let vx = p.x - ringCx, vy = p.y - ringCy;
        const vl = Math.hypot(vx, vy) || 1;
        vx /= vl; vy /= vl;
        ex = p.x + 26 * vx; ey = p.y + 26 * vy;
        dirX = vx >= 0 ? 1 : -1;
        dirY = vy >= 0 ? 1 : -1;
      } else {
        ai = chainSlot[i % chainSlot.length] % pts.length;
        const p = pts[ai];
        dirX = ai === 0 ? -1 : 1;
        dirY = p.y < H / 2 ? -1 : 1;
        ex = p.x + 30 * dirX; ey = p.y + 26 * dirY;
      }
      const p = pts[ai] || pts[pts.length - 1];

      parts.push(`<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"
        stroke="${COL.bond}" stroke-width="2.2" stroke-linecap="round"/>`);
      if (info.double) {
        const dx = ex - p.x, dy = ey - p.y, len = Math.hypot(dx, dy) || 1;
        const off = 4, ux = -dy / len * off, uy = dx / len * off;
        parts.push(`<line x1="${(p.x + ux).toFixed(1)}" y1="${(p.y + uy).toFixed(1)}"
          x2="${(ex + ux).toFixed(1)}" y2="${(ey + uy).toFixed(1)}"
          stroke="${COL.bond}" stroke-width="1.8" stroke-linecap="round"/>`);
      }
      const tx = hasRing ? ex + 16 * dirX : ex + (dirX > 0 ? 15 : -15) * 0.9;
      const ty = hasRing ? ey + 4 * dirY + 5 : ey + 5;
      parts.push(`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle"
        font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="700"
        fill="${info.color}">${info.sym}</text>`);
    }

    // 环标注
    if (hasRing) {
      parts.push(`<text x="${W - 12}" y="22" text-anchor="end" font-size="12" font-weight="700"
        fill="${COL.ring}">${escapeHtml(mol.rings.join(' / '))}</text>`);
    }
    // 手性
    if (mol.chirality) {
      parts.push(`<text x="12" y="22" font-size="12" font-weight="700" fill="${COL.hi}">${escapeHtml(mol.chirality)}-${escapeHtml(mol.stereochemistry || '')}</text>`);
    }
    if (n > 14 && !hasRing) {
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
      options: () => options(G.mol).map(o => ({ id: o.rxn.id, ok: o.ok, why: o.reason }))
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
