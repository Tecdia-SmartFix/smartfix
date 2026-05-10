"""
parser_chunker.py — PDF → Markdown → enriched chunks, in one module.

Replaces the previous two-file pipeline (parser.py + chunker.py).

Pipeline
--------
1. Docling converts the PDF to markdown (no OCR, table structure on).
2. apply_universal_heuristics() downgrades `##` sub-section headers that
   look like children of an error / maintenance block (text contains
   "cause", "step", "resolution", "description", "note", "remedy",
   "action", "instruction") so the splitter keeps them glued to their
   parent ## chunk. This replaces the old chunker's explicit merge pass.
3. MarkdownHeaderTextSplitter splits on `##` (Section) with
   strip_headers=False so the heading stays in the chunk body.
4. Page numbers are recovered by cross-referencing the chunk's opening
   sample text against `doc.texts[*].text` and reading `prov.page_no`.
5. Each chunk is enriched with classification fields that downstream
   retrieval / prompt-building can filter on:
     machine_id, source_file, source, section, section_id,
     page_numbers (list), page_start (int), page_number (int),
     is_table, is_safety, is_troubleshooting,
     chunk_type, error_code, cross_references.
6. Chunks whose stripped body is shorter than MIN_CHUNK_CHARS are dropped
   (header-only noise).

Exposes
-------
* `apply_universal_heuristics(md)` — heading-downgrade pass
* `process_and_chunk(pdf_path, filename, machine_id=None)` — library entry
* `save_chunks_to_json(chunks, output_path)` — file output compatible
  with `scripts/build_index.py`
* `POST /parse-manual` — HTTP entry on port 8000

Run as service:  python -m uvicorn src.ingestion.parser_chunker:app --port 8000
"""

from __future__ import annotations

import os
import re
import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from langchain_text_splitters import MarkdownHeaderTextSplitter


app = FastAPI(title="Universal Technical Manual Parser API")

# ---------------------------------------------------------------------------
# Docling — single converter instance (heavy to construct, safe to reuse)
# ---------------------------------------------------------------------------
pipeline_options = PdfPipelineOptions()
pipeline_options.do_ocr = False
pipeline_options.do_table_structure = True

converter = DocumentConverter(
    format_options={
        InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
    }
)


# ---------------------------------------------------------------------------
# Tuneable constants — carried over from the previous chunker
# ---------------------------------------------------------------------------

# Drop chunks whose body (after stripping markdown headers) is shorter than
# this. 30 keeps "Weekly" / "Every 6 Months" checklist chunks; 50 drops them.
MIN_CHUNK_CHARS: int = 30

SAFETY_KEYWORDS: tuple[str, ...] = (
    # Generic hazard levels
    "DANGER", "WARNING", "CAUTION", "PROHIBITED",
    # Laser-specific
    "CLASS 4", "FIRE HAZARD", "LASER SAFETY", "SAFETY PROTOCOL",
    # Action-stop phrases
    "DO NOT OPERATE", "DO NOT REACH", "DO NOT RESTART",
    "EMERGENCY STOP", "IMMEDIATELY STOP",
    "STOP ALL LASER", "STOP THE MACHINE",
    # Harm / damage language
    "TOXIC", "CARCINOGENIC", "PERMANENT DAMAGE", "IRREVERSIBLE",
    "SERIOUS INJURY", "HEALTH HAZARD",
    # Personnel qualification
    "CERTIFIED TECHNICIAN", "QUALIFIED PROCESS", "QUALIFIED TECHNICIAN",
    # Electrical
    "LOCK OUT", "LOCKED OUT", "ISOLATOR", "HIGH VOLTAGE",
)

_MAINTENANCE_FREQS: tuple[str, ...] = (
    "daily", "weekly", "monthly", "every 6 months", "every six months",
)

_OVERVIEW_SECTIONS: tuple[str, ...] = (
    "machine overview", "introduction",
    "about this document", "product overview",
)

_TROUBLE_KEYWORDS: tuple[str, ...] = (
    "Error Code", "Fault Code", "Resolution Steps",
)

# E-01 … E-99 in either "Error Code E-XX" form or bare
_ERROR_CODE_RE = re.compile(r"Error\s+Code\s+(E-\d{2})\b", re.IGNORECASE)
_BARE_ERR_RE   = re.compile(r"\b(E-\d{2})\b")
_HEADER_LINE_RE = re.compile(r"^#{1,6}\s+.*$", re.MULTILINE)


# ---------------------------------------------------------------------------
# Heading normalisation
# ---------------------------------------------------------------------------

def apply_universal_heuristics(md_content: str) -> str:
    """
    Identify sub-sections that should be merged with their parent and
    downgrade their headers from `##` to `###` so the splitter keeps them
    glued to the preceding ## section.

    Heuristic
    ---------
    A `##` heading is downgraded when BOTH:
      * its text contains a sub-keyword (cause/step/resolution/…), AND
      * it doesn't start like a main section
        (numbered "1.", "A.", or words like Section / Error / Alarm / …).

    This replaces the old chunker's explicit "Common causes / Resolution
    steps" merge pass and handles parenthetical variants
    ("Common causes (low pressure):", "Common causes (high pressure):")
    that broke the previous exact-string approach.
    """
    sub_keywords = (
        "cause", "step", "resolution", "description",
        "note", "remedy", "action", "instruction",
    )

    main_section_re = re.compile(
        r"^([a-z0-9]{1,3}[\.\)\-]|section|chapter|part|error|alarm|fault|warning)"
    )

    out: list[str] = []
    for line in md_content.split("\n"):
        if line.startswith("## "):
            text = line.replace("## ", "").strip().lower()
            is_main = bool(main_section_re.match(text))
            has_sub_key = any(k in text for k in sub_keywords)
            if has_sub_key and not is_main:
                out.append(line.replace("## ", "### ", 1))
                continue
        out.append(line)
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Metadata helpers
# ---------------------------------------------------------------------------

def _normalize_machine_id(name: str) -> str:
    """Spaces → underscores so the id is safe for URLs / DB filters."""
    return name.strip().replace(" ", "_")


def _is_safety_chunk(content: str, section_id: str) -> bool:
    if any(kw in content.upper() for kw in SAFETY_KEYWORDS):
        return True
    return "safety" in section_id.lower()


def _derive_chunk_type(
    section_id: str,
    content: str,
    is_safety: bool,
    is_troubleshooting: bool,
) -> str:
    """
    Classify a chunk into one of:
      overview | error_code | maintenance | spare_parts | specification | safety

    Priority is most-specific first; the overview catch-all returns last.
    """
    sid = section_id.lower()
    if any(name in sid for name in _OVERVIEW_SECTIONS):
        return "overview"
    if _ERROR_CODE_RE.search(section_id) or _ERROR_CODE_RE.search(content):
        return "error_code"
    if any(f in sid for f in _MAINTENANCE_FREQS) or "maintenance schedule" in sid:
        return "maintenance"
    if "spare parts" in sid or "spare part" in sid:
        return "spare_parts"
    if "specification" in sid or "parameter" in sid:
        return "specification"
    if "safety" in sid or is_safety:
        return "safety"
    if is_troubleshooting:
        return "error_code"
    return "overview"


def _extract_error_code(section_id: str, content: str) -> Optional[str]:
    m = _ERROR_CODE_RE.search(section_id) or _ERROR_CODE_RE.search(content)
    return m.group(1).upper() if m else None


def _extract_cross_references(content: str, own_code: Optional[str]) -> list[str]:
    found = set(_BARE_ERR_RE.findall(content))
    if own_code:
        found.discard(own_code)
    return sorted(found)


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def process_and_chunk(
    pdf_path: str,
    filename: str,
    machine_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Convert a PDF into a list of enriched chunks ready for embedding.

    Args:
        pdf_path:   Filesystem path to the source PDF.
        filename:   Original filename — kept verbatim in `metadata.source`.
        machine_id: Optional explicit id. Defaults to the filename stem with
                    spaces replaced by underscores, matching the convention
                    used by scripts/build_index.py.

    Returns:
        list of {"text": str, "metadata": {...}} dicts.
    """
    if machine_id is None:
        machine_id = _normalize_machine_id(os.path.splitext(filename)[0])

    # 1. Convert PDF → markdown
    result = converter.convert(pdf_path)
    doc = result.document
    md_content = doc.export_to_markdown()

    # 2. Heading normalisation
    normalized_md = apply_universal_heuristics(md_content)

    # 3. Header split on ## only — child ### headings stay inside their parent
    splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[("##", "Section")],
        strip_headers=False,
    )
    sections = splitter.split_text(normalized_md)

    # 4. Per-chunk enrichment
    final_chunks: List[Dict[str, Any]] = []
    last_page = 1

    for section in sections:
        section_text = section.page_content
        section_header = section.metadata.get("Section", "Unknown")

        # Page numbers — cross-reference the first ~100 chars of the chunk
        # against Docling layout items so we can read `prov.page_no`.
        matched_pages: set[int] = set()
        sample_start = section_text[:100].strip()
        if sample_start:
            for item in doc.texts:
                if sample_start in item.text:
                    if hasattr(item, "prov") and item.prov:
                        for p in item.prov:
                            matched_pages.add(p.page_no)

        if matched_pages:
            page_list = sorted(matched_pages)
        else:
            # No layout match — carry forward the previous chunk's last page
            # so page numbering stays monotonic rather than snapping to 1.
            page_list = [last_page]
        page_start = page_list[0]
        page_end   = page_list[-1]
        last_page  = page_end

        # Filter pass — drop near-empty chunks (header-only / one bullet).
        # Strip markdown header lines first so "## Weekly" + one bullet
        # survives the threshold.
        clean_preview = _HEADER_LINE_RE.sub("", section_text).strip()
        if len(clean_preview) < MIN_CHUNK_CHARS:
            continue

        section_id = section_header  # flat — splitter only emits one level
        is_safety = _is_safety_chunk(section_text, section_id)
        is_trouble = any(kw in section_text for kw in _TROUBLE_KEYWORDS)
        chunk_type = _derive_chunk_type(section_id, section_text, is_safety, is_trouble)
        error_code = _extract_error_code(section_id, section_text)
        xrefs = _extract_cross_references(section_text, error_code)

        final_chunks.append({
            "text": section_text.strip(),
            "metadata": {
                "machine_id":         machine_id,
                "source_file":        f"{machine_id}.pdf",
                "source":             filename,
                "section":            section_header,
                "section_id":         section_id,
                "page_numbers":       page_list,
                "page_start":         page_start,
                "page_number":        page_end,
                "is_table":           ("|" in section_text and "---" in section_text),
                "is_safety":          is_safety,
                "is_troubleshooting": is_trouble,
                "chunk_type":         chunk_type,
                "error_code":         error_code,
                "cross_references":   xrefs,
            },
        })

    return final_chunks


def save_chunks_to_json(
    chunks: List[Dict[str, Any]],
    output_path: str,
) -> None:
    """
    Serialise chunks to JSON for backend consumption by
    `scripts/build_index.py`. Adds a sequential `chunk_id` and renames
    `text` → `content` so the on-disk schema matches what the indexer
    already expects.
    """
    out: list[dict] = []
    for i, c in enumerate(chunks, start=1):
        out.append({
            "chunk_id": i,
            "content":  c["text"],
            "metadata": c["metadata"],
        })

    parent = os.path.dirname(output_path)
    if parent:
        os.makedirs(parent, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=4, ensure_ascii=False)

    print(f"✅ Saved {len(out)} chunks → {output_path}")


# ---------------------------------------------------------------------------
# HTTP endpoint
# ---------------------------------------------------------------------------

@app.post("/parse-manual")
async def parse_manual_endpoint(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Per-request unique temp filename — avoids collisions under concurrency.
    temp_path = f"temp_{uuid.uuid4()}_{file.filename}"

    try:
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())

        chunks = process_and_chunk(temp_path, file.filename)
        return {"count": len(chunks), "chunks": chunks}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    import uvicorn
    # Bind 0.0.0.0 so other services in the flow can reach the endpoint.
    uvicorn.run(app, host="0.0.0.0", port=8000)
