# 03 - Dialogue Flow Integration Test
## 对话功能前后端集成测试

### 测试目标
验证书籍对话和角色对话的前后端完整对接，包括 WebSocket 实时通信

### 前置条件
- 用户已登录（使用测试账号）
- 至少有一本书籍数据
- WebSocket 服务正常运行

### 测试任务清单

#### Task 1: 书籍对话初始化
- [ ] 进入书籍详情页
- [ ] 点击"开始对话"按钮
- [ ] 验证调用 `POST /v1/dialogues/book/start`
- [ ] 验证返回 session_id
- [ ] 验证 WebSocket 连接建立 `ws://localhost:8888/ws/dialogue/{session_id}`
- [ ] 验证对话界面正确加载

#### Task 2: 发送和接收消息
- [ ] 在输入框输入消息
- [ ] 点击发送按钮
- [ ] 验证调用 `POST /v1/dialogues/{sessionId}/messages`
- [ ] 验证消息通过 WebSocket 实时推送
- [ ] 验证 AI 响应正确接收和展示
- [ ] 验证消息历史记录保存

#### Task 3: 角色对话功能
- [ ] 在书籍详情页选择角色
- [ ] 验证调用 `GET /v1/books/{bookId}/characters`
- [ ] 点击角色开始对话
- [ ] 验证调用 `POST /v1/dialogues/character/start`
- [ ] 验证角色对话模式激活
- [ ] 测试角色特定回复

#### Task 4: 对话历史管理
- [ ] 验证调用 `GET /v1/dialogues/history`
- [ ] 验证历史列表正确展示
- [ ] 点击历史对话恢复
- [ ] 验证调用 `GET /v1/dialogues/{sessionId}`
- [ ] 验证消息历史正确加载

#### Task 5: 配额追踪
- [ ] 每次对话后验证配额更新
- [ ] 验证调用 `GET /v1/users/quota`
- [ ] 验证前端配额显示实时更新
- [ ] 测试配额用尽时的提示

### API 端点清单
```yaml
dialogue_endpoints:
  - POST /v1/dialogues/book/start
  - POST /v1/dialogues/character/start
  - POST /v1/dialogues/{sessionId}/messages
  - GET /v1/dialogues/{sessionId}
  - GET /v1/dialogues/history
  - DELETE /v1/dialogues/{sessionId}

websocket_endpoints:
  - WS /ws/dialogue/{sessionId}

book_endpoints:
  - GET /v1/books/{bookId}/characters
```

### WebSocket 消息格式

#### 发送消息
```json
{
  "type": "user_message",
  "content": "你好，请介绍一下这本书的主要内容",
  "timestamp": "2025-01-17T10:00:00Z"
}
```

#### 接收 AI 响应
```json
{
  "type": "ai_response",
  "content": "这本书主要讲述了...",
  "streaming": true,
  "timestamp": "2025-01-17T10:00:01Z"
}
```

### 前端组件验证
- [ ] DialogueInterface 组件正确渲染
- [ ] MessageList 显示所有消息
- [ ] InputArea 可以输入和发送
- [ ] LoadingIndicator 在等待时显示
- [ ] ErrorBoundary 捕获错误

### 实时通信测试
- [ ] WebSocket 连接自动重连
- [ ] 消息顺序保证
- [ ] 流式响应正确处理
- [ ] 连接断开时的提示

### 错误场景测试
- [ ] WebSocket 连接失败
- [ ] 消息发送失败
- [ ] AI 服务不可用
- [ ] 配额不足
- [ ] 会话超时

### 性能测试点
- [ ] 消息延迟 < 100ms
- [ ] 大量消息时的滚动性能
- [ ] 长文本消息的渲染
- [ ] 并发对话支持

### 测试数据
```json
{
  "test_book_id": "book-test-001",
  "test_character_ids": ["char-1", "char-2"],
  "test_messages": [
    "这本书的核心思想是什么？",
    "能举个具体的例子吗？",
    "作者的写作风格如何？"
  ],
  "test_session_id": "session-test-001"
}
```