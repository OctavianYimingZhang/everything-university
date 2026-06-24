#!/usr/bin/env python3
"""Validate the Everything University plugin source tree."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILL_VALIDATOR = Path("/Users/octavianzhang/.codex/skills/.system/skill-creator/scripts/quick_validate.py")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def check_no_todo(path: Path, errors: list[str]) -> None:
    text = path.read_text(encoding="utf-8")
    marker = "TO" + "DO"
    if marker in text or f"[{marker}" in text:
        errors.append(f"Template marker remains in {path.relative_to(ROOT)}")


def run_skill_validator(skill_path: Path, errors: list[str]) -> None:
    if not SKILL_VALIDATOR.exists():
        errors.append(f"Missing skill validator: {SKILL_VALIDATOR}")
        return
    result = subprocess.run(
        ["python3", str(SKILL_VALIDATOR), str(skill_path)],
        cwd=str(ROOT),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if result.returncode != 0:
        errors.append(f"quick_validate failed for {skill_path.relative_to(ROOT)}:\n{result.stdout}")


def main() -> int:
    errors: list[str] = []
    plugin_json = ROOT / ".codex-plugin" / "plugin.json"
    manifest_json = ROOT / "skill_manifest.json"

    for required in (plugin_json, manifest_json):
        if not required.exists():
            errors.append(f"Missing {required.relative_to(ROOT)}")

    if not errors:
        plugin = load_json(plugin_json)
        manifest = load_json(manifest_json)
        if plugin.get("name") != "everything-university":
            errors.append("plugin.json name must be everything-university")
        if plugin.get("skills") != "./skills/":
            errors.append("plugin.json skills must point to ./skills/")
        if not manifest.get("multi_skill_system"):
            errors.append("skill_manifest.json must declare multi_skill_system")
        for focused in manifest.get("focused_skills", []):
            skill_file = ROOT / focused["path"]
            if not skill_file.exists():
                errors.append(f"Missing focused skill: {focused['path']}")
                continue
            check_no_todo(skill_file, errors)
            run_skill_validator(skill_file.parent, errors)

    for script_name in ("university_memory.py", "build_automation_prompt.py"):
        script = ROOT / "scripts" / script_name
        if not script.exists():
            errors.append(f"Missing script: scripts/{script_name}")
        elif not script.read_text(encoding="utf-8").startswith("#!/usr/bin/env python3"):
            errors.append(f"Missing python shebang: scripts/{script_name}")

    if errors:
        print(json.dumps({"status": "error", "errors": errors}, indent=2))
        return 1
    print(json.dumps({"status": "ok", "root": str(ROOT)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
