# AI 面试系统语音化系统

基于大语言模型的 AI 模拟面试系统，包含简历解析、模拟面试、语音交互、题库管理、爬虫题库补充和面试评估报告等能力。

## 项目内容

- `ai-interview-system/`：前后端应用源码，包含 React 前端、FastAPI 后端和 Docker 编排配置。
- `1_产品经理_PRD需求文档*.md`：产品需求文档。
- `2_架构师_技术设计文档*.md`：技术设计文档。
- `4_测试工程师_测试验收报告*.md`：测试验收报告。
- `plan.md`：项目计划。

## 快速开始

详细启动方式请查看 [ai-interview-system/README.md](ai-interview-system/README.md)。

本地运行前需要复制环境变量模板：

```bash
cd ai-interview-system
cp .env.example .env
```

然后在 `.env` 中配置自己的 OpenAI 兼容 API 地址、模型和 API Key。实际 `.env`、本地数据库、上传文件、虚拟环境和依赖目录不会提交到仓库。

## 许可证

本项目使用 MIT License 开源，详见 [LICENSE](LICENSE)。
