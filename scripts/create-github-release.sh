#!/bin/bash

# 崔子瑾诱捕器 - 创建GitHub Release并上传文件

set -e

echo "========================================="
echo "崔子瑾诱捕器 - 创建GitHub Release"
echo "========================================="
echo ""

# 配置
OWNER="niwator1"
REPO="cuizijin-trap"
VERSION="v1.0.0"
RELEASE_NAME="崔子瑾诱捕器 v1.0.0"

# 检查文件是否存在
ZIP_FILE="release/cuizijin-trap-windows-v1.0.0.zip"
if [ ! -f "$ZIP_FILE" ]; then
    echo "❌ 错误: 找不到文件 $ZIP_FILE"
    exit 1
fi

echo "📁 找到文件: $ZIP_FILE"
echo "📊 文件大小: $(du -h "$ZIP_FILE" | cut -f1)"
echo ""

# 检查GitHub Token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ 错误: 未设置GITHUB_TOKEN环境变量"
    echo ""
    echo "请设置GitHub Personal Access Token:"
    echo "export GITHUB_TOKEN=your_token_here"
    echo ""
    echo "或者手动创建Release:"
    echo "1. 访问: https://github.com/$OWNER/$REPO/releases/new"
    echo "2. 标签版本: $VERSION"
    echo "3. 发布标题: $RELEASE_NAME"
    echo "4. 上传文件: $ZIP_FILE"
    exit 1
fi

echo "🔑 GitHub Token已设置"
echo ""

# 创建Release的JSON数据
RELEASE_DATA=$(cat <<EOF
{
  "tag_name": "$VERSION",
  "name": "$RELEASE_NAME",
  "body": "## 崔子瑾诱捕器 - 网站访问控制应用\n\n### 🚀 新功能\n- 网站访问控制和拦截\n- 进程保护和自动重启\n- 密码保护退出机制\n- 跨平台支持 (Windows/macOS/Linux)\n\n### 📦 安装说明\n\n**Windows:**\n- 下载 \`cuizijin-trap-windows-v1.0.0.zip\` 压缩包\n- 解压到任意目录\n- 以管理员身份运行 \`崔子瑾诱捕器.exe\`\n- 支持开机自启动和进程保护\n\n### ⚠️ 重要提醒\n- Windows 版本需要管理员权限才能启用完整功能\n- 请妥善保管管理员密码，这是退出应用的唯一方式\n- 生产环境下会启用进程保护功能\n\n### 🔒 安全特性\n- ✅ 看门狗进程监控\n- ✅ 自动重启机制\n- ✅ 密码保护退出\n- ✅ 开机自启动\n- ✅ 防火墙规则配置\n- ✅ 进程隐藏保护",
  "draft": false,
  "prerelease": false
}
EOF
)

echo "📝 创建GitHub Release..."

# 创建Release
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  -d "$RELEASE_DATA" \
  "https://api.github.com/repos/$OWNER/$REPO/releases")

# 检查是否创建成功
if echo "$RESPONSE" | grep -q '"upload_url"'; then
    echo "✅ Release创建成功!"
    UPLOAD_URL=$(echo "$RESPONSE" | grep '"upload_url"' | cut -d'"' -f4 | sed 's/{?name,label}//')
    RELEASE_URL=$(echo "$RESPONSE" | grep '"html_url"' | cut -d'"' -f4)
elif echo "$RESPONSE" | grep -q 'already_exists'; then
    echo "ℹ️ Release已存在，获取现有Release..."
    EXISTING_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" \
      "https://api.github.com/repos/$OWNER/$REPO/releases/tags/$VERSION")
    
    if echo "$EXISTING_RESPONSE" | grep -q '"upload_url"'; then
        UPLOAD_URL=$(echo "$EXISTING_RESPONSE" | grep '"upload_url"' | cut -d'"' -f4 | sed 's/{?name,label}//')
        RELEASE_URL=$(echo "$EXISTING_RESPONSE" | grep '"html_url"' | cut -d'"' -f4)
        echo "✅ 获取现有Release成功!"
    else
        echo "❌ 获取现有Release失败"
        echo "$EXISTING_RESPONSE"
        exit 1
    fi
else
    echo "❌ 创建Release失败"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo "📤 上传文件到Release..."

# 上传文件
FILENAME=$(basename "$ZIP_FILE")
UPLOAD_RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @"$ZIP_FILE" \
  "${UPLOAD_URL}?name=${FILENAME}")

# 检查上传结果
if echo "$UPLOAD_RESPONSE" | grep -q '"download_count"'; then
    echo "✅ 文件上传成功!"
    DOWNLOAD_URL=$(echo "$UPLOAD_RESPONSE" | grep '"browser_download_url"' | cut -d'"' -f4)
else
    echo "❌ 文件上传失败"
    echo "$UPLOAD_RESPONSE"
    exit 1
fi

echo ""
echo "========================================="
echo "🎉 Release创建完成！"
echo "========================================="
echo ""
echo "📦 Release地址: $RELEASE_URL"
echo "📥 下载地址: $DOWNLOAD_URL"
echo ""
echo "🎊 用户现在可以从GitHub下载安装包了！"
