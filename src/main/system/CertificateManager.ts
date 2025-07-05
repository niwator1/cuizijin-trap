import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * 证书管理器
 * 处理不同平台的证书安装和卸载
 */
export class CertificateManager {
  private platform: string;

  constructor() {
    this.platform = os.platform();
  }

  /**
   * 检查Windows证书是否已安装
   */
  async isWindowsCertificateInstalled(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('certlm -store -c "Root" | findstr "CuiZiJin Trap"');
      return stdout.includes('CuiZiJin Trap');
    } catch {
      return false;
    }
  }

  /**
   * 安装Windows证书
   */
  async installWindowsCertificate(certPath: string): Promise<void> {
    try {
      // 使用certlm工具安装证书到受信任的根证书颁发机构
      await execAsync(`certlm -add -c "${certPath}" -s "Root"`);
      console.log('Windows certificate installed successfully');
    } catch (error) {
      console.error('Failed to install Windows certificate:', error);
      
      // 尝试使用PowerShell作为备选方案
      try {
        const powershellCmd = `Import-Certificate -FilePath "${certPath}" -CertStoreLocation Cert:\\LocalMachine\\Root`;
        await execAsync(`powershell -Command "${powershellCmd}"`);
        console.log('Windows certificate installed via PowerShell');
      } catch (psError) {
        throw new Error('Failed to install certificate using both certlm and PowerShell');
      }
    }
  }

  /**
   * 卸载Windows证书
   */
  async uninstallWindowsCertificate(): Promise<void> {
    try {
      // 查找并删除证书
      const { stdout } = await execAsync('certlm -store -c "Root" | findstr /C:"CuiZiJin Trap"');
      
      if (stdout) {
        // 提取证书指纹或序列号
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('CuiZiJin Trap')) {
            // 使用PowerShell删除证书
            const powershellCmd = `Get-ChildItem -Path Cert:\\LocalMachine\\Root | Where-Object {$_.Subject -like "*CuiZiJin Trap*"} | Remove-Item`;
            await execAsync(`powershell -Command "${powershellCmd}"`);
            break;
          }
        }
      }
      
      console.log('Windows certificate uninstalled successfully');
    } catch (error) {
      console.error('Failed to uninstall Windows certificate:', error);
      throw error;
    }
  }

  /**
   * 检查macOS证书是否已安装
   */
  async isMacOSCertificateInstalled(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('security find-certificate -c "CuiZiJin Trap Root CA" /System/Library/Keychains/SystemRootCertificates.keychain');
      return stdout.includes('CuiZiJin Trap Root CA');
    } catch {
      return false;
    }
  }

  /**
   * 安装macOS证书
   */
  async installMacOSCertificate(certPath: string): Promise<void> {
    try {
      // 添加证书到系统钥匙串
      await execAsync(`security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${certPath}"`);
      console.log('macOS certificate installed successfully');
    } catch (error) {
      console.error('Failed to install macOS certificate:', error);
      
      // 尝试添加到用户钥匙串作为备选方案
      try {
        await execAsync(`security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain "${certPath}"`);
        console.log('macOS certificate installed to user keychain');
      } catch (userError) {
        throw new Error('Failed to install certificate to both system and user keychains');
      }
    }
  }

  /**
   * 卸载macOS证书
   */
  async uninstallMacOSCertificate(): Promise<void> {
    try {
      // 从系统钥匙串删除证书
      await execAsync('security delete-certificate -c "CuiZiJin Trap Root CA" /Library/Keychains/System.keychain');
      console.log('macOS certificate uninstalled from system keychain');
    } catch (systemError) {
      console.log('Certificate not found in system keychain, trying user keychain');
      
      try {
        // 从用户钥匙串删除证书
        await execAsync('security delete-certificate -c "CuiZiJin Trap Root CA" ~/Library/Keychains/login.keychain');
        console.log('macOS certificate uninstalled from user keychain');
      } catch (userError) {
        console.error('Failed to uninstall macOS certificate:', userError);
        throw new Error('Certificate not found in any keychain');
      }
    }
  }

  /**
   * 检查Linux证书是否已安装
   */
  async isLinuxCertificateInstalled(): Promise<boolean> {
    try {
      // 检查常见的证书目录
      const certDirs = [
        '/etc/ssl/certs',
        '/usr/local/share/ca-certificates',
        '/etc/ca-certificates/trust-source/anchors'
      ];
      
      for (const dir of certDirs) {
        try {
          const { stdout } = await execAsync(`find "${dir}" -name "*cuizijin*" -o -name "*CuiZiJin*" 2>/dev/null`);
          if (stdout.trim()) {
            return true;
          }
        } catch {
          // 目录可能不存在，继续检查下一个
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 安装Linux证书
   */
  async installLinuxCertificate(certPath: string): Promise<void> {
    try {
      const certName = 'cuizijin-trap-ca.crt';
      
      // 尝试不同的Linux发行版的证书安装方法
      
      // Ubuntu/Debian
      try {
        const ubuntuCertPath = `/usr/local/share/ca-certificates/${certName}`;
        await execAsync(`sudo cp "${certPath}" "${ubuntuCertPath}"`);
        await execAsync('sudo update-ca-certificates');
        console.log('Linux certificate installed via update-ca-certificates');
        return;
      } catch {
        // 继续尝试其他方法
      }
      
      // CentOS/RHEL/Fedora
      try {
        const rhelCertPath = `/etc/pki/ca-trust/source/anchors/${certName}`;
        await execAsync(`sudo cp "${certPath}" "${rhelCertPath}"`);
        await execAsync('sudo update-ca-trust');
        console.log('Linux certificate installed via update-ca-trust');
        return;
      } catch {
        // 继续尝试其他方法
      }
      
      // Arch Linux
      try {
        const archCertPath = `/etc/ca-certificates/trust-source/anchors/${certName}`;
        await execAsync(`sudo cp "${certPath}" "${archCertPath}"`);
        await execAsync('sudo trust extract-compat');
        console.log('Linux certificate installed via trust extract-compat');
        return;
      } catch {
        // 所有方法都失败了
      }
      
      throw new Error('Failed to install certificate on this Linux distribution');
    } catch (error) {
      console.error('Failed to install Linux certificate:', error);
      throw error;
    }
  }

  /**
   * 卸载Linux证书
   */
  async uninstallLinuxCertificate(): Promise<void> {
    try {
      const certName = 'cuizijin-trap-ca.crt';
      let removed = false;
      
      // 尝试从不同位置删除证书
      const certPaths = [
        `/usr/local/share/ca-certificates/${certName}`,
        `/etc/pki/ca-trust/source/anchors/${certName}`,
        `/etc/ca-certificates/trust-source/anchors/${certName}`
      ];
      
      for (const certPath of certPaths) {
        try {
          await execAsync(`sudo rm -f "${certPath}"`);
          removed = true;
        } catch {
          // 文件可能不存在，继续
        }
      }
      
      if (removed) {
        // 更新证书存储
        try {
          await execAsync('sudo update-ca-certificates');
        } catch {
          try {
            await execAsync('sudo update-ca-trust');
          } catch {
            try {
              await execAsync('sudo trust extract-compat');
            } catch {
              // 忽略更新错误
            }
          }
        }
        
        console.log('Linux certificate uninstalled successfully');
      } else {
        console.log('Linux certificate not found');
      }
    } catch (error) {
      console.error('Failed to uninstall Linux certificate:', error);
      throw error;
    }
  }
}
