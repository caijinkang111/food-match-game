/**
 * 美食匹配大作战 - 修复版（兼容电脑和平板）
 */

class AudioImageGame {
    constructor() {
        this.gameState = 'gaming'; // 直接开始游戏
        this.isInitialized = false;
        this.isDragging = false;
        this.draggingIndex = -1;
        this.dragOffset = { x: 0, y: 0 };
        this.correctMatches = [];
        this.currentPlayingAudio = -1;
        
        // 游戏数据
        this.images = [];
        this.audios = [];
        this.imagePositions = [];
        this.platePositions = [];
        this.audioButtonPositions = [];
        this.originalPositions = [];
        this.imageToAudioMap = {};
        this.matchedPlateIndices = {};
        
        // 游戏配置 - 自适应大小，只使用5张图片
        this.config = {
            matchesNeeded: 5, // 只使用5张图片
            imageSize: 150,
            plateSize: 150,
            audioButtonSize: 40,
            colors: {
                white: '#ffffff',
                black: '#000000',
                button: '#FF6B6B',
                buttonHover: '#FF8E8E',
                green: '#4ECDC4',
                red: '#FF6B6B',
                gray: '#c8c8c8',
                plate: '#F8F3D6',
                plateBorder: '#E6D1A9'
            }
        };
        
        // 音频管理 - 默认开启
        this.audioEnabled = true;
        this.audioElements = {};
        this.loadedAudioCount = 0;
        this.totalAudioCount = 9; // 5个配对音频 + 3个音效 + 盘子图片 + 笑脸图片
        
        // 音频播放状态管理 - 修改：只有主音频（1.mp3~5.mp3）互斥，音效不受限制
        this.isMainAudioPlaying = false; // 主音频（按钮音频）播放状态
        this.currentMainAudioElement = null; // 当前播放的主音频元素
        
        // 图片资源
        this.backgroundImage = null;
        this.foodImages = {};
        this.plateImage = null;
        this.smileImage = null;
        
        // DOM元素
        this.canvas = null;
        this.ctx = null;
        this.loadingScreen = null;
        
        // 画布固定大小和设备像素比
        this.fixedCanvasWidth = 0;
        this.fixedCanvasHeight = 0;
        this.scaleFactor = 1;
        this.dpr = 1;
        
        // 笑脸图片位置信息
        this.smileButton = {
            visible: false,
            x: 0,
            y: 0,
            size: 120, // 适当大小
            drawX: 0,
            drawY: 0,
            drawSize: 0
        };
        
        // 初始化
        this.init();
    }
    
    // 初始化游戏
    init() {
        console.log('初始化游戏...');
        
        // 获取DOM元素
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.loadingScreen = document.getElementById('loading-screen');
        
        // 计算并设置固定画布尺寸
        this.calculateAndSetCanvasSize();
        
        // 加载资源
        this.loadResources().then(() => {
            console.log('资源加载完成');
            this.isInitialized = true;
            this.hideLoadingScreen();
            this.setupEventListeners();
            
            // 直接开始游戏
            this.startGame();
            
            this.gameLoop();
        }).catch(error => {
            console.error('资源加载失败:', error);
            this.showError('资源加载失败，请刷新页面');
        });
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }
    
    // 计算并设置画布大小
    calculateAndSetCanvasSize() {
        const clientWidth = document.documentElement.clientWidth;
        const clientHeight = document.documentElement.clientHeight;
        
        console.log(`设备视口大小: ${clientWidth}x${clientHeight}`);
        
        const baseWidth = 1200;
        const baseHeight = 800;
        
        const scaleX = clientWidth / baseWidth;
        const scaleY = clientHeight / baseHeight;
        this.scaleFactor = Math.min(scaleX, scaleY, 1.2);
        
        this.fixedCanvasWidth = Math.round(baseWidth * this.scaleFactor);
        this.fixedCanvasHeight = Math.round(baseHeight * this.scaleFactor);
        
        console.log(`计算后画布大小: ${this.fixedCanvasWidth}x${this.fixedCanvasHeight}, 缩放因子: ${this.scaleFactor}`);
        
        this.dpr = window.devicePixelRatio || 1;
        console.log(`设备像素比（DPR）: ${this.dpr}`);
        
        this.canvas.style.width = `${this.fixedCanvasWidth}px`;
        this.canvas.style.height = `${this.fixedCanvasHeight}px`;
        
        this.canvas.width = Math.round(this.fixedCanvasWidth * this.dpr);
        this.canvas.height = Math.round(this.fixedCanvasHeight * this.dpr);
        
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        console.log('Canvas尺寸:', {
            'css宽度': this.canvas.style.width,
            'css高度': this.canvas.style.height,
            '实际宽度': this.canvas.width,
            '实际高度': this.canvas.height,
            '设备像素比': this.dpr
        });
    }
    
    // 加载资源
    async loadResources() {
        console.log('加载游戏资源...');
        
        // 加载食物图片（只加载1-5）
        await this.loadFoodImages();
        
        // 加载盘子图片
        await this.loadPlateImage();
        
        // 加载笑脸图片
        await this.loadSmileImage();
        
        // 加载音频（只加载1-5）
        await this.loadAudioFiles();
        
        return Promise.resolve();
    }
    
    // 加载食物图片（只加载1-5）
    async loadFoodImages() {
        const imagePromises = [];
        
        for (let i = 1; i <= 5; i++) {
            const promise = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.foodImages[`food_${i}`] = img;
                    this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                    resolve();
                };
                img.onerror = () => {
                    this.createPlaceholderImage(i);
                    this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                    resolve();
                };
                img.src = `assets/images/${i}.jpg`;
            });
            imagePromises.push(promise);
        }
        
        await Promise.all(imagePromises);
    }
    
    // 加载盘子图片
    async loadPlateImage() {
        return new Promise((resolve) => {
            this.plateImage = new Image();
            this.plateImage.onload = () => {
                this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                resolve();
            };
            this.plateImage.onerror = () => {
                console.warn('盘子图片加载失败，使用备用图形');
                this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                resolve();
            };
            this.plateImage.src = 'assets/images/panzi.jpg';
        });
    }
    
    // 加载笑脸图片
    async loadSmileImage() {
        return new Promise((resolve) => {
            this.smileImage = new Image();
            this.smileImage.onload = () => {
                this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                resolve();
            };
            this.smileImage.onerror = () => {
                console.warn('笑脸图片加载失败，使用备用图形');
                this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                resolve();
            };
            this.smileImage.src = 'assets/images/smile.jpg';
        });
    }
    
    // 创建替代图片
    createPlaceholderImage(index) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2'];
        const color = colors[(index - 1) % colors.length];
        
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 300, 300);
        
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 5;
        ctx.strokeRect(10, 10, 280, 280);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 100px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(index, 150, 150);
        
        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        this.foodImages[`food_${index}`] = img;
    }
    
    // 加载音频文件（只加载1-5）
    async loadAudioFiles() {
        const audioPromises = [];
        
        // 加载配对音频 (1-5)
        for (let i = 1; i <= 5; i++) {
            const audio = new Audio();
            const promise = new Promise((resolve) => {
                audio.oncanplaythrough = () => {
                    this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                    resolve();
                };
                audio.onerror = () => {
                    console.warn(`音频 ${i}.mp3 加载失败`);
                    this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                    resolve();
                };
                audio.src = `assets/audio/${i}.mp3`;
            });
            audioPromises.push(promise);
            
            // 为主音频元素添加结束事件监听器（用于互斥播放）
            audio.addEventListener('ended', () => {
                this.onMainAudioEnded();
            });
            audio.addEventListener('error', () => {
                this.onMainAudioEnded();
            });
            
            this.audioElements[`audio_${i}`] = audio;
        }
        
        // 加载音效
        const soundEffects = [
            { key: 'correct', file: 'r.mp3' },
            { key: 'wrong', file: 'f.mp3' },
            { key: 'complete', file: 'all_right.mp3' }
        ];
        
        for (const effect of soundEffects) {
            const audio = new Audio();
            const promise = new Promise((resolve) => {
                audio.oncanplaythrough = () => {
                    this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                    resolve();
                };
                audio.onerror = () => {
                    console.warn(`音效 ${effect.file} 加载失败`);
                    this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                    resolve();
                };
                audio.src = `assets/audio/${effect.file}`;
            });
            audioPromises.push(promise);
            
            // 音效不需要添加结束事件监听器，因为它们可以同时播放
            this.audioElements[effect.key] = audio;
        }
        
        await Promise.all(audioPromises);
    }
    
    // 更新加载进度
    updateLoadingProgress(percentage) {
        const progressBar = document.getElementById('loading-progress');
        const percentageText = document.getElementById('loading-percentage');
        
        if (progressBar && percentageText) {
            progressBar.style.width = `${percentage}%`;
            percentageText.textContent = `${percentage}%`;
        }
    }
    
    // 隐藏加载屏幕
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 500);
        }
    }
    
    // 显示错误信息
    showError(message) {
        const loadingText = this.loadingScreen.querySelector('.loading-text p');
        if (loadingText) {
            loadingText.textContent = message;
            loadingText.style.color = '#e74c3c';
        }
    }
    
    // 设置事件监听
    setupEventListeners() {
        // 画布鼠标事件
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // 触摸事件
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    }
    
    // 处理键盘事件
    handleKeyDown(e) {
        switch (e.key) {
            case ' ':
                // 空格键不再有功能
                break;
        }
    }
    
    // 开始游戏
    startGame() {
        console.log('开始游戏');
        
        this.gameState = 'gaming';
        this.correctMatches = new Array(this.config.matchesNeeded).fill(false);
        this.isDragging = false;
        this.draggingIndex = -1;
        this.matchedPlateIndices = {};
        this.currentPlayingAudio = -1;
        
        // 隐藏笑脸
        this.smileButton.visible = false;
        
        this.selectFixedPairs();
        this.calculatePositions();
    }
    
    // 选择固定配对
    selectFixedPairs() {
        this.images = [];
        this.audios = [];
        this.imageToAudioMap = {};
        
        // 图片固定顺序：从左至右依次为5.jpg、3.jpg、1.jpg、2.jpg、4.jpg
        const imageOrder = [5, 3, 1, 2, 4];
        
        // 音频按钮固定顺序：从左至右依次为1.mp3、2.mp3、3.mp3、4.mp3、5.mp3
        const audioOrder = [1, 2, 3, 4, 5];
        
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            this.images.push(`food_${imageOrder[i]}`);
            this.audios.push(`audio_${audioOrder[i]}`);
        }
        
        // 建立映射关系 - 根据图片数字找到对应的音频索引
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            const imageIndex = imageOrder[i];
            for (let j = 0; j < this.config.matchesNeeded; j++) {
                const audioIndex = audioOrder[j];
                if (imageIndex === audioIndex) {
                    this.imageToAudioMap[i] = j;
                    break;
                }
            }
        }
        
        console.log('图片顺序:', imageOrder);
        console.log('音频顺序:', audioOrder);
        console.log('映射关系:', this.imageToAudioMap);
    }
    
    // 计算位置
    calculatePositions() {
        const canvasWidth = this.fixedCanvasWidth;
        const canvasHeight = this.fixedCanvasHeight;
        
        const imageSize = this.config.imageSize * this.scaleFactor;
        const plateSize = this.config.plateSize * this.scaleFactor;
        const audioButtonSize = this.config.audioButtonSize * this.scaleFactor;
        
        // 计算间距
        const totalWidthNeeded = this.config.matchesNeeded * imageSize;
        const availableSpace = canvasWidth - totalWidthNeeded;
        const spacing = Math.max(availableSpace / (this.config.matchesNeeded + 1), 20 * this.scaleFactor);
        
        const topMargin = 60 * this.scaleFactor;
        const plateOffset = 200 * this.scaleFactor;
        const audioButtonOffset = 25 * this.scaleFactor;
        
        const xPositions = [];
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            xPositions.push(spacing + i * (imageSize + spacing));
        }
        
        this.imagePositions = [];
        this.originalPositions = [];
        
        // 图片按固定顺序排列（不再随机）
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            const x = xPositions[i];
            const y = topMargin;
            this.imagePositions.push({ x, y });
            this.originalPositions.push({ x, y });
        }
        
        this.platePositions = [];
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            const x = xPositions[i];
            const y = topMargin + imageSize + plateOffset;
            this.platePositions.push({ x, y });
        }
        
        this.audioButtonPositions = [];
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            const plateX = this.platePositions[i].x;
            const plateY = this.platePositions[i].y;
            const x = plateX + (imageSize - audioButtonSize) / 2;
            const y = plateY + plateSize + audioButtonOffset;
            this.audioButtonPositions.push({ 
                x, 
                y, 
                size: audioButtonSize,
                drawX: x * this.dpr,
                drawY: y * this.dpr,
                drawSize: audioButtonSize * this.dpr
            });
        }
        
        this.currentSizes = {
            imageSize,
            plateSize,
            audioButtonSize,
            scaleFactor: this.scaleFactor,
            drawImageSize: imageSize * this.dpr,
            drawPlateSize: plateSize * this.dpr,
            drawAudioButtonSize: audioButtonSize * this.dpr
        };
        
        // 计算笑脸位置
        this.calculateSmilePosition();
    }
    
    // 计算笑脸位置（垂直居中，距离顶部适当位置）
    calculateSmilePosition() {
        const canvasWidth = this.fixedCanvasWidth;
        const canvasHeight = this.fixedCanvasHeight;
        
        // 笑脸大小（CSS像素）
        const smileSize = this.smileButton.size * this.scaleFactor;
        
        // 笑脸位置：垂直居中，距离顶部适当位置（在画布内）
        this.smileButton.x = (canvasWidth - smileSize) / 2;
        this.smileButton.y = 20 * this.scaleFactor; // 距离顶部20px
        
        // 转换为绘制坐标
        this.smileButton.drawX = this.smileButton.x * this.dpr;
        this.smileButton.drawY = this.smileButton.y * this.dpr;
        this.smileButton.drawSize = smileSize * this.dpr;
    }
    
    // 处理鼠标按下 - 修复：游戏结束后音频按钮仍然可以点击
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = cssX * scaleX;
        const y = cssY * scaleY;
        
        // 检查音频按钮（在所有游戏状态下都可以点击）
        for (let i = 0; i < this.audioButtonPositions.length; i++) {
            const pos = this.audioButtonPositions[i];
            const size = pos.drawSize;
            const buttonX = pos.drawX;
            const buttonY = pos.drawY;
            const centerX = buttonX + size / 2;
            const centerY = buttonY + size / 2;
            
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            
            if (distance <= size / 2) {
                console.log(`点击了音频按钮 ${i} (音频: ${this.audios[i]})`);
                this.playAudio(i);
                return;
            }
        }
        
        // 检查图片拖动（只在游戏进行中且图片未匹配时允许）
        if (this.gameState === 'gaming') {
            for (let i = 0; i < this.imagePositions.length; i++) {
                if (this.correctMatches[i]) continue;
                
                const pos = this.imagePositions[i];
                const size = this.currentSizes.drawImageSize;
                const imageX = pos.x * this.dpr;
                const imageY = pos.y * this.dpr;
                
                if (x >= imageX && x <= imageX + size && y >= imageY && y <= imageY + size) {
                    this.isDragging = true;
                    this.draggingIndex = i;
                    this.dragOffset.x = (x - imageX) / this.dpr;
                    this.dragOffset.y = (y - imageY) / this.dpr;
                    break;
                }
            }
        }
    }
    
    // 处理鼠标移动
    handleMouseMove(e) {
        if (!this.isDragging || this.draggingIndex === -1) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (cssX * scaleX) / this.dpr;
        const y = (cssY * scaleY) / this.dpr;
        
        this.imagePositions[this.draggingIndex].x = x - this.dragOffset.x;
        this.imagePositions[this.draggingIndex].y = y - this.dragOffset.y;
    }
    
    // 处理鼠标释放
    handleMouseUp(e) {
        if (!this.isDragging || this.draggingIndex === -1) return;
        
        this.isDragging = false;
        const draggedIndex = this.draggingIndex;
        const draggedPos = this.imagePositions[draggedIndex];
        const imageSize = this.currentSizes.imageSize;
        let isMatched = false;
        
        for (let i = 0; i < this.platePositions.length; i++) {
            const platePos = this.platePositions[i];
            const plateSize = this.currentSizes.plateSize;
            
            const isColliding = this.checkCollision(
                draggedPos.x, draggedPos.y, imageSize, imageSize,
                platePos.x, platePos.y, plateSize, plateSize
            );
            
            if (isColliding) {
                isMatched = true;
                
                if (this.imageToAudioMap[draggedIndex] === i) {
                    this.correctMatches[draggedIndex] = true;
                    this.matchedPlateIndices[draggedIndex] = i;
                    
                    // 修复：图片底端和盘子顶端重合，两者垂直居中对齐
                    // 水平居中：盘子x坐标 + (盘子宽度 - 图片宽度) / 2
                    // 垂直位置：盘子y坐标 - 图片高度 (使图片底端与盘子顶端重合)
                    this.imagePositions[draggedIndex].x = platePos.x + (plateSize - imageSize) / 2;
                    this.imagePositions[draggedIndex].y = platePos.y - imageSize;
                    
                    // 修复：匹配正确时播放 r.mp3 音效
                    this.playSound('correct');
                    
                    // 检查是否完成
                    if (this.correctMatches.every(match => match)) {
                        this.completeGame();
                    }
                } else {
                    // 错误匹配
                    this.imagePositions[draggedIndex] = {
                        x: this.originalPositions[draggedIndex].x,
                        y: this.originalPositions[draggedIndex].y
                    };
                    // 错误匹配时播放 f.mp3
                    this.playSound('wrong');
                }
                
                this.draggingIndex = -1;
                return;
            }
        }
        
        // 未匹配到盘子（没有碰撞）
        if (!isMatched) {
            this.imagePositions[draggedIndex] = {
                x: this.originalPositions[draggedIndex].x,
                y: this.originalPositions[draggedIndex].y
            };
            // 没有将图片拖到盘子感应区域时，不播放任何音效
        }
        
        this.draggingIndex = -1;
    }
    
    // 检查矩形碰撞
    checkCollision(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw &&
               ax + aw > bx &&
               ay < by + bh &&
               ay + ah > by;
    }
    
    // 处理触摸事件
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isDragging) return;
        
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup');
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    // 播放音频（按钮音频，1.mp3~5.mp3）
    playAudio(audioIndex) {
        if (!this.audioEnabled) return;
        
        // 检查是否已经有主音频正在播放
        if (this.isMainAudioPlaying) {
            console.log('已有主音频正在播放，等待当前音频结束');
            return;
        }
        
        this.currentPlayingAudio = audioIndex;
        
        const audioKey = this.audios[audioIndex];
        if (this.audioElements[audioKey]) {
            this.isMainAudioPlaying = true;
            this.currentMainAudioElement = this.audioElements[audioKey];
            
            this.audioElements[audioKey].currentTime = 0;
            this.audioElements[audioKey].play().catch(e => {
                console.log(`播放音频失败: ${e}`);
                this.onMainAudioEnded();
            });
        }
        
        this.draw();
        
        // 1秒后清除高亮显示（如果音频还在播放，会持续高亮）
        setTimeout(() => {
            if (this.currentPlayingAudio === audioIndex) {
                this.currentPlayingAudio = -1;
                this.draw();
            }
        }, 1000);
    }
    
    // 播放音效（不受互斥限制）
    playSound(soundType) {
        if (!this.audioEnabled || !this.audioElements[soundType]) return;
        
        // 音效不受互斥限制，可以直接播放
        const audio = this.audioElements[soundType];
        
        // 克隆音频元素以实现音效可以同时播放
        const audioClone = audio.cloneNode();
        audioClone.currentTime = 0;
        audioClone.play().catch(e => {
            console.log(`播放音效失败: ${e}`);
        });
        
        // 音频播放结束后移除克隆元素
        audioClone.addEventListener('ended', () => {
            audioClone.remove();
        });
        
        audioClone.addEventListener('error', () => {
            audioClone.remove();
        });
    }
    
    // 主音频播放结束处理
    onMainAudioEnded() {
        this.isMainAudioPlaying = false;
        this.currentMainAudioElement = null;
        console.log('主音频播放结束，可以播放下一个主音频');
    }
    
    // 完成游戏
    completeGame() {
        console.log('游戏完成!');
        this.gameState = 'completed';
        
        // 显示笑脸
        this.smileButton.visible = true;
        
        // 修复：全部匹配成功游戏结束时播放 all_right.mp3 音效
        this.playSound('complete');
    }
    
    // 游戏主循环
    gameLoop() {
        if (!this.isInitialized) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGame();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // 绘制游戏界面
    drawGame() {
        const ctx = this.ctx;
        
        // 白色背景
        ctx.fillStyle = this.config.colors.white;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制盘子
        for (let i = 0; i < this.platePositions.length; i++) {
            const pos = this.platePositions[i];
            const size = this.currentSizes.drawPlateSize;
            const x = pos.x * this.dpr;
            const y = pos.y * this.dpr;
            
            if (this.plateImage && this.plateImage.complete) {
                ctx.drawImage(this.plateImage, x, y, size, size);
            } else {
                ctx.fillStyle = this.config.colors.plate;
                ctx.beginPath();
                ctx.ellipse(
                    x + size / 2,
                    y + size / 2,
                    size * 0.45,
                    size * 0.35,
                    0, 0, Math.PI * 2
                );
                ctx.fill();
                
                ctx.strokeStyle = this.config.colors.plateBorder;
                ctx.lineWidth = 3 * this.dpr * this.scaleFactor;
                ctx.stroke();
            }
        }
        
        // 绘制未匹配的图片
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            if (this.correctMatches[i]) continue;
            
            const imgKey = this.images[i];
            const img = this.foodImages[imgKey];
            const pos = this.imagePositions[i];
            const size = this.currentSizes.drawImageSize;
            const x = pos.x * this.dpr;
            const y = pos.y * this.dpr;
            
            if (img && img.complete) {
                if (this.isDragging && i === this.draggingIndex) {
                    ctx.globalAlpha = 0.7;
                }
                
                this.roundImage(ctx, img, x, y, size, size, 15 * this.dpr * this.scaleFactor);
                ctx.globalAlpha = 1.0;
                
                ctx.strokeStyle = this.config.colors.black;
                ctx.lineWidth = 2 * this.dpr * this.scaleFactor;
                this.roundRect(ctx, x - 2 * this.dpr, y - 2 * this.dpr, size + 4 * this.dpr, size + 4 * this.dpr, 17 * this.dpr * this.scaleFactor);
                ctx.stroke();
            }
        }
        
        // 绘制已正确匹配的图片
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            if (!this.correctMatches[i]) continue;
            
            const imgKey = this.images[i];
            const img = this.foodImages[imgKey];
            const pos = this.imagePositions[i];
            const size = this.currentSizes.drawImageSize;
            const x = pos.x * this.dpr;
            const y = pos.y * this.dpr;
            
            if (img && img.complete) {
                this.roundImage(ctx, img, x, y, size, size, 15 * this.dpr * this.scaleFactor);
                
                ctx.strokeStyle = this.config.colors.green;
                ctx.lineWidth = 4 * this.dpr * this.scaleFactor;
                this.roundRect(ctx, x - 2 * this.dpr, y - 2 * this.dpr, size + 4 * this.dpr, size + 4 * this.dpr, 17 * this.dpr * this.scaleFactor);
                ctx.stroke();
            }
        }
        
        // 绘制音频按钮
        for (let i = 0; i < this.audioButtonPositions.length; i++) {
            const pos = this.audioButtonPositions[i];
            const size = pos.drawSize;
            const x = pos.drawX;
            const y = pos.drawY;
            const centerX = x + size / 2;
            const centerY = y + size / 2;
            
            // 如果主音频正在播放且不是当前按钮，按钮显示为灰色
            if (this.isMainAudioPlaying && i !== this.currentPlayingAudio) {
                ctx.fillStyle = this.config.colors.gray;
            } else {
                ctx.fillStyle = this.config.colors.button;
            }
            
            ctx.beginPath();
            ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = this.config.colors.black;
            ctx.lineWidth = 2 * this.dpr * this.scaleFactor;
            ctx.stroke();
            
            ctx.fillStyle = this.config.colors.white;
            ctx.beginPath();
            const iconSize = size * 0.4;
            ctx.moveTo(x + size * 0.35, y + size * 0.3);
            ctx.lineTo(x + size * 0.35, y + size * 0.7);
            ctx.lineTo(x + size * 0.7, y + size / 2);
            ctx.closePath();
            ctx.fill();
            
            // 高亮当前播放的音频
            if (i === this.currentPlayingAudio) {
                ctx.strokeStyle = this.config.colors.green;
                ctx.lineWidth = 3 * this.dpr * this.scaleFactor;
                ctx.beginPath();
                ctx.arc(centerX, centerY, size / 2 + 2 * this.dpr * this.scaleFactor, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // 绘制笑脸图片（如果游戏完成）
        if (this.gameState === 'completed' && this.smileButton.visible && this.smileImage && this.smileImage.complete) {
            const smileX = this.smileButton.drawX;
            const smileY = this.smileButton.drawY;
            const smileSize = this.smileButton.drawSize;
            
            // 绘制笑脸
            ctx.drawImage(this.smileImage, smileX, smileY, smileSize, smileSize);
            
            // 添加轻微发光效果
            ctx.shadowColor = 'rgba(255, 204, 0, 0.5)';
            ctx.shadowBlur = 20 * this.dpr * this.scaleFactor;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // 绘制半透明光环
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(smileX + smileSize/2, smileY + smileSize/2, smileSize/2 + 5 * this.dpr * this.scaleFactor, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 204, 0, 0.5)';
            ctx.fill();
            ctx.globalAlpha = 1.0;
            
            // 重置阴影
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
    }
    
    // 绘制圆角矩形
    roundRect(ctx, x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    // 绘制圆角图片
    roundImage(ctx, img, x, y, width, height, radius) {
        ctx.save();
        this.roundRect(ctx, x, y, width, height, radius);
        ctx.clip();
        ctx.drawImage(img, x, y, width, height);
        ctx.restore();
    }
}

// 页面加载完成后启动游戏
window.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，启动游戏...');
    window.game = new AudioImageGame();
});

// 处理页面可见性变化
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('页面隐藏，暂停游戏');
    } else {
        console.log('页面显示，恢复游戏');
    }
});

// 防止拖拽默认行为
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());
