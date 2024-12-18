//录音控制器，负责录音的开始、停止、保存等操作

import { getAudioContext } from '../utils/AudioContext.js';

export class RecordController {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.audioContext = getAudioContext();
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('recordBtn').addEventListener('click', 
            () => this.toggleRecording());
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
            document.getElementById('recordBtn').textContent = '停止录音';
            document.getElementById('statusText').textContent = '正在录音...';
            
        } catch (err) {
            console.error('录音失败:', err);
            document.getElementById('statusText').textContent = '录音失败，请检查麦克风权限';
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
            
            // 处理录音结束事件
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                this.recordedChunks = [];
                
                // 将录音数据转换为ArrayBuffer
                blob.arrayBuffer().then(buffer => {
                    this.audioContext.decodeAudioData(buffer, (audioBuffer) => {
                        // 通知AudioController播放录音
                        if (window.audioController) {
                            window.audioController.loadAudioFile(buffer);
                        }
                    });
                });
            };
            
            // 停止所有音轨
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            
            // 更新UI
            document.getElementById('recordBtn').textContent = '开始录音';
            document.getElementById('statusText').textContent = '录音已停止';
        }
    }
} 