# Task-CHAT-002: 角色对话界面开发

## 任务信息
- **Task ID**: CHAT-002
- **Title**: 实现角色扮演对话界面
- **Priority**: P1
- **Estimated Hours**: 6-8小时
- **Dependencies**: CHAT-001

## UI/UX需求
### 页面布局（基于devDocument.md第99-118行）
```
角色对话页面布局：
┌──────────────────────────────────────────────────┐
│  Header (返回 + 角色名称 + 书籍信息)               │
├─────────────────┬────────────────────────────────┤
│  Character      │  Chat Area                     │
│  Sidebar        │  ┌─────────────────────────────┐│
│  ┌─────────────┐│  │ 角色背景介绍                 ││
│  │ 角色头像     ││  │ 我是奥雷里亚诺·布恩迪亚...   ││
│  │ (AI生成)    ││  └─────────────────────────────┘│
│  │            ││                                │
│  │奥雷里亚诺   ││  ┌─────────────────────────────┐│
│  │上校         ││  │ 用户消息                     ││
│  │            ││  │ 上校，您为什么要发动战争？    ││
│  │人物设定:    ││  └─────────────────────────────┘│
│  │沉重而疲惫   ││                                │
│  │经历32场战争 ││  ┌─────────────────────────────┐│
│  │            ││  │ 角色回答                     ││
│  │其他角色:    ││  │ [语气：沉重而疲惫]           ││
│  │• 乌尔苏拉   ││  │ 年轻人，当你看到不公正...     ││
│  │• 梅尔基亚德斯││  │ [引用: 第9章 P.234]         ││
│  └─────────────┘│  └─────────────────────────────┘│
│                 │                                │
│                 │  ┌─────────────────────────────┐│
│                 │  │ 输入框                       ││
│                 │  │ [与上校对话...] [发送]       ││
│                 │  └─────────────────────────────┘│
└─────────────────┴────────────────────────────────┘
```

### 视觉设计特点
- **主题色调**: 根据角色特性调整（如怀旧淡黄色）
- **角色头像**: AI生成的角色形象
- **语气标识**: 回答前显示角色语气提示
- **沉浸式设计**: 背景和配色符合书籍氛围
- **角色切换**: 侧边栏显示其他可对话角色

## 技术需求
### 页面路由
```typescript
// app/chat/character/[characterId]/page.tsx
interface CharacterChatPageProps {
  params: { characterId: string };
  searchParams: { sessionId?: string };
}
```

### 角色数据结构
```typescript
interface Character {
  id: string;
  name: string;
  alias: string[];
  bookId: string;
  bookTitle: string;
  avatar: string;

  // 角色设定
  personality: string;
  background: string;
  speakingStyle: string;
  emotionalTone: string;
  keyMemories: string[];

  // 对话配置
  systemPrompt: string;
  responseStyle: 'formal' | 'casual' | 'literary';
  maxResponseLength: number;

  // 统计信息
  dialogueCount: number;
  rating: number;
}
```

### 角色对话组件
```typescript
interface CharacterChatProps {
  character: Character;
  sessionId?: string;
}

const CharacterChat: React.FC<CharacterChatProps> = ({ character, sessionId }) => {
  const [messages, setMessages] = useState<CharacterMessage[]>([]);
  const [currentMood, setCurrentMood] = useState<string>('neutral');

  // 角色特定的消息处理
  const handleCharacterMessage = (content: string) => {
    return dialogueAPI.sendCharacterMessage(character.id, content, {
      sessionId,
      mood: currentMood,
      context: getRecentContext()
    });
  };

  return (
    <CharacterChatLayout character={character}>
      <CharacterMessageList messages={messages} character={character} />
      <CharacterInput onSend={handleCharacterMessage} character={character} />
    </CharacterChatLayout>
  );
};
```

### 角色消息组件
```typescript
interface CharacterMessage extends ChatMessage {
  mood?: string;           // 角色情绪状态
  tone?: string;          // 语气标识
  characterActions?: string[]; // 角色动作描述
}

const CharacterMessageBubble: React.FC<{ message: CharacterMessage; character: Character }> = ({
  message,
  character
}) => {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start space-x-3">
        <CharacterAvatar character={character} mood={message.mood} />

        <div className="bg-white border rounded-lg p-4 max-w-[70%]">
          {/* 语气提示 */}
          {message.tone && (
            <div className="text-xs text-amber-600 mb-2 italic">
              [语气：{message.tone}]
            </div>
          )}

          {/* 消息内容 */}
          <div className="prose prose-sm">
            {message.content}
          </div>

          {/* 引用信息 */}
          {message.citations && (
            <CitationList citations={message.citations} />
          )}

          {/* 角色动作 */}
          {message.characterActions && (
            <div className="mt-2 text-xs text-slate-500 italic">
              {message.characterActions.map((action, index) => (
                <div key={index}>*{action}*</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### API集成
```typescript
// 基于api-specification.yaml
const characterAPI = {
  // GET /books/{bookId}/characters
  getBookCharacters: async (bookId: string) => {
    return api.get(`/books/${bookId}/characters`);
  },

  // GET /characters/{characterId}
  getCharacterDetail: async (characterId: string) => {
    return api.get(`/characters/${characterId}`);
  },

  // POST /dialogues/character/start
  startCharacterDialogue: async (characterId: string) => {
    return api.post('/dialogues/character/start', {
      character_id: characterId
    });
  },

  // POST /dialogues/{sessionId}/character-message
  sendCharacterMessage: async (sessionId: string, content: string, options: {
    mood?: string;
    context?: string[];
  }) => {
    return api.post(`/dialogues/${sessionId}/character-message`, {
      content,
      ...options
    });
  }
};
```

### 角色状态管理
```typescript
// stores/character-store.ts
interface CharacterStore {
  characters: Map<string, Character>;
  currentCharacter: Character | null;
  characterMood: string;
  conversationContext: string[];

  // 角色管理
  fetchCharacters: (bookId: string) => Promise<void>;
  setCurrentCharacter: (character: Character) => void;

  // 对话上下文
  updateMood: (mood: string) => void;
  addContext: (context: string) => void;
  clearContext: () => void;
}
```

## 组件规范
### CharacterSidebar组件
```typescript
interface CharacterSidebarProps {
  character: Character;
  relatedCharacters: Character[];
  onCharacterSwitch: (characterId: string) => void;
}

// 功能：
// - 当前角色信息展示
// - 角色设定说明
// - 其他角色快速切换
// - 书籍信息链接
```

### CharacterAvatar组件
```typescript
interface CharacterAvatarProps {
  character: Character;
  mood?: string;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

// 功能：
// - 角色头像展示
// - 根据情绪变化表情
// - 在线状态指示
// - 悬浮显示角色信息
```

### MoodSelector组件
```typescript
interface MoodSelectorProps {
  character: Character;
  currentMood: string;
  onMoodChange: (mood: string) => void;
}

// 预设情绪：
// - neutral: 平静
// - happy: 愉悦
// - sad: 悲伤
// - angry: 愤怒
// - thoughtful: 沉思
```

### CharacterThemeProvider组件
```typescript
interface CharacterThemeProps {
  character: Character;
  children: React.ReactNode;
}

// 功能：
// - 根据角色调整主题色
// - 设置背景氛围
// - 字体和排版适配
```

### ContextIndicator组件
```typescript
interface ContextIndicatorProps {
  context: string[];
  onClearContext: () => void;
}

// 功能：
// - 显示对话上下文
// - 清除历史上下文
// - 上下文相关性提示
```

## 验收标准
### 功能要求
- [ ] 角色信息正确展示
- [ ] 角色对话风格一致
- [ ] 语气标识正确显示
- [ ] 角色切换功能正常
- [ ] 情绪状态管理
- [ ] 对话上下文保持

### 体验要求
- [ ] 沉浸式角色体验
- [ ] 语言风格符合角色设定
- [ ] 回答内容贴合角色背景
- [ ] 主题氛围协调统一

### 性能要求
- [ ] 角色头像加载优化
- [ ] 长对话性能稳定
- [ ] 主题切换流畅
- [ ] 内存使用合理

## 测试用例
### 单元测试
```typescript
describe('CharacterChat', () => {
  it('应该正确展示角色信息', () => {
    // 测试角色展示
  });

  it('应该保持角色对话风格', () => {
    // 测试语言风格
  });

  it('应该支持角色切换', () => {
    // 测试切换功能
  });

  it('应该管理对话上下文', () => {
    // 测试上下文管理
  });
});
```

### E2E测试
```typescript
describe('Character Chat Flow', () => {
  it('完整角色对话流程', () => {
    // 1. 选择角色对话
    // 2. 查看角色设定
    // 3. 开始对话
    // 4. 验证角色风格
    // 5. 切换其他角色
  });

  it('角色情绪变化', () => {
    // 1. 观察初始情绪
    // 2. 发送特定消息
    // 3. 验证情绪变化
    // 4. 检查回答风格调整
  });
});
```

## 实施步骤
1. 创建角色对话页面路由
2. 实现CharacterSidebar组件
3. 开发CharacterMessageBubble
4. 实现角色主题系统
5. 集成角色API调用
6. 开发情绪状态管理
7. 实现角色切换功能
8. 添加对话上下文管理
9. 优化沉浸式体验
10. 完成测试用例

## 角色对话特性映射
基于devDocument.md角色对话描述：

| 角色特征 | 实现方式 | 技术细节 |
|---------|----------|---------|
| 语言风格 | systemPrompt配置 | 角色专属提示词 |
| 情绪表达 | mood状态管理 | 实时情绪跟踪 |
| 背景设定 | context上下文 | 历史记忆注入 |
| 视觉呈现 | 主题色调配置 | 动态样式切换 |

## 相关文档引用
- devDocument.md: 第99-118行（角色对话体验）
- devDocument.md: 第431-475行（角色管理配置）
- api-specification.yaml: 角色相关API
- sequence-diagram.md: 角色对话时序