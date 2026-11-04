import type { VideoNotes } from './types.js'

/**
 * A note's id stays the same when its words change, so sync can tell an edited note from
 * one deleted and another added. The Markdown carries it as an Obsidian block ID
 * ("^k3f9qa"), which Obsidian hides when reading and uses to link to that exact note.
 */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const LENGTH = 6

/** Letters and digits with at least one letter, so it never reads as a number. */
export function newNoteId(taken: ReadonlySet<string>, random: () => number = Math.random): string {
  for (;;) {
    let id = ''
    for (let i = 0; i < LENGTH; i++) id += ALPHABET[Math.floor(random() * ALPHABET.length)]
    if (/[a-z]/.test(id) && !taken.has(id)) return id
  }
}

/**
 * The document with an id on every note. A note that has one keeps it; a second note with
 * the same id — a line duplicated in Obsidian, say — is a new note and gets its own.
 */
export function withNoteIds(doc: VideoNotes, random?: () => number): VideoNotes {
  const taken = new Set(doc.notes.flatMap((note) => (note.id ? [note.id] : [])))
  const seen = new Set<string>()
  let changed = false

  const notes = doc.notes.map((note) => {
    if (note.id && !seen.has(note.id)) {
      seen.add(note.id)
      return note
    }
    const id = newNoteId(taken, random)
    taken.add(id)
    seen.add(id)
    changed = true
    return { ...note, id }
  })
  return changed ? { ...doc, notes } : doc
}
