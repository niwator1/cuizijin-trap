/**
 * 崔子瑾诱捕器 - Electron Builder 配置
 * 支持多平台打包、代码签名、自动更新等功能
 */

const { name, version, description, author } = require('./package.json');

module.exports = {
  appId: 'com.cuizijin.trap',
  productName: '崔子瑾诱捕器',
  copyright: `Copyright © ${new Date().getFullYear()} ${author}`,
  
  // 基础配置
  directories: {
    output: 'release',
    buildResources: 'assets'
  },
  
  // 包含的文件
  files: [
    'dist/**/*',
    'node_modules/**/*',
    'package.json',
    {
      from: 'assets',
      to: 'assets',
      filter: ['**/*']
    }
  ],
  
  // 排除的文件
  // extraFiles: [
  //   {
  //     from: 'assets/icon.png',
  //     to: 'icon.png'
  //   }
  // ], // 暂时禁用图标文件复制
  
  // 发布配置（用于自动更新）
  publish: {
    provider: 'github',
    owner: 'niwator1',
    repo: 'cuizijin-trap',
    private: false
  },
  
  // macOS 配置
  mac: {
    category: 'public.app-category.utilities',
    // icon: 'assets/icon.icns', // 暂时禁用图标
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'assets/entitlements.mac.plist',
    entitlementsInherit: 'assets/entitlements.mac.plist',
    
    // 代码签名配置
    identity: process.env.APPLE_IDENTITY || null,

    // 公证配置（注释掉，因为当前版本不支持）
    // notarize: process.env.APPLE_ID ? {
    //   teamId: process.env.APPLE_TEAM_ID,
    //   appleId: process.env.APPLE_ID,
    //   appleIdPassword: process.env.APPLE_ID_PASSWORD
    // } : false,
    
    // 目标格式
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ]
  },
  
  // DMG 配置
  dmg: {
    title: '${productName} ${version}',
    // icon: 'assets/icon.icns', // 暂时禁用图标
    background: 'assets/dmg-background.png',
    window: {
      width: 540,
      height: 380
    },
    contents: [
      {
        x: 140,
        y: 200,
        type: 'file'
      },
      {
        x: 400,
        y: 200,
        type: 'link',
        path: '/Applications'
      }
    ]
  },
  
  // Windows 配置
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    // icon: 'assets/icon.ico', // 暂时禁用图标
    requestedExecutionLevel: 'requireAdministrator',
    
    // 代码签名配置
    certificateFile: process.env.WIN_CSC_LINK || null,
    certificatePassword: process.env.WIN_CSC_KEY_PASSWORD || null,
    
    // 时间戳服务器
    timeStampServer: 'http://timestamp.digicert.com',
    
    // 文件版本信息
    verifyUpdateCodeSignature: true,
    publisherName: author
  },
  
  // NSIS 安装程序配置
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: '崔子瑾诱捕器',
    
    // 安装程序界面
    // installerIcon: 'assets/icon.ico', // 暂时禁用图标
    // uninstallerIcon: 'assets/icon.ico', // 暂时禁用图标
    // installerHeaderIcon: 'assets/icon.ico', // 暂时禁用图标
    
    // 许可协议
    license: 'LICENSE',
    
    // 安装程序语言
    language: '2052', // 简体中文
    
    // 自定义安装脚本
    include: 'assets/installer.nsh'
  },
  
  // Linux 配置
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      },
      {
        target: 'rpm',
        arch: ['x64']
      }
    ],
    // icon: 'assets/icon.png', // 暂时禁用图标
    category: 'Utility',
    desktop: {
      Name: '崔子瑾诱捕器',
      Comment: description,
      Keywords: 'website;blocker;parental;control;security;'
    }
  },
  
  // AppImage 配置
  appImage: {
    license: 'LICENSE'
  },
  
  // Debian 包配置
  deb: {
    depends: ['gconf2', 'gconf-service', 'libnotify4', 'libappindicator1', 'libxtst6', 'libnss3']
  },
  
  // RPM 包配置
  rpm: {
    depends: ['libnotify', 'libappindicator']
  },
  
  // 自动更新配置
  electronUpdaterCompatibility: '>=2.16',
  
  // 构建前后钩子
  beforeBuild: async (context) => {
    console.log('开始构建前准备...');
    // 这里可以添加构建前的自定义逻辑
  },
  
  afterPack: async (context) => {
    console.log('打包完成后处理...');
    // 这里可以添加打包后的自定义逻辑
  },
  
  afterSign: async (context) => {
    console.log('代码签名完成...');
    // 这里可以添加签名后的自定义逻辑
  }
};
