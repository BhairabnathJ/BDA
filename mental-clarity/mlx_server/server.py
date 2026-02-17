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

_model_cache: dict[str, tuple[object, object]] = {}


class GenerateRequest(BaseModel):
    prompt: str
    model: Optional[str] = None
    stream: bool = True
    format: Optional[str] = "json"


def _ensure_loaded(model_name: Optional[str] = None) -> tuple[object, object]:
    selected = model_name or MODEL
    if IMPORT_ERROR is not None:
        raise RuntimeError(
            f"mlx_lm import failed: {IMPORT_ERROR}. Install dependencies from mlx_server/requirements.txt."
        )
    if selected not in _model_cache:
        _model_cache[selected] = load(selected)
    return _model_cache[selected]


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
                "cachedModels": list(_model_cache.keys()),
            }
        )
    except Exception as exc:  # pragma: no cover - runtime env dependent
        return JSONResponse(status_code=503, content={"ok": False, "error": str(exc)})


def _stream(prompt: str, model_name: Optional[str] = None) -> Generator[bytes, None, None]:
    model, tokenizer = _ensure_loaded(model_name)

    start = time.perf_counter()
    first_token_ms = 0.0
    token_count = 0

    full_text = ""
    for i, token in enumerate(stream_generate(model, tokenizer, prompt=prompt), start=1):
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
    try:
        return StreamingResponse(
            _stream(req.prompt, req.model),
            media_type="application/x-ndjson",
        )
    except Exception as exc:  # pragma: no cover - runtime env dependent
        raise HTTPException(status_code=500, detail=f"MLX generation failed: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
