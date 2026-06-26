# Everything University

Everything University is a copyable Codex Skill repository with a hosted control-center website and a local bridge.

## What Is Included

- `skills/`: the Everything University multi-skill memory system.
- `scripts/university_memory.py`: initializes and maintains blank, separated local memory stores.
- `apps/web`: React/Vite GitHub Pages control center.
- `apps/bridge`: local FastAPI bridge for memory, CourseWork Killer, Everything Exam Prep, and Codex handoff.

## Memory Is Blank By Default

The repository does not include `.everything-university/memory`. That folder is ignored by Git and is created locally only after initialization.

Default local memory root:

```bash
.everything-university/memory
```

Initialize it:

```bash
python3 scripts/university_memory.py --root .everything-university/memory init
```

The memory system is separated by downstream purpose:

- lecture slides/materials
- transcripts/recordings
- readings
- assignment briefs
- slide-transcript gap notes
- timetable and deadline signals
- announcements and action items
- tutor/marker feedback
- user writing samples
- notes preferences
- collection run logs

## Run Locally

```bash
npm ci
npm run bridge:dev
npm run web:dev
```

Hosted site:

```text
https://octavianyimingzhang.github.io/everything-university/?codex_bridge=http://127.0.0.1:8787
```

The hosted website is static. Local memory and Skill execution require the bridge at `127.0.0.1:8787`.

## Validate

```bash
npm run test
```
