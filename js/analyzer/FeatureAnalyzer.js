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
            
            const timeData = this.audioAnalyzer.getWaveformData();
            const freqData = this.audioAnalyzer.getFrequencyData();
            
            this.updateTimeAnalysis(timeData);
            this.updateFrequencyAnalysis(freqData);
        }
    }

    updateTimeAnalysis(timeData) {
        // 计算有效音长
        const effectiveDuration = this.calculateEffectiveDuration(timeData);
        document.getElementById('effectiveDuration').textContent = 
            `${effectiveDuration.toFixed(2)} s`;
        
        // 计算过零率
        const zcr = this.calculateZeroCrossingRate(timeData);
        document.getElementById('zeroCrossRate').textContent = 
            `${Math.round(zcr)} Hz`;
        
        // 计算平均能量
        const energy = this.calculateAverageEnergy(timeData);
        document.getElementById('averageEnergy').textContent = 
            `${energy.toFixed(1)} dB`;
    }

    updateFrequencyAnalysis(freqData) {
        // 计算基频
        const f0 = this.detectFundamentalFrequency(freqData);
        document.getElementById('fundamentalFreq').textContent = 
            `${Math.round(f0)} Hz`;
        
        // 计算谐波数
        const harmonics = this.detectHarmonics(freqData, f0);
        document.getElementById('harmonicsCount').textContent = 
            harmonics.length.toString();
        
        // 计算频谱质心
        const centroid = this.calculateSpectralCentroid(freqData);
        document.getElementById('spectralCentroid').textContent = 
            `${Math.round(centroid)} Hz`;
    }

    calculateEffectiveDuration(timeData) {
        const threshold = 0.01;
        let effectiveSamples = 0;
        
        timeData.forEach(sample => {
            if (Math.abs(sample) > threshold) {
                effectiveSamples++;
            }
        });
        
        return effectiveSamples / this.audioAnalyzer.audioContext.sampleRate;
    }

    calculateZeroCrossingRate(timeData) {
        let crossings = 0;
        for (let i = 1; i < timeData.length; i++) {
            if ((timeData[i] * timeData[i - 1]) < 0) {
                crossings++;
            }
        }
        return (crossings * this.audioAnalyzer.audioContext.sampleRate) / 
            (2 * timeData.length);
    }

    calculateAverageEnergy(timeData) {
        const rms = Math.sqrt(timeData.reduce((acc, val) => 
            acc + val * val, 0) / timeData.length);
        return 20 * Math.log10(rms);
    }

    detectFundamentalFrequency(freqData) {
        const sampleRate = this.audioAnalyzer.audioContext.sampleRate;
        const binSize = sampleRate / (2 * freqData.length);
        let maxValue = -Infinity;
        let maxIndex = 0;
        
        // 在20Hz-2000Hz范围内寻找基频
        const minBin = Math.floor(20 / binSize);
        const maxBin = Math.floor(2000 / binSize);
        
        for (let i = minBin; i < maxBin; i++) {
            if (freqData[i] > maxValue) {
                maxValue = freqData[i];
                maxIndex = i;
            }
        }
        
        return maxIndex * binSize;
    }

    detectHarmonics(freqData, f0) {
        const harmonics = [];
        const sampleRate = this.audioAnalyzer.audioContext.sampleRate;
        const binSize = sampleRate / (2 * freqData.length);
        
        // 检测前8个谐波
        for (let i = 1; i <= 8; i++) {
            const targetFreq = f0 * i;
            const binIndex = Math.round(targetFreq / binSize);
            
            if (binIndex < freqData.length && freqData[binIndex] > -50) {
                harmonics.push({
                    frequency: targetFreq,
                    magnitude: freqData[binIndex]
                });
            }
        }
        
        return harmonics;
    }

    calculateSpectralCentroid(freqData) {
        const sampleRate = this.audioAnalyzer.audioContext.sampleRate;
        let weightedSum = 0;
        let totalEnergy = 0;
        
        freqData.forEach((magnitude, i) => {
            const frequency = i * sampleRate / (2 * freqData.length);
            const energy = Math.pow(10, magnitude / 20);
            weightedSum += frequency * energy;
            totalEnergy += energy;
        });
        
        return weightedSum / totalEnergy;
    }
} 