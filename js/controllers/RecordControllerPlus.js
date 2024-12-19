import { getAudioContext } from '../utils/AudioContext.js';

export class RecordControllerPlus {
    constructor(audioAnalyzer, suffix = '') {
        this.audioAnalyzer = audioAnalyzer;
        this.audioContext = getAudioContext();
        this.suffix = suffix;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordButton = document.getElementById(`recordBtn${suffix}`);
        this.visualizer = null;
        
        if (this.recordButton) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        this.recordButton.addEventListener('click', () => this.toggleRecording());
    }

    setVisualizer(visualizer) {
        this.visualizer = visualizer;
    }

    startVisualization() {
        if (!this.visualizationFrame) {
            const animate = () => {
                if (this.isRecording && this.visualizer) {
                    this.visualizer.draw();
                    this.visualizationFrame = requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }

    stopVisualization() {
        if (this.visualizationFrame) {
            cancelAnimationFrame(this.visualizationFrame);
            this.visualizationFrame = null;
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // 创建MediaRecorder
            this.mediaRecorder = new MediaRecorder(stream);
            
            // 创建音频源并连接到分析器
            const source = this.audioContext.createMediaStreamSource(stream);
            this.audioAnalyzer.connectSource(source);
            
            // 设置录音数据处理
            this.recordedChunks = [];
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            // 开始录音
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // 更新UI
            this.recordButton.textContent = '停止录音';
            this.recordButton.classList.add('recording');
            
            // 开始波形可视化
            this.startVisualization();
            
        } catch (err) {
            console.error('录音失败:', err);
            alert('录音失败，请检查麦克风权限');
        }
    }

    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            
            // 停止波形可视化
            this.stopVisualization();
            
            // 处理录音结束事件
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                this.recordedChunks = [];
                
                // 将录音数据转换为ArrayBuffer
                blob.arrayBuffer().then(buffer => {
                    // 触发录音完成事件
                    const event = new CustomEvent('recordingComplete', {
                        detail: { buffer, suffix: this.suffix }
                    });
                    document.dispatchEvent(event);
                });
            };
            
            // 停止所有音轨
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            
            // 更新UI
            this.recordButton.textContent = '开始录音';
            this.recordButton.classList.remove('recording');
        }
    }
} 