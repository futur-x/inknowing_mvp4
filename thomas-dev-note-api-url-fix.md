# Thomas开发笔记 - API URL修复

## 问题描述
前端应用调用API时URL路径缺少`/v1`前缀，导致404错误。

错误示例：
- `GET http://localhost:8888/books/popular?period=week&limit=8` 404 (Not Found)
- `GET http://localhost:8888/books?limit=8&sort=recent` 404 (Not Found)

正确的URL应该是：
- `GET http://localhost:8888/v1/books/popular?period=week&limit=8`
- `GET http://localhost:8888/v1/books?limit=8&sort=recent`

## 根本原因分析

JavaScript的`new URL()`API在处理相对路径时有特殊行为：
- 如果endpoint以`/`开头，会替换baseURL的路径部分
- 例如：`new URL('/books', 'http://localhost:8888/v1')` → `http://localhost:8888/books`（错误！）

## 解决方案

### 修复的文件

1. **`/frontend/src/lib/api-client.ts`**
   - baseURL末尾添加斜杠：`'http://localhost:8888/v1/'`
   - buildURL方法中移除endpoint开头的斜杠
   - 修复refresh token的URL路径

2. **`/frontend/src/lib/api.ts`**
   - baseURL末尾添加斜杠：`'http://localhost:8888/v1/'`
   - request方法中移除endpoint开头的斜杠
   - upload方法中移除endpoint开头的斜杠
   - 修复refresh token的URL路径

### 关键代码改动

```typescript
// 1. baseURL末尾添加斜杠
baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888/v1/'

// 2. 处理endpoint前的斜杠
const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
const url = new URL(cleanEndpoint, this.baseURL)
```

## 业务逻辑一致性验证

根据`.futurxlab/contracts/backend.api.contract.yaml`，API配置应该是：
- base_path: "/v1"
- development URL: "http://localhost:8888"

修复后的实现与契约文档完全一致，确保了业务逻辑守恒。

## 测试验证

创建了测试脚本验证URL构建逻辑，确认：
- 所有API路径都正确包含`/v1`前缀
- 不会产生双斜杠问题
- 与后端API规范完全对齐

## Todo List完成情况
- [x] 检查api-client.ts文件查看当前的API基础路径配置
- [x] 检查use-books.tsx hook文件了解如何构建API请求
- [x] 修复api-client.ts中的基础路径配置，确保包含/v1前缀
- [x] 验证修复后的API调用是否正确使用/v1路径

## 影响范围
此修复将影响所有前端API调用，包括：
- 图书列表获取
- 热门图书查询
- 用户认证
- 对话功能
- 所有其他API端点

## 后续建议
1. 在环境变量中配置`NEXT_PUBLIC_API_BASE_URL`时，确保末尾包含斜杠
2. 编写API调用时，endpoint不要以斜杠开头
3. 考虑添加单元测试验证URL构建逻辑

---
修复完成时间：2025-09-22
修复人：Thomas (FuturX Development Engineer)