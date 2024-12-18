//录音控制器，负责录音的开始、停止、保存等操作

import { getAudioContext } from '../utils/AudioContext.js';

export class RecordController {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.audioContext = getAudioContext();
        this.isRecording = false;
        this.mediaRecorder = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('recordBtn').addEventListener('click', 
            () => this.toggleRecording());
    }

    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    // ... 其他录音控制方法 ...
} 