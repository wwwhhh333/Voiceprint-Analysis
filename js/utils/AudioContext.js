//音频上下文管理器，用于创建和管理音频上下文

class AudioContextManager {
    static instance = null;

    static getInstance() {
        if (!this.instance) {
            this.instance = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.instance;
    }
}

export const getAudioContext = () => AudioContextManager.getInstance(); 