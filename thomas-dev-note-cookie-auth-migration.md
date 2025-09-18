# Thomas Development Note - Cookie Authentication Migration

## 任务概述
将认证机制从 localStorage 改为 Cookie，以解决 SSR 兼容性问题

## Todo List
- [ ] 后端 - 修改 CORS 配置以支持 credentials
- [ ] 后端 - 修改登录接口添加 cookie 设置
- [ ] 后端 - 修改登出接口添加 cookie 清除
- [ ] 后端 - 修改认证中间件支持从 cookie 读取 token
- [ ] 前端 - 修改 API 客户端添加 credentials: 'include'
- [ ] 前端 - 创建 Next.js middleware 进行路由保护
- [ ] 前端 - 修改认证 Store 移除 localStorage
- [ ] 前端 - 清理 AuthGuard 组件
- [ ] 测试 - 验证登录功能
- [ ] 测试 - 验证 cookie 设置和 SSR 兼容性

## 当前进度
✅ 任务1完成：CORS配置已经正确设置，支持credentials和前端地址
✅ 任务2完成：登录和注册接口已添加cookie设置
✅ 任务3完成：登出接口已添加cookie清除
✅ 任务4完成：认证中间件已支持优先从cookie读取token，保持向后兼容
✅ 任务5完成：API客户端已添加credentials: 'include'，移除localStorage依赖
✅ 任务6完成：Next.js middleware已更新使用access_token cookie
✅ 任务7完成：认证Store已移除localStorage持久化，改为cookie驱动
✅ 任务8完成：AuthGuard组件已清理，移除localStorage依赖
✅ 任务9完成：测试验证登录功能正常，cookie设置成功

## 业务逻辑对照
- API 规范中明确使用 JWT Bearer tokens
- 需要保持 API 接口响应格式不变
- 只调整 token 传递方式从 header 改为 cookie

## 发现的问题/风险
- profile页面有缺失的use-toast依赖，但不影响cookie认证功能
- SSR兼容性已通过移除ssr:false配置解决

## 与三图一端的一致性检查
- API 规范中的认证流程保持不变
- 只是 token 传递机制的工程实现调整

## 下一步计划
1. 先修改后端 CORS 配置

## 技术决策记录
- 使用 httponly cookie 提高安全性
- 保持向后兼容，同时支持 header 和 cookie