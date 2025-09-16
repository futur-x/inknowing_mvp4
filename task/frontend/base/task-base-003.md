# Task-BASE-003: Zustand状态管理架构设计

## 任务信息
- **Task ID**: BASE-003
- **Title**: 设计和实现Zustand全局状态管理
- **Priority**: P0
- **Estimated Hours**: 4-5小时
- **Dependencies**: BASE-001

## UI/UX需求
### 状态驱动的UI更新
- 用户登录状态实时同步到所有组件
- 对话历史列表自动更新
- 会员状态变化立即反映在UI
- 配额使用情况实时展示

### 状态持久化
- 用户偏好设置本地存储
- 对话草稿自动保存
- 搜索历史记录保存
- 登录状态会话保持

## 技术需求
### Store架构设计
```typescript
// stores/index.ts
interface StoreArchitecture {
  authStore: AuthStore;      // 认证状态
  userStore: UserStore;      // 用户信息
  bookStore: BookStore;      // 书籍数据
  dialogueStore: DialogueStore; // 对话管理
  uiStore: UIStore;          // UI状态
  membershipStore: MembershipStore; // 会员状态
}
```

### 认证Store (authStore)
```typescript
interface AuthStore {
  // 状态
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  checkAuthStatus: () => void;
}
```

### 用户Store (userStore)
```typescript
interface UserStore {
  // 状态
  profile: UserProfile | null;
  quota: QuotaInfo | null;
  preferences: UserPreferences;

  // Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  fetchQuota: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}
```

### 书籍Store (bookStore)
```typescript
interface BookStore {
  // 状态
  books: Map<string, Book>;
  popularBooks: Book[];
  searchResults: SearchResult[];
  currentBook: Book | null;
  loading: boolean;

  // Actions
  fetchBooks: (params?: BookParams) => Promise<void>;
  fetchBookDetail: (bookId: string) => Promise<void>;
  searchBooks: (query: string) => Promise<void>;
  setCurrentBook: (book: Book | null) => void;
  clearSearch: () => void;
}
```

### 对话Store (dialogueStore)
```typescript
interface DialogueStore {
  // 状态
  sessions: Map<string, DialogueSession>;
  currentSession: DialogueSession | null;
  messages: Message[];
  isTyping: boolean;

  // Actions
  startBookDialogue: (bookId: string) => Promise<void>;
  startCharacterDialogue: (characterId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  endSession: () => void;
}
```

### UI Store (uiStore)
```typescript
interface UIStore {
  // 状态
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  modalStack: Modal[];
  toasts: Toast[];
  globalLoading: boolean;

  // Actions
  toggleSidebar: () => void;
  openModal: (modal: Modal) => void;
  closeModal: (id?: string) => void;
  showToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
  setGlobalLoading: (loading: boolean) => void;
}
```

### 持久化配置
```typescript
// lib/store-persist.ts
const persistConfig = {
  name: 'inknowing-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    // 只持久化必要的状态
    auth: { refreshToken: state.auth.refreshToken },
    user: { preferences: state.user.preferences },
    ui: { theme: state.ui.theme }
  })
};
```

## 组件规范
### StoreProvider组件
```typescript
interface StoreProviderProps {
  children: React.ReactNode;
  initialState?: Partial<RootStore>;
}

// 功能：
// - 提供全局store context
// - 初始化store状态
// - 配置开发工具
```

### useStore Hook
```typescript
// 基础hook
function useStore<T>(selector: (state: RootStore) => T): T;

// 专用hooks
function useAuth(): AuthStore;
function useUser(): UserStore;
function useBooks(): BookStore;
function useDialogue(): DialogueStore;
function useUI(): UIStore;
```

### DevTools集成
```typescript
interface DevToolsConfig {
  name: string;
  enabled: boolean;
  trace: boolean;
  traceLimit: number;
}

// 功能：
// - 开发环境自动启用
// - 支持时间旅行调试
// - Action日志记录
```

## 验收标准
### 功能要求
- [ ] 所有store模块正确创建
- [ ] 状态更新触发组件重渲染
- [ ] 持久化功能正常工作
- [ ] DevTools集成完成
- [ ] TypeScript类型完整

### 性能要求
- [ ] 使用shallow比较优化渲染
- [ ] 大列表数据使用Map结构
- [ ] 避免不必要的深拷贝
- [ ] 异步action正确处理

### 开发体验
- [ ] 清晰的action命名
- [ ] 完整的TypeScript提示
- [ ] 便捷的hooks访问
- [ ] 良好的错误处理

## 测试用例
### 单元测试
```typescript
describe('Auth Store', () => {
  it('应该正确处理登录流程', async () => {
    // 测试登录状态变化
  });

  it('应该自动刷新token', async () => {
    // 测试token刷新逻辑
  });

  it('应该持久化认证状态', () => {
    // 测试localStorage持久化
  });
});

describe('Dialogue Store', () => {
  it('应该管理对话会话', async () => {
    // 测试会话创建和切换
  });

  it('应该正确处理消息发送', async () => {
    // 测试消息状态更新
  });
});
```

### 集成测试
- 测试多store协作
- 测试持久化和恢复
- 测试实时状态同步
- 测试错误恢复机制

## 实施步骤
1. 安装zustand及相关依赖
2. 创建store目录结构
3. 实现authStore
4. 实现userStore
5. 实现bookStore
6. 实现dialogueStore
7. 实现uiStore和membershipStore
8. 配置持久化
9. 创建便捷hooks
10. 集成Redux DevTools
11. 编写测试用例

## 状态流转映射
基于state-diagram.md的状态转换：

| 用户状态 | Store状态 | 触发Action |
|---------|----------|-----------|
| Anonymous | authStore.isAuthenticated = false | - |
| Registering | authStore.registering = true | authStore.register() |
| Authenticated | authStore.isAuthenticated = true | authStore.login() |
| FreeUser | userStore.membershipTier = 'free' | userStore.fetchProfile() |
| PaidMember | userStore.membershipTier = 'paid' | membershipStore.upgrade() |
| InDialogue | dialogueStore.currentSession != null | dialogueStore.startDialogue() |

## 相关文档引用
- state-diagram.md: 完整的状态转换逻辑
- user-journey-diagram.md: 用户状态流转
- devDocument.md: 第608行（状态管理要求）