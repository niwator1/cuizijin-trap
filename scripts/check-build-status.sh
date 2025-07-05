#!/bin/bash

# 检查构建状态脚本

echo "🔍 检查构建状态..."
echo ""

# 检查是否有构建输出目录
if [ -d "release" ]; then
    echo "✅ 发现构建输出目录: release/"
    echo ""
    
    # 列出构建产物
    echo "📦 构建产物:"
    ls -la release/
    echo ""
    
    # 检查 Windows 构建
    if [ -f release/*.exe ]; then
        echo "🪟 Windows 安装程序:"
        ls -lh release/*.exe
        echo ""
    fi
    
    if [ -d "release/win-unpacked" ]; then
        echo "📦 Windows 便携版: release/win-unpacked/"
        echo "   大小: $(du -sh release/win-unpacked | cut -f1)"
        echo ""
    fi
    
    # 检查 macOS 构建
    if [ -f release/*.dmg ]; then
        echo "🍎 macOS 安装程序:"
        ls -lh release/*.dmg
        echo ""
    fi
    
    # 检查 Linux 构建
    if [ -f release/*.AppImage ]; then
        echo "🐧 Linux 应用程序:"
        ls -lh release/*.AppImage
        echo ""
    fi
    
    # 计算总大小
    total_size=$(du -sh release | cut -f1)
    echo "📊 总构建大小: $total_size"
    
else
    echo "❌ 未找到构建输出目录"
    echo "请先运行构建命令："
    echo "  npm run build"
    echo "  npm run dist:win"
fi

echo ""
echo "🔄 当前构建进程:"
ps aux | grep -E "(electron-builder|npm.*dist)" | grep -v grep || echo "  无活动构建进程"

echo ""
echo "💾 磁盘空间:"
df -h . | tail -1

echo ""
echo "🕐 当前时间: $(date)"
