//使用Meyda库提取音频特征

export class MeydaAnalyzer {
    constructor() {
        this.features = [
            'mfcc',                 //MFCC
            'spectralCentroid',     //频谱质心
            'spectralRolloff',      //频谱滚降
            'spectralFlatness',     //频谱平坦度
            'spectralSpread',       //频谱扩散
            'perceptualSpread',     //感知扩散
            'perceptualSharpness',  //感知锐度
            'rms',                  //短时能量
            'zcr',                  //过零率
            'loudness'              //响度
        ];
        
       
        this.mfccCoefficients = 13; //MFCC系数数量
        
        this.frameSize = 2048; //帧大小
        this.hopSize = 1024; //重叠 
    }
    
    /**
     * 提取音频特征
     * @param {AudioBuffer} audioBuffer - 音频缓冲区
     * @returns {Object} 提取的特征
     */
    async extractFeatures(audioBuffer) { //提取音频特征
        try {
            console.log('开始提取特征...');
            console.log('音频信息:', {
                duration: audioBuffer.duration,
                sampleRate: audioBuffer.sampleRate,
                numberOfChannels: audioBuffer.numberOfChannels,
                length: audioBuffer.length
            });
            
            const offlineCtx = new OfflineAudioContext(
                1,
                audioBuffer.length,
                audioBuffer.sampleRate
            );
            
            const sourceNode = offlineCtx.createBufferSource();
            sourceNode.buffer = audioBuffer;
            
            const scriptNode = offlineCtx.createScriptProcessor(this.frameSize, 1, 1);
            
            const frames = []; //存储每一帧的特征
            
            //创建Meyda分析器
            const meydaAnalyzer = Meyda.createMeydaAnalyzer({
                audioContext: offlineCtx,
                source: sourceNode,
                bufferSize: this.frameSize,
                numberOfMFCCCoefficients: this.mfccCoefficients,
                featureExtractors: this.features
            });
            
            console.log('Meyda分析器创建完成');
            
            //音频处理回调
            return new Promise((resolve, reject) => {
                scriptNode.onaudioprocess = (e) => {
                    try {
                        const features = meydaAnalyzer.get();
                        if (features) {
                            frames.push(features);
                        }
                    } catch (error) {
                        console.error('处理音频帧时出错:', error);
                    }
                };
                
                //渲染完成回调
                offlineCtx.oncomplete = async (e) => {
                    try {
                        console.log('特征提取完成，帧数:', frames.length);
                        
                        //统计特征
                        const statistics = this.calculateStatistics(frames);
                        console.log('统计特征:', statistics);
                        
                        //平均特征
                        const mfcc = this.averageMFCC(frames);
                        console.log('MFCC特征:', mfcc);
                        
                        const spectralCentroid = this.averageFeature(frames, 'spectralCentroid');
                        const spectralRolloff = this.averageFeature(frames, 'spectralRolloff');
                        const spectralFlatness = this.averageFeature(frames, 'spectralFlatness');
                        const spectralSpread = this.averageFeature(frames, 'spectralSpread');
                        const perceptualSpread = this.averageFeature(frames, 'perceptualSpread');
                        const perceptualSharpness = this.averageFeature(frames, 'perceptualSharpness');
                        const rms = this.averageFeature(frames, 'rms');
                        const zcr = this.averageFeature(frames, 'zcr');
                        const loudnessValue = this.calculateLoudnessValue(frames);
                        
                        console.log('平均特征:', {
                            spectralCentroid,
                            spectralRolloff,
                            spectralFlatness,
                            spectralSpread,
                            perceptualSpread,
                            perceptualSharpness,
                            rms,
                            zcr,
                            loudnessValue
                        });
                        
                        resolve({
                            mfcc,
                            spectralCentroid,
                            spectralRolloff,
                            spectralFlatness,
                            spectralSpread,
                            perceptualSpread,
                            perceptualSharpness,
                            rms,
                            zcr,
                            loudnessValue,
                            statistics
                        });
                    } catch (error) {
                        reject(error);
                    }
                };
                
                //连接节点
                sourceNode.connect(scriptNode);
                scriptNode.connect(offlineCtx.destination);
                
                //开始处理
                meydaAnalyzer.start();
                sourceNode.start(0);
                offlineCtx.startRendering().catch(reject);
            });
            
        } catch (error) {
            console.error('特征提取失败:', error);
            console.error('错误堆栈:', error.stack);
            return null;
        }
    }
    
    /**
     * 计算统计特征
     * @param {Array} frames - 帧特征数组
     * @returns {Object} 统计特征
     */
    calculateStatistics(frames) {
        if (!frames || frames.length === 0) {
            console.warn('没有有效的帧数据用于计算统计特征');
            return {
                rms: { mean: 0, stdDev: 0, changeRate: 0 },
                spectralCentroid: { mean: 0, stdDev: 0, changeRate: 0 },
                zcr: { mean: 0, stdDev: 0, changeRate: 0 }
            };
        }
        
        const features = ['rms', 'spectralCentroid', 'zcr'];
        const stats = {};
        
        features.forEach(feature => {
            const values = frames
                .map(frame => frame[feature])
                .filter(val => val !== undefined && !isNaN(val));
            
            if (values.length === 0) {
                console.warn(`没有有效的${feature}数据`);
                stats[feature] = { mean: 0, stdDev: 0, changeRate: 0 };
                return;
            }
            
           
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length; //计算平均值
            
            //标准差
            const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
            const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
            const stdDev = Math.sqrt(variance);
            
            //变化率
            let changes = 0;
            for (let i = 1; i < values.length; i++) {
                if (Math.abs(values[i] - values[i-1]) > stdDev * 0.1) {
                    changes++;
                }
            }
            const changeRate = changes / (values.length - 1);
            
            stats[feature] = { mean, stdDev, changeRate };
        });
        
        return stats;
    }
    
    /**
     * 计算平均MFCC
     * @param {Array} frames - 帧特征数组
     * @returns {Array} 平均MFCC
     */
    averageMFCC(frames) {
        if (!frames || frames.length === 0) {
            console.warn('没有有效的帧数据用于计算MFCC');
            return new Array(this.mfccCoefficients).fill(0);
        }
        
        const validFrames = frames.filter(frame => frame.mfcc && Array.isArray(frame.mfcc));
        if (validFrames.length === 0) {
            console.warn('没有包含有效MFCC数据的帧');
            return new Array(this.mfccCoefficients).fill(0);
        }
        
        const mfccSum = validFrames.reduce((sum, frame) => {
            return sum.map((val, i) => val + (frame.mfcc[i] || 0));
        }, new Array(this.mfccCoefficients).fill(0));
        
        return mfccSum.map(sum => sum / validFrames.length);
    }
    
    /**
     * 计算平均特征值
     * @param {Array} frames - 帧特征数组
     * @param {string} featureName - 特征名称
     * @returns {number} 平均特征值
     */
    averageFeature(frames, featureName) {
        if (!frames || frames.length === 0) {
            console.warn(`没有有效的帧数据用于计算${featureName}`);
            return 0;
        }
        
        const validFrames = frames.filter(frame => 
            frame[featureName] !== undefined && 
            !isNaN(frame[featureName])
        );
        
        if (validFrames.length === 0) {
            console.warn(`没有包含有效${featureName}数据的帧`);
            return 0;
        }
        
        const sum = validFrames.reduce((acc, frame) => acc + frame[featureName], 0);
        return sum / validFrames.length;
    }
    
    /**
     * 计算响度值
     * @param {Array} frames - 帧特征数组
     * @returns {number} 响度值
     */
    calculateLoudnessValue(frames) {
        if (!frames || frames.length === 0) {
            console.warn('没有有效的帧数据用于计算响度');
            return 0;
        }
        
        const validFrames = frames.filter(frame => 
            frame.loudness && 
            typeof frame.loudness.total === 'number' && 
            !isNaN(frame.loudness.total)
        );
        
        if (validFrames.length === 0) {
            console.warn('没有包含有效响度数据的帧');
            return 0;
        }
        
        const sum = validFrames.reduce((acc, frame) => acc + frame.loudness.total, 0);
        return sum / validFrames.length;
    }
    
    /**
     * 比较两组特征
     * @param {Object} featuresA - 第一组特征
     * @param {Object} featuresB - 第二组特征
     * @returns {Object} 相似度结果
     */
    compareFeatures(featuresA, featuresB) {
        console.log('开始比较特征...');
        console.log('特征A:', featuresA);
        console.log('特征B:', featuresB);
        
        // 计算MFCC相似度
        const mfccSimilarity = this.calculateMFCCSimilarity(
            featuresA.mfcc,
            featuresB.mfcc
        );
        console.log('MFCC相似度:', mfccSimilarity);
        
        // 计算频谱特征相似度
        const spectralSimilarity = this.calculateSpectralSimilarity(
            featuresA,
            featuresB
        );
        console.log('频谱相似度:', spectralSimilarity);
        
        // 计算时域特征相似度
        const temporalSimilarity = this.calculateTemporalSimilarity(
            featuresA,
            featuresB
        );
        console.log('时域相似度:', temporalSimilarity);
        
        // 计算总体相似度
        const overall = (mfccSimilarity + spectralSimilarity + temporalSimilarity) / 3;
        console.log('总体相似度:', overall);
        
        return {
            overall,
            mfcc: mfccSimilarity,
            spectral: spectralSimilarity,
            temporal: temporalSimilarity
        };
    }
    
    /**
     * 计算MFCC相似度
     * @param {Array} mfccA - 第一组MFCC
     * @param {Array} mfccB - 第二组MFCC
     * @returns {number} 相似度
     */
    calculateMFCCSimilarity(mfccA, mfccB) {
        if (!mfccA || !mfccB || !Array.isArray(mfccA) || !Array.isArray(mfccB)) {
            console.warn('无效的MFCC数据');
            return 0;
        }
        
        if (mfccA.length !== mfccB.length) {
            console.warn('MFCC维度不匹配:', {
                mfccALength: mfccA.length,
                mfccBLength: mfccB.length
            });
            return 0;
        }
        
        const differences = mfccA.map((coef, i) => Math.abs(coef - mfccB[i]));
        const maxDifference = Math.max(...differences);
        
        if (maxDifference === 0) return 1;
        
        const normalizedDifferences = differences.map(diff => 1 - (diff / maxDifference));
        return normalizedDifferences.reduce((sum, val) => sum + val, 0) / differences.length;
    }
    
    /**
     * 计算频谱特征相似度
     * @param {Object} featuresA - 第一组特征
     * @param {Object} featuresB - 第二组特征
     * @returns {number} 相似度
     */
    calculateSpectralSimilarity(featuresA, featuresB) {
        const features = [
            'spectralCentroid',
            'spectralRolloff',
            'spectralFlatness',
            'spectralSpread'
        ];
        
        const similarities = features.map(feature => {
            const valueA = featuresA[feature];
            const valueB = featuresB[feature];
            
            if (valueA === undefined || valueB === undefined || 
                isNaN(valueA) || isNaN(valueB)) {
                console.warn(`无效的${feature}数据:`, { valueA, valueB });
                return 0;
            }
            
            const diff = Math.abs(valueA - valueB);
            const max = Math.max(Math.abs(valueA), Math.abs(valueB));
            
            return max === 0 ? 1 : 1 - (diff / max);
        });
        
        return similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
    }
    
    /**
     * 计算时域特征相似度
     * @param {Object} featuresA - 第一组特征
     * @param {Object} featuresB - 第二组特征
     * @returns {number} 相似度
     */
    calculateTemporalSimilarity(featuresA, featuresB) {
        const features = ['rms', 'zcr', 'loudnessValue'];
        
        const similarities = features.map(feature => {
            const valueA = featuresA[feature];
            const valueB = featuresB[feature];
            
            if (valueA === undefined || valueB === undefined || 
                isNaN(valueA) || isNaN(valueB)) {
                console.warn(`无效的${feature}数据:`, { valueA, valueB });
                return 0;
            }
            
            const diff = Math.abs(valueA - valueB);
            const max = Math.max(Math.abs(valueA), Math.abs(valueB));
            
            return max === 0 ? 1 : 1 - (diff / max);
        });
        
        return similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
    }
} 