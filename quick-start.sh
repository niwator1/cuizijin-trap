#!/bin/bash

# 崔子瑾诱捕器 - 一键启动脚本
# 适用于 macOS 和 Linux

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2}${1}${NC}"
}

print_success() {
    print_message "✅ $1" $GREEN
}

print_error() {
    print_message "❌ $1" $RED
}

print_warning() {
    print_message "⚠️  $1" $YELLOW
}

print_info() {
    print_message "ℹ️  $1" $BLUE
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查 Node.js 版本
check_node() {
    if ! command_exists node; then
        print_error "Node.js 未安装"
        print_info "请访问 https://nodejs.org/ 下载安装 Node.js 16.0 或更高版本"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Node.js 版本过低: $NODE_VERSION"
        print_info "需要 Node.js 16.0 或更高版本"
        exit 1
    fi
    
    print_success "Node.js 版本检查通过: v$NODE_VERSION"
}

# 检查 npm
check_npm() {
    if ! command_exists npm; then
        print_error "npm 未安装"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    print_success "npm 版本: $NPM_VERSION"
}

# 安装依赖
install_dependencies() {
    print_info "正在安装依赖..."
    
    # 设置 npm 镜像源（可选）
    if [ "$1" = "--china" ]; then
        print_info "使用中国镜像源..."
        npm config set registry https://registry.npmmirror.com
        npm config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/
    fi
    
    # 清理缓存
    npm cache clean --force 2>/dev/null || true
    
    # 安装依赖
    if npm install; then
        print_success "依赖安装完成"
    else
        print_error "依赖安装失败"
        print_info "尝试使用 --china 参数使用国内镜像源"
        exit 1
    fi
}

# 启动开发服务器
start_dev_server() {
    print_info "启动开发服务器..."
    
    # 检查端口是否被占用
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 5173 已被占用，尝试终止..."
        pkill -f "vite" 2>/dev/null || true
        sleep 2
    fi
    
    # 启动 Vite 开发服务器（后台运行）
    npm run dev:renderer > dev-renderer.log 2>&1 &
    RENDERER_PID=$!
    
    # 等待渲染进程启动
    print_info "等待渲染进程启动..."
    for i in {1..30}; do
        if curl -s http://localhost:5173 >/dev/null 2>&1; then
            print_success "渲染进程启动成功"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            print_error "渲染进程启动超时"
            kill $RENDERER_PID 2>/dev/null || true
            exit 1
        fi
    done
    
    # 启动主进程开发服务器（后台运行）
    npm run dev:main > dev-main.log 2>&1 &
    MAIN_PID=$!
    
    # 等待主进程编译完成
    print_info "等待主进程编译..."
    sleep 5
    
    print_success "开发服务器启动完成"
    echo "渲染进程 PID: $RENDERER_PID"
    echo "主进程 PID: $MAIN_PID"
    
    # 保存 PID 到文件
    echo "$RENDERER_PID" > .renderer.pid
    echo "$MAIN_PID" > .main.pid
}

# 启动 Electron 应用
start_electron() {
    print_info "启动 Electron 应用..."
    
    # 等待一下确保编译完成
    sleep 3
    
    # 启动 Electron
    npm run electron:dev &
    ELECTRON_PID=$!
    
    echo "Electron PID: $ELECTRON_PID"
    echo "$ELECTRON_PID" > .electron.pid
    
    print_success "应用启动成功！"
    print_info "如果应用没有自动打开，请检查终端输出的错误信息"
}

# 停止所有进程
stop_all() {
    print_info "停止所有进程..."
    
    # 停止 Electron
    if [ -f .electron.pid ]; then
        ELECTRON_PID=$(cat .electron.pid)
        kill $ELECTRON_PID 2>/dev/null || true
        rm .electron.pid
    fi
    
    # 停止主进程开发服务器
    if [ -f .main.pid ]; then
        MAIN_PID=$(cat .main.pid)
        kill $MAIN_PID 2>/dev/null || true
        rm .main.pid
    fi
    
    # 停止渲染进程开发服务器
    if [ -f .renderer.pid ]; then
        RENDERER_PID=$(cat .renderer.pid)
        kill $RENDERER_PID 2>/dev/null || true
        rm .renderer.pid
    fi
    
    # 额外清理
    pkill -f "electron" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    print_success "所有进程已停止"
}

# 清理函数
cleanup() {
    print_info "清理中..."
    stop_all
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 显示帮助信息
show_help() {
    echo "崔子瑾诱捕器 - 一键启动脚本"
    echo ""
    echo "用法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --help          显示此帮助信息"
    echo "  --china         使用中国镜像源安装依赖"
    echo "  --stop          停止所有运行的进程"
    echo "  --clean         清理并重新安装依赖"
    echo "  --build         构建生产版本"
    echo "  --package       打包应用"
    echo ""
    echo "示例:"
    echo "  $0              # 正常启动"
    echo "  $0 --china      # 使用国内镜像源启动"
    echo "  $0 --stop       # 停止所有进程"
}

# 清理并重新安装
clean_install() {
    print_info "清理并重新安装..."
    rm -rf node_modules package-lock.json
    npm cache clean --force
    install_dependencies $1
}

# 构建生产版本
build_production() {
    print_info "构建生产版本..."
    npm run build:prod
    print_success "生产版本构建完成"
}

# 打包应用
package_app() {
    print_info "打包应用..."
    
    # 检测操作系统
    if [[ "$OSTYPE" == "darwin"* ]]; then
        npm run dist:mac
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        npm run dist:linux
    else
        print_warning "未知操作系统，使用通用打包命令"
        npm run dist
    fi
    
    print_success "应用打包完成，请查看 release 目录"
}

# 主函数
main() {
    echo ""
    print_info "🚀 崔子瑾诱捕器 - 一键启动脚本"
    echo ""
    
    # 解析参数
    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
        --stop)
            stop_all
            exit 0
            ;;
        --clean)
            clean_install $2
            exit 0
            ;;
        --build)
            check_node
            check_npm
            build_production
            exit 0
            ;;
        --package)
            check_node
            check_npm
            build_production
            package_app
            exit 0
            ;;
    esac
    
    # 环境检查
    print_info "检查环境..."
    check_node
    check_npm
    
    # 检查是否已安装依赖
    if [ ! -d "node_modules" ]; then
        print_warning "依赖未安装，开始安装..."
        install_dependencies $1
    else
        print_success "依赖已安装"
    fi
    
    # 启动服务
    start_dev_server
    start_electron
    
    # 等待用户输入
    print_info "应用正在运行..."
    print_info "按 Ctrl+C 停止应用"
    
    # 保持脚本运行
    while true; do
        sleep 1
    done
}

# 运行主函数
main "$@"
