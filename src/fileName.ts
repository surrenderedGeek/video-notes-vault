const MAX_LENGTH = 120

/**
 * The video's title made safe to use as a file name, falling back to its id: notes go
 * somewhere a person browses, an Obsidian vault say, so they're named after the video.
 * The same rules as the iOS app's, so both name a video's note alike.
 */
export function videoFileName(title: string, videoId: string): string {
  const cleaned = title
    // Characters Finder, iCloud and Obsidian reject or treat as path syntax.
    .replace(/[/\\:*?"<>|#^[\]]/g, '-')
    .replace(/[\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, MAX_LENGTH)
    .trim()

  return cleaned || videoId
}

/** What sets a title's parts apart: "L1: Gender | The Noun", "Part 2 - Loops". */
const MARKS = '|:·•\\-–—'
const ENDS_IN_MARK = new RegExp(`[${MARKS}]\\s*$`)
const STARTS_WITH_MARK = new RegExp(`^\\s*[${MARKS}]`)
const MARKS_AROUND = new RegExp(`^[\\s${MARKS}]+|[\\s${MARKS}]+$`, 'g')

/**
 * A lesson's title without its course's name, as its note is named in the course's folder,
 * which already gives the course. The course's name and whatever follows it (the teacher's,
 * say) go: "L1: Gender | The Noun | Arabic Grammar in 40 Lessons | Dr Shadee Elmasry" is
 * "L1: Gender | The Noun". A title that starts with it loses just that: "Arabic Grammar: L1"
 * is "L1". A title that's only the course's name, or has it only inside a part, stays.
 */
export function lessonTitle(title: string, course: string): string {
  const name = course.trim()
  const at = name ? title.toLowerCase().indexOf(name.toLowerCase()) : -1
  if (at < 0) return title
  const before = title.slice(0, at)
  const after = title.slice(at + name.length)
  const aPart = (before.trim() === '' || ENDS_IN_MARK.test(before)) && (after.trim() === '' || STARTS_WITH_MARK.test(after))
  if (!aPart) return title
  return before.replace(MARKS_AROUND, '') || after.replace(MARKS_AROUND, '') || title
}
