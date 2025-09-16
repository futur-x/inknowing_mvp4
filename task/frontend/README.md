# InKnowing 前端开发任务文档索引

## 项目概述
InKnowing是一个AI驱动的书籍对话平台，用户可以与书籍和书中角色进行智能对话。本文档集合包含了完整的前端开发任务规划，严格基于futurxlab目录下的三图一端文档，确保业务逻辑一致性。

## 技术栈
- **框架**: React/Next.js 14 (App Router)
- **UI库**: shadcn/ui (Yellow主题 - amber-500)
- **状态管理**: Zustand
- **样式**: TailwindCSS
- **类型安全**: TypeScript
- **表单**: React Hook Form + Zod
- **HTTP客户端**: Axios
- **WebSocket**: Socket.io
- **测试**: Jest + Playwright

## 任务优先级说明
- **P0**: 核心功能，MVP必需
- **P1**: 重要功能，用户体验关键
- **P2**: 增强功能，后续迭代
- **P3**: 可选功能，时间允许时实现

## 📁 任务目录结构

### 🏗️ 基础架构 (base/)
核心基础设施和架构组件

| 任务ID | 文件名 | 标题 | 优先级 | 预估时间 |
|--------|--------|------|--------|----------|
| BASE-001 | [task-base-001.md](./base/task-base-001.md) | 项目初始化与基础架构搭建 | P0 | 4-6h |
| BASE-002 | [task-base-002.md](./base/task-base-002.md) | API客户端与请求拦截器配置 | P0 | 3-4h |
| BASE-003 | [task-base-003.md](./base/task-base-003.md) | Zustand状态管理架构设计 | P0 | 4-5h |

**依赖关系**: BASE-001 → BASE-002, BASE-003

### 🔐 认证登录 (auth/)
用户认证和权限管理

| 任务ID | 文件名 | 标题 | 优先级 | 预估时间 |
|--------|--------|------|--------|----------|
| AUTH-001 | [task-auth-001.md](./auth/task-auth-001.md) | 登录注册页面开发 | P0 | 6-8h |
| AUTH-002 | [task-auth-002.md](./auth/task-auth-002.md) | Token管理与自动刷新机制 | P0 | 4-5h |

**依赖关系**: BASE-001,002,003 → AUTH-001 → AUTH-002

### 🏠 首页和搜索 (home/)
用户发现和搜索体验

| 任务ID | 文件名 | 标题 | 优先级 | 预估时间 |
|--------|--------|------|--------|----------|
| HOME-001 | [task-home-001.md](./home/task-home-001.md) | 首页设计与实现 | P0 | 6-8h |
| HOME-002 | [task-home-002.md](./home/task-home-002.md) | 搜索结果页开发 | P0 | 5-6h |

**依赖关系**: BASE-001,002,003 → HOME-001 → HOME-002

### 💬 对话界面 (chat/)
核心对话功能实现

| 任务ID | 文件名 | 标题 | 优先级 | 预估时间 |
|--------|--------|------|--------|----------|
| CHAT-001 | [task-chat-001.md](./chat/task-chat-001.md) | 书籍对话界面开发 | P0 | 8-10h |
| CHAT-002 | [task-chat-002.md](./chat/task-chat-002.md) | 角色对话界面开发 | P1 | 6-8h |

**依赖关系**: BASE-001,002,003 + AUTH-002 → CHAT-001 → CHAT-002

### 👤 个人中心 (profile/)
用户信息和历史管理

| 任务ID | 文件名 | 标题 | 优先级 | 预估时间 |
|--------|--------|------|--------|----------|
| PROFILE-001 | [task-profile-001.md](./profile/task-profile-001.md) | 个人中心主页开发 | P1 | 5-6h |

**依赖关系**: BASE-001,003 + AUTH-002 → PROFILE-001

### 📤 上传界面 (upload/)
书籍上传和处理功能

| 任务ID | 文件名 | 标题 | 优先级 | 预估时间 |
|--------|--------|------|--------|----------|
| UPLOAD-001 | [task-upload-001.md](./upload/task-upload-001.md) | 书籍上传功能开发 | P1 | 7-9h |

**依赖关系**: BASE-001,002 + AUTH-002 → UPLOAD-001

### 💎 会员中心 (membership/)
会员服务和支付功能

| 任务ID | 文件名 | 标题 | 优先级 | 预估时间 |
|--------|--------|------|--------|----------|
| MEMBERSHIP-001 | [task-membership-001.md](./membership/task-membership-001.md) | 会员中心页面开发 | P1 | 6-7h |

**依赖关系**: BASE-001,002 + AUTH-002 → MEMBERSHIP-001

### ⚙️ 管理后台 (admin/)
管理员功能和系统监控

| 任务ID | 文件名 | 标题 | 优先级 | 预估时间 |
|--------|--------|------|--------|----------|
| ADMIN-001 | [task-admin-001.md](./admin/task-admin-001.md) | 管理后台主控制台开发 | P2 | 8-10h |

**依赖关系**: BASE-001,002 + AUTH-002 → ADMIN-001

## 🎯 开发里程碑

### 第一阶段：MVP核心功能 (P0任务)
**目标**: 实现基本的书籍对话功能
- [x] BASE-001,002,003: 基础架构搭建
- [x] AUTH-001,002: 用户认证系统
- [x] HOME-001,002: 首页和搜索
- [x] CHAT-001: 书籍对话功能

**预估时间**: 3-4周
**完成标准**: 用户可以注册、搜索书籍、进行基本对话

### 第二阶段：用户体验优化 (P1任务)
**目标**: 完善用户功能和体验
- [x] CHAT-002: 角色对话功能
- [x] PROFILE-001: 个人中心
- [x] UPLOAD-001: 书籍上传
- [x] MEMBERSHIP-001: 会员系统

**预估时间**: 2-3周
**完成标准**: 功能完整的用户端应用

### 第三阶段：管理和扩展 (P2任务)
**目标**: 管理功能和系统监控
- [x] ADMIN-001: 管理后台

**预估时间**: 1-2周
**完成标准**: 可管理的完整平台

## 📋 关键特性映射

### 业务逻辑守恒检查表
每个任务都严格对应futurxlab文档中的业务逻辑：

| 用户旅程阶段 | 对应任务 | API端点 | 状态管理 |
|-------------|----------|---------|----------|
| 发现阶段 | HOME-001,002 | GET /search, /books/popular | bookStore |
| 注册认证 | AUTH-001,002 | POST /auth/register, /login | authStore |
| 对话体验 | CHAT-001,002 | POST /dialogues/*, WS /ws/dialogue | dialogueStore |
| 会员升级 | MEMBERSHIP-001 | POST /users/membership/upgrade | membershipStore |
| 内容贡献 | UPLOAD-001 | POST /uploads | uploadStore |

### UI设计一致性
所有任务遵循统一的设计规范：
- **主色调**: amber-500 (#f59e0b)
- **组件库**: shadcn/ui Yellow主题
- **布局**: 卡片式设计，现代简洁风格
- **响应式**: 移动优先设计

## 🧪 测试策略

### 单元测试覆盖
- 组件渲染测试
- 状态管理逻辑测试
- API调用测试
- 工具函数测试

### 集成测试覆盖
- 页面间导航测试
- API集成测试
- 状态同步测试

### E2E测试覆盖
- 完整用户流程测试
- 跨浏览器兼容性测试
- 性能基准测试

## 📊 开发进度跟踪

### 实施建议
1. **严格按照依赖关系顺序开发**
2. **每个任务完成后进行代码审查**
3. **及时更新测试用例**
4. **保持与后端API的同步**

### 质量保证
- TypeScript严格模式
- ESLint + Prettier代码规范
- 组件文档和示例
- 性能监控和优化

## 📚 参考文档

### 核心文档依赖
- `./futurxlab/user-journey-diagram.md`: 用户旅程和状态转换
- `./futurxlab/api-specification.yaml`: API接口规范
- `./futurxlab/sequence-diagram.md`: 交互时序
- `./futurxlab/state-diagram.md`: 状态管理
- `./devDocument.md`: UI/UX详细需求

### 开发规范
- [React/Next.js最佳实践](https://nextjs.org/docs)
- [shadcn/ui组件文档](https://ui.shadcn.com)
- [TailwindCSS使用指南](https://tailwindcss.com/docs)
- [Zustand状态管理](https://zustand-demo.pmnd.rs)

---

**注意**: 本文档基于业务逻辑守恒原理生成，确保前端实现与后端API和业务需求完全一致。开发过程中如发现不一致之处，请优先参考futurxlab目录下的原始文档。