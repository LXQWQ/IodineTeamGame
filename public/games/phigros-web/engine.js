/* ============================================================
 * Phigros Web · engine.js
 * 谱面数据模型 + 判定核心（无渲染、无音频，便于单测）
 *
 * 坐标规范（与 Phigros 官方一致）
 *  · 「宽度单位」= 0.05625 × 渲染宽度  → positionX=±8 约到屏幕边缘
 *  · 「高度单位」= 0.6    × 渲染高度
 *  · 判定线自带 (x, y, rotate, alpha)，x/y ∈ [-1, 1] 为半屏比例
 *
 * 判定思路：把指针坐标反变换到判定线局部系，
 *   横向 → positionX，纵向 → 时间差，于是「点了哪个 Note」纯属几何问题，
 *   与 Note 是否已经渲染过、渲染在几帧上完全无关（不会因掉帧误判）。
 * ============================================================ */
(function (root) {
  'use strict';

  /* ---------- 常量 ---------- */
  const C = {
    PERFECT: 0.080,     // ±80ms
    GOOD: 0.160,        // ±160ms
    BAD: 0.180,         // ±180ms（不给分、断连）
    HIT_WIDTH: 0.90,    // 横向判定半径（宽度单位）
    SPEED_K: 0.52,      // 高度单位 → 每秒下落比例的系数
    W_UNIT: 0.05625,
    H_UNIT: 0.6,
    HOLD_TAIL_GRACE: 0.12,  // 长条尾判宽限
    NOTE: { TAP: 1, DRAG: 2, HOLD: 3, FLICK: 4 }
  };

  /* ---------- Note ---------- */
  function Note(o) {
    this.type = o.type | 0;
    this.time = +o.time;                       // 秒
    this.holdTime = +(o.holdTime || 0);        // 秒（仅 hold）
    this.positionX = +o.positionX;
    this.speed = o.speed == null ? 1 : +o.speed;
    this.above = o.above !== false;
    this.line = o.line | 0;
    this.state = 0;      // 0 待打 / 1 命中 / 2 已判失败
    this.judge = '';     // perfect / good / bad / miss
    this.holdActive = false;
    this.holdStart = 0;
    this.holdDone = 0;   // 已按住的秒数
    this.holdKey = 0;    // 按住它的指针 id
  }
  Note.prototype.endTime = function () {
    return this.time + this.holdTime;
  };

  /* ---------- JudgeLine ---------- */
  function JudgeLine(o, idx) {
    this.idx = idx;
    this.bpm = +o.bpm || 120;
    // 保留谱面构建器塞进来的 Note（早期版本这里直接置空，导致整张谱面 0 音符）
    this.notes = (o.notes || []).map(function (n) {
      if (n instanceof Note) { n.line = idx; return n; }
      const nn = new Note(n);
      nn.line = idx;
      return nn;
    });
    this.moves = (o.moves || []).slice();
    this.rotates = (o.rotates || []).slice();
    this.alphas = (o.alphas || []).slice();
    // 运行态
    this.x = 0; this.y = 0; this.rot = 0; this.alpha = 1;
    this._applyAt(0);
  }

  // 线性插值取事件值
  function sampleArr(list, t, def) {
    if (!list || !list.length) return def;
    let prev = null;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (t < e.startTime) {
        if (!prev) return e.from != null ? e.from : (e.start != null ? e.start : def);
        return lerpEvent(prev, e, t);
      }
      prev = e;
      if (t >= e.startTime && t <= e.endTime) return lerpEvent(e, e, t, true);
    }
    const last = list[list.length - 1];
    return last.to != null ? last.to : (last.end != null ? last.end : def);
  }
  function lerpEvent(a, b, t, same) {
    const a0 = a.startTime, a1 = a.endTime;
    const v0 = a.to != null ? a.from : a.start;
    const v1 = a.to != null ? a.to : a.end;
    if (same) {
      if (a1 <= a0) return v1;
      const k = Math.max(0, Math.min(1, (t - a0) / (a1 - a0)));
      return v0 + (v1 - v0) * k;
    }
    // b 的起始值 = a 的结束值（保证连续）
    const b0 = b.to != null ? b.from : b.start;
    if (b.startTime <= b.endTime) {
      // 从 a1 时刻的 a.end 平滑到 b end
      const gap = Math.max(1e-6, b.endTime - a.endTime);
      const k = Math.max(0, Math.min(1, (t - a.endTime) / gap));
      return v1 + (b.to != null ? b.to - v1 : b.end - v1) * k;
    }
    return v1;
  }

  JudgeLine.prototype._applyAt = function (t) {
    const mv = this.moves, rt = this.rotates, al = this.alphas;
    if (mv.length) {
      this.x = sampleArr(mv.map(function (e) { return { startTime: e.startTime, endTime: e.endTime, from: e.x0, to: e.x1 }; }), t, 0);
      this.y = sampleArr(mv.map(function (e) { return { startTime: e.startTime, endTime: e.endTime, from: e.y0, to: e.y1 }; }), t, 0);
    }
    if (rt.length) {
      this.rot = sampleArr(rt.map(function (e) { return { startTime: e.startTime, endTime: e.endTime, from: e.from, to: e.to }; }), t, 0);
    }
    if (al.length) {
      this.alpha = sampleArr(al.map(function (e) { return { startTime: e.startTime, endTime: e.endTime, from: e.from, to: e.to }; }), t, 1);
    }
  };
  JudgeLine.prototype.update = function (t) { this._applyAt(t); };

  /* ---------- Chart ---------- */
  function Chart(def) {
    this.meta = def.meta || {};
    this.lines = (def.lines || []).map(function (l, i) { return new JudgeLine(l, i); });
    this.duration = +def.duration || 0;
    this.notes = [];
    const self = this;
    this.lines.forEach(function (line, li) {
      line.notes.forEach(function (n) { self.notes.push(n); });
    });
    this.notes.sort(function (a, b) { return a.time - b.time || a.positionX - b.positionX; });
    this.total = this.notes.length;
    this.reset();
  }

  Chart.prototype.reset = function () {
    this.combo = 0;
    this.maxCombo = 0;
    this.counts = { perfect: 0, good: 0, bad: 0, miss: 0 };
    this.judged = 0;
    this.pointer = 0;      // 早退指针：下一个待判定 note 的下标（用于快速 miss 检测）
    this.notes.forEach(function (n) {
      n.state = 0; n.judge = ''; n.holdActive = false; n.holdDone = 0; n.holdKey = 0;
    });
    this.lines.forEach(function (l) { l.update(0); });
  };

  /* ---------- 几何：屏幕坐标 ↔ 判定线局部系 ---------- */
  // 返回 { u: 横向偏移(宽度单位), v: 纵向偏移(高度单位), ok }
  Chart.prototype.toLocal = function (line, px, py, view) {
    const cx = view.cx + line.x * view.halfW;
    const cy = view.cy + line.y * view.halfH;
    const dx = px - cx, dy = py - cy;
    const a = -line.rot * Math.PI / 180;
    const ca = Math.cos(a), sa = Math.sin(a);
    const lx = dx * ca - dy * sa;
    const ly = dx * sa + dy * ca;     // 屏幕向下为正
    return {
      u: lx / (C.W_UNIT * view.w),
      v: -ly / (C.H_UNIT * view.h),   // 向上为正 = above 方向
      dist: Math.abs(ly)
    };
  };

  /* ---------- 判定窗口 ---------- */
  function gradeOf(dt) {
    const ad = Math.abs(dt);
    if (ad <= C.PERFECT) return 'perfect';
    if (ad <= C.GOOD) return 'good';
    if (ad <= C.BAD) return 'bad';
    return 'miss';
  }
  Chart.prototype.grade = gradeOf;
  Chart.prototype.GRADE = C;

  /* ---------- 击中一个 Note ---------- */
  Chart.prototype._applyJudge = function (n, g, out) {
    n.judge = g;
    n.state = (g === 'miss' || g === 'bad') ? 2 : 1;
    if (g === 'perfect' || g === 'good') {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.counts[g]++;
    } else {
      this.combo = 0;
      this.counts[g]++;
    }
    this.judged++;
    if (out) out.push({ note: n, grade: g, combo: this.combo });
  };

  /* ---------- 指针按下 / 移动 ---------- */
  /**
   * @param {string} phase 'down' | 'move' | 'up'
   * @param {number} pid   指针 id
   * @param {number} px,py 屏幕坐标（CSS 像素）
   * @param {number} t     当前曲内时间（秒）
   * @param {object} view  { w, h, cx, cy, halfW, halfH }
   * @param {object} opt   { moved: 本次移动的屏幕距离, dyUp: 向上分量 }
   */
  Chart.prototype.input = function (phase, pid, px, py, t, view, opt) {
    const events = [];
    opt = opt || {};
    const notes = this.notes;

    if (phase === 'up') {
      // 松手：检查是否打断了正在按的 hold
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        if (n.type === C.NOTE.HOLD && n.state === 1 && n.holdActive && n.holdKey === pid) {
          n.holdActive = false;
          n.holdKey = 0;
          if (n.holdDone < n.holdTime * 0.55) {
            // 早松手 → 断连但不算 miss 扣分（Phigros 里长条松开只算 Bad）
            n.holdDone = 0;
            this.combo = 0;
            this.counts.bad++;
            n.judge = 'bad';
            events.push({ note: n, grade: 'bad', combo: 0 });
          }
        }
      }
      return events;
    }

    // 找到所有候选（该线、横向命中、时间窗内）
    let best = null, bestScore = 1e9;
    for (let li = 0; li < this.lines.length; li++) {
      const line = this.lines[li];
      if (line.alpha < 0.05) continue;
      const loc = this.toLocal(line, px, py, view);
      // 只跳过明显在谱面外的点击（±8 是谱面横向范围）；精确命中由下方 du 判断
      if (Math.abs(loc.u) > 9) continue;
      // 纵向：note 的高度 → 时间差
      for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        if (n.line !== li || n.state === 2) continue;
        if (n.type === C.NOTE.HOLD && n.state === 1) continue;
        // 时间窗：以纵向反推的时间差为准，但也要用真实时间做上限保护
        const dtscreen = loc.v / (Math.max(0.35, n.speed) * C.SPEED_K);   // 秒
        const dt = n.time - t;
        // 用真实时间判分（更稳定），屏幕位置只做「选哪个」的权重
        const ad = Math.abs(dt);
        if (ad > C.BAD) continue;
        if (!n.above && loc.v > 0) continue;
        if (n.above && loc.v < 0) continue;
        const du = Math.abs(n.positionX - loc.u);
        if (du > C.HIT_WIDTH) continue;
        // 综合分：时间为主、横向为辅
        const score = ad * 10 + du;
        if (score < bestScore) { bestScore = score; best = n; }
      }
    }

    if (!best) return events;

    // 类型特化
    if (best.type === C.NOTE.FLICK) {
      if (phase !== 'move' || (opt.moved || 0) < 24) return events;
    } else if (best.type === C.NOTE.HOLD) {
      if (phase !== 'down') return events;
      best.holdActive = true;
      best.holdKey = pid;
      best.holdStart = t;
      best.judge = 'perfect';
      best.state = 1;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.counts.perfect++;
      this.judged++;
      events.push({ note: best, grade: 'perfect', combo: this.combo, holdStart: true });
      return events;
    } else if (best.type === C.NOTE.DRAG) {
      // 拖动音符：命中窗口放宽
      const g = Math.abs(best.time - t) <= C.GOOD ? 'perfect' : 'good';
      this._applyJudge(best, g, events);
      return events;
    }

    const g = gradeOf(best.time - t);
    if (g === 'miss') return events;   // 不在窗内不处理
    this._applyJudge(best, g, events);
    return events;
  };

  /* ---------- 每帧推进 ---------- */
  /**
   * @param {number} t 当前曲内时间
   * @param {boolean} auto 自动模式（演示/挂机）
   * @param {number} dts 距上一帧的秒数
   */
  Chart.prototype.tick = function (t, auto, dts) {
    const events = [];
    const notes = this.notes;
    dts = dts || 0;

    for (let li = 0; li < this.lines.length; li++) this.lines[li].update(t);

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];

      // 长条：结算按住进度
      if (n.type === C.NOTE.HOLD && n.state === 1 && n.holdActive) {
        n.holdDone = t - n.holdStart;
        if (n.holdDone >= n.holdTime - C.HOLD_TAIL_GRACE) {
          n.holdActive = false;
          n.state = 1;
          n.judge = 'perfect';
          this.counts.perfect++;
          this.combo++;
          if (this.combo > this.maxCombo) this.maxCombo = this.combo;
          this.judged++;
          events.push({ note: n, grade: 'perfect', combo: this.combo, holdEnd: true });
        }
        continue;
      }

      if (n.state !== 0) continue;

      // 自动模式：到点直接 perfect
      if (auto) {
        if (t >= n.time) {
          if (n.type === C.NOTE.HOLD) {
            n.state = 1; n.holdActive = true; n.holdStart = t; n.holdKey = -1;
            this.counts.perfect++; this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            this.judged++;
            events.push({ note: n, grade: 'perfect', combo: this.combo, holdStart: true });
          } else {
            this._applyJudge(n, 'perfect', events);
          }
        }
        continue;
      }

      // 超时未打 → miss
      const limit = n.time + C.BAD;
      if (t > limit) {
        this._applyJudge(n, 'miss', events);
      }
    }
    return events;
  };

  /* ---------- 分数（Phigros 100 万制）---------- */
  Chart.prototype.result = function () {
    const total = this.total || 1;
    const acc = (this.counts.perfect + this.counts.good * 0.65) / total;
    const base = 900000 * acc;
    const comboPart = 100000 * (this.maxCombo / total);
    const score = Math.round(Math.max(0, Math.min(1000000, base + comboPart)));
    let rank = 'F';
    if (score >= 1000000) rank = 'Phi';
    else if (score >= 960000) rank = 'V';
    else if (score >= 920000) rank = 'S';
    else if (score >= 880000) rank = 'A';
    else if (score >= 820000) rank = 'B';
    else if (score >= 700000) rank = 'C';
    return {
      score: score,
      rank: rank,
      acc: acc,
      maxCombo: this.maxCombo,
      counts: this.counts,
      total: this.total,
      fullCombo: this.counts.miss === 0 && this.counts.bad === 0,
      allPerfect: this.counts.perfect === this.total
    };
  };

  /* ---------- 谱面构建工具（供 charts.js 使用）---------- */
  const Builder = {
    note: function (type, time, positionX, opt) {
      opt = opt || {};
      return new Note({
        type: type, time: time, positionX: positionX,
        holdTime: opt.holdTime || 0,
        speed: opt.speed == null ? 1 : opt.speed,
        above: opt.above !== false,
        line: opt.line | 0
      });
    },
    line: function (o) {
      o = o || {};
      return {
        bpm: o.bpm || 120,
        notes: [],
        moves: o.moves || [],
        rotates: o.rotates || [],
        alphas: o.alphas || []
      };
    },
    // 便捷事件构造
    mv: function (t0, t1, x0, y0, x1, y1) {
      return { startTime: t0, endTime: t1, x0: x0, y0: y0, x1: x1, y1: y1 };
    },
    rt: function (t0, t1, a0, a1) {
      return { startTime: t0, endTime: t1, from: a0, to: a1 };
    },
    al: function (t0, t1, a0, a1) {
      return { startTime: t0, endTime: t1, from: a0, to: a1 };
    }
  };

  /* ---------- 导出 ---------- */
  root.PhiEngine = {
    Chart: Chart,
    JudgeLine: JudgeLine,
    Note: Note,
    Builder: Builder,
    CONST: C,
    gradeOf: gradeOf
  };
})(typeof window !== 'undefined' ? window : globalThis);
