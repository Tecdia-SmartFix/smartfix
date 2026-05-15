"""
parser_chunker.py — PDF → enriched chunks (pypdf edition, multi-document aware).

Handles all given manual formats:
  - LASER / IMM:  "N. Section Title"  /  "Error Code E-NN — Description"
  - HP-500:       "SECTION N — TITLE" /  "ALARM A-NN — DESCRIPTION"
  - FDM-X300:     "Section N — Title" /  "ERR-NN — Description"
  - RA-6200:      "N. Title"          /  "Fault Code F-NN — Description"
  SHOULD BE MODIFIED ACCORDINGLY TO HANDLE OTHER FORMATS.

Pipeline
--------
1. pypdf extracts text page-by-page.
2. Double-spaced text (pypdf artefact) is collapsed to single spaces.
3. Word-per-line extractions are reconstructed into full logical lines.
4. Section boundaries detected via document-aware heading patterns.
5. Numbered resolution steps + sub-headings (Common causes, Resolution Steps,
   etc.) are merged INTO their parent fault chunk so each error code becomes
   one self-contained retrievable unit with description, causes, and all steps.
6. Each chunk enriched with classification metadata.
7. Chunks shorter than MIN_CHUNK_CHARS are dropped.

Exposes
-------
* process_and_chunk(pdf_path, filename, machine_id=None) → list[dict]
* save_chunks_to_json(chunks, output_path)
* apply_universal_heuristics(md) — API compat shim (returns md unchanged)
* POST /parse-manual
"""

from __future__ import annotations

import os
import re
import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from pypdf import PdfReader

app = FastAPI(title="Universal Technical Manual Parser API")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MIN_CHUNK_CHARS: int = 60

SAFETY_KEYWORDS: tuple[str, ...] = (
    "DANGER", "WARNING", "CAUTION", "PROHIBITED",
    "CLASS 4", "FIRE HAZARD", "LASER SAFETY", "SAFETY PROTOCOL",
    "DO NOT OPERATE", "DO NOT REACH", "DO NOT RESTART",
    "EMERGENCY STOP", "IMMEDIATELY STOP",
    "STOP ALL LASER", "STOP THE MACHINE",
    "TOXIC", "CARCINOGENIC", "PERMANENT DAMAGE", "IRREVERSIBLE",
    "SERIOUS INJURY", "HEALTH HAZARD",
    "CERTIFIED TECHNICIAN", "QUALIFIED PROCESS", "QUALIFIED TECHNICIAN",
    "LOCK OUT", "LOCKED OUT", "ISOLATOR", "HIGH VOLTAGE",
)

_MAINTENANCE_FREQS: tuple[str, ...] = (
    "daily", "weekly", "monthly", "every 6 months", "every six months",
    "after every print", "every 500 print hours",
)

_OVERVIEW_SECTIONS: tuple[str, ...] = (
    "machine overview", "introduction", "system overview",
    "about this document", "product overview", "machine description",
    "what's inside", "welcome",
)

_TROUBLE_KEYWORDS: tuple[str, ...] = (
    "Error Code", "Fault Code", "Alarm", "ERR-",
    "Resolution Steps", "Diagnostic steps", "How to fix",
    "RESOLUTION", "CAUSES", "Common causes", "Why it happens",
)

# ---------------------------------------------------------------------------
# Error / alarm code patterns — covers all 5 document formats
#   E-01 (LASER, IMM) | A-01 (HP-500) | F-01 (RA-6200) | ERR-01 (FDM)
# ---------------------------------------------------------------------------
_CODE_PATTERN = re.compile(r'\b(?:ERR|E|A|F)-\d{2,3}\b', re.IGNORECASE)

_FAULT_HEADING_PATTERNS: list[re.Pattern] = [
    re.compile(r'^Error\s+Code\s+(E-\d{2,3})\s*[—\-]',  re.IGNORECASE),
    re.compile(r'^Fault\s+Code\s+(F-\d{2,3})\s*[—\-]',  re.IGNORECASE),
    re.compile(r'^ALARM\s+(A-\d{2,3})\s*[—\-]',          re.IGNORECASE),
    re.compile(r'^(ERR-\d{2,3})\s*[—\-]',                re.IGNORECASE),
]

_SECTION_HEADING_PATTERNS: list[re.Pattern] = [
    re.compile(r'^\d+\.\s+[A-Z].{3,}$'),
    re.compile(r'^Section\s+\d+\s*[—\-]',   re.IGNORECASE),
    re.compile(r'^SECTION\s+\d+\s*[—\-]',   re.IGNORECASE),
]

_MAINT_HEADING_RE = re.compile(
    r'^(Daily|Weekly|Monthly|Every\s+6\s+Months?|Every\s+\d+|'
    r'After\s+Every|DAILY|WEEKLY|MONTHLY|EVERY)\b',
    re.IGNORECASE,
)

# Sub-headings inside a fault section — stay in same chunk, don't start a new one
_SUB_HEADING_RE = re.compile(
    r'^(Common\s+causes?|Resolution\s+Steps?|Diagnostic\s+steps?|'
    r'How\s+to\s+fix\s+it|Why\s+it\s+happens?|CAUSES?|RESOLUTION|'
    r'Description|What\s+this\s+means|Subsystem)',
    re.IGNORECASE,
)

# Numbered step lines: "1. …" / "2) …"
_NUMBERED_STEP_RE = re.compile(r'^\d+[\.\)]\s+\S')


# ---------------------------------------------------------------------------
# Text cleaning
# ---------------------------------------------------------------------------

def _clean_line(raw: str) -> str:
    """Collapse double-spaces, normalize Unicode dashes → ASCII hyphen."""
    text = re.sub(r'  +', ' ', raw)
    for dash in ('\u2014', '\u2013', '\u2212'):
        text = text.replace(dash, '-')
    return text.strip()


def _is_standalone(line: str) -> bool:
    """
    True = this line does NOT join to the next as a continuation word.
    Priority order matters: fault/section headings checked before
    sentence-ending so "1. Machine Overview." doesn't get swallowed.
    """
    # Fault headings always standalone
    if any(p.match(line) for p in _FAULT_HEADING_PATTERNS):
        return True
    # Section headings (short lines only — avoids misclassifying resolution steps)
    for p in _SECTION_HEADING_PATTERNS:
        if p.match(line) and len(line.split()) <= 8:
            return True
    # Maintenance sub-headings
    if _MAINT_HEADING_RE.match(line):
        return True
    # Fault sub-headings ("Common causes:", "Resolution Steps:" etc.)
    if _SUB_HEADING_RE.match(line):
        return True
    # Numbered steps ("1. Check …")
    if _NUMBERED_STEP_RE.match(line):
        return True
    # Bullet lines
    if line.startswith('●') or line.startswith('—') or line.startswith('-'):
        return True
    # ALL-CAPS headings (HP-500 style: "SECTION 5 — ALARM CODES")
    if re.match(r'^[A-Z][A-Z\s\-\d&/]{5,}$', line) and len(line.split()) >= 2:
        return True
    # Sentence-ending lines with enough words to be a real sentence
    if re.search(r'[.!?]$', line) and len(line.split()) > 3:
        return True
    # Short continuation fragments (single words, numbers, lone punctuation)
    if len(line.split()) <= 2:
        return False
    return False


def _reconstruct_paragraphs(raw_text: str) -> list[str]:
    """
    pypdf emits body text one word per line but keeps logical lines
    (headings, numbered steps, bullet lines) as single lines.

    Accumulate continuation words into a buffer; flush whenever a
    standalone line is encountered.
    """
    raw_lines = [_clean_line(l) for l in raw_text.split('\n') if _clean_line(l)]
    result: list[str] = []
    buffer = ''
    for line in raw_lines:
        if _is_standalone(line):
            if buffer:
                result.append(buffer)
                buffer = ''
            result.append(line)
        else:
            buffer = (buffer + ' ' + line).strip() if buffer else line
    if buffer:
        result.append(buffer)
    return result


# ---------------------------------------------------------------------------
# Page extraction
# ---------------------------------------------------------------------------

def _extract_pages(pdf_path: str) -> list[tuple[int, list[str]]]:
    """Returns [(page_no, [logical_line, ...]), ...] for each non-empty page."""
    reader = PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        raw = page.extract_text() or ''
        if raw.strip():
            lines = _reconstruct_paragraphs(raw)
            if lines:
                pages.append((i, lines))
    return pages


# ---------------------------------------------------------------------------
# Heading classification
# ---------------------------------------------------------------------------

def _fault_code(line: str) -> Optional[str]:
    """Return the fault/alarm code if this line is a fault heading, else None."""
    for p in _FAULT_HEADING_PATTERNS:
        m = p.match(line)
        if m:
            return m.group(1).upper()
    return None


def _heading_type(line: str) -> str:
    """'fault' | 'section' | 'maintenance' | 'none'"""
    if _fault_code(line):
        return 'fault'
    for p in _SECTION_HEADING_PATTERNS:
        if p.match(line) and len(line.split()) <= 8:
            return 'section'
    if _MAINT_HEADING_RE.match(line):
        return 'maintenance'
    return 'none'


# ---------------------------------------------------------------------------
# Section splitting with step-merging
# ---------------------------------------------------------------------------

def _split_into_sections(pages: list[tuple[int, list[str]]]) -> list[dict[str, Any]]:
    """
    Walk logical lines across all pages.

    KEY BEHAVIOUR:
    - Fault headings open a new fault chunk.
    - Numbered steps and sub-headings that follow a fault heading are
      MERGED into that fault chunk (not split off).
    - Section and maintenance headings always start a new chunk.
    """
    chunks: list[dict] = []
    current: dict = {
        'heading':      'Introduction',
        'heading_type': 'intro',
        'code':         None,
        'lines':        [],
        'pages':        [],
    }

    def flush():
        text = '\n'.join(current['lines']).strip()
        if len(text) >= MIN_CHUNK_CHARS:
            chunks.append({
                'heading':      current['heading'],
                'heading_type': current['heading_type'],
                'code':         current['code'],
                'text':         text,
                'pages':        sorted(set(current['pages'])),
            })

    for page_no, lines in pages:
        for line in lines:
            htype = _heading_type(line)
            if htype in ('section', 'maintenance'):
                flush()
                current = {
                    'heading':      line,
                    'heading_type': htype,
                    'code':         None,
                    'lines':        [line],
                    'pages':        [page_no],
                }
            elif htype == 'fault':
                flush()
                current = {
                    'heading':      line,
                    'heading_type': 'fault',
                    'code':         _fault_code(line),
                    'lines':        [line],
                    'pages':        [page_no],
                }
            else:
                # Body line — always merge into current chunk
                current['lines'].append(line)
                if page_no not in current['pages']:
                    current['pages'].append(page_no)

    flush()
    return chunks


# ---------------------------------------------------------------------------
# Metadata helpers
# ---------------------------------------------------------------------------

def _normalize_machine_id(name: str) -> str:
    return re.sub(r'[\s\-]+', '_', name.strip()).upper()


def _is_safety_chunk(content: str, section_id: str) -> bool:
    upper = content.upper()
    if any(kw in upper for kw in SAFETY_KEYWORDS):
        return True
    return 'safety' in section_id.lower() or 'precaution' in section_id.lower()


def _derive_chunk_type(
    section_id: str,
    heading_type: str,
    content: str,
    is_safety: bool,
) -> str:
    sid = section_id.lower()
    if heading_type == 'fault':
        return 'error_code'
    if heading_type == 'maintenance' or any(f in sid for f in _MAINTENANCE_FREQS):
        return 'maintenance'
    if 'maintenance schedule' in sid or 'preventive maintenance' in sid:
        return 'maintenance'
    if 'spare part' in sid:
        return 'spare_parts'
    if 'specification' in sid or 'parameter' in sid or 'technical spec' in sid:
        return 'specification'
    if 'safety' in sid or 'precaution' in sid or is_safety:
        return 'safety'
    if any(name in sid for name in _OVERVIEW_SECTIONS):
        return 'overview'
    if any(kw.lower() in content.lower() for kw in _TROUBLE_KEYWORDS):
        return 'error_code'
    return 'overview'


def _extract_cross_references(content: str, own_code: Optional[str]) -> list[str]:
    found = {m.upper() for m in _CODE_PATTERN.findall(content)}
    if own_code:
        found.discard(own_code.upper())
    return sorted(found)


# ---------------------------------------------------------------------------
# Coverage validation
# ---------------------------------------------------------------------------

def _validate_coverage(
    chunks: list[dict],
    pages: list[tuple[int, list[str]]],
    machine_id: str,
) -> None:
    all_text    = ' '.join(' '.join(lines) for _, lines in pages)
    pdf_codes   = {m.upper() for m in _CODE_PATTERN.findall(all_text)}
    chunk_text  = ' '.join(c['text'] for c in chunks)
    chunk_codes = {m.upper() for m in _CODE_PATTERN.findall(chunk_text)}
    missing = pdf_codes - chunk_codes
    if missing:
        print(
            f"COVERAGE WARNING [{machine_id}]: PDF mentions {sorted(missing)} "
            f"but no chunk contains them."
        )


# ---------------------------------------------------------------------------
# API compat shim
# ---------------------------------------------------------------------------

def apply_universal_heuristics(md_content: str) -> str:
    """No-op: retained for callers that previously passed Docling markdown."""
    return md_content


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def process_and_chunk(
    pdf_path: str,
    filename: str,
    machine_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Convert a PDF into enriched chunks ready for embedding.

    Returns list of {"text": str, "metadata": {...}} dicts.
    """
    if machine_id is None:
        stem = os.path.splitext(filename)[0]
        machine_id = _normalize_machine_id(stem)

    pages = _extract_pages(pdf_path)
    if not pages:
        print(f"WARNING: No text extracted from {filename}")
        return []

    raw_chunks = _split_into_sections(pages)

    final_chunks: List[Dict[str, Any]] = []
    for raw in raw_chunks:
        section_text   = raw['text']
        section_header = raw['heading']
        heading_type   = raw['heading_type']
        code           = raw['code']
        page_list      = raw['pages']
        page_start     = page_list[0] if page_list else 1
        page_end       = page_list[-1] if page_list else 1

        is_safety  = _is_safety_chunk(section_text, section_header)
        chunk_type = _derive_chunk_type(section_header, heading_type, section_text, is_safety)
        is_trouble = chunk_type == 'error_code' or any(
            kw.lower() in section_text.lower() for kw in _TROUBLE_KEYWORDS
        )
        xrefs = _extract_cross_references(section_text, code)

        final_chunks.append({
            'text': section_text,
            'metadata': {
                'machine_id':         machine_id,
                'source_file':        f'{machine_id}.pdf',
                'source':             filename,
                'section':            section_header,
                'section_id':         section_header,
                'page_numbers':       page_list,
                'page_start':         page_start,
                'page_number':        page_end,
                'is_table':           ('|' in section_text and '---' in section_text),
                'is_safety':          is_safety,
                'is_troubleshooting': is_trouble,
                'chunk_type':         chunk_type,
                'error_code':         code,
                'cross_references':   xrefs,
            },
        })

    _validate_coverage(final_chunks, pages, machine_id)
    print(f"[{machine_id}] {filename}: {len(final_chunks)} chunks from {len(pages)} pages")
    return final_chunks


# ---------------------------------------------------------------------------
# JSON output  (compatible with scripts/build_index.py)
# ---------------------------------------------------------------------------

def save_chunks_to_json(
    chunks: List[Dict[str, Any]],
    output_path: str,
) -> None:
    out: list[dict] = []
    for i, c in enumerate(chunks, start=1):
        out.append({
            'chunk_id': i,
            'content':  c['text'],
            'metadata': c['metadata'],
        })
    parent = os.path.dirname(output_path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=4, ensure_ascii=False)
    print(f"Saved {len(out)} chunks → {output_path}")


# ---------------------------------------------------------------------------
# HTTP endpoint
# ---------------------------------------------------------------------------

@app.post("/parse-manual")
async def parse_manual_endpoint(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
