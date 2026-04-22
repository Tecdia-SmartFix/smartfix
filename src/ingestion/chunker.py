"""
chunker.py — Markdown → LangChain Document chunks with rich metadata.

Complete fix history
--------------------
Round 1 (pipeline bugs):
  #1  Page number uses LAST [PAGE_BREAK:N] marker per chunk, not first.
  #2  Empty chunks filtered before returning.
  #3  Header-only chunks (< MIN_CHUNK_CHARS) filtered out.
  #4  section_id built by joining non-empty parts — no stray "> " edges.
  #5  Safety keyword list extended; section name checked as fallback.
  #6  "Common causes" / "Resolution Steps" sub-chunks merged into parent
      error-code chunk so each error is one atomic retrieval unit.
  #8  page_number stored as int, not str.
  #9  os.makedirs guard when output_path has no directory component.

Round 2 (metadata quality):
  R2-1  E-01 section_id corrected — when splitter assigns generic parent
        header, real error-code title extracted from first content line.
        FIX: _resolve_section_id() now also patches section.metadata["Section"]
        so the resolved value flows through every downstream consumer.
  R2-2  Maintenance sub-chunks re-attach parent path in section_id.
  R2-3  machine_id normalised — spaces → underscores.
  R2-4  page_start field added alongside page_number (end page).
        FIX: page_start now uses page numbers found in the MERGED content,
        so E-02 (description on page 3, resolution on page 4) correctly
        gets page_start=3, page_number=4 instead of both=4.
  R2-5  SAFETY_KEYWORDS extended to catch "laser safety protocols" in Overview.
  R2-6  chunk_type enum added.
        FIX: "overview" branch runs BEFORE the generic safety/troubleshooting
        branches so Machine Overview gets chunk_type="overview" (with
        is_safety=True still set as a flag) instead of chunk_type="safety".
  R2-7  error_code field added: "E-01"…"E-08" or None.
  R2-8  cross_references field added: sorted list of other error codes cited.
"""

from __future__ import annotations

import os
import re
import json

from langchain_text_splitters import MarkdownHeaderTextSplitter
from langchain_core.documents import Document


# ---------------------------------------------------------------------------
# Tuneable constants
# ---------------------------------------------------------------------------

MIN_CHUNK_CHARS: int = 50   # chunks shorter than this are discarded

# ---------------------------------------------------------------------------
# Safety keywords — checked against uppercased chunk content.
# Any match → is_safety = True.
# ---------------------------------------------------------------------------
SAFETY_KEYWORDS: tuple[str, ...] = (
    "DANGER",
    "WARNING",
    "CAUTION",
    "PROHIBITED",
    "CLASS 4",
    "FIRE HAZARD",
    "DO NOT OPERATE",
    "EMERGENCY STOP",
    "TOXIC",
    "CARCINOGENIC",
    "PERMANENT DAMAGE",
    "IRREVERSIBLE",
    "IMMEDIATELY STOP",
    "STOP ALL LASER",
    "HEALTH HAZARD",
    "LASER SAFETY",          # R2-5: catches "All laser safety protocols…"
    "SAFETY PROTOCOL",       # R2-5
    "CERTIFIED TECHNICIAN",  # R2-5
)

# Sub-section headers that docling promotes to ## inside error-code blocks.
# Chunks whose Section metadata value matches one of these are merged back
# into their preceding sibling.  (Fix #6)
_ERROR_SUB_HEADERS: frozenset[str] = frozenset({
    "common causes:",
    "resolution steps:",
})

# Maintenance frequency labels used to detect maintenance sub-chunks.  (R2-2)
_MAINTENANCE_FREQS: tuple[str, ...] = (
    "daily",
    "weekly",
    "monthly",
    "every 6 months",
    "every six months",
)

# Section names that should always be classified as "overview" regardless of
# other tag signals.  Checked against lowercase section_id.  (R2-6 fix C)
_OVERVIEW_SECTIONS: tuple[str, ...] = (
    "machine overview",
    "introduction",
    "about this document",
    "product overview",
)

# ---------------------------------------------------------------------------
# Pre-compiled regexes
# ---------------------------------------------------------------------------

_PAGE_BREAK_RE  = re.compile(r"\[PAGE_BREAK:(\d+)\]")
_ERROR_CODE_RE  = re.compile(r"Error\s+Code\s+(E-\d{2})\b", re.IGNORECASE)
_ERROR_TITLE_RE = re.compile(r"(Error\s+Code\s+E-\d{2}[^\n]*)", re.IGNORECASE)
_XREF_RE        = re.compile(r"\b(E-\d{2})\b")


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _extract_page_numbers(content: str) -> list[int]:
    """Return every physical PDF page number found in *content*, in order."""
    return [int(m) for m in _PAGE_BREAK_RE.findall(content)]


def _build_section_id(metadata: dict) -> str:
    """
    Construct a clean hierarchy path from LangChain header metadata.
    Only non-empty levels are included; no stray " > " at edges.  (Fix #4)
    """
    parts = [
        metadata.get("Header_1", ""),
        metadata.get("Section", ""),
        metadata.get("Subsection", ""),
    ]
    return " > ".join(p.strip() for p in parts if p.strip())


def _resolve_section_id(section: Document, raw_section_id: str) -> str:
    """
    Fix R2-1 (complete): when section_id is the generic parent header
    ("4. Error Code Reference and Troubleshooting"), extract the real
    error-code title from the first content line and also patch
    section.metadata["Section"] so the corrected value is consistent
    everywhere — not just in section_id.

    The previous version only updated section_id but left the raw "Section"
    key intact, which meant the JSON still showed the generic parent as
    the primary metadata key.
    """
    GENERIC_PARENT = "error code reference and troubleshooting"
    if raw_section_id.lower().strip() == GENERIC_PARENT:
        match = _ERROR_TITLE_RE.search(section.page_content)
        if match:
            resolved = match.group(1).strip(" -–")
            # Patch the raw metadata key too so it stays in sync
            section.metadata["Section"] = resolved
            return resolved
    return raw_section_id


def _derive_chunk_type(
    section_id: str,
    is_safety: bool,
    is_troubleshooting: bool,
) -> str:
    """
    Fix R2-6 (complete): classify each chunk into a categorical type.

    Priority order (most-specific first):
      1. overview     — named overview/introduction sections
      2. error_code   — contains an error code reference
      3. maintenance  — maintenance frequency sub-sections
      4. spare_parts  — spare parts table
      5. specification — specs or parameter tables
      6. safety       — safety-flagged content
      7. overview     — fallback for uncategorised non-error content

    The previous version had "safety" evaluated before "overview", which
    caused Machine Overview (is_safety=True) to get chunk_type="safety"
    instead of chunk_type="overview".  The explicit overview name check
    now runs first.  (Fix: Issue C)
    """
    sid = section_id.lower()

    # 1. Named overview sections — always "overview" regardless of other tags
    if any(name in sid for name in _OVERVIEW_SECTIONS):
        return "overview"

    # 2. Error codes
    if _ERROR_CODE_RE.search(section_id):
        return "error_code"

    # 3. Maintenance sub-sections
    if any(freq in sid for freq in _MAINTENANCE_FREQS) or "maintenance schedule" in sid:
        return "maintenance"

    # 4. Spare parts
    if "spare parts" in sid or "spare part" in sid:
        return "spare_parts"

    # 5. Specifications / parameters
    if "specification" in sid or "parameter" in sid:
        return "specification"

    # 6. Generic safety
    if "safety" in sid or is_safety:
        return "safety"

    # 7. Troubleshooting catch-all (error code missed by regex)
    if is_troubleshooting:
        return "error_code"

    return "overview"


def _extract_error_code(section_id: str, content: str) -> str | None:
    """
    Fix R2-7: extract bare error code ("E-01"…"E-08") from section_id
    or, as fallback, from the first matching line of content.
    Returns None for non-error chunks.
    """
    match = _ERROR_CODE_RE.search(section_id) or _ERROR_CODE_RE.search(content)
    return match.group(1).upper() if match else None


def _extract_cross_references(content: str, own_code: str | None) -> list[str]:
    """
    Fix R2-8: collect all error codes referenced in *content* excluding
    the chunk's own code to avoid self-referencing.
    Returns a sorted list, e.g. ["E-03"].
    """
    found = set(_XREF_RE.findall(content))
    if own_code:
        found.discard(own_code)
    return sorted(found)


def _is_safety_chunk(content: str, section_id: str) -> bool:
    """
    Fix #5 + R2-5: return True when the chunk contains any safety-critical
    keyword or the section heading explicitly names a safety topic.
    """
    if any(kw in content.upper() for kw in SAFETY_KEYWORDS):
        return True
    if "safety" in section_id.lower():
        return True
    return False


def _normalize_machine_id(raw_name: str) -> str:
    """
    Fix R2-3: replace spaces with underscores so machine_id is safe for
    use as a database key, URL slug, or filesystem name.
    """
    return raw_name.strip().replace(" ", "_")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def chunk_markdown(markdown_content: str, source_name: str) -> list[Document]:
    """
    Convert a markdown string (from parser.py) into enriched Document chunks.

    Pipeline
    --------
    1. Split on H1/H2/H3 headers — headers kept in content for LLM context.
    2. MERGE PASS: fold "Common causes" / "Resolution Steps" sub-chunks back
       into their parent error-code chunk.  (Fix #6)
    3. METADATA PASS: for each merged chunk compute all metadata fields.
       page_start is derived from the merged content's first PAGE_BREAK
       sentinel — this is critical for chunks like E-02 that start on page 3
       but have resolution steps on page 4.  (Fix R2-4)
    4. FILTER PASS: discard empty / header-only chunks.  (Fix #2, #3)

    Args:
        markdown_content: Full markdown string produced by parser.convert_to_markdown().
        source_name:      Document base name; spaces normalised to underscores.

    Returns:
        List of Document objects ready for embedding and vector-store upsert.
    """
    machine_id = _normalize_machine_id(source_name)   # Fix R2-3

    # ------------------------------------------------------------------
    # Step 1 — header split
    # ------------------------------------------------------------------
    headers_to_split_on = [
        ("#",   "Header_1"),
        ("##",  "Section"),
        ("###", "Subsection"),
    ]
    splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on,
        strip_headers=False,   # keep headers visible to the LLM
    )
    raw_sections: list[Document] = splitter.split_text(markdown_content)

    # ------------------------------------------------------------------
    # Step 2 — merge pass  (Fix #6)
    # ------------------------------------------------------------------
    merged: list[Document] = []
    for section in raw_sections:
        sec_header = section.metadata.get("Section", "").lower().strip()
        if sec_header in _ERROR_SUB_HEADERS and merged:
            # Fold sub-chunk content into the preceding chunk.
            # The preceding chunk already holds PAGE_BREAK sentinels for its
            # own pages; appending preserves them so page_start is computed
            # from the first sentinel in the full merged content.  (Fix R2-4)
            merged[-1].page_content += "\n\n" + section.page_content
        else:
            merged.append(section)

    # ------------------------------------------------------------------
    # Step 3 — metadata pass
    # ------------------------------------------------------------------
    current_page: int = 1
    final_chunks: list[Document] = []

    for section in merged:
        content: str = section.page_content

        # --- Page numbers (Fix #1 + R2-4) ---
        # page_numbers is derived from the MERGED content, so a chunk that
        # was assembled from sub-chunks across multiple pages will have all
        # relevant PAGE_BREAK sentinels present.
        page_numbers = _extract_page_numbers(content)
        page_start   = page_numbers[0]  if page_numbers else current_page
        page_end     = page_numbers[-1] if page_numbers else current_page
        current_page = page_end

        # --- section_id (Fix #4 + R2-1 + R2-2) ---
        raw_sid    = _build_section_id(section.metadata)
        # R2-1 (complete fix): resolve AND patch section.metadata["Section"]
        section_id = _resolve_section_id(section, raw_sid)

        # R2-2: maintenance sub-chunks lack Header_1, so re-attach parent.
        if (
            not section.metadata.get("Header_1")
            and any(freq in section_id.lower() for freq in _MAINTENANCE_FREQS)
        ):
            section_id = "5. Preventive Maintenance Schedule > " + section_id

        # --- Boolean tags ---
        is_safety       = _is_safety_chunk(content, section_id)
        is_troubleshoot = any(
            kw in content
            for kw in ("Error Code", "Fault Code", "Resolution Steps")
        )

        # --- Enrichment fields ---
        chunk_type       = _derive_chunk_type(section_id, is_safety, is_troubleshoot)
        error_code       = _extract_error_code(section_id, content)
        cross_references = _extract_cross_references(content, error_code)

        section.metadata.update({
            # Identity
            "machine_id":         machine_id,
            "source_file":        f"{machine_id}.pdf",
            # Location
            "section_id":         section_id,
            "page_start":         page_start,        # Fix R2-4: first PDF page
            "page_number":        page_end,          # Fix #8: int, end page
            # Boolean classification
            "is_safety":          is_safety,
            "is_troubleshooting": is_troubleshoot,
            # Categorical classification
            "chunk_type":         chunk_type,        # Fix R2-6
            # Error-code specific (None for non-error chunks)
            "error_code":         error_code,        # Fix R2-7
            "cross_references":   cross_references,  # Fix R2-8
        })

        # --- Filter pass (Fix #2, #3) ---
        clean_preview = _PAGE_BREAK_RE.sub("", content).strip()
        if len(clean_preview) < MIN_CHUNK_CHARS:
            continue

        final_chunks.append(section)

    return final_chunks


def save_chunks_to_json(chunks: list[Document], output_path: str) -> None:
    """
    Serialise Document chunks to JSON for backend consumption.

    [PAGE_BREAK:N] sentinels are stripped from content before writing so
    the LLM never receives internal pipeline markers.

    Args:
        chunks:      Output of chunk_markdown().
        output_path: Destination .json path. Parent dirs created safely.
                     (Fix #9: guards against os.makedirs("") crash.)
    """
    json_data = []
    for i, chunk in enumerate(chunks):
        clean_content = _PAGE_BREAK_RE.sub("", chunk.page_content).strip()
        json_data.append({
            "chunk_id": i + 1,
            "content":  clean_content,
            "metadata": chunk.metadata,
        })

    dir_name = os.path.dirname(output_path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=4, ensure_ascii=False)

    print(f"✅ Saved {len(json_data)} chunks → {output_path}")