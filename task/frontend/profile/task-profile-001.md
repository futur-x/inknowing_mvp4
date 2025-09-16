# Task-PROFILE-001: 个人中心主页开发

## 任务信息
- **Task ID**: PROFILE-001
- **Title**: 实现用户个人中心主页
- **Priority**: P1
- **Estimated Hours**: 5-6小时
- **Dependencies**: BASE-001, BASE-003, AUTH-002

## UI/UX需求
### 页面布局
```
个人中心布局：
┌──────────────────────────────────────────────┐
│  Header (个人中心导航)                        │
├─────────────────┬────────────────────────────┤
│  Sidebar        │  Main Content              │
│  ┌─────────────┐│  ┌──────────────────────────┐│
│  │ 用户头像     ││  │ 概览统计                  ││
│  │            ││  │ ┌─────┐ ┌─────┐ ┌─────┐ ││
│  │ 张三        ││  │ │对话 │ │上传 │ │积分 │ ││
│  │ 高级会员     ││  │ │234次│ │3本 │ │1560│ ││
│  │            ││  │ └─────┘ └─────┘ └─────┘ ││
│  │ 菜单:       ││  └──────────────────────────┘│
│  │ • 对话历史   ││                             │
│  │ • 我的上传   ││  ┌──────────────────────────┐│
│  │ • 会员中心   ││  │ 最近对话                  ││
│  │ • 个人设置   ││  │ ┌────────────────────────┐││
│  │            ││  │ │ 《驱动力》- 昨天         │││
│  │ 配额使用:    ││  │ │ 关于团队激励的讨论...   │││
│  │ ████████░░  ││  │ └────────────────────────┘││
│  │ 450/500     ││  │ ┌────────────────────────┐││
│  └─────────────┘│  │ │ 《人类简史》- 2天前     │││
│                 │  │ │ 人类文明的发展历程...   │││
│                 │  │ └────────────────────────┘││
│                 │  └──────────────────────────┘│
│                 │                             │
│                 │  ┌──────────────────────────┐│
│                 │  │ 我的上传                  ││
│                 │  │ ┌──────┐ ┌──────┐        ││
│                 │  │ │Book 1│ │Book 2│        ││
│                 │  │ │处理中 │ │已发布│        ││
│                 │  │ └──────┘ └──────┘        ││
│                 │  └──────────────────────────┘│
└─────────────────┴────────────────────────────┘
```

### 设计规范
- **响应式设计**: 移动端侧边栏收起为抽屉菜单
- **卡片式布局**: 各功能区域使用白色卡片容器
- **状态指示**: 配额使用进度条，会员等级标识
- **快速操作**: 常用功能提供快捷入口

## 技术需求
### 页面路由
```typescript
// app/profile/page.tsx
interface ProfilePageProps {
  searchParams: { tab?: string };
}
```

### 用户信息组件
```typescript
interface UserProfileData {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  phone?: string;
  membershipTier: 'free' | 'basic' | 'premium' | 'super';
  membershipExpiry?: string;
  joinDate: string;

  // 统计数据
  stats: {
    totalDialogues: number;
    totalUploads: number;
    totalPoints: number;
    monthlyDialogues: number;
  };

  // 配额信息
  quota: {
    used: number;
    total: number;
    resetDate: string;
  };
}

const UserInfoCard: React.FC<{ user: UserProfileData }> = ({ user }) => {
  return (
    <Card className="p-4">
      <div className="flex items-center space-x-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={user.avatar} />
          <AvatarFallback>{user.name[0]}</AvatarFallback>
        </Avatar>

        <div>
          <h2 className="text-xl font-semibold">{user.name}</h2>
          <MembershipBadge tier={user.membershipTier} />
          <div className="text-sm text-slate-500">
            加入于 {formatDate(user.joinDate)}
          </div>
        </div>
      </div>

      <QuotaProgress quota={user.quota} />
    </Card>
  );
};
```

### 统计概览组件
```typescript
interface StatsOverviewProps {
  stats: UserStats;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const statItems = [
    { label: '对话次数', value: stats.totalDialogues, icon: MessageCircle },
    { label: '上传书籍', value: stats.totalUploads, icon: Upload },
    { label: '积分余额', value: stats.totalPoints, icon: Star }
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {statItems.map((item, index) => (
        <Card key={index} className="p-4 text-center">
          <item.icon className="w-8 h-8 mx-auto mb-2 text-amber-500" />
          <div className="text-2xl font-bold">{item.value}</div>
          <div className="text-sm text-slate-500">{item.label}</div>
        </Card>
      ))}
    </div>
  );
};
```

### API集成
```typescript
// 基于api-specification.yaml
const profileAPI = {
  // GET /users/profile
  getProfile: async () => {
    return api.get('/users/profile');
  },

  // PUT /users/profile
  updateProfile: async (data: Partial<UserProfile>) => {
    return api.put('/users/profile', data);
  },

  // GET /users/quota
  getQuota: async () => {
    return api.get('/users/quota');
  },

  // GET /users/stats
  getStats: async () => {
    return api.get('/users/stats');
  }
};
```

### 状态管理
```typescript
// stores/profile-store.ts (扩展userStore)
interface ProfileStore {
  profile: UserProfile | null;
  stats: UserStats | null;
  recentDialogues: DialogueHistory[];
  recentUploads: Upload[];

  // Actions
  fetchProfile: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchRecentActivity: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}
```

## 组件规范
### ProfileSidebar组件
```typescript
interface ProfileSidebarProps {
  user: UserProfileData;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

// 菜单项：
// - overview: 概览
// - history: 对话历史
// - uploads: 我的上传
// - membership: 会员中心
// - settings: 个人设置
```

### MembershipBadge组件
```typescript
interface MembershipBadgeProps {
  tier: MembershipTier;
  expiry?: string;
}

// 会员等级样式：
// - free: 灰色边框
// - basic: 蓝色边框
// - premium: 紫色边框
// - super: 金色边框
```

### QuotaProgress组件
```typescript
interface QuotaProgressProps {
  quota: {
    used: number;
    total: number;
    resetDate: string;
  };
}

// 功能：
// - 进度条显示使用情况
// - 剩余配额数字显示
// - 重置时间提示
// - 超限时红色预警
```

### RecentDialogues组件
```typescript
interface RecentDialoguesProps {
  dialogues: DialogueHistory[];
  onViewMore: () => void;
}

interface DialogueHistory {
  id: string;
  bookTitle: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
}

// 功能：
// - 显示最近5个对话
// - 点击继续对话
// - 查看更多历史
```

### MyUploads组件
```typescript
interface MyUploadsProps {
  uploads: Upload[];
  onViewAll: () => void;
}

interface Upload {
  id: string;
  title: string;
  status: 'processing' | 'published' | 'failed';
  uploadDate: string;
  dialogueCount?: number;
}

// 状态显示：
// - processing: 处理中（进度条）
// - published: 已发布（对话次数）
// - failed: 失败（重试按钮）
```

## 验收标准
### 功能要求
- [ ] 用户信息正确展示
- [ ] 统计数据实时更新
- [ ] 配额使用状态准确
- [ ] 最近活动正确显示
- [ ] 侧边栏导航正常
- [ ] 响应式布局完美

### 性能要求
- [ ] 数据加载优化
- [ ] 头像图片懒加载
- [ ] 列表数据分页
- [ ] 缓存策略合理

### 用户体验
- [ ] 加载状态友好
- [ ] 空状态提示
- [ ] 操作反馈及时
- [ ] 导航清晰直观

## 测试用例
### 单元测试
```typescript
describe('ProfilePage', () => {
  it('应该正确显示用户信息', () => {
    // 测试用户信息展示
  });

  it('应该显示统计数据', () => {
    // 测试统计概览
  });

  it('应该显示配额使用情况', () => {
    // 测试配额进度条
  });

  it('应该处理会员等级显示', () => {
    // 测试会员标识
  });
});
```

### 集成测试
```typescript
describe('Profile Integration', () => {
  it('应该获取并显示用户数据', async () => {
    // 测试数据获取和展示
  });

  it('应该支持侧边栏导航', () => {
    // 测试导航切换
  });
});
```

## 实施步骤
1. 创建个人中心页面布局
2. 实现ProfileSidebar组件
3. 开发UserInfoCard组件
4. 实现StatsOverview组件
5. 开发QuotaProgress组件
6. 实现RecentDialogues组件
7. 开发MyUploads组件
8. 集成API数据获取
9. 添加响应式设计
10. 完成测试用例

## 相关文档引用
- devDocument.md: 第246-265行（个人中心描述）
- api-specification.yaml: 用户相关API
- user-journey-diagram.md: 用户状态管理