; 崔子瑾诱捕器 Windows 安装程序自定义脚本
; 此文件包含 NSIS 安装程序的自定义配置

; 安装程序初始化
!macro customInit
  ; 检查是否已安装旧版本
  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\{appId}" "UninstallString"
  StrCmp $R0 "" done
  
  ; 提示用户卸载旧版本
  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
    "检测到已安装的崔子瑾诱捕器。$\n$\n建议先卸载旧版本再继续安装。$\n$\n点击 '确定' 继续安装，点击 '取消' 退出安装程序。" \
    IDOK done
  Abort
  
  done:
!macroend

; 安装完成后的操作
!macro customInstall
  ; 创建防火墙规则
  ExecWait '"netsh" advfirewall firewall add rule name="崔子瑾诱捕器" dir=in action=allow program="$INSTDIR\${productFilename}.exe"'

  ; 设置开机自启动（强制启用）
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "CuiZiJinTrap" "$INSTDIR\${productFilename}.exe --startup"

  ; 创建用户数据目录
  CreateDirectory "$APPDATA\CuiZiJinTrap"
  CreateDirectory "$APPDATA\CuiZiJinTrap\logs"
  CreateDirectory "$APPDATA\CuiZiJinTrap\config"

  ; 设置目录权限
  AccessControl::GrantOnFile "$APPDATA\CuiZiJinTrap" "(BU)" "FullAccess"

  ; 创建看门狗服务配置
  WriteRegStr HKLM "Software\CuiZiJinTrap" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\CuiZiJinTrap" "Version" "${version}"
  WriteRegDWORD HKLM "Software\CuiZiJinTrap" "ProcessProtection" 1

  ; 设置系统服务优先级（可选）
  ; ExecWait '"sc" create "CuiZiJinTrapWatchdog" binPath= "$INSTDIR\watchdog.exe" start= auto'
!macroend

; 卸载前的操作
!macro customUnInit
  ; 停止应用程序进程
  nsProcess::_FindProcess "${productFilename}.exe"
  Pop $R0
  ${If} $R0 = 0
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
      "崔子瑾诱捕器正在运行。$\n$\n点击 '确定' 强制关闭应用程序并继续卸载，点击 '取消' 退出卸载程序。" \
      IDOK kill
    Abort
    
    kill:
    nsProcess::_KillProcess "${productFilename}.exe"
    Pop $R0
    Sleep 2000
  ${EndIf}
!macroend

; 卸载完成后的操作
!macro customUnInstall
  ; 删除防火墙规则
  ; ExecWait '"netsh" advfirewall firewall delete rule name="崔子瑾诱捕器"'
  
  ; 删除开机自启动
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "CuiZiJinTrap"
  
  ; 询问是否删除用户数据
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "是否删除用户数据和配置文件？$\n$\n选择 '是' 将完全删除所有数据，选择 '否' 保留用户数据以备将来使用。" \
    IDNO skip_data_deletion
  
  ; 删除用户数据目录
  RMDir /r "$APPDATA\CuiZiJinTrap"
  
  skip_data_deletion:
  
  ; 清理注册表
  DeleteRegKey HKLM "Software\CuiZiJinTrap"
  DeleteRegKey HKCU "Software\CuiZiJinTrap"
!macroend

; 语言文件包含
!include "MUI2.nsh"

; 自定义页面
!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customLicensePage
  !insertmacro MUI_PAGE_LICENSE "LICENSE"
!macroend

!macro customDirectoryPage
  !insertmacro MUI_PAGE_DIRECTORY
!macroend

!macro customComponentsPage
  !insertmacro MUI_PAGE_COMPONENTS
!macroend

!macro customInstallPage
  !insertmacro MUI_PAGE_INSTFILES
!macroend

!macro customFinishPage
  !insertmacro MUI_PAGE_FINISH
!macroend
