//音频分析核心类

import { getAudioContext } from '../utils/AudioContext.js';

export class AudioAnalyzer {
    constructor() {
        this.audioContext = getAudioContext();
        this.analyser = this.audioContext.createAnalyser();
        this.waveAnalyser = this.audioContext.createAnalyser();
        
        this.analyser.fftSize = 2048;
        this.waveAnalyser.fftSize = 2048;
        
        this.setupAnalyzers();
    }

    setupAnalyzers() {
        // 设置分析器参数
        this.analyser.smoothingTimeConstant = 0.8;
        this.waveAnalyser.smoothingTimeConstant = 0.8;
    }

    connectSource(source) {
        source.connect(this.analyser);
        source.connect(this.waveAnalyser);
        return source;
    }

    getFrequencyData() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }

    getWaveformData() {
        const bufferLength = this.waveAnalyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        this.waveAnalyser.getFloatTimeDomainData(dataArray);
        return dataArray;
    }
} 