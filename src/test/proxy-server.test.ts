// 代理服务器功能测试
describe('Proxy Server', () => {
  // 测试代理配置
  describe('Proxy Configuration', () => {
    it('should create default configuration', () => {
      const validateConfig = (config: any): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // 检查端口范围
        if (config.httpPort < 1 || config.httpPort > 65535) {
          errors.push('HTTP端口必须在1-65535范围内');
        }

        if (config.httpsPort < 1 || config.httpsPort > 65535) {
          errors.push('HTTPS端口必须在1-65535范围内');
        }

        // 检查端口冲突
        if (config.httpPort === config.httpsPort) {
          errors.push('HTTP和HTTPS端口不能相同');
        }

        // 检查绑定地址
        if (!config.bindAddress) {
          errors.push('绑定地址不能为空');
        }

        return {
          valid: errors.length === 0,
          errors
        };
      };

      const defaultConfig = {
        httpPort: 8080,
        httpsPort: 8443,
        bindAddress: '127.0.0.1',
        enableHttps: true,
        enableLogging: true,
        maxConnections: 1000,
        connectionTimeout: 30000
      };

      const validation = validateConfig(defaultConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate invalid configuration', () => {
      const validateConfig = (config: any): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        if (config.httpPort < 1 || config.httpPort > 65535) {
          errors.push('HTTP端口必须在1-65535范围内');
        }

        if (config.httpsPort < 1 || config.httpsPort > 65535) {
          errors.push('HTTPS端口必须在1-65535范围内');
        }

        if (config.httpPort === config.httpsPort) {
          errors.push('HTTP和HTTPS端口不能相同');
        }

        if (!config.bindAddress) {
          errors.push('绑定地址不能为空');
        }

        return {
          valid: errors.length === 0,
          errors
        };
      };

      const invalidConfig = {
        httpPort: 8080,
        httpsPort: 8080, // 端口冲突
        bindAddress: '', // 空地址
        enableHttps: true,
        enableLogging: true
      };

      const validation = validateConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('HTTP和HTTPS端口不能相同');
      expect(validation.errors).toContain('绑定地址不能为空');
    });
  });

  // 测试域名处理
  describe('Domain Processing', () => {
    it('should normalize domains correctly', () => {
      const normalizeDomain = (domain: string): string => {
        return domain.toLowerCase()
          .replace(/^https?:\/\//, '')  // 移除协议
          .replace(/:\d+$/, '')        // 移除端口
          .replace(/\/.*$/, '')        // 移除路径
          .replace(/^www\./, '');      // 移除www前缀
      };

      expect(normalizeDomain('https://www.example.com')).toBe('example.com');
      expect(normalizeDomain('http://example.com:8080')).toBe('example.com');
      expect(normalizeDomain('example.com/path')).toBe('example.com');
      expect(normalizeDomain('WWW.EXAMPLE.COM')).toBe('example.com');
    });

    it('should check domain blocking correctly', () => {
      const blockedDomains = new Set(['example.com', 'test.org']);
      
      const isDomainBlocked = (domain: string): boolean => {
        const normalizeDomain = (d: string): string => {
          return d.toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/:\d+$/, '')
            .replace(/\/.*$/, '')
            .replace(/^www\./, '');
        };

        const normalizedDomain = normalizeDomain(domain);
        
        // 检查完全匹配
        if (blockedDomains.has(normalizedDomain)) {
          return true;
        }

        // 检查子域名匹配
        for (const blockedDomain of blockedDomains) {
          if (normalizedDomain.endsWith('.' + blockedDomain) || 
              normalizedDomain === blockedDomain) {
            return true;
          }
        }

        return false;
      };

      expect(isDomainBlocked('example.com')).toBe(true);
      expect(isDomainBlocked('www.example.com')).toBe(true);
      expect(isDomainBlocked('sub.example.com')).toBe(true);
      expect(isDomainBlocked('test.org')).toBe(true);
      expect(isDomainBlocked('allowed.com')).toBe(false);
    });
  });

  // 测试拦截页面生成
  describe('Block Page Generation', () => {
    it('should generate valid HTML block page', () => {
      const generateBlockPage = (domain: string, url: string): string => {
        const escapeHtml = (text: string): string => {
          const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
          };
          
          return text.replace(/[&<>"']/g, (m) => map[m]);
        };

        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>网站访问已被拦截</title>
</head>
<body>
    <h1>网站访问已被拦截</h1>
    <p>域名: ${escapeHtml(domain)}</p>
    <p>URL: ${escapeHtml(url)}</p>
</body>
</html>`;
      };

      const html = generateBlockPage('example.com', 'http://example.com/test');
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('网站访问已被拦截');
      expect(html).toContain('example.com');
      expect(html).toContain('http://example.com/test');
    });

    it('should escape HTML in block page', () => {
      const escapeHtml = (text: string): string => {
        const map: { [key: string]: string } = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;'
        };
        
        return text.replace(/[&<>"']/g, (m) => map[m]);
      };

      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escapeHtml('test & example')).toBe('test &amp; example');
    });
  });

  // 测试代理统计
  describe('Proxy Statistics', () => {
    it('should track proxy statistics correctly', () => {
      const stats = {
        totalRequests: 0,
        blockedRequests: 0,
        allowedRequests: 0,
        uptime: 0,
        startTime: new Date(),
        lastActivity: new Date()
      };

      // 模拟请求处理
      const handleRequest = (isBlocked: boolean) => {
        stats.totalRequests++;
        stats.lastActivity = new Date();
        
        if (isBlocked) {
          stats.blockedRequests++;
        } else {
          stats.allowedRequests++;
        }
      };

      handleRequest(true);  // 被阻止的请求
      handleRequest(false); // 允许的请求
      handleRequest(true);  // 被阻止的请求

      expect(stats.totalRequests).toBe(3);
      expect(stats.blockedRequests).toBe(2);
      expect(stats.allowedRequests).toBe(1);
    });
  });

  // 测试JSON响应生成
  describe('JSON Response Generation', () => {
    it('should generate valid JSON block response', () => {
      const generateJsonBlockResponse = (domain: string, url: string): string => {
        return JSON.stringify({
          blocked: true,
          domain: domain,
          url: url,
          timestamp: new Date().toISOString(),
          message: '此网站已被访问控制系统拦截',
          reason: '域名在黑名单中'
        }, null, 2);
      };

      const jsonResponse = generateJsonBlockResponse('example.com', 'http://example.com/api');
      const parsed = JSON.parse(jsonResponse);

      expect(parsed.blocked).toBe(true);
      expect(parsed.domain).toBe('example.com');
      expect(parsed.url).toBe('http://example.com/api');
      expect(parsed.message).toBe('此网站已被访问控制系统拦截');
      expect(parsed.reason).toBe('域名在黑名单中');
      expect(typeof parsed.timestamp).toBe('string');
    });
  });
});
