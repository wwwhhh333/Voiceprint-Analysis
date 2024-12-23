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
        
        //可视化器
        this.visualizerA = new Visualizer(this.audioAnalyzerA, 'A');
        this.visualizerB = new Visualizer(this.audioAnalyzerB, 'B');
        
        //录音控制器的可视化器
        this.recordControllerA.setVisualizer(this.visualizerA);
        this.recordControllerB.setVisualizer(this.visualizerB);
        
        this.compareBtn = document.getElementById('compareBtn');
        
        this.setupEventListeners();
        this.startVisualization();
    }

    setupEventListeners() {
        //获取文件输入元素
        const fileInputA = document.getElementById('audioFileA');
        const fileInputB = document.getElementById('audioFileB');
        
        //添加文件上传监听器
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
        
        //监听录音完成事件
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
            this.checkEnableCompareButton();
            setTimeout(() => this.compareAudio(), 500);
        });

        //对比按钮点击事件
        if (this.compareBtn) {
            console.log('添加对比按钮点击监听器');
            this.compareBtn.addEventListener('click', () => {
                const inputPanel = document.querySelector('.input-panel');
                const resultPanel = document.querySelector('.result-panel');
                
                //添加淡出动画类
                inputPanel.style.animation = 'contentFade 0.3s ease-out reverse';
                
                //等待淡出动画完成后切换面板
                setTimeout(() => {
                    inputPanel.style.display = 'none';
                    resultPanel.style.display = 'block';
                    this.compareAudio();
                }, 300);
            });
        } else {
            console.error('未找到对比按钮元素');
        }

        //返回按钮点击事件
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            console.log('添加返回按钮点击监听器');
            backBtn.addEventListener('click', () => {
                const inputPanel = document.querySelector('.input-panel');
                const resultPanel = document.querySelector('.result-panel');
                
                //添加淡出动画类
                resultPanel.style.animation = 'contentFade 0.3s ease-out reverse';
                
                //等待淡出动画完成后切换面板
                setTimeout(() => {
                    resultPanel.style.display = 'none';
                    inputPanel.style.display = 'flex';
                    //重置动画
                    inputPanel.style.animation = 'contentFade 0.4s ease-out';
                }, 300);
            });
        } else {
            console.error('未找到返回按钮元素');
        }
    }

    //检查是否可以启用对比按钮
    checkEnableCompareButton() {
        const hasAudioA = !!this.audioControllerA.audioBuffer;
        const hasAudioB = !!this.audioControllerB.audioBuffer;
        this.compareBtn.disabled = !(hasAudioA && hasAudioB);
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
                        this.checkEnableCompareButton();  //检查是否可以启用对比按钮
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
            console.log('音频A:', {
                duration: this.audioControllerA.audioBuffer.duration,
                sampleRate: this.audioControllerA.audioBuffer.sampleRate,
                length: this.audioControllerA.audioBuffer.length
            });
            console.log('音频B:', {
                duration: this.audioControllerB.audioBuffer.duration,
                sampleRate: this.audioControllerB.audioBuffer.sampleRate,
                length: this.audioControllerB.audioBuffer.length
            });
            
            try {
                await new Promise(resolve => requestAnimationFrame(resolve));
                
                const results = await this.compareAnalyzer.compare(
                    this.audioControllerA.audioBuffer,
                    this.audioControllerB.audioBuffer
                );
                
                console.log('对比结果:', JSON.stringify(results, null, 2));
                if (results && results.details) {
                    this.updateResults(results);
                } else {
                    console.error('无效的对比结果:', results);
                    this.updateResults(this.compareAnalyzer.getDefaultResult());
                }
            } catch (error) {
                console.error('音频对比过程出错:', error);
                this.updateResults(this.compareAnalyzer.getDefaultResult());
            }
        } else {
            console.log('音频未完全加载:', {
                audioA: !!this.audioControllerA.audioBuffer,
                audioB: !!this.audioControllerB.audioBuffer
            });
        }
    }

    updateResults(results) {
        try {
            console.log('开始更新结果显示');
            console.log('结果数据:', JSON.stringify(results, null, 2));
            
            //总体相似度
            document.getElementById('totalSimilarity').textContent = 
                `${Math.round(results.totalSimilarity * 100)}%`;
            
            //三个主要相似度指标
            document.getElementById('timbreSimilarity').textContent = 
                `${Math.round(results.timbreSimilarity * 100)}%`;
            document.getElementById('acousticSimilarity').textContent = 
                `${Math.round(results.acousticSimilarity * 100)}%`;
            document.getElementById('rhythmSimilarity').textContent = 
                `${Math.round(results.rhythmSimilarity * 100)}%`;
            
            //节奏特征的详细指标
            if (results.rhythmFeatures) {
                document.getElementById('speedMatch').textContent = 
                    `${Math.round(results.rhythmFeatures.speedMatch * 100)}%`;
                document.getElementById('rhythmMatch').textContent = 
                    `${Math.round(results.rhythmFeatures.rhythmMatch * 100)}%`;
                document.getElementById('durationRatio').textContent = 
                    `${Math.round(results.rhythmFeatures.durationRatio * 100)}%`;
            }

            //详细特征匹配度
            const details = results.details || {};
            const timbreFeatures = details.timbreFeatures || {};
            
            console.log('音色特征:', timbreFeatures);
            
            //音色特征对比
            document.getElementById('harmonicsMatch').textContent = 
                `${Math.round((timbreFeatures.harmonicsMatch || 0) * 100)}%`;
            document.getElementById('spectralMatch').textContent = 
                `${Math.round((timbreFeatures.spectralMatch || 0) * 100)}%`;
            document.getElementById('timbreMatch').textContent = 
                `${Math.round((timbreFeatures.timbreFeatureMatch || 0) * 100)}%`;
            
            //声学特征对比
            document.getElementById('pitchRangeMatch').textContent = 
                `${Math.round((details.pitchRangeMatch || 0) * 100)}%`;
            document.getElementById('energyMatch').textContent = 
                `${Math.round((details.energyMatch || 0) * 100)}%`;
            document.getElementById('formantMatch').textContent = 
                `${Math.round((details.formantMatch || 0) * 100)}%`;

            //分析结论
            const totalSimilarity = Math.round(results.totalSimilarity * 100);
            const timbreSimilarity = Math.round(results.timbreSimilarity * 100);
            const acousticSimilarity = Math.round(results.acousticSimilarity * 100);
            const rhythmSimilarity = Math.round(results.rhythmSimilarity * 100);

            let conclusionText = `基于声纹分析系统的综合评估，两段语音的总体相似度为 <span class="highlight">${totalSimilarity}%</span>。\n\n`;
            
            conclusionText += '<div class="section">声学特征分析：\n';
            conclusionText += `音色特征相似度为 <span class="highlight">${timbreSimilarity}%</span>，`;
            conclusionText += `声学特征相似度为 <span class="highlight">${acousticSimilarity}%</span>，`;
            conclusionText += `节奏特征相似度为 <span class="highlight">${rhythmSimilarity}%</span>。</div>\n\n`;
            
            //相似度评估结论
            conclusionText += '<div class="section">相似度评估：\n';
            if (totalSimilarity >= 90) {
                conclusionText += '两段语音极其相似，可以认为是同一个说话人。';
            } else if (totalSimilarity >= 80) {
                conclusionText += '两段语音非常相似，很可能是同一个说话人。';
            } else if (totalSimilarity >= 70) {
                conclusionText += '两段语音具有较高的相似度，可能是同一个说话人。';
            } else if (totalSimilarity >= 60) {
                conclusionText += '两段语音存在一定相似性，但不足以确定是否为同一个说话人。';
            } else {
                conclusionText += '两段语音差异较大，可能不是同一个说话人。';
            }
            conclusionText += '</div>';
        
            //结论文本
            const conclusionElement = document.getElementById('conclusionText');
            conclusionElement.innerHTML = conclusionText;
            
        } catch (error) {
            console.error('更新结果显示时出错:', error);
        }
    }

    getSimilarityLevel(score) { //相似度等级
        if (score >= 90) return '属于极高相似';
        if (score >= 80) return '属于高度相似';
        if (score >= 60) return '属于中等相似';
        if (score >= 40) return '属于低度相似';
        return '差异显著';
    }

    startVisualization() { //启动波形可视化
        this.visualizerA.start();
        this.visualizerB.start();
    }
}

//初始化应用
window.addEventListener('load', () => {
    new VoiceprintCompareSystem();
}); 