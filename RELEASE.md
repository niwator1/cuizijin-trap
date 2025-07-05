# 崔子瑾诱捕器 - 发布指南

本文档说明如何创建和发布多平台release包到GitHub。

## 🚀 快速发布

### 方法一：自动创建Release（推荐）

```bash
# 构建并创建新的GitHub Release
npm run release:github
```

这个命令会：
1. 构建生产版本
2. 询问版本类型（patch/minor/major）
3. 更新package.json版本号
4. 创建Git标签
5. 推送到GitHub
6. 自动触发GitHub Actions构建多平台包

### 检查构建状态

```bash
# 检查当前构建状态
npm run release:status
```

这个命令会显示：
- 最近的构建记录
- 当前构建进度
- 构建结果和下载链接

### 方法二：手动触发构建

如果您已经有了标签，可以手动触发构建：

```bash
# 需要设置GitHub Token
export GITHUB_TOKEN=your_personal_access_token

# 手动触发指定版本的构建
npm run release:trigger
```

### 方法三：使用脚本

```bash
# 直接运行发布脚本
./scripts/create-release.sh

# 或手动触发
node scripts/trigger-release.js
```

## 📦 支持的平台和格式

### Windows
- **NSIS安装程序** (`.exe`) - 推荐，支持自动安装和卸载
- **便携版** (`win-unpacked/`) - 免安装版本

### macOS
- **DMG镜像** (`.dmg`) - 标准macOS安装包
- **ZIP压缩包** (`.zip`) - 便携版本

### Linux
- **AppImage** (`.AppImage`) - 通用Linux应用，无需安装
- **Debian包** (`.deb`) - 适用于Ubuntu/Debian系统
- **RPM包** (`.rpm`) - 适用于CentOS/RHEL/Fedora系统

## 🔧 配置说明

### GitHub Actions配置

GitHub Actions工作流位于 `.github/workflows/build-and-release.yml`，支持：

- **自动触发**：推送标签时自动构建
- **手动触发**：通过GitHub网页或API手动触发
- **多平台构建**：同时构建Windows、macOS、Linux版本
- **自动发布**：构建完成后自动创建GitHub Release

### 触发条件

1. **推送标签**：`git push origin v1.0.0`
2. **手动触发**：在GitHub Actions页面点击"Run workflow"
3. **API触发**：使用脚本或GitHub CLI

## 🛠️ 本地构建

如果需要本地构建特定平台：

```bash
# 构建所有平台（需要在macOS上运行）
npm run dist:all

# 构建特定平台
npm run dist:win     # Windows
npm run dist:mac     # macOS
npm run dist:linux   # Linux

# 使用跨平台构建脚本
./scripts/build-cross-platform.sh
```

## 📋 发布检查清单

发布前请确认：

- [ ] 代码已提交并推送到main分支
- [ ] 版本号已正确更新
- [ ] 功能测试通过
- [ ] 构建配置正确
- [ ] GitHub Token权限充足（如使用API触发）

## 🔐 权限要求

### GitHub Token权限

如果使用API触发，需要Personal Access Token具有以下权限：
- `repo` - 完整仓库访问权限
- `workflow` - 工作流权限

### 创建Token步骤

1. 访问 GitHub Settings > Developer settings > Personal access tokens
2. 点击 "Generate new token"
3. 选择所需权限
4. 复制token并设置环境变量：`export GITHUB_TOKEN=your_token`

## 📊 监控构建

### 查看构建状态

- **GitHub Actions**: https://github.com/niwator1/cuizijin-trap/actions
- **Releases页面**: https://github.com/niwator1/cuizijin-trap/releases

### 构建时间

- **Windows**: ~5-8分钟
- **macOS**: ~8-12分钟  
- **Linux**: ~5-8分钟
- **总计**: ~10-15分钟

## 🐛 故障排除

### 常见问题

1. **构建失败**
   - 检查依赖是否正确安装
   - 查看GitHub Actions日志
   - 确认代码语法正确

2. **权限错误**
   - 检查GitHub Token权限
   - 确认仓库访问权限

3. **文件缺失**
   - 检查.gitignore配置
   - 确认必要文件已提交

### 调试命令

```bash
# 检查构建配置
npm run build -- --dry-run

# 本地测试构建
npm run build:prod

# 检查Git状态
git status
git log --oneline -5
```

## 📝 版本管理

### 语义化版本

遵循 [Semantic Versioning](https://semver.org/) 规范：

- **MAJOR** (1.0.0): 不兼容的API更改
- **MINOR** (0.1.0): 向后兼容的功能添加
- **PATCH** (0.0.1): 向后兼容的bug修复

### 版本号示例

```bash
v1.0.0    # 首个正式版本
v1.0.1    # bug修复
v1.1.0    # 新功能
v2.0.0    # 重大更改
```

## 🎉 发布完成

发布成功后：

1. 检查GitHub Releases页面
2. 测试下载的安装包
3. 更新项目文档
4. 通知用户新版本发布

---

**注意**: 首次发布可能需要额外配置GitHub仓库设置和权限。如遇问题，请检查GitHub Actions日志获取详细错误信息。
