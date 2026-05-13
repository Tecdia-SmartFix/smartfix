import os
import traceback
from groq import Groq, APIError, APIConnectionError, RateLimitError

# llama-3.3-70b-versatile gives richer, more contextual answers — it anticipates
# the worker's likely next question (causes, fix steps, safety notes) and writes
# in a more conversational, technical-support voice. Groq's free tier limits it
# to ~12K tokens/min (vs llama-3.1-8b-instant's ~30K), so rapid back-to-back
# testing can hit rate_limit; for production traffic with ~5–8 queries/min per
# worker, it sits well inside budget.
#
# Flip to "llama-3.1-8b-instant" if you need higher throughput and can tolerate
# terser, more literal answers.
MODEL = "llama-3.1-8b-instant"
MAX_TOKENS = 512
TEMPERATURE = 0.1

_client: Groq | None = None


def get_client() -> Groq:
    """Return the lazy-initialised singleton, creating it if needed."""
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set")
        _client = Groq(api_key=api_key)
    return _client


def _reset_client() -> None:
    """Drop the cached Groq client so the next call_llm() reconstructs it.

    Long-running uvicorn processes have been observed wedging with a stale
    transport — every subsequent /query returns 'service temporarily
    unavailable' even though Groq itself is healthy. Clearing the singleton
    on any failure lets the next request recover automatically.
    """
    global _client
    _client = None


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
        # Don't reset the client — the connection is fine, we're just throttled.
        # Logging the body helps confirm whether it's TPM or RPM that hit.
        print("⚠️  Groq rate_limit hit", flush=True)
        raise RuntimeError("rate_limit")
    except APIConnectionError as e:
        # Transport-level failure (DNS, TCP, TLS, dead keep-alive socket).
        # The cached client is almost certainly holding a bad connection;
        # drop it so the next call dials fresh.
        print(f"⚠️  Groq connection_error: {e!r} — resetting cached client", flush=True)
        _reset_client()
        raise RuntimeError("connection_error")
    except APIError as e:
        # 4xx/5xx from Groq. 5xx is usually transient; 4xx (e.g. auth, bad
        # request) deserves a fresh client too in case it was a stale token.
        # Print the full body so we can diagnose from uvicorn's logs.
        print(f"⚠️  Groq api_error {e.status_code}: {e!r} — resetting cached client", flush=True)
        traceback.print_exc()
        _reset_client()
        raise RuntimeError(f"api_error:{e.status_code}")
    except Exception as e:
        # Catch-all for anything the Groq SDK might throw that isn't a known
        # APIError subclass (e.g. httpx-level RemoteProtocolError on a wedged
        # transport — exactly the symptom we observed today).
        print(f"⚠️  Unexpected LLM error: {type(e).__name__}: {e!r} — resetting cached client", flush=True)
        traceback.print_exc()
        _reset_client()
        raise RuntimeError(f"unexpected:{type(e).__name__}")
