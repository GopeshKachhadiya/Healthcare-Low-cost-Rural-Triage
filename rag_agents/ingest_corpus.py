"""
RAG Corpus Ingestion Script
Chunks, embeds, and inserts medical knowledge documents into Supabase pgvector.
Run this once (or periodically) to populate the rag_documents table.
"""

import os
import json
import time
import httpx
from pathlib import Path

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "your-service-role-key")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "your-openrouter-key")

CHUNK_SIZE = 800     # characters per chunk
CHUNK_OVERLAP = 100  # overlap between consecutive chunks

HEADERS_SUPABASE = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

def chunk_text(text: str, source: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append({"source": source, "content": chunk.strip(), "language_code": "en"})
        start = end - overlap
    return chunks

def embed_text(text: str) -> list:
    """Get embedding vector from OpenRouter (text-embedding-3-small)."""
    resp = httpx.post(
        "https://openrouter.ai/api/v1/embeddings",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
        json={"model": "openai/text-embedding-3-small", "input": text},
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()["data"][0]["embedding"]

def insert_chunk(chunk: dict):
    """Insert a single chunk with embedding into Supabase."""
    embedding = embed_text(chunk["content"])
    payload = {
        "source": chunk["source"],
        "content": chunk["content"],
        "embedding": embedding,
        "language_code": chunk.get("language_code", "en")
    }
    resp = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rag_documents",
        headers=HEADERS_SUPABASE,
        json=payload,
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()

def ingest_file(filepath: str, source_name: str):
    """Read a text file, chunk it, embed each chunk, insert into Supabase."""
    text = Path(filepath).read_text(encoding="utf-8")
    chunks = chunk_text(text, source=source_name)
    print(f"  → {len(chunks)} chunks from '{source_name}'")

    for i, chunk in enumerate(chunks):
        try:
            insert_chunk(chunk)
            print(f"    ✓ Chunk {i+1}/{len(chunks)}")
            time.sleep(0.5)  # Rate limiting
        except Exception as e:
            print(f"    ✗ Error on chunk {i+1}: {e}")

def main():
    """
    Add your source documents here.
    Download the documents as plain .txt files into a 'rag_corpus/' folder.
    """
    corpus_dir = Path("rag_corpus")
    corpus_dir.mkdir(exist_ok=True)

    # Map of filename → source display name (matching Agents.md §9.2)
    documents = {
        "who_imci.txt":             "WHO IMCI Chart Booklet",
        "icmr_guidelines.txt":      "ICMR Standard Treatment Guidelines",
        "indian_formulary.txt":     "Indian National Formulary",
        "who_essential_medicines.txt": "WHO Essential Medicines List",
        "medlineplus.txt":          "MedlinePlus Patient Guides",
        "msd_manual.txt":           "MSD Manual (Consumer)",
        "drug_interactions.txt":    "Drug Interaction Database (DrugBank)",
        "first_aid.txt":            "WHO/Red Cross First Aid Guidelines",
    }

    for filename, source_name in documents.items():
        filepath = corpus_dir / filename
        if not filepath.exists():
            print(f"⚠ Skipping '{filename}' — file not found in rag_corpus/")
            continue
        print(f"\nIngesting: {source_name}")
        ingest_file(str(filepath), source_name)

    print("\n✅ RAG corpus ingestion complete.")

if __name__ == "__main__":
    main()
