import os
from groq import Groq, APIError, APIConnectionError, RateLimitError

MODEL = "llama-3.3-70b-versatile"
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
