/** Where a video was left: the moment, and when it was saved there (ms). */
export interface WatchPosition {
  seconds: number
  updated: number
}

/** Whether two places are the same: the same moment, kept at the same time. */
export function samePosition(a: WatchPosition | undefined, b: WatchPosition | undefined): boolean {
  return a?.seconds === b?.seconds && a?.updated === b?.updated
}

/**
 * The later of two places a video was left, here and in its note say: the newest wins,
 * wherever it was watched. Of two kept at the same time, `theirs` wins, since they can only
 * differ when someone changed the note's by hand.
 */
export function newerPosition(mine: WatchPosition | undefined, theirs: WatchPosition | undefined): WatchPosition | undefined {
  if (!mine || !theirs) return mine ?? theirs
  return theirs.updated >= mine.updated ? theirs : mine
}
