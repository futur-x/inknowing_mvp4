# Task-CHAT-001: 书籍对话界面开发

## 任务信息
- **Task ID**: CHAT-001
- **Title**: 实现书籍对话聊天界面
- **Priority**: P0
- **Estimated Hours**: 8-10小时
- **Dependencies**: BASE-001, BASE-002, BASE-003, AUTH-002

## UI/UX需求
### 页面布局（基于devDocument.md第34-44行）
```
对话页面布局：
┌──────────────────────────────────────────────────┐
│  Header (返回 + 书籍标题)                         │
├─────────────────┬────────────────────────────────┤
│  Sidebar        │  Chat Area                     │
│  ┌─────────────┐│  ┌─────────────────────────────┐│
│  │ 书籍封面     ││  │ 试用提示条                   ││
│  │            ││  │ 剩余4次机会 [立即注册]       ││
│  │ 《驱动力》   ││  └─────────────────────────────┘│
│  │ 丹尼尔·平克  ││                                │
│  │            ││  ┌─────────────────────────────┐│
│  │ [书籍对话]   ││  │ 欢迎消息                     ││
│  │ [角色对话]   ││  │ 我是《驱动力》的智能助手...   ││
│  │            ││  └─────────────────────────────┘│
│  │ 历史会话:    ││                                │
│  │ • 今天的对话 ││  ┌─────────────────────────────┐│
│  │ • 昨天的对话 ││  │ 用户消息                     ││
│  │            ││  │ 为什么金钱激励...             ││
│  └─────────────┘│  └─────────────────────────────┘│
│                 │                                │
│                 │  ┌─────────────────────────────┐│
│                 │  │ AI回答                      ││
│                 │  │ 这是一个很有洞察力的问题...   ││
│                 │  │ [查看原文] [分享对话]       ││
│                 │  └─────────────────────────────┘│
│                 │                                │
│                 │  ┌─────────────────────────────┐│
│                 │  │ 输入框                       ││
│                 │  │ [输入您的问题...] [发送]     ││
│                 │  └─────────────────────────────┘│
└─────────────────┴────────────────────────────────┘
```

### 设计规范
- **侧边栏宽度**: 280px (桌面) / 隐藏可拉出 (移动)
- **聊天区域**: 最大宽度800px，居中显示
- **消息样式**:
  - 用户消息: 右对齐，amber-100背景，圆角
  - AI消息: 左对齐，白色背景，灰色边框
- **引用样式**: amber-500边框，可点击展开
- **输入框**: 固定底部，多行支持，自动调整高度

## 技术需求
### 页面路由
```typescript
// app/chat/book/[bookId]/page.tsx
interface BookChatPageProps {
  params: { bookId: string };
  searchParams: { sessionId?: string };
}
```

### 对话组件结构
```typescript
interface ChatLayoutProps {
  bookId: string;
  sessionId?: string;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ bookId, sessionId }) => {
  return (
    <div className="flex h-screen">
      <ChatSidebar bookId={bookId} />
      <ChatMain sessionId={sessionId} />
    </div>
  );
};
```

### WebSocket连接
```typescript
// hooks/useWebSocket.ts
interface UseWebSocketParams {
  sessionId: string;
  onMessage: (message: ChatMessage) => void;
  onTyping: (isTyping: boolean) => void;
  onError: (error: Error) => void;
}

const useWebSocket = ({ sessionId, onMessage, onTyping, onError }: UseWebSocketParams) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 连接到 WS /ws/dialogue/{sessionId}
    const newSocket = io(`${WS_URL}/dialogue/${sessionId}`, {
      auth: {
        token: authStore.getState().accessToken
      }
    });

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('message', onMessage);
    newSocket.on('typing', onTyping);
    newSocket.on('error', onError);

    setSocket(newSocket);

    return () => newSocket.close();
  }, [sessionId]);

  const sendMessage = useCallback((content: string) => {
    if (socket && connected) {
      socket.emit('message', { content, timestamp: Date.now() });
    }
  }, [socket, connected]);

  return { socket, connected, sendMessage };
};
```

### 消息组件
```typescript
interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: number;
  citations?: Citation[];
  status: 'sending' | 'sent' | 'error';
}

interface Citation {
  text: string;
  chapter: string;
  page: number;
  confidence: number;
}

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.type === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`
        max-w-[70%] p-3 rounded-lg
        ${isUser
          ? 'bg-amber-100 text-right'
          : 'bg-white border border-slate-200'
        }
      `}>
        <div className="prose prose-sm">
          {message.content}
        </div>

        {message.citations && (
          <CitationList citations={message.citations} />
        )}

        <MessageActions message={message} />
      </div>
    </div>
  );
};
```

### API集成
```typescript
// 基于api-specification.yaml
const dialogueAPI = {
  // POST /dialogues/book/start
  startBookDialogue: async (bookId: string) => {
    return api.post('/dialogues/book/start', { book_id: bookId });
  },

  // POST /dialogues/{sessionId}/messages
  sendMessage: async (sessionId: string, content: string) => {
    return api.post(`/dialogues/${sessionId}/messages`, {
      content,
      timestamp: Date.now()
    });
  },

  // GET /dialogues/history
  getHistory: async () => {
    return api.get('/dialogues/history');
  }
};
```

### 状态管理
```typescript
// stores/dialogue-store.ts
interface DialogueStore {
  currentSession: DialogueSession | null;
  messages: Map<string, ChatMessage[]>;
  typingStatus: boolean;
  quotaWarning: boolean;

  // Session管理
  startSession: (bookId: string) => Promise<void>;
  endSession: () => void;

  // 消息管理
  sendMessage: (content: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;

  // 实时功能
  setTyping: (typing: boolean) => void;
  checkQuota: () => Promise<void>;
}
```

## 组件规范
### ChatSidebar组件
```typescript
interface ChatSidebarProps {
  bookId: string;
  onSessionChange?: (sessionId: string) => void;
}

// 功能：
// - 书籍信息展示
// - 对话模式切换（书籍/角色）
// - 历史会话列表
// - 移动端抽屉式显示
```

### MessageInput组件
```typescript
interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

// 功能：
// - 多行文本输入
// - 自动调整高度
// - Shift+Enter换行，Enter发送
// - 字数统计
// - 发送状态禁用
```

### QuotaNotice组件
```typescript
interface QuotaNoticeProps {
  remaining: number;
  total: number;
  type: 'free' | 'trial';
  onUpgrade?: () => void;
}

// 样式：
// - 顶部黄色提示条
// - 进度条显示剩余次数
// - 升级按钮
```

### TypingIndicator组件
```typescript
interface TypingIndicatorProps {
  isTyping: boolean;
  message?: string;
}

// 动画：
// - 三个点跳跃动画
// - "AI正在思考..." 文字
```

### CitationPopover组件
```typescript
interface CitationPopoverProps {
  citation: Citation;
  onViewSource: () => void;
}

// 功能：
// - 显示原文引用
// - 章节和页码信息
// - 查看原文链接
```

## 验收标准
### 功能要求
- [ ] 对话会话正确创建
- [ ] 消息发送和接收正常
- [ ] WebSocket实时通信
- [ ] 历史会话管理
- [ ] 配额检查和提醒
- [ ] 引用信息正确显示

### 性能要求
- [ ] 消息列表虚拟化（长对话）
- [ ] WebSocket断线重连
- [ ] 消息发送失败重试
- [ ] 图片和长文本懒加载

### 用户体验
- [ ] 打字状态实时显示
- [ ] 消息发送状态清晰
- [ ] 响应式设计完美
- [ ] 无障碍访问支持

## 测试用例
### 单元测试
```typescript
describe('ChatPage', () => {
  it('应该正确初始化对话会话', async () => {
    // 测试会话创建
  });

  it('应该发送和接收消息', async () => {
    // 测试消息收发
  });

  it('应该显示配额提醒', () => {
    // 测试配额逻辑
  });
});

describe('WebSocket Hook', () => {
  it('应该处理连接断开重连', () => {
    // 测试断线重连
  });

  it('应该正确处理消息事件', () => {
    // 测试事件处理
  });
});
```

### E2E测试
```typescript
describe('Book Chat Flow', () => {
  it('完整对话流程', () => {
    // 1. 进入书籍详情
    // 2. 开始对话
    // 3. 发送消息
    // 4. 接收AI回答
    // 5. 查看引用
    // 6. 继续对话
  });

  it('配额限制流程', () => {
    // 1. 使用完免费配额
    // 2. 显示升级提示
    // 3. 跳转会员页面
  });
});
```

## 实施步骤
1. 创建聊天页面路由
2. 实现ChatLayout基础布局
3. 开发ChatSidebar组件
4. 实现消息展示组件
5. 开发MessageInput组件
6. 集成WebSocket连接
7. 实现对话API调用
8. 添加配额检查逻辑
9. 开发引用展示功能
10. 性能优化和测试

## WebSocket事件映射
基于sequence-diagram.md的实时通信：

| 前端事件 | WebSocket事件 | 说明 |
|---------|--------------|------|
| 发送消息 | message | 发送用户消息 |
| 接收回复 | message | 接收AI回复 |
| 输入状态 | typing | 显示打字状态 |
| 会话结束 | session_end | 结束对话会话 |

## 相关文档引用
- devDocument.md: 第31-62行（对话界面描述）
- api-specification.yaml: 对话相关API
- sequence-diagram.md: WebSocket通信时序
- user-journey-diagram.md: 第75-98行（对话体验流程）