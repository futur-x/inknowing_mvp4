# Task-BASE-002: API客户端与请求拦截器配置

## 任务信息
- **Task ID**: BASE-002
- **Title**: 配置Axios客户端和请求/响应拦截器
- **Priority**: P0
- **Estimated Hours**: 3-4小时
- **Dependencies**: BASE-001

## UI/UX需求
### 加载状态展示
- 全局加载指示器（顶部进度条）
- 局部加载状态（按钮、卡片内）
- 请求错误Toast提示
- 网络断开提示横幅

### 错误提示设计
- 使用shadcn/ui Toast组件
- 错误类型区分（网络错误、业务错误、认证错误）
- 错误提示持续时间：3-5秒
- 支持手动关闭

## 技术需求
### API客户端架构
```typescript
// lib/api/client.ts
interface ApiConfig {
  baseURL: string;
  timeout: number;
  withCredentials: boolean;
}

interface ApiError {
  code: string;
  message: string;
  details?: any;
}
```

### 请求拦截器功能
- 自动添加Authorization header
- 添加请求ID用于追踪
- 请求超时设置（默认10秒）
- 请求重试机制（可配置）

### 响应拦截器功能
- Token过期自动刷新
- 统一错误处理
- 响应数据标准化
- 请求日志记录（开发环境）

### API模块化设计
```typescript
// lib/api/modules/auth.ts
export const authAPI = {
  register: (data: RegisterDTO) => Promise<AuthResponse>,
  login: (data: LoginDTO) => Promise<AuthResponse>,
  logout: () => Promise<void>,
  refreshToken: () => Promise<TokenResponse>,
  verifyCode: (phone: string) => Promise<void>
};

// lib/api/modules/books.ts
export const booksAPI = {
  getList: (params: BookListParams) => Promise<BookList>,
  getDetail: (id: string) => Promise<BookDetail>,
  getPopular: () => Promise<Book[]>,
  getCharacters: (bookId: string) => Promise<Character[]>
};
```

## 组件规范
### RequestLoadingBar组件
```typescript
interface LoadingBarProps {
  isLoading: boolean;
  color?: string;
  height?: number;
}

// 功能：
// - 显示页面顶部加载进度条
// - 自动跟踪API请求状态
// - 支持手动控制
```

### NetworkStatusBanner组件
```typescript
interface NetworkStatusProps {
  onRetry?: () => void;
}

// 功能：
// - 监听网络状态
// - 显示离线提示
// - 提供重试按钮
```

### ErrorToast组件扩展
```typescript
interface ErrorToastConfig {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

// 功能：
// - 显示不同类型错误
// - 支持操作按钮
// - 自动消失或手动关闭
```

## 验收标准
### 功能要求
- [ ] Axios客户端正确配置
- [ ] 请求拦截器自动添加token
- [ ] 响应拦截器处理401自动刷新token
- [ ] 全局错误处理机制工作正常
- [ ] API模块按业务领域划分
- [ ] 支持请求取消功能

### 错误处理
- [ ] 网络错误正确捕获并提示
- [ ] 业务错误码映射到友好提示
- [ ] Token过期自动刷新，无感知
- [ ] 请求超时提示并可重试

### 性能优化
- [ ] 实现请求缓存机制
- [ ] 防止重复请求
- [ ] 请求队列管理
- [ ] 大文件上传进度跟踪

## 测试用例
### 单元测试
```typescript
describe('API Client', () => {
  it('应该正确添加认证头', async () => {
    // 测试Authorization header
  });

  it('应该处理token过期并刷新', async () => {
    // 测试401响应处理
  });

  it('应该正确处理网络错误', async () => {
    // 测试网络异常
  });

  it('应该实现请求重试', async () => {
    // 测试重试机制
  });
});
```

### 集成测试
- 测试完整的认证流程
- 测试错误提示展示
- 测试加载状态管理
- 测试请求取消功能

## 实施步骤
1. 安装axios和相关依赖
2. 创建API客户端基础配置
3. 实现请求拦截器
4. 实现响应拦截器
5. 创建API模块（auth、books、users等）
6. 实现全局加载状态管理
7. 配置错误处理和提示
8. 添加网络状态监听
9. 实现请求缓存和防重
10. 编写测试用例

## API映射参考
基于api-specification.yaml的端点映射：

| 模块 | 端点 | 方法名 |
|-----|------|--------|
| Auth | POST /auth/register | authAPI.register() |
| Auth | POST /auth/login | authAPI.login() |
| Auth | POST /auth/refresh | authAPI.refreshToken() |
| Users | GET /users/profile | userAPI.getProfile() |
| Users | GET /users/quota | userAPI.getQuota() |
| Books | GET /books | booksAPI.getList() |
| Books | GET /books/{id} | booksAPI.getDetail() |
| Dialogues | POST /dialogues/book/start | dialogueAPI.startBookChat() |

## 相关文档引用
- api-specification.yaml: 所有API端点定义
- sequence-diagram.md: API调用时序
- devDocument.md: 第610-623行（技术架构）