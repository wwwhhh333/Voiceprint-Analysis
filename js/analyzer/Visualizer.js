//可视化类

export class Visualizer {
    constructor(audioAnalyzer) {
        this.audioAnalyzer = audioAnalyzer;
        this.setupCanvases();
    }

    setupCanvases() {
        this.spectrogramCanvas = document.getElementById('spectrogram');
        this.waveformCanvas = document.getElementById('waveform');
        this.spectrogramCtx = this.spectrogramCanvas.getContext('2d');
        this.waveformCtx = this.waveformCanvas.getContext('2d');

        this.resizeCanvases();
    }

    resizeCanvases() {
        this.spectrogramCanvas.width = this.spectrogramCanvas.offsetWidth;
        this.spectrogramCanvas.height = this.spectrogramCanvas.offsetHeight;
        this.waveformCanvas.width = this.waveformCanvas.offsetWidth;
        this.waveformCanvas.height = this.waveformCanvas.offsetHeight;
    }

    draw() {
        this.drawSpectrogram();
        this.drawWaveform();
    }

    drawSpectrogram() {
        const dataArray = this.audioAnalyzer.getFrequencyData();
        const width = this.spectrogramCanvas.width;
        const height = this.spectrogramCanvas.height;
        
        this.spectrogramCtx.fillStyle = 'rgb(0, 0, 0)';
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

    drawWaveform() {
        const dataArray = this.audioAnalyzer.getWaveformData();
        const width = this.waveformCanvas.width;
        const height = this.waveformCanvas.height;
        
        this.waveformCtx.fillStyle = 'rgb(200, 200, 200)';
        this.waveformCtx.fillRect(0, 0, width, height);
        
        this.waveformCtx.lineWidth = 2;
        this.waveformCtx.strokeStyle = 'rgb(0, 125, 255)';
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
} 