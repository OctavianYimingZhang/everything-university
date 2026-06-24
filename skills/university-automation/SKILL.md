---
name: university-automation
description: Configure, review, or update recurring Everything University collection automations for daily, every-3-day, weekly, or custom refresh of student LMS, timetable, announcement, material, transcript, and feedback memories using Codex automation tools when available.
---

# University Automation

## Core Job

Configure recurring collection for Everything University after the user chooses a cadence and scope.

Activation alone is not authorization to mutate automations. Create or update automations only when the user asks to configure recurring collection, confirms first-use automation setup, or asks to reconfigure an existing schedule.

Read `references/automation-config.md` before using automation tools.

## First-Use Configuration

Ask for the minimum plan-changing inputs:

- cadence: daily, every 3 days, weekly, or custom;
- scope: all current courses or selected courses;
- sources: materials, timetable, announcements, feedback, or full reconciliation;
- memory root, defaulting to `.everything-university/memory`;
- login expectation: API/export only, authenticated browser if needed, or local files only.

## Cadence Profiles

- Daily: announcements, urgent timetable changes, deadline changes, new action items, and newly posted material.
- Every 3 days: lecture materials, recordings, transcripts, readings, assignments, announcements, and timetable changes.
- Weekly: full reconciliation across courses, feedback consolidation, stale-source checks, and memory validation.

## Tool Use

When the Codex automation tool is available:

1. Inspect existing automations before creating a duplicate.
2. Prefer updating the matching Everything University automation.
3. Use cron automations for detached recurring collection.
4. Keep the prompt self-contained: memory root, scope, source priority, blocked-source behavior, and validation expectation.
5. Use `../../scripts/build_automation_prompt.py` to generate the payload fields, then pass them to the automation tool. Avoid showing raw schedule strings to the user.

When the automation tool is unavailable, write a concise automation spec for the user and continue with manual collection.

## Blocked Runs

If an automated run reaches login, 2FA, expired session, missing API token, or blocked recording access, it should write a collection-run record with:

- blocked source;
- error or visible portal state;
- smallest user action needed;
- whether retry is useful after authentication;
- stores that were still updated successfully.
