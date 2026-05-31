import unittest
from types import SimpleNamespace

from app.services import ai_service


class FakeAIService:
    def __init__(self, content="这不是 JSON"):
        self.content = content

    async def chat_completion(self, messages, stream=False, max_tokens=800):
        return {
            "choices": [
                {
                    "message": {
                        "content": self.content,
                    }
                }
            ]
        }


class GenerateEvaluationTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original_ai_service = ai_service._ai_service
        ai_service._ai_service = FakeAIService()

    async def asyncTearDown(self):
        ai_service._ai_service = self.original_ai_service

    async def test_returns_default_evaluation_when_model_returns_non_json(self):
        messages = [
            SimpleNamespace(role="user", content="我有 FastAPI 和 React 项目经验。"),
            SimpleNamespace(role="assistant", content="请说说你如何设计异步任务。"),
        ]

        result = await ai_service.generate_evaluation(
            messages,
            job_position="AI后端工程师",
            interview_type="technical",
        )

        self.assertEqual(result["overall_score"], 70)
        self.assertEqual(result["technical_score"], 70)
        self.assertEqual(result["overall_comment"], "评估完成")
        self.assertEqual(result["dimension_scores"], {})
        self.assertEqual(result["question_reviews"], [])

    async def test_extracts_evaluation_json_from_markdown_and_explanation(self):
        self.original_ai_service = ai_service._ai_service
        ai_service._ai_service = FakeAIService(
            """
            下面是评估结果：
            ```json
            {
              "overall_score": 88,
              "technical_score": 91,
              "communication_score": 84,
              "logic_score": 86,
              "expression_score": 83,
              "job_fit_score": 90,
              "adaptability_score": 82,
              "overall_comment": "回答扎实，能结合项目解释技术取舍。",
              "strengths": "项目经验具体",
              "weaknesses": "风险预案略少",
              "suggestions": "补充更多失败案例复盘",
              "dimension_scores": {"knowledge_depth": 91},
              "question_reviews": [{"question": "如何设计任务队列", "answer": "摘要", "score": 86, "comment": "清晰", "suggestion": "补充监控"}]
            }
            ```
            以上仅供参考。
            """
        )
        messages = [SimpleNamespace(role="user", content="我负责过异步任务平台。")]

        result = await ai_service.generate_evaluation(messages)

        self.assertEqual(result["overall_score"], 88)
        self.assertEqual(result["technical_score"], 91)
        self.assertEqual(result["dimension_scores"]["knowledge_depth"], 91)
        self.assertEqual(result["question_reviews"][0]["score"], 86)


class RuntimeModelConfigTest(unittest.IsolatedAsyncioTestCase):
    async def test_chat_completion_uses_runtime_active_config_provider(self):
        class RuntimeProvider:
            async def get_active_config(self):
                return ai_service.RuntimeModelConfig(
                    name="local-gemma",
                    api_key="runtime-key",
                    base_url="http://runtime.example/v1",
                    model="runtime-model",
                    temperature=0.2,
                    max_tokens=1234,
                )

        class FakeResponse:
            def __init__(self):
                self.payload = {"choices": [{"message": {"content": "{}"}}]}

            def raise_for_status(self):
                return None

            def json(self):
                return self.payload

        class FakeClient:
            def __init__(self):
                self.calls = []

            async def post(self, url, headers, json, timeout):
                self.calls.append({
                    "url": url,
                    "headers": headers,
                    "json": json,
                    "timeout": timeout,
                })
                return FakeResponse()

        service = ai_service.AIService(config_provider=RuntimeProvider())
        fake_client = FakeClient()
        service.client = fake_client

        await service.chat_completion([{"role": "user", "content": "hi"}], max_tokens=77)

        self.assertEqual(fake_client.calls[0]["url"], "http://runtime.example/v1/chat/completions")
        self.assertEqual(fake_client.calls[0]["headers"]["Authorization"], "Bearer runtime-key")
        self.assertEqual(fake_client.calls[0]["json"]["model"], "runtime-model")
        self.assertEqual(fake_client.calls[0]["json"]["temperature"], 0.2)
        self.assertEqual(fake_client.calls[0]["json"]["max_tokens"], 77)


if __name__ == "__main__":
    unittest.main()
