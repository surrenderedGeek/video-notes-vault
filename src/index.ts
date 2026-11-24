/**
 * The Markdown format Video Notes keeps its notes in, in a folder or an Obsidian vault, and
 * the three-way merge that syncs them. Every function here is pure: reading and writing the
 * files is left to the app. See docs/format.md for the format itself.
 */

export type { Chapter, Note, NoteKind, Platform, SyncedNote, VideoMeta, VideoNotes, VideoStatus } from './types.js'

// A video's note in the vault, in sections.
export {
  localDate,
  readVaultNote,
  renderVaultNote,
  vaultNoteFor,
  type NoteCourse,
  type Stated,
  type VaultNote,
  type VaultRead,
} from './format.js'

// A course's own note.
export {
  courseIdIn,
  linkedName,
  readCourseList,
  readCourseNote,
  renderCourseNote,
  type CourseContent,
  type CourseLesson,
  type CourseNoteRead,
  type ListedCourse,
  type ListedLesson,
} from './courseNote.js'

// Notes as Markdown: the plain layout, and the parts the vault note is made of.
export {
  MANAGED_FIELDS,
  MARKER,
  chapterHeading,
  metaFrom,
  noteLines,
  notesMarkdown,
  parse,
  quote,
  readFrontmatter,
  readNotes,
  serialise,
  splitFrontmatter,
  tagsFrom,
  takeId,
  trimBlankEdges,
  unquote,
  withoutField,
  type Frontmatter,
} from './markdown.js'

// Where notes and screenshots go, and what they're named.
export {
  ATTACHMENTS,
  RECENTLY_DELETED,
  VAULT_SUBFOLDER,
  courseFolderName,
  courseNotePaths,
  isScreenshotPath,
  notePaths,
  screenshotPath,
  type NotePlace,
} from './layout.js'
export { lessonTitle, videoFileName } from './fileName.js'

// Merging two copies of a video against what they last agreed on.
export {
  localNote,
  mergeNotes,
  mergeStatus,
  mergeTags,
  mergeValue,
  sameContent,
  syncedNote,
  tooManyRemovals,
  type MergedNote,
  type MergeResult,
} from './merge.js'

// The pieces the rest is built from.
export { newNoteId, withNoteIds } from './noteIds.js'
export { newerPosition, samePosition, type WatchPosition } from './resume.js'
export { STATUSES, effectiveStatus, isFinished, isVideoStatus } from './status.js'
export { normaliseTag, splitTags } from './tags.js'
export { formatTime, parseTime } from './formatTime.js'
export { chapterIndexAt, outline, type OutlineRow } from './outline.js'
export { shortHash } from './hash.js'
export { courseUrl, lessonParts, momentUrl, parseVideoLink, platformOf, skoolParts, sourceUrl, type VideoLink } from './sources.js'
export { parsePlaylistId, parseVideoId, playlistUrl, timestampUrl, watchUrl } from './youtube.js'
