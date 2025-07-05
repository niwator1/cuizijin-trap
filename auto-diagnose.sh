#!/bin/bash

# 崔子瑾诱捕器 - 自动诊断脚本
# 用于收集详细的错误信息和系统状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 开始诊断
echo -e "${GREEN}🔍 崔子瑾诱捕器 - 自动诊断报告${NC}"
echo "生成时间: $(date)"
echo "诊断版本: v1.0"
echo ""

# 1. 系统环境检查
print_section "系统环境信息"

echo "操作系统: $(uname -a)"
echo "当前用户: $(whoami)"
echo "当前目录: $(pwd)"

if command_exists node; then
    echo "Node.js版本: $(node --version)"
    print_success "Node.js 已安装"
else
    print_error "Node.js 未安装"
fi

if command_exists npm; then
    echo "npm版本: $(npm --version)"
    print_success "npm 已安装"
else
    print_error "npm 未安装"
fi

# 2. 项目状态检查
print_section "项目状态检查"

if [ -f "package.json" ]; then
    print_success "找到 package.json"
    echo "项目名称: $(cat package.json | grep '"name"' | cut -d'"' -f4)"
    echo "项目版本: $(cat package.json | grep '"version"' | cut -d'"' -f4)"
else
    print_error "未找到 package.json，请确认在正确的项目目录中"
fi

if [ -d "node_modules" ]; then
    print_success "依赖已安装"
    echo "node_modules 大小: $(du -sh node_modules 2>/dev/null | cut -f1)"
else
    print_warning "依赖未安装，需要运行 npm install"
fi

if [ -d "dist" ]; then
    print_success "找到构建目录"
    echo "dist 目录内容:"
    ls -la dist/ | head -10
else
    print_warning "未找到构建目录，可能需要运行 npm run build"
fi

# 3. 网络和端口检查
print_section "网络状态检查"

# 检查端口8080
if command_exists lsof; then
    PORT_8080=$(lsof -i :8080 2>/dev/null)
    if [ -n "$PORT_8080" ]; then
        print_success "端口8080被占用"
        echo "$PORT_8080"
    else
        print_warning "端口8080未被占用（代理服务器可能未启动）"
    fi
else
    print_warning "lsof 命令不可用，无法检查端口状态"
fi

# 检查端口5173 (Vite开发服务器)
if command_exists lsof; then
    PORT_5173=$(lsof -i :5173 2>/dev/null)
    if [ -n "$PORT_5173" ]; then
        print_success "端口5173被占用（Vite开发服务器运行中）"
        echo "$PORT_5173"
    else
        print_warning "端口5173未被占用（开发服务器可能未启动）"
    fi
fi

# 4. 代理服务器连接测试
print_section "代理服务器测试"

print_info "测试代理服务器连接..."
if command_exists curl; then
    PROXY_TEST=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080 2>/dev/null || echo "FAILED")
    if [ "$PROXY_TEST" != "FAILED" ]; then
        print_success "代理服务器响应正常 (HTTP状态码: $PROXY_TEST)"
    else
        print_error "代理服务器连接失败"
    fi
    
    # 测试通过代理访问网站
    print_info "测试通过代理访问example.com..."
    PROXY_SITE_TEST=$(timeout 10 curl -x http://127.0.0.1:8080 -s -o /dev/null -w "%{http_code}" http://example.com 2>/dev/null || echo "FAILED")
    if [ "$PROXY_SITE_TEST" != "FAILED" ]; then
        print_success "通过代理访问网站成功 (HTTP状态码: $PROXY_SITE_TEST)"
    else
        print_error "通过代理访问网站失败"
    fi
else
    print_warning "curl 命令不可用，无法测试代理连接"
fi

# 5. 系统代理配置检查
print_section "系统代理配置检查"

if [[ "$OSTYPE" == "darwin"* ]]; then
    print_info "检查macOS系统代理配置..."
    
    if command_exists networksetup; then
        # 获取所有网络服务
        SERVICES=$(networksetup -listallnetworkservices 2>/dev/null | grep -v "An asterisk" | grep -v "^\*")
        
        echo "网络服务列表:"
        echo "$SERVICES"
        echo ""
        
        # 检查每个服务的代理配置
        while IFS= read -r service; do
            if [[ -n "$service" && "$service" != *"*"* ]]; then
                echo "--- $service ---"
                HTTP_PROXY=$(networksetup -getwebproxy "$service" 2>/dev/null || echo "获取失败")
                HTTPS_PROXY=$(networksetup -getsecurewebproxy "$service" 2>/dev/null || echo "获取失败")
                
                echo "HTTP代理: $HTTP_PROXY"
                echo "HTTPS代理: $HTTPS_PROXY"
                
                if echo "$HTTP_PROXY" | grep -q "127.0.0.1.*8080"; then
                    print_success "$service 的HTTP代理已正确配置"
                fi
                
                if echo "$HTTPS_PROXY" | grep -q "127.0.0.1.*8080"; then
                    print_success "$service 的HTTPS代理已正确配置"
                fi
                echo ""
            fi
        done <<< "$SERVICES"
    else
        print_error "networksetup 命令不可用"
    fi
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    print_info "检查Linux系统代理配置..."
    echo "环境变量代理设置:"
    echo "HTTP_PROXY: ${HTTP_PROXY:-未设置}"
    echo "HTTPS_PROXY: ${HTTPS_PROXY:-未设置}"
    echo "http_proxy: ${http_proxy:-未设置}"
    echo "https_proxy: ${https_proxy:-未设置}"
    
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    print_info "Windows系统，请手动检查代理设置"
else
    print_warning "未知操作系统类型: $OSTYPE"
fi

# 6. 进程状态检查
print_section "相关进程检查"

if command_exists ps; then
    print_info "查找相关进程..."
    
    ELECTRON_PROCESSES=$(ps aux | grep -E "[e]lectron" || echo "")
    if [ -n "$ELECTRON_PROCESSES" ]; then
        print_success "找到Electron进程"
        echo "$ELECTRON_PROCESSES"
    else
        print_warning "未找到Electron进程"
    fi
    
    NODE_PROCESSES=$(ps aux | grep -E "[n]ode.*dev|[n]ode.*vite" || echo "")
    if [ -n "$NODE_PROCESSES" ]; then
        print_success "找到Node.js开发进程"
        echo "$NODE_PROCESSES"
    else
        print_warning "未找到Node.js开发进程"
    fi
else
    print_warning "ps 命令不可用，无法检查进程状态"
fi

# 7. 日志文件检查
print_section "日志文件检查"

LOG_FILES=("dev.log" "electron.log" "dev-main.log" "dev-renderer.log")

for log_file in "${LOG_FILES[@]}"; do
    if [ -f "$log_file" ]; then
        print_success "找到日志文件: $log_file"
        echo "最后10行内容:"
        tail -10 "$log_file"
        echo ""
    fi
done

# 8. 配置文件检查
print_section "配置文件检查"

CONFIG_FILES=("package.json" "vite.config.ts" "webpack.main.config.js" "tsconfig.json")

for config_file in "${CONFIG_FILES[@]}"; do
    if [ -f "$config_file" ]; then
        print_success "找到配置文件: $config_file"
    else
        print_warning "缺少配置文件: $config_file"
    fi
done

# 9. 建议和下一步
print_section "诊断总结和建议"

print_info "基于诊断结果的建议:"

# 检查是否需要安装依赖
if [ ! -d "node_modules" ]; then
    echo "1. 运行 'npm install' 安装依赖"
fi

# 检查是否需要启动服务
if ! lsof -i :5173 >/dev/null 2>&1; then
    echo "2. 运行 'npm run dev' 启动开发服务器"
fi

if ! lsof -i :8080 >/dev/null 2>&1; then
    echo "3. 在应用中启动代理服务器"
fi

# 检查系统代理配置
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! networksetup -getwebproxy "Wi-Fi" 2>/dev/null | grep -q "127.0.0.1.*8080"; then
        echo "4. 系统代理可能未正确配置，请在应用中启用'系统代理设置'"
    fi
fi

print_section "完整诊断报告已生成"
print_info "请将此诊断报告完整复制并提供给开发者"
print_info "如需保存报告，请运行: ./auto-diagnose.sh > diagnosis-report.txt"

echo ""
echo "诊断完成时间: $(date)"
