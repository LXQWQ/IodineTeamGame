/* ============================================================
 * Phigros Web · render.js
 * Canvas 2D 渲染：背景、判定线、Note、判定特效、Combo
 *
 * 只有一件事需要小心：Note 的屏幕位置必须与 engine.js 的
 * toLocal() 严格互逆，否则「看得见的没判定、判定了的看不见」。
 * 逆变换公式见 notePos() 上方注释。
 * ============================================================ */
(function (root) {
  'use strict';

  const E = root.PhiEngine;
  const C = E.CONST;
  const T = C.NOTE;

  function Render(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = 0; this.h = 0;
    this.particles = [];
    this.rings = [];
    this.judgeText = null;      // { text, t, color }
    this.comboPop = 0;
    this.bgT = 0;
    this.stars = [];
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random(), y: Math.random(),
        r: 0.4 + Math.random() * 1.6,
        sp: 0.02 + Math.random() * 0.08
      });
    }
    this.resize();
  }

  Render.prototype.resize = function () {
    const cv = this.cv;
    const rect = cv.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width));
    const h = Math.max(320, Math.round(rect.height));
    const oldW = this.w, oldH = this.h;
    this.w = w; this.h = h;
    cv.width = Math.round(w * this.dpr);
    cv.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.view = { w: w, h: h, cx: w / 2, cy: h / 2, halfW: w / 2, halfH: h / 2 };
    return oldW !== w || oldH !== h;
  };

  /* 严格逆变换：与 engine.toLocal() 互为逆运算 */
  function notePos(chart, n, t, view) {
    const line = chart.lines[n.line];
    const cx = view.cx + line.x * view.halfW;
    const cy = view.cy + line.y * view.halfH;
    const spd = Math.max(0.35, n.speed);
    const dt = n.time - t;
    const vy = dt * spd * C.SPEED_K * (C.H_UNIT * view.h);   // 距判定线的像素距离
    const up = (n.above ? 1 : -1) * vy;                       // 向上为正
    const ly = -up;                                           // 屏幕向下为正
    const lx = n.positionX * (C.W_UNIT * view.w);
    const a = -line.rot * Math.PI / 180;
    const ca = Math.cos(a), sa = Math.sin(a);
    // [lx ]   [ ca  -sa ] [dx]
    // [ly ] = [ sa   ca ] [dy]  的逆
    const dx = lx * ca + ly * sa;
    const dy = -lx * sa + ly * ca;
    return { x: cx + dx, y: cy + dy, rot: line.rot, alpha: line.alpha, line: line };
  }

  /* ---------- 背景 ---------- */
  Render.prototype.drawBg = function (t, meta) {
    const ctx = this.ctx, w = this.w, h = this.h;
    const color = (meta && meta.color) || '#4ff0ff';

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#05060b');
    g.addColorStop(0.5, '#080a13');
    g.addColorStop(1, '#04050a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 中央径向辉光
    const rg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.55);
    rg.addColorStop(0, hexA(color, 0.10));
    rg.addColorStop(0.55, hexA(color, 0.03));
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);

    // 星点
    ctx.save();
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const y = ((s.y + t * s.sp * 0.06) % 1);
      ctx.globalAlpha = 0.20 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.7 + i));
      ctx.fillStyle = '#cfe8ff';
      ctx.beginPath();
      ctx.arc(s.x * w, y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 节奏脉冲：每拍闪一下
    const pulse = 0.5 + 0.5 * Math.sin(t * (meta && meta.bpm ? meta.bpm / 60 * Math.PI * 2 : 4));
    ctx.save();
    ctx.globalAlpha = 0.05 + 0.05 * pulse;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  /* ---------- 判定线 ---------- */
  Render.prototype.drawLines = function (chart, t) {
    const ctx = this.ctx, v = this.view;
    for (let i = 0; i < chart.lines.length; i++) {
      const line = chart.lines[i];
      line.update(t);
      if (line.alpha <= 0.02) continue;
      const cx = v.cx + line.x * v.halfW;
      const cy = v.cy + line.y * v.halfH;
      const half = v.w * 0.62;

      ctx.save();
      ctx.globalAlpha = line.alpha;
      ctx.translate(cx, cy);
      ctx.rotate(-line.rot * Math.PI / 180);

      // 主亮线
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-half, 0);
      ctx.lineTo(half, 0);
      ctx.stroke();

      // 外发光宽线
      ctx.shadowBlur = 0;
      ctx.globalAlpha = line.alpha * 0.20;
      ctx.strokeStyle = 'rgba(160,220,255,0.8)';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(-half, 0);
      ctx.lineTo(half, 0);
      ctx.stroke();

      // 两端判定点
      ctx.globalAlpha = line.alpha;
      ctx.fillStyle = '#ffffff';
      [-half, half].forEach(function (x) {
        ctx.beginPath();
        ctx.arc(x, 0, 3.4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  };

  /* ---------- Note ---------- */
  Render.prototype.drawNotes = function (chart, t, meta) {
    const ctx = this.ctx, v = this.view;
    const color = (meta && meta.color) || '#4ff0ff';
    const horizon = v.h * 1.6;      // 超出这个距离的不画

    for (let i = 0; i < chart.notes.length; i++) {
      const n = chart.notes[i];
      if (n.state === 2 && n.judge === 'miss') continue;
      const dt = n.time - t;
      // 裁剪：太远不画；已命中且超过 0.5 秒不画
      if (dt > 2.6) continue;
      if (n.state === 1 && dt < -0.9) continue;

      const p = notePos(chart, n, t, v);
      if (p.y < -horizon || p.y > horizon) continue;

      // 近距淡入（出场时闪一下）
      let a = 1;
      if (dt > 2.2) a = Math.max(0, (2.6 - dt) / 0.4);
      const nw = v.w * 0.052;
      const nh = v.h * 0.0155;

      ctx.save();
      ctx.globalAlpha = a * Math.max(0.15, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);

      // Note 描边色：above 用主题色，below 用互补白
      const fill = n.above ? color : '#ffffff';
      const edge = n.above ? '#ffffff' : color;

      if (n.type === T.HOLD) {
        // 长条：本体 + 尾部
        const endY = p.y + (n.above ? -1 : 1) * (n.holdTime * (n.speed) * C.SPEED_K * C.H_UNIT * v.h);
        const hh = Math.abs(endY - p.y) + nh * 2;
        const topY = Math.min(p.y, endY) - nh;
        ctx.globalAlpha = a * Math.max(0.12, p.alpha) * 0.85;
        roundRect(ctx, -nw * 0.5, topY - p.y + nh * 0, nw, hh, nw * 0.28);
        ctx.fillStyle = hexA(fill, 0.42);
        ctx.fill();
        ctx.strokeStyle = hexA(edge, 0.6);
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 头部
        ctx.globalAlpha = a * Math.max(0.15, p.alpha);
        roundRect(ctx, -nw * 0.62, -nh, nw * 1.24, nh * 2, nh * 0.55);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else if (n.type === T.DRAG) {
        roundRect(ctx, -nw * 0.72, -nh * 0.62, nw * 1.44, nh * 1.24, nh * 0.62);
        ctx.fillStyle = hexA(fill, 0.55);
        ctx.fill();
        ctx.strokeStyle = hexA(edge, 0.85);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (n.type === T.FLICK) {
        // 甩动：菱形 + 向上箭头
        ctx.beginPath();
        ctx.moveTo(0, -nh * 1.7);
        ctx.lineTo(nw * 0.62, 0);
        ctx.lineTo(0, nh * 1.7);
        ctx.lineTo(-nw * 0.62, 0);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -nh * 0.9);
        ctx.lineTo(0, nh * 0.9);
        ctx.strokeStyle = hexA('#0a0e18', 0.65);
        ctx.lineWidth = 2.2;
        ctx.stroke();
      } else {
        // Tap 圆角条
        roundRect(ctx, -nw * 0.62, -nh, nw * 1.24, nh * 2, nh * 0.55);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  /* ---------- 判定特效 ---------- */
  Render.prototype.burst = function (x, y, color, big) {
    const n = big ? 16 : 9;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (big ? 200 : 130) * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0, max: 0.32 + Math.random() * 0.22,
        color: color, size: 2 + Math.random() * 2.4
      });
    }
    this.rings.push({ x: x, y: y, life: 0, max: big ? 0.34 : 0.26, color: color, r0: big ? 26 : 16 });
  };

  Render.prototype.updateFx = function (dts) {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dts;
      if (p.life >= p.max) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dts;
      p.y += p.vy * dts;
      p.vx *= 0.92; p.vy *= 0.92;
      p.vy += 90 * dts;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dts;
      if (r.life >= r.max) this.rings.splice(i, 1);
    }
    if (this.judgeText) {
      this.judgeText.t += dts;
      if (this.judgeText.t > 0.55) this.judgeText = null;
    }
    if (this.comboPop > 0) this.comboPop = Math.max(0, this.comboPop - dts * 3.2);
  };

  Render.prototype.drawFx = function () {
    const ctx = this.ctx;
    ctx.save();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = k * 0.95;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      const k = r.life / r.max;
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 + k * 54, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  /* ---------- 判定文字 / Combo ---------- */
  Render.prototype.drawHud = function (combo, judgeText, score) {
    const ctx = this.ctx, w = this.w, h = this.h;

    // Combo
    if (combo >= 3) {
      const pop = 1 + this.comboPop * 0.06;
      ctx.save();
      ctx.translate(w / 2, h * 0.20);
      ctx.scale(pop, pop);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(w * 0.085) + 'px "Rajdhani", "Noto Sans SC", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.shadowColor = 'rgba(120,220,255,0.75)';
      ctx.shadowBlur = 24;
      ctx.fillText(String(combo), 0, 0);
      ctx.shadowBlur = 0;
      ctx.font = '600 ' + Math.round(w * 0.026) + 'px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(200,230,255,0.62)';
      ctx.fillText('COMBO', 0, w * 0.062);
      ctx.restore();
    }

    // 判定文字
    if (judgeText) {
      const k = judgeText.t / 0.55;
      ctx.save();
      ctx.globalAlpha = 1 - k * 0.85;
      ctx.translate(w / 2, h * 0.30 - k * h * 0.02);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(w * 0.040) + 'px "Rajdhani", system-ui, sans-serif';
      ctx.fillStyle = judgeText.color;
      ctx.shadowColor = judgeText.color;
      ctx.shadowBlur = 16;
      ctx.fillText(judgeText.text, 0, 0);
      ctx.restore();
    }

    // 右上角分数
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = '700 ' + Math.round(w * 0.032) + 'px "Rajdhani", monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(String(Math.round(score)).padStart(7, '0'), w - w * 0.04, h * 0.03);
    ctx.restore();
  };

  /* ---------- 工具 ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function hexA(hex, a) {
    if (hex.charAt(0) !== '#') return hex;
    let s = hex.slice(1);
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    const r = parseInt(s.slice(0, 2), 16),
      g = parseInt(s.slice(2, 4), 16),
      b = parseInt(s.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  root.PhiRender = {
    Render: Render,
    notePos: notePos,
    hexA: hexA
  };
})(typeof window !== 'undefined' ? window : globalThis);
