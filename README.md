# video-notes-vault

The Markdown format that [Video Notes](#where-its-used) keeps timestamped video notes in, in a plain folder or an Obsidian vault, and the three-way merge that syncs them.

Each video gets one note: front matter Obsidian can show and query, a Summary and a Notes section that are yours, and a Timestamps section holding every note, each linked to its moment in the video. Course playlists get a note of their own, with a live table of their lessons. The format is meant to be read and edited by people in Obsidian, and synced by apps without losing what people wrote.

Everything here is pure TypeScript with no dependencies. It doesn't touch the file system, so you read and write the files yourself.

- **The format** is described in [docs/format.md](docs/format.md).
- **The code** is in `src/`, one module per part of the format, each with its tests.

## Install

It isn't on npm yet. Install it from GitHub, pinned to a release:

```bash
npm install git+https://github.com/surrenderedGeek/video-notes-vault.git#v0.1.0
```

npm builds it on install. It's an ES module and ships its own types.

## Use

Read a note, add a note to it, and write it back:

```ts
import { readVaultNote, renderVaultNote, withNoteIds } from 'video-notes-vault'

const read = readVaultNote(text)
if (read.kind === 'note') {
  const { note } = read
  const notes = [...note.doc.notes, { kind: 'text' as const, timestampSeconds: 42, text: 'The elephants' }]
  notes.sort((a, b) => a.timestampSeconds - b.timestampSeconds)
  const doc = withNoteIds({ ...note.doc, notes })
  text = renderVaultNote({ ...note, doc })
}
```

`readVaultNote` returns one of three things:

- `note`: a video's note.
- `problem`: a video's note that can't be read back safely, because its Timestamps heading is gone.
- `other`: not a video's note at all.

Everything you didn't change comes back as it was written: the Summary and Notes sections, prose between notes, and front matter fields that aren't the format's.

Merge two copies of a video's notes against what they last agreed on:

```ts
import { mergeNotes, newNoteId, syncedNote } from 'video-notes-vault'

const taken = new Set([...mine, ...theirs].map((note) => note.id ?? ''))
const result = mergeNotes(agreed, mine.map(syncedNote), theirs.map(syncedNote), {
  newId: () => newNoteId(taken),
})
// result.merged: what both sides should now have
// result.removedHere / result.removedThere: notes deleted on one side, to delete on the other
// result.conflicts: notes changed on both sides (both versions are kept)
```

## What's in it

| Module | What it does |
|---|---|
| `format.ts` | A video's note: `readVaultNote`, `renderVaultNote`, `vaultNoteFor` |
| `courseNote.ts` | A course's note: `renderCourseNote`, `readCourseNote`, `readCourseList`, `courseIdIn` |
| `markdown.ts` | Front matter and note lines, and the plain layout without sections (`serialise`, `parse`) |
| `merge.ts` | The three-way merge: `mergeNotes`, `mergeStatus`, `mergeTags`, `mergeValue`, `tooManyRemovals` |
| `layout.ts` | Where notes and screenshots go: `notePaths`, `courseNotePaths`, `screenshotPath` |
| `fileName.ts` | Safe file names: `videoFileName`, and `lessonTitle` for a lesson in its course's folder |
| `noteIds.ts` | Block ids (`^k3f9qa`) that keep a note the same note through edits |
| `sources.ts`, `youtube.ts` | Links to videos and moments on YouTube, LinkedIn Learning and Skool |
| `status.ts`, `tags.ts`, `resume.ts` | A video's status, its tags, and where it was left |

Everything is exported from the package's root.

## Where it's used

Video Notes is a Chrome extension and an iPhone app for taking notes on videos while you watch: moments, typed notes, screenshots and transcript clips. Both sync with Notion and with a folder of Markdown notes. This library is the part they share for the folder, so a note written by one reads the same in the other.

## Develop

```bash
npm install
npm test
npm run typecheck
npm run build
```

Changes to what a note looks like on disk affect everyone's existing notes, so they need care:

- Keep old notes readable.
- Keep fields you don't manage exactly as written.
- Add a test for each rule.

Issues and pull requests are welcome.

## License

[MIT](LICENSE)
