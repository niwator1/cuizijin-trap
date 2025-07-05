@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 崔子瑾诱捕器 - Windows 一键启动脚本

title 崔子瑾诱捕器 - 一键启动

:: 颜色定义
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: 打印带颜色的消息
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

:: 检查命令是否存在
:command_exists
where %1 >nul 2>&1
goto :eof

:: 检查 Node.js
:check_node
call :print_info "检查 Node.js..."
call :command_exists node
if errorlevel 1 (
    call :print_error "Node.js 未安装"
    call :print_info "请访问 https://nodejs.org/ 下载安装 Node.js 16.0 或更高版本"
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('node -v') do set NODE_VERSION=%%i
call :print_success "Node.js 版本: %NODE_VERSION%"
goto :eof

:: 检查 npm
:check_npm
call :print_info "检查 npm..."
call :command_exists npm
if errorlevel 1 (
    call :print_error "npm 未安装"
    pause
    exit /b 1
)

for /f "tokens=1" %%i in ('npm -v') do set NPM_VERSION=%%i
call :print_success "npm 版本: %NPM_VERSION%"
goto :eof

:: 安装依赖
:install_dependencies
call :print_info "正在安装依赖..."

:: 设置镜像源（如果指定）
if "%~1"=="--china" (
    call :print_info "使用中国镜像源..."
    npm config set registry https://registry.npmmirror.com
    npm config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/
)

:: 清理缓存
npm cache clean --force >nul 2>&1

:: 安装依赖
npm install
if errorlevel 1 (
    call :print_error "依赖安装失败"
    call :print_info "尝试使用 --china 参数使用国内镜像源"
    pause
    exit /b 1
)

call :print_success "依赖安装完成"
goto :eof

:: 启动开发服务器
:start_dev_server
call :print_info "启动开发服务器..."

:: 检查端口是否被占用
netstat -an | find "5173" | find "LISTENING" >nul 2>&1
if not errorlevel 1 (
    call :print_warning "端口 5173 已被占用，尝试终止相关进程..."
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 >nul
)

:: 启动渲染进程开发服务器
call :print_info "启动渲染进程..."
start /b cmd /c "npm run dev:renderer > dev-renderer.log 2>&1"

:: 等待渲染进程启动
call :print_info "等待渲染进程启动..."
set /a count=0
:wait_renderer
set /a count+=1
curl -s http://localhost:5173 >nul 2>&1
if not errorlevel 1 (
    call :print_success "渲染进程启动成功"
    goto :renderer_ready
)
if %count% geq 30 (
    call :print_error "渲染进程启动超时"
    goto :cleanup_and_exit
)
timeout /t 1 >nul
goto :wait_renderer

:renderer_ready
:: 启动主进程开发服务器
call :print_info "启动主进程..."
start /b cmd /c "npm run dev:main > dev-main.log 2>&1"

:: 等待主进程编译
call :print_info "等待主进程编译..."
timeout /t 5 >nul

call :print_success "开发服务器启动完成"
goto :eof

:: 启动 Electron 应用
:start_electron
call :print_info "启动 Electron 应用..."

:: 等待编译完成
timeout /t 3 >nul

:: 启动 Electron
start /b cmd /c "npm run electron:dev"

call :print_success "应用启动成功！"
call :print_info "如果应用没有自动打开，请检查终端输出的错误信息"
goto :eof

:: 停止所有进程
:stop_all
call :print_info "停止所有进程..."
taskkill /f /im electron.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
call :print_success "所有进程已停止"
goto :eof

:: 清理并重新安装
:clean_install
call :print_info "清理并重新安装..."
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
npm cache clean --force
call :install_dependencies %~1
goto :eof

:: 构建生产版本
:build_production
call :print_info "构建生产版本..."
npm run build:prod
if errorlevel 1 (
    call :print_error "构建失败"
    pause
    exit /b 1
)
call :print_success "生产版本构建完成"
goto :eof

:: 打包应用
:package_app
call :print_info "打包 Windows 应用..."
npm run dist:win
if errorlevel 1 (
    call :print_error "打包失败"
    pause
    exit /b 1
)
call :print_success "应用打包完成，请查看 release 目录"
goto :eof

:: 显示帮助
:show_help
echo.
echo 崔子瑾诱捕器 - Windows 一键启动脚本
echo.
echo 用法:
echo   %~nx0 [选项]
echo.
echo 选项:
echo   --help          显示此帮助信息
echo   --china         使用中国镜像源安装依赖
echo   --stop          停止所有运行的进程
echo   --clean         清理并重新安装依赖
echo   --build         构建生产版本
echo   --package       打包应用
echo.
echo 示例:
echo   %~nx0              # 正常启动
echo   %~nx0 --china      # 使用国内镜像源启动
echo   %~nx0 --stop       # 停止所有进程
echo.
goto :eof

:: 清理并退出
:cleanup_and_exit
call :stop_all
pause
exit /b 1

:: 主函数
:main
echo.
call :print_info "🚀 崔子瑾诱捕器 - Windows 一键启动脚本"
echo.

:: 解析参数
if "%~1"=="--help" goto :show_help
if "%~1"=="-h" goto :show_help
if "%~1"=="--stop" (
    call :stop_all
    pause
    exit /b 0
)
if "%~1"=="--clean" (
    call :clean_install %~2
    pause
    exit /b 0
)
if "%~1"=="--build" (
    call :check_node
    call :check_npm
    call :build_production
    pause
    exit /b 0
)
if "%~1"=="--package" (
    call :check_node
    call :check_npm
    call :build_production
    call :package_app
    pause
    exit /b 0
)

:: 环境检查
call :print_info "检查环境..."
call :check_node
call :check_npm

:: 检查依赖
if not exist node_modules (
    call :print_warning "依赖未安装，开始安装..."
    call :install_dependencies %~1
) else (
    call :print_success "依赖已安装"
)

:: 启动服务
call :start_dev_server
call :start_electron

:: 等待用户输入
call :print_info "应用正在运行..."
call :print_info "按任意键停止应用"
pause >nul

:: 清理
call :stop_all
goto :eof

:: 运行主函数
call :main %*
