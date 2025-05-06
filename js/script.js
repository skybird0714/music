document.addEventListener('DOMContentLoaded', () => {
    // 设置随机背景并启动自动切换
    setRandomBackground();
    startBackgroundRotation();
    
    // 默认专辑封面 - 使用数据URI嵌入一个简单的音乐图标SVG
    const DEFAULT_ALBUM_COVER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMjU2Ij48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iIzMzMzMzMyIvPjxjaXJjbGUgY3g9IjEyOCIgY3k9IjEyOCIgcj0iNjQiIGZpbGw9IiM2NjY2NjYiLz48Y2lyY2xlIGN4PSIxMjgiIGN5PSIxMjgiIHI9IjIwIiBmaWxsPSIjMzMzMzMzIi8+PHBhdGggZD0iTTEyOCwxMjggTDEyOCw2NCIgc3Ryb2tlPSIjY2NjY2NjIiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjx0ZXh0IHg9IjEyOCIgeT0iMTk2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNmZmZmZmYiPk11c2ljPC90ZXh0Pjwvc3ZnPg==';
    
    // DOM 元素
    const uploadArea = document.getElementById('uploadArea');
    const fileUpload = document.getElementById('fileUpload');
    const playerInfo = document.getElementById('playerInfo');
    const albumCover = document.getElementById('albumCover');
    const songTitle = document.getElementById('songTitle');
    const artistName = document.getElementById('artistName');
    const lyrics = document.getElementById('lyrics');
    const progressBar = document.getElementById('progressBar');
    const progressHandle = document.getElementById('progressHandle');
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');
    const playBtn = document.getElementById('playBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const playlistContainer = document.getElementById('playlistContainer');
    const multiUpload = document.getElementById('multiUpload');
    const playMode = document.getElementById('playMode');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // 音频对象
    const audio = new Audio();
    
    // 状态管理
    let playlist = [];
    let currentSongIndex = -1;
    let isPlaying = false;
    let isDragging = false;
    
    // 初始化
    function init() {
        // 从本地存储加载播放列表
        loadPlaylistFromStorage();

        // 拖放上传
        setupDragAndDrop();
        
        // 事件监听
        setupEventListeners();
        
        // 更新播放列表UI
        renderPlaylist();
    }
    
    // 从本地存储加载播放列表
    function loadPlaylistFromStorage() {
        const savedPlaylist = localStorage.getItem('musicPlayerPlaylist');
        if (savedPlaylist) {
            try {
                const parsedPlaylist = JSON.parse(savedPlaylist);
                
                // 检查解析出来的是否为数组
                if (Array.isArray(parsedPlaylist) && parsedPlaylist.length > 0) {
                    console.log('成功加载播放列表', parsedPlaylist);
                    
                    // 我们不能直接从localStorage恢复Blob URL和File对象
                    // 因此我们需要通知用户，播放列表在刷新后需要重新上传文件
                    if (confirm('发现之前的播放列表记录，但由于浏览器限制，需要重新上传音乐文件。要清空之前的记录吗？')) {
                        playlist = [];
                        localStorage.removeItem('musicPlayerPlaylist');
                    }
                } else {
                    console.error('播放列表格式不正确');
                    playlist = [];
                }
            } catch (e) {
                console.error('解析播放列表失败:', e);
                playlist = [];
            }
        }
    }
    
    // 保存播放列表到本地存储
    function savePlaylistToStorage() {
        try {
            // 我们只保存歌曲的基本信息，不包括blob URL和文件对象
            const simplifiedPlaylist = playlist.map(song => ({
                title: song.title,
                artist: song.artist,
                albumCover: song.albumCover !== DEFAULT_ALBUM_COVER 
                    ? song.albumCover 
                    : null // 不保存默认封面
            }));
            
            localStorage.setItem('musicPlayerPlaylist', JSON.stringify(simplifiedPlaylist));
            console.log('播放列表已保存', simplifiedPlaylist);
        } catch (e) {
            console.error('保存播放列表失败:', e);
        }
    }
    
    // 设置拖放上传
    function setupDragAndDrop() {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('active');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('active');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('active');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        });
        
        uploadArea.addEventListener('click', () => {
            fileUpload.click();
        });
    }
    
    // 设置事件监听
    function setupEventListeners() {
        // 单个文件上传
        fileUpload.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
        
        // 批量文件上传
        multiUpload.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                Array.from(e.target.files).forEach(file => {
                    handleFileUpload(file, true);
                });
            }
        });
        
        // 播放/暂停按钮
        playBtn.addEventListener('click', togglePlay);
        
        // 上一首/下一首按钮
        prevBtn.addEventListener('click', playPrevious);
        nextBtn.addEventListener('click', playNext);
        
        // 进度条
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', handleSongEnd);
        
        progressBar.parentElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            updateProgressOnDrag(e);
        });
        
        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updateProgressOnDrag(e);
            }
        });
        
        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
            }
        });
        
        // 清空播放列表
        clearAllBtn.addEventListener('click', clearPlaylist);
    }
    
    // 处理文件上传
    function handleFileUpload(file, skipPlay = false) {
        if (!file.type.startsWith('audio/')) {
            alert('请上传音频文件');
            return;
        }
        
        // 创建URL
        const url = URL.createObjectURL(file);
        
        // 使用jsmediatags提取元数据
        extractMetadata(file, url, skipPlay);
    }
    
    // 提取音频元数据
    function extractMetadata(file, url, skipPlay) {
        if (typeof jsmediatags === 'undefined') {
            // 如果jsmediatags没有加载，动态加载
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js';
            script.onload = () => extractMetadata(file, url, skipPlay);
            document.head.appendChild(script);
            return;
        }
        
        // 使用jsmediatags提取元数据
        jsmediatags.read(file, {
            onSuccess: function(tag) {
                const tags = tag.tags;
                
                // 提取歌曲信息
                const title = tags.title || file.name.replace(/\.[^/.]+$/, "");
                const artist = tags.artist || '未知艺术家';
                
                // 提取专辑封面
                let picture = null;
                if (tags.picture) {
                    const { data, format } = tags.picture;
                    const base64String = arrayBufferToBase64(data);
                    picture = `data:${format};base64,${base64String}`;
                }
                
                // 创建歌曲对象
                const song = {
                    url,
                    title,
                    artist,
                    albumCover: picture || DEFAULT_ALBUM_COVER,
                    file
                };
                
                // 添加到播放列表
                addToPlaylist(song, skipPlay);
                
                // 如果需要，获取歌词
                fetchLyrics(title, artist);
            },
            onError: function(error) {
                console.error('Error extracting metadata:', error);
                
                // 使用文件名作为标题
                const song = {
                    url,
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: '未知艺术家',
                    albumCover: DEFAULT_ALBUM_COVER,
                    file
                };
                
                // 添加到播放列表
                addToPlaylist(song, skipPlay);
            }
        });
    }
    
    // ArrayBuffer 转 Base64
    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return window.btoa(binary);
    }
    
    // 添加歌曲到播放列表
    function addToPlaylist(song, skipPlay) {
        playlist.push(song);
        
        // 保存到本地存储
        savePlaylistToStorage();
        
        // 更新播放列表UI
        renderPlaylist();
        
        // 如果是第一首歌或者不跳过播放，则播放
        if (!skipPlay && (playlist.length === 1 || currentSongIndex === -1)) {
            currentSongIndex = playlist.length - 1;
            loadSong(currentSongIndex);
        }
    }
    
    // 渲染播放列表
    function renderPlaylist() {
        playlistContainer.innerHTML = '';
        
        if (playlist.length === 0) {
            playlistContainer.innerHTML = '<div class="playlist-empty">播放列表为空</div>';
            return;
        }
        
        playlist.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${index === currentSongIndex ? 'active' : ''}`;
            item.innerHTML = `
                <div class="playlist-item-info">
                    <div class="playlist-item-title">${song.title}</div>
                    <div class="playlist-item-artist">${song.artist}</div>
                </div>
                <div class="playlist-item-actions">
                    <button class="playlist-item-delete" data-index="${index}">删除</button>
                </div>
            `;
            
            // 点击播放歌曲
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('playlist-item-delete')) {
                    currentSongIndex = index;
                    loadSong(currentSongIndex);
                }
            });
            
            playlistContainer.appendChild(item);
        });
        
        // 删除按钮事件
        document.querySelectorAll('.playlist-item-delete').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.dataset.index);
                removeFromPlaylist(index);
            });
        });
    }
    
    // 从播放列表中删除
    function removeFromPlaylist(index) {
        // 如果删除的是当前播放的歌曲
        const isCurrentSong = index === currentSongIndex;
        
        // 删除URL对象，释放内存
        URL.revokeObjectURL(playlist[index].url);
        
        // 从播放列表中删除
        playlist.splice(index, 1);
        
        // 调整当前索引
        if (isCurrentSong) {
            if (playlist.length > 0) {
                currentSongIndex = index < playlist.length ? index : 0;
                loadSong(currentSongIndex);
            } else {
                audio.pause();
                currentSongIndex = -1;
                playerInfo.style.display = 'none';
                uploadArea.style.display = 'flex';
            }
        } else if (index < currentSongIndex) {
            currentSongIndex--;
        }
        
        // 保存到本地存储
        savePlaylistToStorage();
        
        // 更新播放列表UI
        renderPlaylist();
    }
    
    // 清空播放列表
    function clearPlaylist() {
        // 停止播放
        audio.pause();
        isPlaying = false;
        playBtn.textContent = '播放';
        
        // 释放所有URL对象
        playlist.forEach(song => {
            URL.revokeObjectURL(song.url);
        });
        
        // 清空播放列表
        playlist = [];
        currentSongIndex = -1;
        
        // 保存到本地存储
        savePlaylistToStorage();
        
        // 更新播放列表UI
        renderPlaylist();
        
        // 显示上传区域
        playerInfo.style.display = 'none';
        uploadArea.style.display = 'flex';
    }
    
    // 加载歌曲
    function loadSong(index) {
        if (index < 0 || index >= playlist.length) return;
        
        const song = playlist[index];
        
        // 更新界面
        albumCover.src = song.albumCover;
        songTitle.textContent = song.title;
        artistName.textContent = song.artist;
        
        // 加载音频
        audio.src = song.url;
        audio.load();
        
        // 播放
        audio.play().then(() => {
            isPlaying = true;
            playBtn.textContent = '暂停';
        }).catch(error => {
            console.error('Error playing audio:', error);
        });
        
        // 获取歌词
        fetchLyrics(song.title, song.artist);
        
        // 显示播放器信息
        uploadArea.style.display = 'none';
        playerInfo.style.display = 'flex';
        
        // 更新播放列表激活状态
        renderPlaylist();
    }
    
    // 切换播放/暂停
    function togglePlay() {
        if (currentSongIndex === -1) return;
        
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            playBtn.textContent = '播放';
        } else {
            audio.play();
            isPlaying = true;
            playBtn.textContent = '暂停';
        }
    }
    
    // 播放上一首
    function playPrevious() {
        if (playlist.length === 0) return;
        
        if (audio.currentTime > 5) {
            // 如果当前播放时间超过5秒，重新播放当前歌曲
            audio.currentTime = 0;
            return;
        }
        
        let newIndex;
        if (playMode.value === 'random') {
            newIndex = Math.floor(Math.random() * playlist.length);
        } else {
            newIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
        }
        
        currentSongIndex = newIndex;
        loadSong(currentSongIndex);
    }
    
    // 播放下一首
    function playNext() {
        if (playlist.length === 0) return;
        
        let newIndex;
        if (playMode.value === 'random') {
            newIndex = Math.floor(Math.random() * playlist.length);
        } else {
            newIndex = (currentSongIndex + 1) % playlist.length;
        }
        
        currentSongIndex = newIndex;
        loadSong(currentSongIndex);
    }
    
    // 歌曲结束处理
    function handleSongEnd() {
        if (playMode.value === 'single') {
            // 单曲循环
            audio.currentTime = 0;
            audio.play();
        } else {
            // 播放下一首
            playNext();
        }
    }
    
    // 更新进度条
    function updateProgress() {
        if (isDragging) return;
        
        const duration = audio.duration || 1;
        const currentTimeValue = audio.currentTime;
        const progressPercent = (currentTimeValue / duration) * 100;
        
        progressBar.style.width = `${progressPercent}%`;
        progressHandle.style.left = `${progressPercent}%`;
        
        // 更新时间显示
        currentTime.textContent = formatTime(currentTimeValue);
        totalTime.textContent = formatTime(duration);
    }
    
    // 拖动进度条更新
    function updateProgressOnDrag(e) {
        const progressBarRect = progressBar.parentElement.getBoundingClientRect();
        const clickX = e.clientX - progressBarRect.left;
        const progressWidth = progressBarRect.width;
        let progressPercent = (clickX / progressWidth) * 100;
        
        // 限制范围
        progressPercent = Math.max(0, Math.min(100, progressPercent));
        
        // 更新进度条
        progressBar.style.width = `${progressPercent}%`;
        progressHandle.style.left = `${progressPercent}%`;
        
        // 更新音频时间
        const duration = audio.duration || 1;
        const newTime = (progressPercent / 100) * duration;
        
        if (!isDragging) {
            // 如果不是拖动中，直接设置时间
            audio.currentTime = newTime;
        } else {
            // 如果是拖动中，只更新显示
            currentTime.textContent = formatTime(newTime);
            
            // 鼠标释放后设置时间
            document.addEventListener('mouseup', function setTime() {
                if (audio.readyState) {
                    audio.currentTime = newTime;
                }
                document.removeEventListener('mouseup', setTime);
            });
        }
    }
    
    // 格式化时间
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // 获取歌词
    async function fetchLyrics(title, artist) {
        try {
            // 确保歌手名和歌曲名不为空
            if (!title || !artist || artist === '未知艺术家') {
                lyrics.innerHTML = '<p>歌曲信息不完整，无法获取歌词</p>';
                return;
            }
            
            console.log(`正在获取歌词: ${title} - ${artist}`);
            
            // 使用gecimi.com API获取歌词
            const apiUrl = `https://gecimi.com/api/lyric/${encodeURIComponent(title)}/${encodeURIComponent(artist)}`;
            
            // 记录请求URL用于调试
            console.log('歌词API请求URL:', apiUrl);
            
            // 由于CORS限制，使用fetch直接请求可能会失败
            // 我们可以尝试使用不同的代理或提示用户
            lyrics.innerHTML = '<p>正在获取歌词...</p>';
            
            try {
                // 尝试直接请求
                const response = await fetch(apiUrl);
                const data = await response.json();
                processLyricsData(data);
            } catch (error) {
                console.error('直接获取歌词失败，尝试使用代理:', error);
                
                // 尝试使用CORS代理
                const corsProxies = [
                    'https://cors-anywhere.herokuapp.com/',
                    'https://api.allorigins.win/raw?url='
                ];
                
                // 依次尝试不同的代理
                for (const proxy of corsProxies) {
                    try {
                        const proxyUrl = proxy + encodeURIComponent(apiUrl);
                        console.log('尝试使用代理:', proxyUrl);
                        
                        const response = await fetch(proxyUrl);
                        const data = await response.json();
                        
                        // 如果成功获取数据
                        if (processLyricsData(data)) {
                            return; // 成功处理，退出函数
                        }
                    } catch (proxyError) {
                        console.error(`使用代理 ${proxy} 获取歌词失败:`, proxyError);
                    }
                }
                
                // 所有代理都失败了
                lyrics.innerHTML = '<p>获取歌词失败，可能是网络问题或API限制</p>' +
                    '<p>请参考README中的API配置说明</p>';
            }
        } catch (error) {
            console.error('获取歌词失败:', error);
            lyrics.innerHTML = '<p>获取歌词失败</p>';
        }
        
        // 处理歌词数据
        function processLyricsData(data) {
            console.log('歌词API返回数据:', data);
            
            if (data && data.code === 0 && data.result && data.result.length > 0) {
                // 获取第一个结果的歌词链接
                const lrcUrl = data.result[0].lrc;
                console.log('歌词URL:', lrcUrl);
                
                // 请求歌词内容
                fetch(lrcUrl)
                    .then(response => response.text())
                    .then(lyricsText => {
                        console.log('获取到的歌词内容:', lyricsText.substring(0, 100) + '...');
                        displayLyrics(lyricsText);
                        return true;
                    })
                    .catch(error => {
                        console.error('获取歌词内容失败:', error);
                        lyrics.innerHTML = '<p>获取歌词内容失败</p>';
                        return false;
                    });
            } else {
                console.log('未找到歌词或返回数据格式错误');
                lyrics.innerHTML = '<p>未找到歌词</p>';
                return false;
            }
        }
    }
    
    // 显示歌词
    function displayLyrics(lyricsText) {
        // 解析LRC格式歌词
        const lines = lyricsText.split('\n');
        let parsedLyrics = [];
        
        for (const line of lines) {
            const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
            const textRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
            
            const textMatch = line.match(textRegex);
            if (textMatch) {
                const text = textMatch[4].trim();
                if (text) {
                    let timeMatches;
                    while ((timeMatches = timeRegex.exec(line)) !== null) {
                        const minutes = parseInt(timeMatches[1]);
                        const seconds = parseInt(timeMatches[2]);
                        const milliseconds = parseInt(timeMatches[3]);
                        const time = minutes * 60 + seconds + milliseconds / 1000;
                        
                        parsedLyrics.push({
                            time,
                            text
                        });
                    }
                }
            }
        }
        
        // 按时间排序
        parsedLyrics.sort((a, b) => a.time - b.time);
        
        // 显示歌词
        lyrics.innerHTML = parsedLyrics
            .map(lyric => `<p data-time="${lyric.time}">${lyric.text}</p>`)
            .join('');
        
        // 设置歌词高亮
        audio.addEventListener('timeupdate', () => {
            const currentTime = audio.currentTime;
            
            // 找到当前应该高亮的歌词
            let currentLyricIndex = -1;
            for (let i = 0; i < parsedLyrics.length; i++) {
                if (parsedLyrics[i].time <= currentTime) {
                    currentLyricIndex = i;
                } else {
                    break;
                }
            }
            
            // 高亮当前歌词
            const lyricElements = lyrics.querySelectorAll('p');
            lyricElements.forEach((el, index) => {
                if (index === currentLyricIndex) {
                    el.classList.add('active');
                    
                    // 滚动到当前歌词
                    const lyricsContainer = lyrics.parentElement;
                    const scrollPosition = el.offsetTop - lyricsContainer.offsetHeight / 2 + el.offsetHeight / 2;
                    lyricsContainer.scrollTop = scrollPosition;
                } else {
                    el.classList.remove('active');
                }
            });
        });
    }
    
    // 设置随机背景
    function setRandomBackground() {
        const backgroundSlider = document.querySelector('.background-slider');
        const randomNum = Math.floor(Math.random() * 5) + 1; // 1-5的随机数
        backgroundSlider.style.backgroundImage = `url('images/${randomNum}.png')`;
    }
    
    // 启动背景图片自动轮换
    function startBackgroundRotation() {
        // 每60秒(1分钟)自动切换背景
        setInterval(() => {
            setRandomBackground();
        }, 60000);
    }
    
    // 初始化
    init();
}); 