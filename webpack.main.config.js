const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = [
  // 主进程配置
  {
    target: 'electron-main',
    entry: './src/main/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'index.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@main': path.resolve(__dirname, 'src/main'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.main.json'
            }
          },
          exclude: [/node_modules/, /src\/renderer/],
        },
      ],
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: {
      'better-sqlite3': 'commonjs better-sqlite3',
      'bcrypt': 'commonjs bcrypt',
      'node-forge': 'commonjs node-forge',
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'src/main/database/schema.sql',
            to: 'database/schema.sql'
          }
        ]
      })
    ],
    devtool: 'source-map',
  },
  // Preload脚本配置
  {
    target: 'electron-preload',
    entry: './src/main/preload.ts',
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'preload.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@main': path.resolve(__dirname, 'src/main'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.main.json'
            }
          },
          exclude: [/node_modules/, /src\/renderer/],
        },
      ],
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: {
      'electron': 'commonjs electron',
    },
    devtool: 'source-map',
  }
];
