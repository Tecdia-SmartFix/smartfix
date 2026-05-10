SYSTEM_PROMPT = """You are a technical support assistant for industrial machinery.
Answer questions strictly using the provided context excerpts from official documentation.
Rules:
- Only use information from the context below. Never guess or add outside knowledge.
- Cite the page number(s) from the source when giving an answer.
- If the context does not contain enough information, say so clearly.
- Be concise and precise.

After your answer, on a new line, output a severity rating in this exact format:
SEVERITY: <integer 1-5>

Severity rubric:
  1 = informational query, no action needed
  2 = minor adjustment, machine still operational
  3 = degraded performance, plan a fix soon
  4 = production impact, fix urgently
  5 = production halted or safety risk, immediate intervention

If the question is out-of-scope or no relevant context was found, use SEVERITY: 1."""


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

    user_message = f"""Context from documentation:

{context_block}

Question: {question}

Answer (cite page numbers):"""

    messages.append({"role": "user", "content": user_message})
    return messages
