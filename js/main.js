//主文件，负责初始化应用

import { AudioAnalyzer } from './analyzer/AudioAnalyzer.js';
import { FeatureAnalyzer } from './analyzer/FeatureAnalyzer.js';
import { Visualizer } from './analyzer/Visualizer.js';
import { AudioController } from './controllers/AudioController.js';
import { RecordController } from './controllers/RecordController.js';

class VoiceprintAnalysisSystem {
    constructor() {
        this.audioAnalyzer = new AudioAnalyzer();
        this.featureAnalyzer = new FeatureAnalyzer(this.audioAnalyzer);
        this.visualizer = new Visualizer(this.audioAnalyzer);
        this.audioController = new AudioController(this.audioAnalyzer);
        this.recordController = new RecordController(this.audioAnalyzer);
        
        this.startAnalysis();
    }

    startAnalysis() {
        const analyze = () => {
            if (this.audioController.isPlaying || this.recordController.isRecording) {
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