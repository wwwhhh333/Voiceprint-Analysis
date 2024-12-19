export class CompareAnalyzer {
    constructor() {
        this.features = {
            similarity: 0,
            timbreMatch: 0,
            featureMatch: 0
        };
        this.maxSamplePoints = 88200; // 2秒的采样数据
        this.fftSize = 2048;
        this.hopSize = 256; // FFT帧移，减小以提高时间分辨率
        this.offlineContext = new OfflineAudioContext(1, this.fftSize, 44100);
        this.analyzer = this.offlineContext.createAnalyser();
        this.analyzer.fftSize = this.fftSize;
        this.weights = {
            timbre: {
                harmonicStructure: 0.35, // 谐波结构权重
                spectralEnvelope: 0.35, // 频谱包络权重
                brightness: 0.15, // 音色亮度权重
                formants: 0.15  // 共振峰权重
            },
            voice: {
                speechRate: 0.3,
                pitchVariation: 0.4,
                energyDistribution: 0.3
            }
        };
    }

    compare(audioBufferA, audioBufferB) {
        console.time('compareAudio');
        
        // 对音频数据进行降采样
        const dataA = this.downSampleBuffer(audioBufferA);
        const dataB = this.downSampleBuffer(audioBufferB);
        
        try {
            // 计算基础特征
            const timbreFeatures = {
                harmonicStructure: this.calculateHarmonicStructure(dataA, dataB),
                spectralEnvelope: this.calculateSpectralEnvelope(dataA, dataB),
                brightness: this.calculateBrightness(dataA, dataB)
            };
            
            const voiceFeatures = {
                speechRate: this.calculateSpeechRate(dataA, dataB),
                pitchVariation: this.calculatePitchVariation(dataA, dataB),
                energyDistribution: this.calculateEnergyDistribution(dataA, dataB)
            };
            
            // 计算综合指标
            const timbreMatch = 
                this.weights.timbre.harmonicStructure * timbreFeatures.harmonicStructure +
                this.weights.timbre.spectralEnvelope * timbreFeatures.spectralEnvelope +
                this.weights.timbre.brightness * timbreFeatures.brightness;
            
            const featureMatch = 
                this.weights.voice.speechRate * voiceFeatures.speechRate +
                this.weights.voice.pitchVariation * voiceFeatures.pitchVariation +
                this.weights.voice.energyDistribution * voiceFeatures.energyDistribution;
            
            // 计算总体相似度
            const similarity = (timbreMatch + featureMatch) / 2;
            
            const details = {
                timbreFeatures,
                voiceFeatures
            };

            console.timeEnd('compareAudio');
            console.log('分析结果:', {
                similarity,
                timbreMatch,
                featureMatch,
                details
            });
            return {
                similarity,
                timbreMatch,
                featureMatch,
                details
            };
        } catch (error) {
            console.error('音频对比出错:', error);
            return {
                similarity: 0,
                timbreMatch: 0,
                featureMatch: 0,
                details: {
                    timbreFeatures: {
                        harmonicStructure: 0,
                        spectralEnvelope: 0,
                        brightness: 0
                    },
                    voiceFeatures: {
                        speechRate: 0,
                        pitchVariation: 0,
                        energyDistribution: 0
                    }
                }
            };
        }
    }

    // 计算谐波结构相似度
    calculateHarmonicStructure(dataA, dataB) {
        const harmonicsA = this.analyzeHarmonics(dataA);
        const harmonicsB = this.analyzeHarmonics(dataB);
        
        const diff = this.calculateArrayDifference(harmonicsA, harmonicsB);
        return 1 - Math.min(diff, 1);
    }

    // 分析谐波结构
    analyzeHarmonics(data) {
        // 应用汉宁窗
        const windowedData = this.applyWindow(data);
        
        // 计算频谱
        const spectrum = new Float32Array(this.fftSize / 2);
        for (let i = 0; i < this.fftSize / 2; i++) {
            let real = 0;
            let imag = 0;
            for (let j = 0; j < this.fftSize; j++) {
                const angle = (2 * Math.PI * i * j) / this.fftSize;
                real += windowedData[j] * Math.cos(angle);
                imag -= windowedData[j] * Math.sin(angle);
            }
            spectrum[i] = Math.sqrt(real * real + imag * imag);
        }
        
        return spectrum;
    }

    // 应用汉宁窗
    applyWindow(frame) {
        const windowed = new Float32Array(frame.length);
        for (let i = 0; i < frame.length; i++) {
            const hannWindow = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frame.length - 1)));
            windowed[i] = frame[i] * hannWindow;
        }
        return windowed;
    }

    // 对音频数据进行降采样和预处理
    downSampleBuffer(buffer) {
        const rawData = buffer.getChannelData(0);
        const sampleRate = Math.floor(rawData.length / this.maxSamplePoints) || 1;
        const result = new Float32Array(Math.floor(rawData.length / sampleRate));
        
        for (let i = 0; i < result.length; i++) {
            result[i] = rawData[i * sampleRate];
        }
        
        for (let i = 0; i < result.length; i++) {
            const hannWindow = 0.5 * (1 - Math.cos(2 * Math.PI * i / (result.length - 1)));
            result[i] *= hannWindow;
        }
        
        return result;
    }

    calculateEnergy(data) {
        return data.reduce((sum, sample) => sum + sample * sample, 0);
    }

    calculateSpectralCentroid(data) {
        let weightedSum = 0;
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            weightedSum += Math.abs(data[i]) * i;
            sum += Math.abs(data[i]);
        }
        return sum === 0 ? 0 : weightedSum / sum;
    }

    calculateZeroCrossingRate(data) {
        let crossings = 0;
        for (let i = 1; i < data.length; i++) {
            if ((data[i] * data[i - 1]) < 0) {
                crossings++;
            }
        }
        return crossings / data.length;
    }

    // 计算基频相似度
    calculatePitchSimilarity(dataA, dataB) {
        // 使用自相关法估算基频
        const pitchA = this.estimatePitch(dataA);
        const pitchB = this.estimatePitch(dataB);
        
        const diff = Math.abs(pitchA - pitchB) / Math.max(pitchA, pitchB);
        return 1 - Math.min(diff, 1);
    }

    // 计算频谱包络相似度
    calculateSpectralEnvelope(dataA, dataB) {
        // 计算频谱包络
        const envelopeA = this.calculateEnvelope(dataA);
        const envelopeB = this.calculateEnvelope(dataB);
        
        const diff = this.calculateArrayDifference(envelopeA, envelopeB);
        return 1 - Math.min(diff, 1);
    }

    // 计算音色亮度
    calculateBrightness(dataA, dataB) {
        // 计算高频能量占比
        const brightnessA = this.calculateHighFrequencyRatio(dataA);
        const brightnessB = this.calculateHighFrequencyRatio(dataB);
        
        const diff = Math.abs(brightnessA - brightnessB);
        return 1 - Math.min(diff, 1);
    }

    // 计算语速相似度
    calculateSpeechRate(dataA, dataB) {
        // 使用过零率估算语速
        const rateA = this.calculateZeroCrossingRate(dataA);
        const rateB = this.calculateZeroCrossingRate(dataB);
        
        const diff = Math.abs(rateA - rateB) / Math.max(rateA, rateB);
        return 1 - Math.min(diff, 1);
    }

    // 计算音高变化特征
    calculatePitchVariation(dataA, dataB) {
        // 计算音高变化率
        const variationA = this.calculateVariation(dataA);
        const variationB = this.calculateVariation(dataB);
        
        const diff = Math.abs(variationA - variationB) / Math.max(variationA, variationB);
        return 1 - Math.min(diff, 1);
    }

    // 计算能量分布特征
    calculateEnergyDistribution(dataA, dataB) {
        // 计算能量分布
        const distributionA = this.calculateEnergyBands(dataA);
        const distributionB = this.calculateEnergyBands(dataB);
        
        const diff = this.calculateArrayDifference(distributionA, distributionB);
        return 1 - Math.min(diff, 1);
    }

    // 辅助方法：估算基频
    estimatePitch(data) {
        const maxLag = Math.min(1000, data.length); // 限制最大延迟
        const correlations = new Float32Array(maxLag);
        for (let lag = 0; lag < maxLag; lag++) {
            const samplesCount = Math.min(1000, data.length - lag); // 限制采样点数
            let correlation = 0;
            for (let i = 0; i < samplesCount; i++) {
                correlation += data[i] * data[i + lag];
            }
            correlations[lag] = correlation;
        }
        return this.findPeaks(correlations)[0] || 0;
    }

    // 辅助方法：计算包络
    calculateEnvelope(data) {
        const envelope = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            envelope[i] = Math.abs(data[i]);
        }
        return envelope;
    }

    // 辅助方法：计算高频能量比
    calculateHighFrequencyRatio(data) {
        let highFreqEnergy = 0;
        let totalEnergy = 0;
        for (let i = 0; i < data.length; i++) {
            const energy = data[i] * data[i];
            totalEnergy += energy;
            if (i > data.length / 2) {
                highFreqEnergy += energy;
            }
        }
        return highFreqEnergy / totalEnergy;
    }

    // 辅助方法：计算变化率
    calculateVariation(data) {
        let variation = 0;
        for (let i = 1; i < data.length; i++) {
            variation += Math.abs(data[i] - data[i - 1]);
        }
        return variation / data.length;
    }

    // 辅助方法：计算能量频带
    calculateEnergyBands(data) {
        const bands = new Float32Array(8);
        const bandSize = Math.floor(data.length / 8);
        for (let i = 0; i < 8; i++) {
            let energy = 0;
            for (let j = 0; j < bandSize; j++) {
                const index = i * bandSize + j;
                if (index < data.length) {
                    energy += data[index] * data[index];
                }
            }
            bands[i] = energy;
        }
        return bands;
    }

    // 辅助方法：计算数组差异
    calculateArrayDifference(arrayA, arrayB) {
        const length = Math.min(arrayA.length, arrayB.length);
        let diff = 0;
        for (let i = 0; i < length; i++) {
            diff += Math.abs(arrayA[i] - arrayB[i]);
        }
        return diff / length;
    }

    // 辅助方法：寻找峰值
    findPeaks(data) {
        const peaks = [];
        for (let i = 1; i < data.length - 1; i++) {
            if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
                peaks.push(i);
            }
        }
        return peaks;
    }
} 