/**
 * 使用 Meyda 库进行专业的声纹特征提取
 */
export class MeydaAnalyzer {
    constructor() {
        this.features = [
            'mfcc',           // 梅尔频率倒谱系数
            'spectralCentroid', // 频谱质心
            'spectralRolloff',  // 频谱滚降点
            'spectralFlatness', // 频谱平坦度
            'spectralSpread',   // 频谱扩散度
            'rms',             // 均方根能量
            'zcr',             // 过零率
            'energy',          // 能量
            'perceptualSpread', // 感知频谱扩散
            'perceptualSharpness' // 感知锐度
        ];
        
        // 创建离线音频上下文
        this.audioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 2048, 44100);
    }

    /**
     * 从音频缓冲区提取声纹特征
     * @param {AudioBuffer} audioBuffer - 音频缓冲区
     * @returns {Object} 提取的声纹特征
     */
    async extractFeatures(audioBuffer) {
        try {
            console.log('开始提取特征...');
            const audioData = audioBuffer.getChannelData(0); // 获取单声道数据
            const frameSize = 2048;
            const features = {};
            
            // 分帧处理音频数据
            const numFrames = Math.floor(audioData.length / frameSize);
            const frameFeatures = [];
            
            // 配置 Meyda
            Meyda.bufferSize = frameSize;
            
            for (let i = 0; i < numFrames; i++) {
                const frame = audioData.slice(i * frameSize, (i + 1) * frameSize);
                try {
                    const frameFeature = Meyda.extract(this.features, frame);
                    if (frameFeature) {
                        // 计算响度值（使用 RMS 和能量特征的组合）
                        frameFeature.loudnessValue = this.calculateLoudnessValue(frameFeature);
                        frameFeatures.push(frameFeature);
                    }
                } catch (error) {
                    console.warn('帧特征提取失败:', error);
                    continue;
                }
            }
            
            console.log('帧特征提取完成，总帧数:', frameFeatures.length);
            
            if (frameFeatures.length === 0) {
                throw new Error('没有成功提取到任何特征');
            }
            
            // 计算每个特征的平均值
            this.features.forEach(feature => {
                if (feature === 'mfcc') {
                    features[feature] = this.averageMFCC(frameFeatures);
                } else {
                    features[feature] = this.averageFeature(frameFeatures, feature);
                }
            });
            
            // 添加响度值
            features.loudnessValue = this.averageFeature(frameFeatures, 'loudnessValue');
            
            return features;
            
        } catch (error) {
            console.error('特征提取错误:', error);
            throw error;
        }
    }
    
    /**
     * 计算响度值
     * @param {Object} features - 帧特征对象
     * @returns {number} 响度值
     */
    calculateLoudnessValue(features) {
        if (!features) return 0;
        
        // 使用 RMS 和能量特征的加权组合来估算响度
        const rms = features.rms || 0;
        const energy = features.energy || 0;
        
        // RMS 权重为 0.7，能量权重为 0.3
        return (rms * 0.7 + energy * 0.3);
    }
    
    /**
     * 计算 MFCC 系数的平均值
     * @param {Array} frameFeatures - 每帧的特征数据
     * @returns {Array} MFCC 平均值
     */
    averageMFCC(frameFeatures) {
        try {
            const validFeatures = frameFeatures.filter(frame => frame && frame.mfcc && Array.isArray(frame.mfcc));
            if (validFeatures.length === 0) {
                console.warn('没有有效的 MFCC 特征');
                return new Array(13).fill(0);
            }
            
            const mfccSum = new Array(13).fill(0);
            validFeatures.forEach(frame => {
                frame.mfcc.forEach((value, index) => {
                    if (!isNaN(value)) {
                        mfccSum[index] += value;
                    }
                });
            });
            return mfccSum.map(sum => sum / validFeatures.length);
        } catch (error) {
            console.error('MFCC 平均值计算错误:', error);
            return new Array(13).fill(0);
        }
    }
    
    /**
     * 计算单个特征的平均值
     * @param {Array} frameFeatures - 每帧的特征数据
     * @param {string} feature - 特征名称
     * @returns {number} 特征平均值
     */
    averageFeature(frameFeatures, feature) {
        try {
            const validFeatures = frameFeatures.filter(frame => 
                frame && 
                frame[feature] !== undefined && 
                !isNaN(frame[feature]) && 
                isFinite(frame[feature])
            );
            
            if (validFeatures.length === 0) {
                console.warn(`没有有效的 ${feature} 特征`);
                return 0;
            }
            
            const sum = validFeatures.reduce((acc, frame) => acc + frame[feature], 0);
            return sum / validFeatures.length;
        } catch (error) {
            console.error(`${feature} 平均值计算错误:`, error);
            return 0;
        }
    }
    
    /**
     * 计算两组特征之间的相似度
     * @param {Object} features1 - 第一个音频的特征
     * @param {Object} features2 - 第二个音频的特征
     * @returns {Object} 相似度分析结果
     */
    compareFeatures(features1, features2) {
        try {
            console.log('开始计算特征相似度');
            
            const similarity = {
                mfcc: this.calculateMFCCSimilarity(features1.mfcc, features2.mfcc),
                spectral: this.calculateSpectralSimilarity(features1, features2),
                temporal: this.calculateTemporalSimilarity(features1, features2),
                perceptual: this.calculatePerceptualSimilarity(features1, features2),
                overall: 0
            };
            
            // 计算总体相似度（加权平均）
            similarity.overall = (
                similarity.mfcc * 0.4 +       // MFCC 特征权重
                similarity.spectral * 0.3 +    // 频谱特征权重
                similarity.temporal * 0.2 +    // 时域特征权重
                similarity.perceptual * 0.1    // 感知特征权重
            );
            
            console.log('相似度计算结果:', similarity);
            return similarity;
        } catch (error) {
            console.error('特征比较错误:', error);
            return {
                mfcc: 0,
                spectral: 0,
                temporal: 0,
                perceptual: 0,
                overall: 0
            };
        }
    }
    
    /**
     * 计算感知特征的相似度
     */
    calculatePerceptualSimilarity(features1, features2) {
        try {
            const perceptualFeatures = ['perceptualSpread', 'perceptualSharpness', 'loudnessValue'];
            let totalDiff = 0;
            let validFeatures = 0;
            
            perceptualFeatures.forEach(feature => {
                if (features1[feature] !== undefined && features2[feature] !== undefined &&
                    !isNaN(features1[feature]) && !isNaN(features2[feature]) &&
                    features1[feature] !== 0 && features2[feature] !== 0) {
                    const diff = Math.abs(features1[feature] - features2[feature]);
                    const normalizedDiff = diff / Math.max(features1[feature], features2[feature]);
                    totalDiff += normalizedDiff;
                    validFeatures++;
                }
            });
            
            return validFeatures > 0 ? 1 - (totalDiff / validFeatures) : 0;
        } catch (error) {
            console.error('感知特征相似度计算错误:', error);
            return 0;
        }
    }
    
    /**
     * 计算 MFCC 特征的相似度
     */
    calculateMFCCSimilarity(mfcc1, mfcc2) {
        try {
            if (!Array.isArray(mfcc1) || !Array.isArray(mfcc2)) {
                console.warn('MFCC 数据无效');
                return 0;
            }
            
            const length = Math.min(mfcc1.length, mfcc2.length);
            if (length === 0) return 0;
            
            const squaredDiffs = [];
            for (let i = 0; i < length; i++) {
                if (!isNaN(mfcc1[i]) && !isNaN(mfcc2[i])) {
                    const diff = mfcc1[i] - mfcc2[i];
                    squaredDiffs.push(diff * diff);
                }
            }
            
            if (squaredDiffs.length === 0) return 0;
            
            const mse = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
            return 1 / (1 + Math.sqrt(mse)); // 转换为 0-1 范围的相似度
        } catch (error) {
            console.error('MFCC 相似度计算错误:', error);
            return 0;
        }
    }
    
    /**
     * 计算频谱特征的相似度
     */
    calculateSpectralSimilarity(features1, features2) {
        try {
            const spectralFeatures = ['spectralCentroid', 'spectralRolloff', 'spectralFlatness', 'spectralSpread'];
            let totalDiff = 0;
            let validFeatures = 0;
            
            spectralFeatures.forEach(feature => {
                if (features1[feature] !== undefined && features2[feature] !== undefined &&
                    !isNaN(features1[feature]) && !isNaN(features2[feature]) &&
                    features1[feature] !== 0 && features2[feature] !== 0) {
                    const diff = Math.abs(features1[feature] - features2[feature]);
                    const normalizedDiff = diff / Math.max(features1[feature], features2[feature]);
                    totalDiff += normalizedDiff;
                    validFeatures++;
                }
            });
            
            return validFeatures > 0 ? 1 - (totalDiff / validFeatures) : 0;
        } catch (error) {
            console.error('频谱相似度计算错误:', error);
            return 0;
        }
    }
    
    /**
     * 计算时域特征的相似度
     */
    calculateTemporalSimilarity(features1, features2) {
        try {
            const temporalFeatures = ['rms', 'zcr', 'energy'];
            let totalDiff = 0;
            let validFeatures = 0;
            
            temporalFeatures.forEach(feature => {
                if (features1[feature] !== undefined && features2[feature] !== undefined &&
                    !isNaN(features1[feature]) && !isNaN(features2[feature]) &&
                    features1[feature] !== 0 && features2[feature] !== 0) {
                    const diff = Math.abs(features1[feature] - features2[feature]);
                    const normalizedDiff = diff / Math.max(features1[feature], features2[feature]);
                    totalDiff += normalizedDiff;
                    validFeatures++;
                }
            });
            
            return validFeatures > 0 ? 1 - (totalDiff / validFeatures) : 0;
        } catch (error) {
            console.error('时域相似度计算错误:', error);
            return 0;
        }
    }
} 