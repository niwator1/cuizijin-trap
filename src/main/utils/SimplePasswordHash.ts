import crypto from 'crypto';

/**
 * 简单的密码哈希工具
 * 用于替代bcrypt，避免Node.js版本兼容性问题
 */
export class SimplePasswordHash {
  private static readonly SALT_LENGTH = 32;
  private static readonly ITERATIONS = 10000;
  private static readonly KEY_LENGTH = 64;
  private static readonly ALGORITHM = 'sha512';

  /**
   * 生成密码哈希
   * @param password 明文密码
   * @param saltRounds 盐值轮数（为了兼容bcrypt接口，实际不使用）
   * @returns Promise<string> 哈希后的密码
   */
  static async hash(password: string, saltRounds?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // 生成随机盐值
        const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');
        
        // 使用PBKDF2进行密码哈希
        crypto.pbkdf2(password, salt, this.ITERATIONS, this.KEY_LENGTH, this.ALGORITHM, (err, derivedKey) => {
          if (err) {
            reject(err);
            return;
          }
          
          // 将盐值和哈希值组合
          const hash = derivedKey.toString('hex');
          const combined = `${salt}:${hash}`;
          resolve(combined);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 同步生成密码哈希
   * @param password 明文密码
   * @param saltRounds 盐值轮数（为了兼容bcrypt接口，实际不使用）
   * @returns string 哈希后的密码
   */
  static hashSync(password: string, saltRounds?: number): string {
    // 生成随机盐值
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    
    // 使用PBKDF2进行密码哈希
    const hash = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, this.KEY_LENGTH, this.ALGORITHM);
    
    // 将盐值和哈希值组合
    const combined = `${salt}:${hash.toString('hex')}`;
    return combined;
  }

  /**
   * 验证密码
   * @param password 明文密码
   * @param hashedPassword 哈希后的密码
   * @returns Promise<boolean> 验证结果
   */
  static async compare(password: string, hashedPassword: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // 分离盐值和哈希值
        const parts = hashedPassword.split(':');
        if (parts.length !== 2) {
          resolve(false);
          return;
        }
        
        const [salt, originalHash] = parts;
        
        // 使用相同的盐值重新计算哈希
        crypto.pbkdf2(password, salt, this.ITERATIONS, this.KEY_LENGTH, this.ALGORITHM, (err, derivedKey) => {
          if (err) {
            reject(err);
            return;
          }
          
          const newHash = derivedKey.toString('hex');
          
          // 使用时间安全的比较方法
          const isMatch = crypto.timingSafeEqual(
            Buffer.from(originalHash, 'hex'),
            Buffer.from(newHash, 'hex')
          );
          
          resolve(isMatch);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 同步验证密码
   * @param password 明文密码
   * @param hashedPassword 哈希后的密码
   * @returns boolean 验证结果
   */
  static compareSync(password: string, hashedPassword: string): boolean {
    try {
      // 分离盐值和哈希值
      const parts = hashedPassword.split(':');
      if (parts.length !== 2) {
        return false;
      }
      
      const [salt, originalHash] = parts;
      
      // 使用相同的盐值重新计算哈希
      const newHash = crypto.pbkdf2Sync(password, salt, this.ITERATIONS, this.KEY_LENGTH, this.ALGORITHM);
      
      // 使用时间安全的比较方法
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(originalHash, 'hex'),
        Buffer.from(newHash.toString('hex'), 'hex')
      );
      
      return isMatch;
    } catch (error) {
      console.error('Password comparison error:', error);
      return false;
    }
  }

  /**
   * 生成盐值（为了兼容bcrypt接口）
   * @param rounds 轮数
   * @returns Promise<string> 盐值
   */
  static async genSalt(rounds?: number): Promise<string> {
    return crypto.randomBytes(this.SALT_LENGTH).toString('hex');
  }

  /**
   * 同步生成盐值（为了兼容bcrypt接口）
   * @param rounds 轮数
   * @returns string 盐值
   */
  static genSaltSync(rounds?: number): string {
    return crypto.randomBytes(this.SALT_LENGTH).toString('hex');
  }

  /**
   * 获取哈希轮数（为了兼容bcrypt接口，返回固定值）
   * @param hashedPassword 哈希后的密码
   * @returns number 轮数
   */
  static getRounds(hashedPassword: string): number {
    return this.ITERATIONS;
  }
}

// 导出兼容bcrypt的接口
export const hash = SimplePasswordHash.hash.bind(SimplePasswordHash);
export const hashSync = SimplePasswordHash.hashSync.bind(SimplePasswordHash);
export const compare = SimplePasswordHash.compare.bind(SimplePasswordHash);
export const compareSync = SimplePasswordHash.compareSync.bind(SimplePasswordHash);
export const genSalt = SimplePasswordHash.genSalt.bind(SimplePasswordHash);
export const genSaltSync = SimplePasswordHash.genSaltSync.bind(SimplePasswordHash);
export const getRounds = SimplePasswordHash.getRounds.bind(SimplePasswordHash);

// 默认导出
export default SimplePasswordHash;
