/* ============================================================
 * Phigros Web · audio.js
 * 程序化音乐合成器 —— 零音频素材、无版权风险、与谱面严格同步
 *
 * 设计要点
 *  1. 唯一时钟是 AudioContext.currentTime，视觉侧全部由它反推，
 *     因此音画误差恒定在 5ms 内（远小于 Perfect 判定窗 80ms）。
 *  2. lookahead 调度：每 25ms 扫一次，把 120ms 内该响的音符排进音频线程。
 *     不用 setInterval 直接发声，避免主线程卡顿造成节奏抖动。
 *  3. 曲目 = 和弦进行 + 鼓型 + 贝斯型 + 主导音色 + BPM，
 *     换参数就是另一首曲子，无需任何外部资源。
 * ============================================================ */
(function (root) {
  'use strict';

  const LOOKAHEAD = 0.12;      // 秒：提前排程窗口
  const SCAN_MS = 25;          // 毫秒：扫描间隔

  /* ---------- 音高工具 ---------- */
  // 以 A4=440 为基准，note 名转频率
  const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(name) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
    if (!m) return 440;
    let semi = NOTE_BASE[m[1]];
    if (m[2] === '#') semi += 1;
    if (m[2] === 'b') semi -= 1;
    const oct = parseInt(m[3], 10);
    return 440 * Math.pow(2, (semi - 9) / 12 + (oct - 4));
  }
  // 音阶内取第 i 级（degree 可为负、可越八度）
  function scaleNote(scale, degree, baseOct) {
    const len = scale.length;
    let oct = baseOct + Math.floor(degree / len);
    let idx = ((degree % len) + len) % len;
    return scale[idx] + oct;
  }

  /* ---------- 曲目定义 ---------- */
  // 每首曲子：bpm、小节数、和弦进行（每小节一个）、鼓型、贝斯型、主音色
  const TRACKS = {
    neon: {
      bpm: 168, bars: 48, beatsPerBar: 4,
      key: 3, scale: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],   // C 小调
      prog: [0, 0, 5, 5, 3, 3, 4, 4, 2, 2, 5, 5, 0, 0, 4, 4], // 和弦级数循环
      drum: 'dnb', bass: 'roll', lead: 1, pad: 1, arp: 1,
      color: '#4ff0ff'
    },
    prism: {
      bpm: 152, bars: 44, beatsPerBar: 4,
      key: 2, scale: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],      // A 小调
      prog: [0, 5, 3, 4, 0, 5, 6, 4],
      drum: 'four', bass: 'octave', lead: 2, pad: 1, arp: 2,
      color: '#ff5fd2'
    },
    solstice: {
      bpm: 186, bars: 52, beatsPerBar: 4,
      key: 7, scale: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],     // E 小调
      prog: [0, 3, 4, 5, 0, 3, 6, 4],
      drum: 'break', bass: 'roll', lead: 3, pad: 2, arp: 1,
      color: '#ffd166'
    }
  };

  /* ---------- 合成器 ---------- */
  function AudioEngine() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.timer = null;
    this.track = null;
    this.startAt = 0;       // 曲目 0 秒对应的 AudioContext 时间
    this.cursorBar = 0;     // 已排程到第几小节（按 16 分音符推进）
    this.step = 0;          // 全局 16 分音符序号
    this.muted = false;
    this.volume = 0.8;
    this.paused = false;    // 主动暂停时不要被 ensure() 意外唤醒
  }

  AudioEngine.prototype.ensure = function () {
    if (this.ctx) {
      // 主动暂停期间保持 suspend，否则时间轴会被唤醒
      if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume();
      return this.ctx;
    }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC({ latencyHint: 'interactive' });
    const master = ctx.createGain();
    master.gain.value = this.volume;
    // 轻微压缩，避免多声部叠加爆音
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.12;
    master.connect(comp);
    comp.connect(ctx.destination);

    const music = ctx.createGain();
    music.gain.value = 0.9;
    music.connect(master);
    const sfx = ctx.createGain();
    sfx.gain.value = 0.5;
    sfx.connect(master);

    this.ctx = ctx;
    this.master = master;
    this.musicGain = music;
    this.sfxGain = sfx;
    return ctx;
  };

  AudioEngine.prototype.setVolume = function (v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  };

  AudioEngine.prototype.mute = function (on) {
    this.muted = !!on;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  };

  /* ---------- 基础波形 ---------- */
  // 打击类：极短包络
  AudioEngine.prototype.hit = function (t, type, gain) {
    const ctx = this.ctx;
    if (!ctx) return;
    const g = ctx.createGain();
    g.connect(this.musicGain);
    const gv = gain == null ? 1 : gain;

    if (type === 'kick') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.10);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1.05 * gv, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.30);
      o.connect(g);
      o.start(t); o.stop(t + 0.32);
      return;
    }
    if (type === 'snare') {
      const n = this.noiseSource(0.20);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.9;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 900;
      n.connect(bp); bp.connect(hp); hp.connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.62 * gv, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      n.start(t); n.stop(t + 0.2);
      // 加一点体声
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.24 * gv, t);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
      o.connect(g2); g2.connect(this.musicGain);
      o.start(t); o.stop(t + 0.12);
      return;
    }
    if (type === 'hat') {
      const n = this.noiseSource(0.06);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 7600;
      n.connect(hp); hp.connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.30 * gv, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      n.start(t); n.stop(t + 0.07);
      return;
    }
    if (type === 'openhat') {
      const n = this.noiseSource(0.30);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 6800;
      n.connect(hp); hp.connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.26 * gv, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      n.start(t); n.stop(t + 0.3);
      return;
    }
    if (type === 'clap') {
      const n = this.noiseSource(0.18);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 1.4;
      n.connect(bp); bp.connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.42 * gv, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      n.start(t); n.stop(t + 0.18);
      return;
    }
  };

  AudioEngine.prototype.noiseSource = function (dur) {
    const ctx = this.ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  };

  // 有音高音符：pluck 风格
  AudioEngine.prototype.tone = function (t, f, dur, timbre, gain, dest) {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = ctx.createGain();
    out.connect(dest || this.musicGain);
    const gv = gain == null ? 0.5 : gain;

    let type = 'sawtooth', detune = 0, lp = 2600, attack = 0.006, release = 0.22, q = 1;
    if (timbre === 'bass') { type = 'square'; lp = 620; attack = 0.004; release = 0.10; gv *= 0.9; }
    else if (timbre === 'pad') { type = 'sawtooth'; lp = 1500; attack = 0.16; release = 0.55; gv *= 0.45; detune = 7; }
    else if (timbre === 'arp') { type = 'triangle'; lp = 5200; attack = 0.003; release = 0.12; gv *= 0.42; }
    else if (timbre === 'lead') { type = 'sawtooth'; lp = 4200; attack = 0.005; release = 0.20; gv *= 0.55; detune = 5; }
    else if (timbre === 'bell') { type = 'sine'; lp = 9000; attack = 0.002; release = 0.9; gv *= 0.35; }

    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(lp, t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(180, lp * 0.42), t + Math.max(0.08, dur * 0.9));
    filt.Q.value = q;
    filt.connect(out);

    const mk = (det) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      if (det) o.detune.value = det;
      o.connect(filt);
      o.start(t);
      o.stop(t + dur + release + 0.05);
      return o;
    };
    mk(0);
    if (detune) { mk(detune); mk(-detune); }

    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(gv, t + attack);
    out.gain.setValueAtTime(gv, t + Math.max(attack + 0.01, dur));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
  };

  /* ---------- 曲目调度 ---------- */
  AudioEngine.prototype.startTrack = function (id) {
    const ctx = this.ensure();
    if (!ctx) return null;
    this.track = TRACKS[id] || TRACKS.neon;
    this.trackId = id;
    this.step = 0;
    this.cursorBar = 0;
    this.paused = false;
    this.startAt = ctx.currentTime + 0.35;   // 留 350ms 缓冲，等第一帧渲染
    this.stopScheduler();
    const self = this;
    this.timer = setInterval(function () { self.schedule(); }, SCAN_MS);
    this.schedule();
    return this.track;
  };

  AudioEngine.prototype.stopScheduler = function () {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  };

  AudioEngine.prototype.stop = function () {
    this.stopScheduler();
    this.paused = false;
    this.track = null;
  };

  /* ---------- 暂停 / 恢复 ----------
   * AudioContext.suspend() 会冻结 currentTime，而 now() = currentTime - startAt，
   * 所以时间轴、已调度的音符、lookahead 窗口会一起静止，恢复后严丝合缝地接上。
   * 只需在暂停时停掉调度器省电，恢复时重新起调度。
   */
  AudioEngine.prototype.pause = function () {
    if (!this.ctx || this.paused) return false;
    this.paused = true;
    this.stopScheduler();
    const p = this.ctx.suspend();
    if (p && p.catch) p.catch(function () {});
    return true;
  };

  AudioEngine.prototype.resume = function () {
    if (!this.ctx || !this.paused) return false;
    this.paused = false;
    const self = this;
    const restart = function () {
      if (!self.track || self.paused) return;
      if (!self.timer) {
        self.timer = setInterval(function () { self.schedule(); }, SCAN_MS);
      }
      self.schedule();
    };
    const p = this.ctx.resume();
    if (p && p.then) p.then(restart, restart);
    else restart();
    return true;
  };

  // 曲内时间（秒）；配合 offset 使用
  AudioEngine.prototype.now = function () {
    if (!this.ctx || !this.track) return 0;
    return this.ctx.currentTime - this.startAt;
  };

  AudioEngine.prototype.stepDur = function () {
    // 一个 16 分音符的秒数
    const t = this.track;
    return (60 / t.bpm) / 4;
  };

  AudioEngine.prototype.totalSteps = function () {
    const t = this.track;
    return t.bars * t.beatsPerBar * 4;
  };

  AudioEngine.prototype.duration = function () {
    return this.totalSteps() * this.stepDur();
  };

  // 把 16 分音符序号换成曲内秒数
  AudioEngine.prototype.stepTime = function (step) {
    return step * this.stepDur();
  };

  AudioEngine.prototype.schedule = function () {
    if (!this.ctx || !this.track) return;
    const t = this.track;
    const sd = this.stepDur();
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    const total = this.totalSteps();

    while (this.step < total) {
      const when = this.startAt + this.step * sd;
      if (when > horizon) break;
      this.renderStep(this.step, when);
      this.step++;
    }
    if (this.step >= total && this.timer) this.stopScheduler();
  };

  // 单个 16 分音符位置上的所有声部
  AudioEngine.prototype.renderStep = function (step, when) {
    const t = this.track;
    const bpb = t.beatsPerBar;
    const bar = Math.floor(step / (bpb * 4));
    const inBar = step % (bpb * 4);
    const beat = Math.floor(inBar / 4);
    const sub = inBar % 4;

    const chordDeg = t.prog[bar % t.prog.length];
    const root = scaleNote(t.scale, chordDeg, t.key);
    const third = scaleNote(t.scale, chordDeg + 2, t.key);
    const fifth = scaleNote(t.scale, chordDeg + 4, t.key);
    const sd = this.stepDur();

    /* --- 鼓 --- */
    const d = t.drum;
    const isBarStart = inBar === 0;
    const isBeat = sub === 0;
    if (d === 'dnb') {
      if (inBar === 0 || inBar === 10) this.hit(when, 'kick', 1);
      if (inBar === 4 || inBar === 12) this.hit(when, 'snare', 1);
      if (sub === 2) this.hit(when, 'hat', 0.7);
      if (inBar % 2 === 0 && bar % 4 === 3) this.hit(when, 'openhat', 0.5);
    } else if (d === 'four') {
      if (isBeat) this.hit(when, 'kick', 1);
      if (inBar === 4 || inBar === 12) this.hit(when, 'clap', 1);
      if (sub === 2) this.hit(when, 'openhat', 0.55);
      else if (sub === 0) this.hit(when, 'hat', 0.4);
    } else { // break
      if (inBar === 0 || inBar === 6 || inBar === 10) this.hit(when, 'kick', 1);
      if (inBar === 4 || inBar === 12) this.hit(when, 'snare', 1);
      if (sub !== 0) this.hit(when, 'hat', 0.42);
      if (inBar === 15 && bar % 2 === 1) this.hit(when, 'snare', 0.6);
    }

    /* --- 贝斯 --- */
    const b = t.bass;
    if (b === 'roll') {
      if (sub === 0 || sub === 3) this.tone(when, freq(root + '2'), sd * 0.9, 'bass', 0.5);
      if (sub === 2 && bar % 2 === 1) this.tone(when, freq(third + '2'), sd * 0.7, 'bass', 0.34);
    } else { // octave
      if (sub === 0) this.tone(when, freq(root + '2'), sd * 1.6, 'bass', 0.52);
      if (sub === 2) this.tone(when, freq(root + '3'), sd * 0.8, 'bass', 0.36);
    }

    /* --- Pad：每小节头 --- */
    if (t.pad && isBarStart) {
      const barsLeft = 1;
      this.tone(when, freq(root + '4'), sd * 14 * barsLeft, 'pad', 0.20);
      this.tone(when, freq(third + '4'), sd * 14 * barsLeft, 'pad', 0.16);
      this.tone(when, freq(fifth + '4'), sd * 14 * barsLeft, 'pad', 0.16);
    }

    /* --- Arp：8 分音符琶音 --- */
    if (t.arp && sub % 2 === 0) {
      const seq = [0, 2, 4, 7, 4, 2];
      const k = (inBar / 2) % seq.length;
      const deg = chordDeg + seq[k];
      const oct = 5 + (k >= 4 ? 1 : 0);
      const timbre = t.arp === 2 ? 'bell' : 'arp';
      this.tone(when, freq(scaleNote(t.scale, deg, oct)), sd * 1.2, timbre, 0.26);
    }

    /* --- Lead：主旋律，每两小节一句 --- */
    if (t.lead && bar % 2 === 0) {
      const motif = [0, 4, 2, 4, 7, 4, 2, 0];
      if (sub === 0 && inBar % 8 === 0) {
        const k = (inBar / 8 + bar) % motif.length;
        this.tone(when, freq(scaleNote(t.scale, chordDeg + motif[k], 5)),
          sd * 6, t.lead === 3 ? 'lead' : (t.lead === 2 ? 'bell' : 'lead'), 0.32);
      }
    }
  };

  /* ---------- 打击音效（打 Note 时）---------- */
  AudioEngine.prototype.sfx = function (kind) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.001;
    const g = ctx.createGain();
    g.connect(this.sfxGain);

    if (kind === 'tap') {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(1180, t);
      o.frequency.exponentialRampToValueAtTime(760, t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.34, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g); o.start(t); o.stop(t + 0.09);
    } else if (kind === 'perfect') {
      this.tone(t, 1568, 0.03, 'bell', 0.5, this.sfxGain);
      this.tone(t + 0.012, 2349, 0.05, 'bell', 0.36, this.sfxGain);
    } else if (kind === 'flick') {
      const n = this.noiseSource(0.10);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 2;
      n.connect(bp); bp.connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.30, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
      n.start(t); n.stop(t + 0.12);
    } else if (kind === 'miss') {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(80, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g); o.start(t); o.stop(t + 0.16);
    }
  };

  /* ---------- 导出 ---------- */
  root.PhiAudio = {
    engine: new AudioEngine(),
    TRACKS: TRACKS,
    freq: freq,
    AudioEngine: AudioEngine
  };
})(typeof window !== 'undefined' ? window : globalThis);
