//音频控制器，负责音频的播放、暂停、跳转等操作

import { TimeFormatter } from '../utils/TimeFormatter.js';
import { getAudioContext } from '../utils/AudioContext.js';

export class AudioController {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.audioContext = getAudioContext();
        this.setupControls();
        this.resetState();
    }

    setupControls() {
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.progressBar = document.getElementById('progressBar');
        this.currentTimeSpan = document.getElementById('currentTime');
        this.totalTimeSpan = document.getElementById('totalTime');
        this.audioFileInput = document.getElementById('audioFile');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayback());
        this.progressBar.addEventListener('input', () => this.seekAudio());
        this.progressBar.addEventListener('change', () => this.seekAudio());
        
        // 添加文件上传监听
        this.audioFileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    // 添加文件上传处理方法
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.loadAudioFile(e.target.result);
            };
            reader.readAsArrayBuffer(file);
            
            // 更新状态文本
            document.getElementById('statusText').textContent = '正在加载音频文件...';
        }
    }

    resetState() {
        this.audioBuffer = null;
        this.audioSource = null;
        this.startTime = 0;
        this.pauseTime = 0;
        this.isPlaying = false;
    }

    loadAudioFile(arrayBuffer) {
        this.audioContext.decodeAudioData(arrayBuffer, 
            (buffer) => {
                this.audioBuffer = buffer;
                this.enablePlaybackControls();
                this.updateTotalTime(buffer.duration);
                this.startPlayback();
                document.getElementById('statusText').textContent = '音频文件已加载';
            },
            (error) => {
                console.error('解码音频文件失败:', error);
                document.getElementById('statusText').textContent = '音频文件加载失败';
            }
        );
    }

    enablePlaybackControls() {
        this.playPauseBtn.disabled = false;
        this.progressBar.disabled = false;
    }

    updateTotalTime(duration) {
        this.totalTimeSpan.textContent = TimeFormatter.formatTime(duration);
        this.progressBar.max = Math.floor(duration);
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
            this.audioSource.connect(this.audioAnalyzer.analyser);
            this.audioSource.connect(this.audioContext.destination);

            this.startTime = this.audioContext.currentTime - this.pauseTime;
            this.audioSource.start(0, this.pauseTime);
            this.isPlaying = true;
            this.playPauseBtn.textContent = '暂停';

            this.updatePlaybackProgress();
        }
    }

    pausePlayback() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.pauseTime = this.audioContext.currentTime - this.startTime;
            this.isPlaying = false;
            this.playPauseBtn.textContent = '播放';
        }
    }

    seekAudio() {
        const seekTime = parseFloat(this.progressBar.value);
        if (this.audioBuffer) {
            const wasPlaying = this.isPlaying;
            if (wasPlaying) {
                this.pausePlayback();
            }
            this.pauseTime = seekTime;
            if (wasPlaying) {
                this.startPlayback();
            }
            this.currentTimeSpan.textContent = TimeFormatter.formatTime(seekTime);
        }
    }

    updatePlaybackProgress() {
        const updateProgress = () => {
            if (this.isPlaying) {
                const currentTime = this.audioContext.currentTime - this.startTime;
                if (currentTime <= this.audioBuffer.duration) {
                    this.progressBar.value = currentTime;
                    this.currentTimeSpan.textContent = TimeFormatter.formatTime(currentTime);
                    requestAnimationFrame(updateProgress);
                } else {
                    this.isPlaying = false;
                    this.pauseTime = 0;
                    this.playPauseBtn.textContent = '播放';
                }
            }
        };
        requestAnimationFrame(updateProgress);
    }
} 