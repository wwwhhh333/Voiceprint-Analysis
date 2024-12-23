//录音控制器，负责录音的开始、停止、保存等操作

import { getAudioContext } from '../utils/AudioContext.js';

export class RecordController {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.audioContext = getAudioContext();
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.recordButton = document.getElementById('recordBtn');
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
            
            this.mediaRecorder = new MediaRecorder(stream);
            
            const source = this.audioContext.createMediaStreamSource(stream);
            this.audioAnalyzer.connectSource(source);
            
            this.recordedChunks = [];
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            
            this.recordButton.textContent = '停止录音';
            this.recordButton.classList.add('recording');
            
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
            
            this.stopVisualization();
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                this.recordedChunks = [];
                
                blob.arrayBuffer().then(buffer => {
                    //直接解码音频数据
                    this.audioContext.decodeAudioData(buffer, 
                        (audioBuffer) => {
                            const event = new CustomEvent('recordingComplete', {
                                detail: { audioBuffer }
                            });
                            document.dispatchEvent(event);
                        },
                        (error) => {
                            console.error('解码录音失败:', error);
                            document.getElementById('statusText').textContent = '录音处理失败';
                        }
                    );
                });
            };
            
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            
            this.recordButton.textContent = '开始录音';
            this.recordButton.classList.remove('recording');
        }
    }
} 