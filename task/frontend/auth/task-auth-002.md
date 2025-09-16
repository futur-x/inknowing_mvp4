# Task-AUTH-002: Token管理与自动刷新机制

## 任务信息
- **Task ID**: AUTH-002
- **Title**: 实现JWT Token管理和自动刷新
- **Priority**: P0
- **Estimated Hours**: 4-5小时
- **Dependencies**: BASE-002, BASE-003, AUTH-001

## UI/UX需求
### 用户体验要求
- Token过期时自动刷新，用户无感知
- 刷新失败时友好提示并引导重新登录
- 多标签页Token状态同步
- 登录状态持久化（记住我功能）

### 状态指示
- 认证状态变化时更新UI（头像、菜单等）
- Token刷新时不显示加载状态
- 仅在最终失败时提示用户

## 技术需求
### Token存储策略
```typescript
interface TokenStorage {
  // Access Token: 内存 + sessionStorage
  accessToken: string | null;
  accessTokenExpiry: number;

  // Refresh Token: localStorage (加密存储)
  refreshToken: string | null;
  refreshTokenExpiry: number;

  // Remember Me: 持久化选项
  rememberMe: boolean;
}

// 安全存储实现
class SecureTokenStorage {
  private encryptToken(token: string): string;
  private decryptToken(encrypted: string): string;

  setTokens(tokens: AuthTokens, remember: boolean): void;
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  clearTokens(): void;
}
```

### Token刷新机制
```typescript
// lib/auth/token-manager.ts
class TokenManager {
  private refreshPromise: Promise<string> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  // 自动刷新逻辑
  scheduleRefresh(expiryTime: number): void {
    const now = Date.now();
    const delay = expiryTime - now - (5 * 60 * 1000); // 提前5分钟刷新

    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, Math.max(delay, 0));
  }

  // 防止并发刷新
  async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<string> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      throw new AuthError('No refresh token');
    }

    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken
    });

    this.storage.setTokens(response.data);
    this.scheduleRefresh(response.data.expires_at);

    return response.data.access_token;
  }
}
```

### 请求拦截器集成
```typescript
// lib/api/interceptors.ts
const setupAuthInterceptor = (tokenManager: TokenManager) => {
  // 请求拦截器 - 添加Token
  api.interceptors.request.use(
    async (config) => {
      const token = tokenManager.getAccessToken();

      if (token && !tokenManager.isExpired()) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (tokenManager.hasRefreshToken()) {
        // Token过期，尝试刷新
        try {
          const newToken = await tokenManager.refreshAccessToken();
          config.headers.Authorization = `Bearer ${newToken}`;
        } catch (error) {
          // 刷新失败，跳转登录
          tokenManager.handleAuthFailure();
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // 响应拦截器 - 处理401
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await tokenManager.refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          tokenManager.handleAuthFailure();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};
```

### 多标签页同步
```typescript
// lib/auth/tab-sync.ts
class TabSyncManager {
  private channel: BroadcastChannel;

  constructor() {
    this.channel = new BroadcastChannel('auth-sync');
    this.setupListeners();
  }

  // 监听其他标签页的认证事件
  private setupListeners(): void {
    this.channel.onmessage = (event) => {
      switch (event.data.type) {
        case 'LOGIN':
          this.handleRemoteLogin(event.data.tokens);
          break;
        case 'LOGOUT':
          this.handleRemoteLogout();
          break;
        case 'TOKEN_REFRESH':
          this.handleRemoteRefresh(event.data.token);
          break;
      }
    };
  }

  // 广播认证事件
  broadcastLogin(tokens: AuthTokens): void {
    this.channel.postMessage({ type: 'LOGIN', tokens });
  }

  broadcastLogout(): void {
    this.channel.postMessage({ type: 'LOGOUT' });
  }

  broadcastRefresh(token: string): void {
    this.channel.postMessage({ type: 'TOKEN_REFRESH', token });
  }
}
```

### Zustand Store集成
```typescript
// stores/auth-store.ts
interface AuthStore {
  // Token管理器实例
  private tokenManager: TokenManager;
  private tabSync: TabSyncManager;

  // 初始化
  initialize: () => void;

  // 认证方法（自动处理Token）
  login: async (credentials: LoginCredentials) => {
    const response = await authAPI.login(credentials);

    // 存储Token
    this.tokenManager.setTokens(response.tokens, credentials.rememberMe);

    // 设置自动刷新
    this.tokenManager.scheduleRefresh(response.tokens.expires_at);

    // 同步到其他标签页
    this.tabSync.broadcastLogin(response.tokens);

    // 更新状态
    set({ isAuthenticated: true, user: response.user });
  };

  logout: async () => {
    // 调用登出API
    await authAPI.logout();

    // 清除Token
    this.tokenManager.clearTokens();

    // 广播登出事件
    this.tabSync.broadcastLogout();

    // 重置状态
    set({ isAuthenticated: false, user: null });
  };
}
```

## 组件规范
### AuthProvider组件
```typescript
interface AuthProviderProps {
  children: React.ReactNode;
}

// 功能：
// - 初始化Token管理器
// - 恢复认证状态
// - 设置拦截器
// - 监听标签页同步
```

### ProtectedRoute组件
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: string;
  requiredRole?: UserRole;
}

// 功能：
// - 检查认证状态
// - 验证用户权限
// - 未认证时跳转登录
```

### SessionExpireModal组件
```typescript
interface SessionExpireModalProps {
  onRelogin: () => void;
  onLogout: () => void;
}

// 功能：
// - 会话过期提示
// - 提供重新登录选项
// - 倒计时自动登出
```

## 验收标准
### 功能要求
- [ ] Token自动刷新工作正常
- [ ] 401响应自动重试
- [ ] 多标签页状态同步
- [ ] Token安全存储
- [ ] 记住我功能正常

### 性能要求
- [ ] Token刷新不阻塞请求
- [ ] 避免Token刷新竞态
- [ ] 刷新失败快速降级
- [ ] 内存泄漏防护

### 安全要求
- [ ] Refresh Token加密存储
- [ ] XSS防护
- [ ] CSRF Token实现
- [ ] Token过期时间合理

## 测试用例
### 单元测试
```typescript
describe('TokenManager', () => {
  it('应该自动刷新即将过期的Token', async () => {
    // 设置即将过期的Token
    // 验证自动刷新触发
  });

  it('应该防止并发Token刷新', async () => {
    // 模拟多个并发请求
    // 验证只刷新一次
  });

  it('应该处理刷新失败', async () => {
    // 模拟刷新失败
    // 验证降级处理
  });
});
```

### 集成测试
```typescript
describe('Auth Interceptor', () => {
  it('应该自动添加Authorization头', async () => {
    // 验证请求头
  });

  it('应该处理401响应并重试', async () => {
    // 模拟401响应
    // 验证自动刷新和重试
  });
});
```

## 实施步骤
1. 创建TokenManager类
2. 实现安全存储机制
3. 配置自动刷新逻辑
4. 集成请求拦截器
5. 实现标签页同步
6. 更新AuthStore
7. 创建AuthProvider
8. 实现ProtectedRoute
9. 添加会话过期处理
10. 编写测试用例

## 相关文档引用
- api-specification.yaml: 第132-157行（Token刷新API）
- sequence-diagram.md: Token刷新时序
- devDocument.md: 认证状态管理要求