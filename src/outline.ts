import type { Chapter, Note } from './types.js'

/**
 * The index of the chapter a moment falls in: the last to start at or before it, or -1
 * before the first. A heading comes before the notes at its own moment.
 */
export function chapterIndexAt(chapters: Chapter[] | undefined, seconds: number): number {
  let found = -1
  chapters?.forEach((chapter, index) => {
    if (chapter.startSeconds <= seconds) found = index
  })
  return found
}

/** One line of a video's notes as they're shown and written: a chapter's heading, or a note. */
export type OutlineRow =
  | { kind: 'chapter'; chapter: Chapter; seconds: number }
  /** `index` is the note's place in the document's notes. */
  | { kind: 'note'; note: Note; index: number; seconds: number }

/**
 * A video's notes laid out under its chapters: the notes before the first chapter, then each
 * chapter's heading with the notes whose moment falls in it, in the order the notes are in.
 */
export function outline(notes: Note[], chapters: Chapter[] = []): OutlineRow[] {
  const ordered = [...chapters].sort((a, b) => a.startSeconds - b.startSeconds)
  const homes = notes.map((note) => chapterIndexAt(ordered, note.timestampSeconds))
  const notesIn = (home: number): OutlineRow[] =>
    notes.flatMap((note, index) =>
      homes[index] === home ? [{ kind: 'note' as const, note, index, seconds: note.timestampSeconds }] : [],
    )
  return [
    ...notesIn(-1),
    ...ordered.flatMap((chapter, home) => [
      { kind: 'chapter' as const, chapter, seconds: chapter.startSeconds },
      ...notesIn(home),
    ]),
  ]
}
