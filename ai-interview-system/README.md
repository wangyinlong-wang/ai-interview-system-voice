# AI 模拟面试系统

> 每一次练习，都是向 offer 更进一步。

基于大语言模型的 AI 模拟面试系统，用户上传简历后，AI 扮演面试官进行个性化模拟面试，最后给出多维度评分和改进建议。

## 功能特性

- **简历智能解析** - 上传 PDF/DOC/DOCX/TXT 格式简历，AI 自动提取技能、工作经历、项目经验等关键信息
- **沉浸式模拟面试** - AI 扮演面试官，基于简历内容生成个性化问题，支持实时追问
- **多维度评估报告** - 技术能力、逻辑思维、沟通表达、语言表达、岗位匹配、应变能力 6 维度评分
- **能力雷达图** - 可视化展示各维度得分，直观了解优劣势
- **逐题点评** - 每道题的 AI 点评和改进建议
- **SSE 流式输出** - 打字机效果的实时对话体验

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Zustand + TanStack Query + Recharts
- **后端**: Python FastAPI + SQLAlchemy + SQLite + JWT
- **AI**: 兼容 OpenAI 格式的大模型 API

## 项目结构

```
ai-interview-system/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── pages/              # 7 个页面组件
│   │   ├── components/         # 可复用组件（含 shadcn/ui）
│   │   ├── stores/             # Zustand 状态管理
│   │   ├── services/           # API 服务层
│   │   ├── types/              # TypeScript 类型定义
│   │   ├── lib/                # 工具函数
│   │   ├── App.tsx             # 路由配置
│   │   └── main.tsx            # 入口文件
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── backend/                     # 后端项目
│   ├── app/
│   │   ├── main.py             # FastAPI 入口
│   │   ├── config.py           # 配置文件
│   │   ├── database.py         # 数据库连接
│   │   ├── models.py           # SQLAlchemy 模型
│   │   ├── schemas.py          # Pydantic 模型
│   │   ├── routers/            # API 路由
│   │   │   ├── auth.py         # 认证路由
│   │   │   ├── resumes.py      # 简历路由
│   │   │   └── interviews.py   # 面试路由
│   │   ├── services/           # 业务逻辑服务
│   │   │   └── ai_service.py   # AI 服务
│   │   └── utils/              # 工具函数
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml           # Docker 编排
├── .env.example                 # 环境变量模板
└── README.md                    # 项目说明
```

## 快速开始

### 方式一：本地开发

#### 1. 克隆项目

```bash
git clone <repo-url>
cd ai-interview-system
```

#### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 OpenAI API Key
```

#### 3. 启动后端

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env 填入 API Key
python run.py
```

后端将在 http://localhost:8000 启动，API 文档访问 http://localhost:8000/docs

#### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端将在 http://localhost:5173 启动

### 方式二：Docker 部署

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 填入 API Key

# 2. 启动所有服务
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f
```

访问 http://localhost:5173 使用系统

## 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | 是 | 大模型 API Key |
| `OPENAI_BASE_URL` | 否 | API 基础地址，默认 `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 否 | 模型名称，默认 `gpt-3.5-turbo` |
| `SECRET_KEY` | 否 | JWT 密钥，用于用户认证 |

## API 接口列表

| 分类 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 认证 | POST | `/api/v1/auth/register` | 用户注册 |
| 认证 | POST | `/api/v1/auth/login` | 用户登录 |
| 认证 | GET | `/api/v1/auth/me` | 获取当前用户 |
| 简历 | POST | `/api/v1/resumes` | 上传简历 |
| 简历 | GET | `/api/v1/resumes` | 简历列表 |
| 简历 | GET | `/api/v1/resumes/{id}` | 简历详情 |
| 简历 | POST | `/api/v1/resumes/{id}/parse` | 解析简历 |
| 简历 | DELETE | `/api/v1/resumes/{id}` | 删除简历 |
| 面试 | POST | `/api/v1/interviews` | 创建面试 |
| 面试 | GET | `/api/v1/interviews` | 面试列表 |
| 面试 | GET | `/api/v1/interviews/{id}` | 面试详情 |
| 面试 | POST | `/api/v1/interviews/{id}/messages` | 发送消息 (SSE) |
| 面试 | GET | `/api/v1/interviews/{id}/messages` | 消息历史 |
| 面试 | POST | `/api/v1/interviews/{id}/complete` | 结束面试 |
| 面试 | GET | `/api/v1/interviews/{id}/evaluation` | 获取评估 |
| 面试 | DELETE | `/api/v1/interviews/{id}` | 删除面试 |

## 页面路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | Landing 页面，产品展示 |
| `/auth` | 登录/注册 | 用户认证 |
| `/resume` | 简历管理 | 上传、解析、管理简历 |
| `/interview/setup` | 面试准备 | 选择岗位、难度、配置 |
| `/interview/:id` | 面试房间 | AI 实时对话面试 |
| `/interview/:id/report` | 评估报告 | 综合评分和改进建议 |
| `/history` | 历史记录 | 面试列表和详情 |

## 开发说明

### 后端开发

```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器（热重载）
python run.py

# 数据库自动创建，无需手动迁移
# 上传文件存储在 ./uploads/resumes 目录
```

### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 切换 AI 模型

系统支持任何兼容 OpenAI API 格式的模型服务，包括：

- OpenAI (GPT-3.5/GPT-4)
- DeepSeek (DeepSeek-V3/DeepSeek-R1)
- 通义千问
- 其他兼容服务

修改 `.env` 文件中的 `OPENAI_BASE_URL` 和 `OPENAI_MODEL` 即可切换。

## 许可证

MIT License
