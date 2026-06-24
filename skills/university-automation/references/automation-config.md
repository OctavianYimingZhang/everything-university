# Automation Configuration

Use this reference when creating or updating recurring collection.

## Permission Boundary

Skill activation is not an automation permission. Create or update an automation only after the user asks for recurring collection, accepts first-use automation setup, or asks to reconfigure an existing Everything University schedule.

## Cadence Choices

Use these default profiles:

- `daily`: announcements, urgent action items, timetable changes, deadline changes, and newly posted material.
- `three-day`: lecture materials, recordings, transcripts, readings, assignments, announcements, and timetable updates.
- `weekly`: full reconciliation, stale-source checks, feedback consolidation, and memory validation.

Use `../../scripts/build_automation_prompt.py` to build automation payload fields.

## Existing Automation Handling

Inspect existing automations before creating a new one. Prefer updating a matching Everything University automation by name or prompt.

## Prompt Requirements

Automation prompts should include:

- memory root;
- course scope;
- source priority;
- allowed access modes;
- stores to update;
- blocked-source behavior;
- validation expectation.

Keep authentication instructions practical: ask the run to report expired sessions or 2FA needs instead of storing credentials.
