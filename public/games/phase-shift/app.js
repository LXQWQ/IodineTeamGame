// ======================= 热力学相定义 =======================
    const THERMO_PHASES = {
        solid: { name: "固相", icon: "❄️", order: 0 },
        liquid: { name: "液相", icon: "💧", order: 1 },
        gas: { name: "气相", icon: "💨", order: 2 },
        plasma: { name: "等离子相", icon: "⚡", order: 3 }
    };
    const THERMO_PHASE_KEYS = ["solid", "liquid", "gas", "plasma"];
    
    // ======================= 溶剂亲和性定义 =======================
    const SOLVENT_AFFINITY = {
        hydrophilic: { name: "亲水性", icon: "💧" },
        lipophilic: { name: "亲油性", icon: "🛢️" },
        amphiphilic: { name: "两亲性", icon: "🌊" },
        insoluble: { name: "不溶性", icon: "🪨" }
    };

    // ======================= 真实物质特性卡片 =======================
    const SUBSTANCE_REAL = {
        "水": {
            formula: "H₂O",
            icon: "💧",
            meltingPoint: 0,
            boilingPoint: 100,
            ionizationPoint: null,
            sublimation: false,
            polarity: "polar_protic",
            solventAffinity: "hydrophilic",
            special: "4°C密度最大，加压可降低熔点（冰刀原理）",
            phases: {
                solid: { range: "T < 0°C", density: 0.92, conductivity: "低" },
                liquid: { range: "0°C < T < 100°C", density: 1.00, conductivity: "极低" },
                gas: { range: "T > 100°C", density: 0.0006, conductivity: "极低" }
            }
        },
        "碘": {
            formula: "I₂",
            icon: "🟣",
            meltingPoint: 113.7,
            boilingPoint: 184.3,
            sublimationPoint: 113.7,  // 常压升华点
            ionizationPoint: null,
            sublimation: true,
            polarity: "nonpolar",
            solventAffinity: "lipophilic",
            special: "常压下加热不经液相直接气化（升华）",
            phases: {
                solid: { range: "T < 113.7°C", color: "紫黑色晶体" },
                gas: { range: "T > 113.7°C (升华)", color: "紫色蒸气" },
                liquid: { range: "仅加压下存在" }
            }
        },
        "氩": {
            formula: "Ar",
            icon: "🔵",
            meltingPoint: -189.3,
            boilingPoint: -185.8,
            ionizationLevel: "low",  // 改为等级而非精确值
            sublimation: false,
            polarity: "nonpolar",
            solventAffinity: "insoluble",
            special: "惰性气体，极难反应",
            phases: {
                solid: { range: "T < -189.3°C" },
                liquid: { range: "-189.3°C < T < -185.8°C" },
                gas: { range: "-185.8°C < T < 5000K" },
                plasma: { range: "T > 5000K", conductivity: "高" }
            }
        },
        "铁": {
            formula: "Fe",
            icon: "⚙️",
            meltingPoint: 1538,
            boilingPoint: 2862,
            ionizationLevel: "medium",  // 改为等级
            sublimation: false,
            polarity: "metallic",
            solventAffinity: "insoluble",
            special: "铁磁性材料，高温冶炼产生铁蒸气",
            phases: {
                solid: { range: "T < 1538°C", magnetic: "铁磁性" },
                liquid: { range: "1538°C < T < 2862°C", conductivity: "高" },
                gas: { range: "T > 2862°C", conductivity: "中等" },
                plasma: { range: "T > 8000K", conductivity: "极高" }
            }
        },
        "汞": {
            formula: "Hg",
            icon: "🌡️",
            meltingPoint: -38.8,
            boilingPoint: 356.7,
            ionizationLevel: "medium",  // 改为等级
            sublimation: false,
            polarity: "metallic",
            solventAffinity: "insoluble",
            special: "常温下为液态金属，-39°C凝固",
            phases: {
                solid: { range: "T < -38.8°C", color: "银白色固体" },
                liquid: { range: "-38.8°C < T < 356.7°C", color: "银白色液体" },
                gas: { range: "T > 356.7°C", toxicity: "剧毒蒸气" }
            }
        },
        "氢气": {
            formula: "H₂",
            icon: "💨",
            meltingPoint: -259.2,
            boilingPoint: -252.9,
            ionizationLevel: "low",  // 改为等级
            sublimation: false,
            polarity: "nonpolar",
            solventAffinity: "insoluble",
            special: "最轻的气体，清洁能源",
            phases: {
                solid: { range: "T < -259.2°C" },
                liquid: { range: "-259.2°C < T < -252.9°C", color: "无色液体" },
                gas: { range: "T > -252.9°C", flammability: "易燃" },
                plasma: { range: "T > 2000K", conductivity: "高" }
            }
        },
        "乙醇": {
            formula: "C₂H₅OH",
            icon: "🍷",
            meltingPoint: -114.1,
            boilingPoint: 78.4,
            ionizationLevel: null,
            sublimation: false,
            polarity: "polar_protic",
            solventAffinity: "amphiphilic",
            special: "既溶于水也溶于有机溶剂",
            phases: {
                solid: { range: "T < -114.1°C" },
                liquid: { range: "-114.1°C < T < 78.4°C", miscibility: "与水互溶" },
                gas: { range: "T > 78.4°C", flammability: "易燃" }
            }
        },
        "氯化钠": {
            formula: "NaCl",
            icon: "🧂",
            meltingPoint: 801,
            boilingPoint: 1413,
            ionizationLevel: null,
            sublimation: false,
            polarity: "ionic",
            solventAffinity: "hydrophilic",
            special: "离子晶体，极易溶于水",
            phases: {
                solid: { range: "T < 801°C", structure: "立方晶系" },
                liquid: { range: "801°C < T < 1413°C", conductivity: "离子导电" },
                gas: { range: "T > 1413°C", state: "Na⁺和Cl⁻离子对" }
            }
        }
    };

    // ======================= 真实物理操作卡牌 =======================
    // 每张卡牌包含：
    // - name, desc
    // - effect: 对温度、压力、溶剂环境的影响
    // - getNewState: 函数，根据物质特性和当前状态返回新状态
    const CARD_TEMPLATES = [
        {
            name: "🔥 升温",
            desc: "增加体系温度100°C",
            effect: { temperature: +100 },
            getNewState: (substance, currentState) => {
                const newTemp = currentState.temperature + 100;
                const newPhase = determinePhase(substance, newTemp, currentState.pressure);
                return { 
                    temperature: newTemp, 
                    phase: newPhase,
                    message: `温度升至${newTemp.toFixed(1)}°C，${newPhase !== currentState.phase ? '物质相变为' + THERMO_PHASES[newPhase].name : '相未变'}`
                };
            }
        },
        {
            name: "❄️ 降温",
            desc: "降低体系温度100°C",
            effect: { temperature: -100 },
            getNewState: (substance, currentState) => {
                const newTemp = currentState.temperature - 100;
                const newPhase = determinePhase(substance, newTemp, currentState.pressure);
                return { 
                    temperature: newTemp, 
                    phase: newPhase,
                    message: `温度降至${newTemp.toFixed(1)}°C，${newPhase !== currentState.phase ? '物质相变为' + THERMO_PHASES[newPhase].name : '相未变'}`
                };
            }
        },
        {
            name: "⚡ 放电",
            desc: "瞬间高温高压局部放电",
            effect: { temperature: +2000, pressure: +10 },
            getNewState: (substance, currentState) => {
                const newTemp = currentState.temperature + 2000;
                const newPressure = currentState.pressure + 10;
                
                // 放电可跨过液相直接产生等离子体
                if (substance.ionizationLevel && newTemp + 273.15 >= 5000) {
                    return { 
                        temperature: newTemp, 
                        pressure: newPressure,
                        phase: 'plasma',
                        message: '放电产生等离子体！'
                    };
                }
                
                const newPhase = determinePhase(substance, newTemp, newPressure);
                return { 
                    temperature: newTemp, 
                    pressure: newPressure,
                    phase: newPhase,
                    message: `放电升温至${newTemp.toFixed(1)}°C，${newPhase !== currentState.phase ? '物质相变为' + THERMO_PHASES[newPhase].name : '相未变'}`
                };
            }
        },
        {
            name: "🧪 添加溶剂",
            desc: "向体系注入水",
            effect: { solvent: 'water' },
            getNewState: (substance, currentState) => {
                let newSolvent = currentState.solvent;
                let message = '';
                
                if (substance.solventAffinity === 'hydrophilic') {
                    newSolvent = 'water';
                    message = '亲水性物质完全溶解于水相';
                } else if (substance.solventAffinity === 'lipophilic') {
                    // 亲油性物质不溶于水，保持原溶剂状态
                    message = '亲油性物质不溶于水，保持原状态';
                } else if (substance.solventAffinity === 'amphiphilic') {
                    newSolvent = 'water';
                    message = '两亲性物质部分溶解于水相';
                } else {
                    // 不溶性物质
                    message = '不溶性物质在水中形成沉淀';
                }
                
                return { 
                    solvent: newSolvent,
                    message: message
                };
            }
        },
        {
            name: "🛢️ 添加有机溶剂",
            desc: "注入乙醚/己烷",
            effect: { solvent: 'organic' },
            getNewState: (substance, currentState) => {
                let newSolvent = currentState.solvent;
                let message = '';
                
                if (substance.solventAffinity === 'lipophilic') {
                    newSolvent = 'organic';
                    message = '亲油性物质完全溶解于有机相';
                } else if (substance.solventAffinity === 'hydrophilic') {
                    // 亲水性物质不溶于有机溶剂
                    message = '亲水性物质不溶于有机溶剂，保持原状态';
                } else if (substance.solventAffinity === 'amphiphilic') {
                    newSolvent = 'organic';
                    message = '两亲性物质部分溶解于有机相';
                } else {
                    // 不溶性物质
                    message = '不溶性物质在有机溶剂中形成沉淀';
                }
                
                return { 
                    solvent: newSolvent,
                    message: message
                };
            }
        },
        {
            name: "📏 加压",
            desc: "增大压强10倍",
            effect: { pressure: +10 },
            getNewState: (substance, currentState) => {
                const newPressure = currentState.pressure + 10;
                const newPhase = determinePhase(substance, currentState.temperature, newPressure);
                return { 
                    pressure: newPressure, 
                    phase: newPhase,
                    message: `压强增至${newPressure}atm，${newPhase !== currentState.phase ? '物质相变为' + THERMO_PHASES[newPhase].name : '相未变'}`
                };
            }
        },
        {
            name: "🧹 减压",
            desc: "减小压强至1/10",
            effect: { pressure: -0.9 },
            getNewState: (substance, currentState) => {
                const newPressure = Math.max(0.1, currentState.pressure * 0.1);
                const newPhase = determinePhase(substance, currentState.temperature, newPressure);
                return { 
                    pressure: newPressure, 
                    phase: newPhase,
                    message: `压强降至${newPressure.toFixed(1)}atm，${newPhase !== currentState.phase ? '物质相变为' + THERMO_PHASES[newPhase].name : '相未变'}`
                };
            }
        },
        {
            name: "� 电磁场",
            desc: "施加电磁场",
            effect: { electromagnetic: true },
            getNewState: (substance, currentState) => {
                if (currentState.phase === 'plasma') {
                    return { 
                        electromagnetic: true,
                        message: '电磁场约束等离子体！'
                    };
                }
                return { 
                    electromagnetic: true,
                    message: '电磁场对当前相影响微弱'
                };
            }
        }
    ];
    
    // ======================= 相判断函数 =======================
    function determinePhase(substance, temperatureC, pressure) {
        // 统一转换为开尔文
        const tempK = temperatureC + 273.15;
        
        // 检查等离子相（基于电离等级）
        if (substance.ionizationLevel) {
            let plasmaThreshold = 0;
            if (substance.ionizationLevel === 'low') plasmaThreshold = 2000;
            else if (substance.ionizationLevel === 'medium') plasmaThreshold = 5000;
            else if (substance.ionizationLevel === 'high') plasmaThreshold = 8000;
            else if (substance.ionizationLevel === 'extreme') plasmaThreshold = 12000;
            
            if (tempK >= plasmaThreshold) {
                return 'plasma';
            }
        }
        
        // 检查升华（直接固→气）
        if (substance.sublimation && substance.sublimationPoint !== undefined) {
            const sublimationK = substance.sublimationPoint + 273.15;
            if (tempK >= sublimationK && pressure < 2) {
                return 'gas';
            }
        }
        
        // 正常相变判断
        const meltingK = substance.meltingPoint + 273.15;
        const boilingK = substance.boilingPoint + 273.15;
        
        // 压力对沸点的影响（简化的克劳修斯-克拉佩龙方程）
        const pressureEffect = Math.log(pressure) * 10;
        const adjustedBoilingK = boilingK + pressureEffect;
        
        // 特殊处理：加压下碘可以出现液相
        if (substance.formula === 'I₂' && pressure >= 5 && tempK >= substance.meltingPoint + 273.15 && tempK < substance.boilingPoint + 273.15) {
            return 'liquid';
        }
        
        if (tempK < meltingK) {
            return 'solid';
        } else if (tempK < adjustedBoilingK) {
            return 'liquid';
        } else {
            return 'gas';
        }
    }

    // ======================= 游戏状态 =======================
    let currentSubstance = null;
    let currentState = {
        temperature: 25,      // °C
        pressure: 1,           // atm
        phase: 'solid',        // 热力学相
        solvent: 'none',      // 溶剂环境: 'none', 'water', 'organic'
        electromagnetic: false
    };
    let leftTarget = {
        phase: 'solid',
        solvent: 'hydrophilic'
    };
    let rightTarget = {
        phase: 'gas',
        solvent: 'lipophilic'
    };
    let position = { x: 50, y: 50 }; // x: 热力学相位置, y: 溶剂环境位置
    let currentTurn = "left";
    let gameActive = true;
    let currentCards = [];

    // DOM 元素
    const leftDiv = document.getElementById('playerLeft');
    const rightDiv = document.getElementById('playerRight');
    const leftNameSpan = document.getElementById('leftName');
    const rightNameSpan = document.getElementById('rightName');
    const leftPhaseSpan = document.getElementById('leftPhase');
    const rightPhaseSpan = document.getElementById('rightPhase');
    const leftIconSpan = document.getElementById('leftIcon');
    const rightIconSpan = document.getElementById('rightIcon');
    const turnIndicator = document.getElementById('turnIndicator');
    const cardsContainer = document.getElementById('cardsContainer');
    const gameMessageDiv = document.getElementById('gameMessage');
    const resetBtn = document.getElementById('resetGameBtn');
    const reactantNameSpan = document.getElementById('reactantName');
    const reactantStateSpan = document.getElementById('reactantState');
    const reactantIconSpan = document.getElementById('reactantIcon');
    
    // 新的DOM元素
    const tempValueSpan = document.getElementById('tempValue');
    const pressureValueSpan = document.getElementById('pressureValue');
    const phaseValueSpan = document.getElementById('phaseValue');
    const solventValueSpan = document.getElementById('solventValue');
    const substanceMarker = document.getElementById('substanceMarker');
    const leftTargetZone = document.getElementById('leftTarget');
    const rightTargetZone = document.getElementById('rightTarget');
    const phaseSpace = document.getElementById('phaseSpace');

    // ======================= 辅助函数 =======================
    function assignPlayerTargets() {
        const phases = [...THERMO_PHASE_KEYS];
        const affinities = Object.keys(SOLVENT_AFFINITY);
        
        // 生成目标象限对，确保最小距离约束
        let validPairs = [];
        for (let i = 0; i < phases.length; i++) {
            for (let j = 0; j < affinities.length; j++) {
                for (let k = 0; k < phases.length; k++) {
                    for (let l = 0; l < affinities.length; l++) {
                        if (i === k && j === l) continue; // 避免相同目标
                        
                        const leftPos = phaseToCoords(phases[i], affinities[j]);
                        const rightPos = phaseToCoords(phases[k], affinities[l]);
                        const distance = Math.sqrt(
                            Math.pow(leftPos.x - rightPos.x, 2) + 
                            Math.pow(leftPos.y - rightPos.y, 2)
                        );
                        
                        // 最小距离约束：至少相距30%
                        if (distance >= 30) {
                            validPairs.push({
                                left: { phase: phases[i], solvent: affinities[j] },
                                right: { phase: phases[k], solvent: affinities[l] },
                                distance: distance
                            });
                        }
                    }
                }
            }
        }
        
        // 随机选择一个有效的目标对
        if (validPairs.length > 0) {
            const selected = validPairs[Math.floor(Math.random() * validPairs.length)];
            leftTarget = selected.left;
            rightTarget = selected.right;
        } else {
            // 如果没有满足距离约束的对，回退到随机分配
            leftTarget.phase = phases[Math.floor(Math.random() * phases.length)];
            rightTarget.phase = phases[Math.floor(Math.random() * phases.length)];
            leftTarget.solvent = affinities[Math.floor(Math.random() * affinities.length)];
            rightTarget.solvent = affinities[Math.floor(Math.random() * affinities.length)];
        }
        
        // 更新UI
        leftNameSpan.innerText = `🔴 ${THERMO_PHASES[leftTarget.phase].name}+${SOLVENT_AFFINITY[leftTarget.solvent].name}修士`;
        rightNameSpan.innerText = `🔵 ${THERMO_PHASES[rightTarget.phase].name}+${SOLVENT_AFFINITY[rightTarget.solvent].name}修士`;
        leftPhaseSpan.innerText = `${THERMO_PHASES[leftTarget.phase].name}/${SOLVENT_AFFINITY[leftTarget.solvent].name}`;
        rightPhaseSpan.innerText = `${THERMO_PHASES[rightTarget.phase].name}/${SOLVENT_AFFINITY[rightTarget.solvent].name}`;
        leftIconSpan.innerText = THERMO_PHASES[leftTarget.phase].icon;
        rightIconSpan.innerText = THERMO_PHASES[rightTarget.phase].icon;
        
        // 设置目标区域位置
        updateTargetZones();
    }
    
    function updateTargetZones() {
        // 将相和溶剂亲和性转换为相空间坐标
        const leftPos = phaseToCoords(leftTarget.phase, leftTarget.solvent);
        const rightPos = phaseToCoords(rightTarget.phase, rightTarget.solvent);
        
        leftTargetZone.style.left = leftPos.x + '%';
        leftTargetZone.style.top = leftPos.y + '%';
        rightTargetZone.style.left = rightPos.x + '%';
        rightTargetZone.style.top = rightPos.y + '%';
    }
    
    function phaseToCoords(phase, solvent) {
        // 热力学相映射到x轴 (0-100%)
        let x = 50; // 默认中心
        if (phase === 'solid') x = 25;
        else if (phase === 'liquid') x = 50;
        else if (phase === 'gas') x = 75;
        else if (phase === 'plasma') x = 90;
        
        // 溶剂亲和性映射到y轴 (0-100%)
        let y = 50; // 默认中心
        if (solvent === 'hydrophilic') y = 25;
        else if (solvent === 'amphiphilic') y = 50;
        else if (solvent === 'lipophilic') y = 75;
        else if (solvent === 'insoluble') y = 90;
        
        return { x, y };
    }

    function selectRandomSubstance() {
        const substanceNames = Object.keys(SUBSTANCE_REAL);
        const randomName = substanceNames[Math.floor(Math.random() * substanceNames.length)];
        currentSubstance = SUBSTANCE_REAL[randomName];
        
        // 初始化状态（基于物质特性）
        currentState = {
            temperature: 25 + Math.random() * 50, // 25-75°C
            pressure: 0.5 + Math.random() * 2,   // 0.5-2.5 atm
            phase: 'solid',
            solvent: 'none',
            electromagnetic: false
        };
        
        // 根据温度确定初始相
        currentState.phase = determinePhase(currentSubstance, currentState.temperature, currentState.pressure);
        
        // 更新UI
        reactantNameSpan.innerText = `${randomName} (${currentSubstance.formula})`;
        reactantStateSpan.innerText = `${THERMO_PHASES[currentState.phase].name} - ${currentSubstance.special}`;
        reactantIconSpan.innerText = currentSubstance.icon;
        
        updateSubstanceMarker();
    }
    
    function updateSubstanceMarker() {
        // 将当前状态转换为相空间坐标
        const coords = stateToCoords(currentState);
        substanceMarker.style.left = coords.x + '%';
        substanceMarker.style.top = coords.y + '%';
        
        // 更新状态显示
        tempValueSpan.innerText = currentState.temperature.toFixed(1) + '°C';
        pressureValueSpan.innerText = currentState.pressure.toFixed(1) + ' atm';
        phaseValueSpan.innerText = THERMO_PHASES[currentState.phase].name;
        
        let solventText = '无';
        if (currentState.solvent === 'water') solventText = '水相';
        else if (currentState.solvent === 'organic') solventText = '有机相';
        solventValueSpan.innerText = solventText;
    }
    
    function stateToCoords(state) {
        // 热力学相映射到x轴，在相区内线性插值
        let x = 50;
        const tempK = state.temperature + 273.15;
        
        if (!currentSubstance) return { x: 50, y: 50 };
        
        const meltingK = currentSubstance.meltingPoint + 273.15;
        const boilingK = currentSubstance.boilingPoint + 273.15;
        
        if (state.phase === 'solid') {
            // 固相区：从绝对零度到熔点
            const solidRange = meltingK - 0; // 简化：假设0K为下限
            const positionInSolid = Math.max(0, Math.min(1, tempK / solidRange));
            x = 10 + positionInSolid * 15; // 10% 到 25%
        } else if (state.phase === 'liquid') {
            // 液相区：从熔点到沸点
            const liquidRange = boilingK - meltingK;
            const positionInLiquid = (tempK - meltingK) / liquidRange;
            x = 35 + positionInLiquid * 15; // 35% 到 50%
        } else if (state.phase === 'gas') {
            // 气相区：从沸点到等离子相阈值
            let plasmaThreshold = 10000; // 默认值
            if (currentSubstance.ionizationLevel === 'low') plasmaThreshold = 2000;
            else if (currentSubstance.ionizationLevel === 'medium') plasmaThreshold = 5000;
            else if (currentSubstance.ionizationLevel === 'high') plasmaThreshold = 8000;
            else if (currentSubstance.ionizationLevel === 'extreme') plasmaThreshold = 12000;
            
            const gasRange = plasmaThreshold - boilingK;
            const positionInGas = Math.min(1, (tempK - boilingK) / gasRange);
            x = 60 + positionInGas * 20; // 60% 到 80%
        } else if (state.phase === 'plasma') {
            // 等离子相区：固定在90%
            x = 90;
        }
        
        // 溶剂环境映射到y轴（连续值）
        let y = 50;
        if (state.solvent === 'water') {
            y = 25;
        } else if (state.solvent === 'organic') {
            y = 75;
        } else if (state.solvent === 'none') {
            y = 50;
        }
        
        return { x, y };
    }
    
    // 检查是否进入目标区域（获胜条件）
    function checkVictory() {
        const currentCoords = stateToCoords(currentState);
        const leftCoords = phaseToCoords(leftTarget.phase, leftTarget.solvent);
        const rightCoords = phaseToCoords(rightTarget.phase, rightTarget.solvent);
        
        const threshold = 15; // 距离阈值
        
        const leftDistance = Math.sqrt(
            Math.pow(currentCoords.x - leftCoords.x, 2) + 
            Math.pow(currentCoords.y - leftCoords.y, 2)
        );
        
        const rightDistance = Math.sqrt(
            Math.pow(currentCoords.x - rightCoords.x, 2) + 
            Math.pow(currentCoords.y - rightCoords.y, 2)
        );
        
        if (leftDistance < threshold) {
            gameActive = false;
            gameMessageDiv.innerHTML = `🎉 ${leftNameSpan.innerText} 胜利！物质进入目标象限！点击「新物质·新对局」继续 🎉`;
            alert(`${leftNameSpan.innerText} 获胜！`);
            return true;
        } else if (rightDistance < threshold) {
            gameActive = false;
            gameMessageDiv.innerHTML = `🎉 ${rightNameSpan.innerText} 胜利！物质进入目标象限！点击「新物质·新对局」继续 🎉`;
            alert(`${rightNameSpan.innerText} 获胜！`);
            return true;
        }
        
        return false;
    }

    // 抽卡
    function drawCards() {
        const shuffled = [...CARD_TEMPLATES];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        currentCards = shuffled.slice(0, 4);
        renderCards();
    }

    // 使用卡牌
    function useCard(card) {
        if (!gameActive) {
            gameMessageDiv.innerHTML = "游戏已结束，请重新开局。";
            return;
        }
        
        const playerTarget = (currentTurn === "left") ? leftTarget : rightTarget;
        const playerName = (currentTurn === "left") ? leftNameSpan.innerText : rightNameSpan.innerText;
        
        // 应用卡牌效果
        const newState = card.getNewState(currentSubstance, currentState);
        
        // 更新状态
        if (newState.temperature !== undefined) currentState.temperature = newState.temperature;
        if (newState.pressure !== undefined) currentState.pressure = newState.pressure;
        if (newState.phase !== undefined) currentState.phase = newState.phase;
        if (newState.solvent !== undefined) currentState.solvent = newState.solvent;
        if (newState.electromagnetic !== undefined) currentState.electromagnetic = newState.electromagnetic;
        
        // 更新UI
        updateSubstanceMarker();
        gameMessageDiv.innerHTML = `${playerName} 使用了 ${card.name}！${newState.message}`;
        
        // 检查胜利条件
        const ended = checkVictory();
        
        if (!ended) {
            currentTurn = (currentTurn === "left") ? "right" : "left";
            drawCards();
            updateUI();
            gameMessageDiv.innerHTML += ` 轮到 ${currentTurn === "left" ? leftNameSpan.innerText : rightNameSpan.innerText} 回合。`;
        } else {
            renderCards(true);
        }
    }

    function renderCards(disable = false) {
        cardsContainer.innerHTML = '';
        for (let card of currentCards) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            if (disable) cardDiv.classList.add('disabled');
            cardDiv.innerHTML = `
                <div class="card-name">${card.name}</div>
                <div class="card-desc">${card.desc}</div>
                <div class="card-power">⚗️ 真实物理</div>
            `;
            if (!disable) {
                cardDiv.addEventListener('click', () => useCard(card));
            }
            cardsContainer.appendChild(cardDiv);
        }
    }

    function updateUI() {
        if (currentTurn === 'left') {
            leftDiv.classList.add('active');
            rightDiv.classList.remove('active');
            turnIndicator.innerText = `${leftNameSpan.innerText} 回合`;
        } else {
            rightDiv.classList.add('active');
            leftDiv.classList.remove('active');
            turnIndicator.innerText = `${rightNameSpan.innerText} 回合`;
        }
    }

    function resetGame() {
        gameActive = true;
        assignPlayerTargets();
        selectRandomSubstance();
        currentTurn = "left";
        drawCards();
        updateUI();
        gameMessageDiv.innerHTML = "✨ 新物质登场！使用真实物理操作改变物质状态，使物质进入你的目标象限即可获胜！";
        renderCards();
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
            // 相转移大作战页面使用全局音乐
            const playlist = musicData.global;
            
            const currentIndex = playlist.findIndex(music => music.file === currentMusic);
            const nextIndex = (currentIndex + 1) % playlist.length;
            const nextMusic = playlist[nextIndex];
            
            playMusic(nextMusic.file);
        }

        // 获取当前播放列表
        function getCurrentPlaylist() {
            // 相转移大作战页面使用全局音乐
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

    function init() {
        assignPlayerTargets();
        selectRandomSubstance();
        currentTurn = "left";
        gameActive = true;
        drawCards();
        updateUI();
        resetBtn.addEventListener('click', () => resetGame());
        initSharedMusicPlayer(); // 初始化共享音乐播放器
    }

    init();