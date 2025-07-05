#!/bin/bash

# 网站拦截功能测试脚本
# 用于验证拦截功能是否正常工作

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_test() {
    echo -e "\n${BLUE}🧪 测试: $1${NC}"
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

# 测试配置
PROXY_HOST="127.0.0.1"
PROXY_PORT="8080"
TEST_DOMAINS=("example.com" "httpbin.org" "google.com")

echo -e "${GREEN}🚀 网站拦截功能测试${NC}"
echo "测试时间: $(date)"
echo ""

# 1. 基础连接测试
print_test "代理服务器基础连接"

if command -v curl >/dev/null 2>&1; then
    # 测试代理服务器是否响应
    HTTP_CODE=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" http://$PROXY_HOST:$PROXY_PORT 2>/dev/null || echo "TIMEOUT")
    
    if [ "$HTTP_CODE" = "TIMEOUT" ]; then
        print_error "代理服务器连接超时"
        echo "请确认："
        echo "1. 应用已启动"
        echo "2. 代理服务器已在应用中启动"
        echo "3. 端口$PROXY_PORT未被其他程序占用"
        exit 1
    elif [ "$HTTP_CODE" = "000" ]; then
        print_error "代理服务器连接被拒绝"
        echo "代理服务器可能未启动，请在应用中启动代理服务器"
        exit 1
    else
        print_success "代理服务器响应正常 (HTTP状态码: $HTTP_CODE)"
    fi
else
    print_error "curl命令不可用，无法进行网络测试"
    exit 1
fi

# 2. 代理功能测试
print_test "代理转发功能"

for domain in "${TEST_DOMAINS[@]}"; do
    print_info "测试通过代理访问: $domain"
    
    # 通过代理访问网站
    RESPONSE=$(timeout 10 curl -x http://$PROXY_HOST:$PROXY_PORT -s -w "HTTPCODE:%{http_code}" http://$domain 2>/dev/null || echo "FAILED")
    
    if [ "$RESPONSE" = "FAILED" ]; then
        print_warning "$domain - 连接失败（可能被拦截或网络问题）"
    else
        HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTPCODE:[0-9]*" | cut -d: -f2)
        CONTENT=$(echo "$RESPONSE" | sed 's/HTTPCODE:[0-9]*$//')
        
        if [ "$HTTP_CODE" = "200" ]; then
            # 检查是否是拦截页面
            if echo "$CONTENT" | grep -q "网站已被阻止\|访问被阻止\|网站拦截\|blocked"; then
                print_success "$domain - 被正确拦截"
            else
                print_warning "$domain - 访问成功（未被拦截或不在黑名单中）"
            fi
        else
            print_info "$domain - HTTP状态码: $HTTP_CODE"
        fi
    fi
    
    sleep 1
done

# 3. HTTPS拦截测试
print_test "HTTPS拦截功能"

for domain in "${TEST_DOMAINS[@]}"; do
    print_info "测试HTTPS CONNECT: $domain:443"
    
    # 测试HTTPS CONNECT方法
    CONNECT_RESULT=$(timeout 5 curl -x http://$PROXY_HOST:$PROXY_PORT -s -w "%{http_code}" --connect-timeout 3 https://$domain 2>/dev/null || echo "FAILED")
    
    if [ "$CONNECT_RESULT" = "FAILED" ]; then
        print_success "$domain - HTTPS连接被拦截"
    elif [ "$CONNECT_RESULT" = "200" ]; then
        print_warning "$domain - HTTPS连接成功（未被拦截）"
    else
        print_info "$domain - HTTPS状态码: $CONNECT_RESULT"
    fi
    
    sleep 1
done

# 4. 系统代理配置验证
print_test "系统代理配置验证"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS系统代理检查
    if command -v networksetup >/dev/null 2>&1; then
        WIFI_PROXY=$(networksetup -getwebproxy "Wi-Fi" 2>/dev/null || echo "")
        
        if echo "$WIFI_PROXY" | grep -q "127.0.0.1.*8080"; then
            print_success "Wi-Fi HTTP代理已正确配置"
        else
            print_warning "Wi-Fi HTTP代理未配置或配置错误"
            echo "当前配置: $WIFI_PROXY"
        fi
        
        WIFI_HTTPS_PROXY=$(networksetup -getsecurewebproxy "Wi-Fi" 2>/dev/null || echo "")
        
        if echo "$WIFI_HTTPS_PROXY" | grep -q "127.0.0.1.*8080"; then
            print_success "Wi-Fi HTTPS代理已正确配置"
        else
            print_warning "Wi-Fi HTTPS代理未配置或配置错误"
            echo "当前配置: $WIFI_HTTPS_PROXY"
        fi
    else
        print_warning "networksetup命令不可用"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux环境变量检查
    if [ -n "$http_proxy" ] && echo "$http_proxy" | grep -q "127.0.0.1.*8080"; then
        print_success "HTTP代理环境变量已设置"
    else
        print_warning "HTTP代理环境变量未设置"
    fi
    
    if [ -n "$https_proxy" ] && echo "$https_proxy" | grep -q "127.0.0.1.*8080"; then
        print_success "HTTPS代理环境变量已设置"
    else
        print_warning "HTTPS代理环境变量未设置"
    fi
fi

# 5. 浏览器代理测试建议
print_test "浏览器测试建议"

print_info "手动浏览器测试步骤："
echo "1. 打开浏览器"
echo "2. 访问 http://httpbin.org/ip"
echo "3. 检查返回的IP是否为代理服务器IP"
echo "4. 在应用中添加 httpbin.org 到黑名单"
echo "5. 启用拦截开关"
echo "6. 再次访问 http://httpbin.org"
echo "7. 应该看到拦截页面而不是原网站"

# 6. 测试总结
print_test "测试总结"

echo "如果拦截功能仍然不工作，请检查："
echo ""
echo "🔧 应用层面："
echo "  - 代理服务器是否在应用中启动"
echo "  - 系统代理设置是否已启用"
echo "  - 要拦截的网站是否已添加到黑名单"
echo "  - 网站拦截开关是否已启用"
echo ""
echo "🌐 系统层面："
echo "  - 系统代理配置是否正确"
echo "  - 浏览器是否使用系统代理"
echo "  - 防火墙是否阻止了代理连接"
echo "  - 是否有其他VPN或代理软件干扰"
echo ""
echo "🐛 调试建议："
echo "  - 运行 ./auto-diagnose.sh 获取详细诊断信息"
echo "  - 查看应用的控制台日志"
echo "  - 检查浏览器开发者工具的网络面板"
echo "  - 尝试手动配置浏览器代理设置"

echo ""
print_info "测试完成！如果问题仍然存在，请运行诊断脚本并提供完整的错误信息。"
