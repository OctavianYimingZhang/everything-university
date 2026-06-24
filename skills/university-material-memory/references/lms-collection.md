# LMS And Recording Collection

Use official APIs and exports before asking the user to upload material manually.

## Canvas

Canvas official developer docs expose resource groups for courses, modules, files, pages, assignments, announcements, and calendar events:

- Canvas developer docs: https://developerdocs.instructure.com/services/canvas
- Modules: https://developerdocs.instructure.com/services/canvas/resources/modules
- Files: https://developerdocs.instructure.com/services/canvas/resources/files
- Pages: https://developerdocs.instructure.com/services/canvas/resources/pages
- Assignments: https://developerdocs.instructure.com/services/canvas/resources/assignments
- Announcements: https://developerdocs.instructure.com/services/canvas/resources/announcements
- Calendar events: https://developerdocs.instructure.com/services/canvas/resources/calendar_events

When a Canvas token or OAuth flow is available, collect in this order:

1. courses and course ids;
2. modules and module items;
3. files and file metadata;
4. pages and page bodies;
5. assignments and rubrics when available;
6. announcements that link to materials or change course instructions;
7. calendar events for deadlines and sessions.

Use pagination. Store Canvas ids and URLs so later runs can detect deltas.

## Blackboard

Blackboard/Anthology Learn deployments vary by institution and version. Verify the current institution's available REST API, export, or browser access before relying on a fixed endpoint set.

Use this priority:

1. institution-enabled REST API or developer application;
2. course content export or file/package export;
3. authenticated browser session through the user's normal access;
4. local downloaded files.

Public Blackboard REST examples are available at https://blackboard.github.io/rest-apis/.

## Other LMS Platforms

For Moodle, Brightspace, Moodle-based custom portals, or custom university systems:

1. look for official course export, backup, file export, or calendar export;
2. use authenticated browser collection when export is unavailable;
3. record platform, visible URL, and observed timestamp for every item.

## Recordings And Transcripts

Recording platforms may include Panopto, Echo360, Kaltura, Zoom, Teams, or institution-hosted media.

Collect transcript/caption files when available:

- `.vtt`
- `.srt`
- `.txt`
- embedded transcript text

Link each transcript to its recording, course, session date, and unit when possible. Prefer official captions to fresh transcription because they preserve the course source.
