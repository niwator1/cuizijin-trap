# 🚀 崔子瑾诱捕器 - 快速开始指南

## 📦 一键启动懒人包

为了让您快速体验崔子瑾诱捕器，我们提供了一键启动脚本，无需复杂的配置即可运行应用。

### 🖥️ 支持的操作系统

- ✅ **macOS** (Intel & Apple Silicon)
- ✅ **Windows** (Windows 10/11)
- ✅ **Linux** (Ubuntu, CentOS, Debian 等)

---

## 🎯 超级简单的启动方式

### 方法一：一键脚本启动

#### macOS / Linux 用户
```bash
# 1. 给脚本执行权限
chmod +x quick-start.sh

# 2. 一键启动（推荐）
./quick-start.sh

# 3. 如果网络较慢，使用国内镜像源
./quick-start.sh --china
```

#### Windows 用户
```cmd
# 1. 双击运行 quick-start.bat
# 或在命令行中运行：

quick-start.bat

# 如果网络较慢，使用国内镜像源：
quick-start.bat --china
```

### 方法二：手动启动（3步搞定）

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 启动应用（新开一个终端）
npm run electron:dev
```

---

## 🛠️ 脚本功能说明

### 基础命令

| 命令 | 功能 | 说明 |
|------|------|------|
| `./quick-start.sh` | 正常启动 | 检查环境、安装依赖、启动应用 |
| `./quick-start.sh --china` | 使用国内源启动 | 适合网络较慢的用户 |
| `./quick-start.sh --stop` | 停止所有进程 | 清理后台运行的进程 |
| `./quick-start.sh --help` | 显示帮助 | 查看所有可用选项 |

### 高级命令

| 命令 | 功能 | 说明 |
|------|------|------|
| `./quick-start.sh --clean` | 清理重装 | 删除依赖重新安装 |
| `./quick-start.sh --build` | 构建生产版 | 构建优化后的版本 |
| `./quick-start.sh --package` | 打包应用 | 生成可分发的安装包 |

---

## 🔧 环境要求

### 必需软件
- **Node.js** 16.0 或更高版本
- **npm** (通常随 Node.js 一起安装)

### 自动检查
脚本会自动检查：
- ✅ Node.js 版本是否符合要求
- ✅ npm 是否正确安装
- ✅ 端口是否被占用
- ✅ 依赖是否已安装

### 快速安装 Node.js
如果您还没有安装 Node.js：

1. **访问官网**: https://nodejs.org/
2. **下载 LTS 版本**（推荐）
3. **运行安装程序**，一路下一步即可

---

## 🎮 启动后的操作

### 1. 首次启动
应用启动后会看到欢迎界面：
- 设置管理员密码
- 选择主题偏好
- 完成初始配置

### 2. 基础测试
- 添加一个测试网站到黑名单
- 尝试访问该网站验证拦截功能
- 查看统计数据和日志

### 3. 高级功能
- 创建自定义拦截规则
- 设置时间段控制
- 配置网站分类

---

## 🐛 常见问题解决

### 问题1：Node.js 版本过低
```bash
# 错误信息：Node.js 版本过低
# 解决方案：升级 Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 问题2：端口被占用
```bash
# 错误信息：端口 5173 已被占用
# 解决方案：脚本会自动处理，或手动清理
./quick-start.sh --stop
```

### 问题3：依赖安装失败
```bash
# 错误信息：npm install 失败
# 解决方案：使用国内镜像源
./quick-start.sh --china

# 或者清理重装
./quick-start.sh --clean --china
```

### 问题4：权限问题 (macOS/Linux)
```bash
# 错误信息：Permission denied
# 解决方案：给予执行权限
chmod +x quick-start.sh

# 如果仍有问题，检查 Node.js 权限
sudo chown -R $(whoami) ~/.npm
```

### 问题5：Windows 执行策略限制
```powershell
# 错误信息：无法执行脚本
# 解决方案：设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📊 启动过程说明

### 自动化流程
```
1. 环境检查 ✅
   ├── Node.js 版本检查
   ├── npm 可用性检查
   └── 端口占用检查

2. 依赖管理 📦
   ├── 检查 node_modules
   ├── 安装缺失依赖
   └── 清理缓存（如需要）

3. 服务启动 🚀
   ├── 启动 Vite 开发服务器 (端口 5173)
   ├── 启动 Webpack 主进程编译
   └── 启动 Electron 应用

4. 健康检查 🔍
   ├── 渲染进程连接检查
   ├── 主进程编译状态
   └── Electron 应用启动确认
```

### 日志文件
启动过程中会生成日志文件：
- `dev-renderer.log` - 渲染进程日志
- `dev-main.log` - 主进程日志

---

## 🎯 性能优化建议

### 首次启动
- 首次启动需要下载依赖，可能需要 3-5 分钟
- 使用 `--china` 参数可以显著提升下载速度

### 后续启动
- 依赖已安装后，启动时间约 30-60 秒
- 主要时间用于代码编译和 Electron 启动

### 系统资源
- **内存使用**: 约 200-400MB
- **CPU使用**: 启动时较高，运行时很低
- **磁盘空间**: 约 500MB（包含依赖）

---

## 🔄 开发模式 vs 生产模式

### 开发模式（默认）
- ✅ 热重载，代码修改实时生效
- ✅ 详细的调试信息
- ✅ 开发者工具可用
- ⚠️ 性能较慢，文件较大

### 生产模式
```bash
# 构建生产版本
./quick-start.sh --build

# 打包成安装程序
./quick-start.sh --package
```

- ✅ 性能优化，启动更快
- ✅ 文件压缩，体积更小
- ✅ 适合最终用户使用

---

## 🆘 获取帮助

### 在线资源
- 📚 **完整文档**: `docs/` 目录
- 🐛 **故障排除**: `docs/故障排除文档.md`
- 📖 **用户手册**: `docs/用户使用手册.md`

### 命令行帮助
```bash
# 查看脚本帮助
./quick-start.sh --help

# 查看 npm 脚本
npm run
```

### 日志调试
```bash
# 查看实时日志
tail -f dev-renderer.log
tail -f dev-main.log

# 查看应用日志
# macOS: ~/Library/Logs/崔子瑾诱捕器/
# Windows: %USERPROFILE%\AppData\Roaming\崔子瑾诱捕器\logs\
# Linux: ~/.config/崔子瑾诱捕器/logs/
```

---

## 🎉 开始体验

现在您可以开始体验崔子瑾诱捕器了！

1. **运行启动脚本**
2. **等待应用启动**
3. **按照界面提示完成初始设置**
4. **开始使用网站访问控制功能**

如果遇到任何问题，请查看故障排除文档或检查日志文件。

**祝您使用愉快！** 🚀
