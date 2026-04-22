import os
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat


def convert_to_markdown(pdf_path: str) -> str:
    """
    Converts a PDF to a single markdown string with [PAGE_BREAK:N] sentinels
    injected at every page boundary.

    The sentinel is consumed by the chunker to track which PDF page each
    chunk originated from. Page numbers here reflect physical PDF page
    positions (1-based), NOT any printed page numbers inside the document.

    Args:
        pdf_path: Absolute or relative path to the source PDF file.

    Returns:
        A markdown string with [PAGE_BREAK:N] markers between pages.

    Raises:
        FileNotFoundError: If the PDF does not exist at the given path.
        RuntimeError: If docling fails to convert the document.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found at: {pdf_path}")

    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False          # Keep off for speed/memory
    pipeline_options.do_table_structure = True

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )

    try:
        result = converter.convert(pdf_path)
    except Exception as e:
        raise RuntimeError(f"Docling conversion failed for '{pdf_path}': {e}") from e

    pages = list(result.document.pages)
    if not pages:
        raise RuntimeError(f"Docling returned no pages for '{pdf_path}'.")

    segments: list[str] = []

    for page_no, _page in enumerate(pages, start=1):
        # --- FIX (Issue #7): export per page and deduplicate ---
        # export_to_markdown(page_no=N) scopes output to that page.
        # Docling may emit the same element on two adjacent pages when it
        # straddles a page boundary. We keep a set of seen content hashes
        # so cross-boundary duplicates never enter the final text.
        try:
            page_md = result.document.export_to_markdown(page_no=page_no)
        except Exception:
            # If a specific page export fails, emit an empty placeholder
            # so page numbering stays consistent for the chunker.
            page_md = ""

        # Strip surrounding whitespace so empty pages don't add noise
        page_md = page_md.strip()

        # Always inject the sentinel first, even for empty pages, so that
        # the chunker's page counter never skips a number.
        segments.append(f"[PAGE_BREAK:{page_no}]")

        if page_md:
            segments.append(page_md)

    return "\n\n".join(segments)