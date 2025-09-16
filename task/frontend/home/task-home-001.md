# Task-HOME-001: 首页设计与实现

## 任务信息
- **Task ID**: HOME-001
- **Title**: 开发InKnowing首页
- **Priority**: P0
- **Estimated Hours**: 6-8小时
- **Dependencies**: BASE-001, BASE-002, BASE-003

## UI/UX需求
### 页面布局（基于devDocument.md第4-11行）
```
首页布局结构：
┌──────────────────────────────────────┐
│  Header                              │
│  ┌─────────────────────────────────┐│
│  │ Logo | InKnowing | Login/Avatar ││
│  └─────────────────────────────────┘│
│                                      │
│  Hero Section                        │
│  ┌─────────────────────────────────┐│
│  │    InKnowing Logo (大)          ││
│  │   "知识，从对话开始"             ││
│  │                                  ││
│  │  ┌─────────────────────────┐   ││
│  │  │ 问一个问题，找到能回答的书│   ││
│  │  │                         🔍│   ││
│  │  └─────────────────────────┘   ││
│  │                                  ││
│  │ [如何管理团队] [提高效率] [沟通] ││
│  └─────────────────────────────────┘│
│                                      │
│  Popular Books Section               │
│  ┌─────────────────────────────────┐│
│  │ 热门书籍                         ││
│  │ ┌──────┐ ┌──────┐ ┌──────┐    ││
│  │ │Book 1│ │Book 2│ │Book 3│    ││
│  │ │      │ │      │ │      │    ││
│  │ │  95% │ │  88% │ │  76% │    ││
│  │ └──────┘ └──────┘ └──────┘    ││
│  │ ┌──────┐ ┌──────┐ ┌──────┐    ││
│  │ │Book 4│ │Book 5│ │Book 6│    ││
│  │ └──────┘ └──────┘ └──────┘    ││
│  └─────────────────────────────────┘│
│                                      │
│  Footer                              │
└──────────────────────────────────────┘
```

### 设计规范
- **主色调**: amber-500 (#f59e0b)
- **背景**: 白色主背景，hero区域使用amber-50淡色背景
- **字体**:
  - 标题: Inter Bold, 48px (桌面) / 32px (移动)
  - 副标题: Inter Regular, 20px / 16px
  - 正文: Inter Regular, 16px / 14px
- **间距**: 使用8px网格系统
- **响应式**: 移动优先，3列网格自适应为1列

## 技术需求
### 页面组件结构
```typescript
// app/page.tsx
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <SearchSection />
      <PopularBooksSection />
      <HowItWorksSection />
    </>
  );
}
```

### Hero区组件
```typescript
interface HeroSectionProps {
  title?: string;
  subtitle?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title = "InKnowing",
  subtitle = "知识，从对话开始"
}) => {
  // 实现要点：
  // - 渐变背景 (white -> amber-50)
  // - Logo动画（淡入效果）
  // - 响应式字体大小
};
```

### 搜索组件
```typescript
interface SearchBoxProps {
  onSearch: (query: string) => void;
  suggestions?: string[];
  placeholder?: string;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  onSearch,
  suggestions = [],
  placeholder = "问一个问题，找到能回答的书..."
}) => {
  // 功能点：
  // - 实时搜索建议
  // - 热门问题标签
  // - Enter键搜索
  // - 搜索历史（localStorage）
};

// 热门标签数据
const hotTags = [
  "如何管理团队",
  "怎样提高效率",
  "职场沟通技巧",
  "个人成长",
  "投资理财",
  "心理学入门"
];
```

### 热门书籍组件
```typescript
interface PopularBooksProps {
  books: Book[];
  loading?: boolean;
}

interface BookCard {
  id: string;
  title: string;
  author: string;
  cover: string;
  matchScore?: number;
  dialogueCount: number;
  rating: number;
}

const PopularBooksSection: React.FC<PopularBooksProps> = ({
  books,
  loading = false
}) => {
  // 实现要点：
  // - 3x2网格布局（桌面）
  // - 横向滚动（移动端）
  // - 懒加载图片
  // - 骨架屏加载状态
  // - 点击跳转详情页
};
```

### API集成
```typescript
// hooks/usePopularBooks.ts
const usePopularBooks = () => {
  const { data, loading, error } = useSWR(
    '/books/popular',
    () => booksAPI.getPopular(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000 // 1分钟缓存
    }
  );

  return {
    books: data || [],
    loading,
    error
  };
};

// hooks/useSearchSuggestions.ts
const useSearchSuggestions = (query: string) => {
  const debouncedQuery = useDebounce(query, 300);

  return useSWR(
    debouncedQuery ? `/search/suggestions?q=${debouncedQuery}` : null,
    () => searchAPI.getSuggestions(debouncedQuery)
  );
};
```

### 状态管理
```typescript
// stores/home-store.ts
interface HomeStore {
  searchQuery: string;
  searchHistory: string[];
  popularBooks: Book[];

  setSearchQuery: (query: string) => void;
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  fetchPopularBooks: () => Promise<void>;
}
```

## 组件规范
### Header组件
```typescript
interface HeaderProps {
  transparent?: boolean;
  fixed?: boolean;
}

// 功能：
// - Logo和导航
// - 登录/用户头像切换
// - 移动端汉堡菜单
// - 滚动时背景变化
```

### BookCard组件
```typescript
interface BookCardProps {
  book: Book;
  showMatchScore?: boolean;
  onClick?: () => void;
}

// 设计：
// - 封面图片 (16:9比例)
// - 书名（最多2行）
// - 作者名
// - 匹配度百分比（可选）
// - 对话次数
// - Hover效果（阴影提升）
```

### TagButton组件
```typescript
interface TagButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline';
}

// 使用shadcn/ui Button
// amber主题，圆角设计
```

## 验收标准
### 功能要求
- [ ] 搜索框输入和提交功能正常
- [ ] 热门标签点击填充搜索框
- [ ] 热门书籍展示正确
- [ ] 书籍卡片点击跳转
- [ ] 响应式布局完美适配
- [ ] 加载状态展示友好

### 性能要求
- [ ] 首屏加载时间 < 2秒
- [ ] 图片懒加载实现
- [ ] API请求缓存
- [ ] 搜索防抖实现

### SEO要求
- [ ] 正确的meta标签
- [ ] 结构化数据
- [ ] 语义化HTML
- [ ] Open Graph标签

## 测试用例
### 单元测试
```typescript
describe('HomePage', () => {
  it('应该正确渲染所有区块', () => {
    // 测试页面结构
  });

  it('应该处理搜索提交', () => {
    // 测试搜索功能
  });

  it('应该展示热门书籍', () => {
    // 测试书籍加载
  });
});

describe('SearchBox', () => {
  it('应该显示搜索建议', async () => {
    // 测试自动完成
  });

  it('应该保存搜索历史', () => {
    // 测试历史记录
  });
});
```

### E2E测试
```typescript
describe('Homepage Flow', () => {
  it('用户搜索流程', () => {
    // 1. 访问首页
    // 2. 输入搜索词
    // 3. 查看建议
    // 4. 提交搜索
    // 5. 跳转结果页
  });

  it('书籍浏览流程', () => {
    // 1. 查看热门书籍
    // 2. 点击书籍卡片
    // 3. 跳转详情页
  });
});
```

## 实施步骤
1. 创建首页路由和布局
2. 实现Hero区域组件
3. 开发SearchBox组件
4. 实现搜索建议功能
5. 创建BookCard组件
6. 实现PopularBooks区域
7. 集成API获取数据
8. 添加加载和错误状态
9. 实现响应式设计
10. 性能优化和测试

## 相关文档引用
- devDocument.md: 第4-11行（首页描述）
- devDocument.md: 第624-639行（UI设计规范）
- api-specification.yaml: 搜索和书籍API
- user-journey-diagram.md: 第49-53行（发现阶段）