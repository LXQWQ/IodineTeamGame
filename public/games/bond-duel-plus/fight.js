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

  /* ─────────────────────────── 6 座场景 ─────────────────────────── */
  const STAGES = {
    lab: { name: '普通实验室', icon: 'H₂O', note: '水槽 / 空气', tip: '普攻击破水槽后形成水区', rate: 1, dmgMul: 1 },
    hot: { name: '高温坩埚台', icon: 'Δ', note: '高温 / 空气', tip: '燃烧更强，冷浓硝酸钝化不可用', rate: 1, dmgMul: 1, flame: 1.2, noPassive: true },
    sealed: { name: '密闭反应舱', icon: 'O₂↓', note: '密闭 / 低氧', tip: '气体滞留，区域效果持续更久', rate: 1.25, dmgMul: 1 },
    cold: { name: '低温液氮舱', icon: 'T↓', note: '低温 / 空气', tip: '冷却加长，氧化伤害降低', rate: 0.75, dmgMul: 1, cold: true },
    electro: { name: '电解池', icon: '⚡', note: '通电 / 水相', tip: '每 15 秒全体麻痹，连锁攻击增强', rate: 1, dmgMul: 1, zap: 900 },
    catalyst: { name: '催化剂床', icon: 'Cat.', note: '催化剂 / 常温', tip: '招式恢复 -20%，伤害 -10%', rate: 1, dmgMul: 0.9, fastRecover: 0.8 }
  };

  /* ─────────────────────────── 角色实例 ─────────────────────────── */
  function makeFighter(id, x, face, isAI) {
    const d = FIGHTERS[id];
    if (!d) throw new Error('unknown fighter ' + id);
    return {
      id, name: d.name, sym: d.sym, type: d.type, archetype: d.archetype,
      x, y: GROUND - d.h, w: d.w, h: d.h,
      vx: 0, vy: 0, face, onGround: true,
      max: d.max, stable: d.max, speed: d.speed, jump: d.jump,
      meter: 0, guardMeter: GUARD_MAX,
      state: 'idle', stateT: 0,
      action: null, actionPrev: null,
      hitstun: 0, blockstun: 0, hitstop: 0, inv: 0, flash: 0,
      juggle: 0, combo: 0, comboT: 0,
      buffs: { diamond: 0, graphite: 0, fe3: false, passive: 0, passiveShield: 0, armor: 0, sacrifice: 0 },
      noBurn: !!d.noBurn,
      statuses: [],
      cd: { l: 0, s1: 0, s2: 0, ult: 0 },
      reagents: { water: 2, silver: 1, acid: 2, redox: 4 },
      isAI, aiMemory: { think: 20, guardTime: 0, move: 0, lastDir: 0, taps: [], want: null },
      lastHitFrame: -999, hitThisAction: false,
      justGuarded: 0, guardHeld: 0,
      wins: 0, ko: false,
      lightChain: 0, lightT: 0
    };
  }

  /* ─────────────────────────── 对局实例 ─────────────────────────── */
  function createMatch(opts) {
    opts = opts || {};
    const pid = opts.p || 'H', eid = opts.e || 'Fe', stage = opts.stage || 'lab';
    const mode = opts.mode || 'normal';        // easy | normal | hard | training | pvp
    const best = opts.roundsToWin || ROUNDS_TO_WIN;
    const m = {
      p: makeFighter(pid, 250, 1, false),
      e: makeFighter(eid, 950, -1, mode !== 'pvp'),
      stage, mode, ground: GROUND, stageW: STAGE_W,
      frame: 0, round: 1, timer: ROUND_SECONDS * FPS,
      best, roundsToWin: best,
      hitstop: 0, shake: 0, over: false, paused: false,
      winner: null, endReason: '', roundOver: false, roundWinner: null,
      intro: mode === 'training' ? 0 : 70,
      fx: [], numbers: [], zones: [], projectiles: [], log: [],
      water: 0, waterT: 0,
      prevIn: { p: emptyInput(), e: emptyInput() },
      seed: opts.seed || 481927,
      rng: null, zapT: 0, callout: 0, calloutText: '',
      comboOwner: null, maxCombo: 0
    };
    m.rng = mulberry(m.seed);
    m.p.opp = m.e; m.e.opp = m.p;
    return m;
  }

  function emptyInput() {
    return { left: false, right: false, up: false, down: false, light: false, s1: false, s2: false, ult: false, block: false, throw: false };
  }

  /* ─────────────────────────── 小工具 ─────────────────────────── */
  function logLine(m, s) { if (!s) return; m.log.unshift(s); if (m.log.length > 80) m.log.length = 80; }
  function addStatus(f, type, dur, pow) {
    const z = f.statuses.find(s => s.type === type);
    if (z) { z.dur = Math.max(z.dur, dur); z.pow = Math.max(z.pow, pow || 1); }
    else f.statuses.push({ type, dur, pow: pow || 1, t: 0 });
  }
  function hasStatus(f, t) { return f.statuses.some(s => s.type === t && s.dur > 0); }
  /* 银 / 碘的「标记」：可叠加到 5 层，是终式增伤的唯一来源 */
  function addMark(f, n) {
    const z = f.statuses.find(s => s.type === 'mark');
    const add = n || 1;
    if (z) { z.dur = 300; z.pow = Math.min(5, z.pow + add); return z.pow; }
    f.statuses.push({ type: 'mark', dur: 300, pow: Math.min(5, add), t: 0 });
    return Math.min(5, add);
  }
  function markCount(f) { const z = f.statuses.find(s => s.type === 'mark' && s.dur > 0); return z ? z.pow : 0; }
  function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function hurtbox(f) {
    return { x: f.x + 12, y: f.y + 12, w: f.w - 24, h: f.h - 14 };
  }
  function pushbox(f) {
    return { x: f.x + 10, y: f.y, w: f.w - 20, h: f.h };
  }
  function hitboxWorld(f, hb) {
    // hb 以「角色左上角 + 面向」定义：x 表示从角色前缘往前的距离
    const w = hb.w, y = f.y + hb.y;
    const x = f.face > 0 ? f.x + hb.x : f.x + f.w - hb.x - w;
    return { x, y, w, h: hb.h };
  }

  /* ─────────────────────────── 回合/对局流程 ─────────────────────────── */
  function resetRound(m) {
    const keep = { p: m.p.wins, e: m.e.wins, round: m.round };
    const pid = m.p.id, eid = m.e.id;
    m.p = makeFighter(pid, 250, 1, false); m.p.wins = keep.p;
    m.e = makeFighter(eid, 950, -1, m.mode !== 'pvp'); m.e.wins = keep.e;
    m.p.opp = m.e; m.e.opp = m.p;
    m.timer = ROUND_SECONDS * FPS;
    m.hitstop = 0; m.shake = 0; m.zones = []; m.projectiles = []; m.fx = []; m.numbers = [];
    m.water = 0; m.waterT = 0; m.roundOver = false; m.roundWinner = null;
    m.frame = 0; m.comboOwner = null; m.maxCombo = 0; m.zapT = 0;
    m.round = keep.round;
    if (m.mode !== 'training') m.intro = 70;
  }

  function startRound(m) {
    m.intro = m.mode === 'training' ? 0 : 70;
    m.roundOver = false; m.roundWinner = null;
  }

  function finishRound(m, winner, reason) {
    if (m.roundOver) return;
    m.roundOver = true; m.roundWinner = winner; m.endReason = reason;
    m.lastRound = { round: m.round, winner: winner, reason: reason };
    if (winner === 'p') m.p.wins++;
    else if (winner === 'e') m.e.wins++;
    logLine(m, (winner === 'p' ? '你赢下第 ' : winner === 'e' ? '对手赢下第 ' : '第 ') + m.round + ' 回合' + (reason === 'time' ? '（时间到，按稳定度比例判定）' : reason === 'ko' ? '（稳定度归零）' : '（平局）'));
    if (m.p.wins >= m.roundsToWin || m.e.wins >= m.roundsToWin) {
      m.over = true;
      m.winner = m.p.wins > m.e.wins ? 'p' : m.e.wins > m.p.wins ? 'e' : 'draw';
    } else {
      m.round++;
      const carry = { p: Math.min(m.p.meter, 50), e: Math.min(m.e.meter, 50) };
      resetRound(m);
      m.p.meter = carry.p; m.e.meter = carry.e;
      // resetRound 会清空 roundWinner，这里补回本回合判定，供 HUD / 测试读取
      m.roundWinner = winner; m.endReason = reason;
    }
  }

  /* ─────────────────────────── 输入 → 状态机 ─────────────────────────── */
  function canAct(f) {
    return !f.ko && f.hitstun <= 0 && f.blockstun <= 0 && f.hitstop <= 0 && f.state !== 'attack' && f.state !== 'knockdown';
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

  function moveAllowed(m, f, key, move) {
    if (move.cost && f.meter < 0) return 'no';
    if (f.cd[key] > 0) return 'cooldown';
    if (key === 'ult' && f.meter < (move.meterCost || 50)) return 'meter';
    if (move.meterCost && f.meter < move.meterCost) return 'meter';
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
    if (move.meterCost) f.meter = clamp(f.meter - move.meterCost, 0, METER_MAX);
    if (move.reagent) f.reagents[move.reagent]--;
    if (key !== 'l') {
      const rate = (STAGES[m.stage].rate || 1) * (STAGES[m.stage].fastRecover || 1);
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
    f.state = 'attack'; f.stateT = 0;
    f.hitThisAction = false;
    if (move.dash) { f.vx = f.face * move.dash.vx; f.dashT = move.dash.frames; }
    if (move.inv) f.inv = Math.max(f.inv, move.inv[1]);
    if (move.buff) {
      if (move.buff.diamond) { f.buffs.diamond = move.buff.diamond; f.buffs.graphite = 0; }
      if (move.buff.graphite) { f.buffs.graphite = move.buff.graphite; f.buffs.diamond = 0; }
      if (move.buff.passive) { f.buffs.passive = move.buff.passive; f.buffs.passiveShield = move.buff.passiveShield || 1; }
      if (move.buff.armor) f.buffs.armor = move.buff.armor;
      if (move.buff.sacrifice) f.buffs.sacrifice = (f.buffs.sacrifice || 0) + move.buff.sacrifice;
    }
    if (move.selfDmg) {
      f.stable = clamp(f.stable - move.selfDmg, 0, f.max);
      m.numbers.push({ x: f.x + f.w / 2, y: f.y + 10, text: String(move.selfDmg), life: 40, color: '#c98a7a', minor: true });
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
    if (sp.type === 'proj') {
      m.projectiles.push({
        owner: f, kind: sp.proj, x: f.x + f.w / 2 + f.face * 42, y: f.y + 52,
        vx: f.face * sp.spd, life: 150, r: sp.r || 10, dmg: sp.dmg || 0,
        opt: sp.opt || {}, chain: !!sp.chain, hitSet: new Set()
      });
      return;
    }
    // zone
    let zx, zy;
    const dur = Math.round((sp.dur || 120) * (STAGES[m.stage].rate || 1));
    if (sp.atTarget) {
      zx = clamp(foe.x + foe.w / 2 - (sp.w || 160) / 2, WALL, STAGE_W - WALL - (sp.w || 160));
      zy = m.ground - (sp.h || 70) - 5;
    } else {
      const ox = sp.ox || 0;
      zx = f.face > 0 ? f.x + f.w / 2 + ox : f.x + f.w / 2 - ox - (sp.w || 160);
      // 区域一律贴地：底边落在 m.ground，h 为高度，lift 抬升（正数向上）
      zy = m.ground - (sp.h || 160) - (sp.lift || 0);
    }
    m.zones.push({
      owner: f, kind: sp.kind, x: zx, y: zy, w: sp.w || 160, h: sp.h || 160,
      dur, max: dur, t: 0, dmg: sp.dmg || 0, continuous: !!sp.continuous,
      opt: sp.opt || {}, onEnter: sp.onEnter || null, struck: false, tick: 0
    });
  }

  /* ─────────────────────────── 命中结算 ─────────────────────────── */
  function damage(m, target, attacker, raw, o) {
    o = o || {};
    if (m.over || target.ko) return 0;
    if (target.inv > 0) return 0;

    const dir = attacker ? sign(attacker.x + attacker.w / 2 - (target.x + target.w / 2)) : 1;
    // 目标必须“面向攻击者”，否则背对时不吃格挡收益
    const facingAttacker = attacker ? sign(attacker.x + attacker.w / 2 - (target.x + target.w / 2)) === target.face : true;

    // 防御判定：站防吃 high/mid，蹲防吃 low/mid，空中不可防
    let blocked = false;
    const wantBlock = target.blockHeld && target.onGround && target.hitstun <= 0;
    if (wantBlock && o.guard !== 'unblockable') {
      const lvl = o.guard || 'mid';
      if (lvl === 'mid') blocked = true;
      else if (lvl === 'high') blocked = !target.crouch;
      else if (lvl === 'low') blocked = target.crouch;
      // 必须面向攻击者
      if (blocked && attacker && !facingAttacker) blocked = false;
    }

    let mul = 1;
    if (blocked) mul *= 0.14;                                  // 格挡只吃 14% 削量
    if (target.buffs.diamond && !o.chemical && !o.oxidation) mul *= 0.62;
    if (hasStatus(target, 'oxidation')) mul *= 1.12;
    if (o.oxidation && (target.id === 'C' || target.id === 'H' || target.id === 'Na' || target.id === 'Mg' || target.id === 'P')) mul *= 1.18;
    if (o.flame && STAGES[m.stage].flame) mul *= STAGES[m.stage].flame;
    if (o.oxidation && STAGES[m.stage].cold) mul *= 0.8;
    if (o.flame && m.zones.some(z => z.kind === 'oxygen' && rectsOverlap(target, z))) mul *= 1.5;
    mul *= STAGES[m.stage].dmgMul || 1;
    if (hasStatus(target, 'freeze')) mul *= 1.10;                     // 低温脆化：受击更疼
    if (o.markScale) { const mk = markCount(target); if (mk) mul *= 1 + mk * o.markScale; }

    // 连段衰减
    if (!blocked && attacker && attacker.combo > 0) {
      const idx = clamp(attacker.combo, 0, COMBO_SCALE.length - 1);
      mul *= COMBO_SCALE[idx];
    }

    // 钝化膜吸收一次化学攻击
    if (target.buffs.passiveShield > 0 && (o.chemical || o.corrosive || o.oxidation) && !blocked) {
      target.buffs.passiveShield = 0;
      target.buffs.passive = 0;
      target.statuses = target.statuses.filter(s => s.type !== 'passive');
      m.numbers.push({ x: target.x + target.w / 2, y: target.y + 20, text: '钝化', life: 44, color: '#e9c779' });
      logLine(m, '钝化膜吸收一次化学攻击');
      return 0;
    }

    let actual = Math.min(target.stable, Math.max(0, raw * mul));
    // 镀锌牺牲层：优先扣护盾，扣完才吃稳定度（不格挡时才生效）
    if (!blocked && target.buffs.sacrifice > 0) {
      const absorb = Math.min(target.buffs.sacrifice, actual);
      target.buffs.sacrifice -= absorb; actual -= absorb;
      m.numbers.push({ x: target.x + target.w / 2, y: target.y + 26, text: '镀层 −' + Math.round(absorb), life: 38, color: '#9fc8d8' });
    }
    target.stable = clamp(target.stable - actual, 0, target.max);
    target.flash = 7;

    if (attacker) attacker.meter = clamp(attacker.meter + (blocked ? (o.meterGain || 6) * 0.35 : (o.meterGain || 6)), 0, METER_MAX);
    if (target.meter < METER_MAX) target.meter = clamp(target.meter + Math.min(6, actual * 0.09), 0, METER_MAX);
    if (attacker && o.drain && !blocked && actual > 0) {
      const heal = actual * o.drain;
      attacker.stable = clamp(attacker.stable + heal, 0, attacker.max);
      m.numbers.push({ x: attacker.x + attacker.w / 2, y: attacker.y + 4, text: '+' + Math.round(heal), life: 36, color: '#8fd6c2' });
    }

    if (blocked) {
      target.blockstun = Math.max(target.blockstun, o.blockstun || 9);
      target.guardMeter = clamp(target.guardMeter - GUARD_CHIP, 0, GUARD_MAX);
      m.hitstop = Math.max(m.hitstop, 2);
      m.shake = Math.max(m.shake, 2);
      m.numbers.push({ x: target.x + target.w / 2, y: target.y + 12, text: '格挡 ' + Math.round(actual), life: 40, color: '#b8c8a2' });
      // 完美防御：命中前 3 帧内才按下防御
      if (target.justGuarded > 0) {
        target.stable = clamp(target.stable + actual * 0.9, 0, target.max);
        target.meter = clamp(target.meter + 15, 0, METER_MAX);
        target.guardMeter = GUARD_MAX;
        m.numbers.push({ x: target.x + target.w / 2, y: target.y - 6, text: '完美防御', life: 52, color: '#8fd6c2' });
        logLine(m, '完美防御：削量回补 + 气槽 +15');
        target.justGuarded = 0;
      }
      if (target.guardMeter <= 0) {
        target.guardMeter = GUARD_MAX;
        target.hitstun = 40; target.state = 'hitstun'; target.blockHeld = false;
        m.numbers.push({ x: target.x + target.w / 2, y: target.y - 10, text: '破防', life: 60, color: '#e79a6a' });
        logLine(m, '破防！防御值归零，硬直 40 帧');
      }
    } else if (!o.dot) {
      target.hitstun = Math.max(target.hitstun, o.hitstun || 14);
      target.state = 'hitstun'; target.stateT = 0;
      target.action = null;
      target.kb = (o.kb && o.kb.x ? o.kb.x : 3) * dir;
      if (o.kb && o.kb.y) target.vy = o.kb.y;
      if (target.buffs.armor > 0) { target.kb *= 0.35; if (o.kb && o.kb.y) target.vy = o.kb.y * 0.3; }
      if (o.noKb) target.kb *= 0.2;
      if (attacker) {
        // 持续伤害（dot / 区域 tick）不计入连段，避免被每 18 帧的沼泽刷成几十 hit
        if (!o.dot) {
          attacker.combo = (m.frame - attacker.lastHitFrame < 70) ? Math.min(COMBO_CAP, attacker.combo + 1) : 1;
          attacker.lastHitFrame = m.frame;
        }
        if (attacker === m.p && !o.dot) {
          m.callout = 45;
          m.calloutText = attacker.combo > 1 ? attacker.combo + ' HITS' : 'HIT';
        }
        if (!o.dot) m.maxCombo = Math.max(m.maxCombo, attacker.combo);
      }
      m.hitstop = Math.max(m.hitstop, o.hitstop || 5);
      m.shake = Math.max(m.shake, o.heavy ? 7 : 3);
      m.numbers.push({ x: target.x + target.w / 2, y: target.y + 8, text: String(Math.round(actual)), life: 42, color: '#f2d990' });
      // 浮空追打计数（上限 JUGGLE_MAX，超出后不再抬升、下落加速）
      if (!target.onGround) {
        target.juggle = Math.min(JUGGLE_MAX + 1, target.juggle + 1);
        if (target.juggle > JUGGLE_MAX) { target.vy = Math.min(target.vy, 2); target.juggle = JUGGLE_MAX + 1; }
      }
      if (o.onHit) applyOnHit(m, target, attacker, o.onHit);
      for (let i = 0; i < 10; i++) m.fx.push({ x: target.x + target.w / 2, y: target.y + 50, vx: Math.cos(i * 0.63) * (2 + i % 4), vy: Math.sin(i * 0.63) * (2 + i % 3) - 1, life: 20 + i % 7, max: 27, color: '#e9c779' });
    }
    return actual;
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

  /* ─────────────────────────── 每帧：角色推进 ─────────────────────────── */
  function updateAction(m, f) {
    const a = f.action;
    if (!a) return;
    a.age++;
    const { startup, active, recovery } = a.frames;

    if (a.age <= startup) a.phase = 'startup';
    else if (a.age <= startup + active) a.phase = 'active';
    else a.phase = 'recovery';

    // 位移
    if (a.move.dash && f.dashT > 0) { f.dashT--; f.vx = f.face * a.move.dash.vx; }

    // 生成物
    if (a.move.spawn && !a.spawned && a.age >= a.move.spawn.at) { a.spawned = true; spawnFromMove(m, f, a.move); }

    // 判定
    if (a.phase === 'active' && a.move.hitbox && !a.hasHit) {
      const hb = hitboxWorld(f, a.move.hitbox);
      const foe = f.opp;
      if (rectsOverlap(hb, hurtbox(foe))) {
        a.hasHit = true;
        const dealt = damage(m, foe, f, a.move.dmg, {
          guard: a.move.guard, hitstun: a.move.hitstun, blockstun: a.move.blockstun,
          hitstop: a.move.hitstop, kb: a.move.kb, meterGain: a.move.meterGain,
          chemical: true, heavy: (a.move.hitstop || 0) >= 6,
          onHit: a.move.onHit === 'burn' ? 'burn' : a.move.onHit
        });
        if (dealt > 0) {
          // 命中后取消窗口
          if (a.move.cancelInto.length) f.canCancelUntil = m.frame + 12;
        }
      }
    }

    if (a.age >= startup + active + recovery) {
      f.action = null; f.state = f.onGround ? 'idle' : 'jump'; f.stateT = 0;
      f.dashT = 0;
    }
  }

  function updateFighter(m, f, other) {
    // 计时器
    for (const k of ['l', 's1', 's2', 'ult']) f.cd[k] = Math.max(0, f.cd[k] - 1);
    f.inv = Math.max(0, f.inv - 1);
    f.flash = Math.max(0, f.flash - 1);
    f.hitstop = Math.max(0, f.hitstop - 1);
    f.hitstun = Math.max(0, f.hitstun - 1);
    f.blockstun = Math.max(0, f.blockstun - 1);
    f.justGuarded = Math.max(0, f.justGuarded - 1);
    if (f.lightT > 0) { f.lightT--; if (f.lightT === 0) f.lightChain = 0; }
    if (f.buffs.diamond > 0) f.buffs.diamond--;
    if (f.buffs.graphite > 0) f.buffs.graphite--;
    if (f.buffs.passive > 0) { f.buffs.passive--; if (f.buffs.passive === 0) f.buffs.passiveShield = 0; }
    if (f.buffs.armor > 0) f.buffs.armor--;
    if (!hasStatus(f, 'passive')) f.buffs.passiveShield = Math.min(f.buffs.passiveShield, 1);
    f.guardMeter = clamp(f.guardMeter + GUARD_REGEN, 0, GUARD_MAX);
    f.meter = clamp(f.meter + (m.mode === 'training' ? 0.8 : 0.05) * (STAGES[m.stage].cold ? 0.65 : 1) * (f.id === 'Si' ? 2 : 1), 0, METER_MAX);
    if (f.shakeT > 0) f.shakeT--;

    // 状态伤害
    for (const s of f.statuses) {
      s.dur--; s.t++;
      if ((s.type === 'corrosion' || s.type === 'poison') && s.t >= 30) {
        s.t = 0;
        damage(m, f, null, 2.5 * s.pow, { chemical: true, dot: true });
      }
    }
    f.statuses = f.statuses.filter(s => s.dur > 0);

    if (f.ko) return;

    // 物理
    const slow = (hasStatus(f, 'precip') ? 0.55 : 1) * (hasStatus(f, 'freeze') ? 0.62 : 1);
    const cold = STAGES[m.stage].cold ? 0.88 : 1;
    const gmul = f.buffs.graphite > 0 ? 1.3 : 1;
    if (f.state !== 'attack' && f.hitstun <= 0 && f.blockstun <= 0) {
      const speed = f.speed * slow * cold * gmul;
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

    // 状态机
    if (f.hitstun > 0) { f.state = 'hitstun'; f.action = null; }
    else if (f.blockstun > 0) { f.state = 'block'; }
    else if (f.state === 'knockdown') {
      f.stateT++;
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

  /* ─────────────────────────── 每帧：生成物 ─────────────────────────── */
  function updateProjectiles(m) {
    for (const p of m.projectiles) {
      p.x += p.vx; p.life--;
      const foe = p.owner.opp;
      const box = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
      if (!p.hitSet.has(foe) && rectsOverlap(box, hurtbox(foe))) {
        p.hitSet.add(foe);
        const dealt = damage(m, foe, p.owner, p.dmg, Object.assign({ guard: 'mid', hitstun: 16, blockstun: 10, hitstop: 4, kb: { x: 3 }, meterGain: 8 }, p.opt));
        if (dealt > 0) {
          if (p.opt.oxidation) addStatus(foe, 'oxidation', 180, 1);
          if (p.chain) p.life = Math.max(p.life, 20); // 导电：还能再传导一次
          else p.life = 0;
        }
      }
    }
    m.projectiles = m.projectiles.filter(p => p.life > 0 && p.x > -80 && p.x < STAGE_W + 80);
  }

  function updateZones(m) {
    for (const z of m.zones) {
      z.dur--; z.t++;
      const foe = z.owner.opp;
      const inside = rectsOverlap(hurtbox(foe), z);
      if (inside && foe.inv <= 0) {
        if (z.continuous) {
          if (z.t >= 18) {
            z.t = 0;
            damage(m, foe, z.owner, z.dmg, Object.assign({ guard: 'mid', hitstun: 0, blockstun: 6, hitstop: 2, kb: { x: 0 }, dot: true, meterGain: 3 }, z.opt));
            if (z.onEnter) applyOnHit(m, foe, z.owner, z.onEnter);
          }
        } else if (!z.struck) {
          z.struck = true;
          damage(m, foe, z.owner, z.dmg, Object.assign({ guard: 'mid', hitstun: 18, blockstun: 12, hitstop: 5, kb: { x: 4 }, meterGain: 8 }, z.opt));
          if (z.onEnter) applyOnHit(m, foe, z.owner, z.onEnter);
        }
      }
    }
    m.zones = m.zones.filter(z => z.dur > 0);
  }

  /* ─────────────────────────── 输入应用 ─────────────────────────── */
  function doubleTap(f, dir) {
    const now = f.aiMemory ? f.aiMemory : (f.aiMemory = { taps: [] });
    now.taps = now.taps.filter(t => t.dir === dir && now.frameStamp - t.at < 16);
    now.taps.push({ dir, at: now.frameStamp });
    if (now.taps.length >= 2) { now.taps = []; return true; }
    return false;
  }

  function applyInput(m, f, inp) {
    const prev = m.prevIn[f === m.p ? 'p' : 'e'] || emptyInput();
    f.inputHeld = true;
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    f.inputDir = dir;
    if (dir !== 0) f.face = f === m.p ? sign(f.opp.x - f.x) : sign(f.opp.x - f.x);

    f.crouch = !!inp.down && f.onGround && !f.action;
    f.blockHeld = !!inp.block && f.onGround && f.hitstun <= 0 && f.blockstun <= 0 && !f.action;
    if (f.blockHeld && !prev.block) f.justGuarded = 3;      // 起防后 3 帧内命中 → 完美防御

    // 跳跃
    if (inp.up && !prev.up && f.onGround && !f.action && f.hitstun <= 0 && f.blockstun <= 0) {
      f.vy = -f.jump; f.onGround = false; f.state = 'jump';
      if (dir !== 0) f.vx = dir * f.speed * 0.9;
    }

    // 双击前冲/后撤
    if (dir !== 0 && prev.__dir !== dir) {
      if (!f.tapTrack) f.tapTrack = { dir: 0, at: -99 };
      if (f.tapTrack.dir === dir && m.frame - f.tapTrack.at < 15) {
        f.vx = dir * 14; f.inv = Math.max(f.inv, 10); f.dashT = 10;
        m.numbers.push({ x: f.x + f.w / 2, y: f.y + f.h - 30, text: dir > 0 ? '前冲' : '后撤', life: 26, color: '#9ec9c0', minor: true });
        f.tapTrack.at = -99;
      } else f.tapTrack = { dir, at: m.frame };
    }
    f.tapTrack && (prev.__dir = dir);

    if (f.hitstun > 0 || f.blockstun > 0 || f.state === 'knockdown') return;

    // 取消窗口内允许出必杀
    const canActNow = !f.action || (f.canCancelUntil && m.frame <= f.canCancelUntil);

    // 轻攻击（连打链）
    if (inp.light && !prev.light && canActNow) {
      if (startAction(m, f, 'l')) { /* ok */ }
    }
    // 投技：block + light 同按（近身）
    else if (inp.block && inp.light && !prev.light && canActNow) {
      const dist = Math.abs((f.opp.x + f.opp.w / 2) - (f.x + f.w / 2));
      if (dist < 70) { doThrow(m, f); }
    }
    if (inp.s1 && !prev.s1 && canActNow) startAction(m, f, 's1');
    if (inp.s2 && !prev.s2 && canActNow) startAction(m, f, 's2');
    if (inp.ult && !prev.ult && canActNow) startAction(m, f, 'ult');

    // guard cancel：防御中按必杀消耗 50 气
    if (f.blockHeld && inp.s2 && !prev.s2 && f.meter >= 50 && !f.action) {
      f.meter -= 50; f.blockHeld = false; f.guardMeter = GUARD_MAX;
      startAction(m, f, 's1');
      m.numbers.push({ x: f.x + f.w / 2, y: f.y - 8, text: '防御反击', life: 44, color: '#8fd6c2' });
    }
  }

  function doThrow(m, f) {
    const foe = f.opp;
    const dist = Math.abs((foe.x + foe.w / 2) - (f.x + f.w / 2));
    if (dist >= 70) return false;
    if (foe.inv > 0) return false;
    f.meter = clamp(f.meter - 25, 0, METER_MAX);
    damage(m, foe, f, 18, { guard: 'unblockable', hitstun: 34, blockstun: 0, hitstop: 8, kb: { x: 7, y: -5 }, meterGain: 0 });
    logLine(m, '投技命中：近身不可防御（受方 8 帧内按轻攻击可拆）');
    m.numbers.push({ x: foe.x + foe.w / 2, y: foe.y - 12, text: '投技', life: 50, color: '#e79a6a' });
    return true;
  }

  /* ─────────────────────────── AI ─────────────────────────── */
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

    // 反应延迟：每隔 react 帧才重新决策
    if (--mem.think > 0) return mem.cached || inp;
    mem.think = Math.max(1, Math.round(lvl.react * (0.8 + m.rng() * 0.4)));

    // 防御：对手在出招且距离近
    if (foe.action && dist < 170 && m.rng() < lvl.guardChance) {
      inp.block = true;
      inp.down = m.rng() < 0.3;
      mem.cached = inp; return inp;
    }
    // 对手远距离大招 → 尝试跳或退
    if (foe.action && dist > 200 && m.rng() < lvl.quality * 0.5) {
      inp.right = dir > 0; inp.left = dir < 0;
      mem.cached = inp; return inp;
    }

    // 进攻：贴脸打连段
    if (dist < 96 && m.rng() < lvl.quality) {
      if (f.action === null && f.meter >= 50 && m.rng() < 0.35 * lvl.quality) inp.ult = true;
      else if (f.action === null && m.rng() < 0.6) inp.light = true;
      else if (f.cd.s2 <= 0 && m.rng() < 0.3) inp.s2 = true;
      else if (f.cd.s1 <= 0 && m.rng() < 0.35) inp.s1 = true;
      // 轻攻击连段：连打
      if (f.action && f.action.key === 'l' && f.action.phase !== 'startup' && m.rng() < lvl.quality) inp.light = true;
      mem.cached = inp; return inp;
    }

    // 中距离：逼近 / 用投射
    if (dist > 96 && dist < 340) {
      if (f.cd.s1 <= 0 && m.rng() < 0.28 * lvl.quality && !moveAllowed(m, f, 's1', FIGHTERS[f.id].moves.s1)) inp.s1 = true;
      else if (f.cd.s2 <= 0 && m.rng() < 0.2 * lvl.quality && !moveAllowed(m, f, 's2', FIGHTERS[f.id].moves.s2)) inp.s2 = true;
      else { inp.right = dir > 0; inp.left = dir < 0; }
      mem.cached = inp; return inp;
    }

    // 远距离：靠近，偶尔跳
    if (m.rng() < lvl.jumpChance && f.onGround) { inp.up = true; inp.right = dir > 0; inp.left = dir < 0; mem.cached = inp; return inp; }
    inp.right = dir > 0; inp.left = dir < 0;

    // 惩罚空振：对手收招且在自己射程内
    if (foe.action && foe.action.phase === 'recovery' && dist < 140 && m.rng() < lvl.quality) {
      inp.light = true; inp.s1 = f.cd.s1 <= 0;
    }
    mem.cached = inp;
    return inp;
  }

  /* ─────────────────────────── 主步进 ─────────────────────────── */
  function step(m, inputPlayer, inputEnemy) {
    if (m.over || m.paused) return m;
    m.frame++;
    if (m.hitstop > 0) { m.hitstop--; return m; }

    if (m.intro > 0) { m.intro--; return m; }

    if (m.mode !== 'training') m.timer = Math.max(0, m.timer - 1);
    if (m.water > 0) m.water--;

    // 场景特殊：电解池每 15 秒全体麻痹
    if (m.stage === 'electro') {
      m.zapT++;
      if (m.zapT >= (STAGES.electro.zap || 900)) {
        m.zapT = 0;
        for (const f of [m.p, m.e]) { f.hitstun = Math.max(f.hitstun, 8); f.action = null; }
        m.numbers.push({ x: STAGE_W / 2, y: 120, text: '⚡ 通电', life: 60, color: '#8ec9c7' });
        logLine(m, '电解池通电：双方短暂麻痹 8 帧');
      }
    }

    // 输入
    const inP = m.mode === 'pvp' ? (inputPlayer || emptyInput()) : (inputPlayer || emptyInput());
    const inE = m.e.isAI ? aiInput(m, m.e) : (inputEnemy || emptyInput());
    if (m.p.ko === false) applyInput(m, m.p, inP);
    if (m.e.ko === false) applyInput(m, m.e, inE);

    // 双方推进
    updateFighter(m, m.p, m.e);
    updateFighter(m, m.e, m.p);

    // 推挤分离
    const pb = pushbox(m.p), eb = pushbox(m.e);
    if (rectsOverlap(pb, eb) && Math.abs(m.p.y - m.e.y) < 105) {
      const overlapW = Math.min(pb.x + pb.w, eb.x + eb.w) - Math.max(pb.x, eb.x);
      const dir = sign((m.p.x + m.p.w / 2) - (m.e.x + m.e.w / 2)) || 1;
      m.p.x = clamp(m.p.x + dir * overlapW / 2, WALL, STAGE_W - WALL - m.p.w);
      m.e.x = clamp(m.e.x - dir * overlapW / 2, WALL, STAGE_W - WALL - m.e.w);
    }

    updateProjectiles(m);
    updateZones(m);

    // 特效
    for (const f of m.fx) { f.x += f.vx; f.y += f.vy; f.vy += 0.14; f.life--; }
    m.fx = m.fx.filter(f => f.life > 0);
    for (const n of m.numbers) { n.y -= 0.65; n.life--; }
    m.numbers = m.numbers.filter(n => n.life > 0);
    m.shake *= 0.8;
    if (m.callout > 0) m.callout--;

    // 记录上帧输入 + 清掉边缘标记
    m.prevIn.p = Object.assign(emptyInput(), inP);
    m.prevIn.e = Object.assign(emptyInput(), inE);

    // 胜负
    if (m.p.stable <= 0 || m.e.stable <= 0) {
      const pw = m.p.stable <= 0, ew = m.e.stable <= 0;
      if (pw && ew) finishRound(m, 'draw', 'ko');
      else finishRound(m, pw ? 'e' : 'p', 'ko');
      return m;
    }
    if (m.mode !== 'training' && m.timer <= 0) {
      const pr = m.p.stable / m.p.max, er = m.e.stable / m.e.max;
      const diff = pr - er;
      finishRound(m, Math.abs(diff) < 1e-6 ? 'draw' : diff > 0 ? 'p' : 'e', 'time');
    }
    return m;
  }

  /* ─────────────────────────── 查询辅助（渲染/UI 用） ─────────────────────────── */
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

  /* ─────────────────────────── 导出 ─────────────────────────── */
  const API = {
    FPS, GROUND, STAGE_W, WALL, GRAVITY, ROUND_SECONDS, ROUNDS_TO_WIN, METER_MAX, GUARD_MAX, JUGGLE_MAX,
    FIGHTERS, STAGES, LIGHT_SETS, AI_LEVELS, COMBO_SCALE,
    makeFighter, createMatch, emptyInput, step, resetRound, finishRound,
    damage, applyInput, aiInput, startAction, hurtbox, pushbox, hitboxWorld, activeHitboxes,
    rectsOverlap, addStatus, hasStatus, mulberry, clamp, roundRatio,
    moveAllowed, pickMove,
    fighterIds: () => Object.keys(FIGHTERS),
    stageIds: () => Object.keys(STAGES)
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.Fight = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
