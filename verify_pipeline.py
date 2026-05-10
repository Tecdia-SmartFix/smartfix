"""
verify_pipeline.py — End-to-end smoke test for the ingestion pipeline.

Drives the combined parser+chunker module (src/ingestion/parser_chunker.py)
against a PDF in data/uploads/, prints validation stats, and writes the
chunks to data/processed/ for scripts/build_index.py to consume.

Validation stats cover all metadata fields the chunker now emits:
  chunk_type breakdown, error_code coverage, cross_reference count,
  page_start vs page_number range, and safety/troubleshooting totals.
"""

from __future__ import annotations

import os
from collections import Counter

from src.ingestion.parser_chunker import process_and_chunk, save_chunks_to_json


def test_manual_processing() -> None:
    """Run the full PDF → Chunks → JSON pipeline and validate output."""

    test_pdf = "data/uploads/INJECTION MOLDING MACHINE.pdf"

    if not os.path.exists(test_pdf):
        print(f"❌ Error: PDF not found at '{test_pdf}'")
        return

    filename = os.path.basename(test_pdf)
    machine_name = os.path.splitext(filename)[0].replace(" ", "_")

    _banner(f"HARDWARE RAG — PROCESSING: {machine_name.upper()}")

    # ------------------------------------------------------------------
    # STEP 1+2 — Parse + Chunk (single call)
    # ------------------------------------------------------------------
    _step("STEP 1: PARSING + CHUNKING (process_and_chunk)")
    try:
        chunks = process_and_chunk(test_pdf, filename, machine_id=machine_name)
    except Exception as exc:
        print(f"❌ Pipeline failed: {exc}")
        return

    print(f"✅ Created {len(chunks)} chunks after merging and filtering.\n")
    print(
        "   NOTE: page_number / page_start in metadata reflect physical PDF\n"
        "   page positions recovered from Docling layout items.\n"
    )

    # ------------------------------------------------------------------
    # STEP 2 — Validation stats
    # ------------------------------------------------------------------
    _step("STEP 2: VALIDATION STATS")

    meta_list = [c["metadata"] for c in chunks]
    content_lengths = [len(c["text"]) for c in chunks]
    avg_len = sum(content_lengths) / len(content_lengths) if content_lengths else 0

    type_counts = Counter(m.get("chunk_type", "unknown") for m in meta_list)

    error_codes = sorted(
        {m["error_code"] for m in meta_list if m.get("error_code")}
    )

    xref_chunks = [
        (m["section_id"], m["cross_references"])
        for m in meta_list
        if m.get("cross_references")
    ]

    unique_pages = sorted({m["page_number"] for m in meta_list})

    multipage = [
        m for m in meta_list
        if m.get("page_start") != m.get("page_number")
    ]

    table_chunks = sum(1 for m in meta_list if m.get("is_table"))

    print(f"  Total chunks             : {len(chunks)}")
    if content_lengths:
        print(
            f"  Avg / Min / Max length   : "
            f"{avg_len:.0f} / {min(content_lengths)} / {max(content_lengths)} chars"
        )
    print(f"  PDF pages covered        : {unique_pages}")
    print(f"  Multi-page chunks        : {len(multipage)}")
    print(f"  Table chunks             : {table_chunks}")
    print()
    print(f"  Safety-tagged            : {sum(1 for m in meta_list if m.get('is_safety'))}")
    print(f"  Troubleshooting-tagged   : {sum(1 for m in meta_list if m.get('is_troubleshooting'))}")
    print()
    print("  chunk_type breakdown:")
    for ctype, count in sorted(type_counts.items()):
        print(f"    {ctype:<20} : {count}")
    print()
    print(f"  Error codes found        : {error_codes}")
    print()
    if xref_chunks:
        print("  Cross-references:")
        for sid, refs in xref_chunks:
            print(f"    [{sid}]  →  {refs}")
    else:
        print("  Cross-references         : none detected")
    print()

    # ------------------------------------------------------------------
    # STEP 3 — Chunk preview (first 5)
    # ------------------------------------------------------------------
    _step("STEP 3: CHUNK PREVIEW (first 5)")
    for i, chunk in enumerate(chunks[:5], start=1):
        m = chunk["metadata"]
        print(f"  CHUNK {i:>2}")
        print(f"    section_id     : {m['section_id'] or '(none)'}")
        print(f"    chunk_type     : {m['chunk_type']}")
        print(f"    page           : {m['page_start']} → {m['page_number']}")
        print(f"    is_safety      : {m['is_safety']}")
        print(f"    is_table       : {m['is_table']}")
        print(f"    error_code     : {m['error_code']}")
        print(f"    cross_refs     : {m['cross_references']}")
        preview = chunk["text"].replace("\n", " ").strip()
        print(f"    content        : {preview[:120]}...")
        print()

    # ------------------------------------------------------------------
    # STEP 4 — Export JSON
    # ------------------------------------------------------------------
    _step("STEP 4: EXPORTING JSON FOR BACKEND")
    output_path = f"data/processed/{machine_name}_chunks.json"
    save_chunks_to_json(chunks, output_path)

    _banner("PIPELINE VERIFICATION COMPLETE")
    print(f"  Output → {output_path}\n")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _banner(title: str) -> None:
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


def _step(title: str) -> None:
    print(f"--- {title} ---")


if __name__ == "__main__":
    test_manual_processing()
