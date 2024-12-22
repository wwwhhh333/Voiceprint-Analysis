//声纹特征分析

export class FeatureAnalyzer {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.lastUpdate = 0;
        this.updateInterval = 100;
        
        // 初始化数据
        this.resetData();
        
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

    resetData() {
        // 重置所有数据
        this.analysisData = {
            timeData: new Float32Array(0),  // 当前帧的时域数据
            freqData: new Float32Array(0),  // 当前帧的频域数据
            features: {
                effectiveDuration: 0,       // 有效音长（秒）
                zeroCrossings: 0,           // 过零率
                energy: 0,                  // 平均能量
                fundamentalFreq: 0,         // 基频
                harmonicsCount: 0,          // 谐波数
                spectralCentroid: 0         // 频谱质心
            },
            isFirstFrame: true,             // 是否是第一帧
            lastNonZeroTime: 0,            // 上一次非零数据的时间
            frameCount: 0,                  // 有效帧计数
            totalEffectiveSamples: 0,      // 总有效样本数
            isInVoiceSegment: false,       // 是否在语音段内
            silenceCounter: 0              // 静音计数器
        };
    }

    analyze() {
        const now = Date.now();
        if (now - this.lastUpdate > this.updateInterval) {
            this.lastUpdate = now;
            
            const timeData = this.audioAnalyzer.getWaveformData();
            const freqData = this.audioAnalyzer.getFrequencyData();
            
            // 检查是否需要重置（检测到静音超过1秒）
            if (this.shouldReset(timeData)) {
                this.resetData();
                return;
            }
            
            // 更新分析数据
            this.updateAnalysis(timeData, freqData);
            
            // 更新显示
            this.updateDisplay();
        }
    }

    shouldReset(timeData) {
        // 检查是否全是静音
        const isAllSilent = timeData.every(sample => Math.abs(sample) < 0.01);
        const now = Date.now();
        
        if (isAllSilent) {
            if (now - this.analysisData.lastNonZeroTime > 1000) { // 1秒静音
                return true;
            }
        } else {
            this.analysisData.lastNonZeroTime = now;
        }
        return false;
    }

    updateAnalysis(timeData, freqData) {
        this.analysisData.timeData = timeData;
        this.analysisData.freqData = freqData;
        this.analysisData.frameCount++;

        // 更新特征
        const features = this.calculateFeatures(timeData, freqData);
        
        if (this.analysisData.isFirstFrame) {
            this.analysisData.features = features;
            this.analysisData.isFirstFrame = false;
        } else {
            // 使用指数移动平均来更新特征
            const alpha = 0.1; // 平滑因子
            for (let key in features) {
                this.analysisData.features[key] = 
                    alpha * features[key] + (1 - alpha) * this.analysisData.features[key];
            }
        }
    }

    calculateFeatures(timeData, freqData) {
        return {
            effectiveDuration: this.calculateEffectiveDuration(timeData),
            zeroCrossings: this.calculateZeroCrossingRate(timeData),
            energy: this.calculateAverageEnergy(timeData),
            fundamentalFreq: this.detectFundamentalFrequency(freqData),
            harmonicsCount: this.detectHarmonics(freqData, this.analysisData.features.fundamentalFreq).length,
            spectralCentroid: this.calculateSpectralCentroid(freqData)
        };
    }

    updateDisplay() {
        // 更新时域特征显示
        document.getElementById('effectiveDuration').textContent = 
            `${this.analysisData.features.effectiveDuration.toFixed(2)} s`;
        
        document.getElementById('zeroCrossRate').textContent = 
            `${Math.round(this.analysisData.features.zeroCrossings)} Hz`;
        
        const energyDB = this.analysisData.features.energy > 0 ? 
            10 * Math.log10(this.analysisData.features.energy) : -100;
        document.getElementById('averageEnergy').textContent = 
            `${Math.max(-100, energyDB).toFixed(1)} dB`;
        
        // 更新频域特征显示
        document.getElementById('fundamentalFreq').textContent = 
            `${Math.round(this.analysisData.features.fundamentalFreq)} Hz`;
        
        document.getElementById('harmonicsCount').textContent = 
            Math.round(this.analysisData.features.harmonicsCount).toString();
        
        document.getElementById('spectralCentroid').textContent = 
            `${Math.round(this.analysisData.features.spectralCentroid)} Hz`;
        
        // 更新感知特征
        this.updatePerceptualAnalysis();
        
        // 更新MFCC显示
        this.drawMFCC();
    }

    calculateEffectiveDuration(timeData) {
        const threshold = 0.01; // 振幅阈值
        const shortSilenceThreshold = Math.floor(0.2 * this.audioAnalyzer.audioContext.sampleRate); // 200ms的静音阈值
        let effectiveSamples = 0;
        
        // 遍历当前帧的数据
        for (let i = 0; i < timeData.length; i++) {
            const amplitude = Math.abs(timeData[i]);
            
            if (amplitude > threshold) {
                // 检测到有效语音
                if (!this.analysisData.isInVoiceSegment) {
                    this.analysisData.isInVoiceSegment = true;
                }
                this.analysisData.silenceCounter = 0;
                effectiveSamples++;
            } else {
                // 检测到静音
                this.analysisData.silenceCounter++;
                
                if (this.analysisData.isInVoiceSegment && 
                    this.analysisData.silenceCounter < shortSilenceThreshold) {
                    // 短暂静音，仍计入有效音长
                    effectiveSamples++;
                } else if (this.analysisData.silenceCounter >= shortSilenceThreshold) {
                    // 超过阈值的静音，结束当前语音段
                    this.analysisData.isInVoiceSegment = false;
                }
            }
        }
        
        // 累加有效样本数
        this.analysisData.totalEffectiveSamples += effectiveSamples;
        
        // 返回总的有效音长（秒）
        return this.analysisData.totalEffectiveSamples / this.audioAnalyzer.audioContext.sampleRate;
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
        const rms = Math.sqrt(timeData.reduce((acc, val) => acc + val * val, 0) / timeData.length);
        return rms * rms; // 返回能量值而不是分贝值
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
} 