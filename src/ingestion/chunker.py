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

Round 2 (metadata quality — Laser Cutter):
  R2-1  E-01 section_id corrected — generic parent header replaced by real
        error-code title extracted from first content line.
  R2-2  Maintenance sub-chunks re-attach parent path in section_id.
  R2-3  machine_id normalised — spaces → underscores.
  R2-4  page_start field added alongside page_number (end page).
  R2-5  SAFETY_KEYWORDS extended to catch "laser safety protocols" in Overview.
  R2-6  chunk_type enum — "overview" branch runs before safety/troubleshooting
        so Machine Overview gets chunk_type="overview", not "safety".
  R2-7  error_code field added: "E-01"…"E-NN" or None.
  R2-8  cross_references field added: sorted list of other error codes cited.

Round 3 (cross-document robustness — Injection Moulder glitches):
  R3-1  GLITCH FIX — _ERROR_SUB_HEADERS now uses prefix matching instead of
        exact string match. Handles parenthetical variants like
        "Common causes (low pressure):" and "Common causes (high pressure):"
        which caused E-06 to fragment into 3 chunks with error_code=None.
  R3-2  MISSING CHUNKS FIX — MIN_CHUNK_CHARS threshold was too conservative.
        Weekly / Monthly / Every 6 Months / Safety Precautions / Spare Parts
        chunks were being filtered out because their cleaned content was
        just under the threshold after PAGE_BREAK stripping. Reduced to 30.
        Additionally, the filter now checks cleaned content AFTER stripping
        markdown header syntax so a header + one bullet always survives.
  R3-3  SAFETY KEYWORDS — added "SERIOUS INJURY", "DO NOT REACH",
        "QUALIFIED PROCESS", "QUALIFIED TECHNICIAN", "FIRE HAZARD",
        "LOCK OUT", "ISOLATOR" to catch safety language in IMM-750 that was
        absent from the LC-2040 vocabulary.
  R3-4  MAINTENANCE PARENT — hardcoded section number "5." replaced with a
        regex search in the merged markdown so the correct parent heading
        number is found dynamically. Works for any document regardless of
        whether maintenance is section 5, 6, or another number.
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

# R3-2: reduced from 50 → 30 so short-but-valid chunks (Weekly checklist,
# 6-month schedule) are never silently dropped.
MIN_CHUNK_CHARS: int = 30

# ---------------------------------------------------------------------------
# Safety keywords — checked against uppercased chunk content.
# Any match → is_safety = True.
# ---------------------------------------------------------------------------
SAFETY_KEYWORDS: tuple[str, ...] = (
    # Generic hazard levels
    "DANGER",
    "WARNING",
    "CAUTION",
    "PROHIBITED",
    # Laser-specific (LC-2040)
    "CLASS 4",
    "FIRE HAZARD",
    "LASER SAFETY",
    "SAFETY PROTOCOL",
    # Action-stop phrases
    "DO NOT OPERATE",
    "DO NOT REACH",           # R3-3: IMM-750 ejector mold-area warning
    "DO NOT RESTART",         # R3-3
    "EMERGENCY STOP",
    "IMMEDIATELY STOP",
    "STOP ALL LASER",
    "STOP THE MACHINE",       # R3-3
    # Harm / damage language
    "TOXIC",
    "CARCINOGENIC",
    "PERMANENT DAMAGE",
    "IRREVERSIBLE",
    "SERIOUS INJURY",         # R3-3: IMM-750 hydraulic failure warning
    "HEALTH HAZARD",
    "FIRE HAZARD",
    # Personnel qualification language
    "LASER SAFETY",
    "SAFETY PROTOCOL",
    "CERTIFIED TECHNICIAN",
    "QUALIFIED PROCESS",      # R3-3: IMM-750 overview
    "QUALIFIED TECHNICIAN",   # R3-3
    # Electrical safety
    "LOCK OUT",               # R3-3: IMM-750 electrical isolation
    "LOCKED OUT",             # R3-3
    "ISOLATOR",               # R3-3
    "HIGH VOLTAGE",
)

# ---------------------------------------------------------------------------
# Sub-section header patterns — merge pass
#
# R3-1 FIX: changed from exact frozenset membership check to prefix matching.
#
# Old approach:
#   _ERROR_SUB_HEADERS = frozenset({"common causes:", "resolution steps:"})
#   matched only if section.metadata["Section"].lower().strip() was EXACTLY
#   one of those strings.
#
# Problem: E-06 in the IMM-750 manual has two separate "Common causes" blocks
# with parenthetical qualifiers:
#   "Common causes (low pressure):"
#   "Common causes (high pressure):"
# Neither matched the exact set → they became standalone chunks with
# error_code=None and chunk_type="overview".
#
# New approach: check whether the lowercased Section header STARTS WITH one
# of the canonical sub-header prefixes. This handles all parenthetical and
# numbered variants without needing to enumerate every possible suffix.
# ---------------------------------------------------------------------------
_ERROR_SUB_PREFIXES: tuple[str, ...] = (
    "common causes",     # covers "common causes:", "common causes (low pressure):", etc.
    "resolution steps",  # covers "resolution steps:", "resolution steps (continued):", etc.
    "possible causes",   # defensive: some manuals use this phrasing
    "corrective action", # defensive: alternative phrasing
    "root cause",        # defensive
)

def _is_error_sub_header(section_value: str) -> bool:
    """
    Return True if *section_value* is a sub-heading that belongs inside an
    error-code block and should be merged into its preceding sibling.
    Uses prefix matching so parenthetical variants are handled correctly.
    (Fix R3-1)
    """
    normalised = section_value.lower().strip()
    return any(normalised.startswith(prefix) for prefix in _ERROR_SUB_PREFIXES)


# Maintenance frequency labels (R2-2)
_MAINTENANCE_FREQS: tuple[str, ...] = (
    "daily",
    "weekly",
    "monthly",
    "every 6 months",
    "every six months",
)

# Section names that are always "overview" regardless of other tag signals (R2-6)
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

# R3-4: match the maintenance schedule section heading dynamically.
# Looks for "N. Preventive Maintenance Schedule" (any section number).
_MAINT_PARENT_RE = re.compile(
    r"#+\s*(\d+\.\s*(?:Preventive\s+)?Maintenance\s+Schedule)",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _extract_page_numbers(content: str) -> list[int]:
    """Return every physical PDF page number found in *content*, in order."""
    return [int(m) for m in _PAGE_BREAK_RE.findall(content)]


def _build_section_id(metadata: dict) -> str:
    """
    Construct a clean hierarchy path from LangChain header metadata.
    Only non-empty levels are included — no stray " > " at edges.  (Fix #4)
    """
    parts = [
        metadata.get("Header_1", ""),
        metadata.get("Section", ""),
        metadata.get("Subsection", ""),
    ]
    return " > ".join(p.strip() for p in parts if p.strip())


def _resolve_section_id(section: Document, raw_section_id: str) -> str:
    """
    R2-1 (complete): when section_id is the generic parent header
    ("4. Error Code Reference and Troubleshooting"), extract the real
    error-code title from the first content line and also patch
    section.metadata["Section"] so the corrected value is consistent
    everywhere, not just in section_id.
    """
    GENERIC_PARENT = "error code reference and troubleshooting"
    if raw_section_id.lower().strip() == GENERIC_PARENT:
        match = _ERROR_TITLE_RE.search(section.page_content)
        if match:
            resolved = match.group(1).strip(" -–")
            section.metadata["Section"] = resolved   # patch raw key too
            return resolved
    return raw_section_id


def _find_maintenance_parent(full_markdown: str) -> str:
    """
    R3-4: scan the full document markdown for the maintenance schedule
    heading and return its title (e.g. "5. Preventive Maintenance Schedule").
    Falls back to the hardcoded default if not found.
    """
    match = _MAINT_PARENT_RE.search(full_markdown)
    if match:
        return match.group(1).strip()
    return "Preventive Maintenance Schedule"


def _derive_chunk_type(
    section_id: str,
    is_safety: bool,
    is_troubleshooting: bool,
) -> str:
    """
    R2-6 + R3-1: classify each chunk into a categorical type.

    Priority (most-specific first):
      1. overview     — named overview/intro sections
      2. error_code   — contains an error code reference
      3. maintenance  — maintenance frequency sub-sections
      4. spare_parts  — spare parts table
      5. specification— spec or parameter tables
      6. safety       — safety-flagged content
      7. overview     — uncategorised fallback
    """
    sid = section_id.lower()

    # 1. Named overview sections always win
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

    # 7. Troubleshooting catch-all
    if is_troubleshooting:
        return "error_code"

    return "overview"


def _extract_error_code(section_id: str, content: str) -> str | None:
    """
    R2-7: extract bare error code ("E-01"…"E-NN") from section_id or
    from the first matching line of content. Returns None for non-error chunks.
    """
    match = _ERROR_CODE_RE.search(section_id) or _ERROR_CODE_RE.search(content)
    return match.group(1).upper() if match else None


def _extract_cross_references(content: str, own_code: str | None) -> list[str]:
    """
    R2-8: collect all error codes cited in *content* excluding own_code.
    Returns a sorted list, e.g. ["E-03"].
    """
    found = set(_XREF_RE.findall(content))
    if own_code:
        found.discard(own_code)
    return sorted(found)


def _is_safety_chunk(content: str, section_id: str) -> bool:
    """
    Fix #5 + R2-5 + R3-3: return True when the chunk contains any
    safety-critical keyword or the section heading names a safety topic.
    """
    if any(kw in content.upper() for kw in SAFETY_KEYWORDS):
        return True
    if "safety" in section_id.lower():
        return True
    return False


def _normalize_machine_id(raw_name: str) -> str:
    """R2-3: replace spaces with underscores for DB/URL safety."""
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
    2. MERGE PASS: fold error-code sub-chunks back into their parent using
       prefix matching so parenthetical variants like "Common causes (low
       pressure):" are handled correctly.  (Fix R3-1)
    3. METADATA PASS: compute all fields per merged chunk.
    4. FILTER PASS: discard chunks below MIN_CHUNK_CHARS.  (Fix R3-2)

    Args:
        markdown_content: Full markdown string from parser.convert_to_markdown().
        source_name:      Document base name; spaces normalised to underscores.

    Returns:
        List of Document objects ready for embedding and vector-store upsert.
    """
    machine_id = _normalize_machine_id(source_name)

    # Pre-scan full document for maintenance parent heading  (R3-4)
    maintenance_parent = _find_maintenance_parent(markdown_content)

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
        strip_headers=False,
    )
    raw_sections: list[Document] = splitter.split_text(markdown_content)

    # ------------------------------------------------------------------
    # Step 2 — merge pass  (Fix #6 + R3-1)
    # ------------------------------------------------------------------
    merged: list[Document] = []
    for section in raw_sections:
        sec_header = section.metadata.get("Section", "")
        if _is_error_sub_header(sec_header) and merged:
            # Fold into preceding chunk, preserving all PAGE_BREAK sentinels
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

        # Page numbers — derived from merged content  (Fix #1 + R2-4)
        page_numbers = _extract_page_numbers(content)
        page_start   = page_numbers[0]  if page_numbers else current_page
        page_end     = page_numbers[-1] if page_numbers else current_page
        current_page = page_end

        # section_id  (Fix #4 + R2-1 + R2-2 + R3-4)
        raw_sid    = _build_section_id(section.metadata)
        section_id = _resolve_section_id(section, raw_sid)

        # Re-attach maintenance parent dynamically  (R2-2 + R3-4)
        if (
            not section.metadata.get("Header_1")
            and any(freq in section_id.lower() for freq in _MAINTENANCE_FREQS)
        ):
            section_id = f"{maintenance_parent} > {section_id}"

        # Boolean tags
        is_safety       = _is_safety_chunk(content, section_id)
        is_troubleshoot = any(
            kw in content
            for kw in ("Error Code", "Fault Code", "Resolution Steps")
        )

        # Enrichment fields
        chunk_type       = _derive_chunk_type(section_id, is_safety, is_troubleshoot)
        error_code       = _extract_error_code(section_id, content)
        cross_references = _extract_cross_references(content, error_code)

        section.metadata.update({
            "machine_id":         machine_id,
            "source_file":        f"{machine_id}.pdf",
            "section_id":         section_id,
            "page_start":         page_start,
            "page_number":        page_end,
            "is_safety":          is_safety,
            "is_troubleshooting": is_troubleshoot,
            "chunk_type":         chunk_type,
            "error_code":         error_code,
            "cross_references":   cross_references,
        })

        # Filter pass  (Fix #2, #3 + R3-2)
        clean_preview = _PAGE_BREAK_RE.sub("", content).strip()
        # Strip markdown header syntax before length check so "## Weekly"
        # + one bullet always survives the threshold
        clean_preview = re.sub(r"^#{1,6}\s+.*$", "", clean_preview, flags=re.MULTILINE).strip()
        if len(clean_preview) < MIN_CHUNK_CHARS:
            continue

        final_chunks.append(section)

    return final_chunks


def save_chunks_to_json(chunks: list[Document], output_path: str) -> None:
    """
    Serialise Document chunks to JSON for backend consumption.

    [PAGE_BREAK:N] sentinels are stripped from content before writing.

    Args:
        chunks:      Output of chunk_markdown().
        output_path: Destination .json path. Parent dirs created safely.
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