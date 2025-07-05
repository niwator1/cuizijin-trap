# 崔子瑾诱捕器 🛡️

一个强大的网站访问控制应用，基于 Electron + React + TypeScript 构建，支持跨平台部署。

## ✨ 主要功能

- 🚫 **网站访问控制** - 精确控制可访问的网站列表
- 🔒 **进程保护** - 防止应用被恶意关闭，支持自动重启
- 🔐 **密码保护** - 退出应用需要输入正确的管理员密码
- 🌍 **跨平台支持** - Windows、macOS、Linux 全平台支持
- 🚀 **开机自启** - 系统启动时自动运行
- 👁️ **隐藏保护** - 生产环境下隐藏进程，增强安全性

## 🔒 安全特性

### 进程保护机制
- ✅ **看门狗服务** - 独立进程监控主应用状态
- ✅ **心跳检测** - 每10秒检查一次进程健康状态  
- ✅ **自动重启** - 进程异常退出时自动重启（最多5次）
- ✅ **防强制关闭** - 阻止通过任务管理器等方式强制退出

### 密码保护
- 🔐 **退出验证** - 必须输入正确密码才能退出应用
- ⏰ **超时保护** - 30秒内未输入密码自动取消
- 🎨 **优雅界面** - 美观的密码输入对话框

### 系统集成
- 🚀 **开机自启** - 安装后自动设置开机启动
- 👑 **管理员权限** - Windows 下要求管理员权限运行
- 🔥 **防火墙规则** - 自动配置防火墙规则
- 📝 **注册表保护** - 在注册表中记录安装信息

## 📦 下载安装

### Windows
1. 下载 `cuizijin-trap-windows-installer.exe`
2. 右键选择"以管理员身份运行"
3. 按照安装向导完成安装
4. 应用将自动设置开机启动

### macOS  
1. 下载 `cuizijin-trap-macos-installer.dmg`
2. 双击打开 DMG 文件
3. 将应用拖拽到"应用程序"文件夹
4. 首次运行可能需要在"系统偏好设置 > 安全性与隐私"中允许

### Linux
1. 下载 `cuizijin-trap-linux.AppImage`
2. 添加执行权限：`chmod +x cuizijin-trap-linux.AppImage`
3. 直接运行：`./cuizijin-trap-linux.AppImage`

## 🛠️ 开发环境

### 环境要求
- Node.js 18+
- npm 或 yarn
- Git

### 本地开发
```bash
# 克隆仓库
git clone https://github.com/your-username/cuizijin-trap.git
cd cuizijin-trap

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建应用
npm run build

# 打包应用
npm run dist:win    # Windows
npm run dist:mac    # macOS  
npm run dist:linux  # Linux
npm run dist:all    # 全平台
```

### 跨平台构建
在 macOS 上可以构建所有平台的应用：

```bash
# 使用跨平台构建脚本
./scripts/build-cross-platform.sh
```

## 📁 项目结构

```
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── app/        # 应用控制器
│   │   ├── database/   # 数据库服务
│   │   ├── security/   # 安全模块
│   │   └── proxy/      # 代理服务
│   ├── renderer/       # React 渲染进程
│   │   ├── components/ # UI 组件
│   │   ├── pages/      # 页面组件
│   │   └── store/      # 状态管理
│   └── shared/         # 共享代码
├── assets/             # 资源文件
├── scripts/            # 构建脚本
├── tests/              # 测试文件
└── docs/               # 文档
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# Electron 应用测试
npm run test:electron

# 带界面的测试
npm run test:electron:headed

# 调试模式测试
npm run test:electron:debug
```

## 📋 使用说明

### 首次设置
1. 启动应用后进入初始设置页面
2. 设置管理员密码（至少6位）
3. 配置基本设置
4. 完成设置后自动进入主界面

### 网站管理
1. 在主界面点击"添加网站"
2. 输入网站URL和描述信息
3. 设置网站状态（启用/禁用）
4. 保存设置

### 安全退出
1. 尝试关闭应用时会弹出密码验证对话框
2. 输入正确的管理员密码
3. 确认后应用才会退出

## ⚠️ 重要提醒

1. **管理员权限**：Windows 版本必须以管理员身份运行才能启用完整功能
2. **密码安全**：请妥善保管管理员密码，这是退出应用的唯一方式
3. **进程保护**：生产环境下会启用进程保护，防止恶意关闭
4. **数据备份**：建议定期备份应用数据和配置

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🆘 支持

如果遇到问题，请：
1. 查看 [文档](docs/)
2. 搜索已有的 [Issues](https://github.com/your-username/cuizijin-trap/issues)
3. 创建新的 Issue 描述问题

---

**注意**：本应用仅用于合法的网站访问控制目的，请遵守当地法律法规。
