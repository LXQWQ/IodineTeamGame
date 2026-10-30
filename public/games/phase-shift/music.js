/* 相转移大作战 · 共享音乐播放器（从原 app.js 原样抽离，勿改逻辑） */
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
