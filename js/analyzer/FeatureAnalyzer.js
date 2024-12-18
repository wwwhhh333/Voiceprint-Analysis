//声纹特征分析

export class FeatureAnalyzer {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.lastUpdate = 0;
        this.updateInterval = 100;
    }

    analyze() {
        const now = Date.now();
        if (now - this.lastUpdate > this.updateInterval) {
            this.lastUpdate = now;
            
            const freqData = this.audioAnalyzer.getFrequencyData();
            this.updateFeatures(freqData);
        }
    }

    updateFeatures(freqData) {
        const bufferLength = freqData.length;
        
        // 计算音量
        const average = freqData.reduce((a, b) => a + b) / bufferLength;
        document.getElementById('volume').textContent = 
            Math.round(average * 100 / 256) + '%';
        
        // 计算主频率
        const maxIndex = this.findMaxFrequencyIndex(freqData);
        const dominantFrequency = maxIndex * this.audioAnalyzer.audioContext.sampleRate / 
            (this.audioAnalyzer.analyser.fftSize * 2);
        document.getElementById('pitch').textContent = 
            Math.round(dominantFrequency) + 'Hz';
        
        // 计算音色丰富��
        const timbreRichness = this.calculateTimbreRichness(freqData, average);
        document.getElementById('timbre').textContent = 
            Math.round(timbreRichness) + '%';
    }

    findMaxFrequencyIndex(freqData) {
        return freqData.reduce((maxIndex, value, index, arr) => 
            value > arr[maxIndex] ? index : maxIndex, 0);
    }

    calculateTimbreRichness(freqData, mean) {
        const variance = freqData.reduce((acc, val) => 
            acc + Math.pow(val - mean, 2), 0) / freqData.length;
        return Math.sqrt(variance) / 128 * 100;
    }
} 