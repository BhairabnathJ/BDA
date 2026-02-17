#!/usr/bin/env python3
"""
Lightweight MLX sidecar for local Apple Silicon inference.

Endpoints:
- GET /health
- POST /generate

Streaming format matches the frontend's NDJSON expectations:
{"response":"...", "done": false}
...
{"done": true, "metrics": {...}}
"""

from __future__ import annotations

import json
import os
import time
from typing import Generator, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

try:
    from mlx_lm import load, stream_generate
except Exception as exc:  # pragma: no cover - dependency/runtime gate
    load = None  # type: ignore[assignment]
    stream_generate = None  # type: ignore[assignment]
    IMPORT_ERROR = exc
else:
    IMPORT_ERROR = None

HOST = os.getenv("MLX_HOST", "127.0.0.1")
PORT = int(os.getenv("MLX_PORT", "8800"))
MODEL = os.getenv("MLX_MODEL", "mlx-community/Qwen2.5-14B-Instruct-4bit")

app = FastAPI(title="Mental Clarity MLX Sidecar", version="0.1.0")

_model = None
_tokenizer = None


class GenerateRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    stream: bool = True
    format: Optional[str] = "json"


def _ensure_loaded() -> None:
    global _model, _tokenizer
    if IMPORT_ERROR is not None:
        raise RuntimeError(
            f"mlx_lm import failed: {IMPORT_ERROR}. Install dependencies from mlx_server/requirements.txt."
        )
    if _model is None or _tokenizer is None:
        _model, _tokenizer = load(MODEL)


@app.get("/health")
def health() -> JSONResponse:
    if IMPORT_ERROR is not None:
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "error": f"mlx_lm import failed: {IMPORT_ERROR}",
            },
        )

    try:
        _ensure_loaded()
        return JSONResponse(
            content={
                "ok": True,
                "backend": "mlx",
                "model": MODEL,
            }
        )
    except Exception as exc:  # pragma: no cover - runtime env dependent
        return JSONResponse(status_code=503, content={"ok": False, "error": str(exc)})


def _stream(prompt: str) -> Generator[bytes, None, None]:
    _ensure_loaded()

    start = time.perf_counter()
    first_token_ms = 0.0
    token_count = 0

    full_text = ""
    for i, token in enumerate(stream_generate(_model, _tokenizer, prompt=prompt), start=1):
        token_text = token.text if hasattr(token, "text") else str(token)
        if not token_text:
            continue
        full_text += token_text
        token_count += 1

        if i == 1:
            first_token_ms = (time.perf_counter() - start) * 1000

        chunk = {"response": token_text, "done": False}
        yield (json.dumps(chunk) + "\n").encode("utf-8")

    total_ms = (time.perf_counter() - start) * 1000
    metrics = {
        "totalDurationMs": total_ms,
        "loadDurationMs": 0,
        "promptEvalDurationMs": 0,
        "evalDurationMs": total_ms,
        "promptTokens": 0,
        "evalTokens": token_count,
        "timeToFirstTokenMs": first_token_ms,
    }
    yield (json.dumps({"done": True, "metrics": metrics}) + "\n").encode("utf-8")


@app.post("/generate")
def generate(req: GenerateRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")
    if req.model and req.model != MODEL:
        # Keep API simple and deterministic for this app: one configured model.
        return JSONResponse(
            status_code=400,
            content={
                "error": f"Model override unsupported by this sidecar. Configure MLX_MODEL env instead.",
                "configuredModel": MODEL,
            },
        )

    try:
        return StreamingResponse(_stream(req.prompt), media_type="application/x-ndjson")
    except Exception as exc:  # pragma: no cover - runtime env dependent
        raise HTTPException(status_code=500, detail=f"MLX generation failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
