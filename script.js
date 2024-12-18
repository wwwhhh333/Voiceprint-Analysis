class VoiceprintAnalyzer {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        
        this.waveAnalyser = this.audioContext.createAnalyser();
        this.waveAnalyser.fftSize = 2048;
        
        this.spectrogramCanvas = document.getElementById('spectrogram');
        this.waveformCanvas = document.getElementById('waveform');
        this.spectrogramCtx = this.spectrogramCanvas.getContext('2d');
        this.waveformCtx = this.waveformCanvas.getContext('2d');
        
        this.isRecording = false;
        this.mediaRecorder = null;
        
        this.lastUpdate = 0;
        this.updateInterval = 100;
        
        this.audioBuffer = null;
        this.audioSource = null;
        this.startTime = 0;
        this.pauseTime = 0;
        this.isPlaying = false;
        
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.progressBar = document.getElementById('progressBar');
        this.currentTimeSpan = document.getElementById('currentTime');
        this.totalTimeSpan = document.getElementById('totalTime');
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
    }

    setupCanvas() {
        this.spectrogramCanvas.width = this.spectrogramCanvas.offsetWidth;
        this.spectrogramCanvas.height = this.spectrogramCanvas.offsetHeight;
        this.waveformCanvas.width = this.waveformCanvas.offsetWidth;
        this.waveformCanvas.height = this.waveformCanvas.offsetHeight;
    }

    setupEventListeners() {
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('audioFile').addEventListener('change', (e) => this.handleFileUpload(e));
        this.playPauseBtn.addEventListener('click', () => this.togglePlayback());
        this.progressBar.addEventListener('input', () => this.seekAudio());
        this.progressBar.addEventListener('change', () => this.seekAudio());
    }

    async toggleRecording() {
        if (!this.isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                const source = this.audioContext.createMediaStreamSource(stream);
                
                source.connect(this.analyser);
                source.connect(this.waveAnalyser);
                
                this.isRecording = true;
                document.getElementById('recordBtn').textContent = '停止录音';
                document.getElementById('statusText').textContent = '正在录音...';
                
                this.visualize();
                this.analyzeFeatures();
            } catch (err) {
                console.error('录音失败:', err);
                document.getElementById('statusText').textContent = '录音失败，请检查麦克风权限';
            }
        } else {
            this.stopRecording();
        }
    }

    stopRecording() {
        if (this.mediaRecorder) {
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            document.getElementById('recordBtn').textContent = '开始录音';
            document.getElementById('statusText').textContent = '录音已停止';
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.audioContext.decodeAudioData(e.target.result, (buffer) => {
                    this.audioBuffer = buffer;
                    this.enablePlaybackControls();
                    this.updateTotalTime(buffer.duration);
                    this.startPlayback();
                });
            };
            reader.readAsArrayBuffer(file);
        }
    }

    enablePlaybackControls() {
        this.playPauseBtn.disabled = false;
        this.progressBar.disabled = false;
        this.playPauseBtn.textContent = '暂停';
    }

    updateTotalTime(duration) {
        this.totalTimeSpan.textContent = this.formatTime(duration);
        this.progressBar.max = Math.floor(duration);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    startPlayback() {
        if (this.audioBuffer) {
            if (this.audioSource) {
                this.audioSource.stop();
            }
            
            this.audioSource = this.audioContext.createBufferSource();
            this.audioSource.buffer = this.audioBuffer;
            this.audioSource.connect(this.analyser);
            this.audioSource.connect(this.waveAnalyser);
            this.audioSource.connect(this.audioContext.destination);
            
            this.startTime = this.audioContext.currentTime - this.pauseTime;
            this.audioSource.start(0, this.pauseTime);
            this.isPlaying = true;
            
            this.visualize();
            this.updatePlaybackProgress();
        }
    }

    togglePlayback() {
        if (!this.isPlaying) {
            this.startPlayback();
            this.playPauseBtn.textContent = '暂停';
        } else {
            this.pausePlayback();
            this.playPauseBtn.textContent = '播放';
        }
    }

    pausePlayback() {
        if (this.audioSource) {
            this.audioSource.stop();
            this.pauseTime = (this.audioContext.currentTime - this.startTime);
            this.isPlaying = false;
        }
    }

    seekAudio() {
        const seekTime = parseFloat(this.progressBar.value);
        if (this.audioBuffer) {
            const wasPlaying = this.isPlaying;
            if (wasPlaying) {
                this.pausePlayback();
            }
            this.pauseTime = seekTime;
            if (wasPlaying) {
                this.startPlayback();
            }
            this.currentTimeSpan.textContent = this.formatTime(seekTime);
        }
    }

    updatePlaybackProgress() {
        const updateProgress = () => {
            if (this.isPlaying) {
                const currentTime = this.audioContext.currentTime - this.startTime;
                if (currentTime <= this.audioBuffer.duration) {
                    this.progressBar.value = currentTime;
                    this.currentTimeSpan.textContent = this.formatTime(currentTime);
                    requestAnimationFrame(updateProgress);
                } else {
                    this.isPlaying = false;
                    this.pauseTime = 0;
                    this.playPauseBtn.textContent = '播放';
                }
            }
        };
        
        requestAnimationFrame(updateProgress);
    }

    visualize() {
        this.drawSpectrogram();
        this.drawWaveform();
    }

    drawSpectrogram() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const width = this.spectrogramCanvas.width;
        const height = this.spectrogramCanvas.height;
        
        const draw = () => {
            requestAnimationFrame(draw);
            this.analyser.getByteFrequencyData(dataArray);
            
            this.spectrogramCtx.fillStyle = 'rgb(0, 0, 0)';
            this.spectrogramCtx.fillRect(0, 0, width, height);
            
            const barWidth = (width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            for(let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                
                const hue = (barHeight / height) * 360;
                this.spectrogramCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                this.spectrogramCtx.fillRect(x, height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        };
        
        draw();
    }

    drawWaveform() {
        const bufferLength = this.waveAnalyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        const width = this.waveformCanvas.width;
        const height = this.waveformCanvas.height;
        
        const draw = () => {
            requestAnimationFrame(draw);
            this.waveAnalyser.getFloatTimeDomainData(dataArray);
            
            this.waveformCtx.fillStyle = 'rgb(200, 200, 200)';
            this.waveformCtx.fillRect(0, 0, width, height);
            
            this.waveformCtx.lineWidth = 2;
            this.waveformCtx.strokeStyle = 'rgb(0, 125, 255)';
            this.waveformCtx.beginPath();
            
            const sliceWidth = width * 1.0 / bufferLength;
            let x = 0;
            
            for(let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] * 0.5;
                const y = (v * height/2) + height/2;
                
                if(i === 0) {
                    this.waveformCtx.moveTo(x, y);
                } else {
                    this.waveformCtx.lineTo(x, y);
                }
                
                x += sliceWidth;
            }
            
            this.waveformCtx.lineTo(width, height/2);
            this.waveformCtx.stroke();
        };
        
        draw();
    }

    analyzeFeatures() {
        const analyze = () => {
            if (!this.isRecording && !this.isPlaying) return;
            
            const now = Date.now();
            if (now - this.lastUpdate > this.updateInterval) {
                this.lastUpdate = now;
                
                const bufferLength = this.analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                this.analyser.getByteFrequencyData(dataArray);
                
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                document.getElementById('volume').textContent = 
                    Math.round(average * 100 / 256) + '%';
                
                let maxValue = 0;
                let maxIndex = 0;
                for (let i = 0; i < bufferLength; i++) {
                    if (dataArray[i] > maxValue) {
                        maxValue = dataArray[i];
                        maxIndex = i;
                    }
                }
                const dominantFrequency = maxIndex * this.audioContext.sampleRate / 
                    (this.analyser.fftSize * 2);
                document.getElementById('pitch').textContent = 
                    Math.round(dominantFrequency) + 'Hz';
                
                const mean = average;
                const variance = dataArray.reduce((acc, val) => 
                    acc + Math.pow(val - mean, 2), 0) / bufferLength;
                const timbreRichness = Math.sqrt(variance) / 128 * 100;
                document.getElementById('timbre').textContent = 
                    Math.round(timbreRichness) + '%';
            }
            
            requestAnimationFrame(analyze);
        };
        
        analyze();
    }
}

// 页面加载完成后初始化
window.addEventListener('load', () => {
    new VoiceprintAnalyzer();
});