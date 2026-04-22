import os
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat

def convert_to_markdown(pdf_path):
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found at: {pdf_path}")

    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False  # Keep off for memory
    pipeline_options.do_table_structure = True 

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )
    
    result = converter.convert(pdf_path)
    
    # We manually build the markdown string by iterating through pages
    # This guarantees the Chunker knows exactly where each page starts
    full_text = ""
    for page_no, page in enumerate(result.document.pages, 1):
        # We insert a marker that our chunker will recognize
        full_text += f"\n\n[PAGE_BREAK:{page_no}]\n\n"
        # Export the specific content belonging to this page
        full_text += result.document.export_to_markdown(page_no=page_no)
        
    return full_text