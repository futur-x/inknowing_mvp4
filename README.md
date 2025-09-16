# InKnowing MVP 4.0 - AI驱动的知识对话平台

## 🚀 项目概述

InKnowing是一个基于AI的知识对话平台，让用户能够与书籍和角色进行智能对话，获得个性化的阅读体验。

### ✨ 核心特性

- 📚 **智能书籍对话** - 与任何书籍进行深度对话
- 👥 **角色扮演对话** - 与书中角色直接交流
- 🔍 **智能搜索** - AI驱动的语义搜索
- 📤 **书籍上传** - 支持用户上传和向量化自己的书籍
- 💳 **会员系统** - 多层级会员和积分系统
- 🎯 **个性化推荐** - 基于用户偏好的智能推荐

## 🏗️ 技术架构

### 后端技术栈
- **FastAPI** - 现代异步Web框架
- **PostgreSQL** - 主数据库
- **SQLAlchemy 2.0** - ORM
- **ChromaDB** - 向量数据库
- **Redis** - 缓存层
- **OpenAI/Anthropic** - AI模型集成

### 已实现的API模块
- ✅ 认证授权 (JWT + 微信/手机登录)
- ✅ 用户管理 (资料、会员系统)
- ✅ 书籍管理 (CRUD、角色管理)
- ✅ 智能搜索 (语义搜索、书名搜索)
- ✅ 对话系统 (书籍/角色对话、WebSocket)
- ✅ 上传系统 (文件处理、向量化)
- ✅ 支付集成 (Stripe、支付宝、微信支付)
- ✅ AI模型管理 (多模型支持、配置)

## 🎯 业务逻辑守恒

本项目严格遵循**业务逻辑守恒原理**，确保用户旅程、时序图、状态图和API规范之间的完全一致性。

### 文档结构
```
.futurxlab/
├── api-specification.yaml    # OpenAPI 3.0规范
├── user-journey.mmd          # 用户旅程图
├── sequence-diagram.mmd      # 时序图
├── state-diagram.mmd         # 状态图
└── architecture.mmd          # 系统架构图
```

## 🚦 快速开始

### 环境要求
- Python 3.11+
- PostgreSQL 14+
- Redis 6+

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/futur-x/inknowing_mvp4.git
cd inknowing_mvp4
```

2. **安装依赖**
```bash
cd backend
pip install -r requirements.txt
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和API密钥
```

4. **初始化数据库**
```bash
python database/init_db.py
```

5. **启动服务**
```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8888 --reload
```

### 🌐 API文档

启动服务后，可以访问以下链接：

- **Swagger UI**: http://localhost:8888/docs
- **ReDoc**: http://localhost:8888/redoc
- **OpenAPI规范**: http://localhost:8888/openapi.json

## 📁 项目结构

```
inknowing_mvp4/
├── backend/                  # 后端代码
│   ├── api/                  # API路由
│   ├── core/                 # 核心功能
│   ├── models/               # 数据模型
│   ├── schemas/              # 请求/响应模式
│   ├── services/             # 业务逻辑
│   ├── config/               # 配置文件
│   └── utils/                # 工具函数
├── database/                 # 数据库相关
├── .futurxlab/              # 架构文档
└── task/                    # 任务文档
```

## 🔧 开发指南

### API开发规范
- 严格遵循 `.futurxlab/api-specification.yaml`
- 使用async/await模式
- 完整的请求/响应验证
- 统一的错误处理

### 数据库设计
- 支持软删除
- 审计日志
- 分区表设计
- 索引优化

### 安全标准
- JWT认证
- 请求限流
- 数据验证
- SQL注入防护

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 📄 许可证

本项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🔗 相关链接

- [项目文档](./devDocument.md)
- [API规范](./.futurxlab/api-specification.yaml)
- [开发任务](./task/)

---

**由 FuturX 团队开发** 🚀