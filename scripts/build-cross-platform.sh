#!/bin/bash

# 崔子瑾诱捕器 - macOS 跨平台构建脚本
# 在 macOS 上构建 Windows、macOS 和 Linux 版本

set -e

echo "========================================="
echo "崔子瑾诱捕器 - 跨平台构建脚本"
echo "========================================="
echo ""

# 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo "❌ [错误] 未检测到 Node.js 环境，请先安装 Node.js"
    exit 1
fi

# 检查 npm 环境
if ! command -v npm &> /dev/null; then
    echo "❌ [错误] 未检测到 npm 环境"
    exit 1
fi

echo "✅ [信息] Node.js 和 npm 环境检查通过"
echo ""

# 清理旧的构建文件
echo "🧹 [步骤 1/6] 清理旧的构建文件..."
rm -rf dist release
echo "✅ [完成] 清理完成"
echo ""

# 安装依赖
echo "📦 [步骤 2/6] 安装项目依赖..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ [错误] 依赖安装失败"
    exit 1
fi
echo "✅ [完成] 依赖安装完成"
echo ""

# 生成图标
echo "🎨 [步骤 3/6] 生成应用图标..."
if npm run generate:icons; then
    echo "✅ [完成] 图标生成完成"
else
    echo "⚠️ [警告] 图标生成失败，将使用默认图标"
fi
echo ""

# 构建应用
echo "🔨 [步骤 4/6] 构建应用代码..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ [错误] 应用构建失败"
    exit 1
fi
echo "✅ [完成] 应用构建完成"
echo ""

# 选择构建目标
echo "🎯 [步骤 5/6] 选择构建目标..."
echo "请选择要构建的平台："
echo "1) Windows (推荐)"
echo "2) macOS"
echo "3) Linux"
echo "4) 全平台"
echo ""
read -p "请输入选项 (1-4): " choice

case $choice in
    1)
        echo "🪟 构建 Windows 版本..."
        npm run dist:win
        ;;
    2)
        echo "🍎 构建 macOS 版本..."
        npm run dist:mac
        ;;
    3)
        echo "🐧 构建 Linux 版本..."
        npm run dist:linux
        ;;
    4)
        echo "🌍 构建全平台版本..."
        npm run dist:all
        ;;
    *)
        echo "❌ 无效选项，默认构建 Windows 版本..."
        npm run dist:win
        ;;
esac

if [ $? -ne 0 ]; then
    echo "❌ [错误] 打包失败"
    exit 1
fi
echo "✅ [完成] 打包完成"
echo ""

# 显示构建结果
echo "📊 [步骤 6/6] 构建完成！"
echo ""
echo "========================================="
echo "构建结果："
echo "========================================="

if [ -d "release" ]; then
    echo "📁 构建输出目录: release/"
    ls -la release/
    echo ""
    
    # 检查 Windows 文件
    if ls release/*.exe 1> /dev/null 2>&1; then
        echo "🪟 Windows 安装程序："
        ls -lh release/*.exe
        echo ""
    fi
    
    # 检查 macOS 文件
    if ls release/*.dmg 1> /dev/null 2>&1; then
        echo "🍎 macOS 安装程序："
        ls -lh release/*.dmg
        echo ""
    fi
    
    # 检查 Linux 文件
    if ls release/*.AppImage 1> /dev/null 2>&1; then
        echo "🐧 Linux 应用程序："
        ls -lh release/*.AppImage
        echo ""
    fi
    
    # 检查便携版
    if [ -d "release/win-unpacked" ]; then
        echo "📦 Windows 便携版: release/win-unpacked/"
    fi
    
    if [ -d "release/mac" ]; then
        echo "📦 macOS 应用包: release/mac/"
    fi
    
    if [ -d "release/linux-unpacked" ]; then
        echo "📦 Linux 便携版: release/linux-unpacked/"
    fi
else
    echo "❌ 未找到构建输出目录"
fi

echo ""
echo "========================================="
echo "部署说明："
echo "========================================="
echo "🪟 Windows:"
echo "  - 安装版：运行 .exe 文件进行安装"
echo "  - 便携版：直接运行 win-unpacked 文件夹中的程序"
echo "  - 需要管理员权限运行"
echo ""
echo "🍎 macOS:"
echo "  - 安装版：打开 .dmg 文件，拖拽到应用程序文件夹"
echo "  - 可能需要在系统偏好设置中允许运行"
echo ""
echo "🐧 Linux:"
echo "  - AppImage：直接运行，无需安装"
echo "  - 可能需要添加执行权限：chmod +x *.AppImage"
echo ""
echo "========================================="
echo "安全特性："
echo "========================================="
echo "✅ 看门狗进程监控"
echo "✅ 自动重启机制"
echo "✅ 密码保护退出"
echo "✅ 开机自启动"
echo "✅ 防火墙规则配置"
echo "✅ 进程隐藏保护"
echo ""

echo "🎉 构建完成！"
