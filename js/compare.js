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
        // 监听两个音频文件的加载完成事件
        document.getElementById('audioFileA').addEventListener('change', 
            (e) => this.handleFileUpload(e, 'A'));
        document.getElementById('audioFileB').addEventListener('change', 
            (e) => this.handleFileUpload(e, 'B'));
        
        // 监听录音完成事件
        document.addEventListener('recordingComplete', (e) => {
            const { buffer, suffix } = e.detail;
            if (suffix === 'A') {
                this.audioControllerA.loadAudioFile(buffer);
            } else {
                this.audioControllerB.loadAudioFile(buffer);
            }
            setTimeout(() => this.compareAudio(), 500);
        });
    }

    handleFileUpload(event, type) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (type === 'A') {
                    this.audioControllerA.loadAudioFile(e.target.result);
                } else {
                    this.audioControllerB.loadAudioFile(e.target.result);
                }
                // 在音频加载完成后进行对比
                setTimeout(() => this.compareAudio(), 500);
            };
            reader.readAsArrayBuffer(file);
        }
    }

    compareAudio() {
        if (this.audioControllerA.audioBuffer && this.audioControllerB.audioBuffer) {
            const results = this.compareAnalyzer.compare(
                this.audioControllerA.audioBuffer,
                this.audioControllerB.audioBuffer
            );
            
            this.updateResults(results);
        }
    }

    updateResults(results) {
        // 更新相似度数据
        document.getElementById('similarityScore').textContent = 
            `${Math.round(results.similarity * 100)}%`;
        document.getElementById('timbreMatch').textContent = 
            `${Math.round(results.timbreMatch * 100)}%`;
        document.getElementById('featureMatch').textContent = 
            `${Math.round(results.featureMatch * 100)}%`;

        // 更新结论
        const conclusion = this.getConclusion(results);
        document.getElementById('comparisonConclusion').textContent = conclusion;

        // 添加动画效果
        this.animateResults();
    }

    getConclusion(results) {
        const averageMatch = (results.similarity + results.timbreMatch + results.featureMatch) / 3;
        
        if (averageMatch > 0.8) {
            return '极大可能是同一个人';
        } else if (averageMatch > 0.6) {
            return '可能是同一个人';
        } else if (averageMatch > 0.4) {
            return '相似度一般，难以判断';
        } else {
            return '可能不是同一个人';
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