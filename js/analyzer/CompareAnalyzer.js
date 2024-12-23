import { MeydaAnalyzer } from './MeydaAnalyzer.js';

export class CompareAnalyzer {
    constructor() {
        this.meydaAnalyzer = new MeydaAnalyzer();
    }

    /**
     * 计算统计特征的差异
     * @param {Object} stats1 - 第一个音频的统计特征
     * @param {Object} stats2 - 第二个音频的统计特征
     * @returns {Object} 统计特征的差异
     */
    calculateStatsDifference(stats1, stats2) {
        const result = {};
        
        //处理每个特征的统计数据
        ['rms', 'spectralCentroid', 'zcr'].forEach(feature => {
            if (stats1[feature] && stats2[feature]) {
                const meanDiff = Math.abs(stats1[feature].mean - stats2[feature].mean) / 
                    Math.max(Math.abs(stats1[feature].mean), Math.abs(stats2[feature].mean));
                
                const stdDiff = Math.abs(stats1[feature].stdDev - stats2[feature].stdDev) / 
                    Math.max(stats1[feature].stdDev, stats2[feature].stdDev);
                
                const changeRateDiff = Math.abs(stats1[feature].changeRate - stats2[feature].changeRate) / 
                    Math.max(stats1[feature].changeRate, stats2[feature].changeRate);
                
                result[feature] = {
                    meanDiff: 1 - meanDiff,
                    stdDiff: 1 - stdDiff,
                    changeRateDiff: 1 - changeRateDiff
                };
            } else {
                result[feature] = {
                    meanDiff: 0,
                    stdDiff: 0,
                    changeRateDiff: 0
                };
            }
        });
        
        return result;
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
            
            if (!this.isValidAudioBuffer(audioBufferA) || !this.isValidAudioBuffer(audioBufferB)) {
                throw new Error('无效的音频数据');
            }
            
            //提取两段音频的特征
            console.log('开始提取音频A的特征...');
            const featuresA = await this.meydaAnalyzer.extractFeatures(audioBufferA);
            console.log('音频A特征提取完成');
            
            console.log('开始提取音频B的特征...');
            const featuresB = await this.meydaAnalyzer.extractFeatures(audioBufferB);
            console.log('音频B特征提取完成');
            
            if (!this.isValidFeatures(featuresA) || !this.isValidFeatures(featuresB)) {
                throw new Error('特征提取失败');
            }
            
            //计算统计特征差异
            const statsDiff = this.calculateStatsDifference(
                featuresA.statistics,
                featuresB.statistics
            );

            //1、节奏相似度
            const rhythmMatch = this.calculateRhythmMatch(featuresA, featuresB); //节奏相似度
            const speedMatch = this.calculateSpeedMatch(featuresA, featuresB); //语速匹配度
            const durationRatio = this.calculateDurationRatio(audioBufferA.duration, audioBufferB.duration); //时长比例
            const rhythmSimilarity = (speedMatch * 0.4 + rhythmMatch * 0.4 + durationRatio * 0.2); 

            //2、音色相似度
            const similarity = this.meydaAnalyzer.compareFeatures(featuresA, featuresB); //计算特征相似度
            const timbreSimilarity = this.normalizeValue(similarity.spectral); 

            //3、声学特征相似度
            const pitchMatch = this.calculatePitchMatch(featuresA, featuresB); //音高相似度
            const acousticSimilarity = this.normalizeValue(
                (similarity.mfcc * 0.4 + similarity.spectral * 0.3 + pitchMatch * 0.3)
            ); 

            //总体相似度
            const totalSimilarity = this.normalizeValue(
                timbreSimilarity * 0.4 + 
                acousticSimilarity * 0.3 + 
                rhythmSimilarity * 0.3
            ); 

            //对比结果
            const result = {
                totalSimilarity,
                timbreSimilarity,
                acousticSimilarity,
                rhythmSimilarity,
                similarity: totalSimilarity,
                timbreMatch: timbreSimilarity,
                pitchMatch: pitchMatch,
                rhythmMatch: rhythmMatch,
                rhythmFeatures: {
                    speedMatch,
                    rhythmMatch,
                    durationRatio
                },
                details: {
                    timbreFeatures: {
                        harmonicsMatch: this.normalizeValue(similarity.mfcc),
                        spectralMatch: this.normalizeValue(similarity.spectral),
                        timbreFeatureMatch: this.normalizeValue(
                            this.calculateRatio(featuresA.spectralCentroid, featuresB.spectralCentroid)
                        )
                    },
                    pitchRangeMatch: this.normalizeValue(
                        this.calculatePitchRangeMatch(featuresA, featuresB)
                    ),
                    energyMatch: this.normalizeValue(
                        this.calculateSimilarity(featuresA.loudnessValue, featuresB.loudnessValue)
                    ),
                    formantMatch: this.normalizeValue(
                        this.calculateFormantMatch(featuresA, featuresB)
                    )
                }
            };
            
            console.log('对比分析完成，结果：', result);
            return result;
            
        } catch (error) {
            console.error('音频对比过程出错:', error);
            return this.getDefaultResult();
        }
    }
    
    calculateSimilarity(value1, value2) { //计算两个值的相似度
        if (value1 === undefined || value2 === undefined || 
            isNaN(value1) || isNaN(value2) || 
            (value1 === 0 && value2 === 0)) {
            return 0;
        }
        const diff = Math.abs(value1 - value2);
        const max = Math.max(Math.abs(value1), Math.abs(value2));
        return max === 0 ? 1 : 1 - (diff / max);
    }
    
    //计算两个值的比率
    calculateRatio(value1, value2) { //计算两个值的比率
        if (value1 === undefined || value2 === undefined || 
            isNaN(value1) || isNaN(value2) || 
            value2 === 0) {
            return 0;
        }
        const ratio = value1 / value2;
        // 将比率转换为 0-1 范围的相似度
        return 1 / (1 + Math.abs(Math.log(ratio)));
    }
    
    isValidAudioBuffer(buffer) { //音频缓冲区是否有效
        return buffer && 
               buffer.length > 0 && 
               buffer.sampleRate > 0 && 
               buffer.numberOfChannels > 0;
    }
    
    isValidFeatures(features) { //特征数据是否有效
        return features && 
               features.mfcc && 
               Array.isArray(features.mfcc) && 
               features.mfcc.length > 0;
    }
    
    normalizeValue(value) { //将数值标准化到 0-1 范围
        if (isNaN(value) || !isFinite(value)) return 0;
        return Math.max(0, Math.min(1, value));
    }
    
   
    getDefaultResult() { //默认对比结果
        return {
            similarity: 0,
            timbreMatch: 0,
            pitchMatch: 0,
            rhythmMatch: 0,
            details: {
                timbreFeatures: {
                    harmonicsMatch: 0,
                    spectralMatch: 0,
                    timbreFeatureMatch: 0
                },
                pitchRangeMatch: 0,
                energyMatch: 0,
                formantMatch: 0
            }
        };
    }

    calculatePitchMatch(featuresA, featuresB) { //音高相似度
        const pitchFactors = {
            range: 0.3,    //音高范围权重
            variation: 0.4, //音高变化曲线权重
            stability: 0.3  //音高稳定性权重
        };

        //音高范围匹配度
        const rangeMatch = this.calculateSimilarity(
            featuresA.spectralCentroid,
            featuresB.spectralCentroid
        );

        //音高变化曲线匹配度
        const variationMatch = this.calculateSimilarity(
            featuresA.statistics.spectralCentroid.changeRate,
            featuresB.statistics.spectralCentroid.changeRate
        );

        //音高稳定性匹配度
        const stabilityMatch = this.calculateSimilarity(
            featuresA.statistics.spectralCentroid.stdDev,
            featuresB.statistics.spectralCentroid.stdDev
        );

        //加权平均
        return (
            rangeMatch * pitchFactors.range +
            variationMatch * pitchFactors.variation +
            stabilityMatch * pitchFactors.stability
        );
    }

    calculateRhythmMatch(featuresA, featuresB) { //节奏相似度
        const rhythmFactors = {
            tempo: 0.35,     //语速匹配权重
            pause: 0.35,     //停顿模式权重
            emphasis: 0.30   //重音分布权重
        };

        //语速匹配度（使用过零率）
        const tempoMatch = this.calculateSimilarity(
            featuresA.statistics.zcr.mean,
            featuresB.statistics.zcr.mean
        );

        //停顿模式匹配度（使用RMS能量变化）
        const pauseMatch = this.calculateSimilarity(
            featuresA.statistics.rms.changeRate,
            featuresB.statistics.rms.changeRate
        );

        //重音分布匹配度（使用RMS能量标准差）
        const emphasisMatch = this.calculateSimilarity(
            featuresA.statistics.rms.stdDev,
            featuresB.statistics.rms.stdDev
        );

        //加权平均
        return (
            tempoMatch * rhythmFactors.tempo +
            pauseMatch * rhythmFactors.pause +
            emphasisMatch * rhythmFactors.emphasis
        );
    }

    //计算音高范围匹配度
    calculatePitchRangeMatch(featuresA, featuresB) {
        const rangeFactors = {
            overlap: 0.4,    //范围重叠权重
            center: 0.3,     //中心频率权重
            variation: 0.3   //变化幅度权重
        };

        //频率范围重叠度
        const overlapMatch = this.calculateSimilarity(
            featuresA.spectralCentroid,
            featuresB.spectralCentroid
        );

        //中心频率匹配度
        const centerMatch = this.calculateSimilarity(
            featuresA.statistics.spectralCentroid.mean,
            featuresB.statistics.spectralCentroid.mean
        );

        //变化幅度匹配度
        const variationMatch = this.calculateSimilarity(
            featuresA.statistics.spectralCentroid.stdDev,
            featuresB.statistics.spectralCentroid.stdDev
        );

        //加权平均
        return (
            overlapMatch * rangeFactors.overlap +
            centerMatch * rangeFactors.center +
            variationMatch * rangeFactors.variation
        );
    }
   
    calculateFormantMatch(featuresA, featuresB) { //计算共振峰匹配度
        const formantFactors = { //使用MFCC系数的前三个分量来近似表示共振峰特征
            f1: 0.4,  //第一共振峰权重
            f2: 0.35, //第二共振峰权重
            f3: 0.25  //第三共振峰权重
        };

        if (!featuresA.mfcc || !featuresB.mfcc || 
            featuresA.mfcc.length < 3 || featuresB.mfcc.length < 3) {
            return 0;
        }

        const f1Match = this.calculateSimilarity(featuresA.mfcc[0], featuresB.mfcc[0]);
        const f2Match = this.calculateSimilarity(featuresA.mfcc[1], featuresB.mfcc[1]);
        const f3Match = this.calculateSimilarity(featuresA.mfcc[2], featuresB.mfcc[2]);

        return (
            f1Match * formantFactors.f1 +
            f2Match * formantFactors.f2 +
            f3Match * formantFactors.f3
        );
    }

    calculateSpeedMatch(featuresA, featuresB) { //计算语速匹配度
        try {
            const speedA = this.calculateAverageSpeechRate(featuresA);
            const speedB = this.calculateAverageSpeechRate(featuresB);
            
            if (speedA === 0 && speedB === 0) return 1;
            if (speedA === 0 || speedB === 0) return 0;
            
            //计算语速比例，确保结果在0-1之间
            const ratio = Math.min(speedA, speedB) / Math.max(speedA, speedB);
            return this.normalizeValue(ratio);
        } catch (error) {
            console.error('计算语速匹配度时出错:', error);
            return 0;
        }
    }

    calculateAverageSpeechRate(features) { //计算平均语速
        try {
            if (!features || !features.statistics) {
                console.warn('特征数据不完整');
                return 0;
            }

            const stats = features.statistics;
            let speedValue = 0;
            let validFactors = 0;

            //使用过零率均值
            if (stats.zcr && typeof stats.zcr.mean === 'number') {
                speedValue += stats.zcr.mean * 0.6;
                validFactors += 0.6;
            }

            //使用RMS能量均值
            if (stats.rms && typeof stats.rms.mean === 'number') {
                speedValue += stats.rms.mean * 0.4;
                validFactors += 0.4;
            }

            if (validFactors === 0) {
                console.warn('无有效的语速特征数据');
                return 0;
            }

            // 归一化结果
            return speedValue / validFactors;
        } catch (error) {
            console.error('计算平均语速时出错:', error);
            return 0;
        }
    }

    calculateDurationRatio(durationA, durationB) { //计算时长比例
        return Math.min(durationA, durationB) / Math.max(durationA, durationB);
    }

    extractRhythmPattern(features) { //节奏模式
        const rms = features.rms || [];
        if (rms.length === 0) return [];
        
        const pattern = [];
        for (let i = 1; i < rms.length; i++) {
            pattern.push(rms[i] - rms[i-1]);
        }
        
        return pattern;
    }

    comparePatterns(patternA, patternB) { //比较两个节奏模式
        if (patternA.length === 0 || patternB.length === 0) {
            return 0;
        }
        
        // 将两个模式归一化到相同长度
        const length = Math.min(patternA.length, patternB.length);
        const normalizedA = this.normalizePattern(patternA, length);
        const normalizedB = this.normalizePattern(patternB, length);
        
        // 计算相关系数
        let similarity = 0;
        for (let i = 0; i < length; i++) {
            similarity += 1 - Math.abs(normalizedA[i] - normalizedB[i]);
        }
        
        return similarity / length;
    }

    normalizePattern(pattern, targetLength) { //归一化节奏模式
        if (pattern.length === targetLength) return pattern;
        
        const normalized = new Array(targetLength);
        const ratio = pattern.length / targetLength;
        
        for (let i = 0; i < targetLength; i++) {
            const pos = Math.floor(i * ratio);
            normalized[i] = pattern[pos];
        }
        
        return normalized;
    }
} 