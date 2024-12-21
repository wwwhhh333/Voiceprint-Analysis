//可视化类

export class Visualizer {
    constructor(audioAnalyzer, suffix = '', showSpectrogram = false) {
        this.audioAnalyzer = audioAnalyzer;
        this.suffix = suffix;
        this.showSpectrogram = showSpectrogram;
        this.setupCanvases();
    }

    setupCanvases() {
        // 根据suffix获取对应的canvas
        this.waveformCanvas = document.getElementById(`waveform${this.suffix}`);
        if (this.showSpectrogram) {
            this.spectrogramCanvas = document.getElementById(`spectrogram${this.suffix}`);
            if (this.spectrogramCanvas) {
                this.spectrogramCtx = this.spectrogramCanvas.getContext('2d');
                this.resizeCanvas(this.spectrogramCanvas);
            }
        }
        if (this.waveformCanvas) {
            this.waveformCtx = this.waveformCanvas.getContext('2d');
            this.resizeCanvas(this.waveformCanvas);
        }
    }

    resizeCanvas(canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    draw() { //绘制波形和频谱图
        if (this.waveformCanvas) {
            this.drawWaveform();
        }
        if (this.showSpectrogram && this.spectrogramCanvas) {
            this.drawSpectrogram();
        }
    }

    drawWaveform() { //绘制波形
        const dataArray = this.audioAnalyzer.getWaveformData();
        const width = this.waveformCanvas.width;
        const height = this.waveformCanvas.height;
        
        this.waveformCtx.fillStyle = 'rgb(248, 246, 241)';
        this.waveformCtx.fillRect(0, 0, width, height);
        
        this.waveformCtx.lineWidth = 2;
        this.waveformCtx.strokeStyle = 'rgb(51, 51, 51)';
        this.waveformCtx.beginPath();
        
        const sliceWidth = width / dataArray.length;
        let x = 0;
        
        dataArray.forEach((value, i) => {
            const y = (value * 0.5 * height/2) + height/2;
            if (i === 0) {
                this.waveformCtx.moveTo(x, y);
            } else {
                this.waveformCtx.lineTo(x, y);
            }
            x += sliceWidth;
        });
        
        this.waveformCtx.lineTo(width, height/2);
        this.waveformCtx.stroke();
    }

    drawSpectrogram() { //绘制频谱图
        const dataArray = this.audioAnalyzer.getFrequencyData();
        const width = this.spectrogramCanvas.width;
        const height = this.spectrogramCanvas.height;
        
        this.spectrogramCtx.fillStyle = 'rgb(248, 246, 241)';
        this.spectrogramCtx.fillRect(0, 0, width, height);
        
        const barWidth = (width / dataArray.length) * 2.5;
        let x = 0;
        
        dataArray.forEach(value => {
            const barHeight = value / 2;
            const hue = (barHeight / height) * 360;
            this.spectrogramCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            this.spectrogramCtx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        });
    }
} 