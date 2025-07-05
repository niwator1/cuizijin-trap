# 空白页面问题解决方案

## 问题描述

运行 `./quick-start.sh --china` 后，应用界面变成空白页面，无法正常显示内容。

## 根本原因

**端口不匹配问题**：
- **开发服务器**运行在端口 `5173`
- **Electron主进程**尝试连接端口 `5174`
- 导致主进程无法加载前端页面，显示空白

## 问题分析过程

### 1. 检查开发服务器状态
```bash
# 开发服务器日志显示
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.0.133:5173/
```

### 2. 检查主进程配置
```typescript
// src/main/index.ts 第129行
await mainWindow.loadURL('http://localhost:5174'); // ❌ 错误端口
```

### 3. 检查Vite配置
```typescript
// vite.config.ts
server: {
  port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 5173, // ✅ 正确端口
}
```

## 解决方案

### 修复步骤

1. **修改主进程URL配置**
   ```typescript
   // src/main/index.ts 第129行
   // 修改前
   await mainWindow.loadURL('http://localhost:5174');
   
   // 修改后
   await mainWindow.loadURL('http://localhost:5173');
   ```

2. **重新构建主进程**
   ```bash
   npm run build:main
   ```

3. **重启应用**
   ```bash
   ./quick-start.sh --stop
   ./quick-start.sh --china
   ```

### 验证结果

✅ **应用正常启动**
- Electron进程正在运行
- 开发服务器在端口5173正常运行
- 主进程成功连接到开发服务器
- 应用界面正常显示

✅ **日志确认**
```
AppController initialized successfully
✅ 应用启动成功！
```

## 技术细节

### 端口配置说明

**Vite开发服务器**：
- 默认端口：5173
- 配置文件：`vite.config.ts`
- 环境变量：`VITE_PORT`

**Electron主进程**：
- 连接URL：`http://localhost:5173`
- 配置文件：`src/main/index.ts`
- 开发模式检测：`isDevelopment`

### 启动流程

```
quick-start.sh --china
    ↓
1. 启动Vite开发服务器 (端口5173)
    ↓
2. 编译主进程代码
    ↓
3. 启动Electron应用
    ↓
4. 主进程连接开发服务器
    ↓
5. 加载React应用界面
```

## 预防措施

### 1. 统一端口配置
建议在配置文件中统一管理端口：

```typescript
// config/ports.ts
export const PORTS = {
  VITE_DEV_SERVER: 5173,
  PROXY_SERVER: 8080,
  HTTPS_PROXY: 8443
};
```

### 2. 环境变量管理
```bash
# .env.development
VITE_PORT=5173
ELECTRON_DEV_SERVER_URL=http://localhost:5173
```

### 3. 启动脚本优化
在 `quick-start.sh` 中添加端口检查：

```bash
check_port_consistency() {
    local vite_port=$(grep -o 'port.*5173' vite.config.ts)
    local electron_port=$(grep -o 'localhost:5173' src/main/index.ts)
    
    if [[ -z "$vite_port" || -z "$electron_port" ]]; then
        print_warning "端口配置可能不一致，请检查配置文件"
    fi
}
```

## 常见问题

### Q: 为什么会出现端口不匹配？
A: 可能是在开发过程中修改了配置文件，但没有同步更新所有相关文件。

### Q: 如何避免类似问题？
A: 
1. 使用环境变量统一管理端口配置
2. 在启动脚本中添加配置检查
3. 定期检查配置文件的一致性

### Q: 还有其他可能导致空白页面的原因吗？
A: 是的，还可能包括：
- 前端代码编译错误
- React组件渲染错误
- 网络连接问题
- 权限问题

## 总结

这个问题是典型的配置不一致导致的连接失败。通过修正端口配置，确保Electron主进程能够正确连接到Vite开发服务器，问题得到完全解决。

**关键教训**：
- 配置文件的一致性非常重要
- 端口配置应该集中管理
- 启动脚本应该包含配置验证
- 详细的日志有助于快速定位问题
