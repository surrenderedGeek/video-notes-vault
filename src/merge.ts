import { STATUSES } from './status.js'
import type { Note, SyncedNote, VideoStatus } from './types.js'

/**
 * Merging a video's notes with another copy of them, as every Video Notes app does it:
 * Notion's page, or the video's note in the notes folder. Both sides
 * are compared with what they last agreed on, so a difference belongs to the side that
 * made it, and each side's changes, deletions included, carry to the other.
 */

type NoteContent = Pick<SyncedNote, 'kind' | 'time' | 'end' | 'text'>

/** Whether two notes say the same thing. Where each lives, and a screenshot's image, don't count. */
export function sameContent(a: NoteContent, b: NoteContent): boolean {
  const transcript = a.kind === 'transcript'
  return (
    transcript === (b.kind === 'transcript') &&
    a.time === b.time &&
    (!transcript || (a.end ?? a.time) === (b.end ?? b.time)) &&
    a.text.trim() === b.text.trim()
  )
}

export function syncedNote(note: Note): SyncedNote {
  return {
    id: note.id ?? '',
    kind: note.kind,
    time: note.timestampSeconds,
    ...(note.kind === 'transcript' ? { end: note.endSeconds ?? note.timestampSeconds } : {}),
    text: note.text,
  }
}

/** A note from the other side as this side keeps it, holding on to the screenshot it already has. */
export function localNote(synced: SyncedNote, before?: Note): Note {
  const screenshot = synced.kind !== 'transcript' && (synced.kind === 'screenshot' || before?.kind === 'screenshot')
  const image = before?.image ?? synced.imageUrl
  return {
    id: synced.id,
    kind: screenshot ? 'screenshot' : synced.kind,
    timestampSeconds: synced.time,
    text: synced.text,
    ...(synced.kind === 'transcript' ? { endSeconds: synced.end ?? synced.time } : {}),
    ...(screenshot && image ? { image } : {}),
    ...(before?.after ? { after: before.after } : {}),
  }
}

export interface MergedNote {
  /** What both sides should end up with. */
  note: SyncedNote
  /** Whose words these are: this side's, or the other side's (Notion, or the notes folder). */
  from: 'here' | 'there'
  /** The other side's copy, when the note keeps its place there: its bullet in Notion, say. */
  there?: SyncedNote
}

export interface MergeResult {
  merged: MergedNote[]
  /** Notes the other side no longer has and this side hadn't changed since: they go here too. */
  removedHere: string[]
  /** Notes removed here that the other side hadn't changed since: they go there too. */
  removedThere: SyncedNote[]
  /** Notes changed on both sides. Both versions are kept rather than either's words dropped. */
  conflicts: number
}

export function mergeNotes(
  base: SyncedNote[] | undefined,
  mine: SyncedNote[],
  theirs: SyncedNote[],
  { newId, keepEverything = false }: { newId: () => string; keepEverything?: boolean },
): MergeResult {
  const before = new Map((base ?? []).map((note) => [note.id, note]))
  const here = new Map(mine.map((note) => [note.id, note]))
  const there = new Map(theirs.map((note) => [note.id, note]))

  const merged: MergedNote[] = []
  const removedHere: string[] = []
  const removedThere: SyncedNote[] = []
  let conflicts = 0

  for (const id of new Set([...here.keys(), ...there.keys(), ...before.keys()])) {
    const b = before.get(id)
    const m = here.get(id)
    const t = there.get(id)

    if (m && t) {
      if (sameContent(m, t) || !b || sameContent(t, b)) {
        // Unchanged, changed only here, or first met as the same words: this side's version, in the other's place for it.
        merged.push({ note: { ...m, blocks: t.blocks }, from: 'here', there: t })
      } else if (sameContent(m, b)) {
        // Changed only there.
        merged.push({ note: t, from: 'there', there: t })
      } else {
        // Changed on both sides: this side's goes there as a new note, and the other side's comes here beside it.
        merged.push({ note: m, from: 'here' })
        merged.push({ note: { ...t, id: newId() }, from: 'there', there: t })
        conflicts++
      }
    } else if (m) {
      if (!b || keepEverything || !sameContent(m, b)) merged.push({ note: m, from: 'here' })
      else removedHere.push(id)
    } else if (t) {
      if (!b || keepEverything || !sameContent(t, b)) merged.push({ note: t, from: 'there', there: t })
      else removedThere.push(t)
    }
  }

  merged.sort((a, b) => a.note.time - b.note.time)
  return { merged, removedHere, removedThere, conflicts }
}

/**
 * Whether a sync would take away so much that it should ask first: most of a video's notes
 * going at once looks less like tidying up than like something gone wrong.
 */
export function tooManyRemovals(result: MergeResult, base: SyncedNote[] | undefined): boolean {
  const total = base?.length ?? 0
  const tooMany = (count: number) => count >= 3 && count * 2 > total
  return tooMany(result.removedHere.length) || tooMany(result.removedThere.length)
}

/**
 * The status both sides should have, merged like a note's words: a change on one side since
 * they last agreed wins. With no agreement to go by, or a change on both, the status further
 * along does, since watching only moves forward: a page's default "Not started" never undoes a
 * video finished here. A page that shows no status leaves this side's as it is.
 */
export function mergeStatus(base: VideoStatus | undefined, mine: VideoStatus, theirs: VideoStatus | undefined): VideoStatus {
  if (theirs === undefined || theirs === mine) return mine
  if (base !== undefined && mine === base) return theirs
  if (base !== undefined && theirs === base) return mine
  return STATUSES.indexOf(theirs) > STATUSES.indexOf(mine) ? theirs : mine
}

/**
 * Tags merge as a set, so they can't conflict: a tag added on either side is added, and a tag
 * removed on either side is removed. The first meeting keeps every tag from both.
 */
export function mergeTags(base: string[] | undefined, mine: string[], theirs: string[] | undefined): string[] {
  if (!theirs) return mine
  const all = [...new Set([...mine, ...theirs])]
  if (!base) return all
  const [before, here, there] = [new Set(base), new Set(mine), new Set(theirs)]
  return all.filter((tag) => (before.has(tag) ? here.has(tag) && there.has(tag) : here.has(tag) || there.has(tag)))
}

/** One value changed on one side takes that change; with no agreement to go by, or a change on both, this side's stays. */
export function mergeValue<T>(base: T | undefined, mine: T, theirs: T | undefined): T {
  if (theirs === undefined || theirs === mine) return mine
  return base !== undefined && mine === base ? theirs : mine
}
