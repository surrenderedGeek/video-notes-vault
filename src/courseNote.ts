import { quote, readFrontmatter, splitFrontmatter } from './markdown.js'
import { courseUrl, parseVideoLink, sourceUrl } from './sources.js'
import type { Platform } from './types.js'
import { watchUrl } from './youtube.js'

/**
 * A course's own note in the notes folder, beside its videos' notes: the playlist's name and
 * where it lives on YouTube, a table of the lessons that have notes (an Obsidian base, kept
 * live by Obsidian itself), every video in the playlist in order, and room for the user's own
 * notes. Each lesson's note names the course by a link to it (`playlist: "[[…]]"`).
 *
 *   ---
 *   title: "Arabic Grammar in 40 Lessons"
 *   playlistId: PLZ6keVEpgaQsvR9l8aFJp80LA2MJ9zj8E
 *   source: https://www.youtube.com/playlist?list=PLZ6keVEpgaQsvR9l8aFJp80LA2MJ9zj8E
 *   channel: "Safina Society"
 *   videos: 48
 *   ---
 *
 *   ## Progress        the table, written once: Obsidian rewrites it as its view is changed
 *   ## Videos          kept up to date from here; words added to a video's line, and lines
 *                      of the user's own, stay
 *   ## Notes           the user's
 *
 * It's found again by its playlistId, whatever it's renamed to. It has no videoId, so
 * anything syncing videos' notes takes it for someone's own note and leaves it alone.
 */

/** What this layout writes in a course note's front matter. The rest is kept as written. */
const COURSE_FIELDS: ReadonlySet<string> = new Set(['title', 'playlistId', 'source', 'channel', 'videos'])
/** Read too, only to tell a video's note from a course's: a note with a videoId is never a course's. */
const TELLING_FIELDS: ReadonlySet<string> = new Set([...COURSE_FIELDS, 'videoId'])

const VIDEOS = /^##\s+videos\s*$/i
const ANY_HEADING = /^#{1,6}\s/
/**
 * A line of the Videos list: its number, then a link to the video's note or to the video (its
 * name, then its address), then whatever was added after the link.
 */
const VIDEO_LINE = /^(\d+)\.\s+(?:\[\[([^[\]|]+)(?:\|[^[\]]*)?\]\]|\[((?:\\.|[^\]\\])*)\]\((\S+?)\))(.*)$/
/** What the list says of itself, rather than of a video. */
const NOTICE = /^_(?:No videos yet\.|YouTube stopped answering before the end of this playlist, .*)_$/
const CUT_SHORT = /^_YouTube stopped answering before the end of this playlist, .*_$/

export interface CourseLesson {
  videoId: string
  title: string
  /**
   * Its note in the folder, as a link names it, when it has one: its file name without ".md",
   * after the notes folder's place in the vault when that's known ("Video Notes/Me at the zoo").
   */
  note?: string
}

export interface CourseContent {
  listId: string
  /** Where the course is: a YouTube playlist when unsaid. */
  platform?: Platform
  title: string
  channel?: string
  lessons: CourseLesson[]
  /** Set when YouTube stopped before the end of the playlist, so there are more than these. */
  partial?: boolean
}

export interface CourseNoteRead {
  listId: string
  /** Front matter of the user's own, as written. */
  extra: string[]
  /** Everything after the front matter, as written. */
  body: string
}

/** The playlist a course note is for, or null for any other note: a video's, or someone's own. */
export function courseIdIn(text: string): string | null {
  const split = splitFrontmatter(text)
  if (!split) return null
  const { fields } = readFrontmatter(split.frontmatter, TELLING_FIELDS)
  if (fields.videoId) return null
  return /^[A-Za-z0-9_-]+$/.test(fields.playlistId ?? '') ? fields.playlistId : null
}

export function readCourseNote(text: string): CourseNoteRead | null {
  const listId = courseIdIn(text)
  const split = splitFrontmatter(text)
  if (!listId || !split) return null
  return { listId, extra: readFrontmatter(split.frontmatter, COURSE_FIELDS).extra, body: split.body }
}

/** The lessons table, as an Obsidian base kept in the note: the notes that name this course, in order. */
const PROGRESS_TABLE = [
  '```base',
  'filters:',
  '  and:',
  '    - list(playlist).contains(this)',
  'formulas:',
  `  resume_link: 'if(resume, link(resume, "Resume"))'`,
  'properties:',
  '  note.part:',
  '    displayName: Part',
  '  file.name:',
  '    displayName: Lesson',
  '  note.status:',
  '    displayName: Status',
  '  formula.resume_link:',
  '    displayName: Where you left off',
  'views:',
  '  - type: table',
  '    name: Lessons',
  '    order:',
  '      - part',
  '      - file.name',
  '      - status',
  '      - formula.resume_link',
  '    sort:',
  '      - property: part',
  '        direction: ASC',
  '```',
]

/** The note a link names, whatever folder it's given in: "Video Notes/Me at the zoo" is "Me at the zoo". */
export function linkedName(target: string): string {
  return target.split('/').pop()!.trim()
}

/** A link to a note, showing only its name when the link gives its folder too. */
function noteLink(target: string): string {
  const name = linkedName(target)
  return name === target ? `[[${target}]]` : `[[${target}|${name}]]`
}

/**
 * A video's name as a link's text, shown as it is: on one line, with every mark Markdown or
 * Obsidian would act on escaped — emphasis, HTML, tags, comments, maths, block ids.
 */
function linkText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/[\\`*_[\]<>#%$|~=^{}]/g, (character) => `\\${character}`)
}

/**
 * Every video of the course in order: a link to its note when it has one, else to it on
 * YouTube, followed by whatever was added to its line (`kept`, by the video's place).
 */
function videoList({ listId, platform, lessons, partial }: CourseContent, kept: ReadonlyMap<number, string> = new Map()): string[] {
  if (lessons.length === 0) return ['_No videos yet._']
  const onSite = (videoId: string) => (platform === 'linkedin-learning' ? sourceUrl({ videoId, platform }) : `${watchUrl(videoId)}&list=${listId}`)
  const lines = lessons.map(({ videoId, title, note }, index) => {
    const link = note ? noteLink(note) : `[${linkText(title) || videoId}](${onSite(videoId)})`
    return `${index + 1}. ${link}${kept.get(index) ?? ''}`
  })
  if (partial) lines.push('', `_YouTube stopped answering before the end of this playlist, so only its first ${lessons.length} videos are here._`)
  return lines
}

/** Which lines are outside fenced code blocks, where a heading is a heading. */
function outsideFences(lines: string[]): boolean[] {
  let fenced = false
  return lines.map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced
      return false
    }
    return !fenced
  })
}

/** The video a line's link is to, on either site. */
function videoIn(url: string): string | null {
  return parseVideoLink(url)?.videoId ?? null
}

/**
 * The body with its Videos list brought up to date, and everything else as written. The list
 * runs from its heading to the next heading of any level. In it, each video's line is written
 * afresh, keeping anything added after its link; a line that's no video's — typed at the end of
 * the list, say — is the user's, and stays, after the list.
 */
function withVideos(body: string, content: CourseContent): string {
  const lines = body.split('\n')
  const open = outsideFences(lines)
  const start = lines.findIndex((line, index) => open[index] && VIDEOS.test(line))
  if (start < 0) {
    // Taken out in Obsidian: it goes back at the end, since it's what the note is for.
    const kept = body.endsWith('\n') || body === '' ? body : `${body}\n`
    return `${kept}\n## Videos\n\n${videoList(content).join('\n')}\n`
  }
  let end = lines.findIndex((line, index) => index > start && open[index] && ANY_HEADING.test(line))
  if (end < 0) end = lines.length

  const { lessons } = content
  const byNote = new Map(lessons.flatMap((lesson, index) => (lesson.note ? [[linkedName(lesson.note).toLowerCase(), index] as const] : [])))
  const byVideo = new Map(lessons.map((lesson, index) => [lesson.videoId, index] as const))
  const region = lines.slice(start + 1, end).map((line, offset) => ({ line, open: open[start + 1 + offset], match: line.match(VIDEO_LINE) }))

  // Each video's line, found by what it links to; failing that, by its number, as a line whose
  // note was renamed outside Obsidian still has it.
  const kept = new Map<number, string>()
  const place = new Map<number, number>()
  region.forEach(({ open, match }, at) => {
    if (!open || !match) return
    const index = match[2] ? byNote.get(linkedName(match[2]).toLowerCase()) : byVideo.get(videoIn(match[4]) ?? '')
    if (index !== undefined && !kept.has(index)) {
      kept.set(index, match[5])
      place.set(at, index)
    }
  })
  region.forEach(({ open, match }, at) => {
    if (!open || !match || place.has(at)) return
    const index = Number(match[1]) - 1
    if (index >= 0 && index < lessons.length && !kept.has(index)) {
      kept.set(index, match[5])
      place.set(at, index)
    }
  })
  // A numbered line said twice over isn't the user's: two notes for one video, a sync conflict's
  // copy say, can leave one behind on every sync. Once is enough.
  const said = new Set(region.flatMap(({ line }, at) => (place.has(at) ? [line.trim()] : [])))
  const repeated = ({ line, open }: (typeof region)[number]) => {
    if (!open || !/^\d+\.\s/.test(line)) return false
    if (said.has(line.trim())) return true
    said.add(line.trim())
    return false
  }
  const theirs = region
    .filter((entry, at) => !place.has(at) && (!entry.open || (entry.line.trim() !== '' && !NOTICE.test(entry.line.trim()))) && !repeated(entry))
    .map(({ line }) => line)

  return [...lines.slice(0, start + 1), '', ...videoList(content, kept), ...(theirs.length ? ['', ...theirs] : []), '', ...lines.slice(end)].join('\n')
}

/**
 * A course's note: a new one, or `existing` brought up to date. Only the managed front matter
 * and the Videos list's own lines are written; the rest, the lessons table included once it's
 * there, is the user's and stays exactly as written.
 */
export function renderCourseNote(content: CourseContent, existing?: CourseNoteRead): string {
  const frontmatter = [
    '---',
    `title: ${quote(content.title)}`,
    `playlistId: ${content.listId}`,
    `source: ${courseUrl(content.platform ?? 'youtube', content.listId)}`,
    ...(content.channel ? [`channel: ${quote(content.channel)}`] : []),
    `videos: ${content.lessons.length}`,
    ...(existing?.extra ?? []),
    '---',
  ].join('\n')

  const body = existing
    ? withVideos(existing.body, content)
    : ['', '## Progress', '', ...PROGRESS_TABLE, '', '## Videos', '', ...videoList(content), '', '## Notes', ''].join('\n')
  return `${frontmatter}\n${body}`
}

/** A video as a course's note lists it: by a link to its note, or by its name and address. */
export type ListedLesson = { note: string } | { videoId: string; title: string }

/** A course as its note gives it, for an app that hasn't got the course yet: to bring it in from the folder. */
export interface ListedCourse {
  listId: string
  platform: Platform
  title: string
  channel?: string
  lessons: ListedLesson[]
  /** Set when the list says YouTube stopped before the end of the playlist. */
  partial?: boolean
}

/**
 * The course a note lists, read back: its name, and its videos in order from the list under
 * Videos, which runs to the first line that isn't the list's next video. What the user added
 * below it is theirs, and none of the course. Null when there's no such list to go by: taken
 * out in Obsidian, say, or not the one this writes.
 */
export function readCourseList(text: string): ListedCourse | null {
  const listId = courseIdIn(text)
  const split = splitFrontmatter(text)
  if (!listId || !split) return null
  const { fields } = readFrontmatter(split.frontmatter, COURSE_FIELDS)

  const lines = split.body.split('\n').map((line) => line.replace(/\r$/, ''))
  const open = outsideFences(lines)
  const start = lines.findIndex((line, index) => open[index] && VIDEOS.test(line))
  if (start < 0) return null
  let end = lines.findIndex((line, index) => index > start && open[index] && ANY_HEADING.test(line))
  if (end < 0) end = lines.length

  let at = start + 1
  while (at < end && !lines[at].trim()) at++
  const lessons: ListedLesson[] = []
  if (lines[at]?.trim() !== '_No videos yet._') {
    for (; at < end; at++) {
      const match = open[at] ? lines[at].match(VIDEO_LINE) : null
      if (!match || Number(match[1]) !== lessons.length + 1) break
      if (match[2]) {
        lessons.push({ note: match[2] })
        continue
      }
      const videoId = videoIn(match[4])
      if (!videoId) return null
      lessons.push({ videoId, title: match[3].replace(/\\(.)/g, '$1') })
    }
    if (lessons.length === 0) return null
  }

  return {
    listId,
    platform: parseVideoLink(fields.source ?? '')?.platform ?? 'youtube',
    title: fields.title ?? '',
    ...(fields.channel ? { channel: fields.channel } : {}),
    lessons,
    ...(lines.slice(at, end).some((line) => CUT_SHORT.test(line.trim())) ? { partial: true } : {}),
  }
}
