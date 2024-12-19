# 声纹分析系统

这是一个基于Web的声纹分析系统，可以对音频进行实时分析、可视化展示，并支持声纹对比功能。

## 功能特点

### 1. 声纹分析
- 实时波形显示
- 频谱图分析
- 音频特征提取（基频、谐波、频谱质心等）

### 2. 录音功能
- 实时录音
- 录音波形可视化
- 录音回放
- 音频文件上传

### 3. 声纹对比
- 双音频并行分析
- 声纹相似度计算
- 综合判断结论

## 项目结构
/js
├── analyzer/
│   ├── AudioAnalyzer.js      # 音频分析核心类
│   ├── CompareAnalyzer.js    # 声纹对比分析
│   ├── FeatureAnalyzer.js    # 声纹特征分析
│   └── Visualizer.js         # 可视化相关功能
├── controllers/
│   ├── AudioController.js    # 音频控制（播放、暂停等）
│   ├── RecordController.js   # 录音控制（主页面）
│   └── RecordControllerPlus.js # 录音控制（对比页面）
├── utils/
│   ├── TimeFormatter.js      # 时间格式化工具
│   └── AudioContext.js       # 音频上下文管理
└── main.js                   # 主入口文件

## 技术栈

### Web技术
- Web Audio API（音频处理）
- Canvas API（可视化显示）
- JavaScript ES6+（模块化开发）

### 音频分析算法
- 快速傅里叶变换 (FFT)
- 过零率检测 (ZCR)
- 频谱质心计算
- 声纹特征匹配