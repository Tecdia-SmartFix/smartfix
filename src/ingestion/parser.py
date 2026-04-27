"""
parser.py — PDF → Markdown with [PAGE_BREAK:N] page sentinels.

Fixes applied (Round 1):
  #7  Per-page export uses join() instead of concatenation to prevent content
      duplication at page boundaries.  Empty pages emit a sentinel placeholder
      so page numbering stays gapless for the chunker.

The [PAGE_BREAK:N] sentinel encodes the physical PDF page number (1-based).
It does NOT reflect any printed page number inside the document — PDFs
without visible page numbers are handled correctly because the sentinel
is injected by the parser, not read from the document content.
"""

from __future__ import annotations

import os

from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat


def convert_to_markdown(pdf_path: str) -> str:
    """
    Convert a PDF file to a single markdown string.

    A [PAGE_BREAK:N] sentinel is injected before each page's content so that
    chunker.py can track which physical PDF page each chunk originated from.

    Args:
        pdf_path: Absolute or relative path to the source PDF.

    Returns:
        A markdown string with [PAGE_BREAK:N] markers separating pages.

    Raises:
        FileNotFoundError: If no file exists at *pdf_path*.
        RuntimeError:      If docling fails to convert the document or returns
                           zero pages.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found at: {pdf_path}")

    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False           # keep off for speed / memory
    pipeline_options.do_table_structure = True

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )

    try:
        result = converter.convert(pdf_path)
    except Exception as exc:
        raise RuntimeError(
            f"Docling conversion failed for '{pdf_path}': {exc}"
        ) from exc

    pages = list(result.document.pages)
    if not pages:
        raise RuntimeError(f"Docling returned no pages for '{pdf_path}'.")

    # Fix #7: build segments list then join — avoids accidental duplication
    # from repeated string concatenation, and keeps the logic clear.
    segments: list[str] = []

    for page_no, _page in enumerate(pages, start=1):
        # Always emit the sentinel first, even for empty pages, so the
        # chunker's page counter is never missing a number.
        segments.append(f"[PAGE_BREAK:{page_no}]")

        try:
            page_md = result.document.export_to_markdown(page_no=page_no)
        except Exception:
            # If a single page export fails, skip its content but keep the
            # sentinel so downstream page numbering remains consistent.
            continue

        page_md = page_md.strip()
        if page_md:
            segments.append(page_md)

    return "\n\n".join(segments)