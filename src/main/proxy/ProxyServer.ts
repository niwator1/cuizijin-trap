import * as http from 'http';
import * as net from 'net';
import { HttpHandler } from './HttpHandler';
import { ProxyConfig, ProxyConfigManager, ProxyStatus, InterceptionEvent, ProxyStats } from './ProxyConfig';

/**
 * 代理服务器
 * 实现HTTP/HTTPS代理功能，包括域名过滤和请求拦截
 */
export class ProxyServer {
  private httpServer: http.Server | null = null;
  private httpHandler: HttpHandler;
  private configManager: ProxyConfigManager;
  private status: ProxyStatus = 'stopped';
  private stats: ProxyStats;
  private onInterception?: (event: InterceptionEvent) => void;

  constructor(config?: Partial<ProxyConfig>) {
    this.configManager = new ProxyConfigManager(config);
    this.httpHandler = new HttpHandler();
    this.stats = this.initializeStats();

    // 设置拦截回调
    this.httpHandler.setInterceptionCallback((event) => {
      this.handleInterception(event);
    });
  }

  /**
   * 启动代理服务器
   */
  async start(): Promise<void> {
    if (this.status === 'running') {
      throw new Error('代理服务器已在运行中');
    }

    this.status = 'starting';

    try {
      // 验证配置
      const validation = this.configManager.validateConfig();
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      // 启动HTTP代理服务器
      await this.startHttpServer();

      this.status = 'running';
      this.stats.startTime = new Date();

      console.log(`代理服务器已启动:`);
      console.log(`  HTTP代理: ${this.configManager.getBindAddress()}:${this.configManager.getHttpPort()}`);

    } catch (error) {
      this.status = 'error';
      console.error('启动代理服务器失败:', error);
      throw error;
    }
  }

  /**
   * 停止代理服务器
   */
  async stop(): Promise<void> {
    if (this.status === 'stopped') {
      return;
    }

    this.status = 'stopping';

    try {
      // 停止HTTP服务器
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
        this.httpServer = null;
      }

      this.status = 'stopped';
      console.log('代理服务器已停止');

    } catch (error) {
      this.status = 'error';
      console.error('停止代理服务器失败:', error);
      throw error;
    }
  }

  /**
   * 重启代理服务器
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * 获取代理服务器状态
   */
  getStatus(): ProxyStatus {
    return this.status;
  }

  /**
   * 检查代理服务器是否运行中
   */
  isActive(): boolean {
    return this.status === 'running';
  }

  /**
   * 更新黑名单域名
   */
  updateBlockedDomains(domains: string[]): void {
    this.httpHandler.updateBlockedDomains(domains);
  }

  /**
   * 设置拦截事件回调
   */
  setInterceptionCallback(callback: (event: InterceptionEvent) => void): void {
    this.onInterception = callback;
  }

  /**
   * 获取代理统计信息
   */
  getStats(): ProxyStats {
    if (this.status === 'running') {
      this.stats.uptime = Date.now() - this.stats.startTime.getTime();
    }
    return { ...this.stats };
  }

  /**
   * 获取代理服务器端口
   */
  getPort(): number {
    return this.configManager.getHttpPort();
  }

  /**
   * 获取配置信息
   */
  getConfig(): ProxyConfig {
    return this.configManager.getConfig();
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<ProxyConfig>): void {
    this.configManager.updateConfig(updates);
  }

  /**
   * 启动HTTP代理服务器
   */
  private async startHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer();

      // 处理HTTP请求
      this.httpServer.on('request', (req, res) => {
        this.stats.totalRequests++;
        this.stats.lastActivity = new Date();
        this.httpHandler.handleRequest(req, res);
      });

      // 处理CONNECT请求（HTTPS隧道）
      this.httpServer.on('connect', (req, socket, head) => {
        this.handleConnectRequest(req, socket, head);
      });

      // 处理服务器错误
      this.httpServer.on('error', (error) => {
        console.error('HTTP代理服务器错误:', error);
        reject(error);
      });

      // 监听指定端口
      const port = this.configManager.getHttpPort();
      const address = this.configManager.getBindAddress();

      this.httpServer.listen(port, address, () => {
        console.log(`HTTP代理服务器监听: ${address}:${port}`);
        resolve();
      });
    });
  }

  /**
   * 处理HTTPS CONNECT请求
   */
  private handleConnectRequest(req: http.IncomingMessage, socket: any, head: Buffer): void {
    const url = req.url;
    if (!url) {
      console.log('CONNECT request missing URL');
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }

    const [hostname, port] = url.split(':');
    const targetPort = parseInt(port) || 443;

    console.log(`CONNECT request: ${hostname}:${targetPort}`);

    // 更新统计
    this.stats.totalRequests++;
    this.stats.lastActivity = new Date();

    // 检查域名是否被阻止
    if (this.httpHandler['isDomainBlocked'](hostname)) {
      // 对于被阻止的HTTPS网站，返回拦截页面
      console.log(`Blocking HTTPS CONNECT to: ${hostname}`);
      this.handleBlockedHttpsRequest(socket, hostname, url);
      return;
    }

    console.log(`Allowing HTTPS CONNECT to: ${hostname}`);

    // 建立到目标服务器的连接
    const targetSocket = net.connect(targetPort, hostname, () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      targetSocket.write(head);
      socket.pipe(targetSocket);
      targetSocket.pipe(socket);
    });

    targetSocket.on('error', (error: any) => {
      console.error('HTTPS隧道连接错误:', error);
      socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    });

    socket.on('error', (error: any) => {
      console.error('客户端socket错误:', error);
      targetSocket.destroy();
    });
  }

  /**
   * 处理被阻止的HTTPS请求
   */
  private handleBlockedHttpsRequest(socket: any, hostname: string, url: string): void {
    // 记录拦截事件
    const interceptionEvent: InterceptionEvent = {
      domain: hostname,
      url: `https://${url}`,
      timestamp: new Date(),
      protocol: 'https'
    };
    this.handleInterception(interceptionEvent);

    // 返回拦截页面的HTML响应
    const blockPageHtml = this.generateHttpsBlockPage(hostname, url);
    const response = [
      'HTTP/1.1 200 OK',
      'Content-Type: text/html; charset=utf-8',
      'Connection: close',
      'Cache-Control: no-cache',
      `Content-Length: ${Buffer.byteLength(blockPageHtml, 'utf8')}`,
      '',
      blockPageHtml
    ].join('\r\n');

    socket.write(response);
    socket.end();

    console.log(`Blocked HTTPS request: ${hostname}`);
  }

  /**
   * 生成HTTPS拦截页面
   */
  private generateHttpsBlockPage(hostname: string, url: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>网站已被阻止 - 崔子瑾诱捕器</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            margin: 20px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .domain {
            color: #666;
            font-size: 18px;
            margin-bottom: 20px;
            word-break: break-all;
        }
        .message {
            color: #888;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .timestamp {
            color: #aaa;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🚫</div>
        <h1>网站已被阻止</h1>
        <div class="domain">${hostname}</div>
        <div class="message">
            此网站已被崔子瑾诱捕器阻止访问。<br>
            如需访问此网站，请联系管理员。
        </div>
        <div class="timestamp">
            拦截时间: ${new Date().toLocaleString('zh-CN')}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 处理拦截事件
   */
  private handleInterception(event: InterceptionEvent): void {
    this.stats.blockedRequests++;
    this.stats.lastActivity = new Date();

    // 调用外部回调
    if (this.onInterception) {
      this.onInterception(event);
    }
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): ProxyStats {
    return {
      totalRequests: 0,
      blockedRequests: 0,
      allowedRequests: 0,
      uptime: 0,
      startTime: new Date(),
      lastActivity: new Date()
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }
}
