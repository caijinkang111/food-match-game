/**
 * 美食匹配大作战 - 修复版（兼容电脑和平板）
 */

class AudioImageGame {
    constructor() {
        this.gameState = 'start_menu';
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
        
        // 游戏配置 - 自适应大小
        this.config = {
            matchesNeeded: 5,
            imageSize: 150,  // 基础大小，会按比例缩放
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
        
        // 音频管理 - 默认开启，不可关闭
        this.audioEnabled = true;
        this.audioElements = {};
        this.loadedAudioCount = 0;
        this.totalAudioCount = 14; // 10个配对音频 + 3个音效 + 盘子图片 + 笑脸图片
        
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
        this.dpr = 1; // 设备像素比
        
        // 新增：方向检测变量
        this.currentOrientation = this.getOrientation();
        
        // 初始化
        this.init();
    }
    
    // 新增：获取当前方向
    getOrientation() {
        const width = document.documentElement.clientWidth;
        const height = document.documentElement.clientHeight;
        return width > height ? 'landscape' : 'portrait';
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
        
        // 添加方向变化监听
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.calculateAndSetCanvasSize();
                this.draw();
            }, 100);
        });
        
        // 针对移动设备的方向变化事件
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.calculateAndSetCanvasSize();
                this.draw();
            }, 300);
        });
        
        // 加载资源
        this.loadResources().then(() => {
            console.log('资源加载完成');
            this.isInitialized = true;
            this.hideLoadingScreen();
            this.setupEventListeners();
            this.gameLoop();
        }).catch(error => {
            console.error('资源加载失败:', error);
            this.showError('资源加载失败，请刷新页面');
        });
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }
    
    // 修改：增强画布计算逻辑，根据方向调整
    calculateAndSetCanvasSize() {
        // 更新当前方向
        this.currentOrientation = this.getOrientation();
        
        // 更兼容的视口尺寸获取方式
        const clientWidth = document.documentElement.clientWidth;
        const clientHeight = document.documentElement.clientHeight;
        
        console.log(`设备视口大小: ${clientWidth}x${clientHeight}, 方向: ${this.currentOrientation}`);
        
        // 根据方向调整基础尺寸和缩放策略
        let baseWidth, baseHeight, maxScale;
        
        if (this.currentOrientation === 'landscape') {
            // 横屏模式：优先保证宽度完整显示，高度可滚动
            baseWidth = 1200;
            baseHeight = 800;
            maxScale = 1.5; // 横屏可以放大更多
        } else {
            // 竖屏模式：优先保证高度完整显示，宽度可适当压缩
            baseWidth = 1000; // 竖屏时稍微减小基础宽度
            baseHeight = 700; // 对应减小高度
            maxScale = 1.3;
        }
        
        // 计算缩放因子时，使用更智能的策略
        const scaleX = clientWidth / baseWidth;
        const scaleY = clientHeight / baseHeight;
        
        // 根据方向选择不同的缩放策略
        let scaleFactor;
        if (this.currentOrientation === 'landscape') {
            // 横屏：确保高度能完整显示，宽度可以按比例缩放
            scaleFactor = Math.min(scaleY, scaleX, maxScale);
        } else {
            // 竖屏：确保宽度能完整显示，高度可以按比例缩放
            scaleFactor = Math.min(scaleX, scaleY, maxScale);
        }
        
        this.scaleFactor = scaleFactor;
        
        // 根据缩放因子计算最终画布尺寸
        this.fixedCanvasWidth = Math.round(baseWidth * this.scaleFactor);
        this.fixedCanvasHeight = Math.round(baseHeight * this.scaleFactor);
        
        // 确保画布不会超过视口尺寸（留出一些边距）
        const maxWidth = clientWidth * 0.95;
        const maxHeight = clientHeight * 0.85;
        
        if (this.fixedCanvasWidth > maxWidth) {
            this.fixedCanvasWidth = Math.floor(maxWidth);
            this.scaleFactor = this.fixedCanvasWidth / baseWidth;
            this.fixedCanvasHeight = Math.round(baseHeight * this.scaleFactor);
        }
        
        if (this.fixedCanvasHeight > maxHeight) {
            this.fixedCanvasHeight = Math.floor(maxHeight);
            this.scaleFactor = this.fixedCanvasHeight / baseHeight;
            this.fixedCanvasWidth = Math.round(baseWidth * this.scaleFactor);
        }
        
        console.log(`计算后画布大小: ${this.fixedCanvasWidth}x${this.fixedCanvasHeight}, 缩放因子: ${this.scaleFactor}`);
        
        // 设备像素比处理保持不变
        this.dpr = window.devicePixelRatio || 1;
        console.log(`设备像素比（DPR）: ${this.dpr}`);
        
        // 设置画布尺寸
        this.canvas.style.width = `${this.fixedCanvasWidth}px`;
        this.canvas.style.height = `${this.fixedCanvasHeight}px`;
        this.canvas.width = Math.round(this.fixedCanvasWidth * this.dpr);
        this.canvas.height = Math.round(this.fixedCanvasHeight * this.dpr);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // 如果正在游戏中，重新计算位置
        if (this.gameState === 'gaming') {
            this.calculatePositions();
        }
    }
    
    // 加载资源
    async loadResources() {
        console.log('加载游戏资源...');
        
        // 加载背景图片
        await this.loadBackgroundImage();
        
        // 加载食物图片
        await this.loadFoodImages();
        
        // 加载盘子图片
        await this.loadPlateImage();
        
        // 加载笑脸图片
        await this.loadSmileImage();
        
        // 加载音频
        await this.loadAudioFiles();
        
        return Promise.resolve();
    }
    
    // 加载背景图片
    async loadBackgroundImage() {
        return new Promise((resolve) => {
            this.backgroundImage = new Image();
            this.backgroundImage.onload = () => {
                this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                resolve();
            };
            this.backgroundImage.onerror = () => {
                // 如果背景图片加载失败，使用备用颜色
                console.warn('背景图片加载失败，使用备用颜色');
                this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                resolve();
            };
            this.backgroundImage.src = 'assets/images/begin.jpg';
        });
    }
    
    // 加载食物图片
    async loadFoodImages() {
        const imagePromises = [];
        
        for (let i = 1; i <= 10; i++) {
            const promise = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.foodImages[`food_${i}`] = img;
                    this.updateLoadingProgress(Math.floor(++this.loadedAudioCount / this.totalAudioCount * 100));
                    resolve();
                };
                img.onerror = () => {
                    // 如果图片加载失败，创建替代图片
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
    
    // 加载音频文件
    async loadAudioFiles() {
        // 加载配对音频 (1-10)
        const audioPromises = [];
        
        for (let i = 1; i <= 10; i++) {
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
            this.audioElements[`audio_${i}`] = audio;
        }
        
        // 加载音效 - 包括 r.mp3 用于正确匹配
        const soundEffects = [
            { key: 'correct', file: 'r.mp3' },  // 匹配正确时的音效
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
        // 开始按钮
        document.getElementById('start-btn').addEventListener('click', () => {
            // 开始游戏时不播放音效
            this.startGame();
        });
        
        // 重新开始按钮
        document.getElementById('restart-btn').addEventListener('click', () => {
            // 重新开始游戏时不播放音效
            this.restartGame();
        });
        
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
                if (this.gameState === 'start_menu') {
                    this.startGame();
                } else if (this.gameState === 'completed') {
                    this.restartGame();
                }
                break;
        }
    }
    
    // 修改：开始游戏方法，确保使用最新的尺寸计算位置
    startGame() {
        console.log('开始游戏');
        
        this.gameState = 'gaming';
        this.correctMatches = new Array(this.config.matchesNeeded).fill(false);
        this.isDragging = false;
        this.draggingIndex = -1;
        this.matchedPlateIndices = {};
        this.currentPlayingAudio = -1;
        
        this.selectRandomPairs();
        
        // 确保使用最新的尺寸计算位置
        this.calculateAndSetCanvasSize();
        this.calculatePositions();
        this.updateUI();
        
        // 开始游戏时不播放任何音效
    }
    
    // 重新开始游戏
    restartGame() {
        console.log('重新开始游戏');
        this.startGame();
    }
    
    // 选择随机配对
    selectRandomPairs() {
        this.images = [];
        this.audios = [];
        this.imageToAudioMap = {};
        
        const allIndices = Array.from({length: 10}, (_, i) => i + 1);
        const selectedIndices = this.shuffleArray(allIndices).slice(0, this.config.matchesNeeded);
        
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            const index = selectedIndices[i];
            this.images.push(`food_${index}`);
            this.audios.push(`audio_${index}`);
        }
        
        // 打乱音频顺序
        this.shuffleArray(this.audios);
        
        // 建立映射关系
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            const imageIndex = parseInt(this.images[i].split('_')[1]);
            for (let j = 0; j < this.config.matchesNeeded; j++) {
                const audioIndex = parseInt(this.audios[j].split('_')[1]);
                if (imageIndex === audioIndex) {
                    this.imageToAudioMap[i] = j;
                    break;
                }
            }
        }
    }
    
    // 修改：增强calculatePositions方法，根据方向调整位置
    calculatePositions() {
        const canvasWidth = this.fixedCanvasWidth;
        const canvasHeight = this.fixedCanvasHeight;
        
        // 根据方向调整元素间距
        const isLandscape = this.currentOrientation === 'landscape';
        
        // 使用缩放因子调整元素大小（CSS像素）
        const imageSize = this.config.imageSize * this.scaleFactor;
        const plateSize = this.config.plateSize * this.scaleFactor;
        const audioButtonSize = this.config.audioButtonSize * this.scaleFactor;
        
        // 根据方向调整间距
        let spacing, topMargin, plateOffset, audioButtonOffset;
        
        if (isLandscape) {
            // 横屏：元素可以分散一些
            spacing = Math.max(canvasWidth * 0.05, 20 * this.scaleFactor);
            topMargin = canvasHeight * 0.08;
            plateOffset = canvasHeight * 0.25;
            audioButtonOffset = 25 * this.scaleFactor;
        } else {
            // 竖屏：元素需要紧凑一些
            spacing = Math.max(canvasWidth * 0.03, 15 * this.scaleFactor);
            topMargin = canvasHeight * 0.05;
            plateOffset = canvasHeight * 0.22;
            audioButtonOffset = 20 * this.scaleFactor;
        }
        
        // 计算位置
        const totalWidthNeeded = this.config.matchesNeeded * imageSize + 
                                (this.config.matchesNeeded - 1) * spacing;
        
        // 如果总宽度超过画布，减少间距
        if (totalWidthNeeded > canvasWidth * 0.95) {
            spacing = (canvasWidth * 0.95 - this.config.matchesNeeded * imageSize) / 
                     (this.config.matchesNeeded - 1);
            spacing = Math.max(spacing, 10 * this.scaleFactor);
        }
        
        const startX = (canvasWidth - (this.config.matchesNeeded * imageSize + 
                      (this.config.matchesNeeded - 1) * spacing)) / 2;
        
        // 计算图片位置（顶部）
        this.imagePositions = [];
        this.originalPositions = [];
        
        const randomOrder = this.shuffleArray([...Array(this.config.matchesNeeded).keys()]);
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            const x = startX + randomOrder[i] * (imageSize + spacing);
            const y = topMargin;
            this.imagePositions.push({ x, y });
            this.originalPositions.push({ x, y });
        }
        
        // 计算盘子位置（底部）
        this.platePositions = [];
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            const x = startX + i * (imageSize + spacing);
            const y = topMargin + imageSize + plateOffset;
            this.platePositions.push({ x, y });
        }
        
        // 计算音频按钮位置
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
    }
    
    // 处理鼠标按下 - 修复版：正确处理坐标转换
    handleMouseDown(e) {
        if (this.gameState !== 'gaming') return;
        
        const rect = this.canvas.getBoundingClientRect();
        
        // 关键：坐标转换考虑CSS缩放和DPR
        // 获取鼠标相对于canvas的位置（CSS像素）
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        
        // 转换为canvas实际坐标（考虑canvas.style.width/height与canvas.width/height的比例）
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = cssX * scaleX;
        const y = cssY * scaleY;
        
        console.log(`鼠标点击: CSS坐标(${cssX}, ${cssY}) -> Canvas坐标(${x}, ${y})`);
        
        // 检查音频按钮
        for (let i = 0; i < this.audioButtonPositions.length; i++) {
            const pos = this.audioButtonPositions[i];
            // 使用预计算的绘制尺寸
            const size = pos.drawSize;
            const buttonX = pos.drawX;
            const buttonY = pos.drawY;
            const centerX = buttonX + size / 2;
            const centerY = buttonY + size / 2;
            
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            
            console.log(`按钮${i}: 绘制位置(${buttonX}, ${buttonY}), 中心(${centerX}, ${centerY}), 距离${distance}, 半径${size/2}`);
            
            if (distance <= size / 2) {
                console.log(`点击了音频按钮 ${i}`);
                this.playAudio(i);
                return;
            }
        }
        
        // 检查图片拖动
        for (let i = 0; i < this.imagePositions.length; i++) {
            if (this.correctMatches[i]) continue;
            
            const pos = this.imagePositions[i];
            const size = this.currentSizes.drawImageSize;
            const imageX = pos.x * this.dpr;
            const imageY = pos.y * this.dpr;
            
            if (x >= imageX && x <= imageX + size && y >= imageY && y <= imageY + size) {
                this.isDragging = true;
                this.draggingIndex = i;
                // 注意：dragOffset需要转换为CSS像素坐标用于拖动计算
                this.dragOffset.x = (x - imageX) / this.dpr;
                this.dragOffset.y = (y - imageY) / this.dpr;
                break;
            }
        }
    }
    
    // 处理鼠标移动
    handleMouseMove(e) {
        if (!this.isDragging || this.draggingIndex === -1) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        
        // 转换为CSS像素坐标（用于存储位置）
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
        const imageSize = this.currentSizes.imageSize; // CSS像素尺寸
        let isMatched = false;
        
        for (let i = 0; i < this.platePositions.length; i++) {
            const platePos = this.platePositions[i];
            const plateSize = this.currentSizes.plateSize; // CSS像素尺寸
            
            // 矩形碰撞检测：检查食物图片和盘子图片是否有重叠（使用CSS像素坐标）
            const isColliding = this.checkCollision(
                draggedPos.x, draggedPos.y, imageSize, imageSize,
                platePos.x, platePos.y, plateSize, plateSize
            );
            
            if (isColliding) {
                isMatched = true;
                
                if (this.imageToAudioMap[draggedIndex] === i) {
                    // 正确匹配
                    this.correctMatches[draggedIndex] = true;
                    this.matchedPlateIndices[draggedIndex] = i;
                    
                    // 调整图片位置：食物图片在盘子正上方，底端与盘子顶端重合，水平居中对齐
                    this.imagePositions[draggedIndex].x = platePos.x + (plateSize - imageSize) / 2;
                    this.imagePositions[draggedIndex].y = platePos.y - imageSize + 15 * this.scaleFactor; // 底端与盘子顶端重合，稍微重叠
                    
                    // 匹配正确时播放 r.mp3 音效
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
    
    // 检查矩形碰撞（使用CSS像素坐标）
    checkCollision(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw &&
               ax + aw > bx &&
               ay < by + bh &&
               ay + ah > by;
    }
    
    // 处理触摸事件
    handleTouchStart(e) {
        e.preventDefault();
        if (this.gameState !== 'gaming') return;
        
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
    
    // 播放音频
    playAudio(audioIndex) {
        if (!this.audioEnabled) return;
        
        this.currentPlayingAudio = audioIndex;
        
        // 播放对应的音频（如1.mp3、2.mp3等），不播放r.mp3音效
        const audioKey = this.audios[audioIndex];
        if (this.audioElements[audioKey]) {
            this.audioElements[audioKey].currentTime = 0;
            this.audioElements[audioKey].play().catch(e => console.log(`播放音频失败: ${e}`));
        }
        
        // 更新显示
        this.draw();
        
        // 清除高亮
        setTimeout(() => {
            this.currentPlayingAudio = -1;
            this.draw();
        }, 1000);
    }
    
    // 播放音效
    playSound(soundType) {
        if (!this.audioEnabled || !this.audioElements[soundType]) return;
        
        const audio = this.audioElements[soundType];
        audio.currentTime = 0;
        audio.play().catch(e => console.log(`播放音效失败: ${e}`));
    }
    
    // 完成游戏
    completeGame() {
        console.log('游戏完成!');
        this.gameState = 'completed';
        
        // 游戏结束时播放 all_right.mp3 音效
        this.playSound('complete');
        this.updateUI();
    }
    
    // 更新UI
    updateUI() {
        const startBtn = document.getElementById('start-btn');
        const restartBtn = document.getElementById('restart-btn');
        
        switch (this.gameState) {
            case 'start_menu':
                startBtn.disabled = false;
                restartBtn.disabled = true;
                break;
            case 'gaming':
                startBtn.disabled = true;
                restartBtn.disabled = false;
                break;
            case 'completed':
                startBtn.disabled = true;
                restartBtn.disabled = false;
                break;
        }
    }
    
    // 游戏主循环
    gameLoop() {
        if (!this.isInitialized) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        switch (this.gameState) {
            case 'start_menu':
                this.drawStartMenu();
                break;
            case 'gaming':
                this.drawGame();
                break;
            case 'completed':
                this.drawCompletedScreen();
                break;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    // 绘制开始菜单
    drawStartMenu() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 绘制背景图片
        if (this.backgroundImage && this.backgroundImage.complete) {
            // 计算图片缩放以填充画布
            const scale = Math.max(width / this.backgroundImage.width, height / this.backgroundImage.height);
            const scaledWidth = this.backgroundImage.width * scale;
            const scaledHeight = this.backgroundImage.height * scale;
            const offsetX = (width - scaledWidth) / 2;
            const offsetY = (height - scaledHeight) / 2;
            
            ctx.drawImage(this.backgroundImage, offsetX, offsetY, scaledWidth, scaledHeight);
        } else {
            // 如果背景图片未加载，使用备用颜色
            ctx.fillStyle = '#FFD166';
            ctx.fillRect(0, 0, width, height);
        }
        
        // 不显示任何文字或其他元素，只有背景图片
    }
    
    // 绘制游戏界面 - 修复版：所有绘制都考虑dpr
    drawGame() {
        const ctx = this.ctx;
        
        // 白色背景 - 使用实际canvas尺寸
        ctx.fillStyle = this.config.colors.white;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制盘子
        for (let i = 0; i < this.platePositions.length; i++) {
            const pos = this.platePositions[i];
            const size = this.currentSizes.drawPlateSize;
            const x = pos.x * this.dpr;
            const y = pos.y * this.dpr;
            
            if (this.plateImage && this.plateImage.complete) {
                // 绘制盘子图片 - 使用乘以dpr后的坐标和尺寸
                ctx.drawImage(this.plateImage, x, y, size, size);
            } else {
                // 如果盘子图片未加载，使用备用图形
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
        
        // 绘制图片（先绘制未匹配的，再绘制已匹配的，确保正确匹配的图片在顶部）
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
                
                // 绘制圆角图片
                this.roundImage(ctx, img, x, y, size, size, 15 * this.dpr * this.scaleFactor);
                ctx.globalAlpha = 1.0;
                
                // 绘制边框
                ctx.strokeStyle = this.config.colors.black;
                ctx.lineWidth = 2 * this.dpr * this.scaleFactor;
                this.roundRect(ctx, x - 2 * this.dpr, y - 2 * this.dpr, size + 4 * this.dpr, size + 4 * this.dpr, 17 * this.dpr * this.scaleFactor);
                ctx.stroke();
            }
        }
        
        // 绘制已正确匹配的图片（在顶部）
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            if (!this.correctMatches[i]) continue;
            
            const imgKey = this.images[i];
            const img = this.foodImages[imgKey];
            const pos = this.imagePositions[i];
            const size = this.currentSizes.drawImageSize;
            const x = pos.x * this.dpr;
            const y = pos.y * this.dpr;
            
            if (img && img.complete) {
                // 绘制圆角图片
                this.roundImage(ctx, img, x, y, size, size, 15 * this.dpr * this.scaleFactor);
                
                // 绘制绿色边框表示已匹配
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
            
            // 绘制圆形按钮
            ctx.fillStyle = this.config.colors.button;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = this.config.colors.black;
            ctx.lineWidth = 2 * this.dpr * this.scaleFactor;
            ctx.stroke();
            
            // 播放图标
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
    }
    
    // 绘制完成界面
    drawCompletedScreen() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 绘制笑脸图片作为背景
        if (this.smileImage && this.smileImage.complete) {
            // 计算图片缩放以适应画布，保持宽高比
            const imgRatio = this.smileImage.width / this.smileImage.height;
            const canvasRatio = width / height;
            
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (canvasRatio > imgRatio) {
                // 画布更宽，高度适配
                drawHeight = height;
                drawWidth = drawHeight * imgRatio;
                offsetX = (width - drawWidth) / 2;
                offsetY = 0;
            } else {
                // 画布更高，宽度适配
                drawWidth = width;
                drawHeight = drawWidth / imgRatio;
                offsetX = 0;
                offsetY = (height - drawHeight) / 2;
            }
            
            ctx.drawImage(this.smileImage, offsetX, offsetY, drawWidth, drawHeight);
        } else {
            // 如果笑脸图片未加载，使用备用颜色
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(0, 0, width, height);
        }
        
        // 不显示任何文字、按钮或其他元素，只有笑脸图片
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
    
    // 随机打乱数组
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
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
