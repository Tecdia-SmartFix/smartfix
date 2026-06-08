#!/usr/bin/env python3
"""Build PDFs of the handover docs in `docs/`.

Pipeline:
    1. Extract every ```mermaid …``` fenced block from each .md
    2. Render each block to an SVG via `@mermaid-js/mermaid-cli` (mmdc)
    3. Replace the fence in a temp copy of the markdown with an ![](svg)
    4. Pipe the temp markdown through `mdpdf` (puppeteer-backed) to PDF

Both tools are installed locally under ./node_modules — no global installs,
no sudo. Run from repo root:

    python3 scripts/build_docs_pdf.py
"""

from __future__ import annotations

import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO        = Path(__file__).resolve().parent.parent
DOCS        = REPO / "docs"
OUT         = DOCS / "pdf"
MMDC        = REPO / "node_modules" / ".bin" / "mmdc"
MDPDF       = REPO / "node_modules" / ".bin" / "mdpdf"
PUPPETEER_CFG = REPO / "scripts" / ".mmdc-puppeteer.json"

# Which docs to render. Supplementary docs are included so the handover
# bundle is complete; comment out paths you don't need.
DOC_FILES = [
    REPO / "README.md",
    DOCS / "01_API_DOCS.md",
    DOCS / "02_DATABASE_SCHEMA.md",
    DOCS / "03_SYSTEM_DESIGN.md",
    DOCS / "04_ROUTES_AND_ENDPOINTS.md",
    DOCS / "05_TECH_AND_DEPENDENCIES.md",
    DOCS / "06_CODEBASE_OWNERSHIP.md",
    DOCS / "07_API_CONTRACT.md",
    DOCS / "08_SYSTEM_PROMPT.md",
]

# Light CSS so mdpdf's default rendering looks closer to a polished
# technical doc — wider page, comfortable typography, better tables.
CSS = """
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
       color: #1f2328; font-size: 14px; line-height: 1.6; max-width: 920px; }
h1 { font-size: 28px; border-bottom: 1px solid #d1d9e0; padding-bottom: 8px; margin-top: 28px; }
h2 { font-size: 22px; border-bottom: 1px solid #d1d9e0; padding-bottom: 6px; margin-top: 26px; }
h3 { font-size: 17px; margin-top: 20px; }
h4 { font-size: 15px; margin-top: 16px; }
code { background: rgba(175,184,193,0.2); padding: 0.18em 0.4em;
       border-radius: 6px; font-size: 85%;
       font-family: 'SF Mono', Menlo, Consolas, monospace; }
pre { background: #f6f8fa; padding: 14px 16px; border-radius: 8px;
      overflow-x: auto; font-size: 12.5px; line-height: 1.5; }
pre code { background: transparent; padding: 0; font-size: inherit; }
table { border-collapse: collapse; margin: 14px 0; font-size: 13px;
        page-break-inside: avoid; width: 100%; }
th, td { border: 1px solid #d1d9e0; padding: 6px 10px; text-align: left;
         vertical-align: top; }
th { background: #f6f8fa; font-weight: 600; }
blockquote { border-left: 4px solid #d1d9e0; color: #59636e;
             padding: 0 1em; margin: 8px 0; }
a { color: #0969da; text-decoration: none; }
img { max-width: 100%; }
hr { border: none; border-top: 1px solid #d1d9e0; margin: 24px 0; }
"""

# Puppeteer config so mmdc runs without sandbox (needed in some envs).
PUPPETEER_JSON = '{"args": ["--no-sandbox", "--disable-setuid-sandbox"]}'

MERMAID_FENCE = re.compile(r"```mermaid\n(.*?)```", re.DOTALL)


def ensure_tools() -> None:
    missing = [p for p in (MMDC, MDPDF) if not p.exists()]
    if missing:
        print("Missing tools — run from repo root:", file=sys.stderr)
        print("  npm install --no-save @mermaid-js/mermaid-cli mdpdf", file=sys.stderr)
        sys.exit(1)


def render_mermaid(diagram: str, out_svg: Path) -> None:
    """Run mmdc on a single diagram block. Writes SVG to out_svg."""
    with tempfile.NamedTemporaryFile("w", suffix=".mmd", delete=False) as f:
        f.write(diagram)
        in_path = f.name
    try:
        subprocess.run(
            [
                str(MMDC),
                "-i", in_path,
                "-o", str(out_svg),
                "-b", "transparent",
                "-p", str(PUPPETEER_CFG),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )
    finally:
        Path(in_path).unlink(missing_ok=True)


def preprocess(md_path: Path, work_dir: Path) -> Path:
    """Substitute mermaid fences with image refs to SVGs in `work_dir`.

    Returns the path to the rewritten markdown copy.
    """
    text = md_path.read_text(encoding="utf-8")
    diagrams: list[str] = []

    def grab(match: re.Match) -> str:
        diagrams.append(match.group(1))
        return f"___MERMAID_{len(diagrams) - 1}___"

    placeholder_text = MERMAID_FENCE.sub(grab, text)

    for i, diagram in enumerate(diagrams):
        svg = work_dir / f"{md_path.stem}_diagram_{i}.svg"
        try:
            render_mermaid(diagram, svg)
            placeholder_text = placeholder_text.replace(
                f"___MERMAID_{i}___",
                f"![]({svg.name})",
            )
        except subprocess.CalledProcessError as e:
            err = e.stderr.decode(errors="replace") if e.stderr else "(no stderr)"
            print(f"  ! mermaid render failed for diagram {i} in {md_path.name}:\n{err}",
                  file=sys.stderr)
            # Keep the fenced source visible so the failure isn't silent.
            placeholder_text = placeholder_text.replace(
                f"___MERMAID_{i}___",
                f"```\n[diagram render failed]\n{diagram}```",
            )

    out_md = work_dir / md_path.name
    out_md.write_text(placeholder_text, encoding="utf-8")
    return out_md


def build_one(md_path: Path) -> Path:
    name = md_path.stem
    out_pdf = OUT / f"{name}.pdf"

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        css_file = tmp_dir / "style.css"
        css_file.write_text(CSS, encoding="utf-8")

        processed_md = preprocess(md_path, tmp_dir)

        subprocess.run(
            [
                str(MDPDF),
                str(processed_md),
                str(out_pdf),
                f"--style={css_file}",
                "--gh-style",
                "--format=A4",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    return out_pdf


def main() -> int:
    ensure_tools()
    PUPPETEER_CFG.write_text(PUPPETEER_JSON, encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)

    print("Rendering handover PDFs:")
    for md in DOC_FILES:
        if not md.exists():
            print(f"  skip (missing): {md.relative_to(REPO)}")
            continue
        pdf = build_one(md)
        size_kb = pdf.stat().st_size / 1024
        print(f"  {pdf.relative_to(REPO)}  ({size_kb:.0f} KB)")

    print(f"\nDone — output in {OUT.relative_to(REPO)}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
