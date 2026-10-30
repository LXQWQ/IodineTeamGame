/* ============================================================
   相转移大作战 · 相图博弈
   核心：卡牌改变温度/压强/溶剂 → 物质在 4×4 相图上移动
        停在自己的目标格并撑过对手一回合 → 获胜
   ============================================================ */

/* ---------------- 相与溶剂 ---------------- */
const PHASES = [
    { key: 'solid',  name: '固相',   icon: '❄️', cls: 'p-solid'  },
    { key: 'liquid', name: '液相',   icon: '💧', cls: 'p-liquid' },
    { key: 'gas',    name: '气相',   icon: '💨', cls: 'p-gas'    },
    { key: 'plasma', name: '等离子体', icon: '⚡', cls: 'p-plasma' }
];
const SOLVENTS = [
    { key: 'hydrophilic', name: '亲水', icon: '💧' },
    { key: 'amphiphilic', name: '两亲', icon: '🌊' },
    { key: 'lipophilic',  name: '亲油', icon: '🛢️' },
    { key: 'insoluble',   name: '不溶', icon: '🪨' }
];
const SHORT_PHASE = ['固相', '液相', '气相', '等离子'];
const PHASE_IDX  = Object.fromEntries(PHASES.map((p,i)=>[p.key,i]));
const SOLV_IDX   = Object.fromEntries(SOLVENTS.map((s,i)=>[s.key,i]));

/* ---------------- 物质（真实数据） ---------------- */
const SUBSTANCES = {
    '水': {
        formula: 'H₂O', icon: '💧',
        melting: 0, boiling: 100, plasmaK: null,
        solvAffinity: 'hydrophilic',
        note: '加压会降低熔点（冰刀原理），升华不成立',
        color: '#5aa9e6'
    },
    '碘': {
        formula: 'I₂', icon: '🟣',
        melting: 113.7, boiling: 184.3, plasmaK: null,
        sublimation: true,           // 常压下 113.7°C 直接升华
        solvAffinity: 'lipophilic',
        note: '常压加热不经液相，直接升华为紫色蒸气',
        color: '#9b6dd6'
    },
    '氩': {
        formula: 'Ar', icon: '🔵',
        melting: -189.3, boiling: -185.8, plasmaK: 2000,
        solvAffinity: 'insoluble',
        note: '惰性气体，5000K 以上电离成等离子体',
        color: '#6bc7d6'
    },
    '铁': {
        formula: 'Fe', icon: '⚙️',
        melting: 1538, boiling: 2862, plasmaK: 5000,
        solvAffinity: 'insoluble',
        note: '铁磁性；8000K 以上等离子化',
        color: '#98a2b3'
    },
    '汞': {
        formula: 'Hg', icon: '🌡️',
        melting: -38.8, boiling: 356.7, plasmaK: null,
        solvAffinity: 'insoluble',
        note: '常温唯一的液态金属',
        color: '#c0c8d4'
    },
    '氢气': {
        formula: 'H₂', icon: '💨',
        melting: -259.2, boiling: -252.9, plasmaK: 2000,
        solvAffinity: 'insoluble',
        note: '液氢只在极低温存在，2000K 以上电离',
        color: '#8ad6f0'
    },
    '乙醇': {
        formula: 'C₂H₅OH', icon: '🍷',
        melting: -114.1, boiling: 78.4, plasmaK: null,
        solvAffinity: 'amphiphilic',
        note: '既溶于水也溶于有机溶剂',
        color: '#e0a35c'
    },
    '氯化钠': {
        formula: 'NaCl', icon: '🧂',
        melting: 801, boiling: 1413, plasmaK: null,
        solvAffinity: 'hydrophilic',
        note: '离子晶体，熔融态离子导电',
        color: '#dfe6ef'
    }
};

/* ---------------- 相判定 ---------------- */
function phaseOf(sub, tempC, press) {
    const K = tempC + 273.15;
    if (sub.plasmaK !== null && sub.plasmaK !== undefined && K >= sub.plasmaK) return 'plasma';
    // 常压升华：碘在 113.7°C 以上直接变气
    if (sub.sublimation && press < 2 && tempC >= sub.melting) return 'gas';
    if (tempC >= sub.boiling) return 'gas';
    if (tempC >= sub.melting) return 'liquid';
    return 'solid';
}

/* ---------------- 卡牌 ---------------- */
/* cost: 能量；apply(st) 返回新的 {temp,press,solvent}（纯函数） */
const CARDS = [
    { id:'heat1', name:'🔥 升温',      cost:1, desc:'+100°C',
      apply:s => ({ temp: s.temp + 100 }) },
    { id:'cool1', name:'❄️ 降温',      cost:1, desc:'−100°C',
      apply:s => ({ temp: s.temp - 100 }) },
    { id:'heat2', name:'🔥🔥 强热',    cost:2, desc:'+500°C',
      apply:s => ({ temp: s.temp + 500 }) },
    { id:'cool2', name:'❄️❄️ 深冷',    cost:2, desc:'−500°C',
      apply:s => ({ temp: s.temp - 500 }) },
    { id:'press', name:'📏 加压',      cost:1, desc:'压强 ×10',
      apply:s => ({ press: Math.min(1000, s.press * 10) }) },
    { id:'vacuum',name:'🧹 抽真空',    cost:1, desc:'压强 ×0.1',
      apply:s => ({ press: Math.max(0.01, s.press * 0.1) }) },
    { id:'water', name:'💧 注水',      cost:1, desc:'溶剂→水相',
      apply:s => ({ solvent: 'water' }) },
    { id:'organic',name:'🛢️ 注有机相', cost:1, desc:'溶剂→有机相',
      apply:s => ({ solvent: 'organic' }) },
    { id:'strip', name:'🧽 去溶剂',    cost:1, desc:'溶剂→无',
      apply:s => ({ solvent: 'none' }) },
    { id:'plasma',name:'⚡ 强放电',    cost:3, desc:'+2000°C / ×10 压强',
      apply:s => ({ temp: s.temp + 2000, press: Math.min(1000, s.press * 10) }) }
];
const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));

/* 溶剂状态 → 亲和性坐标（0..3） */
function solventIndexOf(sub, solvent) {
    if (solvent === 'none') return 3;                       // 无溶剂 = 不溶态
    if (sub.solvAffinity === 'hydrophilic') return solvent === 'water' ? 0 : 1;
    if (sub.solvAffinity === 'lipophilic')  return solvent === 'organic' ? 2 : 1;
    return 1;                                               // 两亲：两边都是 1
}

/* ---------------- 状态 ---------------- */
const S = {
    mode: 'ai', diff: 'medium', subPickMode: 'random', fixedSub: '水',
    sub: null, subKey: '',
    temp: 25, press: 1, solvent: 'none',
    cur: 1,                 // 1 = 左/你, 2 = 右/对手
    energy: { 1: 3, 2: 3 },
    hand:   { 1: [], 2: [] },
    deck:   { 1: [], 2: [] },
    goal:   { 1: null, 2: null },   // {pi, si}
    hold:   { 1: 0, 2: 0 },         // 已连续占领的己方回合数
    turnNo: 1,
    over: false,
    busy: false,
    log: []
};

const MAX_ENERGY = 12;
const ENERGY_PER_TURN = 3;
const HAND_SIZE = 4;
const HOLD_TURNS = 2;        // 需要「自己回合结束 → 对手回合 → 自己回合开始」都还在，即持续 2 次己方回合
const TURN_LIMIT = 40;       // 保护：40 回合仍未分胜负则按「谁离自己目标更近」判定


/* ---------------- DOM ---------------- */
const $ = id => document.getElementById(id);

/* ============================================================
   工具
   ============================================================ */
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/* 当前物质所在的相图格子 */
function curCell(idx) {
    const pi = PHASE_IDX[phaseOf(S.sub, S.temp, S.press)];
    const si = solventIndexOf(S.sub, S.solvent);
    return { pi, si };
}

function cellDist(a, b) {
    if (!a || !b) return 99;
    return Math.abs(a.pi - b.pi) + Math.abs(a.si - b.si);
}

/* 模拟一张牌之后的格子位置（不落地） */
function cellAfterCard(card) {
    const st = card.apply({ temp: S.temp, press: S.press, solvent: S.solvent });
    const temp = st.temp !== undefined ? st.temp : S.temp;
    const press = st.press !== undefined ? st.press : S.press;
    const solvent = st.solvent !== undefined ? st.solvent : S.solvent;
    const pi = PHASE_IDX[phaseOf(S.sub, temp, press)];
    const si = solventIndexOf(S.sub, solvent);
    return { pi, si, temp, press, solvent };
}

/* ============================================================
   目标与开局
   ============================================================ */
function assignGoals(forceKey) {
    const list = [];
    for (let pi = 0; pi < 4; pi++) for (let si = 0; si < 4; si++) list.push({ pi, si });

    // 挑一对相距 ≥4 的格子（避免两人目标挤在一起）
    let a = null, b = null, guard = 0;
    do {
        a = pick(list); b = pick(list);
        guard++;
    } while (guard < 500 && (cellDist(a, b) < 4 || (a.pi === b.pi && a.si === b.si)));

    S.goal[1] = a; S.goal[2] = b;
}

function newGame() {
    // 物质
    const keys = Object.keys(SUBSTANCES);
    S.subKey = (S.subPickMode === 'pick' && S.fixedSub) ? S.fixedSub : pick(keys);
    S.sub = SUBSTANCES[S.subKey];

    // 起始状态：25°C / 1atm / 无溶剂，并随机给一点扰动，避免每局开局完全相同
    S.temp = 25;
    S.press = 1;
    S.solvent = 'none';

    S.turnNo = 1;
    S.cur = 1;
    S.over = false;
    S.busy = false;
    S.energy = { 1: ENERGY_PER_TURN, 2: ENERGY_PER_TURN };
    S.hold = { 1: 0, 2: 0 };
    S.log = [];

    assignGoals();

    // 牌库：每种牌 2 张，洗匀
    const buildDeck = () => {
        const d = [];
        for (const c of CARDS) { d.push(c.id); d.push(c.id); }
        return shuffle(d);
    };
    S.deck[1] = buildDeck();
    S.deck[2] = buildDeck();
    S.hand[1] = []; S.hand[2] = [];
    for (let i = 0; i < HAND_SIZE; i++) { drawTo(1); drawTo(2); }

    addLog(`新物质：${S.sub.icon} ${S.subKey}（${S.sub.formula}）`, 'sys');
    renderAll();
    if (isAITurn()) scheduleAI();
}

function drawTo(pid) {
    while (S.hand[pid].length < HAND_SIZE) {
        if (!S.deck[pid].length) S.deck[pid] = shuffle(CARDS.map(c => c.id).concat(CARDS.map(c => c.id)));
        S.hand[pid].push(S.deck[pid].shift());
    }
}

/* ============================================================
   出牌
   ============================================================ */
function canPlay(pid, cardId) {
    const c = CARD_BY_ID[cardId];
    return !!c && S.energy[pid] >= c.cost && !S.over;
}

function playCard(pid, handIndex) {
    if (S.over) return false;
    const cardId = S.hand[pid][handIndex];
    const card = CARD_BY_ID[cardId];
    if (!card) return false;
    if (S.energy[pid] < card.cost) {
        flashMsg(`⚡ 能量不足（需 ${card.cost}）`);
        return false;
    }

    const before = curCell();
    const after = cellAfterCard(card);

    S.energy[pid] -= card.cost;
    S.temp = after.temp;
    S.press = after.press;
    S.solvent = after.solvent;

    // 从手牌移除并立即补一张
    S.hand[pid].splice(handIndex, 1);
    drawTo(pid);

    const who = pid === 1 ? nameOf(1) : nameOf(2);
    const moved = (before.pi !== after.pi || before.si !== after.si);
    addLog(`${who} 使用 ${card.name}${moved ? ' → 物质移动' : ''}`, pid === 1 ? 'l' : 'r');

    renderAll();
    checkHoldAndWin();
    return true;
}

/* 结束当前回合 */
function endTurn() {
    if (S.over) return;
    const pid = S.cur;

    // 回合结束前判定一次占领：若此刻在自己的目标格，占领计数 +1；
    // 撑满 HOLD_TURNS 次己方回合即获胜（对手已获得一整回合的反制机会）
    checkHoldAndWin();
    if (S.over) return;
    if (S.turnNo > TURN_LIMIT) { decideByDistance(); return; }

    S.cur = pid === 1 ? 2 : 1;
    if (S.cur === 1) S.turnNo++;

    // 新回合补给
    S.energy[S.cur] = Math.min(MAX_ENERGY, S.energy[S.cur] + ENERGY_PER_TURN);
    drawTo(S.cur);

    addLog(`— 第 ${S.turnNo} 回合 · ${nameOf(S.cur)} 行动 —`, 'sys');
    renderAll();
    if (isAITurn()) scheduleAI();
}

/* 占领判定：物质停在某人目标格上时，其 hold +1；离开则清零 */
function updateHold() {
    const cell = curCell();
    for (const pid of [1, 2]) {
        if (cellDist(cell, S.goal[pid]) === 0) S.hold[pid] += 1;
        else S.hold[pid] = 0;
    }
}

function checkHoldAndWin() {
    updateHold();
    for (const pid of [1, 2]) {
        if (S.hold[pid] >= HOLD_TURNS) { win(pid); return; }
        if (S.hold[pid] === 1) {
            flashMsg(`⚠️ ${nameOf(pid)} 已占住目标格！对手有一回合把它拉出去`);
        }
    }
}

function decideByDistance() {
    const cell = curCell();
    const d1 = cellDist(cell, S.goal[1]);
    const d2 = cellDist(cell, S.goal[2]);
    if (d1 === d2) { drawGame(); return; }
    win(d1 < d2 ? 1 : 2, true);
}

function drawGame() {
    S.over = true;
    $('overIcon').textContent = '🤝';
    $('overTitle').textContent = '平局';
    $('overSub').textContent = `打满 ${TURN_LIMIT} 回合，双方距离相同`;
    $('overStats').innerHTML = `
        <div><span>回合数</span><b>${S.turnNo}</b></div>
        <div><span>最终温度</span><b>${fmtTemp(S.temp)}</b></div>`;
    $('over').classList.add('show');
    renderAll();
}

function win(pid, byDistance) {
    S.over = true;
    $('overIcon').textContent = '🏆';
    $('overTitle').textContent = `${nameOf(pid)} 获胜`;
    $('overSub').textContent = byDistance
        ? `打满 ${TURN_LIMIT} 回合，${nameOf(pid)} 的物质离目标更近`
        : `物质 ${S.subKey} 稳住在 ${goalText(pid)} 整整一轮`;
    $('overStats').innerHTML = `
        <div><span>回合数</span><b>第 ${S.turnNo} 回合</b></div>
        <div><span>剩余能量</span><b>${S.energy[pid]} ⚡</b></div>
        <div><span>最终温度</span><b>${fmtTemp(S.temp)}</b></div>
        <div><span>最终相态</span><b>${PHASES[curCell().pi].name}</b></div>`;
    $('over').classList.add('show');
    renderAll();
    addLog(`🏁 ${nameOf(pid)} 获胜`, 'sys');
}

function nameOf(pid) {
    if (S.mode === 'ai') return pid === 1 ? '你' : 'AI';
    return pid === 1 ? '左家' : '右家';
}

function goalText(pid) {
    const g = S.goal[pid];
    if (!g) return '—';
    return `${PHASES[g.pi].icon}${PHASES[g.pi].name} · ${SOLVENTS[g.si].name}`;
}

/* ============================================================
   AI
   ============================================================ */
function isAITurn() {
    return S.mode === 'ai' && S.cur === 2 && !S.over;
}

let aiTimer = null;
function scheduleAI() {
    if (aiTimer) clearTimeout(aiTimer);
    aiTimer = setTimeout(aiStep, 700);
}

function aiStep() {
    if (!isAITurn()) return;
    const pid = 2;

    // 分数：离自己目标越近越好，离对手目标越远越好
    const scoreCell = (cell) => {
        const myD = cellDist(cell, S.goal[2]);
        const foeD = cellDist(cell, S.goal[1]);
        let s = -myD * 10 + foeD * 6;
        if (myD === 0) s += 25;      // 站上目标
        if (foeD === 0) s -= 30;     // 别把物质送到对手脚下
        return s;
    };

    const options = [];
    S.hand[pid].forEach((cid, i) => {
        const c = CARD_BY_ID[cid];
        if (!c || c.cost > S.energy[pid]) return;
        const after = cellAfterCard(c);
        options.push({ i, c, after, s: scoreCell(after) - c.cost * 0.5 });
    });

    if (!options.length) { endTurn(); return; }

    options.sort((a, b) => b.s - a.s);

    let chosen;
    if (S.diff === 'easy') {
        chosen = pick(options);
    } else if (S.diff === 'medium') {
        chosen = options[0];
    } else {
        // hard：再往前看一层——模拟对手最优回应，选「对手最难扳回去」的那手
        const foeReply = (cell) => {
            let best = cellDist(cell, S.goal[1]) === 0 ? 100 : 0;   // 对手已经在目标格上就糟了
            for (const cid of S.hand[1].concat(['heat1','cool1','water','organic','press','vacuum'])) {
                const c = CARD_BY_ID[cid];
                if (!c) continue;
                const st = c.apply({ temp: cell.temp, press: cell.press, solvent: cell.solvent });
                const t = st.temp !== undefined ? st.temp : cell.temp;
                const p = st.press !== undefined ? st.press : cell.press;
                const v = st.solvent !== undefined ? st.solvent : cell.solvent;
                const cell2 = {
                    pi: PHASE_IDX[phaseOf(S.sub, t, p)],
                    si: solventIndexOf(S.sub, v)
                };
                const d = cellDist(cell2, S.goal[1]);
                if (d === 0) best = Math.max(best, 100);
                else best = Math.max(best, 20 - d * 6);
            }
            return best;
        };
        options.forEach(o => { o.s -= foeReply(o.after) * 0.8; });
        options.sort((a, b) => b.s - a.s);
        chosen = options[0];
    }

    // 如果最优选择依然让自己离目标更远，就留着能量结束回合
    if (S.diff !== 'easy' && chosen.s < scoreCell(curCell()) - 6 && S.energy[pid] >= 6) {
        endTurn(); return;
    }

    playCard(pid, chosen.i);

    if (S.over) return;
    // 还能再打一张就继续（最多连续 3 张，防止死循环）
    const canMore = S.hand[pid].some(cid => {
        const c = CARD_BY_ID[cid];
        return c && c.cost <= S.energy[pid] && scoreCell(cellAfterCard(c)) > scoreCell(curCell());
    });
    if (canMore && S.energy[pid] > 0) scheduleAI();
    else setTimeout(() => { if (isAITurn()) endTurn(); }, 500);
}

/* ============================================================
   渲染
   ============================================================ */
function fmtTemp(t) {
    if (Math.abs(t) >= 1000) return `${(t / 1000).toFixed(2)}k°C`;
    return `${t > 0 && t < 1 ? t.toFixed(2) : Math.round(t)}°C`;
}

function renderAll() {
    renderMap();
    renderToken();
    renderReadout();
    renderSides();
    renderHand();
    renderTurnbar();
}

function renderMap() {
    const grid = $('grid');
    if (!grid.children.length) {
        // 只建一次
        for (let si = 0; si < 4; si++) {
            for (let pi = 0; pi < 4; pi++) {
                const cell = document.createElement('div');
                cell.className = 'cell ' + PHASES[pi].cls;
                cell.dataset.pi = pi; cell.dataset.si = si;
                cell.innerHTML = `<span class="ci">${PHASES[pi].icon}</span><span class="cn">${SHORT_PHASE[pi]}</span>`;
                grid.appendChild(cell);
            }
        }
        $('axisX').innerHTML = PHASES.map(p => `<span>${p.name}</span>`).join('');
        $('axisY').innerHTML = SOLVENTS.map(s => `<span>${s.name}</span>`).join('');
    }
    // 目标格高亮
    [...grid.children].forEach(el => {
        const pi = +el.dataset.pi, si = +el.dataset.si;
        el.classList.toggle('is-g1', S.goal[1] && S.goal[1].pi === pi && S.goal[1].si === si);
        el.classList.toggle('is-g2', S.goal[2] && S.goal[2].pi === pi && S.goal[2].si === si);
    });
}

function renderToken() {
    const cell = curCell();
    const tok = $('token');
    const grid = $('grid');
    const target = grid.children[cell.si * 4 + cell.pi];
    if (!target) return;
    const gs = getComputedStyle(grid);
    const gap = parseFloat(gs.gap) || 6;
    const cw = target.offsetWidth, chh = target.offsetHeight;
    const tw = Math.round(cw * 0.84), th = Math.round(chh * 0.84);
    tok.style.width = tw + 'px';
    tok.style.height = th + 'px';
    tok.style.transform = `translate(${target.offsetLeft + (cw - tw) / 2}px, ${target.offsetTop + (chh - th) / 2}px)`;
    tok.style.background = `radial-gradient(circle at 35% 30%, ${S.sub ? S.sub.color : '#fff'}, rgba(0,0,0,.55))`;
    $('tokenIcon').textContent = S.sub ? S.sub.icon : '🧪';
    tok.classList.toggle('holding', S.hold[1] > 0 || S.hold[2] > 0);
}

function renderReadout() {
    const cell = curCell();
    $('rTemp').textContent = fmtTemp(S.temp);
    $('rPress').textContent = S.press >= 10 ? `${Math.round(S.press)} atm` : `${S.press.toFixed(2)} atm`;
    $('rPhase').textContent = PHASES[cell.pi].name;
    $('rSolv').textContent = S.solvent === 'none' ? '无（不溶态）' : (S.solvent === 'water' ? '水相' : '有机相');
    $('matName').textContent = S.sub ? `${S.sub.icon} ${S.subKey} ${S.sub.formula}` : '—';
    $('matState').textContent = S.sub ? S.sub.note : '';
}

function renderSides() {
    $('goalL').innerHTML = `<small>目标</small>${goalText(1)}`;
    $('goalR').innerHTML = `<small>目标</small>${goalText(2)}`;
    $('whoR').textContent = S.mode === 'ai' ? '🔵 AI' : '🔵 右家';

    for (const pid of [1, 2]) {
        const en = S.energy[pid];
        const pct = Math.round(en / MAX_ENERGY * 100);
        $('en' + (pid === 1 ? 'L' : 'R')).style.width = pct + '%';
        $('en' + (pid === 1 ? 'Ltxt' : 'Rtxt')).textContent = en;
        const occ = $('occ' + (pid === 1 ? 'L' : 'R'));
        if (S.hold[pid] > 0) {
            occ.textContent = `已占领 ${S.hold[pid]}/${HOLD_TURNS}`;
            occ.classList.add('on');
        } else {
            occ.textContent = '未占领';
            occ.classList.remove('on');
        }
    }
    $('sideLeft').classList.toggle('active', S.cur === 1 && !S.over);
    $('sideRight').classList.toggle('active', S.cur === 2 && !S.over);
}

function renderHand() {
    const box = $('cardsContainer');
    box.innerHTML = '';
    const pid = S.cur;
    const myTurn = !(S.mode === 'ai' && pid === 2) && !S.over;

    S.hand[pid].forEach((cid, i) => {
        const c = CARD_BY_ID[cid];
        if (!c) return;
        const afford = S.energy[pid] >= c.cost;
        const el = document.createElement('button');
        el.className = 'card' + (afford && myTurn ? '' : ' disabled');
        el.innerHTML = `
            <span class="c-cost">${c.cost}⚡</span>
            <span class="c-name">${c.name}</span>
            <span class="c-desc">${c.desc}</span>
            <span class="c-preview">${previewOf(c)}</span>`;
        if (afford && myTurn) el.addEventListener('click', () => {
            if (S.busy) return;
            S.busy = true;
            playCard(pid, i);
            S.busy = false;
            if (S.cur === pid && !S.over) { /* 仍在自己的回合，可继续出牌 */ }
            renderHand();
        });
        box.appendChild(el);
    });

    $('handHint').textContent = S.over ? '对局结束'
        : (S.mode === 'ai' && pid === 2) ? 'AI 思考中…'
        : `你的回合 · 能量 ${S.energy[pid]}⚡ · 可连续出牌`;
}

/* 卡牌上的「这一手会把物质推到哪」提示 */
function previewOf(c) {
    const after = cellAfterCard(c);
    const myD = cellDist(after, S.goal[S.cur]);
    if (myD === 0) return `<b class="ok">→ 我的目标格！</b>`;
    const foePid = S.cur === 1 ? 2 : 1;
    if (cellDist(after, S.goal[foePid]) === 0) return `<b class="bad">→ 对手目标格！</b>`;
    return `<span class="dim">→ 距目标 ${myD} 格</span>`;
}

function renderTurnbar() {
    const who = nameOf(S.cur);
    const you = S.mode === 'ai' ? (S.cur === 1 ? '你的回合' : 'AI 回合') : `${who}回合`;
    $('turnbar').innerHTML = `第 <b>${S.turnNo}</b> 回合 · <b>${you}</b>
        <span class="logline">${S.log.length ? S.log[S.log.length - 1].txt : ''}</span>`;
}

function addLog(txt, kind) {
    S.log.push({ txt, kind });
    if (S.log.length > 60) S.log.shift();
}

let flashTimer = null;
function flashMsg(t) {
    const m = $('gameMessage');
    m.textContent = t;
    m.classList.add('show');
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => m.classList.remove('show'), 2200);
}

/* ============================================================
   设置界面
   ============================================================ */
function buildSubPicker() {
    const box = $('subPick');
    box.innerHTML = Object.entries(SUBSTANCES).map(([k, v]) =>
        `<button class="sub-btn" data-k="${k}">${v.icon} ${k}<small>${v.formula}</small></button>`).join('');
    box.querySelectorAll('.sub-btn').forEach(b => {
        b.addEventListener('click', () => {
            S.fixedSub = b.dataset.k;
            box.querySelectorAll('.sub-btn').forEach(x => x.classList.remove('on'));
            b.classList.add('on');
        });
    });
    box.querySelector('.sub-btn')?.classList.add('on');
}

function bindSetup() {
    $('foeSeg').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        S.mode = b.dataset.foe;
        [...$('foeSeg').children].forEach(x => x.classList.toggle('on', x === b));
        $('diffRow').style.display = S.mode === 'ai' ? '' : 'none';
    });
    $('diffSeg').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        S.diff = b.dataset.diff;
        [...$('diffSeg').children].forEach(x => x.classList.toggle('on', x === b));
    });
    $('subSeg').addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        S.subPickMode = b.dataset.sub;
        [...$('subSeg').children].forEach(x => x.classList.toggle('on', x === b));
        $('subPick').classList.toggle('show', S.subPickMode === 'pick');
    });
    $('btnStart').addEventListener('click', () => {
        $('setup').style.display = 'none';
        $('board').classList.add('show');
        $('hand-area') || null;
        document.querySelector('.hand-area').style.display = '';
        newGame();
    });
    $('resetGameBtn').addEventListener('click', () => {
        if (aiTimer) clearTimeout(aiTimer);
        $('over').classList.remove('show');
        newGame();
    });
    $('ovAgain').addEventListener('click', () => {
        $('over').classList.remove('show');
        newGame();
    });
    $('ovSetup').addEventListener('click', () => {
        $('over').classList.remove('show');
        if (aiTimer) clearTimeout(aiTimer);
        $('setup').style.display = '';
        $('board').classList.remove('show');
        document.querySelector('.hand-area').style.display = 'none';
    });
}

/* 结束回合按钮（点空白处或按空格） */
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !S.over && !(S.mode === 'ai' && S.cur === 2)) {
        e.preventDefault();
        endTurn();
    }
});

/* ============================================================
   启动
   ============================================================ */
function init() {
    buildSubPicker();
    bindSetup();
    $('board').classList.remove('show');
    document.querySelector('.hand-area').style.display = 'none';
    // 相图先渲染一次骨架
    renderMap();
    if (typeof initSharedMusicPlayer === 'function') initSharedMusicPlayer();

    // 测试/调试钩子
    if (/[?&]debug\b/.test(location.search)) {
        window.__ps = {
            S, CARDS, SUBSTANCES, PHASES, SOLVENTS,
            newGame: (mode, diff, subKey) => {
                if (mode) S.mode = mode;
                if (diff) S.diff = diff;
                if (subKey) { S.subPickMode = 'pick'; S.fixedSub = subKey; }
                $('setup').style.display = 'none';
                $('board').classList.add('show');
                document.querySelector('.hand-area').style.display = '';
                newGame();
            },
            play: (pid, i) => playCard(pid, i),
            endTurn: () => endTurn(),
            curCell: () => curCell(),
            cellAfter: (cardId) => cellAfterCard(CARD_BY_ID[cardId]),
            phaseOf: (t, p) => phaseOf(S.sub, t, p),
            dist: (a, b) => cellDist(a, b),
            aiStep: () => aiStep()
        };
    }
}

init();
