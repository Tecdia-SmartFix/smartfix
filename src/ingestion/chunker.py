from langchain_text_splitters import MarkdownHeaderTextSplitter
import re
import json
import os

def chunk_markdown(markdown_content: str, source_name: str):
    """
    Splits markdown by headers and tracks page numbers using [PAGE_BREAK:X] markers.
    """
    headers_to_split_on = [
        ("#", "Header_1"),
        ("##", "Section"),
        ("###", "Subsection"),
    ]
    
    markdown_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on, 
        strip_headers=False 
    )
    
    sections = markdown_splitter.split_text(markdown_content)
    
    final_chunks = []
    current_page = "1" 

    for section in sections:
        content = section.page_content
        
        # 1. Capture page number from our custom [PAGE_BREAK:X] marker
        page_match = re.search(r"\[PAGE_BREAK:(\d+)\]", content)
        if page_match:
            current_page = page_match.group(1) 

        # 2. Meta-data generation for citations
        h1 = section.metadata.get("Header_1", "")
        h2 = section.metadata.get("Section", "")
        h3 = section.metadata.get("Subsection", "")
        section_id = f"{h1} > {h2} > {h3}".strip(" >")

        # 3. Safety and Troubleshooting tagging
        is_safety = any(word in content.upper() for word in [
            "DANGER", "WARNING", "CAUTION", "PROHIBITED", "CLASS 4", "FIRE HAZARD"
        ])
        
        is_troubleshooting = any(x in content for x in ["Error Code", "Fault Code", "Resolution Steps"])

        section.metadata.update({
            "machine_id": source_name,
            "section_id": section_id,
            "page_number": current_page,
            "is_safety": is_safety,
            "is_troubleshooting": is_troubleshooting,
            "source_file": f"{source_name}.pdf"
        })
        
        final_chunks.append(section)
        
    return final_chunks

def save_chunks_to_json(chunks, output_path):
    """
    Converts LangChain chunks to a JSON structure and removes internal page markers.
    """
    json_data = []
    for i, chunk in enumerate(chunks):
        # CLEANUP: Remove the [PAGE_BREAK:X] marker so it doesn't clutter the LLM's view
        clean_content = re.sub(r"\[PAGE_BREAK:\d+\]", "", chunk.page_content).strip()
        
        chunk_dict = {
            "chunk_id": i + 1,
            "content": clean_content,
            "metadata": chunk.metadata
        }
        json_data.append(chunk_dict)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, indent=4, ensure_ascii=False)
    
    print(f"✅ JSON Created with verified Page Numbers: {output_path}")