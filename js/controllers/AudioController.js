//音频控制器，负责音频的播放、暂停、跳转等操作

import { TimeFormatter } from '../utils/TimeFormatter.js';
import { getAudioContext } from '../utils/AudioContext.js';

export class AudioController {
    constructor(audioAnalyzer, suffix = '') {
        this.audioAnalyzer = audioAnalyzer;
        this.audioContext = getAudioContext();
        this.suffix = suffix; // 用于区分A/B音频
        this.setupControls();
        this.resetState();
    }

    setupControls() {
        // 根据suffix获取对应的控制元素
        this.playPauseBtn = document.getElementById(`playPauseBtn${this.suffix}`);
        this.progressBar = document.getElementById(`progressBar${this.suffix}`);
        this.currentTimeSpan = document.getElementById(`currentTime${this.suffix}`);
        this.totalTimeSpan = document.getElementById(`totalTime${this.suffix}`);
        this.audioFileInput = document.getElementById(`audioFile${this.suffix}`);
        
        if (this.playPauseBtn) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayback());
        this.progressBar.addEventListener('input', () => this.seekAudio());
        this.progressBar.addEventListener('change', () => this.seekAudio());
        
        // 只在主页面添加文件上传监听
        if (!this.suffix && this.audioFileInput) {
            this.audioFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
    }

    resetState() {
        this.audioBuffer = null;
        this.audioSource = null;
        this.startTime = 0;
        this.pauseTime = 0;
        this.isPlaying = false;
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.loadAudioFile(e.target.result);
            };
            reader.readAsArrayBuffer(file);
            const statusText = document.getElementById('statusText');
            if (statusText) {
                statusText.textContent = '正在加载音频文件...';
            }
        }
    }

    loadAudioFile(arrayBuffer) {
        this.audioContext.decodeAudioData(arrayBuffer, 
            (buffer) => {
                this.audioBuffer = buffer;
                this.enablePlaybackControls();
                this.updateTotalTime(buffer.duration);
                
                const statusText = document.getElementById('statusText');
                if (statusText) {
                    statusText.textContent = '音频文件已加载';
                }
            },
            (error) => {
                console.error('解码音频文件失败:', error);
                const statusText = document.getElementById('statusText');
                if (statusText) {
                    statusText.textContent = '音频文件加载失败';
                }
            }
        );
    }

    enablePlaybackControls() {
        if (this.playPauseBtn) {
            this.playPauseBtn.disabled = false;
            this.progressBar.disabled = false;
        }
    }

    updateTotalTime(duration) {
        if (this.totalTimeSpan) {
            this.totalTimeSpan.textContent = TimeFormatter.formatTime(duration);
            this.progressBar.max = Math.floor(duration);
        }
    }

    togglePlayback() {
        if (!this.isPlaying) {
            this.startPlayback();
        } else {
            this.pausePlayback();
        }
    }

    startPlayback() {
        if (this.audioBuffer) {
            if (this.audioSource) {
                this.audioSource.stop();
            }

            this.audioSource = this.audioContext.createBufferSource();
            this.audioSource.buffer = this.audioBuffer;
            
            // 连接到分析器和输出
            this.audioSource.connect(this.audioAnalyzer.analyser);
            this.audioSource.connect(this.audioAnalyzer.waveAnalyser);
            this.audioSource.connect(this.audioContext.destination);

            this.startTime = this.audioContext.currentTime - this.pauseTime;
            this.audioSource.start(0, this.pauseTime);
            this.isPlaying = true;
            
            if (this.playPauseBtn) {
                this.playPauseBtn.textContent = '暂停';
            }

            this.updatePlaybackProgress();
        }
    }

    pausePlayback() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.pauseTime = this.audioContext.currentTime - this.startTime;
            this.isPlaying = false;
            if (this.playPauseBtn) {
                this.playPauseBtn.textContent = '播放';
            }
        }
    }

    seekAudio() {
        if (this.audioBuffer && this.progressBar) {
            const seekTime = parseFloat(this.progressBar.value);
            const wasPlaying = this.isPlaying;
            if (wasPlaying) {
                this.pausePlayback();
            }
            this.pauseTime = seekTime;
            if (wasPlaying) {
                this.startPlayback();
            }
            if (this.currentTimeSpan) {
                this.currentTimeSpan.textContent = TimeFormatter.formatTime(seekTime);
            }
        }
    }

    updatePlaybackProgress() {
        const updateProgress = () => {
            if (this.isPlaying && this.progressBar && this.currentTimeSpan) {
                const currentTime = this.audioContext.currentTime - this.startTime;
                if (currentTime <= this.audioBuffer.duration) {
                    this.progressBar.value = currentTime;
                    this.currentTimeSpan.textContent = TimeFormatter.formatTime(currentTime);
                    requestAnimationFrame(updateProgress);
                } else {
                    this.isPlaying = false;
                    this.pauseTime = 0;
                    if (this.playPauseBtn) {
                        this.playPauseBtn.textContent = '播放';
                    }
                }
            }
        };
        requestAnimationFrame(updateProgress);
    }

    setAudioBuffer(buffer) {
        console.log(`设置音频缓冲区 ${this.suffix}:`, buffer);
        this.audioBuffer = buffer;
        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;
        
        if (this.playPauseBtn) {
            this.playPauseBtn.textContent = '播放';
            this.playPauseBtn.disabled = false;
        }
        if (this.progressBar) {
            this.progressBar.value = 0;
            this.progressBar.disabled = false;
        }
    }

    enablePlaybackControls() {
        console.log(`启用播放控制 ${this.suffix}`);
        if (this.playPauseBtn) {
            this.playPauseBtn.disabled = false;
        }
        if (this.progressBar) {
            this.progressBar.disabled = false;
        }
    }

    updateTotalTime(duration) {
        console.log(`更新总时长 ${this.suffix}:`, duration);
        if (this.totalTimeSpan) {
            this.totalTimeSpan.textContent = TimeFormatter.formatTime(duration);
            this.progressBar.max = Math.floor(duration);
        }
    }
} 