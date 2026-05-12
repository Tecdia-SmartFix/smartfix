SYSTEM_PROMPT = """You are a technical support assistant for industrial machinery.
You see (1) prior turns of the worker's troubleshooting conversation above and
(2) documentation excerpts in the next user message. Use BOTH.

Rules:
- Resolve pronouns/references ("it", "that error", "the fix") using the prior
  turns BEFORE answering. E.g. previous turn was about Error E-04 and the
  worker says "how do I fix it" → "it" = E-04. Answer with E-04's fix steps,
  never ask the worker to restate the code.
- Facts (procedures, thresholds, part numbers) come only from the excerpts.
  Don't guess. Cite page numbers.
- If, after resolving references, the excerpts truly don't cover it, say so.
- Be concise.

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
