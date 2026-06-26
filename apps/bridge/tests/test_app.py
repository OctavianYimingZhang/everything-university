import json
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app as bridge_app


client = TestClient(bridge_app.app)


def test_capabilities_catalog() -> None:
    response = client.get("/api/capabilities")
    assert response.status_code == 200
    systems = {system["id"]: system for system in response.json()["systems"]}
    assert {"memory", "coursework", "exam", "daily"} <= set(systems)
    assert "website-plan" in systems["coursework"]["scenarios"]
    assert "exam_prep_notes" in systems["exam"]["routes"]
    assert "daily_notes_generation" in systems["daily"]["routes"]


def test_execute_rejects_unknown_kind() -> None:
    response = client.post("/api/execute", json={"kind": "shell"})
    assert response.status_code == 422


def test_memory_init_summary_context_and_append(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("EVERYTHING_UNIVERSITY_MEMORY_ROOT", str(tmp_path / "memory"))
    init = client.post("/api/university/memory/init", json={"studentId": "student-test"})
    assert init.status_code == 200
    assert init.json()["status"] == "ok"
    profile = json.loads((tmp_path / "memory" / "student" / "profile.json").read_text(encoding="utf-8"))
    assert "institution" not in profile
    assert "program" not in profile

    record = {
        "source": {"platform": "fixture", "url": "https://example.test/material"},
        "title": "Lecture 1",
    }
    append = client.post(
        "/api/university/memory/append",
        json={"store": "lecture_materials", "course": "BIO101", "record": record},
    )
    assert append.status_code == 200

    summary = client.get("/api/university/memory/summary?course=BIO101")
    assert summary.status_code == 200
    assert summary.json()["stores"]["lecture_materials"]["records"] == 1

    context = client.post(
        "/api/university/memory/context",
        json={"course": "BIO101", "taskKind": "exam", "selectedRoute": "exam_prep_notes", "userPrompt": "make notes"},
    )
    assert context.status_code == 200
    payload = context.json()
    assert payload["course"] == "BIO101"
    assert payload["stores"]["lecture_materials"]["records"] == 1
    assert "untrusted evidence data" in payload["trust_boundary"]
    assert "institution" not in payload["student_profile"]
    assert "program" not in payload["student_profile"]

    writing = client.post(
        "/api/university/memory/append",
        json={
            "store": "writing_samples",
            "record": {"source": {"platform": "fixture"}, "title": "Writing sample", "sample_text": "I prefer concise explanation."},
        },
    )
    assert writing.status_code == 200

    preference = client.post(
        "/api/university/memory/append",
        json={
            "store": "notes_preferences",
            "record": {"source": {"platform": "fixture"}, "title": "Notes preference", "preference_text": "Use lecture order."},
        },
    )
    assert preference.status_code == 200

    personalized = client.post(
        "/api/university/memory/context",
        json={"course": "BIO101", "taskKind": "daily", "selectedRoute": "daily_notes_generation", "userPrompt": "make daily notes"},
    )
    assert personalized.status_code == 200
    personalized_payload = personalized.json()
    assert personalized_payload["stores"]["writing_samples"]["records"] == 1
    assert personalized_payload["stores"]["notes_preferences"]["records"] == 1
    assert personalized_payload["notes_preferences"] == ["Use lecture order."]


def test_memory_append_rejects_path_traversal(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("EVERYTHING_UNIVERSITY_MEMORY_ROOT", str(tmp_path / "memory"))
    response = client.post(
        "/api/university/memory/append",
        json={
            "store": "lecture_materials",
            "course": "../../escape",
            "record": {"source": {"platform": "fixture"}, "title": "Bad"},
        },
    )
    assert response.status_code == 400
    assert not (tmp_path / "escape").exists()


def test_automation_plan_fixture() -> None:
    response = client.post(
        "/api/university/automation/plan",
        json={
            "profile": "daily",
            "courseScope": "BIO101 only",
            "allowedAccessModes": ["official_export", "authenticated_browser"],
            "stores": ["announcements", "timetable"],
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["kind"] == "cron"
    assert "Course scope: BIO101 only." in payload["prompt"]


def test_coursework_payload_fixture() -> None:
    response = client.post("/api/coursework/payload", json={"scenario": "website-plan", "context": {}})
    assert response.status_code == 200
    payload = response.json()
    question_ids = [question["id"] for question in payload["questions"]]
    assert "website_output_mode" in question_ids


def test_exam_plan_and_review_fixture() -> None:
    plan_response = client.post(
        "/api/exam/plan",
        json={
            "prompt": "make notes and MCQ revision",
            "sourceScan": {"documents": [{"source_hint": "lecture_material"}]},
        },
    )
    assert plan_response.status_code == 200
    plan = plan_response.json()
    assert "route" in json.dumps(plan).lower() or "workflow" in json.dumps(plan).lower()

    review_response = client.post(
        "/api/exam/review",
        json={"workflowPlan": plan, "sourceScan": {"documents": [{"source_hint": "lecture_material"}]}},
    )
    assert review_response.status_code == 200
    assert "questions" in review_response.json() or "batches" in review_response.json()


def test_run_context_and_codex_handoff_shape(monkeypatch) -> None:
    monkeypatch.setattr(bridge_app, "codex_status", lambda: {"available": False, "authenticated": False, "state": "missing_cli"})
    packet = {
        "selectedSystem": "exam",
        "selectedRoute": "exam_prep_notes",
        "course": "BIO101",
        "userChoices": {"output": "Notes"},
        "sourceRoles": {"lecture_materials": True},
        "memoryContext": {"course": "BIO101"},
        "generatedPayload": {},
        "confirmedState": {},
        "nextAction": "Run with Codex",
    }
    context = client.post("/api/run-context", json=packet)
    assert context.status_code == 200
    assert "codex_prompt" in context.json()
    handoff = client.post("/api/codex/handoff", json={"packet": packet})
    assert handoff.status_code == 200
    assert handoff.json()["status"] == "ready"

    daily_packet = {**packet, "selectedSystem": "daily", "selectedRoute": "daily_notes_generation"}
    daily_context = client.post("/api/run-context", json=daily_packet)
    assert daily_context.status_code == 200
    assert "daily_notes_generation" in daily_context.json()["codex_prompt"]
