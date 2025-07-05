# 崔子瑾诱捕器 🛡️

[![Build Status](https://github.com/niwator1/cuizijin-trap/workflows/Build%20and%20Release/badge.svg)](https://github.com/niwator1/cuizijin-trap/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/niwator1/cuizijin-trap/releases)

一个强大的网站访问控制应用，基于 Electron + React + TypeScript 构建，支持跨平台部署。

## ✨ 主要功能

- 🚫 **网站访问控制** - 精确控制可访问的网站列表
- 🔒 **进程保护** - 防止应用被恶意关闭，支持自动重启
- 🔐 **密码保护** - 退出应用需要输入正确的管理员密码
- 🌍 **跨平台支持** - Windows、macOS、Linux 全平台支持
- 🚀 **开机自启** - 系统启动时自动运行
- 👁️ **隐藏保护** - 生产环境下隐藏进程，增强安全性

## 📦 快速安装

### 下载预构建版本
前往 [Releases](https://github.com/niwator1/cuizijin-trap/releases) 页面下载适合您系统的安装包：

- **Windows**: `cuizijin-trap-windows-installer.exe`
- **macOS**: `cuizijin-trap-macos-installer.dmg`
- **Linux**: `cuizijin-trap-linux.AppImage`

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/niwator1/cuizijin-trap.git
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
```

## 🔒 安全特性

- ✅ **看门狗服务** - 独立进程监控主应用状态
- ✅ **自动重启** - 进程异常退出时自动重启
- ✅ **密码保护** - 退出应用需要管理员密码验证
- ✅ **进程隐藏** - 生产环境下隐藏进程
- ✅ **系统集成** - 开机自启动和防火墙配置

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS + Framer Motion
- **后端**: Electron + Node.js + SQLite
- **构建**: Webpack + Vite + electron-builder
- **测试**: Playwright + Jest
- **CI/CD**: GitHub Actions

## 📖 文档

- [📋 GitHub部署指南](docs/GitHub部署指南.md)
- [🔧 开发指南](docs/开发指南.md)
- [🐛 故障排除](docs/故障排除.md)
- [📝 更新日志](CHANGELOG.md)

## 🤝 贡献

欢迎贡献代码！请查看 [贡献指南](CONTRIBUTING.md) 了解详情。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**⚠️ 重要提醒**: 本应用仅用于合法的网站访问控制目的，请遵守当地法律法规。
