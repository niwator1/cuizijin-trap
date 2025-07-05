@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 崔子瑾诱捕器 - Windows 数据库修复脚本

title 崔子瑾诱捕器 - 数据库修复工具

:: 颜色定义
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:print_success
echo %GREEN%✅ %~1%NC%
goto :eof

:print_error
echo %RED%❌ %~1%NC%
goto :eof

:print_warning
echo %YELLOW%⚠️  %~1%NC%
goto :eof

:print_info
echo %BLUE%ℹ️  %~1%NC%
goto :eof

:: 获取用户数据目录
:get_user_data_dir
set "USER_DATA_DIR=%APPDATA%\崔子瑾诱捕器"
goto :eof

:: 获取日志目录
:get_log_dir
set "LOG_DIR=%APPDATA%\崔子瑾诱捕器\logs"
goto :eof

:: 检查目录权限
:check_permissions
call :get_user_data_dir
call :get_log_dir

call :print_info "检查目录权限..."

:: 检查用户数据目录
if not exist "%USER_DATA_DIR%" (
    call :print_info "创建用户数据目录: %USER_DATA_DIR%"
    mkdir "%USER_DATA_DIR%" 2>nul
    if errorlevel 1 (
        call :print_error "无法创建用户数据目录"
        goto :eof
    )
)

:: 检查日志目录
if not exist "%LOG_DIR%" (
    call :print_info "创建日志目录: %LOG_DIR%"
    mkdir "%LOG_DIR%" 2>nul
    if errorlevel 1 (
        call :print_error "无法创建日志目录"
        goto :eof
    )
)

:: 测试写权限
echo test > "%USER_DATA_DIR%\test.tmp" 2>nul
if errorlevel 1 (
    call :print_error "用户数据目录无写权限: %USER_DATA_DIR%"
) else (
    del "%USER_DATA_DIR%\test.tmp" 2>nul
    call :print_success "用户数据目录权限正常"
)

echo test > "%LOG_DIR%\test.tmp" 2>nul
if errorlevel 1 (
    call :print_error "日志目录无写权限: %LOG_DIR%"
) else (
    del "%LOG_DIR%\test.tmp" 2>nul
    call :print_success "日志目录权限正常"
)
goto :eof

:: 备份现有数据
:backup_data
call :get_user_data_dir
set "BACKUP_DIR=%USER_DATA_DIR%\backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "BACKUP_DIR=%BACKUP_DIR: =0%"

if exist "%USER_DATA_DIR%\database.db" (
    call :print_info "备份现有数据库..."
    mkdir "%BACKUP_DIR%" 2>nul
    copy "%USER_DATA_DIR%\database.db" "%BACKUP_DIR%\" >nul 2>&1
    if errorlevel 1 (
        call :print_error "备份失败"
    ) else (
        call :print_success "数据库已备份到: %BACKUP_DIR%"
    )
)
goto :eof

:: 重置数据库
:reset_database
call :get_user_data_dir
set "DB_FILE=%USER_DATA_DIR%\database.db"

call :print_warning "即将重置数据库，这将删除所有现有数据"
set /p "confirm=确定要继续吗？(y/N): "

if /i "%confirm%"=="y" (
    :: 备份数据
    call :backup_data
    
    :: 删除现有数据库
    if exist "%DB_FILE%" (
        del "%DB_FILE%" 2>nul
        if errorlevel 1 (
            call :print_error "无法删除现有数据库文件"
            goto :eof
        )
        call :print_success "已删除现有数据库"
    )
    
    :: 创建新数据库
    call :print_info "创建新数据库..."
    
    :: 创建SQL脚本
    echo CREATE TABLE IF NOT EXISTS websites ( > temp_init.sql
    echo     id INTEGER PRIMARY KEY AUTOINCREMENT, >> temp_init.sql
    echo     url TEXT NOT NULL UNIQUE, >> temp_init.sql
    echo     name TEXT, >> temp_init.sql
    echo     enabled INTEGER DEFAULT 1, >> temp_init.sql
    echo     created_at DATETIME DEFAULT CURRENT_TIMESTAMP, >> temp_init.sql
    echo     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP >> temp_init.sql
    echo ); >> temp_init.sql
    echo. >> temp_init.sql
    echo CREATE TABLE IF NOT EXISTS users ( >> temp_init.sql
    echo     id INTEGER PRIMARY KEY AUTOINCREMENT, >> temp_init.sql
    echo     username TEXT NOT NULL UNIQUE, >> temp_init.sql
    echo     password_hash TEXT NOT NULL, >> temp_init.sql
    echo     created_at DATETIME DEFAULT CURRENT_TIMESTAMP >> temp_init.sql
    echo ); >> temp_init.sql
    echo. >> temp_init.sql
    echo CREATE TABLE IF NOT EXISTS settings ( >> temp_init.sql
    echo     key TEXT PRIMARY KEY, >> temp_init.sql
    echo     value TEXT, >> temp_init.sql
    echo     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP >> temp_init.sql
    echo ); >> temp_init.sql
    echo. >> temp_init.sql
    echo CREATE TABLE IF NOT EXISTS logs ( >> temp_init.sql
    echo     id INTEGER PRIMARY KEY AUTOINCREMENT, >> temp_init.sql
    echo     type TEXT NOT NULL, >> temp_init.sql
    echo     message TEXT NOT NULL, >> temp_init.sql
    echo     data TEXT, >> temp_init.sql
    echo     timestamp DATETIME DEFAULT CURRENT_TIMESTAMP >> temp_init.sql
    echo ); >> temp_init.sql
    
    :: 检查是否有sqlite3命令
    where sqlite3 >nul 2>&1
    if errorlevel 1 (
        call :print_error "SQLite3 未安装，请手动安装 SQLite"
        del temp_init.sql 2>nul
        goto :eof
    )
    
    :: 执行SQL脚本
    sqlite3 "%DB_FILE%" < temp_init.sql
    if errorlevel 1 (
        call :print_error "数据库创建失败"
        del temp_init.sql 2>nul
        goto :eof
    )
    
    del temp_init.sql 2>nul
    call :print_success "数据库重置完成"
) else (
    call :print_info "取消重置操作"
)
goto :eof

:: 修复数据库
:repair_database
call :get_user_data_dir
set "DB_FILE=%USER_DATA_DIR%\database.db"

if not exist "%DB_FILE%" (
    call :print_warning "数据库文件不存在，将创建新数据库"
    call :reset_database
    goto :eof
)

call :print_info "检查数据库完整性..."

:: 检查SQLite是否可用
where sqlite3 >nul 2>&1
if errorlevel 1 (
    call :print_error "SQLite3 未安装，无法检查数据库"
    call :print_info "建议重置数据库"
    goto :eof
)

:: 检查数据库完整性
sqlite3 "%DB_FILE%" "PRAGMA integrity_check;" > temp_check.txt 2>&1
if errorlevel 1 (
    call :print_error "数据库已损坏，需要重置"
    del temp_check.txt 2>nul
    call :reset_database
    goto :eof
)

findstr /c:"ok" temp_check.txt >nul
if errorlevel 1 (
    call :print_error "数据库完整性检查失败，需要重置"
    del temp_check.txt 2>nul
    call :reset_database
    goto :eof
)

del temp_check.txt 2>nul
call :print_success "数据库完整性检查通过"
goto :eof

:: 清理临时文件
:cleanup_temp_files
call :get_user_data_dir

call :print_info "清理临时文件..."

:: 清理锁文件和临时数据库文件
if exist "%USER_DATA_DIR%" (
    del "%USER_DATA_DIR%\*.lock" 2>nul
    del "%USER_DATA_DIR%\*.db-journal" 2>nul
    del "%USER_DATA_DIR%\*.db-wal" 2>nul
    del "%USER_DATA_DIR%\*.db-shm" 2>nul
)

call :print_success "临时文件清理完成"
goto :eof

:: 检查Node.js依赖
:check_node_dependencies
call :print_info "检查 Node.js 依赖..."

if not exist "node_modules" (
    call :print_error "node_modules 目录不存在"
    call :print_info "请运行: npm install"
    goto :eof
)

:: 检查关键依赖
if exist "node_modules\better-sqlite3" (
    call :print_success "依赖 better-sqlite3 已安装"
) else (
    call :print_error "依赖 better-sqlite3 未安装"
    call :print_info "请运行: npm install better-sqlite3"
)

if exist "node_modules\electron" (
    call :print_success "依赖 electron 已安装"
) else (
    call :print_error "依赖 electron 未安装"
    call :print_info "请运行: npm install electron"
)
goto :eof

:: 生成诊断报告
:generate_report
call :get_user_data_dir
call :get_log_dir
set "REPORT_FILE=diagnostic_report_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%.txt"
set "REPORT_FILE=%REPORT_FILE: =0%"

call :print_info "生成诊断报告..."

echo 崔子瑾诱捕器 - 诊断报告 > "%REPORT_FILE%"
echo 生成时间: %date% %time% >> "%REPORT_FILE%"
echo 操作系统: Windows >> "%REPORT_FILE%"
echo 用户: %USERNAME% >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

echo === 环境信息 === >> "%REPORT_FILE%"
node --version >> "%REPORT_FILE%" 2>&1 || echo Node.js: 未安装 >> "%REPORT_FILE%"
npm --version >> "%REPORT_FILE%" 2>&1 || echo npm: 未安装 >> "%REPORT_FILE%"
sqlite3 --version >> "%REPORT_FILE%" 2>&1 || echo SQLite: 未安装 >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

echo === 目录信息 === >> "%REPORT_FILE%"
echo 用户数据目录: %USER_DATA_DIR% >> "%REPORT_FILE%"
echo 日志目录: %LOG_DIR% >> "%REPORT_FILE%"
echo 当前工作目录: %CD% >> "%REPORT_FILE%"
echo. >> "%REPORT_FILE%"

echo === 文件状态 === >> "%REPORT_FILE%"
if exist "%USER_DATA_DIR%" (
    echo 用户数据目录内容: >> "%REPORT_FILE%"
    dir "%USER_DATA_DIR%" >> "%REPORT_FILE%" 2>&1
) else (
    echo 用户数据目录不存在 >> "%REPORT_FILE%"
)
echo. >> "%REPORT_FILE%"

if exist "%USER_DATA_DIR%\database.db" (
    for %%A in ("%USER_DATA_DIR%\database.db") do echo 数据库文件大小: %%~zA 字节 >> "%REPORT_FILE%"
) else (
    echo 数据库文件不存在 >> "%REPORT_FILE%"
)

call :print_success "诊断报告已生成: %REPORT_FILE%"
goto :eof

:: 显示菜单
:show_menu
echo.
call :print_info "崔子瑾诱捕器 - 数据库修复工具"
echo.
echo 请选择操作:
echo 1) 完整诊断
echo 2) 检查权限
echo 3) 修复数据库
echo 4) 重置数据库
echo 5) 清理临时文件
echo 6) 生成诊断报告
echo 7) 退出
echo.
goto :eof

:: 主函数
:main
:menu_loop
call :show_menu
set /p "choice=请输入选项 (1-7): "

if "%choice%"=="1" (
    call :print_info "开始完整诊断..."
    call :check_permissions
    call :check_node_dependencies
    call :repair_database
    call :cleanup_temp_files
    call :print_success "完整诊断完成"
) else if "%choice%"=="2" (
    call :check_permissions
) else if "%choice%"=="3" (
    call :repair_database
) else if "%choice%"=="4" (
    call :reset_database
) else if "%choice%"=="5" (
    call :cleanup_temp_files
) else if "%choice%"=="6" (
    call :generate_report
) else if "%choice%"=="7" (
    call :print_info "退出修复工具"
    goto :eof
) else (
    call :print_error "无效选项，请重新选择"
)

echo.
pause
goto :menu_loop

:: 运行主函数
call :main
