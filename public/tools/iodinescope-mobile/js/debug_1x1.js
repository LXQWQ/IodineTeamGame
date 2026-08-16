// debug_1x1.js — 检查 1³ 渲染状态
window.__dbg1 = (async () => {
  document.querySelector('.segbtn[data-cell="1"]').click();
  await new Promise(r => setTimeout(r, 3000));
  const sc = window.__iodine.scene;
  const cry = sc.crystal;
  const fracs = cry.atoms.map(a => a.frac.map(v => Number(v.toFixed(3))));
  const minF = [9, 9, 9], maxF = [-9, -9, -9];
  for (const a of cry.atoms) {
    for (let i = 0; i < 3; i++) {
      minF[i] = Math.min(minF[i], a.frac[i]);
      maxF[i] = Math.max(maxF[i], a.frac[i]);
    }
  }
  // 晶胞边框（cellbox）的几何信息
  const box = sc._group.getObjectByName('cellbox');
  const boxGeo = box && box.geometry;
  let boxPos = null;
  if (boxGeo && boxGeo.attributes && boxGeo.attributes.position) {
    const arr = boxGeo.attributes.position.array;
    boxPos = [];
    for (let i = 0; i < Math.min(arr.length, 24); i += 3) {
      boxPos.push([Number(arr[i].toFixed(2)), Number(arr[i + 1].toFixed(2)), Number(arr[i + 2].toFixed(2))]);
    }
  }
  return JSON.stringify({
    supercell: cry.supercell,
    atomCount: cry.atoms.length,
    fracMin: minF.map(v => Number(v.toFixed(3))),
    fracMax: maxF.map(v => Number(v.toFixed(3))),
    cartFirst: cry.atoms.slice(0, 3).map(a => a.cart.map(v => Number(v.toFixed(2)))),
    cartMax: [Math.max(...cry.atoms.map(a => a.cart[0])), Math.max(...cry.atoms.map(a => a.cart[1])), Math.max(...cry.atoms.map(a => a.cart[2]))],
    boxPos
  });
})();
