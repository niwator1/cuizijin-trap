import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 加密配置
 */
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  iterations: number;
}

/**
 * 加密结果
 */
export interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
}

/**
 * 配置加密类
 * 实现敏感配置数据的加密存储和解密读取
 */
export class ConfigEncryption {
  private readonly config: EncryptionConfig;
  private masterKey: Buffer | null = null;
  private keyPath: string;

  constructor(config?: Partial<EncryptionConfig>) {
    this.config = {
      algorithm: 'aes-256-cbc',
      keyLength: 32, // 256 bits
      ivLength: 16,  // 128 bits
      tagLength: 16, // 128 bits
      iterations: 100000, // PBKDF2 iterations
      ...config
    };
    
    this.keyPath = path.join(os.homedir(), '.cuizijin-trap', 'security', 'master.key');
  }

  /**
   * 初始化加密系统
   */
  async initialize(): Promise<void> {
    console.log('Initializing configuration encryption...');
    
    try {
      // 确保安全目录存在
      await this.ensureSecurityDirectory();
      
      // 加载或生成主密钥
      await this.loadOrGenerateMasterKey();
      
      console.log('Configuration encryption initialized successfully');
    } catch (error) {
      console.error('Failed to initialize configuration encryption:', error);
      throw error;
    }
  }

  /**
   * 加密配置数据
   */
  async encryptConfig(data: any): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      // 将数据序列化为JSON
      const jsonData = JSON.stringify(data);
      
      // 生成随机盐值和IV
      const salt = crypto.randomBytes(32);
      const iv = crypto.randomBytes(this.config.ivLength);
      
      // 从主密钥派生加密密钥
      const key = crypto.pbkdf2Sync(this.masterKey, salt, this.config.iterations, this.config.keyLength, 'sha256');
      
      // 创建加密器
      const cipher = crypto.createCipher(this.config.algorithm, key);

      // 加密数据
      let encrypted = cipher.update(jsonData, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 组合结果
      const result: EncryptionResult = {
        encrypted,
        iv: iv.toString('hex'),
        tag: '', // CBC模式不需要tag
        salt: salt.toString('hex')
      };
      
      // 返回Base64编码的结果
      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt configuration data');
    }
  }

  /**
   * 解密配置数据
   */
  async decryptConfig(encryptedData: string): Promise<any> {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      // 解码Base64数据
      const resultJson = Buffer.from(encryptedData, 'base64').toString('utf8');
      const result: EncryptionResult = JSON.parse(resultJson);
      
      // 转换十六进制字符串回Buffer
      const salt = Buffer.from(result.salt, 'hex');

      // 从主密钥派生解密密钥
      const key = crypto.pbkdf2Sync(this.masterKey, salt, this.config.iterations, this.config.keyLength, 'sha256');

      // 创建解密器
      const decipher = crypto.createDecipher(this.config.algorithm, key);

      // 解密数据
      let decrypted = decipher.update(result.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // 解析JSON数据
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt configuration data');
    }
  }

  /**
   * 加密文件
   */
  async encryptFile(filePath: string, outputPath?: string): Promise<string> {
    try {
      // 读取文件内容
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      
      // 解析为JSON（如果可能）
      let data: any;
      try {
        data = JSON.parse(fileContent);
      } catch {
        // 如果不是JSON，直接使用文件内容
        data = { content: fileContent };
      }
      
      // 加密数据
      const encryptedData = await this.encryptConfig(data);
      
      // 确定输出路径
      const output = outputPath || `${filePath}.encrypted`;
      
      // 写入加密文件
      await fs.promises.writeFile(output, encryptedData, 'utf8');
      
      console.log(`File encrypted: ${filePath} -> ${output}`);
      return output;
    } catch (error) {
      console.error('File encryption failed:', error);
      throw error;
    }
  }

  /**
   * 解密文件
   */
  async decryptFile(encryptedFilePath: string, outputPath?: string): Promise<string> {
    try {
      // 读取加密文件
      const encryptedData = await fs.promises.readFile(encryptedFilePath, 'utf8');
      
      // 解密数据
      const data = await this.decryptConfig(encryptedData);
      
      // 确定输出路径
      const output = outputPath || encryptedFilePath.replace('.encrypted', '');
      
      // 写入解密文件
      let content: string;
      if (typeof data === 'object' && data.content) {
        content = data.content;
      } else {
        content = JSON.stringify(data, null, 2);
      }
      
      await fs.promises.writeFile(output, content, 'utf8');
      
      console.log(`File decrypted: ${encryptedFilePath} -> ${output}`);
      return output;
    } catch (error) {
      console.error('File decryption failed:', error);
      throw error;
    }
  }

  /**
   * 生成安全的随机密码
   */
  generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * 生成哈希值
   */
  generateHash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * 验证哈希值
   */
  verifyHash(data: string, hash: string, algorithm: string = 'sha256'): boolean {
    const computedHash = this.generateHash(data, algorithm);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  }

  /**
   * 确保安全目录存在
   */
  private async ensureSecurityDirectory(): Promise<void> {
    const securityDir = path.dirname(this.keyPath);
    
    try {
      await fs.promises.mkdir(securityDir, { recursive: true });
      
      // 设置目录权限（仅所有者可访问）
      if (process.platform !== 'win32') {
        await fs.promises.chmod(securityDir, 0o700);
      }
    } catch (error) {
      console.error('Failed to create security directory:', error);
      throw error;
    }
  }

  /**
   * 加载或生成主密钥
   */
  private async loadOrGenerateMasterKey(): Promise<void> {
    try {
      // 尝试加载现有密钥
      if (await this.fileExists(this.keyPath)) {
        this.masterKey = await fs.promises.readFile(this.keyPath);
        console.log('Master key loaded from file');
      } else {
        // 生成新的主密钥
        this.masterKey = crypto.randomBytes(this.config.keyLength);
        await fs.promises.writeFile(this.keyPath, this.masterKey);
        
        // 设置文件权限（仅所有者可读写）
        if (process.platform !== 'win32') {
          await fs.promises.chmod(this.keyPath, 0o600);
        }
        
        console.log('New master key generated and saved');
      }
    } catch (error) {
      console.error('Failed to load or generate master key:', error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取加密状态
   */
  getStatus(): { initialized: boolean; keyPath: string; algorithm: string } {
    return {
      initialized: this.masterKey !== null,
      keyPath: this.keyPath,
      algorithm: this.config.algorithm
    };
  }

  /**
   * 销毁加密实例（清理内存中的密钥）
   */
  destroy(): void {
    if (this.masterKey) {
      this.masterKey.fill(0); // 清零内存
      this.masterKey = null;
    }
    console.log('Configuration encryption destroyed');
  }
}
