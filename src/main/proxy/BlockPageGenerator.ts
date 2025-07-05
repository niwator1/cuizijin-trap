/**
 * 拦截页面生成器
 * 生成美观的网站拦截页面
 */
export class BlockPageGenerator {
  /**
   * 生成拦截页面HTML
   */
  generateBlockPage(domain: string, url: string, timestamp: Date = new Date()): string {
    const timeString = timestamp.toLocaleString('zh-CN');
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>网站访问已被拦截 - 崔子瑾诱捕器</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
        }
        
        .container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 30px;
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: white;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 20px;
            color: #2c3e50;
        }
        
        .domain {
            font-size: 20px;
            font-weight: 500;
            color: #e74c3c;
            margin-bottom: 20px;
            padding: 10px 20px;
            background: rgba(231, 76, 60, 0.1);
            border-radius: 10px;
            border: 1px solid rgba(231, 76, 60, 0.2);
        }
        
        .message {
            font-size: 16px;
            line-height: 1.6;
            color: #555;
            margin-bottom: 30px;
        }
        
        .details {
            background: rgba(52, 73, 94, 0.05);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: left;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .detail-label {
            font-weight: 500;
            color: #34495e;
        }
        
        .detail-value {
            color: #7f8c8d;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        
        .actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
        }
        
        .btn-secondary {
            background: rgba(149, 165, 166, 0.1);
            color: #34495e;
            border: 1px solid rgba(149, 165, 166, 0.3);
        }
        
        .btn-secondary:hover {
            background: rgba(149, 165, 166, 0.2);
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(149, 165, 166, 0.2);
            font-size: 12px;
            color: #95a5a6;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 30px 20px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            .domain {
                font-size: 18px;
            }
            
            .actions {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🚫</div>
        
        <h1>网站访问已被拦截</h1>
        
        <div class="domain">${this.escapeHtml(domain)}</div>
        
        <div class="message">
            <p>此网站已被添加到访问控制列表中。</p>
            <p>如果您认为这是一个错误，请联系管理员或检查您的访问控制设置。</p>
        </div>
        
        <div class="details">
            <div class="detail-item">
                <span class="detail-label">被拦截的域名:</span>
                <span class="detail-value">${this.escapeHtml(domain)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">请求的URL:</span>
                <span class="detail-value">${this.escapeHtml(url)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">拦截时间:</span>
                <span class="detail-value">${timeString}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">拦截原因:</span>
                <span class="detail-value">域名在黑名单中</span>
            </div>
        </div>
        
        <div class="actions">
            <button class="btn btn-primary" onclick="history.back()">
                ← 返回上一页
            </button>
            <button class="btn btn-secondary" onclick="window.close()">
                关闭页面
            </button>
        </div>
        
        <div class="footer">
            <p>崔子瑾诱捕器 - 网站访问控制系统</p>
            <p>此页面由代理服务器自动生成</p>
        </div>
    </div>
    
    <script>
        // 添加一些交互效果
        document.addEventListener('DOMContentLoaded', function() {
            // 记录拦截事件（可选）
            console.log('网站访问被拦截:', '${this.escapeHtml(domain)}');
            
            // 添加键盘快捷键
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    window.close();
                } else if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowLeft')) {
                    history.back();
                }
            });
        });
    </script>
</body>
</html>`;
  }

  /**
   * 生成简化版拦截页面（用于API响应等）
   */
  generateSimpleBlockPage(domain: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>访问被拦截</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5; 
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            max-width: 400px; 
            margin: 0 auto; 
        }
        h1 { color: #e74c3c; }
        .domain { 
            background: #ffeaa7; 
            padding: 10px; 
            border-radius: 5px; 
            margin: 20px 0; 
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚫 访问被拦截</h1>
        <div class="domain">${this.escapeHtml(domain)}</div>
        <p>此网站已被访问控制系统拦截。</p>
    </div>
</body>
</html>`;
  }

  /**
   * 转义HTML特殊字符
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * 生成JSON格式的拦截响应
   */
  generateJsonBlockResponse(domain: string, url: string): string {
    return JSON.stringify({
      blocked: true,
      domain: domain,
      url: url,
      timestamp: new Date().toISOString(),
      message: '此网站已被访问控制系统拦截',
      reason: '域名在黑名单中'
    }, null, 2);
  }
}
