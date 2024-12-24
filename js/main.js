//主文件，负责初始化应用
class VoiceprintAnalysisSystem {
    constructor() {
        this.initialized = false;
        this.modules = {};
        
        //在用户第一次交互时初始化音频上下文
        const initAudioContext = async () => {
            if (this.initialized) return;
            
            try {
                //动态导入所需模块
                const [
                    { AudioAnalyzer },
                    { AudioController },
                    { FeatureAnalyzer },
                    { Visualizer },
                    { RecordController }
                ] = await Promise.all([
                    import('./analyzer/AudioAnalyzer.js').catch(e => {
                        console.error('加载AudioAnalyzer模块失败:', e);
                        throw new Error('加载AudioAnalyzer模块失败');
                    }),
                    import('./controllers/AudioController.js').catch(e => {
                        console.error('加载AudioController模块失败:', e);
                        throw new Error('加载AudioController模块失败');
                    }),
                    import('./analyzer/FeatureAnalyzer.js').catch(e => {
                        console.error('加载FeatureAnalyzer模块失败:', e);
                        throw new Error('加载FeatureAnalyzer模块失败');
                    }),
                    import('./analyzer/Visualizer.js').catch(e => {
                        console.error('加载Visualizer模块失败:', e);
                        throw new Error('加载Visualizer模块失败');
                    }),
                    import('./controllers/RecordController.js').catch(e => {
                        console.error('加载RecordController模块失败:', e);
                        throw new Error('加载RecordController模块失败');
                    })
                ]);

                //初始化组件
                this.audioAnalyzer = new AudioAnalyzer();
                this.featureAnalyzer = new FeatureAnalyzer(this.audioAnalyzer);
                this.visualizer = new Visualizer(this.audioAnalyzer, '', true);
                this.audioController = new AudioController(this.audioAnalyzer);
                this.recordController = new RecordController(this.audioAnalyzer);
                
                this.recordController.setVisualizer(this.visualizer);
                this.initialized = true;

                //移除初始化监听器
                document.removeEventListener('click', initAudioContext);
                document.removeEventListener('touchstart', initAudioContext);
                
                //开始分析
                this.startAnalysis();
                
                //更新状态提示
                const statusText = document.getElementById('statusText');
                if (statusText) {
                    statusText.textContent = '系统已初始化，可以开始使用';
                }
            } catch (error) {
                console.error('初始化失败:', error);
                const statusText = document.getElementById('statusText');
                if (statusText) {
                    statusText.textContent = '初始化失败: ' + error.message;
                }
            }
        };

        //添加用户交互监听器
        document.addEventListener('click', initAudioContext);
        document.addEventListener('touchstart', initAudioContext);
        
        //监听录音完成事件
        document.addEventListener('recordingComplete', (e) => {
            const { audioBuffer } = e.detail;
            if (this.audioController) {
                this.audioController.setAudioBuffer(audioBuffer);
                this.audioController.enablePlaybackControls();
                this.audioController.updateTotalTime(audioBuffer.duration);
                const statusText = document.getElementById('statusText');
                if (statusText) {
                    statusText.textContent = '录音已完成，可以播放';
                }
            }
        });
    }

    startAnalysis() {
        const analyze = () => {
            if (this.audioController && this.audioController.isPlaying) {
                this.featureAnalyzer.analyze();
                this.visualizer.draw();
            } else if (this.recordController && this.recordController.isRecording) {
                this.featureAnalyzer.analyze();
                this.visualizer.draw();
            }
            requestAnimationFrame(analyze);
        };
        
        analyze();
    }
}

//初始化应用
window.addEventListener('load', () => {
    new VoiceprintAnalysisSystem();
});

//在页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    //获取所有导航链接
    const navLinks = document.querySelectorAll('.nav-item');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (!link.classList.contains('active')) { //如果不是当前激活的链接
                e.preventDefault();
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                const targetUrl = link.getAttribute('href');
                const container = document.querySelector('.body-contianer');
                if (container) {
                    container.style.animation = 'slideOut 0.3s ease-out'; //退出动画
                }
                
                //动画完成后跳转
                setTimeout(() => {
                    window.location.href = targetUrl;
                }, 300);
            }
        });
    });
});

//退出动画的关键帧
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