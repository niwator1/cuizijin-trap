@echo off
chcp 65001 >nul
echo ========================================
echo 崔子瑾诱捕器 Windows 构建脚本
echo ========================================
echo.

:: 检查Node.js环境
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Node.js环境，请先安装Node.js
    pause
    exit /b 1
)

:: 检查npm环境
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到npm环境
    pause
    exit /b 1
)

echo [信息] 开始构建Windows版本...
echo.

:: 清理旧的构建文件
echo [步骤 1/6] 清理旧的构建文件...
if exist "dist" rmdir /s /q "dist"
if exist "release" rmdir /s /q "release"
echo [完成] 清理完成
echo.

:: 安装依赖
echo [步骤 2/6] 安装项目依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [完成] 依赖安装完成
echo.

:: 生成图标
echo [步骤 3/6] 生成应用图标...
call npm run generate:icons
if %errorlevel% neq 0 (
    echo [警告] 图标生成失败，将使用默认图标
)
echo [完成] 图标生成完成
echo.

:: 构建应用
echo [步骤 4/6] 构建应用代码...
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 应用构建失败
    pause
    exit /b 1
)
echo [完成] 应用构建完成
echo.

:: 打包Windows版本
echo [步骤 5/6] 打包Windows安装程序...
call npm run dist:win
if %errorlevel% neq 0 (
    echo [错误] Windows打包失败
    pause
    exit /b 1
)
echo [完成] Windows打包完成
echo.

:: 显示构建结果
echo [步骤 6/6] 构建完成！
echo.
echo ========================================
echo 构建结果：
echo ========================================

if exist "release\*.exe" (
    echo [成功] Windows安装程序已生成：
    for %%f in (release\*.exe) do echo   - %%f
    echo.
)

if exist "release\win-unpacked" (
    echo [成功] Windows便携版已生成：
    echo   - release\win-unpacked\
    echo.
)

echo ========================================
echo 部署说明：
echo ========================================
echo 1. 安装版本：运行 .exe 文件进行安装
echo 2. 便携版本：直接运行 win-unpacked 文件夹中的程序
echo 3. 管理员权限：应用需要管理员权限才能正常工作
echo 4. 进程保护：生产环境会自动启用进程保护功能
echo 5. 密码退出：强制关闭后需要输入正确密码才能退出
echo.

echo ========================================
echo 安全特性：
echo ========================================
echo ✓ 看门狗进程监控
echo ✓ 自动重启机制
echo ✓ 密码保护退出
echo ✓ 开机自启动
echo ✓ 防火墙规则配置
echo ✓ 进程隐藏保护
echo.

echo 构建完成！按任意键退出...
pause >nul
