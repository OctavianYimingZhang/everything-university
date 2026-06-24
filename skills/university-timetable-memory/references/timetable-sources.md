# Timetable Sources

Use this reference to build timetable and unit memory.

## Source Priority

1. University timetable system or official timetable export.
2. LMS calendar events.
3. Course handbook or syllabus schedule.
4. Module/week pages in the LMS.
5. Calendar export from Outlook, Google Calendar, or `.ics`.
6. Announcements that change times, rooms, deadlines, or session format.

## Event Types

Use stable event types:

- `lecture`
- `seminar`
- `tutorial`
- `lab`
- `practical`
- `workshop`
- `office_hour`
- `assessment`
- `deadline`
- `exam`
- `other`

## Unit Map

Build the unit map from lecture lists, module pages, file names, course schedule pages, syllabus weeks, or recurring timetable titles.

A unit can be a lecture, week, practical block, topic, or teaching sequence. Link it to material ids instead of copying all material text into timetable memory.

## Conflict Handling

When sources disagree, preserve both records and mark the current status only when an official latest source is clear. If it is not clear, create a collection-run note asking the user to verify the conflict.
