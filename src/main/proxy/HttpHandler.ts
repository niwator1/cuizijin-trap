import * as http from 'http';
import * as url from 'url';
import { BlockPageGenerator } from './BlockPageGenerator';
import { InterceptionEvent } from './ProxyConfig';

/**
 * HTTP请求处理器
 * 处理普通HTTP代理请求和域名拦截
 */
export class HttpHandler {
  private blockPageGenerator: BlockPageGenerator;
  private blockedDomains: Set<string>;
  private onInterception?: (event: InterceptionEvent) => void;

  constructor() {
    this.blockPageGenerator = new BlockPageGenerator();
    this.blockedDomains = new Set();
  }

  /**
   * 设置拦截回调函数
   */
  setInterceptionCallback(callback: (event: InterceptionEvent) => void): void {
    this.onInterception = callback;
  }

  /**
   * 更新黑名单域名
   */
  updateBlockedDomains(domains: string[]): void {
    this.blockedDomains.clear();
    domains.forEach(domain => {
      // 标准化域名（移除协议、端口等）
      const normalizedDomain = this.normalizeDomain(domain);
      this.blockedDomains.add(normalizedDomain);
    });
    console.log(`Updated blocked domains: ${this.blockedDomains.size} domains`);
    console.log('Blocked domains list:', Array.from(this.blockedDomains));
  }

  /**
   * 处理HTTP请求
   */
  handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const startTime = Date.now();

    try {
      const requestUrl = req.url;
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const clientIp = this.getClientIp(req);

      console.log(`HTTP Request: ${req.method} ${requestUrl} from ${clientIp} (${userAgent})`);

      if (!requestUrl) {
        console.warn('HTTP request missing URL');
        this.sendErrorResponse(res, 400, 'Bad Request: Missing URL');
        return;
      }

      // 解析请求URL
      const parsedUrl = url.parse(requestUrl);
      const targetHost = parsedUrl.hostname;

      if (!targetHost) {
        console.warn(`HTTP request has invalid hostname: ${requestUrl}`);
        this.sendErrorResponse(res, 400, 'Bad Request: Invalid hostname');
        return;
      }

      // 检查域名是否被阻止
      if (this.isDomainBlocked(targetHost)) {
        console.log(`HTTP request blocked: ${targetHost}`);
        this.handleBlockedRequest(req, res, targetHost, requestUrl);
        return;
      }

      console.log(`HTTP request allowed: ${targetHost}`);
      // 转发请求到目标服务器
      this.forwardRequest(req, res, parsedUrl);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`HTTP request handling error (${duration}ms):`, error);
      this.sendErrorResponse(res, 500, 'Internal Server Error');
    }
  }

  /**
   * 检查域名是否被阻止
   */
  private isDomainBlocked(domain: string): boolean {
    const normalizedDomain = this.normalizeDomain(domain);

    console.log(`Checking domain: ${domain} -> normalized: ${normalizedDomain}`);

    // 检查完全匹配
    if (this.blockedDomains.has(normalizedDomain)) {
      console.log(`Domain blocked (exact match): ${normalizedDomain}`);
      return true;
    }

    // 检查子域名匹配和通配符匹配
    for (const blockedDomain of this.blockedDomains) {
      if (this.matchesDomainPattern(normalizedDomain, blockedDomain)) {
        console.log(`Domain blocked (pattern match): ${normalizedDomain} matches ${blockedDomain}`);
        return true;
      }
    }

    console.log(`Domain allowed: ${normalizedDomain}`);
    return false;
  }

  /**
   * 检查域名是否匹配模式
   */
  private matchesDomainPattern(domain: string, pattern: string): boolean {
    // 完全匹配
    if (domain === pattern) {
      return true;
    }

    // 子域名匹配 (example.com 匹配 sub.example.com)
    if (domain.endsWith('.' + pattern)) {
      return true;
    }

    // 通配符匹配 (*.example.com 匹配 sub.example.com)
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.substring(2);
      return domain === baseDomain || domain.endsWith('.' + baseDomain);
    }

    // www前缀处理
    if (pattern.startsWith('www.')) {
      const withoutWww = pattern.substring(4);
      return domain === withoutWww || this.matchesDomainPattern(domain, withoutWww);
    }

    if (domain.startsWith('www.')) {
      const withoutWww = domain.substring(4);
      return withoutWww === pattern || this.matchesDomainPattern(withoutWww, pattern);
    }

    return false;
  }

  /**
   * 标准化域名
   */
  private normalizeDomain(domain: string): string {
    if (!domain) return '';

    let normalized = domain.toLowerCase().trim();

    // 移除协议
    normalized = normalized.replace(/^https?:\/\//, '');

    // 移除端口
    normalized = normalized.replace(/:\d+$/, '');

    // 移除路径和查询参数
    normalized = normalized.replace(/\/.*$/, '');

    // 移除www前缀（可选，根据需求决定）
    // normalized = normalized.replace(/^www\./, '');

    return normalized;
  }

  /**
   * 处理被阻止的请求
   */
  private handleBlockedRequest(
    req: http.IncomingMessage, 
    res: http.ServerResponse, 
    domain: string, 
    requestUrl: string
  ): void {
    // 记录拦截事件
    const interceptionEvent: InterceptionEvent = {
      domain: domain,
      url: requestUrl,
      timestamp: new Date(),
      userAgent: req.headers['user-agent'],
      clientIp: this.getClientIp(req),
      protocol: 'http'
    };

    // 调用拦截回调
    if (this.onInterception) {
      this.onInterception(interceptionEvent);
    }

    // 检查请求类型，返回相应的拦截页面
    const acceptHeader = req.headers.accept || '';
    
    if (acceptHeader.includes('application/json')) {
      // API请求，返回JSON响应
      const jsonResponse = this.blockPageGenerator.generateJsonBlockResponse(domain, requestUrl);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(jsonResponse);
    } else {
      // 普通请求，返回HTML拦截页面
      const blockPageHtml = this.blockPageGenerator.generateBlockPage(domain, requestUrl);
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(blockPageHtml);
    }

    console.log(`Blocked HTTP request: ${domain} - ${requestUrl}`);
  }

  /**
   * 转发请求到目标服务器
   */
  private forwardRequest(
    req: http.IncomingMessage, 
    res: http.ServerResponse, 
    parsedUrl: url.UrlWithStringQuery
  ): void {
    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.path,
      method: req.method,
      headers: { ...req.headers }
    };

    // 移除代理相关的头部
    if (options.headers) {
      const headers = options.headers as any;
      delete headers['proxy-connection'];
      delete headers['proxy-authorization'];
    }

    const proxyReq = http.request(options, (proxyRes) => {
      // 复制响应头
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      
      // 转发响应数据
      proxyRes.pipe(res);
    });

    // 处理请求错误
    proxyReq.on('error', (error) => {
      console.error('Proxy request error:', error);
      this.sendErrorResponse(res, 502, 'Bad Gateway');
    });

    // 设置超时
    proxyReq.setTimeout(30000, () => {
      proxyReq.destroy();
      this.sendErrorResponse(res, 504, 'Gateway Timeout');
    });

    // 转发请求数据
    req.pipe(proxyReq);
  }

  /**
   * 发送错误响应
   */
  private sendErrorResponse(res: http.ServerResponse, statusCode: number, message: string): void {
    if (res.headersSent) {
      return;
    }

    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>代理错误 - ${statusCode}</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .error { background: #f8f9fa; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="error">
        <h1>代理错误 ${statusCode}</h1>
        <p>${message}</p>
    </div>
</body>
</html>`;

    res.writeHead(statusCode, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    res.end(errorHtml);
  }

  /**
   * 获取客户端IP地址
   */
  private getClientIp(req: http.IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIp = req.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }
    
    return req.socket.remoteAddress || 'unknown';
  }

  /**
   * 获取当前阻止的域名列表
   */
  getBlockedDomains(): string[] {
    return Array.from(this.blockedDomains);
  }

  /**
   * 清空黑名单
   */
  clearBlockedDomains(): void {
    this.blockedDomains.clear();
  }
}
