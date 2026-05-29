#!/usr/bin/env python3
"""
render_dashboard.py — substitutes the user's Store Pulse config into dashboard.html
and writes the rendered HTML to a destination path the skill can pass to
mcp__cowork__create_artifact / mcp__cowork__update_artifact.

Usage:
    python render_dashboard.py <path-to-config.json> <path-to-dashboard.html> <output-path>

Two placeholders are substituted:

  __CONFIG_JSON__         The user's SP_CONFIG object (from the config argument).
  __NOIBU_SESSION_TOOL__  The fully-qualified Noibu session tool name, constructed
                          from the connectorId in src/.claude-plugin/plugin.json.
                          Updating connectorId there is sufficient — no other file
                          needs to change.
"""

import json
import sys
from pathlib import Path


def render(config_path: Path, template_path: Path, output_path: Path) -> None:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    template = template_path.read_text(encoding="utf-8")

    # Read the connector ID from plugin.json — single source of truth.
    plugin_json_path = Path(__file__).parent / "../../../.claude-plugin/plugin.json"
    plugin = json.loads(plugin_json_path.resolve().read_text(encoding="utf-8"))
    connector_id = plugin["connectorId"]
    noibu_session_tool = f"mcp__{connector_id}__noibu_search_sessions"

    for placeholder, value in [
        ("__CONFIG_JSON__", json.dumps(config, ensure_ascii=False)),
        ("__NOIBU_SESSION_TOOL__", noibu_session_tool),
    ]:
        if placeholder not in template:
            raise SystemExit(
                f"Template at {template_path} is missing the {placeholder} placeholder."
            )
        template = template.replace(placeholder, value)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(template, encoding="utf-8")
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
