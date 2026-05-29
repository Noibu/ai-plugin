#!/usr/bin/env python3
"""
render_dashboard.py — substitutes the user's Store Pulse config into dashboard.html
and writes the rendered HTML to a destination path the skill can pass to
mcp__cowork__create_artifact / mcp__cowork__update_artifact.

Usage:
    python render_dashboard.py <path-to-config.json> <path-to-dashboard.html> <output-path>

The dashboard.html template contains the literal string `__CONFIG_JSON__` exactly
once. The script replaces it with the JSON-encoded config object so the dashboard's
JS can read `SP_CONFIG` at load time and decide which blocks to render and which
share channels to expose in the dropdown.
"""

import json
import sys
from pathlib import Path


def render(config_path: Path, template_path: Path, output_path: Path) -> None:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    template = template_path.read_text(encoding="utf-8")

    placeholder = "__CONFIG_JSON__"
    if placeholder not in template:
        raise SystemExit(
            f"Template at {template_path} is missing the {placeholder} placeholder."
        )

    # JSON-encode with ensure_ascii=False so non-ASCII characters in the config
    # (e.g., domain names, channel names) survive the substitution intact.
    rendered = template.replace(placeholder, json.dumps(config, ensure_ascii=False))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(rendered, encoding="utf-8")
    print(f"Wrote {output_path}")


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: render_dashboard.py <config.json> <dashboard.html> <output.html>"
        )
    render(
        config_path=Path(sys.argv[1]),
        template_path=Path(sys.argv[2]),
        output_path=Path(sys.argv[3]),
    )


if __name__ == "__main__":
    main()
