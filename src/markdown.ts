import { formatTime, parseTime } from './formatTime.js'
import { outline } from './outline.js'
import { isVideoStatus } from './status.js'
import { splitTags } from './tags.js'
import { momentUrl, platformOf, sourceUrl } from './sources.js'
import type { Chapter, Note, Platform, VideoMeta, VideoNotes } from './types.js'

export function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** A YAML value as written: "double-quoted", 'single-quoted' or plain. */
export function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1).replace(/''/g, "'")
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"') || trimmed.length < 2) return trimmed
  return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

export const MARKER = { timestamp: '🕒', screenshot: '📷', transcript: '💬' } as const
const INDENT = '  '

function indented(text: string, prefix = ''): string[] {
  return text.split('\n').map((line) => `${INDENT}${prefix}${line}`)
}

/** An Obsidian block ID ending a line: " ^k3f9qa". */
const BLOCK_ID = /\s+\^([A-Za-z0-9-]{3,})$/

function withId(line: string, note: Note): string {
  return note.id ? `${line} ^${note.id}` : line
}

/** A line without its trailing block ID, and the ID if it had one. */
export function takeId(line: string): { rest: string; id?: string } {
  const match = line.match(BLOCK_ID)
  return match ? { rest: line.slice(0, match.index), id: match[1] } : { rest: line }
}

/**
 * One list item per note.
 */
export function noteLines(meta: VideoMeta, note: Note): string[] {
  const start = Math.floor(note.timestampSeconds)
  const link = momentUrl(meta, start)
  const label = formatTime(start)

  switch (note.kind) {
    case 'timestamp':
      return [withId(`- [${label}](${link}) ${MARKER.timestamp}`, note)]

    case 'screenshot': {
      const [caption = '', ...more] = note.text.split('\n')
      const lines = [`- [${label}](${link}) ${MARKER.screenshot}${caption ? ` ${caption}` : ''}`, ...more.map((line) => `${INDENT}${line}`)]
      // A screenshot whose picture hasn't arrived yet, from Notion say, is written without one.
      if (note.image) lines.push(`${INDENT}![${label}](${note.image})`)
      lines[lines.length - 1] = withId(lines[lines.length - 1], note)
      return lines
    }

    case 'transcript': {
      const end = formatTime(Math.floor(note.endSeconds ?? start))
      return [withId(`- [${label}–${end}](${link}) ${MARKER.transcript}`, note), ...indented(note.text, '> ')]
    }

    case 'text': {
      const [first = '', ...more] = note.text.split('\n')
      const lines = [`- [${label}](${link}) ${first}`, ...more.map((line) => `${INDENT}${line}`)]
      lines[lines.length - 1] = withId(lines[lines.length - 1], note)
      return lines
    }
  }
}

/** A chapter's heading: its start, linked like a note's, then its title. */
export function chapterHeading(meta: VideoMeta, chapter: Chapter, level = '##'): string {
  const start = Math.floor(chapter.startSeconds)
  return `${level} [${formatTime(start)}](${momentUrl(meta, start)}) ${chapter.title}`
}

/**
 * Every note, one list item each, with the prose written after a note kept after it.
 */
export function notesMarkdown(meta: VideoMeta, notes: Note[], chapters: Chapter[] = [], level = '##'): string[] {
  const lines: string[] = []
  for (const row of outline(notes, chapters)) {
    if (row.kind === 'chapter') {
      if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('')
      lines.push(chapterHeading(meta, row.chapter, level), '')
      if (row.chapter.after?.length) lines.push(...row.chapter.after, '')
      continue
    }
    lines.push(...noteLines(meta, row.note))
    if (row.note.after?.length) lines.push('', ...row.note.after, '')
  }
  return lines
}

export function withoutField(lines: string[], name: string): string[] {
  const kept: string[] = []
  let skipping = false
  for (const line of lines) {
    if (line.startsWith(`${name}:`)) skipping = true
    else if (!/^\s/.test(line)) skipping = false
    if (!skipping) kept.push(line)
  }
  return kept
}

export function serialise({ meta, notes, intro, chapters }: VideoNotes): string {
  const frontmatter = [
    '---',
    `title: ${quote(meta.title)}`,
    `source: ${meta.url}`,
    `videoId: ${meta.videoId}`,
    `platform: ${platformOf(meta)}`,
    ...(meta.channel ? [`channel: ${quote(meta.channel)}`] : []),
    ...(meta.status ? [`status: ${meta.status}`] : []),
    ...(meta.tags?.length ? ['tags:', ...meta.tags.map((tag) => `  - ${tag}`)] : []),
    ...(meta.duration ? [`duration: ${Math.round(meta.duration)}`] : []),
    `created: ${meta.created}`,
    ...(meta.status ? withoutField(meta.extra ?? [], 'status') : (meta.extra ?? [])),
    '---',
    '',
  ]

  const body = intro?.length ? [...intro, ''] : []
  body.push(...notesMarkdown(meta, notes, chapters))
  if (body[body.length - 1] === '') body.pop()

  return [...frontmatter, ...body, ''].join('\n')
}

export const MANAGED_FIELDS: ReadonlySet<string> = new Set([
  'title',
  'source',
  'videoId',
  'platform',
  'channel',
  'status',
  'tags',
  'duration',
  'created',
])

export function trimBlankEdges(lines: string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && !lines[start].trim()) start++
  while (end > start && !lines[end - 1].trim()) end--
  return lines.slice(start, end)
}

export function splitFrontmatter(markdown: string): { frontmatter: string; body: string } | null {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  return match ? { frontmatter: match[1], body: match[2] } : null
}

export interface Frontmatter {
  fields: Record<string, string>
  lists: Record<string, string[]>
  extra: string[]
}

export function readFrontmatter(frontmatter: string, managed: ReadonlySet<string> = MANAGED_FIELDS): Frontmatter {
  const fields: Record<string, string> = {}
  const lists: Record<string, string[]> = {}
  const extra: string[] = []
  let field: { name: string; managed: boolean } | null = null

  for (const line of frontmatter.split(/\r?\n/)) {
    const start = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/)
    if (start) {
      const isManaged = managed.has(start[1]) && (start[1] !== 'status' || isVideoStatus(unquote(start[2])))
      field = { name: start[1], managed: isManaged }
      if (!field.managed) {
        extra.push(line)
        continue
      }
      fields[field.name] = unquote(start[2])
      if (!start[2].trim()) lists[field.name] = []
      continue
    }

    if (field?.managed) {
      const item = line.match(/^\s*-\s+(.*)$/)
      if (item && lists[field.name]) lists[field.name].push(unquote(item[1]))
      continue
    }
    if (field || line.trim()) extra.push(line)
  }
  return { fields, lists, extra }
}

export function tagsFrom({ fields, lists }: Frontmatter): string[] {
  return splitTags(lists.tags?.join(',') ?? fields.tags?.replace(/^\[|\]$/g, '') ?? '')
}

/** A platform this app knows, as front matter names one. */
function knownPlatform(value: string | undefined): Platform | undefined {
  return value === 'youtube' || value === 'udemy' || value === 'linkedin-learning' || value === 'skool' ? value : undefined
}

export function metaFrom(frontmatter: Frontmatter): VideoMeta | null {
  const { fields, extra } = frontmatter
  const videoId = fields.videoId
  if (!videoId) return null

  const duration = Number(fields.duration)
  const tags = tagsFrom(frontmatter)
  const platform = platformOf({ videoId, url: fields.source || undefined, platform: knownPlatform(fields.platform) })
  const meta: VideoMeta = {
    videoId,
    title: fields.title || videoId,
    url: fields.source || sourceUrl({ videoId, platform }),
    // Only said when it isn't YouTube, as notes have always left it unsaid for YouTube.
    ...(platform !== 'youtube' ? { platform } : {}),
    channel: fields.channel || undefined,
    duration: Number.isFinite(duration) && duration > 0 ? duration : undefined,
    ...(tags.length ? { tags } : {}),
    ...(fields.status && isVideoStatus(fields.status) ? { status: fields.status } : {}),
    created: fields.created || new Date().toISOString(),
  }
  const kept = trimBlankEdges(extra)
  if (kept.length) meta.extra = kept
  return meta
}

const NOTE_LINE = /^-\s*\[([^\]]*)\]\([^)]*[?&]t=(\d+)s?\)\s*(.*)$/
const IMAGE_LINE = /^!\[[^\]]*\]\(([^)]+)\)$/
const LEADING_MARKER = /^(?:🕒|📷|💬)\s*/u

interface Draft {
  label: string
  start: number
  first: string
  more: string[]
  quoted: string[]
  image?: string
  id?: string
}

function finish(draft: Draft): Note {
  const note = noteFrom(draft)
  return draft.id ? { id: draft.id, ...note } : note
}

function noteFrom(draft: Draft): Note {
  const text = [draft.first.replace(LEADING_MARKER, ''), ...draft.more].join('\n').trim()
  const timestampSeconds = draft.start

  if (draft.image) return { kind: 'screenshot', timestampSeconds, text, image: draft.image }

  if (draft.quoted.length > 0) {
    const [, end] = draft.label.split(/[–-]/)
    const endSeconds = end ? parseTime(end) : NaN
    return {
      kind: 'transcript',
      timestampSeconds,
      text: draft.quoted.join('\n'),
      endSeconds: Number.isFinite(endSeconds) ? endSeconds : timestampSeconds,
    }
  }

  return text ? { kind: 'text', timestampSeconds, text } : { kind: 'timestamp', timestampSeconds, text: '' }
}

const CHAPTER_HEADING = /^#{2,3}\s+\[(\d{1,2}(?::\d{2}){1,2})\]\([^)\s]*\)\s+(\S.*?)\s*$/

export function readNotes(body: string): { notes: Note[]; intro: string[]; chapters?: Chapter[] } {
  const notes: Note[] = []
  const intro: string[] = []
  const chapters: Chapter[] = []
  let draft: Draft | null = null
  let prose: string[] = []
  let heading: Chapter | null = null

  const settleProse = () => {
    const lines = trimBlankEdges(prose)
    prose = []
    if (!lines.length) return
    const last = notes[notes.length - 1]
    if (heading) heading.after = lines
    else if (last) last.after = lines
    else intro.push(...lines)
  }

  for (const line of body.split(/\r?\n/)) {
    const noteLine = line.match(NOTE_LINE)
    if (noteLine) {
      if (draft) notes.push(finish(draft))
      settleProse()
      heading = null
      const { rest, id } = takeId(noteLine[3])
      draft = { label: noteLine[1], start: Number(noteLine[2]), first: rest, more: [], quoted: [], id }
      continue
    }

    const chapterLine = line.match(CHAPTER_HEADING)
    const startSeconds = chapterLine ? parseTime(chapterLine[1]) : NaN
    if (chapterLine && Number.isFinite(startSeconds)) {
      if (draft) notes.push(finish(draft))
      draft = null
      settleProse()
      heading = { title: chapterLine[2], startSeconds }
      chapters.push(heading)
      continue
    }

    if (draft && line.trim() && /^\s/.test(line) && !prose.some((earlier) => earlier.trim())) {
      prose = []
      const content = line.trim()
      if (content.startsWith('>')) {
        draft.quoted.push(content.replace(/^>\s?/, ''))
        continue
      }
      const { rest, id } = takeId(content)
      if (id) draft.id = id
      const image = rest.match(IMAGE_LINE)
      if (image) draft.image = image[1]
      else draft.more.push(rest)
      continue
    }

    if (line.trim() && draft) {
      notes.push(finish(draft))
      draft = null
    }
    prose.push(line)
  }
  if (draft) notes.push(finish(draft))
  settleProse()

  return chapters.length ? { notes, intro, chapters } : { notes, intro }
}

export function parse(markdown: string): VideoNotes | null {
  const split = splitFrontmatter(markdown)
  if (!split) return null

  const meta = metaFrom(readFrontmatter(split.frontmatter))
  if (!meta) return null

  const { notes, intro, chapters } = readNotes(split.body)
  return { meta, notes, ...(intro.length ? { intro } : {}), ...(chapters ? { chapters } : {}) }
}
