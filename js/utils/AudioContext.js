//音频上下文管理器，用于创建和管理音频上下文

let audioContextInstance = null;

export function getAudioContext() {
    if (!audioContextInstance) {
        audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextInstance;
} 