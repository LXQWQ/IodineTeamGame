/* 元素自走棋 · Elemental Autochess — 纯逻辑内核（Node / 浏览器双用）
 * 无 DOM 依赖，可用 node 直接跑千局平衡。
 */
(function (root) {
  'use strict';

  const COLS = 6, ROWS = 8;         // 上半 0..3 敌方，下半 4..7 我方
  const BENCH_MAX = 9;
  const BOARD_MAX_BY_LEVEL = [3, 4, 5, 6, 7, 8, 9, 10, 12];  // level 1..9
  const TICK_MS = 300;                 // 每 tick 的实际时长（毫秒）
  const DMG_SCALE = 0.15;               // 全局伤害系数：拉长单回合战斗时长，让过程看得清
  const COMBAT_MAX_TICKS = 600;     // 120 秒兜底
  const XP_PER_BUY = 4;
  const REROLL_COST = 2;

  /* ---------------- 数据 ---------------- */
  // family: 族  period: 周期  block: 区块  chi: 鲍林电负性  range: 射程（格）  spd: 行动条速度
  const UNITS = {
    H:  { name: '氢',   sym: 'H',  cost: 1, hp: 520,  atk: 42, range: 1, spd: 1.25, armor: 8,  chi: 2.20, family: 'ⅠA', period: 1, block: 's', tag: '速攻', color: '#dce9d7' },
    C:  { name: '碳',   sym: 'C',  cost: 1, hp: 560,  atk: 38, range: 2, spd: 0.95, armor: 6,  chi: 2.55, family: 'ⅣA', period: 2, block: 'p', tag: '远程', color: '#8b9990' },
    O:  { name: '氧',   sym: 'O',  cost: 2, hp: 480,  atk: 58, range: 3, spd: 0.85, armor: 5,  chi: 3.44, family: 'ⅥA', period: 2, block: 'p', tag: '法术', color: '#8ccbc8' },
    Na: { name: '钠',   sym: 'Na', cost: 2, hp: 720,  atk: 46, range: 1, spd: 1.10, armor: 10, chi: 0.93, family: 'ⅠA', period: 3, block: 's', tag: '肉盾', color: '#c2c7b1' },
    Cl: { name: '氯',   sym: 'Cl', cost: 2, hp: 500,  atk: 54, range: 2, spd: 1.00, armor: 7,  chi: 3.16, family: 'ⅦA', period: 3, block: 'p', tag: '毒伤', color: '#bdcc79' },
    Mg: { name: '镁',   sym: 'Mg', cost: 3, hp: 840,  atk: 52, range: 1, spd: 0.95, armor: 13, chi: 1.31, family: 'ⅡA', period: 3, block: 's', tag: '肉盾', color: '#e2e9e6' },
    Al: { name: '铝',   sym: 'Al', cost: 3, hp: 700,  atk: 48, range: 1, spd: 1.00, armor: 16, chi: 1.61, family: 'ⅢA', period: 3, block: 'p', tag: '护甲', color: '#cfd8dd' },
    Si: { name: '硅',   sym: 'Si', cost: 3, hp: 620,  atk: 50, range: 2, spd: 0.90, armor: 9,  chi: 1.90, family: 'ⅣA', period: 3, block: 'p', tag: '远程', color: '#a9b4bc' },
    P:  { name: '磷',   sym: 'P',  cost: 4, hp: 640,  atk: 72, range: 2, spd: 0.95, armor: 8,  chi: 2.19, family: 'ⅤA', period: 3, block: 'p', tag: '爆发', color: '#e7e0c6' },
    S:  { name: '硫',   sym: 'S',  cost: 4, hp: 700,  atk: 66, range: 2, spd: 0.90, armor: 10, chi: 2.58, family: 'ⅥA', period: 3, block: 'p', tag: '灼烧', color: '#efe08a' },
    Fe: { name: '铁',   sym: 'Fe', cost: 5, hp: 980,  atk: 78, range: 1, spd: 0.85, armor: 18, chi: 1.83, family: 'Ⅷ',  period: 4, block: 'd', tag: '坦克', color: '#b68b71' },
    Cu: { name: '铜',   sym: 'Cu', cost: 5, hp: 820,  atk: 74, range: 1, spd: 1.05, armor: 12, chi: 1.90, family: 'ⅠB', period: 4, block: 'd', tag: '吸血', color: '#d9a486' }
  };
  const UNIT_IDS = ['H', 'C', 'O', 'Na', 'Cl', 'Mg', 'Al', 'Si', 'P', 'S', 'Fe', 'Cu'];

  // 羁绊：count -> 效果
  const TRAITS = {
    block: {
      's': { name: 's 区 · 活泼金属', tiers: [{ n: 2, armor: 8, desc: '+8 护甲' }, { n: 3, armor: 18, desc: '+18 护甲，受击回能' }] },
      'p': { name: 'p 区 · 非金属', tiers: [{ n: 2, atk: 0.12, desc: '攻击 +12%' }, { n: 4, atk: 0.28, desc: '攻击 +28%' }, { n: 6, atk: 0.45, desc: '攻击 +45%，溅射' }] },
      'd': { name: 'd 区 · 过渡金属', tiers: [{ n: 2, life: 0.18, armor: 10, desc: '吸血 18%，+10 护甲' }] }
    },
    period: {
      '1': { name: '第 1 周期', tiers: [{ n: 1, spd: 0.10, desc: '行动速度 +10%' }] },
      '2': { name: '第 2 周期', tiers: [{ n: 2, atk: 0.15, desc: '攻击 +15%' }] },
      '3': { name: '第 3 周期', tiers: [{ n: 2, spd: 0.12, desc: '行动速度 +12%' }, { n: 4, spd: 0.26, desc: '行动速度 +26%' }, { n: 6, spd: 0.42, desc: '行动速度 +42%' }] },
      '4': { name: '第 4 周期', tiers: [{ n: 2, armor: 14, life: 0.12, desc: '+14 护甲，生命 +12%' }] }
    }
  };

  const MAX_ROUNDS = 40;            // 回合上限，超过判负，保证对局必然收束
  const IONIC_DELTA = 1.8;          // 电负性差 ≥1.8 触发离子键合击
  const IONIC_BONUS = 0.35;         // 合击伤害加成

  /* ---------------- PRNG ---------------- */
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- 商店 ---------------- */
  // 商店概率按等级（1..9）：低费高概率
  const SHOP_ODDS = [
    [1.00, 0, 0, 0, 0],
    [0.75, 0.25, 0, 0, 0],
    [0.55, 0.35, 0.10, 0, 0],
    [0.40, 0.38, 0.18, 0.04, 0],
    [0.28, 0.34, 0.26, 0.12, 0],
    [0.18, 0.28, 0.30, 0.20, 0.04],
    [0.12, 0.20, 0.30, 0.28, 0.10],
    [0.08, 0.14, 0.28, 0.32, 0.18],
    [0.05, 0.10, 0.24, 0.34, 0.27]
  ];

  function rollShop(g) {
    const odds = SHOP_ODDS[clamp(g.level, 1, 9) - 1];
    const out = [];
    for (let i = 0; i < 5; i++) {
      let r = g.rng(), pick = 0, acc = 0;
      for (let c = 0; c < 5; c++) { acc += odds[c]; if (r <= acc) { pick = c + 1; break; } pick = c + 1; }
      const pool = UNIT_IDS.filter((id) => UNITS[id].cost === pick);
      const id = pool.length ? pool[Math.floor(g.rng() * pool.length) % pool.length] : UNIT_IDS[0];
      out.push(id);
    }
    g.shop = out;
    return out;
  }

  /* ---------------- 棋子 ---------------- */
  let UID = 0;
  function makePiece(id, star) {
    const d = UNITS[id];
    const s = star || 1;
    const mult = [0, 1, 1.8, 3.2][s];
    return {
      uid: 'p' + (++UID),
      id, star: s,
      maxHp: Math.round(d.hp * mult),
      hp: Math.round(d.hp * mult),
      atk: Math.round(d.atk * mult),
      armor: d.armor + (s - 1) * 4,
      spd: d.spd,
      range: d.range,
      mana: 0, manaMax: 100
    };
  }

  /* ---------------- 对局 ---------------- */
  function createGame(opts) {
    opts = opts || {};
    const seed = opts.seed || 481927;
    const g = {
      seed,
      rng: mulberry(seed),
      round: 1,
      gold: 6,
      level: 2,
      xp: 0,
      winStreak: 0,
      loseStreak: 0,
      hp: 100,
      enemyScale: opts.enemyScale || 1.6,
      shop: [],
      bench: [],
      board: [],          // { piece, r, c }
      locked: false,
      phase: 'prep',      // prep | combat | over
      log: [],
      lastResult: null,
      stats: { wins: 0, losses: 0 }
    };
    rollShop(g);
    return g;
  }

  function boardCount(g) { return g.board.length; }
  function boardMax(g) { return BOARD_MAX_BY_LEVEL[clamp(g.level, 1, 9) - 1]; }
  function occupy(g, r, c) { return g.board.find((b) => b.r === r && b.c === c) || null; }

  function buy(g, shopIdx) {
    if (g.phase !== 'prep') return { ok: false, why: '只能准备阶段购买' };
    const id = g.shop[shopIdx];
    if (!id) return { ok: false, why: '没有这张牌' };
    const d = UNITS[id];
    if (g.gold < d.cost) return { ok: false, why: '金币不足' };
    if (g.bench.length >= BENCH_MAX) return { ok: false, why: '备战席已满' };
    g.gold -= d.cost;
    g.shop[shopIdx] = null;
    const p = makePiece(id, 1);
    g.bench.push(p);
    // 自动三合一
    mergeAll(g);
    logLine(g, `买入 ${d.name}（${d.cost} 金）`);
    return { ok: true, piece: p };
  }

  function sell(g, uid) {
    const benchIdx = g.bench.findIndex((p) => p.uid === uid);
    const boardIdx = g.board.findIndex((b) => b.piece.uid === uid);
    const p = benchIdx >= 0 ? g.bench[benchIdx] : (boardIdx >= 0 ? g.board[boardIdx].piece : null);
    if (!p) return { ok: false, why: '找不到棋子' };
    const back = UNITS[p.id].cost * ([0, 1, 1, 2][p.star] || 1);
    g.gold += back;
    if (benchIdx >= 0) g.bench.splice(benchIdx, 1); else g.board.splice(boardIdx, 1);
    logLine(g, `卖出 ${UNITS[p.id].name} +${back} 金`);
    return { ok: true };
  }

  function mergeAll(g) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let star = 1; star <= 2; star++) {
        const groups = {};
        const all = g.bench.concat(g.board.map((b) => b.piece));
        all.forEach((p) => {
          if (p.star !== star) return;
          (groups[p.id] = groups[p.id] || []).push(p);
        });
        for (const id in groups) {
          const list = groups[id];
          if (list.length < 3) continue;
          const keep = list[0];
          const eat = list.slice(1, 3);
          eat.forEach((e) => removePiece(g, e.uid));
          keep.star = star + 1;
          const d = UNITS[id];
          const mult = [0, 1, 1.8, 3.2][keep.star];
          keep.maxHp = Math.round(d.hp * mult);
          keep.hp = keep.maxHp;
          keep.atk = Math.round(d.atk * mult);
          keep.armor = d.armor + (keep.star - 1) * 4;
          logLine(g, `${d.name} 合成为 ${keep.star}★`);
          changed = true;
          break;
        }
        if (changed) break;
      }
    }
  }

  function removePiece(g, uid) {
    const bi = g.bench.findIndex((p) => p.uid === uid);
    if (bi >= 0) { g.bench.splice(bi, 1); return true; }
    const bd = g.board.findIndex((b) => b.piece.uid === uid);
    if (bd >= 0) { g.board.splice(bd, 1); return true; }
    return false;
  }

  function place(g, uid, r, c) {
    if (g.phase !== 'prep') return { ok: false, why: '只能准备阶段布置' };
    if (r < 4 || r > 7 || c < 0 || c >= COLS) return { ok: false, why: '只能放在己方半场（下半 4 行）' };
    const bi = g.bench.findIndex((p) => p.uid === uid);
    if (bi < 0) return { ok: false, why: '棋子不在备战席' };
    const sit = occupy(g, r, c);
    if (sit) return { ok: false, why: '该格已有棋子' };
    if (boardCount(g) >= boardMax(g)) return { ok: false, why: '上场数量已达上限（升级可增加）' };
    const p = g.bench.splice(bi, 1)[0];
    g.board.push({ r, c, piece: p });
    return { ok: true };
  }

  function unplace(g, uid) {
    const i = g.board.findIndex((b) => b.piece.uid === uid);
    if (i < 0) return { ok: false, why: '棋子不在场上' };
    if (g.bench.length >= BENCH_MAX) return { ok: false, why: '备战席已满' };
    const b = g.board.splice(i, 1)[0];
    g.bench.push(b.piece);
    return { ok: true };
  }

  function reroll(g) {
    if (g.gold < REROLL_COST) return { ok: false, why: '金币不足' };
    g.gold -= REROLL_COST;
    rollShop(g);
    return { ok: true };
  }

  function buyXp(g) {
    if (g.gold < XP_PER_BUY_COST) return { ok: false, why: '金币不足' };
    if (g.level >= 9) return { ok: false, why: '已满级' };
    g.gold -= XP_PER_BUY_COST;
    g.xp += XP_PER_BUY;
    while (g.level < 9 && g.xp >= xpNeed(g.level)) { g.xp -= xpNeed(g.level); g.level++; logLine(g, `升到 ${g.level} 级`); }
    return { ok: true };
  }
  const XP_PER_BUY_COST = 4;
  function xpNeed(lv) { return [0, 0, 2, 6, 10, 16, 24, 34, 48][clamp(lv, 1, 8)] || 60; }

  /* ---------------- 羁绊统计 ---------------- */
  function traitCounts(board) {
    const cnt = { block: {}, period: {} };
    const seen = new Set();
    board.forEach((b) => {
      if (seen.has(b.piece.id)) return;
      seen.add(b.piece.id);
      const d = UNITS[b.piece.id];
      cnt.block[d.block] = (cnt.block[d.block] || 0) + 1;
      cnt.period[d.period] = (cnt.period[d.period] || 0) + 1;
    });
    return cnt;
  }

  function activeTraits(board) {
    const cnt = traitCounts(board);
    const out = [];
    for (const axis in TRAITS) {
      for (const key in TRAITS[axis]) {
        const t = TRAITS[axis][key];
        const n = cnt[axis][key] || 0;
        let best = null;
        t.tiers.forEach((tier) => { if (n >= tier.n) best = tier; });
        if (best) out.push({ axis, key, name: t.name, n, tier: best });
      }
    }
    return out;
  }

  function traitBonus(board) {
    const b = { atk: 0, armor: 0, spd: 0, life: 0, splash: false };
    activeTraits(board).forEach((t) => {
      const x = t.tier;
      b.atk += x.atk || 0; b.armor += x.armor || 0; b.spd += x.spd || 0; b.life += x.life || 0;
      if (x.splash) b.splash = true;
    });
    return b;
  }

  /* ---------------- 敌方编队 ---------------- */
  function makeEnemy(g) {
    const r = g.round;
    const scale = g.enemyScale || 1;
    const budget = Math.round((3 + r * 2.1) * scale);   // 敌方总费
    const lvCap = clamp(1 + Math.floor(r / 2), 1, 9);
    const maxUnits = clamp(2 + Math.floor(r / 1.6), 2, 10);
    const rng = mulberry(g.seed + r * 7919);
    const picks = [];
    let left = budget;
    let guard = 0;
    while (left > 0 && picks.length < maxUnits && guard++ < 200) {
      const cands = UNIT_IDS.filter((id) => UNITS[id].cost <= Math.min(5, left) && UNITS[id].cost <= lvCap + 1);
      if (!cands.length) break;
      const id = cands[Math.floor(rng() * cands.length) % cands.length];
      picks.push(id);
      left -= UNITS[id].cost;
    }
    // 星级：后期有 2★
    const board = [];
    const rows = [0, 1, 2, 3];
    const used = new Set();
    picks.forEach((id, i) => {
      const star = (r >= 6 && rng() < 0.3) ? 2 : 1;
      const p = makePiece(id, star);
      // 难度系数：直接放大敌方数值，避免"预算够了但上场上限封顶"导致难度不再增长
      if (scale > 1) {
        p.maxHp = Math.round(p.maxHp * (1 + (scale - 1) * 0.16));
        p.hp = p.maxHp;
        p.atk = Math.round(p.atk * (1 + (scale - 1) * 0.12));
      }
      let placed = false;
      for (let t = 0; t < 80 && !placed; t++) {
        const rr = rows[Math.floor(rng() * rows.length) % rows.length];
        const cc = Math.floor(rng() * COLS) % COLS;
        const key = rr + ',' + cc;
        if (used.has(key)) continue;
        used.add(key);
        board.push({ r: rr, c: cc, piece: p });
        placed = true;
      }
    });
    return board;
  }

  /* ---------------- 战斗 ---------------- */
  function startCombat(g) {
    if (!g.board.length) return { ok: false, why: '场上没有棋子' };
    g.phase = 'combat';
    const enemy = makeEnemy(g);
    const bp = traitBonus(g.board);
    const be = traitBonus(enemy);
    const mk = (b, side, bonus) => {
      const d = UNITS[b.piece.id];
      return {
        uid: b.piece.uid + '_' + side,
        side,
        id: b.piece.id,
        name: d.name, sym: d.sym, color: d.color, block: d.block, chi: d.chi,
        r: b.r, c: b.c, range: b.piece.range,
        hp: Math.round(b.piece.maxHp * (1 + bonus.life)),
        maxHp: Math.round(b.piece.maxHp * (1 + bonus.life)),
        atk: b.piece.atk * (1 + bonus.atk),
        armor: b.piece.armor + bonus.armor,
        spd: b.piece.spd * (1 + bonus.spd),
        star: b.piece.star,
        mana: 0, manaMax: 100,
        bar: 0, alive: true, target: null,
        shield: 0, burn: 0, poison: 0, splash: bonus.splash
      };
    };
    const units = [];
    g.board.forEach((b) => units.push(mk(b, 'ally', bp)));
    enemy.forEach((b) => units.push(mk(b, 'enemy', be)));
    const m = {
      g, units, tick: 0, done: false, winner: null,
      fx: [], log: [],
      ionic: 0, damage: { ally: 0, enemy: 0 }
    };
    g.match = m;
    return { ok: true, match: m };
  }

  const dist = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));

  function stepCombat(m) {
    if (m.done) return m;
    m.tick++;
    const alive = (s) => m.units.filter((u) => u.alive && u.side === s);
    const allies = alive('ally'), enemies = alive('enemy');

    if (!allies.length || !enemies.length || m.tick > COMBAT_MAX_TICKS) {
      m.done = true;
      m.winner = allies.length && !enemies.length ? 'ally' : (!allies.length && enemies.length ? 'enemy' : 'draw');
      if (m.tick > COMBAT_MAX_TICKS && allies.length && enemies.length) {
        const ah = allies.reduce((s, u) => s + u.hp, 0), eh = enemies.reduce((s, u) => s + u.hp, 0);
        m.winner = ah >= eh ? 'ally' : 'enemy';
      }
      return m;
    }

    m.units.forEach((u) => {
      if (!u.alive) return;
      if (u.burn > 0) { u.burn--; hurt(m, u, 12, true); }
      if (u.poison > 0) { u.poison--; hurt(m, u, 8, true); }
      if (!u.alive) return;

      const foes = u.side === 'ally' ? alive('enemy') : alive('ally');
      if (!foes.length) return;
      // 目标：最近的敌人
      let tgt = null, best = 1e9;
      foes.forEach((f) => { const d = dist(u, f); if (d < best) { best = d; tgt = f; } });
      u.target = tgt;

      u.bar += u.spd * 0.9;
      if (u.bar < 1) return;
      u.bar -= 1;

      if (best > u.range) {
        // 移动一格靠近
        const dr = Math.sign(tgt.r - u.r), dc = Math.sign(tgt.c - u.c);
        const nr = u.r + dr, nc = u.c + (Math.abs(tgt.c - u.c) > Math.abs(tgt.r - u.r) ? dc : 0);
        if (!occupiedAt(m, nr, nc)) { u.r = clamp(nr, 0, ROWS - 1); u.c = clamp(nc, 0, COLS - 1); }
        else if (!occupiedAt(m, u.r, u.c + dc)) { u.c = clamp(u.c + dc, 0, COLS - 1); }
        return;
      }

      // 攻击
      let dmg = Math.max(1, u.atk * DMG_SCALE * (1 - Math.min(0.72, tgt.armor / (tgt.armor + 100))));
      let ionic = false;
      // 离子键合击：与相邻友军电负性差 ≥1.8
      if (u.chi != null) {
        const mate = m.units.find((o) => o.alive && o.side === u.side && o !== u && dist(o, u) === 1 && Math.abs(o.chi - u.chi) >= IONIC_DELTA);
        if (mate) { dmg *= 1 + IONIC_BONUS; ionic = true; m.ionic++; }
      }
      dmg = Math.round(dmg);
      hurt(m, tgt, dmg, false);
      m.damage[u.side] += dmg;
      u.mana = Math.min(u.manaMax, u.mana + 18);
      tgt.mana = Math.min(tgt.manaMax, tgt.mana + 8);

      m.fx.push({ r: tgt.r, c: tgt.c, text: (ionic ? '⚡' : '') + dmg, life: 3, side: u.side });

      if (u.splash) {
        m.units.filter((o) => o.alive && o.side !== u.side && o !== tgt && dist(o, tgt) === 1)
          .forEach((o) => hurt(m, o, Math.round(dmg * 0.35), false));
      }
      // 技能（简化：普攻附带元素特性）
      if (u.id === 'S') tgt.burn = 3;
      if (u.id === 'Cl') tgt.poison = 3;
      if (u.block === 'd' && u.atk > 0) {
        const heal = Math.round(dmg * 0.18);
        u.hp = Math.min(u.maxHp, u.hp + heal);
      }
      if (u.mana >= u.manaMax) {
        u.mana = 0;
        const burst = Math.round(u.atk * 2.2);
        hurt(m, tgt, burst, false);
        m.fx.push({ r: tgt.r, c: tgt.c, text: '✦' + burst, life: 4, side: u.side });
      }
    });

    m.fx = m.fx.filter((f) => --f.life > 0);
    return m;
  }

  function occupiedAt(m, r, c) {
    return m.units.some((u) => u.alive && u.r === r && u.c === c);
  }

  function hurt(m, u, dmg, dot) {
    if (!u.alive) return;
    u.hp -= dmg;
    if (dot) m.damage[u.side === 'ally' ? 'enemy' : 'ally'] += 0;
    if (u.hp <= 0) { u.hp = 0; u.alive = false; }
  }

  /* ---------------- 回合结算 ---------------- */
  function endCombat(g) {
    const m = g.match;
    if (!m || !m.done) return { ok: false, why: '战斗尚未结束' };
    const win = m.winner === 'ally';
    const lose = m.winner === 'enemy';
    if (win) { g.winStreak++; g.loseStreak = 0; g.stats.wins++; }
    else if (lose) { g.loseStreak++; g.winStreak = 0; g.stats.losses++; g.hp = Math.max(0, g.hp - (4 + Math.min(14, g.round))); }
    else { g.loseStreak = 0; }

    // 金币结算
    let income = 5;
    if (win) income += 1;
    income += Math.min(3, Math.floor(g.gold / 10));
    if (g.winStreak >= 3) income += 1;
    if (g.winStreak >= 5) income += 1;
    g.gold += income;
    g.xp += 2;
    while (g.level < 9 && g.xp >= xpNeed(g.level)) { g.xp -= xpNeed(g.level); g.level++; }

    g.lastResult = { winner: m.winner, ionic: m.ionic, round: g.round };
    logLine(g, `第 ${g.round} 回合 ${win ? '胜利' : lose ? '失败' : '平局'}（+${income} 金）`);

    g.round++;
    // 回合上限：防止双方都不掉血的僵持局无限拖长
    if (g.round > MAX_ROUNDS && g.hp > 0) {
      logLine(g, `回合耗尽（上限 ${MAX_ROUNDS}）· 实验室断电，判定失败`);
      g.hp = 0;
    }
    g.phase = g.hp <= 0 ? 'over' : 'prep';
    g.match = null;
    rollShop(g);
    return { ok: true, win, income };
  }

  function logLine(g, s) {
    g.log.push(s);
    if (g.log.length > 60) g.log.shift();
  }

  /* ---------------- 自对弈（平衡用） ---------------- */
  function autoPlay(seed, maxRounds, enemyScale) {
    const g = createGame({ seed, enemyScale });
    const rng = mulberry(seed ^ 0x9e3779b9);
    let guard = 0;
    while (g.phase === 'prep' && g.round <= (maxRounds || 40) && guard++ < 600) {
      // 简单 AI：买得起就买、上满场
      for (let i = 0; i < 5; i++) {
        const id = g.shop[i];
        if (id && g.gold >= UNITS[id].cost && g.bench.length < BENCH_MAX) buy(g, i);
      }
      if (g.gold >= REROLL_COST + 4 && rng() < 0.5) reroll(g);
      for (const p of g.bench.slice()) {
        if (boardCount(g) >= boardMax(g)) break;
        let placed = false;
        for (let t = 0; t < 24 && !placed; t++) {
          const r = 4 + Math.floor(rng() * 4) % 4;
          const c = Math.floor(rng() * COLS) % COLS;
          if (place(g, p.uid, r, c).ok) placed = true;
        }
      }
      const s = startCombat(g);
      if (!s.ok) break;
      while (!g.match.done) stepCombat(g.match);
      endCombat(g);
    }
    return g;
  }

  const API = {
    COLS, ROWS, BENCH_MAX, BOARD_MAX_BY_LEVEL, TICK_MS, DMG_SCALE, COMBAT_MAX_TICKS, REROLL_COST,
    UNITS, UNIT_IDS, TRAITS, IONIC_DELTA, IONIC_BONUS, SHOP_ODDS,
    mulberry, clamp, createGame, rollShop, makePiece,
    boardMax, boardCount, occupy, buy, sell, place, unplace, reroll, buyXp, xpNeed,
    mergeAll, removePiece, traitCounts, activeTraits, traitBonus, XP_PER_BUY, XP_PER_BUY_COST,
    makeEnemy, startCombat, stepCombat, endCombat, logLine, autoPlay
  };
  root.AutoChess = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
