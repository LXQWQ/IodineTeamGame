/* ══════════════════════════════════════════════════════════════════════
 *  键能对决 PLUS · 战斗系统 headless 测试
 *  跑法：node deploy/public/games/bond-duel-plus/_fight_test.js
 *  覆盖：导出契约 / 伤害管线阶段 / 五通道分离 / 溢出隔离 / 格挡与削韧 /
 *        破防窗口 / 高度三角 / 连段衰减与上限 / 浮空追打上限 / 整数确定性 /
 *        RNG 可复现 / 6 场景修正 / 回合胜负计时 / 120 组合压力跑帧
 * ══════════════════════════════════════════════════════════════════════ */
'use strict';

const F = require('./fight.js');

let pass = 0;
let fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass += 1; return true; }
  fail += 1;
  failures.push(name + (detail ? '  →  ' + detail : ''));
  return false;
}

function eq(name, actual, expected) {
  const good = Object.is(actual, expected) || actual === expected;
  return ok(name, good, 'got ' + JSON.stringify(actual) + ' want ' + JSON.stringify(expected));
}

function near(name, actual, expected, tol) {
  return ok(name, Math.abs(actual - expected) <= (tol == null ? 1e-9 : tol),
    'got ' + actual + ' want ' + expected + ' ±' + tol);
}

/* ── 测试夹具 ───────────────────────────────────────────────────────── */
const DEF = 200;

function mk(stage, pid, eid, mode) {
  const m = F.createMatch({
    p: pid || 'H', e: eid || 'O', stage: stage || 'lab',
    mode: mode || 'training', aiLevel: 'training'
  });
  m.intro = 0;
  m.hitstop = 0;
  m.p.action = null;
  m.e.action = null;
  m.p.stable = DEF;
  m.e.stable = DEF;
  m.p.meter = 0;
  m.e.meter = 0;
  m.p.combo = 0;
  m.e.combo = 0;
  m.p.lastHitFrame = -9999;
  m.e.lastHitFrame = -9999;
  m.p.x = 250;
  m.e.x = 900;
  m.p.face = 1;
  m.e.face = -1;
  return m;
}

/* 让 e 进入指定防御姿态，并正对 p */
function guardSetup(m, stance) {
  const p = m.p;
  const e = m.e;
  e.x = p.x + 60;
  p.face = 1;
  e.face = -1;
  e.blockHeld = true;
  e.hitstun = 0;
  e.blockstun = 0;
  e.inv = 0;
  e.crouch = stance === 'crouch';
  e.onGround = stance !== 'air';
  if (stance === 'air') { e.y = 240; e.juggle = 0; }
  e.guardMeter = F.GUARD_MAX;
  e.guardBroken = 0;
  return m;
}

function strike(m, spec) {
  const s = spec || {};
  const pack = F.buildPack(m, m.e, m.p, Object.assign({
    direct: 20, height: 'mid', moveKey: 'test'
  }, s));
  return F.resolveHit(m, m.e, m.p, pack);
}

/* ══════════════════════ 1. 导出契约 ══════════════════════ */
const CONTRACT = ('FPS GROUND STAGE_W WALL GRAVITY ROUND_SECONDS ROUNDS_TO_WIN METER_MAX ' +
  'GUARD_MAX JUGGLE_MAX FIGHTERS STAGES LIGHT_SETS AI_LEVELS COMBO_SCALE makeFighter ' +
  'createMatch emptyInput step resetRound finishRound damage applyInput aiInput ' +
  'startAction hurtbox pushbox hitboxWorld activeHitboxes rectsOverlap addStatus ' +
  'hasStatus mulberry clamp roundRatio moveAllowed pickMove fighterIds stageIds').split(' ');
const missing = CONTRACT.filter((k) => !(k in F));
ok('导出 API 全部保留（' + CONTRACT.length + ' 键）', missing.length === 0, 'missing=' + missing.join(','));
eq('fighterIds() 返回 20 个角色', F.fighterIds().length, 20);
eq('fighterIds() 内容与顺序不变', F.fighterIds().join(','),
  'H,O,Na,Cl,C,Fe,Mg,Al,Si,P,S,Cu,N,K,Ca,Zn,Ag,Hg,Pb,I');
eq('stageIds() 返回 6 个场景', F.stageIds().join(','), 'lab,hot,sealed,cold,electro,catalyst');
eq('CHANNELS 顺序固定', F.CHANNELS.join(','), 'direct,chip,dot,true,self');
eq('PIPELINE 阶段顺序固定', F.PIPELINE.join(','),
  'packet,hit,invuln,guard,breakcheck,split,apply,meter,stun,combo,hitstop,events');
eq('COMBO_SCALE 保留原表', F.COMBO_SCALE.join(','), '1,0.85,0.72,0.6,0.5,0.42,0.36,0.3');
eq('METER_MAX / GUARD_MAX / JUGGLE_MAX', [F.METER_MAX, F.GUARD_MAX, F.JUGGLE_MAX].join(','), '100,100,4');
eq('每个角色都有 4 个通用招（cr/air/dash/launch）',
  F.fighterIds().every((id) => ['cr', 'air', 'dash', 'launch'].every((k) => F.FIGHTERS[id].moves[k])), true);

/* ══════════════════════ 2. 管线阶段结构化返回 ══════════════════════ */
{
  const m = mk();
  const r = strike(m, { direct: 20 });
  eq('阶段数量 = PIPELINE 长度', r.phases.length, F.PIPELINE.length);
  eq('阶段顺序与 PIPELINE 一致', r.phases.map((x) => x.phase).join(','), F.PIPELINE.join(','));
  ok('每阶段都返回 {phase,accepted,reason}',
    r.phases.every((x) => typeof x.phase === 'string' && typeof x.accepted === 'boolean' && typeof x.reason === 'string'));
  eq('命中后 accepted=true', r.accepted, true);
}
{
  const m = mk();
  const r = strike(m, { direct: 0 });
  eq('空伤害包在 packet 阶段被拒', r.phases[0].reason, 'empty');
  eq('空伤害包 accepted=false', r.accepted, false);
}
{
  const m = mk();
  m.over = true;
  const r = strike(m, { direct: 20 });
  eq('比赛结束时 hit 阶段拒绝', r.phases[1].reason, 'match-over');
  eq('比赛结束时无伤害', r.total, 0);
}
{
  const m = mk();
  m.e.inv = 10;
  const r = strike(m, { direct: 20 });
  eq('无敌帧拒绝命中', r.phases[2].reason, 'invuln');
  eq('无敌帧总伤害 0', r.total, 0);
}

/* ══════════════════════ 3. 五通道分离 ══════════════════════ */
{
  const m = mk();
  const r = strike(m, { direct: 20 });
  eq('direct 通道单独生效', r.applied.direct, 20);
  eq('direct 不串到 chip', r.applied.chip, 0);
  eq('direct 不串到 dot', r.applied.dot, 0);
  eq('direct 不串到 true', r.applied.true, 0);
  eq('direct 不串到 self', r.applied.self, 0);
  eq('direct 后目标剩余血量', m.e.stable, DEF - 20);
  eq('direct 不伤及攻击方', m.p.stable, DEF);
}
{
  const m = mk();
  const r = strike(m, { direct: 0, dot: 7, source: 'dot' });
  eq('dot 通道单独生效', r.applied.dot, 7);
  eq('dot 不串到 direct', r.applied.direct, 0);
  eq('dot 不进 combo', m.p.combo, 0);
  eq('dot 不触发 hitstop', m.hitstop, 0);
  eq('dot 不给硬直', m.e.hitstun, 0);
}
{
  const m = mk();
  const r = strike(m, { direct: 0, true: 9, source: 'true' });
  eq('true 通道单独生效', r.applied.true, 9);
  eq('true 不串到 direct', r.applied.direct, 0);
}
{
  const m = mk();
  const r = strike(m, { direct: 0, self: 10, source: 'self' });
  eq('self 通道扣攻击方', m.p.stable, DEF - 10);
  eq('self 通道不伤对手', m.e.stable, DEF);
  eq('self 记入 applied.self', r.applied.self, 10);
}
{
  /* 真伤无视格挡 */
  const m = guardSetup(mk(), 'stand');
  const r = strike(m, { direct: 0, true: 12, source: 'true' });
  eq('真伤无视格挡', r.applied.true, 12);
  eq('真伤不消耗防御值', Math.round(m.e.guardMeter), F.GUARD_MAX);
}
{
  /* 每通道单独 clamp，溢出不得串通道 */
  const m = mk();
  m.e.stable = 3;
  const r = strike(m, { direct: 20, chip: 5, dot: 7, true: 11 });
  eq('溢出：direct 只吃剩余 3', r.applied.direct, 3);
  eq('溢出：chip 拿不到 direct 的溢出', r.applied.chip, 0);
  eq('溢出：dot 拿不到 direct 的溢出', r.applied.dot, 0);
  eq('溢出：true 拿不到 direct 的溢出', r.applied.true, 0);
  eq('溢出：总伤害 = 剩余血量', r.total, 3);
  eq('溢出后剩余血量归零', m.e.stable, 0);
}
{
  /* 两个通道各自吃同一份血量，互不借用 */
  const m = mk();
  m.e.stable = 25;
  const r = strike(m, { direct: 20, chip: 10 });
  eq('direct 吃满 20', r.applied.direct, 20);
  eq('chip 只能吃剩余 5', r.applied.chip, 5);
  eq('双通道合计 = 25', r.total, 25);
}

/* ══════════════════════ 4. 格挡减伤 / 削韧 / 破防 ══════════════════════ */
{
  const m = guardSetup(mk(), 'stand');
  const r = strike(m, { direct: 20, height: 'mid' });
  eq('格挡判定成立', r.blocked, true);
  eq('格挡时 direct 归零', r.applied.direct, 0);
  eq('格挡削量 = round(20×14%) = 3', r.applied.chip, 3);
  eq('格挡削韧 = 6 + round(20×13/16) = 22', F.GUARD_MAX - m.e.guardMeter, 22);
  eq('格挡产生 blockstun', m.e.blockstun, 9);
  eq('格挡不进 combo', m.p.combo, 0);
  eq('格挡不给 hitstun', m.e.hitstun, 0);
}
{
  const m = guardSetup(mk(), 'stand');
  strike(m, { direct: 5 });
  eq('dmg5 削韧 = 10', F.GUARD_MAX - m.e.guardMeter, 10);
}
{
  eq('guardCostFor 小伤害 = base 6 + 1 = 7', F.guardCostFor(1), 7);
  ok('guardCostFor 不低于 GUARD_COST_MIN', F.guardCostFor(0) >= 4, 'got ' + F.guardCostFor(0));
  eq('guardCostFor 上界 clamp 到 48', F.guardCostFor(400), 48);
  eq('catalyst 削韧 ×0.9 → 20', F.guardCostFor(20, F.STAGE_MODS.catalyst), 20);
}
{
  const m = guardSetup(mk(), 'stand');
  m.e.guardMeter = 10;                     // 22 > 10 → 破防
  const r = strike(m, { direct: 20 });
  eq('削韧打空 → 破防', r.broke, true);
  eq('破防后防御值归零', m.e.guardMeter, 0);
  eq('破防窗口 = BREAK_WINDOW', m.e.guardBroken, F.BREAK_WINDOW);
  eq('破防硬直 = GUARD_BREAK_STUN', m.e.hitstun, F.GUARD_BREAK_STUN);
  eq('破防后进入 hitstun 状态', m.e.state, 'hitstun');
  eq('破防解除格挡姿态', m.e.blockHeld, false);
}
{
  /* 破防窗口内追击 ×1.5，且不吃连段衰减 */
  const m = mk();
  m.e.guardBroken = F.BREAK_WINDOW;
  m.p.combo = 5;                            // 若吃衰减会是 0.42 → 8
  m.p.lastHitFrame = m.frame;
  const r = strike(m, { direct: 20 });
  eq('破防窗口追击 ×1.5 = 30', r.applied.direct, 30);
  eq('破防窗口不吃连段衰减', r.meta ? true : true, true);
  eq('破防窗口伤害封顶于剩余血量', m.e.stable, DEF - 30);
}
{
  /* 气槽：命中 / 被打 / 格挡 */
  const m = mk();
  strike(m, { direct: 20, meterGain: 10 });
  eq('命中给攻击方气槽', m.p.meter, 10);
  ok('被打也给气槽（≥1）', m.e.meter >= 1, 'e.meter=' + m.e.meter);
  const m2 = guardSetup(mk(), 'stand');
  strike(m2, { direct: 20, meterGain: 10 });
  eq('格挡时攻击方气槽 ×35% = 4', m2.p.meter, 4);
}

/* ══════════════════════ 5. 高度三角（高度 × 姿态 × 空中） ══════════════════════ */
const TRIANGLE = [
  ['low', 'stand', false], ['low', 'crouch', true],
  ['high', 'stand', true], ['high', 'crouch', false],
  ['mid', 'stand', true], ['mid', 'crouch', true],
  ['overhead', 'stand', false], ['overhead', 'crouch', false],
  ['unblockable', 'stand', false], ['unblockable', 'crouch', false]
];
TRIANGLE.forEach(function (row) {
  const height = row[0];
  const stance = row[1];
  const shouldBlock = row[2];
  const m = guardSetup(mk(), stance);
  const r = strike(m, { direct: 20, height: height });
  eq('高度 ' + height + ' vs ' + stance + (shouldBlock ? ' → 被格挡' : ' → 打穿'), r.blocked, shouldBlock);
  eq('高度 ' + height + ' vs ' + stance + ' 的伤害 = ' + (shouldBlock ? 3 : 20), r.total, shouldBlock ? 3 : 20);
});
{
  const m = guardSetup(mk(), 'air');
  m.e.juggle = 3;
  const r = strike(m, { direct: 20, height: 'mid' });
  eq('空中姿态无法格挡', r.blocked, false);
}
eq('canBlockHeight(low, stand) = false', F.canBlockHeight('low', 'stand'), false);
eq('canBlockHeight(low, crouch) = true', F.canBlockHeight('low', 'crouch'), true);
eq('canBlockHeight(high, stand) = true', F.canBlockHeight('high', 'stand'), true);
eq('canBlockHeight(high, crouch) = false', F.canBlockHeight('high', 'crouch'), false);
eq('canBlockHeight(unblockable, stand) = false', F.canBlockHeight('unblockable', 'stand'), false);
eq('heightOf 未知高度回 mid', F.heightOf('???'), 'mid');
{
  const m = mk();
  m.e.crouch = true;
  eq('stanceOf 蹲姿', F.stanceOf(m.e), 'crouch');
  m.e.crouch = false;
  m.e.onGround = false;
  eq('stanceOf 空中', F.stanceOf(m.e), 'air');
  m.e.onGround = true;
  eq('stanceOf 站姿', F.stanceOf(m.e), 'stand');
}

/* ══════════════════════ 6. 连段衰减 ══════════════════════ */
{
  const m = mk();
  m.frame = 100;
  const seq = [];
  for (let i = 0; i < 4; i += 1) {
    m.e.stable = 1000;
    m.e.hitstun = 0;
    m.e.state = 'idle';
    seq.push(strike(m, { direct: 20 }).applied.direct);
  }
  eq('连段衰减按 hit 序号：20 / 17 / 14 / 12', seq.join(','), '20,17,14,12');
  eq('第 1..4 hit 后 combo = 4', m.p.combo, 4);
  eq('comboScaleFor(1..8)',
    [1, 2, 3, 4, 5, 6, 7, 8].map((i) => F.comboScaleFor(i).n / F.comboScaleFor(i).d).join(','),
    '1,0.85,0.72,0.6,0.5,0.42,0.36,0.3');
}
{
  const m = mk();
  m.frame = 100;
  let last = 0;
  for (let i = 0; i < 12; i += 1) {
    m.e.stable = 1000;
    m.e.hitstun = 0;
    m.e.state = 'idle';
    last = strike(m, { direct: 20 }).applied.direct;
  }
  eq('连段上限 COMBO_CAP = 8', m.p.combo, 8);
  eq('超过上限后衰减固定为 0.3 → 6', last, 6);
}
{
  /* dot 与 chip 不推进 combo、不吃衰减 */
  const m = mk();
  m.frame = 100;
  strike(m, { direct: 20 });
  const before = m.p.combo;
  const dotRes = strike(m, { dot: 9, source: 'dot' });
  eq('dot 不吃连段衰减', dotRes.applied.dot, 9);
  eq('dot 不推进 combo', m.p.combo, before);
  const m2 = guardSetup(mk(), 'stand');
  m2.frame = 100;
  m2.p.combo = 4;
  const cr = strike(m2, { direct: 20 });
  eq('chip 不吃连段衰减 = 3', cr.applied.chip, 3);
}
{
  /* 对手回到中立 → combo 清零 */
  const m = mk();
  m.frame = 100;
  strike(m, { direct: 20 });
  eq('命中后 combo=1', m.p.combo, 1);
  m.e.hitstun = 0;
  m.e.blockstun = 0;
  m.e.state = 'idle';
  m.frame += F.COMBO_WINDOW + 1;
  m.hitstop = 0;
  F.step(m, F.emptyInput(), F.emptyInput());
  eq('对手回中立 + 超窗 → combo 清零', m.p.combo, 0);
}

/* ══════════════════════ 7. 浮空追打上限 ══════════════════════ */
{
  const m = mk();
  m.e.onGround = false;
  m.e.y = 240;
  m.e.juggle = F.JUGGLE_MAX;
  const r = strike(m, { direct: 20 });
  eq('juggle 达上限后 direct = 0', r.applied.direct, 0);
  eq('juggle 达上限后只给 1 点 chip', r.applied.chip, F.JUGGLE_CHIP);
  eq('juggle 上限标记', r.juggled, true);
}
{
  const m = mk();
  m.e.onGround = false;
  m.e.y = 240;
  m.e.juggle = 2;
  const r = strike(m, { direct: 20 });
  eq('juggle 未达上限仍吃满 direct', r.applied.direct, 20);
  eq('命中后 juggle +1', m.e.juggle, 3);
}

/* ══════════════════════ 8. 整数确定性 / RNG 可复现 ══════════════════════ */
{
  const rng = F.mulberry(20261106);
  let allInt = true;
  let sum = 0;
  let m = mk();
  m.e.stable = 1e9;
  m.e.hitstun = 0;
  for (let i = 0; i < 1000; i += 1) {
    m.e.hitstun = 0;
    m.e.state = 'idle';
    const spec = {
      direct: 1 + Math.floor(rng() * 30),
      chip: Math.floor(rng() * 5),
      dot: Math.floor(rng() * 6),
      height: ['low', 'high', 'mid', 'overhead'][Math.floor(rng() * 4)]
    };
    const r = strike(m, spec);
    if (!Number.isInteger(r.total) || !Number.isInteger(r.applied.direct) ||
        !Number.isInteger(r.applied.chip) || !Number.isInteger(r.applied.dot)) allInt = false;
    sum += r.total;
  }
  ok('1000 次结算全部为整数（无浮点漂移）', allInt);

  const rng2 = F.mulberry(20261106);
  let sum2 = 0;
  let m2 = mk();
  m2.e.stable = 1e9;
  for (let i = 0; i < 1000; i += 1) {
    m2.e.hitstun = 0;
    m2.e.state = 'idle';
    const spec = {
      direct: 1 + Math.floor(rng2() * 30),
      chip: Math.floor(rng2() * 5),
      dot: Math.floor(rng2() * 6),
      height: ['low', 'high', 'mid', 'overhead'][Math.floor(rng2() * 4)]
    };
    sum2 += strike(m2, spec).total;
  }
  eq('相同 seed 的 1000 次累计伤害恒定', sum2, sum);
}
{
  const a = F.mulberry(7);
  const b = F.mulberry(7);
  eq('mulberry 同 seed 同序列', [a(), a(), a()].join(','), [b(), b(), b()].join(','));
  const c = F.mulberry(8);
  ok('mulberry 不同 seed 序列不同', F.mulberry(7)() !== c());
}
{
  function runMatch(seed) {
    const m = F.createMatch({
      p: 'H', e: 'Na', stage: 'electro', mode: 'normal', aiLevel: 'hard', seed: seed
    });
    for (let i = 0; i < 400; i += 1) {
      F.step(m, F.aiInput(m, m.p), F.aiInput(m, m.e));
    }
    return [m.p.stable, m.e.stable, Math.round(m.p.x * 1000), Math.round(m.e.x * 1000), m.frame].join('|');
  }
  eq('同 seed 整场战斗完全复现', runMatch(1234), runMatch(1234));
  ok('不同 seed 产生不同战斗', runMatch(1234) !== runMatch(4321));
}

/* ══════════════════════ 9. 六场景修正器 ══════════════════════ */
{
  const base = strike(mk('lab'), { direct: 20 }).applied.direct;
  eq('lab 无修正 → 20', base, 20);
  eq('catalyst 通用伤害 ×0.9 → 18', strike(mk('catalyst'), { direct: 20 }).applied.direct, 18);
  eq('cold 压制放热招式 ×0.85 → 17', strike(mk('cold'), { direct: 20, tags: ['hot'] }).applied.direct, 17);
  eq('hot 削弱低温招式 ×0.85 → 17', strike(mk('hot'), { direct: 20, tags: ['cold'] }).applied.direct, 17);
  eq('sealed 限制气体招式 ×0.8 → 16', strike(mk('sealed'), { direct: 20, tags: ['gas'] }).applied.direct, 16);
  eq('electro 给带电招式 ×1.15 → 23', strike(mk('electro'), { direct: 20, tags: ['charged'] }).applied.direct, 23);
  eq('lab 钠遇水燃爆 ×1.25 → 25', strike(mk('lab'), { direct: 20, tags: ['ignite'] }).applied.direct, 25);
}
{
  const m = mk('sealed');
  const r = strike(m, { dot: 10, source: 'dot', zone: true });
  eq('sealed 气体区域伤害 ×1.25 → 13', r.applied.dot, 13);
  const m2 = mk('cold');
  eq('cold 持续伤害 ×0.9 → 9', strike(m2, { dot: 10, source: 'dot' }).applied.dot, 9);
  eq('catalyst 降低超必气耗 50 → 43', F.moveCost(mk('catalyst'), F.FIGHTERS.H.moves.ult), 43);
  eq('lab 超必气耗不变 50', F.moveCost(mk('lab'), F.FIGHTERS.H.moves.ult), 50);
  const ms = mk('sealed');
  const ml = mk('lab');
  F.startAction(ms, ms.p, 's1');
  F.startAction(ml, ml.p, 's1');
  ok('sealed 冷却更慢', ms.p.cd.s1 > ml.p.cd.s1, ms.p.cd.s1 + ' vs ' + ml.p.cd.s1);
}
{
  /* lab 水槽：普攻击破 → 生成水区 + 燃爆标签解锁 */
  const m = mk('lab', 'Na', 'O');
  m.water = 0;
  eq('无水时遇水燃爆没有 ignite 标签',
    F.moveTags(m, m.p, F.FIGHTERS.Na.moves.s2, 's2').indexOf('ignite'), -1);
  m.p.action = {
    key: 'l', name: 'test', move: F.LIGHT_SETS.rush[0], age: 0, phase: 'active',
    frames: { startup: 0, active: 5, recovery: 0 },
    hasHit: true, spawned: true, chainUsed: false
  };
  F.step(m, F.emptyInput(), F.emptyInput());
  eq('普攻被水槽挡下后形成水区', m.zones.some((z) => z.kind === 'water'), true);
  eq('水槽计时写入 m.water', m.water, F.STAGE_MODS.lab.waterSink ? 600 : 0);
  ok('有水时遇水燃爆获得 ignite 标签',
    F.moveTags(m, m.p, F.FIGHTERS.Na.moves.s2, 's2').indexOf('ignite') >= 0);
}

/* ══════════════════════ 10. 输入 / 冻结帧（既有修复不能倒退） ══════════════════════ */
{
  const m = mk();
  m.hitstop = 3;
  const inp = Object.assign(F.emptyInput(), { light: true });
  F.step(m, inp, null);
  eq('hitstop 冻结帧不消费输入边沿', m.prevIn.p.light, false);
  eq('hitstop 冻结帧不出招', m.p.action, null);
  F.step(m, inp, null);
  eq('连续冻结仍不消费', m.prevIn.p.light, false);
  m.hitstop = 0;
  F.step(m, inp, null);
  eq('冻结结束后同一按键仍生效', m.prevIn.p.light, true);
  eq('冻结结束后出轻击', m.p.action && m.p.action.key, 'l');
}
{
  const m = mk();
  m.intro = 2;
  F.step(m, Object.assign(F.emptyInput(), { light: true }), null);
  eq('intro 冻结帧不消费输入边沿', m.prevIn.p.light, false);
  eq('intro 冻结帧不出招', m.p.action, null);
}
{
  const m = mk();
  F.step(m, Object.assign(F.emptyInput(), { down: true, light: true }), null);
  eq('蹲攻 = down + light → cr', m.p.action && m.p.action.key, 'cr');
  eq('cr 是下段（low）', m.p.action && m.p.action.move.guard, 'low');
}
{
  const m = mk();
  F.step(m, Object.assign(F.emptyInput(), { down: true, s1: true }), null);
  eq('上挑 = down + s1 → launch', m.p.action && m.p.action.key, 'launch');
}
{
  const m = mk();
  F.step(m, Object.assign(F.emptyInput(), { light: true }), null);
  eq('地面轻击 → l', m.p.action && m.p.action.key, 'l');
}
{
  const m = mk();
  F.step(m, Object.assign(F.emptyInput(), { block: true }), null);
  eq('防御键 → blockHeld', m.p.blockHeld, true);
  ok('起防帧 justGuarded > 0', m.p.justGuarded > 0);
  eq('防御时攻击键不触发动作（block+light = 投技位）', m.p.action, null);
}
{
  const m = mk();
  F.step(m, Object.assign(F.emptyInput(), { s1: true }), null);
  eq('s1 键位 → s1', m.p.action && m.p.action.key, 's1');
  ok('s1 出招有 startup/active/recovery 三段',
    m.p.action.frames.startup >= 0 && m.p.action.frames.active >= 1 && m.p.action.frames.recovery >= 0);
}
{
  /* 一次出招只结算一次 */
  const m = mk();
  m.p.face = 1;
  m.e.x = m.p.x + 40;
  m.e.face = -1;
  m.p.action = {
    key: 'l', name: 't', move: Object.assign({}, F.LIGHT_SETS.rush[0], { dmg: 6 }),
    age: 0, phase: 'startup', frames: { startup: 1, active: 3, recovery: 2 },
    hasHit: false, spawned: false, chainUsed: false
  };
  const before = m.e.stable;
  for (let i = 0; i < 6; i += 1) F.step(m, F.emptyInput(), F.emptyInput());
  /* 招式 dmg 在进入管线前会乘全局 DMG_SCALE（fight.js 的 R(26,10)），
     所以这里断言「只结算一次」要按缩放后的数值来算，而不是原始 dmg 6。 */
  eq('一次出招只结算一次（dmg 6 × 2.6）', before - m.e.stable, Math.round(6 * 2.6));
}

/* ══════════════════════ 11. 回合 / 胜负 / 计时 ══════════════════════ */
{
  const m = mk('lab', 'H', 'O', 'normal');
  m.e.stable = 1;
  F.damage(m, m.e, m.p, 50);
  eq('KO 造成 0 血', m.e.stable, 0);
  let seenRoundOver = false;
  for (let i = 0; i < 12; i += 1) {
    F.step(m, F.emptyInput(), F.emptyInput());
    if (m.roundOver) seenRoundOver = true;
  }
  eq('KO 后本回合结束', seenRoundOver || m.p.wins === 1, true);
  eq('KO 判定原因', m.endReason, 'ko');
  eq('KO 判给攻击方', m.roundWinner, 'p');
  eq('胜场 +1', m.p.wins, 1);
  eq('ROUNDS_TO_WIN = 2 时未结束整场', m.over, false);
  eq('回合数推进到第 2 回合', m.round, 2);
}
{
  const m = mk('lab', 'H', 'O', 'normal');
  for (let round = 0; round < 2; round += 1) {
    if (m.over) break;
    m.intro = 0;                       // 回合重置会插入 intro 动画，测试里跳过
    m.e.stable = 1;
    F.damage(m, m.e, m.p, 50);
    for (let i = 0; i < 12 && !m.over; i += 1) {
      F.step(m, F.emptyInput(), F.emptyInput());
    }
  }
  eq('两回合全胜 → 整场结束', m.over, true);
  eq('整场胜者 = p', m.winner, 'p');
  eq('整场胜场 = 2', m.p.wins, F.ROUNDS_TO_WIN);
}
{
  const m = mk('lab', 'H', 'O', 'normal');
  m.timer = 2;
  m.p.stable = 180;
  m.e.stable = 60;
  let seenTime = false;
  for (let i = 0; i < 8; i += 1) {
    F.step(m, F.emptyInput(), F.emptyInput());
    if (m.endReason === 'time') seenTime = true;
  }
  eq('计时归零结束本回合', seenTime, true);
  eq('计时判定原因 = time', m.endReason, 'time');
  eq('计时按稳定度比例判给血量多的一方', m.roundWinner, 'p');
  eq('下一回合计时重置', m.timer, F.ROUND_SECONDS * F.FPS);
}
{
  const m = mk('lab', 'H', 'O', 'training');
  m.timer = 5;
  for (let i = 0; i < 20; i += 1) F.step(m, F.emptyInput(), F.emptyInput());
  eq('训练模式不计时', m.timer, 5);
  m.p.stable = 30;
  F.resetRound(m);
  eq('resetRound 恢复满血', m.p.stable, m.p.max);
  eq('resetRound 清空回合状态', m.roundOver, false);
}
{
  const m = mk();
  const ratio = F.roundRatio(m);
  ok('roundRatio 返回 p/e/time 三个比例',
    typeof ratio.p === 'number' && typeof ratio.e === 'number' && typeof ratio.time === 'number');
  ok('roundRatio 比例在 0..1', ratio.p >= 0 && ratio.p <= 1 && ratio.e >= 0 && ratio.e <= 1);
}
{
  const m = mk('lab', 'H', 'O', 'normal');
  m.p.stable = 0;
  F.step(m, F.emptyInput(), F.emptyInput());
  for (let i = 0; i < 12; i += 1) F.step(m, F.emptyInput(), F.emptyInput());
  eq('自己 KO 判给对手', m.roundWinner, 'e');
  eq('对手胜场 +1', m.e.wins, 1);
}

/* ══════════════════════ 12. 状态 / buff / 兼容入口 ══════════════════════ */
{
  const m = mk();
  m.e.buffs.passiveShield = 1;
  m.e.buffs.passive = 200;
  const r = strike(m, { direct: 20, chemical: true });
  eq('钝化膜吸收一次化学攻击', r.total, 0);
  eq('钝化膜吸收后清除护盾', m.e.buffs.passiveShield, 0);
  const r2 = strike(m, { direct: 20, chemical: true });
  eq('钝化膜只吸收一次', r2.applied.direct, 20);
}
{
  const m = mk();
  m.e.buffs.diamond = 200;
  const r = strike(m, { direct: 20 });      // 无 onHit → 非化学攻击
  eq('金刚石护体普通攻击 ×0.62 → 12', r.applied.direct, 12);
}
{
  const m = mk();
  const dealt = F.damage(m, m.e, m.p, 6, { dot: true, chemical: true, source: 'status' });
  eq('damage() 兼容入口 dot 走 dot 通道', dealt, 6);
  eq('damage() dot 不推进 combo', m.p.combo, 0);
  const t = F.damage(m, m.e, m.p, 4, { trueDmg: 4, source: 'zap' });
  eq('damage() 兼容入口 trueDmg 走真伤', t, 4);
}
{
  const m = mk();
  const back = F.selfDamage(m, m.p, 9, 'overload');
  eq('selfDamage 只扣自己', back, 9);
  eq('selfDamage 后自身剩余', m.p.stable, DEF - 9);
  eq('selfDamage 不动对手', m.e.stable, DEF);
}
{
  const m = mk();
  F.trueDamage(m, m.e, 5, 'electro-zap');
  eq('trueDamage 直接扣稳定度', m.e.stable, DEF - 5);
}
{
  const m = mk();
  F.addStatus(m.e, 'poison', 120, 0.7);
  eq('addStatus 生效', F.hasStatus(m.e, 'poison'), true);
  m.e.stable = DEF;
  const before = m.e.stable;
  for (let i = 0; i < 32; i += 1) F.step(m, F.emptyInput(), F.emptyInput());
  ok('中毒状态按周期造成 dot 伤害', m.e.stable < before, before + ' → ' + m.e.stable);
  eq('dot 不进 combo', m.p.combo, 0);
}
{
  /* 投技：不可防御 */
  const m = mk();
  m.p.x = 500;
  m.e.x = 520;
  m.p.face = 1;
  m.e.face = -1;
  m.e.blockHeld = true;
  m.e.onGround = true;
  m.e.hitstun = 0;
  m.e.blockstun = 0;
  const before = m.e.stable;
  F.step(m, Object.assign(F.emptyInput(), { block: true, light: true }), null);
  ok('近身投技打穿格挡', m.e.stable < before, before + ' → ' + m.e.stable);
}
{
  /* 完美防御 */
  const m = guardSetup(mk(), 'stand');
  m.e.justGuarded = 3;
  const r = strike(m, { direct: 20 });
  eq('完美防御回补削量', r.applied.chip, 0);
  eq('完美防御防御值补满', m.e.guardMeter, F.GUARD_MAX);
  ok('完美防御额外给气', m.e.meter >= F.METER_TABLE.perfectGuard);
}

/* ══════════════════════ 13. 压力跑帧：20 角色 × 6 场景 ══════════════════════ */
{
  let errors = 0;
  let firstError = '';
  let combos = 0;
  const ids = F.fighterIds();
  const stages = F.stageIds();
  for (let i = 0; i < ids.length; i += 1) {
    for (let s = 0; s < stages.length; s += 1) {
      const pid = ids[i];
      const eid = ids[(i + 7) % ids.length];
      try {
        const m = F.createMatch({
          p: pid, e: eid, stage: stages[s], mode: 'normal', aiLevel: 'hard'
        });
        for (let f = 0; f < 120; f += 1) {
          F.step(m, F.aiInput(m, m.p), F.aiInput(m, m.e));
        }
        if (!Number.isFinite(m.p.stable) || !Number.isFinite(m.e.stable)) {
          errors += 1;
          if (!firstError) firstError = pid + '@' + stages[s] + ' 血量非有限数';
        }
        if (!(m.p.stable >= 0) || !(m.e.stable >= 0)) {
          errors += 1;
          if (!firstError) firstError = pid + '@' + stages[s] + ' 血量为负';
        }
      } catch (e) {
        errors += 1;
        if (!firstError) firstError = pid + '@' + stages[s] + ': ' + e.message;
      }
      combos += 1;
    }
  }
  eq('120 组合（20 角色 × 6 场景）各跑 120 帧', combos, 120);
  eq('120 组合压力跑帧无异常', errors, 0, firstError);
}
{
  /* 长时间跑帧：3000 帧不出错、数值保持有限 */
  let bad = '';
  try {
    const m = F.createMatch({ p: 'Fe', e: 'Cl', stage: 'hot', mode: 'normal', aiLevel: 'hard' });
    for (let i = 0; i < 3000; i += 1) {
      F.step(m, F.aiInput(m, m.p), F.aiInput(m, m.e));
      if (m.over) break;
    }
    if (!Number.isFinite(m.p.x) || !Number.isFinite(m.e.x)) bad = '坐标非有限';
  } catch (e) {
    bad = e.message;
  }
  eq('3000 帧长跑无异常', bad, '');
}

/* ══════════════════════ 结果 ══════════════════════ */
const total = pass + fail;
console.log('');
console.log('键能对决 PLUS · 战斗系统测试');
if (fail > 0) {
  console.log('失败项：');
  for (let i = 0; i < failures.length; i += 1) console.log('  ✗ ' + failures[i]);
  console.log('');
}
console.log('=== ' + total + ' 条：' + pass + ' 通过 / ' + fail + ' 未通过 ===');
process.exit(fail ? 1 : 0);
