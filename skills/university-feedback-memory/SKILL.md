---
name: university-feedback-memory
description: Collect and maintain tutor, TA, supervisor, marker, rubric, office-hour, peer-review, and assessment feedback memory so later academic execution can reuse course-specific expectations, corrections, marking preferences, and recurring weaknesses.
---

# University Feedback Memory

## Core Job

Maintain feedback memory that later writing, exam, lab, and application Skills can use to match the student's real marking environment.

Read `references/feedback-sources.md` before collecting feedback from LMS submissions, gradebook comments, rubrics, Turnitin-style reports, office-hour notes, email-equivalent sources, or user-provided feedback files.

## Store

Use this store under the memory root:

- `courses/<course_code>/feedback/tutor_ta_feedback.jsonl`

## Collection Steps

1. Collect assessment-level feedback, rubric comments, inline comments, score bands, marker notes, and general class feedback.
2. Capture feedback source, assessment title, date, marker role, and relevant rubric criteria.
3. Normalize feedback into reusable learning constraints: writing style, evidence standards, citation expectations, method preferences, calculation issues, data presentation, structure, and recurring weaknesses.
4. Preserve subjective comments as feedback, not verified facts.
5. Cross-link feedback to assignments, materials, action items, and future task types when possible.
6. Record inaccessible feedback sources in collection-run memory.

## Record Shape

Feedback records should include:

- `id`
- `course_code`
- `observed_at`
- `source`
- `assessment_title`
- `feedback_text`
- `feedback_type`: `rubric`, `inline_comment`, `general_comment`, `office_hour`, `email`, `peer_review`, or `supervisor_note`
- `marker_role`: `tutor`, `ta`, `lecturer`, `marker`, `supervisor`, `peer`, or `unknown`
- `actionable_takeaways`
- `related_assignment_id`
- `confidence`: `direct_source`, `student_note`, or `inferred`

## Use in Later Work

When downstream Skills ask for style, marking expectation, or course-specific preferences, pass only the relevant feedback records. Keep raw feedback separate from the final output unless the user asks to quote it.
