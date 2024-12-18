# 声纹分析系统

## 项目结构
/js
├── analyzer/
│   ├── AudioAnalyzer.js      # 音频分析核心类
│   ├── FeatureAnalyzer.js    # 声纹特征分析
│   └── Visualizer.js         # 可视化相关功能
├── controllers/
│   ├── AudioController.js    # 音频控制（播放、暂停等）
│   └── RecordController.js   # 录音控制
├── utils/
│   ├── TimeFormatter.js      # 时间格式化工具
│   └── AudioContext.js       # 音频上下文管理
└── main.js                   # 主入口文件