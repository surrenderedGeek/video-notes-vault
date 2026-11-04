# The Video Notes vault format

This describes what this library reads and writes. The code in `src/` is the reference. Each rule here has a test there.

A *notes folder* is a folder of Markdown files: a plain folder, or a folder inside an Obsidian vault. It holds one note per video, one note per course, and the videos' screenshots.

## A video's note

```markdown
---
title: "Me at the zoo"
date: 2026-09-13
source: https://www.youtube.com/watch?v=jNQXAC9IVRw
videoId: jNQXAC9IVRw
channel: "jawed"
status: in-progress
tags:
  - animals
  - history/youtube
duration: 19
created: 2026-09-13T10:00:00.000Z
playlist: "[[Firsts/Firsts|Firsts]]"
part: 1
watched: 2026-09-14T08:30:00.000Z
resume: https://www.youtube.com/watch?v=jNQXAC9IVRw&t=15s
rating: 5
---

## Summary

The first video on YouTube.

## Timestamps

### [0:00](https://www.youtube.com/watch?v=jNQXAC9IVRw&t=0s) Intro

- [0:01](https://www.youtube.com/watch?v=jNQXAC9IVRw&t=1s) 🕒 ^k3f9qa

### [0:03](https://www.youtube.com/watch?v=jNQXAC9IVRw&t=3s) Elephants

- [0:04](https://www.youtube.com/watch?v=jNQXAC9IVRw&t=4s) The elephants
  have really long trunks ^p2x8mz
- [0:12](https://www.youtube.com/watch?v=jNQXAC9IVRw&t=12s) 📷 The fence
  ![0:12](attachments/jNQXAC9IVRw-12-1bo559h.jpg) ^a7c1de
- [0:14–0:18](https://www.youtube.com/watch?v=jNQXAC9IVRw&t=14s) 💬 ^q9w2er
  > and that's pretty much all there is to say

## Notes

My own thoughts.
```

### Front matter

These are the fields the format manages. Any other field, like `rating` above, is kept exactly as written, after the managed ones. That way an app that doesn't know a newer field doesn't lose it.

| Field | What it holds |
|---|---|
| `title` | The video's title, in double quotes. Without one, the title is the `videoId`. |
| `date` | The day the video was added, in local time (`2026-09-13`), for Obsidian to show as a date. Written only when `created` is known. A note with `date` but no `created` is read as added at midnight that day. |
| `source` | The video's page. |
| `videoId` | The video's id: YouTube's 11 characters, or `course/lesson` for a LinkedIn Learning lesson. **A note without a `videoId` isn't a video's note**, and is left alone. |
| `channel` | Who made it, in double quotes. |
| `status` | `to-watch`, `in-progress` or `done`. Always written. A note without one is `in-progress` if it has notes, else `to-watch`. Any other value is replaced. |
| `tags` | A YAML list, following Obsidian's tag rules: lower case, no spaces (they become `-`), `/` for nesting, and at least one letter or `_`. An inline list (`[a, b]`) is read too. No `tags` field means no tags. |
| `duration` | The video's length, in whole seconds. |
| `created` | When the video was added, as an ISO time. |
| `playlist` | The course the video is a lesson in: a link to the course's note (`"[[Folder/Course\|Course]]"`) or the course's title. Always written together with `part`. |
| `part` | The lesson's place in the course, from 1. |
| `watched` | When the video was last watched, as an ISO time. |
| `resume` | A link to the moment the video was left at. |

How the fields are read:

- **Quoting.** Values are read double-quoted (with `\"` and `\\` escapes), single-quoted, or plain. They're written double-quoted where they're free text.
- **`playlist` and `part`** count only when `playlist` is a single value on its own line and `part` is a whole number from 1. Anything else, like a list of links, is the user's own and is kept as written.
- **`platform`** isn't written. It's told from `source`, and failing that from the `videoId`: one with a slash is LinkedIn Learning's. A `platform` field that's there is kept as written.
- **Where a video was left** is the newest of every copy's `watched`. A `resume` with no `watched` counts as older than any other.

### Sections

The body has three sections, found by their `##` headings in any case and any order:

- **Summary** and **Notes** are the user's. They're kept exactly as written.
- **Timestamps** holds every note, in time order, and it's the only part an app reads back.

Anything above the first section is kept above it.

Three things don't fit that layout:

- **A note with no sections at all** is in the *plain layout*: front matter, then the notes. It's read the same way, and written back with sections.
- **A note with sections but no Timestamps heading** can't be read back safely, since its notes would all look deleted. It's reported as a problem and left alone.
- **Headings of the user's own** stay inside the section they're in.

### Notes

Each note is a list item that starts with its moment, linked to that moment in the video. The moment is read from the link's `t=` parameter, in seconds, not from the label. The label is `m:ss`, or `h:mm:ss` from an hour.

| Kind | Written as |
|---|---|
| A moment | `- [0:01](link) 🕒` |
| A typed note | `- [0:04](link) The elephants`, then more lines indented by two spaces |
| A screenshot | `- [0:12](link) 📷 caption`, then `  ![0:12](attachments/…)` |
| A transcript clip | `- [0:14–0:18](link) 💬`, then each line quoted: `  > …` |

**Ids.** Each note ends with an Obsidian block id, ` ^k3f9qa`, on its last line. A transcript's id goes on its first line. The id keeps a note the same note when its words change, so a sync can tell an edit from a deletion and a new note.

- New ids are six lower-case letters and digits, with at least one letter.
- Any id of three or more letters, digits or hyphens is read.
- A note without an id, or with an id already used by another note in the same video (a line duplicated in Obsidian, say), gets a new one.

**Chapters** are headings inside Timestamps: `### [0:03](link) Elephants`. `##` is read too. A note goes under the chapter its moment falls in. Prose under a chapter's heading is kept there.

**Prose between notes**, a line that isn't indented under a note, is kept after the note before it. Prose before the first note is kept at the top of the section.

**Links to a moment:**

- YouTube: `https://www.youtube.com/watch?v=<id>&t=<seconds>s`
- Elsewhere: the video's page with `?t=<seconds>` (or `&t=` when it already has a query).

## A course's note

A course is a YouTube playlist, or a LinkedIn Learning course. It has a note of its own beside its lessons' notes:

````markdown
---
title: "Firsts"
playlistId: PLZ6keVEpgaQsvR9l8aFJp80LA2MJ9zj8E
source: https://www.youtube.com/playlist?list=PLZ6keVEpgaQsvR9l8aFJp80LA2MJ9zj8E
channel: "Someone"
videos: 2
---

## Progress

```base
(an Obsidian Base: a table of the notes whose playlist is this note, by part)
```

## Videos

1. [[Firsts/Me at the zoo|Me at the zoo]]
2. [Never \*Gonna\* Give You Up](https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLZ6keVEpgaQsvR9l8aFJp80LA2MJ9zj8E)

## Notes
````

**Front matter.** `title`, `playlistId`, `source`, `channel` and `videos` (how many there are) are managed, and any other field is kept. It has no `videoId`, so nothing takes it for a video's note. It's found by its `playlistId` whatever it's renamed to.

**Progress** is an [Obsidian Base](https://help.obsidian.md/bases), written once when the note is made. After that it's the user's, since Obsidian rewrites it as the view is changed.

**Videos** is kept up to date:

- **One line per video, in order.** A video with a note is linked to its note. One without is linked to the video, with Markdown in its title escaped.
- **Words added after a line's link stay.** Lines that aren't a video's stay too, after the list.
- **A cut-off playlist is flagged.** When it's known that YouTube stopped before the end of the playlist, a line in italics says so.
- **Lines are matched by their link.** Failing that, by their number, so a line whose note was renamed outside Obsidian still keeps its words.
- **A removed heading comes back.** If the Videos heading is taken out, the list is added back at the end.

**Notes** is the user's.

**Links.** A lesson's `playlist` links to the course's note by its path in the notes folder, showing its name: `"[[Firsts/Firsts|Firsts]]"`. When the notes folder is inside a vault, the path starts with the notes folder's own: `"[[Video Notes/Firsts/Firsts|Firsts]]"`. An older link by name alone (`"[[Firsts]]"`) is still read, and links are matched by the name at their end.

## Where notes go

```
<notes folder>/
  Me at the zoo/
    Me at the zoo.md
    attachments/jNQXAC9IVRw-12-1bo559h.jpg
  Arabic Grammar in 40 Lessons/
    Arabic Grammar in 40 Lessons.md        the course's note
    L1- Gender - The Noun.md               a lesson, named without the course
    attachments/GK-3EWM8-X0-14-eavmwi.png
  .Recently Deleted/
    Some deleted video.md
```

**Placement:**

- **A video on its own** gets a folder of its own: `Title/Title.md`. If that's taken, `Title (id)/Title (id).md`. A LinkedIn Learning id's slash becomes `-`.
- **A course** gets a folder holding its note, `Course/Course.md`. If that's taken, `Course (playlistId)/Course (playlistId).md`.
- **A lesson** goes in its course's folder, named after its title without the course's name (`lessonTitle`). If that's taken, ` (id)` is added.
- **A note the user moved elsewhere** stays where they put it.
- **The older layout**, every note at the top of the notes folder with one `attachments/` folder, is still read.
- **A whole Obsidian vault**, when it's picked as the notes folder, keeps its notes in a `Video Notes/` folder, unless it already keeps video notes outside one.
- **`.Recently Deleted/`** holds the notes of deleted videos, by file name, to be restored from. It's hidden, so Obsidian leaves it alone.

**File names** (`videoFileName`):

- `/ \ : * ? " < > | # ^ [ ]` become `-`.
- Control characters go.
- Runs of whitespace become one space.
- Dots, spaces and hyphens at either end go.
- Names are cut at 120 characters.
- An empty name falls back to the id.
- In a course's name, `%%` becomes `%`, since Obsidian starts a comment there.

**Lesson names** (`lessonTitle`):

- The course's name, and whatever follows it, is dropped when it's set apart by `|`, `:`, `·`, `•`, `-`, `–` or `—`. So "L1: Gender | The Noun | Arabic Grammar in 40 Lessons | Dr Shadee Elmasry" in that course is "L1: Gender | The Noun".
- A title that starts with the course's name loses just the name.
- A title that's only the course's name stays.

**Screenshots** go in the `attachments/` folder beside their note. A note links to them as `attachments/<name>`, relative to itself. A screenshot is named after its video, its moment and its picture, so a course's lessons can share one folder:

```
attachments/<videoId>-<whole seconds>-<shortHash of the picture's data URL>.<jpg|png|webp|gif>
```

In the `videoId`, anything but letters, digits, `_` and `-` becomes `-`.

A screenshot link that isn't `attachments/<name>` is never read or written.

## Syncing

Two copies of a video, such as the note in the folder and an app's own copy, are merged against what they *last agreed on*. A difference from that agreement belongs to the side that made it. With no agreement yet, as on the first sync, nothing is taken as deleted.

**Notes**, matched by id (`mergeNotes`). Each side is compared with what both last agreed on, and the same goes the other way round:

| Here | There | Result |
|---|---|---|
| unchanged | changed | there's version |
| changed | unchanged | here's version |
| changed | changed | both, there's under a new id (a conflict) |
| unchanged | gone | removed here too |
| changed | gone | kept |
| new | — | kept |

- **What counts as a change:** two notes are the same when they're both transcripts or both not, at the same moment, with the same end for a transcript, and with the same words, give or take spaces at either end. A screenshot's picture doesn't count.
- **No agreement yet:** when the two versions of a note differ, here's wins.
- **Too many removals:** a sync that would remove at least three notes, and more than half of them, should ask first (`tooManyRemovals`).

**Other values:**

- **Status** (`mergeStatus`): a change on one side wins. With no agreement, or a change on both, the status further along wins, since watching only moves forward.
- **Tags** (`mergeTags`) merge as a set: a tag added on either side is added, and a tag removed on either side is removed. The first sync keeps every tag from both.
- **Other values** (`mergeValue`): a change on one side wins. Otherwise, this side's stays.
- **Where a video was left** (`newerPosition`): the newest wins.

**A note missing from the folder** is never taken as the video being deleted. Only an explicit delete counts.

## Compatibility

Every app writing this format should write it byte for byte the same, so the same note never flips between two versions.

- **Keep unknown fields as written.** A new managed field is safe, because apps that don't know it yet keep it as written.
- **Keep old notes readable.** Notes written by older versions, like the plain layout and the flat folder, must stay readable.
