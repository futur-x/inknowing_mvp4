# Task-AUTH-001: 登录注册页面开发

## 任务信息
- **Task ID**: AUTH-001
- **Title**: 实现登录注册统一页面
- **Priority**: P0
- **Estimated Hours**: 6-8小时
- **Dependencies**: BASE-001, BASE-002, BASE-003

## UI/UX需求
### 页面布局（基于devDocument.md第6-11行，第74-75行）
- **URL**: /auth/login 和 /auth/register
- **设计风格**: 居中卡片式布局，amber主题
- **响应式设计**:
  - 移动端：全屏表单
  - 桌面端：居中卡片（最大宽度450px）

### 视觉设计
```
页面结构：
┌─────────────────────────────────┐
│         InKnowing Logo          │
│    "知识，从对话开始"            │
│                                 │
│  ┌───────────────────────────┐  │
│  │    [登录] [注册] 切换Tab   │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │   微信一键登录 (大按钮)     │  │
│  └───────────────────────────┘  │
│         — 或者 —                │
│  ┌───────────────────────────┐  │
│  │   手机号输入框              │  │
│  │   验证码输入 + 获取按钮     │  │
│  │   [登录/注册] 按钮         │  │
│  └───────────────────────────┘  │
│                                 │
│  用户协议和隐私政策链接          │
└─────────────────────────────────┘
```

### 交互细节
1. **Tab切换**: 登录/注册使用Tab组件切换
2. **微信登录**: 优先展示，一键跳转授权
3. **手机验证码**:
   - 60秒倒计时
   - 防重复点击
   - 格式验证（11位手机号）
4. **表单验证**: 实时验证，友好错误提示

## 技术需求
### 组件结构
```typescript
// app/auth/page.tsx
interface AuthPageProps {
  searchParams: { mode?: 'login' | 'register' };
}

// components/auth/AuthForm.tsx
interface AuthFormProps {
  mode: 'login' | 'register';
  onSuccess: () => void;
}

// components/auth/PhoneAuthForm.tsx
interface PhoneAuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (data: PhoneAuthData) => Promise<void>;
}

// components/auth/WeChatAuthButton.tsx
interface WeChatAuthProps {
  mode: 'login' | 'register';
  onSuccess: () => void;
}
```

### 表单验证（使用React Hook Form + Zod）
```typescript
const phoneAuthSchema = z.object({
  phone: z.string()
    .regex(/^1[3-9]\d{9}$/, '请输入正确的手机号'),
  code: z.string()
    .length(6, '验证码为6位数字')
    .regex(/^\d+$/, '验证码必须为数字')
});

const loginSchema = z.object({
  type: z.enum(['phone', 'wechat']),
  phone: z.string().optional(),
  password: z.string().optional(),
  code: z.string().optional()
});
```

### API集成
```typescript
// 基于api-specification.yaml
const authAPI = {
  // POST /auth/register
  register: async (data: RegisterData) => {
    if (data.type === 'phone') {
      return api.post('/auth/register', {
        type: 'phone',
        phone: data.phone,
        code: data.code
      });
    } else {
      return api.post('/auth/register', {
        type: 'wechat',
        code: data.wechatCode
      });
    }
  },

  // POST /auth/login
  login: async (data: LoginData) => {
    return api.post('/auth/login', data);
  },

  // POST /auth/verify-code
  sendVerifyCode: async (phone: string) => {
    return api.post('/auth/verify-code', { phone });
  }
};
```

### 状态管理（Zustand）
```typescript
// 使用authStore
const useAuthFlow = () => {
  const { login, register, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (data: LoginData) => {
    try {
      await login(data);
      // 登录成功后跳转
      const returnUrl = searchParams.get('return') || '/';
      router.push(returnUrl);
    } catch (error) {
      // 错误处理
      toast.error(error.message);
    }
  };

  return { handleLogin, handleRegister, isAuthenticated };
};
```

## 组件规范
### AuthTabs组件
```typescript
interface AuthTabsProps {
  defaultTab: 'login' | 'register';
  children: React.ReactNode;
}

// 使用shadcn/ui Tabs组件
// amber主题高亮当前tab
```

### VerificationCodeInput组件
```typescript
interface VerificationCodeInputProps {
  phone: string;
  onCodeSent: () => void;
  onCodeChange: (code: string) => void;
}

// 功能：
// - 发送验证码按钮
// - 60秒倒计时
// - 6位数字输入框
// - 自动聚焦
```

### WeChatLoginFlow组件
```typescript
interface WeChatLoginFlowProps {
  onSuccess: (userData: User) => void;
  onError: (error: Error) => void;
}

// 功能：
// - 跳转微信授权
// - 处理回调
// - 错误重试
```

## 验收标准
### 功能要求
- [ ] 手机号注册登录完整流程
- [ ] 微信一键登录功能
- [ ] 验证码发送和验证
- [ ] 表单实时验证
- [ ] 错误提示友好清晰
- [ ] 登录成功跳转正确

### UI要求
- [ ] 符合Yellow主题设计
- [ ] Tab切换流畅
- [ ] 加载状态明确
- [ ] 响应式布局完美
- [ ] 动画过渡自然

### 安全要求
- [ ] 防止验证码暴力请求
- [ ] 密码不明文传输
- [ ] Token安全存储
- [ ] CSRF防护

## 测试用例
### 单元测试
```typescript
describe('AuthForm', () => {
  it('应该验证手机号格式', () => {
    // 测试11位手机号验证
  });

  it('应该处理验证码倒计时', () => {
    // 测试60秒倒计时逻辑
  });

  it('应该切换登录/注册模式', () => {
    // 测试Tab切换
  });
});
```

### E2E测试
```typescript
describe('Authentication Flow', () => {
  it('完整的手机号注册流程', () => {
    // 1. 访问注册页
    // 2. 输入手机号
    // 3. 获取验证码
    // 4. 输入验证码
    // 5. 提交注册
    // 6. 验证跳转
  });

  it('微信登录流程', () => {
    // 1. 点击微信登录
    // 2. 模拟授权
    // 3. 验证登录成功
  });
});
```

## 实施步骤
1. 创建auth路由页面
2. 实现AuthTabs组件
3. 开发PhoneAuthForm
4. 集成验证码功能
5. 实现WeChatAuthButton
6. 配置表单验证
7. 集成API调用
8. 连接Zustand store
9. 添加错误处理
10. 完成E2E测试

## 相关文档引用
- devDocument.md: 第74-104行（注册登录流程）
- api-specification.yaml: 第64-195行（认证API）
- user-journey-diagram.md: 第49-74行（认证流程）
- state-diagram.md: 认证状态转换