/** Where you are with a video. */
export type VideoStatus = 'to-watch' | 'in-progress' | 'done'

export type Platform = 'youtube' | 'udemy' | 'linkedin-learning'

export interface VideoMeta {
  videoId: string
  title: string
  url: string
  platform?: Platform
  channel?: string
  courseName?: string
  duration?: number
  durationSeconds?: number
  thumbnailUrl?: string
  /** What the video is about, normalised by normaliseTag. */
  tags?: string[]
  /** Absent from notes written before the app kept track. */
  status?: VideoStatus
  created?: string
  chapters?: Chapter[]
  /**
   * Frontmatter this app doesn't manage — properties added in Obsidian, say — kept exactly
   * as written, so saving doesn't drop them.
   */
  extra?: string[]
}

export type NoteKind = 'text' | 'timestamp' | 'screenshot' | 'transcript'

export interface Note {
  /**
   * Stays the same when the note is edited, so sync can tell an edit from a new note.
   * Written as an Obsidian block ID (" ^k3f9qa"); absent until the note is first saved.
   */
  id?: string
  kind: NoteKind
  timestampSeconds: number
  /** The typed note, the transcript excerpt, or an optional caption for a screenshot. */
  text: string
  /** Screenshot data URL or attachment path */
  image?: string
  /** End of the transcript window. */
  endSeconds?: number
  /** Lines written after this note that aren't part of it — prose added in another app. */
  after?: string[]
}

export interface Chapter {
  title: string
  startSeconds: number
  /** Prose written under the chapter's heading, before its first note, kept as it is. */
  after?: string[]
}

export interface VideoNotes {
  meta: VideoMeta
  notes: Note[]
  /** Lines written before the first note, kept as they are. */
  intro?: string[]
  /** YouTube chapters, if available. */
  chapters?: Chapter[]
}

/**
 * A note as a merge compares it with another copy: what it says, and where it lives on the
 * other side once it's there (its blocks on a Notion page, say).
 */
export interface SyncedNote {
  id: string
  kind: NoteKind
  time: number
  /** A transcript's end. */
  end?: number
  text: string
  /** The note's blocks on a Notion page: its bullet, then a screenshot's image. */
  blocks?: string[]
  /** Where the other side keeps a screenshot's image, when it's a link: Notion's expire, so they're never stored. */
  imageUrl?: string
}
