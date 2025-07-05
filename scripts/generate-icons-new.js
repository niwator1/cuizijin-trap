#!/usr/bin/env node

/**
 * 图标生成脚本
 * 从SVG源文件生成各种格式和尺寸的图标
 */

const fs = require('fs');
const path = require('path');

console.log('🎨 生成应用图标...');

// 源SVG文件
const sourceSvg = path.join(__dirname, '../assets/icon.svg');
const assetsDir = path.join(__dirname, '../assets');

// 检查源文件是否存在
if (!fs.existsSync(sourceSvg)) {
  console.error('❌ 源SVG文件不存在:', sourceSvg);
  process.exit(1);
}

// 读取SVG内容
const svgContent = fs.readFileSync(sourceSvg, 'utf8');
console.log('✅ 读取SVG源文件成功');

// 创建不同尺寸的PNG图标（使用SVG作为基础）
const iconSizes = {
  'icon.png': 512,
  'icon@2x.png': 1024,
  'tray-icon.png': 32,
  'tray-icon@2x.png': 64
};

// 生成转换工具HTML
function generateConversionHTML() {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>图标转换工具</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .icon-container { margin: 20px 0; }
        canvas { border: 1px solid #ccc; margin: 10px; }
        .download-link { display: block; margin: 5px 0; color: #007cba; text-decoration: none; }
        .download-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>崔子瑾诱捕器 - 图标转换工具</h1>
    <p>请在浏览器中打开此文件，然后点击下载链接保存PNG格式图标</p>
    
    ${Object.entries(iconSizes).map(([filename, size]) => `
    <div class="icon-container">
        <h3>${filename} (${size}x${size})</h3>
        <canvas id="canvas-${size}" width="${size}" height="${size}"></canvas>
        <a href="#" class="download-link" onclick="downloadCanvas('canvas-${size}', '${filename}')">📥 下载 ${filename}</a>
    </div>
    `).join('')}

    <script>
        const svgContent = \`${svgContent.replace(/`/g, '\\`')}\`;
        
        function loadSVGToCanvas(canvasId, size) {
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            
            const img = new Image();
            const svgBlob = new Blob([svgContent], {type: 'image/svg+xml'});
            const url = URL.createObjectURL(svgBlob);
            
            img.onload = function() {
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, size, size);
                URL.revokeObjectURL(url);
            };
            
            img.src = url;
        }
        
        function downloadCanvas(canvasId, filename) {
            const canvas = document.getElementById(canvasId);
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
        
        // 加载所有图标
        window.onload = function() {
            ${Object.entries(iconSizes).map(([filename, size]) => 
              `loadSVGToCanvas('canvas-${size}', ${size});`
            ).join('\n            ')}
        };
    </script>
</body>
</html>`;

  const htmlPath = path.join(assetsDir, 'icon-converter.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('✅ 图标转换工具已生成:', htmlPath);
  return htmlPath;
}

// 创建基础的PNG图标（简化版本）
function createBasicPNGIcons() {
  // 创建一个简单的PNG数据（1x1像素的红色图像作为占位符）
  const redPixelPNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, // compressed data
    0x00, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // (red pixel)
    0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, // checksum
    0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82  // IEND chunk
  ]);

  // 创建基础图标文件
  Object.keys(iconSizes).forEach(filename => {
    const iconPath = path.join(assetsDir, filename);
    fs.writeFileSync(iconPath, redPixelPNG);
    console.log(`✅ 创建占位符图标: ${filename}`);
  });
}

// 主函数
function main() {
  console.log('📁 确保assets目录存在...');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // 生成转换工具
  const htmlPath = generateConversionHTML();
  
  // 创建基础PNG图标作为占位符
  createBasicPNGIcons();
  
  console.log('');
  console.log('🎉 图标生成完成！');
  console.log('');
  console.log('📋 下一步操作：');
  console.log(`1. 在浏览器中打开: ${htmlPath}`);
  console.log('2. 下载生成的PNG图标文件');
  console.log('3. 将下载的文件替换 assets/ 目录中的对应文件');
  console.log('4. 重新构建应用程序');
}

if (require.main === module) {
  main();
}
