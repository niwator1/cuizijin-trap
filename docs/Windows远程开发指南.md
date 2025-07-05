# Windows远程开发环境配置指南

## 🌐 方案概述

本指南提供两种Windows远程开发方案：
1. **GitHub Actions自动构建**（推荐，免费）
2. **Windows云服务器 + VS Code Remote**（交互式开发）

## 🚀 方案1：GitHub Actions自动构建（推荐）

### 快速开始

1. **设置GitHub Token**
```bash
# 方法1：环境变量
export GITHUB_TOKEN=your_github_token

# 方法2：Git配置
git config --global github.token your_github_token
```

2. **触发Windows构建**
```bash
# 构建当前分支
npm run build:windows:remote

# 构建指定分支
node scripts/trigger-windows-build.js build develop

# 启用调试模式
npm run build:windows:debug

# 查看构建状态
npm run build:status
```

3. **下载构建结果**
- 访问 [GitHub Actions](https://github.com/niwator1/cuizijin-trap/actions)
- 找到最新的"Windows Build Only"工作流
- 下载"windows-build-xxx"构件
- 解压获得exe文件

### 自动触发构建

项目已配置自动触发：
- 推送到`main`或`develop`分支时自动构建
- 修改`src/`、`package.json`、`electron-builder.config.js`时触发

### 构建产物

每次构建会生成：
- `*.exe` - Windows安装程序（NSIS）
- `win-unpacked/` - 便携版本
- 构建日志（如果失败）

## 🖥️ 方案2：Windows云服务器

### 推荐的云服务提供商

1. **Azure Virtual Machines**
   - Windows Server 2019/2022
   - 4GB RAM, 2 vCPU（最低配置）
   - 预装Visual Studio Build Tools

2. **AWS EC2**
   - Windows Server AMI
   - t3.medium实例（推荐）
   - 按小时计费

3. **阿里云ECS**
   - Windows Server 2019
   - 2核4GB配置
   - 国内访问速度快

### 环境配置步骤

#### 1. 创建Windows虚拟机
```powershell
# 推荐配置
- OS: Windows Server 2019/2022
- CPU: 2核心以上
- RAM: 4GB以上
- 存储: 50GB以上
- 网络: 允许RDP (3389) 和SSH (22)
```

#### 2. 安装开发环境
```powershell
# 安装Chocolatey包管理器
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# 安装开发工具
choco install nodejs python git vscode -y
choco install visualstudio2019buildtools -y

# 安装VS Code扩展
code --install-extension ms-vscode-remote.remote-ssh
code --install-extension ms-vscode.vscode-typescript-next
```

#### 3. 配置SSH访问
```powershell
# 安装OpenSSH Server
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

# 启动SSH服务
Start-Service sshd
Set-Service -Name sshd -StartupType 'Automatic'

# 配置防火墙
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

#### 4. VS Code Remote连接
```bash
# 本地VS Code中
# 1. 安装Remote-SSH扩展
# 2. 按F1，输入"Remote-SSH: Connect to Host"
# 3. 输入: user@your-windows-server-ip
# 4. 选择平台: Windows
```

### 项目部署到云服务器

#### 1. 克隆项目
```powershell
git clone https://github.com/niwator1/cuizijin-trap.git
cd cuizijin-trap
```

#### 2. 安装依赖
```powershell
npm install
npm rebuild better-sqlite3
npm rebuild bcrypt
```

#### 3. 构建和打包
```powershell
npm run build
npm run dist:win
```

## 🔧 故障排除

### 常见问题

1. **Native模块编译失败**
```powershell
# 清理并重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm rebuild
```

2. **Python版本问题**
```powershell
# 设置Python版本
npm config set python python3.11
```

3. **Visual Studio Build Tools缺失**
```powershell
# 安装完整的Build Tools
choco install visualstudio2019buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"
```

4. **权限问题**
```powershell
# 以管理员身份运行PowerShell
Start-Process powershell -Verb runAs
```

### 性能优化

1. **加速npm安装**
```powershell
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
```

2. **并行构建**
```powershell
npm config set jobs 4
```

## 💰 成本估算

### GitHub Actions（免费）
- 公共仓库：完全免费
- 私有仓库：每月2000分钟免费

### 云服务器（按需付费）
- Azure: ~$50-100/月（按使用时间）
- AWS: ~$30-80/月（按使用时间）
- 阿里云: ~¥200-400/月（按使用时间）

## 📝 最佳实践

1. **使用GitHub Actions进行日常构建**
2. **仅在需要调试时使用云服务器**
3. **及时关闭不使用的云服务器**
4. **定期备份重要配置**
5. **使用SSH密钥而非密码认证**

## 🎯 推荐工作流

1. **日常开发**：在本地macOS环境开发
2. **Windows构建**：推送代码触发GitHub Actions
3. **问题调试**：临时启动Windows云服务器
4. **发布版本**：使用GitHub Actions自动发布
