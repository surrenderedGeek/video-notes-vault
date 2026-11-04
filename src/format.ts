import {
  MANAGED_FIELDS,
  metaFrom,
  notesMarkdown,
  quote,
  readFrontmatter,
  readNotes,
  splitFrontmatter,
  tagsFrom,
  trimBlankEdges,
  withoutField,
} from './markdown.js'
import type { WatchPosition } from './resume.js'
import { effectiveStatus, isVideoStatus } from './status.js'
import type { VideoNotes, VideoStatus } from './types.js'
import { momentUrl } from './sources.js'

/**
 * A video's note as it lives in an Obsidian vault: front matter with a date Obsidian can
 * show, then three sections. Summary and Notes are the user's own, kept exactly as
 * written. Timestamps holds every note, written the way the app writes notes everywhere
 * — block IDs and all — and it's the only part sync reads back. Pure, so every rule here
 * has a test; the app reads and writes the files. The Video Notes iOS app writes the same layout.
 *
 *   ## Summary      yours
 *   ## Timestamps   the app's: every note, in time order
 *   ## Notes        yours
 */

export interface VaultNote {
  /**
   * The video's details, and its notes with any prose written between them. `intro` is
   * prose under the Timestamps heading, before the first note.
   */
  doc: VideoNotes
  /** Whatever is above the first section. */
  preamble: string[]
  summary: string[]
  /** The Notes section. */
  freeform: string[]
  /**
   * Where the video was left, and when, from whichever device watched it last: `watched` and
   * `resume`, a link that opens the video there.
   */
  position?: WatchPosition
  /** The playlist this video is part of, and where in it: `playlist` and `part`. */
  course?: NoteCourse
}

/** A video's place in a course, as its note names it. */
export interface NoteCourse {
  title: string
  part: number
  /**
   * The course's own note, as a link names it, when the note names the course by a link to it
   * (`playlist: "[[…]]"`) rather than by its title alone: its file name without ".md", after
   * its folder when the link gives one.
   */
  link?: string
  /** What the link shows instead of the note's name: "[[link|shown]]". */
  shown?: string
}

/** A course as a note's playlist line gives it: a link to its note, or its title. */
function courseValue({ link, shown, title }: NoteCourse): string {
  if (!link) return title
  const name = link.split('/').pop()!.trim()
  const words = shown ?? (name === link ? undefined : name)
  return words ? `[[${link}|${words}]]` : `[[${link}]]`
}

/**
 * What the front matter says about the things that sync both ways. A field that isn't
 * there says nothing about title or status, but no tags field means no tags: that's how
 * Obsidian writes a note whose last tag was removed.
 */
export interface Stated {
  title?: string
  status?: VideoStatus
  tags: string[]
}

export type VaultRead =
  /** `sections` is false for a note in the app's plain layout, to be rewritten into sections. */
  | { kind: 'note'; note: VaultNote; stated: Stated; sections: boolean }
  /** A video's note, but not one sync can safely read back. */
  | { kind: 'problem'; videoId: string; problem: 'no-timestamps' }
  /** Not a video's note at all: someone's own note in the same folder. */
  | { kind: 'other' }

/** What this layout writes itself. The rest of the front matter is kept as written. */
const WITHOUT_COURSE: ReadonlySet<string> = new Set([
  ...[...MANAGED_FIELDS].filter((field) => field !== 'platform'),
  'date',
  'watched',
  'resume',
])
const VAULT_FIELDS: ReadonlySet<string> = new Set([...WITHOUT_COURSE, 'playlist', 'part'])

/**
 * Whether the note's `playlist` and `part` are a course as this layout writes one: a playlist
 * named on its own line, and a part that's a whole number from 1. Anything else — a list of
 * links, a playlist with no part — is the owner's own, and is kept exactly as written.
 */
function namesCourse(frontmatter: string): boolean {
  const value = (name: string) => frontmatter.match(new RegExp(`^${name}:[ \\t]*(.*)$`, 'm'))?.[1].trim()
  const playlist = value('playlist')
  const part = value('part')
  return Boolean(playlist) && /^[1-9]\d*$/.test(part ?? '')
}

const HEADING = /^##\s+(summary|timestamps|notes)\s*$/i

/** The local calendar day of an ISO time, as Obsidian's date properties have it: 2026-09-13. */
export function localDate(iso: string): string {
  const time = new Date(iso)
  if (Number.isNaN(time.getTime())) return iso.slice(0, 10)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())}`
}

/** A date property back as an ISO time, for a note with no `created`: midnight that day, here. */
function isoFromDate(date: string): string | undefined {
  const time = new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date)
  return Number.isNaN(time.getTime()) ? undefined : time.toISOString()
}

function section(heading: string, lines: string[]): string[] {
  const content = trimBlankEdges(lines)
  return [`## ${heading}`, '', ...(content.length ? [...content, ''] : [])]
}

/** A video's first note in the vault: what came before the phone's first note becomes the summary. */
export function vaultNoteFor({ meta, notes, intro, chapters }: VideoNotes): VaultNote {
  return { doc: { meta, notes, ...(chapters?.length ? { chapters } : {}) }, preamble: [], summary: intro ?? [], freeform: [] }
}

export function renderVaultNote({ doc, preamble, summary, freeform, position, course }: VaultNote): string {
  const { meta, notes, intro, chapters } = doc
  const frontmatter = [
    '---',
    `title: ${quote(meta.title)}`,
    // Always there on the phone; a video here may not know when it was added.
    ...(meta.created ? [`date: ${localDate(meta.created)}`] : []),
    `source: ${meta.url}`,
    `videoId: ${meta.videoId}`,
    ...(meta.channel ? [`channel: ${quote(meta.channel)}`] : []),
    // Always written: a status of someone else's making gives way, as it does on the phone
    // once the app sets one — two status fields would make the front matter invalid.
    `status: ${meta.status ?? effectiveStatus(doc)}`,
    ...(meta.tags?.length ? ['tags:', ...meta.tags.map((tag) => `  - ${tag}`)] : []),
    ...(meta.duration ? [`duration: ${Math.round(meta.duration)}`] : []),
    ...(meta.created ? [`created: ${meta.created}`] : []),
    ...(course ? [`playlist: ${quote(courseValue(course))}`, `part: ${course.part}`] : []),
    ...(position?.updated ? [`watched: ${new Date(position.updated).toISOString()}`] : []),
    ...(position ? [`resume: ${momentUrl(meta, position.seconds)}`] : []),
    // A course written here is the only one: a playlist or part kept from elsewhere (as a list,
    // say) would make the front matter's keys clash.
    ...withoutField(course ? withoutField(withoutField(meta.extra ?? [], 'playlist'), 'part') : (meta.extra ?? []), 'status'),
    '---',
    '',
  ]

  const top = trimBlankEdges(preamble)
  const body = [
    ...(top.length ? [...top, ''] : []),
    ...section('Summary', summary),
    ...section('Timestamps', [...(intro?.length ? [...intro, ''] : []), ...notesMarkdown(meta, notes, chapters, '###')]),
    ...section('Notes', freeform),
  ]
  if (body[body.length - 1] === '') body.pop()
  return [...frontmatter, ...body, ''].join('\n')
}

/** A link to a note, as a property holds one: "[[Note]]", or "[[Note|what it shows]]". */
const NOTE_LINK = /^\[\[([^\[\]|#^]+)(?:\|([^\[\]]*))?\]\]$/

/** The course the front matter names, and where in it: by a link to the course's note, or by its title. */
function courseFrom(fields: Record<string, string>): NoteCourse | undefined {
  const part = Number(fields.part)
  if (!fields.playlist || !Number.isInteger(part) || part < 1) return undefined
  const linked = fields.playlist.match(NOTE_LINK)
  if (linked) {
    const shown = linked[2]?.trim()
    return { title: shown || linked[1].trim(), part, link: linked[1].trim(), ...(shown ? { shown } : {}) }
  }
  return { title: fields.playlist, part }
}

/**
 * Where the front matter says the video was left: the moment in `resume`'s link, kept at the
 * time in `watched`. A place with no time it can read counts as older than any other.
 */
function positionFrom(fields: Record<string, string>): WatchPosition | undefined {
  const seconds = Number(fields.resume?.match(/[?&]t=(\d+)s?(?:[&#]|$)/)?.[1] ?? NaN)
  if (!Number.isFinite(seconds)) return undefined
  const updated = Date.parse(fields.watched ?? '')
  return { seconds, updated: Number.isFinite(updated) ? updated : 0 }
}

/**
 * Reads a note from the vault. Headings are found whatever their case and order; a heading
 * of the user's own stays inside the section it's in. A note with no sections at all is in
 * the app's plain layout — copied in from a notes folder, say — and is read that way, to be
 * written into sections next time. A note with sections but no Timestamps can't be read
 * back safely, since its notes would all look deleted.
 */
export function readVaultNote(text: string): VaultRead {
  const split = splitFrontmatter(text)
  if (!split) return { kind: 'other' }
  const frontmatter = readFrontmatter(split.frontmatter, namesCourse(split.frontmatter) ? VAULT_FIELDS : WITHOUT_COURSE)
  const { fields } = frontmatter
  if (!fields.videoId) return { kind: 'other' }
  if (!fields.created && fields.date) {
    const created = isoFromDate(fields.date)
    if (created) fields.created = created
  }
  const meta = metaFrom(frontmatter)!
  const position = positionFrom(fields)
  const course = courseFrom(fields)
  const stated: Stated = {
    ...(fields.title ? { title: fields.title } : {}),
    ...(fields.status && isVideoStatus(fields.status) ? { status: fields.status } : {}),
    tags: tagsFrom(frontmatter),
  }

  const preamble: string[] = []
  const sections = new Map<string, string[]>()
  let current = preamble
  for (const line of split.body.split(/\r?\n/)) {
    const name = line.match(HEADING)?.[1].toLowerCase()
    if (name && !sections.has(name)) {
      current = []
      sections.set(name, current)
      continue
    }
    current.push(line)
  }

  if (sections.size === 0) {
    const { notes, intro, chapters } = readNotes(split.body)
    return {
      kind: 'note',
      note: {
        doc: { meta, notes, ...(chapters ? { chapters } : {}) },
        preamble: [],
        summary: intro,
        freeform: [],
        ...(position ? { position } : {}),
        ...(course ? { course } : {}),
      },
      stated,
      sections: false,
    }
  }

  const timestamps = sections.get('timestamps')
  if (!timestamps) return { kind: 'problem', videoId: meta.videoId, problem: 'no-timestamps' }
  const { notes, intro, chapters } = readNotes(timestamps.join('\n'))
  return {
    kind: 'note',
    note: {
      doc: { meta, notes, ...(intro.length ? { intro } : {}), ...(chapters ? { chapters } : {}) },
      preamble: trimBlankEdges(preamble),
      summary: trimBlankEdges(sections.get('summary') ?? []),
      freeform: trimBlankEdges(sections.get('notes') ?? []),
      ...(position ? { position } : {}),
      ...(course ? { course } : {}),
    },
    stated,
    sections: true,
  }
}
