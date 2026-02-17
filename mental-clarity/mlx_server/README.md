# MLX Sidecar (Apple Silicon)

This folder contains a local MLX-backed HTTP sidecar used by the frontend when:

`VITE_AI_BACKEND=mlx`

## Quick start

1. Create a Python environment.
2. Install dependencies:

```bash
pip install -r mlx_server/requirements.txt
```

3. (Optional) choose a model:

```bash
export MLX_MODEL=mlx-community/Qwen2.5-14B-Instruct-4bit
```

4. Start the sidecar:

```bash
npm run ai:mlx:serve
```

Server defaults:
- Host: `127.0.0.1`
- Port: `8800`

Frontend env config:

```bash
VITE_AI_BACKEND=mlx
VITE_MLX_BASE_URL=http://127.0.0.1:8800
VITE_MLX_MODEL=mlx-community/Qwen2.5-14B-Instruct-4bit
```

## API

- `GET /health`
- `POST /generate` (NDJSON streaming)

Stream lines:

```json
{"response":"token", "done": false}
{"done": true, "metrics": {"totalDurationMs": 1234.5, "evalTokens": 321}}
```
