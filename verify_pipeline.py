import os
from src.ingestion.parser import convert_to_markdown
from src.ingestion.chunker import chunk_markdown, save_chunks_to_json

def test_manual_processing():
    # Target the Laser Cutting manual [cite: 2]
    test_pdf = "data/uploads/LASER CUTTING MACHINE.pdf"
    
    if not os.path.exists(test_pdf):
        print(f"❌ Error: Could not find PDF at {test_pdf}")
        return

    print(f"\n{'='*60}")
    print(f"🚀 HARDWARE RAG: PROCESSING {os.path.basename(test_pdf).upper()}")
    print(f"{'='*60}\n")

    # STEP 1: PARSING
    print("--- STEP 1: PARSING PDF TO MARKDOWN ---")
    try:
        md_text = convert_to_markdown(test_pdf)
        print("✅ Parsing Successful.\n")
    except Exception as e:
        print(f"❌ Parsing Failed: {e}")
        return

    # STEP 2: CHUNKING
    print("--- STEP 2: GENERATING HIERARCHICAL CHUNKS ---")
    machine_name = os.path.basename(test_pdf).replace(".pdf", "")
    chunks = chunk_markdown(md_text, machine_name)
    print(f"✅ Created {len(chunks)} chunks with page tracking.\n")

    # STEP 3: PREVIEW
    print("--- STEP 3: CHUNK PREVIEW ---")
    for i, chunk in enumerate(chunks[:5], 1): # Preview first 5
        print(f"CHUNK {i} | Page: {chunk.metadata.get('page_number')} | Safety: {chunk.metadata.get('is_safety')}")
        print(f"Content: {chunk.page_content[:100]}...")
        print("-" * 20)

    # STEP 4: SAVE JSON
    print("\n--- STEP 4: EXPORTING JSON FOR BACKEND ---")
    output_path = f"data/processed/{machine_name}_chunks.json"
    save_chunks_to_json(chunks, output_path)

    print(f"\n{'='*60}")
    print("✅ VERIFICATION COMPLETE: JSON created in data/processed/")
    print(f"{'='*60}")

if __name__ == "__main__":
    test_manual_processing()