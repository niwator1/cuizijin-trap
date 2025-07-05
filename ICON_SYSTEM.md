# 崔子瑾诱捕器 - 图标系统说明

## 🎨 图标设计

### 主图标设计理念
- **图标来源**: `icon/unhappy-1.svg`
- **设计风格**: 红色不开心表情
- **象征意义**: 完美契合"诱捕器"的概念，表达被限制访问时的不满情绪
- **颜色方案**: 红色主色调 (#d81e06)，简洁明了

### 图标特点
- ✅ SVG矢量格式，支持任意缩放
- ✅ 简洁的线条设计，在小尺寸下依然清晰
- ✅ 强烈的视觉识别度
- ✅ 跨平台兼容性

## 📁 图标文件结构

```
assets/
├── icon.svg                 # 源SVG文件
├── icon.png                 # 主图标 (512x512)
├── icon@2x.png             # 高分辨率主图标 (1024x1024)
├── tray-icon.png           # 托盘图标 (32x32)
├── tray-icon@2x.png        # 高分辨率托盘图标 (64x64)
└── icon-converter.html     # 图标转换工具
```

## 🔧 图标生成系统

### 自动生成工具
```bash
# 生成图标文件和转换工具
npm run icons:generate
```

### 手动转换流程
1. 运行图标生成脚本
2. 在浏览器中打开 `assets/icon-converter.html`
3. 下载生成的PNG文件
4. 替换 `assets/` 目录中的对应文件

### 转换工具特性
- 🌐 基于浏览器的SVG到PNG转换
- 📏 支持多种尺寸自动生成
- 💾 一键下载功能
- 🔄 实时预览效果

## 🖥️ 应用中的图标使用

### 1. 主窗口图标
- **位置**: 窗口标题栏、任务栏
- **文件**: `assets/icon.png`
- **尺寸**: 512x512px
- **平台**: Windows, Linux

### 2. 托盘图标
- **位置**: 系统托盘/通知区域
- **文件**: `assets/tray-icon.png`
- **尺寸**: 32x32px (标准), 64x64px (高DPI)
- **平台**: 全平台

### 3. 通知图标
- **位置**: 系统通知
- **文件**: `assets/icon.png`
- **尺寸**: 自适应
- **平台**: 全平台

### 4. 应用程序图标
- **位置**: 桌面快捷方式、开始菜单
- **文件**: 构建时自动生成
- **格式**: .ico (Windows), .icns (macOS), .png (Linux)

## ⚙️ 技术实现

### 代码集成位置

#### 主进程 (`src/main/index.ts`)
```typescript
// 窗口图标设置
mainWindow.setIcon(path.join(__dirname, '../../assets/icon.png'));

// 托盘图标设置
const trayIcon = nativeImage.createFromPath(
  path.join(__dirname, '../../assets/tray-icon.png')
);

// 通知图标设置
icon: path.join(__dirname, '../../assets/icon.png')
```

#### 构建配置
- `electron-builder.config.js`: 完整配置
- `electron-builder-simple.config.js`: 简化配置
- 支持Windows (.ico), macOS (.icns), Linux (.png)

### 错误处理
- ✅ 图标文件缺失时的优雅降级
- ✅ 详细的加载日志记录
- ✅ 跨平台兼容性检查

## 🚀 部署和打包

### 文件包含配置
```javascript
extraFiles: [
  {
    from: 'assets/icon.png',
    to: 'assets/icon.png'
  },
  {
    from: 'assets/tray-icon.png',
    to: 'assets/tray-icon.png'
  }
]
```

### 平台特定配置
- **Windows**: 自动生成.ico文件
- **macOS**: 自动生成.icns文件  
- **Linux**: 使用PNG格式

## 🔄 图标更新流程

### 更换图标步骤
1. 替换 `icon/unhappy-1.svg` 源文件
2. 运行 `npm run icons:generate`
3. 在浏览器中转换为PNG格式
4. 替换 `assets/` 目录中的文件
5. 重新构建应用程序

### 版本控制
- 源SVG文件纳入版本控制
- 生成的PNG文件也纳入版本控制
- 转换工具HTML文件纳入版本控制

## 📊 图标规格要求

### 尺寸规范
- **主图标**: 512x512px (推荐), 最小256x256px
- **托盘图标**: 32x32px (标准), 64x64px (高DPI)
- **高分辨率**: 支持@2x版本

### 格式要求
- **源文件**: SVG (矢量格式)
- **运行时**: PNG (位图格式)
- **打包**: 平台特定格式 (.ico/.icns/.png)

### 设计建议
- 简洁明了的设计
- 在小尺寸下保持清晰度
- 避免过于复杂的细节
- 考虑不同背景下的可见性

## 🛠️ 故障排除

### 常见问题
1. **图标不显示**: 检查文件路径和权限
2. **图标模糊**: 确保使用正确的尺寸和格式
3. **构建失败**: 检查图标文件是否损坏

### 调试方法
- 查看控制台日志中的图标加载信息
- 检查 `assets/` 目录中的文件是否存在
- 验证图标文件的完整性

---

**注意**: 图标系统已完全集成到应用程序中，支持跨平台部署和自动化构建流程。
