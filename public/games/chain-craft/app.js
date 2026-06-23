import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';


// ==================== 分子状态 ====================
class MoleculeState {
    constructor(carbonCount = 1, functionalGroups = [], unsaturation = [], rings = [], chirality = null, stereochemistry = 'R') {
        this.carbonCount = carbonCount;
        this.functionalGroups = [...functionalGroups];
        this.unsaturation = [...unsaturation];
        this.rings = [...rings];
        this.chirality = chirality;
        this.stereochemistry = stereochemistry;
    }
    clone() {
        return new MoleculeState(this.carbonCount, [...this.functionalGroups], [...this.unsaturation], [...this.rings], this.chirality, this.stereochemistry);
    }
    getDescription() {
        const parts = ['C' + this.carbonCount];
        if (this.rings.length > 0) parts.push(this.rings.join(','));
        if (this.functionalGroups.length > 0) parts.push(this.functionalGroups.join(','));
        if (this.unsaturation.length > 0) parts.push(this.unsaturation.length + '双键');
        return parts.join(' ');
    }
    hasFunctionalGroup(g) { return this.functionalGroups.includes(g); }
    hasCarbonyl() { return this.hasFunctionalGroup('=O') || this.hasFunctionalGroup('-CHO') || this.hasFunctionalGroup('-COOH'); }
    hasHydroxyl() { return this.hasFunctionalGroup('-OH'); }
    hasAlphaHydrogen() {
        if (!this.hasCarbonyl() || this.carbonCount < 2) return false;
        return this.functionalGroups.length < this.carbonCount;
    }
    hasConjugatedDiene() {
        if (this.unsaturation.length < 2 || this.carbonCount < 4) return false;
        const dbs = [];
        this.unsaturation.forEach(u => { const m = u.match(/C(\d+)\s*=\s*C(\d+)/); if (m) dbs.push([parseInt(m[1]), parseInt(m[2])]); });
        for (let i = 0; i < dbs.length; i++)
            for (let j = i+1; j < dbs.length; j++)
                if (dbs[i][1] === dbs[j][0]-1 || dbs[j][1] === dbs[i][0]-1) return true;
        return false;
    }
    addFunctionalGroup(g) { if (!this.functionalGroups.includes(g)) this.functionalGroups.push(g); }
    removeFunctionalGroup(g) {
        const idx = this.functionalGroups.indexOf(g);
        if (idx >= 0) this.functionalGroups.splice(idx, 1);
    }
    equals(other) {
        if (this.carbonCount !== other.carbonCount) return false;
        if ([...this.functionalGroups].sort().join(',') !== [...other.functionalGroups].sort().join(',')) return false;
        if ([...this.unsaturation].sort().join(',') !== [...other.unsaturation].sort().join(',')) return false;
        if ([...this.rings].sort().join(',') !== [...other.rings].sort().join(',')) return false;
        return true;
    }
}

// ==================== 反应表 ====================
const REACTIONS = [
    { id:'grignard', name:'Grignard', emoji:'🧪', desc:'R-MgX + C=O → R-C-OH (+2C)',
      check: m => m.hasCarbonyl() && m.carbonCount >= 2,
      apply: m => { const r = m.clone(); r.carbonCount += 2; r.removeFunctionalGroup('=O'); r.removeFunctionalGroup('-CHO'); r.removeFunctionalGroup('-COOH'); r.addFunctionalGroup('-OH'); return r; },
      short: '+2C =O→-OH', category:'增碳' },
    { id:'aldol', name:'Aldol缩合', emoji:'🔗', desc:'2×羰基 → β-羟基羰基 (C翻倍)',
      check: m => m.hasAlphaHydrogen() && m.carbonCount >= 2,
      apply: m => { const r = m.clone(); r.carbonCount *= 2; r.addFunctionalGroup('-OH'); r.addFunctionalGroup('=O'); return r; },
      short: 'C×2 +OH+=O', category:'增碳' },
    { id:'williamson', name:'Williamson', emoji:'🔗', desc:'R-OH → R-O-R (+2C)',
      check: m => m.hasHydroxyl(),
      apply: m => { const r = m.clone(); r.carbonCount += 2; r.removeFunctionalGroup('-OH'); r.addFunctionalGroup('-O-'); return r; },
      short: '+2C -OH→-O-', category:'增碳' },
    { id:'reduction', name:'NaBH4还原', emoji:'⬇️', desc:'C=O → CH-OH',
      check: m => m.hasCarbonyl(),
      apply: m => { const r = m.clone(); r.removeFunctionalGroup('=O'); r.removeFunctionalGroup('-CHO'); r.addFunctionalGroup('-OH'); return r; },
      short: '=O→-OH', category:'转化' },
    { id:'oxidation', name:'PCC氧化', emoji:'⬆️', desc:'-OH → =O',
      check: m => m.hasHydroxyl(),
      apply: m => { const r = m.clone(); r.removeFunctionalGroup('-OH'); r.addFunctionalGroup('=O'); return r; },
      short: '-OH→=O', category:'转化' },
    { id:'esterification', name:'酯化', emoji:'🍇', desc:'-OH + -COOH → -COO-',
      check: m => m.hasHydroxyl() && m.hasFunctionalGroup('-COOH'),
      apply: m => { const r = m.clone(); r.removeFunctionalGroup('-OH'); r.removeFunctionalGroup('-COOH'); r.addFunctionalGroup('-COO-'); return r; },
      short: '-OH+-COOH→-COO-', category:'转化' },
    { id:'ether_hydrolysis', name:'醚水解', emoji:'💧', desc:'-O- + H2O → 2×-OH',
      check: m => m.hasFunctionalGroup('-O-'),
      apply: m => { const r = m.clone(); r.removeFunctionalGroup('-O-'); r.addFunctionalGroup('-OH'); r.addFunctionalGroup('-OH'); return r; },
      short: '-O-→2×-OH', category:'转化' },
    { id:'diels_alder', name:'Diels-Alder', emoji:'⬡', desc:'共轭二烯→六元环(+4C)',
      check: m => m.hasConjugatedDiene(),
      apply: m => { const r = m.clone(); r.carbonCount += 4; r.rings.push('6-membered'); r.unsaturation = []; return r; },
      short: '+4C 成六元环', category:'增碳' },
];

// ==================== 关卡系统 ====================
const PRESET_LEVELS = [
    { id:1, name:'初级·醇合成', start: new MoleculeState(2,['-OH'],[],[],null,'R'), target: new MoleculeState(4,['-OH'],[],[],null,'R'), optimal:1, hint:'Grignard一步到位' },
    { id:2, name:'初级·醛转化', start: new MoleculeState(2,['-CHO'],[],[],null,'R'), target: new MoleculeState(4,['-OH'],[],[],null,'R'), optimal:1, hint:'Grignard +2C' },
    { id:3, name:'中级·氧化还原', start: new MoleculeState(3,['-OH'],[],[],null,'R'), target: new MoleculeState(3,['=O'],[],[],null,'R'), optimal:1, hint:'PCC氧化' },
    { id:4, name:'中级·多步合成', start: new MoleculeState(2,['-OH'],[],[],null,'R'), target: new MoleculeState(6,['-OH'],[],[],null,'R'), optimal:2, hint:'Aldol碳翻倍再用Grignard' },
    { id:5, name:'高级·成环', start: new MoleculeState(4,[],['C1=C2','C3=C4'],[],null,'R'), target: new MoleculeState(8,['-OH'],[],['6-membered'],null,'R'), optimal:2, hint:'Diels-Alder→Grignard' },
    { id:6, name:'大师·复杂合成', start: new MoleculeState(2,['-OH'],[],[],null,'R'), target: new MoleculeState(4,['-COO-'],[],[],null,'R'), optimal:3, hint:'氧化→Aldol→酯化' },
];

const RANDOM_STARTS = [
    new MoleculeState(2,['-OH'],[],[],null,'R'),
    new MoleculeState(2,['-CHO'],[],[],null,'R'),
    new MoleculeState(3,['=O'],[],[],null,'R'),
    new MoleculeState(2,['-COOH'],[],[],null,'R'),
    new MoleculeState(4,[],['C1=C2','C3=C4'],[],null,'R'),
];

// ==================== BFS路径求解 ====================
function findOptimalPath(startMol, targetMol, maxDepth = 8) {
    if (startMol.equals(targetMol)) return [];
    const visited = new Set();
    const queue = [{ mol: startMol.clone(), path: [] }];
    visited.add(stateKey(startMol));
    while (queue.length > 0) {
        const { mol, path } = queue.shift();
        if (path.length >= maxDepth) continue;
        for (const rxn of REACTIONS) {
            if (!rxn.check(mol)) continue;
            const next = rxn.apply(mol);
            const key = stateKey(next);
            if (visited.has(key)) continue;
            visited.add(key);
            const newPath = [...path, rxn.id];
            if (next.equals(targetMol)) return newPath;
            queue.push({ mol: next, path: newPath });
        }
    }
    return null;
}

function stateKey(mol) {
    return mol.carbonCount + '|' + [...mol.functionalGroups].sort().join(',') + '|' + [...mol.unsaturation].sort().join(',') + '|' + [...mol.rings].sort().join(',');
}

// ==================== 游戏状态 ====================
let currentMolecule = new MoleculeState(2,['-OH'],[],[],null,'R');
let targetMolecule = PRESET_LEVELS[0].target.clone();
let reactionHistory = [];
let steps = 0;
let hintsRemaining = 3;
let score = 0;
let optimalSteps = 1;
let mode = 'preset';
let currentLevel = 0;
let gameActive = true;
let gameWin = false;
let bestScore = 0;
let showHintHighlight = null;

    function setupThemeButton() {
        const isDark = localStorage.getItem('carbon_theme') === 'dark';
        if (darkModeToggle) {
            darkModeToggle.innerText = isDark ? '☀️ 浅色模式' : '🌙 深色模式';
            darkModeToggle.onclick = () => {
                document.body.classList.toggle('dark');
                const darkNow = document.body.classList.contains('dark');
                localStorage.setItem('carbon_theme', darkNow ? 'dark' : 'light');
                darkModeToggle.innerText = darkNow ? '☀️ 浅色模式' : '🌙 深色模式';
                updateSceneBackground(); // 更新3D场景背景
            };
        }
    }

    // 清理3D对象内存
    function dispose3DObject(obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(material => material.dispose());
            } else {
                obj.material.dispose();
            }
        }
    }
    
    function disposeGroup(group) {
        if (group && group.children) {
            while (group.children.length > 0) {
                const child = group.children[0];
                group.remove(child);
                dispose3DObject(child);
            }
        }
    }
    // 科学杂化判断函数 - 根据不饱和键和官能团确定每个碳原子的杂化
    function determineCarbonHybridization(carbonIndex, moleculeState, n) {
        if (!moleculeState) return 'sp3';
        
        const carbonNum = carbonIndex + 1;
        
        // 检查不饱和键（C=C 或 C≡C）
        for (let unsat of moleculeState.unsaturation) {
            const match = unsat.match(/C(\d+)([=≡])C(\d+)/);
            if (match) {
                const c1 = parseInt(match[1]);
                const bondType = match[2];   // "=" 或 "≡"
                const c2 = parseInt(match[3]);
                if (c1 === carbonNum || c2 === carbonNum) {
                    return bondType === '≡' ? 'sp' : 'sp2';
                }
            }
        }
        
        // 检查官能团 - 确定哪些碳携带有sp2杂化的官能团
        const fgs = moleculeState.functionalGroups;
        
        // 精确分配官能团到具体碳原子
        const assignments = [];
        const usage = new Array(n).fill(0);
        for (let g of fgs) {
            let best = 0;
            let min = usage[0];
            for (let i = 1; i < n; i++) {
                if (usage[i] < min) { min = usage[i]; best = i; }
            }
            if (g === '=O' || g === '-CHO' || g === '-COOH') {
                best = Math.floor(n / 2);
            }
            assignments.push({ idx: best, group: g });
            usage[best]++;
        }
        
        // 根据官能团设置杂化
        for (let a of assignments) {
            if (a.idx === carbonIndex) {
                if (a.group === '=O' || a.group === '-CHO' || a.group === '-COOH') {
                    return 'sp2';
                }
            }
        }
        
        return 'sp3';
    }
    
    // 计算碳原子位置：正确实现sp3/sp2/sp杂化几何构型
    function calculateCarbonPositions(n, moleculeState = null) {
        const positions = [];
        const bl = 1.5;
        const blDouble = 1.34; // C=C 键长更短
        const sp3A = Math.PI * 109.5 / 180;
        const sp2A = Math.PI * 2 / 3;

        // 先确定每个碳的杂化
        const hyb = [];
        for (let i = 0; i < n; i++) hyb.push(determineCarbonHybridization(i, moleculeState, n));

        // C1
        positions.push({ x: 0, y: 0, z: 0, hybridization: hyb[0] });
        if (n === 1) return positions;

        // C2 沿 X 轴
        const b0 = (hyb[1] === 'sp2' && hasDoubleBondBetween(0, 1, moleculeState)) ? blDouble : bl;
        positions.push({ x: b0, y: 0, z: 0, hybridization: hyb[1] });
        if (n === 2) return positions;

        // 维护当前方向和法向量实现真正的3D四面体交错构象
        let curDir = new THREE.Vector3(1, 0, 0); // 当前键方向
        let normal = new THREE.Vector3(0, 1, 0); // 垂直于键方向的"上"向量

        // C3 及之后
        for (let i = 2; i < n; i++) {
            const prev = positions[i-1];
            const vHyb = hyb[i-1]; // 顶点碳的杂化决定夹角
            const bondA = (vHyb === 'sp2') ? sp2A : sp3A;
            const extA = Math.PI - bondA;

            // 更新方向
            curDir = new THREE.Vector3(prev.x - positions[i-2].x, prev.y - positions[i-2].y, prev.z - positions[i-2].z).normalize();

            let rDir;
            if (vHyb === 'sp') {
                rDir = curDir.clone();
            } else if (vHyb === 'sp2') {
                // sp2: 在当前平面内旋转120°
                const q = new THREE.Quaternion().setFromAxisAngle(normal, extA);
                rDir = curDir.clone().applyQuaternion(q);
                // 更新法向量保持垂直于新方向
                normal = new THREE.Vector3().crossVectors(rDir, curDir).normalize();
            } else {
                // sp3 真正3D四面体：绕法向量旋转109.5°，然后绕新方向旋转180°（交错构象）
                const q1 = new THREE.Quaternion().setFromAxisAngle(normal, extA);
                rDir = curDir.clone().applyQuaternion(q1);
                // 交错：绕新键方向旋转180°
                const staggerQ = new THREE.Quaternion().setFromAxisAngle(rDir, Math.PI);
                normal = normal.clone().applyQuaternion(q1).applyQuaternion(staggerQ).normalize();
            }

            // 检查双键
            const isDouble = hasDoubleBondBetween(i-1, i, moleculeState);
            const bondLen = isDouble ? blDouble : bl;

            positions.push({
                x: prev.x + rDir.x * bondLen,
                y: prev.y + rDir.y * bondLen,
                z: prev.z + rDir.z * bondLen,
                hybridization: hyb[i]
            });
        }
        return positions;
    }

    function hasDoubleBondBetween(c1, c2, moleculeState) {
        if (!moleculeState) return false;
        const unsat = moleculeState.unsaturation || [];
        return unsat.some(u => {
            const m = u.match(/C(\d+)\s*=\s*C(\d+)/);
            if (!m) return false;
            const a = parseInt(m[1]);
            const b = parseInt(m[2]);
            return (a === c1+1 && b === c2+1) || (a === c2+1 && b === c1+1);
        });
    }
    let scene, camera, renderer, labelRenderer, controls, currentModelGroup = null;
    const container = document.getElementById('modelContainer');

    function init3D() {
        scene = new THREE.Scene();
        updateSceneBackground();
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(5, 4, 8);
        camera.lookAt(0, 0, 0);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        
        labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(container.clientWidth, container.clientHeight);
        labelRenderer.domElement.style.position = 'absolute';
        labelRenderer.domElement.style.top = '0px';
        labelRenderer.domElement.style.left = '0px';
        labelRenderer.domElement.style.pointerEvents = 'none';
        container.appendChild(labelRenderer.domElement);
        
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = false;
        controls.enableZoom = true;
        controls.enablePan = true;
        
        // 环境光 + 点光源
        const ambientLight = new THREE.AmbientLight(0x404060);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(2, 5, 3);
        scene.add(dirLight);
        const backLight = new THREE.PointLight(0x88aaff, 0.5);
        backLight.position.set(-2, 1, -3);
        scene.add(backLight);
        
        // 辅助地面（半透明，仅为了视觉参考）
        const gridHelper = new THREE.GridHelper(15, 20, 0x88aaff, 0x335588);
        gridHelper.position.y = -1.5;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.3;
        scene.add(gridHelper);
        
        window.addEventListener('resize', onWindowResize, false);
        animate();
    }
    
    function onWindowResize() {
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        labelRenderer.setSize(width, height);
    }
    
    function animate() {
        requestAnimationFrame(animate);
        controls.update(); // 更新轨道控制
        renderer.render(scene, camera);
        labelRenderer.render(scene, camera);
    }
    
    // 根据分子状态生成3D模型（增强版本）
    function generateCarbonChain(n, moleculeState = null, isTransition = false) {
        if (currentModelGroup) {
            scene.remove(currentModelGroup);
            // 清理材质等
            if (currentModelGroup.children) {
                currentModelGroup.children.forEach(child => {
                    if (child.isMesh) child.material.dispose();
                });
            }
        }
        const group = new THREE.Group();
        if (n === 0) return group;
        
        // 原子半径和键半径
        const atomRadius = 0.4;
        const bondRadius = 0.08;
        const carbonColor = isTransition ? 0x888888 : 0x6c8c5e;
        const hydrogenColor = 0xaaaaaa;
        const oxygenColor = 0xff4444;
        const nitrogenColor = 0x4444ff;
        
        // 计算碳原子位置: 正确的锯齿链，键角109.5°，键长1.54Å (缩放为1.5单位)
        const positions = calculateCarbonPositions(n, moleculeState);
        
        // 添加碳原子球体
        for (let i = 0; i < n; i++) {
            const pos = positions[i];
            const geometry = new THREE.SphereGeometry(atomRadius, 32, 32);
            const material = new THREE.MeshStandardMaterial({ 
                color: carbonColor, 
                roughness: 0.3, 
                metalness: 0.1,
                emissive: isTransition ? 0x222222 : 0x000000,
                emissiveIntensity: isTransition ? 0.3 : 0
            });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(pos.x, pos.y, pos.z);
            group.add(sphere);
            
            // 添加CSS2D文字标签
            const div = document.createElement('div');
            div.textContent = 'C';
            div.style.color = '#fff';
            div.style.fontSize = '18px';
            div.style.fontWeight = 'bold';
            div.style.textShadow = '1px 1px 0 #000';
            div.style.background = isTransition ? 'rgba(255,165,0,0.5)' : 'rgba(0,0,0,0.5)';
            div.style.padding = '2px 4px';
            div.style.borderRadius = '12px';
            const label = new CSS2DObject(div);
            label.position.set(pos.x, pos.y + 0.5, pos.z);
            group.add(label);
        }
        
        // 智能官能团定位和可视化 - 函数定义（必须在调用之前）
        
        // 向量归一化
        function normalizeVector(vector) {
            const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
            if (length === 0) return { x: 0, y: 1, z: 0 };
            
            return {
                x: vector.x / length,
                y: vector.y / length,
                z: vector.z / length
            };
        }
        
        // 获取可用的键方向
        function getAvailableBondDirections(carbonPos, carbonIndex, allPositions) {
            const directions = [];
            
            // 计算已占用的方向（碳-碳键）
            const occupiedDirections = [];
            
            // 检查与前后碳原子的连接
            if (carbonIndex > 0) {
                const prevCarbon = allPositions[carbonIndex - 1];
                const dir = {
                    x: prevCarbon.x - carbonPos.x,
                    y: prevCarbon.y - carbonPos.y,
                    z: prevCarbon.z - carbonPos.z
                };
                occupiedDirections.push(normalizeVector(dir));
            }
            
            if (carbonIndex < allPositions.length - 1) {
                const nextCarbon = allPositions[carbonIndex + 1];
                const dir = {
                    x: nextCarbon.x - carbonPos.x,
                    y: nextCarbon.y - carbonPos.y,
                    z: nextCarbon.z - carbonPos.z
                };
                occupiedDirections.push(normalizeVector(dir));
            }
            
            // 生成四面体方向
            const tetraDirections = [
                { x: 1, y: 1, z: 1 },
                { x: -1, y: 1, z: -1 },
                { x: 1, y: -1, z: -1 },
                { x: -1, y: -1, z: 1 },
                { x: 1, y: 0, z: -1 },
                { x: -1, y: 0, z: 1 }
            ];
            
            // 过滤掉已占用的方向
            tetraDirections.forEach(dir => {
                const normalized = normalizeVector(dir);
                let isOccupied = false;
                
                occupiedDirections.forEach(occupied => {
                    if (Math.abs(normalized.x - occupied.x) < 0.3 &&
                        Math.abs(normalized.y - occupied.y) < 0.3 &&
                        Math.abs(normalized.z - occupied.z) < 0.3) {
                        isOccupied = true;
                    }
                });
                
                if (!isOccupied) {
                    directions.push(normalized);
                }
            });
            
            return directions.length > 0 ? directions : [{ x: 0, y: 1, z: 0 }];
        }
        
        // 计算官能团位置的函数（科学版 - 根据杂化类型确定几何）
        function calculateFunctionalGroupPosition(groupType, carbonPos, hybridization, carbonIndex, moleculeState, allPositions) {
            const groupPositions = [];
            const bondLength = 1.2; // C-O键长
            
            // 计算可用的键方向 - 传入所有碳原子位置
            const availableDirections = getAvailableBondDirections(carbonPos, carbonIndex, allPositions || []);
            
            // 根据杂化类型确定键角和几何
            let bondAngle, geometry;
            if (hybridization === 'sp') {
                bondAngle = Math.PI; // 180°
                geometry = 'linear';
            } else if (hybridization === 'sp2') {
                bondAngle = Math.PI * 2 / 3; // 120°
                geometry = 'trigonal';
            } else {
                bondAngle = Math.PI * 109.5 / 180; // 109.5°
                geometry = 'tetrahedral';
            }
            
            if (groupType === '=O' || groupType === '-CHO') {
                // 羰基/醛基：sp2杂化，平面结构（120°）
                let carbonylPos;
                if (geometry === 'linear') {
                    // sp碳的羰基（累积烯烃）
                    carbonylPos = {
                        x: carbonPos.x,
                        y: carbonPos.y + bondLength,
                        z: carbonPos.z
                    };
                } else if (geometry === 'trigonal') {
                    // sp2碳的羰基，垂直于平面
                    carbonylPos = {
                        x: carbonPos.x,
                        y: carbonPos.y + bondLength,
                        z: carbonPos.z
                    };
                } else {
                    // sp3碳的羰基（不稳定）
                    carbonylPos = availableDirections[0] ? {
                        x: carbonPos.x + normalizeVector(availableDirections[0]).x * bondLength,
                        y: carbonPos.y + normalizeVector(availableDirections[0]).y * bondLength,
                        z: carbonPos.z + normalizeVector(availableDirections[0]).z * bondLength
                    } : { x: carbonPos.x, y: carbonPos.y + bondLength, z: carbonPos.z };
                }

                groupPositions.push({
                    position: carbonylPos,
                    symbol: 'O',
                    color: oxygenColor,
                    size: atomRadius * 0.8,
                    bondType: 'double'
                });
                
                if (groupType === '-CHO') {
                    // 醛基的氢原子
                    const hydrogenPos = {
                        x: carbonPos.x - bondLength * 0.8,
                        y: carbonPos.y,
                        z: carbonPos.z
                    };
                    
                    groupPositions.push({
                        position: hydrogenPos,
                        symbol: 'H',
                        color: hydrogenColor,
                        size: atomRadius * 0.6,
                        bondType: 'single'
                    });
                }
                
            } else if (groupType === '-OH') {
                // 羟基：sp3四面体方向
                let ohPos;
                if (availableDirections.length > 0) {
                    const normalized = normalizeVector(availableDirections[0]);
                    ohPos = {
                        x: carbonPos.x + normalized.x * bondLength,
                        y: carbonPos.y + normalized.y * bondLength,
                        z: carbonPos.z + normalized.z * bondLength
                    };
                } else {
                    ohPos = { x: carbonPos.x + bondLength, y: carbonPos.y + 0.5, z: carbonPos.z };
                }
                
                groupPositions.push({
                    position: ohPos,
                    symbol: 'O',
                    color: oxygenColor,
                    size: atomRadius * 0.8,
                    bondType: 'single'
                });
                
            } else if (groupType === '-COOH') {
                // 羧基：羰基+羟基，sp2平面结构
                // 羰基部分
                const carbonylPos = {
                    x: carbonPos.x,
                    y: carbonPos.y + bondLength,
                    z: carbonPos.z
                };
                
                groupPositions.push({
                    position: carbonylPos,
                    symbol: 'O',
                    color: oxygenColor,
                    size: atomRadius * 0.8,
                    bondType: 'double'
                });
                
                // 羟基部分
                let ohPos;
                if (availableDirections.length > 0) {
                    const normalized = normalizeVector(availableDirections[0]);
                    ohPos = {
                        x: carbonPos.x + normalized.x * bondLength * 1.2,
                        y: carbonPos.y + normalized.y * bondLength * 1.2,
                        z: carbonPos.z + normalized.z * bondLength * 1.2
                    };
                } else {
                    ohPos = { x: carbonPos.x + bondLength, y: carbonPos.y, z: carbonPos.z + 0.5 };
                }
                
                groupPositions.push({
                    position: ohPos,
                    symbol: 'O',
                    color: oxygenColor,
                    size: atomRadius * 0.8,
                    bondType: 'single'
                });
                
            } else if (groupType === '-O-') {
                // 醚基：sp3四面体方向
                let etherPos;
                if (availableDirections.length > 0) {
                    const normalized = normalizeVector(availableDirections[0]);
                    etherPos = {
                        x: carbonPos.x + normalized.x * bondLength,
                        y: carbonPos.y + normalized.y * bondLength,
                        z: carbonPos.z + normalized.z * bondLength
                    };
                } else {
                    etherPos = { x: carbonPos.x + bondLength, y: carbonPos.y + 0.5, z: carbonPos.z };
                }
                
                groupPositions.push({
                    position: etherPos,
                    symbol: 'O',
                    color: oxygenColor,
                    size: atomRadius * 0.8,
                    bondType: 'single'
                });
            }
            
            return groupPositions;
        }
        
        // 智能分配官能团到碳原子
        function assignFunctionalGroupsToCarbons(functionalGroups, positions) {
            const assignments = [];
            const carbonUsage = new Array(positions.length).fill(0); // 每个碳原子已使用的官能团数量
            
            functionalGroups.forEach((group, index) => {
                let bestCarbonIndex = 0;
                let minUsage = carbonUsage[0];
                
                // 找到使用最少的碳原子
                for (let i = 1; i < positions.length; i++) {
                    if (carbonUsage[i] < minUsage) {
                        minUsage = carbonUsage[i];
                        bestCarbonIndex = i;
                    }
                }
                
                // 特殊处理：羰基和醛基优先分配给链中心位置
                if (group === '=O' || group === '-CHO') {
                    bestCarbonIndex = Math.floor(positions.length / 2); // 链中心
                }
                
                assignments.push({
                    carbonIndex: bestCarbonIndex,
                    groupType: group
                });
                
                carbonUsage[bestCarbonIndex]++;
            });
            
            return assignments;
        }
        
        // 添加官能团原子的辅助函数
        function addFunctionalGroupAtom(group, position, symbol, color, size, carbonPos, bondRadius, isTransition, bondType = 'single') {
            // 创建官能团原子
            const atomGeometry = new THREE.SphereGeometry(size, 20, 20);
            const atomMaterial = new THREE.MeshStandardMaterial({ 
                color: color, 
                roughness: 0.15, 
                metalness: 0.05,
                emissive: isTransition ? color : 0x000000,
                emissiveIntensity: isTransition ? 0.6 : 0
            });
            const atomSphere = new THREE.Mesh(atomGeometry, atomMaterial);
            atomSphere.position.set(position.x, position.y, position.z);
            group.add(atomSphere);
            
            // 添加发光效果
            if (isTransition) {
                const glowGeometry = new THREE.SphereGeometry(size * 1.3, 16, 16);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.3
                });
                const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
                glowSphere.position.set(position.x, position.y, position.z);
                group.add(glowSphere);
            }
            
            // 添加原子标签
            const atomDiv = document.createElement('div');
            atomDiv.textContent = symbol;
            atomDiv.style.color = '#fff';
            atomDiv.style.fontSize = '12px';
            atomDiv.style.fontWeight = 'bold';
            atomDiv.style.textShadow = '1px 1px 0 #000';
            atomDiv.style.background = isTransition ?
                `linear-gradient(135deg, #${color.toString(16).padStart(6, '0')}88, #${color.toString(16).padStart(6, '0')}cc)` :
                `#${color.toString(16).padStart(6, '0')}cc`;
            atomDiv.style.padding = '3px 6px';
            atomDiv.style.borderRadius = '10px';
            atomDiv.style.border = isTransition ? '2px solid rgba(255,255,255,0.8)' : 'none';
            const atomLabel = new CSS2DObject(atomDiv);
            atomLabel.position.set(position.x, position.y + size + 0.15, position.z);
            group.add(atomLabel);
            
            // 添加化学键
            const bondStart = new THREE.Vector3(carbonPos.x, carbonPos.y, carbonPos.z);
            const bondEnd = new THREE.Vector3(position.x, position.y, position.z);
            const bondDirection = new THREE.Vector3().subVectors(bondEnd, bondStart);
            const bondLength = bondDirection.length();
            const bondCenter = bondStart.clone().add(bondEnd).multiplyScalar(0.5);
            
            // 根据键类型设置键的粗细
            let bondRadiusMultiplier = 1.0;
            if (bondType === 'double') bondRadiusMultiplier = 1.4;
            else if (bondType === 'triple') bondRadiusMultiplier = 1.8;
            
            const bondCylinder = new THREE.Mesh(
                new THREE.CylinderGeometry(
                    bondRadius * bondRadiusMultiplier, 
                    bondRadius * bondRadiusMultiplier, 
                    bondLength, 12
                ),
                new THREE.MeshStandardMaterial({ 
                    color: isTransition ? 0xffffff : 0xccccaa, 
                    roughness: 0.3,
                    metalness: 0.1,
                    emissive: isTransition ? 0x666666 : 0x000000,
                    emissiveIntensity: isTransition ? 0.3 : 0
                })
            );
            bondCylinder.position.copy(bondCenter);
            bondCylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), bondDirection.clone().normalize());
            group.add(bondCylinder);
            
            // 双键添加第二个键
            if (bondType === 'double') {
                const offset = 0.15;
                const perpDir = new THREE.Vector3(-bondDirection.z, 0, bondDirection.x).normalize();
                const doubleBondStart = bondStart.clone().add(perpDir.multiplyScalar(offset));
                const doubleBondEnd = bondEnd.clone().add(perpDir.multiplyScalar(offset));
                const doubleBondCenter = doubleBondStart.clone().add(doubleBondEnd).multiplyScalar(0.5);
                
                const doubleBondCylinder = new THREE.Mesh(
                    new THREE.CylinderGeometry(bondRadius * 0.6, bondRadius * 0.6, bondLength, 8),
                    new THREE.MeshStandardMaterial({ 
                        color: isTransition ? 0xffffff : 0xccccaa, 
                        roughness: 0.3,
                        emissive: isTransition ? 0x666666 : 0x000000,
                        emissiveIntensity: isTransition ? 0.3 : 0
                    })
                );
                doubleBondCylinder.position.copy(doubleBondCenter);
                doubleBondCylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), bondDirection.clone().normalize());
                group.add(doubleBondCylinder);
            }
        }
        
        // 现在执行官能团定位和可视化
        if (moleculeState && moleculeState.functionalGroups.length > 0) {
            // 为每个官能团智能分配碳原子位置
            const functionalGroupAssignments = assignFunctionalGroupsToCarbons(moleculeState.functionalGroups, positions);
            
            functionalGroupAssignments.forEach((assignment, index) => {
                const { carbonIndex, groupType } = assignment;
                const carbonPos = positions[carbonIndex];
                const carbonHybridization = carbonPos.hybridization || 'sp3';
                
                // 根据官能团类型和杂化状态计算位置
                let functionalGroupPositions = calculateFunctionalGroupPosition(groupType, carbonPos, carbonHybridization, carbonIndex, moleculeState, positions);
                
                // 为每个位置添加原子
                functionalGroupPositions.forEach(posInfo => {
                    addFunctionalGroupAtom(group, posInfo.position, posInfo.symbol, posInfo.color, posInfo.size, carbonPos, bondRadius, isTransition, posInfo.bondType);
                });
            });
        }
        
        // 添加碳-碳键 (圆柱体) - 根据不饱和键类型显示双键或三键
        for (let i = 0; i < n-1; i++) {
            const p1 = positions[i];
            const p2 = positions[i+1];
            const start = new THREE.Vector3(p1.x, p1.y, p1.z);
            const end = new THREE.Vector3(p2.x, p2.y, p2.z);
            const direction = new THREE.Vector3().subVectors(end, start);
            const length = direction.length();
            
            // 检查是否为双键或三键
            let bondType = 'single';
            if (moleculeState && moleculeState.unsaturation) {
                for (let unsat of moleculeState.unsaturation) {
                    const match = unsat.match(/C(\d+)([=≡])C(\d+)/);
                    if (match) {
                        const c1 = parseInt(match[1]);
                        const c2 = parseInt(match[3]);
                        const bondSymbol = match[2];
                        // 检查当前碳-碳键是否为不饱和键
                        if ((c1 === i+1 && c2 === i+2) || (c1 === i+2 && c2 === i+1)) {
                            bondType = (bondSymbol === '≡') ? 'triple' : 'double';
                            break;
                        }
                    }
                }
            }
            
            // 计算键的偏移方向（垂直于键方向）
            const perpDir = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
            if (perpDir.length() < 0.001) {
                perpDir.set(0, -direction.z, direction.y).normalize();
            }
            
            // 主键
            const center = start.clone().add(end).multiplyScalar(0.5);
            const mainBond = new THREE.Mesh(
                new THREE.CylinderGeometry(bondRadius, bondRadius, length, 8),
                new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.4 })
            );
            mainBond.position.copy(center);
            mainBond.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), direction.clone().normalize());
            group.add(mainBond);
            
            // 双键：添加第二条平行键
            if (bondType === 'double') {
                const offset = 0.12;
                const doubleCenter = center.clone().add(perpDir.clone().multiplyScalar(offset));
                const doubleBond = new THREE.Mesh(
                    new THREE.CylinderGeometry(bondRadius * 0.5, bondRadius * 0.5, length, 8),
                    new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.4 })
                );
                doubleBond.position.copy(doubleCenter);
                doubleBond.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), direction.clone().normalize());
                group.add(doubleBond);
            }
            
            // 三键：添加两条平行键
            if (bondType === 'triple') {
                const offset1 = 0.15;
                const offset2 = 0.08;
                // 第一条平行键
                const tripleCenter1 = center.clone().add(perpDir.clone().multiplyScalar(offset1));
                const tripleBond1 = new THREE.Mesh(
                    new THREE.CylinderGeometry(bondRadius * 0.45, bondRadius * 0.45, length, 8),
                    new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.4 })
                );
                tripleBond1.position.copy(tripleCenter1);
                tripleBond1.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), direction.clone().normalize());
                group.add(tripleBond1);
                
                // 第二条平行键（另一侧）
                const tripleCenter2 = center.clone().add(perpDir.clone().multiplyScalar(-offset1));
                const tripleBond2 = new THREE.Mesh(
                    new THREE.CylinderGeometry(bondRadius * 0.45, bondRadius * 0.45, length, 8),
                    new THREE.MeshStandardMaterial({ color: 0xccccaa, roughness: 0.4 })
                );
                tripleBond2.position.copy(tripleCenter2);
                tripleBond2.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), direction.clone().normalize());
                group.add(tripleBond2);
            }
        }
        // 添加氢原子 (根据杂化类型正确计算)
        for (let i = 0; i < n; i++) {
            const pos = positions[i];
            const hybridization = pos.hybridization || 'sp3';
            const hGeometry = new THREE.SphereGeometry(0.25, 16, 16);
            const hMaterial = new THREE.MeshStandardMaterial({ color: hydrogenColor });
            
            const maxHAtoms = (hybridization === 'sp') ? 2 : (hybridization === 'sp2') ? 3 : 4;
            let connectedCarbons = 0;
            if (i > 0) connectedCarbons++;
            if (i < n - 1) connectedCarbons++;
            
            let fgCount = 0;
            if (moleculeState && moleculeState.functionalGroups.length > 0) {
                const ci = Math.floor(n / 2);
                if ((moleculeState.functionalGroups.includes('=O') || moleculeState.functionalGroups.includes('-CHO') || moleculeState.functionalGroups.includes('-COOH')) && i === ci) fgCount = 1;
                if (moleculeState.functionalGroups.includes('-OH') || moleculeState.functionalGroups.includes('-O-')) {
                    if (i === 0 || i === n - 1 || i === ci) fgCount++;
                }
            }
            
            const hCount = Math.max(0, maxHAtoms - connectedCarbons - fgCount);
            const hD = 0.7;
            let hPositions = [];
            
            if (i === 0 && n === 1 && hybridization === 'sp3') {
                const d = hD;
                const t = [{ x: d, y: 0, z: 0 }, { x: -d/3, y: d*Math.sqrt(8)/3, z: 0 }, { x: -d/3, y: -d*Math.sqrt(2)/3, z: d*Math.sqrt(6)/3 }, { x: -d/3, y: -d*Math.sqrt(2)/3, z: -d*Math.sqrt(6)/3 }];
                hPositions = t.map(p => ({ x: pos.x + p.x, y: pos.y + p.y, z: pos.z + p.z }));
            } else if (hCount > 0) {
                // 计算指向外部的方向
                let outDir;
                if (i === 0) {
                    const toNeighbor = new THREE.Vector3(positions[1].x - pos.x, positions[1].y - pos.y, positions[1].z - pos.z).normalize();
                    outDir = toNeighbor.clone().negate(); // 指向远离邻居的方向
                } else if (i === n - 1) {
                    const toNeighbor = new THREE.Vector3(positions[i-1].x - pos.x, positions[i-1].y - pos.y, positions[i-1].z - pos.z).normalize();
                    outDir = toNeighbor.clone().negate(); // 指向远离邻居的方向
                } else {
                    const toPrev = new THREE.Vector3(positions[i-1].x - pos.x, positions[i-1].y - pos.y, positions[i-1].z - pos.z).normalize();
                    const toNext = new THREE.Vector3(positions[i+1].x - pos.x, positions[i+1].y - pos.y, positions[i+1].z - pos.z).normalize();
                    outDir = new THREE.Vector3().addVectors(toPrev, toNext).normalize().negate();
                }
                
                if (hybridization === 'sp') {
                    // sp: 线性，H 在 C-C 延长线上
                    for (let h = 0; h < hCount; h++) {
                        hPositions.push({ x: pos.x + outDir.x * hD, y: pos.y + outDir.y * hD, z: pos.z + outDir.z * hD });
                    }
                } else if (hybridization === 'sp2') {
                    // sp2: 平面三角形，H 在 C-C 两侧 ±60°
                    const axisZ = new THREE.Vector3(0, 0, 1);
                    const perp = new THREE.Vector3().crossVectors(outDir, axisZ).normalize();
                    if (perp.length() < 0.1) perp.set(0, 1, 0);
                    for (let h = 0; h < hCount; h++) {
                        const sign = (h === 0) ? 1 : -1;
                        hPositions.push({
                            x: pos.x + outDir.x * 0.5 + perp.x * sign * 0.5,
                            y: pos.y + outDir.y * 0.5 + perp.y * sign * 0.5,
                            z: pos.z + outDir.z * 0.5 + perp.z * sign * 0.5
                        });
                    }
                } else {
                    // sp3: 四面体
                    const upVec = new THREE.Vector3(0, 1, 0);
                    const side = new THREE.Vector3().crossVectors(outDir, upVec).normalize();
                    if (side.length() < 0.1) side.set(1, 0, 0);
                    const up = new THREE.Vector3().crossVectors(outDir, side).normalize();
                    for (let h = 0; h < hCount; h++) {
                        const a = h * 2.094 + 0.523;
                        hPositions.push({
                            x: pos.x + outDir.x * 0.4 + side.x * 0.5 * Math.cos(a) + up.x * 0.5 * Math.sin(a),
                            y: pos.y + outDir.y * 0.4 + side.y * 0.5 * Math.cos(a) + up.y * 0.5 * Math.sin(a),
                            z: pos.z + outDir.z * 0.4 + side.z * 0.5 * Math.cos(a) + up.z * 0.5 * Math.sin(a)
                        });
                    }
                }
            }
            
            for (let hPos of hPositions) {
                if (hPos && typeof hPos.x === 'number' && typeof hPos.y === 'number' && typeof hPos.z === 'number' &&
                    !isNaN(hPos.x) && !isNaN(hPos.y) && !isNaN(hPos.z)) {
                    const hSphere = new THREE.Mesh(hGeometry, hMaterial);
                    hSphere.position.set(hPos.x, hPos.y, hPos.z);
                    group.add(hSphere);
                }
            }
        }
        return group;
    }
    
    let isTransitioning = false;
    let transitionStartMolecule = null;
    let transitionEndMolecule = null;
    let transitionProgress = 0;
    
    function update3DModel(withTransition = false) {
        if (!scene) return;
        
        if (withTransition && !isTransitioning) {
            // 启动过渡动画
            transitionStartMolecule = currentModelGroup;
            transitionEndMolecule = generateCarbonChain(currentMolecule.carbonCount, currentMolecule, true);
            transitionProgress = 0;
            isTransitioning = true;
            if (transitionEndMolecule) scene.add(transitionEndMolecule);
            animateTransition();
        } else {
            // 直接更新模型
            const newGroup = generateCarbonChain(currentMolecule.carbonCount, currentMolecule, false);
            
            // 清理旧模型
            if (currentModelGroup) {
                scene.remove(currentModelGroup);
                disposeGroup(currentModelGroup);
            }
            
            currentModelGroup = newGroup;
            scene.add(currentModelGroup);
            
            // 调整相机视口适应分子大小 - 包括氢原子
            if (currentMolecule.carbonCount > 1) {
                // 计算所有原子位置（包括氢原子）的边界框
                const positions = calculateCarbonPositions(currentMolecule.carbonCount);
                let allPositions = [...positions];
                
                // 估算氢原子位置用于边界框计算
                for (let i = 0; i < currentMolecule.carbonCount; i++) {
                    const pos = positions[i];
                    const hCount = (i === 0 && currentMolecule.carbonCount === 1) ? 4 : 
                                  (i === 0 || i === currentMolecule.carbonCount-1) ? 3 : 2;
                    
                    // 简化估算氢原子位置范围
                    for (let j = 0; j < hCount; j++) {
                        allPositions.push({
                            x: pos.x + (j % 2 === 0 ? 0.7 : -0.7),
                            y: pos.y + (j % 3 === 0 ? 0.7 : -0.7),
                            z: pos.z + (j % 2 === 0 ? 0.5 : -0.5)
                        });
                    }
                }
                
                // 计算边界框
                const minX = Math.min(...allPositions.map(p => p.x));
                const maxX = Math.max(...allPositions.map(p => p.x));
                const minY = Math.min(...allPositions.map(p => p.y));
                const maxY = Math.max(...allPositions.map(p => p.y));
                const minZ = Math.min(...allPositions.map(p => p.z));
                const maxZ = Math.max(...allPositions.map(p => p.z));
                
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                const centerZ = (minZ + maxZ) / 2;
                
                const sizeX = maxX - minX;
                const sizeY = maxY - minY;
                const sizeZ = maxZ - minZ;
                const maxSize = Math.max(sizeX, sizeY, sizeZ);
                
                // 调整相机距离和位置
                const distance = Math.max(10, maxSize * 3);
                camera.position.set(distance * 0.8, distance * 0.6, distance * 0.8);
                camera.lookAt(centerX, centerY, centerZ);
                controls.target.set(centerX, centerY, centerZ);
                controls.update();
            }
        }
    }
    
    function animateTransition() {
        if (!isTransitioning) return;
        
        transitionProgress += 0.02; // 2% per frame
        
        if (transitionProgress >= 1.0) {
            // 过渡完成 - 用正确颜色重建模型
            isTransitioning = false;
            if (transitionStartMolecule) {
                scene.remove(transitionStartMolecule);
                disposeGroup(transitionStartMolecule);
            }
            if (transitionEndMolecule) {
                scene.remove(transitionEndMolecule);
                disposeGroup(transitionEndMolecule);
            }
            // 重建非过渡模型（正确绿色）
            currentModelGroup = generateCarbonChain(currentMolecule.carbonCount, currentMolecule, false);
            if (currentModelGroup) scene.add(currentModelGroup);
            transitionProgress = 0;
            return;
        }
        
        // 插值动画
        const easeProgress = easeInOutCubic(transitionProgress);
        
        // 更新开始模型的透明度
        if (transitionStartMolecule) {
            transitionStartMolecule.children.forEach(child => {
                if (child.isMesh && child.material) {
                    child.material.opacity = 1 - easeProgress;
                    child.material.transparent = true;
                }
            });
        }
        
        // 更新结束模型的透明度
        if (transitionEndMolecule) {
            transitionEndMolecule.children.forEach(child => {
                if (child.isMesh && child.material) {
                    child.material.opacity = easeProgress;
                    child.material.transparent = true;
                }
            });
        }

        requestAnimationFrame(animateTransition);
    }
    
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    

// ==================== 游戏逻辑 ====================
function applyReaction(reactionId) {
    if (!gameActive || gameWin) return;
    const rxn = REACTIONS.find(r => r.id === reactionId);
    if (!rxn || !rxn.check(currentMolecule)) {
        showMessage('该反应不适用于当前分子', false);
        return;
    }
    const prev = currentMolecule.clone();
    currentMolecule = rxn.apply(currentMolecule);
    steps++;
    reactionHistory.push({ reaction: rxn, before: prev, after: currentMolecule.clone() });
    showHintHighlight = null;
    update3DModel(true);
    updateUI();
    if (currentMolecule.equals(targetMolecule)) {
        gameWin = true;
        gameActive = false;
        const diff = steps - optimalSteps;
        score = Math.max(10, 100 - diff * 15);
        if (score > bestScore) { bestScore = score; localStorage.setItem('chain_best_' + mode + '_' + currentLevel, score); }
        showMessage('合成成功！得分：' + score + ' (最优' + optimalSteps + '步，你用了' + steps + '步)', true);
    } else {
        showMessage(rxn.emoji + ' ' + rxn.name + ': ' + rxn.short + ' → ' + currentMolecule.getDescription(), true);
    }
}

function undoReaction() {
    if (!gameActive || reactionHistory.length === 0) return;
    const last = reactionHistory[reactionHistory.length - 1];
    currentMolecule = last.before.clone();
    reactionHistory.pop();
    steps--;
    showHintHighlight = null;
    update3DModel(true);
    updateUI();
    showMessage('已撤销：回到 ' + currentMolecule.getDescription(), false);
}

function useHint() {
    if (!gameActive || hintsRemaining <= 0) return;
    const path = findOptimalPath(currentMolecule, targetMolecule, 8);
    if (!path || path.length === 0) { showMessage('未找到到达目标的路径...', false); return; }
    hintsRemaining--;
    showHintHighlight = path[0];
    const rxn = REACTIONS.find(r => r.id === path[0]);
    showMessage('提示(' + hintsRemaining + '次剩余): 建议 ' + (rxn ? rxn.name : path[0]), true);
    updateUI();
}

function startGame(newMode, levelId) {
    mode = newMode;
    gameActive = true;
    gameWin = false;
    steps = 0;
    hintsRemaining = 3;
    score = 0;
    reactionHistory = [];
    showHintHighlight = null;
    if (mode === 'preset') {
        currentLevel = levelId !== undefined ? levelId : currentLevel;
        const lvl = PRESET_LEVELS[currentLevel];
        currentMolecule = lvl.start.clone();
        targetMolecule = lvl.target.clone();
        optimalSteps = lvl.optimal;
    } else {
        currentLevel = -1;
        const start = RANDOM_STARTS[Math.floor(Math.random() * RANDOM_STARTS.length)];
        currentMolecule = start.clone();
        const targets = [];
        for (let i = 0; i < 20; i++) {
            const steps = 3 + Math.floor(Math.random() * 4);
            let mol = start.clone();
            const path = [];
            for (let j = 0; j < steps; j++) {
                const avail = REACTIONS.filter(r => r.check(mol));
                if (avail.length === 0) break;
                const rxn = avail[Math.floor(Math.random() * avail.length)];
                mol = rxn.apply(mol);
                path.push(rxn.id);
            }
            if (path.length >= 2 && mol.carbonCount >= 3 && mol.carbonCount <= 12) {
                targets.push({ mol: mol.clone(), path });
            }
        }
        if (targets.length > 0) {
            const pick = targets[Math.floor(Math.random() * targets.length)];
            targetMolecule = pick.mol.clone();
            optimalSteps = findOptimalPath(currentMolecule, targetMolecule, 6)?.length || pick.path.length;
        } else {
            targetMolecule = PRESET_LEVELS[0].target.clone();
            optimalSteps = 1;
        }
    }
    bestScore = parseInt(localStorage.getItem('chain_best_' + mode + '_' + currentLevel) || '0');
    update3DModel(false);
    updateUI();
    showMessage('目标: ' + targetMolecule.getDescription() + ' | 最优' + optimalSteps + '步', true);
}

function showMessage(msg, isGood) {
    const el = document.getElementById('feedbackMsg');
    if (!el) return;
    el.innerHTML = msg;
    el.className = 'feedback ' + (isGood ? 'success' : 'error');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => { el.innerHTML = ''; el.className = 'feedback'; }, 4000);
}


// ==================== UI渲染 ====================
function renderReactionCards() {
    const grid = document.getElementById('reactionGrid');
    if (!grid) return;
    grid.innerHTML = '';
    REACTIONS.forEach(rxn => {
        const avail = rxn.check(currentMolecule);
        const hinted = showHintHighlight === rxn.id;
        const card = document.createElement('div');
        card.className = 'rxn-card' + (avail ? ' available' : ' disabled') + (hinted ? ' hinted' : '');
        card.innerHTML = '<div class="rxn-emoji">' + rxn.emoji + '</div>' +
            '<div class="rxn-name">' + rxn.name + '</div>' +
            '<div class="rxn-desc">' + rxn.short + '</div>';
        if (avail) card.onclick = function() { applyReaction(rxn.id); };
        grid.appendChild(card);
    });
}

function renderHistory() {
    const el = document.getElementById('historyList');
    if (!el) return;
    if (reactionHistory.length === 0) {
        el.innerHTML = '<div class="hist-empty">还没有执行反应</div>';
    } else {
        el.innerHTML = reactionHistory.map(function(h, i) {
            return '<div class="hist-item"><span class="hist-num">' + (i+1) + '.</span> ' +
                h.reaction.emoji + ' ' + h.reaction.name +
                ' <span class="hist-arrow">→</span> ' + h.after.getDescription() + '</div>';
        }).join('');
    }
}

function updateUI() {
    const detailEl = document.getElementById('moleculeDetail');
    if (detailEl) detailEl.innerHTML = '<b>当前:</b> ' + currentMolecule.getDescription() +
        '<br><small>官能团: ' + (currentMolecule.functionalGroups.length > 0 ? currentMolecule.functionalGroups.join(', ') : '无') + '</small>' +
        (currentMolecule.rings.length > 0 ? '<br><small>环: ' + currentMolecule.rings.join(', ') + '</small>' : '');
    const ccEl = document.getElementById('carbonCount');
    if (ccEl) ccEl.textContent = currentMolecule.carbonCount.toString();
    const tgtEl = document.getElementById('targetInfo');
    if (tgtEl) tgtEl.innerHTML = '<b>目标:</b> ' + targetMolecule.getDescription() + '<br><small>最优' + optimalSteps + '步 | 你走了' + steps + '步</small>';
    const scoreEl = document.getElementById('scoreDisplay');
    if (scoreEl) scoreEl.textContent = gameWin ? '得分: ' + score : (bestScore > 0 ? '最佳: ' + bestScore : '--');
    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) { hintBtn.textContent = '提示(' + hintsRemaining + ')'; hintBtn.disabled = hintsRemaining <= 0 || !gameActive; }
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.disabled = reactionHistory.length === 0 || !gameActive;
    const lvlEl = document.getElementById('levelInfo');
    if (lvlEl && mode === 'preset') lvlEl.textContent = '第' + (currentLevel+1) + '关: ' + PRESET_LEVELS[currentLevel].name;
    const nextBtn = document.getElementById('nextLevelBtn');
    if (nextBtn) nextBtn.style.display = (gameWin && mode === 'preset' && currentLevel < PRESET_LEVELS.length-1) ? '' : 'none';
    renderReactionCards();
    renderHistory();
}

function renderLevelSelect() {
    const el = document.getElementById('levelSelect');
    if (!el) return;
    el.innerHTML = PRESET_LEVELS.map(function(lvl, i) {
        var best = localStorage.getItem('chain_best_preset_' + i);
        return '<button class="lvl-btn' + (i === currentLevel ? ' active' : '') + '" id="lvlBtn' + i + '">' +
            lvl.name + (best ? ' ⭐' + best : '') + '</button>';
    }).join('');
    PRESET_LEVELS.forEach(function(lvl, i) {
        var btn = document.getElementById('lvlBtn' + i);
        if (btn) btn.onclick = function() { currentLevel = i; startGame('preset', i); renderLevelSelect(); };
    });
}


// ==================== 事件处理 ====================
function setupEventHandlers() {
    var resetBtn = document.getElementById('resetBtn');
    var hintBtn = document.getElementById('hintBtn');
    var undoBtn = document.getElementById('undoBtn');
    var randomBtn = document.getElementById('randomBtn');
    var nextLevelBtn = document.getElementById('nextLevelBtn');
    if (resetBtn) resetBtn.addEventListener('click', function() { startGame(mode, currentLevel); });
    if (hintBtn) hintBtn.addEventListener('click', useHint);
    if (undoBtn) undoBtn.addEventListener('click', undoReaction);
    if (randomBtn) randomBtn.addEventListener('click', function() { startGame('random'); });
    if (nextLevelBtn) nextLevelBtn.addEventListener('click', function() {
        if (currentLevel < PRESET_LEVELS.length-1) { currentLevel++; startGame('preset', currentLevel); renderLevelSelect(); }
    });
}

    function updateSceneBackground() {
        if (!scene) return;
        const isDark = document.body.classList.contains('dark');
        scene.background = new THREE.Color(isDark ? 0x0f172a : 0xf5f7fb);
    }
    
    function initTheme() {
        const isDark = localStorage.getItem('carbon_theme') === 'dark';
        if (isDark) document.body.classList.add('dark');
        // 主题按钮设置现在在setupThemeButton()中处理
    }
    
    // ======================= 共享音乐管理器 =======================
    function initSharedMusicPlayer() {
        // 音乐数据
        const musicData = {
            global: [
                { file: 'ALL-FUSHI.mp3', title: 'FUSHI', duration: '3:40' },
                { file: 'ALL-ヤチヨ降臨.mp3', title: 'ヤチヨ降臨', duration: '4:02' },
                { file: 'ALL-私の好きだったもの.mp3', title: '私の好きだったもの', duration: '1:48' },
                { file: 'All-月影.mp3', title: '月影', duration: '4:32' },
                { file: 'IROHA.mp3', title: 'IROHA', duration: '1:30' }
            ],
            tsukuyomi: [
                { file: 'OPENING ACT@TSUKUYOMI.mp3', title: 'OPENING ACT@TSUKUYOMI', duration: '3:38' },
                { file: 'TSUKUYOMI.mp3', title: 'TSUKUYOMI', duration: '6:44' },
                { file: 'IROHA.mp3', title: 'IROHA', duration: '1:30' },
                { file: 'うつし世の姫.mp3', title: 'うつし世の姫', duration: '6:43' },
                { file: 'かぐやと彩葉.mp3', title: 'かぐやと彩葉', duration: '3:08' }
            ]
        };

        // 音乐播放器状态 - 从localStorage恢复
        let currentMusic = localStorage.getItem('currentMusic') || null;
        let isPlaying = localStorage.getItem('musicPlaying') === 'true';
        let currentVolume = parseFloat(localStorage.getItem('musicVolume')) || 0.5;
        let audioElement = null;

        // 创建音频元素
        function createAudioElement() {
            if (audioElement) {
                audioElement.pause();
                audioElement.remove();
            }
            audioElement = new Audio();
            audioElement.volume = currentVolume;
            audioElement.loop = false;
            
            // 播放结束事件
            audioElement.addEventListener('ended', () => {
                playNextMusic();
            });
            
            // 保存状态
            audioElement.addEventListener('play', () => {
                isPlaying = true;
                localStorage.setItem('musicPlaying', 'true');
                updateMusicUI();
            });
            
            audioElement.addEventListener('pause', () => {
                isPlaying = false;
                localStorage.setItem('musicPlaying', 'false');
                updateMusicUI();
            });
        }

        // 平滑音量切换
        function smoothVolumeChange(targetVolume, duration = 500) {
            if (!audioElement) return;
            
            const startVolume = audioElement.volume;
            const volumeDiff = targetVolume - startVolume;
            const startTime = Date.now();
            
            function updateVolume() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                audioElement.volume = startVolume + (volumeDiff * progress);
                
                if (progress < 1) {
                    requestAnimationFrame(updateVolume);
                }
            }
            
            updateVolume();
        }

        // 播放音乐
        function playMusic(musicFile) {
            if (!musicFile) return;
            
            // 如果正在播放，先淡出
            if (isPlaying && audioElement) {
                smoothVolumeChange(0, 300);
                setTimeout(() => {
                    loadAndPlayMusic(musicFile);
                }, 300);
            } else {
                loadAndPlayMusic(musicFile);
            }
        }

        // 加载并播放音乐
        function loadAndPlayMusic(musicFile) {
            createAudioElement();
            audioElement.src = `../../voice/${musicFile}`;
            
            audioElement.play().then(() => {
                currentMusic = musicFile;
                localStorage.setItem('currentMusic', musicFile);
                updateMusicUI();
                smoothVolumeChange(currentVolume, 500);
            }).catch(err => {
                console.error('音乐播放失败:', err);
                isPlaying = false;
                updateMusicUI();
            });
        }

        // 暂停音乐
        function pauseMusic() {
            if (!audioElement || !isPlaying) return;
            
            smoothVolumeChange(0, 300);
            setTimeout(() => {
                audioElement.pause();
                isPlaying = false;
                updateMusicUI();
            }, 300);
        }

        // 停止音乐
        function stopMusic() {
            if (!audioElement) return;
            
            smoothVolumeChange(0, 300);
            setTimeout(() => {
                audioElement.pause();
                audioElement.currentTime = 0;
                isPlaying = false;
                currentMusic = null;
                localStorage.removeItem('currentMusic');
                updateMusicUI();
            }, 300);
        }

        // 播放下一首
        function playNextMusic() {
            const playlist = getCurrentPlaylist();
            const currentIndex = playlist.findIndex(music => music.file === currentMusic);
            const nextIndex = (currentIndex + 1) % playlist.length;
            const nextMusic = playlist[nextIndex];
            
            playMusic(nextMusic.file);
        }

        // 获取当前播放列表
        function getCurrentPlaylist() {
            // 游戏页面使用全局音乐
            return musicData.global;
        }

        // 更新音乐UI
        function updateMusicUI() {
            const musicStatus = document.getElementById('musicStatus');
            const playPauseBtn = document.getElementById('musicPlayPauseBtn');
            
            if (musicStatus) {
                musicStatus.textContent = isPlaying ? '播放中' : '暂停';
            }
            
            if (playPauseBtn) {
                playPauseBtn.textContent = isPlaying ? '⏸️ 暂停' : '▶️ 播放';
            }
            
            // 更新播放列表UI
            updatePlaylistUI();
        }

        // 更新播放列表UI
        function updatePlaylistUI() {
            const playlistContainer = document.getElementById('musicPlaylist');
            if (!playlistContainer) return;
            
            const playlist = getCurrentPlaylist();
            playlistContainer.innerHTML = '';
            
            playlist.forEach((music, index) => {
                const musicItem = document.createElement('div');
                musicItem.className = 'music-item';
                musicItem.classList.toggle('active', music.file === currentMusic);
                
                musicItem.innerHTML = `
                    <span class="music-item-title">${music.title}</span>
                    <span class="music-item-duration">${music.duration}</span>
                `;
                
                musicItem.addEventListener('click', () => {
                    playMusic(music.file);
                });
                
                playlistContainer.appendChild(musicItem);
            });
        }

        // 初始化音乐播放器UI
        function initMusicUI() {
            const musicToggleBtn = document.getElementById('musicToggleBtn');
            const musicDropdown = document.getElementById('musicDropdown');
            const musicCloseBtn = document.getElementById('musicCloseBtn');
            const musicPlayPauseBtn = document.getElementById('musicPlayPauseBtn');
            const musicStopBtn = document.getElementById('musicStopBtn');
            const musicNextBtn = document.getElementById('musicNextBtn');
            const musicVolume = document.getElementById('musicVolume');
            const volumeValue = document.getElementById('volumeValue');

            // 音乐按钮点击事件
            if (musicToggleBtn) {
                musicToggleBtn.addEventListener('click', () => {
                    musicDropdown.classList.toggle('show');
                });
            }

            // 关闭按钮
            if (musicCloseBtn) {
                musicCloseBtn.addEventListener('click', () => {
                    musicDropdown.classList.remove('show');
                });
            }

            // 播放/暂停按钮
            if (musicPlayPauseBtn) {
                musicPlayPauseBtn.addEventListener('click', () => {
                    if (isPlaying) {
                        pauseMusic();
                    } else {
                        if (currentMusic) {
                            // 继续播放当前音乐
                            audioElement.play().then(() => {
                                isPlaying = true;
                                smoothVolumeChange(currentVolume, 500);
                                updateMusicUI();
                            });
                        } else {
                            // 播放第一首
                            const playlist = getCurrentPlaylist();
                            if (playlist.length > 0) {
                                playMusic(playlist[0].file);
                            }
                        }
                    }
                });
            }

            // 停止按钮
            if (musicStopBtn) {
                musicStopBtn.addEventListener('click', stopMusic);
            }

            // 下一首按钮
            if (musicNextBtn) {
                musicNextBtn.addEventListener('click', playNextMusic);
            }

            // 音量控制
            if (musicVolume) {
                musicVolume.value = currentVolume * 100;
                if (volumeValue) {
                    volumeValue.textContent = `${Math.round(currentVolume * 100)}%`;
                }
                
                musicVolume.addEventListener('input', (e) => {
                    currentVolume = e.target.value / 100;
                    localStorage.setItem('musicVolume', currentVolume.toString());
                    if (audioElement && isPlaying) {
                        audioElement.volume = currentVolume;
                    }
                    if (volumeValue) {
                        volumeValue.textContent = `${e.target.value}%`;
                    }
                });
            }

            // 点击外部关闭下拉菜单
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.music-player')) {
                    musicDropdown.classList.remove('show');
                }
            });

            // 初始化播放列表
            updatePlaylistUI();
            updateMusicUI();
        }

        // 恢复之前的播放状态
        function restorePlaybackState() {
            if (currentMusic) {
                // 如果有之前播放的音乐，尝试恢复
                createAudioElement();
                audioElement.src = `../../voice/${currentMusic}`;
                audioElement.volume = 0; // 开始时静音
                
                audioElement.play().then(() => {
                    // 恢复音量
                    smoothVolumeChange(currentVolume, 1000);
                    updateMusicUI();
                }).catch(err => {
                    console.error('恢复音乐播放失败:', err);
                    // 恢复失败，播放随机音乐
                    autoPlayRandomMusic();
                });
            } else {
                // 没有之前的音乐，播放随机音乐
                autoPlayRandomMusic();
            }
        }

        // 自动播放随机音乐
        function autoPlayRandomMusic() {
            const playlist = getCurrentPlaylist();
            if (playlist.length > 0) {
                const randomIndex = Math.floor(Math.random() * playlist.length);
                const randomMusic = playlist[randomIndex];
                
                // 延迟1秒后播放
                setTimeout(() => {
                    playMusic(randomMusic.file);
                }, 1000);
            }
        }

        // 初始化
        initMusicUI();
        restorePlaybackState();
        
        // 暴露全局方法
        window.sharedMusicPlayer = {
            play: playMusic,
            pause: pauseMusic,
            stop: stopMusic,
            next: playNextMusic,
            getCurrentMusic: () => currentMusic,
            isPlaying: () => isPlaying
        };
    }


// ==================== DOM元素 ====================
let darkModeToggle;
function initDOMElements() {
    darkModeToggle = document.getElementById('darkModeToggle');
}

// ==================== 初始化 ====================
function init() {
    initDOMElements();
    initTheme();
    setupThemeButton();
    init3D();
    initSharedMusicPlayer();
    setupEventHandlers();
    renderLevelSelect();
    startGame('preset', 0);
}
init();
