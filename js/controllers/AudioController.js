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
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayback());
        this.progressBar.addEventListener('input', () => this.seekAudio());
        this.progressBar.addEventListener('change', () => this.seekAudio());
    }

    resetState() {
        this.audioBuffer = null;
        this.audioSource = null;
        this.startTime = 0;
        this.pauseTime = 0;
        this.isPlaying = false;
    }

    loadAudioFile(arrayBuffer) {
        this.audioContext.decodeAudioData(arrayBuffer, (buffer) => {
            this.audioBuffer = buffer;
            this.enablePlaybackControls();
            this.updateTotalTime(buffer.duration);
            this.startPlayback();
        });
    }

    // ... 其他播放控制方法 ...
} 