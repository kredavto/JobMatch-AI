# Manual ICS composer: time and language

The component defaults to Russian and accepts the existing WorkspacePage locale prop. Global language selection remains separate work.

The time zone is visible and editable as a named IANA zone, initially the device zone. The user supplies a local minute from 2000 to 2099. Existing reminder-time resolution enumerates all matching instants. A repeated local time requires an explicit UTC-offset choice; no first occurrence is selected automatically. Clock gaps, invalid dates and unavailable zones disable export. A changed time or zone clears the earlier offset choice. The selected UTC instant is previewed before downloading.

Locale changes preserve the application ID, canonical Russian event kind, local time, zone, selected offset, duration, description, alarm setting, semantic feedback and file UID. No effect/refetch/replay is introduced. File event-type text remains Russian and this is disclosed in English. Vacancy titles and descriptions are copied verbatim. Tracker notes and resumes are excluded. Repeated downloads of an unchanged draft keep the same UID; a draft edit resets it.

This creates a private UTC ICS file with the existing escaping, line folding and optional display alarm. It does not create a calendar event, send a message or change tracker/server data. Notifications, duplicate imports and external cancellations depend on the user's calendar. The unsaved composer draft is cleared when its section unmounts. Browser exceptions are redacted to semantic messages; a retry is manual and blob URLs are cleaned up.

The compatibility localStart helper remains available to legacy callers; the composer now uses explicit calendarStart resolution. Synthetic component tests do not establish real calendar delivery, mobile PWA installation, live provider/model quality or final operational acceptance.
