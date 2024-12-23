# 声纹识别系统

## 项目简介
本系统是一个基于Web Audio API的声纹分析与模拟系统，可以实现声纹分析和声纹对比功能。

## 技术栈
- Web Audio API + Canvas（音频处理和可视化）
- Meyda.js（音频特征提取）
- JavaScript

## 算法实现说明

本系统实现了一套完整的声纹特征提取和对比算法，包括时域分析、频域分析和声纹对比三大模块。

### 一、时域特征分析算法

#### 1. 有效音长检测
有效音长指包含语音内容的部分时长，排除静音或非语音部分。在实现过程中，系统首先设定振幅阈值（0.01）用于判断样本是否为有效语音，同时设定短时静音阈值（0.2秒）来允许语音中出现的短暂停顿。在检测过程中，系统遍历音频样本并计算每个样本的绝对振幅值，当检测到振幅超过阈值时，将其标记为语音段开始。对于语音段内出现的短暂静音（小于0.2秒），系统仍将其视为语音的一部分以保持语音的连贯性，而对于超过阈值的静音则视为语音段的结束。通过累加所有有效语音段的时长，最终得到整段音频的有效音长。

#### 2. 过零率（Zero-Crossing Rate）
过零率分析通过计算音频信号穿过零点的频率来反映信号的频率特性。系统通过检测相邻采样点的符号变化来判断信号是否穿过零点，每次发现相邻样本的乘积为负数且差值超过最小阈值时，即认为发生了一次过零。通过统计单位时间内的过零次数，并结合采样率进行归一化处理，最终得到反映信号频率特性的过零率。这个特征在语音分析中具有重要意义，可用于区分浊音和清音，评估语音的清晰度，同时也作为语音活动检测的重要参考指标。

#### 3. 平均能量
平均能量计算通过分析音频信号的能量分布来反映音频的响度特征。首先对每个采样点的振幅值进行平方运算，然后求取所有采样点的平均值得到均方根（RMS）值，最后将RMS值再次平方得到能量值。为了更好地符合人耳的听觉特性，系统采用分贝（dB）作为能量的表示单位，并设置-100dB的最小阈值以避免计算误差。这个特征不仅可以反映语音的响度水平，还可用于语音/静音判断，评估说话人的音量特征，同时在语音分段和端点检测中也发挥着重要作用。

### 二、频域特征分析算法

#### 1. 基频检测
基频检测通过分析音频信号的频域特征来确定声音的基本频率（音高）。系统首先对输入信号进行快速傅里叶变换（FFT），获得信号的频谱信息，并根据采样率和FFT点数确定频率分辨率。在人声基频范围（20Hz-2000Hz）内搜索幅度最大的频率分量，同时考虑谐波干扰的影响。为了提高检测的准确性，系统还采用倒谱分析作为辅助手段，并通过考虑基频随时间的连续性特征来优化检测结果。通过结合多种算法的检测结果，最终得到更准确的基频估计。

#### 2. 谐波检测
谐波检测算法通过分析信号的谐波结构来反映声音的音色特征。基于检测到的基频，系统计算理论谐波位置，并在每个理论位置附近设定适当的频率容差范围进行搜索。在判断谐波的有效性时，首先计算噪声基准电平，然后设定最小幅度阈值（通常高于噪声10dB），只有幅度超过阈值的频率分量才被认定为有效谐波。对于每个检测到的谐波，系统记录其频率和幅度信息，统计有效谐波的数量，并分析谐波的分布规律，这些信息共同构成了声音的音色特征。

#### 3. 频谱质心
频谱质心计算通过分析频谱的"重心"位置来反映声音的音色特征。在计算过程中，系统将频率作为"位置"参数，将对应的频谱幅度作为"质量"参数，通过计算加权平均值得到频谱的质心位置。首先计算频率与幅度的加权和，然后除以幅度总和得到质心频率。这个特征能够有效反映声音的"亮度"特性，用于区分不同的音色特征，评估声音的频谱分布情况，是声音特征分析中的重要指标。

### 三、声纹对比算法

#### 1. MFCC特征提取
MFCC（梅尔频率倒谱系数）特征提取是捕获声道特征的关键算法。在预处理阶段，系统首先对信号进行预加重以补偿高频衰减，然后将信号分成短时帧并加窗处理以减少频谱泄漏。接着对每一帧进行FFT变换获取频谱，计算功率谱后应用梅尔滤波器组，这样可以更好地模拟人耳的听觉特性。最后通过取对数压缩动态范围，再进行DCT变换去除相关性，提取出13个MFCC系数，这些系数能够有效表征声道的特征信息。

#### 2. 相似度计算
声纹相似度计算采用多维特征加权融合的方法。在音色特征相似度（40%）方面，包括谐波结构匹配度（15%，通过比较谐波频率偏差、幅度相似度和数量匹配程度计算），频谱包络相似度（15%，通过比较频谱质心差异、分析频谱整体形状和计算频谱矩的相似度得到），以及MFCC系数距离（10%，使用欧氏距离或余弦相似度，并考虑系数重要性权重）。在声学特征相似度（30%）方面，包括基频特征匹配（10%，比较基频的平均值、变化范围和轨迹相似度），能量分布相似度（10%，分析能量的统计特征、动态变化和包络匹配度），以及共振峰匹配度（10%，通过比较前三个共振峰的频率和带宽）。在节奏特征相似度（30%）方面，包括语速匹配度（10%，基于过零率计算语速并分析音节时长分布），节奏模式相似度（10%，分析能量的周期性特征和重音分布规律），以及时长比例匹配（10%，比较有效音长比例和语音段分布）。通过这种多层次的特征比对和加权计算，最终得到两段语音的整体相似度评分。

## 使用指南

### 1. 音频输入方式

#### 1.1 麦克风录音
1. 点击"开始录音"按钮
2. 允许浏览器使用麦克风
3. 对着麦克风说话
4. 点击"停止录音"结束

#### 1.2 音频文件导入
1. 点击"选择文件"按钮
2. 选择音频文件（支持格式：wav, mp3）
3. 系统自动开始分析

### 2. 实时分析功能

#### 2.1 波形显示
- 显示音频实时波形
- 显示时域特征参数

#### 2.2 频谱显示
- 显示瞬时频谱图
- 显示频域特征参数

#### 2.3 MFCC可视化
- 显示13个MFCC系数
- 使用热力图表示系数值

### 3. 声纹对比功能

#### 3.1 准备音频
1. 在左侧面板录制或导入第一段音频
2. 在右侧面板录制或导入第二段音频
3. 确保两段音频质量良好
4. 建议音频长度在3-10秒之间

#### 3.2 执行对比
1. 两段音频就绪后点击"对比"按钮
2. 等待系统分析
3. 查看对比结果报告

#### 3.3 结果解读
- 总体相似度：
  * 85%以上：极高相似
  * 70%-85%：高度相似
  * 50%-70%：中等相似
  * 50%以下：差异较大

- 分项相似度：
  * 音色特征匹配度
  * 声学特征匹配度
  * 节奏特征匹配度

## 注意事项

1. 输入音频建议采样率≥16kHz
2. 建议使用降噪后的清晰音频
3. 比对音频的音质和采样率需保持一致
4. 有效音长建议在2-10秒之间
5. 系统可能存在误判情况，建议结合其他信息进行综合判断
