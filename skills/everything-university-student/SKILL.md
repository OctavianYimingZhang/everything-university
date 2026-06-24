---
name: everything-university-student
description: Act-as-student router for the Everything University multi-skill system. Use when Codex needs to collect, reconcile, or refresh a student's university context from LMS portals, lecture materials, recordings, transcripts, announcements, timetable sources, course calendars, tutor or TA feedback, and related student-owned information before later academic execution.
---

# Everything University Student

## Core Job

Act as the student's information collector before any downstream academic work. Build a durable, source-grounded university context from official course systems, then keep it current through focused memories.

The output of this branch is not one large memory file. It is a coordinated memory system split by downstream use:

- Material memory: lecture materials, lecture recordings, transcripts, readings, assignments, and provenance.
- Timetable memory: timetable, each unit, course calendars, sessions, deadlines, and schedule changes.
- Announcement memory: LMS announcements, messages, action items, policy changes, and deadline changes.
- Feedback memory: tutor, TA, marker, supervisor, and peer feedback.
- Collection-run memory: what was checked, what changed, what failed, and what user action is required.

Use `../../scripts/university_memory.py` to initialize, append to, validate, or summarize these stores.

## First-Run Intake

Collect only the inputs needed to start reliable collection:

- institution and LMS type, if known;
- LMS base URL or portal URL;
- current courses/modules and course codes, if known;
- memory root, defaulting to `.everything-university/memory`;
- allowed collection mode: API token, authenticated browser session, local downloaded files, calendar export, or user-supplied material;
- whether recurring automation should be configured now.

Keep credentials outside memory. If a login is required, have the user authenticate in the browser or provide an approved token through the appropriate secure tool. Record only source metadata and access mode.

Initialize memory with:

```bash
python3 ../../scripts/university_memory.py --root .everything-university/memory init
```

## Routing

Route by the information type that must be updated:

| Need | Focused Skill |
|---|---|
| Lecture slides, files, module pages, readings, recordings, transcripts, assignment briefs | `university-material-memory` |
| Timetable, lecture/seminar/lab sessions, unit map, course calendar, deadlines | `university-timetable-memory` |
| Announcements, LMS messages, course updates, action items, policy changes | `university-announcement-memory` |
| Tutor/TA/marker/supervisor feedback, rubric comments, office-hour notes | `university-feedback-memory` |
| Daily, every-3-day, weekly, or custom recurring collection | `university-automation` |

Use subagents when collection can run independently across courses or stores. Pass each subagent only the relevant focused Skill, course, source target, and memory store path.

## Collection Workflow

1. Read `references/source-access.md`.
2. Initialize or validate the memory root.
3. Build or update `student/source_access.json` and `courses/index.json`.
4. Collect deltas from official sources first: LMS APIs, LMS exports, calendar exports, official course pages, and recordings platforms.
5. Fall back to an authenticated browser session when APIs or exports are unavailable.
6. Normalize each item into the matching focused memory store.
7. Cross-link stores through stable `course_code`, `source.url`, `source.platform`, `source_id`, `observed_at`, and related material ids.
8. Append a collection-run record that states checked sources, new items, changed items, blocked sources, and minimum user action required.
9. Validate the memory store before ending.

## Source Priority

Prefer the most official and least manual source that the user can lawfully access:

1. LMS API or official export.
2. LMS browser session after user login.
3. Course calendar export, university timetable export, recording-platform transcript export.
4. Local files the user has already downloaded.
5. User-pasted text only when the source cannot be accessed otherwise.

For Canvas, read the material Skill reference before using API paths. For Blackboard, verify the institution's current REST/API/export capability first; many deployments restrict API access by local configuration.

## Automation Boundary

Skill activation is not permission to silently create, update, or replace Codex automations. Use `university-automation` only when the user asks to configure or reconfigure recurring collection, or when the first-run intake reaches an explicit automation decision.

When automation tools are available, create or update automations through the Codex automation tool. When tools are unavailable, produce an automation spec for later use and continue with manual collection.
