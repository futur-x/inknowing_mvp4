# Thomas开发笔记 - 对话流程集成测试

## Todo List
- [x] 检查前后端服务运行状态
  - 前端: http://localhost:3555 ✓
  - 后端: http://localhost:8888/health ✓
- [x] 验证后端AI服务配置实现
  - 发现使用OpenAI/Anthropic直接客户端，需要改为LiteLLM
- [ ] 实现或修复后端AI服务集成（如需要）
- [ ] 使用Playwright登录测试账号
- [ ] 测试书籍对话初始化和WebSocket连接
- [ ] 测试消息发送和AI响应接收
- [ ] 测试角色对话功能
- [ ] 验证对话历史管理功能
- [ ] 测试配额追踪和更新
- [ ] 执行WebSocket稳定性测试
- [ ] 执行错误场景测试
- [ ] 执行性能测试验证
- [ ] 生成测试报告并对齐.futurxlab标准

## 当前进度
### 任务1：检查服务状态 ✓
- 前端服务正常运行在3555端口
- 后端API健康检查通过

### 任务2：验证AI服务配置
- 检查了现有AI对话服务实现
- 发现问题：当前使用OpenAI/Anthropic直接客户端
- 需要改为使用LiteLLM服务（https://litellm.futurx.cc）

## 业务逻辑对照
根据.futurxlab文档，对话流程需要：
1. 支持书籍对话和角色对话
2. WebSocket实时通信
3. AI响应流式传输
4. 对话历史管理
5. 配额追踪

## 发现的问题/风险
1. **AI服务集成问题**：后端未使用配置的LiteLLM服务
2. 需要修改ai_dialogue.py以支持LiteLLM API

## 技术决策记录
1. 将创建新的LiteLLM客户端集成
2. 使用OpenAI兼容的API格式调用LiteLLM
3. 支持流式响应

## 下一步计划
1. 实现LiteLLM集成
2. 修改AI对话服务以使用新的配置
3. 开始Playwright自动化测试