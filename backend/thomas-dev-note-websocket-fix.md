# Thomas开发笔记 - WebSocket连接错误修复

## Todo List
- [ ] 检查后端日志，了解WebSocket连接失败的原因
- [ ] 检查前端WebSocket连接代码，特别是token传递逻辑
- [ ] 验证ws_token的获取和存储机制
- [ ] 检查后端WebSocket认证逻辑
- [ ] 修复WebSocket错误处理，让错误信息更清晰
- [ ] 测试WebSocket连接和消息发送功能

## 当前进度
- 开始调查WebSocket连接问题

## 业务逻辑对照
- 风险：缺少futurxlab文档，可能与设计不一致

## 发现的问题/风险
- WebSocket error返回空对象 {}
- 可能的token传递问题

## 下一步计划
1. 检查后端日志
2. 分析前端WebSocket连接代码