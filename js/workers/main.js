//主文件，负责初始化应用

import { AudioAnalyzer } from '../analyzer/AudioAnalyzer.js';
import { AudioController } from '../controllers/AudioController.js';
import { FeatureAnalyzer } from '../analyzer/FeatureAnalyzer.js';
import { Visualizer } from '../analyzer/Visualizer.js';
import { RecordController } from '../controllers/RecordController.js';

class VoiceprintAnalysisSystem {
    constructor() {
        this.audioAnalyzer = new AudioAnalyzer();
        this.featureAnalyzer = new FeatureAnalyzer(this.audioAnalyzer);
        this.visualizer = new Visualizer(this.audioAnalyzer, '', true);
        this.audioController = new AudioController(this.audioAnalyzer);
        this.recordController = new RecordController(this.audioAnalyzer);
        
        // 设置录音控制器的可视化器
        this.recordController.setVisualizer(this.visualizer);
        
        // 监听录音完成事件
        document.addEventListener('recordingComplete', (e) => {
            const { audioBuffer } = e.detail;
            // 直接设置解码后的音频数据
            this.audioController.setAudioBuffer(audioBuffer);
            this.audioController.enablePlaybackControls();
            this.audioController.updateTotalTime(audioBuffer.duration);
            document.getElementById('statusText').textContent = '录音已完成，可以播放';
        });
        
        this.startAnalysis();
    }

    startAnalysis() {
        const analyze = () => {
            if (this.audioController.isPlaying) {
                this.featureAnalyzer.analyze();
                this.visualizer.draw();
            } else if (this.recordController.isRecording) {
                this.featureAnalyzer.analyze();
                this.visualizer.draw();
            }
            requestAnimationFrame(analyze);
        };
        
        analyze();
    }
}

// 初始化应用
window.addEventListener('load', () => {
    new VoiceprintAnalysisSystem();
}); 