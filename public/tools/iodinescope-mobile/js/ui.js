/**
 * ui.js — DOM 渲染与动效（IodineScope）
 * OpenDesign 视觉系统：粒子背景、涟漪按钮、公式检索 chips、
 * 横滚结果卡片、详情面板、toast、anime.js 过渡
 */
import { elementOf } from './periodic.js';
import { SYSTEM_NAMES, prettyFormula } from './search.js';

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ---------------- 粒子背景（鼠标排斥 + 连线 + 光晕） ---------------- */

export function initParticles(canvas) {
  const ctx = canvas.getContext('2d');
  let W, H, parts = [];
  const mouse = { x: -999, y: -999 };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    W = canvas.width = innerWidth * dpr;
    H = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const N = reduced ? 40 : (innerWidth < 760 ? 60 : 110);
    parts = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .22 * dpr, vy: (Math.random() - .5) * .22 * dpr,
      r: (Math.random() * 1.6 + .6) * dpr,
      hue: Math.random() > .5 ? '63,242,212' : '181,123,255',
      ph: Math.random() * Math.PI * 2
    }));
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr;
    document.documentElement.style.setProperty('--mx', e.clientX + 'px');
    document.documentElement.style.setProperty('--my', e.clientY + 'px');
  });

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
      if (d < 140 * dpr) { p.x += dx / d * 1.2; p.y += dy / d * 1.2; }
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.globalAlpha = .5 + .4 * Math.sin(t / 900 + p.ph);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fillStyle = `rgba(${p.hue},1)`; ctx.fill();
      ctx.globalAlpha = 1;
    }
    // 粒子连线
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i], b = parts[j];
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < 130 * dpr) {
          ctx.globalAlpha = (1 - d / (130 * dpr)) * .22;
          ctx.strokeStyle = 'rgba(150,170,255,.7)';
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(frame);
  }
  if (!reduced) requestAnimationFrame(frame);
}

/* ---------------- 涟漪按钮 ---------------- */

export function initRipple() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.magic-btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const span = document.createElement('span');
    const size = Math.max(r.width, r.height);
    span.className = 'ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (e.clientX - r.left - size / 2) + 'px';
    span.style.top = (e.clientY - r.top - size / 2) + 'px';
    btn.appendChild(span);
    setTimeout(() => span.remove(), 620);
  });
}

/* ---------------- 公式检索 ---------------- */

/** 快捷元素面板（设计稿 CHIP_ELEMENTS） */
export const QUICK_ELEMENTS = [
  'H', 'B', 'C', 'N', 'O', 'F', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl',
  'K', 'Ca', 'Ti', 'Fe', 'Cu', 'Zn', 'Br', 'Ag', 'I'
];

/**
 * 渲染已选元素 chips（元素符号 + 计数输入 + 删除）
 * @param {Array<{el:string,count:number}>} queryEls
 */
export function renderChips(container, queryEls, onChange) {
  container.innerHTML = '';
  queryEls.forEach((q, i) => {
    const e = elementOf(q.el);
    const b = document.createElement('button');
    b.className = 'el-chip on';
    b.type = 'button';
    b.style.borderColor = '#' + e.color.toString(16).padStart(6, '0');
    b.innerHTML = `${q.el}` +
      `<span class="cnt"><input type="number" min="1" max="999" value="${q.count > 1 ? q.count : ''}" placeholder="n" title="晶胞中原子数（可留空）"></span>` +
      `<span class="x">✕</span>`;
    const input = b.querySelector('input');
    input.addEventListener('click', (ev) => ev.stopPropagation());
    input.addEventListener('change', () => {
      const v = parseInt(input.value, 10);
      if (v > 0) q.count = v; else delete q.count;
      if (v > 0) input.value = v; else input.value = '';
      onChange();
    });
    b.addEventListener('click', (ev) => {
      if (ev.target === input) return;
      queryEls.splice(i, 1);
      onChange();
    });
    container.appendChild(b);
  });
}

/** 快捷元素面板 */
export function buildQuickElements(container, queryEls, onChange) {
  const panel = document.createElement('div');
  panel.className = 'quick-elements';
  panel.innerHTML = '<span class="eyebrow">快捷元素</span>';
  QUICK_ELEMENTS.forEach((el) => {
    const b = document.createElement('button');
    b.className = 'el-chip';
    b.type = 'button';
    b.textContent = el;
    b.title = el;
    const e = elementOf(el);
    b.addEventListener('mouseenter', () => { b.style.borderColor = '#' + e.color.toString(16).padStart(6, '0'); });
    b.addEventListener('mouseleave', () => { b.style.borderColor = ''; });
    b.addEventListener('click', () => {
      const i = queryEls.findIndex(q => q.el === el);
      if (i !== -1) queryEls.splice(i, 1);
      else queryEls.push({ el, count: 1 });
      onChange();
    });
    panel.appendChild(b);
  });
  container.appendChild(panel);
}

/* ---------------- 结果横滚卡片 ---------------- */

/**
 * @param {Array} results 结构元数据
 * @param {string} activeId 当前选中
 * @param {string} matchMode 匹配模式（决定标签语义）
 */
export function renderResultsStrip(listEl, results, activeId, matchMode, onClick) {
  listEl.innerHTML = '';
  if (!results.length) {
    const e = document.createElement('div');
    e.className = 'empty-result';
    e.innerHTML = '没有匹配的晶体结构。';
    listEl.appendChild(e);
    return;
  }
  results.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'result-card' + (s.id === activeId ? ' active' : '');
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', '选择 ' + s.name);
    const comp = s.counts;
    const atoms = Object.values(comp).reduce((a, b) => a + b, 0);
    const tag = s.id === activeId ? 'all'
      : (matchMode === 'exact' ? 'exact' : 'contains');
    const tagText = tag === 'exact' ? '精确匹配' : tag === 'contains' ? '包含元素' : '当前';
    card.innerHTML = `
      <div class="rc-formula">${prettyFormula(s.formula)}</div>
      <div class="rc-name">${s.name}</div>
      <div class="rc-meta">${s.sg} · ${atoms} 原子/晶胞</div>
      <div class="rc-elements">
        ${Object.keys(comp).map(el =>
          `<span title="${el}" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#${elementOf(el).color.toString(16).padStart(6, '0')};margin-right:3px"></span>`
        ).join('')}
      </div>
      <span class="rc-tag ${tag}">${tagText}</span>`;
    card.addEventListener('click', () => onClick(s));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(s); }
    });
    listEl.appendChild(card);
  });
  // 滚动到选中卡片（手动居中：scrollIntoView 会被 scroll-snap 干扰导致越界/偏离）
  const act = listEl.querySelector('.result-card.active');
  if (act) {
    const stripRect = listEl.getBoundingClientRect();
    const cardRect = act.getBoundingClientRect();
    const cardX = cardRect.left - stripRect.left + listEl.scrollLeft;
    const target = cardX - (listEl.clientWidth - act.offsetWidth) / 2;
    listEl.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }
}

/* ---------------- 详情面板 ---------------- */

export function renderInfoPanel(bodyEl, s, crystal) {
  bodyEl.innerHTML = '';
  const note = s.note ? `<div class="detail-note">${s.note}</div>` : '';
  const cell = crystal.cell;
  const compRows = Object.entries(crystal.counts)
    .sort((a, b) => b[1] - a[1])
    .map(([sym, n]) => `
      <div class="comp-row">
        <span class="dot" style="background:#${elementOf(sym).color.toString(16).padStart(6, '0')}"></span>
        <span style="font-family:var(--font-m)">${sym}</span>
        <span class="n">× ${Math.round(n)}</span>
      </div>`).join('');
  const coordRows = Object.entries(crystal.coordination || {})
    .map(([sym, info]) => `
      <div class="coord-row">
        <span class="el" style="color:#${elementOf(sym).color.toString(16).padStart(6, '0')}">${sym}</span>
        <span>配位数 <span class="cn">${info.cn}</span></span>
        <span class="detail">${info.dist}</span>
      </div>`).join('');
  const sites = (crystal.cif.sites || []).slice(0, 60).map((site) => `
      <li><span style="color:#${elementOf(site.element).color.toString(16).padStart(6, '0')}">● ${site.element}</span>
      <span>${site.x.toFixed(3)} ${site.y.toFixed(3)} ${site.z.toFixed(3)}</span></li>`).join('');

  bodyEl.innerHTML = `
    <div class="eyebrow">Structure Info</div>
    <div class="detail-name">${s.name}</div>
    <div class="detail-sg">${s.sg}</div>
    <div class="detail-cod">COD ${s.id} · ${SYSTEM_NAMES[s.system] || ''}</div>
    ${note}
    <div class="sub-head">晶胞参数</div>
    <table class="cell-table">
      <tr><td>a / b / c (Å)</td><td>${cell.a.toFixed(3)} / ${cell.b.toFixed(3)} / ${cell.c.toFixed(3)}</td></tr>
      <tr><td>α / β / γ (°)</td><td>${cell.alpha.toFixed(2)} / ${cell.beta.toFixed(2)} / ${cell.gamma.toFixed(2)}</td></tr>
      <tr><td>V (Å³)</td><td>${crystal.volume.toFixed(2)}</td></tr>
      <tr><td>Z / 密度 (g/cm³)</td><td>${crystal.Z || '—'} / ${crystal.density.toFixed(2)}</td></tr>
      <tr><td>原子数</td><td>${crystal.atoms.length}（1×1×1）</td></tr>
    </table>
    <div class="sub-head">组成</div>
    <div class="comp-list">${compRows}</div>
    <div class="sub-head">配位环境</div>
    ${coordRows || '<div class="info-grid"><span class="k">—</span></div>'}
    <div class="sub-head">原子位点（分数坐标）</div>
    <ul class="site-list">${sites || '<li>无</li>'}</ul>
    <div class="sub-head">图例 · CPK</div>
    <div class="legend">
      ${Object.keys(crystal.counts).map(sym =>
        `<span><span class="dot" style="background:#${elementOf(sym).color.toString(16).padStart(6, '0')}"></span>${sym}</span>`).join('')}
    </div>
    <div id="atom-detail"></div>
    <div class="detail-actions">
      <button class="magic-btn ghost full" id="btnCopyCif">复制 CIF 文本</button>
    </div>`;
  const btn = bodyEl.querySelector('#btnCopyCif');
  if (btn) btn.addEventListener('click', () => copyCifText(s, crystal));
}

/** 生成当前结构的 CIF 文本（供复制） */
export function cifText(meta, crystal) {
  const id = (meta.name || meta.id).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cell = crystal.cell;
  const lines = [
    `data_${id}`,
    `_chemical_name_common '${meta.name}'`,
    `_cell_length_a ${cell.a}`, `_cell_length_b ${cell.b}`, `_cell_length_c ${cell.c}`,
    `_cell_angle_alpha ${cell.alpha}`, `_cell_angle_beta ${cell.beta}`, `_cell_angle_gamma ${cell.gamma}`,
    `_symmetry_space_group_name_H-M '${meta.sg}'`,
    'loop_',
    '_atom_site_label _atom_site_type_symbol _atom_site_fract_x _atom_site_fract_y _atom_site_fract_z'
  ];
  (crystal.cif.sites || []).forEach((s, i) => {
    lines.push(`${s.element}${i + 1} ${s.element} ${s.x} ${s.y} ${s.z}`);
  });
  return lines.join('\n');
}

function copyCifText(meta, crystal) {
  const text = cifText(meta, crystal);
  const done = () => toast('CIF 已复制到剪贴板', 'ok');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败', 'err'); }
  ta.remove();
}

/** 原子详情（点击原子后） */
export function renderAtomDetail(container, at, crystal) {
  container.innerHTML = '';
  if (!at) return;
  const e = elementOf(at.element);
  const nb = crystal.neighbors.get(at.idx) || [];
  const dists = nb.map((n) => n.dist).sort((x, y) => x - y);
  const distStr = dists.length
    ? dists.slice(0, 8).map((d) => d.toFixed(2)).join(' / ') + (dists.length > 8 ? ' …' : '')
    : '无键';
  container.innerHTML = `
    <div class="atom-detail">
      <h5 style="color:#${e.color.toString(16).padStart(6, '0')}">${at.element} · ${e.name}</h5>
      <div class="info-grid">
        <span class="k">坐标 (x,y,z)</span><span class="v">${at.frac.map((v) => v.toFixed(3)).join(', ')}</span>
        <span class="k">占有率</span><span class="v">${at.occupancy.toFixed(2)}</span>
        <span class="k">配位数</span><span class="v">${nb.length}</span>
      </div>
      <div class="info-grid" style="margin-top:6px">
        <span class="k">键长 (Å)</span><span class="v" style="font-size:11px">${distStr}</span>
      </div>
    </div>`;
}

/* ---------------- toast ---------------- */

export function toast(msg, type = 'info') {
  const w = $('#toastWrap');
  if (!w) return;
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  w.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity .3s';
    setTimeout(() => t.remove(), 320);
  }, 2800);
}

/* ---------------- 动效 ---------------- */

export function fadeIn(el, delay = 0) {
  if (!el) return;
  if (window.anime) {
    anime({ targets: el, opacity: [0, 1], translateY: [10, 0], duration: 420, easing: 'easeOutCubic', delay });
  } else {
    el.style.opacity = 1;
  }
}

export function pulse(el) {
  if (el && window.anime) {
    anime({ targets: el, scale: [1, 1.06, 1], duration: 300, easing: 'easeOutQuad' });
  }
}
