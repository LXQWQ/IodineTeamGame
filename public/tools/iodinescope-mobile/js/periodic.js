/**
 * periodic.js — 元素周期表数据（IodineScope）
 * 公开参考数据：原子量(IUPAC)、共价半径(Cordero et al., 2008)、
 * 范德华半径(Bondi/Alvarez)、CPK 配色(Jmol 惯例)。
 * 这些是晶体可视化(参考 Diamond 等软件风格)的基础数据。
 */
export const ELEMENTS = {
  H:  { name: '氢',   z: 1,  mass: 1.008,  cov: 0.31, vdw: 1.10, color: 0xFFFFFF },
  He: { name: '氦',   z: 2,  mass: 4.003,  cov: 0.28, vdw: 1.40, color: 0xD9FFFF },
  Li: { name: '锂',   z: 3,  mass: 6.94,   cov: 1.28, vdw: 1.81, color: 0xCC80FF },
  Be: { name: '铍',   z: 4,  mass: 9.012,  cov: 0.96, vdw: 1.53, color: 0xC2FF00 },
  B:  { name: '硼',   z: 5,  mass: 10.81,  cov: 0.84, vdw: 1.92, color: 0xFFB5B5 },
  C:  { name: '碳',   z: 6,  mass: 12.011, cov: 0.76, vdw: 1.70, color: 0x909090 },
  N:  { name: '氮',   z: 7,  mass: 14.007, cov: 0.71, vdw: 1.55, color: 0x3050F8 },
  O:  { name: '氧',   z: 8,  mass: 15.999, cov: 0.66, vdw: 1.52, color: 0xFF0D0D },
  F:  { name: '氟',   z: 9,  mass: 18.998, cov: 0.57, vdw: 1.47, color: 0x90E050 },
  Ne: { name: '氖',   z: 10, mass: 20.180, cov: 0.58, vdw: 1.54, color: 0xB3E3F5 },
  Na: { name: '钠',   z: 11, mass: 22.990, cov: 1.66, vdw: 2.27, color: 0xAB5CF2 },
  Mg: { name: '镁',   z: 12, mass: 24.305, cov: 1.55, vdw: 1.73, color: 0x8AFF00 },
  Al: { name: '铝',   z: 13, mass: 26.982, cov: 1.21, vdw: 1.84, color: 0xBFA6A6 },
  Si: { name: '硅',   z: 14, mass: 28.085, cov: 1.11, vdw: 2.10, color: 0xF0C8A0 },
  P:  { name: '磷',   z: 15, mass: 30.974, cov: 1.07, vdw: 1.80, color: 0xFF8000 },
  S:  { name: '硫',   z: 16, mass: 32.06,  cov: 1.05, vdw: 1.80, color: 0xFFFF30 },
  Cl: { name: '氯',   z: 17, mass: 35.45,  cov: 1.02, vdw: 1.75, color: 0x1FF01F },
  Ar: { name: '氩',   z: 18, mass: 39.948, cov: 1.06, vdw: 1.88, color: 0x80D1E3 },
  K:  { name: '钾',   z: 19, mass: 39.098, cov: 2.03, vdw: 2.75, color: 0x8F40D4 },
  Ca: { name: '钙',   z: 20, mass: 40.078, cov: 1.76, vdw: 2.31, color: 0x3DFF00 },
  Sc: { name: '钪',   z: 21, mass: 44.956, cov: 1.70, vdw: 2.11, color: 0xE6E6E6 },
  Ti: { name: '钛',   z: 22, mass: 47.867, cov: 1.60, vdw: 2.00, color: 0xBFC2C7 },
  V:  { name: '钒',   z: 23, mass: 50.942, cov: 1.53, vdw: 2.00, color: 0xA6A6AB },
  Cr: { name: '铬',   z: 24, mass: 51.996, cov: 1.39, vdw: 2.00, color: 0x8A99C7 },
  Mn: { name: '锰',   z: 25, mass: 54.938, cov: 1.39, vdw: 2.00, color: 0x9C7AC7 },
  Fe: { name: '铁',   z: 26, mass: 55.845, cov: 1.32, vdw: 2.00, color: 0xE06633 },
  Co: { name: '钴',   z: 27, mass: 58.933, cov: 1.26, vdw: 2.00, color: 0xF090A0 },
  Ni: { name: '镍',   z: 28, mass: 58.693, cov: 1.24, vdw: 1.63, color: 0x50D050 },
  Cu: { name: '铜',   z: 29, mass: 63.546, cov: 1.32, vdw: 1.40, color: 0xC88033 },
  Zn: { name: '锌',   z: 30, mass: 65.38,  cov: 1.22, vdw: 1.39, color: 0x7D80B0 },
  Ga: { name: '镓',   z: 31, mass: 69.723, cov: 1.22, vdw: 1.87, color: 0xC28F8F },
  Ge: { name: '锗',   z: 32, mass: 72.630, cov: 1.20, vdw: 2.11, color: 0x668F8F },
  As: { name: '砷',   z: 33, mass: 74.922, cov: 1.19, vdw: 1.85, color: 0xBD80E3 },
  Se: { name: '硒',   z: 34, mass: 78.971, cov: 1.20, vdw: 1.90, color: 0xFFA100 },
  Br: { name: '溴',   z: 35, mass: 79.904, cov: 1.20, vdw: 1.85, color: 0xA62929 },
  Kr: { name: '氪',   z: 36, mass: 83.798, cov: 1.16, vdw: 2.02, color: 0x5CB8D1 },
  Rb: { name: '铷',   z: 37, mass: 85.468, cov: 2.20, vdw: 3.03, color: 0x702EB0 },
  Sr: { name: '锶',   z: 38, mass: 87.62,  cov: 1.95, vdw: 2.49, color: 0x00FF00 },
  Y:  { name: '钇',   z: 39, mass: 88.906, cov: 1.90, vdw: 2.00, color: 0x94F0F0 },
  Zr: { name: '锆',   z: 40, mass: 91.224, cov: 1.75, vdw: 2.00, color: 0x94E0E0 },
  Nb: { name: '铌',   z: 41, mass: 92.906, cov: 1.64, vdw: 2.00, color: 0x73C2C9 },
  Mo: { name: '钼',   z: 42, mass: 95.95,  cov: 1.54, vdw: 2.00, color: 0x54B5B5 },
  Tc: { name: '锝',   z: 43, mass: 98.0,   cov: 1.47, vdw: 2.00, color: 0x3B9E9E },
  Ru: { name: '钌',   z: 44, mass: 101.07, cov: 1.46, vdw: 2.00, color: 0x248F8F },
  Rh: { name: '铑',   z: 45, mass: 102.91, cov: 1.42, vdw: 2.00, color: 0x0A7D8C },
  Pd: { name: '钯',   z: 46, mass: 106.42, cov: 1.39, vdw: 1.63, color: 0x006985 },
  Ag: { name: '银',   z: 47, mass: 107.87, cov: 1.45, vdw: 1.72, color: 0xC0C0C0 },
  Cd: { name: '镉',   z: 48, mass: 112.41, cov: 1.44, vdw: 1.58, color: 0xFFD98F },
  In: { name: '铟',   z: 49, mass: 114.82, cov: 1.42, vdw: 1.93, color: 0xA67573 },
  Sn: { name: '锡',   z: 50, mass: 118.71, cov: 1.39, vdw: 2.17, color: 0x668080 },
  Sb: { name: '锑',   z: 51, mass: 121.76, cov: 1.39, vdw: 2.06, color: 0x9E63B5 },
  Te: { name: '碲',   z: 52, mass: 127.60, cov: 1.38, vdw: 2.06, color: 0xD47A00 },
  I:  { name: '碘',   z: 53, mass: 126.90, cov: 1.39, vdw: 1.98, color: 0x940094 },
  Xe: { name: '氙',   z: 54, mass: 131.29, cov: 1.40, vdw: 2.16, color: 0x429EB0 },
  Cs: { name: '铯',   z: 55, mass: 132.91, cov: 2.44, vdw: 3.43, color: 0x57178F },
  Ba: { name: '钡',   z: 56, mass: 137.33, cov: 2.15, vdw: 2.68, color: 0x00C900 },
  La: { name: '镧',   z: 57, mass: 138.91, cov: 2.07, vdw: 2.50, color: 0x70D4FF },
  Ce: { name: '铈',   z: 58, mass: 140.12, cov: 2.04, vdw: 2.48, color: 0xFFFFC7 },
  Pr: { name: '镨',   z: 59, mass: 140.91, cov: 2.03, vdw: 2.46, color: 0xD9FFC7 },
  Nd: { name: '钕',   z: 60, mass: 144.24, cov: 2.01, vdw: 2.44, color: 0xC7FFC7 },
  Pm: { name: '钷',   z: 61, mass: 145.0,  cov: 1.99, vdw: 2.42, color: 0xA3FFC7 },
  Sm: { name: '钐',   z: 62, mass: 150.36, cov: 1.98, vdw: 2.40, color: 0x8FFFC7 },
  Eu: { name: '铕',   z: 63, mass: 151.96, cov: 1.98, vdw: 2.38, color: 0x61FFC7 },
  Gd: { name: '钆',   z: 64, mass: 157.25, cov: 1.96, vdw: 2.36, color: 0x45FFC7 },
  Tb: { name: '铽',   z: 65, mass: 158.93, cov: 1.94, vdw: 2.34, color: 0x30FFC7 },
  Dy: { name: '镝',   z: 66, mass: 162.50, cov: 1.92, vdw: 2.32, color: 0x1FFFC7 },
  Ho: { name: '钬',   z: 67, mass: 164.93, cov: 1.92, vdw: 2.30, color: 0x00FF9C },
  Er: { name: '铒',   z: 68, mass: 167.26, cov: 1.89, vdw: 2.28, color: 0x00E675 },
  Tm: { name: '铥',   z: 69, mass: 168.93, cov: 1.90, vdw: 2.26, color: 0x00D452 },
  Yb: { name: '镱',   z: 70, mass: 173.05, cov: 1.87, vdw: 2.24, color: 0x00BF38 },
  Lu: { name: '镥',   z: 71, mass: 174.97, cov: 1.87, vdw: 2.22, color: 0x00AB24 },
  Hf: { name: '铪',   z: 72, mass: 178.49, cov: 1.75, vdw: 2.00, color: 0x4DC2FF },
  Ta: { name: '钽',   z: 73, mass: 180.95, cov: 1.70, vdw: 2.00, color: 0x4DA6FF },
  W:  { name: '钨',   z: 74, mass: 183.84, cov: 1.62, vdw: 2.00, color: 0x2194D6 },
  Re: { name: '铼',   z: 75, mass: 186.21, cov: 1.51, vdw: 2.00, color: 0x267DAB },
  Os: { name: '锇',   z: 76, mass: 190.23, cov: 1.44, vdw: 2.00, color: 0x266696 },
  Ir: { name: '铱',   z: 77, mass: 192.22, cov: 1.41, vdw: 2.00, color: 0x175487 },
  Pt: { name: '铂',   z: 78, mass: 195.08, cov: 1.36, vdw: 1.75, color: 0xD0D0E0 },
  Au: { name: '金',   z: 79, mass: 196.97, cov: 1.36, vdw: 1.66, color: 0xFFD123 },
  Hg: { name: '汞',   z: 80, mass: 200.59, cov: 1.32, vdw: 1.55, color: 0xB8B8D0 },
  Tl: { name: '铊',   z: 81, mass: 204.38, cov: 1.45, vdw: 1.96, color: 0xA6544D },
  Pb: { name: '铅',   z: 82, mass: 207.2,  cov: 1.75, vdw: 2.02, color: 0x575961 },
  Bi: { name: '铋',   z: 83, mass: 208.98, cov: 1.48, vdw: 2.07, color: 0x9E4FB5 },
  Po: { name: '钋',   z: 84, mass: 209.0,  cov: 1.40, vdw: 1.97, color: 0xAB5C00 },
  At: { name: '砹',   z: 85, mass: 210.0,  cov: 1.50, vdw: 2.02, color: 0x754F45 },
  Rn: { name: '氡',   z: 86, mass: 222.0,  cov: 1.50, vdw: 2.20, color: 0x428296 },
  Fr: { name: '钫',   z: 87, mass: 223.0,  cov: 2.60, vdw: 3.48, color: 0x420066 },
  Ra: { name: '镭',   z: 88, mass: 226.0,  cov: 2.21, vdw: 2.83, color: 0x007D00 },
  Ac: { name: '锕',   z: 89, mass: 227.0,  cov: 2.15, vdw: 2.50, color: 0x70ABFA },
  Th: { name: '钍',   z: 90, mass: 232.04, cov: 2.06, vdw: 2.50, color: 0x00BAFF },
  Pa: { name: '镤',   z: 91, mass: 231.04, cov: 2.00, vdw: 2.50, color: 0x00A1FF },
  U:  { name: '铀',   z: 92, mass: 238.03, cov: 1.96, vdw: 1.86, color: 0x008FFF },
  Np: { name: '镎',   z: 93, mass: 237.0,  cov: 1.90, vdw: 2.50, color: 0x0080FF },
  Pu: { name: '钚',   z: 94, mass: 244.0,  cov: 1.87, vdw: 2.50, color: 0x006BFF },
  Am: { name: '镅',   z: 95, mass: 243.0,  cov: 1.80, vdw: 2.50, color: 0x545CF2 },
  Cm: { name: '锔',   z: 96, mass: 247.0,  cov: 1.69, vdw: 2.50, color: 0x785CE3 },
  Bk: { name: '锫',   z: 97, mass: 247.0,  cov: 1.60, vdw: 2.50, color: 0x8A4FE3 },
  Cf: { name: '锎',   z: 98, mass: 251.0,  cov: 1.60, vdw: 2.50, color: 0xA136D4 },
  Es: { name: '锿',   z: 99, mass: 252.0,  cov: 1.60, vdw: 2.50, color: 0xB31FD4 },
  Fm: { name: '镄',   z: 100, mass: 257.0, cov: 1.60, vdw: 2.50, color: 0xB31FBA },
  Md: { name: '钔',   z: 101, mass: 258.0, cov: 1.60, vdw: 2.50, color: 0xB30DA6 },
  No: { name: '锘',   z: 102, mass: 259.0, cov: 1.60, vdw: 2.50, color: 0xBD0D87 },
  Lr: { name: '铹',   z: 103, mass: 262.0, cov: 1.60, vdw: 2.50, color: 0xC70066 }
};

/** 根据元素符号返回数据；未知元素返回灰色占位数据 */
export function elementOf(symbol) {
  const e = ELEMENTS[symbol];
  if (e) return { symbol, ...e };
  return { symbol, name: symbol, z: 0, mass: 0, cov: 1.2, vdw: 2.0, color: 0xCCCCCC };
}

/** 从 COD 类型符号（如 Na1+、Cl1-、O2-）提取元素符号 */
export function elementFromTypeSymbol(type) {
  if (!type) return null;
  const m = type.trim().match(/^([A-Z][a-z]?)/);
  return m ? m[1] : null;
}

/** 计算化学式量（amu） */
export function formulaMass(counts) {
  let m = 0;
  for (const [sym, n] of Object.entries(counts)) m += elementOf(sym).mass * n;
  return m;
}
