"""scripts.test_google_ai_studio

Minimal, repeatable smoke-test for Google AI Studio (Gemini) API.

Why this exists:
- Avoids shell quoting/escaping issues when testing via one-liners
- Produces stable machine-readable output (JSON)

Usage (PowerShell):
  # Option A: use backend .env (recommended for local dev)
  python medicase/backend/scripts/test_google_ai_studio.py --dotenv medicase/backend/.env

  # Option B: rely on process env var
  $env:GOOGLE_AI_STUDIO_API_KEY = "..."
  python medicase/backend/scripts/test_google_ai_studio.py
"""

from __future__ import annotations

import argparse
import json
import os
import time
from typing import Any, Dict

from dotenv import dotenv_values
from google import genai
from google.genai import types


def _load_key(dotenv_path: str | None) -> str:
    if dotenv_path:
        key = dotenv_values(dotenv_path).get("GOOGLE_AI_STUDIO_API_KEY")
        if key:
            return key

    key = os.getenv("GOOGLE_AI_STUDIO_API_KEY")
    if not key:
        raise SystemExit(
            "GOOGLE_AI_STUDIO_API_KEY is not set. Provide --dotenv or set the env var."
        )
    return key


def run(model: str, key: str) -> Dict[str, Any]:
    client = genai.Client(api_key=key)

    prompt = "Reply with JSON only: {\"status\": \"ok\"}"
    t0 = time.perf_counter()
    resp = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    dt = time.perf_counter() - t0

    # Validate that the provider really returned JSON we can parse.
    parsed = json.loads(resp.text)
    return {
        "model": model,
        "latency_s": round(dt, 3),
        "response_text": resp.text,
        "response_json": parsed,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dotenv",
        default=None,
        help="Optional path to a .env file containing GOOGLE_AI_STUDIO_API_KEY",
    )
    parser.add_argument(
        "--model",
        default="gemini-2.0-flash",
        help="Gemini model name to call (default: gemini-2.0-flash)",
    )
    args = parser.parse_args()

    key = _load_key(args.dotenv)
    result = run(model=args.model, key=key)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

