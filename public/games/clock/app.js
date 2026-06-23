// ========== 北京时间 ==========
function updateBeijing() {
  const now = new Date();
  const bj = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const parts = bj.toISOString().split('T')[1].split('.')[0].split(':');
  document.getElementById('beijingTime').innerHTML =
    parts[0] + '<span class="blink">:</span>' + parts[1] + '<span class="blink">:</span>' + parts[2];
  const opts = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  document.getElementById('beijingDate').textContent =
    new Date(bj.toISOString().split('T')[0] + 'T00:00:00Z').toLocaleDateString('zh-CN', opts);
}

// ========== 正计时 ==========
let upStart = null;
let upInterval = null;

function formatTime(ms) {
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function updateCountUp() {
  if (!upStart) return;
  const elapsed = Date.now() - upStart;
  document.getElementById('countUp').textContent = formatTime(elapsed);
}

function startCountUp() {
  const input = document.getElementById('startTime').value;
  if (input) {
    upStart = new Date(input).getTime();
    document.getElementById('countUpStatus').textContent = '从 ' + input.replace('T', ' ') + ' 开始正计时';
  } else {
    upStart = Date.now();
    document.getElementById('countUpStatus').textContent = '从当前时间开始正计时';
  }
  if (upInterval) clearInterval(upInterval);
  updateCountUp();
  upInterval = setInterval(updateCountUp, 200);
}

function resetCountUp() {
  if (upInterval) clearInterval(upInterval);
  upInterval = null;
  upStart = null;
  document.getElementById('countUp').textContent = '00:00:00';
  document.getElementById('countUpStatus').textContent = '已重置';
}

document.getElementById('btnStartUp').addEventListener('click', startCountUp);
document.getElementById('btnResetUp').addEventListener('click', resetCountUp);

// ========== 倒计时 ==========
let downMode = 'target';
let downTarget = null;
let downPaused = false;
let downInterval = null;
let downEl = document.getElementById('countDown');
let downStatus = document.getElementById('countDownStatus');

function updateCountDown() {
  if (downPaused) return;
  if (!downTarget) return;
  const diff = downTarget - Date.now();
  if (diff <= 0) {
    downEl.textContent = '00:00:00';
    downEl.className = 'card-time danger';
    downStatus.textContent = '&#x1F514; 倒计时结束！';
    if (downInterval) { clearInterval(downInterval); downInterval = null; }
    return;
  }
  downEl.textContent = formatTime(diff);
  downEl.className = 'card-time' + (diff < 60000 ? ' danger' : diff < 300000 ? ' warning' : '');
}

function switchMode(mode) {
  downMode = mode;
  document.getElementById('tabTarget').classList.toggle('active', mode === 'target');
  document.getElementById('tabDuration').classList.toggle('active', mode === 'duration');
  document.getElementById('targetLabel').classList.toggle('hidden', mode !== 'target');
  document.getElementById('durationInputs').classList.toggle('hidden', mode !== 'duration');
  resetCountDown();
}

function startCountDown() {
  let t;
  if (downMode === 'target') {
    const input = document.getElementById('targetTime').value;
    if (!input) { downStatus.textContent = '请先设置目标时间'; return; }
    t = new Date(input).getTime();
    if (isNaN(t)) { downStatus.textContent = '时间格式无效'; return; }
    downStatus.textContent = '倒计时至 ' + input.replace('T', ' ');
  } else {
    const h = parseInt(document.getElementById('durHours').value) || 0;
    const m = parseInt(document.getElementById('durMinutes').value) || 0;
    const s = parseInt(document.getElementById('durSeconds').value) || 0;
    if (h === 0 && m === 0 && s === 0) {
      downStatus.textContent = '请设置持续时长'; return;
    }
    t = Date.now() + h * 3600000 + m * 60000 + s * 1000;
    downStatus.textContent = '倒计时 ' + h + '时' + m + '分' + s + '秒';
  }
  downTarget = t;
  downPaused = false;
  downEl.className = 'card-time';
  if (downInterval) clearInterval(downInterval);
  updateCountDown();
  if (downTarget > Date.now()) {
    downInterval = setInterval(updateCountDown, 200);
  }
}

function stopCountDown() {
  if (!downTarget) return;
  downPaused = true;
  if (downInterval) { clearInterval(downInterval); downInterval = null; }
  downStatus.textContent = '已暂停';
}

function resetCountDown() {
  if (downInterval) { clearInterval(downInterval); downInterval = null; }
  downTarget = null;
  downPaused = false;
  downEl.textContent = '00:00:00';
  downEl.className = 'card-time';
  downStatus.textContent = '已重置';
}

document.getElementById('tabTarget').addEventListener('click', () => switchMode('target'));
document.getElementById('tabDuration').addEventListener('click', () => switchMode('duration'));
document.getElementById('btnStartDown').addEventListener('click', startCountDown);
document.getElementById('btnStopDown').addEventListener('click', stopCountDown);
document.getElementById('btnResetDown').addEventListener('click', resetCountDown);

// ========== 初始化 ==========
function init() {
  updateBeijing();
  setInterval(updateBeijing, 1000);
  // 默认倒计时设为 3 小时
  document.getElementById('durHours').value = 3;
  const def = new Date(Date.now() + 3600000);
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('targetTime').value =
    def.getFullYear() + '-' + pad(def.getMonth()+1) + '-' + pad(def.getDate()) + 'T' +
    pad(def.getHours()) + ':' + pad(def.getMinutes());
}

init();