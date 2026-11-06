/* 键能对决 PLUS · 战斗内核
 * 纯逻辑，无 DOM、无渲染、无副作用 → 浏览器（window.Fight）与 Node（module.exports）双用。
 * 坐标系：x/y 为角色左上角，y 向下为正；地面线由 match.ground 给出。
 * 帧率：固定 60fps，一次 step = 1 帧。
 */
(function (root) {
  'use strict';

  /* ─────────────────────────── 常量 ─────────────────────────── */
  const FPS = 60;
  const GROUND = 510;
  const STAGE_W = 1100;          // 逻辑舞台宽度
  const WALL = 24;               // 左右墙厚
  const GRAVITY = 0.78;
  const ROUND_SECONDS = 60;
  const ROUNDS_TO_WIN = 2;       // 三局两胜
  const METER_MAX = 100;
  const GUARD_MAX = 100;         // 防御值，归零破防
  const GUARD_REGEN = 0.22;      // 每帧自然回复
  const GUARD_CHIP = 26;         // 每次格挡消耗
  const JUGGLE_MAX = 4;          // 单次浮空最多被追打次数
  const COMBO_SCALE = [1, 0.85, 0.72, 0.6, 0.5, 0.42, 0.36, 0.3];
  const COMBO_CAP = 8;             // 连段计数硬上限（超出不再累加，避免多段招/持续压制刷出几十 hit）

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sign = v => (v >= 0 ? 1 : -1);

  function mulberry(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ─────────────────────────── 招式帧数据 ───────────────────────────
   * startup  起手帧：无判定
   * active   持续帧：开判定框
   * recovery 收招帧：可被惩罚
   * hitbox   相对角色左上角的判定框（face 翻转）
   * guard    high 站防可防·蹲防不可 / low 蹲防可防·站防不可 / mid 通防 / unblockable 不可防
   * cancelInto 命中后可取消进的招式
   */
  function mv(o) {
    return {
      name: o.name || '', cost: o.cost || 0,
      startup: o.startup | 0, active: Math.max(1, o.active | 0), recovery: o.recovery | 0,
      hitbox: o.hitbox || null,
      dmg: o.dmg || 0,
      hitstun: o.hitstun == null ? 14 : o.hitstun,
      blockstun: o.blockstun == null ? 9 : o.blockstun,
      hitstop: o.hitstop == null ? 5 : o.hitstop,
      kb: o.kb || { x: 3, y: 0 },
      guard: o.guard || 'mid',
      juggle: o.juggle || 0,
      meterGain: o.meterGain == null ? 6 : o.meterGain,
      meterCost: o.meterCost || 0,
      cancelInto: o.cancelInto || [],
      inv: o.inv || null,          // [起,止] 无敌帧窗口（相对 action.age）
      dash: o.dash || null,        // { vx, frames }
      spawn: o.spawn || null,      // { at, type:'proj'|'zone', ... }
      onHit: o.onHit || null,      // 'burn' | 'precip' | 'poison' | 'corrosion' | 'blind'
      selfDmg: o.selfDmg || 0,
      air: !!o.air,
      log: o.log || '',
      note: o.note || '',
      /* 以下为角色专属字段，必须原样透传（早期版本漏掉会导致 noHot/reagent/buff 全部失效） */
      buff: o.buff || null,
      reagent: o.reagent || null,
      noHot: !!o.noHot,
      require: o.require || null,
      drain: o.drain || 0,            // 命中后按伤害比例回复自身稳定度（汞齐化 / 原电池）
      markScale: o.markScale || 0,    // 目标带「标记」时，每层额外增伤比例
      noKb: !!o.noKb                  // 命中不产生击退（铅室压制）
    };
  }

  /* 轻攻击三连：按流派给不同帧数据（速攻快而轻、重装慢而重） */
  const LIGHT_SETS = {
    rush: [ // 速攻
      mv({ name: '连击 · 一', startup: 3, active: 2, recovery: 7, dmg: 5, hitbox: { x: 30, y: 40, w: 46, h: 40 }, hitstun: 12, blockstun: 7, hitstop: 3, kb: { x: 1.6 }, meterGain: 4 }),
      mv({ name: '连击 · 二', startup: 3, active: 2, recovery: 8, dmg: 5, hitbox: { x: 32, y: 30, w: 48, h: 48 }, hitstun: 13, blockstun: 8, hitstop: 3, kb: { x: 1.9 }, meterGain: 4, cancelInto: ['l3', 's1', 's2'] }),
      mv({ name: '连击 · 三', startup: 5, active: 3, recovery: 13, dmg: 9, hitbox: { x: 34, y: 24, w: 52, h: 58 }, hitstun: 18, blockstun: 11, hitstop: 5, kb: { x: 4.2, y: -2 }, meterGain: 7, guard: 'mid', juggle: 1 })
    ],
    pressure: [ // 压制
      mv({ name: '分子冲击 · 一', startup: 4, active: 2, recovery: 8, dmg: 5, hitbox: { x: 34, y: 42, w: 52, h: 38 }, hitstun: 12, blockstun: 8, hitstop: 3, kb: { x: 1.6 }, meterGain: 4 }),
      mv({ name: '分子冲击 · 二', startup: 4, active: 2, recovery: 9, dmg: 6, hitbox: { x: 36, y: 34, w: 54, h: 46 }, hitstun: 13, blockstun: 8, hitstop: 3, kb: { x: 2.0 }, meterGain: 4, cancelInto: ['l3', 's1', 's2'] }),
      mv({ name: '分子冲击 · 三', startup: 6, active: 3, recovery: 14, dmg: 10, hitbox: { x: 38, y: 26, w: 60, h: 62 }, hitstun: 18, blockstun: 11, hitstop: 5, kb: { x: 4.4, y: -2.2 }, meterGain: 7, juggle: 1 })
    ],
    burst: [ // 爆发
      mv({ name: '撞击 · 一', startup: 4, active: 2, recovery: 9, dmg: 6, hitbox: { x: 32, y: 40, w: 50, h: 42 }, hitstun: 12, blockstun: 8, hitstop: 4, kb: { x: 1.8 }, meterGain: 4 }),
      mv({ name: '撞击 · 二', startup: 4, active: 2, recovery: 10, dmg: 6, hitbox: { x: 34, y: 32, w: 52, h: 50 }, hitstun: 13, blockstun: 8, hitstop: 4, kb: { x: 2.2 }, meterGain: 4, cancelInto: ['l3', 's1', 's2'] }),
      mv({ name: '撞击 · 三', startup: 7, active: 3, recovery: 16, dmg: 11, hitbox: { x: 36, y: 22, w: 58, h: 66 }, hitstun: 20, blockstun: 12, hitstop: 6, kb: { x: 5.2, y: -2.6 }, meterGain: 8, juggle: 1 })
    ],
    control: [ // 控制
      mv({ name: '腐蚀触 · 一', startup: 5, active: 2, recovery: 9, dmg: 4, hitbox: { x: 36, y: 44, w: 54, h: 36 }, hitstun: 12, blockstun: 8, hitstop: 3, kb: { x: 1.4 }, meterGain: 5 }),
      mv({ name: '腐蚀触 · 二', startup: 5, active: 2, recovery: 10, dmg: 5, hitbox: { x: 38, y: 36, w: 56, h: 44 }, hitstun: 13, blockstun: 8, hitstop: 3, kb: { x: 1.8 }, meterGain: 5, cancelInto: ['l3', 's1', 's2'] }),
      mv({ name: '腐蚀触 · 三', startup: 8, active: 3, recovery: 15, dmg: 9, hitbox: { x: 40, y: 28, w: 62, h: 56 }, hitstun: 18, blockstun: 11, hitstop: 5, kb: { x: 3.8, y: -1.8 }, meterGain: 8, juggle: 1 })
    ],
    shift: [ // 变换
      mv({ name: '相变 · 一', startup: 4, active: 2, recovery: 9, dmg: 5, hitbox: { x: 30, y: 40, w: 48, h: 42 }, hitstun: 12, blockstun: 8, hitstop: 3, kb: { x: 1.6 }, meterGain: 5 }),
      mv({ name: '相变 · 二', startup: 4, active: 2, recovery: 10, dmg: 6, hitbox: { x: 32, y: 32, w: 52, h: 50 }, hitstun: 13, blockstun: 8, hitstop: 4, kb: { x: 2.0 }, meterGain: 5, cancelInto: ['l3', 's1', 's2'] }),
      mv({ name: '相变 · 三', startup: 7, active: 3, recovery: 15, dmg: 10, hitbox: { x: 34, y: 24, w: 58, h: 62 }, hitstun: 19, blockstun: 12, hitstop: 5, kb: { x: 4.6, y: -2.4 }, meterGain: 8, juggle: 1 })
    ],
    heavy: [ // 重装
      mv({ name: '重击 · 一', startup: 6, active: 3, recovery: 12, dmg: 8, hitbox: { x: 34, y: 38, w: 54, h: 46 }, hitstun: 14, blockstun: 10, hitstop: 4, kb: { x: 2.2 }, meterGain: 5, guard: 'mid' }),
      mv({ name: '重击 · 二', startup: 7, active: 3, recovery: 13, dmg: 9, hitbox: { x: 36, y: 32, w: 56, h: 54 }, hitstun: 15, blockstun: 10, hitstop: 5, kb: { x: 2.6 }, meterGain: 5, cancelInto: ['l3', 's1', 's2'], guard: 'mid' }),
      mv({ name: '重击 · 三', startup: 10, active: 4, recovery: 19, dmg: 14, hitbox: { x: 38, y: 20, w: 64, h: 70 }, hitstun: 22, blockstun: 14, hitstop: 7, kb: { x: 6.0, y: -3.0 }, meterGain: 9, juggle: 1, guard: 'mid' })
    ]
  };

  /* ─────────────────────────── 12 位角色 ─────────────────────────── */
  const FIGHTERS = {
    H: {
      name: '氢', sym: 'H', type: '速攻', archetype: 'rush',
      max: 900, speed: 6.5, jump: 16, w: 68, h: 142, style: '轻量 / 突进',
      formula: 'H₂', role: '轻量 / 突进', tip: '先突进，再爆鸣。终式需贴近，并承担反冲。',
      desc: 'H₂ 轻快突进，靠近后引发燃爆。',
      moves: {
        s1: mv({ name: '扩散突袭', cost: 20, startup: 5, active: 6, recovery: 12, dmg: 12, hitbox: { x: 26, y: 34, w: 62, h: 48 }, hitstun: 16, blockstun: 10, hitstop: 4, kb: { x: 3.6 }, meterGain: 8, inv: [0, 16], dash: { vx: 13, frames: 14 }, guard: 'mid', note: '位移技；起手有无敌帧' }),
        s2: mv({ name: '爆鸣冲击', cost: 34, startup: 9, active: 3, recovery: 20, dmg: 26, hitbox: { x: 30, y: 20, w: 118, h: 86 }, hitstun: 22, blockstun: 13, hitstop: 7, kb: { x: 6.4, y: -3.2 }, meterGain: 10, guard: 'mid', juggle: 2, log: '点火装置：2H₂ + O₂ → 2H₂O', note: '近距离爆发，判定范围大' }),
        ult: mv({ name: '氢氧燃爆', cost: 80, meterCost: 50, startup: 14, active: 6, recovery: 30, dmg: 42, hitbox: { x: 10, y: -6, w: 200, h: 150 }, hitstun: 30, blockstun: 16, hitstop: 9, kb: { x: 9, y: -4 }, meterGain: 0, guard: 'mid', juggle: 3, selfDmg: 10, log: '氢氧燃烧，释放化学能；本招不涉及核聚变。', note: '超必杀，近距离爆发也伤及自身' })
      }
    },
    O: {
      name: '氧', sym: 'O', type: '压制', archetype: 'pressure',
      max: 1050, speed: 5.2, jump: 14.5, w: 70, h: 144, style: '气态 / 压制',
      formula: 'O₂', role: '气态 / 压制', tip: '在助燃区内压制距离，用氧化飞弹积累优势。',
      desc: '支持燃烧，本身不可燃；擅长持续氧化。',
      moves: {
        s1: mv({ name: '助燃领域', cost: 26, startup: 10, active: 2, recovery: 16, dmg: 0, hitbox: null, meterGain: 8, spawn: { at: 10, type: 'zone', kind: 'oxygen', dur: 330, w: 310, h: 220, ox: -155, oy: -220, dmg: 0 }, log: '区域氧供增加：区域内燃烧类攻击增强。' }),
        s2: mv({ name: '氧化侵蚀', cost: 34, startup: 11, active: 2, recovery: 18, dmg: 0, hitbox: null, meterGain: 9, spawn: { at: 11, type: 'proj', proj: 'oxygen', spd: 9, dmg: 20, r: 14, opt: { oxidation: true, chemical: true } }, note: '氧化飞弹，命中叠加氧化' }),
        ult: mv({ name: '臭氧重铸', cost: 78, meterCost: 50, startup: 16, active: 2, recovery: 26, dmg: 0, hitbox: null, meterGain: 0, spawn: { at: 16, type: 'zone', kind: 'ozone', dur: 300, w: 460, h: 240, ox: -230, oy: -240, dmg: 5, continuous: true, opt: { oxidation: true, chemical: true } }, log: '放电装置供能：3O₂ → 2O₃。' })
      }
    },
    Na: {
      name: '钠', sym: 'Na', type: '爆发', archetype: 'burst',
      max: 820, speed: 5.8, jump: 15, w: 72, h: 140, style: '金属 / 爆发',
      formula: 'Na', role: '金属 / 爆发', tip: '普攻击破中央水槽。站进水区，再发动燃爆。',
      desc: '碱金属；遇水剧烈反应，爆发高、防御低。',
      moves: {
        s1: mv({ name: '碎钠抛射', cost: 18, startup: 7, active: 2, recovery: 14, dmg: 0, hitbox: null, meterGain: 7, spawn: { at: 7, type: 'proj', proj: 'na', spd: 10, dmg: 16, r: 12, opt: { chemical: true } }, note: '飞射物，命中附着' }),
        s2: mv({ name: '遇水燃爆', cost: 30, startup: 12, active: 5, recovery: 22, dmg: 34, hitbox: { x: 16, y: 24, w: 150, h: 130 }, hitstun: 24, blockstun: 14, hitstop: 8, kb: { x: 7.2, y: -3.4 }, meterGain: 10, selfDmg: 9, guard: 'mid', juggle: 2, require: 'water', log: '2Na + 2H₂O → 2NaOH + H₂↑；放热，可能伴随燃烧。' }),
        ult: mv({ name: '焰色闪光', cost: 70, meterCost: 50, startup: 12, active: 2, recovery: 24, dmg: 0, hitbox: null, meterGain: 0, spawn: { at: 12, type: 'zone', kind: 'sodiumGlow', dur: 210, w: 600, h: 280, ox: -300, oy: -280, dmg: 0, onEnter: 'blind' }, log: 'Na发射黄光：视觉干扰，不额外施加爆炸伤害。' })
      }
    },
    Cl: {
      name: '氯', sym: 'Cl', type: '控制', archetype: 'control',
      max: 930, speed: 4.9, jump: 14, w: 70, h: 142, style: '气态 / 控场',
      formula: 'Cl₂', role: '气态 / 控场', tip: '用气体封路。水样与银盐试剂有使用次数。',
      desc: '黄绿色气体；强氧化、远程腐蚀与区域控制。',
      moves: {
        s1: mv({ name: '氯气瘴域', cost: 24, startup: 9, active: 3, recovery: 16, dmg: 16, hitbox: { x: 30, y: 26, w: 96, h: 108 }, hitstun: 18, blockstun: 11, hitstop: 5, kb: { x: 2.8 }, meterGain: 8, spawn: { at: 9, type: 'zone', kind: 'chlorine', dur: 250, w: 240, h: 195, ox: 20, oy: -195, dmg: 3, continuous: true, opt: { corrosive: true, chemical: true } }, log: 'Cl₂ 为有毒黄绿色气体；密闭空间更易积累。' }),
        s2: mv({ name: '次氯漂白', cost: 36, startup: 10, active: 2, recovery: 16, dmg: 0, hitbox: null, meterGain: 9, reagent: 'water', spawn: { at: 10, type: 'proj', proj: 'hclo', spd: 7, dmg: 22, r: 16, opt: { oxidation: true, chemical: true } }, log: '消耗水样：Cl₂ + H₂O ⇌ HCl + HClO。' }),
        ult: mv({ name: '银氯沉降', cost: 72, meterCost: 50, startup: 12, active: 2, recovery: 22, dmg: 0, hitbox: null, meterGain: 0, reagent: 'silver', spawn: { at: 12, type: 'zone', kind: 'agcl', dur: 210, w: 160, h: 70, oy: -65, atTarget: true, dmg: 0, onEnter: 'precip' }, log: '外加Ag⁺与Cl⁻水溶液：Ag⁺ + Cl⁻ → AgCl↓。' })
      }
    },
    C: {
      name: '碳', sym: 'C', type: '变换', archetype: 'shift',
      max: 1100, speed: 5, jump: 14, w: 72, h: 144, style: '材料 / 变换',
      formula: 'C', role: '材料 / 变换', tip: '护甲抗物理，滑移换位置。密闭低氧改变终式。',
      desc: '同素异形体切换；根据氧供改变燃烧路径。',
      moves: {
        s1: mv({ name: '金刚石护甲', cost: 24, startup: 6, active: 1, recovery: 12, dmg: 0, hitbox: null, meterGain: 6, buff: { diamond: 250 }, log: '金刚石材料护甲：提升物理防御，不抵抗所有化学攻击。' }),
        s2: mv({ name: '石墨滑移', cost: 24, startup: 5, active: 1, recovery: 12, dmg: 0, hitbox: null, meterGain: 6, inv: [0, 18], dash: { vx: 15, frames: 13 }, buff: { graphite: 210 }, log: '切换石墨材料模块；不是常温下瞬间改变同素异形体。' }),
        ult: mv({ name: '燃烧分岔', cost: 74, meterCost: 50, startup: 13, active: 4, recovery: 24, dmg: 40, hitbox: { x: 16, y: 18, w: 150, h: 140 }, hitstun: 26, blockstun: 15, hitstop: 8, kb: { x: 7.6, y: -3.6 }, meterGain: 0, guard: 'mid', juggle: 2, log: '氧充足 → CO₂；氧不足 → CO 比例上升。' })
      }
    },
    Fe: {
      name: '铁', sym: 'Fe', type: '重装', archetype: 'heavy',
      max: 1300, speed: 4.2, jump: 12.7, w: 76, h: 148, style: '金属 / 重装',
      formula: 'Fe', role: '金属 / 重装', tip: '重拳范围更大、收招更慢。先防御，再反击。',
      desc: '高稳定重装；可钝化，并在 Fe²⁺/Fe³⁺ 红氧体系间切换。',
      moves: {
        s1: mv({ name: '钝化护盾', cost: 28, startup: 8, active: 1, recovery: 12, dmg: 0, hitbox: null, meterGain: 6, reagent: 'acid', buff: { passive: 260, passiveShield: 1 }, noHot: true, log: '携带冷浓硝酸试剂：表面钝化，消耗一次试剂。' }),
        s2: mv({ name: '二价三价转化', cost: 30, startup: 7, active: 2, recovery: 14, dmg: 0, hitbox: null, meterGain: 7, reagent: 'redox', spawn: { at: 7, type: 'proj', proj: 'fe3', spd: 7, dmg: 18, r: 13, opt: { oxidation: true, chemical: true } }, log: 'Fe²⁺ / Fe³⁺ 为离子模块，不能与铁单质混同。' }),
        ult: mv({ name: '铁氧熔蚀', cost: 76, meterCost: 50, startup: 15, active: 5, recovery: 28, dmg: 46, hitbox: { x: 14, y: 12, w: 180, h: 150 }, hitstun: 28, blockstun: 16, hitstop: 9, kb: { x: 8.2, y: -3.8 }, meterGain: 0, guard: 'mid', juggle: 3, selfDmg: 10, log: '点火与氧供：3Fe + 2O₂ → Fe₃O₄（本场景代表式）。' })
      }
    },

    /* ── 新增 6 位 ── */
    Mg: {
      name: '镁', sym: 'Mg', type: '灼烧', archetype: 'burst',
      max: 900, speed: 5.5, jump: 14.8, w: 70, h: 142, style: '活泼金属 / 眩光',
      formula: 'Mg', role: '金属 / 灼烧', tip: '白光一闪，灼烧累加；别在对手气槽满硬拼。',
      desc: '燃烧时发出耀眼白光，氧化放热极强。',
      moves: {
        s1: mv({ name: '镁带切入', cost: 20, startup: 6, active: 3, recovery: 13, dmg: 14, hitbox: { x: 28, y: 30, w: 70, h: 56 }, hitstun: 16, blockstun: 10, hitstop: 4, kb: { x: 3.2 }, meterGain: 8, dash: { vx: 12, frames: 10 }, guard: 'mid' }),
        s2: mv({ name: '白光灼痕', cost: 32, startup: 10, active: 3, recovery: 18, dmg: 20, hitbox: { x: 24, y: 24, w: 104, h: 96 }, hitstun: 20, blockstun: 12, hitstop: 6, kb: { x: 4.4, y: -2 }, meterGain: 9, guard: 'mid', onHit: 'burn', log: '2Mg + O₂ → 2MgO，放出强光与高热。' }),
        ult: mv({ name: '闪光燃烧', cost: 74, meterCost: 50, startup: 13, active: 5, recovery: 26, dmg: 40, hitbox: { x: 12, y: 8, w: 186, h: 156 }, hitstun: 28, blockstun: 15, hitstop: 8, kb: { x: 8, y: -3.4 }, meterGain: 0, guard: 'mid', juggle: 2, log: '强光会短暂致盲；伤害来自氧化放热。' })
      }
    },
    Al: {
      name: '铝', sym: 'Al', type: '壁垒', archetype: 'heavy',
      max: 1200, speed: 4.6, jump: 13, w: 74, h: 146, style: '两性金属 / 壁垒',
      formula: 'Al', role: '金属 / 壁垒', tip: '氧化膜挡住一次破防；两性金属对酸碱都不怕。',
      desc: '表面致密氧化膜，抗腐蚀；遇强碱强酸也会溶解。',
      moves: {
        s1: mv({ name: '氧化膜', cost: 22, startup: 7, active: 1, recovery: 13, dmg: 0, hitbox: null, meterGain: 6, buff: { passive: 300, passiveShield: 1 }, log: '4Al + 3O₂ → 2Al₂O₃，致密氧化膜隔绝腐蚀。' }),
        s2: mv({ name: '两性溶解', cost: 32, startup: 9, active: 3, recovery: 17, dmg: 22, hitbox: { x: 30, y: 26, w: 92, h: 100 }, hitstun: 20, blockstun: 12, hitstop: 6, kb: { x: 4, y: -1.8 }, meterGain: 9, guard: 'unblockable', log: 'Al₂O₃ 既能溶于强酸也能溶于强碱 —— 不可防御。' }),
        ult: mv({ name: '铝热反应', cost: 78, meterCost: 50, startup: 16, active: 5, recovery: 28, dmg: 46, hitbox: { x: 10, y: 6, w: 200, h: 160 }, hitstun: 30, blockstun: 16, hitstop: 9, kb: { x: 8.6, y: -4 }, meterGain: 0, guard: 'mid', juggle: 3, log: '2Al + Fe₂O₃ → Al₂O₃ + 2Fe，温度可达 2500 ℃。' })
      }
    },
    Si: {
      name: '硅', sym: 'Si', type: '蓄能', archetype: 'shift',
      max: 1000, speed: 5.0, jump: 14.2, w: 71, h: 144, style: '半导体 / 蓄能',
      formula: 'Si', role: '半导体 / 蓄能', tip: '命中攒气翻倍；气槽满了再打一套。',
      desc: '半导体材料；能量积累更快，爆发靠气槽。',
      moves: {
        s1: mv({ name: '晶格护壁', cost: 24, startup: 8, active: 1, recovery: 14, dmg: 0, hitbox: null, meterGain: 12, buff: { passive: 240, passiveShield: 1 }, log: '金刚石型晶格：结构稳定，抗一次化学侵蚀。' }),
        s2: mv({ name: '空穴注入', cost: 28, startup: 8, active: 3, recovery: 15, dmg: 18, hitbox: { x: 30, y: 36, w: 88, h: 66 }, hitstun: 18, blockstun: 11, hitstop: 5, kb: { x: 3 }, meterGain: 16, guard: 'mid', log: '掺杂改变载流子浓度 —— 气槽收益翻倍。' }),
        ult: mv({ name: '光电跃迁', cost: 76, meterCost: 50, startup: 14, active: 5, recovery: 26, dmg: 42, hitbox: { x: 12, y: 10, w: 190, h: 152 }, hitstun: 28, blockstun: 15, hitstop: 8, kb: { x: 8, y: -3.6 }, meterGain: 0, guard: 'mid', juggle: 2, log: '光子能量超过禁带宽度 → 电子跃迁，光电流涌现。' })
      }
    },
    P: {
      name: '磷', sym: 'P', type: '自燃', archetype: 'control',
      max: 880, speed: 5.6, jump: 14.6, w: 70, h: 142, style: '白磷 / 自燃',
      formula: 'P₄', role: '非金属 / 自燃', tip: '白磷在空气中自燃；贴身就点着，别拖。',
      desc: '白磷常温自燃，红磷需点燃；毒性另计。',
      moves: {
        s1: mv({ name: '白磷附着', cost: 18, startup: 6, active: 3, recovery: 12, dmg: 12, hitbox: { x: 30, y: 34, w: 66, h: 62 }, hitstun: 15, blockstun: 9, hitstop: 4, kb: { x: 2.6 }, meterGain: 7, guard: 'mid', onHit: 'burn', log: 'P₄ + 5O₂ → P₄O₁₀，白磷在空气中自燃。' }),
        s2: mv({ name: '磷化氢雾', cost: 30, startup: 10, active: 2, recovery: 17, dmg: 0, hitbox: null, meterGain: 8, spawn: { at: 10, type: 'zone', kind: 'phosphine', dur: 240, w: 230, h: 180, ox: 16, oy: -180, dmg: 4, continuous: true, onEnter: 'poison', opt: { chemical: true } }, log: 'PH₃ 剧毒且可自燃；区域内持续伤害。' }),
        ult: mv({ name: '白磷火海', cost: 72, meterCost: 50, startup: 13, active: 6, recovery: 26, dmg: 42, hitbox: { x: 8, y: 10, w: 210, h: 158 }, hitstun: 28, blockstun: 15, hitstop: 8, kb: { x: 7.6, y: -3.2 }, meterGain: 0, guard: 'mid', juggle: 2, onHit: 'burn', log: '白磷火海：燃烧不依赖外部点火源。' })
      }
    },
    S: {
      name: '硫', sym: 'S', type: '减速', archetype: 'control',
      max: 960, speed: 5.1, jump: 14.1, w: 70, h: 143, style: '硫化物 / 减速',
      formula: 'S', role: '非金属 / 减速', tip: '硫化氢拖慢对手；慢下来的对手最好打。',
      desc: '硫与硫化物；沉淀与毒性拖慢节奏。',
      moves: {
        s1: mv({ name: '硫粉喷洒', cost: 18, startup: 7, active: 3, recovery: 13, dmg: 12, hitbox: { x: 30, y: 36, w: 70, h: 56 }, hitstun: 15, blockstun: 9, hitstop: 4, kb: { x: 2.6 }, meterGain: 7, guard: 'mid', onHit: 'precip', log: 'S 与金属生成硫化物沉淀，降低机动。' }),
        s2: mv({ name: '硫化氢雾', cost: 30, startup: 10, active: 2, recovery: 18, dmg: 0, hitbox: null, meterGain: 8, spawn: { at: 10, type: 'zone', kind: 'h2s', dur: 260, w: 250, h: 190, ox: 18, oy: -190, dmg: 4, continuous: true, onEnter: 'precip', opt: { chemical: true } }, log: 'H₂S 有毒，且与金属离子生成硫化物沉淀。' }),
        ult: mv({ name: '硫酸雾蚀', cost: 74, meterCost: 50, startup: 14, active: 5, recovery: 26, dmg: 40, hitbox: { x: 10, y: 10, w: 200, h: 150 }, hitstun: 28, blockstun: 15, hitstop: 8, kb: { x: 7.4, y: -3 }, meterGain: 0, guard: 'mid', juggle: 2, onHit: 'corrosion', log: 'SO₃ + H₂O → H₂SO₄，强腐蚀。' })
      }
    },
    Cu: {
      name: '铜', sym: 'Cu', type: '连锁', archetype: 'pressure',
      max: 1050, speed: 5.3, jump: 14.4, w: 72, h: 145, style: '导电 / 连锁',
      formula: 'Cu', role: '金属 / 导电', tip: '导电连锁会跳一次；两个目标重叠时最赚。',
      desc: '良导体；电流可越过一次传导。',
      moves: {
        s1: mv({ name: '铜丝抽击', cost: 20, startup: 6, active: 3, recovery: 13, dmg: 15, hitbox: { x: 32, y: 32, w: 84, h: 62 }, hitstun: 16, blockstun: 10, hitstop: 4, kb: { x: 3 }, meterGain: 8, guard: 'mid' }),
        s2: mv({ name: '导电连锁', cost: 30, startup: 9, active: 2, recovery: 16, dmg: 0, hitbox: null, meterGain: 9, spawn: { at: 9, type: 'proj', proj: 'cu', spd: 11, dmg: 18, r: 12, opt: { chemical: true }, chain: true }, log: '铜是良导体：电流沿导路传递，可越过一次。' }),
        ult: mv({ name: '电解洪流', cost: 74, meterCost: 50, startup: 14, active: 5, recovery: 26, dmg: 43, hitbox: { x: 10, y: 8, w: 196, h: 156 }, hitstun: 28, blockstun: 15, hitstop: 8, kb: { x: 7.8, y: -3.4 }, meterGain: 0, guard: 'mid', juggle: 2, log: '2CuSO₄ + 2H₂O →(电解) 2Cu + O₂↑ + 2H₂SO₄。' })
      }
    },

    /* ── 新增 8 位（PLUS 版扩充） ───────────────────────────── */

    N: {
      name: '氮', sym: 'N', type: '压制', archetype: 'pressure',
      max: 1020, speed: 5.4, jump: 15, w: 70, h: 143,
      style: '惰性 / 低温', formula: 'N₂', role: '非金属 / 低温',
      tip: '液氮铺地拖慢对手；氮封让你吃化学攻击不心疼。',
      desc: 'N₂ 极度惰性 —— 它不参与反应，只负责把战场降温。',
      noBurn: true,
      moves: {
        s1: mv({ name: '液氮喷流', cost: 26, startup: 9, active: 3, recovery: 16, dmg: 6,
          hitbox: { x: 28, y: 30, w: 110, h: 100 }, hitstun: 16, blockstun: 10, hitstop: 5,
          kb: { x: 2.4 }, meterGain: 8, guard: 'mid',
          spawn: { at: 9, type: 'zone', kind: 'ln2', dur: 280, w: 260, h: 200, ox: 16, oy: -200, dmg: 3, continuous: true, onEnter: 'freeze' },
          log: '液氮 −196 ℃：区域内持续冻伤，且被冻者受击更疼、机动更慢。' }),
        s2: mv({ name: '氮封保护', cost: 24, startup: 7, active: 1, recovery: 12, dmg: 0, hitbox: null,
          meterGain: 7, buff: { passive: 280, passiveShield: 1 },
          log: '惰性氮气覆盖：挡下一次化学侵蚀。' }),
        ult: mv({ name: '低温脆裂', cost: 76, meterCost: 50, startup: 14, active: 5, recovery: 26, dmg: 40,
          hitbox: { x: 12, y: 10, w: 190, h: 154 }, hitstun: 28, blockstun: 15, hitstop: 8,
          kb: { x: 8, y: -3.4 }, meterGain: 0, guard: 'mid', juggle: 2, onHit: 'freeze',
          log: '材料在低温下变脆：冲击更易致裂，命中后附加冻伤。' })
      }
    },

    K: {
      name: '钾', sym: 'K', type: '爆发', archetype: 'burst',
      max: 760, speed: 6.0, jump: 15.4, w: 70, h: 141,
      style: '碱金属 / 爆燃', formula: 'K', role: '金属 / 爆燃',
      tip: '比钠更烈，也比钠更脆；水区里一次就能翻盘。',
      desc: '钾比钠更活泼，遇水反应剧烈到会自燃，代价是本体更脆弱。',
      moves: {
        s1: mv({ name: '钾片投掷', cost: 18, startup: 6, active: 2, recovery: 14, dmg: 0, hitbox: null, meterGain: 7,
          spawn: { at: 6, type: 'proj', proj: 'k', spd: 11, dmg: 18, r: 13, opt: { chemical: true } },
          note: '飞射物，命中附着' }),
        s2: mv({ name: '水上爆燃', cost: 30, startup: 11, active: 6, recovery: 24, dmg: 40,
          hitbox: { x: 14, y: 20, w: 170, h: 140 }, hitstun: 26, blockstun: 15, hitstop: 9,
          kb: { x: 8.4, y: -4 }, meterGain: 11, selfDmg: 14, guard: 'mid', juggle: 3, require: 'water',
          log: '2K + 2H₂O → 2KOH + H₂↑：比钠更剧烈，常伴随爆燃，自身也受反噬。' }),
        ult: mv({ name: '紫色焰光', cost: 70, meterCost: 50, startup: 12, active: 2, recovery: 24, dmg: 0, hitbox: null, meterGain: 0,
          spawn: { at: 12, type: 'zone', kind: 'kGlow', dur: 230, w: 600, h: 280, ox: -300, oy: -280, dmg: 6, continuous: true, onEnter: 'blind' },
          log: '钾的焰色反应呈紫色：强光致盲，同时区域灼伤。' })
      }
    },

    Ca: {
      name: '钙', sym: 'Ca', type: '堡垒', archetype: 'heavy',
      max: 1400, speed: 3.9, jump: 12.2, w: 78, h: 150,
      style: '碱土 / 堡垒', formula: 'Ca', role: '金属 / 堡垒',
      tip: '全场最厚稳定度；先立墙，再用石灰水反打。',
      desc: '碱土金属：骨骼、贝壳与石灰岩的骨架，护盾最厚、脚步最慢。',
      moves: {
        s1: mv({ name: '石灰岩壁', cost: 26, startup: 9, active: 1, recovery: 13, dmg: 0, hitbox: null, meterGain: 6,
          buff: { passive: 340, passiveShield: 1, armor: 200 },
          log: 'CaCO₃ 沉积层：抗一次化学侵蚀，并短暂霸体。' }),
        s2: mv({ name: '石灰水沉淀', cost: 30, startup: 10, active: 4, recovery: 18, dmg: 20,
          hitbox: { x: 26, y: 40, w: 104, h: 78 }, hitstun: 20, blockstun: 12, hitstop: 6,
          kb: { x: 3.4 }, meterGain: 9, guard: 'low', onHit: 'precip',
          log: 'Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O：低段命中，沉淀拖慢对手。' }),
        ult: mv({ name: '钙焰长明', cost: 78, meterCost: 50, startup: 16, active: 5, recovery: 28, dmg: 44,
          hitbox: { x: 10, y: 8, w: 204, h: 160 }, hitstun: 30, blockstun: 16, hitstop: 9,
          kb: { x: 8.8, y: -3.8 }, meterGain: 0, guard: 'mid', juggle: 3,
          log: '钙的焰色反应呈砖红色：大范围压制。' })
      }
    },

    Zn: {
      name: '锌', sym: 'Zn', type: '牺牲', archetype: 'shift',
      max: 1120, speed: 4.9, jump: 13.6, w: 74, h: 146,
      style: '两性 / 牺牲阳极', formula: 'Zn', role: '金属 / 牺牲阳极',
      tip: '镀层替你挨刀；护盾在手时尽管压上去换血。',
      desc: '比铁活泼的金属：牺牲自己保护他人 —— 这正是镀锌防腐的原理。',
      moves: {
        s1: mv({ name: '镀锌层', cost: 22, startup: 6, active: 1, recovery: 12, dmg: 0, hitbox: null, meterGain: 6,
          buff: { sacrifice: 90, armor: 150 },
          log: '热镀锌：锌层优先被腐蚀，替基体先挨伤害。' }),
        s2: mv({ name: '原电池放电', cost: 32, startup: 9, active: 2, recovery: 16, dmg: 0, hitbox: null, meterGain: 10,
          spawn: { at: 9, type: 'proj', proj: 'zn', spd: 9, dmg: 22, r: 14, opt: { chemical: true, oxidation: true } },
          drain: 0.5, log: 'Zn-Cu 原电池：电子定向流动，伤害的一部分回补自身。' }),
        ult: mv({ name: '牺牲阳极', cost: 76, meterCost: 50, startup: 15, active: 5, recovery: 27, dmg: 42,
          hitbox: { x: 12, y: 10, w: 192, h: 156 }, hitstun: 28, blockstun: 15, hitstop: 8,
          kb: { x: 8, y: -3.4 }, meterGain: 0, guard: 'mid', juggle: 2, selfDmg: 8, drain: 0.6,
          log: '牺牲阳极法：锌主动失去电子保护基体 —— 以自身为代价换回血线。' })
      }
    },

    Ag: {
      name: '银', sym: 'Ag', type: '催化', archetype: 'pressure',
      max: 980, speed: 5.7, jump: 14.8, w: 70, h: 143,
      style: '贵金属 / 催化', formula: 'Ag', role: '金属 / 催化',
      tip: '先叠标记，再用终式引爆；层数越高越狠。',
      desc: '催化剂的典型：自身不被消耗，却让反应一轮比一轮快。',
      moves: {
        s1: mv({ name: '银镜析出', cost: 20, startup: 6, active: 3, recovery: 13, dmg: 14,
          hitbox: { x: 30, y: 36, w: 72, h: 58 }, hitstun: 16, blockstun: 10, hitstop: 4,
          kb: { x: 2.8 }, meterGain: 8, guard: 'mid', onHit: 'mark',
          log: '银镜反应：Ag⁺ 被还原成银，标记附着在目标表面。' }),
        s2: mv({ name: '硝酸银刻蚀', cost: 32, startup: 10, active: 2, recovery: 16, dmg: 0, hitbox: null, meterGain: 9, reagent: 'silver',
          spawn: { at: 10, type: 'proj', proj: 'agno3', spd: 10, dmg: 20, r: 14, opt: { chemical: true, corrosive: true } },
          log: 'AgNO₃ 具腐蚀性：蛋白质变性、创面染黑。' }),
        ult: mv({ name: '催化爆发', cost: 74, meterCost: 50, startup: 13, active: 5, recovery: 26, dmg: 34,
          hitbox: { x: 12, y: 10, w: 188, h: 154 }, hitstun: 28, blockstun: 15, hitstop: 8,
          kb: { x: 8, y: -3.4 }, meterGain: 0, guard: 'mid', juggle: 2, markScale: 0.35,
          log: '催化循环：每层标记让反应速率上一阶 —— 层数越多，终式越重。' })
      }
    },

    Hg: {
      name: '汞', sym: 'Hg', type: '流控', archetype: 'control',
      max: 900, speed: 5.0, jump: 13.2, w: 70, h: 138,
      style: '液态金属 / 中毒', formula: 'Hg', role: '金属 / 液态',
      tip: '滑移躲开重招，用汞蒸气慢慢磨；汞齐化还能抽走对手血线。',
      desc: '常温下唯一的液态金属：会流动、有毒，也能与其他金属形成汞齐。',
      moves: {
        s1: mv({ name: '汞滴滑移', cost: 20, startup: 5, active: 1, recovery: 12, dmg: 0, hitbox: null, meterGain: 6,
          inv: [0, 20], dash: { vx: 14, frames: 14 }, buff: { graphite: 200 },
          log: '液态流动：本招无敌位移，并短暂加速。' }),
        s2: mv({ name: '汞蒸气', cost: 32, startup: 10, active: 2, recovery: 17, dmg: 0, hitbox: null, meterGain: 9,
          spawn: { at: 10, type: 'zone', kind: 'hgvap', dur: 250, w: 240, h: 190, ox: 18, oy: -190, dmg: 4, continuous: true, onEnter: 'poison', opt: { chemical: true } },
          log: '汞蒸气吸入即中毒：区域内持续掉血。' }),
        ult: mv({ name: '汞齐化', cost: 74, meterCost: 50, startup: 14, active: 5, recovery: 26, dmg: 38,
          hitbox: { x: 12, y: 10, w: 186, h: 152 }, hitstun: 28, blockstun: 15, hitstop: 8,
          kb: { x: 7.4, y: -3 }, meterGain: 0, guard: 'mid', juggle: 2, drain: 0.85,
          log: '汞与多数金属形成汞齐：夺取对方骨架，大量转化为自身稳定度。' })
      }
    },

    Pb: {
      name: '铅', sym: 'Pb', type: '霸体', archetype: 'heavy',
      max: 1450, speed: 3.4, jump: 11.6, w: 80, h: 152,
      style: '重金属 / 屏蔽', formula: 'Pb', role: '金属 / 屏蔽',
      tip: '铅板一立，谁都推不动你；用慢速重锤换血。',
      desc: '密度大、能屏蔽辐射：整套阵容里最硬的一堵墙。',
      moves: {
        s1: mv({ name: '铅板护体', cost: 24, startup: 8, active: 1, recovery: 14, dmg: 0, hitbox: null, meterGain: 6,
          buff: { armor: 260, passive: 200, passiveShield: 1 },
          log: '铅板致密：击退被大幅削弱，并挡下一次化学侵蚀。' }),
        s2: mv({ name: '铅锤下压', cost: 32, startup: 12, active: 4, recovery: 20, dmg: 26,
          hitbox: { x: 20, y: 16, w: 120, h: 120 }, hitstun: 24, blockstun: 14, hitstop: 8,
          kb: { x: 5.2, y: -2 }, meterGain: 10, guard: 'mid', juggle: 1,
          log: '高密度锤击：伤害不算最高，但几乎打不退人。' }),
        ult: mv({ name: '铅室压制', cost: 80, meterCost: 50, startup: 17, active: 5, recovery: 30, dmg: 46,
          hitbox: { x: 8, y: 6, w: 210, h: 164 }, hitstun: 32, blockstun: 17, hitstop: 10,
          kb: { x: 7, y: -3 }, meterGain: 0, guard: 'mid', juggle: 2, noKb: true,
          log: '铅室屏蔽：以密度换压制，命中后对手被钉在原地。' })
      }
    },

    I: {
      name: '碘', sym: 'I', type: '标记', archetype: 'control',
      max: 940, speed: 5.5, jump: 14.6, w: 70, h: 142,
      style: '卤素 / 升华', formula: 'I₂', role: '非金属 / 升华',
      tip: '蒸气里叠标记，遇淀粉显蓝色；层数越高终式越痛。',
      desc: '紫黑色固体，受热易升华；遇淀粉显深蓝是它的招牌检验。',
      moves: {
        s1: mv({ name: '碘蒸气', cost: 26, startup: 9, active: 3, recovery: 16, dmg: 5,
          hitbox: { x: 28, y: 30, w: 104, h: 96 }, hitstun: 16, blockstun: 10, hitstop: 5,
          kb: { x: 2.4 }, meterGain: 8, guard: 'mid',
          spawn: { at: 9, type: 'zone', kind: 'i2', dur: 270, w: 250, h: 200, ox: 16, oy: -200, dmg: 3, continuous: true, onEnter: 'mark', opt: { chemical: true } },
          log: 'I₂ 易升华：紫烟滞留，接触即留下标记。' }),
        s2: mv({ name: '淀粉显色', cost: 28, startup: 8, active: 3, recovery: 15, dmg: 16,
          hitbox: { x: 30, y: 34, w: 88, h: 66 }, hitstun: 18, blockstun: 11, hitstop: 5,
          kb: { x: 3 }, meterGain: 9, guard: 'mid', onHit: 'mark',
          log: 'I₂ + 淀粉 → 深蓝色：再叠一层标记，为终式蓄势。' }),
        ult: mv({ name: '升华爆雾', cost: 72, meterCost: 50, startup: 13, active: 6, recovery: 26, dmg: 30,
          hitbox: { x: 10, y: 8, w: 196, h: 158 }, hitstun: 28, blockstun: 15, hitstop: 8,
          kb: { x: 7.6, y: -3.2 }, meterGain: 0, guard: 'mid', juggle: 2, markScale: 0.5,
          log: '受热急剧升华：标记层数直接转化为冲击强度。' })
      }
    }
  };

  /* ─────────── 标准动作库：每位角色再加 4 招（蹲攻 / 跳攻 / 冲刺攻击 / 上挑） ─────────── */
  // 说明：这 4 招由「定位 × 元素」派生，全部走同一套判定与取消规则，
  //       名字与注释按元素定制；与 s1/s2/ult 一起构成每位角色 10 个招式动作。
  const EXTRA_NAMES = {
    H: ['氢焰低扫', '浮空爆燃', '疾冲燃点', '上挑燃弧'],
    O: ['助燃下扫', '氧化俯冲', '助燃突进', '氧气上涌'],
    Na: ['钠焰低扫', '熔滴坠落', '钠火冲刺', '焰光上挑'],
    Cl: ['氯气低喷', '毒雾下压', '氯化突刺', '氯气上挑'],
    C: ['石墨低扫', '晶格砸击', '碳链突进', '石墨上撩'],
    Fe: ['铁壁低撞', '铁拳重砸', '铁壁撞击', '铁肩上挑'],
    Mg: ['镁光低扫', '白焰坠落', '镁光冲刺', '白光上挑'],
    Al: ['铝刃低削', '铝片俯冲', '铝刃突刺', '铝刃上撩'],
    Si: ['晶格低扫', '硅片坠落', '硅晶突进', '晶格上挑'],
    P: ['磷火低扫', '磷光坠击', '磷火冲刺', '磷火上挑'],
    S: ['硫纹低扫', '硫雾下压', '硫磺突进', '硫焰上挑'],
    Cu: ['铜绿低扫', '铜球坠落', '铜绿突进', '铜球上挑'],
    N: ['霜刃低扫', '液氮俯冲', '霜冻突进', '霜刃上挑'],
    K: ['钾焰低扫', '钾火坠击', '钾焰冲刺', '钾焰上挑'],
    Ca: ['石灰低撞', '岩块坠落', '岩壁突进', '岩壁上顶'],
    Zn: ['锌刃低削', '锌片俯冲', '镀锌突进', '锌刃上挑'],
    Ag: ['银刃低割', '银镜俯冲', '银光突刺', '银刃上挑'],
    Hg: ['汞滴低扫', '汞珠坠击', '汞流滑进', '汞滴上挑'],
    Pb: ['铅块低撞', '铅锤坠击', '铅体重撞', '铅锤上挑'],
    I: ['碘雾低扫', '碘晶坠落', '碘雾突进', '碘晶上挑']
  };
  const EXTRA_TUNE = {
    rush: { cr: [5, 4, 10, 11], air: [4, 6, 8, 15], dash: [3, 5, 13, 14], launch: [7, 4, 15, 9] },
    pressure: { cr: [5, 4, 10, 12], air: [4, 6, 8, 16], dash: [3, 5, 13, 15], launch: [7, 4, 15, 10] },
    burst: { cr: [5, 4, 11, 13], air: [4, 7, 9, 17], dash: [3, 5, 14, 16], launch: [7, 4, 16, 10] },
    control: { cr: [5, 4, 10, 10], air: [4, 6, 8, 14], dash: [3, 5, 13, 13], launch: [7, 4, 15, 9] },
    shift: { cr: [5, 4, 10, 12], air: [4, 6, 8, 15], dash: [3, 5, 13, 15], launch: [7, 4, 15, 10] },
    heavy: { cr: [7, 4, 13, 16], air: [5, 6, 10, 19], dash: [4, 5, 15, 17], launch: [8, 4, 17, 12] }
  };
  Object.keys(FIGHTERS).forEach((id) => {
    const d = FIGHTERS[id];
    const nm = EXTRA_NAMES[id] || ['下段扫', '空中击', '冲刺撞', '上挑'];
    const t = EXTRA_TUNE[d.archetype] || EXTRA_TUNE.rush;

    // ① 蹲攻击：低段，只能蹲防
    d.moves.cr = mv({
      name: nm[0], cost: 0, startup: t.cr[0], active: t.cr[1], recovery: t.cr[2], dmg: t.cr[3],
      hitbox: { x: 4, y: 86, w: 100, h: 46 }, guard: 'low',
      hitstun: 15, blockstun: 8, hitstop: 4, kb: { x: 2.4, y: 0 }, meterGain: 4,
      note: '下段扫击 · 只能蹲防',
      log: nm[0] + '：低段扫击，站防挡不住，须蹲防。'
    });

    // ② 跳跃攻击：空中中段，只能站防
    d.moves.air = mv({
      name: nm[1], cost: 0, startup: t.air[0], active: t.air[1], recovery: t.air[2], dmg: t.air[3],
      hitbox: { x: 2, y: 30, w: 104, h: 64 }, guard: 'high',
      hitstun: 16, blockstun: 9, hitstop: 5, kb: { x: 3.0, y: 0 }, meterGain: 5, air: true,
      note: '空中中段 · 只能站防',
      log: nm[1] + '：空中中段，蹲防挡不住。'
    });

    // ③ 冲刺攻击：突进位移，命中后可续接上挑
    d.moves.dash = mv({
      name: nm[2], cost: 0, startup: t.dash[0], active: t.dash[1], recovery: t.dash[2], dmg: t.dash[3],
      hitbox: { x: 10, y: 34, w: 104, h: 66 }, guard: 'mid',
      hitstun: 17, blockstun: 10, hitstop: 5, kb: { x: 4.2, y: 0 }, meterGain: 6,
      dash: { vx: 9, frames: 8 }, cancelInto: ['launch', 's1'],
      note: '突进撞击 · 命中可接上挑',
      log: nm[2] + '：前冲撞击，命中后可直接接上挑。'
    });

    // ④ 上挑：浮空起手，把对手打起来接空中连段
    d.moves.launch = mv({
      name: nm[3], cost: 12, startup: t.launch[0], active: t.launch[1], recovery: t.launch[2], dmg: t.launch[3],
      hitbox: { x: 6, y: 12, w: 92, h: 96 }, guard: 'mid',
      hitstun: 24, blockstun: 12, hitstop: 6, kb: { x: 2.0, y: -13 }, juggle: 2, meterGain: 7,
      cancelInto: ['air', 's1'], note: '上挑浮空 · 接空中连段',
      log: nm[3] + '：上挑把对手打浮空，立刻接空中攻击。'
    });
  });

  /* ─────────────────────────── 6 座场景 ─────────────────────────── */
  const STAGES = {
    lab: { name: '普通实验室', icon: 'H₂O', note: '水槽 / 空气', tip: '普攻击破水槽后形成水区', rate: 1, dmgMul: 1 },
    hot: { name: '高温坩埚台', icon: 'Δ', note: '高温 / 空气', tip: '燃烧更强，冷浓硝酸钝化不可用', rate: 1, dmgMul: 1, flame: 1.2, noPassive: true },
    sealed: { name: '密闭反应舱', icon: 'O₂↓', note: '密闭 / 低氧', tip: '气体滞留，区域效果持续更久', rate: 1.25, dmgMul: 1 },
    cold: { name: '低温液氮舱', icon: 'T↓', note: '低温 / 空气', tip: '冷却加长，氧化伤害降低', rate: 0.75, dmgMul: 1, cold: true },
    electro: { name: '电解池', icon: '⚡', note: '通电 / 水相', tip: '每 15 秒全体麻痹，连锁攻击增强', rate: 1, dmgMul: 1, zap: 900 },
    catalyst: { name: '催化剂床', icon: 'Cat.', note: '催化剂 / 常温', tip: '招式恢复 -20%，伤害 -10%', rate: 1, dmgMul: 0.9, fastRecover: 0.8 }
  };

  /* ══════════════════════════════════════════════════════════════════════════
   * 战斗内核 2.0 —— 显式伤害管线
   * --------------------------------------------------------------------------
   * 旧版把减伤 / 格挡 / 连段 / 护甲 / 持续伤害全塞进一个 damage() 里，
   * 通道不清、顺序不明、每次都要重新四舍五入、命中容易重复结算。
   *
   * 新版把「一次命中」拆成固定顺序的 12 个阶段，每个阶段写入 pack.trace：
   *   { phase, accepted, reason }
   * 测试与 debug 面板可以直接断言阶段顺序与每阶段结果。
   *
   *   packet      构造伤害包（通道取整，非法值归零）
   *   hit         命中判定（对局是否结束 / 目标是否还能吃伤害）
   *   invuln      无敌 / 闪避
   *   guard       防御判定（攻击高度 × 防御姿态 × 是否在空中 → 查表）
   *   breakcheck  破防检查（这次格挡会不会把 guardMeter 打空）
   *   split       通道分解（direct 吃连段衰减/高度/破防/状态乘子，chip 固定比例）
   *   apply       逐通道应用（每通道单独 clamp 到剩余稳定度，溢出不得串通道）
   *   meter       削韧 / 气槽结算
   *   stun        硬直 / 击退 / 浮空计数
   *   combo       连段计数（只有真正的 direct 命中才计数）
   *   hitstop     顿帧 / 震屏
   *   events      事件入队（飘字 / 粒子 / 日志 / 状态）
   *
   * 五条通道（任何一条都不能重复计入另一条）：
   *   direct 普通/技能/超必的直接伤害 —— 吃连段衰减、高度克制、格挡减伤
   *   chip   格挡时的固定削量 —— 不吃连段衰减，破防时不再额外叠加
   *   dot    中毒 / 燃烧 / 区域等持续伤害 —— 不吃连段衰减、不计连段、不顿帧
   *   true   真伤（场景电击等） —— 无视防御值
   *   self   自伤 / 反噬（超必过载） —— 从攻击方自己身上扣
   *
   * 数值：所有乘子写成整数比 { n, d }，每个通道结算只做一次 Math.round，
   *       关键路径没有 Math.random（随机只出现在 AI 决策，走 mulberry(seed)）。
   * ══════════════════════════════════════════════════════════════════════════ */

  /* ---------------- 整数比（有理数）运算 ---------------- */
  /* 伤害数值只在最后一步 round 一次，1000 次重复结算不会漂移。 */
  function R(n, d) { return { n: n == null ? 1 : n, d: d == null ? 1 : d }; }
  const R1 = R(1, 1);
  function rmul() {
    let n = 1;
    let d = 1;
    for (let i = 0; i < arguments.length; i += 1) {
      const r = arguments[i];
      if (!r) continue;
      n *= r.n;
      d *= r.d;
    }
    return R(n, d);
  }
  function rapply(amount, r) {
    if (!r) return Math.round(amount);
    return Math.round((amount * r.n) / r.d);
  }
  function posInt(v) { return v > 0 ? Math.round(v) : 0; }

  /* ---------------- 通道 / 管线阶段 ---------------- */
  const CHANNELS = ['direct', 'chip', 'dot', 'true', 'self'];
  const PIPELINE = [
    'packet', 'hit', 'invuln', 'guard', 'breakcheck', 'split',
    'apply', 'meter', 'stun', 'combo', 'hitstop', 'events'
  ];

  /* ---------------- 高度三角：攻击高度 × 防御姿态 × 是否在空中 ----------------
   * stand  站防    crouch 蹲防    air 空中（一律不可防）
   * low     下段：只被蹲防挡住
   * high    中段：只被站防挡住（跳攻 / 空袭）
   * mid     通防：站防蹲防都能挡
   * overhead 上段穿透：格挡无效
   * unblockable 投技 / 不可防御
   */
  const HEIGHT_TABLE = {
    low: { stand: false, crouch: true, air: false, label: '下段（只被蹲防挡）' },
    high: { stand: true, crouch: false, air: false, label: '中段（只被站防挡）' },
    mid: { stand: true, crouch: true, air: false, label: '通防' },
    overhead: { stand: false, crouch: false, air: false, label: '上段穿透（格挡无效）' },
    unblockable: { stand: false, crouch: false, air: false, label: '不可防御' }
  };

  function stanceOf(f) {
    if (!f) return 'air';
    if (!f.onGround) return 'air';
    return f.crouch ? 'crouch' : 'stand';
  }
  function heightOf(name) { return HEIGHT_TABLE[name] ? name : 'mid'; }
  /* 查表：返回该高度在该姿态下能否被格挡 */
  function canBlockHeight(height, stance) {
    const row = HEIGHT_TABLE[heightOf(height)];
    return !!row[stance || 'stand'];
  }

  /* ---------------- 连段衰减：按「本次连段真实命中序号」取值 ----------------
   * 第 1 hit → COMBO_SCALE[0]，第 2 hit → COMBO_SCALE[1] …
   * dot / chip / 破防窗口内的追击都不推进序号，也不吃衰减。
   */
  const COMBO_RATIOS = COMBO_SCALE.map((v) => R(Math.round(v * 1000), 1000));
  const COMBO_WINDOW = 70;          // 超过 70 帧没再命中 → 新一轮连段
  function comboScaleFor(hitIndex) {
    const idx = clamp(hitIndex - 1, 0, COMBO_RATIOS.length - 1);
    return COMBO_RATIOS[idx];
  }

  /* ---------------- 格挡 / 破防数值表 ---------------- */
  const CHIP_RATIO = R(14, 100);      // 格挡只吃 14% 的固定削量
  const GUARD_COST_BASE = 6;          // 每招基础削韧
  const GUARD_COST_PER = R(13, 16);   // 每点伤害 0.8125 削韧
  const GUARD_COST_MIN = 4;
  const GUARD_COST_MAX = 48;
  const BREAK_BONUS = R(15, 10);      // 破防窗口内 direct ×1.5
  const BREAK_WINDOW = 45;            // 破防窗口（帧）
  const GUARD_BREAK_STUN = 40;        // 破防硬直
  const JUGGLE_CHIP = 1;              // 浮空追打超限后只剩的少量削量

  /* ---------------- 全局伤害系数 ----------------
   * 角色血量在 900–1300 量级（数据区数值，不改），而招式 dmg 仍是旧表的个位数：
   * 不放大时 60 秒最多打掉四成血，KO 永远不出现、只能靠计时判定收尾，手感很闷。
   * 2.6 倍后实测「主动进攻 81–92 秒内以 KO 收尾三局两胜」，节奏对得上。
   * 只作用于「招式产生的伤害」入口（招式 spec / 投技 spec），
   * 手工构造的 buildPack 不受影响 —— 管线本身的单测因此仍然按原数值断言。
   */
  const DMG_SCALE = R(26, 10);
  function scaleDamage(v) { return rapply(posInt(v), DMG_SCALE); }

  function guardCostFor(dmg, mods) {
    const raw = GUARD_COST_BASE + rapply(posInt(dmg), GUARD_COST_PER);
    const scaled = mods && mods.guard ? rapply(raw, mods.guard) : raw;
    return clamp(scaled, GUARD_COST_MIN, GUARD_COST_MAX);
  }

  /* ---------------- 气槽收益表（命中 / 被打 / 格挡各一处，集中在此） ---------------- */
  const METER_TABLE = {
    attackHit: R(100, 100),    // 攻击方命中：move.meterGain × 1.0
    attackBlock: R(35, 100),   // 攻击方被格挡：× 0.35
    takenScale: R(9, 100),     // 受方：伤害 × 0.09
    takenCap: 6,               // 受方单次上限
    perfectGuard: 15,
    guardCancel: 50,
    throwCost: 25,
    regen: 0.05,
    regenTraining: 0.8,
    regenCold: R(65, 100),
    regenSi: 2
  };

  /* ---------------- 场景修正器表（唯一一处应用点） ----------------
   * 六条场景规则全部落成数据，伤害管线里只查一次表，不再散落 if。
   *   hot       削弱低温招式        moveMul.cold
   *   cold      压制放热招式        moveMul.hot + dot 降低
   *   sealed    限制气体招式        moveMul.gas + 区域持续延长
   *   electro   带电招式加成        moveMul.charged
   *   catalyst  降低技能消耗        cost + recover（并略降伤害）
   *   lab       水槽：普攻破水成水区，钠遇水燃爆 moveMul.ignite
   */
  const STAGE_MODS = {
    lab: {
      id: 'lab', tag: '水槽 / 空气',
      direct: R1, chip: R1, dot: R1, guard: R1, meter: R1, zone: R1, cost: R1, recover: R1,
      moveMul: { ignite: R(125, 100) }, waterSink: true
    },
    hot: {
      id: 'hot', tag: '高温',
      direct: R1, chip: R1, dot: R1, guard: R1, meter: R1, zone: R1, cost: R1, recover: R1,
      moveMul: { cold: R(85, 100) }, waterSink: false
    },
    sealed: {
      id: 'sealed', tag: '密闭',
      direct: R1, chip: R1, dot: R1, guard: R1, meter: R1, zone: R(125, 100), cost: R1, recover: R1,
      moveMul: { gas: R(80, 100) }, waterSink: false
    },
    cold: {
      id: 'cold', tag: '低温',
      direct: R1, chip: R1, dot: R(90, 100), guard: R1, meter: R(65, 100), zone: R1, cost: R1, recover: R1,
      moveMul: { hot: R(85, 100) }, waterSink: false
    },
    electro: {
      id: 'electro', tag: '通电',
      direct: R1, chip: R1, dot: R1, guard: R1, meter: R1, zone: R1, cost: R1, recover: R1,
      moveMul: { charged: R(115, 100) }, waterSink: false
    },
    catalyst: {
      id: 'catalyst', tag: '催化',
      direct: R(90, 100), chip: R(90, 100), dot: R1, guard: R(90, 100), meter: R1, zone: R1,
      cost: R(85, 100), recover: R(80, 100), moveMul: {}, waterSink: false
    }
  };
  function stageMods(m) { return STAGE_MODS[m && m.stage] || STAGE_MODS.lab; }

  /* 元素属性标签：场景修正器按标签匹配 */
  const FIGHTER_TAGS = {
    cold: { N: 1 },
    hot: { H: 1, Na: 1, Mg: 1, P: 1, K: 1, Ca: 1 },
    gas: { O: 1, Cl: 1, N: 1, Hg: 1, S: 1, P: 1 },
    charged: { Cu: 1, Zn: 1, Ag: 1, Na: 1, K: 1, Ca: 1, Mg: 1, Al: 1, Pb: 1, Fe: 1, I: 1 }
  };
  const GAS_ZONES = { oxygen: 1, ozone: 1, chlorine: 1, phosphine: 1, h2s: 1, hgvap: 1, i2: 1, agcl: 1, hclo: 1 };
  const OXIDIZABLE = { C: 1, H: 1, Na: 1, Mg: 1, P: 1 };
  const WATER_SINK_DUR = 600;

  /* 招式标签：cold / hot / gas / charged / skill / ignite，场景表按标签取乘子 */
  function moveTags(m, f, move, key) {
    const tags = [];
    if (!move) return tags;
    const k = key || '';
    if (move.onHit === 'freeze' || FIGHTER_TAGS.cold[f.id]) tags.push('cold');
    if (move.onHit === 'burn' || FIGHTER_TAGS.hot[f.id]) tags.push('hot');
    const sp = move.spawn;
    if (sp && ((sp.type === 'zone' && GAS_ZONES[sp.kind]) || (sp.type === 'proj' && GAS_ZONES[sp.proj]))) tags.push('gas');
    else if (FIGHTER_TAGS.gas[f.id] && (k === 's1' || k === 's2' || k === 'ult')) tags.push('gas');
    if (FIGHTER_TAGS.charged[f.id]) tags.push('charged');
    if (k === 's1' || k === 's2' || k === 'ult') tags.push('skill');
    if (f.id === 'Na' && move.require === 'water' && m && m.water > 0) tags.push('ignite');
    return tags;
  }

  /* ---------------- 伤害包 ---------------- */
  function buildPack(m, target, attacker, spec) {
    const s = spec || {};
    const pack = {
      channels: {
        direct: posInt(s.direct),
        chip: posInt(s.chip),
        dot: posInt(s.dot),
        true: posInt(s.true),
        self: posInt(s.self)
      },
      meta: {
        moveKey: s.moveKey || 'none',
        height: heightOf(s.height),
        guard: false,                 // 本包是否被格挡（guard 阶段写回）
        scaledHit: 0,                 // 本次 direct 用的是第几 hit 的衰减（0 = 未衰减）
        source: s.source || 'hit',
        tags: s.tags ? s.tags.slice() : [],
        breakBonus: false,
        juggleCapped: false,
        stage: m ? m.stage : 'lab'
      },
      ctx: {
        hitstun: s.hitstun == null ? 14 : s.hitstun,
        blockstun: s.blockstun == null ? 9 : s.blockstun,
        hitstop: s.hitstop == null ? 5 : s.hitstop,
        kb: s.kb || { x: 3, y: 0 },
        meterGain: s.meterGain == null ? 6 : s.meterGain,
        onHit: s.onHit || null,
        drain: s.drain || 0,
        markScale: s.markScale || 0,
        noKb: !!s.noKb,
        chemical: !!s.chemical,
        oxidation: !!s.oxidation,
        flame: !!s.flame,
        heavy: !!s.heavy,
        zone: !!s.zone,
        blockable: s.blockable !== false
      },
      trace: []
    };
    return pack;
  }

  function hasZone(m, kind, box) {
    if (!m || !m.zones) return false;
    for (let i = 0; i < m.zones.length; i += 1) {
      const z = m.zones[i];
      if (z.kind === kind && (!box || rectsOverlap(box, z))) return true;
    }
    return false;
  }

  /* ══════════════════════════ 命中结算管线 ══════════════════════════ */
  /* 固定顺序，每阶段返回 { phase, accepted, reason }；任一阶段判否即短路。 */
  function resolveHit(m, target, attacker, pack) {
    const out = {
      accepted: false,
      blocked: false,
      broke: false,
      juggled: false,
      channels: pack.channels,
      applied: { direct: 0, chip: 0, dot: 0, true: 0, self: 0 },
      total: 0,
      hitIndex: 0,
      combo: attacker ? attacker.combo : 0,
      phases: pack.trace
    };
    const trace = (phase, accepted, reason, extra) => {
      const rec = { phase, accepted: !!accepted, reason: reason || 'ok' };
      if (extra) Object.assign(rec, extra);
      pack.trace.push(rec);
      return rec.accepted;
    };
    const mods = stageMods(m);
    const ctx = pack.ctx;
    const meta = pack.meta;
    const pureSelf = pack.channels.direct + pack.channels.chip + pack.channels.dot + pack.channels.true === 0;

    /* 1) packet ------------------------------------------------------------ */
    let sumIn = 0;
    for (let i = 0; i < CHANNELS.length; i += 1) {
      const k = CHANNELS[i];
      pack.channels[k] = posInt(pack.channels[k]);
      sumIn += pack.channels[k];
    }
    if (!trace('packet', sumIn > 0, sumIn > 0 ? 'ok' : 'empty', { sum: sumIn })) return out;

    /* 2) hit --------------------------------------------------------------- */
    if (!trace('hit', !!target && !m.over && !target.ko && target.stable > 0,
      m.over ? 'match-over' : !target ? 'no-target' : target.ko || target.stable <= 0 ? 'target-down' : 'ok')) {
      return out;
    }

    /* 3) invuln ------------------------------------------------------------ */
    if (target.inv > 0 && !pureSelf) {
      trace('invuln', false, 'invuln', { inv: target.inv });
      return out;
    }
    trace('invuln', true, pureSelf ? 'self-bypass' : 'ok', { inv: target.inv });

    /* 4) guard：高度 × 姿态 × 空中 查表 ------------------------------------ */
    const stance = stanceOf(target);
    const height = meta.height;
    const facingAttacker = attacker
      ? sign((attacker.x + attacker.w / 2) - (target.x + target.w / 2)) === target.face
      : true;
    const wantsBlock = !!target.blockHeld && target.onGround && target.hitstun <= 0 && target.blockstun <= 0;
    const canBlock = wantsBlock && facingAttacker && ctx.blockable !== false;
    const blocked = canBlock && pack.channels.direct > 0 && canBlockHeight(height, stance);
    meta.guard = blocked;
    out.blocked = blocked;
    trace('guard', true, blocked ? 'blocked' : (canBlock ? 'guard-miss:' + height + '/' + stance : 'no-guard'), {
      height: height, stance: stance, facing: facingAttacker
    });

    /* 5) breakcheck：这次格挡是否打空防御值 ------------------------------- */
    const guardCost = guardCostFor(pack.channels.direct > 0 ? pack.channels.direct : pack.channels.chip, mods);
    const willBreak = blocked && target.guardMeter <= guardCost;
    const inBreakWindow = target.guardBroken > 0;
    trace('breakcheck', true, blocked ? (willBreak ? 'break' : 'hold') : 'n/a', {
      guardCost, willBreak, breakWindow: inBreakWindow
    });

    /* 6) split：通道分解 --------------------------------------------------- */
    /* 6a) 钝化膜：吸收一次化学攻击（不格挡时） */
    if (ctx.chemical && !blocked && !pureSelf && target.buffs.passiveShield > 0) {
      target.buffs.passiveShield = 0;
      target.buffs.passive = 0;
      target.statuses = target.statuses.filter((s) => s.type !== 'passive');
      for (let i = 0; i < CHANNELS.length; i += 1) pack.channels[CHANNELS[i]] = 0;
      trace('split', true, 'passive-absorb');
      out.accepted = true;
      trace('apply', true, 'absorbed');
      trace('meter', true, 'noop');
      trace('stun', true, 'noop');
      trace('combo', true, 'noop');
      trace('hitstop', true, 'noop');
      pushEvents(m, target, attacker, pack, out, 'passive');
      trace('events', true, 'passive');
      return out;
    }

    /* 6b) 格挡时 direct 转成 chip（固定比例，不吃连段衰减、不吃破防加成） */
    if (blocked) {
      pack.channels.chip += rapply(pack.channels.direct, CHIP_RATIO);
      pack.channels.direct = 0;
    }

    /* 6c) 浮空追打上限：超过 JUGGLE_MAX 后不再有 direct 伤害 */
    if (pack.channels.direct > 0 && !target.onGround && target.juggle >= JUGGLE_MAX) {
      pack.channels.chip += JUGGLE_CHIP;
      pack.channels.direct = 0;
      out.juggled = true;
      meta.juggleCapped = true;
    }

    /* 6d) direct 乘子链：连段衰减 → 场景标签 → 场景通用 → 破防 → 状态 */
    let ratio = R1;
    const comboEligible = !meta.juggleCapped && pack.channels.direct > 0 && !blocked;
    if (comboEligible && attacker && !inBreakWindow) {
      const fresh = m.frame - (attacker.lastHitFrame == null ? -9999 : attacker.lastHitFrame) <= COMBO_WINDOW;
      const hitIndex = (fresh ? attacker.combo : 0) + 1;
      meta.scaledHit = hitIndex;
      out.hitIndex = hitIndex;
      ratio = rmul(ratio, comboScaleFor(hitIndex));
    }
    if (inBreakWindow && pack.channels.direct > 0) {
      ratio = rmul(ratio, BREAK_BONUS);        // 破防窗口：追击 ×1.5，且不吃连段衰减
      meta.breakBonus = true;
    }
    if (pack.channels.direct > 0) {
      for (let i = 0; i < meta.tags.length; i += 1) {
        const tm = mods.moveMul[meta.tags[i]];
        if (tm) ratio = rmul(ratio, tm);
      }
      ratio = rmul(ratio, mods.direct);
      if (ctx.zone) ratio = rmul(ratio, mods.zone);
      if (target.buffs.diamond > 0 && !ctx.chemical && !ctx.oxidation) ratio = rmul(ratio, R(62, 100));
      if (hasStatus(target, 'oxidation')) ratio = rmul(ratio, R(112, 100));
      if (ctx.oxidation && OXIDIZABLE[target.id]) ratio = rmul(ratio, R(118, 100));
      const flame = STAGES[m.stage] && STAGES[m.stage].flame;
      if (ctx.flame && flame) ratio = rmul(ratio, R(Math.round(flame * 100), 100));
      if (ctx.flame && hasZone(m, 'oxygen', target)) ratio = rmul(ratio, R(150, 100));
      if (hasStatus(target, 'freeze')) ratio = rmul(ratio, R(110, 100));
      if (ctx.markScale) {
        const mk = markCount(target);
        if (mk) ratio = rmul(ratio, R(100 + Math.round(mk * ctx.markScale * 100), 100));
      }
      pack.channels.direct = posInt(rapply(pack.channels.direct, ratio));
    }
    if (pack.channels.chip > 0 && blocked) pack.channels.chip = posInt(rapply(pack.channels.chip, mods.chip));
    if (pack.channels.dot > 0) pack.channels.dot = posInt(rapply(pack.channels.dot, ctx.zone ? rmul(mods.dot, mods.zone) : mods.dot));
    meta.ratio = ratio;
    trace('split', true, 'ok', { direct: pack.channels.direct, chip: pack.channels.chip, scaledHit: meta.scaledHit });

    /* 7) apply：逐通道应用，每通道单独 clamp 到剩余稳定度 ------------------ */
    const applyOrder = ['direct', 'chip', 'dot', 'true'];
    for (let i = 0; i < applyOrder.length; i += 1) {
      const k = applyOrder[i];
      const amt = pack.channels[k];
      if (amt <= 0) continue;
      let left = amt;
      if (k === 'direct' && !blocked && target.buffs.sacrifice > 0) {
        const absorb = Math.min(target.buffs.sacrifice, left);
        target.buffs.sacrifice -= absorb;
        left -= absorb;
        if (absorb > 0) {
          m.numbers.push({
            x: target.x + target.w / 2, y: target.y + 26,
            text: '镀层 −' + absorb, life: 38, color: '#9fc8d8', minor: true
          });
        }
      }
      const room = Math.max(0, target.stable);
      const applied = Math.min(left, room);
      out.applied[k] = applied;
      target.stable = Math.max(0, target.stable - applied);
    }
    /* self 通道：从攻击方自己身上扣，同样单独 clamp */
    if (pack.channels.self > 0 && attacker) {
      const room = Math.max(0, attacker.stable);
      const applied = Math.min(pack.channels.self, room);
      out.applied.self = applied;
      attacker.stable = Math.max(0, attacker.stable - applied);
    }
    out.total = out.applied.direct + out.applied.chip + out.applied.dot + out.applied.true + out.applied.self;
    if (target.stable <= 0) target.stable = 0;
    if (target.flash != null) target.flash = 7;
    trace('apply', true, 'ok', {
      direct: out.applied.direct, chip: out.applied.chip, dot: out.applied.dot,
      true: out.applied.true, self: out.applied.self
    });

    /* 8) meter：削韧 + 气槽 ------------------------------------------------- */
    if (attacker && attacker !== target) {
      const baseGain = blocked ? rapply(ctx.meterGain, METER_TABLE.attackBlock) : rapply(ctx.meterGain, METER_TABLE.attackHit);
      attacker.meter = clamp(attacker.meter + rapply(baseGain, mods.meter), 0, METER_MAX);
    }
    const takenAmount = out.applied.direct + out.applied.chip + out.applied.dot + out.applied.true;
    const takenGain = takenAmount > 0
      ? Math.min(METER_TABLE.takenCap, Math.max(1,
        rapply(takenAmount, METER_TABLE.takenScale)))
      : 0;
    target.meter = clamp(target.meter + takenGain, 0, METER_MAX);
    if (blocked) {
      target.guardMeter = clamp(target.guardMeter - guardCost, 0, GUARD_MAX);
      /* 完美防御：命中前 3 帧内才按下防御 */
      if (target.justGuarded > 0) {
        target.stable = clamp(target.stable + out.applied.chip, 0, target.max);
        out.applied.chip = 0;
        target.meter = clamp(target.meter + METER_TABLE.perfectGuard, 0, METER_MAX);
        target.guardMeter = GUARD_MAX;
        target.justGuarded = 0;
        target.perfectGuardFx = 52;
        logLine(m, '完美防御：削量回补，气槽 +' + METER_TABLE.perfectGuard);
      }
    }
    if (attacker && ctx.drain && !blocked && out.applied.direct > 0) {
      const heal = Math.round(out.applied.direct * ctx.drain);
      attacker.stable = clamp(attacker.stable + heal, 0, attacker.max);
      m.numbers.push({
        x: attacker.x + attacker.w / 2, y: attacker.y + 4,
        text: '+' + heal, life: 36, color: '#8fd6c2', minor: true
      });
    }
    trace('meter', true, 'ok', { guardCost: blocked ? guardCost : 0, guardMeter: Math.round(target.guardMeter) });

    /* 9) stun：硬直 / 击退 / 浮空 ------------------------------------------ */
    const isDot = meta.source === 'dot';
    const dir = attacker ? sign((attacker.x + attacker.w / 2) - (target.x + target.w / 2)) || 1 : 1;
    if (blocked) {
      target.blockstun = Math.max(target.blockstun, ctx.blockstun);
      if (willBreak) {
        out.broke = true;
        target.guardMeter = 0;
        target.guardBroken = BREAK_WINDOW;
        target.hitstun = Math.max(target.hitstun, GUARD_BREAK_STUN);
        target.blockstun = 0;
        target.blockHeld = false;
        target.state = 'hitstun';
        target.stateT = 0;
        target.action = null;
        trace('stun', true, 'guard-break', { stun: GUARD_BREAK_STUN });
        m.numbers.push({
          x: target.x + target.w / 2, y: target.y - 10,
          text: '破防 ×1.5', life: 60, color: '#e79a6a'
        });
        logLine(m, '破防！防御值归零，硬直 ' + GUARD_BREAK_STUN + ' 帧，破防窗口内追击伤害 ×1.5');
      } else {
        trace('stun', true, 'blockstun', { stun: ctx.blockstun });
      }
    } else if (!isDot) {
      if (out.applied.direct + out.applied.chip > 0 || pack.channels.true > 0) {
        target.hitstun = Math.max(target.hitstun, ctx.hitstun);
        target.state = 'hitstun';
        target.stateT = 0;
        target.action = null;
        target.hitThisAction = false;
        target.kb = (ctx.kb && ctx.kb.x ? ctx.kb.x : 3) * dir;
        if (ctx.kb && ctx.kb.y) target.vy = ctx.kb.y;
        if (target.buffs.armor > 0) {
          target.kb *= 0.35;
          if (ctx.kb && ctx.kb.y) target.vy = ctx.kb.y * 0.3;
        }
        if (ctx.noKb) target.kb *= 0.2;
        if (!target.onGround && !out.juggled) {
          target.juggle = Math.min(JUGGLE_MAX, target.juggle + 1);
          if (target.juggle >= JUGGLE_MAX) target.vy = Math.max(target.vy, 1.5);
        }
        trace('stun', true, out.juggled ? 'juggle-capped' : 'hitstun', { stun: ctx.hitstun, juggle: target.juggle });
      } else {
        trace('stun', true, 'no-damage');
      }
    } else {
      trace('stun', true, 'dot-no-stun');
    }

    /* 10) combo：只有真正的 direct 命中才推进连段 -------------------------- */
    if (attacker && attacker !== target && !blocked && !isDot && out.applied.direct > 0 && !inBreakWindow) {
      attacker.combo = clamp(out.hitIndex || 1, 1, COMBO_CAP);
      attacker.lastHitFrame = m.frame;
      out.combo = attacker.combo;
      if (attacker === m.p) {
        m.callout = 45;
        m.calloutText = attacker.combo > 1 ? attacker.combo + ' HITS' : 'HIT';
      }
      m.maxCombo = Math.max(m.maxCombo, attacker.combo);
      m.comboOwner = attacker === m.p ? 'p' : 'e';
      trace('combo', true, 'counted', { combo: attacker.combo });
    } else {
      trace('combo', true, inBreakWindow ? 'break-window' : (blocked ? 'blocked' : isDot ? 'dot' : 'no-hit'));
    }

    /* 11) hitstop ---------------------------------------------------------- */
    if (!isDot && (out.applied.direct + out.applied.chip + out.applied.true) > 0) {
      m.hitstop = Math.max(m.hitstop, ctx.hitstop);
      m.shake = Math.max(m.shake, ctx.heavy ? 7 : blocked ? 2 : 3);
      trace('hitstop', true, 'ok', { hitstop: m.hitstop });
    } else {
      trace('hitstop', true, 'none');
    }

    /* 12) events ----------------------------------------------------------- */
    out.accepted = true;
    pushEvents(m, target, attacker, pack, out, 'hit');
    trace('events', true, 'queued', {
      numbers: m.numbers.length, fx: m.fx.length, log: m.log.length
    });
    return out;
  }

  /* 事件入队：飘字 / 粒子 / 日志 / 命中附加状态 */
  function pushEvents(m, target, attacker, pack, out, mode) {
    const ctx = pack.ctx;
    if (mode === 'passive') {
      m.numbers.push({
        x: target.x + target.w / 2, y: target.y + 20,
        text: '钝化', life: 44, color: '#e9c779', minor: true
      });
      logLine(m, '钝化膜吸收一次化学攻击');
      return;
    }
    if (out.applied.direct > 0) {
      m.numbers.push({
        x: target.x + target.w / 2, y: target.y + 8,
        text: String(out.applied.direct), life: 42, color: '#f2d990'
      });
      for (let i = 0; i < 10; i += 1) {
        m.fx.push({
          x: target.x + target.w / 2, y: target.y + 50,
          vx: Math.cos(i * 0.63) * (2 + (i % 4)),
          vy: Math.sin(i * 0.63) * (2 + (i % 3)) - 1,
          life: 20 + (i % 7), max: 27, color: '#e9c779'
        });
      }
      if (ctx.onHit) applyOnHit(m, target, attacker, ctx.onHit);
    }
    if (out.applied.chip > 0) {
      m.numbers.push({
        x: target.x + target.w / 2, y: target.y + 12,
        text: String(out.applied.chip), life: 40, color: '#b8c8a2', minor: true
      });
    }
    if (out.applied.dot > 0) {
      m.numbers.push({
        x: target.x + target.w / 2, y: target.y + 30,
        text: String(out.applied.dot), life: 34, color: '#c9a6f0', minor: true
      });
    }
    if (out.applied.true > 0) {
      m.numbers.push({
        x: target.x + target.w / 2, y: target.y + 4,
        text: String(out.applied.true), life: 40, color: '#8ec9c7'
      });
    }
    if (out.applied.self > 0 && attacker) {
      m.numbers.push({
        x: attacker.x + attacker.w / 2, y: attacker.y + 10,
        text: '反噬 ' + out.applied.self, life: 40, color: '#c98a7a', minor: true
      });
    }
  }

  /* ══════════════════════════ 角色实例 ══════════════════════════ */
  /* 角色主色（与 art.js palette 首色一致；渲染层读 f.color 时有兜底） */
  const FIGHTER_COLORS = {
    H: '#dce9d7', O: '#8ccbc8', Na: '#c2c7b1', Cl: '#bdcc79', C: '#8b9990',
    Fe: '#b68b71', Mg: '#e2e9e6', Al: '#cfd8dd', Si: '#a9b4bc', P: '#e7e0c6',
    S: '#efe08a', Cu: '#d9a486', N: '#cfe0ea', K: '#d8d2c8', Ca: '#e6e4dc',
    Zn: '#cfd6d9', Ag: '#e4e8ea', Hg: '#dfe3e6', Pb: '#c9cdd2', I: '#e3d6ef'
  };

  function makeFighter(id, x, face, isAI) {
    const d = FIGHTERS[id];
    if (!d) throw new Error('unknown fighter ' + id);
    const f = {
      id, name: d.name, sym: d.sym, type: d.type, archetype: d.archetype,
      x, y: GROUND - d.h, w: d.w, h: d.h,
      vx: 0, vy: 0, kb: 0, face, onGround: true,
      max: d.max, stable: d.max, speed: d.speed, jump: d.jump,
      meter: 0, guardMeter: GUARD_MAX, guardBroken: 0, guardAcc: 0,
      state: 'idle', stateT: 0,
      action: null, actionPrev: null, canCancelUntil: -1, selfPaidFor: null,
      hitstun: 0, blockstun: 0, hitstop: 0, inv: 0, flash: 0,
      juggle: 0, combo: 0, comboT: 0,
      buffs: { diamond: 0, graphite: 0, fe3: false, passive: 0, passiveShield: 0, armor: 0, sacrifice: 0 },
      noBurn: !!d.noBurn,
      statuses: [],
      cd: { l: 0, s1: 0, s2: 0, ult: 0 },
      reagents: { water: 2, silver: 1, acid: 2, redox: 4 },
      isAI, aiMemory: { think: 20, guardTime: 0, move: 0, lastDir: 0, taps: [], want: null, cached: null },
      lastHitFrame: -9999, hitThisAction: false,
      justGuarded: 0, guardHeld: 0,
      wins: 0, ko: false,
      lightChain: 0, lightT: 0,
      crouch: false, blockHeld: false, inputHeld: false, inputDir: 0,
      dashT: 0, tapT: 0, lastTapDir: 0, lastTapFrame: -99,
      perfectGuardFx: 0,
      color: FIGHTER_COLORS[id] || '#dce9d7'
    };
    /* life 是 stable 的渲染别名：HUD / 血条沿用旧字段名 */
    Object.defineProperty(f, 'life', {
      enumerable: true,
      get: function () { return f.stable; },
      set: function (v) { f.stable = v; }
    });
    return f;
  }

  /* ══════════════════════════ 对局实例 ══════════════════════════ */
  function createMatch(opts) {
    opts = opts || {};
    const pid = opts.p || 'H';
    const eid = opts.e || 'Fe';
    const stage = opts.stage || 'lab';
    const mode = opts.mode || 'normal';        // easy | normal | hard | training | pvp
    const best = opts.roundsToWin || ROUNDS_TO_WIN;
    const m = {
      p: makeFighter(pid, 250, 1, false),
      e: makeFighter(eid, 950, -1, mode !== 'pvp'),
      stage, mode, ground: GROUND, stageW: STAGE_W,
      frame: 0, round: 1, timer: ROUND_SECONDS * FPS,
      best, roundsToWin: best,
      hitstop: 0, shake: 0, over: false, paused: false,
      winner: null, endReason: '', roundOver: false, roundWinner: null, lastRound: null,
      intro: mode === 'training' ? 0 : 70,
      fx: [], numbers: [], zones: [], projectiles: [], log: [],
      water: 0, waterT: 0,
      dashes: [],
      prevIn: { p: emptyInput(), e: emptyInput() },
      seed: opts.seed || 481927,
      rng: null, zapT: 0, callout: 0, calloutText: '',
      comboOwner: null, maxCombo: 0,
      lastBlockReason: ''
    };
    m.rng = mulberry(m.seed);
    m.p.opp = m.e;
    m.e.opp = m.p;
    return m;
  }

  function emptyInput() {
    return {
      left: false, right: false, up: false, down: false,
      light: false, s1: false, s2: false, ult: false, block: false, throw: false
    };
  }

  /* ══════════════════════════ 小工具 ══════════════════════════ */
  function logLine(m, s) { if (!s) return; m.log.unshift(s); if (m.log.length > 80) m.log.length = 80; }
  function addStatus(f, type, dur, pow) {
    const z = f.statuses.find((s) => s.type === type);
    if (z) { z.dur = Math.max(z.dur, dur); z.pow = Math.max(z.pow, pow || 1); }
    else f.statuses.push({ type, dur, pow: pow || 1, t: 0 });
  }
  function hasStatus(f, t) { return f.statuses.some((s) => s.type === t && s.dur > 0); }
  /* 银 / 碘的「标记」：可叠加到 5 层，是终式增伤的唯一来源 */
  function addMark(f, n) {
    const z = f.statuses.find((s) => s.type === 'mark');
    const add = n || 1;
    if (z) { z.dur = 300; z.pow = Math.min(5, z.pow + add); return z.pow; }
    f.statuses.push({ type: 'mark', dur: 300, pow: Math.min(5, add), t: 0 });
    return Math.min(5, add);
  }
  function markCount(f) { const z = f.statuses.find((s) => s.type === 'mark' && s.dur > 0); return z ? z.pow : 0; }
  function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function hurtbox(f) {
    return { x: f.x + 12, y: f.y + 12, w: f.w - 24, h: f.h - 14 };
  }
  function pushbox(f) {
    return { x: f.x + 10, y: f.y, w: f.w - 20, h: f.h };
  }
  function hitboxWorld(f, hb) {
    // hb 以「角色左上角 + 面向」定义：x 表示从角色前缘往前的距离
    const w = hb.w;
    const y = f.y + hb.y;
    const x = f.face > 0 ? f.x + hb.x : f.x + f.w - hb.x - w;
    return { x, y, w, h: hb.h };
  }
  function isNeutral(f) { return f.hitstun <= 0 && f.blockstun <= 0 && f.state === 'idle'; }

  /* ══════════════════════════ 回合 / 对局流程 ══════════════════════════ */
  function resetRound(m) {
    const keep = { p: m.p.wins, e: m.e.wins, round: m.round };
    const pid = m.p.id;
    const eid = m.e.id;
    m.p = makeFighter(pid, 250, 1, false);
    m.p.wins = keep.p;
    m.e = makeFighter(eid, 950, -1, m.mode !== 'pvp');
    m.e.wins = keep.e;
    m.p.opp = m.e;
    m.e.opp = m.p;
    m.timer = ROUND_SECONDS * FPS;
    m.hitstop = 0; m.shake = 0;
    m.zones = []; m.projectiles = []; m.fx = []; m.numbers = [];
    m.water = 0; m.waterT = 0; m.dashes = [];
    m.roundOver = false; m.roundWinner = null; m.lastRound = null;
    m.frame = 0; m.comboOwner = null; m.maxCombo = 0; m.zapT = 0;
    m.callout = 0; m.calloutText = '';
    m.round = keep.round;
    if (m.mode !== 'training') m.intro = 70;
  }

  function startRound(m) {
    m.intro = m.mode === 'training' ? 0 : 70;
    m.roundOver = false;
    m.roundWinner = null;
  }

  function finishRound(m, winner, reason) {
    if (m.roundOver) return;
    m.roundOver = true;
    m.roundWinner = winner;
    m.endReason = reason;
    m.lastRound = { round: m.round, winner, reason };
    if (winner === 'p') m.p.wins += 1;
    else if (winner === 'e') m.e.wins += 1;
    logLine(m,
      (winner === 'p' ? '你赢下第 ' : winner === 'e' ? '对手赢下第 ' : '第 ') + m.round + ' 回合' +
      (reason === 'time' ? '（时间到，按稳定度比例判定）' : reason === 'ko' ? '（稳定度归零）' : '（平局）'));
    if (m.p.wins >= m.roundsToWin || m.e.wins >= m.roundsToWin) {
      m.over = true;
      m.winner = m.p.wins > m.e.wins ? 'p' : m.e.wins > m.p.wins ? 'e' : 'draw';
    } else {
      m.round += 1;
      const carry = { p: Math.min(m.p.meter, 50), e: Math.min(m.e.meter, 50) };
      resetRound(m);
      m.p.meter = carry.p;
      m.e.meter = carry.e;
      // resetRound 会清空 roundWinner，这里补回本回合判定，供 HUD / 测试读取
      m.roundWinner = winner;
      m.endReason = reason;
    }
  }

  /* ══════════════════════════ 输入 → 状态机 ══════════════════════════ */
  function canAct(f) {
    return !f.ko && f.hitstun <= 0 && f.blockstun <= 0 && f.hitstop <= 0 &&
      f.state !== 'attack' && f.state !== 'knockdown';
  }

  function pickMove(f, key) {
    const d = FIGHTERS[f.id];
    if (key === 'l') {
      const set = LIGHT_SETS[d.archetype] || LIGHT_SETS.rush;
      const idx = clamp(f.lightChain, 0, set.length - 1);
      return { move: set[idx], idx };
    }
    const mv0 = d.moves[key];
    if (!mv0) return null;
    return { move: mv0, idx: 0 };
  }

  /* 气槽消耗：catalyst 场景降低技能消耗（唯一一处应用点） */
  function moveCost(m, move) {
    if (!move || !move.meterCost) return 0;
    const mods = stageMods(m);
    return Math.max(1, rapply(move.meterCost, mods.cost));
  }

  function moveAllowed(m, f, key, move) {
    if (!move) return 'no';
    if (key === 'air' && f.onGround) return 'no';
    if ((key === 'cr' || key === 'launch') && !f.onGround) return 'no';
    if (f.cd[key] > 0) return 'cooldown';
    const cost = moveCost(m, move);
    if (key === 'ult' && f.meter < (cost || 50)) return 'meter';
    if (cost && f.meter < cost) return 'meter';
    if (move.reagent && f.reagents[move.reagent] <= 0) return 'reagent';
    if (move.noHot && m.stage === 'hot') return 'stage';
    if (move.require === 'water' && !(m.stage === 'lab' && m.water > 0)) return 'water';
    return '';
  }

  function startAction(m, f, key) {
    const picked = pickMove(f, key);
    if (!picked) return false;
    const move = picked.move;
    const why = moveAllowed(m, f, key, move);
    if (why) {
      if (f === m.p) m.lastBlockReason = why;
      return false;
    }
    const cost = moveCost(m, move);
    if (cost) f.meter = clamp(f.meter - cost, 0, METER_MAX);
    if (move.reagent) f.reagents[move.reagent] -= 1;
    if (key !== 'l') {
      const mods = stageMods(m);
      const rec = mods.recover || R1;
      const rate = (STAGES[m.stage].rate || 1) * (rec.n / rec.d);
      const base = move.startup + move.active + move.recovery;
      f.cd[key] = Math.round(base * (key === 'ult' ? 3 : 1.35) * rate);
    }
    f.action = {
      key, name: move.name, move,
      age: 0, phase: 'startup',
      frames: { startup: move.startup, active: move.active, recovery: move.recovery },
      hasHit: false, spawned: false,
      chainUsed: false
    };
    f.state = 'attack';
    f.stateT = 0;
    f.hitThisAction = false;
    f.selfPaidFor = null;
    if (move.dash) { f.vx = f.face * move.dash.vx; f.dashT = move.dash.frames; }
    if (move.inv) f.inv = Math.max(f.inv, move.inv[1]);
    if (move.buff) {
      if (move.buff.diamond) { f.buffs.diamond = move.buff.diamond; f.buffs.graphite = 0; }
      if (move.buff.graphite) { f.buffs.graphite = move.buff.graphite; f.buffs.diamond = 0; }
      if (move.buff.passive) { f.buffs.passive = move.buff.passive; f.buffs.passiveShield = move.buff.passiveShield || 1; }
      if (move.buff.armor) f.buffs.armor = move.buff.armor;
      if (move.buff.sacrifice) f.buffs.sacrifice = (f.buffs.sacrifice || 0) + move.buff.sacrifice;
    }
    if (move.log) logLine(m, move.log);
    if (key === 'l') { f.lightChain = picked.idx + 1; f.lightT = 22; }
    else { f.lightChain = 0; f.lightT = 0; }
    return true;
  }

  function spawnFromMove(m, f, move) {
    const sp = move.spawn;
    if (!sp) return;
    const foe = f.opp;
    const mods = stageMods(m);
    if (sp.type === 'proj') {
      m.projectiles.push({
        owner: f, kind: sp.proj,
        x: f.x + f.w / 2 + f.face * 42, y: f.y + 52,
        vx: f.face * sp.spd, life: 150, r: sp.r || 10, dmg: sp.dmg || 0,
        opt: sp.opt || {}, chain: !!sp.chain, hitSet: new Set()
      });
      return;
    }
    /* zone */
    let zx;
    let zy;
    const dur = Math.round((sp.dur || 120) * (STAGES[m.stage].rate || 1) * (mods.zone.n / mods.zone.d));
    const zw = sp.w || 160;
    if (sp.atTarget) {
      zx = clamp(foe.x + foe.w / 2 - zw / 2, WALL, STAGE_W - WALL - zw);
      zy = m.ground - (sp.h || 70) - 5;
    } else {
      const ox = sp.ox || 0;
      zx = f.face > 0 ? f.x + f.w / 2 + ox : f.x + f.w / 2 - ox - zw;
      // 区域一律贴地：底边落在 m.ground，h 为高度，lift 抬升（正数向上）
      zy = m.ground - (sp.h || 160) - (sp.lift || 0);
    }
    m.zones.push({
      owner: f, kind: sp.kind, x: zx, y: zy, w: zw, h: sp.h || 160,
      dur, max: dur, t: 0, dmg: sp.dmg || 0, continuous: !!sp.continuous,
      opt: sp.opt || {}, onEnter: sp.onEnter || null, struck: false, tick: 0
    });
    if (mods.zone && mods.zone.n !== mods.zone.d) {
      logLine(m, '密闭反应舱：气体滞留，' + (sp.kind || '区域') + ' 持续 +25%');
    }
  }

  /* ══════════════════════════ 兼容入口：damage() ══════════════════════════ */
  /* 老调用方（飞射物 / 区域 / 投技 / 状态 tick）继续走这个入口，
   * 内部只是「构造伤害包 → 跑管线」，返回实际扣掉的总量。 */
  function damage(m, target, attacker, raw, o) {
    const opt = o || {};
    const isDot = !!opt.dot;
    const trueDmg = opt.trueDmg || opt.true || 0;
    const pack = buildPack(m, target, attacker, {
      direct: isDot || trueDmg ? 0 : raw,
      dot: isDot ? raw : 0,
      true: trueDmg || 0,
      height: opt.guard || 'mid',
      moveKey: opt.moveKey || opt.source || 'hit',
      source: isDot ? 'dot' : 'hit',
      tags: opt.tags || [],
      hitstun: opt.hitstun,
      blockstun: opt.blockstun,
      hitstop: opt.hitstop,
      kb: opt.kb,
      meterGain: opt.meterGain,
      onHit: opt.onHit,
      drain: opt.drain,
      markScale: opt.markScale,
      noKb: opt.noKb,
      zone: opt.zone,
      chemical: opt.chemical,
      oxidation: opt.oxidation,
      flame: opt.flame,
      heavy: opt.heavy,
      blockable: opt.blockable
    });
    return resolveHit(m, target, attacker, pack).total;
  }

  /* 场景电击 / 强制真伤：无视防御值与格挡 */
  function trueDamage(m, target, amount, source) {
    const pack = buildPack(m, target, null, { true: amount, source: source || 'true', moveKey: 'true' });
    return resolveHit(m, target, null, pack).total;
  }

  /* 自伤 / 反噬：只走 self 通道，从自己身上扣 */
  function selfDamage(m, f, amount, source) {
    if (!(amount > 0)) return 0;
    const pack = buildPack(m, f, f, { self: amount, source: source || 'self', moveKey: 'self' });
    return resolveHit(m, f, f, pack).applied.self;
  }

  function applyOnHit(m, target, attacker, kind) {
    if (kind === 'burn' && !target.noBurn) addStatus(target, 'oxidation', 180, 1);
    if (kind === 'precip') addStatus(target, 'precip', 150, 1);
    if (kind === 'poison') addStatus(target, 'poison', 160, 0.7);
    if (kind === 'corrosion') addStatus(target, 'corrosion', 150, 0.8);
    if (kind === 'blind') addStatus(target, 'blind', 150, 1);
    if (kind === 'freeze') addStatus(target, 'freeze', 150, 1);
    if (kind === 'mark') addMark(target, 1);
  }

  /* ══════════════════════════ 水槽（lab 场景规则） ══════════════════════════ */
  /* 普攻（站/蹲/冲刺轻击）挥到水面 → 水槽破裂，留下水区；
   * 钠系「遇水燃爆」因此可用，命中水区时再吃 ignite 乘子。 */
  function maybeBreakSink(m, f, a) {
    const mods = stageMods(m);
    if (!mods.waterSink) return;
    if (m.water > 0) return;
    if (!(a.key === 'l' || a.key === 'cr' || a.key === 'dash')) return;
    if (a.phase !== 'active') return;
    const zw = 180;
    const zh = 90;
    const zx = clamp(f.x + f.w / 2 + f.face * 40 - zw / 2, WALL, STAGE_W - WALL - zw);
    m.water = WATER_SINK_DUR;
    m.waterT = 0;
    m.zones.push({
      owner: f, kind: 'water', x: zx, y: m.ground - zh, w: zw, h: zh,
      dur: WATER_SINK_DUR, max: WATER_SINK_DUR, t: 0, dmg: 0, continuous: false,
      opt: {}, onEnter: null, struck: true, tick: 0
    });
    m.numbers.push({
      x: zx + zw / 2, y: m.ground - zh - 12,
      text: '水槽破裂 · 水区', life: 52, color: '#8fd6c2', minor: true
    });
    logLine(m, '普攻击破水槽：形成水区，钠系「遇水燃爆」可用。');
  }

  /* ══════════════════════════ 每帧：角色推进 ══════════════════════════ */
  function updateAction(m, f) {
    const a = f.action;
    if (!a) return;
    a.age += 1;
    const fr = a.frames;

    if (a.age <= fr.startup) a.phase = 'startup';
    else if (a.age <= fr.startup + fr.active) a.phase = 'active';
    else a.phase = 'recovery';

    /* 位移 */
    if (a.move.dash && f.dashT > 0) { f.dashT -= 1; f.vx = f.face * a.move.dash.vx; }

    /* 超必过载：self 通道在起手结束时一次性结算（也走管线） */
    if (a.move.selfDmg && f.selfPaidFor !== a && a.age >= Math.max(1, fr.startup)) {
      f.selfPaidFor = a;
      selfDamage(m, f, a.move.selfDmg, 'overload');
    }

    /* 生成物 */
    if (a.move.spawn && !a.spawned && a.age >= a.move.spawn.at) {
      a.spawned = true;
      spawnFromMove(m, f, a.move);
    }

    /* 场景：lab 水槽 */
    maybeBreakSink(m, f, a);

    /* 判定：每次出招只结算一次（hasHit 锁） */
    if (a.phase === 'active' && a.move.hitbox && !a.hasHit) {
      const hb = hitboxWorld(f, a.move.hitbox);
      const foe = f.opp;
      if (rectsOverlap(hb, hurtbox(foe))) {
        a.hasHit = true;
        const move = a.move;
        const pack = buildPack(m, foe, f, {
          direct: scaleDamage(move.dmg),
          height: move.guard,
          moveKey: a.key,
          source: 'move',
          tags: moveTags(m, f, move, a.key),
          hitstun: move.hitstun,
          blockstun: move.blockstun,
          hitstop: move.hitstop,
          kb: move.kb,
          meterGain: move.meterGain,
          onHit: move.onHit,
          drain: move.drain,
          markScale: move.markScale,
          noKb: move.noKb,
          chemical: !!move.onHit,
          heavy: (move.hitstop || 0) >= 6
        });
        const res = resolveHit(m, foe, f, pack);
        if (res.accepted && move.cancelInto.length) f.canCancelUntil = m.frame + 12;
      }
    }

    if (a.age >= fr.startup + fr.active + fr.recovery) {
      f.action = null;
      f.state = f.onGround ? 'idle' : 'jump';
      f.stateT = 0;
      f.dashT = 0;
    }
  }

  function updateFighter(m, f, other) {
    /* 计时器 */
    for (const k of ['l', 's1', 's2', 'ult']) f.cd[k] = Math.max(0, f.cd[k] - 1);
    f.inv = Math.max(0, f.inv - 1);
    f.flash = Math.max(0, f.flash - 1);
    f.hitstop = Math.max(0, f.hitstop - 1);
    f.hitstun = Math.max(0, f.hitstun - 1);
    f.blockstun = Math.max(0, f.blockstun - 1);
    f.justGuarded = Math.max(0, f.justGuarded - 1);
    if (f.perfectGuardFx > 0) f.perfectGuardFx -= 1;
    if (f.lightT > 0) { f.lightT -= 1; if (f.lightT === 0) f.lightChain = 0; }
    if (f.buffs.diamond > 0) f.buffs.diamond -= 1;
    if (f.buffs.graphite > 0) f.buffs.graphite -= 1;
    if (f.buffs.passive > 0) { f.buffs.passive -= 1; if (f.buffs.passive === 0) f.buffs.passiveShield = 0; }
    if (f.buffs.armor > 0) f.buffs.armor -= 1;
    if (!hasStatus(f, 'passive')) f.buffs.passiveShield = Math.min(f.buffs.passiveShield, 1);

    /* 破防窗口 */
    if (f.guardBroken > 0) {
      f.guardBroken -= 1;
      if (f.guardBroken === 0) { f.guardMeter = GUARD_MAX; logLine(m, '防御值恢复：破防窗口结束'); }
    } else {
      f.guardMeter = clamp(f.guardMeter + GUARD_REGEN, 0, GUARD_MAX);
    }

    /* 气槽自然回复 */
    const mods = stageMods(m);
    const regenBase = m.mode === 'training' ? METER_TABLE.regenTraining : METER_TABLE.regen;
    const meterRatio = mods.meter ? mods.meter.n / mods.meter.d : 1;
    const regen = regenBase * (f.id === 'Si' ? METER_TABLE.regenSi : 1) * meterRatio;
    f.meter = clamp(f.meter + regen, 0, METER_MAX);

    /* 状态：持续时间伤害（dot 通道：不计连段、不顿帧、不产生硬直） */
    for (const s of f.statuses) {
      s.dur -= 1;
      s.t += 1;
      if ((s.type === 'corrosion' || s.type === 'poison') && s.t >= 30) {
        s.t = 0;
        const tick = Math.max(1, Math.round((s.pow * 5) / 2));
        damage(m, f, null, tick, { chemical: true, dot: true, source: 'status' });
      }
    }
    f.statuses = f.statuses.filter((s) => s.dur > 0);

    if (f.ko) return;

    /* 物理 */
    const slow = (hasStatus(f, 'precip') ? 0.55 : 1) * (hasStatus(f, 'freeze') ? 0.62 : 1);
    const coldMul = STAGES[m.stage].cold ? 0.88 : 1;
    const gmul = f.buffs.graphite > 0 ? 1.3 : 1;
    if (f.state !== 'attack' && f.hitstun <= 0 && f.blockstun <= 0) {
      const speed = f.speed * slow * coldMul * gmul;
      const dir = f.inputHeld ? (f.inputDir || 0) : 0;
      const target = f.blockHeld || f.crouch ? 0 : dir * speed;
      f.vx += (target - f.vx) * 0.4;
    } else {
      f.vx *= 0.87;
    }

    f.vy += GRAVITY;
    f.x += f.vx + (f.kb || 0);
    f.y += f.vy;
    f.kb = (f.kb || 0) * 0.8;
    if (Math.abs(f.kb) < 0.05) f.kb = 0;

    if (f.y >= m.ground - f.h) {
      f.y = m.ground - f.h;
      if (!f.onGround) {
        f.onGround = true;
        if (f.state === 'hitstun' && f.hitstun > 6) { f.state = 'knockdown'; f.stateT = 0; f.hitstun = 12; }
        f.juggle = 0;
      }
      f.vy = 0;
    } else {
      f.onGround = false;
    }
    f.x = clamp(f.x, WALL, STAGE_W - WALL - f.w);

    /* 状态机 */
    if (f.hitstun > 0) { f.state = 'hitstun'; f.action = null; }
    else if (f.blockstun > 0) { f.state = 'blockstun'; }
    else if (f.state === 'knockdown') {
      f.stateT += 1;
      if (f.stateT >= 14) { f.state = 'idle'; f.stateT = 0; f.inv = Math.max(f.inv, 6); }
    } else if (f.action) {
      updateAction(m, f);
    } else if (!f.onGround) {
      f.state = 'jump';
    } else if (f.blockHeld) {
      f.state = 'block';
    } else if (f.crouch) {
      f.state = 'crouch';
    } else if (Math.abs(f.vx) > 0.6) {
      f.state = 'walk';
    } else {
      f.state = 'idle';
    }
  }

  /* 连段窗口：对手回到中立（hitstun<=0 && blockstun<=0 && state==='idle'）时清零 */
  function updateComboWindow(m) {
    const both = [m.p, m.e];
    for (let i = 0; i < both.length; i += 1) {
      const f = both[i];
      if (f.combo <= 0) continue;
      const o = f.opp;
      const oppNeutral = o.hitstun <= 0 && o.blockstun <= 0 && o.state === 'idle';
      const timeout = m.frame - f.lastHitFrame > COMBO_WINDOW;
      if (oppNeutral || timeout) f.combo = 0;
    }
    if (isNeutral(m.p) && isNeutral(m.e)) m.comboOwner = null;
  }

  /* ══════════════════════════ 每帧：生成物 ══════════════════════════ */
  function updateProjectiles(m) {
    for (const p of m.projectiles) {
      p.x += p.vx;
      p.life -= 1;
      const foe = p.owner.opp;
      const box = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
      if (!p.hitSet.has(foe) && rectsOverlap(box, hurtbox(foe))) {
        p.hitSet.add(foe);
        const tags = moveTags(m, p.owner, { spawn: { type: 'proj', proj: p.kind } }, 's2');
        const dealt = damage(m, foe, p.owner, p.dmg, Object.assign({
          guard: 'mid', hitstun: 16, blockstun: 10, hitstop: 4,
          kb: { x: 3 }, meterGain: 8, source: 'proj', tags
        }, p.opt));
        if (dealt > 0) {
          if (p.opt.oxidation) addStatus(foe, 'oxidation', 180, 1);
          if (p.chain) p.life = Math.max(p.life, 20);   // 导电：还能再传导一次
          else p.life = 0;
        }
      }
    }
    m.projectiles = m.projectiles.filter((p) => p.life > 0 && p.x > -80 && p.x < STAGE_W + 80);
  }

  function updateZones(m) {
    for (const z of m.zones) {
      z.dur -= 1;
      z.t += 1;
      if (!(z.dmg > 0)) continue;          // 水区等纯功能区域不结算伤害
      const foe = z.owner.opp;
      const inside = rectsOverlap(hurtbox(foe), z);
      if (!inside || foe.inv > 0) continue;
      if (z.continuous) {
        if (z.t >= 18) {
          z.t = 0;
          damage(m, foe, z.owner, z.dmg, Object.assign({
            guard: 'mid', hitstun: 0, blockstun: 6, hitstop: 2,
            kb: { x: 0 }, dot: true, meterGain: 3, source: 'zone', zone: true
          }, z.opt));
          if (z.onEnter) applyOnHit(m, foe, z.owner, z.onEnter);
        }
      } else if (!z.struck) {
        z.struck = true;
        damage(m, foe, z.owner, z.dmg, Object.assign({
          guard: 'mid', hitstun: 18, blockstun: 12, hitstop: 5,
          kb: { x: 4 }, meterGain: 8, source: 'zone', zone: true
        }, z.opt));
        if (z.onEnter) applyOnHit(m, foe, z.owner, z.onEnter);
      }
    }
    m.zones = m.zones.filter((z) => z.dur > 0);
  }

  /* ══════════════════════════ 输入应用 ══════════════════════════ */
  function applyInput(m, f, inp) {
    const prev = m.prevIn[f === m.p ? 'p' : 'e'] || emptyInput();
    f.inputHeld = true;
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    f.inputDir = dir;
    /* 朝向：始终面向对手（出招中锁定朝向，避免判定翻转） */
    const wantFace = sign(f.opp.x - f.x);
    if (wantFace !== 0 && !f.action) f.face = wantFace;

    f.crouch = !!inp.down && f.onGround && !f.action;
    f.blockHeld = !!inp.block && f.onGround && f.hitstun <= 0 && f.blockstun <= 0 && !f.action;
    if (f.blockHeld && !prev.block) f.justGuarded = 3;      // 起防后 3 帧内命中 → 完美防御

    /* 跳跃 */
    if (inp.up && !prev.up && f.onGround && !f.action && f.hitstun <= 0 && f.blockstun <= 0) {
      f.vy = -f.jump;
      f.onGround = false;
      f.state = 'jump';
      if (dir !== 0) f.vx = dir * f.speed * 0.9;
    }

    /* 双击前冲 / 后撤 */
    if (dir !== 0 && prev.inputDir !== dir) {
      if (f.lastTapDir === dir && m.frame - f.lastTapFrame < 15) {
        f.vx = dir * 14;
        f.inv = Math.max(f.inv, 10);
        f.dashT = 10;
        m.dashes.push({
          x: f.x + f.w / 2, y: f.y, face: f.face, dir,
          life: 20, max: 20, side: f === m.p ? 'p' : 'e'
        });
        f.lastTapFrame = -99;
      } else {
        f.lastTapDir = dir;
        f.lastTapFrame = m.frame;
      }
    }

    if (f.hitstun > 0 || f.blockstun > 0 || f.state === 'knockdown') return;

    /* 取消窗口内允许出必杀 */
    const canActNow = !f.action || (f.canCancelUntil >= 0 && m.frame <= f.canCancelUntil);

    /* 投技：防御 + 轻攻击同按（近身），必须优先于普通轻击 */
    const wantThrow = !!inp.throw || (inp.light && !prev.light && canActNow && inp.block && f.onGround);
    if (wantThrow && canActNow && f.onGround) {
      const td = Math.abs((f.opp.x + f.opp.w / 2) - (f.x + f.w / 2));
      if (td < 70 && doThrow(m, f)) return;
    }
    /* 轻攻击：按环境自动分派（地面连段 / 下蹲低段 / 空中中段 / 冲刺突进） */
    if (inp.light && !prev.light && canActNow) {
      if (!f.onGround) startAction(m, f, 'air');
      else if (f.crouch) startAction(m, f, 'cr');
      else if ((f.dashT || 0) > 0) startAction(m, f, 'dash');
      else startAction(m, f, 'l');
    }
    /* 上挑：下 + 技能Ⅰ；其余情况仍是技能Ⅰ */
    if (inp.s1 && !prev.s1 && canActNow) {
      if (inp.down && f.onGround) startAction(m, f, 'launch');
      else startAction(m, f, 's1');
    }
    if (inp.s2 && !prev.s2 && canActNow) startAction(m, f, 's2');
    if (inp.ult && !prev.ult && canActNow) startAction(m, f, 'ult');

    /* guard cancel：防御中按必杀消耗 50 气 */
    if (f.blockHeld && inp.s2 && !prev.s2 && f.meter >= METER_TABLE.guardCancel && !f.action) {
      f.meter -= METER_TABLE.guardCancel;
      f.blockHeld = false;
      f.guardMeter = GUARD_MAX;
      f.guardBroken = 0;
      startAction(m, f, 's1');
      m.numbers.push({
        x: f.x + f.w / 2, y: f.y - 8,
        text: 'GUARD COUNTER', life: 44, color: '#8fd6c2', minor: true
      });
    }
  }

  function doThrow(m, f) {
    const foe = f.opp;
    const dist = Math.abs((foe.x + foe.w / 2) - (f.x + f.w / 2));
    if (dist >= 70) return false;
    if (foe.inv > 0) return false;
    f.meter = clamp(f.meter - METER_TABLE.throwCost, 0, METER_MAX);
    const pack = buildPack(m, foe, f, {
      direct: 18, height: 'unblockable', moveKey: 'throw', source: 'throw',
      tags: [], hitstun: 34, blockstun: 0, hitstop: 8,
      kb: { x: 7, y: -5 }, meterGain: 0
    });
    const res = resolveHit(m, foe, f, pack);
    if (res.total > 0) {
      logLine(m, '投技命中：近身不可防御（受方 8 帧内按轻攻击可拆）');
      m.numbers.push({
        x: foe.x + foe.w / 2, y: foe.y - 12,
        text: '投技', life: 50, color: '#e79a6a', minor: true
      });
    }
    return true;
  }

  /* ══════════════════════════ AI（唯一允许随机的地方，走 mulberry） ══════════════════════════ */
  const AI_LEVELS = {
    easy: { react: 24, quality: 0.45, combo: 1, guardChance: 0.35, jumpChance: 0.02 },
    normal: { react: 13, quality: 0.72, combo: 2, guardChance: 0.6, jumpChance: 0.035 },
    hard: { react: 6, quality: 0.92, combo: 3, guardChance: 0.85, jumpChance: 0.05 },
    training: { react: 999, quality: 0, combo: 0, guardChance: 0, jumpChance: 0 },
    pvp: { react: 999, quality: 0, combo: 0, guardChance: 0, jumpChance: 0 }
  };

  function aiInput(m, f) {
    const lvl = AI_LEVELS[m.mode] || AI_LEVELS.normal;
    const inp = emptyInput();
    if (m.mode === 'training' || m.mode === 'pvp') return inp;
    const mem = f.aiMemory;
    const foe = f.opp;
    const dx = (foe.x + foe.w / 2) - (f.x + f.w / 2);
    const dist = Math.abs(dx);
    const dir = sign(dx);

    /* 反应延迟：每隔 react 帧才重新决策 */
    mem.think -= 1;
    if (mem.think > 0) return mem.cached || inp;
    mem.think = Math.max(1, Math.round(lvl.react * (0.8 + m.rng() * 0.4)));

    /* 防御：对手在出招且距离近 */
    if (foe.action && dist < 170 && m.rng() < lvl.guardChance) {
      inp.block = true;
      inp.down = m.rng() < 0.3;
      mem.cached = inp;
      return inp;
    }
    /* 对手远距离大招 → 尝试跳或退 */
    if (foe.action && dist > 200 && m.rng() < lvl.quality * 0.5) {
      inp.right = dir > 0;
      inp.left = dir < 0;
      mem.cached = inp;
      return inp;
    }
    /* 进攻：贴脸打连段 */
    if (dist < 96 && m.rng() < lvl.quality) {
      if (f.action === null && f.meter >= 50 && m.rng() < 0.35 * lvl.quality) inp.ult = true;
      else if (f.action === null && m.rng() < 0.6) inp.light = true;
      else if (f.cd.s2 <= 0 && m.rng() < 0.3) inp.s2 = true;
      else if (f.cd.s1 <= 0 && m.rng() < 0.35) inp.s1 = true;
      if (f.action && f.action.key === 'l' && f.action.phase !== 'startup' && m.rng() < lvl.quality) inp.light = true;
      mem.cached = inp;
      return inp;
    }
    /* 中距离：逼近 / 用投射 */
    if (dist > 96 && dist < 340) {
      if (f.cd.s1 <= 0 && m.rng() < 0.28 * lvl.quality && !moveAllowed(m, f, 's1', FIGHTERS[f.id].moves.s1)) inp.s1 = true;
      else if (f.cd.s2 <= 0 && m.rng() < 0.2 * lvl.quality && !moveAllowed(m, f, 's2', FIGHTERS[f.id].moves.s2)) inp.s2 = true;
      else { inp.right = dir > 0; inp.left = dir < 0; }
      mem.cached = inp;
      return inp;
    }
    /* 远距离：靠近，偶尔跳 */
    if (m.rng() < lvl.jumpChance && f.onGround) {
      inp.up = true;
      inp.right = dir > 0;
      inp.left = dir < 0;
      mem.cached = inp;
      return inp;
    }
    inp.right = dir > 0;
    inp.left = dir < 0;
    /* 惩罚空振：对手收招且在自己射程内 */
    if (foe.action && foe.action.phase === 'recovery' && dist < 140 && m.rng() < lvl.quality) {
      inp.light = true;
      inp.s1 = f.cd.s1 <= 0;
    }
    mem.cached = inp;
    return inp;
  }

  /* ══════════════════════════ 主步进 ══════════════════════════ */
  /* 重要（既有修复，别改回去）：hitstop / intro 冻结帧必须直接 return，
   * 不消费输入边沿 —— 渲染层 game.js:215 的 simStep() 依赖这个行为，
   * 否则命中瞬间按下的键会被静默吃掉。 */
  function step(m, inputPlayer, inputEnemy) {
    if (m.over || m.paused) return m;
    m.frame += 1;
    if (m.hitstop > 0) { m.hitstop -= 1; return m; }
    if (m.intro > 0) { m.intro -= 1; return m; }

    if (m.mode !== 'training') m.timer = Math.max(0, m.timer - 1);
    if (m.water > 0) m.water -= 1;
    m.waterT += 1;

    /* 场景特殊：电解池每 15 秒通电，全体麻痹 + 少量真伤 */
    if (m.stage === 'electro') {
      m.zapT += 1;
      if (m.zapT >= (STAGES.electro.zap || 900)) {
        m.zapT = 0;
        for (const f of [m.p, m.e]) {
          f.hitstun = Math.max(f.hitstun, 8);
          f.action = null;
          trueDamage(m, f, 4, 'electro-zap');
        }
        m.numbers.push({
          x: STAGE_W / 2, y: 120,
          text: '⚡ 通电', life: 60, color: '#8ec9c7'
        });
        logLine(m, '电解池通电：双方麻痹 8 帧，真伤 4（无视防御值）');
      }
    }

    /* 输入 */
    const inP = inputPlayer || emptyInput();
    const inE = m.e.isAI ? aiInput(m, m.e) : (inputEnemy || emptyInput());
    if (m.p.ko === false) applyInput(m, m.p, inP);
    if (m.e.ko === false) applyInput(m, m.e, inE);

    /* 双方推进 */
    updateFighter(m, m.p, m.e);
    updateFighter(m, m.e, m.p);

    /* 推挤分离 */
    const pb = pushbox(m.p);
    const eb = pushbox(m.e);
    if (rectsOverlap(pb, eb) && Math.abs(m.p.y - m.e.y) < 105) {
      const overlapW = Math.min(pb.x + pb.w, eb.x + eb.w) - Math.max(pb.x, eb.x);
      const pdir = sign((m.p.x + m.p.w / 2) - (m.e.x + m.e.w / 2)) || 1;
      m.p.x = clamp(m.p.x + (pdir * overlapW) / 2, WALL, STAGE_W - WALL - m.p.w);
      m.e.x = clamp(m.e.x - (pdir * overlapW) / 2, WALL, STAGE_W - WALL - m.e.w);
    }

    updateProjectiles(m);
    updateZones(m);
    updateComboWindow(m);

    /* 特效 */
    for (const f of m.fx) { f.x += f.vx; f.y += f.vy; f.vy += 0.14; f.life -= 1; }
    m.fx = m.fx.filter((f) => f.life > 0);
    for (const n of m.numbers) { n.y -= 0.65; n.life -= 1; }
    m.numbers = m.numbers.filter((n) => n.life > 0);
    for (const d of m.dashes) d.life -= 1;
    m.dashes = m.dashes.filter((d) => d.life > 0);
    m.shake *= 0.8;
    if (m.callout > 0) m.callout -= 1;

    /* 记录上帧输入（冻结帧不写，保证边沿不被吃掉） */
    m.prevIn.p = Object.assign(emptyInput(), inP, { inputDir: m.p.inputDir });
    m.prevIn.e = Object.assign(emptyInput(), inE, { inputDir: m.e.inputDir });

    /* 胜负 */
    if (m.p.stable <= 0 || m.e.stable <= 0) {
      const pw = m.p.stable <= 0;
      const ew = m.e.stable <= 0;
      if (pw && ew) finishRound(m, 'draw', 'ko');
      else finishRound(m, pw ? 'e' : 'p', 'ko');
      return m;
    }
    if (m.mode !== 'training' && m.timer <= 0) {
      const pr = m.p.stable / m.p.max;
      const er = m.e.stable / m.e.max;
      const diff = pr - er;
      finishRound(m, Math.abs(diff) < 1e-6 ? 'draw' : diff > 0 ? 'p' : 'e', 'time');
    }
    return m;
  }

  /* ══════════════════════════ 查询辅助（渲染 / UI 用） ══════════════════════════ */
  function activeHitboxes(f) {
    if (!f.action || f.action.phase !== 'active' || !f.action.move.hitbox) return [];
    return [hitboxWorld(f, f.action.move.hitbox)];
  }

  function roundRatio(m) {
    return {
      p: m.p.stable / m.p.max,
      e: m.e.stable / m.e.max,
      time: m.timer / FPS
    };
  }

  /* ══════════════════════════ 导出 ══════════════════════════ */
  const API = {
    FPS, GROUND, STAGE_W, WALL, GRAVITY, ROUND_SECONDS, ROUNDS_TO_WIN, METER_MAX, GUARD_MAX, JUGGLE_MAX,
    FIGHTERS, STAGES, LIGHT_SETS, AI_LEVELS, COMBO_SCALE,
    makeFighter, createMatch, emptyInput, step, resetRound, finishRound,
    damage, applyInput, aiInput, startAction, hurtbox, pushbox, hitboxWorld, activeHitboxes,
    rectsOverlap, addStatus, hasStatus, mulberry, clamp, roundRatio,
    moveAllowed, pickMove,
    fighterIds: () => Object.keys(FIGHTERS),
    stageIds: () => Object.keys(STAGES),
    /* —— 战斗 2.0 新增（只增不减，老键全部保留） —— */
    CHANNELS, PIPELINE, HEIGHT_TABLE, STAGE_MODS, METER_TABLE,
    buildPack, resolveHit, applyOnHit, guardCostFor, canBlockHeight, stanceOf, heightOf,
    moveCost, moveTags, comboScaleFor, trueDamage, selfDamage, isNeutral,
    COMBO_WINDOW, BREAK_WINDOW, GUARD_BREAK_STUN, CHIP_RATIO, BREAK_BONUS, JUGGLE_CHIP
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.Fight = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
