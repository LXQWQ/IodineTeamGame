/**
 * scene.js — 3D 渲染器（IodineScope）
 * 参照 Diamond 等晶体学可视化软件的渲染风格，基于公开晶体学约定从零实现：
 *  - 球棍模型（CPK 元素配色 + 圆柱键）
 *  - 空间填充模型（范德华半径）
 *  - 配位多面体（凸包）
 *  - 晶胞线框、原子标签、悬停/选中高亮、距离测量
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { elementOf } from './periodic.js';
import { computeCoordPolyhedra } from './crystal.js';

export class Scene3D {
  /**
   * @param {HTMLElement} container 渲染容器
   * @param {object} callbacks { onHoverAtom(atom|null), onSelectAtom(atom|null) }
   */
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.crystal = null;
    this.style = 'ballstick';
    this.atomScale = 0.5;    // 球棍模式原子半径 = 共价半径 × 系数（Diamond/VESTA 风格饱满比例）
    this.bondScale = 1.0;    // 键长阈值系数
    this.showLabels = true;
    this.autoRotate = false;
    this.measureMode = false;
    this.measurePoints = [];

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    // 场景与相机
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    this.camera.position.set(8, 6, 10);

    // 灯光（Diamond 风格：环境 + 主方向光 + 补光）
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const main = new THREE.DirectionalLight(0xffffff, 0.9);
    main.position.set(1, 2, 1.5);
    this.scene.add(main);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
    fill.position.set(-1, -0.5, -1);
    this.scene.add(fill);

    // 控制
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 400;

    // 交互状态
    this.hovered = null;
    this.selected = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._lastClickPos = { x: 0, y: 0 };
    this._group = new THREE.Group(); // 结构组（切换结构时整体重建）
    this._overlay = new THREE.Group(); // 测量等覆盖层
    this.scene.add(this._group);
    this.scene.add(this._overlay);

    // 事件
    this.renderer.domElement.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this._onClick(e));
    this.renderer.domElement.addEventListener('dblclick', () => this.measureMode && this._clearMeasure());
    window.addEventListener('resize', () => this.resize());

    // 主循环
    this.autoRotateSpeed = 0.6; // 自转速度（弧度/秒），可由 UI 滑块调节
    const tick = () => {
      requestAnimationFrame(tick);
      if (this.autoRotate && !this.controls.isDragging) {
        this._group.rotation.y += this.autoRotateSpeed * 0.016;
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
    };
    tick();
    this.resize();
  }

  // ------------------------------------------------------------ 结构装载

  /**
   * 装载晶体结构并重建场景
   * @param {object} crystal buildCrystal 的产物
   */
  setCrystal(crystal) {
    this.crystal = crystal;
    this.clearMeasure();
    this.selected = null;
    this.hovered = null;
    if (this.callbacks.onSelectAtom) this.callbacks.onSelectAtom(null);
    // 清空旧结构
    this._clearGroup(this._group);
    this._buildStructure();
    this._fitCamera();
  }

  _disposeMaterial(m) {
    if (Array.isArray(m)) m.forEach((x) => this._disposeMaterial(x));
    else m.dispose?.();
  }

  /**
   * 从父级移除一个子对象并释放其资源。
   * 必须走 Object3D.remove()（removeFromParent），不能直接改 children 数组：
   * 直接 pop/splice 不会触发 CSS2DObject 的 'removed' 事件，
   * 导致标签 DOM 元素残留在页面上（切换晶胞/样式后文字残留）。
   * 另外，普通 Group 内嵌套的 CSS2DObject 收不到 removed 事件，
   * 这里统一遍历子树手动清理标签 DOM。
   */
  _detach(child) {
    child.removeFromParent(); // 触发 removed 事件（CSS2DObject 自身会移除 DOM 元素）
    child.traverse?.((o) => {
      if (o.isCSS2DObject && o.element && o.element.parentNode) o.element.remove();
    });
    child.geometry?.dispose?.();
    if (child.material) this._disposeMaterial(child.material);
  }

  /** 清空一个 Group 的所有子对象（含标签 DOM 清理） */
  _clearGroup(group) {
    for (const child of [...group.children]) this._detach(child);
  }

  _buildStructure() {
    const c = this.crystal;
    if (!c) return;
    // 原子（线框模式为纯棒状，不绘制球体 —— 与 Diamond 一致）
    if (this.style !== 'wireframe') {
      const n = c.atoms.length;
      // 空间填充：元素半径（共价半径，与球棍一致的相对大小，如 NaCl Na>Cl）×
      // 全局缩放 s = min(nn/2 / 半径)——最大原子恰好相切，严格不重叠（r_i ≤ nn_i/2 ≤ d_ij/2）。
      // 不能用 vdw/硬球 min(vdw, nn/2)：NaCl 的 Na/Cl 最近邻距相同会把两者压成一样大。
      const radii = this.style === 'spacefill' ? computeSpacefillRadii(c) : null;
      const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
      const mat = new THREE.MeshPhongMaterial({ shininess: 40, specular: 0x222222 });
      const inst = new THREE.InstancedMesh(sphereGeo, mat, n);
      inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
      for (let i = 0; i < n; i++) {
        const at = c.atoms[i];
        const r = radii ? radii[i] : this._atomRadius(at.element);
        dummy.position.set(at.cart[0], at.cart[1], at.cart[2]);
        dummy.scale.setScalar(r);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
        color.set(elementOf(at.element).color);
        inst.setColorAt(i, color);
      }
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.name = 'atoms';
      this._group.add(inst);
      this.atomsMesh = inst;
      this._sphereGeo = sphereGeo;
    } else {
      this.atomsMesh = null;
    }

    // 键（空间填充模式隐藏键 —— 与 Diamond 一致）
    // 键（空间填充模式隐藏键；多面体模式用配位键 polyBonds，避免与主键重叠）
    if (c.bonds.length && this.style !== 'spacefill' && this.style !== 'polyhedra') this._buildBonds(c);

    // 晶胞边框
    this._buildCellBox(c);

    // 标签
    if (this.showLabels) this._buildLabels(c);
  }

  _atomRadius(element) {
    const e = elementOf(element);
    if (this.style === 'spacefill') return e.vdw;
    return Math.max(e.cov * this.atomScale, 0.12);
  }

  _buildBonds(c) {
    const geo = new THREE.CylinderGeometry(1, 1, 1, 8, 1);
    const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 20 });
    const n = c.bonds.length;
    const inst = new THREE.InstancedMesh(geo, mat, n);
    inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const cA = new THREE.Color();
    const cB = new THREE.Color();
    // 线框模式为加粗纯棒；球棍模式较粗（视觉主体）
    const bondR = this.style === 'wireframe' ? 0.12 : 0.1;
    for (let i = 0; i < n; i++) {
      const b = c.bonds[i];
      const ax = b.ax, ay = b.ay, az = b.az;
      const bx = b.bx, by = b.by, bz = b.bz;
      dir.set(bx - ax, by - ay, bz - az);
      const len = dir.length();
      mid.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      dummy.position.copy(mid);
      dummy.quaternion.setFromUnitVectors(up, dir.normalize());
      dummy.scale.set(bondR, len, bondR);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      // 键色 = 两端原子 CPK 色混合（Diamond 风格原子色键）
      cA.set(elementOf(c.atoms[b.a].element).color);
      cB.set(elementOf(c.atoms[b.b].element).color);
      inst.setColorAt(i, cA.lerp(cB, 0.5));
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.name = 'bonds';
    this._group.add(inst);
    this.bondsMesh = inst;
    this._bondGeo = geo;
  }

  _buildCellBox(c) {
    const m = c.matrix;
    const N = c.supercell || 1; // 超胞倍数：盒子必须随显示范围缩放（2³/3³ 时画大盒，
                                // 否则单位晶胞小盒会被超胞内跨边界的键穿过，看起来"键向外伸出"）
    const corners = [];
    for (let i = 0; i < 8; i++) {
      const fx = (i & 1) * N, fy = ((i >> 1) & 1) * N, fz = ((i >> 2) & 1) * N;
      corners.push(
        fx * m[0] + fy * m[1] + fz * m[2],
        fx * m[3] + fy * m[4] + fz * m[5],
        fx * m[6] + fy * m[7] + fz * m[8]
      );
    }
    // 12 条棱
    const edges = [
      [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6],
      [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]
    ];
    const pos = [];
    for (const [a, b] of edges) {
      pos.push(corners[a * 3], corners[a * 3 + 1], corners[a * 3 + 2]);
      pos.push(corners[b * 3], corners[b * 3 + 1], corners[b * 3 + 2]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0xffd75e, transparent: true, opacity: 0.85
    }));
    line.name = 'cellbox';
    this._group.add(line);
    this._cellGeo = geo;

    // a/b/c 轴向标签（Diamond 风格；作为边框子节点，随晶胞开关显隐）
    const axisDefs = [
      ['a', 0xff5b6a, [m[0], m[3], m[6]]],   // a 轴红
      ['b', 0x7dffb0, [m[1], m[4], m[7]]],   // b 轴绿
      ['c', 0x5aa9ff, [m[2], m[5], m[8]]]    // c 轴蓝
    ];
    for (const [label, colorHex, vec] of axisDefs) {
      const el = document.createElement('div');
      el.className = 'atom-label';
      el.textContent = label;
      el.style.fontStyle = 'italic';
      el.style.color = '#' + colorHex.toString(16).padStart(6, '0');
      const obj = new CSS2DObject(el);
      obj.position.set(vec[0] * N, vec[1] * N, vec[2] * N); // a/b/c 轴端点也随超胞缩放
      line.add(obj);
    }
  }

  _buildLabels(c) {
    const group = new THREE.Group();
    const core = c.atoms.filter((a) => !a.boundary && a.cx === 0 && a.cy === 0 && a.cz === 0);
    // 超胞 > 1 时只标注核心晶胞，避免标签爆炸
    for (const at of core.slice(0, 800)) {
      const el = document.createElement('div');
      el.className = 'atom-label';
      el.textContent = at.element;
      el.style.color = '#' + elementOf(at.element).color.toString(16).padStart(6, '0');
      const obj = new CSS2DObject(el);
      obj.position.set(at.cart[0], at.cart[1] + this._atomRadius(at.element) + 0.25, at.cart[2]);
      obj.userData.atomIdx = at.idx;
      group.add(obj);
    }
    group.name = 'labels';
    this._group.add(group);
    this.labelsGroup = group;
  }

  /** 相机适配结构大小（含多面体的界外配体原子，VESTA 式完整视野） */
  _fitCamera() {
    const box = new THREE.Box3();
    for (const at of this.crystal.atoms) {
      box.expandByPoint(new THREE.Vector3(at.cart[0], at.cart[1], at.cart[2]));
    }
    if (this._polyLigands) {
      for (const a of this._polyLigands) {
        box.expandByPoint(new THREE.Vector3(a.x, a.y, a.z));
      }
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) / 2 || 1;
    this._group.position.copy(center).multiplyScalar(-1);
    this.controls.target.copy(center);
    const dist = radius * 3.2;
    this.camera.position.set(center.x + dist * 0.75, center.y + dist * 0.55, center.z + dist);
    this.controls.update();
  }

  // ------------------------------------------------------------ 样式切换

  /** 切换显示样式：ballstick | spacefill | polyhedra | wireframe */
  setStyle(style) {
    this.style = style;
    if (!this.crystal) return;
    // 重建结构（样式影响原子半径/键/多面体）
    this._clearGroup(this._group);
    this._buildStructure();
    if (style === 'polyhedra') this._buildPolyhedra();
  }

  /**
   * 构建配位多面体（凸包 + 描边）——VESTA 式（用户选定的方向 A）：
   * 以每个阳离子为中心，取它周围**距离最短**的那层阴离子（同距并列全要，远一点不算），
   * 对它们做凸包。**多面体完整、永不截断**（VESTA 边界模式 2）：
   * 盒外的配体原子也画出来（黄框只是框架，结构自然延伸出框），
   * 并画中心→配体的完整配位键。
   */
  _buildPolyhedra() {
    const c = this.crystal;
    const polys = computeCoordPolyhedra(c);
    // 收集配体原子（含盒外，去重）与 中心→配体 键
    const N = c.supercell || 1;
    const inv = invert3(c.matrix);
    const inBox = (x, y, z) => {
      if (!inv) return true;
      const fx = inv[0] * x + inv[1] * y + inv[2] * z;
      const fy = inv[3] * x + inv[4] * y + inv[5] * z;
      const fz = inv[6] * x + inv[7] * y + inv[8] * z;
      return fx >= -1e-6 && fx <= N + 1e-6 && fy >= -1e-6 && fy <= N + 1e-6 && fz >= -1e-6 && fz <= N + 1e-6;
    };
    const ligandMap = new Map();
    const polyBonds = [];
    for (const p of polys) {
      for (const v of p.verts) {
        const k = `${Math.round(v.x * 100)}|${Math.round(v.y * 100)}|${Math.round(v.z * 100)}`;
        // 只补盒外配体原子（VESTA 边界模式 2）；盒内的已有主原子渲染
        if (!ligandMap.has(k) && !inBox(v.x, v.y, v.z)) {
          ligandMap.set(k, { x: v.x, y: v.y, z: v.z, element: v.element });
        }
        polyBonds.push({
          ax: p.x, ay: p.y, az: p.z, elA: p.element,
          bx: v.x, by: v.y, bz: v.z, elB: v.element
        });
      }
    }
    this._polyLigands = [...ligandMap.values()];
    this._buildLigandAtoms(this._polyLigands);
    this._buildPolyBonds(polyBonds);
    // 完整多面体（凸包顶点 = 配体真实物理位置，可伸到盒外）
    const group = new THREE.Group();
    let count = 0;
    for (const p of polys) {
      if (count > 600) break;
      const pts = p.verts.map((v) => new THREE.Vector3(v.x, v.y, v.z));
      try {
        const geo = new ConvexGeometry(pts);
        const col = new THREE.Color(elementOf(p.element).color);
        const mat = new THREE.MeshBasicMaterial({
          color: col, transparent: true, opacity: 0.28,
          depthWrite: false, side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);
        // 凸包棱边描边（Diamond 风格多面体轮廓）
        const edge = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo, 25),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
        );
        group.add(edge);
        count++;
      } catch (e) { /* 共面点等导致凸包失败时跳过 */ }
    }
    group.name = 'polyhedra';
    this._group.add(group);
    this.polyGroup = group;
  }

  /** 渲染多面体的配体原子（含盒外——VESTA 边界模式 2：界外配体照画） */
  _buildLigandAtoms(ligands) {
    const n = ligands.length;
    if (!n) return;
    const geo = new THREE.SphereGeometry(1, 16, 12);
    const mat = new THREE.MeshPhongMaterial({ shininess: 40, specular: 0x222222 });
    const inst = new THREE.InstancedMesh(geo, mat, n);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = ligands[i];
      dummy.position.set(a.x, a.y, a.z);
      dummy.scale.setScalar(this._atomRadius(a.element));
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      color.set(elementOf(a.element).color);
      inst.setColorAt(i, color);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.name = 'ligandAtoms';
    this._group.add(inst);
  }

  /** 渲染中心阳离子 → 配体阴离子的完整配位键（含盒外） */
  _buildPolyBonds(bonds) {
    const n = bonds.length;
    if (!n) return;
    const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
    const mat = new THREE.MeshPhongMaterial();
    const inst = new THREE.InstancedMesh(geo, mat, n);
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const cA = new THREE.Color();
    const cB = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const b = bonds[i];
      dir.set(b.bx - b.ax, b.by - b.ay, b.bz - b.az);
      const len = dir.length();
      mid.set((b.ax + b.bx) / 2, (b.ay + b.by) / 2, (b.az + b.bz) / 2);
      dummy.position.copy(mid);
      dummy.quaternion.setFromUnitVectors(up, dir.normalize());
      dummy.scale.set(0.08, len, 0.08);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      cA.set(elementOf(b.elA).color);
      cB.set(elementOf(b.elB).color);
      inst.setColorAt(i, cA.lerp(cB, 0.5));
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.name = 'polyBonds';
    this._group.add(inst);
  }

  setAtomScale(v) { this.atomScale = v; this.setStyle(this.style); }
  setShowLabels(v) {
    this.showLabels = v;
    if (this.labelsGroup) {
      this._detach(this.labelsGroup);
      this.labelsGroup = null;
    }
    if (v && this.crystal) this._buildLabels(this.crystal);
  }
  setAutoRotate(v) { this.autoRotate = v; }

  // ------------------------------------------------------------ 交互

  /** 取指针处原子（instanceId → atom） */
  _pickAtom(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (!this.atomsMesh) return null;
    const hits = this.raycaster.intersectObject(this.atomsMesh);
    if (hits.length === 0) return null;
    const instId = hits[0].instanceId;
    return this.crystal?.atoms[instId] ?? null;
  }

  _onPointerMove(e) {
    if (this.measureMode) return;
    const at = this._pickAtom(e.clientX, e.clientY);
    if (at !== this.hovered) {
      this._setHover(at);
      if (this.callbacks.onHoverAtom) this.callbacks.onHoverAtom(at);
    }
  }

  _setHover(at) {
    if (!this.atomsMesh) return;
    // 高亮：悬停原子加白
    const color = new THREE.Color();
    const hoverIdx = at ? at.idx : -1;
    for (let i = 0; i < this.crystal.atoms.length; i++) {
      color.set(elementOf(this.crystal.atoms[i].element).color);
      if (i === hoverIdx) color.lerp(new THREE.Color(0xffffff), 0.55);
      this.atomsMesh.setColorAt(i, color);
    }
    if (this.atomsMesh.instanceColor) this.atomsMesh.instanceColor.needsUpdate = true;
    this.hovered = at;
  }

  _onClick(e) {
    if (this.measureMode) { this._measureClick(e); return; }
    const at = this._pickAtom(e.clientX, e.clientY);
    this.selected = at;
    if (this.callbacks.onSelectAtom) this.callbacks.onSelectAtom(at);
  }

  // 测量：点击两个原子显示距离
  _measureClick(e) {
    const at = this._pickAtom(e.clientX, e.clientY);
    if (!at) return;
    this.measurePoints.push(at);
    if (this.measurePoints.length >= 2) {
      const [a, b] = this.measurePoints;
      this._drawMeasureLine(a, b);
      this.measurePoints = [];
      this.measureMode = false;
      this._setCursor(false);
      if (this.callbacks.onMeasureEnd) this.callbacks.onMeasureEnd(a, b);
    } else {
      // 第一个点打标记
      this._markPoint(at);
    }
  }

  _markPoint(at) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    dot.position.set(at.cart[0], at.cart[1], at.cart[2]);
    dot.name = 'measure';
    this._overlay.add(dot);
  }

  _drawMeasureLine(a, b) {
    const dx = b.cart[0] - a.cart[0], dy = b.cart[1] - a.cart[1], dz = b.cart[2] - a.cart[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const pts = [
      new THREE.Vector3(a.cart[0], a.cart[1], a.cart[2]),
      new THREE.Vector3(b.cart[0], b.cart[1], b.cart[2])
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x66ffcc, linewidth: 1 }));
    line.name = 'measure';
    this._overlay.add(line);
    // 距离标签
    const div = document.createElement('div');
    div.className = 'measure-label';
    div.textContent = dist.toFixed(3) + ' Å';
    const label = new CSS2DObject(div);
    label.position.set((a.cart[0] + b.cart[0]) / 2, (a.cart[1] + b.cart[1]) / 2, (a.cart[2] + b.cart[2]) / 2);
    label.name = 'measure';
    this._overlay.add(label);
  }

  clearMeasure() {
    this._clearGroup(this._overlay);
    this.measurePoints = [];
  }

  setMeasureMode(v) {
    this.measureMode = v;
    this.measurePoints = [];
    this._setCursor(v);
  }

  _setCursor(on) {
    this.container.style.cursor = on ? 'crosshair' : 'default';
  }

  // ------------------------------------------------------------ 生命周期

  resize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.renderer.dispose();
    this.labelRenderer.domElement.remove();
    this.renderer.domElement.remove();
    window.removeEventListener('resize', this._onResize);
  }
}

/** 3×3 矩阵求逆（行主序，笛卡尔↔分数坐标） */
function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const id = 1 / det;
  return [
    (e * i - f * h) * id, (c * h - b * i) * id, (b * f - c * e) * id,
    (f * g - d * i) * id, (a * i - c * g) * id, (c * d - a * f) * id,
    (d * h - e * g) * id, (b * g - a * h) * id, (a * e - b * d) * id
  ];
}

/**
 * 空间填充半径：元素共价半径 × 全局等比缩放系数 fillScale。
 * fillScale = min(原子对距离 / 共价半径和)（crystal.js 计算）：
 *   - 所有原子等比缩放，**保持相对大小**（NaCl Na > Cl，不再等大）；
 *   - 最紧的一对恰好相切（NaCl Na-Cl 相切）；
 *   - 任意两球 r_i + r_j = s(cov_i + cov_j) ≤ d_ij，**绝不穿模**。
 */
function computeSpacefillRadii(c) {
  const s = (c.fillScale && isFinite(c.fillScale) && c.fillScale > 0) ? c.fillScale : 1;
  return c.atoms.map((at) => Math.max(elementOf(at.element).cov * s, 0.12));
}
