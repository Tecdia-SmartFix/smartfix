# SmartFix backend image — FastAPI + RAG pipeline.
# Single-stage build because sentence-transformers + chromadb pull in heavy
# native wheels; a multi-stage split saves little once the runtime image
# needs the same shared libs (libgomp, libstdc++) anyway.

FROM python:3.11-slim

# System deps: libgomp1 for chroma's hnswlib, curl for HEALTHCHECK probes,
# build-essential only when wheels are missing for the host arch (mostly ARM).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libgomp1 \
        curl \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so this layer is cached unless requirements.txt
# changes. The sentence-transformers + chromadb install is ~3–5 minutes the
# first time; cache makes subsequent builds fast.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code. `scripts/` is included so the in-container backup script
# can be invoked via `docker compose exec backend`.
COPY src/      ./src/
COPY scripts/  ./scripts/

# Stateful directories. These all need to be mounted as named volumes (see
# docker-compose.yml) so the SQLite store, ingested chunks, uploaded PDFs,
# and audit log survive container restarts.
RUN mkdir -p ./data/uploads ./chroma_db

EXPOSE 8000

# Health endpoint is implemented at /health (src/api.py).
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
