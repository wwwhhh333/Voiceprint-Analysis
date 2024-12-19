import { AudioAnalyzer } from './analyzer/AudioAnalyzer.js';
import { AudioController } from './controllers/AudioController.js';
import { CompareAnalyzer } from './analyzer/CompareAnalyzer.js';
import { Visualizer } from './analyzer/Visualizer.js';
import { RecordControllerPlus } from './controllers/RecordControllerPlus.js';

class VoiceprintCompareSystem {
    constructor() {
        this.audioAnalyzerA = new AudioAnalyzer();
        this.audioAnalyzerB = new AudioAnalyzer();
        this.audioControllerA = new AudioController(this.audioAnalyzerA, 'A');
        this.audioControllerB = new AudioController(this.audioAnalyzerB, 'B');
        this.recordControllerA = new RecordControllerPlus(this.audioAnalyzerA, 'A');
        this.recordControllerB = new RecordControllerPlus(this.audioAnalyzerB, 'B');
        this.compareAnalyzer = new CompareAnalyzer();
        
        // 创建两个可视化器
        this.visualizerA = new Visualizer(this.audioAnalyzerA, 'A');
        this.visualizerB = new Visualizer(this.audioAnalyzerB, 'B');
        
        // 设置录音控制器的可视化器
        this.recordControllerA.setVisualizer(this.visualizerA);
        this.recordControllerB.setVisualizer(this.visualizerB);
        
        this.setupEventListeners();
        this.startVisualization();
    }

    setupEventListeners() {
        // 获取文件输入元素
        const fileInputA = document.getElementById('audioFileA');
        const fileInputB = document.getElementById('audioFileB');
        
        // 添加文件上传监听器
        if (fileInputA) {
            console.log('添加音频A文件上传监听器');
            fileInputA.addEventListener('change', (e) => {
                console.log('音频A文件选择变化');
                this.handleFileUpload(e, 'A');
            });
        } else {
            console.error('未找到音频A文件输入元素');
        }
        
        if (fileInputB) {
            console.log('添加音频B文件上传监听器');
            fileInputB.addEventListener('change', (e) => {
                console.log('音频B文件选择变化');
                this.handleFileUpload(e, 'B');
            });
        } else {
            console.error('未找到音频B文件输入元素');
        }
        
        // 监听录音完成事件
        document.addEventListener('recordingComplete', (e) => {
            const { audioBuffer, suffix } = e.detail;
            if (suffix === 'A') {
                this.audioControllerA.setAudioBuffer(audioBuffer);
                this.audioControllerA.enablePlaybackControls();
                this.audioControllerA.updateTotalTime(audioBuffer.duration);
            } else {
                this.audioControllerB.setAudioBuffer(audioBuffer);
                this.audioControllerB.enablePlaybackControls();
                this.audioControllerB.updateTotalTime(audioBuffer.duration);
            }
            setTimeout(() => this.compareAudio(), 500);
        });
    }

    async handleFileUpload(event, type) {
        console.log(`处理${type}音频文件上传`);
        const file = event.target.files[0];
        console.log('选择的文件:', file);
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                console.log(`文件${type}读取完成`);
                const arrayBuffer = e.target.result;
                const audioContext = this.audioControllerA.audioContext;
                
                console.log('开始解码音频文件...');
                audioContext.decodeAudioData(arrayBuffer,
                    (audioBuffer) => {
                        console.log(`音频 ${type} 解码成功`);
                        if (type === 'A') {
                            this.audioControllerA.setAudioBuffer(audioBuffer);
                            this.audioControllerA.enablePlaybackControls();
                            this.audioControllerA.updateTotalTime(audioBuffer.duration);
                        } else {
                            this.audioControllerB.setAudioBuffer(audioBuffer);
                            this.audioControllerB.enablePlaybackControls();
                            this.audioControllerB.updateTotalTime(audioBuffer.duration);
                        }
                        if (this.audioControllerA.audioBuffer && this.audioControllerB.audioBuffer) {
                            setTimeout(() => this.compareAudio(), 500);
                        }
                    },
                    (error) => {
                        console.error('解码音频文件失败:', error);
                        alert('音频文件加载失败');
                    });
            };
            reader.onerror = (error) => {
                console.error('读取文件失败:', error);
                alert('文件读取失败');
            };
            console.log('开始读取文件...');
            reader.readAsArrayBuffer(file);
        }
    }

    async compareAudio() {
        console.log('开始对比音频...');
        if (this.audioControllerA.audioBuffer && this.audioControllerB.audioBuffer) {
            console.log('两个音频都已加载，进行对比分析');
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            const results = this.compareAnalyzer.compare(
                this.audioControllerA.audioBuffer,
                this.audioControllerB.audioBuffer
            );
            
            console.log('对比结果:', results);
            this.updateResults(results);
        } else {
            console.log('音频未完全加载:', {
                audioA: !!this.audioControllerA.audioBuffer,
                audioB: !!this.audioControllerB.audioBuffer
            });
        }
    }

    updateResults(results) {
        // 更新基本相似度数据
        document.getElementById('similarityScore').textContent = 
            `${Math.round(results.similarity * 100)}%`;
        document.getElementById('timbreMatch').textContent = 
            `${Math.round(results.timbreMatch * 100)}%`;
        document.getElementById('featureMatch').textContent = 
            `${Math.round(results.featureMatch * 100)}%`;

        // 更新详细对比结果
        const details = results.details;
        
        // 更新音色特征对比
        document.getElementById('harmonicStructure').textContent = 
            `${Math.round(details.timbreFeatures.harmonicStructure * 100)}%`;
        document.getElementById('spectralEnvelope').textContent = 
            `${Math.round(details.timbreFeatures.spectralEnvelope * 100)}%`;
        document.getElementById('brightness').textContent = 
            `${Math.round(details.timbreFeatures.brightness * 100)}%`;
        
        // 更新语音特征对比
        document.getElementById('speechRate').textContent = 
            `${Math.round(details.voiceFeatures.speechRate * 100)}%`;
        document.getElementById('pitchVariation').textContent = 
            `${Math.round(details.voiceFeatures.pitchVariation * 100)}%`;
        document.getElementById('energyDistribution').textContent = 
            `${Math.round(details.voiceFeatures.energyDistribution * 100)}%`;

        // 更新结论
        const conclusion = this.getConclusion(results);
        document.getElementById('comparisonConclusion').textContent = conclusion;

        // 添加动画效果
        this.animateResults();
    }

    getConclusion(results) {
        const averageMatch = (results.similarity + results.timbreMatch + results.featureMatch) / 3;
        const details = results.details;
        
        // 计算详细特征的平均匹配度
        const timbreAvg = (details.timbreFeatures.harmonicStructure + 
                          details.timbreFeatures.spectralEnvelope + 
                          details.timbreFeatures.brightness) / 3;
        
        const voiceAvg = (details.voiceFeatures.speechRate + 
                         details.voiceFeatures.pitchVariation + 
                         details.voiceFeatures.energyDistribution) / 3;
        
        if (averageMatch > 0.8) {
            return `极大可能是同一个人（音色匹配度: ${Math.round(timbreAvg * 100)}%，语音特征匹配度: ${Math.round(voiceAvg * 100)}%）`;
        } else if (averageMatch > 0.6) {
            return `可能是同一个人（音色匹配度: ${Math.round(timbreAvg * 100)}%，语音特征匹配度: ${Math.round(voiceAvg * 100)}%）`;
        } else if (averageMatch > 0.4) {
            return `相似度一般，难以判断（音色匹配度: ${Math.round(timbreAvg * 100)}%，语音特征匹配度: ${Math.round(voiceAvg * 100)}%）`;
        } else {
            return `可能不是同一个人（音色匹配度: ${Math.round(timbreAvg * 100)}%，语音特征匹配度: ${Math.round(voiceAvg * 100)}%）`;
        }
    }

    animateResults() {
        // 为结果添加动画效果
        const resultItems = document.querySelectorAll('.result-item');
        resultItems.forEach((item, index) => {
            item.style.animation = 'none';
            item.offsetHeight; // 触发重绘
            item.style.animation = `fadeIn 0.5s ${index * 0.1}s forwards`;
        });

        const conclusion = document.querySelector('.conclusion');
        conclusion.style.animation = 'none';
        conclusion.offsetHeight;
        conclusion.style.animation = 'slideIn 0.5s 0.3s forwards';
    }

    startVisualization() {
        const animate = () => {
            // 更新两个波形图（仅在播放时）
            if (this.audioControllerA.isPlaying) {
                this.visualizerA.draw();
            }
            if (this.audioControllerB.isPlaying) {
                this.visualizerB.draw();
            }
            requestAnimationFrame(animate);
        };
        animate();
    }
}

// 初始化应用
window.addEventListener('load', () => {
    new VoiceprintCompareSystem();
}); 