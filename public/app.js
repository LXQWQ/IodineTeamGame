    document.addEventListener('DOMContentLoaded', () => {
        // 已通过 Cloudflare Worker 反向代理，使用自定义域名
        const SUPABASE_URL = 'https://supabase.iteamgame.dpdns.org';
        const SUPABASE_ANON_KEY = 'sb_publishable_wH0spS1pkkrKe6pu7AwUKA_2cSK95rG';
        let supabase = null;
        // ======================= 辅助函数 =======================
        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m] || m));
        }
        // 获取当前真实用户昵称（从 profiles 表）
        async function getCurrentUserNickname() {
            if (!supabase) return null;
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('uid', user.id)
                .maybeSingle();
            if (error || !data) return null;
            return data.username;
        }
        // ======================= 认证UI =======================
        let currentAuthMode = 'login';
        let modal, modalTitle, loginEmail, loginPassword, authError, switchBtn, submitBtn, closeModalBtn, nicknameInput = null;
        function updateModalForMode() {
            if (currentAuthMode === 'login') {
                modalTitle.innerText = '登录';
                switchBtn.innerText = '去登录';
                submitBtn.innerText = '登录';
                if (nicknameInput) { nicknameInput.remove(); nicknameInput = null; }
                loginEmail.placeholder = "电子邮箱";
            } else {
                modalTitle.innerText = '注册';
                switchBtn.innerText = '去注册';
                submitBtn.innerText = '注册';
                if (!nicknameInput) {
                    nicknameInput = document.createElement('input');
                    nicknameInput.type = 'text';
                    nicknameInput.id = 'regNickname';
                    nicknameInput.placeholder = '请输入昵称（2-20个字符）';
                    nicknameInput.autocomplete = 'off';
                    loginEmail.insertAdjacentElement('afterend', nicknameInput);
                }
            }
        }
        function showAuthModal(mode = 'login') {
            currentAuthMode = mode;
            updateModalForMode();
            loginEmail.value = '';
            loginPassword.value = '';
            if (nicknameInput) nicknameInput.value = '';
            authError.innerText = '';
            modal.classList.add('active');
        }
        function hideAuthModal() { modal.classList.remove('active'); }
        // 注册
        async function register(email, password, username) {
            if (!email || !password || !username) return "请填写邮箱、密码和昵称";
            if (!supabase) return "系统未连接，请检查网络";
            try {
                const { data: existing, error: queryError } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('username', username)
                    .maybeSingle();
                if (queryError) throw queryError;
                if (existing) return "该昵称已被使用";
                const { data: authData, error: signUpError } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: { data: { username: username } }
                });
                if (signUpError) {
                    if (signUpError.message.includes('already registered')) return "该邮箱已注册，请直接登录";
                    throw signUpError;
                }
                if (!authData.user) throw new Error("注册失败");
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({ uid: authData.user.id, username: username });
                if (profileError) throw profileError;
                return true;
            } catch(err) {
                console.error(err);
                return err.message || "注册失败，请重试";
            }
        }
        // 登录
        async function login(email, password) {
            if (!email || !password) return "请填写邮箱和密码";
            if (!supabase) return "系统未连接，请检查网络";
            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                return true;
            } catch(err) {
                return err.message || "登录失败，请重试";
            }
        }
        async function logout() {
            if (supabase) await supabase.auth.signOut();
            // 登出时清除 localStorage 中的用户名
            localStorage.removeItem('iodine_current_user');
            updateAuthUI();
        }
        async function handleAuthSubmit() {
            const email = loginEmail.value.trim();
            const password = loginPassword.value;
            if (!email || !password) {
                authError.innerText = '请填写邮箱和密码';
                return;
            }
            if (currentAuthMode === 'register') {
                const nickname = nicknameInput ? nicknameInput.value.trim() : '';
                if (!nickname) {
                    authError.innerText = '请填写昵称';
                    return;
                }
                authError.innerText = '正在注册...';
                const result = await register(email, password, nickname);
                if (result === true) {
                    hideAuthModal();
                    updateAuthUI();
                } else {
                    authError.innerText = result;
                }
            } else {
                authError.innerText = '正在登录...';
                const result = await login(email, password);
                if (result === true) {
                    hideAuthModal();
                    updateAuthUI();
                } else {
                    authError.innerText = result;
                }
            }
        }
        // 更新右上角用户区域（基于真实会话）
        async function updateAuthUI() {
            const authArea = document.getElementById('authArea');
            if (!authArea) return;
            const user = await getCurrentUserNickname();
            if (user) {
                // 登录成功，将用户名写入 localStorage（供丹道化学游戏读取）
                localStorage.setItem('iodine_current_user', user);
                authArea.innerHTML = `
                    <div class="user-info">
                        <span class="user-name">👤 ${escapeHtml(user)}</span>
                        <button class="logout-btn" id="logoutBtn">退出</button>
                    </div>
                `;
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    const newBtn = logoutBtn.cloneNode(true);
                    logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
                    newBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        logout();
                    });
                }
            } else {
            // 登出时清除 localStorage 中的用户名
                localStorage.removeItem('iodine_current_user');
                authArea.innerHTML = `<button class="auth-btn" id="openAuthBtn">🔐 登录 / 注册</button>`;
                const openBtn = document.getElementById('openAuthBtn');
                if (openBtn) {
                    const newBtn = openBtn.cloneNode(true);
                    openBtn.parentNode.replaceChild(newBtn, openBtn);
                    newBtn.addEventListener('click', () => showAuthModal('login'));
                }
            }
        }
        // ======================= 游戏展示 =======================
                const iodineGames = [
            { id:1, name:"丹道化学Pro", emoji:"🧪🔥", tag:"炼丹模拟", desc:"收集五金八石，翻阅典籍，炼制灵丹！探索地图，解锁配方，登上排行榜。", link:"games/dandao-chemistry/", newWindow:false },
            { id:2, name:"元素大战僵尸Pro·物质炼金", emoji:"🧟🧠", tag:"化学塔防+RPG", desc:"完全重构！击杀特定化学物质僵尸收集HCl/H₂SO₄/吡啶等，在炼金实验室中电解、还原、裂解提取单质解锁新元素！三大化学Boss等你挑战。", link:"games/evz/", newWindow:false },
            { id:3, name:"相转移大作战", emoji:"💧❄⚡", tag:"双人对抗", desc:"原创游戏，回合制抽取卡牌，将反应物拉向自己的相！", link:"games/phase-shift/", newWindow:false },
            { id:7, name:"化境争霸", emoji:"⚔️⚗️", tag:"领地争夺", desc:"化学主题六边形棋盘领地争夺战！酸碱中和、电化学、元素争霸三模式，支持双人对战和人机AI，通过化学反应摧毁敌方单位！", link:"games/chem-territory/", newWindow:false },
            { id:9, name:"化学海龟汤", emoji:"🐢", tag:"推理猜谜", desc:"化学版海龟汤！根据谜面推理化学物质/反应/现象，AI主持人月见八千代出题，沉浸式悬疑推理体验。手机电脑均可畅玩！", link:"games/chem-turtle-soup/", newWindow:false },
            { id:10, name:"元素大战僵尸·经典版", emoji:"🧟⚗️", tag:"经典塔防", desc:"经典PvZ式元素塔防！部署碳、镁、钠等元素守卫实验室，重温最初的元素战争。", link:"evz.html", newWindow:false }
        ];
                const iodineDevGames = [
            { id:4, name:"碳链工坊", emoji:"🧬⛓", tag:"3D分子工坊", desc:"有机合成策略，构建分子结构，探索化学反应！—— 预计下个大版本重构", link:"games/chain-craft/", newWindow:false },
            { id:5, name:"反应对决·炼金术士", emoji:"⚗️⚡", tag:"卡牌对战", desc:"真实化学反应驱动的双人对战卡牌游戏！45+化学反应,60种物质,操作卡策略,AI对战。—— 正在修复中", link:"games/reaction-duel/", newWindow:false },
            { id:6, name:"元素跃迁：周期表飞行棋", emoji:"🎲⚛️", tag:"桌游派对", desc:"融合元素周期律与飞行棋的创意桌游！4大家族16枚棋子，置换反应、化合碰撞、40张反应卡，冲向8电子满壳层！—— 机制改版中", link:"games/element-leap/", newWindow:false },
            { id:8, name:"离子竞技场", emoji:"⚛️⚡", tag:"动作RPG", desc:"florr.io化学版！控制原子核，电子绕轨道旋转攻击，探索5大化学区域，击杀化合物怪物收集稀有电子，升级解锁更多轨道！—— Godot重构中", link:"games/ion-arena/", newWindow:false }
        ];
                const toolsGames = [
            { id:1, name:"正多面体与阿基米德多面体 3D 展示", emoji:"🔷", tag:"3D几何", desc:"交互式3D展示正多面体（柏拉图立体）与阿基米德多面体，支持旋转缩放，探索化学晶体学中的几何结构！", link:"tools/polyhedrons/", newWindow:false },
            { id:2, name:"IodineScope 晶体结构浏览器", emoji:"💎", tag:"晶体学", desc:"553个晶体结构3D浏览器！球棍/空间填充/配位多面体三模式渲染，按元素检索，对称性还原，实时配位数与键长——化竞必备！", link:"tools/iodinescope/", newWindow:false },
            { id:3, name:"IodineScope 移动版", emoji:"📱", tag:"晶体学·触屏", desc:"IodineScope 手机版！触屏优化，手机上随时旋转查看晶体结构、检索元素组成、测量原子距离。", link:"tools/iodinescope-mobile/", newWindow:false }
        ];
                const hydrogenGames = [
            { id:1, name:"化境探雷", emoji:"💣", tag:"有机化学", desc:"三维有机化学扫雷！在蜂窝（L1）、立方体（L2）等3D结构中排雷，答对化学题获得积分。内含酸碱棋对战与快问快答模式，积分商店解锁更多挑战。", link:"氢队游戏/化境探雷/", newWindow:true },
            { id:2, name:"Chemcraft: 元素觉醒", emoji:"⚗️", tag:"化学反应", desc:"化学反应卡牌策略游戏！收集元素，合成化合物，用真实的化学反应击败对手。支持单人挑战AI（四档难度）和双人PvP对战，61条化学反应等你探索。手机电脑均可畅玩！", link:"氢队游戏/chemcraft-beta/", newWindow:true },
            { id:3, name:"有机过熟 Organic Overcooked", emoji:"🍳", tag:"有机合成", desc:"灵感来自《胡闹厨房》——不过这次你的'厨房'是有机实验室！根据订单选择正确的试剂和反应顺序，在时间耗尽前合成目标分子。支持单人闯关和双人合作，Simple→Hard→Hell 难度递增，你能撑到第几关？", link:"氢队游戏/有机过熟/", newWindow:true },
            { id:4, name:"丹道化学", emoji:"🔮", tag:"古代化学", desc:"穿越到古代炼丹房！收集五金八石（金银铜铁朱砂雄黄……），翻阅《黄帝九鼎》《周易参同契》等古代典籍，用真实的化学知识完成炼丹任务。还能在世界地图上寻找矿产、解锁技能树，在古代炼金术与现代化学之间自由穿梭！", link:"氢队游戏/丹道化学/", newWindow:true },
            { id:5, name:"环己烷大作战", emoji:"♟️", tag:"立体化学", desc:"立体化学变成了策略棋盘！支持AI人机对战（三种难度）和双人PvP。用 SN2、消除、加成等试剂卡在环己烷椅式构象上占领位点，翻转构象逆转战局！", link:"氢队游戏/环己烷大作战/", newWindow:true },
            { id:6, name:"pKa酸性吞噬 Acid Arena", emoji:"🧪", tag:"酸碱化学", desc:"酸碱大乱斗 agar.io！你控制一个分子在酸池里游泳——遇到 pKa 比你大的（酸性更弱的），一口吞掉它变大；遇到 pKa 比你小的，赶紧跑！从羧酸到磺酸，7 个关卡帮你把 pKa 大小牢牢记住。", link:"氢队游戏/酸性吞噬/", newWindow:true },
            { id:7, name:"元素大战僵尸 Elements vs. Zombies", emoji:"🧟", tag:"元素性质", desc:"PvZ 的化学版！用元素周期表上的元素守卫你的实验室——钠发火球、氟放毒气、氦做盾牌。每种元素都有独特的化学属性加成，需要消耗'电子'资源来部署。僵尸正在靠近，准备好你的元素防线了吗？", link:"氢队游戏/元素大战僵尸/", newWindow:true },
            { id:8, name:"CChO 考纲可视化", emoji:"📊", tag:"竞赛考纲", desc:"2024 CChO 国初考纲交互式知识图谱！分类浏览全部考点，关联历年真题，可视化掌握竞赛知识体系。备考化竞的必备工具。", link:"氢队游戏/考纲可视化/", newWindow:true },
            { id:9, name:"酸碱大冒险 Acid and Base", emoji:"⚗️", tag:"双人合作", desc:"双人合作平台跳跃！酸人（绿）和碱人（蓝）各守其道，收集化学物质获得特效，合作通过关卡出口。支持双人闯关和单人无尽模式，手机触屏直接操作！", link:"氢队游戏/acid-base-beta/", newWindow:true },
            { id:10, name:"化学溶解大师 ChemFlow", emoji:"🧪", tag:"闯关解谜", desc:"用试剂溶解难溶固体，引导水流到容器！60关闯关模式+无限模式，涵盖酸碱反应、王水、铵盐溶解等真实化学知识。", link:"氢队游戏/dissolver/", newWindow:true }
        ];
        function renderGames(gamesArray, gridId, isDev) {
            const grid = document.getElementById(gridId);
            if (!grid) return;
            grid.innerHTML = '';
            isDev = isDev || false;
            // 检查是否为氢队游戏
            const isHydrogenGames = gridId === 'hydrogenGameGrid';
            gamesArray.forEach(game => {
                const card = document.createElement('div');
                card.className = 'game-card';
                if (isDev) card.classList.add('dev-card');
                // 添加游戏特定类名（仅对碘队现役游戏）
                if (!isHydrogenGames && !isDev) {
                    if (game.id === 1) card.classList.add('dandao');
                    if (game.id === 2) card.classList.add('evz');
                    if (game.id === 3) card.classList.add('phase-transfer');
                    if (game.id === 7) card.classList.add('chem-territory');
                }
                let gameIcon = '';
                if (isHydrogenGames || isDev) {
                    // 氢队游戏和开发中游戏使用简单emoji
                    gameIcon = `<div style="font-size: 3rem; opacity: ${isDev ? '0.4' : '1'};">${game.emoji}</div>`;
                } else {
                    // 碘队游戏使用SVG动画图标
                    if (game.id === 1) {
                        gameIcon = '<div class="micro-reaction"><div class="crucible"></div></div>';
                    } else if (game.id === 2) {
                        gameIcon = '<div class="micro-reaction"><div class="electron-orbit"><div class="electron"></div></div></div>';
                    } else if (game.id === 3) {
                        gameIcon = '<div class="micro-reaction"><div class="phase-transfer"><div class="phase-drop"></div><div class="phase-drop"></div><div class="solute"></div></div></div>';
                    } else if (game.id === 4) {
                        gameIcon = '<div class="micro-reaction"><div class="floating-molecule"></div><div class="floating-molecule"></div><div class="floating-molecule"></div><div class="floating-molecule"></div></div>';
                    } else if (game.id === 9) {
                        gameIcon = '<div style="font-size: 3rem;">🐢</div>';
                    } else if (game.id === 10) {
                        gameIcon = '<div style="font-size: 3rem;">🧟</div>';
                    } else {
                        gameIcon = '<div style="font-size: 3rem; opacity: 0.5;">🔮</div>';
                    }
                }
                const isComingSoon = !game.link || isDev;
                const imgStyle = (isComingSoon || isDev) ? 'background: #1e293b; opacity: 0.6;' : '';
                const tagStyle = isDev ? 'background: #334155; color: #94a3b8;' : (isComingSoon ? 'background: #e5e7eb; color: #6b7280;' : '');
                const tagText = isDev ? '🚧 开发中' : (isComingSoon ? '即将上线' : game.tag);
                const btnDisabled = (isComingSoon || isDev) ? 'disabled style="background: #475569; cursor: not-allowed;"' : '';
                const btnText = isDev ? '🔧 重构中' : (isComingSoon ? '🔮 敬请期待' : (isHydrogenGames ? '🚀 立即游玩' : '🧪 立即游玩'));
                card.innerHTML = `
                    <div class="game-img" style="${imgStyle}">${gameIcon}</div>
                    <div class="game-info">
                        <h3>${game.name} <span class="game-tag" style="${tagStyle}">${tagText}</span></h3>
                        <div class="game-desc">${game.desc}</div>
                        <button class="play-btn" data-link="${game.link || ''}" data-new="${game.newWindow}" ${btnDisabled}>${btnText}</button>
                    </div>
                    <div class="adsorption-heat"></div>
                `;
                grid.appendChild(card);
                // 月读主题卡片粒子拼合动画
                if (document.body.getAttribute('data-theme') === 'tsukuyomi') {
                    initCardParticleAnimation(card);
                }
            });
            document.querySelectorAll('.play-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const link = btn.dataset.link;
                    const newWindow = btn.dataset.new === 'true';
                    if (link) {
                        if (newWindow) {
                            window.open(link, '_blank');
                        } else {
                            window.location.href = link;
                        }
                    }
                });
                // 为所有卡片添加鼠标离开事件
            document.querySelectorAll('.game-card').forEach(card => {
                card.addEventListener('mouseleave', () => {
                    card.style.setProperty('--mouse-x', '50%');
                    card.style.setProperty('--mouse-y', '50%');
                    card.style.transform = '';
                });
                card.addEventListener('mouseenter', function(e) {
                    if (!card._lastBurst || Date.now() - card._lastBurst > 600) {
                        card._lastBurst = Date.now();
                        spawnCardParticles(card, e.clientX, e.clientY);
                    }
                });
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width;
                    const y = (e.clientY - rect.top) / rect.height;
                    card.style.setProperty('--mouse-x', (x * 100) + '%');
                    card.style.setProperty('--mouse-y', (y * 100) + '%');
                    const tiltX = (y - 0.5) * -12;
                    const tiltY = (x - 0.5) * 12;
                    card.style.transform = 'rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
                });
            });
            });
        }
        // ======================= 标签页切换系统 =======================
        function initTabs() {
            const tabBtns = document.querySelectorAll('.tab-btn');
            const tabPanes = document.querySelectorAll('.tab-pane');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetTab = btn.dataset.tab;
                    tabBtns.forEach(b => b.classList.remove('active'));
                    tabPanes.forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    const targetPane = document.getElementById(targetTab);
                    if (targetPane) {
                        targetPane.classList.add('active');
                        // 触发卡片逐个弹出
                        const grids = targetPane.querySelectorAll('.game-grid');
                        grids.forEach(g => {
                            g.classList.remove('stagger-cards');
                            void g.offsetWidth;
                            g.classList.add('stagger-cards');
                        });
                    }
                });
            });
        }
        function initGameTabs() {
            // 初始化所有游戏网格
            renderGames(iodineGames, 'iodineGameGrid', false);
            renderGames(iodineDevGames, 'iodineDevGrid', true);
            renderGames(hydrogenGames, 'hydrogenGameGrid', false);
            renderGames(toolsGames, 'toolsGameGrid', false);
            // 初始化标签页切换
            initTabs();
        }
        // ======================= 化学多主题系统 =======================
        const themes = {
            'iodine-vapor': '碘蒸气',
            'mercury': '汞齐银',
            'sulfur': '硫磺焰',
            'cinnabar': '辰砂红',
            'copper-sulfate': '胆矾蓝',
            'carbon': '活性炭',
            'classic-light': '经典浅色',
            'classic-dark': '经典暗色',
            'tsukuyomi': '月读',
            'cyber': '科技'
        };
        function initTheme() {
            const themeBtn = document.getElementById('themeSwitcher');
            const themeDropdown = document.getElementById('themeDropdown');
            const savedTheme = localStorage.getItem('chemical-theme') || 'classic-light';
            // 应用保存的主题
            applyTheme(savedTheme);
            updateThemeUI(savedTheme);
            // 切换按钮点击事件
            themeBtn.addEventListener('click', () => {
                themeDropdown.classList.toggle('show');
            });
            // 点击外部关闭下拉菜单
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.theme-selector')) {
                    themeDropdown.classList.remove('show');
                }
            });
            // 主题选项点击事件
            document.querySelectorAll('.theme-option').forEach(option => {
                option.addEventListener('click', () => {
                    const theme = option.dataset.theme;
                    applyTheme(theme);
                    updateThemeUI(theme);
                    localStorage.setItem('chemical-theme', theme);
                    themeDropdown.classList.remove('show');
                    // 添加震荡波特效
                    createShockwave(option, false);
                });
            });
            // 监听其他页面的主题变化
            window.addEventListener('storage', (e) => {
                if (e.key === 'chemical-theme' && e.newValue) {
                    applyTheme(e.newValue);
                    updateThemeUI(e.newValue);
                }
            });
        }
        function applyTheme(theme) {
            const currentTheme = document.body.getAttribute('data-theme');
            const isSwitchingToTsukuyomi = theme === 'tsukuyomi' && currentTheme !== 'tsukuyomi';
            if (isSwitchingToTsukuyomi) {
                // 执行月读模式的特殊过渡
                executeTsukuyomiTransition(() => {
                    document.body.setAttribute('data-theme', theme);
                    document.body.classList.remove('dark');
                    manageHeroClasses(theme);
                    // 切换到月读模式时播放OPENING音乐
                    if (window.musicPlayer) {
                        window.musicPlayer.handleThemeChange(theme);
                    }
                });
            } else {
                // 执行月读模式的特殊过渡
                document.body.setAttribute('data-theme', theme);
                document.body.classList.remove('dark');
                manageHeroClasses(theme);
                // 切换主题时处理音乐
                if (window.musicPlayer && currentTheme !== theme) {
                    window.musicPlayer.handleThemeChange(theme);
                }
            }
        }
        function manageHeroClasses(theme) {
            const hero = document.querySelector('.hero');
            if (hero) {
                hero.classList.remove('vapor-animation-active');
                // 如果不是月读主题，添加蒸镀动画类
                if (theme !== 'tsukuyomi') {
                    setTimeout(() => {
                        hero.classList.add('vapor-animation-active');
                    }, 50);
                }
            }
        }
        function resetVaporDeposition() {
            const hero = document.querySelector('.hero');
            if (!hero) return;
                // 切换主题时处理音乐
            hero.classList.remove('vapor-animation-active');
            // 触发重排
            hero.offsetHeight;
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                hero.classList.add('vapor-animation-active');
            }, 50);
        }
        // 月读模式过渡效果
        function executeTsukuyomiTransition(callback) {
            // 创建过渡层
            const transitionLayer = document.createElement('div');
            transitionLayer.className = 'tsukuyomi-transition';
            transitionLayer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0);
                z-index: 9999;
                pointer-events: none;
            `;
            document.body.appendChild(transitionLayer);
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                transitionLayer.style.background = 'rgba(0, 0, 0, 0.95)';
                transitionLayer.style.transition = 'background 1.2s ease-in-out';
            }, 100);
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                // 完全切换到月读模式
                document.body.setAttribute('data-theme', 'tsukuyomi');
                document.body.classList.remove('dark');
                manageHeroClasses('tsukuyomi');
                // 光柱从中心爆发（在月读模式下）
                createLightPillar(transitionLayer);
            }, 1400);
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                createTsukuyomiParticles(transitionLayer);
            }, 2000);
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                illuminateMirrorball();
                spawnMirrorballBurst();
            }, 2500);
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                transitionLayer.style.background = 'rgba(0, 0, 0, 0)';
                transitionLayer.style.transition = 'background 1.0s ease-out';
                setTimeout(() => {
                    transitionLayer.remove();
                    callback();
                }, 1000);
            }, 4500);
        }
        // 创建光柱效果
        function createLightPillar(container) {
            const pillar = document.createElement('div');
            pillar.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                background: radial-gradient(circle, rgba(224, 64, 144, 0.8) 0%, rgba(0, 184, 212, 0.6) 40%, transparent 70%);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                transition: all 0.8s ease-out;
                box-shadow: 0 0 50px rgba(224, 64, 144, 0.6);
            `;
            container.appendChild(pillar);
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                pillar.style.width = '300vw';
                pillar.style.height = '300vh';
                pillar.style.opacity = '0.3';
            }, 100);
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                pillar.remove();
            }, 1000);
        }
        // 创建月读粒子效果
        function createTsukuyomiParticles(container) {
            const colors = ['#e04090', '#00b8d4', '#ffb74d'];
            const particleCount = 50;
            const particleElements = [];
            // 月读主题小物件列表
            const decorations = [
                'deco_neon-fish.png',
                'deco_neon-octopus.png',
                'deco_neon-cloud1.png',
                'deco_neon-cloud2.png',
                'icon_flash1.png',
                'icon_flash2.png',
                'icon_flash3.png'
            ];
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                const color = colors[Math.floor(Math.random() * colors.length)];
                const angle = (Math.PI * 2 * i) / particleCount;
                const distance = 100 + Math.random() * 200;
                particle.style.cssText = `
                    position: absolute;
                    width: ${2 + Math.random() * 4}px;
                    height: ${2 + Math.random() * 4}px;
                    background: ${color};
                    border-radius: 50%;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    opacity: 0;
                    box-shadow: 0 0 10px ${color};
                `;
                container.appendChild(particle);
                particleElements.push(particle);
                // 如果不是月读主题，添加蒸镀动画类
                setTimeout(() => {
                    particle.style.transition = 'all 1.2s ease-out';
                    particle.style.transform = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px))`;
                    particle.style.opacity = '0.8';
                }, 100 + i * 20);
            }
            const decorationCount = 5 + Math.floor(Math.random() * 3); // 5-7个小物件
            for (let i = 0; i < decorationCount; i++) {
                const decoration = document.createElement('div');
                const decorationType = decorations[Math.floor(Math.random() * decorations.length)];
                const size = 30 + Math.random() * 40; // 30-70px
                const x = 10 + Math.random() * 80; // 10-90% 水平位置
                const y = 10 + Math.random() * 80; // 10-90% 垂直位置
                decoration.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    background-image: url('effects/${decorationType}');
                    background-size: contain;
                    background-repeat: no-repeat;
                    background-position: center;
                    top: ${y}%;
                    left: ${x}%;
                    transform: translate(-50%, -50%) scale(0) rotate(${Math.random() * 360}deg);
                    opacity: 0;
                    transition: all 0.8s ease-out;
                    pointer-events: none;
                    z-index: 10;
                `;
                container.appendChild(decoration);
                particleElements.push(decoration);
                // 如果不是月读主题，添加蒸镀动画类
                setTimeout(() => {
                    decoration.style.transform = `translate(-50%, -50%) scale(1) rotate(${Math.random() * 360}deg)`;
                    decoration.style.opacity = '0.9';
                }, 800 + i * 200);
                // 如果不是月读主题，添加蒸镀动画类
                setTimeout(() => {
                    decoration.style.transition = 'all 1.0s ease-out';
                    decoration.style.transform = `translate(-50%, -50%) scale(0.5) rotate(${Math.random() * 720}deg)`;
                    decoration.style.opacity = '0';
                }, 2500 + i * 200);
            }
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                particleElements.forEach((particle, index) => {
                    setTimeout(() => {
                        particle.style.transition = 'opacity 1.0s ease-out';
                        particle.style.opacity = '0';
                    }, index * 30);
                });
            }, 2000);
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                particleElements.forEach(particle => particle.remove());
            }, 4500);
        }
        // 镜球亮起效果
        function illuminateMirrorball() {
            const mirrorball = document.querySelector('.tsukuyomi-mirrorball');
            if (!mirrorball) return;
            // 创建镜球光晕
            const glow = document.createElement('div');
            glow.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle, rgba(224, 64, 144, 0.6) 0%, transparent 70%);
                border-radius: 50%;
                transform: translate(-50%, -50%) scale(0);
                opacity: 0;
                transition: all 0.8s ease-out;
                pointer-events: none;
            `;
            mirrorball.appendChild(glow);
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                glow.style.transform = 'translate(-50%, -50%) scale(3)';
                glow.style.opacity = '1';
            }, 100);
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                glow.style.transition = 'opacity 0.5s ease-out';
                glow.style.opacity = '0';
                setTimeout(() => {
                    glow.remove();
                }, 500);
            }, 1500);
        }
        function spawnMirrorballBurst() {
            const mirrorball = document.querySelector('.tsukuyomi-mirrorball');
            if (!mirrorball) return;
            const rect = mirrorball.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const colors = ['#e04090','#00b8d4','#ffb74d','#fff','#ff6bb5','#40e0ff'];
            for (let i = 0; i < 60; i++) {
                const p = document.createElement('div');
                p.className = 'theme-burst-particle';
                const size = 3 + Math.random() * 6;
                const angle = Math.random() * Math.PI * 2;
                const dist = 80 + Math.random() * 400;
                const color = colors[Math.floor(Math.random() * colors.length)];
                p.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;border-radius:50%;' +
                    'width:' + size + 'px;height:' + size + 'px;background:' + color + ';' +
                    'left:' + (cx - size/2) + 'px;top:' + (cy - size/2) + 'px;' +
                    '--bx:' + (Math.cos(angle) * dist) + 'px;--by:' + (Math.sin(angle) * dist) + 'px;' +
                    'box-shadow:0 0 ' + (size*2) + 'px ' + color + ';' +
                    'animation:burst-fly ' + (0.8 + Math.random() * 1.2) + 's cubic-bezier(0,1,0.3,1) forwards;' +
                    'animation-delay:' + (Math.random() * 0.3) + 's;';
                document.body.appendChild(p);
                setTimeout(function() { p.remove(); }, 2000);
            }
        }

        function updateThemeUI(theme) {
            const themeBtn = document.getElementById('themeSwitcher');
            const themeName = document.querySelector('.theme-name');
            const themeOptions = document.querySelectorAll('.theme-option');
            // 更新按钮显示
            themeName.textContent = themes[theme];
            // 更新活动状态
            themeOptions.forEach(option => {
                option.classList.toggle('active', option.dataset.theme === theme);
            });
        }
        // ======================= 音乐播放器系统 =======================
        function initMusicPlayer() {
            // 音乐数据
            const musicData = {
                global: [
                    { file: 'ALL-FUSHI.mp3', title: 'FUSHI', duration: '3:40' },
                    { file: 'IROHA.mp3', title: "IROHA's Dancing All Night", duration: '1:30' },
                    { file: 'ALL-ヤチヨ降臨.mp3', title: 'ヤチヨ降臨', duration: '4:02' },
                    { file: 'ALL-私の好きだったもの.mp3', title: '私の好きだったもの', duration: '1:48' },
                    { file: 'All-月影.mp3', title: '月影', duration: '4:32' },
                    { file: 'His Theme.mp3', title: 'His Theme', duration: '3:30' }
                ],
                tsukuyomi: [
                    { file: 'OPENING ACT@TSUKUYOMI.mp3', title: 'OPENING ACT@TSUKUYOMI', duration: '3:38' },
                    { file: 'TSUKUYOMI.mp3', title: 'TSUKUYOMI', duration: '6:44' },
                    { file: 'IROHA.mp3', title: "IROHA's Dancing All Night", duration: '1:30' },
                    { file: 'うつし世の姫.mp3', title: 'うつし世の姫', duration: '6:43' },
                    { file: 'かぐやと彩葉.mp3', title: 'かぐやと彩葉', duration: '3:08' },
                    { file: 'His Theme.mp3', title: 'His Theme', duration: '3:30' }
                ]
            };
            // 音乐播放器状态 - 从localStorage恢复
            let currentMusic = localStorage.getItem('currentMusic') || null;
            let isPlaying = localStorage.getItem('musicPlaying') === 'true';
            let currentVolume = parseFloat(localStorage.getItem('musicVolume')) || 0.5;
            let audioElement = null;
            let fadeTimeout = null;
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
                audioElement.src = `voice/${musicFile}`;
                audioElement.play().then(() => {
                    currentMusic = musicFile;
                    localStorage.setItem('currentMusic', musicFile);
                    updateMusicUI();
                    smoothVolumeChange(currentVolume, 500);
                }).catch(err => {
                    console.error('音频加载错误:', err);
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
                const currentTheme = document.body.getAttribute('data-theme');
                const playlist = currentTheme === 'tsukuyomi' ? musicData.tsukuyomi : musicData.global;
                const currentIndex = playlist.findIndex(music => music.file === currentMusic);
                const nextIndex = (currentIndex + 1) % playlist.length;
                const nextMusic = playlist[nextIndex];
                playMusic(nextMusic.file);
            }
            // 获取当前播放列表
            function getCurrentPlaylist() {
                const currentTheme = document.body.getAttribute('data-theme');
                return currentTheme === 'tsukuyomi' ? musicData.tsukuyomi : musicData.global;
            }
            // 更新音乐UI
            function updateMusicUI() {
                const musicStatus = document.getElementById('musicStatus');
                const playPauseBtn = document.getElementById('musicPlayPauseBtn');
                if (musicStatus) {
                    musicStatus.textContent = isPlaying ? '正在播放' : '暂停';
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
            // 加载并播放音乐
                                audioElement.play().then(() => {
                                    isPlaying = true;
                                    smoothVolumeChange(currentVolume, 500);
                                    updateMusicUI();
                                });
                            } else {
            // 更新播放列表UI
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
                // 更新播放列表UI
                updatePlaylistUI();
                updateMusicUI();
            }
            // 主题切换时的音乐处理
            function handleThemeChange(newTheme) {
                if (newTheme === 'tsukuyomi') {
                    // 切换到月读模式，播放OPENING音乐
                    const openingMusic = musicData.tsukuyomi.find(m => m.file === 'OPENING ACT@TSUKUYOMI.mp3');
                    if (openingMusic) {
                        playMusic(openingMusic.file);
                    }
                } else {
                    // 切换到其他主题，播放全局音乐
                    const playlist = musicData.global;
                    if (playlist.length > 0) {
                        playMusic(playlist[0].file);
                    }
                }
            }
            // 恢复之前的播放状态
            function restorePlaybackState() {
                if (currentMusic) {
            // 加载并播放音乐
                    createAudioElement();
                    audioElement.src = `voice/${currentMusic}`;
            // 加载并播放音乐
                    audioElement.play().then(() => {
                        // 恢复音量
                        smoothVolumeChange(currentVolume, 1000);
                        updateMusicUI();
                    }).catch(err => {
                        console.error('音频播放错误:', err);
                        // 恢复失败，播放随机音乐
                        autoPlayRandomMusic();
                    });
                } else {
                        // 恢复失败，播放随机音乐
                    autoPlayRandomMusic();
                }
            }
            // 自动播放随机音乐
            function autoPlayRandomMusic() {
                const currentTheme = document.body.getAttribute('data-theme') || 'tsukuyomi';
                const playlist = currentTheme === 'tsukuyomi' ? musicData.tsukuyomi : musicData.global;
                if (playlist.length > 0) {
                    // 随机选择一首音乐
                    const randomIndex = Math.floor(Math.random() * playlist.length);
                    const randomMusic = playlist[randomIndex];
                // 如果不是月读主题，添加蒸镀动画类
                    setTimeout(() => {
                        playMusic(randomMusic.file);
                    }, 1000);
                }
            }
            // 初始化
            initMusicUI();
            restorePlaybackState();
            // 暴露全局方法
            window.musicPlayer = {
                play: playMusic,
                pause: pauseMusic,
                stop: stopMusic,
                next: playNextMusic,
                handleThemeChange: handleThemeChange,
                autoPlay: autoPlayInitialMusic
            };
        }
        // ======================= 分子Canvas动画 =======================
        function initMoleculeCanvas() {
            const canvas = document.getElementById('moleculeCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const hero = document.querySelector('.hero');
            function resizeCanvas() {
                const rect = hero.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                // 科技模式：窗口缩放后重建二进制雨列
                if (window.cyberDrops) initCyberRain();
            }
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
            // 鼠标交互
            let mouseX = null;
            let mouseY = null;
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                mouseX = e.clientX - rect.left;
                mouseY = e.clientY - rect.top;
            });
            canvas.addEventListener('mouseleave', () => {
                mouseX = null;
                mouseY = null;
            });
            // 分子数据（增加碘分子I₂）
            const molecules = [
                { x: 100, y: 100, vx: 0.5, vy: 0.3, angle: 0, bondLength: 30, anchorX: 100, anchorY: 100, type: 'diatomic' },
                { x: 300, y: 150, vx: -0.3, vy: 0.4, angle: 45, bondLength: 35, anchorX: 300, anchorY: 150, type: 'diatomic' },
                { x: 500, y: 80, vx: 0.4, vy: -0.2, angle: 90, bondLength: 32, anchorX: 500, anchorY: 80, type: 'diatomic' },
                { x: 200, y: 200, vx: -0.2, vy: -0.3, angle: 120, bondLength: 28, anchorX: 200, anchorY: 200, type: 'diatomic' },
                { x: 400, y: 250, vx: 0.3, vy: 0.2, angle: 30, bondLength: 25, anchorX: 400, anchorY: 250, type: 'diatomic' },
                { x: 150, y: 300, vx: -0.4, vy: 0.1, angle: 60, bondLength: 30, anchorX: 150, anchorY: 300, type: 'diatomic' },
                { x: 350, y: 120, vx: 0.2, vy: -0.4, angle: 15, bondLength: 0, anchorX: 350, anchorY: 120, type: 'water' },
                { x: 250, y: 180, vx: 0.08, vy: 0.05, angle: 90, bondLength: 50, anchorX: 250, anchorY: 180, type: 'iodine', color: '#5c2d91', glowColor: '#9b3d6b' }
            ];
            function getMoleculeColors(isDark) {
                if (isDark) {
                    return [
                        { atom1: '#c4b5fd', atom2: '#e9d5ff', bond: 'rgba(139, 92, 246, 0.4)' },
                        { atom1: '#fcd34d', atom2: '#fde68a', bond: 'rgba(217, 119, 6, 0.4)' },
                        { atom1: '#93c5fd', atom2: '#bfdbfe', bond: 'rgba(59, 130, 246, 0.4)' },
                        { atom1: '#86efac', atom2: '#bbf7d0', bond: 'rgba(16, 185, 129, 0.4)' },
                        { atom1: '#fca5a5', atom2: '#f87171', bond: 'rgba(239, 68, 68, 0.4)' },
                        { atom1: '#c7d2fe', atom2: '#a5b4fc', bond: 'rgba(99, 102, 241, 0.4)' },
                        { atom1: '#93c5fd', atom2: '#60a5fa', atom3: '#3b82f6', bond: 'rgba(59, 130, 246, 0.4)' }
                    ];
                } else {
                    return [
                        { atom1: '#a78bfa', atom2: '#c4b5fd', bond: 'rgba(139, 92, 246, 0.3)' },
                        { atom1: '#fbbf24', atom2: '#f59e0b', bond: 'rgba(245, 158, 11, 0.3)' },
                        { atom1: '#60a5fa', atom2: '#3b82f6', bond: 'rgba(59, 130, 246, 0.3)' },
                        { atom1: '#34d399', atom2: '#10b981', bond: 'rgba(16, 185, 129, 0.3)' },
                        { atom1: '#f87171', atom2: '#ef4444', bond: 'rgba(239, 68, 68, 0.3)' },
                        { atom1: '#a5b4fc', atom2: '#818cf8', bond: 'rgba(99, 102, 241, 0.3)' },
                        { atom1: '#60a5fa', atom2: '#3b82f6', atom3: '#2563eb', bond: 'rgba(59, 130, 246, 0.3)' }
                    ];
                }
            }
            function drawMolecule(mol, colors) {
                ctx.save();
                ctx.translate(mol.x, mol.y);
                ctx.rotate(mol.angle * Math.PI / 180);
                if (mol.type === 'water') {
                    // 绘制水分子（H2O，V形）
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = colors.bond;
                    ctx.strokeStyle = colors.bond;
                    ctx.lineWidth = 2;
                    // 绘制两条化学键
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-20, 15);
                    ctx.moveTo(0, 0);
                    ctx.lineTo(20, 15);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    // 绘制氧原子（中心，较大）
                    const oxygenGradient = ctx.createRadialGradient(-2, -2, 1, 0, 0, 10);
                    oxygenGradient.addColorStop(0, 'rgba(255,255,255,0.8)');
                    oxygenGradient.addColorStop(0.3, colors.atom1);
                    oxygenGradient.addColorStop(1, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = oxygenGradient;
                    ctx.beginPath();
                    ctx.arc(0, 0, 10, 0, Math.PI * 2);
                    ctx.fill();
                    // 绘制氢原子1
                    const hydrogen1Gradient = ctx.createRadialGradient(-20-2, 15-2, 1, -20, 15, 6);
                    hydrogen1Gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
                    hydrogen1Gradient.addColorStop(0.3, colors.atom2);
                    hydrogen1Gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = hydrogen1Gradient;
                    ctx.beginPath();
                    ctx.arc(-20, 15, 6, 0, Math.PI * 2);
                    ctx.fill();
                    // 绘制氢原子2
                    const hydrogen2Gradient = ctx.createRadialGradient(20-2, 15-2, 1, 20, 15, 6);
                    hydrogen2Gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
                    hydrogen2Gradient.addColorStop(0.3, colors.atom3);
                    hydrogen2Gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = hydrogen2Gradient;
                    ctx.beginPath();
                    ctx.arc(20, 15, 6, 0, Math.PI * 2);
                    ctx.fill();
                } else if (mol.type === 'iodine') {
                    // 绘制碘分子I₂（两个大原子，长键）
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = mol.glowColor || '#9b3d6b';
                    ctx.strokeStyle = colors.bond;
                    ctx.lineWidth = 3;
                    ctx.setLineDash([5, 3]);
                    ctx.beginPath();
                    ctx.moveTo(-mol.bondLength/2, 0);
                    ctx.lineTo(mol.bondLength/2, 0);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    // 绘制碘原子1（大半径，深紫色）
                    const iodine1Gradient = ctx.createRadialGradient(-mol.bondLength/2-3, -3, 1, -mol.bondLength/2, 0, 12);
                    iodine1Gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
                    iodine1Gradient.addColorStop(0.2, mol.color || '#5c2d91');
                    iodine1Gradient.addColorStop(0.8, 'rgba(30,30,30,0.4)');
                    iodine1Gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = iodine1Gradient;
                    ctx.beginPath();
                    ctx.arc(-mol.bondLength/2, 0, 12, 0, Math.PI * 2);
                    ctx.fill();
                    // 绘制碘原子2（大半径，深紫色）
                    const iodine2Gradient = ctx.createRadialGradient(mol.bondLength/2-3, -3, 1, mol.bondLength/2, 0, 12);
                    iodine2Gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
                    iodine2Gradient.addColorStop(0.2, mol.color || '#5c2d91');
                    iodine2Gradient.addColorStop(0.8, 'rgba(30,30,30,0.4)');
                    iodine2Gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = iodine2Gradient;
                    ctx.beginPath();
                    ctx.arc(mol.bondLength/2, 0, 12, 0, Math.PI * 2);
                    ctx.fill();
                    // 碘分子周围的光晕效果
                    if (mouseX !== null && mouseY !== null) {
                        const dx = mol.x - mouseX;
                        const dy = mol.y - mouseY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < 100 && distance > 0) {
                            ctx.save();
                            ctx.globalAlpha = 0.3 * (1 - distance / 100);
                            ctx.fillStyle = mol.glowColor || '#9b3d6b';
                            ctx.beginPath();
                            ctx.arc(mol.x, mol.y, 20 + 10 * (1 - distance / 100), 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    }
                } else {
                    // 绘制水分子（H2O，V形）
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = colors.bond;
                    ctx.strokeStyle = colors.bond;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-mol.bondLength/2, 0);
                    ctx.lineTo(mol.bondLength/2, 0);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                    // 绘制原子1（带径向渐变的球体效果）
                    const atom1Gradient = ctx.createRadialGradient(-mol.bondLength/2-2, -2, 1, -mol.bondLength/2, 0, 8);
                    atom1Gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
                    atom1Gradient.addColorStop(0.3, colors.atom1);
                    atom1Gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = atom1Gradient;
                    ctx.beginPath();
                    ctx.arc(-mol.bondLength/2, 0, 8, 0, Math.PI * 2);
                    ctx.fill();
                    // 绘制原子2（带径向渐变的球体效果）
                    const atom2Gradient = ctx.createRadialGradient(mol.bondLength/2-2, -2, 1, mol.bondLength/2, 0, 8);
                    atom2Gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
                    atom2Gradient.addColorStop(0.3, colors.atom2);
                    atom2Gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
                    ctx.fillStyle = atom2Gradient;
                    ctx.beginPath();
                    ctx.arc(mol.bondLength/2, 0, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
            // 视口检测暂停动画
            let animationId = null;
            let isPaused = false;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (isPaused) {
                            isPaused = false;
                            animate();
                        }
                    } else {
                        isPaused = true;
                        if (animationId) {
                            cancelAnimationFrame(animationId);
                            animationId = null;
                        }
                    }
                });
            }, { threshold: 0.1 });
            observer.observe(hero);
            // ======================= 月读粒子系统 =======================
            function initTsukuyomiParticles() {
                // 月读粒子数据
                window.tsukuyomiParticles = [];
                const colors = ['#e04090', '#00b8d4', '#ffb74d'];
                const notes = ['♪', '♫', '♩'];
                for (let i = 0; i < 40; i++) {
                    window.tsukuyomiParticles.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: (Math.random() - 0.5) * 0.5,
                        size: Math.random() * 3 + 1,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        opacity: Math.random() * 0.5 + 0.3,
                        breathPhase: Math.random() * Math.PI * 2,
                        // 前 50% 粒子为音符（彩叶的歌声《Remember》主题）
                        note: i < 20 ? notes[Math.floor(Math.random() * notes.length)] : null
                    });
                }
                // 兔子彩蛋定时器
                window.rabbitTimer = null;
                window.rabbitActive = false;
            }
            function drawTsukuyomiParticles() {
                // 绘制月读粒子
                window.tsukuyomiParticles.forEach(particle => {
                    // 更新位置
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    // 边界反弹
                    if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
                    if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
                    // 呼吸式闪烁
                    particle.breathPhase += 0.05;
                    const breathOpacity = particle.opacity * (0.7 + 0.3 * Math.sin(particle.breathPhase));
            // 分子数据（增加碘分子I₂）
                    ctx.save();
                    ctx.globalAlpha = breathOpacity;
                    if (particle.note) {
                        // 音符粒子：飘动的歌声符号（1.5 倍大小）
                        ctx.font = (particle.size * 5.1) + 'px "Segoe UI Symbol", "Noto Music", serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = particle.color;
                        ctx.shadowBlur = 12;
                        ctx.shadowColor = particle.color;
                        ctx.fillText(particle.note, particle.x, particle.y);
                    } else {
                        // 普通光点粒子
                        ctx.fillStyle = particle.color;
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = particle.color;
                        ctx.beginPath();
                        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.restore();
                });
                // 偶尔混入碘蒸气粒子
                if (Math.random() < 0.02) {
                    const iodineParticle = window.tsukuyomiParticles.find(p => p.color === '#5c2d91');
                    if (!iodineParticle) {
                        window.tsukuyomiParticles.push({
                            x: Math.random() * canvas.width,
                            y: Math.random() * canvas.height,
                            vx: (Math.random() - 0.5) * 0.3,
                            vy: (Math.random() - 0.5) * 0.3,
                            size: 2,
                            color: '#5c2d91',
                            opacity: 0.4,
                            breathPhase: Math.random() * Math.PI * 2
                        });
                    }
                }
            }
            // 初始化月读粒子系统
            initTsukuyomiParticles();
            // ======================= 科技模式特效（二进制数据雨 + 电流电弧） =======================
            function initCyberRain() {
                const fontSize = 16;
                const cols = Math.max(1, Math.ceil(canvas.width / fontSize));
                window.cyberDrops = [];
                for (let i = 0; i < cols; i++) {
                    window.cyberDrops.push(Math.floor(Math.random() * -120));
                }
            }
            function drawCyberRain(ctx) {
                const fontSize = 16;
                // 半透明拖尾（不 clearRect，模拟数据雨残影）
                ctx.fillStyle = 'rgba(4, 6, 15, 0.10)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.font = 'bold ' + fontSize + 'px Consolas, "Courier New", monospace';
                const chars = '010101';
                for (let i = 0; i < window.cyberDrops.length; i++) {
                    const char = chars[Math.floor(Math.random() * chars.length)];
                    const x = i * fontSize;
                    const y = window.cyberDrops[i] * fontSize;
                    // 大部分青色，偶发品红亮点
                    ctx.fillStyle = Math.random() < 0.92 ? 'rgba(0, 240, 255, 0.85)' : 'rgba(255, 0, 168, 0.9)';
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = '#00f0ff';
                    ctx.fillText(char, x, y);
                    ctx.shadowBlur = 0;
                    if (y > canvas.height + 40 && Math.random() > 0.975) {
                        window.cyberDrops[i] = Math.floor(Math.random() * -60);
                    }
                    window.cyberDrops[i]++;
                }
            }
            function genCyberArc() {
                const x1 = Math.random() * canvas.width;
                const y1 = -10;
                const x2 = Math.random() * canvas.width;
                const y2 = Math.random() * canvas.height * 0.6;
                const segs = 5 + Math.floor(Math.random() * 4);
                const pts = [{ x: x1, y: y1 }];
                for (let i = 1; i < segs; i++) {
                    pts.push({
                        x: x1 + ((x2 - x1) * i) / segs + (Math.random() - 0.5) * 46,
                        y: y1 + ((y2 - y1) * i) / segs + (Math.random() - 0.5) * 36
                    });
                }
                pts.push({ x: x2, y: y2 });
                return pts;
            }
            function drawCyberArcs(ctx) {
                // 随机生成新电弧
                if (Math.random() < 0.02) {
                    window.cyberArcs = window.cyberArcs || [];
                    window.cyberArcs.push({ points: genCyberArc(), life: 1 });
                }
                if (!window.cyberArcs) return;
                window.cyberArcs = window.cyberArcs.filter(a => a.life > 0);
                window.cyberArcs.forEach(arc => {
                    arc.life -= 0.06;
                    const alpha = Math.max(0, arc.life);
                    ctx.beginPath();
                    ctx.moveTo(arc.points[0].x, arc.points[0].y);
                    for (let i = 1; i < arc.points.length; i++) ctx.lineTo(arc.points[i].x, arc.points[i].y);
                    ctx.strokeStyle = 'rgba(0, 240, 255, ' + (alpha * 0.85) + ')';
                    ctx.lineWidth = 1.6;
                    ctx.shadowBlur = 14;
                    ctx.shadowColor = '#00f0ff';
                    ctx.stroke();
                    // 白色核心
                    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (alpha * 0.4) + ')';
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                });
            }
            initCyberRain();
            function animate() {
                if (isPaused) return;
                const theme = document.body.getAttribute('data-theme');
                const isTsukuyomi = theme === 'tsukuyomi';
                const isCyber = theme === 'cyber';
                if (isCyber) {
                    // 科技模式：二进制数据雨 + 电流电弧（保留拖尾，不 clearRect）
                    drawCyberRain(ctx);
                    drawCyberArcs(ctx);
                } else {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    if (isTsukuyomi) {
                        // 月读粒子系统
                        drawTsukuyomiParticles();
                    } else {
                        // 原始分子系统
                        const isDark = document.body.classList.contains('dark');
                    const colors = getMoleculeColors(isDark);
                    molecules.forEach((mol, index) => {
                        // 更新位置
                        mol.x += mol.vx;
                        mol.y += mol.vy;
                        mol.angle += 0.5;
                    // 边界弹簧力（软边界）
                    const edgeForce = 0.001;
                    const margin = 50;
                    if (mol.x < margin) mol.vx += edgeForce * (margin - mol.x);
                    if (mol.x > canvas.width - margin) mol.vx -= edgeForce * (mol.x - (canvas.width - margin));
                    if (mol.y < margin) mol.vy += edgeForce * (margin - mol.y);
                    if (mol.y > canvas.height - margin) mol.vy -= edgeForce * (mol.y - (canvas.height - margin));
                    // 各自锚点的简谐力
                        mol.vx += (mol.anchorX - mol.x) * 0.0001;
                        mol.vy += (mol.anchorY - mol.y) * 0.0001;
                    // 碘分子周围的光晕效果
                        if (mouseX !== null && mouseY !== null) {
                            const dx = mol.x - mouseX;
                            const dy = mol.y - mouseY;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            if (distance < 100 && distance > 0) {
                                const repelForce = 0.02 * (100 - distance) / 100;
                                mol.vx += (dx / distance) * repelForce;
                                mol.vy += (dy / distance) * repelForce;
                            }
                        }
                        // 为碘分子使用特殊颜色
                        const molColors = mol.type === 'iodine' ? 
                            { atom1: mol.color || '#5c2d91', atom2: mol.color || '#5c2d91', bond: 'rgba(92,45,145,0.4)' } : 
                            colors[index];
                        drawMolecule(mol, molColors);
                    });
                    }
                }
                animationId = requestAnimationFrame(animate);
            }
            animate();
        }
        // ======================= 初始化 =======================
        function initSupabase() {
            try {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                // 监听登录状态变化
                supabase.auth.onAuthStateChange(() => {
                    updateAuthUI();
                });
                updateAuthUI();
            } catch(e) {
                console.warn('Supabase init failed:', e);
            }
        }
        // 触发入场动画
        function triggerEntranceAnimation() {
                // 如果不是月读主题，添加蒸镀动画类
            setTimeout(() => {
                document.body.classList.add('loaded');
            }, 100);
        }
        // 定容燃烧按钮特效
        function initCombustionEffects() {
            function createShockwave(button, isDanger = false) {
                const shockwave = document.createElement('div');
                shockwave.className = 'shockwave';
            // 初始化月读粒子系统
                const isTsukuyomi = document.body.getAttribute('data-theme') === 'tsukuyomi';
                if (isTsukuyomi) {
                    // 月读主题：白光加偏彩光的震荡波
                    shockwave.style.background = 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, var(--tsuki-accent) 30%, var(--tsuki-accent-cyan) 60%, transparent 70%)';
                } else if (isDanger) {
                    // 危险操作：红光震荡波
                    shockwave.style.background = 'radial-gradient(circle, rgba(255,0,0,0.3) 0%, transparent 70%)';
                } else {
                    // 普通主题：白光震荡波
                    shockwave.style.background = 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)';
                }
                button.appendChild(shockwave);
                // 如果不是月读主题，添加蒸镀动画类
                setTimeout(() => {
                    shockwave.classList.add('active');
                }, 10);
                // 如果不是月读主题，添加蒸镀动画类
                setTimeout(() => {
                    shockwave.remove();
                }, 600);
            }
            function triggerCombustion(button, isDanger = false) {
                // 添加燃烧动画类
                button.classList.add(isDanger ? 'combustion-danger' : 'combustion-active');
                // 创建冲击波
                createShockwave(button, isDanger);
                // 如果不是月读主题，添加蒸镀动画类
                setTimeout(() => {
                    button.classList.remove('combustion-active', 'combustion-danger');
                }, 600);
            }
            // 点击外部关闭下拉菜单
            document.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (!button) return;
                // 判断是否为危险操作
                const isDanger = button.classList.contains('logout-btn') || 
                               button.textContent?.includes('退出') ||
                               button.textContent?.includes('注销');
                triggerCombustion(button, isDanger);
            });
        }
        // 初始化认证相关元素
        modal = document.getElementById('authModal');
        modalTitle = document.getElementById('modalTitle');
        loginEmail = document.getElementById('loginEmail');
        loginPassword = document.getElementById('loginPassword');
        authError = document.getElementById('authError');
        switchBtn = document.getElementById('switchAuthBtn');
        submitBtn = document.getElementById('submitAuthBtn');
        closeModalBtn = document.getElementById('closeModalBtn');
        // 绑定模态框按钮
        switchBtn.onclick = () => {
            if (currentAuthMode === 'login') showAuthModal('register');
            else showAuthModal('login');
        };
        submitBtn.onclick = handleAuthSubmit;
        closeModalBtn.onclick = hideAuthModal;
        modal.onclick = (e) => { if (e.target === modal) hideAuthModal(); };
        initSupabase();
        initGameTabs(); // 使用新的游戏标签页系统
        initTheme();
        initMoleculeCanvas();
        triggerEntranceAnimation();
        initCombustionEffects();
        initMusicPlayer();
        initTutorial();
    });

    // ======================= 新手引导 =======================
    const TUTORIAL_STEPS = [
        {
            emoji: '🧪',
            title: '欢迎来到碘队化学游戏工坊！',
            desc: '这里汇集了多款<span class="tutorial-highlight">化学主题</span>的原创小游戏，从古代炼丹到现代塔防，带你用化学的视角探索游戏世界。'
        },
        {
            emoji: '🎮',
            title: '点击游戏卡片即可开始',
            desc: '每个游戏都是一扇通往化学世界的大门。卡片上标有<span class="tutorial-highlight">游戏类型</span>和简介，选一个感兴趣的开始吧！'
        },
        {
            emoji: '🔥',
            title: '新玩家推荐：丹道化学Pro',
            desc: '从<span class="tutorial-highlight">寻龙点穴</span>挖矿开始→<span class="tutorial-highlight">现代实验室</span>提纯→<span class="tutorial-highlight">九鼎神丹</span>炼丹，完整的化学炼金体验等你探索！'
        },
        {
            emoji: '☁️',
            title: '登录后享受更多功能',
            desc: '点击右上角<span class="tutorial-highlight">登录/注册</span>，可开启云存档、全服排行榜、成就系统和在线留言！'
        }
    ];

    function showTutorial(onClose) {
        let currentStep = 0;

        // 先移除已存在的引导遮罩（避免重复）
        const existing = document.querySelector('.tutorial-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        // 内联关键样式，确保不被主题CSS覆盖
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:99999;display:flex;justify-content:center;align-items:center;';
        document.body.appendChild(overlay);

        function render() {
            const s = TUTORIAL_STEPS[currentStep];
            const dots = TUTORIAL_STEPS.map(function(_, i) {
                var cls = 'tutorial-dot';
                if (i === currentStep) cls += ' active';
                else if (i < currentStep) cls += ' done';
                return '<span class="' + cls + '"></span>';
            }).join('');

            var isLast = currentStep === TUTORIAL_STEPS.length - 1;

            overlay.innerHTML =
                '<div class="tutorial-dialog" style="background:' + getComputedStyle(document.body).getPropertyValue('--bg-card').trim() + ';border-radius:1.5rem;padding:2rem;max-width:480px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:2px solid ' + getComputedStyle(document.body).getPropertyValue('--accent').trim() + ';color:' + getComputedStyle(document.body).getPropertyValue('--text-primary').trim() + ';">' +
                    '<div class="tutorial-step-indicator">' + dots + '</div>' +
                    '<div class="tutorial-emoji" style="font-size:3.5rem;margin-bottom:0.8rem;">' + s.emoji + '</div>' +
                    '<div class="tutorial-title" style="font-size:1.3rem;font-weight:bold;color:' + getComputedStyle(document.body).getPropertyValue('--accent').trim() + ';margin-bottom:0.6rem;">' + s.title + '</div>' +
                    '<div class="tutorial-desc" style="font-size:0.95rem;color:' + getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() + ';line-height:1.6;margin-bottom:1.5rem;">' + s.desc + '</div>' +
                    '<div class="tutorial-buttons" style="display:flex;gap:0.8rem;justify-content:center;flex-wrap:wrap;">' +
                        '<button class="tutorial-btn ghost" id="tutorialSkip" style="padding:0.7rem 1.8rem;border-radius:2rem;border:1px solid ' + getComputedStyle(document.body).getPropertyValue('--border').trim() + ';background:transparent;color:' + getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() + ';font-size:0.9rem;font-weight:bold;cursor:pointer;">跳过引导</button>' +
                        '<button class="tutorial-btn primary" id="tutorialNext" style="padding:0.7rem 1.8rem;border-radius:2rem;border:none;background:' + getComputedStyle(document.body).getPropertyValue('--accent').trim() + ';color:white;font-size:0.9rem;font-weight:bold;cursor:pointer;">' + (isLast ? '开始探索 🚀' : '下一步 →') + '</button>' +
                    '</div>' +
                '</div>';

            document.getElementById('tutorialSkip').onclick = close;
            document.getElementById('tutorialNext').onclick = function() {
                if (isLast) { close(); }
                else { currentStep++; render(); }
            };
        }

        function close() {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity .3s';
            setTimeout(function() { overlay.remove(); }, 300);
            if (onClose) onClose();
        }

        overlay.onclick = function(e) { if (e.target === overlay) close(); };
        render();
    }

    // ======================= 卡片hover粒子迸发 =======================
    function spawnCardParticles(card, cx, cy) {
        const rect = card.getBoundingClientRect();
        const colors = ['#facc15','#f59e0b','#ef4444','#3b82f6','#22c55e','#a855f7','#e04090'];
        const count = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'card-particle';
            const size = 3 + Math.random() * 5;
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 60;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist;
            const color = colors[Math.floor(Math.random() * colors.length)];
            p.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;border-radius:50%;' +
                'width:' + size + 'px;height:' + size + 'px;background:' + color + ';' +
                'left:' + (cx - size/2) + 'px;top:' + (cy - size/2) + 'px;' +
                'opacity:1;transition:all .6s cubic-bezier(0,1,0.5,1);';
            document.body.appendChild(p);
            requestAnimationFrame(function() {
                p.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
                p.style.opacity = '0';
            });
            setTimeout(function() { p.remove(); }, 650);
        }
    }

    function initTutorial() {
        const TUTORIAL_KEY = 'iodine_tutorial_done';

        // 绑定手动触发按钮（始终可用）
        const triggerBtn = document.getElementById('tutorialTriggerBtn');
        if (triggerBtn) {
            triggerBtn.onclick = () => showTutorial(null);
        }

        // 首次访问自动弹出
        if (localStorage.getItem(TUTORIAL_KEY)) return;
        showTutorial(() => localStorage.setItem(TUTORIAL_KEY, '1'));
    }
