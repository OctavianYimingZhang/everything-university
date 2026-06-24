#!/usr/bin/env python3
"""Initialize and validate the separated Everything University memory store."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


STORE_PATHS = {
    "source_index": "courses/{course}/materials/source_index.jsonl",
    "lecture_materials": "courses/{course}/materials/lecture_materials.jsonl",
    "recordings_transcripts": "courses/{course}/materials/recordings_transcripts.jsonl",
    "readings": "courses/{course}/materials/readings.jsonl",
    "assignments": "courses/{course}/materials/assignments.jsonl",
    "timetable": "courses/{course}/schedule/timetable.jsonl",
    "unit_map": "courses/{course}/schedule/unit_map.jsonl",
    "deadline_changes": "courses/{course}/schedule/deadline_changes.jsonl",
    "announcements": "courses/{course}/communications/announcements.jsonl",
    "action_items": "courses/{course}/communications/action_items.jsonl",
    "feedback": "courses/{course}/feedback/tutor_ta_feedback.jsonl",
    "runs": "collection_runs/runs.jsonl",
}

ROOT_DIRS = (
    "student",
    "courses",
    "collection_runs",
)

REQUIRED_FIELDS = {
    "source_index": ("id", "observed_at", "source", "source_type", "title"),
    "lecture_materials": ("id", "observed_at", "source", "title"),
    "recordings_transcripts": ("id", "observed_at", "source", "title"),
    "readings": ("id", "observed_at", "source", "title"),
    "assignments": ("id", "observed_at", "source", "title"),
    "timetable": ("id", "observed_at", "source", "starts_at", "title"),
    "unit_map": ("id", "observed_at", "source", "unit_title"),
    "deadline_changes": ("id", "observed_at", "source", "title"),
    "announcements": ("id", "observed_at", "source", "title"),
    "action_items": ("id", "observed_at", "source", "title"),
    "feedback": ("id", "observed_at", "source", "feedback_text"),
    "runs": ("id", "observed_at", "source", "status"),
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def stable_id(payload: dict[str, Any]) -> str:
    source = json.dumps(payload, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(source.encode("utf-8")).hexdigest()[:16]


def json_load(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def json_write(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def store_path(root: Path, store: str, course: str | None = None) -> Path:
    if store not in STORE_PATHS:
        raise SystemExit(f"Unknown store: {store}")
    template = STORE_PATHS[store]
    if "{course}" in template:
        if not course:
            raise SystemExit(f"--course is required for store {store}")
        template = template.format(course=course)
    return root / template


def init_memory(root: Path, student_id: str | None) -> None:
    root.mkdir(parents=True, exist_ok=True)
    for child in ROOT_DIRS:
        (root / child).mkdir(parents=True, exist_ok=True)
    profile_path = root / "student" / "profile.json"
    source_access_path = root / "student" / "source_access.json"
    course_index_path = root / "courses" / "index.json"
    if not profile_path.exists():
        json_write(
            profile_path,
            {
                "student_id": student_id or "",
                "created_at": utc_now(),
                "institution": "",
                "program": "",
                "notes": "Local student-owned profile. Do not store passwords.",
            },
        )
    if not source_access_path.exists():
        json_write(
            source_access_path,
            {
                "created_at": utc_now(),
                "lms": "",
                "lms_base_url": "",
                "collection_modes": [],
                "never_store": ["passwords", "session_cookies", "2fa_backup_codes"],
            },
        )
    if not course_index_path.exists():
        json_write(course_index_path, {"courses": [], "updated_at": utc_now()})


def append_record(root: Path, store: str, course: str | None, record: dict[str, Any]) -> Path:
    record = dict(record)
    record.setdefault("observed_at", utc_now())
    record.setdefault("id", stable_id(record))
    if course:
        record.setdefault("course_code", course)
    path = store_path(root, store, course)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=True, ensure_ascii=True) + "\n")
    return path


def iter_jsonl(path: Path) -> Iterable[tuple[int, dict[str, Any]]]:
    if not path.exists():
        return
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            value = json.loads(line)
            if not isinstance(value, dict):
                raise ValueError(f"{path}:{line_number} is not a JSON object")
            yield line_number, value


def validate_memory(root: Path) -> list[str]:
    errors: list[str] = []
    for path in (root / "student" / "profile.json", root / "student" / "source_access.json", root / "courses" / "index.json"):
        if not path.exists():
            errors.append(f"Missing required file: {path}")
            continue
        try:
            json_load(path, {})
        except json.JSONDecodeError as exc:
            errors.append(f"Invalid JSON: {path}: {exc}")
    for path in root.rglob("*.jsonl"):
        store = path.stem
        if store == "tutor_ta_feedback":
            store = "feedback"
        required = REQUIRED_FIELDS.get(store)
        if not required:
            continue
        try:
            for line_number, record in iter_jsonl(path):
                missing = [field for field in required if field not in record or record[field] in ("", None)]
                if missing:
                    errors.append(f"{path}:{line_number} missing fields: {', '.join(missing)}")
        except (json.JSONDecodeError, ValueError) as exc:
            errors.append(str(exc))
    return errors


def summarize(root: Path, course: str | None) -> dict[str, Any]:
    summary: dict[str, Any] = {"root": str(root), "stores": {}}
    for store in STORE_PATHS:
        if store != "runs" and not course:
            continue
        try:
            path = store_path(root, store, course)
        except SystemExit:
            continue
        count = 0
        latest = None
        if path.exists():
            for _, record in iter_jsonl(path):
                count += 1
                observed = record.get("observed_at")
                if observed and (latest is None or observed > latest):
                    latest = observed
        summary["stores"][store] = {"path": str(path), "records": count, "latest_observed_at": latest}
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Manage separated Everything University memories.")
    parser.add_argument("--root", default=".everything-university/memory", help="Memory root directory")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init", help="Create the memory directory layout")
    init_parser.add_argument("--student-id", default="")

    append_parser = subparsers.add_parser("append", help="Append a JSON record to a store")
    append_parser.add_argument("--store", required=True, choices=sorted(STORE_PATHS))
    append_parser.add_argument("--course")
    append_parser.add_argument("--record-json", required=True)

    subparsers.add_parser("validate", help="Validate JSON and required fields")

    summarize_parser = subparsers.add_parser("summarize", help="Summarize store counts")
    summarize_parser.add_argument("--course")

    args = parser.parse_args()
    root = Path(args.root)

    if args.command == "init":
        init_memory(root, args.student_id or None)
        print(json.dumps({"status": "ok", "root": str(root)}, indent=2))
        return 0
    if args.command == "append":
        try:
            record = json.loads(args.record_json)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"--record-json is invalid JSON: {exc}") from exc
        if not isinstance(record, dict):
            raise SystemExit("--record-json must decode to a JSON object")
        path = append_record(root, args.store, args.course, record)
        print(json.dumps({"status": "ok", "path": str(path)}, indent=2))
        return 0
    if args.command == "validate":
        errors = validate_memory(root)
        if errors:
            print(json.dumps({"status": "error", "errors": errors}, indent=2))
            return 1
        print(json.dumps({"status": "ok", "root": str(root)}, indent=2))
        return 0
    if args.command == "summarize":
        print(json.dumps(summarize(root, args.course), indent=2, sort_keys=True))
        return 0
    raise SystemExit(f"Unknown command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
