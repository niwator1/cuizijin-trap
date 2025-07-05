# 手动创建GitHub Release指南

由于自动化脚本可能需要额外配置，这里提供手动创建GitHub Release的详细步骤。

## 📦 准备好的文件

我们已经为您准备好了以下文件：

- **Windows版本**: `release/cuizijin-trap-windows-v1.0.2-with-icon.zip` (约 106MB)
  - 包含完整的Windows可执行程序
  - 解压后可直接运行 `崔子瑾诱捕器.exe`
  - **已修复**: 解决了JavaScript模块加载错误问题
  - **新增**: 集成了全新的红色不开心表情图标系统

## 🚀 手动创建Release步骤

### 步骤1: 访问GitHub Release页面

1. 打开浏览器，访问：https://github.com/niwator1/cuizijin-trap/releases
2. 点击 **"Create a new release"** 按钮

### 步骤2: 填写Release信息

**标签版本 (Tag version):**
```
v1.0.2
```

**发布标题 (Release title):**
```
崔子瑾诱捕器 v1.0.2 (图标版)
```

**描述 (Description):**
```markdown
## 崔子瑾诱捕器 - 网站访问控制应用

### 🚀 新功能
- 网站访问控制和拦截
- 进程保护和自动重启
- 密码保护退出机制
- 跨平台支持 (Windows/macOS/Linux)

### 📦 安装说明

**Windows:**
- 下载 `cuizijin-trap-windows-v1.0.2-with-icon.zip` 压缩包
- 解压到任意目录
- 以管理员身份运行 `崔子瑾诱捕器.exe`
- 支持开机自启动和进程保护
- 现在包含完整的图标系统

### ⚠️ 重要提醒
- Windows 版本需要管理员权限才能启用完整功能
- 请妥善保管管理员密码，这是退出应用的唯一方式
- 生产环境下会启用进程保护功能

### 🔒 安全特性
- ✅ 看门狗进程监控
- ✅ 自动重启机制  
- ✅ 密码保护退出
- ✅ 开机自启动
- ✅ 防火墙规则配置
- ✅ 进程隐藏保护

### 📋 系统要求
- Windows 10/11 (64位)
- 管理员权限
- .NET Framework 4.7.2 或更高版本

### 🎨 v1.0.2 新增内容
- ✅ 全新的红色不开心表情图标设计
- ✅ 完整的图标系统集成（窗口、托盘、通知）
- ✅ 图标生成工具和转换系统
- ✅ 跨平台图标支持（Windows/macOS/Linux）

### 🔧 v1.0.1 修复内容
- ✅ 修复了JavaScript模块加载错误问题
- ✅ 解决了Windows端"Cannot find module"错误
- ✅ 优化了应用启动流程
- ✅ 改进了文件路径处理机制

### 🐛 已知问题
- 首次运行可能被Windows Defender误报，请添加到白名单
- 某些杀毒软件可能阻止进程保护功能

### 📞 技术支持
如遇问题，请在GitHub Issues中反馈。
```

### 步骤3: 上传文件

1. 在 **"Attach binaries"** 区域，点击选择文件或直接拖拽
2. 选择文件：`release/cuizijin-trap-windows-v1.0.2-with-icon.zip`
3. 等待文件上传完成（约106MB，可能需要几分钟）

### 步骤4: 发布

1. 确保 **"Set as the latest release"** 已勾选
2. 点击 **"Publish release"** 按钮

## ✅ 发布完成后

发布成功后，用户可以：

1. **访问Release页面**: https://github.com/niwator1/cuizijin-trap/releases
2. **下载安装包**: 点击 `cuizijin-trap-windows-v1.0.0.zip` 下载
3. **查看安装说明**: 按照Release描述中的步骤安装

## 📊 文件信息

- **文件名**: cuizijin-trap-windows-v1.0.0.zip
- **大小**: ~150MB
- **内容**: 完整的Windows应用程序
- **支持系统**: Windows 10/11 (64位)

## 🔄 后续更新

如需发布新版本：

1. 更新版本号（如 v1.0.1, v1.1.0）
2. 重新构建应用
3. 重复上述步骤创建新的Release

## 🛠️ 自动化选项

如果您希望使用自动化脚本，可以：

1. 设置GitHub Personal Access Token
2. 运行: `./scripts/create-github-release.sh`
3. 或使用: `npm run release:create`

---

**注意**: 首次发布建议使用手动方式，确保所有信息正确无误。后续版本可以考虑使用自动化脚本。
