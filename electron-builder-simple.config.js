const { name, version, description, author } = require('./package.json');

module.exports = {
  appId: 'com.cuizijin.trap',
  productName: '崔子瑾诱捕器',
  copyright: `Copyright © 2024 ${author}`,
  
  directories: {
    output: 'release',
    app: 'dist'
  },
  
  files: [
    'main/**/*',
    'renderer/**/*',
    'shared/**/*',
    'database/**/*',
    'node_modules/**/*',
    'package.json'
  ],

  // 额外文件
  extraFiles: [
    {
      from: 'assets/icon.png',
      to: 'assets/icon.png'
    },
    {
      from: 'assets/tray-icon.png',
      to: 'assets/tray-icon.png'
    }
  ],
  
  // Windows 配置 - 最简单版本
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    icon: 'assets/icon.png',
    requestedExecutionLevel: 'requireAdministrator'
  },
  
  // NSIS 配置 - 最简单版本
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: '崔子瑾诱捕器'
  }
};
