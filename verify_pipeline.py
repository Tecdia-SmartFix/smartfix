"""
verify_pipeline.py — End-to-end smoke test for the ingestion pipeline.

Fixes applied:
  #10  Filename uses underscores (LASER_CUTTING_MACHINE.pdf) to match the
       actual file on disk.
  R2-3 machine_name derived with replace() so machine_id in metadata has
       no spaces.

Validation stats now cover all metadata fields introduced in Round 2:
  chunk_type breakdown, error_code coverage, cross_reference count,
  page_start vs page_number range, and safety/troubleshooting totals.
"""

from __future__ import annotations

import os
from collections import Counter

from src.ingestion.parser import convert_to_markdown
from src.ingestion.chunker import chunk_markdown, save_chunks_to_json


def test_manual_processing() -> None:
    """Run the full PDF → Markdown → Chunks → JSON pipeline and validate output."""

    # Fix #10: underscore filename to match file on disk
    test_pdf = "data/uploads/LASER CUTTING MACHINE.pdf"

    if not os.path.exists(test_pdf):
        print(f"❌ Error: PDF not found at '{test_pdf}'")
        return

    # Fix R2-3: normalise name so machine_id in metadata has no spaces
    machine_name = os.path.splitext(os.path.basename(test_pdf))[0].replace(" ", "_")

    _banner(f"HARDWARE RAG — PROCESSING: {machine_name.upper()}")

    # ------------------------------------------------------------------
    # STEP 1 — Parse PDF → Markdown
    # ------------------------------------------------------------------
    _step("STEP 1: PARSING PDF TO MARKDOWN")
    try:
        md_text = convert_to_markdown(test_pdf)
    except Exception as exc:
        print(f"❌ Parsing failed: {exc}")
        return

    page_count = md_text.count("[PAGE_BREAK:")
    print(f"✅ Parsing successful — {page_count} physical pages detected.\n")
    print(
        "   NOTE: page_number / page_start in metadata reflect physical PDF\n"
        "   page positions, not any printed page numbers inside the document.\n"
        "   (This PDF has no printed page numbers.)\n"
    )

    # ------------------------------------------------------------------
    # STEP 2 — Chunk Markdown
    # ------------------------------------------------------------------
    _step("STEP 2: GENERATING HIERARCHICAL CHUNKS")
    chunks = chunk_markdown(md_text, machine_name)
    print(f"✅ Created {len(chunks)} chunks after merging and filtering.\n")

    # ------------------------------------------------------------------
    # STEP 3 — Validation stats
    # ------------------------------------------------------------------
    _step("STEP 3: VALIDATION STATS")

    meta_list = [c.metadata for c in chunks]
    content_lengths = [len(c.page_content) for c in chunks]
    avg_len = sum(content_lengths) / len(content_lengths) if content_lengths else 0

    # Chunk type breakdown (R2-6)
    type_counts = Counter(m.get("chunk_type", "unknown") for m in meta_list)

    # Error code coverage (R2-7)
    error_codes = sorted(
        {m["error_code"] for m in meta_list if m.get("error_code")}
    )

    # Cross-reference summary (R2-8)
    xref_chunks = [
        (m["section_id"], m["cross_references"])
        for m in meta_list
        if m.get("cross_references")
    ]

    # Page coverage
    unique_pages = sorted({m["page_number"] for m in meta_list})

    # Multi-page chunks (page_start != page_number)
    multipage = [
        m for m in meta_list
        if m.get("page_start") != m.get("page_number")
    ]

    print(f"  Total chunks             : {len(chunks)}")
    print(f"  Avg / Min / Max length   : {avg_len:.0f} / {min(content_lengths)} / {max(content_lengths)} chars")
    print(f"  PDF pages covered        : {unique_pages}")
    print(f"  Multi-page chunks        : {len(multipage)}")
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
    # STEP 4 — Chunk preview (first 5)
    # ------------------------------------------------------------------
    _step("STEP 4: CHUNK PREVIEW (first 5)")
    for i, chunk in enumerate(chunks[:5], start=1):
        m = chunk.metadata
        print(f"  CHUNK {i:>2}")
        print(f"    section_id     : {m['section_id'] or '(none)'}")
        print(f"    chunk_type     : {m['chunk_type']}")
        print(f"    page           : {m['page_start']} → {m['page_number']}")
        print(f"    is_safety      : {m['is_safety']}")
        print(f"    error_code     : {m['error_code']}")
        print(f"    cross_refs     : {m['cross_references']}")
        preview = chunk.page_content.replace("\n", " ").strip()
        print(f"    content        : {preview[:120]}...")
        print()

    # ------------------------------------------------------------------
    # STEP 5 — Export JSON
    # ------------------------------------------------------------------
    _step("STEP 5: EXPORTING JSON FOR BACKEND")
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