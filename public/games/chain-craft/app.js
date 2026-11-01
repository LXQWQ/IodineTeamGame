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
    /* 教材主线 */
    mode: 'free',     // 'free' 自由关卡 | 'book' 教材章节
    bookId: null,
    chapterNo: null,
    puzzleIdx: 0,
    chapterScores: [],  // 本章每题最好得分
    winAction: null,    // 胜利弹窗按钮的语义：retry / next / nextChapter / map
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
    if (g === '-CN') return { sym: 'CN', color: COL.x };
    if (g === '=N-') return { sym: 'N', color: '#8fb4ff' };
    if (g === '-NO2') return { sym: 'NO₂', color: COL.o };
    if (g === '缩醛') return { sym: 'O,O', color: COL.x };
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
  /* ============================================================
   * 教材主线（book.js 提供 BOOKS / genChapter / puzzleToLevel / 计分与解锁）
   * ============================================================ */
  const BOOK_API = window.BOOKS ? window : null;
  let BOOK_PUZZLES = [];          // 当前章节已包装成 LEVEL 形状的题目

  function bookLevels(bookId, no) {
    if (!BOOK_API) return [];
    const raw = BOOK_API.genChapter(bookId, no) || [];
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      const lv = BOOK_API.puzzleToLevel(bookId, no, i);
      if (lv) out.push(lv);
    }
    return out;
  }
  function currentBookLevel() { return BOOK_PUZZLES[G.puzzleIdx] || null; }
  function currentLevel() { return G.mode === 'book' ? currentBookLevel() : LV[G.levelIdx]; }
  function restartCurrent() {
    return G.mode === 'book' ? startPuzzle(G.bookId, G.chapterNo, G.puzzleIdx) : startLevel(G.levelIdx);
  }
  function bookMeta() {
    return (BOOK_API && G.bookId && BOOK_API.BOOK_MAP) ? BOOK_API.BOOK_MAP.get(G.bookId) : null;
  }
  function chapterInfo() {
    const bk = bookMeta();
    if (!bk || !G.chapterNo) return null;
    return bk.chapters.find(c => c.no === G.chapterNo) || null;
  }
  function recordedScores() { return G.chapterScores.filter(x => typeof x === 'number'); }
  /* 章节成绩（未打过时给零值，避免 null 访问） */
  function chapRec(bookId, no) {
    return (BOOK_API && BOOK_API.BookProgress.get(bookId, no)) || { best: 0, done: 0 };
  }
  function chapterAvg() {
    const a = recordedScores();
    return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
  }

  function startLevel(idx) {
    G.mode = 'free';
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

  /* 开一章：清空本章得分、从第 1 题开始 */
  function startChapter(bookId, no) {
    BOOK_PUZZLES = bookLevels(bookId, no);
    if (!BOOK_PUZZLES.length) { pushLog('⚠ 本章题目生成失败', 'no'); renderLog(); return false; }
    G.mode = 'book';
    G.bookId = bookId;
    G.chapterNo = no;
    G.chapterScores = [];
    startPuzzle(bookId, no, 0);
    return true;
  }

  /* 开本章第 idx 题 */
  function startPuzzle(bookId, no, idx) {
    closeModals();
    if (G.bookId !== bookId || G.chapterNo !== no) BOOK_PUZZLES = bookLevels(bookId, no);
    G.mode = 'book';
    G.bookId = bookId;
    G.chapterNo = no;
    G.puzzleIdx = Math.max(0, Math.min(BOOK_PUZZLES.length - 1, idx));
    const lv = currentBookLevel();
    if (!lv) { pushLog('⚠ 题目不存在', 'no'); renderLog(); return; }
    G.mol = lv.start.clone();
    G.steps = 0;
    G.history = [];
    G.hintUsed = false;
    G.solved = false;
    G.log = [];
    G.optimal = lv.optimal || optSteps(lv);
    pushLog(`📚 第 ${no} 章 · 第 ${G.puzzleIdx + 1}/${BOOK_PUZZLES.length} 题`, 'sys');
    pushLog(`起始 ${lv.start.getName()}（${lv.start.getDescription()}）`, 'dim');
    renderAll();
  }

  function nextPuzzleOrChapter() {
    const last = G.puzzleIdx >= BOOK_PUZZLES.length - 1;
    if (!last) { startPuzzle(G.bookId, G.chapterNo, G.puzzleIdx + 1); return; }
    finishChapter();
  }

  /* 章结算：记录平均分，判断是否解锁下一章 */
  function finishChapter() {
    const bk = bookMeta();
    const ch = chapterInfo();
    if (!bk || !ch) return;
    const avg = chapterAvg();
    BOOK_API.BookProgress.record(bk.id, ch.no, avg);
    const rec = BOOK_API.BookProgress.get(bk.id, ch.no);
    const passed = avg >= BOOK_API.PASS_SCORE;
    const nextNo = ch.no + 1;
    const hasNext = nextNo <= bk.chapters.length;
    const nextOpen = hasNext && BOOK_API.chapterUnlocked(bk.id, nextNo);
    G.winAction = hasNext && nextOpen ? 'nextChapter' : 'map';
    sfx.win();
    pushLog(`📚 第 ${ch.no} 章完成：平均 ${avg} 分（${recordedScores().length} 题）${passed ? ' · 已解锁下一章' : ' · 未达标（需 ' + BOOK_API.PASS_SCORE + ' 分）'}`, passed ? 'win' : 'no');
    $('#winTitle').textContent = `第 ${ch.no} 章 · ${ch.cn}`;
    const st = BOOK_API.starsOf(avg);
    $('#winStars').textContent = '★'.repeat(st) + '☆'.repeat(3 - st);
    $('#winSub').textContent = passed
      ? `平均 ${avg} 分（${recordedScores().length} 题，最佳 ${rec.best} 分）。${nextOpen && hasNext ? '已解锁第 ' + nextNo + ' 章。' : '你已通关全书！'}`
      : `平均 ${avg} 分（${recordedScores().length} 题），未达 ${BOOK_API.PASS_SCORE} 分。重玩本章可刷新最好成绩。`;
    $('#winRetry').textContent = '重玩本章';
    $('#winNext').textContent = nextOpen && hasNext ? '下一章 →' : '章节地图';
    $('#winNext').hidden = false;
    renderAll();
    openModal('#winModal');
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
    if (G.mode === 'book') {
      const score = BOOK_API.scoreOf(G.steps, G.optimal);
      const i = G.puzzleIdx;
      G.chapterScores[i] = Math.max(G.chapterScores[i] || 0, score);
      sfx.win();
      pushLog(`🏆 第 ${i + 1} 题完成：${G.steps} 步（最少 ${G.optimal} 步）→ ${score} 分`, 'win');
      renderAll();
      showWinBook(score);
      return;
    }
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
    if (G.mode === 'book') {
      $('#btnNext').hidden = !G.solved;
    } else {
      $('#btnNext').hidden = !G.solved || G.levelIdx >= LV.length - 1;
    }
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
    if (G.mode === 'book') {
      BOOK_PUZZLES.forEach((lv, i) => {
        const d = el('button', 'dot' + (i === G.puzzleIdx ? ' cur' : '')
          + (typeof G.chapterScores[i] === 'number' ? ' done' : ''));
        d.type = 'button';
        d.title = `第 ${G.chapterNo} 章 · 第 ${i + 1} 题${typeof G.chapterScores[i] === 'number' ? '（' + G.chapterScores[i] + ' 分）' : ''}`;
        d.setAttribute('aria-label', d.title);
        d.addEventListener('click', () => { closeModals(); startPuzzle(G.bookId, G.chapterNo, i); });
        dots.appendChild(d);
      });
      return;
    }
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

  /* 教材章节地图 */
  function renderBook() {
    if (!BOOK_API) { $('#bookSub').textContent = '教材数据未加载（book.js 缺失）'; return; }
    const bk = BOOK_API.BOOK_MAP.get('clayden2e');
    if (!bk) return;
    let passedN = 0, totalQ = 0;
    bk.chapters.forEach(ch => {
      totalQ += ch.total;
      if (chapRec(bk.id, ch.no).best >= BOOK_API.PASS_SCORE) passedN++;
    });
    const unlocked = BOOK_API.unlockedUpTo(bk.id);
    $('#bookSub').textContent =
      `${bk.title} · 共 ${bk.chapters.length} 章 / ${totalQ} 题 · 已通关 ${passedN} 章 · ` +
      `当前解锁到第 ${unlocked} 章（上一章均分 ≥ ${BOOK_API.PASS_SCORE} 才解锁下一章）`;
    const grid = $('#chapterGrid');
    grid.innerHTML = '';
    bk.chapters.forEach(ch => {
      const rec = chapRec(bk.id, ch.no);
      const open = BOOK_API.chapterUnlocked(bk.id, ch.no);
      const passed = rec.best >= BOOK_API.PASS_SCORE;
      const b = el('button', 'chap' + (open ? '' : ' locked') + (passed ? ' passed' : ''));
      b.type = 'button';
      b.innerHTML = `<span class="chap-no">第 ${ch.no} 章</span>` +
        `<span class="chap-cn">${escapeHtml(ch.cn)}</span>` +
        `<span class="chap-en">${escapeHtml(ch.en)}</span>` +
        `<span class="chap-meta">${ch.total} 题 · ${rec.best ? '最佳 ' + rec.best + ' 分' : '未挑战'}` +
        `${passed ? ' ✓' : ''}${open ? '' : ' 🔒'}</span>`;
      b.addEventListener('click', () => {
        if (!open) {
          const prev = chapRec(bk.id, ch.no - 1).best;
          $('#bookSub').textContent =
            `🔒 第 ${ch.no} 章未解锁：先把第 ${ch.no - 1} 章打到 ${BOOK_API.PASS_SCORE} 分以上（当前 ${prev} 分）。`;
          sfx.no();
          return;
        }
        closeModals();
        startChapter(bk.id, ch.no);
      });
      grid.appendChild(b);
    });
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

  /* 教材模式：逐题弹窗 */
  function showWinBook(score) {
    const lv = currentLevel();
    const total = BOOK_PUZZLES.length;
    const last = G.puzzleIdx >= total - 1;
    const st = BOOK_API.starsOf(score);
    const avg = chapterAvg();
    const cheer = st >= 3 ? '（完美）' : st >= 2 ? '（稳）' : '（还能再优化一步）';
    $('#winTitle').textContent = `${lv.target.getName()} 合成完成`;
    $('#winStars').textContent = '★'.repeat(st) + '☆'.repeat(3 - st);
    $('#winSub').textContent =
      `本题 ${G.steps} 步（最少 ${G.optimal} 步）→ ${score} 分 · ` +
      `第 ${G.puzzleIdx + 1}/${total} 题 · 本章均分 ${avg}` +
      (last ? '' : cheer);
    $('#winRetry').textContent = '重试本题';
    $('#winNext').textContent = last ? '章结算 →' : '下一题 →';
    $('#winNext').hidden = false;
    G.winAction = last ? 'chapter' : 'next';
    openModal('#winModal');
  }

  /* ---------------- 事件 ---------------- */
  function bind() {
    $('#btnUndo').addEventListener('click', undo);
    $('#btnHint').addEventListener('click', doHint);
    $('#btnRestart').addEventListener('click', () => restartCurrent());
    $('#btnNext').addEventListener('click', () => {
      if (G.mode === 'book') { nextPuzzleOrChapter(); return; }
      startLevel(G.levelIdx + 1);
    });
    $('#winRetry').addEventListener('click', () => {
      closeModals();
      if (G.mode === 'book') {
        if (G.winAction === 'nextChapter' || G.winAction === 'map') { startChapter(G.bookId, G.chapterNo); return; }
        startPuzzle(G.bookId, G.chapterNo, G.puzzleIdx);
        return;
      }
      startLevel(G.levelIdx);
    });
    $('#winNext').addEventListener('click', () => {
      closeModals();
      if (G.mode === 'book') {
        if (G.winAction === 'next') { startPuzzle(G.bookId, G.chapterNo, G.puzzleIdx + 1); return; }
        if (G.winAction === 'chapter') { finishChapter(); return; }
        if (G.winAction === 'nextChapter') { startChapter(G.bookId, G.chapterNo + 1); return; }
        renderBook(); openModal('#bookModal'); return;
      }
      startLevel(G.levelIdx + 1);
    });
    $('#btnBook').addEventListener('click', () => { renderBook(); openModal('#bookModal'); });
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
      if (e.key === 'r') restartCurrent();
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
      undo, hint: doHint, restart: () => restartCurrent(),
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
      },
      book: () => (BOOK_API ? {
        mode: G.mode, bookId: G.bookId, chapterNo: G.chapterNo, puzzleIdx: G.puzzleIdx,
        puzzles: BOOK_PUZZLES.length, scores: recordedScores(), avg: chapterAvg(),
        total: BOOK_API.totalPuzzles(),
        chapters: BOOK_API.BOOK_MAP.get('clayden2e').chapters.length,
        unlocked: BOOK_API.unlockedUpTo('clayden2e'),
        pass: BOOK_API.PASS_SCORE, extraRxns: BOOK_API.EXTRA_REACTION_COUNT, allRxns: RXNS.length
      } : null),
      chapter: (no, i) => {
        const ok = startChapter('clayden2e', no);
        if (ok && typeof i === 'number') startPuzzle('clayden2e', no, i);
        renderAll();
        return !!ok;
      },
      bookLevel: () => {
        if (G.mode !== 'book') return null;
        const lv = currentLevel();
        return lv ? {
          title: lv.title, goal: lv.goal, from: lv.start.getDescription(),
          to: lv.target.getDescription(), optimal: G.optimal, via: lv.hint
        } : null;
      },
      map: () => { renderBook(); openModal('#bookModal'); return true; },
      chapNo: n => { const b = BOOK_API.BOOK_MAP.get('clayden2e'); return b && b.chapters[n] ? b.chapters[n] : null; }
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
