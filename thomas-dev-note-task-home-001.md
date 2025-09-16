# Thomas Development Note - 构建首页和书籍发现界面 (task-home-001)

## 项目概览
**任务**: 构建InKnowing平台的首页和书籍发现界面
**目标**: 创建一个吸引用户的首页，以及功能完善的书籍发现系统
**状态**: 进行中

## 业务逻辑对照
基于.futurxlab文档分析：
- **用户旅程**: Discovery Phase → Anonymous用户可以浏览、搜索、查看书籍详情
- **API映射**:
  - GET /books - 获取书籍列表（支持分类、排序、分页）
  - GET /books/popular - 获取热门书籍
  - GET /books/{bookId} - 获取书籍详情
  - GET /search/books - 搜索书籍
  - GET /search - 通用搜索（问题驱动的发现）
- **状态转换**: Anonymous → 可以自由浏览 → 需要注册才能对话
- **业务规则守恒**: 免费用户可完全浏览，但对话需要注册

## Todo List

### Phase 1: 数据获取层
- [ ] 创建书籍数据获取hooks (use-books.tsx)
  - 实现获取书籍列表功能
  - 实现获取热门书籍功能
  - 实现获取书籍详情功能
  - 实现搜索功能
- [ ] 创建书籍类型定义 (types/book.ts)

### Phase 2: 基础组件开发
- [ ] 创建书籍卡片组件 (book-card.tsx)
- [ ] 创建书籍网格布局组件 (book-grid.tsx)
- [ ] 创建书籍筛选组件 (book-filters.tsx)
- [ ] 创建搜索栏组件 (search-bar.tsx)

### Phase 3: 首页开发
- [ ] 创建Hero Section组件 (hero-section.tsx)
- [ ] 创建特色书籍展示组件 (featured-books.tsx)
- [ ] 创建最新书籍展示组件 (recent-books.tsx)
- [ ] 整合首页布局 (app/page.tsx)

### Phase 4: 书籍发现页面
- [ ] 创建书籍列表页面 (app/books/page.tsx)
- [ ] 实现分页功能
- [ ] 实现筛选和排序功能
- [ ] 实现搜索集成

### Phase 5: 书籍详情页面
- [ ] 创建书籍详情页面 (app/books/[bookId]/page.tsx)
- [ ] 实现书籍信息展示
- [ ] 添加"开始对话"功能（处理认证状态）

### Phase 6: 用户体验优化
- [ ] 添加加载状态和骨架屏
- [ ] 实现错误处理
- [ ] 优化移动端响应式设计
- [ ] 实现图片懒加载

### Phase 7: 性能优化
- [ ] 实现数据缓存策略
- [ ] 添加搜索防抖
- [ ] 代码分割优化

## 当前进度
已完成大部分核心功能：
- ✅ 书籍类型定义
- ✅ 数据获取hooks
- ✅ 所有基础组件（卡片、网格、筛选、搜索）
- ✅ 首页组件（Hero、Featured）
- ✅ 首页整合
- ✅ 书籍列表页面
- ✅ 书籍详情页面
- ⏳ 正在进行最后的优化和测试

## 技术决策记录
1. 使用SWR进行数据获取和缓存管理
2. 使用Tailwind CSS进行响应式设计
3. 使用Next.js App Router进行路由管理
4. 使用shadcn/ui组件库保持UI一致性

## 发现的问题/风险
- 暂无重大问题
- 前端服务器运行在端口3555
- 后端API服务器运行在端口8888

## 与三图一端的一致性检查
✅ API规范已确认，书籍相关端点明确
✅ 用户旅程符合Anonymous用户自由浏览的设计
✅ 状态转换逻辑清晰（浏览免费，对话需注册）

## 下一步计划
1. 创建书籍类型定义
2. 实现数据获取hooks
3. 开始构建基础组件