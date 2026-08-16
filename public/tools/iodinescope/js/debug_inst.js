// debug_inst.js — 对比渲染实例矩阵与实际原子坐标
import * as THREE from './js/libs/three.module.js';
window.__dbgInst = (async () => {
  const sc = window.__iodine.scene;
  const cry = sc.crystal;
  const mesh = sc.atomsMesh;
  const out = [];
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, m);
    pos.setFromMatrixPosition(m);
    const at = cry.atoms[i];
    out.push({
      i,
      elem: at.element,
      renderPos: [Number(pos.x.toFixed(2)), Number(pos.y.toFixed(2)), Number(pos.z.toFixed(2))],
      atomPos: at.cart.map(v => Number(v.toFixed(2)))
    });
  }
  return JSON.stringify(out);
})();
