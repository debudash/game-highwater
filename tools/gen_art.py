"""Generate game images with Gemini, from the prompts in docs/ART_PROMPTS.md.

The doc stays the one record of how every image was made: this script reads each asset's prompt
from it (a **`name.png`** heading followed by a > quote), swaps in the style block, attaches the
right reference image (the tank for sprites, bg-riverside for backgrounds) with the "match the
reference" line, and saves the result to art/source/<name>.png. Then run tools/build_art.py.

The API key is read from GEMINI_API_KEY in the environment or in .env at the repo root. It is
never printed. .env is ignored by git and by the Docker build.

Usage:
    python tools/gen_art.py --list-models          # which image models your key can use
    python tools/gen_art.py jet bomb               # generate these (skips files that exist)
    python tools/gen_art.py --missing              # every prompt in the doc without a file yet
    python tools/gen_art.py jet --force            # regenerate, keeping the old file as jet.old.png
"""

import argparse
import base64
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DOC = ROOT / "docs" / "ART_PROMPTS.md"
SRC = ROOT / "art" / "source"
API = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODEL = "gemini-3-pro-image"

SPRITE_REF = "tank.png"
BG_REF = "bg-riverside.png"
SPRITE_MATCH = ("Match the reference image exactly: same pixel size, outline colour and thickness, "
                "shading, and the same slight three-quarter view from the side and a little above. "
                "Use the reference only for the art style: draw the object described, not the tank.")
BG_MATCH = ("Match the reference image exactly: same pixel size, same painterly pixel style, same "
            "composition (sky on top, hills and trees, a river valley), only the time of day and "
            "weather change.")


def api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "")
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            m = re.match(r"\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$", line)
            if m:
                key = m.group(1).strip().strip('"').strip("'")
    if not key:
        sys.exit("No GEMINI_API_KEY: add a line GEMINI_API_KEY=... to .env at the repo root.")
    return key


def prompts() -> dict[str, str]:
    """Every asset prompt in the doc, with the style block filled in."""
    text = DOC.read_text(encoding="utf-8")
    style = re.search(r"## The style block.*?\n((?:> .*\n)+)", text, re.S)
    style_text = " ".join(l[2:].strip() for l in style.group(1).splitlines())
    out = {}
    for m in re.finditer(r"\*\*`([\w-]+)\.png`\*\*[^\n]*\n((?:> .*\n)+)", text):
        body = " ".join(l[2:].strip() for l in m.group(2).splitlines())
        out[m.group(1)] = body.replace("[style block]", style_text)
    return out


def call(model: str, key: str, parts: list, image_config: dict | None) -> dict:
    body = {"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]}}
    if image_config:
        body["generationConfig"]["imageConfig"] = image_config
    req = urllib.request.Request(
        f"{API}/models/{model}:generateContent", data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key}, method="POST")
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


def reference(name: str) -> tuple[str, str] | None:
    ref = BG_REF if name.startswith("bg-") else None if name == "logo" else SPRITE_REF
    if ref is None or ref == f"{name}.png" or not (SRC / ref).exists():
        return None
    img = Image.open(SRC / ref).convert("RGB")
    img.thumbnail((1536, 1536))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return ref, base64.b64encode(buf.getvalue()).decode()


def generate(name: str, prompt: str, model: str, key: str, force: bool) -> None:
    dst = SRC / f"{name}.png"
    if dst.exists() and not force:
        print(f"{name}: exists, skipped (use --force to regenerate)")
        return
    parts: list = []
    ref = reference(name)
    if ref:
        parts.append({"inline_data": {"mime_type": "image/png", "data": ref[1]}})
        prompt = f"{prompt} {BG_MATCH if name.startswith('bg-') else SPRITE_MATCH}"
    parts.append({"text": prompt})
    # Backgrounds are wide and asked for at 2K so they never need scaling up; sprites only need
    # their art-pixel grid, which is the same at any size.
    config = {"aspectRatio": "21:9", "imageSize": "2K"} if name.startswith("bg-") else {"aspectRatio": "16:9"}
    try:
        res = call(model, key, parts, config)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        if e.code == 400:
            print(f"{name}: the model refused the image settings, retrying without them")
            res = call(model, key, parts, None)
        else:
            sys.exit(f"{name}: HTTP {e.code} from Gemini: {detail[:600]}")
    images = [p["inlineData"]["data"] for c in res.get("candidates", []) for p in c.get("content", {}).get("parts", []) if "inlineData" in p]
    if not images:
        texts = [p.get("text", "") for c in res.get("candidates", []) for p in c.get("content", {}).get("parts", [])]
        sys.exit(f"{name}: no image in the reply. {res.get('promptFeedback', '')} {' '.join(texts)[:400]}")
    if dst.exists():
        dst.replace(dst.with_name(f"{name}.old.png"))
    Image.open(io.BytesIO(base64.b64decode(images[0]))).save(dst)
    print(f"{name}: saved {dst.relative_to(ROOT)}" + (f" (reference: {ref[0]})" if ref else ""))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--missing", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--list-models", action="store_true")
    a = ap.parse_args()
    key = api_key()
    if a.list_models:
        req = urllib.request.Request(f"{API}/models?pageSize=200", headers={"x-goog-api-key": key})
        with urllib.request.urlopen(req, timeout=60) as r:
            for m in json.loads(r.read()).get("models", []):
                if "image" in m["name"]:
                    print(m["name"].removeprefix("models/"), "-", m.get("displayName", ""))
        return
    table = prompts()
    names = a.names or ([n for n in table if not (SRC / f"{n}.png").exists()] if a.missing else [])
    if not names:
        sys.exit("Name the assets to generate, or pass --missing. Known: " + ", ".join(table))
    for n in names:
        if n not in table:
            sys.exit(f"{n}: no prompt for it in docs/ART_PROMPTS.md")
        generate(n, table[n], a.model, key, a.force)


if __name__ == "__main__":
    main()
