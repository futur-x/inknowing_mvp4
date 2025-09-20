# Thomas Development Note - Dialogue Flow Integration Testing

## Todo List
- [x] Read and analyze .futurxlab documents for dialogue flow standards
- [x] Create development note file for tracking progress
- [ ] Login with test account and verify authentication
- [ ] Navigate to book details page and verify book data
- [ ] Start dialogue session and verify WebSocket connection
- [ ] Test message sending and receiving with AI responses
- [ ] Test character dialogue features
- [ ] Verify dialogue history management
- [ ] Test quota tracking and updates
- [ ] Test WebSocket real-time communication stability
- [ ] Execute error scenario testing
- [ ] Perform performance validation
- [ ] Generate comprehensive test report aligned with .futurxlab standards

## 当前进度
### 已完成
1. 分析了 .futurxlab 文档，理解了业务逻辑守恒原理在对话流中的体现
2. 创建了开发笔记文件来追踪进度
3. 成功登录测试账号 (13900000002)
4. 导航到书籍详情页面
5. 修复前端缺少的UI组件 (alert-dialog, avatar)
6. 尝试启动对话流程

### 发现的关键点
- 对话流程遵循：搜索→选择书籍→认证检查→配额检查→创建会话→消息交换
- WebSocket 端点：`ws://localhost:8888/ws/dialogue/{sessionId}`
- 关键 API 端点已确认：
  - POST /dialogues/book/start - 开始书籍对话
  - POST /dialogues/character/start - 开始角色对话
  - POST /dialogues/{sessionId}/messages - 发送消息
  - GET /dialogues/history - 获取历史
  - WS /ws/dialogue/{sessionId} - WebSocket 连接

## 业务逻辑对照
根据 .futurxlab 文档，对话流的业务逻辑守恒体现在：
1. 用户旅程：提问→发现→对话→学习
2. 时序图：认证→配额检查→会话创建→消息交换
3. 状态图：等待→活跃→暂停→结束
4. API规范：完整的RESTful + WebSocket接口

## 测试配置
- Frontend: http://localhost:3555
- Backend: http://localhost:8888
- Test Account: phone: 13900000002, password: Test@123456
- AI Service: LiteLLM (https://litellm.futurx.cc)
- Chat Model: anthropic/claude-3-5-haiku-20241022

## 下一步计划
开始使用 Playwright 执行集成测试，从登录开始

## 技术决策记录
- 使用 Playwright MCP 进行端到端测试
- 采用真实浏览器环境确保测试准确性
- 遵循 .futurxlab 标准进行测试验证