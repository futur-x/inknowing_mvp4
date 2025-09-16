# Task-BASE-001: 项目初始化与基础架构搭建

## 任务信息
- **Task ID**: BASE-001
- **Title**: 初始化Next.js项目并配置基础架构
- **Priority**: P0 (最高优先级)
- **Estimated Hours**: 4-6小时
- **Dependencies**: 无

## UI/UX需求
### 项目基础配置
- 使用Next.js 14 App Router
- 配置shadcn/ui组件库
- 应用Yellow主题（amber-500为主色调）
- 设置响应式断点：
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

### 设计系统
- **主色调系统**:
  - Primary: amber-500 (#f59e0b)
  - Primary Hover: amber-600
  - Primary Disabled: amber-300
  - Background: white / amber-50
  - Text: slate-700 / slate-900
  - Border: slate-200

## 技术需求
### 技术栈初始化
```json
{
  "framework": "Next.js 14 (App Router)",
  "ui-library": "shadcn/ui",
  "styling": "TailwindCSS",
  "state-management": "Zustand",
  "http-client": "Axios",
  "websocket": "Socket.io-client",
  "form-validation": "React Hook Form + Zod",
  "typescript": "5.x"
}
```

### 项目结构
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # 根布局
│   ├── page.tsx          # 首页
│   └── (routes)/         # 路由组
├── components/            # 组件库
│   ├── ui/               # shadcn/ui组件
│   ├── layout/           # 布局组件
│   └── shared/           # 共享组件
├── lib/                   # 工具库
│   ├── api/              # API客户端
│   ├── utils/            # 工具函数
│   └── hooks/            # 自定义Hooks
├── stores/                # Zustand状态管理
├── types/                 # TypeScript类型定义
└── styles/               # 全局样式
```

### 环境变量配置
```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_APP_NAME=InKnowing
NEXT_PUBLIC_APP_DOMAIN=inknowing.ai
```

## 组件规范
### 基础Layout组件
```typescript
interface RootLayoutProps {
  children: React.ReactNode;
}

// 功能：
// - 设置全局字体（Inter）
// - 应用Yellow主题
// - 配置ToastProvider
// - 设置元数据
```

### ThemeProvider组件
```typescript
interface ThemeConfig {
  primaryColor: 'amber';
  radius: 0.5;
  darkMode: false;
}

// 功能：
// - 提供全局主题上下文
// - 配置shadcn/ui主题变量
// - 管理主题切换（预留）
```

### ErrorBoundary组件
```typescript
interface ErrorBoundaryProps {
  fallback?: React.ComponentType<{error: Error}>;
  children: React.ReactNode;
}

// 功能：
// - 捕获组件错误
// - 显示友好错误页面
// - 错误上报（预留）
```

## 验收标准
### 功能要求
- [ ] Next.js项目能正常启动
- [ ] shadcn/ui组件库正确安装并配置Yellow主题
- [ ] TailwindCSS配置完成，amber色系可用
- [ ] Zustand store基础结构搭建
- [ ] 环境变量配置文件创建
- [ ] TypeScript严格模式启用

### 性能要求
- [ ] Lighthouse性能分数 > 90
- [ ] 首次内容绘制(FCP) < 1.5s
- [ ] 最大内容绘制(LCP) < 2.5s
- [ ] 累积布局偏移(CLS) < 0.1

### 代码质量
- [ ] ESLint配置无错误
- [ ] Prettier格式化配置
- [ ] husky pre-commit hooks配置
- [ ] 目录结构符合规范

## 测试用例
### 单元测试
```typescript
// __tests__/setup.test.tsx
describe('Project Setup', () => {
  it('应该正确渲染根布局', () => {
    // 测试根布局渲染
  });

  it('应该应用Yellow主题色', () => {
    // 测试主题色是否正确应用
  });

  it('应该正确配置响应式断点', () => {
    // 测试响应式配置
  });
});
```

### 集成测试
- 测试环境变量加载
- 测试错误边界功能
- 测试主题Provider功能

## 实施步骤
1. 创建Next.js项目：`npx create-next-app@latest`
2. 安装shadcn/ui：`npx shadcn-ui@latest init`
3. 配置Yellow主题色
4. 安装并配置Zustand
5. 设置项目目录结构
6. 配置ESLint和Prettier
7. 设置环境变量
8. 创建基础组件
9. 配置Git hooks
10. 运行测试验证

## 相关文档引用
- devDocument.md: 第601-609行（技术架构要求）
- devDocument.md: 第624-639行（UI设计规范）