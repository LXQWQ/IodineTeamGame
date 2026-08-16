/**
 * main.js — IodineScope 主入口
 * OpenDesign UI 重构版：公式检索 → 横滚结果 → 3D 渲染 → 详情展示
 */
import { parseCIF } from './cif.js';
import { buildCrystal, parseFormulaSum } from './crystal.js';
import { elementOf } from './periodic.js';
import { Scene3D } from './scene.js';
import { loadIndex, searchIndex, parseFormulaInput } from './search.js';
import {
  $, $$, initParticles, initRipple, renderChips, buildQuickElements,
  renderResultsStrip, renderInfoPanel, renderAtomDetail, toast, fadeIn
} from './ui.js';

/* ---------------- 状态 ---------------- */
const state = {
  queryEls: [],        // [{el, count}]
  matchMode: 'exact',
  activeId: null,
  results: [],
  currentCrystal: null,
  currentMeta: null,
  cellSize: 1,         // 0 = 自适应（双击当前超胞按钮恢复）；默认 1³，与顶栏高亮一致
  showCellBox: true
};

/**
 * 自适应显示范围（参照 Diamond 打开 CIF 的默认行为：
 * 显示扩展结构使每种 Wyckoff 环境的原子对称完整可见）
 * 目标原子数 ~100-250：小晶胞 → 3³，中等 → 2³，大晶胞 → 1³
 */
function autoCellSize(meta) {
  const total = Object.values(meta.counts || {}).reduce((a, b) => a + b, 0);
  if (total <= 12) return 3;
  if (total <= 40) return 2;
  return 1;
}

/* ---------------- 初始化 ---------------- */
const scene = new Scene3D($('#scene-container'), {
  onHoverAtom: (at) => onHoverAtom(at),
  onSelectAtom: (at) => onSelectAtom(at),
  onMeasureEnd: (a, b) => {
    const d = Math.hypot(a.cart[0] - b.cart[0], a.cart[1] - b.cart[1], a.cart[2] - b.cart[2]);
    toast(`${a.element}–${b.element} = ${d.toFixed(3)} Å`, 'ok');
    $('#btnMeasure').classList.remove('active');
  }
});
// 调试接口（读取渲染状态）
window.__iodine = { get scene() { return scene; } };

initParticles($('#bg'));
initRipple();

let indexData = null;

async function boot() {
  try {
    indexData = await loadIndex();
    $('#dbBadge').textContent = `● 本地 CIF 库 · ${indexData.structures.length}`;
    $('#resultCount').textContent = indexData.structures.length;
    state.results = indexData.structures;
    renderStrip();
    buildRecommend();
    renderChips($('#chipWrap'), state.queryEls, syncFromChips);
    buildQuickElements($('.search-panel'), state.queryEls, syncFromChips);
    // 默认选中第一个结构
    if (indexData.structures.length) {
      const first = indexData.structures.find(s => s.name.includes('氯化钠'))
        || indexData.structures[0];
      onPick(first);
    }
    setTimeout(() => {
      $('#loader').classList.add('done');
      fadeIn($('.search-panel'), 120);
      fadeIn($('.viewer-area'), 200);
      fadeIn($('.detail-panel'), 300);
      toast('晶体数据库就绪', 'ok');
    }, 700);
  } catch (err) {
    console.error(err);
    $('#loader').querySelector('.loader-sub').textContent =
      '数据库加载失败：' + err.message + '（请通过本地服务器打开，如 python -m http.server）';
  }
}

/* ---------------- 检索 ---------------- */

function syncFromChips() {
  $('#qInput').value = state.queryEls
    .map(q => q.count > 1 ? q.el + q.count : q.el).join(' ');
  runSearch();
}

function runSearch() {
  if (!indexData) return;
  // 输入框解析 → queryEls（chips 计数为公式计量语义）
  const parsed = parseFormulaInput($('#qInput').value);
  if (Object.keys(parsed).length) {
    state.queryEls = Object.entries(parsed).map(([el, count]) => ({ el, count }));
    renderChips($('#chipWrap'), state.queryEls, syncFromChips);
  }
  const rangeVal = parseInt($('#atom-range').value, 10);
  const results = searchIndex({
    formulaCounts: Object.fromEntries(state.queryEls.map(q => [q.el, q.count || 1])),
    matchMode: state.matchMode,
    totalMin: rangeVal,
    totalMax: Infinity,
    system: $('#system-select').value,
    keyword: $('#keyword-input').value
  }, 300);
  state.results = results;
  renderStrip();
}

function renderStrip() {
  renderResultsStrip($('#resultsStrip'), state.results, state.activeId, state.matchMode, onPick);
  $('#resultCount').textContent = indexData ? indexData.structures.length : '…';
  $('#resultsMeta').textContent = `${state.results.length} 条匹配记录`;
}

/* ---------------- 结构装载 ---------------- */

async function onPick(meta) {
  if (!meta) return;
  state.activeId = meta.id;
  showLoading('正在解析晶体结构…');
  try {
    const resp = await fetch(`data/cif/${meta.id}.cif`);
    if (!resp.ok) throw new Error('CIF 文件不存在: ' + meta.id);
    const text = await resp.text();
    await new Promise((r) => setTimeout(r, 30));

    const cif = parseCIF(text, meta.id);
    showCrystal(cif, meta);
  } catch (err) {
    console.error(err);
    showLoading(false);
    toast('加载失败：' + err.message, 'err');
  }
}

/**
 * 通用渲染入口（本地 CIF 与碘队服务器 CIF 共用）
 * @param {object} cif parseCIF 输出
 * @param {{id:string, name:string, formula?:string, counts?:object}} meta
 */
function showCrystal(cif, meta) {
  if (cif.ops.length <= 1 && !cif.sgNum) {
    throw new Error('该 CIF 缺少对称操作信息，无法完整还原晶胞');
  }
  const crystal = buildCrystal(cif, { supercell: state.cellSize || autoCellSize(meta), bondFactor: 1.08 });
  renderCrystal(crystal, cif, meta);
}

/** 渲染已构建的晶体（本地/服务器 CIF 共用；超胞切换等重渲染走这里，不再重新取文件） */
function renderCrystal(crystal, cif, meta) {
  state.currentCif = cif;
  state.currentCrystal = crystal;
  state.currentMeta = meta;

  scene.setCrystal(crystal);
  scene.setStyle($('.segbtn[data-render].active')?.dataset.render || 'ballstick');
  scene.setShowLabels($('#chkLabels').checked);
  scene.setAutoRotate($('#chkRot').checked);

  // 顶栏 + 详情 + 图例
  $('#activeName').textContent = meta.name;
  $('#activeFormula').innerHTML = pretty(meta.formula || cif.formulaSum);
  crystal.coordination = computeCoordination(crystal);
  renderInfoPanel($('#info-body'), meta, crystal);
  renderLegend(crystal.counts);
  renderStrip();

  // 数据源徽标：本地库 / 碘队服务器（云端）
  if (meta.source === 'server') {
    $('#dbBadge').textContent = `● 碘队服务器 · COD ${meta.id}`;
    $('#dbBadge').classList.add('cloud');
  } else {
    $('#dbBadge').textContent = indexData
      ? `● 本地 CIF 库 · ${indexData.structures.length}`
      : '● 本地 CIF 库';
    $('#dbBadge').classList.remove('cloud');
  }

  // 晶胞边框
  const box = scene._group.getObjectByName('cellbox');
  if (box) box.visible = state.showCellBox;
  showLoading(false);
}

/** 按当前超胞设置用内存中的 CIF 重建晶体（服务器来源的结构没有本地文件，不能重新 fetch） */
function rebuildCurrent() {
  if (!state.currentCif || !state.currentMeta) return;
  const crystal = buildCrystal(state.currentCif, {
    supercell: state.cellSize || autoCellSize(state.currentMeta),
    bondFactor: 1.08
  });
  renderCrystal(crystal, state.currentCif, state.currentMeta);
}

/* ---------------- 碘队服务器查询（Cloudflare Worker 代理 COD）---------------- */
// ★ 碘队服务器域名（用户已部署）
const IODINE_SERVER = 'https://cod.iteamgame.dpdns.org';
const IODINE_MAX = 40;

async function serverSearch() {
  const q = $('#qInput').value.trim();
  if (!q) { toast('请先输入查询条件（如 Fe2O3、NaCl）', 'err'); return; }
  if (IODINE_SERVER.includes('YOUR-DOMAIN')) {
    toast('请先在 js/main.js 配置碘队服务器域名', 'err');
    return;
  }
  // 单元素（如 "B"）在 COD 里匹配十几万条，搜索会超时/超限——提示用化学式
  const isSingleElement = /^[A-Z][a-z]?$/.test(q);
  $('#serverStatus').textContent = isSingleElement
    ? '单元素查询范围极广（可能超时），建议用化学式，如 B6、Fe2O3'
    : '正在查询碘队服务器…';
  $('#serverList').innerHTML = '<div class="server-empty">查询中…</div>';
  $('#serverModal').classList.remove('hide');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000); // 25s 超时
  try {
    const resp = await fetch(`${IODINE_SERVER}/search?q=${encodeURIComponent(q)}&max=${IODINE_MAX}`, { signal: ctrl.signal });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || ('HTTP ' + resp.status));
    renderServerList(data.results || [], q);
  } catch (err) {
    $('#serverStatus').textContent = '查询失败：' + (err.name === 'AbortError' ? '超时——查询范围过宽，请用化学式（如 B6、Fe2O3）' : err.message);
    $('#serverList').innerHTML = '';
  } finally {
    clearTimeout(timer);
  }
}

function renderServerList(results, q) {
  const el = $('#serverList');
  el.innerHTML = '';
  $('#serverStatus').textContent = `“${q}” · 共 ${results.length} 条匹配（COD 在线库）`;
  if (!results.length) {
    el.innerHTML = '<div class="server-empty">未找到匹配结构，换个公式或关键词试试</div>';
    return;
  }
  for (const r of results) {
    const row = document.createElement('button');
    row.className = 'server-item';
    row.innerHTML =
      `<span class="si-formula">${r.formula || '?'}</span>` +
      `<span class="si-name">${r.name || ''}</span>` +
      `<span class="si-meta">${r.sg || ''}${r.cell ? ' · ' + r.cell.map((v) => v).join('×') + ' Å' : ''}</span>` +
      `<span class="si-id">COD ${r.id}</span>`;
    row.addEventListener('click', () => loadServerCif(r));
    el.appendChild(row);
  }
}

async function loadServerCif(r) {
  $('#serverModal').classList.add('hide');
  state.activeId = r.id;
  showLoading('正在从碘队服务器获取 CIF…');
  try {
    const resp = await fetch(`${IODINE_SERVER}/cif/${r.id}`);
    if (!resp.ok) throw new Error('获取 CIF 失败: ' + resp.status);
    const text = await resp.text();
    if (!text.includes('data_')) throw new Error('返回内容不是有效 CIF');
    const cif = parseCIF(text, String(r.id));
    const counts = parseFormulaSum(cif.formulaSum);
    showCrystal(cif, {
      id: String(r.id),
      name: r.name || `COD ${r.id}`,
      formula: r.formula || cif.formulaSum,
      counts,
      source: 'server'   // 标记来源：碘队服务器（云端），徽标/文案随之切换
    });
    toast(`已加载 COD ${r.id}`, 'ok');
  } catch (err) {
    console.error(err);
    showLoading(false);
    toast('加载失败：' + err.message, 'err');
  }
}

// 化学式显示：金属（阳离子）优先重排，如 "Cl Na" → "NaCl"、"C Ca O3" → "CaCO3"
const NON_METAL_SET = new Set(['H','He','B','C','N','O','F','Ne','P','S','Cl',
  'Ar','Se','Br','Kr','I','Xe','At','Rn']);
function pretty(f) {
  const tokens = String(f || '').replace(/-/g, '').trim().split(/\s+/).filter(Boolean);
  tokens.sort((a, b) => {
    const ma = a.match(/^([A-Z][a-z]?)/), mb = b.match(/^([A-Z][a-z]?)/);
    const na = ma && NON_METAL_SET.has(ma[1]) ? 1 : 0;
    const nb = mb && NON_METAL_SET.has(mb[1]) ? 1 : 0;
    if (na !== nb) return na - nb; // 金属在前
    return a.localeCompare(b);     // 其余按字母序
  });
  return tokens.map(t => t.replace(/(\d+)/g, '<sub>$1</sub>')).join('');
}

/** 计算每元素配位数统计（仅核心原子，排除边界副本） */
function computeCoordination(crystal) {
  const stats = {};
  for (const at of crystal.atoms) {
    if (at.boundary) continue;
    const nb = crystal.neighbors.get(at.idx) || [];
    const s = stats[at.element] || (stats[at.element] = { cn: 0, n: 0, min: 99, max: 0 });
    s.n++;
    s.cn += nb.length;
    for (const item of nb) {
      if (item.dist < s.min) s.min = item.dist;
      if (item.dist > s.max) s.max = item.dist;
    }
  }
  const out = {};
  for (const [sym, s] of Object.entries(stats)) {
    out[sym] = {
      cn: Math.round(s.cn / s.n),
      dist: `${s.min.toFixed(2)}–${s.max.toFixed(2)} Å`
    };
  }
  return out;
}

function renderLegend(counts) {
  const el = $('#legend');
  el.innerHTML = '';
  const items = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [sym, n] of items) {
    const e = elementOf(sym);
    const row = document.createElement('div');
    row.className = 'legend-item';
    row.innerHTML = `
      <span class="swatch" style="background:#${e.color.toString(16).padStart(6, '0')}"></span>
      <span>${sym}</span><span class="cnt">×${Math.round(n)}</span>`;
    el.appendChild(row);
  }
  el.classList.toggle('hide', items.length === 0);
}

/* ---------------- 推荐结构 ---------------- */

function buildRecommend() {
  const targets = ['氯化钠', '金刚石', '二氧化硅 石英', '方解石', '氟化钙', '钙钛矿', '闪锌矿', '冰 冰Ih'];
  const found = [];
  for (const t of targets) {
    const hit = indexData.structures.find((s) => s.name.includes(t));
    if (hit) found.push(hit);
  }
  if (!found.length) return;
  const box = document.createElement('div');
  box.className = 'recommend';
  box.innerHTML = '<div class="rc-title">推荐结构</div>';
  for (const s of found) {
    const btn = document.createElement('button');
    btn.className = 'magic-btn ghost';
    btn.style.marginBottom = '6px';
    btn.textContent = s.name;
    btn.addEventListener('click', () => onPick(s));
    box.appendChild(btn);
  }
  $('#info-body .detail-empty').after(box);
}

/* ---------------- 交互 ---------------- */

function onHoverAtom(at) {
  const tip = $('#tooltip');
  if (!at) { tip.classList.add('hide'); return; }
  const e = elementOf(at.element);
  const nb = (state.currentCrystal?.neighbors.get(at.idx) || []).length;
  tip.innerHTML = `<span class="tt-el" style="color:#${e.color.toString(16).padStart(6, '0')}">${at.element}</span>` +
    `${e.name} · 配位数 ${nb}<br><span class="tt-sub">(${at.frac.map((v) => v.toFixed(2)).join(', ')})</span>`;
  tip.classList.remove('hide');
  const rect = $('#viewer').getBoundingClientRect();
  tip.style.left = (rect.left + rect.width * 0.52) + 'px';
  tip.style.top = (rect.top + 18) + 'px';
}

function onSelectAtom(at) {
  const el = $('#atom-detail');
  if (el) renderAtomDetail(el, at, state.currentCrystal);
}

/* ---------------- 工具栏 ---------------- */

function bindToolbar() {
  // 渲染模式
  $$('.segbtn[data-render]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.segbtn[data-render]').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      if (state.currentCrystal) scene.setStyle(btn.dataset.render);
    });
  });

  // 超胞（0 = 自适应，点击固定 1/2/3）
  // 用内存中的 CIF 重建（服务器来源的结构没有本地 data/cif/ 文件，不能重新 fetch）
  $$('.segbtn[data-cell]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.segbtn[data-cell]').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      state.cellSize = parseInt(btn.dataset.cell, 10);
      rebuildCurrent();
    });
  });
  // 自适应模式提示（双击当前高亮的超胞按钮可恢复自适应）
  $$('.segbtn[data-cell]').forEach((btn) => {
    btn.addEventListener('dblclick', () => {
      state.cellSize = 0;
      $$('.segbtn[data-cell]').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      rebuildCurrent();
      toast('已切换为自适应显示范围', 'info');
    });
  });

  // 晶胞边框
  $('#chkCell').addEventListener('change', (e) => {
    state.showCellBox = e.target.checked;
    const box = scene._group.getObjectByName('cellbox');
    if (box) box.visible = state.showCellBox;
  });

  // 自转
  $('#chkRot').addEventListener('change', (e) => scene.setAutoRotate(e.target.checked));

  // 标签
  $('#chkLabels').addEventListener('change', (e) => scene.setShowLabels(e.target.checked));

  // 旋转速度（映射到自动旋转速度）
  $('#rotSpeed').addEventListener('input', (e) => {
    scene.autoRotateSpeed = (+e.target.value) / 100 * 2;
  });
  scene.autoRotateSpeed = 0.6;

  // 测距
  $('#btnMeasure').addEventListener('click', (e) => {
    const on = e.currentTarget.classList.toggle('active');
    scene.setMeasureMode(on);
    toast(on ? '测量模式：依次点击两个原子' : '已退出测量模式', 'info');
  });

  // 导出 PNG
  $('#btnShot').addEventListener('click', () => {
    try {
      const a = document.createElement('a');
      a.download = `iodinescope-${state.activeId || 'structure'}.png`;
      a.href = scene.renderer.domElement.toDataURL('image/png');
      a.click();
      toast('晶格截图已导出 PNG', 'ok');
    } catch (err) {
      toast('导出失败：' + err.message, 'err');
    }
  });
}

/* ---------------- 检索事件 ---------------- */

function bindSearch() {
  $('#btnSearch').addEventListener('click', runSearch);
  $('#qInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });
  // 碘队服务器查询（COD 在线库）
  $('#btnServerSearch').addEventListener('click', serverSearch);
  $('#serverClose').addEventListener('click', () => $('#serverModal').classList.add('hide'));
  $('#serverModal').addEventListener('click', (e) => {
    if (e.target === $('#serverModal')) $('#serverModal').classList.add('hide');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('#serverModal').classList.add('hide');
  });
  $('#btnClear').addEventListener('click', () => {
    state.queryEls = [];
    $('#qInput').value = '';
    $('#atom-range').value = 0;
    $('#atomRangeVal').textContent = '0';
    $('#system-select').value = '';
    $('#keyword-input').value = '';
    renderChips($('#chipWrap'), state.queryEls, syncFromChips);
    runSearch();
  });
  $$('.pill').forEach((p) => p.addEventListener('click', () => {
    $$('.pill').forEach((x) => { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
    p.classList.add('active');
    p.setAttribute('aria-pressed', 'true');
    state.matchMode = p.dataset.mode;
    runSearch();
  }));
  $('#atom-range').addEventListener('input', (e) => {
    $('#atomRangeVal').textContent = e.target.value;
    runSearch();
  });
  $('#system-select').addEventListener('change', runSearch);
  $('#keyword-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch(); });
  $('#btnQuickSearch').addEventListener('click', () => $('#qInput').focus());
  $('#btnBrowse').addEventListener('click', () => {
    $('#keyword-input').value = '';
    runSearch();
  });
}

/* ---------------- 杂项 ---------------- */

function showLoading(on, text) {
  const el = $('#loading');
  if (text) $('#loading-text').textContent = text;
  el.classList.toggle('hide', !on);
}

/* ---------------- 启动 ---------------- */
bindToolbar();
bindSearch();
boot();
