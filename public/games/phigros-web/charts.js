/* ============================================================
 * Phigros Web · charts.js
 * 三首曲子的谱面 —— 与 audio.js 的音乐结构逐拍对齐
 *
 * 音乐骨架（audio.js）：每小节 4 拍 = 16 个 16 分音符，
 * 一个 16 分音符 = 60/bpm/4 秒，谱面所有时间戳都取该单位的整数倍，
 * 因此节奏必然卡在鼓点上，不需要任何手工对轴。
 *
 * 段落（以 48 小节曲为例）
 *   0–7    intro   单线稀疏 Tap，判定线淡入
 *   8–15   verse   双线交替 Tap/Drag
 *   16–23  build   密度上升 + 判定线开始旋转
 *   24–39  chorus  四线全开，Hold / Flick 登场
 *   40–47  outro   递减收束，末尾一条长 Hold
 * ============================================================ */
(function (root) {
  'use strict';

  const E = root.PhiEngine;
  const B = E.Builder;
  const T = E.CONST.NOTE;

  /* 确定性伪随机（mulberry32），保证同 seed 生成同一谱面 */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- 图形模式库 ----------
   * 每个模式把「连续 n 个 step」映射成若干 note，
   * 返回 [[stepOffset, positionX, type, holdSteps], ...]
   */
  const PAT = {
    // 单侧阶梯
    stairs: function (n, side, dir) {
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push([i * 2, side * (2 + i * 1.1) * dir, T.TAP, 0]);
      }
      return out;
    },
    // 来回横移
    zigzag: function (n, amp) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const k = i % 4;
        const x = [-amp, -amp * 0.35, amp * 0.35, amp][k];
        out.push([i * 2, x, T.TAP, 0]);
      }
      return out;
    },
    // 左右对称双击
    mirror: function (n, amp) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const x = amp * (0.55 + 0.45 * Math.cos(i * 1.1));
        out.push([i * 2, -x, T.TAP, 0]);
        out.push([i * 2, x, T.TAP, 0]);
      }
      return out;
    },
    // 金字塔上行再下行
    pyramid: function (n, amp) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1);
        const x = -amp + 2 * amp * (k < 0.5 ? k * 2 : (1 - k) * 2);
        out.push([i * 2, x, T.TAP, 0]);
      }
      return out;
    },
    // 螺旋：位置与相位同步
    spiral: function (n, amp) {
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push([i * 2, amp * Math.sin(i * 0.9), T.TAP, 0]);
      }
      return out;
    },
    // 长条 + 尾随点
    holdRun: function (n, amp, holdSteps) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const isHold = i % 2 === 0;
        out.push([i * 3, amp * ((i % 3) - 1), isHold ? T.HOLD : T.TAP, isHold ? holdSteps : 0]);
      }
      return out;
    },
    // 拖动串（拖动音符天然成串）
    dragRun: function (n, amp) {
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push([i, amp * Math.sin(i * 0.55), T.DRAG, 0]);
      }
      return out;
    },
    // 甩动点缀
    flick: function (n, amp) {
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push([i * 4, amp * ((i % 2) ? 1 : -1) * (0.7 + 0.3 * i), T.FLICK, 0]);
      }
      return out;
    }
  };

  function pick(list, r) { return list[Math.floor(r() * list.length) % list.length]; }

  /* ---------- 生成一首谱面 ---------- */
  /**
   * @param {object} o
   *  bpm, bars, beatsPerBar, seed,
   *  lineY  : 主判定线的 y（above 用，屏幕下半）
   *  diff   : 1 简单 / 2 普通 / 3 困难
   */
  function build(o) {
    const bpm = o.bpm, bars = o.bars, bpb = o.beatsPerBar || 4;
    const stepDur = 60 / bpm / 4;                 // 一个 16 分音符的秒数
    const stepsPerBar = bpb * 4;
    const r = rng(o.seed || 1234);
    const diff = o.diff || 2;

    // 四条判定线：A(above, 下) B(below, 上) C(above, 更下) D(below, 更上)
    const LA = B.line({ bpm: bpm });
    const LB = B.line({ bpm: bpm });
    const LC = B.line({ bpm: bpm });
    const LD = B.line({ bpm: bpm });
    const lines = [LA, LB, LC, LD];

    const Y_A = 0.30, Y_B = -0.30, Y_C = 0.62, Y_D = -0.62;

    function add(lineIdx, step, x, type, holdSteps, above) {
      const ln = lines[lineIdx];
      const note = B.note(type, step * stepDur, x, {
        holdTime: holdSteps ? holdSteps * stepDur : 0,
        above: above !== false,
        line: lineIdx,
        speed: 1
      });
      ln.notes.push(note);
    }

    // 记录每线已用时间，避免完全叠在同一 step
    const used = [[], [], [], []];
    function free(lineIdx, step) {
      const arr = used[lineIdx];
      for (let i = 0; i < arr.length; i++) if (arr[i] === step) return false;
      arr.push(step);
      return true;
    }

    // 段落边界（按比例，适配不同小节数）
    const seg = {
      introEnd: Math.round(bars * 0.17),
      verseEnd: Math.round(bars * 0.34),
      buildEnd: Math.round(bars * 0.50),
      chorusEnd: Math.round(bars * 0.87)
    };

    /* ---- 判定线动画表 ---- */
    // A：常驻，intro 淡入（这条淡入属于「开场演出」，不随后面的 lead-in 平移，
    //    否则首个音符恰好落在 alpha=0 的那一瞬，判定线不可见也就打不中）
    LA.moves.push(B.mv(0, 1.2, 0, 0.9, 0, Y_A));
    const _fadeIn = B.al(0, 0.5, 0, 1);
    _fadeIn.leadLock = true;
    LA.alphas.push(_fadeIn);
    LA.rotates.push(B.rt(0, 1, 0, 0));

    // B：verse 起出现
    LB.moves.push(B.mv(0, 1, 0, Y_B, 0, Y_B));
    LB.alphas.push(B.al(0, seg.introEnd * bpb * 60 / bpm, 0, 0));
    LB.alphas.push(B.al(seg.introEnd * bpb * 60 / bpm,
      seg.introEnd * bpb * 60 / bpm + 0.6, 0, 1));

    // C / D：chorus 起出现
    const tChorus = seg.buildEnd * bpb * 60 / bpm;
    LC.moves.push(B.mv(0, 0.5, 0, Y_C, 0, Y_C));
    LC.alphas.push(B.al(0, tChorus, 0, 0));
    LC.alphas.push(B.al(tChorus, tChorus + 0.5, 0, 1));
    LD.moves.push(B.mv(0, 0.5, 0, Y_D, 0, Y_D));
    LD.alphas.push(B.al(0, tChorus, 0, 0));
    LD.alphas.push(B.al(tChorus, tChorus + 0.5, 0, 1));

    // chorus 期间 A/B 缓慢摆动 + 旋转，营造"判定线在跳舞"
    const tA = tChorus, tB = seg.chorusEnd * bpb * 60 / bpm;
    LA.moves.push(B.mv(tA, tA + (tB - tA) * 0.5, 0, Y_A, 0.06, Y_A - 0.10));
    LA.moves.push(B.mv(tA + (tB - tA) * 0.5, tB, 0.06, Y_A - 0.10, 0, Y_A));
    LA.rotates.push(B.rt(tA, tA + (tB - tA) * 0.5, 0, -6));
    LA.rotates.push(B.rt(tA + (tB - tA) * 0.5, tB, -6, 0));
    LB.moves.push(B.mv(tA, tA + (tB - tA) * 0.5, 0, Y_B, -0.06, Y_B + 0.10));
    LB.moves.push(B.mv(tA + (tB - tA) * 0.5, tB, -0.06, Y_B + 0.10, 0, Y_B));
    LB.rotates.push(B.rt(tA, tA + (tB - tA) * 0.5, 0, 6));
    LB.rotates.push(B.rt(tA + (tB - tA) * 0.5, tB, 6, 0));

    /* ---- 逐小节铺 Note ---- */
    const density = [0, 0.55, 1, 1.45][diff];   // 密度系数
    const holdSteps = [0, 6, 8, 10][diff];

    for (let bar = 0; bar < bars; bar++) {
      const barStep = bar * stepsPerBar;
      const inIntro = bar < seg.introEnd;
      const inVerse = bar >= seg.introEnd && bar < seg.verseEnd;
      const inBuild = bar >= seg.verseEnd && bar < seg.buildEnd;
      const inChorus = bar >= seg.buildEnd && bar < seg.chorusEnd;
      const inOutro = bar >= seg.chorusEnd;
      const beatStep = stepsPerBar / bpb;    // 4

      if (inIntro) {
        // 每 2 拍一个 Tap，A 线，位置左右小幅
        for (let k = 0; k < bpb; k += 2) {
          const s = barStep + k * beatStep;
          if (!free(0, s)) continue;
          add(0, s, pick([-1.6, -0.6, 0.6, 1.6], r), T.TAP, 0, true);
        }
        // intro 最后一小节加一串 drag 引导
        if (bar === seg.introEnd - 1) {
          const seq = PAT.dragRun(8, 2.2);
          for (let i = 0; i < seq.length; i++) {
            const s = barStep + 8 + seq[i][0] * 1;
            if (!free(1, s)) continue;
            add(1, s, seq[i][1], T.DRAG, 0, false);
          }
        }
        continue;
      }

      if (inVerse) {
        // A 线：4 分音符阶梯；B 线：反向
        for (let k = 0; k < bpb; k++) {
          const s = barStep + k * beatStep;
          const vx = ((bar + k) % 2 === 0 ? -1 : 1) * (1.2 + 1.2 * ((bar + k) % 3) / 2);
          if (free(0, s) && r() < 0.85 * density) {
            add(0, s, vx, T.TAP, 0, true);
          }
          if (free(1, s + 2) && r() < 0.55 * density) {
            add(1, s + 2, -vx, T.TAP, 0, false);
          }
        }
        // 每 4 小节来一组 zigzag
        if (bar % 4 === 3) {
          const seq = PAT.zigzag(6, 3.2);
          for (let i = 0; i < seq.length; i++) {
            const s = barStep + 8 + seq[i][0] * 0.5;
            if (!free(0, s)) continue;
            add(0, s, seq[i][1], T.TAP, 0, true);
          }
        }
        continue;
      }

      if (inBuild) {
        // 密度上升：8 分音符为主，交替 A/B
        for (let k = 0; k < bpb * 2; k++) {
          const s = barStep + k * beatStep * 0.5;
          const onA = k % 2 === 0;
          const li = onA ? 0 : 1;
          if (!free(li, s)) continue;
          if (r() > 0.78 * density + 0.12) continue;
          const x = onA ? -3.4 + (k % 4) * 2.2 : 3.4 - (k % 4) * 2.2;
          add(li, s, x, T.TAP, 0, onA);
        }
        // 段落末尾 2 小节：长条蓄力
        if (bar >= seg.buildEnd - 2 && bar % 1 === 0 && free(0, barStep)) {
          add(0, barStep, 0, T.HOLD, holdSteps, true);
        }
        continue;
      }

      if (inChorus) {
        const phrase = (bar - seg.buildEnd) % 8;
        // 每小节固定 4 个强拍落地，保证骨架
        for (let k = 0; k < bpb; k++) {
          const s = barStep + k * beatStep;
          const li = (bar + k) % 2 === 0 ? 0 : 1;
          if (!free(li, s)) continue;
          add(li, s, ((k % 2) ? 1 : -1) * (2.2 + 1.2 * ((bar + k) % 2)), T.TAP, 0, li === 0);
        }
        // 图案轮换
        const patName = ['mirror', 'pyramid', 'spiral', 'stairs', 'zigzag', 'holdRun', 'mirror', 'dragRun'][phrase];
        if (patName === 'holdRun') {
          const seq = PAT.holdRun(4, 3.0, holdSteps);
          for (let i = 0; i < seq.length; i++) {
            const li = i % 2 === 0 ? 0 : 2;
            const s = barStep + 4 + seq[i][0] * 0.8;
            if (!free(li, s)) continue;
            add(li, s, seq[i][1], seq[i][2], seq[i][3], li === 0);
          }
        } else if (patName === 'dragRun') {
          const seq = PAT.dragRun(10, 3.6);
          for (let i = 0; i < seq.length; i++) {
            const li = i % 2 === 0 ? 1 : 3;
            const s = barStep + 4 + seq[i][0] * 0.8;
            if (!free(li, s)) continue;
            add(li, s, seq[i][1], T.DRAG, 0, li === 0);
          }
        } else if (patName === 'stairs') {
          const seq = PAT.stairs(5, 1, bar % 2 ? 1 : -1);
          for (let i = 0; i < seq.length; i++) {
            const li = i % 2 === 0 ? 0 : 2;
            const s = barStep + 4 + seq[i][0] * 0.9;
            if (!free(li, s)) continue;
            add(li, s, seq[i][1], T.TAP, 0, li === 0);
          }
        } else {
          const fn = PAT[patName];
          const seq = fn(6, 3.2);
          for (let i = 0; i < seq.length; i++) {
            const li = i % 2 === 0 ? 0 : 1;
            const s = barStep + 4 + seq[i][0] * 0.8;
            if (!free(li, s)) continue;
            add(li, s, seq[i][1], seq[i][2] || T.TAP, 0, li === 0);
          }
        }
        // 每 8 小节插一个 Flick 点缀（各难度都保留，保证四种音符齐备）
        if (phrase === 7) {
          const seq = PAT.flick(2, 3.6);
          for (let i = 0; i < seq.length; i++) {
            const s = barStep + 2 + seq[i][0] * 0.6;
            if (!free(3, s)) continue;
            add(3, s, seq[i][1], T.FLICK, 0, false);
          }
        }
        continue;
      }

      // outro：递减
      const left = seg.chorusEnd + (bars - seg.chorusEnd);
      const remain = bars - bar;
      const gap = remain > 4 ? 2 : (remain > 2 ? 4 : 8);
      for (let k = 0; k < bpb; k += gap / 2) {
        const s = barStep + k * beatStep;
        const li = k % 2 === 0 ? 0 : 1;
        if (!free(li, s)) continue;
        add(li, s, (k % 2 ? 1 : -1) * 1.5, T.TAP, 0, li === 0);
      }
      // 最后一小节：一条终章长条
      if (bar === bars - 1) {
        const s = barStep + 8;
        if (free(0, s)) add(0, s, 0, T.HOLD, stepsPerBar - 8, true);
      }
    }

    // 全体时间轴后移，给出起手准备时间（音符与判定线动画一起移动）
    const LEAD = 2.4;
    lines.forEach(function (ln) {
      ln.notes.forEach(function (n) { n.time += LEAD; });
      ln.moves.forEach(function (e) { e.startTime += LEAD; e.endTime += LEAD; });
      ln.rotates.forEach(function (e) { e.startTime += LEAD; e.endTime += LEAD; });
      ln.alphas.forEach(function (e) {
        if (e.leadLock) return;          // 开场淡入留在原位
        e.startTime += LEAD; e.endTime += LEAD;
      });
    });

    // 收尾：末尾 1.2 秒判定线淡出
    const dur = LEAD + bars * stepsPerBar * stepDur;
    LA.alphas.push(B.al(dur - 1.2, dur, 1, 0));
    LB.alphas.push(B.al(dur - 1.2, dur, 1, 0));
    LC.alphas.push(B.al(dur - 1.2, dur, 1, 0));
    LD.alphas.push(B.al(dur - 1.2, dur, 1, 0));

    // 清理空的线（避免无谓绘制）
    const usedIds = [0, 1, 2, 3].filter(function (i) { return lines[i].notes.length > 0; });
    const remap = {};
    usedIds.forEach(function (oldI, newI) { remap[oldI] = newI; });
    const outLines = usedIds.map(function (oldI) {
      const ln = lines[oldI];
      ln.notes.forEach(function (n) { n.line = remap[oldI]; });
      return ln;
    });

    return {
      meta: o.meta || {},
      lines: outLines,
      duration: dur,
      total: outLines.reduce(function (s, l) { return s + l.notes.length; }, 0)
    };
  }

  /* ---------- 三首曲子 ---------- */
  const CHARTS = {
    neon: function () {
      return build({
        bpm: 168, bars: 48, beatsPerBar: 4, seed: 0x9e3779b9, diff: 2,
        meta: {
          id: 'neon', title: 'NEON CASCADE', artist: 'Iodine Studio',
          bpm: 168, diff: 'Insane', level: 13, color: '#4ff0ff',
          desc: '霓虹瀑布 · 双线交替起手，chorus 四线全开的入门向 13 级'
        }
      });
    },
    prism: function () {
      return build({
        bpm: 152, bars: 44, beatsPerBar: 4, seed: 0x517cc1b7, diff: 1,
        meta: {
          id: 'prism', title: 'PRISM DRIFT', artist: 'Iodine Studio',
          bpm: 152, diff: 'Hard', level: 9, color: '#ff5fd2',
          desc: '棱镜漂移 · 慢速宽间距，专治手忙脚乱，9 级入门首选'
        }
      });
    },
    solstice: function () {
      return build({
        bpm: 186, bars: 52, beatsPerBar: 4, seed: 0x2545f491, diff: 3,
        meta: {
          id: 'solstice', title: 'SOLSTICE BREAKER', artist: 'Iodine Studio',
          bpm: 186, diff: 'Insane+', level: 15, color: '#ffd166',
          desc: '至日破晓 · 186 BPM 高速流，Hold 与 Flick 混排，15 级硬核'
        }
      });
    }
  };

  root.PhiCharts = {
    build: build,
    list: [
      { id: 'neon', make: CHARTS.neon },
      { id: 'prism', make: CHARTS.prism },
      { id: 'solstice', make: CHARTS.solstice }
    ],
    make: function (id) {
      const f = CHARTS[id] || CHARTS.neon;
      return f();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
