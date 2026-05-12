import os
from groq import Groq, APIError, APIConnectionError, RateLimitError

# llama-3.1-8b-instant on Groq: ~30K tokens/min on the free tier vs
# llama-3.3-70b-versatile's 12K tokens/min — fewer rate-limit hits during
# active testing/use, much faster TTFT, and good enough for RAG paraphrasing
# where the model is summarizing retrieved chunks, not reasoning from scratch.
# Flip back to "llama-3.3-70b-versatile" if you need richer reasoning and can
# tolerate the lower throughput.
MODEL = "llama-3.1-8b-instant"
MAX_TOKENS = 512
TEMPERATURE = 0.1

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set")
        _client = Groq(api_key=api_key)
    return _client


def call_llm(messages: list[dict]) -> str:
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
        )
        return response.choices[0].message.content.strip()
    except RateLimitError:
        raise RuntimeError("rate_limit")
    except APIConnectionError:
        raise RuntimeError("connection_error")
    except APIError as e:
        raise RuntimeError(f"api_error:{e.status_code}")
