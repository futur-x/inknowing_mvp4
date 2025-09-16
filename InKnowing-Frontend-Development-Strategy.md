# InKnowing MVP 4.0 前端开发策略

## 🎯 项目概述

基于.futurxlab/目录完整架构文档分析，严格遵循业务逻辑守恒原理，为InKnowing MVP 4.0制定的全面前端开发策略。确保前端实现与用户旅程、时序图、状态图和API规范保持完全一致性。

**核心配置要求**：
- 前端开发服务器：端口3555
- 后端API服务器：端口8888
- 技术栈：Next.js 15 + App Router + Zustand + TypeScript

---

## 📋 业务逻辑核心 (Business Logic Conservation)

### 不变业务逻辑
1. **问题驱动发现** → 用户通过问题找到相关书籍
2. **智能对话互动** → 与书籍内容和角色进行AI对话
3. **分层权限体系** → 匿名→免费→付费的递进权限
4. **内容生态建设** → 用户上传书籍丰富平台

### 用户状态映射
- **匿名用户**: 浏览、搜索（只读权限）
- **免费用户**: 20次对话/天
- **付费用户**: 增强配额 + 上传权限
  - Basic: 200次/月
  - Premium: 500次/月
  - Super: 1000次/月

---

## 🛠 技术架构

### 核心技术栈
- **框架**: Next.js 15 + App Router (React 19)
- **状态管理**: Zustand + persist middleware
- **样式**: Tailwind CSS + Shadcn/ui
- **数据获取**: SWR + native fetch
- **实时通信**: WebSocket + 重连机制
- **类型安全**: TypeScript + strict mode

### 项目结构
```
src/
├── app/                    # Next.js App Router pages
├── components/            # 可复用UI组件
│   ├── ui/               # 基础UI组件 (Shadcn/ui)
│   ├── forms/            # 表单组件
│   ├── chat/             # 对话相关组件
│   └── layout/           # 布局和导航组件
├── lib/                  # 工具函数和配置
│   ├── api.ts           # API客户端封装
│   ├── websocket.ts     # WebSocket管理
│   ├── auth.ts          # 认证工具
│   └── utils.ts         # 通用工具函数
├── stores/              # Zustand状态管理
│   ├── auth.ts          # 认证状态
│   ├── user.ts          # 用户信息状态
│   └── chat.ts          # 对话状态
├── types/               # TypeScript类型定义
└── hooks/               # 自定义React hooks
```

---

## 🗺 路由架构 (端口3555配置)

### 页面路由映射
基于用户旅程完整映射的路由结构：

```
/                          # 首页 - 匿名用户入口点
├── search?q=...          # 问题搜索 → GET /search
├── books/                # 书籍浏览
│   ├── popular           # 热门书籍 → GET /books/popular
│   └── [bookId]          # 书籍详情 → GET /books/{bookId}
│       └── characters    # 角色列表 → GET /books/{bookId}/characters
├── auth/                 # 认证流程
│   ├── login            # 登录页面 → POST /auth/login
│   ├── register         # 注册页面 → POST /auth/register
│   └── verify           # 验证码页面 → POST /auth/verify-code
├── chat/                # 对话系统
│   ├── book/[sessionId] # 书籍对话 → WS /ws/dialogue/{sessionId}
│   └── character/[sessionId] # 角色对话
├── profile/             # 用户中心
│   ├── membership       # 会员管理 → GET /users/membership
│   ├── history          # 对话历史 → GET /dialogues/history
│   └── uploads          # 上传管理 → GET /uploads/my
├── upload/              # 书籍上传 → POST /uploads
│   └── [uploadId]       # 上传状态 → GET /uploads/{uploadId}
└── payment/             # 支付流程
    └── [orderId]        # 支付状态 → GET /payment/orders/{orderId}
```

### 端口配置
```javascript
// next.config.js
const nextConfig = {
  // API代理配置 (前端3555 → 后端8888)
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8888/v1/:path*',
      },
      {
        source: '/ws/:path*',
        destination: 'http://localhost:8888/ws/:path*',
      },
    ]
  },

  env: {
    API_BASE_URL: 'http://localhost:8888/v1',
    WS_BASE_URL: 'ws://localhost:8888/ws',
  }
}

// package.json scripts
{
  "dev": "next dev -p 3555",
  "start": "next start -p 3555"
}
```

---

## 🧩 组件架构映射

### 业务组件与API映射表

| 业务功能 | 主要组件 | API集成 | 状态管理 |
|---------|----------|---------|----------|
| **搜索发现** | `SearchBar`, `BookGrid`, `ResultCard` | GET /search, GET /books | 本地搜索状态 |
| **用户认证** | `LoginForm`, `RegisterForm`, `VerifyCode` | POST /auth/* | Zustand auth store |
| **书籍详情** | `BookDetails`, `CharacterList`, `ActionButtons` | GET /books/{id} | SWR缓存 |
| **对话系统** | `ChatInterface`, `MessageBubble`, `InputBox` | WS /ws/dialogue/* | Zustand chat store |
| **会员系统** | `MembershipCard`, `UpgradeModal`, `PlanSelector` | GET /users/membership | Zustand user store |
| **文件上传** | `UploadZone`, `ProgressBar`, `StatusIndicator` | POST /uploads | 本地上传状态 |
| **支付流程** | `PaymentForm`, `QRCode`, `StatusPoller` | POST /users/membership/upgrade | 本地支付状态 |

### 状态结构设计

```typescript
// Zustand全局状态结构
interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (credentials: LoginData) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

interface UserStore {
  profile: UserProfile | null
  membership: Membership | null
  quota: QuotaInfo | null
  updateProfile: (data: ProfileData) => Promise<void>
  fetchMembership: () => Promise<void>
}

interface ChatStore {
  activeSessions: Map<string, ChatSession>
  currentSession: string | null
  createSession: (type: 'book' | 'character', targetId: string) => Promise<string>
  sendMessage: (sessionId: string, message: string) => Promise<void>
  closeSession: (sessionId: string) => void
}
```

---

## 🔌 API集成策略

### 认证机制
- **JWT Token**: 存储在localStorage和Zustand store
- **自动刷新**: refresh token自动续期机制
- **请求拦截**: Axios interceptor统一处理token

### 数据获取策略
- **服务器组件**: SEO关键页面数据预取
- **SWR**: 客户端数据获取和智能缓存
- **WebSocket**: 实时对话消息传递
- **错误处理**: 全局错误边界和友好提示

### WebSocket连接管理
```typescript
// WebSocket连接管理示例
class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(sessionId: string) {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/dialogue/${sessionId}`
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = this.handleOpen
    this.ws.onmessage = this.handleMessage
    this.ws.onclose = this.handleClose
    this.ws.onerror = this.handleError
  }

  // 自动重连逻辑
  private handleClose = () => {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++
        this.connect(sessionId)
      }, 1000 * Math.pow(2, this.reconnectAttempts))
    }
  }
}
```

---

## 🔒 安全与权限控制

### 路由守卫
```typescript
// 认证保护组件
export default function AuthGuard({
  children,
  requireAuth = true,
  allowedRoles = ['user']
}: AuthGuardProps) {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user && !allowedRoles.includes(user.role)) {
      router.push('/unauthorized')
      return
    }
  }, [isAuthenticated, user, router])

  if (requireAuth && !isAuthenticated) {
    return <LoadingSpinner />
  }

  return <>{children}</>
}
```

### 会员权限控制
- 基于用户等级的组件显示控制
- 配额检查和升级提示
- 功能访问权限验证

---

## 🚀 性能优化策略

### 代码分割与懒加载
- 路由级自动代码分割
- React.lazy()用于大型组件
- 第三方库按需导入

### 缓存策略
- **静态数据**: Next.js force-cache
- **用户数据**: SWR智能缓存
- **图片优化**: Next.js Image组件

### 响应式设计
- 移动端优先设计
- Tailwind响应式断点
- 无障碍性支持(ARIA)

---

## 📅 开发实施路线图

### Phase 1: 基础架构 (Week 1-2)
- [x] 项目初始化和配置
- [x] 路由架构搭建
- [x] 状态管理设计
- [ ] 基础UI组件库

### Phase 2: 核心功能 (Week 3-4)
- [ ] 用户认证系统
- [ ] 书籍浏览和搜索
- [ ] 基础对话界面

### Phase 3: 高级功能 (Week 5-6)
- [ ] WebSocket实时对话
- [ ] 会员系统集成
- [ ] 文件上传功能

### Phase 4: 优化与测试 (Week 7-8)
- [ ] 性能优化
- [ ] 移动端适配
- [ ] 全面测试

---

## ⚠️ 风险评估与应对

### 技术风险
- **WebSocket稳定性**: 实现健壮重连机制
- **状态同步复杂性**: 严格的状态管理规范
- **移动端适配**: 响应式设计测试

### 业务风险
- **用户体验一致性**: 严格UI/UX设计规范
- **支付流程稳定性**: 充分的错误处理
- **实时性能**: WebSocket连接优化

### 应对策略
- 完善的错误边界和降级策略
- 全面的单元测试和集成测试
- 性能监控和错误追踪

---

## 📊 开发规范与最佳实践

### 代码规范
- TypeScript strict mode
- ESLint + Prettier配置
- Git commit规范
- 组件文档化

### 测试策略
- Jest单元测试
- React Testing Library组件测试
- Playwright端到端测试
- 性能测试和监控

---

## 🎉 总结

本前端开发策略完全基于.futurxlab/目录下的三图一端文档分析，确保：

✅ **业务逻辑守恒**: 前端实现与架构文档保持完全一致
✅ **端口配置**: 前端3555，后端8888，避免冲突
✅ **技术先进性**: 使用最新稳定的Next.js 15和React 19
✅ **可扩展性**: 预留充分的扩展空间
✅ **用户体验**: 优先考虑响应式和无障碍设计

该策略为InKnowing MVP 4.0的前端开发提供了完整、可执行的指导方案，确保高质量交付和未来扩展性。

---

*文档版本: 1.0 | 创建时间: 2025-09-16 | 作者: Thomas (FuturX Development Engineer)*