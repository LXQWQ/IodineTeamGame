(function(){
    // ======================= 物品图鉴 =======================
    const ITEM_CATALOG = {
        "孔雀石": { rarity: "凡品", desc: "青翠如孔雀羽毛的粗矿石，含有丰富的铜元素。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "赤铁矿": { rarity: "凡品", desc: "暗红色的粗矿石，蕴含大量铁元素。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "黄铁矿": { rarity: "凡品", desc: "金光闪闪的愚人金，富含铁与硫元素。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "锡矿石": { rarity: "凡品", desc: "沉甸甸的黑色原石，提炼后可得锡。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "自然金矿": { rarity: "珍品", desc: "夹杂着金缕的伴生矿脉，极其沉重。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "辉银矿": { rarity: "珍品", desc: "灰黑色的粗矿，提纯后可得耀眼的白银。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "辰砂矿": { rarity: "珍品", desc: "暗红色的原矿，内含剧毒汞元素。", source: "矿脉采掘", hpEffect: -10, maxHpEffect: 0, toxic: true },
        "钙钛矿": { rarity: "稀世", desc: "结构奇特的晶体粗矿，可熔炼出钛金。", source: "矿脉采掘", hpEffect: -10, maxHpEffect: 0 },
        "铜": { rarity: "凡品", desc: "提纯后的赤红金属，常用于基础炼炉。", source: "矿物提纯", hpEffect: -10, maxHpEffect: 0 },
        "铁": { rarity: "凡品", desc: "坚不可摧的黑铁，吞服会导致严重内出血。", source: "矿物提纯", hpEffect: -15, maxHpEffect: 0 },
        "锡": { rarity: "凡品", desc: "质地较软的金属，带有一定的毒性。", source: "矿物提纯", hpEffect: -10, maxHpEffect: 0 },
        "金": { rarity: "珍品", desc: "贵重金属，吞金自尽绝非戏言。", source: "矿物提纯", hpEffect: -35, maxHpEffect: 0 },
        "银": { rarity: "珍品", desc: "贵重金属，过量吞服会重伤肠胃。", source: "矿物提纯", hpEffect: -25, maxHpEffect: 0 },
        "钛金": { rarity: "稀世", desc: "极其轻盈且坚不可摧的纯粹金属。", source: "矿物提纯", hpEffect: -30, maxHpEffect: 0 },
        "丹砂": { rarity: "稀世", desc: "提纯自辰砂矿，炼制神丹之极品核心。", source: "矿物提纯", hpEffect: -40, maxHpEffect: 0 },
        "石硫磺": { rarity: "凡品", desc: "气味刺鼻，阳气过重。", source: "矿物提纯", hpEffect: -15, maxHpEffect: 0 },
        "曾青": { rarity: "凡品", desc: "含铜的青色矿物，毒性不小。", source: "矿脉采掘", hpEffect: -20, maxHpEffect: 0, toxic: true },
        "雄黄": { rarity: "珍品", desc: "可驱邪避毒，但本身含有剧毒（砷化合物）。", source: "矿脉采掘", hpEffect: -25, maxHpEffect: 0, toxic: true },
        "雌黄": { rarity: "珍品", desc: "常与雄黄共生，质地极软但有剧毒（砷化合物）。", source: "矿脉采掘", hpEffect: -25, maxHpEffect: 0, toxic: true },
        "慈石": { rarity: "凡品", desc: "带有磁性的石头，不可食用。", source: "矿脉采掘", hpEffect: -10, maxHpEffect: 0 },
        "戎盐": { rarity: "凡品", desc: "粗制未提纯的盐块，过量食用伤肾。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "矾石": { rarity: "凡品", desc: "味酸涩，有微毒。", source: "矿脉采掘", hpEffect: -10, maxHpEffect: 0 },
        "炉甘石": { rarity: "凡品", desc: "灰白色粗矿，煅烧分解可得锌华。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "方铅矿": { rarity: "珍品", desc: "铅灰色金属光泽的粗矿，提纯后可得黑铅，剧毒。", source: "矿脉采掘", hpEffect: -15, maxHpEffect: 0, toxic: true },
        "磁石": { rarity: "凡品", desc: "黑色磁性粗矿石，富含铁元素，与慈石不同。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "胆矾": { rarity: "凡品", desc: "蓝色晶体状粗矿，味涩而毒，铁片置换可得铜。", source: "矿脉采掘", hpEffect: -8, maxHpEffect: 0 },
        "硝石": { rarity: "凡品", desc: "白色粉末状粗矿，重结晶提纯后可用于火药。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "软锰": { rarity: "凡品", desc: "黑色粉末状粗矿，水洗除去硅铁杂质可得锰石。", source: "矿脉采掘", hpEffect: -5, maxHpEffect: 0 },
        "茯苓": { rarity: "凡品", desc: "健脾宁心的常见草药，平和无毒。", source: "药园采摘", hpEffect: 5, maxHpEffect: 0 },
        "何首乌": { rarity: "珍品", desc: "补益精血的良药。", source: "药园采摘", hpEffect: 8, maxHpEffect: 0 },
        "人参": { rarity: "珍品", desc: "大补元气的名贵药材。", source: "药园采摘", hpEffect: 15, maxHpEffect: 0 },
        "雪莲": { rarity: "稀世", desc: "生于苦寒之地的奇花，清热解百毒。", source: "药园采摘", hpEffect: 20, maxHpEffect: 0 },
        "灵芝": { rarity: "稀世", desc: "吸纳天地灵气生长的仙草。", source: "药园采摘", hpEffect: 25, maxHpEffect: 0 },
        "珍珠": { rarity: "珍品", desc: "深海贝类所产，安神定惊，明目消翳。", source: "药园采摘", hpEffect: 8, maxHpEffect: 0 },
        "海金沙": { rarity: "凡品", desc: "海藻孢子，清利湿热，通淋止痛。", source: "药园采摘", hpEffect: 3, maxHpEffect: 0 },
        "枸杞": { rarity: "凡品", desc: "滋补肝肾，明目养血。", source: "药园采摘", hpEffect: 3, maxHpEffect: 0 },
        "当归": { rarity: "凡品", desc: "补血活血，调经止痛。", source: "药园采摘", hpEffect: 5, maxHpEffect: 0 },
        "黄芪": { rarity: "珍品", desc: "补气固表，托毒生肌。", source: "药园采摘", hpEffect: 7, maxHpEffect: 0 },
        "金银花": { rarity: "凡品", desc: "清热解毒，疏散风热。", source: "药园采摘", hpEffect: 2, maxHpEffect: 0 },
        "甘草": { rarity: "凡品", desc: "调和诸药，缓急止痛。", source: "药园采摘", hpEffect: 4, maxHpEffect: 0 },
        "地黄": { rarity: "珍品", desc: "滋阴补肾，凉血止血。", source: "药园采摘", hpEffect: 9, maxHpEffect: 0 },
        "红景天": { rarity: "珍品", desc: "抗疲劳，耐缺氧，短暂提升下次挖矿成功率。", source: "药园采摘", hpEffect: 12, maxHpEffect: 0 },
        "冬虫夏草": { rarity: "稀世", desc: "补肺益肾，止血化痰，同时恢复气血上限。", source: "药园采摘", hpEffect: 18, maxHpEffect: 2 },
        "龙涎香": { rarity: "稀世", desc: "化痰开窍，活血利气，服之满口异香。", source: "药园采摘", hpEffect: 25, maxHpEffect: 0 },
        "三七": { rarity: "凡品", desc: "散瘀止血，消肿定痛。", source: "药园采摘", hpEffect: 6, maxHpEffect: 0 },
        "山药": { rarity: "凡品", desc: "补脾养胃，生津益肺。", source: "药园采摘", hpEffect: 4, maxHpEffect: 0 },
        "六一泥": { rarity: "凡品", desc: "深海遗礁底部取出的黏土软泥，调和后可用于修缮丹鼎裂缝。直接吞服会阻塞经脉。", source: "深海遗礁", hpEffect: -10, maxHpEffect: 0 },
        "丹方碎片-一元鼎": { rarity: "凡品", desc: "一元鼎的丹方碎片，集齐九片可向智慧老人换取完整丹方。", source: "考古发掘", hpEffect: 0, maxHpEffect: 0 },
        "丹方碎片-两仪鼎": { rarity: "凡品", desc: "两仪鼎的丹方碎片，集齐九片可向智慧老人换取完整丹方。", source: "考古发掘", hpEffect: 0, maxHpEffect: 0 },
        "丹方碎片-三才鼎": { rarity: "凡品", desc: "三才鼎的丹方碎片，集齐九片可向智慧老人换取完整丹方。", source: "考古发掘", hpEffect: 0, maxHpEffect: 0 },
        "丹方碎片-四象鼎": { rarity: "凡品", desc: "四象鼎的丹方碎片，集齐九片可向智慧老人换取完整丹方。", source: "考古发掘", hpEffect: 0, maxHpEffect: 0 },
        "丹方碎片-五行鼎": { rarity: "珍品", desc: "五行鼎的丹方碎片，集齐九片可向智慧老人换取完整丹方。", source: "考古发掘", hpEffect: 0, maxHpEffect: 0 },
        "丹方碎片-六合鼎": { rarity: "珍品", desc: "六合鼎的丹方碎片，集齐九片可向智慧老人换取完整丹方。", source: "考古发掘", hpEffect: 0, maxHpEffect: 0 },
        "丹方碎片-七星鼎": { rarity: "珍品", desc: "七星鼎的丹方碎片，集齐九片可向智慧老人换取完整丹方。", source: "考古发掘", hpEffect: 0, maxHpEffect: 0 },
        "丹方碎片-八卦鼎": { rarity: "稀世", desc: "八卦鼎的丹方碎片，集齐九片可向智慧老人换取完整丹方。", source: "考古发掘", hpEffect: 0, maxHpEffect: 0 },
        "丹方碎片-九鼎神丹": { rarity: "稀世", desc: "九鼎神丹的丹方碎片，集齐九片可向智慧老人换取完整丹方。", source: "考古发掘", hpEffect: 0, maxHpEffect: 0 },
        "培元膏": { rarity: "良药", desc: "固本培元的基础药物。", source: "药房炼制", hpEffect: 40, maxHpEffect: 0 },
        "续命丹": { rarity: "灵药", desc: "气血亏虚时可保一命。", source: "药房炼制", hpEffect: 70, maxHpEffect: 0 },
        "九转还魂散": { rarity: "仙药", desc: "只要一息尚存便可拉回鬼门关。", source: "药房炼制", hpEffect: 100, maxHpEffect: 0 },
        "清心散": { rarity: "良药", desc: "清热解毒，微效抗毒。", source: "药房炼制", hpEffect: 25, maxHpEffect: 0, effect: "antidote" },
        "归脾丸": { rarity: "良药", desc: "补血养心，安神益气。", source: "药房炼制", hpEffect: 35, maxHpEffect: 0 },
        "金创药": { rarity: "良药", desc: "外敷内服，止血生肌。", source: "药房炼制", hpEffect: 45, maxHpEffect: 0 },
        "回元丹": { rarity: "灵药", desc: "固本培元，可解百毒。", source: "药房炼制", hpEffect: 55, maxHpEffect: 0, effect: "cure_poison" },
        "六味地黄丸": { rarity: "灵药", desc: "滋阴补肾，中毒时疗效果减半。", source: "药房炼制", hpEffect: 65, maxHpEffect: 0, effect: "half_if_poisoned" },
        "蛇胆解毒丸": { rarity: "灵药", desc: "以毒攻毒，清除所有毒素。", source: "药房炼制", hpEffect: 30, maxHpEffect: 0, effect: "cure_poison" },
        "八珍汤": { rarity: "灵药", desc: "大补元气，接下来2次挖矿不受伤害。", source: "药房炼制", hpEffect: 80, maxHpEffect: 0, effect: "mining_shield" },
        "生脉饮": { rarity: "仙药", desc: "益气生津，临时提升气血上限10点持续5分钟。", source: "药房炼制", hpEffect: 80, maxHpEffect: 0, effect: "temp_maxhp" },
        "龙涎护心丹": { rarity: "仙药", desc: "龙涎护体，濒死时自动复活一次。", source: "药房炼制", hpEffect: 100, maxHpEffect: 0, effect: "revive" },
        "混元一气丹": { rarity: "仙药", desc: "混元之气灌体，永久提升气血上限5点。", source: "药房炼制", hpEffect: 120, maxHpEffect: 0, effect: "perm_maxhp" },
        "百草辟毒丹": { rarity: "仙药", desc: "百草炼体，永久提升毒抗。", source: "药房炼制", hpEffect: 80, maxHpEffect: 0, effect: "poison_resist" },
        "五行归气丸": { rarity: "灵药", desc: "五行调和，归元一气。", source: "药房炼制", hpEffect: 75, maxHpEffect: 0 },
        "一元鼎": { rarity: "神丹", desc: "蕴含一元复始之气，略微提升潜能。", source: "九鼎炼制", hpEffect: 5, maxHpEffect: 5 },
        "两仪鼎": { rarity: "神丹", desc: "分化阴阳，调和气血。", source: "九鼎炼制", hpEffect: 8, maxHpEffect: 8 },
        "三才鼎": { rarity: "神丹", desc: "汇聚天地人三才之灵。", source: "九鼎炼制", hpEffect: 12, maxHpEffect: 12 },
        "四象鼎": { rarity: "神丹", desc: "镇压四方，服用后获得2次挖矿护盾。", source: "九鼎炼制", hpEffect: 15, maxHpEffect: 15, effect: "mining_shield_2" },
        "五行鼎": { rarity: "神丹", desc: "五行流转，10分钟内挖矿速度提升。", source: "九鼎炼制", hpEffect: 18, maxHpEffect: 18, effect: "buff_mining_speed" },
        "六合鼎": { rarity: "神丹", desc: "囊括天地四方之威，10分钟内减免矿难伤害。", source: "九鼎炼制", hpEffect: 22, maxHpEffect: 22, effect: "buff_mining_defense" },
        "七星鼎": { rarity: "神丹", desc: "接引北斗七星之光，10分钟内免疫中毒。", source: "九鼎炼制", hpEffect: 25, maxHpEffect: 25, effect: "buff_poison_immunity" },
        "八卦鼎": { rarity: "神丹", desc: "演化乾坤，15分钟内炼丹成功率提升。", source: "九鼎炼制", hpEffect: 30, maxHpEffect: 30, effect: "buff_refine_boost" },
        "九鼎神丹": { rarity: "造化", desc: "夺天地造化，15分钟内提纯与炼制双倍概率大幅提升！", source: "九鼎炼制", hpEffect: 50, maxHpEffect: 50, effect: "buff_double_product" },
        // 现代实验室提纯产物
        "硫磺": { rarity: "凡品", desc: "纯净硫磺，黄色晶体，用于火药制造。", source: "实验室提纯", hpEffect: -10, maxHpEffect: 0 },
        "汞": { rarity: "珍品", desc: "液态金属，剧毒，古代炼丹核心材料。", source: "实验室提纯", hpEffect: -30, maxHpEffect: 0, toxic: true },
        "锌华": { rarity: "凡品", desc: "纯净氧化锌，白色粉末，古代白色颜料。", source: "实验室提纯", hpEffect: -5, maxHpEffect: 0 },
        "黑铅": { rarity: "珍品", desc: "纯净金属铅，剧毒重金属。", source: "实验室提纯", hpEffect: -20, maxHpEffect: 0, toxic: true },
        "铁": { rarity: "凡品", desc: "纯净铁粉，黑色金属粉末。", source: "实验室提纯", hpEffect: -8, maxHpEffect: 0 },
        "铜": { rarity: "凡品", desc: "纯净金属铜，红棕色导电金属。", source: "实验室提纯", hpEffect: -5, maxHpEffect: 0 },
        "硝石精": { rarity: "珍品", desc: "高纯度硝酸钾，火药重要原料。", source: "实验室提纯", hpEffect: -8, maxHpEffect: 0 },
        "雄精": { rarity: "珍品", desc: "高纯度雄黄，砷化合物，剧毒！", source: "实验室提纯", hpEffect: -35, maxHpEffect: 0, toxic: true },
        "雌精": { rarity: "珍品", desc: "高纯度雌黄，砷化合物，剧毒！", source: "实验室提纯", hpEffect: -35, maxHpEffect: 0, toxic: true },
        "锰石": { rarity: "凡品", desc: "纯净二氧化锰，黑色粉末，催化剂。", source: "实验室提纯", hpEffect: -8, maxHpEffect: 0 },
        "精盐": { rarity: "凡品", desc: "纯净氯化钠，食用级盐。", source: "实验室提纯", hpEffect: 2, maxHpEffect: 0 }
    };
    
    // ======================= 现代化学实验室系统 =======================
    const CRUDE_MINERAL_MAPPING = {
        "石硫磺": { 
            realName: "天然硫磺", 
            formula: "S₈(含杂质)",
            method: "升华", 
            product: "硫磺", 
            productFormula: "S₈",
            equation: "S₈(s,含杂质) → S₈(g) → S₈(s,纯净)",
            description: "通过升华去除火山灰等杂质",
            temperature: "200°C",
            toxicity: false
        },
        "辰砂矿": { 
            realName: "辰砂", 
            formula: "HgS",
            method: "煅烧", 
            products: ["汞", "硫磺"], 
            productFormulas: ["Hg", "S₈"],
            equation: "HgS → Hg↑ + SO₂↑ (SO₂被碳还原为S)",
            description: "煅烧辰砂获得汞蒸气，同时回收硫",
            temperature: "580°C",
            toxicity: true
        },
        "炉甘石": { 
            realName: "菱锌矿", 
            formula: "ZnCO₃",
            method: "煅烧", 
            product: "锌华", 
            productFormula: "ZnO",
            equation: "ZnCO₃ → ZnO + CO₂↑",
            description: "煅烧分解碳酸锌得到氧化锌",
            temperature: "300°C",
            toxicity: false
        },
        "方铅矿": { 
            realName: "方铅矿", 
            formula: "PbS",
            method: "焙烧+碳还原", 
            product: "黑铅", 
            productFormula: "Pb",
            equation: "2PbS + 3O₂ → 2PbO + 2SO₂↑; PbO + C → Pb + CO↑",
            description: "先氧化焙烧，再用碳还原得金属铅",
            temperature: "800°C",
            toxicity: true
        },
        "磁石": { 
            realName: "磁铁矿", 
            formula: "Fe₃O₄",
            method: "碳还原", 
            product: "铁", 
            productFormula: "Fe",
            equation: "Fe₃O₄ + 4C → 3Fe + 4CO↑",
            description: "用碳还原四氧化三铁得到铁",
            temperature: "1000°C",
            toxicity: false
        },
        "胆矾": { 
            realName: "胆矾", 
            formula: "CuSO₄·5H₂O",
            method: "置换反应", 
            product: "铜", 
            productFormula: "Cu",
            equation: "CuSO₄ + Fe → FeSO₄ + Cu",
            description: "铁片置入硫酸铜溶液置换出铜",
            temperature: "室温",
            toxicity: false
        },
        "硝石": { 
            realName: "钾硝石", 
            formula: "KNO₃(含杂)",
            method: "重结晶", 
            product: "硝石精", 
            productFormula: "KNO₃",
            equation: "溶解→过滤→蒸发结晶",
            description: "利用溶解度差异去除氯化钠等杂质",
            temperature: "80°C",
            toxicity: false
        },
        "雄黄": { 
            realName: "雄黄", 
            formula: "As₄S₄",
            method: "升华/重结晶", 
            product: "雄精", 
            productFormula: "As₄S₄",
            equation: "As₄S₄(s,含杂) → As₄S₄(g) → As₄S₄(s,高纯)",
            description: "升华提纯得到高纯度雄黄",
            temperature: "300°C",
            toxicity: true
        },
        "雌黄": { 
            realName: "雌黄", 
            formula: "As₂S₃",
            method: "升华/重结晶", 
            product: "雌精", 
            productFormula: "As₂S₃",
            equation: "As₂S₃(s,含杂) → As₂S₃(g) → As₂S₃(s,高纯)",
            description: "升华提纯得到高纯度雌黄",
            temperature: "250°C",
            toxicity: true
        },
        "软锰": { 
            realName: "软锰矿", 
            formula: "MnO₂(含杂)",
            method: "水洗除杂", 
            product: "锰石", 
            productFormula: "MnO₂",
            equation: "MnO₂(含硅铁杂质) + H₂O → MnO₂(纯净) + 杂质溶解",
            description: "水洗去除硅铁等杂质",
            temperature: "室温",
            toxicity: false
        },
        "戎盐": { 
            realName: "岩盐", 
            formula: "NaCl(含杂)",
            method: "溶解过滤+蒸发", 
            product: "精盐", 
            productFormula: "NaCl",
            equation: "NaCl(含杂) + H₂O → 过滤 → 蒸发结晶",
            description: "溶解过滤去除不溶性杂质，蒸发得纯盐",
            temperature: "100°C",
            toxicity: false
        }
    };
    
    const PURIFICATION_METHODS = {
        "升华": {
            icon: "🌫️",
            description: "加热固体直接变为气体，再冷凝得纯净物",
            equipment: "升华装置",
            duration: 8000,
            successRate: 0.85,
            steps: [
                { name: "原料研磨", icon: "🔨", desc: "将粗硫磺研磨成细粉，增大受热面积", duration: 1500 },
                { name: "加热升华", icon: "🔥", desc: "加热至约200°C，硫磺直接气化为硫蒸气", duration: 3000, critical: true },
                { name: "蒸气冷凝", icon: "❄️", desc: "硫蒸气在冷凝区遇冷重新凝华为固态晶体", duration: 2000 },
                { name: "收集纯品", icon: "✨", desc: "刮取冷凝壁上纯净的黄色硫磺晶体", duration: 1500 }
            ]
        },
        "煅烧": {
            icon: "🔥",
            description: "高温加热分解化合物，除去挥发性杂质",
            equipment: "马弗炉",
            duration: 10000,
            successRate: 0.80,
            steps: [
                { name: "矿石破碎", icon: "🔨", desc: "将粗矿敲碎至豆粒大小，便于后续加工", duration: 1500 },
                { name: "装填坩埚", icon: "🧫", desc: "将矿粉装入耐火坩埚，铺平压实", duration: 1000 },
                { name: "高温煅烧", icon: "🔥", desc: "在高温下使碳酸盐分解，释放二氧化碳", duration: 3500, critical: true },
                { name: "自然冷却", icon: "❄️", desc: "将坩埚从炉中取出，置于石棉网自然降温", duration: 1500 },
                { name: "收集产物", icon: "✨", desc: "刮取坩埚内的氧化物粉末，装入密封瓶", duration: 1000 }
            ]
        },
        "焙烧+碳还原": {
            icon: "⚗️",
            description: "先氧化焙烧，再用碳还原得金属",
            equipment: "高炉",
            duration: 15000,
            successRate: 0.75,
            steps: [
                { name: "矿石粉碎", icon: "🔨", desc: "将方铅矿粉碎至细粉状", duration: 1500 },
                { name: "氧化焙烧", icon: "🔥", desc: "在空气中加热使硫化铅氧化为氧化铅", duration: 3000, critical: true },
                { name: "混合碳粉", icon: "🫙", desc: "将氧化铅与木炭粉按比例混合均匀", duration: 1500 },
                { name: "高温还原", icon: "⚗️", desc: "加热至约800°C，碳将氧化铅还原为金属铅", duration: 4000, critical: true },
                { name: "冷却降温", icon: "❄️", desc: "关火后自然冷却至室温", duration: 2000 },
                { name: "取出金属", icon: "✨", desc: "敲开残渣，取出熔化的铅块", duration: 1000 }
            ]
        },
        "碳还原": {
            icon: "🔥",
            description: "用碳作还原剂还原金属氧化物",
            equipment: "还原炉",
            duration: 12000,
            successRate: 0.78,
            steps: [
                { name: "矿石粉碎", icon: "🔨", desc: "将磁石粉碎为细粉", duration: 1500 },
                { name: "混合碳粉", icon: "🫙", desc: "将矿粉与木炭粉按3:1比例混合", duration: 1000 },
                { name: "装炉", icon: "🧫", desc: "将混合物装入还原炉的耐火容器中", duration: 1000 },
                { name: "高温还原", icon: "🔥", desc: "加热至约1000°C，碳还原四氧化三铁得铁", duration: 4000, critical: true },
                { name: "冷却降温", icon: "❄️", desc: "关火后自然冷却至室温", duration: 2000 },
                { name: "取出铁块", icon: "✨", desc: "敲开炉渣，取出还原出的海绵铁", duration: 1000 }
            ]
        },
        "置换反应": {
            icon: "🧪",
            description: "用更活泼金属置换出目标金属",
            equipment: "反应槽",
            duration: 6000,
            successRate: 0.90,
            steps: [
                { name: "配制溶液", icon: "💧", desc: "将胆矾晶体溶于蒸馏水，配成蓝色硫酸铜溶液", duration: 1500 },
                { name: "浸入铁片", icon: "🔩", desc: "将洁净铁片浸入硫酸铜溶液中", duration: 1000, critical: true },
                { name: "等待置换", icon: "⏳", desc: "铁与硫酸铜发生置换反应，铁片表面析出红色铜", duration: 2000 },
                { name: "滤出铜粉", icon: "🫙", desc: "过滤反应液，收集沉淀的铜粉", duration: 1500 },
                { name: "干燥收集", icon: "✨", desc: "用酒精灯烘干铜粉，装入样品瓶", duration: 1000 }
            ]
        },
        "重结晶": {
            icon: "💎",
            description: "利用溶解度差异提纯晶体物质",
            equipment: "结晶器",
            duration: 7000,
            successRate: 0.88,
            steps: [
                { name: "热水溶解", icon: "💧", desc: "将粗硝石加入热水中搅拌至完全溶解", duration: 2000 },
                { name: "趁热过滤", icon: "🫙", desc: "用滤纸过滤热溶液，除去不溶性杂质", duration: 1500 },
                { name: "冷却结晶", icon: "❄️", desc: "静置滤液缓慢冷却，硝石晶体逐渐析出", duration: 2000, critical: true },
                { name: "过滤晶体", icon: "🔩", desc: "抽滤分离出硝石晶体", duration: 1000 },
                { name: "干燥称量", icon: "✨", desc: "烘干晶体，得到纯净的硝石精", duration: 1000 }
            ]
        },
        "升华/重结晶": {
            icon: "✨",
            description: "结合升华和重结晶的高纯度提纯",
            equipment: "精密提纯装置",
            duration: 12000,
            successRate: 0.92,
            steps: [
                { name: "粗碎原料", icon: "🔨", desc: "将粗矿敲碎成小块", duration: 1000 },
                { name: "升华提纯", icon: "🌫️", desc: "加热使砷化合物升华，分离脉石杂质", duration: 3000, critical: true },
                { name: "收集升华物", icon: "🧫", desc: "刮取冷凝下来的初步纯化产物", duration: 1000 },
                { name: "溶解", icon: "💧", desc: "将产物溶于适量溶剂中", duration: 1500 },
                { name: "重结晶", icon: "💎", desc: "缓慢冷却使高纯度晶体析出", duration: 2000, critical: true },
                { name: "干燥成品", icon: "✨", desc: "干燥得到高纯度精制品", duration: 1000 }
            ]
        },
        "水洗除杂": {
            icon: "💧",
            description: "用水洗去除可溶性杂质",
            equipment: "洗涤装置",
            duration: 4000,
            successRate: 0.95,
            steps: [
                { name: "加水搅拌", icon: "💧", desc: "将软锰矿粉加入水中充分搅拌", duration: 1500 },
                { name: "静置沉降", icon: "⏳", desc: "静置使不溶的二氧化锰沉降底部", duration: 1500 },
                { name: "倾析去水", icon: "🫙", desc: "小心倾去上层含杂质的水液", duration: 1000, critical: true },
                { name: "干燥收集", icon: "✨", desc: "烘干沉降物，得到纯净的二氧化锰", duration: 1000 }
            ]
        },
        "溶解过滤+蒸发": {
            icon: "🫙",
            description: "溶解后过滤除去不溶物，蒸发结晶",
            equipment: "过滤蒸发装置",
            duration: 5000,
            successRate: 0.93,
            steps: [
                { name: "加水溶解", icon: "💧", desc: "将粗盐加入蒸馏水中搅拌溶解", duration: 1500 },
                { name: "过滤除渣", icon: "🫙", desc: "用滤纸过滤除去不溶性泥沙等杂质", duration: 1500 },
                { name: "蒸发浓缩", icon: "🔥", desc: "加热蒸发滤液至出现晶膜", duration: 2000, critical: true },
                { name: "冷却结晶", icon: "❄️", desc: "停止加热，静置冷却析出纯盐晶体", duration: 1000 },
                { name: "收集精盐", icon: "✨", desc: "过滤出纯净的氯化钠晶体，晾干保存", duration: 1000 }
            ]
        }
    };
    
    // 实验室状态
    let labState = {
        selectedCrudeOre: null,
        selectedMethod: null,
        isPurifying: false,
        purificationProgress: 0,
        purificationTimer: null,
        currentStepIndex: 0,
        stepTimer: null,
        criticalActionReady: false,
        qualityBonus: 0,
        stats: {
            totalPurifications: 0,
            successfulPurifications: 0,
            qualityProducts: 0
        }
    };
    
    // ======================= 地形数据 =======================
    const TERRAINS = [
        { name: "青翠山林", minerals: [{ name:"孔雀石",weight:35},{ name:"赤铁矿",weight:30},{ name:"锡矿石",weight:15},{ name:"曾青",weight:5},{ name:"磁石",weight:10},{ name:"炉甘石",weight:8},{ name:"黄芪",weight:10}] },
        { name: "赤焰火山", minerals: [{ name:"黄铁矿",weight:45},{ name:"雄黄",weight:30},{ name:"雌黄",weight:15},{ name:"辰砂矿",weight:10}] },
        { name: "金霞矿脉", minerals: [{ name:"自然金矿",weight:20},{ name:"辉银矿",weight:25},{ name:"孔雀石",weight:20},{ name:"钙钛矿",weight:15},{ name:"慈石",weight:12},{ name:"方铅矿",weight:12},{ name:"地黄",weight:8}] },
        { name: "幽冥洞窟", minerals: [{ name:"黄铁矿",weight:30},{ name:"赤铁矿",weight:20},{ name:"戎盐",weight:25},{ name:"矾石",weight:15},{ name:"辰砂矿",weight:10},{ name:"硝石",weight:15},{ name:"软锰",weight:10}] },
        { name: "灵泉幽谷", minerals: [{ name:"辉银矿",weight:20},{ name:"曾青",weight:25},{ name:"戎盐",weight:15},{ name:"慈石",weight:12},{ name:"锡矿石",weight:8},{ name:"胆矾",weight:8},{ name:"金银花",weight:15}] },
        { name: "灵芝百草园", minerals: [{ name:"灵芝",weight:25},{ name:"人参",weight:20},{ name:"何首乌",weight:15},{ name:"雪莲",weight:8},{ name:"茯苓",weight:5},{ name:"枸杞",weight:15},{ name:"当归",weight:12},{ name:"甘草",weight:10},{ name:"三七",weight:8},{ name:"山药",weight:8},{ name:"冬虫夏草",weight:3}] },
        { name: "雪域冰原", minerals: [{ name:"雪莲",weight:35},{ name:"红景天",weight:30},{ name:"冬虫夏草",weight:15},{ name:"灵芝",weight:10}] },
        { name: "深海遗礁", minerals: [{ name:"龙涎香",weight:2},{ name:"珍珠",weight:30},{ name:"海金沙",weight:25},{ name:"人参",weight:15},{ name:"何首乌",weight:10},{ name:"六一泥",weight:60}] }
    ];
    // ======================= 考古数据 =======================
    const ARCHAEOLOGY_SITES = [
        { name: "荒古遗迹", desc: "埋藏低级丹方碎片的古老遗迹", fragments: [
            { name:"丹方碎片-一元鼎",weight:35},{ name:"丹方碎片-两仪鼎",weight:30},{ name:"丹方碎片-三才鼎",weight:20},{ name:"丹方碎片-四象鼎",weight:15}
        ]},
        { name: "古迹深坑", desc: "深处埋藏中级丹方碎片", fragments: [
            { name:"丹方碎片-三才鼎",weight:30},{ name:"丹方碎片-四象鼎",weight:25},{ name:"丹方碎片-五行鼎",weight:20},{ name:"丹方碎片-六合鼎",weight:15},{ name:"丹方碎片-七星鼎",weight:10}
        ]},
        { name: "玄秘洞窟", desc: "传说中藏有顶级丹方碎片的神秘洞窟", fragments: [
            { name:"丹方碎片-五行鼎",weight:30},{ name:"丹方碎片-六合鼎",weight:25},{ name:"丹方碎片-七星鼎",weight:20},{ name:"丹方碎片-八卦鼎",weight:15},{ name:"丹方碎片-九鼎神丹",weight:10}
        ]}
    ];
    // 考古状态
    let isExcavating = false;
    let selectedArchSite = null;
    let excavateTimer = null;
    let excavateProgressInterval = null;
    const EXCAVATE_DURATION = 2500;
    // ======================= 成就系统 =======================
    const ACHIEVEMENTS = [
        { id: "first_refine", name: "🔥 初窥丹道", desc: "首次成功炼制丹药", check: s => s.totalRefines >= 1, progress: s => ({ cur:s.totalRefines, tgt:1 }) },
        { id: "hundred_refines", name: "⚒️ 百炼成钢", desc: "成功炼制100次", check: s => s.totalRefines >= 100, progress: s => ({ cur:s.totalRefines, tgt:100 }) },
        { id: "master_refiner", name: "👑 千锤百炼", desc: "成功炼制500次", check: s => s.totalRefines >= 500, progress: s => ({ cur:s.totalRefines, tgt:500 }) },
        { id: "poison_resist_100", name: "🛡️ 万毒不侵", desc: "累计抵抗100点毒伤", check: s => s.totalPoisonResisted >= 100, progress: s => ({ cur:s.totalPoisonResisted, tgt:100 }) },
        { id: "poison_resist_500", name: "💪 百毒不侵", desc: "累计抵抗300点毒伤", check: s => s.totalPoisonResisted >= 300, progress: s => ({ cur:s.totalPoisonResisted, tgt:300 }) },
        { id: "hoarder", name: "💰 富可敌国", desc: "背包总物品数量超过500", check: () => getTotalItemCount() >= 500, progress: () => ({ cur:getTotalItemCount(), tgt:500 }) },
        { id: "hoarder_1000", name: "💎 富甲天下", desc: "背包总物品数量超过1000", check: () => getTotalItemCount() >= 1000, progress: () => ({ cur:getTotalItemCount(), tgt:1000 }) },
        { id: "purification_50", name: "✨ 点石成金", desc: "成功提纯50次", check: s => s.totalPurifications >= 50, progress: s => ({ cur:s.totalPurifications, tgt:50 }) },
        { id: "purification_200", name: "🔮 化腐朽为神奇", desc: "成功提纯200次", check: s => s.totalPurifications >= 200, progress: s => ({ cur:s.totalPurifications, tgt:200 }) },
        { id: "herbalist", name: "🌿 神农尝百草", desc: "累计服用30种不同物品", check: s => s.consumedUnique >= 30, progress: s => ({ cur:s.consumedUnique, tgt:30 }) },
        { id: "revive_once", name: "💀 九死一生", desc: "触发复活效果", check: s => s.reviveTriggered >= 1, progress: s => ({ cur:s.reviveTriggered, tgt:1 }) },
        { id: "score_1000", name: "👑 丹道宗师", desc: "九鼎积分达到1000", check: () => totalScore >= 1000, progress: () => ({ cur:totalScore, tgt:1000 }) },
        { id: "score_1200", name: "🏆 丹道圣手", desc: "九鼎积分达到1200", check: () => totalScore >= 1200, progress: () => ({ cur:totalScore, tgt:1200 }) },
        { id: "mining_500", name: "⛏️ 掘地三尺", desc: "采掘500次", check: s => s.totalMining >= 500, progress: s => ({ cur:s.totalMining, tgt:500 }) },
        { id: "mining_1000", name: "⛰️ 移山填海", desc: "采掘1000次", check: s => s.totalMining >= 1000, progress: s => ({ cur:s.totalMining, tgt:1000 }) },
        { id: "poison_dealer", name: "☠️ 毒王", desc: "累计对自身造成300点毒伤", check: s => s.totalPoisonDealt >= 300, progress: s => ({ cur:s.totalPoisonDealt, tgt:300 }) },
        { id: "maxhp_200", name: "❤️ 生命之巅", desc: "气血上限达到200", check: () => maxHealth >= 200, progress: () => ({ cur:maxHealth, tgt:200 }) },
        { id: "maxhp_300", name: "💖 不死之身", desc: "气血上限达到300", check: () => maxHealth >= 300, progress: () => ({ cur:maxHealth, tgt:300 }) },
        { id: "gold_spender", name: "💸 挥金如土", desc: "累计花费50金购片", check: s => s.totalGoldSpent >= 50, progress: s => ({ cur:s.totalGoldSpent, tgt:50 }) },
        { id: "archaeologist", name: "🏛️ 考古大家", desc: "考古发掘100次", check: s => s.totalExcavations >= 100, progress: s => ({ cur:s.totalExcavations, tgt:100 }) },
        { id: "cauldron_master", name: "🔧 铸鼎大师", desc: "修缮丹鼎50次", check: s => s.totalRepairs >= 50, progress: s => ({ cur:s.totalRepairs, tgt:50 }) },
    ];
    let achievementState = { unlocked: {}, stats: { totalRefines:0, totalPurifications:0, totalConsumed:0, consumedUnique:0, consumedSet:[], totalMining:0, totalPoisonDealt:0, totalGoldSpent:0, totalPoisonResisted:0, totalExcavations:0, totalRepairs:0, reviveTriggered:0 } };
    // ======================= 临时增益系统 =======================
    const BUFF_DEFS = {
        miningSpeed:   { name:"速掘",   icon:"⛏️", desc:"挖矿速度+10%",      durationMs:600000 },
        miningDefense: { name:"矿甲",   icon:"🛡️", desc:"矿难伤害-50%",      durationMs:600000 },
        poisonImmunity:{ name:"毒免",   icon:"🧪", desc:"完全免疫中毒",      durationMs:600000 },
        refineBoost:   { name:"炼技",   icon:"🔥", desc:"炼丹成功率+15%",    durationMs:900000 },
        doubleProduct: { name:"天眷",   icon:"✨", desc:"提纯/炼制双倍率+30%",durationMs:900000 },
    };
    let temporaryBuffs = {};
    function hasBuff(id) { return temporaryBuffs[id] && Date.now() < temporaryBuffs[id].endTime; }
    function cleanExpiredBuffs() {
        const now = Date.now();
        Object.keys(temporaryBuffs).forEach(id => { if (now >= temporaryBuffs[id].endTime) delete temporaryBuffs[id]; });
    }
    function applyBuff(id, durationMs) {
        temporaryBuffs[id] = { endTime: Date.now() + durationMs };
        cleanExpiredBuffs();
        saveGameData();
    }
    function getTotalItemCount() { return Object.values(inventory).reduce((s, c) => s + c, 0); }
    function checkAchievements() {
        const s = achievementState.stats;
        const now = Date.now();
        let newUnlock = false;
        ACHIEVEMENTS.forEach(a => {
            if (achievementState.unlocked[a.id]) return;
            if (a.check(s)) {
                achievementState.unlocked[a.id] = now;
                newUnlock = true;
                showAchieveToast(`🏆 达成成就：${a.name} — ${a.desc}`);
            }
        });
        if (newUnlock) { saveGameData(); renderAchievements(); }
    }
    // ======================= 配方数据 =======================
    const SMELT_RECIPES = [
        { id: "smelt_cu", type: "smelt", name: "提纯铜", req: {"孔雀石":2}, out: {"铜":1}, timeMin:2.0, timeMax:3.5, score:0, maxHpIncrease:0 },
        { id: "smelt_fe", type: "smelt", name: "提纯铁", req: {"赤铁矿":2}, out: {"铁":1}, timeMin:2.0, timeMax:3.5 },
        { id: "smelt_fe_s", type: "smelt", name: "提炼铁与硫磺", req: {"黄铁矿":2}, out: {"铁":1,"石硫磺":1}, timeMin:2.5, timeMax:4.0 },
        { id: "smelt_sn", type: "smelt", name: "提纯锡", req: {"锡矿石":2}, out: {"锡":1}, timeMin:2.0, timeMax:3.5 },
        { id: "smelt_au", type: "smelt", name: "提纯金", req: {"自然金矿":3}, out: {"金":1}, timeMin:3.0, timeMax:5.0 },
        { id: "smelt_ag", type: "smelt", name: "提纯银", req: {"辉银矿":2}, out: {"银":1}, timeMin:2.5, timeMax:4.0 },
        { id: "smelt_cinnabar", type: "smelt", name: "提纯丹砂", req: {"辰砂矿":2}, out: {"丹砂":1}, timeMin:3.0, timeMax:5.0 },
        { id: "smelt_titanium", type: "smelt", name: "熔炼钛金", req: {"钙钛矿":3}, out: {"钛金":1}, timeMin:4.0, timeMax:6.0 }
    ];
    const DING_RECIPES = [
        { id: "ding1", type: "ding", name: "一元鼎", req: {"金":2,"丹砂":2,"人参":1,"枸杞":1}, out: {"一元鼎":1}, baseScore:10, timeMin:3, timeMax:6, maxHpIncrease:5 },
        { id: "ding2", type: "ding", name: "两仪鼎", req: {"银":2,"雄精":2,"铁":1,"当归":1}, out: {"两仪鼎":1}, baseScore:20, timeMin:6, timeMax:9, maxHpIncrease:8 },
        { id: "ding3", type: "ding", name: "三才鼎", req: {"铜":3,"雌精":2,"精盐":2,"黄芪":1}, out: {"三才鼎":1}, baseScore:30, timeMin:9, timeMax:13, maxHpIncrease:12 },
        { id: "ding4", type: "ding", name: "四象鼎", req: {"铁":3,"铜":2,"石硫磺":2,"三七":1}, out: {"四象鼎":1}, baseScore:40, timeMin:12, timeMax:17, maxHpIncrease:15 },
        { id: "ding5", type: "ding", name: "五行鼎", req: {"金":2,"银":2,"铜":2,"铁":2,"锡":2,"山药":2,"甘草":2}, out: {"五行鼎":1}, baseScore:50, timeMin:15, timeMax:20, maxHpIncrease:18 },
        { id: "ding6", type: "ding", name: "六合鼎", req: {"丹砂":4,"雄精":3,"雌精":3,"地黄":2,"硝石精":1}, out: {"六合鼎":1}, baseScore:60, timeMin:18, timeMax:24, maxHpIncrease:22 },
        { id: "ding7", type: "ding", name: "七星鼎", req: {"金":4,"银":4,"钛金":2,"铁":4,"珍珠":1,"红景天":1,"锌华":1}, out: {"七星鼎":1}, baseScore:70, timeMin:22, timeMax:28, maxHpIncrease:25 },
        { id: "ding8", type: "ding", name: "八卦鼎", req: {"灵芝":3,"人参":3,"雪莲":2,"茯苓":3,"龙涎香":1,"冬虫夏草":1}, out: {"八卦鼎":1}, baseScore:85, timeMin:27, timeMax:33, maxHpIncrease:30 },
        { id: "ding9", type: "ding", name: "九鼎神丹", req: {"金":5,"银":5,"丹砂":5,"雄精":5,"灵芝":5,"人参":5,"龙涎香":2,"冬虫夏草":2}, out: {"九鼎神丹":1}, baseScore:100, timeMin:36, timeMax:43, maxHpIncrease:50 }
    ];
    const ALL_RECIPES = [...SMELT_RECIPES, ...DING_RECIPES];
    const MAX_SCORE_TIMES = 3;
    const MINE_DURATION = 2800;
    const DANGER_PROB = 0.25;
    const DAMAGE_MIN = 8, DAMAGE_MAX = 20;
    const AUTO_STOP_HEALTH = 20;
    const RANK_UPLOAD_INTERVAL = 10000;
    const REWARD_ITEMS = [
        "孔雀石", "赤铁矿", "黄铁矿", "锡矿石", "自然金矿", "辉银矿", "辰砂矿", "钙钛矿",
        "曾青", "雄黄", "雌黄", "慈石", "戎盐", "矾石",
        "炉甘石", "方铅矿", "磁石", "胆矾", "硝石", "软锰",
        "茯苓", "何首乌", "人参", "雪莲", "灵芝",
        "枸杞", "当归", "黄芪", "金银花", "甘草", "地黄", "红景天", "冬虫夏草", "龙涎香",
        "三七", "山药", "六一泥"
    ];
    // ======================= Supabase 配置 =======================
    const SUPABASE_URL = 'https://supabase.iteamgame.dpdns.org';
    const SUPABASE_ANON_KEY = 'sb_publishable_wH0spS1pkkrKe6pu7AwUKA_2cSK95rG';
    let supabase = null;
    let cloudAvailable = false;
    let isLoggedIn = false;
    let currentUser = null;
    let saveQueue = Promise.resolve();
    // 全局游戏状态
    let inventory = {};
    let health = 100, maxHealth = 100;
    let dingStatus = DING_RECIPES.map((_, idx) => ({ unlocked: idx===0, timesScored:0 }));
    const CAULDRON_MAX_DURABILITY = 10;
    let cauldronDurability = CAULDRON_MAX_DURABILITY;
    let totalScore = 0;
    let isMining = false;
    let autoMiningActive = false;
    let autoMiningInterval = null;
    let selectedTerrain = null;
    let currentMiningTimer = null;
    let currentProgressInterval = null;
    let targetMineral = "";
    // 炼丹炉状态
    let currentSlottedMaterials = {};  // 当前投入的材料
    let currentRecipe = null;          // 当前材料槽匹配的配方
    let selectedBookRecipe = null;     // 当前在丹方秘录中选中的配方（用于详情展示）
    let isRefining = false;
    let refineStartTime = 0;
    let refineTimerInterval = null;
    let currentRefineTime = 0;
    // 智慧老人状态
    let challengeCooldown = 0;
    let challengeInterval = null;
    let challengeReady = false;
    let loadedQuizQuestions = [];
    let currentChallengeQuestions = [];
    let currentQuizIndex = 0;
    let quizScore = 0;
    let isQuizActive = false;
    // 剧毒状态
    let poisonState = {
        active: false,
        totalDamage: 0,
        remainingDamage: 0,
        duration: 0,
        remainingDuration: 0,
        accumulator: 0,
        tickInterval: null
    };
    // 增益状态
    let miningShieldCharges = 0;
    let tempMaxHealthBonus = 0;
    let tempMaxHealthTimer = null;
    let tempMaxHealthStartTime = 0;
    let reviveFlag = false;
    let poisonResistance = 0;

    // ======================= 辅助函数 =======================
    function getUserDataKey() { return `dandao_user_${currentUser}`; }
    function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]||m)); }
    function getGameDataSnapshot() {
        return {
            inventory, health, maxHealth, dingStatus, totalScore,
            cauldronDurability,
            poisonState: { active: poisonState.active, totalDamage: poisonState.totalDamage,
                remainingDamage: poisonState.remainingDamage, duration: poisonState.duration,
                remainingDuration: poisonState.remainingDuration, accumulator: poisonState.accumulator },
            miningShield: miningShieldCharges,
            tempMaxHealthBonus, tempMaxHealthStartTime,
            reviveFlag, poisonResistance,
            achievementState, temporaryBuffs,
            updated_at: new Date().toISOString()
        };
    }
    function restoreGameData(data) {
        if (data.inventory) inventory = data.inventory;
        if (data.health !== undefined) health = data.health;
        if (data.maxHealth !== undefined) maxHealth = data.maxHealth;
        if (data.dingStatus) dingStatus = data.dingStatus.map((s,i)=>({ unlocked: s.unlocked ?? (i===0), timesScored: s.timesScored || 0 }));
        if (data.totalScore !== undefined) totalScore = data.totalScore;
        if (data.cauldronDurability !== undefined) cauldronDurability = data.cauldronDurability;
        if (data.poisonState) {
            poisonState.active = data.poisonState.active || false;
            poisonState.totalDamage = data.poisonState.totalDamage || 0;
            poisonState.remainingDamage = data.poisonState.remainingDamage || 0;
            poisonState.duration = data.poisonState.duration || 0;
            poisonState.remainingDuration = data.poisonState.remainingDuration || 0;
            poisonState.accumulator = data.poisonState.accumulator || 0;
            if (poisonState.active) startPoisonTick();
        }
        if (data.miningShield !== undefined) miningShieldCharges = data.miningShield;
        if (data.tempMaxHealthBonus !== undefined) tempMaxHealthBonus = data.tempMaxHealthBonus;
        if (data.tempMaxHealthStartTime !== undefined) tempMaxHealthStartTime = data.tempMaxHealthStartTime;
        if (data.reviveFlag !== undefined) reviveFlag = data.reviveFlag;
        if (data.poisonResistance !== undefined) poisonResistance = data.poisonResistance;
        if (data.achievementState) {
            achievementState.unlocked = data.achievementState.unlocked || {};
            if (data.achievementState.stats) Object.assign(achievementState.stats, data.achievementState.stats);
        }
        if (data.temporaryBuffs) { temporaryBuffs = data.temporaryBuffs; cleanExpiredBuffs(); }
        if (health > maxHealth) health = maxHealth;
        if (health <= 0) triggerRebirth();
        updateHealthUI();
        renderAllUI();
    }
    // ======================= 云端存档 =======================
    async function loadFromCloud() {
        if (!isLoggedIn || !cloudAvailable || !supabase) return false;
        try {
            const { data, error } = await supabase
                .from('player_saves')
                .select('game_data, updated_at')
                .eq('user_name', currentUser)
                .maybeSingle();
            if (error) throw error;
            if (data && data.game_data) {
                restoreGameData(data.game_data);
                console.log('云存档加载成功', data.updated_at);
                return true;
            }
        } catch(err) {
            console.warn('加载云存档失败', err);
        }
        return false;
    }
    async function saveToCloud() {
        if (!isLoggedIn || !cloudAvailable || !supabase) return;
        // 立即捕获当前快照，避免队列延迟导致状态偏差
        const snapshot = getGameDataSnapshot();
        saveQueue = saveQueue.then(async () => {
            try {
                const { error } = await supabase
                    .from('player_saves')
                    .upsert({ user_name: currentUser, game_data: snapshot, updated_at: snapshot.updated_at }, { onConflict: 'user_name' });
                if (error) throw error;
                console.log('云存档保存成功');
            } catch(err) {
                console.warn('云存档保存失败', err);
            }
        });
        await saveQueue;
    }
    async function initCloudSync() {
        if (!isLoggedIn) return;
        // 云端优先：首次加载时云存档覆盖本地
        const loaded = await loadFromCloud();
        if (loaded) {
            saveToLocalStorage();
        } else {
            // 无云存档，将本地推送到云端
            await saveToCloud();
        }
    }
    // ======================= 本地存储 =======================
    function loadGameData() {
        const raw = localStorage.getItem(getUserDataKey());
        if (raw) {
            try {
                const data = JSON.parse(raw);
                inventory = data.inventory || {};
                health = data.health ?? 100;
                maxHealth = data.maxHealth ?? 100;
                dingStatus = DING_RECIPES.map((_,i)=>{
                    const s = (data.dingStatus && data.dingStatus[i]) || {};
                    return { unlocked: s.unlocked ?? (i===0), timesScored: s.timesScored || 0 };
                });
                cauldronDurability = data.cauldronDurability ?? CAULDRON_MAX_DURABILITY;
                totalScore = data.totalScore || 0;
                if (data.poisonState) {
                    poisonState.active = data.poisonState.active || false;
                    poisonState.totalDamage = data.poisonState.totalDamage || 0;
                    poisonState.remainingDamage = data.poisonState.remainingDamage || 0;
                    poisonState.duration = data.poisonState.duration || 0;
                    poisonState.remainingDuration = data.poisonState.remainingDuration || 0;
                    poisonState.accumulator = data.poisonState.accumulator || 0;
                    if (poisonState.active) startPoisonTick();
                }
                miningShieldCharges = data.miningShield || 0;
                tempMaxHealthBonus = data.tempMaxHealthBonus || 0;
                tempMaxHealthStartTime = data.tempMaxHealthStartTime || 0;
                reviveFlag = data.reviveFlag || false;
                poisonResistance = data.poisonResistance || 0;
                if (data.achievementState) {
                    achievementState.unlocked = data.achievementState.unlocked || {};
                    if (data.achievementState.stats) Object.assign(achievementState.stats, data.achievementState.stats);
                }
                if (data.temporaryBuffs) { temporaryBuffs = data.temporaryBuffs; cleanExpiredBuffs(); }
            } catch(e) { resetToDefault(); }
        } else { resetToDefault(); }
        if (health <= 0) triggerRebirth();
        health = Math.min(health, maxHealth);
        updateHealthUI();
        saveGameData();
    }
    function resetToDefault() {
        inventory = {};
        ["自然金矿","辉银矿","孔雀石","赤铁矿","黄铁矿","锡矿石","辰砂矿","钙钛矿"].forEach(m=>{ inventory[m]=8; });
        ["灵芝","人参","何首乌","雪莲","茯苓","枸杞","当归","黄芪","金银花","甘草","地黄","红景天","冬虫夏草","龙涎香","三七","山药"].forEach(h=>{ inventory[h]=2; });
        health = 100; maxHealth = 100;
        dingStatus = DING_RECIPES.map((_, idx)=>({ unlocked: idx===0, timesScored:0 }));
        cauldronDurability = CAULDRON_MAX_DURABILITY;
        totalScore = 0;
        clearPoison();
        miningShieldCharges = 0;
        tempMaxHealthBonus = 0;
        tempMaxHealthStartTime = 0;
        if (tempMaxHealthTimer) { clearTimeout(tempMaxHealthTimer); tempMaxHealthTimer = null; }
        reviveFlag = false;
        poisonResistance = 0;
        achievementState = { unlocked: {}, stats: { totalRefines:0, totalPurifications:0, totalConsumed:0, consumedUnique:0, consumedSet:[], totalMining:0, totalPoisonDealt:0, totalGoldSpent:0, totalPoisonResisted:0, totalExcavations:0, totalRepairs:0, reviveTriggered:0 } };
        temporaryBuffs = {};
    }
    function saveToLocalStorage() {
        if (!currentUser) return;
        localStorage.setItem(getUserDataKey(), JSON.stringify({
            inventory, health, maxHealth, dingStatus, totalScore,
            cauldronDurability,
            poisonState: { active: poisonState.active, totalDamage: poisonState.totalDamage,
                remainingDamage: poisonState.remainingDamage, duration: poisonState.duration,
                remainingDuration: poisonState.remainingDuration, accumulator: poisonState.accumulator },
            miningShield: miningShieldCharges,
            tempMaxHealthBonus, tempMaxHealthStartTime,
            reviveFlag, poisonResistance,
            achievementState, temporaryBuffs,
            updated_at: new Date().toISOString()
        }));
    }
    async function saveGameData() {
        if(!currentUser) return;
        saveToLocalStorage();
        if (isLoggedIn && cloudAvailable) await saveToCloud();
        updateRanking();
    }
    // ======================= 排行榜 =======================
    async function fetchCloudRanking() {
        if (!cloudAvailable || !supabase || !isLoggedIn) { renderRankingLocal(); return; }
        try {
            const { data, error } = await supabase
                .from('rankings')
                .select('user_name, score, max_hp')
                .order('score', { ascending: false })
                .limit(8);
            if (error) throw error;
            const container = document.getElementById('rankList');
            if (!container) return;
            if (!data || data.length === 0) container.innerHTML = '<li>暂无全服数据，快去炼丹成为第一人！</li>';
            else container.innerHTML = data.map((user, i) => `<li><span>${i+1}. ${escapeHtml(user.user_name)}</span><span>${user.score}分 (${user.max_hp}❤️)</span></li>`).join('');
        } catch(err) { console.warn('拉取云端排行失败', err); renderRankingLocal(); }
    }
    function renderRankingLocal() {
        const container = document.getElementById('rankList');
        if(!container) return;
        const allUsers = [];
        for(let i=0;i<localStorage.length;i++){ const key=localStorage.key(i); if(key.startsWith('dandao_user_')){ try{ const data=JSON.parse(localStorage.getItem(key)); const userName=key.replace('dandao_user_',''); allUsers.push({name:userName, score:data.totalScore||0, maxHp:data.maxHealth||100}); }catch(e){} } }
        allUsers.sort((a,b)=>b.score-a.score);
        const topUsers=allUsers.slice(0,8);
        container.innerHTML = topUsers.length ? topUsers.map((u,i)=>`<li><span>${i+1}. ${escapeHtml(u.name)}</span><span>${u.score}分 (${u.maxHp}❤️)</span></li>`).join('') : '<li>暂无丹道高手</li>';
    }
    async function updateRanking() {
        if (isLoggedIn && cloudAvailable) {
            try {
                const { data: existing } = await supabase
                    .from('rankings')
                    .select('score, max_hp')
                    .eq('user_name', currentUser)
                    .maybeSingle();
                const shouldUpload = !existing || existing.score < totalScore || existing.max_hp !== maxHealth;
                if (shouldUpload) {
                    const nextScore = existing ? Math.max(existing.score || 0, totalScore) : totalScore;
                    await supabase
                        .from('rankings')
                        .upsert({ user_name: currentUser, score: nextScore, max_hp: maxHealth, updated_at: new Date().toISOString() }, { onConflict: 'user_name' });
                }
            } catch(e) { console.warn(e); }
        }
        renderRanking();
    }
    async function renderRanking() { if (isLoggedIn && cloudAvailable) await fetchCloudRanking(); else renderRankingLocal(); }
    function triggerRebirth() {
        if (reviveFlag) {
            reviveFlag = false;
            achievementState.stats.reviveTriggered++;
            checkAchievements();
            health = Math.floor(maxHealth * 0.5);
            clearPoison();
            updateHealthUI(); saveGameData();
            showFeedback("💫 龙涎护心丹触发！你被复活了！", "mineFeedback");
            return;
        }
        if(!currentUser) return;
        // 显示死亡遮罩
        const deathModal = document.getElementById('deathModal');
        if (deathModal) {
            deathModal.classList.add('active');
            const rebirthBtn = document.getElementById('deathRebirthBtn');
            if (rebirthBtn) {
                const newBtn = rebirthBtn.cloneNode(true);
                rebirthBtn.parentNode.replaceChild(newBtn, rebirthBtn);
                newBtn.onclick = function() {
                    deathModal.classList.remove('active');
                    localStorage.removeItem(getUserDataKey());
                    resetToDefault(); saveGameData(); loadGameData(); renderAllUI();
                    showFeedback("⚰️ 轮回重生！一切归零。", "mineFeedback");
                };
            }
        } else {
            // 兜底：如果没有遮罩元素，直接重置
            localStorage.removeItem(getUserDataKey());
            resetToDefault(); saveGameData(); loadGameData(); renderAllUI();
            showFeedback("⚰️ 毒发身亡，轮回重生！一切归零。", "mineFeedback");
        }
    }
    function showFeedback(msg, elementId) { const el = document.getElementById(elementId); if(el) el.innerHTML = msg; setTimeout(() => { if(el && el.innerHTML === msg) el.innerHTML = ''; }, 3500); }
    // ======================= 挖矿逻辑 =======================
    function performMining() {
        return new Promise((resolve) => {
            if (!selectedTerrain || health <= 0) { resolve(false); return; }
            cleanExpiredBuffs();
            const speedBonus = hasBuff('miningSpeed') ? 0.1 : 0;
            const effectiveDuration = Math.ceil(MINE_DURATION * (1 - speedBonus));
            const pc = document.getElementById('miningProgressContainer');
            const pf = document.getElementById('miningProgressFill');
            const pt = document.getElementById('miningProgressText');
            pc.classList.add('active'); pf.style.width = '0%';
            if (hasBuff('miningSpeed')) pt.textContent = `采掘中(速掘): 0%`;
            const start = Date.now();
            const interval = setInterval(() => {
                const elapsed = Date.now() - start;
                const percent = Math.min(100, (elapsed / effectiveDuration) * 100);
                pf.style.width = `${percent}%`;
                pt.textContent = `${hasBuff('miningSpeed') ? '采掘中(速掘)' : '采掘中'}: ${Math.floor(percent)}%`;
                if (percent >= 100) clearInterval(interval);
            }, 30);
            const timer = setTimeout(() => {
                clearInterval(interval);
                const mineral = selectMineralByWeight(selectedTerrain.minerals);
                const amount = Math.floor(Math.random() * 3) + 1;
                if (mineral) inventory[mineral] = (inventory[mineral] || 0) + amount;
                let msg = `获得 ${mineral} x${amount}`;
                if (Math.random() < DANGER_PROB) {
                    if (miningShieldCharges > 0) {
                        miningShieldCharges--;
                        msg += `  🛡️ 矿难被护盾抵挡！(剩余${miningShieldCharges}次)`;
                    } else {
                        let damage = Math.floor(Math.random() * (DAMAGE_MAX-DAMAGE_MIN+1) + DAMAGE_MIN);
                        if (hasBuff('miningDefense')) { damage = Math.ceil(damage * 0.5); msg += ` 🛡️矿甲减免！`; }
                        health = Math.max(0, health - damage);
                        msg += `  ⚠️ 损失 ${damage} 气血！`;
                    }
                }
                achievementState.stats.totalMining++;
                checkAchievements();
                document.getElementById('mineFeedback').innerHTML = msg;
                updateHealthUI(); saveGameData(); renderInventory();
                if (health <= 0) triggerRebirth();
                pc.classList.remove('active');
                resolve({ mineral, amount });
            }, MINE_DURATION);
            currentMiningTimer = timer; currentProgressInterval = interval;
        });
    }
    function selectMineralByWeight(minerals) {
        let total = minerals.reduce((s,m)=>s+m.weight,0);
        let rand = Math.random() * total;
        let accum = 0;
        for(let m of minerals) { accum += m.weight; if(rand <= accum) return m.name; }
        return minerals[0]?.name;
    }
    function stopCurrentMining(resetAutoFlag = true) {
        if (currentMiningTimer) clearTimeout(currentMiningTimer);
        if (currentProgressInterval) clearInterval(currentProgressInterval);
        document.getElementById('miningProgressContainer').classList.remove('active');
        if (resetAutoFlag && autoMiningActive) {
            autoMiningActive = false;
            if (autoMiningInterval) clearInterval(autoMiningInterval);
            document.getElementById('autoMineBtn').style.display = 'inline-block';
            document.getElementById('stopAutoMineBtn').style.display = 'none';
            showFeedback('⏹️ 自动挖矿已停止。', 'autoFeedback');
        }
        isMining = false;
        document.getElementById('mineBtn').disabled = !selectedTerrain;
        if (selectedTerrain && targetMineral && terrainHasMineral(selectedTerrain, targetMineral)) document.getElementById('autoMineBtn').disabled = false;
        else document.getElementById('autoMineBtn').disabled = true;
    }
    async function startAutoMining() {
        if (!selectedTerrain || autoMiningActive) return;
        if (targetMineral && !terrainHasMineral(selectedTerrain, targetMineral)) { showFeedback(`❌ 当前地形无法产出目标粗矿: ${targetMineral}`, 'autoFeedback'); return; }
        if (health <= AUTO_STOP_HEALTH) { showFeedback(`⚠️ 生命值过低 (${health})，无法自动挖矿。`, 'autoFeedback'); return; }
        autoMiningActive = true;
        document.getElementById('autoMineBtn').style.display = 'none';
        document.getElementById('stopAutoMineBtn').style.display = 'inline-block';
        document.getElementById('autoFeedback').innerHTML = '⚙️ 自动挖矿进行中...';
        document.getElementById('mineBtn').disabled = true;
        async function autoCycle() {
            if (!autoMiningActive) return;
            if (health <= AUTO_STOP_HEALTH || !selectedTerrain) { showFeedback(`🛑 生命值极低或未选地形，自动挖矿停止。`, 'autoFeedback'); stopCurrentMining(true); return; }
            isMining = true;
            const result = await performMining();
            isMining = false;
            if (health <= 0) { stopCurrentMining(true); return; }
            if (targetMineral && result && result.mineral === targetMineral) { showFeedback(`🎉 挖到目标粗矿 ${targetMineral}！自动挖矿完成。`, 'autoFeedback'); stopCurrentMining(true); return; }
            if (autoMiningActive) autoMiningInterval = setTimeout(autoCycle, 500);
        }
        autoCycle();
    }
    function terrainHasMineral(terrain, mineral) { return terrain.minerals.some(m => m.name === mineral); }
    async function manualMine() {
        if (isMining) return;
        if (!selectedTerrain) { alert("请先选择地形"); return; }
        if (health <= 0) return;
        isMining = true;
        document.getElementById('mineBtn').disabled = true;
        document.getElementById('autoMineBtn').disabled = true;
        await performMining();
        isMining = false;
        document.getElementById('mineBtn').disabled = !selectedTerrain;
        if (selectedTerrain && targetMineral && terrainHasMineral(selectedTerrain, targetMineral)) document.getElementById('autoMineBtn').disabled = false;
    }
    function selectTerrain(terrain) {
        if (isMining) { alert("挖矿进行中，请稍后"); return; }
        selectedTerrain = terrain;
        document.getElementById('mineBtn').disabled = false;
        document.getElementById('mineBtn').innerText = `⛏️ 前往 ${terrain.name} 采掘`;
        if (targetMineral && terrainHasMineral(terrain, targetMineral)) { document.getElementById('autoMineBtn').disabled = false; document.getElementById('autoFeedback').innerHTML = ''; }
        else { document.getElementById('autoMineBtn').disabled = true; if (targetMineral) document.getElementById('autoFeedback').innerHTML = `⚠️ 当前地形无法产出 ${targetMineral}`; }
    }
    function populateTargetSelect() {
        const allMinerals = new Set();
        TERRAINS.forEach(t => t.minerals.forEach(m => allMinerals.add(m.name)));
        const sorted = Array.from(allMinerals).sort();
        const select = document.getElementById('targetMineralSelect');
        select.innerHTML = '<option value="">-- 不指定目标 (普通挖矿) --</option>' + sorted.map(m => `<option value="${m}">${m}</option>`).join('');
        select.addEventListener('change', (e) => {
            targetMineral = e.target.value;
            if (selectedTerrain && targetMineral && terrainHasMineral(selectedTerrain, targetMineral)) { document.getElementById('autoMineBtn').disabled = false; document.getElementById('autoFeedback').innerHTML = ''; }
            else { document.getElementById('autoMineBtn').disabled = true; if (selectedTerrain && targetMineral) document.getElementById('autoFeedback').innerHTML = `⚠️ 当前地形无法产出 ${targetMineral}`; }
        });
    }
    function renderTerrain() {
        const container = document.getElementById('terrainGrid');
        if(!container) return;
        container.innerHTML = TERRAINS.map(t=>`<div class="terrain-card" data-terrain='${JSON.stringify(t)}'><div class="terrain-name">${t.name}</div><div class="mineral-list">${t.minerals.map(m=>m.name).join(', ')}</div></div>`).join('');
        document.querySelectorAll('.terrain-card').forEach(card=>{ const terrain=JSON.parse(card.dataset.terrain); card.addEventListener('click',()=>selectTerrain(terrain)); });
    }
    // ======================= 物品与乾坤袋 =======================
    function renderInventory() {
        const container = document.getElementById('inventoryList');
        if (container) {
            const items = Object.entries(inventory).filter(([_,c]) => c>0);
            if(items.length === 0) container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:2rem;">🎒 空空如也</div>';
            else {
                container.innerHTML = items.map(([name, count]) => {
                    const info = ITEM_CATALOG[name] || { rarity:"未知", desc:"", source:"", hpEffect:0, maxHpEffect:0 };
                    const isDanger = info.hpEffect < 0;
                    const effectText = info.maxHpEffect > 0 ? `最大气血+${info.maxHpEffect}` : (info.hpEffect > 0 ? `气血+${info.hpEffect}` : `气血${info.hpEffect}`);
                    return `<div class="inv-card"><div class="inv-header"><div class="inv-name">${name}</div><div class="inv-qty">${count}</div></div><div class="inv-meta"><span class="inv-tag">${info.rarity}</span><span class="inv-tag">${info.source}</span><span class="inv-tag">${effectText}</span></div><div class="inv-desc">${info.desc}</div><div class="inv-action"><button class="${isDanger?'btn-consume danger':'btn-consume'}" onclick="consumeItem('${name}')">${isDanger?'强行生吞':'服用'}</button></div></div>`;
                }).join('');
            }
        }
        const herbDiv = document.getElementById('herbInventory');
        if(herbDiv){
            const herbsOwned = ["灵芝","人参","何首乌","雪莲","茯苓","枸杞","当归","黄芪","金银花","甘草","地黄","红景天","冬虫夏草","龙涎香","三七","山药"].filter(h => inventory[h] > 0);
            herbDiv.innerHTML = herbsOwned.length ? herbsOwned.map(h=>`<div class="herb-item"><span>🌿 ${h} x${inventory[h]}</span></div>`).join('') : '<div>暂无药草</div>';
        }
        const drugDiv = document.getElementById('drugRecipes');
        if(drugDiv){
            const DRUG_RECIPES = [
                { name:"培元膏", required:{ "灵芝":2,"人参":1 }, heal:40 },
                { name:"续命丹", required:{ "雪莲":1,"何首乌":2,"茯苓":2 }, heal:70 },
                { name:"九转还魂散", required:{ "人参":3,"灵芝":2,"雪莲":1 }, heal:100 },
                { name:"清心散", required:{ "金银花":2,"甘草":1 }, heal:25 },
                { name:"归脾丸", required:{ "当归":2,"黄芪":1 }, heal:35 },
                { name:"金创药", required:{ "三七":1,"茯苓":2 }, heal:45 },
                { name:"回元丹", required:{ "枸杞":3,"茯苓":1,"甘草":1 }, heal:55 },
                { name:"六味地黄丸", required:{ "地黄":2,"山药":1,"茯苓":1 }, heal:65 },
                { name:"蛇胆解毒丸", required:{ "金银花":3,"雄黄":1 }, heal:30 },
                { name:"八珍汤", required:{ "当归":2,"黄芪":2,"茯苓":1,"甘草":1 }, heal:80 },
                { name:"生脉饮", required:{ "人参":2,"红景天":1 }, heal:80 },
                { name:"龙涎护心丹", required:{ "龙涎香":1,"人参":2,"灵芝":1 }, heal:100 },
                { name:"混元一气丹", required:{ "冬虫夏草":2,"红景天":2,"九转还魂散":1 }, heal:120 },
                { name:"百草辟毒丹", required:{ "金银花":5,"甘草":3,"灵芝":1 }, heal:80 },
                { name:"五行归气丸", required:{ "枸杞":2,"当归":2,"黄芪":2,"地黄":2,"金银花":2 }, heal:75 }
            ];
            drugDiv.innerHTML = DRUG_RECIPES.map(drug=>`<div class="drug-item"><div><b>💊 ${drug.name}</b><br><span style="font-size:0.7rem;">需: ${Object.entries(drug.required).map(([m,c])=>`${m}x${c}`).join(', ')}</span></div><button class="make-btn" data-drug="${drug.name}">炼制存入</button></div>`).join('');
            document.querySelectorAll('[data-drug]').forEach(btn=>{ const d=DRUG_RECIPES.find(x=>x.name===btn.dataset.drug); if(d) btn.addEventListener('click',()=>makeDrug(d)); });
        }
    }
    function makeDrug(drug){
        for(let [mat,need] of Object.entries(drug.required)) if((inventory[mat]||0)<need){ showFeedback(`❌ 缺少 ${mat} x${need}`, 'pharmacyFeedback'); return; }
        for(let [mat,need] of Object.entries(drug.required)){ inventory[mat]-=need; if(inventory[mat]===0) delete inventory[mat]; }
        inventory[drug.name] = (inventory[drug.name] || 0) + 1;
        saveGameData(); renderInventory(); showFeedback(`✨ 成功炼制【${drug.name}】，已存入乾坤袋！`, 'pharmacyFeedback');
    }
    window.consumeItem = function(itemName) {
        cleanExpiredBuffs();
        const info = ITEM_CATALOG[itemName] || { hpEffect:0, maxHpEffect:0 };
        if(!inventory[itemName]) return;
        inventory[itemName]--;
        if(inventory[itemName]===0) delete inventory[itemName];
        let msg = `服用了 ${itemName}`;

        // 处理特殊效果
        const effect = info.effect;
        let effectiveHeal = info.hpEffect;
        
        if (effect === "cure_poison") {
            if (poisonState.active) { clearPoison(); msg += `，毒素已清除！`; }
        } else if (effect === "half_if_poisoned") {
            if (poisonState.active) { effectiveHeal = Math.floor(effectiveHeal / 2); msg += `（中毒状态下效果减半）`; }
        } else if (effect === "antidote") {
            if (poisonState.active) { clearPoison(); msg += `，毒素已清除！`; }
        } else if (effect === "mining_shield") {
            miningShieldCharges = 2;
            msg += `，获得2次挖矿护盾！`;
        } else if (effect === "temp_maxhp") {
            maxHealth += 10;
            health += 10;
            tempMaxHealthBonus += 10;
            tempMaxHealthStartTime = Date.now();
            if (tempMaxHealthTimer) clearTimeout(tempMaxHealthTimer);
            tempMaxHealthTimer = setTimeout(() => {
                maxHealth = Math.max(100, maxHealth - tempMaxHealthBonus);
                health = Math.min(health, maxHealth);
                tempMaxHealthBonus = 0;
                tempMaxHealthStartTime = 0;
                updateHealthUI();
                saveGameData();
                renderBuffBar();
            }, 300000);
            msg += `，临时气血上限+10持续5分钟！`;
        } else if (effect === "revive") {
            reviveFlag = true;
            msg += `，获得一次复活机会！`;
        } else if (effect === "perm_maxhp") {
            maxHealth += 5;
            health += 5;
            msg += `，永久气血上限+5！`;
        } else if (effect === "poison_resist") {
            poisonResistance += 5;
            msg += `，永久毒抗+5%！`;
        } else if (effect === "mining_shield_2") {
            miningShieldCharges += 2;
            msg += `，获得2次挖矿护盾！`;
        } else if (effect === "buff_mining_speed") {
            applyBuff('miningSpeed', BUFF_DEFS.miningSpeed.durationMs);
            msg += `，激活⛏️速掘效果（挖矿速度+10%，持续10分钟）！`;
        } else if (effect === "buff_mining_defense") {
            applyBuff('miningDefense', BUFF_DEFS.miningDefense.durationMs);
            msg += `，激活🛡️矿甲效果（矿难伤害-50%，持续10分钟）！`;
        } else if (effect === "buff_poison_immunity") {
            applyBuff('poisonImmunity', BUFF_DEFS.poisonImmunity.durationMs);
            if (poisonState.active) { clearPoison(); msg += `，激活🧪毒免效果，已清除现有毒素！`; }
            else msg += `，激活🧪毒免效果（完全免疫中毒，持续10分钟）！`;
        } else if (effect === "buff_refine_boost") {
            applyBuff('refineBoost', BUFF_DEFS.refineBoost.durationMs);
            msg += `，激活🔥炼技效果（炼丹成功率+15%，持续15分钟）！`;
        } else if (effect === "buff_double_product") {
            applyBuff('doubleProduct', BUFF_DEFS.doubleProduct.durationMs);
            msg += `，激活✨天眷效果（提纯/炼制双倍概率+30%，持续15分钟）！`;
        }
        
        if (info.maxHpEffect > 0) {
            maxHealth += info.maxHpEffect;
            health += info.maxHpEffect;
            msg += `，最大气血+${info.maxHpEffect}`;
        } else if (effectiveHeal > 0) {
            health = Math.min(maxHealth, health + effectiveHeal);
            msg += `，恢复+${effectiveHeal}`;
        } else if (info.hpEffect < 0) {
            if (info.toxic) {
                applyPoison(info.hpEffect, info.source || '');
                msg += `，触发剧毒状态！`;
            } else {
                health += info.hpEffect;
                msg += `，损失 ${Math.abs(info.hpEffect)} 气血`;
            }
        }
        
        achievementState.stats.totalConsumed++;
        if (!achievementState.stats.consumedSet.includes(itemName)) { achievementState.stats.consumedSet.push(itemName); achievementState.stats.consumedUnique = achievementState.stats.consumedSet.length; }
        checkAchievements();
        updateHealthUI(); saveGameData(); renderInventory(); showFeedback(msg, 'bagFeedback');
        if(health <= 0) triggerRebirth();
    };
    // ======================= 剧毒状态系统 =======================
    function calculatePoison(hpEffect, source) {
        const isLabPurified = source === "实验室提纯";
        const baseDmg = Math.abs(hpEffect);
        const duration = isLabPurified ? Math.ceil(baseDmg * 0.8) : Math.ceil(baseDmg * 0.5);
        const totalDamage = isLabPurified ? Math.ceil(baseDmg * 1.5) : baseDmg;
        return {
            duration: Math.max(5, Math.min(30, duration)),
            totalDamage: Math.max(5, Math.min(100, totalDamage))
        };
    }
    function applyPoison(hpEffect, source) {
        cleanExpiredBuffs();
        if (hasBuff('poisonImmunity')) return; // 毒免：完全不中毒
        // 毒抗减少中毒强度
        if (poisonResistance > 0) {
            const reduced = Math.abs(hpEffect) - Math.ceil(Math.abs(hpEffect) * (1 - poisonResistance / 100));
            achievementState.stats.totalPoisonResisted += reduced;
            checkAchievements();
            hpEffect = Math.ceil(hpEffect * (1 - poisonResistance / 100));
        }
        const poison = calculatePoison(hpEffect, source);
        if (poisonState.active) {
            const existingDmg = poisonState.remainingDamage;
            const existingDur = poisonState.remainingDuration;
            const newDmg = existingDmg + poison.totalDamage;
            const newDur = existingDur > 0
                ? (existingDmg * existingDur + poison.totalDamage * poison.duration) / newDmg
                : poison.duration;
            poisonState.remainingDamage = newDmg;
            poisonState.remainingDuration = newDur;
            poisonState.totalDamage += poison.totalDamage;
            poisonState.duration = newDur;
        } else {
            poisonState.active = true;
            poisonState.totalDamage = poison.totalDamage;
            poisonState.remainingDamage = poison.totalDamage;
            poisonState.duration = poison.duration;
            poisonState.remainingDuration = poison.duration;
            poisonState.accumulator = 0;
            startPoisonTick();
        }
        updateHealthUI();
    }
    function startPoisonTick() {
        if (poisonState.tickInterval) clearInterval(poisonState.tickInterval);
        poisonState.tickInterval = setInterval(() => {
            cleanExpiredBuffs();
            if (hasBuff('poisonImmunity') && poisonState.active) { clearPoison(); return; }
            if (!poisonState.active || health <= 0) {
                clearPoison();
                return;
            }
            const dmgPerTick = poisonState.remainingDamage / poisonState.remainingDuration;
            poisonState.accumulator += dmgPerTick;
            const dmgThisTick = Math.floor(poisonState.accumulator);
            if (dmgThisTick > 0) {
                health -= dmgThisTick;
                poisonState.remainingDamage -= dmgThisTick;
                poisonState.accumulator -= dmgThisTick;
                achievementState.stats.totalPoisonDealt += dmgThisTick;
                checkAchievements();
                if (health <= 0) { triggerRebirth(); return; }
            }
            poisonState.remainingDuration -= 1;
            updateHealthUI();
            if (poisonState.remainingDuration <= 0 || poisonState.remainingDamage <= 0) {
                clearPoison();
            }
        }, 1000);
    }
    function clearPoison() {
        if (poisonState.tickInterval) { clearInterval(poisonState.tickInterval); poisonState.tickInterval = null; }
        poisonState.active = false;
        poisonState.totalDamage = 0;
        poisonState.remainingDamage = 0;
        poisonState.duration = 0;
        poisonState.remainingDuration = 0;
        poisonState.accumulator = 0;
        updateHealthUI();
    }
    function getPoisonInfo() {
        if (!poisonState.active) return null;
        const remaining = Math.ceil(poisonState.remainingDuration);
        return `${remaining}秒 · ${Math.ceil(poisonState.remainingDamage)}伤害`;
    }
    // ======================= 炼丹炉核心（新布局，鼎居中放大） =======================
    function isRecipeUnlocked(recipe) {
        if (recipe.type === "smelt") return true;
        const idx = DING_RECIPES.findIndex(r => r.id === recipe.id);
        // ding1默认解锁，其余需通过考古收集9碎片找智慧老人兑换
        return dingStatus[idx]?.unlocked || (idx === 0);
    }
    function getRecipeStatus(recipe) {
        if (recipe.type === "smelt") return { unlocked: true, timesScored: 0 };
        const idx = DING_RECIPES.findIndex(r => r.id === recipe.id);
        return dingStatus[idx] || { unlocked: false, timesScored: 0 };
    }
    function renderRecipeList() {
        const container = document.getElementById('recipeList');
        if (!container) return;
        container.innerHTML = '';
        ALL_RECIPES.forEach(recipe => {
            const status = getRecipeStatus(recipe);
            const locked = !status.unlocked;
            const div = document.createElement('div');
            div.className = `recipe-item ${locked ? 'locked' : ''}`;
            div.innerHTML = `
                <div class="recipe-name">${recipe.name} ${locked ? '🔒' : '🔥'}</div>
                <div class="recipe-desc">${Object.keys(recipe.req).join('+')} → ${Object.keys(recipe.out).join(',')}</div>
                <div class="recipe-materials">火候: ${recipe.timeMin}-${recipe.timeMax}秒</div>
            `;
            div.addEventListener('click', () => {
                if (locked) {
                    showFeedback(`配方未解锁，请先炼制前置神丹。`, 'refineFeedback');
                    return;
                }
                selectedBookRecipe = recipe;
                updateRecipeDetailPanel();
            });
            container.appendChild(div);
        });
    }
    function updateRecipeDetailPanel() {
        const panel = document.getElementById('recipeDetailContent');
        if (!panel) return;
        renderDingDurabilityBar();
        if (!selectedBookRecipe) {
            panel.innerHTML = '点击左侧丹方查看详情';
            return;
        }
        const recipe = selectedBookRecipe;
        const reqStr = Object.entries(recipe.req).map(([mat, need]) => {
            const have = inventory[mat] || 0;
            const enough = have >= need ? '✅' : '❌';
            return `${mat} ${need} (持有: ${have}) ${enough}`;
        }).join('<br>');
        const outStr = Object.entries(recipe.out).map(([mat, amt]) => `${mat} ×${amt}`).join('、');
        let extra = '';
        let durabilityHtml = '';
        if (recipe.type === 'ding') {
            const status = getRecipeStatus(recipe);
            extra = `<br>🏅 积分: ${recipe.baseScore} (已记分 ${status.timesScored}/${MAX_SCORE_TIMES})<br>✨ 成丹效果: 最大气血+${recipe.maxHpIncrease}`;
            const durPercent = (cauldronDurability / CAULDRON_MAX_DURABILITY) * 100;
            const brok = cauldronDurability <= 0;
            durabilityHtml = `
                <div style="margin-top:0.6rem;">
                    <strong>🔧 丹鼎耐久：</strong>
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.3rem;">
                        <div style="flex:1;height:8px;background:var(--progress-bg);border-radius:4px;overflow:hidden;">
                            <div style="width:${durPercent}%;height:100%;background:${brok?'var(--danger)':durPercent>30?'var(--accent)':'var(--danger)'};border-radius:4px;transition:width .3s;"></div>
                        </div>
                        <span style="font-size:0.85rem;font-weight:bold;color:${brok?'var(--danger)':'var(--text)'};">${cauldronDurability}/${CAULDRON_MAX_DURABILITY}</span>
                    </div>
                    ${brok ? '<div style="color:var(--danger);font-size:0.8rem;margin-top:0.3rem;">💔 丹鼎已损坏，请使用六一泥修复！</div>' : ''}
                </div>
                ${!brok && cauldronDurability < CAULDRON_MAX_DURABILITY && (inventory["六一泥"] || 0) > 0 ? `
                    <button class="refine-btn" onclick="repairCauldron()" style="margin-top:0.5rem;font-size:0.8rem;padding:0.3rem 0.8rem;background:var(--heal);">
                        🧱 使用六一泥修复 (+5)
                    </button>
                ` : ''}
                ${(inventory["六一泥"] || 0) <= 0 && !brok && cauldronDurability < CAULDRON_MAX_DURABILITY ? `
                    <div style="font-size:0.7rem;color:var(--text-light);margin-top:0.3rem;">需六一泥修复（深海遗礁采掘）</div>
                ` : ''}
            `;
        }
        panel.innerHTML = `
            <div style="font-weight:bold; font-size:1rem;">${recipe.name}</div>
            <div style="margin-top:0.5rem;"><strong>所需材料：</strong><br>${reqStr}</div>
            <div><strong>产出：</strong> ${outStr}</div>
            <div><strong>火候区间：</strong> ${recipe.timeMin} ~ ${recipe.timeMax} 秒${extra}</div>
            ${durabilityHtml}
            <div style="margin-top:0.8rem; font-size:0.75rem; color:var(--text-dim);">请从右侧「从乾坤袋添加材料」手动投入材料至材料槽。</div>
        `;
    }
    function matchRecipeFromMaterials() {
        for (let recipe of ALL_RECIPES) {
            if (!isRecipeUnlocked(recipe)) continue;
            const reqKeys = Object.keys(recipe.req);
            const slotKeys = Object.keys(currentSlottedMaterials);
            if (reqKeys.length !== slotKeys.length) continue;
            let match = true;
            for (let [mat, need] of Object.entries(recipe.req)) {
                if (currentSlottedMaterials[mat] !== need) { match = false; break; }
            }
            if (match) return recipe;
        }
        return null;
    }
    function renderMaterialSlot() {
        const container = document.getElementById('slotItems');
        if (!container) return;
        if (Object.keys(currentSlottedMaterials).length === 0) {
            container.innerHTML = '<div style="color: var(--text-dim);">暂无材料，请从下方添加</div>';
        } else {
            let html = '';
            for (let [mat, qty] of Object.entries(currentSlottedMaterials)) {
                html += `<div class="slot-item">${mat} x${qty} <button class="remove-item" data-material="${mat}">✖</button></div>`;
            }
            container.innerHTML = html;
            document.querySelectorAll('.remove-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const material = btn.dataset.material;
                    if (material && currentSlottedMaterials[material]) {
                        inventory[material] = (inventory[material] || 0) + currentSlottedMaterials[material];
                        delete currentSlottedMaterials[material];
                        renderMaterialSlot();
                        updateInventoryForAdding();
                        renderInventory();
                        currentRecipe = matchRecipeFromMaterials();
                        renderRecipeDetailForMatch();
                        renderDingDurabilityBar();
                        document.getElementById('refineBtn').disabled = (currentRecipe === null);
                        if (currentRecipe === null) showFeedback("⚠️ 当前材料不匹配任何丹方！若点火将直接炸炉。", "refineFeedback");
                        else {
                            let extra = cauldronDurability <= 0 ? ' 💔（丹鼎已损坏）' : ` ⚒️(${cauldronDurability}/10)`;
                            showFeedback(`✅ 匹配到配方：${currentRecipe.name}${extra}，可点火炼制。`, "refineFeedback");
                        }
                        saveGameData();
                    }
                });
            });
        }
    }
    function updateInventoryForAdding() {
        const container = document.getElementById('inventoryForAdding');
        if (!container) return;
        const items = Object.entries(inventory).filter(([_,c]) => c>0);
        if (items.length === 0) { container.innerHTML = '<div>背包为空，请先去挖矿或采药</div>'; return; }
        let html = '';
        for (let [name, count] of items) {
            html += `<div class="inv-item-btn" data-material="${name}">${name} x${count}</div>`;
        }
        container.innerHTML = html;
        document.querySelectorAll('.inv-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const material = btn.dataset.material;
                if (inventory[material] && inventory[material] > 0) {
                    currentSlottedMaterials[material] = (currentSlottedMaterials[material] || 0) + 1;
                    inventory[material]--;
                    if (inventory[material] === 0) delete inventory[material];
                    renderMaterialSlot();
                    updateInventoryForAdding();
                    renderInventory();
                    currentRecipe = matchRecipeFromMaterials();
                    renderRecipeDetailForMatch();
                    renderDingDurabilityBar();
                    document.getElementById('refineBtn').disabled = (currentRecipe === null);
                        if (currentRecipe === null) showFeedback("⚠️ 当前材料不匹配任何丹方！", "refineFeedback");
                        else {
                            let extra = cauldronDurability <= 0 ? ' 💔（丹鼎已损坏）' : ` ⚒️(${cauldronDurability}/10)`;
                            showFeedback(`✅ 匹配到配方：${currentRecipe.name}${extra}`, "refineFeedback");
                        }
                    saveGameData();
                }
            });
        });
    }
    function clearMaterialSlot() {
        for (let [mat, qty] of Object.entries(currentSlottedMaterials)) {
            inventory[mat] = (inventory[mat] || 0) + qty;
        }
        currentSlottedMaterials = {};
        currentRecipe = null;
        renderMaterialSlot();
        updateInventoryForAdding();
        renderInventory();
        renderRecipeDetailForMatch();
        renderDingDurabilityBar();
        document.getElementById('refineBtn').disabled = true;
        showFeedback("材料已清空并返还背包。", "refineFeedback");
        saveGameData();
    }
    function renderDingDurabilityBar() {
        const bar = document.getElementById('dingDurabilityBar');
        const fill = document.getElementById('dingDurFill');
        const text = document.getElementById('dingDurText');
        const broken = document.getElementById('dingDurBroken');
        if (!bar || !fill || !text || !broken) return;
        bar.style.display = 'block';
        const pct = (cauldronDurability / CAULDRON_MAX_DURABILITY) * 100;
        fill.style.width = pct + '%';
        fill.style.background = cauldronDurability <= 0 ? 'var(--danger)' : pct > 30 ? 'var(--accent)' : 'var(--danger)';
        text.textContent = cauldronDurability + '/' + CAULDRON_MAX_DURABILITY;
        if (cauldronDurability <= 0) {
            broken.style.display = 'block';
        } else {
            broken.style.display = 'none';
        }
        const repair = document.getElementById('dingDurRepair');
        if (!repair) return;
        const hasClay = (inventory["六一泥"] || 0) > 0;
        if (cauldronDurability >= CAULDRON_MAX_DURABILITY) {
            repair.innerHTML = '';
        } else if (hasClay) {
            repair.innerHTML = `<button class="refine-btn" onclick="repairCauldron()" style="font-size:0.8rem;padding:0.3rem 0.8rem;background:var(--heal);">🧱 使用六一泥修复 (+5)</button>`;
        } else {
            repair.innerHTML = `<span style="font-size:0.7rem;color:var(--text-light);">需六一泥修复（深海遗礁采掘）</span>`;
        }
    }
    function renderRecipeDetailForMatch() {
        const container = document.getElementById('selectedRecipeInfo');
        if (!container) return;
        if (currentRecipe) {
            const reqStr = Object.entries(currentRecipe.req).map(([mat, need]) => `${mat} ${need}`).join(' · ');
            const outStr = Object.entries(currentRecipe.out).map(([mat, amt]) => `${mat}×${amt}`).join(', ');
            const status = getRecipeStatus(currentRecipe);
            let extra = '';
            if (currentRecipe.type === "ding") {
                extra = `<br>🏅 积分: ${currentRecipe.baseScore} (已记分 ${status.timesScored}/${MAX_SCORE_TIMES})<br>✨ 成丹效果: 最大气血+${currentRecipe.maxHpIncrease}`;
            } else {
                extra = `<br>🔥 提纯产物: ${outStr}`;
            }
            container.innerHTML = `<h4>📜 当前匹配：${currentRecipe.name}</h4><div class="material-requirements">${reqStr}</div><div style="margin-top: 0.5rem;">⏱️ 火候区间: ${currentRecipe.timeMin}秒 ~ ${currentRecipe.timeMax}秒${extra}</div>`;
        } else {
            container.innerHTML = `<h4>📜 未匹配丹方</h4><div class="material-requirements">当前材料组合不匹配任何配方，点火将直接炸炉！</div>`;
        }
    }
    function startRefine() {
        if (isRefining) return;
        if (!currentRecipe && Object.keys(currentSlottedMaterials).length > 0) {
            if (confirm("材料配比错误，点火将直接炸炉！确定要尝试吗？")) {
                currentSlottedMaterials = {};
                renderMaterialSlot();
                updateInventoryForAdding();
                renderInventory();
                showFeedback("💥 配比错误！炸炉了！全部材料化为灰烬。", "refineFeedback");
                saveGameData();
            }
            return;
        }
        if (!currentRecipe) { showFeedback("请先放入材料并匹配丹方。", "refineFeedback"); return; }
        if (cauldronDurability <= 0) {
            showFeedback(`💔 丹鼎已损坏！请使用六一泥修复后再点火。`, "refineFeedback");
            return;
        }
        const status = getRecipeStatus(currentRecipe);
        if (!status.unlocked) return;
        for (let [mat, need] of Object.entries(currentRecipe.req)) {
            if (currentSlottedMaterials[mat] !== need) { showFeedback("材料数量不匹配配方，请重新检查。", "refineFeedback"); return; }
        }
        isRefining = true;
        refineStartTime = Date.now();
        currentRefineTime = 0;
        document.getElementById('refineTimer').style.display = 'block';
        document.getElementById('refineBtn').style.display = 'none';
        document.getElementById('stopRefineBtn').style.display = 'inline-block';
        document.getElementById('cancelRefineBtn').style.display = 'inline-block';
        refineTimerInterval = setInterval(updateRefineTimer, 100);
        showFeedback(`🔥 炉火已起！请在 ${currentRecipe.timeMin}-${currentRecipe.timeMax}秒 之间停火。`, "refineFeedback");
    }
    function updateRefineTimer() {
        if (!isRefining) return;
        const now = Date.now();
        currentRefineTime = (now - refineStartTime) / 1000;
        document.getElementById('timerText').textContent = `当前火候: ${currentRefineTime.toFixed(1)}秒`;
        const progressPercent = Math.min(100, (currentRefineTime / currentRecipe.timeMax) * 100);
        document.getElementById('timerProgress').style.width = `${progressPercent}%`;
        const timerHint = document.getElementById('timerHint');
        if (currentRefineTime < currentRecipe.timeMin) { timerHint.textContent = `火候未到... (需 ${currentRecipe.timeMin}-${currentRecipe.timeMax}秒)`; timerHint.className = "timer-hint timer-warning"; }
        else if (currentRefineTime >= currentRecipe.timeMin && currentRefineTime <= currentRecipe.timeMax) { timerHint.textContent = `✅ 药香四溢！正是停火时机！`; timerHint.className = "timer-hint timer-perfect"; }
        else { timerHint.textContent = `⚠️ 火候已过，即将焦糊！`; timerHint.className = "timer-hint timer-danger"; }
        if (currentRefineTime > currentRecipe.timeMax + 3) completeRefine(false);
    }
    function stopRefine() { if (isRefining) completeRefine(true); }
    function cancelRefine() {
        if (!isRefining) return;
        if (confirm("中断将损失一半材料，确定吗？")) {
            for (let [mat, qty] of Object.entries(currentSlottedMaterials)) {
                const loss = Math.ceil(qty / 2);
                currentSlottedMaterials[mat] = qty - loss;
                if (currentSlottedMaterials[mat] <= 0) delete currentSlottedMaterials[mat];
            }
            showFeedback(`💥 中断炼制，损失一半材料。`, "refineFeedback");
            completeRefine(false);
        }
    }
    function completeRefine(success) {
        if (!isRefining) return;
        clearInterval(refineTimerInterval);
        const recipe = currentRecipe;
        const status = getRecipeStatus(recipe);
        let isPerfect = false, isExploded = false;
        if (success && recipe && (currentRefineTime >= recipe.timeMin && currentRefineTime <= recipe.timeMax)) {
            cleanExpiredBuffs();
            const explosionChance = hasBuff('refineBoost') ? 0.05 : 0.1;
            const rand = Math.random();
            if (rand < explosionChance) isExploded = true;
            else isPerfect = true;
        }
        if (isPerfect) {
            achievementState.stats.totalRefines++;
            checkAchievements();
            cleanExpiredBuffs();
            for (let [mat, need] of Object.entries(recipe.req)) delete currentSlottedMaterials[mat];
            for (let [mat, amt] of Object.entries(recipe.out)) inventory[mat] = (inventory[mat] || 0) + amt;
            const doubled = hasBuff('doubleProduct') && Math.random() < 0.3;
            if (doubled) {
                for (let [mat, amt] of Object.entries(recipe.out)) inventory[mat] = (inventory[mat] || 0) + amt;
            }
            cauldronDurability = Math.max(0, cauldronDurability - 1);
            if (recipe.type === "ding") {
                const idx = DING_RECIPES.findIndex(r => r.id === recipe.id);
                if (status.timesScored < MAX_SCORE_TIMES) { totalScore += recipe.baseScore; dingStatus[idx].timesScored++; }
                showFeedback(`🎉 成功炼制【${recipe.name}】！获得 ${recipe.baseScore} 积分${doubled?' ✨天眷双倍产出！':''}，神丹已存入乾坤袋。`, "refineFeedback");
            } else {
                showFeedback(`✨ 提纯成功！获得 ${Object.keys(recipe.out).join(',')}。`, "refineFeedback");
            }
        } else if (isExploded) {
            currentSlottedMaterials = {};
            cauldronDurability = Math.max(0, cauldronDurability - 3);
            showFeedback(`💥 炸炉了！材料全部化为灰烬，丹鼎耐久额外下降！`, "refineFeedback");
        } else {
            currentSlottedMaterials = {};
            cauldronDurability = Math.max(0, cauldronDurability - 1);
            showFeedback(`❌ 炼制失败！材料尽毁。`, "refineFeedback");
        }
        resetRefineUI();
        saveGameData();
        renderAllUI();
        renderMaterialSlot();
        updateInventoryForAdding();
        currentRecipe = matchRecipeFromMaterials();
        renderRecipeDetailForMatch();
        renderDingDurabilityBar();
        document.getElementById('refineBtn').disabled = (currentRecipe === null);
    }
    function resetRefineUI() {
        isRefining = false;
        if (refineTimerInterval) clearInterval(refineTimerInterval);
        refineTimerInterval = null;
        document.getElementById('refineTimer').style.display = 'none';
        document.getElementById('refineBtn').style.display = 'inline-block';
        document.getElementById('stopRefineBtn').style.display = 'none';
        document.getElementById('cancelRefineBtn').style.display = 'none';
    }
    function repairCauldron() {
        if (cauldronDurability >= CAULDRON_MAX_DURABILITY) { showFeedback(`丹鼎耐久已满，无需修复。`, "refineFeedback"); return; }
        if ((inventory["六一泥"] || 0) <= 0) { showFeedback("❌ 没有六一泥！请前往深海遗礁采掘。", "refineFeedback"); return; }
        inventory["六一泥"]--;
        if (inventory["六一泥"] === 0) delete inventory["六一泥"];
        cauldronDurability = Math.min(CAULDRON_MAX_DURABILITY, cauldronDurability + 5);
        achievementState.stats.totalRepairs++;
        checkAchievements();
        showFeedback(`🔧 修缮成功！丹鼎耐久恢复至 ${cauldronDurability}/${CAULDRON_MAX_DURABILITY}`, "refineFeedback");
        saveGameData();
        renderAllUI();
    }
    // ======================= 其他UI =======================
    function updateHealthUI() {
        const fill = document.getElementById('healthFill'); if(fill) fill.style.width = `${(health/maxHealth)*100}%`;
        const hpSpan = document.getElementById('hpText'); if(hpSpan) hpSpan.innerText = Math.floor(health);
        const maxSpan = document.getElementById('maxHpText'); if(maxSpan) maxSpan.textContent = `/${maxHealth}`;
    }
    function renderBuffBar() {
        const bar = document.getElementById('buffBar');
        if (!bar) return;
        cleanExpiredBuffs();
        let poisonText = '☠️ 中毒 0';
        if (poisonState.active) {
            const info = getPoisonInfo();
            if (info) poisonText = `☠️ ${info}`;
        }
        let shieldText = `🛡️ 护盾 ${miningShieldCharges}次`;
        let tempText = `❤️‍🔥 气血+${tempMaxHealthBonus}`;
        if (tempMaxHealthBonus > 0 && tempMaxHealthStartTime > 0) {
            const elapsed = Date.now() - tempMaxHealthStartTime;
            const remaining = Math.max(0, Math.ceil((300000 - elapsed) / 1000));
            if (remaining > 0) tempText += ` ${remaining > 60 ? Math.floor(remaining/60)+'分' : remaining+'秒'}`;
        }
        let reviveText = reviveFlag ? '💫 复活 ✓' : '💫 复活 未激活';
        let resistText = `🧪 毒抗 ${poisonResistance}%`;
        let buffsHtml = '';
        Object.keys(BUFF_DEFS).forEach(id => {
            const active = hasBuff(id);
            const b = BUFF_DEFS[id];
            const remaining = active ? Math.max(0, Math.ceil((temporaryBuffs[id].endTime - Date.now()) / 1000)) : 0;
            const timeStr = remaining > 0 ? (remaining > 60 ? `${Math.floor(remaining/60)}分` : `${remaining}秒`) : '';
            buffsHtml += `<span class="buff-item temp ${!active?'inactive':''}">${b.icon ? b.icon : b.name.slice(0,2)} ${b.name}${active?' '+timeStr:''}</span>`;
        });
        bar.innerHTML = `
            <span class="buff-item poison ${!poisonState.active?'inactive':''}">${poisonText}</span>
            <span class="buff-item shield ${!miningShieldCharges?'inactive':''}">${shieldText}</span>
            <span class="buff-item temphp ${!tempMaxHealthBonus?'inactive':''}">${tempText}</span>
            <span class="buff-item revive ${!reviveFlag?'inactive':''}">${reviveText}</span>
            <span class="buff-item resist ${!poisonResistance?'inactive':''}">${resistText}</span>
            ${buffsHtml}
        `;
    }
    function renderMatchedRecipePreview() {
        const el = document.getElementById('recipePreview');
        if (!el) return;
        if (!currentRecipe) { el.style.display = 'none'; return; }
        const reqStr = Object.entries(currentRecipe.req).map(([mat, need]) => {
            const have = inventory[mat] || 0;
            return `${have >= need ? '✅' : '❌'} ${mat}×${need}`;
        }).join(' ');
        let extra = '';
        if (currentRecipe.type === 'ding') {
            const status = getRecipeStatus(currentRecipe);
            extra = `<span class="preview-score">🏅${currentRecipe.baseScore}分 · ❤️+${currentRecipe.maxHpIncrease}</span>`;
        }
        el.style.display = 'block';
        el.innerHTML = `
            <div class="preview-row"><span class="preview-name">📜 ${currentRecipe.name}</span>${extra}</div>
            <div style="font-size:0.75rem;margin-top:0.3rem;">${reqStr}</div>
        `;
    }
    function updateScoreUI() {
        const span = document.getElementById('scoreDisplay'); if(span) span.innerText = `🏆 九鼎积分: ${totalScore}`;
        renderRanking();
    }
    function renderAllUI() {
        renderInventory();
        renderMaterialSlot();
        updateInventoryForAdding();
        renderRecipeList();
        renderRecipeDetailForMatch();
        updateRecipeDetailPanel();
        renderDingDurabilityBar();
        renderMatchedRecipePreview();
        renderBuffBar();
        updateScoreUI();
        renderRanking();
        renderFragmentInventory();
        renderFragmentTrade();
        renderAchievements();
        renderCatalog();
    }
    // ======================= 智慧老人挑战逻辑 =======================
    function groupQuestionsByDifficulty(questions) { const groups = {1:[],2:[],3:[],4:[],5:[]}; for(let q of questions){ const d=q.difficulty; if(d>=1&&d<=5) groups[d].push(q); } return groups; }
    function getRandomQuestionFromGroup(group){ if(!group.length) return null; const idx=Math.floor(Math.random()*group.length); return {...group[idx]}; }
    function generateOptionsForQuestion(q){
        const distPool=q.distractors||[];
        let candidates=distPool.filter(d=>d!==q.correct);
        const shuffled=[...candidates]; for(let i=shuffled.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
        const selectedDistractors=shuffled.slice(0,3);
        const opts=[q.correct,...selectedDistractors];
        for(let i=opts.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [opts[i],opts[j]]=[opts[j],opts[i]]; }
        return opts;
    }
    function prepareChallenge(){
        if(!loadedQuizQuestions.length) return false;
        const groups=groupQuestionsByDifficulty(loadedQuizQuestions);
        currentChallengeQuestions=[];
        for(let d=1;d<=5;d++){
            const group=groups[d];
            if(!group.length){
                const fallback={ difficulty:d, title:"化学元素谜题", text:"请补充该难度的题目。", correct:"未知", distractors:["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S"] };
                currentChallengeQuestions.push({ title:fallback.title, text:fallback.text, correct:fallback.correct, options:generateOptionsForQuestion(fallback) });
            }else{
                const q=getRandomQuestionFromGroup(group);
                if(q) currentChallengeQuestions.push({ title:q.title, text:q.text, correct:q.correct, options:generateOptionsForQuestion(q) });
            }
        }
        return true;
    }
    async function loadQuizQuestions(){
        try{
            const response=await fetch('quiz_questions.json');
            if(!response.ok) throw new Error(`HTTP ${response.status}`);
            const data=await response.json();
            if(Array.isArray(data)&&data.length>0) loadedQuizQuestions=data;
            else throw new Error('题库数据无效');
        }catch(err){
            console.warn('加载外部题库失败，使用内嵌默认题库',err);
            loadedQuizQuestions=[
                { difficulty:1, title:"消毒水的秘密", text:"我是消毒水中常见的成分，稀释后可用于伤口消毒，但纯品剧毒，误服可致命。我的水溶液呈棕色，且易升华。我是？", correct:"碘", distractors:["氯气","汞","溴","氟气","过氧化氢","高锰酸钾","乙醇","甲醛","苯酚","臭氧","二氧化氯","次氯酸钠","氢氧化钠","氨水","醋酸","硫酸","硝酸","盐酸","碳酸"] },
                { difficulty:1, title:"地壳中的王者", text:"我是地壳中含量最多的金属元素，也是人体必需的微量元素之一。我的单质呈银白色，常用于制造飞机和日用品。我是？", correct:"铝", distractors:["铁","铜","镁","钙","钠","钾","锌","钛","铬","锰","镍","钴","锡","铅","铍","锶","钡","镓","铟"] },
                { difficulty:1, title:"蓝紫色的火焰", text:"我是一种非金属单质，在空气中燃烧发出明亮的蓝紫色火焰，生成有刺激性气味的气体。我是？", correct:"硫", distractors:["碳","磷","氢气","氮气","氧气","氯气","硅","硒","碲","硼","钠","镁","铝","钾","钙","铁","铜","锌","银"] },
                { difficulty:2, title:"烧碱的真面目", text:"我是常见的干燥剂，与水反应放出大量热，能使酚酞变红。我的水溶液俗称“烧碱”。我是？", correct:"氢氧化钠", distractors:["氧化钙","氢氧化钙","氯化钠","碳酸钠","碳酸氢钠","硫酸钠","硝酸钠","氢氧化钾","氢氧化锂","氢氧化钡","浓硫酸","无水氯化钙","硅胶","分子筛","氧化铝","五氧化二磷","碱石灰","氢氧化镁","氢氧化铝"] },
                { difficulty:2, title:"胃里的强酸", text:"我是胃酸的主要成分，能帮助消化，但浓度过高会腐蚀胃黏膜。我的化学式是HCl。我是？", correct:"盐酸", distractors:["硫酸","硝酸","醋酸","磷酸","氢氟酸","氢溴酸","氢碘酸","高氯酸","氯酸","亚硫酸","草酸","柠檬酸","乳酸","苹果酸","酒石酸","碳酸","硅酸","硼酸","甲酸"] },
                { difficulty:2, title:"轻于水的金属", text:"我是最轻的金属，密度比水还小，与水剧烈反应生成氢气。我的化合物常用于治疗躁郁症。我是？", correct:"锂", distractors:["钠","钾","镁","钙","铍","铝","铷","铯","钡","锶","钛","锌","铁","铜","银","金","铂","铅","锡"] },
                { difficulty:3, title:"霓虹灯的光源", text:"我是常见的惰性气体，在霓虹灯中发出橙红色光，常用于制造“氖灯”。我的原子序数是10。我是？", correct:"氖", distractors:["氦","氩","氪","氙","氡","氮","氧","氟","氯","氢","碳","硫","磷","硅","硼","铝","钠","镁","钙"] },
                { difficulty:3, title:"甲状腺的朋友", text:"我是人体必需的微量元素，缺乏会导致甲状腺肿大。加碘食盐中添加的就是我的钾盐。我是？", correct:"碘", distractors:["铁","锌","硒","氟","铜","锰","钴","钼","铬","氯","钠","钾","钙","镁","磷","硫","硅","硼","铝"] },
                { difficulty:3, title:"血红蛋白的核心", text:"我是地壳中含量第二多的金属元素，也是血红蛋白的核心。我的单质是银白色，容易被磁铁吸引。我是？", correct:"铁", distractors:["铝","铜","镁","钙","钠","钾","锌","钛","铬","锰","镍","钴","锡","铅","金","银","铂","镉","汞"] },
                { difficulty:4, title:"芯片的基石", text:"我是常见的半导体材料，广泛应用于芯片制造。我的单质是银灰色脆性固体，地壳中含量仅次于氧。我是？", correct:"硅", distractors:["锗","砷","镓","铟","磷","硫","碳","硼","铝","铁","铜","锌","银","金","铂","钛","铬","锰","钴"] },
                { difficulty:4, title:"最硬的天然物质", text:"我是自然界最硬的物质，由碳原子组成，常用于切割和打磨。我是？", correct:"金刚石", distractors:["石墨","石英","刚玉","碳化硅","立方氮化硼","莫桑石","红宝石","蓝宝石","水晶","玛瑙","翡翠","和田玉","岫玉","独山玉","绿松石","青金石","孔雀石","萤石","方解石"] },
                { difficulty:4, title:"温室效应的推手", text:"我是导致温室效应的主要气体之一，由碳和氧组成。我是？", correct:"二氧化碳", distractors:["甲烷","一氧化碳","水蒸气","氟利昂","臭氧","氮氧化物","二氧化硫","硫化氢","氨气","氯气","氢气","氧气","氮气","氩气","氦气","氖气","氪气","氙气","氡气"] },
                { difficulty:5, title:"银光闪闪的液态金属", text:"我是常温下唯一的液态金属，剧毒，曾用于体温计。我是？", correct:"汞", distractors:["镓","铯","钫","钠","钾","铷","锂","钙","镁","铝","锌","铁","铜","银","金","铂","铅","锡","铬"] },
                { difficulty:5, title:"最强的氧化剂", text:"我是元素周期表中电负性最强的元素，能与几乎所有物质反应，包括稀有气体。我是？", correct:"氟", distractors:["氯","溴","碘","氧","氮","碳","硫","磷","氢","氦","氖","氩","氪","氙","氡","钠","镁","铝","硅"] },
                { difficulty:5, title:"放射性元素的发现者", text:"我是居里夫人发现的放射性元素，用于治疗癌症，化学符号是Ra。我是？", correct:"镭", distractors:["铀","钚","钋","氡","锕","钍","镤","锎","锿","镄","钔","锘","铹","𬬻","𬭊","𬭳","𬭛","𬭶","鿏"] }
            ];
        }
        challengeReady=true;
        document.getElementById('challengeBtn').disabled=(challengeCooldown>0);
        if(challengeCooldown===0) document.getElementById('challengeBtn').innerText='🧪 开始挑战';
        else document.getElementById('challengeBtn').innerText='🧪 开始挑战 (冷却中)';
    }
    function loadChallengeCooldown(){
        const key=`challenge_cooldown_${currentUser}`;
        const lastTimestamp=localStorage.getItem(key);
        if(lastTimestamp){
            const elapsed=(Date.now()-parseInt(lastTimestamp))/1000;
            if(elapsed<600) challengeCooldown=600-elapsed;
            else{ challengeCooldown=0; localStorage.removeItem(key); }
        }else challengeCooldown=0;
        updateCooldownDisplay();
        if(challengeCooldown>0){ startCooldownTimer(); document.getElementById('challengeBtn').disabled=true; }
        else document.getElementById('challengeBtn').disabled=!challengeReady;
    }
    function startCooldownTimer(){
        if(challengeInterval) clearInterval(challengeInterval);
        challengeInterval=setInterval(()=>{
            if(challengeCooldown>0){
                challengeCooldown--;
                updateCooldownDisplay();
                if(challengeCooldown<=0){ clearInterval(challengeInterval); challengeInterval=null; document.getElementById('challengeBtn').disabled=!challengeReady; document.getElementById('cooldownText').innerHTML=''; localStorage.removeItem(`challenge_cooldown_${currentUser}`); }
            }
        },1000);
    }
    function updateCooldownDisplay(){
        const cooldownDiv=document.getElementById('cooldownText');
        if(challengeCooldown>0){ const minutes=Math.floor(challengeCooldown/60); const seconds=Math.floor(challengeCooldown%60); cooldownDiv.innerHTML=`⏳ 下次挑战: ${minutes}分${seconds}秒`; }
        else cooldownDiv.innerHTML='';
    }
    function startChallenge(){
        if(!challengeReady){ alert("题目还在加载中，请稍后再试。"); return; }
        if(challengeCooldown>0){ alert("智慧老人正在休息，请稍后再来挑战。"); return; }
        if(isQuizActive) return;
        if(!prepareChallenge()){ alert("题库数据异常，无法开始挑战。"); return; }
        isQuizActive=true; currentQuizIndex=0; quizScore=0;
        showNextQuestion();
    }
    function showNextQuestion(){
        if(currentQuizIndex>=currentChallengeQuestions.length){ endChallenge(); return; }
        const q=currentChallengeQuestions[currentQuizIndex];
        document.getElementById('quizQuestion').innerHTML=`<strong>【难度 ${currentQuizIndex+1}】${q.title}</strong><br>${q.text}`;
        const optionsDiv=document.getElementById('quizOptions'); optionsDiv.innerHTML='';
        q.options.forEach(opt=>{ const btn=document.createElement('div'); btn.className='quiz-option'; btn.innerText=opt; btn.addEventListener('click',()=>checkAnswer(opt)); optionsDiv.appendChild(btn); });
        document.getElementById('quizProgress').innerText=`第 ${currentQuizIndex+1} / ${currentChallengeQuestions.length} 题`;
        document.getElementById('quizArea').style.display='block';
    }
    function checkAnswer(selected){
        const q=currentChallengeQuestions[currentQuizIndex];
        if(selected===q.correct){ quizScore++; showFeedback(`✅ 回答正确！`, 'pharmacyFeedback'); }
        else{ showFeedback(`❌ 回答错误！正确答案是 ${q.correct}。`, 'pharmacyFeedback'); }
        currentQuizIndex++;
        setTimeout(()=>{ if(currentQuizIndex<currentChallengeQuestions.length) showNextQuestion(); else endChallenge(); },1000);
    }
    function endChallenge(){
        isQuizActive=false;
        document.getElementById('quizArea').style.display='none';
        const rewardCount=quizScore;
        if(rewardCount>0) showRewardModal(rewardCount);
        else showFeedback(`🧙‍♂️ 智慧老人摇摇头：“一道题都没答对，回去多读书吧。”`, 'pharmacyFeedback');
        challengeCooldown=600;
        const key=`challenge_cooldown_${currentUser}`;
        localStorage.setItem(key,Date.now().toString());
        updateCooldownDisplay();
        startCooldownTimer();
        document.getElementById('challengeBtn').disabled=true;
    }
    function showRewardModal(rewardCount){
        const modal=document.getElementById('rewardModal');
        document.getElementById('correctCount').innerText=quizScore;
        document.getElementById('rewardCount').innerText=rewardCount;
        let remaining=rewardCount;
        document.getElementById('rewardRemain').innerText=`还可选择 ${remaining} 件`;
        const container=document.getElementById('rewardItemsList'); container.innerHTML='';
        REWARD_ITEMS.forEach(item=>{
            const div=document.createElement('div'); div.className='reward-item'; div.innerText=item;
            div.addEventListener('click',()=>{
                if(remaining<=0){ alert("你已经选完了所有宝物！"); return; }
                inventory[item]=(inventory[item]||0)+1;
                remaining--;
                document.getElementById('rewardRemain').innerText=`还可选择 ${remaining} 件`;
                saveGameData(); renderInventory();
                showFeedback(`✨ 获得了 ${item} x1`, 'pharmacyFeedback');
                if(remaining<=0){ modal.classList.remove('active'); alert("感谢你的智慧！宝物已收入乾坤袋。"); }
            });
            container.appendChild(div);
        });
        modal.classList.add('active');
    }
    function closeRewardModal(){ document.getElementById('rewardModal').classList.remove('active'); }
    // ======================= 初始化 Supabase 与登录 =======================
    function initSupabase(){
        try{
            supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
            supabase.from('feedbacks').select('count',{count:'exact',head:true}).then(()=>{ cloudAvailable=true; console.log('云服务可用'); if(isLoggedIn) initCloudSync(); }).catch(err=>{ console.warn('云服务不可用，降级本地',err); cloudAvailable=false; });
        }catch(e){ console.warn('Supabase 初始化失败',e); cloudAvailable=false; }
    }
    function loadUserFromMainPage(){
        const mainUser=localStorage.getItem('iodine_current_user');
        if(mainUser && mainUser!=='null'){
            currentUser=mainUser; isLoggedIn=true;
            document.getElementById('userInfoArea').innerHTML=`<span>🧪 ${escapeHtml(currentUser)}</span><div class="health-bar"><div class="health-fill" id="healthFill"></div></div><span id="hpText">100</span><span id="maxHpText">/100</span>`;
        }else{
            const guestId='访客_'+Math.floor(Math.random()*10000);
            currentUser=guestId; isLoggedIn=false;
            document.getElementById('userInfoArea').innerHTML=`<span>👤 ${escapeHtml(currentUser)} (访客)</span><div class="health-bar"><div class="health-fill" id="healthFill"></div></div><span id="hpText">100</span><span id="maxHpText">/100</span>`;
        }
    }
    function initTheme(){
        const isDark=localStorage.getItem('dandao_theme')==='dark';
        if(isDark) document.body.classList.add('dark');
        const btn=document.getElementById('darkModeToggle');
        btn.addEventListener('click',()=>{ document.body.classList.toggle('dark'); localStorage.setItem('dandao_theme',document.body.classList.contains('dark')?'dark':'light'); btn.innerText=document.body.classList.contains('dark')?'☀️ 丹房光明':'🌙 丹房幽暗'; });
        btn.innerText=isDark?'☀️ 丹房光明':'🌙 丹房幽暗';
    }
    function initTabs(){
        document.querySelectorAll('.tab-btn').forEach(btn=>{
            btn.addEventListener('click',()=>{
                const target=btn.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
                document.getElementById(`tab-${target}`).classList.add('active');
            });
        });
    }
    function initRankFloat() {
        const toggleBtn = document.getElementById('rankToggleBtn');
        const panel = document.getElementById('rankFloatPanel');
        if (!toggleBtn || !panel) return;
        toggleBtn.addEventListener('click', () => {
            const isOpen = panel.classList.toggle('active');
            toggleBtn.textContent = isOpen ? '❌ 关闭排行' : '🏆 九鼎排行';
        });
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!panel.classList.contains('active')) return;
            if (panel.contains(target) || toggleBtn.contains(target)) return;
            panel.classList.remove('active');
            toggleBtn.textContent = '🏆 九鼎排行';
        });
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
            // 丹道化学页面使用全局音乐
            const playlist = musicData.global;
            
            const currentIndex = playlist.findIndex(music => music.file === currentMusic);
            const nextIndex = (currentIndex + 1) % playlist.length;
            const nextMusic = playlist[nextIndex];
            
            playMusic(nextMusic.file);
        }

        // 获取当前播放列表
        function getCurrentPlaylist() {
            // 丹道化学页面使用全局音乐
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
        
        // 暴露实验室和炼丹全局方法
        window.startPurification = startPurification;
        window.stopPurification = stopPurification;
        window.performCriticalAction = performCriticalAction;
        window.repairCauldron = repairCauldron;
    }
    
    // ======================= 考古发掘功能 =======================
    function getFragmentName(idx) { return `丹方碎片-${DING_RECIPES[idx].name}`; }
    function getFragmentCount(idx) { return inventory[getFragmentName(idx)] || 0; }
    function getArchWeightedRandom(site) {
        const total = site.fragments.reduce((s, f) => s + f.weight, 0);
        let r = Math.random() * total;
        for (const f of site.fragments) { r -= f.weight; if (r <= 0) return f.name; }
        return site.fragments[0].name;
    }
    function renderArchaeologySites() {
        const container = document.getElementById('archSites');
        if (!container) return;
        container.innerHTML = ARCHAEOLOGY_SITES.map(s =>
            `<div class="arch-site-card ${selectedArchSite === s.name ? 'selected' : ''}" data-site="${s.name}">
                <div class="arch-site-name">🏛️ ${s.name}</div>
                <div class="arch-site-desc">${s.desc}</div>
            </div>`
        ).join('');
        container.querySelectorAll('.arch-site-card').forEach(el => {
            el.addEventListener('click', () => selectArchSite(el.dataset.site));
        });
    }
    function selectArchSite(name) {
        if (isExcavating) return;
        selectedArchSite = name;
        renderArchaeologySites();
        document.getElementById('archBtn').disabled = false;
        document.getElementById('archBtn').innerText = `🏛️ 发掘【${name}】`;
        document.getElementById('archFeedback').innerText = '';
    }
    function renderFragmentInventory() {
        const container = document.getElementById('fragmentInventory');
        if (!container) return;
        let html = '';
        let hasAny = false;
        for (let i = 0; i < DING_RECIPES.length; i++) {
            const cnt = getFragmentCount(i);
            if (cnt > 0) { hasAny = true; html += `<div class="fragment-card"><div class="frag-name">${getFragmentName(i)}</div><div class="frag-qty">×${cnt}</div></div>`; }
        }
        container.innerHTML = hasAny ? html : '<div style="grid-column:1/-1;text-align:center;color:var(--text-light);font-size:.85rem;">暂无碎片，快去考古发掘吧</div>';
    }
    function startExcavation() {
        if (!selectedArchSite || isExcavating) return;
        isExcavating = true;
        document.getElementById('archBtn').disabled = true;
        document.getElementById('archBtn').innerText = '⏳ 发掘中...';
        const container = document.getElementById('archProgressContainer');
        container.style.display = 'block';
        const fill = document.getElementById('archProgressFill');
        const text = document.getElementById('archProgressText');
        const hint = document.getElementById('archProgressHint');
        fill.style.width = '0%';
        text.innerText = '发掘中: 0%';
        hint.innerText = '正在发掘...';
        const start = Date.now();
        excavateProgressInterval = setInterval(() => {
            const elapsed = Date.now() - start;
            const pct = Math.min(100, (elapsed / EXCAVATE_DURATION) * 100);
            fill.style.width = pct + '%';
            text.innerText = `发掘中: ${Math.floor(pct)}%`;
        }, 50);
        excavateTimer = setTimeout(() => completeExcavation(), EXCAVATE_DURATION);
    }
    function completeExcavation() {
        if (excavateTimer) { clearTimeout(excavateTimer); excavateTimer = null; }
        if (excavateProgressInterval) { clearInterval(excavateProgressInterval); excavateProgressInterval = null; }
        const site = ARCHAEOLOGY_SITES.find(s => s.name === selectedArchSite);
        if (!site) { cancelExcavation(); return; }
        const fragmentName = getArchWeightedRandom(site);
        inventory[fragmentName] = (inventory[fragmentName] || 0) + 1;
        achievementState.stats.totalExcavations++;
        checkAchievements();
        document.getElementById('archProgressContainer').style.display = 'none';
        document.getElementById('archBtn').disabled = false;
        document.getElementById('archBtn').innerText = selectedArchSite ? `🏛️ 发掘【${selectedArchSite}】` : '🏛️ 选择遗址开始发掘';
        isExcavating = false;
        const feedback = document.getElementById('archFeedback');
        feedback.innerHTML = `🎉 发掘获得 <strong>${fragmentName}</strong>！`;
        feedback.style.color = 'var(--heal)';
        renderFragmentInventory();
        saveGameData();
    }
    function cancelExcavation() {
        if (excavateTimer) { clearTimeout(excavateTimer); excavateTimer = null; }
        if (excavateProgressInterval) { clearInterval(excavateProgressInterval); excavateProgressInterval = null; }
        document.getElementById('archProgressContainer').style.display = 'none';
        document.getElementById('archBtn').disabled = false;
        document.getElementById('archBtn').innerText = selectedArchSite ? `🏛️ 发掘【${selectedArchSite}】` : '🏛️ 选择遗址开始发掘';
        isExcavating = false;
    }
    // 智慧老人碎片兑换
    const FRAGMENT_PRICES = DING_RECIPES.map((r, i) => ({
        gold: i < 3 ? 1 : i < 6 ? 2 : 3,
        silver: i < 3 ? 10 : i < 6 ? 20 : 30
    }));
    function renderFragmentTrade() {
        const container = document.getElementById('fragmentTradeList');
        if (!container) return;
        const unlockedCount = dingStatus.filter(s => s.unlocked).length;
        let html = '';
        for (let i = 0; i < DING_RECIPES.length; i++) {
            const cnt = getFragmentCount(i);
            const unlocked = dingStatus[i].unlocked;
            const hasGold = (inventory["金"] || 0) >= FRAGMENT_PRICES[i].gold;
            const hasSilver = (inventory["银"] || 0) >= FRAGMENT_PRICES[i].silver;
            const bars = '⬜'.repeat(Math.min(cnt, 9));
            const fill = '<span style="color:var(--accent);">' + '■'.repeat(Math.min(cnt, 9)) + '</span>';
            const barDisplay = cnt >= 9 ? fill + ' ✅' : fill + bars.slice(cnt);
            html += `<div class="trade-row">
                <span>${DING_RECIPES[i].name}</span>
                <span class="trade-bar">${barDisplay}</span>
                <span class="trade-count">${cnt}/9</span>
                <button class="trade-btn" ${cnt < 9 || unlocked ? 'disabled' : ''} onclick="exchangeFragment(${i})">${unlocked ? '已拥有' : '兑换'}</button>
            </div>`;
        }
        html += `<div class="buy-section"><h5>💫 黄金/白银购片</h5>`;
        for (let i = 0; i < DING_RECIPES.length; i++) {
            const p = FRAGMENT_PRICES[i];
            const hasGold = (inventory["金"] || 0) >= p.gold;
            const hasSilver = (inventory["银"] || 0) >= p.silver;
            html += `<span class="buy-option">${DING_RECIPES[i].name}: 🪙${p.gold}金 <button class="buy-btn" ${!hasGold ? 'disabled' : ''} onclick="buyFragment(${i},'gold')">购买</button> | 🪙${p.silver}银 <button class="buy-btn" ${!hasSilver ? 'disabled' : ''} onclick="buyFragment(${i},'silver')">购买</button></span> `;
        }
        html += `</div>`;
        container.innerHTML = html;
    }
    window.exchangeFragment = function(idx) {
        const name = getFragmentName(idx);
        if ((inventory[name] || 0) < 9) return;
        if (dingStatus[idx].unlocked) { showFeedback(`🧙‍♂️ 智慧老人：“此丹方你已拥有，不必再换。”`, 'pharmacyFeedback'); return; }
        inventory[name] -= 9;
        if (inventory[name] <= 0) delete inventory[name];
        dingStatus[idx].unlocked = true;
        renderFragmentTrade();
        renderFragmentInventory();
        renderAllUI();
        saveGameData();
        showFeedback(`🧙‍♂️ 智慧老人将九片碎片合为一体：「${DING_RECIPES[idx].name}」丹方已传授于你！`, 'pharmacyFeedback');
    };
    window.buyFragment = function(idx, currency) {
        const p = FRAGMENT_PRICES[idx];
        const cost = currency === 'gold' ? p.gold : p.silver;
        const currencyName = currency === 'gold' ? '金' : '银';
        if ((inventory[currencyName] || 0) < cost) { showFeedback(`🧙‍♂️ 智慧老人：“${currencyName}不够。”`, 'pharmacyFeedback'); return; }
        inventory[currencyName] -= cost;
        if (inventory[currencyName] <= 0) delete inventory[currencyName];
        if (currency === 'gold') { achievementState.stats.totalGoldSpent += cost; checkAchievements(); }
        const fragName = getFragmentName(idx);
        inventory[fragName] = (inventory[fragName] || 0) + 1;
        renderFragmentTrade();
        renderFragmentInventory();
        renderAllUI();
        saveGameData();
        showFeedback(`🧙‍♂️ 智慧老人收下${cost}${currencyName}，递给你一枚「${fragName}」。`, 'pharmacyFeedback');
    };
    function initArchaeology() {
        document.getElementById('archBtn').addEventListener('click', startExcavation);
        renderArchaeologySites();
        renderFragmentInventory();
        renderFragmentTrade();
    }
    // ======================= 成就功能 =======================
    function showAchieveToast(msg) {
        const fb = document.getElementById('achFeedback');
        if (!fb) return;
        fb.innerHTML = msg;
        fb.style.display = 'block';
        clearTimeout(fb._timeout);
        fb._timeout = setTimeout(() => { fb.style.display = 'none'; }, 4000);
    }
    function renderAchievements() {
        const container = document.getElementById('achList');
        if (!container) return;
        const unlockedCount = Object.keys(achievementState.unlocked).length;
        document.getElementById('achProgress').textContent = `${unlockedCount}/${ACHIEVEMENTS.length}`;
        const s = achievementState.stats;
        container.innerHTML = ACHIEVEMENTS.map(a => {
            const ts = achievementState.unlocked[a.id];
            const unlocked = !!ts;
            const dateStr = unlocked ? new Date(ts).toLocaleDateString('zh-CN') : '';
            let p = { cur: 0, tgt: 1 };
            try { p = a.progress(s); } catch(e) { p = { cur: 0, tgt: 1 }; }
            const pct = Math.min(100, Math.floor((p.cur / p.tgt) * 100));
            return `<div class="ach-item ${unlocked ? 'unlocked' : 'locked'}">
                <div class="ach-icon">${a.name.slice(0,2)}</div>
                <div class="ach-info">
                    <div class="ach-name">${a.name}</div>
                    <div class="ach-desc">${a.desc}</div>
                    <div class="ach-progress">
                        <div class="ach-progress-bar"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
                        <div class="ach-progress-text">${Math.min(p.cur, p.tgt)} / ${p.tgt} (${pct}%)</div>
                    </div>
                </div>
                <div class="ach-date">${dateStr}</div>
            </div>`;
        }).join('');
    }
    function initAchievements() {
        renderAchievements();
        document.getElementById('achToggleBtn').addEventListener('click', () => {
            const panel = document.getElementById('achFloatPanel');
            const btn = document.getElementById('achToggleBtn');
            const isOpen = panel.classList.toggle('active');
            btn.textContent = isOpen ? '❌ 关闭成就' : '🏆 成就';
        });
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const panel = document.getElementById('achFloatPanel');
            const btn = document.getElementById('achToggleBtn');
            if (!panel.classList.contains('active')) return;
            if (panel.contains(target) || btn.contains(target)) return;
            panel.classList.remove('active');
            btn.textContent = '🏆 成就';
        });
    }
    // ======================= 丹道图鉴 =======================
    const CATALOG_GROUPS = [
        { label:"⛏️ 矿脉采掘", sources:["矿脉采掘"] },
        { label:"🌿 药园采摘", sources:["药园采摘","深海遗礁"] },
        { label:"⚗️ 矿物提纯", sources:["矿物提纯"] },
        { label:"🔬 实验室提纯", sources:["实验室提纯"] },
        { label:"💊 药房炼制", sources:["药房炼制"] },
        { label:"🔥 九鼎炼制", sources:["九鼎炼制"] },
        { label:"🏛️ 考古发掘", sources:["考古发掘"] },
    ];
    function renderCatalog() {
        const container = document.getElementById('catalogBody');
        if (!container) return;
        const allItems = Object.entries(ITEM_CATALOG);
        document.getElementById('catalogCount').textContent = `全 ${allItems.length} 件`;
        let html = '';
        CATALOG_GROUPS.forEach(group => {
            const items = allItems.filter(([_,info]) => group.sources.includes(info.source));
            if (!items.length) return;
            html += `<div class="catalog-group"><div class="catalog-group-title">${group.label} (${items.length})</div>`;
            items.forEach(([name, info]) => {
                const owned = (inventory[name] || 0);
                const hpStr = info.maxHpEffect > 0 ? `❤️+${info.maxHpEffect}` : (info.hpEffect > 0 ? `+${info.hpEffect}` : info.hpEffect < 0 ? `${info.hpEffect}` : '');
                const tox = info.toxic ? ' ☠️剧毒' : '';
                const eff = info.effect ? ` [${info.effect}]` : '';
                html += `<div class="catalog-item">
                    <span class="ci-rarity" style="color:${info.rarity==='凡品'?'var(--text)':info.rarity==='珍品'?'#d4a017':info.rarity==='稀世'?'#b45f2b':info.rarity==='神丹'?'#c23b22':info.rarity==='造化'?'#9b59b6':info.rarity==='良药'?'var(--text)':info.rarity==='灵药'?'#d4a017':info.rarity==='仙药'?'#b45f2b':'var(--text)'}">${info.rarity}</span>
                    <span class="ci-name">${name}</span>
                    <span class="ci-desc">${info.desc}${tox}${eff}</span>
                    <span class="ci-effect ${info.hpEffect < 0 ? 'danger' : ''}">${hpStr}</span>
                    <span class="ci-owned">${owned > 0 ? '×'+owned : ''}</span>
                </div>`;
            });
            html += `</div>`;
        });
        container.innerHTML = html;
    }
    function initCatalog() {
        renderCatalog();
        document.getElementById('catalogToggleBtn').addEventListener('click', () => {
            const panel = document.getElementById('catalogFloatPanel');
            const btn = document.getElementById('catalogToggleBtn');
            const isOpen = panel.classList.toggle('active');
            btn.textContent = isOpen ? '❌ 关闭图鉴' : '📖 丹道图鉴';
            if (isOpen) renderCatalog();
        });
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const panel = document.getElementById('catalogFloatPanel');
            const btn = document.getElementById('catalogToggleBtn');
            if (!panel.classList.contains('active')) return;
            if (panel.contains(target) || btn.contains(target)) return;
            panel.classList.remove('active');
            btn.textContent = '📖 丹道图鉴';
        });
    }
    // ======================= 现代化学实验室功能 =======================
    function initLaboratory() {
        renderCrudeOres();
        renderPurificationMethods();
        renderPurifiedProducts();
        updateLabStats();
        updateLabControls();
        setupLabEventListeners();
    }
    
    function renderCrudeOres() {
        const container = document.getElementById('crudeOresGrid');
        if (!container) return;
        
        let html = '';
        Object.entries(CRUDE_MINERAL_MAPPING).forEach(([crudeName, info]) => {
            const count = inventory[crudeName] || 0;
            const toxicClass = info.toxicity ? 'toxic' : '';
            
            html += `
                <div class="ore-item ${toxicClass} ${labState.selectedCrudeOre === crudeName ? 'selected' : ''}" 
                     data-ore="${crudeName}">
                    <div class="ore-name">${crudeName}</div>
                    <div class="ore-qty">×${count}</div>
                    <div class="ore-formula">${info.formula}</div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<div style="grid-column:1/-1; text-align:center; color:var(--text-light);">暂无粗制矿物</div>';
        
        // 添加点击事件
        container.querySelectorAll('.ore-item').forEach(item => {
            item.addEventListener('click', () => selectCrudeOre(item.dataset.ore));
        });
    }
    
    function renderPurificationMethods() {
        const container = document.getElementById('purificationMethods');
        if (!container) return;
        
        let html = '';
        Object.entries(PURIFICATION_METHODS).forEach(([methodName, info]) => {
            html += `
                <div class="method-card ${labState.selectedMethod === methodName ? 'selected' : ''}" 
                     data-method="${methodName}">
                    <div class="method-icon">${info.icon}</div>
                    <div class="method-name">${methodName}</div>
                    <div class="method-desc">${info.description}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // 添加点击事件
        container.querySelectorAll('.method-card').forEach(item => {
            item.addEventListener('click', () => selectPurificationMethod(item.dataset.method));
        });
    }
    
    function renderPurifiedProducts() {
        const container = document.getElementById('purifiedProductsGrid');
        if (!container) return;
        
        const productMap = {};
        Object.values(CRUDE_MINERAL_MAPPING).forEach(info => {
            const products = Array.isArray(info.products) ? info.products : [info.product];
            const productFormulas = Array.isArray(info.productFormulas) ? info.productFormulas : [info.productFormula];
            products.forEach((product, idx) => {
                const count = inventory[product] || 0;
                if (count > 0) {
                    if (!productMap[product]) {
                        productMap[product] = { count: 0, formula: productFormulas[idx] || '' };
                    }
                    productMap[product].count += count;
                }
            });
        });
        
        let html = '';
        Object.entries(productMap).forEach(([name, data]) => {
            const info = ITEM_CATALOG[name] || {};
            const toxicClass = info.toxic ? 'toxic' : '';
            html += `
                <div class="product-item ${toxicClass}">
                    <div class="product-name">${name}</div>
                    <div class="product-qty">×${data.count}</div>
                    <div class="product-formula">${data.formula}</div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<div style="grid-column:1/-1; text-align:center; color:var(--text-light);">暂无提纯产物</div>';
    }
    
    function selectCrudeOre(oreName) {
        if (labState.isPurifying) return;
        
        labState.selectedCrudeOre = oreName;
        const oreInfo = CRUDE_MINERAL_MAPPING[oreName];
        
        // 自动选择对应的提纯方法
        labState.selectedMethod = oreInfo.method;
        
        updateLabEquipment();
        updateLabControls();
        updateLabFeedback();
        renderCrudeOres();
        renderPurificationMethods();
    }
    
    function selectPurificationMethod(methodName) {
        if (labState.isPurifying) return;
        // 选定矿物后自动匹配方法，不允许手动切换
        if (labState.selectedCrudeOre) return;

        labState.selectedMethod = methodName;
        updateLabEquipment();
        updateLabControls();
        updateLabFeedback();
        renderPurificationMethods();
    }
    
    function updateLabEquipment() {
        const container = document.getElementById('labEquipment');
        if (!container) return;
        
        if (!labState.selectedCrudeOre || !labState.selectedMethod) {
            container.innerHTML = `
                <div class="equipment-visual">🔬</div>
                <div class="equipment-info">选择矿物和提纯方法</div>
            `;
            return;
        }
        
        const methodInfo = PURIFICATION_METHODS[labState.selectedMethod];
        const oreInfo = CRUDE_MINERAL_MAPPING[labState.selectedCrudeOre];
        const step = labState.isPurifying && methodInfo.steps ? methodInfo.steps[labState.currentStepIndex] : null;
        
        let html = `
            <div class="equipment-visual ${labState.isPurifying ? 'active' : ''}">${labState.isPurifying && step ? step.icon : methodInfo.icon}</div>
            <div class="equipment-info">
                <div>${methodInfo.equipment}</div>
                <div style="font-size:0.8rem; margin-top:0.5rem;">
                    温度: ${oreInfo.temperature}
                </div>
            </div>
        `;
        
        if (labState.isPurifying && step) {
            html += `
                <div style="margin-top:0.5rem; font-size:0.9rem; font-weight:bold; color:var(--accent);">
                    ${step.name}
                </div>
                <div style="font-size:0.75rem; opacity:0.7; margin-bottom:0.5rem;">
                    ${step.desc}
                </div>
                <div class="lab-progress">
                    <div class="lab-progress-fill" style="width: ${labState.purificationProgress}%"></div>
                </div>
            `;
            if (step.critical && labState.criticalActionReady) {
                html += `
                    <button class="critical-action-btn" onclick="performCriticalAction()">
                        ⚡ 精准操作
                    </button>
                `;
            }
        }
        
        if (labState.isPurifying && !step) {
            html += `
                <div class="lab-progress">
                    <div class="lab-progress-fill" style="width: ${labState.purificationProgress}%"></div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
    
    function updateLabFeedback() {
        const feedback = document.getElementById('labFeedback');
        if (!feedback) return;
        
        if (!labState.selectedCrudeOre) {
            feedback.textContent = "选择粗制矿物进行现代化学提纯";
            return;
        }
        
        const oreInfo = CRUDE_MINERAL_MAPPING[labState.selectedCrudeOre];
        const methodInfo = PURIFICATION_METHODS[labState.selectedMethod];
        
        let message = `${oreInfo.realName} - ${oreInfo.description}`;
        if (oreInfo.toxicity) {
            message += " ⚠️ 剧毒物质，请谨慎操作";
        }
        
        feedback.textContent = message;
    }
    
    function renderStepList() {
        const container = document.getElementById('labSteps');
        if (!container) return;
        
        if (!labState.selectedMethod || !labState.isPurifying) {
            container.style.display = 'none';
            return;
        }
        
        const methodInfo = PURIFICATION_METHODS[labState.selectedMethod];
        if (!methodInfo.steps) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        
        let html = '';
        methodInfo.steps.forEach((step, index) => {
            let statusClass = 'pending';
            let statusIcon = '⏳';
            if (index < labState.currentStepIndex) {
                statusClass = 'completed';
                statusIcon = '✅';
            } else if (index === labState.currentStepIndex) {
                statusClass = 'active';
                statusIcon = '⚙️';
            }
            html += `
                <div class="lab-step ${statusClass}">
                    <div class="lab-step-icon">${step.icon}</div>
                    <div class="lab-step-info">
                        <div class="lab-step-name">${step.name}</div>
                        <div class="lab-step-desc">${step.desc}</div>
                    </div>
                    <div class="lab-step-status">${statusIcon}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    function startPurification() {
        if (!labState.selectedCrudeOre || !labState.selectedMethod) {
            alert("请先选择矿物和提纯方法");
            return;
        }
        
        if (inventory[labState.selectedCrudeOre] <= 0) {
            alert("矿物数量不足");
            return;
        }
        
        labState.isPurifying = true;
        labState.purificationProgress = 0;
        labState.currentStepIndex = 0;
        labState.criticalActionReady = false;
        labState.qualityBonus = 0;
        labState.stats.totalPurifications++;
        
        updateLabEquipment();
        updateLabControls();
        renderStepList();
        
        runNextStep();
    }
    
    function runNextStep() {
        const methodInfo = PURIFICATION_METHODS[labState.selectedMethod];
        if (!methodInfo.steps) {
            completePurification();
            return;
        }
        
        if (labState.currentStepIndex >= methodInfo.steps.length) {
            completePurification();
            return;
        }
        
        const step = methodInfo.steps[labState.currentStepIndex];
        const stepDuration = step.duration;
        const startTime = Date.now();
        
        labState.criticalActionReady = false;
        
        updateLabEquipment();
        updateLabControls();
        renderStepList();
        
        // 为关键步骤设置精控操作窗口
        let criticalTimer = null;
        if (step.critical) {
            // 在步骤进行到30%-70%时出现精控按钮
            const appearDelay = stepDuration * (0.3 + Math.random() * 0.3);
            criticalTimer = setTimeout(() => {
                if (labState.isPurifying && labState.currentStepIndex === methodInfo.steps.indexOf(step)) {
                    labState.criticalActionReady = true;
                    updateLabEquipment();
                }
            }, appearDelay);
        }
        
        labState.stepTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            labState.purificationProgress = Math.min(100, (elapsed / stepDuration) * 100);
            
            updateLabEquipment();
            updateLabControls();
            
            if (elapsed >= stepDuration) {
                clearInterval(labState.stepTimer);
                labState.stepTimer = null;
                if (criticalTimer) clearTimeout(criticalTimer);
                labState.criticalActionReady = false;
                
                labState.currentStepIndex++;
                labState.purificationProgress = 0;
                
                runNextStep();
            }
        }, 100);
    }
    
    function performCriticalAction() {
        if (!labState.criticalActionReady) return;
        
        labState.qualityBonus += 15;
        labState.criticalActionReady = false;
        
        const feedback = document.getElementById('labFeedback');
        if (feedback) {
            feedback.textContent = "✅ 精准操作成功！提纯品质提升！";
            setTimeout(() => updateLabFeedback(), 1500);
        }
        
        updateLabEquipment();
    }
    
    function completePurification() {
        if (labState.stepTimer) {
            clearInterval(labState.stepTimer);
            labState.stepTimer = null;
        }
        
        const oreInfo = CRUDE_MINERAL_MAPPING[labState.selectedCrudeOre];
        const methodInfo = PURIFICATION_METHODS[labState.selectedMethod];
        
        // 计算成功率（基础成功率 + 精控加成）
        const effectiveRate = Math.min(1, methodInfo.successRate + labState.qualityBonus / 100);
        const success = Math.random() < effectiveRate;
        
        if (success) {
            // 消耗粗制矿物
            inventory[labState.selectedCrudeOre]--;
            if (inventory[labState.selectedCrudeOre] === 0) delete inventory[labState.selectedCrudeOre];
            
            // 获得提纯产物
            cleanExpiredBuffs();
            const products = Array.isArray(oreInfo.products) ? oreInfo.products : [oreInfo.product];
            products.forEach(product => {
                // 精控操作增加双倍概率（每次精控+15%，基础30%，天眷+30%）
                const doubleChance = 0.3 + (labState.qualityBonus / 100) * 0.5 + (hasBuff('doubleProduct') ? 0.3 : 0);
                const amount = Math.random() < doubleChance ? 2 : 1;
                inventory[product] = (inventory[product] || 0) + amount;
                
                if (amount === 2) {
                    labState.stats.qualityProducts++;
                }
            });
            
            labState.stats.successfulPurifications++;
            achievementState.stats.totalPurifications++;
            checkAchievements();
            
            const productNames = products.join(' 和 ');
            alert(`提纯成功！获得 ${productNames}`);
        } else {
            alert("提纯失败，矿物损失");
            // 失败也消耗矿物
            inventory[labState.selectedCrudeOre]--;
            if (inventory[labState.selectedCrudeOre] === 0) delete inventory[labState.selectedCrudeOre];
        }
        
        // 重置状态
        labState.isPurifying = false;
        labState.purificationProgress = 0;
        labState.currentStepIndex = 0;
        labState.criticalActionReady = false;
        labState.qualityBonus = 0;
        labState.selectedCrudeOre = null;
        labState.selectedMethod = null;
        
        document.getElementById('labSteps').style.display = 'none';
        updateLabEquipment();
        updateLabControls();
        renderCrudeOres();
        renderPurifiedProducts();
        updateLabStats();
        saveGameData();
        renderInventory();
    }
    
    function stopPurification() {
        if (!labState.isPurifying) return;
        
        if (labState.stepTimer) {
            clearInterval(labState.stepTimer);
            labState.stepTimer = null;
        }
        
        labState.isPurifying = false;
        labState.purificationProgress = 0;
        labState.currentStepIndex = 0;
        labState.criticalActionReady = false;
        labState.qualityBonus = 0;
        
        // 中止提纯，矿物损失一半
        if (inventory[labState.selectedCrudeOre] > 0) {
            inventory[labState.selectedCrudeOre] = Math.floor(inventory[labState.selectedCrudeOre] / 2);
            if (inventory[labState.selectedCrudeOre] === 0) delete inventory[labState.selectedCrudeOre];
        }
        
        document.getElementById('labSteps').style.display = 'none';
        updateLabEquipment();
        updateLabControls();
        renderCrudeOres();
        saveGameData();
        
        alert("提纯已中止，损失一半矿物");
    }
    
    function updateLabControls() {
        const container = document.getElementById('labControls');
        if (!container) return;
        
        if (labState.isPurifying) {
            const methodInfo = PURIFICATION_METHODS[labState.selectedMethod];
            const step = methodInfo.steps ? methodInfo.steps[labState.currentStepIndex] : null;
            
            let stepHtml = '';
            if (step) {
                stepHtml = `
                    <div class="control-step-active">
                        <div style="font-size:2rem; margin-bottom:0.5rem;">${step.icon}</div>
                        <div class="control-step-name">${step.name}</div>
                        <div class="control-step-desc">${step.desc}</div>
                    </div>
                `;
            }
            
            container.innerHTML = `
                <div class="lab-control-panel active">
                    <div class="control-header">⚗️ 提纯进行中</div>
                    ${stepHtml}
                    <div class="control-progress-container">
                        <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.3rem;">
                            <span>${step ? `步骤 ${labState.currentStepIndex+1}/${methodInfo.steps.length}` : ''}</span>
                            <span>${Math.floor(labState.purificationProgress)}%</span>
                        </div>
                        <div class="control-progress-bar">
                            <div class="control-progress-fill" style="width:${labState.purificationProgress}%"></div>
                        </div>
                    </div>
                    <button class="start-btn stop" onclick="stopPurification()">⏹️ 中止提纯</button>
                </div>
            `;
        } else {
            let html = '';
            if (labState.selectedCrudeOre && labState.selectedMethod) {
                const oreInfo = CRUDE_MINERAL_MAPPING[labState.selectedCrudeOre];
                const methodInfo = PURIFICATION_METHODS[labState.selectedMethod];
                const products = Array.isArray(oreInfo.products) ? oreInfo.products : [oreInfo.product];
                const productNames = products.join('、');
                const isToxic = oreInfo.toxicity;
                const successRate = Math.floor(methodInfo.successRate * 100);
                
                html = `
                    <div class="lab-control-panel ready">
                        <div class="control-header">🧪 准备提纯</div>
                        <div class="control-row">
                            <span class="control-label">粗制矿物</span>
                            <span class="control-value ${isToxic ? 'toxic' : ''}">${labState.selectedCrudeOre} (${oreInfo.formula})</span>
                        </div>
                        <div class="control-row">
                            <span class="control-label">提纯方法</span>
                            <span class="control-value">${methodInfo.icon} ${labState.selectedMethod}</span>
                        </div>
                        <div class="control-row">
                            <span class="control-label">实验设备</span>
                            <span class="control-value">${methodInfo.equipment}</span>
                        </div>
                        <div class="control-row">
                            <span class="control-label">反应温度</span>
                            <span class="control-value">${oreInfo.temperature}</span>
                        </div>
                        <div class="control-row">
                            <span class="control-label">预期产物</span>
                            <span class="control-value">${productNames}</span>
                        </div>
                        <div class="control-row">
                            <span class="control-label">基础成功率</span>
                            <span class="control-value" style="color:${successRate >= 85 ? 'var(--heal)' : successRate >= 75 ? 'var(--accent)' : 'var(--danger)'}">${successRate}%</span>
                        </div>
                        <div class="control-equation">${oreInfo.equation}</div>
                        ${isToxic ? '<div style="text-align:center; color:var(--danger); font-size:0.8rem; margin-top:0.3rem;">☠️ 剧毒物质，请谨慎操作</div>' : ''}
                        <button class="start-btn ready" onclick="startPurification()">🔥 开始提纯</button>
                    </div>
                `;
            } else {
                html = `
                    <div class="lab-control-panel">
                        <div class="control-header">🔬 等待操作</div>
                        <div style="text-align:center; padding:1.5rem 0; color:var(--text-light); font-size:0.9rem;">
                            <div style="font-size:3rem; margin-bottom:0.5rem;">👆</div>
                            <div>请从左侧选择一种粗制矿物开始提纯</div>
                        </div>
                        <button class="start-btn disabled" disabled>⛔ 开始提纯</button>
                    </div>
                `;
            }
            
            container.innerHTML = html;
        }
    }
    
    function updateLabStats() {
        const successRate = labState.stats.totalPurifications > 0 ? 
            Math.floor((labState.stats.successfulPurifications / labState.stats.totalPurifications) * 100) : 0;
        
        document.getElementById('purificationSuccessRate').textContent = `${successRate}%`;
        document.getElementById('totalPurifications').textContent = labState.stats.totalPurifications;
        document.getElementById('qualityProducts').textContent = labState.stats.qualityProducts;
    }
    
    function setupLabEventListeners() {
        // 事件监听器已在各个渲染函数中设置
    }
    
    // ======================= 主入口 =======================
    function main() {
        loadUserFromMainPage();
        loadGameData();
        renderTerrain();
        renderAllUI();
        updateHealthUI();
        populateTargetSelect();
        initLaboratory(); // 初始化现代化学实验室
        initArchaeology(); // 初始化考古发掘
        initAchievements(); // 初始化成就系统
        initCatalog(); // 初始化丹道图鉴
        document.getElementById('mineBtn').addEventListener('click', manualMine);
        document.getElementById('autoMineBtn').addEventListener('click', startAutoMining);
        document.getElementById('stopAutoMineBtn').addEventListener('click', ()=>stopCurrentMining(true));
        document.getElementById('refineBtn').addEventListener('click', startRefine);
        document.getElementById('stopRefineBtn').addEventListener('click', stopRefine);
        document.getElementById('cancelRefineBtn').addEventListener('click', cancelRefine);
        document.getElementById('clearSlotBtn').addEventListener('click', clearMaterialSlot);
        initTabs();
        initRankFloat();
        initTheme();
        initSupabase();
        initSharedMusicPlayer(); // 初始化共享音乐播放器
        setInterval(()=>saveGameData(),10000);
        setInterval(()=>updateRanking(),RANK_UPLOAD_INTERVAL);
        setInterval(()=>{ renderBuffBar(); renderMatchedRecipePreview(); }, 1000);
        document.getElementById('challengeBtn').addEventListener('click', startChallenge);
        document.getElementById('closeRewardBtn').addEventListener('click', closeRewardModal);
        loadQuizQuestions().then(()=>{ loadChallengeCooldown(); });
    }
    main();
})();