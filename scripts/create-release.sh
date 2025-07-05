#!/bin/bash

# 崔子瑾诱捕器 - 创建GitHub Release脚本
# 自动创建标签并触发GitHub Actions构建和发布

set -e

echo "========================================="
echo "崔子瑾诱捕器 - 创建GitHub Release"
echo "========================================="
echo ""

# 检查是否在Git仓库中
if [ ! -d ".git" ]; then
    echo "❌ 错误: 当前目录不是Git仓库"
    exit 1
fi

# 检查是否有未提交的更改
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "⚠️ 警告: 检测到未提交的更改"
    echo "请先提交所有更改后再创建release"
    git status --short
    echo ""
    read -p "是否继续？(y/n): " continue_anyway
    if [ "$continue_anyway" != "y" ] && [ "$continue_anyway" != "Y" ]; then
        echo "操作已取消"
        exit 1
    fi
fi

# 获取当前版本
current_version=$(node -p "require('./package.json').version")
echo "📋 当前版本: v$current_version"

# 询问新版本号
echo ""
echo "请选择版本类型："
echo "1) 补丁版本 (patch) - 修复bug"
echo "2) 次要版本 (minor) - 新功能"
echo "3) 主要版本 (major) - 重大更改"
echo "4) 自定义版本号"
echo ""
read -p "请选择 (1-4): " version_choice

case $version_choice in
    1)
        new_version=$(npm version patch --no-git-tag-version)
        ;;
    2)
        new_version=$(npm version minor --no-git-tag-version)
        ;;
    3)
        new_version=$(npm version major --no-git-tag-version)
        ;;
    4)
        read -p "请输入新版本号 (格式: x.y.z): " custom_version
        if [[ ! $custom_version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "❌ 错误: 版本号格式不正确"
            exit 1
        fi
        npm version $custom_version --no-git-tag-version
        new_version="v$custom_version"
        ;;
    *)
        echo "❌ 错误: 无效选择"
        exit 1
        ;;
esac

echo "✅ 新版本: $new_version"
echo ""

# 提交版本更改
echo "📝 提交版本更改..."
git add package.json
git commit -m "Release $new_version" || echo "没有需要提交的更改"

# 创建并推送标签
echo "🏷️ 创建标签 $new_version..."
git tag $new_version

echo "🚀 推送到GitHub..."
git push origin main
git push origin $new_version

echo ""
echo "========================================="
echo "Release创建完成！"
echo "========================================="
echo ""
echo "✅ 标签 $new_version 已推送到GitHub"
echo "🤖 GitHub Actions 将自动开始构建多平台安装包"
echo ""
echo "📊 您可以在以下地址查看构建进度："
echo "https://github.com/niwator1/cuizijin-trap/actions"
echo ""
echo "📦 构建完成后，release包将自动发布到："
echo "https://github.com/niwator1/cuizijin-trap/releases"
echo ""
echo "⏱️ 预计构建时间: 10-15分钟"
echo ""
echo "🎉 完成！请等待GitHub Actions完成构建。"
