import { MeydaAnalyzer } from './MeydaAnalyzer.js';

export class CompareAnalyzer {
    constructor() {
        this.meydaAnalyzer = new MeydaAnalyzer();
    }

    /**
     * 对比两段音频的声纹特征
     * @param {AudioBuffer} audioBufferA - 第一段音频
     * @param {AudioBuffer} audioBufferB - 第二段音频
     * @returns {Object} 对比结果
     */
    async compare(audioBufferA, audioBufferB) {
        try {
            console.log('开始音频对比分析...');
            console.log('音频A长度:', audioBufferA.length, '采样率:', audioBufferA.sampleRate);
            console.log('音频B长度:', audioBufferB.length, '采样率:', audioBufferB.sampleRate);
            
            // 检查音频数据有效性
            if (!this.isValidAudioBuffer(audioBufferA) || !this.isValidAudioBuffer(audioBufferB)) {
                throw new Error('无效的音频数据');
            }
            
            // 提取两段音频的特征
            console.log('开始提取音频A的特征...');
            const featuresA = await this.meydaAnalyzer.extractFeatures(audioBufferA);
            console.log('音频A特征提取完成');
            
            console.log('开始提取音频B的特征...');
            const featuresB = await this.meydaAnalyzer.extractFeatures(audioBufferB);
            console.log('音频B特征提取完成');
            
            // 检查特征数据有效性
            if (!this.isValidFeatures(featuresA) || !this.isValidFeatures(featuresB)) {
                throw new Error('特征提取失败');
            }
            
            console.log('开始计算特征相似度...');
            const similarity = this.meydaAnalyzer.compareFeatures(featuresA, featuresB);
            console.log('相似度计算完成');
            
            // 构建详细的对比结果
            const result = {
                similarity: this.normalizeValue(similarity.overall),
                timbreMatch: this.normalizeValue(similarity.spectral),
                featureMatch: this.normalizeValue(similarity.mfcc),
                details: {
                    timbreFeatures: {
                        harmonicStructure: this.normalizeValue(similarity.mfcc),
                        spectralEnvelope: this.normalizeValue(similarity.spectral),
                        brightness: this.normalizeValue(
                            this.calculateRatio(featuresA.spectralCentroid, featuresB.spectralCentroid)
                        )
                    },
                    voiceFeatures: {
                        speechRate: this.normalizeValue(
                            this.calculateSimilarity(featuresA.zcr, featuresB.zcr)
                        ),
                        pitchVariation: this.normalizeValue(similarity.temporal),
                        energyDistribution: this.normalizeValue(
                            this.calculateSimilarity(featuresA.loudnessValue, featuresB.loudnessValue)
                        )
                    }
                }
            };
            
            console.log('对比分析完成');
            return result;
            
        } catch (error) {
            console.error('音频对比过程出错:', error);
            // 返回默认结果
            return this.getDefaultResult();
        }
    }
    
    /**
     * 计算两个值的相似度
     */
    calculateSimilarity(value1, value2) {
        if (value1 === undefined || value2 === undefined || 
            isNaN(value1) || isNaN(value2) || 
            (value1 === 0 && value2 === 0)) {
            return 0;
        }
        const diff = Math.abs(value1 - value2);
        const max = Math.max(Math.abs(value1), Math.abs(value2));
        return max === 0 ? 1 : 1 - (diff / max);
    }
    
    /**
     * 计算两个值的比率
     */
    calculateRatio(value1, value2) {
        if (value1 === undefined || value2 === undefined || 
            isNaN(value1) || isNaN(value2) || 
            value2 === 0) {
            return 0;
        }
        const ratio = value1 / value2;
        // 将比率转换为 0-1 范围的相似度
        return 1 / (1 + Math.abs(Math.log(ratio)));
    }
    
    /**
     * 检查音频缓冲区是否有效
     */
    isValidAudioBuffer(buffer) {
        return buffer && 
               buffer.length > 0 && 
               buffer.sampleRate > 0 && 
               buffer.numberOfChannels > 0;
    }
    
    /**
     * 检查特征数据是否有效
     */
    isValidFeatures(features) {
        return features && 
               features.mfcc && 
               Array.isArray(features.mfcc) && 
               features.mfcc.length > 0;
    }
    
    /**
     * 将数值标准化到 0-1 范围
     */
    normalizeValue(value) {
        if (isNaN(value) || !isFinite(value)) return 0;
        return Math.max(0, Math.min(1, value));
    }
    
    /**
     * 获取默认的对比结果
     */
    getDefaultResult() {
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