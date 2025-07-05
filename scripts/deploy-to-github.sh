#!/bin/bash

# 崔子瑾诱捕器 - GitHub 部署脚本
# 自动初始化 Git 仓库并推送到 GitHub

set -e

echo "========================================="
echo "崔子瑾诱捕器 - GitHub 部署脚本"
echo "========================================="
echo ""

# 检查是否已经是 Git 仓库
if [ -d ".git" ]; then
    echo "✅ 检测到现有 Git 仓库"
    git status
else
    echo "🔧 初始化 Git 仓库..."
    git init
    echo "✅ Git 仓库初始化完成"
fi

echo ""

# 获取 GitHub 仓库地址
echo "📝 请输入您的 GitHub 仓库地址："
echo "格式：https://github.com/YOUR_USERNAME/REPO_NAME.git"
read -p "仓库地址: " repo_url

if [ -z "$repo_url" ]; then
    echo "❌ 仓库地址不能为空"
    exit 1
fi

echo ""

# 检查是否已添加远程仓库
if git remote get-url origin &> /dev/null; then
    echo "🔄 更新远程仓库地址..."
    git remote set-url origin "$repo_url"
else
    echo "🔗 添加远程仓库..."
    git remote add origin "$repo_url"
fi

echo "✅ 远程仓库设置完成: $repo_url"
echo ""

# 添加文件到 Git
echo "📁 添加文件到 Git..."
git add .

# 检查是否有更改
if git diff --staged --quiet; then
    echo "ℹ️ 没有检测到文件更改"
else
    echo "✅ 文件已添加到暂存区"
fi

echo ""

# 创建提交
echo "💬 创建提交..."
commit_message="🚀 Deploy: 崔子瑾诱捕器项目 - $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$commit_message" || echo "ℹ️ 没有新的更改需要提交"

echo ""

# 推送到 GitHub
echo "🚀 推送到 GitHub..."
git branch -M main

if git push -u origin main; then
    echo "✅ 成功推送到 GitHub!"
else
    echo "❌ 推送失败，可能需要先设置 GitHub 认证"
    echo ""
    echo "请确保："
    echo "1. 已经创建了 GitHub 仓库"
    echo "2. 已经设置了 Git 用户信息："
    echo "   git config --global user.name \"Your Name\""
    echo "   git config --global user.email \"your.email@example.com\""
    echo "3. 已经设置了 GitHub 认证（SSH 密钥或个人访问令牌）"
    exit 1
fi

echo ""
echo "========================================="
echo "部署完成！"
echo "========================================="
echo ""
echo "🎉 项目已成功部署到 GitHub!"
echo "📍 仓库地址: $repo_url"
echo ""
echo "🔄 接下来您可以："
echo "1. 访问 GitHub 仓库查看代码"
echo "2. 设置 GitHub Actions 自动构建"
echo "3. 创建 Release 发布版本"
echo ""
echo "📋 创建发布版本："
echo "git tag v1.0.0"
echo "git push origin v1.0.0"
echo ""
echo "🤖 或者在 GitHub 网页上手动触发 Actions 工作流"
echo ""

# 询问是否创建标签
read -p "是否现在创建并推送 v1.0.0 标签？(y/n): " create_tag

if [ "$create_tag" = "y" ] || [ "$create_tag" = "Y" ]; then
    echo ""
    echo "🏷️ 创建标签 v1.0.0..."
    git tag v1.0.0
    git push origin v1.0.0
    echo "✅ 标签已推送，GitHub Actions 将自动开始构建!"
    echo ""
    echo "📊 您可以在以下地址查看构建进度："
    echo "${repo_url%.git}/actions"
fi

echo ""
echo "🎊 部署完成！祝您使用愉快！"
