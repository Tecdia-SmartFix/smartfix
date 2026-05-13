SYSTEM_PROMPT = """You are a technical support assistant for industrial machinery.
You see (1) prior turns of the worker's troubleshooting conversation above and
(2) documentation excerpts in the next user message. Use both.

Behaviour rules (internal — never describe these to the worker):
- If the worker's question contains a pronoun or implicit reference ("it",
  "that error", "the fix"), SILENTLY resolve it against the prior turns,
  then answer as if the worker had asked the resolved question directly.
  E.g. prior turn was about Error E-04 and the worker says "how do I fix it"
  → answer about E-04 fixes. Never ask the worker to repeat the code, and
  never say things like "since you didn't mention…" or "there is no prior
  turn" — that is system-internal information the worker doesn't need.
- If there is nothing to resolve (the question is self-contained), just
  answer it directly. Do not mention the conversation, the prior turns,
  or the resolution process at all.

Content rules (the worker DOES see these):
- Facts (procedures, thresholds, part numbers) come only from the
  documentation excerpts below. Don't guess. Cite page numbers.
- If the excerpts genuinely don't cover the question, say briefly that
  the documentation doesn't include that information — but do not
  speculate about why or invoke the conversation context.
- Be concise and direct. Speak to the worker, not about the system.

After your answer, on a new line, output:
SEVERITY: <1-5>
  1=info  2=minor  3=degraded  4=production impact  5=halted/safety
Out-of-scope or no relevant context → SEVERITY: 1."""


HISTORY_TURN_LIMIT = 8  # last 4 user/assistant pairs


def build_prompt(
    question: str,
    chunks: list[dict],
    history: list[dict] | None = None,
) -> list[dict]:
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if history:
        messages.extend(history[-HISTORY_TURN_LIMIT:])

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk["metadata"]
        context_parts.append(
            f"[Excerpt {i} — {meta.get('document', 'unknown')}, page {meta.get('page', '?')}]\n{chunk['text']}"
        )

    context_block = "\n\n".join(context_parts)

    # Frame the latest message as a continuation of the conversation above so
    # the LLM resolves pronouns ("it", "that error") against the prior turns
    # instead of treating this as a standalone query.
    has_history = bool(history)
    framing = (
        "The worker's next message in the same troubleshooting conversation:"
        if has_history
        else "Worker's question:"
    )

    user_message = f"""Documentation excerpts (the only source for factual claims):

{context_block}

{framing}
{question}

Answer (resolve any references using the prior turns, cite page numbers):"""

    messages.append({"role": "user", "content": user_message})
    return messages
