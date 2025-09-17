# 01 - Discovery Flow Integration Test
## 发现流程前后端集成测试

### 测试目标
验证匿名用户浏览和发现功能的前后端对接是否正常工作

### 前置条件
- 后端服务运行在 http://localhost:8888
- 前端服务运行在 http://localhost:3555
- 数据库已初始化基础数据

### 测试任务清单

#### Task 1: 首页加载测试
- [ ] 访问首页 http://localhost:3555
- [ ] 验证首页正常加载，无控制台错误
- [ ] 验证热门书籍区域调用 `GET /v1/books/popular`
- [ ] 验证最新书籍区域调用 `GET /v1/books/recent`
- [ ] 检查 CORS 配置正确，无跨域错误

#### Task 2: 搜索功能集成
- [ ] 在首页搜索框输入关键词
- [ ] 验证前端调用 `GET /v1/search?q={keyword}`
- [ ] 验证后端返回搜索结果
- [ ] 验证搜索结果在前端正确展示
- [ ] 测试空搜索和特殊字符处理

#### Task 3: 书籍列表页面
- [ ] 点击"浏览书籍"按钮
- [ ] 验证调用 `GET /v1/books` 接口
- [ ] 验证分页参数传递 `?page=1&limit=20`
- [ ] 验证书籍列表正确渲染
- [ ] 测试分类筛选 `GET /v1/books?category=business`

#### Task 4: 书籍详情页面
- [ ] 点击任意书籍卡片
- [ ] 验证调用 `GET /v1/books/{bookId}` 接口
- [ ] 验证书籍详情数据正确展示
- [ ] 验证相关推荐调用 `GET /v1/books/{bookId}/related`
- [ ] 验证角色列表调用 `GET /v1/books/{bookId}/characters`

### API 端点清单
```yaml
endpoints:
  - GET /v1/books/popular
  - GET /v1/books/recent
  - GET /v1/search
  - GET /v1/books
  - GET /v1/books/{bookId}
  - GET /v1/books/{bookId}/related
  - GET /v1/books/{bookId}/characters
```

### 验证点
1. 所有 API 响应状态码为 200
2. 响应数据格式符合前端预期
3. 加载状态正确显示
4. 错误处理机制工作正常
5. 无 CORS 错误

### 错误场景测试
- [ ] 后端服务不可用时的错误提示
- [ ] API 返回 404 时的处理
- [ ] API 返回 500 时的处理
- [ ] 网络超时的处理

### 测试数据
```json
{
  "search_keywords": ["人工智能", "心理学", "编程"],
  "categories": ["business", "psychology", "fiction", "science"],
  "test_book_ids": ["book-1", "book-2", "book-3"]
}
```