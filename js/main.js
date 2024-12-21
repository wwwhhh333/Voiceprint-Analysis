//主文件，负责初始化应用

import { AudioAnalyzer } from './analyzer/AudioAnalyzer.js';
import { AudioController } from './controllers/AudioController.js';
import { FeatureAnalyzer } from './analyzer/FeatureAnalyzer.js';
import { Visualizer } from './analyzer/Visualizer.js';
import { RecordController } from './controllers/RecordController.js';

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

// 在页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 获取所有导航链接
    const navLinks = document.querySelectorAll('.nav-item');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // 如果不是当前激活的链接
            if (!link.classList.contains('active')) {
                e.preventDefault();
                
                // 移除其他链接的激活状态
                navLinks.forEach(l => l.classList.remove('active'));
                
                // 添加当前链接的激活状态
                link.classList.add('active');
                
                // 获取目标页面URL
                const targetUrl = link.getAttribute('href');
                
                // 添加退出动画
                document.querySelector('.body-contianer').style.animation = 'slideOut 0.3s ease-out';
                
                // 等待动画完成后跳转
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 300);
            }
        });
    });
});

// 添加退出动画的关键帧
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-30px);
        }
    }
`;
document.head.appendChild(style); 