#!/usr/bin/env node

/**
 * 创建调试版本 - 添加详细日志输出
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 创建调试版本...');

// 创建调试启动脚本
const debugScript = `@echo off
echo ========================================
echo 崔子瑾诱捕器 - 调试启动脚本
echo ========================================
echo.

echo 当前目录: %CD%
echo 当前时间: %DATE% %TIME%
echo.

echo 检查文件是否存在...
if exist "崔子瑾诱捕器.exe" (
    echo ✅ 找到主程序文件
) else (
    echo ❌ 未找到主程序文件
    pause
    exit /b 1
)

echo.
echo 检查依赖文件...
if exist "resources\\app.asar" (
    echo ✅ 找到应用资源文件
) else (
    echo ❌ 未找到应用资源文件
    pause
    exit /b 1
)

echo.
echo 启动程序...
echo 如果程序无法启动，请查看下方的错误信息：
echo ========================================

"崔子瑾诱捕器.exe" --enable-logging --log-level=0 --v=1

echo.
echo ========================================
echo 程序已退出，错误代码: %ERRORLEVEL%
echo 按任意键关闭此窗口...
pause > nul
`;

// 写入调试脚本
fs.writeFileSync('release/win-unpacked/debug-start.bat', debugScript, 'utf8');

console.log('✅ 调试脚本已创建: release/win-unpacked/debug-start.bat');

// 创建系统信息收集脚本
const sysInfoScript = `@echo off
echo ========================================
echo 系统信息收集
echo ========================================
echo.

echo 操作系统信息:
systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"System Type"
echo.

echo .NET Framework 版本:
reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP" /s | findstr /C:"Version"
echo.

echo Visual C++ 运行库:
wmic product where "name like '%%Visual C++%%'" get name,version
echo.

echo 当前用户权限:
whoami /priv | findstr /C:"SeDebugPrivilege" /C:"SeIncreaseQuotaPrivilege"
echo.

echo 防火墙状态:
netsh advfirewall show allprofiles state
echo.

echo 杀毒软件状态:
wmic /namespace:\\\\root\\SecurityCenter2 path AntiVirusProduct get displayName,productState
echo.

echo ========================================
echo 信息收集完成
echo 请将以上信息提供给开发者
echo ========================================
pause
`;

fs.writeFileSync('release/win-unpacked/collect-sysinfo.bat', sysInfoScript, 'utf8');

console.log('✅ 系统信息收集脚本已创建: release/win-unpacked/collect-sysinfo.bat');

// 创建简化的测试版本
const testScript = `@echo off
echo 测试 Electron 基础功能...

echo 检查 Node.js 环境...
node --version 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js 未安装或不在 PATH 中
) else (
    echo ✅ Node.js 可用
)

echo.
echo 尝试直接运行 Electron...
if exist "resources\\app.asar" (
    echo 尝试解压 app.asar 进行测试...
    npx asar extract "resources\\app.asar" "temp-app" 2>nul
    if exist "temp-app\\package.json" (
        echo ✅ app.asar 结构正常
        type "temp-app\\package.json" | findstr "main"
        rmdir /s /q "temp-app" 2>nul
    ) else (
        echo ❌ app.asar 结构异常
    )
)

pause
`;

fs.writeFileSync('release/win-unpacked/test-electron.bat', testScript, 'utf8');

console.log('✅ Electron测试脚本已创建: release/win-unpacked/test-electron.bat');

console.log('');
console.log('📋 使用说明:');
console.log('1. 运行 debug-start.bat - 获取详细启动日志');
console.log('2. 运行 collect-sysinfo.bat - 收集系统信息');
console.log('3. 运行 test-electron.bat - 测试Electron环境');
console.log('');
console.log('请将这些脚本的输出结果提供给开发者进行诊断。');
