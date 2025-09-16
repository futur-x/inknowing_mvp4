# Task-HOME-002: 搜索结果页开发

## 任务信息
- **Task ID**: HOME-002
- **Title**: 实现搜索结果页面
- **Priority**: P0
- **Estimated Hours**: 5-6小时
- **Dependencies**: HOME-001, BASE-002

## UI/UX需求
### 页面布局（基于devDocument.md第12-30行）
```
搜索结果页布局：
┌──────────────────────────────────────────┐
│  Header + 搜索框 (固定顶部)                │
│  ┌────────────────────────────────────────┐│
│  │ 🔍 如何激励团队成员              [×]  ││
│  └────────────────────────────────────────┘│
│                                          │
│  Results Header                          │
│  ┌────────────────────────────────────────┐│
│  │ 为您找到 5 本相关书籍                  ││
│  │ 按相关度排序 [下拉选择]                ││
│  └────────────────────────────────────────┘│
│                                          │
│  Search Results                          │
│  ┌────────────────────────────────────────┐│
│  │ [Book Card 1]                         ││
│  │ 《驱动力》- 丹尼尔·平克                ││
│  │ 匹配度：95%                           ││
│  │ 相关章节：第3章讨论内在动机激励...    ││
│  │ [开始对话] [查看详情]                ││
│  │                                        ││
│  │ [Book Card 2]                         ││
│  │ 《管理的实践》- 德鲁克                ││
│  │ 匹配度：88%                           ││
│  │ ...                                    ││
│  └────────────────────────────────────────┘│
│                                          │
│  No Results Fallback                     │
│  ┌────────────────────────────────────────┐│
│  │ 未找到《掌控习惯》                     ││
│  │ 想第一个和这本书对话吗？               ││
│  │ [立即上传这本书]                       ││
│  │ 或看看类似书籍...                      ││
│  └────────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

### 视觉设计要求
- 保持搜索框在顶部固定位置
- 结果卡片使用卡片式设计，amber边框高亮
- 匹配度使用进度条或百分比展示
- 空结果页面引导用户上传书籍
- 加载状态使用骨架屏动画

## 技术需求
### 页面路由
```typescript
// app/search/page.tsx
interface SearchPageProps {
  searchParams: {
    q: string;          // 搜索关键词
    type?: 'book' | 'question';  // 搜索类型
    sort?: 'relevance' | 'rating' | 'recent';  // 排序方式
    page?: string;      // 分页
  };
}
```

### 搜索结果组件
```typescript
interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  totalCount: number;
  loading?: boolean;
  error?: string;
}

interface SearchResult {
  id: string;
  title: string;
  author: string;
  cover: string;
  matchScore: number;  // 匹配度 0-100
  relevantChapter?: string;  // 相关章节
  description: string;
  dialogueCount: number;
  rating: number;
  tags: string[];
}

const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  results,
  totalCount,
  loading,
  error
}) => {
  // 实现要点：
  // - 搜索词高亮
  // - 相关章节摘要
  // - 分页或无限滚动
  // - 排序选项
};
```

### 搜索API集成
```typescript
// hooks/useSearch.ts
interface UseSearchParams {
  query: string;
  type: 'book' | 'question';
  sort: string;
  page: number;
}

const useSearch = ({ query, type, sort, page }: UseSearchParams) => {
  return useSWR(
    query ? ['search', query, type, sort, page] : null,
    () => searchAPI.search({
      q: query,
      type,
      sort,
      limit: 10,
      offset: (page - 1) * 10
    }),
    {
      keepPreviousData: true,
      revalidateOnFocus: false
    }
  );
};

// API调用 - 基于api-specification.yaml
const searchAPI = {
  search: async (params: SearchParams) => {
    // GET /search?q={query}&type={type}&sort={sort}
    return api.get('/search', { params });
  },

  getSuggestions: async (query: string) => {
    // GET /search/suggestions?q={query}
    return api.get('/search/suggestions', {
      params: { q: query }
    });
  }
};
```

### 状态管理
```typescript
// stores/search-store.ts
interface SearchStore {
  currentQuery: string;
  searchHistory: string[];
  results: SearchResult[];
  totalCount: number;
  currentPage: number;
  sortBy: 'relevance' | 'rating' | 'recent';
  loading: boolean;
  error: string | null;

  // Actions
  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  setSortBy: (sort: string) => void;
  addToHistory: (query: string) => void;
  clearResults: () => void;
}
```

## 组件规范
### SearchBar组件（顶部固定）
```typescript
interface SearchBarProps {
  initialQuery?: string;
  onSearch: (query: string) => void;
  showSuggestions?: boolean;
}

// 功能：
// - 固定在页面顶部
// - 保持之前的搜索词
// - 支持修改搜索重新查询
// - 清除按钮
```

### SearchResultCard组件
```typescript
interface SearchResultCardProps {
  result: SearchResult;
  query: string;  // 用于高亮搜索词
  onStartChat: (bookId: string) => void;
  onViewDetail: (bookId: string) => void;
}

// 设计要点：
// - 书籍封面 (左侧)
// - 标题和作者 (高亮搜索词)
// - 匹配度进度条
// - 相关章节摘要
// - 操作按钮区域
```

### NoResults组件
```typescript
interface NoResultsProps {
  query: string;
  onUploadSuggestion: () => void;
  suggestedBooks?: Book[];
}

// 功能：
// - 未找到结果提示
// - 建议上传书籍
// - 显示相似书籍推荐
// - 搜索建议
```

### SearchFilters组件
```typescript
interface SearchFiltersProps {
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalCount: number;
}

// 包含：
// - 排序选择器
// - 结果数量显示
// - 筛选选项（预留）
```

### LoadingSkeleton组件
```typescript
const SearchResultSkeleton = () => {
  // 搜索结果骨架屏
  // 模拟卡片布局
  // 使用shimmer动画
};
```

## 验收标准
### 功能要求
- [ ] URL参数正确解析搜索词
- [ ] 搜索结果正确展示
- [ ] 匹配度计算和显示
- [ ] 排序功能正常工作
- [ ] 分页或无限滚动
- [ ] 无结果时显示上传引导

### 性能要求
- [ ] 搜索响应时间 < 1秒
- [ ] 结果列表虚拟化（大量结果时）
- [ ] 图片懒加载
- [ ] 搜索防抖和缓存

### 用户体验
- [ ] 搜索词高亮显示
- [ ] 加载状态友好
- [ ] 错误提示清晰
- [ ] 快速再次搜索

## 测试用例
### 单元测试
```typescript
describe('SearchResults', () => {
  it('应该正确渲染搜索结果', () => {
    // 测试结果列表渲染
  });

  it('应该高亮搜索关键词', () => {
    // 测试关键词高亮
  });

  it('应该处理空结果', () => {
    // 测试无结果状态
  });

  it('应该支持排序切换', () => {
    // 测试排序功能
  });
});
```

### E2E测试
```typescript
describe('Search Flow', () => {
  it('完整搜索流程', () => {
    // 1. 从首页进入搜索
    // 2. 查看搜索结果
    // 3. 切换排序方式
    // 4. 点击开始对话
    // 5. 跳转对话页面
  });

  it('搜索无结果流程', () => {
    // 1. 搜索不存在的书
    // 2. 查看无结果页面
    // 3. 点击上传建议
    // 4. 跳转上传页面
  });
});
```

## 实施步骤
1. 创建搜索结果页路由
2. 实现SearchBar组件
3. 开发SearchResultCard组件
4. 实现搜索API集成
5. 添加排序和筛选功能
6. 开发NoResults组件
7. 实现加载状态
8. 添加搜索历史功能
9. 性能优化（虚拟化、缓存）
10. 完成测试用例

## 搜索算法映射
基于api-specification.yaml的搜索参数：

| 前端参数 | API参数 | 说明 |
|---------|---------|------|
| query | q | 搜索关键词 |
| type | type | book/question类型 |
| sort | sort_by | relevance/rating/recent |
| page | offset/limit | 分页参数 |

## 相关文档引用
- devDocument.md: 第12-30行（搜索结果页）
- devDocument.md: 第157-167行（无结果状态）
- api-specification.yaml: 搜索相关API
- user-journey-diagram.md: 第51-58行（搜索发现流程）