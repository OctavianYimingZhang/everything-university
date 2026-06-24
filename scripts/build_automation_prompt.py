#!/usr/bin/env python3
"""Build automation_update inputs for Everything University collection."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


PROFILES = {
    "daily": {
        "name": "Everything University daily collection",
        "rrule": "FREQ=DAILY;INTERVAL=1",
        "focus": "announcements, timetable changes, urgent action items, new LMS material",
    },
    "three-day": {
        "name": "Everything University 3-day collection",
        "rrule": "FREQ=DAILY;INTERVAL=3",
        "focus": "new lecture materials, recordings, transcripts, readings, assignments, announcements",
    },
    "weekly": {
        "name": "Everything University weekly reconciliation",
        "rrule": "FREQ=WEEKLY;INTERVAL=1",
        "focus": "full course memory reconciliation, feedback consolidation, stale source checks",
    },
}


def build_payload(profile: str, cwd: str, memory_root: str) -> dict[str, object]:
    spec = PROFILES[profile]
    prompt = (
        "Use $everything-university-student to update the Act-as-student university memory. "
        f"Memory root: {memory_root}. Focus on {spec['focus']}. "
        "Use separated stores for materials, timetable, announcements, feedback, and collection runs. "
        "Do not request passwords or store credentials. If authentication or 2FA blocks collection, "
        "report the exact source and the minimum user action needed."
    )
    return {
        "mode": "create",
        "kind": "cron",
        "name": spec["name"],
        "prompt": prompt,
        "rrule": spec["rrule"],
        "cwds": [str(Path(cwd).resolve())],
        "executionEnvironment": "local",
        "status": "ACTIVE",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Codex automation payload for university collection.")
    parser.add_argument("--profile", required=True, choices=sorted(PROFILES))
    parser.add_argument("--cwd", default=".")
    parser.add_argument("--memory-root", default=".everything-university/memory")
    args = parser.parse_args()
    print(json.dumps(build_payload(args.profile, args.cwd, args.memory_root), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
