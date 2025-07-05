const fs = require('fs');
const path = require('path');

// 创建一个简单的图标生成脚本
// 由于我们没有安装图像处理库，我们将创建一个基础的PNG图标

const iconSizes = {
  'icon.png': 512,
  'icon@2x.png': 1024,
  'icon.ico': 256,
  'icon.icns': 512
};

// 创建一个简单的Canvas-based图标生成器
function generateIcon(size, outputPath) {
  // 这里我们创建一个简单的SVG到PNG的转换
  // 在实际项目中，你可能需要使用sharp或其他图像处理库
  
  const svgContent = `
    <svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea"/>
          <stop offset="100%" style="stop-color:#764ba2"/>
        </linearGradient>
        <linearGradient id="shield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f093fb"/>
          <stop offset="100%" style="stop-color:#f5576c"/>
        </linearGradient>
      </defs>
      
      <circle cx="256" cy="256" r="240" fill="url(#bg)"/>
      <path d="M256 80 L180 120 L180 220 Q180 300 256 380 Q332 300 332 220 L332 120 Z" 
            fill="url(#shield)" stroke="#fff" stroke-width="4"/>
      <rect x="220" y="200" width="72" height="80" rx="8" fill="#ffecd2" stroke="#fff" stroke-width="3"/>
      <path d="M235 200 L235 170 Q235 150 256 150 Q277 150 277 170 L277 200" 
            fill="none" stroke="#ffecd2" stroke-width="8"/>
      <circle cx="256" cy="230" r="8" fill="#764ba2"/>
      <rect x="252" y="230" width="8" height="20" fill="#764ba2"/>
      
      <g transform="translate(380, 320)">
        <circle cx="0" cy="0" r="20" fill="none" stroke="#f5576c" stroke-width="4"/>
        <line x1="-14" y1="-14" x2="14" y2="14" stroke="#f5576c" stroke-width="4"/>
      </g>
    </svg>
  `;
  
  return svgContent;
}

// 确保assets目录存在
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 生成不同尺寸的图标
Object.entries(iconSizes).forEach(([filename, size]) => {
  const svgContent = generateIcon(size, filename);
  const outputPath = path.join(assetsDir, filename.replace(/\.(ico|icns)$/, '.svg'));
  
  // 为每个尺寸创建SVG文件
  fs.writeFileSync(outputPath, svgContent);
  console.log(`Generated ${outputPath}`);
});

console.log('Icon generation completed!');
console.log('Note: For production, consider using proper image conversion tools like:');
console.log('- sharp (npm install sharp)');
console.log('- electron-icon-builder');
console.log('- imagemin');
