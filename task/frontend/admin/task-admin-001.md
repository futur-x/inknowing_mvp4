# Task-ADMIN-001: 管理后台主控制台开发

## 任务信息
- **Task ID**: ADMIN-001
- **Title**: 实现管理员后台主控制台
- **Priority**: P2
- **Estimated Hours**: 8-10小时
- **Dependencies**: BASE-001, BASE-002, AUTH-002

## UI/UX需求
### 页面布局（基于devDocument.md第269-278行）
```
管理后台布局：
┌────────────────────────────────────────────────────────────┐
│  Admin Header (管理员信息 + 登出)                           │
├────────────────┬───────────────────────────────────────────┤
│  Sidebar       │  Main Dashboard                           │
│  ┌────────────┐│  ┌─────────────────────────────────────────┐│
│  │ 仪表盘      ││  │ 今日数据总览                             ││
│  │ ├ 概览      ││  │ ┌─────────┐ ┌─────────┐ ┌─────────┐  ││
│  │ ├ 实时监控  ││  │ │活跃用户  │ │对话总数  │ │新增书籍   │  ││
│  │            ││  │ │ 1,234   │ │ 8,901   │ │   12    │  ││
│  │ 内容管理    ││  │ └─────────┘ └─────────┘ └─────────┘  ││
│  │ ├ 书籍管理  ││  │                                       ││
│  │ ├ 用户管理  ││  │ API消耗: $45.67                      ││
│  │ ├ 对话审核  ││  └─────────────────────────────────────────┘│
│  │            ││                                            │
│  │ 系统配置    ││  ┌─────────────────────────────────────────┐│
│  │ ├ 模型配置  ││  │ 热门书籍TOP5                            ││
│  │ ├ 参数设置  ││  │ 1. 《原则》- 1,234次对话/今日           ││
│  │            ││  │ 2. 《人类简史》- 891次                  ││
│  │ 数据统计    ││  │ 3. 《三体》- 756次                     ││
│  │ ├ 使用报告  ││  │ ...                                    ││
│  │ ├ 成本分析  ││  └─────────────────────────────────────────┘│
│  └────────────┘│                                            │
│                │  ┌─────────────────────────────────────────┐│
│                │  │ API状态监控                             ││
│                │  │ OpenAI: ✅ 正常 (延迟 1.2s)            ││
│                │  │ 通义千问: ✅ 正常 (延迟 0.8s)          ││
│                │  │                                         ││
│                │  │ 告警信息:                               ││
│                │  │ ⚠️ 用户张三连续失败5次，请检查         ││
│                │  └─────────────────────────────────────────┘│
└────────────────┴───────────────────────────────────────────┘
```

## 技术需求
### 管理员权限验证
```typescript
// middleware/admin-auth.ts
export async function adminAuthMiddleware(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  try {
    const payload = await verifyAdminToken(token);

    // 检查管理员权限
    if (payload.role !== 'admin' && payload.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // 添加用户信息到请求头
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-admin-id', payload.adminId);
    requestHeaders.set('x-admin-role', payload.role);

    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  } catch (error) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}

// 权限等级
enum AdminRole {
  ADMIN = 'admin',           // 普通管理员
  SUPER_ADMIN = 'super_admin' // 超级管理员
}

// 权限配置
const PERMISSIONS = {
  [AdminRole.ADMIN]: [
    'books.read',
    'books.create',
    'books.update',
    'users.read',
    'dialogues.read',
    'stats.read'
  ],
  [AdminRole.SUPER_ADMIN]: [
    '*' // 所有权限
  ]
};
```

### 仪表盘数据结构
```typescript
interface DashboardStats {
  overview: {
    activeUsers: number;        // 今日活跃用户
    totalDialogues: number;     // 今日对话总数
    newBooks: number;          // 今日新增书籍
    apiCost: number;           // 今日API消耗成本
  };

  realtime: {
    onlineUsers: number;       // 当前在线用户
    activeDialogues: number;   // 进行中的对话
    queueLength: number;       // 处理队列长度
  };

  trends: {
    userGrowth: DataPoint[];   // 用户增长趋势
    dialogueTrends: DataPoint[]; // 对话量趋势
    costTrends: DataPoint[];   // 成本趋势
  };

  topBooks: {
    id: string;
    title: string;
    author: string;
    dialogueCount: number;
    trend: 'up' | 'down' | 'stable';
  }[];

  apiStatus: {
    provider: string;
    status: 'healthy' | 'degraded' | 'down';
    latency: number;
    errorRate: number;
  }[];

  alerts: {
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
    resolved: boolean;
  }[];
}

interface DataPoint {
  timestamp: string;
  value: number;
}
```

### 仪表盘主组件
```typescript
const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30秒刷新

  // 数据获取
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await adminAPI.getDashboardStats();
        setStats(data);
      } catch (error) {
        toast.error('获取仪表盘数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // 自动刷新
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* 概览统计卡片 */}
      <OverviewCards stats={stats!.overview} />

      {/* 实时监控 */}
      <RealtimeMonitor realtime={stats!.realtime} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 热门书籍 */}
        <TopBooksCard books={stats!.topBooks} />

        {/* API状态 */}
        <ApiStatusCard status={stats!.apiStatus} />
      </div>

      {/* 趋势图表 */}
      <TrendCharts trends={stats!.trends} />

      {/* 告警列表 */}
      <AlertsList alerts={stats!.alerts} />
    </div>
  );
};
```

### 概览卡片组件
```typescript
const OverviewCards: React.FC<{ stats: DashboardStats['overview'] }> = ({ stats }) => {
  const cards = [
    {
      title: '活跃用户',
      value: stats.activeUsers,
      icon: Users,
      color: 'blue',
      change: '+12%'
    },
    {
      title: '对话总数',
      value: stats.totalDialogues,
      icon: MessageCircle,
      color: 'green',
      change: '+8%'
    },
    {
      title: '新增书籍',
      value: stats.newBooks,
      icon: Book,
      color: 'purple',
      change: '+2'
    },
    {
      title: 'API消耗',
      value: `$${stats.apiCost.toFixed(2)}`,
      icon: DollarSign,
      color: 'amber',
      change: '-5%'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600">{card.title}</p>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
            <div className={`p-3 rounded-full bg-${card.color}-100`}>
              <card.icon className={`w-6 h-6 text-${card.color}-600`} />
            </div>
          </div>

          {card.change && (
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">{card.change}</span>
              <span className="text-slate-500 ml-1">vs 昨日</span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};
```

### 实时监控组件
```typescript
const RealtimeMonitor: React.FC<{ realtime: DashboardStats['realtime'] }> = ({
  realtime
}) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">实时监控</h3>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {realtime.onlineUsers}
          </div>
          <div className="text-sm text-slate-500">当前在线</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {realtime.activeDialogues}
          </div>
          <div className="text-sm text-slate-500">进行中对话</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">
            {realtime.queueLength}
          </div>
          <div className="text-sm text-slate-500">处理队列</div>
        </div>
      </div>

      {/* 实时活动流 */}
      <div className="mt-4 h-32 overflow-y-auto">
        <RealtimeActivityFeed />
      </div>
    </Card>
  );
};
```

### API状态监控
```typescript
const ApiStatusCard: React.FC<{ status: DashboardStats['apiStatus'] }> = ({ status }) => {
  const getStatusColor = (apiStatus: string) => {
    switch (apiStatus) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'down': return 'text-red-500';
      default: return 'text-slate-500';
    }
  };

  const getStatusIcon = (apiStatus: string) => {
    switch (apiStatus) {
      case 'healthy': return CheckCircle;
      case 'degraded': return AlertTriangle;
      case 'down': return XCircle;
      default: return Circle;
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">API状态监控</h3>

      <div className="space-y-3">
        {status.map((api, index) => {
          const StatusIcon = getStatusIcon(api.status);
          const statusColor = getStatusColor(api.status);

          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                <span className="font-medium">{api.provider}</span>
              </div>

              <div className="text-right text-sm">
                <div className="text-slate-600">延迟 {api.latency}ms</div>
                <div className="text-slate-500">错误率 {api.errorRate}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
```

### API集成
```typescript
// 基于devDocument.md管理员功能
const adminAPI = {
  // 仪表盘数据
  getDashboardStats: async (): Promise<DashboardStats> => {
    return api.get('/admin/dashboard/stats');
  },

  // 实时监控数据
  getRealtimeData: async () => {
    return api.get('/admin/realtime');
  },

  // 系统健康检查
  getSystemHealth: async () => {
    return api.get('/admin/health');
  },

  // 告警管理
  getAlerts: async () => {
    return api.get('/admin/alerts');
  },

  resolveAlert: async (alertId: string) => {
    return api.post(`/admin/alerts/${alertId}/resolve`);
  }
};
```

## 验收标准
### 功能要求
- [ ] 管理员权限验证正确
- [ ] 仪表盘数据准确展示
- [ ] 实时监控功能正常
- [ ] API状态监控有效
- [ ] 告警机制工作正常
- [ ] 权限分级管理

### 安全要求
- [ ] 管理员身份验证
- [ ] 操作日志记录
- [ ] 敏感数据脱敏
- [ ] CSRF防护
- [ ] SQL注入防护

### 性能要求
- [ ] 大数据量展示优化
- [ ] 实时数据更新流畅
- [ ] 图表渲染性能
- [ ] 内存使用控制

## 相关文档引用
- devDocument.md: 第269-315行（管理后台）
- devDocument.md: 第476-513行（监控统计）
- api-specification.yaml: 管理员API