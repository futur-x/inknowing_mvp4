# InKnowing 前后端集成测试总览

## 测试目标
确保 InKnowing 平台的前后端完全对接成功，所有用户旅程能够顺畅运行。

## 系统架构
- **前端**: Next.js 15 (http://localhost:3555)
- **后端**: FastAPI (http://localhost:8888)
- **数据库**: PostgreSQL
- **实时通信**: WebSocket
- **API前缀**: `/v1`

## 测试文件清单

### Phase 1: 基础功能集成
1. **[01-discovery-flow-integration.md](./01-discovery-flow-integration.md)**
   - 匿名用户浏览功能
   - 搜索和发现机制
   - 书籍列表和详情

### Phase 2: 用户系统集成
2. **[02-auth-flow-integration.md](./02-auth-flow-integration.md)**
   - 用户注册（手机号）
   - 登录/登出
   - Token 管理
   - 用户资料

### Phase 3: 核心业务集成
3. **[03-dialogue-flow-integration.md](./03-dialogue-flow-integration.md)**
   - 书籍对话
   - 角色对话
   - WebSocket 实时通信
   - 配额管理

### Phase 4: 商业化集成
4. **[04-membership-upgrade-integration.md](./04-membership-upgrade-integration.md)**
   - 会员套餐展示
   - 升级流程
   - 支付集成
   - 权益激活

### Phase 5: 增值功能集成
5. **[05-book-upload-integration.md](./05-book-upload-integration.md)**
   - 上传权限验证
   - 文件上传处理
   - 处理状态追踪
   - 书籍管理

## 关键集成点

### API 路径映射
```yaml
前端请求路径:
  - /api/* → 废弃
  - /v1/* → 正确路径

后端端点:
  - http://localhost:8888/v1/auth/*
  - http://localhost:8888/v1/users/*
  - http://localhost:8888/v1/books/*
  - http://localhost:8888/v1/dialogues/*
  - http://localhost:8888/v1/upload/*
```

### 认证机制
```yaml
JWT Token:
  - 存储位置: localStorage
  - 请求头: Authorization: Bearer {token}
  - 自动刷新: refresh token 机制
```

### WebSocket 连接
```yaml
对话 WebSocket:
  - URL: ws://localhost:8888/ws/dialogue/{sessionId}
  - 认证: 通过 URL 参数传递 token

上传状态 WebSocket:
  - URL: ws://localhost:8888/ws/upload/{uploadId}
```

## 测试环境配置

### 后端配置
```python
# settings.py
ENVIRONMENT = "test"
SMS_VERIFICATION_CODE = "123456"  # 测试环境固定验证码
JWT_SECRET_KEY = "test-secret-key"
DATABASE_URL = "postgresql://..."
```

### 前端配置
```typescript
// next.config.ts
env: {
  API_BASE_URL: 'http://localhost:8888/v1',
  WS_BASE_URL: 'ws://localhost:8888/ws',
}
```

## 执行顺序建议

1. **环境准备**
   - 启动后端服务
   - 启动前端服务
   - 初始化数据库
   - 准备测试数据

2. **基础测试**（不需要登录）
   - 01-discovery-flow

3. **认证测试**
   - 02-auth-flow

4. **功能测试**（需要登录）
   - 03-dialogue-flow
   - 04-membership-upgrade
   - 05-book-upload

## 常见问题修复记录

### 已解决
- ✅ CORS 配置错误
- ✅ API 路径前缀不匹配 (/api → /v1)
- ✅ Enum 值传递错误 (FREE → free)
- ✅ Token 刷新机制
- ✅ 用户状态同步

### 待解决
- ⏳ WebSocket 断线重连
- ⏳ 文件上传进度追踪
- ⏳ 支付回调验证
- ⏳ 并发请求处理

## 测试工具
- **手动测试**: 浏览器 + 开发者工具
- **自动化测试**: Playwright
- **API 测试**: Postman/Thunder Client
- **性能测试**: Lighthouse

## 成功标准
- 所有 API 调用返回正确状态码
- 无 CORS 错误
- 无控制台错误
- 用户流程顺畅
- 实时功能响应 < 100ms
- 页面加载时间 < 3s

---
更新时间: 2025-01-17
维护者: Thomas (FuturX Developer)