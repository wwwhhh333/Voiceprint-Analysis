//声纹特征分析

export class FeatureAnalyzer {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.lastUpdate = 0;
        this.updateInterval = 100;
        
        // 初始化MFCC分析器
        if (typeof Meyda === 'undefined') {
            console.error('Meyda库未加载，MFCC分析将不可用');
            this.mfccAnalyzer = null;
        } else {
            try {
                this.mfccAnalyzer = Meyda.createMeydaAnalyzer({
                    audioContext: this.audioAnalyzer.audioContext,
                    source: this.audioAnalyzer.analyser,
                    bufferSize: 2048,
                    numberOfMFCCCoefficients: 13,
                    featureExtractors: [
                        'mfcc',
                        'spectralSpread',
                        'perceptualSharpness',
                        'loudness'
                    ]
                });
                console.log('MFCC分析器初始化成功');
            } catch (error) {
                console.error('MFCC分析器初始化失败:', error);
                this.mfccAnalyzer = null;
            }
        }
    }

    analyze() {
        const now = Date.now();
        if (now - this.lastUpdate > this.updateInterval) {
            this.lastUpdate = now;
            
            const timeData = this.audioAnalyzer.getWaveformData();
            const freqData = this.audioAnalyzer.getFrequencyData();
            
            this.updateTimeAnalysis(timeData);
            this.updateFrequencyAnalysis(freqData);
            this.updatePerceptualAnalysis();
            this.drawMFCC();
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

    updatePerceptualAnalysis() {
        if (this.mfccAnalyzer) {
            const features = this.mfccAnalyzer.get();
            if (features) {
                // 更新频谱扩散
                if (features.spectralSpread !== undefined) {
                    document.getElementById('spectralSpread').textContent = 
                        `${Math.round(features.spectralSpread)} Hz`;
                }
                
                // 更新感知锐度
                if (features.perceptualSharpness !== undefined) {
                    document.getElementById('perceptualSharpness').textContent = 
                        features.perceptualSharpness.toFixed(2);
                }
                
                // 更新响度动态
                if (features.loudness && features.loudness.total !== undefined) {
                    document.getElementById('loudnessDynamics').textContent = 
                        `${Math.round(features.loudness.total)} dB`;
                }
            }
        }
    }

    drawMFCC() {
        if (this.mfccAnalyzer) {
            const features = this.mfccAnalyzer.get();
            if (features && features.mfcc) {
                const canvas = document.getElementById('mfccCanvas');
                if (!canvas) return;
                
                const ctx = canvas.getContext('2d');
                const width = canvas.width;
                const height = canvas.height;
                
                // 清空画布
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                
                // 绘制MFCC系数
                const barWidth = width / features.mfcc.length;
                const maxValue = Math.max(...features.mfcc.map(Math.abs));
                
                features.mfcc.forEach((coef, i) => {
                    const normalizedValue = coef / maxValue;
                    const barHeight = Math.abs(normalizedValue) * (height / 2);
                    const y = normalizedValue > 0 ? height/2 - barHeight : height/2;
                    
                    // 使用渐变色
                    const hue = (i / features.mfcc.length) * 360;
                    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
                    ctx.fillRect(i * barWidth, y, barWidth - 1, barHeight);
                });
            }
        }
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