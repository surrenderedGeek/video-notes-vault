import { videoFileName } from './fileName.js'
import { shortHash } from './hash.js'
import type { VideoMeta } from './types.js'

/**
 * Where notes go in the notes folder. Each video has a folder of its own, named after it,
 * holding its note and its screenshots; a course has one folder for its own note and all its
 * lessons', which are named without the course's name, and one attachments folder for all
 * their screenshots:
 *
 *   Video Notes/
 *     Me at the zoo/
 *       Me at the zoo.md
 *       attachments/jNQXAC9IVRw-12-a1b2c3.jpg
 *     Arabic Grammar in 40 Lessons/
 *       Arabic Grammar in 40 Lessons.md
 *       L1- Gender - The Noun.md
 *       attachments/GK-3EWM8-X0-14-eavmwi.png
 *
 * A note links to its screenshots as attachments/…, beside wherever the note is. Screenshot
 * names start with their video's id, so a course's videos can share its folder. A note's path,
 * everywhere here, is relative to the notes folder: "Me at the zoo/Me at the zoo.md".
 *
 * Notes used to be kept right in the notes folder, all their screenshots in one attachments
 * folder beside them. Readers should still find notes there.
 */

/** Where notes go when the folder picked is a whole vault, rather than all over its top level. */
export const VAULT_SUBFOLDER = 'Video Notes'
export const ATTACHMENTS = 'attachments'
/** Hidden, so Obsidian leaves it alone: where the notes of deleted videos go, to be restored from. */
export const RECENTLY_DELETED = '.Recently Deleted'

/**
 * Where a video's note belongs: in its course's folder, `course`, when it's a lesson, named
 * `lesson` there; else in a folder of its own. Both named after the video.
 */
export interface NotePlace {
  course?: string
  lesson?: string
}

/**
 * The paths a video's note can take, in the order to try them: a folder of its own named after
 * it, or its title in its course's folder; then the same with its id too, for when the first is
 * taken by another video's.
 */
export function notePaths(meta: Pick<VideoMeta, 'videoId' | 'title'>, place: NotePlace = {}): [string, string] {
  const id = idInPath(meta.videoId)
  const base = videoFileName(place.lesson ?? meta.title, id)
  if (place.course === undefined) return [`${base}/${base}.md`, `${base} (${id})/${base} (${id}).md`]
  const at = place.course ? `${place.course}/` : ''
  return [`${at}${base}.md`, `${at}${base} (${id}).md`]
}

/**
 * An id as a file name takes it: a LinkedIn Learning id's slash, and a Skool id's colons, which
 * Finder and Windows won't have in a name, become `-`.
 */
function idInPath(id: string): string {
  return id.replace(/[/\\:]/g, '-')
}

/** A course's name as its folder's, and its note's. */
export function courseFolderName(title: string, listId: string): string {
  // Obsidian reads "%%" as the start of a comment, which would break the links to the note.
  return videoFileName(title, listId).replace(/%{2,}/g, '%')
}

/**
 * The paths a course's note can take, in the order to try them: a folder named after the
 * course, holding a note of the same name; then the same with its playlist id too.
 */
export function courseNotePaths(title: string, listId: string): [string, string] {
  const id = idInPath(listId)
  const base = courseFolderName(title, id)
  return [`${base}/${base}.md`, `${base} (${id})/${base} (${id}).md`]
}

/** Only screenshots named this way, in the attachments folder, are read or written: nothing a path could lead elsewhere. */
export function isScreenshotPath(path: string): boolean {
  return /^attachments\/[^/\\]+$/.test(path) && !path.includes('..')
}

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

/** Where a screenshot goes, relative to its note: named after its video, moment and picture (a data URL). */
export function screenshotPath(videoId: string, seconds: number, dataUrl: string): string {
  const type = dataUrl.slice('data:'.length, dataUrl.search(/[;,]/))
  return `attachments/${videoId.replace(/[^\w-]/g, '-')}-${Math.floor(seconds)}-${shortHash(dataUrl)}.${EXTENSIONS[type] ?? 'png'}`
}
