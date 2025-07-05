# GitHub 部署指南 🚀

本指南将帮助您将"崔子瑾诱捕器"项目部署到 GitHub，并设置自动构建和发布。

## 📋 准备工作

### 1. 确保项目已构建
```bash
# 构建项目
npm run build

# 测试 Windows 构建（在 macOS 上）
npm run dist:win
```

### 2. 检查必要文件
确保以下文件存在：
- ✅ `.gitignore` - Git 忽略文件
- ✅ `README-GitHub.md` - 项目说明
- ✅ `.github/workflows/build-and-release.yml` - GitHub Actions 工作流
- ✅ `LICENSE` - 许可证文件

## 🔧 GitHub 仓库设置

### 1. 创建 GitHub 仓库
1. 登录 GitHub
2. 点击右上角的 "+" 按钮
3. 选择 "New repository"
4. 填写仓库信息：
   - **Repository name**: `cuizijin-trap` 或您喜欢的名称
   - **Description**: `崔子瑾诱捕器 - 网站访问控制应用`
   - **Visibility**: 选择 Public 或 Private
   - **不要**勾选 "Add a README file"（我们已经有了）

### 2. 初始化本地 Git 仓库
```bash
# 进入项目目录
cd /Users/zhouyi/Documents/augment-projects/website_version2

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 创建初始提交
git commit -m "🎉 Initial commit: 崔子瑾诱捕器项目"

# 添加远程仓库（替换为您的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/cuizijin-trap.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

## 🤖 自动构建设置

### 1. GitHub Actions 权限
1. 进入您的 GitHub 仓库
2. 点击 "Settings" 标签
3. 在左侧菜单中选择 "Actions" > "General"
4. 在 "Workflow permissions" 部分：
   - 选择 "Read and write permissions"
   - 勾选 "Allow GitHub Actions to create and approve pull requests"
5. 点击 "Save"

### 2. 创建发布
有两种方式触发自动构建：

#### 方式一：创建标签发布
```bash
# 创建并推送标签
git tag v1.0.0
git push origin v1.0.0
```

#### 方式二：手动触发
1. 进入 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "Build and Release" 工作流
4. 点击 "Run workflow"
5. 输入版本号（如 v1.0.0）
6. 点击 "Run workflow"

## 📦 发布管理

### 自动发布流程
1. **触发构建**：推送标签或手动触发
2. **多平台构建**：
   - macOS 构建器：生成 .dmg 和 .zip 文件
   - Windows 构建器：生成 .exe 安装程序
   - Linux 构建器：生成 .AppImage、.deb、.rpm 文件
3. **创建发布**：自动创建 GitHub Release
4. **上传文件**：将构建的安装包上传到 Release

### 手动发布
如果自动发布失败，可以手动操作：

1. **下载构建产物**：
   - 进入 Actions 页面
   - 点击对应的工作流运行
   - 下载 Artifacts

2. **创建 Release**：
   - 进入仓库主页
   - 点击右侧的 "Releases"
   - 点击 "Create a new release"
   - 填写标签版本和发布说明
   - 上传下载的安装包文件

## 🔧 本地跨平台构建

### macOS 上构建 Windows 应用
```bash
# 使用我们创建的跨平台构建脚本
./scripts/build-cross-platform.sh

# 或者直接构建 Windows 版本
npm run dist:win
```

### 构建结果
成功构建后，您会在 `release/` 目录中找到：

**Windows:**
- `*.exe` - NSIS 安装程序
- `win-unpacked/` - 便携版本

**macOS:**
- `*.dmg` - 磁盘映像安装程序
- `*.zip` - 压缩包版本

**Linux:**
- `*.AppImage` - 便携应用程序
- `*.deb` - Debian 包
- `*.rpm` - Red Hat 包

## 🚀 部署最佳实践

### 1. 版本管理
- 使用语义化版本号：`v1.0.0`、`v1.1.0`、`v2.0.0`
- 每次发布前更新 `package.json` 中的版本号
- 在 Release 说明中详细描述更新内容

### 2. 安全考虑
- 不要在代码中包含敏感信息
- 使用 GitHub Secrets 存储证书和密钥
- 定期更新依赖包

### 3. 用户体验
- 提供详细的安装说明
- 包含系统要求和兼容性信息
- 提供问题反馈渠道

## 🛠️ 故障排除

### 构建失败
1. **检查依赖**：确保所有依赖都已正确安装
2. **检查配置**：验证 `electron-builder.config.js` 配置
3. **查看日志**：在 Actions 页面查看详细的构建日志

### 发布失败
1. **权限问题**：检查 GitHub Actions 权限设置
2. **文件路径**：确认构建产物的路径正确
3. **网络问题**：重新运行工作流

### 跨平台构建问题
1. **Windows 构建**：确保有足够的磁盘空间下载 Electron
2. **代码签名**：Windows 和 macOS 的代码签名是可选的
3. **依赖兼容性**：某些 Node.js 模块可能不支持跨平台构建

## 📞 获取帮助

如果遇到问题：
1. 查看 GitHub Actions 的构建日志
2. 检查 electron-builder 官方文档
3. 在项目中创建 Issue 描述问题

---

**提示**：首次构建可能需要较长时间，因为需要下载各平台的 Electron 二进制文件。后续构建会使用缓存，速度会更快。
