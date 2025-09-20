# Thomas Development Note - Dialogue Integration Testing

## Todo List
- [x] 检查.futurxlab文档，理解业务逻辑
- [ ] 修复数据库schema问题 - 添加missing columns (vector_model, vector_dimension)
- [ ] 插入测试书籍数据到数据库
- [ ] 使用playwright登录并导航到书籍页面
- [ ] 测试对话流程 - 选择书籍并开始对话
- [ ] 测试WebSocket连接和AI集成
- [ ] 验证配额追踪功能
- [ ] 验证对话历史记录
- [ ] 生成综合测试报告

## 当前进度
- 已找到.futurxlab目录下的三图一端文档
- 已理解用户旅程：提问→发现→对话→学习的完整流程
- ✅ 已验证数据库schema - vector_model和vector_dimension列已存在
- ✅ 已确认数据库有5本测试书籍（人类简史、百年孤独、深度学习入门、活着、红楼梦）
- ✅ 成功登录系统（13900000002账号）
- ✅ 已导航到书籍页面，显示8本样本书籍
- 正在测试对话流程

## 业务逻辑对照
根据用户旅程文档，核心流程为：
1. Discovery Phase: 用户发现和浏览书籍
2. Registration/Login: 用户注册登录
3. Free Tier Experience: 开始书籍对话，发送消息
4. Upgrade Journey: 达到配额限制后升级
5. Book Upload Flow: 上传和处理书籍

## 发现的问题/风险
1. 数据库缺少columns: books.vector_model, books.vector_dimension
2. 没有测试书籍数据
3. 需要确保WebSocket连接正常工作

## 与三图一端的一致性检查
- 用户旅程：从发现到对话的完整流程
- API规范：需要验证对话相关API端点
- 状态管理：对话状态的转换需要测试

## 下一步计划
1. 先修复数据库schema
2. 插入测试书籍数据
3. 开始playwright测试

## 技术决策记录
- 使用PostgreSQL直接添加missing columns
- 使用playwright-mcp进行前端测试
- 测试账号：13900000002 / Test@123456