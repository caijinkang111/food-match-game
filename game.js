/**
 * 美食匹配大作战 - 修改版
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
        
        // 画布固定大小
        this.fixedCanvasWidth = 0;
        this.fixedCanvasHeight = 0;
        this.scaleFactor = 1;
        
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
            this.gameLoop();
        }).catch(error => {
            console.error('资源加载失败:', error);
            this.showError('资源加载失败，请刷新页面');
        });
        
        // 移除窗口大小变化监听，不调整画布大小
        // window.addEventListener('resize', () => this.resizeCanvas());
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }
    
    // 计算并设置画布大小
    calculateAndSetCanvasSize() {
        // 获取当前窗口的可用大小
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        console.log(`窗口大小: ${windowWidth}x${windowHeight}`);
        
        // 根据窗口大小计算画布尺寸
        // 我们想要一个适应窗口但保持固定比例的画布
        const maxWidth = 1400;
        const maxHeight = 900;
        const minWidth = 800;
        const minHeight = 600;
        
        // 计算可用空间（减去一些边距和控件空间）
        const margin = 40;
        const headerHeight = 80;
        const controlsHeight = 80;
        
        const availableWidth = windowWidth - margin * 2;
        const availableHeight = windowHeight - headerHeight - controlsHeight - margin * 2;
        
        // 计算合适的画布尺寸
        let canvasWidth = Math.min(maxWidth, availableWidth);
        let canvasHeight = Math.min(maxHeight, availableHeight);
        
        // 确保最小尺寸
        canvasWidth = Math.max(minWidth, canvasWidth);
        canvasHeight = Math.max(minHeight, canvasHeight);
        
        // 保持16:9的比例
        const targetRatio = 16 / 9;
        const currentRatio = canvasWidth / canvasHeight;
        
        if (currentRatio > targetRatio) {
            // 太宽了，调整宽度
            canvasWidth = canvasHeight * targetRatio;
        } else if (currentRatio < targetRatio) {
            // 太高了，调整高度
            canvasHeight = canvasWidth / targetRatio;
        }
        
        // 再次确保不超过最大尺寸
        canvasWidth = Math.min(maxWidth, canvasWidth);
        canvasHeight = Math.min(maxHeight, canvasHeight);
        
        console.log(`设置画布大小: ${canvasWidth}x${canvasHeight}`);
        
        // 设置固定画布尺寸
        this.fixedCanvasWidth = canvasWidth;
        this.fixedCanvasHeight = canvasHeight;
        
        this.canvas.width = this.fixedCanvasWidth;
        this.canvas.height = this.fixedCanvasHeight;
        
        // 计算缩放因子（相对于基础尺寸1200x800）
        this.scaleFactor = Math.min(canvasWidth / 1200, canvasHeight / 800, 1.2);
        
        console.log(`缩放因子: ${this.scaleFactor}`);
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
    
    // 开始游戏
    startGame() {
        console.log('开始游戏');
        
        this.gameState = 'gaming';
        this.correctMatches = new Array(this.config.matchesNeeded).fill(false);
        this.isDragging = false;
        this.draggingIndex = -1;
        this.matchedPlateIndices = {};
        this.currentPlayingAudio = -1;
        
        this.selectRandomPairs();
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
    
    // 计算位置 - 基于固定画布大小和缩放因子
    calculatePositions() {
        const canvasWidth = this.fixedCanvasWidth;
        const canvasHeight = this.fixedCanvasHeight;
        
        // 使用缩放因子调整元素大小
        const imageSize = this.config.imageSize * this.scaleFactor;
        const plateSize = this.config.plateSize * this.scaleFactor;
        const audioButtonSize = this.config.audioButtonSize * this.scaleFactor;
        
        // 计算间距，确保所有元素都显示在画布内
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
        
        const randomOrder = this.shuffleArray([...Array(this.config.matchesNeeded).keys()]);
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            const x = xPositions[randomOrder[i]];
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
            this.audioButtonPositions.push({ x, y, size: audioButtonSize });
        }
        
        this.currentSizes = {
            imageSize,
            plateSize,
            audioButtonSize,
            scaleFactor: this.scaleFactor
        };
    }
    
    // 处理鼠标按下
    handleMouseDown(e) {
        if (this.gameState !== 'gaming') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 检查音频按钮
        for (let i = 0; i < this.audioButtonPositions.length; i++) {
            const pos = this.audioButtonPositions[i];
            const centerX = pos.x + pos.size / 2;
            const centerY = pos.y + pos.size / 2;
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            
            if (distance <= pos.size / 2) {
                this.playAudio(i);
                return;
            }
        }
        
        // 检查图片拖动
        for (let i = 0; i < this.imagePositions.length; i++) {
            if (this.correctMatches[i]) continue;
            
            const pos = this.imagePositions[i];
            const size = this.currentSizes.imageSize;
            
            if (x >= pos.x && x <= pos.x + size && y >= pos.y && y <= pos.y + size) {
                this.isDragging = true;
                this.draggingIndex = i;
                this.dragOffset.x = x - pos.x;
                this.dragOffset.y = y - pos.y;
                break;
            }
        }
    }
    
    // 处理鼠标移动
    handleMouseMove(e) {
        if (!this.isDragging || this.draggingIndex === -1) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
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
            
            // 矩形碰撞检测：检查食物图片和盘子图片是否有重叠
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
                    this.imagePositions[draggedIndex].y = platePos.y - imageSize + 15; // 底端与盘子顶端重合，稍微重叠
                    
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
    
    // 绘制游戏界面
    drawGame() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // 白色背景
        ctx.fillStyle = this.config.colors.white;
        ctx.fillRect(0, 0, width, height);
        
        // 绘制盘子
        for (let i = 0; i < this.platePositions.length; i++) {
            const pos = this.platePositions[i];
            const size = this.currentSizes.plateSize;
            
            if (this.plateImage && this.plateImage.complete) {
                // 绘制盘子图片
                ctx.drawImage(this.plateImage, pos.x, pos.y, size, size);
            } else {
                // 如果盘子图片未加载，使用备用图形
                ctx.fillStyle = this.config.colors.plate;
                ctx.beginPath();
                ctx.ellipse(
                    pos.x + size / 2,
                    pos.y + size / 2,
                    size * 0.45,
                    size * 0.35,
                    0, 0, Math.PI * 2
                );
                ctx.fill();
                
                ctx.strokeStyle = this.config.colors.plateBorder;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
        
        // 绘制图片（先绘制未匹配的，再绘制已匹配的，确保正确匹配的图片在顶部）
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            if (this.correctMatches[i]) continue;
            
            const imgKey = this.images[i];
            const img = this.foodImages[imgKey];
            const pos = this.imagePositions[i];
            const size = this.currentSizes.imageSize;
            
            if (img && img.complete) {
                if (this.isDragging && i === this.draggingIndex) {
                    ctx.globalAlpha = 0.7;
                }
                
                // 绘制圆角图片
                this.roundImage(ctx, img, pos.x, pos.y, size, size, 15 * this.scaleFactor);
                ctx.globalAlpha = 1.0;
                
                // 绘制边框
                ctx.strokeStyle = this.config.colors.black;
                ctx.lineWidth = 2 * this.scaleFactor;
                this.roundRect(ctx, pos.x - 2, pos.y - 2, size + 4, size + 4, 17 * this.scaleFactor);
                ctx.stroke();
            }
        }
        
        // 绘制已正确匹配的图片（在顶部）
        for (let i = 0; i < this.config.matchesNeeded; i++) {
            if (!this.correctMatches[i]) continue;
            
            const imgKey = this.images[i];
            const img = this.foodImages[imgKey];
            const pos = this.imagePositions[i];
            const size = this.currentSizes.imageSize;
            
            if (img && img.complete) {
                // 绘制圆角图片
                this.roundImage(ctx, img, pos.x, pos.y, size, size, 15 * this.scaleFactor);
                
                // 绘制绿色边框表示已匹配
                ctx.strokeStyle = this.config.colors.green;
                ctx.lineWidth = 4 * this.scaleFactor;
                this.roundRect(ctx, pos.x - 2, pos.y - 2, size + 4, size + 4, 17 * this.scaleFactor);
                ctx.stroke();
            }
        }
        
        // 绘制音频按钮
        for (let i = 0; i < this.audioButtonPositions.length; i++) {
            const pos = this.audioButtonPositions[i];
            const size = pos.size;
            const centerX = pos.x + size / 2;
            const centerY = pos.y + size / 2;
            
            // 绘制圆形按钮
            ctx.fillStyle = this.config.colors.button;
            ctx.beginPath();
            ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = this.config.colors.black;
            ctx.lineWidth = 2 * this.scaleFactor;
            ctx.stroke();
            
            // 播放图标
            ctx.fillStyle = this.config.colors.white;
            ctx.beginPath();
            const iconSize = size * 0.4;
            ctx.moveTo(pos.x + size * 0.35, pos.y + size * 0.3);
            ctx.lineTo(pos.x + size * 0.35, pos.y + size * 0.7);
            ctx.lineTo(pos.x + size * 0.7, pos.y + size / 2);
            ctx.closePath();
            ctx.fill();
            
            // 高亮当前播放的音频
            if (i === this.currentPlayingAudio) {
                ctx.strokeStyle = this.config.colors.green;
                ctx.lineWidth = 3 * this.scaleFactor;
                ctx.beginPath();
                ctx.arc(centerX, centerY, size / 2 + 2 * this.scaleFactor, 0, Math.PI * 2);
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