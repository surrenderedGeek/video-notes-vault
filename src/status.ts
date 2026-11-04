import type { VideoNotes, VideoStatus } from './types.js'

/** In the order a video goes through them. */
export const STATUSES: readonly VideoStatus[] = ['to-watch', 'in-progress', 'done']

/** Past this much of a video, what's left is credits and end screens. */
const FINISHED_FRACTION = 0.95

export function isVideoStatus(value: string): value is VideoStatus {
  return (STATUSES as readonly string[]).includes(value as VideoStatus)
}

/** Whether `seconds` into the video counts as having watched it. */
export function isFinished(seconds: number, duration: number | undefined): boolean {
  return duration !== undefined && duration > 0 && seconds >= duration * FINISHED_FRACTION
}

/**
 * The status in the note or, for notes from before the app kept track, one worked out
 * from what is known: watched to the end is done; started, or taken notes on, is in progress.
 */
export function effectiveStatus(doc: VideoNotes, watchedSeconds?: number): VideoStatus {
  if (doc.meta.status) return doc.meta.status
  if (watchedSeconds !== undefined && isFinished(watchedSeconds, doc.meta.duration)) return 'done'
  if (watchedSeconds || doc.notes.length > 0) return 'in-progress'
  return 'to-watch'
}
