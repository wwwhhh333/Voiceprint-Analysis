export class CompareAnalyzer {
    constructor() {
        this.features = {
            similarity: 0,
            timbreMatch: 0,
            featureMatch: 0
        };
        // 设置分析的采样点数量上限
        this.maxSamplePoints = 44100; // 1秒的采样数据
    }

    // 对音频数据进行降采样
    downSampleBuffer(buffer) {
        const rawData = buffer.getChannelData(0);
        const sampleRate = Math.floor(rawData.length / this.maxSamplePoints) || 1;
        const result = new Float32Array(Math.floor(rawData.length / sampleRate));
        
        for (let i = 0; i < result.length; i++) {
            result[i] = rawData[i * sampleRate];
        }
        
        return result;
    }

    compare(audioBufferA, audioBufferB) {
        console.time('compareAudio');
        
        // 对音频数据进行降采样
        const dataA = this.downSampleBuffer(audioBufferA);
        const dataB = this.downSampleBuffer(audioBufferB);
        
        // 基本声纹特征对比
        const similarity = this.calculateSimilarity(dataA, dataB);
        
        // 音色特征对比
        const timbreMatch = this.calculateTimbreMatch(dataA, dataB);
        
        // 语音特征对比
        const featureMatch = this.calculateFeatureMatch(dataA, dataB);

        // 计算详细的对比指标
        const details = {
            // 基频相似度
            pitchSimilarity: this.calculatePitchSimilarity(dataA, dataB),
            // 音色特征
            timbreFeatures: {
                // 谐波结构相似度
                harmonicStructure: this.calculateHarmonicStructure(dataA, dataB),
                // 频谱包络相似度
                spectralEnvelope: this.calculateSpectralEnvelope(dataA, dataB),
                // 音色亮度对比
                brightness: this.calculateBrightness(dataA, dataB)
            },
            // 语音特征
            voiceFeatures: {
                // 语速相似度
                speechRate: this.calculateSpeechRate(dataA, dataB),
                // 音高变化特征
                pitchVariation: this.calculatePitchVariation(dataA, dataB),
                // 能量分布特征
                energyDistribution: this.calculateEnergyDistribution(dataA, dataB)
            }
        };

        console.timeEnd('compareAudio');
        return {
            similarity,
            timbreMatch,
            featureMatch,
            details
        };
    }

    calculateSimilarity(dataA, dataB) {
        // 计算能量差异
        const energyA = this.calculateEnergy(dataA);
        const energyB = this.calculateEnergy(dataB);
        
        // 归一化差异
        const diff = Math.abs(energyA - energyB) / Math.max(energyA, energyB);
        return 1 - diff;
    }

    calculateTimbreMatch(dataA, dataB) {
        // 计算频谱质心差异
        const centroidA = this.calculateSpectralCentroid(dataA);
        const centroidB = this.calculateSpectralCentroid(dataB);
        
        // 归一化差异
        const diff = Math.abs(centroidA - centroidB) / Math.max(centroidA, centroidB);
        return 1 - diff;
    }

    calculateFeatureMatch(dataA, dataB) {
        // 计算过零率差异
        const zcrA = this.calculateZeroCrossingRate(dataA);
        const zcrB = this.calculateZeroCrossingRate(dataB);
        
        // 归一化差异
        const diff = Math.abs(zcrA - zcrB) / Math.max(zcrA, zcrB);
        return 1 - diff;
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

    // 计算谐波结构相似度
    calculateHarmonicStructure(dataA, dataB) {
        // 使用FFT分析谐波结构
        const harmonicsA = this.analyzeHarmonics(dataA);
        const harmonicsB = this.analyzeHarmonics(dataB);
        
        // 计算谐波结构的相似度
        const diff = this.calculateArrayDifference(harmonicsA, harmonicsB);
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

    // 辅助方法：分析谐波结构
    analyzeHarmonics(data) {
        const fftSize = 2048; // 使用固定的FFT大小
        const fft = new Float32Array(fftSize);
        // 简化的FFT计算
        for (let i = 0; i < fftSize; i++) {
            fft[i] = Math.abs(data[i % data.length]);
        }
        return fft;
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