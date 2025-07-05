#!/bin/bash

# 崔子瑾诱捕器 - 简化启动脚本
# 直接使用生产构建模式启动，避免开发环境的复杂性

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo ""
echo "🚀 崔子瑾诱捕器 - 简化启动"
echo ""

# 检查依赖
if [ ! -d "node_modules" ]; then
    print_warning "依赖未安装，开始安装..."
    npm install
fi

# 构建应用
print_warning "构建应用..."
npm run build

if [ $? -ne 0 ]; then
    print_error "构建失败"
    exit 1
fi

print_success "构建完成"

# 启动应用
print_warning "启动应用..."
npm run electron

echo ""
print_success "应用已启动！"
