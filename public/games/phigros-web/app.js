/* ============================================================
 * Phigros Web · app.js
 * 状态机：选曲 → 演奏 → 结算；输入分发；本地存档
 * ============================================================ */
(function () {
  'use strict';

  const A = window.PhiAudio;
  const E = window.PhiEngine;
  const R = window.PhiRender;
  const CH = window.PhiCharts;

  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  const STORE_KEY = 'phiweb.scores.v1';

  const S = {
    state: 'menu',        // menu | playing | paused | result
    trackId: null,
    chart: null,
    audio: null,
    render: null,
    t: 0,
    lastWall: 0,
    score: 0,
    auto: false,
    failGuard: 0
  };

  /* ---------- 存档 ---------- */
  function loadScores() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function saveScore(id, r) {
    try {
      const all = loadScores();
      const prev = all[id];
      if (!prev || r.score > prev.score) {
        all[id] = { score: r.score, rank: r.rank, acc: r.acc, maxCombo: r.maxCombo, at: Date.now() };
        localStorage.setItem(STORE_KEY, JSON.stringify(all));
      }
      return loadScores();
    } catch (e) { return loadScores(); }
  }

  /* ---------- 曲目列表 ---------- */
  const TRACK_META = {
    neon: { title: 'NEON CASCADE', artist: 'Iodine Studio', diff: 'Insane', level: 13, bpm: 168, color: '#4ff0ff', desc: '霓虹瀑布 · 双线交替起手，chorus 四线全开的入门向 13 级' },
    prism: { title: 'PRISM DRIFT', artist: 'Iodine Studio', diff: 'Hard', level: 9, bpm: 152, color: '#ff5fd2', desc: '棱镜漂移 · 慢速宽间距，专治手忙脚乱，9 级入门首选' },
    solstice: { title: 'SOLSTICE BREAKER', artist: 'Iodine Studio', diff: 'Insane+', level: 15, bpm: 186, color: '#ffd166', desc: '至日破晓 · 186 BPM 高速流，Hold 与 Flick 混排，15 级硬核' }
  };
  const ORDER = ['neon', 'prism', 'solstice'];

  function buildMenu() {
    const grid = $('#trackGrid');
    const scores = loadScores();
    grid.innerHTML = '';
    ORDER.forEach(function (id) {
      const m = TRACK_META[id];
      const sc = scores[id];
      const card = document.createElement('button');
      card.className = 'track-card';
      card.type = 'button';
      card.style.setProperty('--tc', m.color);
      card.innerHTML =
        '<div class="tc-cover"><span class="tc-lv">Lv.' + m.level + '</span>' +
        '<span class="tc-diff">' + m.diff + '</span></div>' +
        '<div class="tc-body">' +
        '<div class="tc-title">' + m.title + '</div>' +
        '<div class="tc-sub">' + m.artist + ' · BPM ' + m.bpm + '</div>' +
        '<div class="tc-desc">' + m.desc + '</div>' +
        '<div class="tc-score">' + (sc
          ? '<b class="rank rank-' + sc.rank + '">' + sc.rank + '</b> ' +
            String(sc.score).padStart(7, '0') + ' <span>最高连击 ' + sc.maxCombo + '</span>'
          : '<span class="tc-none">尚未挑战</span>') + '</div>' +
        '</div>';
      card.addEventListener('click', function () { startTrack(id); });
      grid.appendChild(card);
    });
  }

  /* ---------- 开始 ---------- */
  function startTrack(id) {
    const m = TRACK_META[id];
    document.documentElement.style.setProperty('--accent', m.color);
    $('#hudTitle').textContent = m.title;
    $('#hudDiff').textContent = m.diff + ' Lv.' + m.level;

    S.trackId = id;
    S.chart = new E.Chart(CH.make(id));
    S.chart.reset();
    S.score = 0;
    S.t = 0;

    if (!S.render) S.render = new R.Render($('#game'));
    S.render.resize();
    S.render.particles.length = 0;
    S.render.rings.length = 0;
    S.render.judgeText = null;

    if (!S.audio) S.audio = A.engine;
    S.audio.init && S.audio.init();
    S.audio.startTrack(id);

    show('game');
    S.state = 'playing';
    S.lastWall = performance.now();
    requestAnimationFrame(loop);
  }

  function show(name) {
    $$('.screen').forEach(function (s) { s.classList.remove('on'); });
    $('#screen-' + name).classList.add('on');
  }

  /* ---------- 主循环 ---------- */
  function loop(now) {
    if (S.state === 'menu' || S.state === 'result') return;
    const dts = Math.min(0.05, (now - S.lastWall) / 1000);
    S.lastWall = now;

    if (S.state === 'playing') {
      const t = S.audio.now();
      S.t = t;
      if (t < 0) {
        drawFrame(0, dts, true);
        requestAnimationFrame(loop);
        return;
      }
      const evs = S.chart.tick(t, S.auto, dts);
      handleEvents(evs, t);
      drawFrame(t, dts, false);

      // 结束条件：音乐播完 + 留 1.5 秒余韵
      if (t > S.audio.duration() + 1.2) {
        finish();
        return;
      }
    } else if (S.state === 'paused') {
      drawFrame(S.t, 0, false);
    }
    requestAnimationFrame(loop);
  }

  function drawFrame(t, dts, pre) {
    const rn = S.render, cv = rn.cv;
    rn.resize();
    rn.drawBg(pre ? 0 : t, TRACK_META[S.trackId]);
    if (!pre && S.chart) {
      rn.drawLines(S.chart, t);
      rn.drawNotes(S.chart, t, TRACK_META[S.trackId]);
      rn.updateFx(dts);
      rn.drawFx();
      rn.drawHud(S.chart.combo, rn.judgeText, S.score);
    } else {
      // READY 倒计时
      const ctx = rn.ctx, w = rn.w, h = rn.h;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(w * 0.10) + 'px "Rajdhani", system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.shadowColor = TRACK_META[S.trackId].color;
      ctx.shadowBlur = 28;
      ctx.fillText('READY', w / 2, h / 2 - h * 0.02);
      ctx.restore();
    }
    // 顶部进度条
    if (!pre && S.audio) {
      const dur = S.audio.duration() || 1;
      const k = Math.max(0, Math.min(1, t / dur));
      const ctx = rn.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(0, 0, rn.w, 3);
      ctx.fillStyle = TRACK_META[S.trackId].color;
      ctx.fillRect(0, 0, rn.w * k, 3);
      ctx.restore();
    }
  }

  /* ---------- 判定事件 ---------- */
  const JUDGE_STYLE = {
    perfect: { text: 'PERFECT', color: '#ffe066' },
    good: { text: 'GOOD', color: '#66e0ff' },
    bad: { text: 'BAD', color: '#b08cff' },
    miss: { text: 'MISS', color: '#8b93a7' }
  };

  function handleEvents(evs, t) {
    if (!evs || !evs.length) return;
    const rn = S.render;
    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i];
      const n = ev.note;
      const st = JUDGE_STYLE[ev.grade] || JUDGE_STYLE.miss;

      // 位置：用当前时间反算 note 屏幕点
      const p = R.notePos(S.chart, n, Math.max(t, n.time), rn.view);
      rn.burst(p.x, p.y, st.color, ev.grade === 'perfect');

      rn.judgeText = { text: st.text, t: 0, color: st.color };
      if (ev.grade === 'perfect' || ev.grade === 'good') rn.comboPop = 1;

      if (S.audio && S.audio.sfx) {
        if (ev.grade === 'perfect') S.audio.sfx('perfect');
        else if (ev.grade === 'good') S.audio.sfx('tap');
        else if (ev.grade === 'miss') S.audio.sfx('miss');
        else S.audio.sfx('tap');
      }
      // 实时分数
      const res = S.chart.result();
      S.score = res.score;
    }
  }

  /* ---------- 结算 ---------- */
  function finish() {
    S.state = 'result';
    const res = S.chart.result();
    saveScore(S.trackId, res);

    const m = TRACK_META[S.trackId];
    const box = $('#resultBox');
    box.innerHTML =
      '<div class="rs-rank rank-' + res.rank + '">' + res.rank + '</div>' +
      '<div class="rs-title">' + m.title + '</div>' +
      '<div class="rs-score">' + String(res.score).padStart(7, '0') + '</div>' +
      '<div class="rs-acc">准确率 ' + (res.acc * 100).toFixed(2) + '%' +
      (res.allPerfect ? ' · <b class="ap">ALL PERFECT</b>'
        : res.fullCombo ? ' · <b class="fc">FULL COMBO</b>' : '') + '</div>' +
      '<div class="rs-grid">' +
      '<div><span>PERFECT</span><b>' + res.counts.perfect + '</b></div>' +
      '<div><span>GOOD</span><b>' + res.counts.good + '</b></div>' +
      '<div><span>BAD</span><b>' + res.counts.bad + '</b></div>' +
      '<div><span>MISS</span><b>' + res.counts.miss + '</b></div>' +
      '<div><span>MAX COMBO</span><b>' + res.maxCombo + '</b></div>' +
      '<div><span>NOTES</span><b>' + res.total + '</b></div>' +
      '</div>' +
      '<div class="rs-actions">' +
      '<button type="button" class="btn ghost" id="rsBack">返回选曲</button>' +
      '<button type="button" class="btn primary" id="rsRetry">再来一次</button>' +
      '</div>';

    $('#rsBack').addEventListener('click', backToMenu);
    $('#rsRetry').addEventListener('click', function () { startTrack(S.trackId); });

    show('result');
    if (S.audio) S.audio.stop && S.audio.stop();
  }

  function backToMenu() {
    S.state = 'menu';
    if (S.audio) S.audio.stop && S.audio.stop();
    buildMenu();
    show('menu');
  }

  /* ---------- 输入 ---------- */
  function bindInput() {
    const cv = $('#game');
    const pointers = {};   // pid -> { x, y, moved }

    function pos(ev) {
      const r = cv.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }

    cv.addEventListener('pointerdown', function (ev) {
      if (S.state !== 'playing') return;
      cv.setPointerCapture && cv.setPointerCapture(ev.pointerId);
      const p = pos(ev);
      pointers[ev.pointerId] = { x: p.x, y: p.y, moved: 0, dyUp: 0 };
      const t = S.audio.now();
      if (t < 0) return;
      handleEvents(S.chart.input('down', ev.pointerId, p.x, p.y, t, S.render.view, { moved: 0 }), t);
    });

    cv.addEventListener('pointermove', function (ev) {
      if (S.state !== 'playing') return;
      const st = pointers[ev.pointerId];
      if (!st) return;
      const p = pos(ev);
      const dx = p.x - st.x, dy = p.y - st.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      st.moved += dist;
      st.dyUp = -dy;
      st.x = p.x; st.y = p.y;
      const t = S.audio.now();
      if (t < 0) return;
      // DRAG 需要持续触发；FLICK 需要足够位移
      handleEvents(S.chart.input('move', ev.pointerId, p.x, p.y, t, S.render.view, {
        moved: st.moved, dyUp: st.dyUp
      }), t);
      st.moved = 0;   // 每帧清零，避免累积误判
    });

    function up(ev) {
      const st = pointers[ev.pointerId];
      delete pointers[ev.pointerId];
      if (S.state !== 'playing') return;
      const t = S.audio.now();
      if (t < 0) return;
      handleEvents(S.chart.input('up', ev.pointerId, 0, 0, t, S.render.view, {}), t);
    }
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', up);

    // 键盘：空格暂停、R 重开、Esc 返回
    window.addEventListener('keydown', function (ev) {
      if (S.state === 'playing' && (ev.code === 'Space' || ev.code === 'Escape')) {
        ev.preventDefault();
        S.state = 'paused';
        if (S.audio) S.audio.pause && S.audio.pause();
        $('#pauseMask').classList.add('on');
      } else if (S.state === 'paused' && (ev.code === 'Space' || ev.code === 'Escape')) {
        ev.preventDefault();
        $('#pauseMask').classList.remove('on');
        if (S.audio) S.audio.resume && S.audio.resume();
        S.state = 'playing';
        S.lastWall = performance.now();
        requestAnimationFrame(loop);
      }
      if (ev.code === 'KeyR' && (S.state === 'playing' || S.state === 'paused')) {
        $('#pauseMask').classList.remove('on');
        startTrack(S.trackId);
      }
    });
  }

  /* ---------- 按钮 ---------- */
  function bindButtons() {
    $('#btnAuto').addEventListener('click', function () {
      S.auto = !S.auto;
      this.classList.toggle('on', S.auto);
      this.textContent = S.auto ? '自动演奏：开' : '自动演奏：关';
    });
    $('#btnQuit').addEventListener('click', function () {
      $('#pauseMask').classList.remove('on');
      backToMenu();
    });
    $('#btnResume').addEventListener('click', function () {
      $('#pauseMask').classList.remove('on');
      if (S.audio) S.audio.resume && S.audio.resume();
      S.state = 'playing';
      S.lastWall = performance.now();
      requestAnimationFrame(loop);
    });
    $('#btnRestart').addEventListener('click', function () {
      $('#pauseMask').classList.remove('on');
      startTrack(S.trackId);
    });
    $('#btnMenu').addEventListener('click', function () {
      $('#pauseMask').classList.remove('on');
      backToMenu();
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    buildMenu();
    bindInput();
    bindButtons();
    show('menu');
    window.addEventListener('resize', function () {
      if (S.render) S.render.resize();
    });
    // 调试钩子（仅本地）
    if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) && location.search.indexOf('test') >= 0) {
      window.__phi = {
        S: S,
        start: startTrack,
        menu: backToMenu,
        finish: finish,
        tick: function (n) {
          for (let i = 0; i < n; i++) {
            const t = S.audio.now();
            if (t > 0) handleEvents(S.chart.tick(t, S.auto, 1 / 60), t);
          }
        },
        chart: function () { return S.chart; },
        render: function () { return S.render; }
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
