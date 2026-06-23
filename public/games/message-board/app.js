// 如果需要使用回复功能，请先在 Supabase 数据库中执行以下 SQL 创建 replies 表：
    /*
    CREATE TABLE IF NOT EXISTS replies (
        id BIGSERIAL PRIMARY KEY,
        feedback_time BIGINT NOT NULL,
        nickname TEXT NOT NULL,
        message TEXT NOT NULL,
        time BIGINT NOT NULL,
        time_fmt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_replies_feedback_time ON replies(feedback_time);
    */

    document.addEventListener('DOMContentLoaded', async () => {
        const SUPABASE_URL = 'https://supabase.iteamgame.dpdns.org';
        const SUPABASE_ANON_KEY = 'sb_publishable_wH0spS1pkkrKe6pu7AwUKA_2cSK95rG';
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const MAX_FEEDBACK = 50;
        
        // 主题同步功能 - 只跟随主页
        function initThemeSync() {
            const savedTheme = localStorage.getItem('chemical-theme') || 'tsukuyomi';
            
            // 应用保存的主题
            applyTheme(savedTheme);
            
            // 监听主页的主题变化
            window.addEventListener('storage', (e) => {
                if (e.key === 'chemical-theme' && e.newValue) {
                    applyTheme(e.newValue);
                }
            });
        }
        
        function applyTheme(theme) {
            document.body.setAttribute('data-theme', theme);
            document.body.classList.remove('dark'); // 移除旧的dark class
        }
        
        initThemeSync();
        initShockwaveEffects();

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m] || m));
        }

        // 获取当前用户昵称
        async function getCurrentUserNickname() {
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

        // 加载所有留言及其回复
        async function loadAllFeedbacksAndReplies() {
            // 获取留言
            const { data: feedbacks, error: fbError } = await supabase
                .from('feedbacks')
                .select('*')
                .order('time', { ascending: false })
                .limit(MAX_FEEDBACK);
            if (fbError) {
                console.error(fbError);
                return { feedbacks: [], replies: [] };
            }
            // 获取所有回复
            const { data: replies, error: repError } = await supabase
                .from('replies')
                .select('*')
                .order('time', { ascending: true });
            if (repError) {
                console.error(repError);
                return { feedbacks: feedbacks || [], replies: [] };
            }
            return { feedbacks: feedbacks || [], replies: replies || [] };
        }

        // 渲染留言列表（包含回复）
        async function renderFeedbacks() {
            const container = document.getElementById('msgList');
            if (!container) return;
            const { feedbacks, replies } = await loadAllFeedbacksAndReplies();
            const currentUser = await getCurrentUserNickname();
            if (!feedbacks || feedbacks.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding:1rem;">✨ 暂无留言，成为第一个留言的玩家吧～</div>';
                return;
            }
            // 将回复按 feedback_time 分组
            const repliesMap = new Map();
            for (const rep of replies) {
                const key = rep.feedback_time;
                if (!repliesMap.has(key)) repliesMap.set(key, []);
                repliesMap.get(key).push(rep);
            }
            let html = '';
            for (const fb of feedbacks) {
                const fbReplies = repliesMap.get(fb.time) || [];
                html += `
                    <div class="feedback-item" data-fb-time="${fb.time}">
                        <div><span class="fb-name">🧪 ${escapeHtml(fb.nickname)}</span><span class="fb-time">${fb.time_fmt}</span></div>
                        <div class="fb-text">${escapeHtml(fb.message)}</div>
                        <button class="reply-btn" data-time="${fb.time}">💬 回复</button>
                        <div class="reply-section" id="reply-section-${fb.time}">
                            ${renderReplies(fbReplies, currentUser)}
                        </div>
                        <div class="reply-input-container" id="reply-input-${fb.time}" style="display:none;">
                            <textarea id="reply-text-${fb.time}" rows="2" placeholder="写下你的回复..." maxlength="2000"></textarea>
                            <button class="reply-submit" data-time="${fb.time}">提交回复</button>
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
            // 绑定回复按钮事件
            document.querySelectorAll('.reply-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const fbTime = btn.dataset.time;
                    const inputDiv = document.getElementById(`reply-input-${fbTime}`);
                    if (inputDiv) inputDiv.style.display = inputDiv.style.display === 'none' ? 'block' : 'none';
                });
            });
            // 绑定提交回复事件
            document.querySelectorAll('.reply-submit').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const fbTime = btn.dataset.time;
                    const textarea = document.getElementById(`reply-text-${fbTime}`);
                    const message = textarea.value.trim();
                    if (!message) {
                        alert("回复内容不能为空");
                        return;
                    }
                    const nickname = await getCurrentUserNickname();
                    if (!nickname) {
                        alert("请先登录后再回复");
                        return;
                    }
                    const newReply = {
                        feedback_time: parseInt(fbTime),
                        nickname: nickname,
                        message: message,
                        time: Date.now(),
                        time_fmt: new Date().toLocaleString('zh-CN', { hour12: false })
                    };
                    const { error } = await supabase.from('replies').insert([newReply]);
                    if (error) {
                        console.error(error);
                        alert("回复失败，请重试");
                    } else {
                        textarea.value = '';
                        const inputDiv = document.getElementById(`reply-input-${fbTime}`);
                        if (inputDiv) inputDiv.style.display = 'none';
                        await renderFeedbacks(); // 重新渲染
                    }
                });
            });
            // 绑定删除回复事件（动态绑定，因为回复是动态生成的）
            document.querySelectorAll('.reply-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const replyId = btn.dataset.id;
                    const currentUserNick = await getCurrentUserNickname();
                    if (!currentUserNick) {
                        alert("请先登录");
                        return;
                    }
                    // 确认删除权限（后端会验证，前端先获取该回复的昵称）
                    const { data: reply, error: fetchErr } = await supabase
                        .from('replies')
                        .select('nickname')
                        .eq('id', replyId)
                        .single();
                    if (fetchErr || !reply) {
                        alert("回复不存在");
                        return;
                    }
                    if (reply.nickname !== currentUserNick) {
                        alert("只能删除自己的回复");
                        return;
                    }
                    const { error } = await supabase.from('replies').delete().eq('id', replyId);
                    if (error) {
                        alert("删除失败");
                    } else {
                        await renderFeedbacks();
                    }
                });
            });
        }

        // 渲染回复列表
        function renderReplies(replies, currentUser) {
            if (!replies.length) return '<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.3rem;">暂无回复</div>';
            let replyHtml = '';
            for (const rep of replies) {
                const isOwner = (currentUser === rep.nickname);
                replyHtml += `
                    <div class="reply-item">
                        <div>
                            <span class="reply-name">💬 ${escapeHtml(rep.nickname)}</span>
                            <span class="reply-time">${rep.time_fmt}</span>
                            ${isOwner ? `<span class="reply-delete" data-id="${rep.id}">删除</span>` : ''}
                        </div>
                        <div class="reply-text">${escapeHtml(rep.message)}</div>
                    </div>
                `;
            }
            return replyHtml;
        }

        // 发布留言
        async function publishFeedback(message) {
            const user = await getCurrentUserNickname();
            if (!user) return false;
            const newFb = {
                nickname: user,
                message: message,
                time: Date.now(),
                time_fmt: new Date().toLocaleString('zh-CN', { hour12: false })
            };
            const { error } = await supabase.from('feedbacks').insert([newFb]);
            if (error) {
                console.error(error);
                return false;
            }
            return true;
        }

        // 渲染输入区域
        async function renderInputArea() {
            const container = document.getElementById('inputArea');
            if (!container) return;
            const user = await getCurrentUserNickname();
            if (user) {
                container.innerHTML = `
                    <div style="margin-bottom: 0.5rem;">👤 当前登录：<strong>${escapeHtml(user)}</strong></div>
                    <textarea id="fbMessage" rows="3" placeholder="写下你对游戏的建议、捉虫或任何想法～" maxlength="2000"></textarea>
                    <div style="display: flex; justify-content: flex-end;">
                        <button id="sendBtn">📢 提交反馈</button>
                    </div>
                `;
                const sendBtn = document.getElementById('sendBtn');
                if (sendBtn) sendBtn.onclick = () => sendFeedbackHandler();
                const msgArea = document.getElementById('fbMessage');
                if (msgArea) {
                    msgArea.onkeypress = (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendFeedbackHandler();
                        }
                    };
                }
            } else {
                container.innerHTML = `
                    <div class="login-prompt">
                        🔐 请先 <a href="index.html">登录/注册</a> 后再留言，你的昵称会自动显示。
                    </div>
                `;
            }
        }

        async function sendFeedbackHandler() {
            const msgInput = document.getElementById('fbMessage');
            if (!msgInput) return;
            const message = msgInput.value.trim();
            if (!message) {
                alert("反馈内容不能为空～");
                return;
            }
            const success = await publishFeedback(message);
            if (success) {
                msgInput.value = '';
                await renderFeedbacks();
                alert("感谢反馈！AI-Yachiyo会认真阅读~");
            } else {
                alert("发送失败，请稍后重试");
            }
        }

        // 震荡波特效函数
        function createShockwave(element, isDanger = false) {
            const shockwave = document.createElement('div');
            shockwave.className = 'shockwave';
            shockwave.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                border-radius: 50%;
                transform: translate(-50%, -50%);
                transition: width 0.6s ease, height 0.6s ease, opacity 0.6s ease;
                pointer-events: none;
                z-index: 1000;
            `;
            
            // 根据主题设置震荡波颜色
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
            
            element.style.position = 'relative';
            element.appendChild(shockwave);
            
            // 触发动画
            setTimeout(() => {
                shockwave.style.width = '200px';
                shockwave.style.height = '200px';
                shockwave.style.opacity = '0';
            }, 10);
            
            // 清理元素
            setTimeout(() => {
                shockwave.remove();
            }, 600);
        }
        
        // 为所有按钮添加震荡波特效
        function initShockwaveEffects() {
            document.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (!button) return;
                
                // 判断是否为危险操作
                const isDanger = button.textContent?.includes('删除') || button.classList?.contains('danger');
                
                createShockwave(button, isDanger);
            });
        }
        
        // 更新用户信息显示
        async function updateUserInfo() {
            const container = document.getElementById('userInfoArea');
            if (!container) return;
            const user = await getCurrentUserNickname();
            if (user) {
                container.innerHTML = `🧪 当前登录：${escapeHtml(user)} <span style="font-size:0.7rem;">(不是本人？<a href="index.html" style="color: var(--accent);">重新登录</a>)</span>`;
            } else {
                container.innerHTML = `🔐 未登录 | <a href="index.html" style="color: var(--accent);">前往登录/注册</a>`;
            }
        }

        // 深色主题
        function initTheme() {
            const isDark = localStorage.getItem('theme') === 'dark';
            if (isDark) document.body.classList.add('dark');
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

        initTheme();
        initSharedMusicPlayer(); // 初始化共享音乐播放器
        await updateUserInfo();
        await renderFeedbacks();
        await renderInputArea();

        // 监听登录状态变化
        supabase.auth.onAuthStateChange(async () => {
            await updateUserInfo();
            await renderInputArea();
            await renderFeedbacks();
        });
    });