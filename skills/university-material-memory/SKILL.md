---
name: university-material-memory
description: Collect and maintain university material memory for lecture slides, lecture notes, module pages, files, readings, assignments, recordings, captions, transcripts, and source provenance from Canvas, Blackboard, other LMS portals, recording platforms, or local downloaded course files.
---

# University Material Memory

## Core Job

Maintain the course material memory that later academic Skills can use without re-opening the LMS. Treat materials as evidence with provenance, not as generic notes.

Read `references/lms-collection.md` before collecting from Canvas, Blackboard, Moodle, Brightspace, Panopto, Echo360, Kaltura, Zoom, Teams, or local downloads.

## Stores

Use these stores under the memory root:

- `courses/<course_code>/materials/source_index.jsonl`
- `courses/<course_code>/materials/lecture_materials.jsonl`
- `courses/<course_code>/materials/recordings_transcripts.jsonl`
- `courses/<course_code>/materials/readings.jsonl`
- `courses/<course_code>/materials/assignments.jsonl`

Append with:

```bash
python3 ../../scripts/university_memory.py --root .everything-university/memory append --store lecture_materials --course COURSE --record-json '{"source":{"platform":"canvas"},"title":"Lecture 1"}'
```

## Collection Steps

1. Identify course id, LMS course id, academic term, and course code.
2. Collect module structure before files so every file can be linked to a unit or week.
3. Collect lecture slides, PDFs, module pages, readings, assignment briefs, rubrics, and embedded links.
4. Collect lecture recording metadata and transcript/caption files when available.
5. Extract text from accessible PDFs, DOCX, PPTX, HTML pages, VTT, SRT, and TXT transcripts when downstream work needs searchable content.
6. Dedupe by platform id, canonical URL, file checksum, title plus updated timestamp, or transcript recording id.
7. Preserve source provenance: platform, URL, source id, observed timestamp, course code, author if visible, updated time if visible, and local file path if downloaded.
8. Record blocked sources in `collection_runs/runs.jsonl` instead of asking the user to paste everything manually.

## Record Shape

Use compact JSON objects. Prefer these fields:

- `id`
- `course_code`
- `observed_at`
- `source`: object with `platform`, `url`, `source_id`, `access_mode`
- `title`
- `material_type`: `slide_deck`, `lecture_note`, `module_page`, `reading`, `assignment_brief`, `rubric`, `recording`, `transcript`, or `other`
- `unit_id` or `week`
- `published_at` and `updated_at` when available
- `local_path` when a file is downloaded
- `text_extract_path` when extracted text is stored separately
- `related_ids` for links to recordings, transcripts, timetable units, or assignments

## Practical Source Strategy

Use official APIs or exports first. Use browser automation after the user authenticates when APIs are unavailable. Use user uploads only for sources that cannot be lawfully reached through the user's own session.

For recordings, prefer transcript/caption exports over audio transcription. If captions are unavailable but the user has lawful access to the recording and asks for transcription, treat that as a separate media-processing task.
