# 05 - Book Upload Integration Test
## 书籍上传功能前后端集成测试

### 测试目标
验证付费会员上传书籍的完整流程前后端对接

### 前置条件
- 使用 Premium 或 Super 会员账号
- 准备测试书籍文件（PDF/EPUB/TXT）
- 上传配额未超限

### 测试任务清单

#### Task 1: 上传权限验证
- [ ] 访问 `/upload` 页面
- [ ] 验证调用 `GET /v1/users/upload-quota`
- [ ] 验证显示剩余上传额度
- [ ] Free/Basic 用户显示升级提示
- [ ] Premium/Super 用户显示上传界面

#### Task 2: 书籍存在性检查
- [ ] 输入书名和作者
- [ ] 验证调用 `POST /v1/upload/check`
- [ ] 已存在的书显示提示
- [ ] AI已知的书显示快速处理标识
- [ ] 新书显示可以上传

#### Task 3: 文件上传流程
- [ ] 选择文件（支持拖拽）
- [ ] 验证文件类型和大小限制
- [ ] 填写书籍元数据
- [ ] 验证调用 `POST /v1/upload/init` 初始化上传
- [ ] 验证调用 `POST /v1/upload/chunk` 分块上传
- [ ] 显示上传进度条

#### Task 4: 书籍处理监控
- [ ] 上传完成后跳转处理页面
- [ ] 验证调用 `GET /v1/upload/{uploadId}/status`
- [ ] 实时显示处理进度
- [ ] WebSocket 接收处理状态更新
- [ ] 处理完成通知

#### Task 5: 上传管理页面
- [ ] 访问 `/upload/manage`
- [ ] 验证调用 `GET /v1/users/uploads`
- [ ] 显示所有上传的书籍
- [ ] 支持删除和编辑
- [ ] 显示处理状态

### API 端点清单
```yaml
upload_endpoints:
  - GET /v1/users/upload-quota
  - POST /v1/upload/check
  - POST /v1/upload/init
  - POST /v1/upload/chunk
  - POST /v1/upload/complete
  - GET /v1/upload/{uploadId}/status
  - GET /v1/users/uploads
  - DELETE /v1/upload/{uploadId}

websocket:
  - WS /ws/upload/{uploadId}
```

### 上传初始化请求
```json
{
  "filename": "深度学习.pdf",
  "filesize": 10485760,
  "filetype": "application/pdf",
  "metadata": {
    "title": "深度学习",
    "author": "Ian Goodfellow",
    "isbn": "978-7-115-46147-6",
    "language": "zh",
    "categories": ["AI", "Machine Learning"]
  }
}
```

### 分块上传格式
```javascript
FormData {
  upload_id: "upload-uuid",
  chunk_index: 0,
  total_chunks: 10,
  chunk: Blob
}
```

### 处理状态响应
```json
{
  "upload_id": "upload-uuid",
  "status": "processing",
  "progress": 65,
  "stages": {
    "upload": "completed",
    "validation": "completed",
    "extraction": "completed",
    "analysis": "processing",
    "indexing": "pending"
  },
  "estimated_time": 120
}
```

### 前端组件验证
- [ ] UploadZone 拖拽功能
- [ ] FileValidator 文件校验
- [ ] UploadProgress 进度显示
- [ ] MetadataForm 表单验证
- [ ] ProcessingStatus 状态追踪

### 文件处理测试
- [ ] PDF 文本提取
- [ ] EPUB 解析
- [ ] TXT 编码识别
- [ ] 大文件分块处理
- [ ] 并发上传支持

### 错误场景测试
- [ ] 文件过大（>100MB）
- [ ] 不支持的格式
- [ ] 上传中断恢复
- [ ] 配额超限
- [ ] 处理失败重试

### 性能测试
- [ ] 10MB 文件上传时间
- [ ] 50MB 文件处理时间
- [ ] 并发3个文件上传
- [ ] 断点续传功能

### 测试数据
```json
{
  "test_files": [
    {
      "name": "test_book_small.pdf",
      "size": 1048576,
      "type": "application/pdf"
    },
    {
      "name": "test_book_large.epub",
      "size": 52428800,
      "type": "application/epub+zip"
    }
  ],
  "test_metadata": {
    "title": "测试书籍",
    "author": "测试作者",
    "categories": ["测试分类"],
    "language": "zh"
  }
}
```