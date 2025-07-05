# 贡献指南 🤝

感谢您对"崔子瑾诱捕器"项目的关注！我们欢迎各种形式的贡献。

## 🚀 如何贡献

### 报告问题
1. 在提交新问题前，请先搜索现有的 Issues
2. 使用清晰、描述性的标题
3. 提供详细的问题描述，包括：
   - 操作系统和版本
   - 应用版本
   - 重现步骤
   - 预期行为和实际行为
   - 错误截图（如有）

### 功能建议
1. 检查是否已有类似的功能请求
2. 详细描述建议的功能
3. 说明为什么这个功能有用
4. 如果可能，提供实现思路

### 代码贡献

#### 开发环境设置
```bash
# 克隆仓库
git clone https://github.com/your-username/cuizijin-trap.git
cd cuizijin-trap

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

#### 提交流程
1. Fork 项目到您的 GitHub 账户
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 进行您的修改
4. 运行测试：`npm test`
5. 提交更改：`git commit -m 'Add some amazing feature'`
6. 推送分支：`git push origin feature/amazing-feature`
7. 创建 Pull Request

## 📋 代码规范

### TypeScript/JavaScript
- 使用 TypeScript 进行类型安全
- 遵循 ESLint 配置
- 使用 Prettier 格式化代码
- 变量和函数使用驼峰命名
- 常量使用大写下划线命名

### React 组件
- 使用函数组件和 Hooks
- 组件名使用 PascalCase
- Props 接口以 Props 结尾
- 使用 TypeScript 定义 Props 类型

### 提交信息
使用约定式提交格式：
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

类型：
- `feat`: 新功能
- `fix`: 修复问题
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat(auth): add password strength validation
fix(proxy): resolve connection timeout issue
docs(readme): update installation instructions
```

## 🧪 测试

### 运行测试
```bash
# 运行所有测试
npm test

# 运行 Electron 测试
npm run test:electron

# 运行带界面的测试
npm run test:electron:headed
```

### 编写测试
- 为新功能编写单元测试
- 为 UI 组件编写集成测试
- 使用 Playwright 进行端到端测试
- 测试文件放在 `tests/` 目录下

## 📦 构建和发布

### 本地构建
```bash
# 构建应用
npm run build

# 打包应用
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

### 发布流程
1. 更新版本号：`npm version patch/minor/major`
2. 更新 CHANGELOG.md
3. 创建 Pull Request
4. 合并后创建 Release 标签

## 🔒 安全

### 报告安全问题
如果发现安全漏洞，请：
1. **不要**在公开的 Issue 中报告
2. 发送邮件到项目维护者
3. 提供详细的漏洞描述
4. 等待回复后再公开讨论

### 安全最佳实践
- 不在代码中硬编码敏感信息
- 使用环境变量存储配置
- 定期更新依赖包
- 遵循最小权限原则

## 📖 文档

### 文档更新
- 更新相关的 README 文件
- 添加或更新 JSDoc 注释
- 更新用户指南和开发文档
- 确保示例代码可以正常运行

### 文档结构
```
docs/
├── 用户指南.md
├── 开发指南.md
├── API文档.md
├── 故障排除.md
└── 更新日志.md
```

## 🎯 项目目标

我们致力于创建：
- 🛡️ 安全可靠的网站访问控制工具
- 🌍 跨平台兼容的桌面应用
- 🎨 用户友好的界面设计
- 🔧 易于维护和扩展的代码架构

## 💬 社区

### 交流渠道
- GitHub Issues：问题报告和功能讨论
- GitHub Discussions：一般性讨论
- Pull Requests：代码审查和讨论

### 行为准则
- 尊重所有参与者
- 保持建设性的讨论
- 欢迎新手参与
- 遵循开源精神

## 🙏 致谢

感谢所有为项目做出贡献的开发者！

---

如有任何问题，请随时在 Issues 中提出或联系项目维护者。
