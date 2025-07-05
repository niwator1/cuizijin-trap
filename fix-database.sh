#!/bin/bash

# 崔子瑾诱捕器 - 数据库修复脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 获取用户数据目录
get_user_data_dir() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "$HOME/Library/Application Support/崔子瑾诱捕器"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "$HOME/.config/崔子瑾诱捕器"
    else
        echo "$HOME/.config/崔子瑾诱捕器"
    fi
}

# 获取日志目录
get_log_dir() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "$HOME/Library/Logs/崔子瑾诱捕器"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "$HOME/.config/崔子瑾诱捕器/logs"
    else
        echo "$HOME/.config/崔子瑾诱捕器/logs"
    fi
}

# 检查SQLite
check_sqlite() {
    print_info "检查 SQLite..."
    if command -v sqlite3 >/dev/null 2>&1; then
        SQLITE_VERSION=$(sqlite3 --version | cut -d' ' -f1)
        print_success "SQLite 版本: $SQLITE_VERSION"
        return 0
    else
        print_warning "SQLite 未安装，尝试安装..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew >/dev/null 2>&1; then
                brew install sqlite3
            else
                print_error "请安装 Homebrew 或手动安装 SQLite"
                return 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            if command -v apt-get >/dev/null 2>&1; then
                sudo apt-get update && sudo apt-get install -y sqlite3
            elif command -v yum >/dev/null 2>&1; then
                sudo yum install -y sqlite
            else
                print_error "请手动安装 SQLite"
                return 1
            fi
        fi
    fi
}

# 检查目录权限
check_permissions() {
    local user_data_dir=$(get_user_data_dir)
    local log_dir=$(get_log_dir)
    
    print_info "检查目录权限..."
    
    # 检查用户数据目录
    if [ ! -d "$user_data_dir" ]; then
        print_info "创建用户数据目录: $user_data_dir"
        mkdir -p "$user_data_dir"
    fi
    
    # 检查日志目录
    if [ ! -d "$log_dir" ]; then
        print_info "创建日志目录: $log_dir"
        mkdir -p "$log_dir"
    fi
    
    # 检查写权限
    if [ -w "$user_data_dir" ]; then
        print_success "用户数据目录权限正常"
    else
        print_error "用户数据目录无写权限: $user_data_dir"
        print_info "尝试修复权限..."
        chmod 755 "$user_data_dir"
    fi
    
    if [ -w "$log_dir" ]; then
        print_success "日志目录权限正常"
    else
        print_error "日志目录无写权限: $log_dir"
        print_info "尝试修复权限..."
        chmod 755 "$log_dir"
    fi
}

# 备份现有数据
backup_data() {
    local user_data_dir=$(get_user_data_dir)
    local backup_dir="$user_data_dir/backup_$(date +%Y%m%d_%H%M%S)"
    
    if [ -f "$user_data_dir/database.db" ]; then
        print_info "备份现有数据库..."
        mkdir -p "$backup_dir"
        cp "$user_data_dir/database.db" "$backup_dir/"
        print_success "数据库已备份到: $backup_dir"
    fi
}

# 重置数据库
reset_database() {
    local user_data_dir=$(get_user_data_dir)
    local db_file="$user_data_dir/database.db"
    
    print_warning "即将重置数据库，这将删除所有现有数据"
    read -p "确定要继续吗？(y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 备份数据
        backup_data
        
        # 删除现有数据库
        if [ -f "$db_file" ]; then
            rm "$db_file"
            print_success "已删除现有数据库"
        fi
        
        # 创建新数据库
        print_info "创建新数据库..."
        sqlite3 "$db_file" "
        CREATE TABLE IF NOT EXISTS websites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL UNIQUE,
            name TEXT,
            enabled INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            data TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        "
        
        if [ $? -eq 0 ]; then
            print_success "数据库重置完成"
        else
            print_error "数据库重置失败"
            return 1
        fi
    else
        print_info "取消重置操作"
        return 1
    fi
}

# 修复数据库
repair_database() {
    local user_data_dir=$(get_user_data_dir)
    local db_file="$user_data_dir/database.db"
    
    if [ ! -f "$db_file" ]; then
        print_warning "数据库文件不存在，将创建新数据库"
        reset_database
        return $?
    fi
    
    print_info "检查数据库完整性..."
    
    # 检查数据库是否损坏
    if sqlite3 "$db_file" "PRAGMA integrity_check;" | grep -q "ok"; then
        print_success "数据库完整性检查通过"
    else
        print_error "数据库已损坏，需要重置"
        reset_database
        return $?
    fi
    
    # 检查必要的表是否存在
    local tables=("websites" "users" "settings" "logs")
    for table in "${tables[@]}"; do
        if sqlite3 "$db_file" ".tables" | grep -q "$table"; then
            print_success "表 $table 存在"
        else
            print_warning "表 $table 不存在，将创建"
            # 这里可以添加创建特定表的SQL
        fi
    done
}

# 清理临时文件
cleanup_temp_files() {
    local user_data_dir=$(get_user_data_dir)
    
    print_info "清理临时文件..."
    
    # 清理锁文件
    find "$user_data_dir" -name "*.lock" -delete 2>/dev/null || true
    
    # 清理临时数据库文件
    find "$user_data_dir" -name "*.db-journal" -delete 2>/dev/null || true
    find "$user_data_dir" -name "*.db-wal" -delete 2>/dev/null || true
    find "$user_data_dir" -name "*.db-shm" -delete 2>/dev/null || true
    
    print_success "临时文件清理完成"
}

# 检查Node.js依赖
check_node_dependencies() {
    print_info "检查 Node.js 依赖..."
    
    if [ ! -d "node_modules" ]; then
        print_error "node_modules 目录不存在"
        print_info "请运行: npm install"
        return 1
    fi
    
    # 检查关键依赖
    local deps=("better-sqlite3" "electron")
    for dep in "${deps[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            print_success "依赖 $dep 已安装"
        else
            print_error "依赖 $dep 未安装"
            print_info "请运行: npm install $dep"
        fi
    done
}

# 生成诊断报告
generate_report() {
    local user_data_dir=$(get_user_data_dir)
    local log_dir=$(get_log_dir)
    local report_file="diagnostic_report_$(date +%Y%m%d_%H%M%S).txt"
    
    print_info "生成诊断报告..."
    
    {
        echo "崔子瑾诱捕器 - 诊断报告"
        echo "生成时间: $(date)"
        echo "操作系统: $OSTYPE"
        echo "用户: $(whoami)"
        echo ""
        
        echo "=== 环境信息 ==="
        echo "Node.js: $(node --version 2>/dev/null || echo '未安装')"
        echo "npm: $(npm --version 2>/dev/null || echo '未安装')"
        echo "SQLite: $(sqlite3 --version 2>/dev/null || echo '未安装')"
        echo ""
        
        echo "=== 目录信息 ==="
        echo "用户数据目录: $user_data_dir"
        echo "日志目录: $log_dir"
        echo "当前工作目录: $(pwd)"
        echo ""
        
        echo "=== 文件状态 ==="
        if [ -d "$user_data_dir" ]; then
            echo "用户数据目录内容:"
            ls -la "$user_data_dir" 2>/dev/null || echo "无法访问"
        else
            echo "用户数据目录不存在"
        fi
        echo ""
        
        if [ -f "$user_data_dir/database.db" ]; then
            echo "数据库文件大小: $(stat -f%z "$user_data_dir/database.db" 2>/dev/null || stat -c%s "$user_data_dir/database.db" 2>/dev/null || echo '未知')"
        else
            echo "数据库文件不存在"
        fi
        echo ""
        
        echo "=== 最近的错误日志 ==="
        if [ -f "dev-main.log" ]; then
            echo "开发日志 (最后20行):"
            tail -20 dev-main.log 2>/dev/null || echo "无法读取"
        fi
        
        if [ -f "$log_dir/main.log" ]; then
            echo "应用日志 (最后20行):"
            tail -20 "$log_dir/main.log" 2>/dev/null || echo "无法读取"
        fi
        
    } > "$report_file"
    
    print_success "诊断报告已生成: $report_file"
}

# 主菜单
show_menu() {
    echo ""
    print_info "崔子瑾诱捕器 - 数据库修复工具"
    echo ""
    echo "请选择操作:"
    echo "1) 完整诊断"
    echo "2) 检查权限"
    echo "3) 修复数据库"
    echo "4) 重置数据库"
    echo "5) 清理临时文件"
    echo "6) 生成诊断报告"
    echo "7) 退出"
    echo ""
}

# 主函数
main() {
    while true; do
        show_menu
        read -p "请输入选项 (1-7): " choice
        
        case $choice in
            1)
                print_info "开始完整诊断..."
                check_sqlite
                check_permissions
                check_node_dependencies
                repair_database
                cleanup_temp_files
                print_success "完整诊断完成"
                ;;
            2)
                check_permissions
                ;;
            3)
                repair_database
                ;;
            4)
                reset_database
                ;;
            5)
                cleanup_temp_files
                ;;
            6)
                generate_report
                ;;
            7)
                print_info "退出修复工具"
                exit 0
                ;;
            *)
                print_error "无效选项，请重新选择"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..."
    done
}

# 运行主函数
main "$@"
