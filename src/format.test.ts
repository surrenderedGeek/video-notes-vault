// The same tests as the iOS app's (src/obsidian/format.test.ts), so both write a vault note alike.
import { describe, expect, it } from 'vitest'

import { serialise } from './markdown.js'
import type { Note, VideoNotes } from './types.js'
import { localDate, readVaultNote, renderVaultNote, vaultNoteFor, type VaultNote, type VaultRead } from './format.js'

const ZOO = 'jNQXAC9IVRw'
const link = (seconds: number) => `https://www.youtube.com/watch?v=${ZOO}&t=${seconds}s`

function video(notes: Note[], extra: Partial<VideoNotes['meta']> = {}): VideoNotes {
  return {
    meta: { videoId: ZOO, title: 'Me at the zoo', url: `https://www.youtube.com/watch?v=${ZOO}`, created: '2026-09-13T09:00:00.000Z', ...extra },
    notes,
  }
}

const bookmark: Note = { id: 'k3f9qa', kind: 'timestamp', timestampSeconds: 5, text: '' }
const typed: Note = { id: 'abc123', kind: 'text', timestampSeconds: 8, text: 'Long trunks' }
const shot: Note = { id: 'm2p8xz', kind: 'screenshot', timestampSeconds: 12, text: 'The enclosure', image: `attachments/${ZOO}-12-a1b2c3.jpg` }
const words: Note = { id: 'q9w8e7', kind: 'transcript', timestampSeconds: 15, endSeconds: 19, text: 'All right, so here we are' }

function note(result: VaultRead): VaultNote {
  if (result.kind !== 'note') throw new Error(`expected a note, got ${result.kind}`)
  return result.note
}

describe('renderVaultNote', () => {
  it('writes front matter, then Summary, Timestamps and Notes', () => {
    const doc = video([bookmark, typed, shot, words], { channel: 'jawed', status: 'in-progress', tags: ['zoo'], duration: 19 })
    expect(renderVaultNote({ doc, preamble: [], summary: ['The first video on YouTube.'], freeform: ['Watch it again.'] })).toBe(
      [
        '---',
        'title: "Me at the zoo"',
        'date: 2026-09-13',
        `source: https://www.youtube.com/watch?v=${ZOO}`,
        `videoId: ${ZOO}`,
        'channel: "jawed"',
        'status: in-progress',
        'tags:',
        '  - zoo',
        'duration: 19',
        'created: 2026-09-13T09:00:00.000Z',
        '---',
        '',
        '## Summary',
        '',
        'The first video on YouTube.',
        '',
        '## Timestamps',
        '',
        `- [0:05](${link(5)}) 🕒 ^k3f9qa`,
        `- [0:08](${link(8)}) Long trunks ^abc123`,
        `- [0:12](${link(12)}) 📷 The enclosure`,
        `  ![0:12](attachments/${ZOO}-12-a1b2c3.jpg) ^m2p8xz`,
        `- [0:15–0:19](${link(15)}) 💬 ^q9w8e7`,
        '  > All right, so here we are',
        '',
        '## Notes',
        '',
        'Watch it again.',
        '',
      ].join('\n'),
    )
  })

  it('leaves empty sections as headings to write under', () => {
    const text = renderVaultNote(vaultNoteFor(video([])))
    expect(text.split('---\n')[2]).toBe('\n## Summary\n\n## Timestamps\n\n## Notes\n')
  })

  it('writes the status worked out for an older note', () => {
    expect(renderVaultNote(vaultNoteFor(video([typed])))).toContain('\nstatus: in-progress\n')
    expect(renderVaultNote(vaultNoteFor(video([])))).toContain('\nstatus: to-watch\n')
  })

  it('keeps front matter it doesn’t manage, but not a second status', () => {
    const doc = video([], { status: 'done', extra: ['aliases:', '  - Zoo', 'status: reading'] })
    const text = renderVaultNote(vaultNoteFor(doc))
    expect(text).toContain('created: 2026-09-13T09:00:00.000Z\naliases:\n  - Zoo\n---')
    expect(text.match(/^status:/gm)).toHaveLength(1)
  })

  it('starts the summary from what the phone’s note had before its first note', () => {
    const seeded = vaultNoteFor({ ...video([typed]), intro: ['Filmed at the San Diego Zoo.'] })
    expect(seeded.summary).toEqual(['Filmed at the San Diego Zoo.'])
    expect(seeded.doc.intro).toBeUndefined()
    expect(renderVaultNote(seeded)).toContain('## Summary\n\nFilmed at the San Diego Zoo.\n\n## Timestamps\n\n- [0:08]')
  })
})

describe('readVaultNote', () => {
  it('reads back what it wrote', () => {
    const written: VaultNote = {
      doc: {
        ...video([bookmark, { ...typed, after: ['A thought of my own.'] }, shot, words], { channel: 'jawed', status: 'done', tags: ['zoo', 'history'], duration: 19, extra: ['rating: 5'] }),
        intro: ['Under the heading, before the first note.'],
      },
      preamble: ['![](https://www.youtube.com/watch?v=jNQXAC9IVRw)'],
      summary: ['The first video on YouTube.', '', '- a list of my own'],
      freeform: ['### Questions', '', '- Why elephants?'],
    }
    const read = readVaultNote(renderVaultNote(written))
    expect(read).toEqual({ kind: 'note', note: written, stated: { title: 'Me at the zoo', status: 'done', tags: ['zoo', 'history'] }, sections: true })
  })

  it('keeps the user’s own headings inside the section they’re in', () => {
    const text = renderVaultNote({ ...vaultNoteFor(video([typed])), freeform: ['## Questions', '', 'Why?'] })
    const read = note(readVaultNote(text))
    expect(read.freeform).toEqual(['## Questions', '', 'Why?'])
    expect(renderVaultNote(read)).toBe(text)
  })

  it('finds its sections whatever their case and order', () => {
    const text = [
      '---',
      `videoId: ${ZOO}`,
      '---',
      '## NOTES',
      'mine',
      '## timestamps',
      `- [0:08](${link(8)}) Long trunks ^abc123`,
      '## Summary',
      'short',
    ].join('\n')
    const read = note(readVaultNote(text))
    expect(read.doc.notes).toEqual([typed])
    expect(read.summary).toEqual(['short'])
    expect(read.freeform).toEqual(['mine'])
  })

  it('reads a note typed in Obsidian without an id, to be given one by sync', () => {
    const text = renderVaultNote(vaultNoteFor(video([typed]))).replace(' ^abc123', '')
    expect(note(readVaultNote(text)).doc.notes).toEqual([{ kind: 'text', timestampSeconds: 8, text: 'Long trunks' }])
  })

  it('reads the app’s plain layout, with what came before the first note as the summary', () => {
    const plain = serialise({ ...video([typed, shot]), intro: ['Filmed at the zoo.'] })
    expect(readVaultNote(plain)).toMatchObject({ kind: 'note', sections: false })
    const read = note(readVaultNote(plain))
    expect(read.doc.notes).toEqual([typed, shot])
    expect(read.summary).toEqual(['Filmed at the zoo.'])
    expect(renderVaultNote(read)).toContain('## Summary\n\nFilmed at the zoo.\n\n## Timestamps')
  })

  it('won’t read a note whose Timestamps heading is gone, since its notes would all look deleted', () => {
    const text = renderVaultNote(vaultNoteFor(video([typed]))).replace('## Timestamps', '## Moments')
    expect(readVaultNote(text)).toEqual({ kind: 'problem', videoId: ZOO, problem: 'no-timestamps' })
  })

  it('leaves alone notes that aren’t a video’s', () => {
    expect(readVaultNote('# Groceries\n\n- milk')).toEqual({ kind: 'other' })
    expect(readVaultNote('---\ntitle: Groceries\n---\n## Notes\n')).toEqual({ kind: 'other' })
  })

  it('says nothing about a title or status that isn’t there, and no tags field means none', () => {
    const text = ['---', `videoId: ${ZOO}`, 'status: reading', '---', '## Timestamps', ''].join('\n')
    expect(readVaultNote(text)).toMatchObject({ kind: 'note', stated: { tags: [] } })
    const read = readVaultNote(text) as Extract<VaultRead, { kind: 'note' }>
    expect(read.stated.title).toBeUndefined()
    expect(read.stated.status).toBeUndefined()
    expect(read.note.doc.meta.extra).toEqual(['status: reading'])
  })

  it('reads values as Obsidian’s property editor writes them', () => {
    const text = [
      '---',
      "title: 'It''s the zoo'",
      'date: 2026-09-13',
      `videoId: ${ZOO}`,
      'status: "done"',
      'tags: [zoo, History]',
      '---',
      '## Timestamps',
    ].join('\n')
    const read = readVaultNote(text) as Extract<VaultRead, { kind: 'note' }>
    expect(read.stated).toEqual({ title: "It's the zoo", status: 'done', tags: ['zoo', 'history'] })
  })

  it('takes when the video was added from the date when there’s no created', () => {
    const text = ['---', `videoId: ${ZOO}`, 'date: 2026-09-13', '---', '## Timestamps'].join('\n')
    const { created } = note(readVaultNote(text)).doc.meta
    expect(localDate(created!)).toBe('2026-09-13')
  })
})

describe('where the video was left', () => {
  const position = { seconds: 607, updated: Date.parse('2026-09-19T10:42:07.000Z') }

  it('writes when it was last watched, and a link that opens it where it was left', () => {
    const text = renderVaultNote({ ...vaultNoteFor(video([typed])), position })
    expect(text).toContain(`created: 2026-09-13T09:00:00.000Z\nwatched: 2026-09-19T10:42:07.000Z\nresume: ${link(607)}\n---`)
  })

  it("links a LinkedIn Learning lesson's place to its own page", () => {
    const lesson = video([typed], {
      videoId: 'course/lesson',
      platform: 'linkedin-learning',
      url: 'https://www.linkedin.com/learning/course/lesson',
    })
    const text = renderVaultNote({ ...vaultNoteFor(lesson), position })
    expect(text).toContain('resume: https://www.linkedin.com/learning/course/lesson?t=607\n---')
    expect(note(readVaultNote(text)).position).toEqual(position)
    expect(note(readVaultNote(text)).doc.meta.platform).toBe('linkedin-learning')
  })

  it('reads it back, and says nothing for a note that has none', () => {
    const written = { ...vaultNoteFor(video([typed])), position }
    expect(note(readVaultNote(renderVaultNote(written))).position).toEqual(position)
    expect(note(readVaultNote(renderVaultNote(vaultNoteFor(video([typed]))))).position).toBeUndefined()
  })

  it('is not kept twice: it belongs to the note, not to the front matter kept as written', () => {
    const text = renderVaultNote({ ...vaultNoteFor(video([typed])), position })
    expect(note(readVaultNote(text)).doc.meta.extra).toBeUndefined()
  })

  it('reads the time as Obsidian’s property editor writes one: to the minute, in local time', () => {
    const text = ['---', `videoId: ${ZOO}`, 'watched: 2026-09-19T12:42', `resume: ${link(607)}`, '---', '## Timestamps'].join('\n')
    expect(note(readVaultNote(text)).position).toEqual({ seconds: 607, updated: new Date('2026-09-19T12:42').getTime() })
  })

  it('counts a place with no time it can read as older than any other, and writes none back', () => {
    const text = ['---', `videoId: ${ZOO}`, `resume: https://youtu.be/${ZOO}?t=90`, '---', '## Timestamps'].join('\n')
    const read = note(readVaultNote(text))
    expect(read.position).toEqual({ seconds: 90, updated: 0 })
    expect(renderVaultNote(read)).not.toContain('watched:')
  })

  it('takes no place from a link with no moment in it', () => {
    const text = ['---', `videoId: ${ZOO}`, 'watched: 2026-09-19T10:42:07.000Z', `resume: ${`https://www.youtube.com/watch?v=${ZOO}`}`, '---', '## Timestamps'].join('\n')
    expect(note(readVaultNote(text)).position).toBeUndefined()
  })
})

describe('the course a video belongs to', () => {
  const course = { title: 'Arabic Grammar in 40 Lessons', part: 4 }

  it('writes the course and the place in it, and reads them back', () => {
    const text = renderVaultNote({ ...vaultNoteFor(video([typed])), course })

    expect(text).toContain('created: 2026-09-13T09:00:00.000Z\nplaylist: "Arabic Grammar in 40 Lessons"\npart: 4\n---')
    expect(note(readVaultNote(text)).course).toEqual(course)
    expect(note(readVaultNote(text)).doc.meta.extra).toBeUndefined()
  })

  it('names the course by a link to its own note, and reads the link back', () => {
    const linked = { ...course, link: 'Arabic Grammar in 40 Lessons' }
    const text = renderVaultNote({ ...vaultNoteFor(video([typed])), course: linked })

    expect(text).toContain('playlist: "[[Arabic Grammar in 40 Lessons]]"\npart: 4\n')
    expect(note(readVaultNote(text)).course).toEqual(linked)
  })

  it('reads a link with words of its own, and tells a link from a title', () => {
    const read = (value: string) => note(readVaultNote(['---', `videoId: ${ZOO}`, `playlist: ${value}`, 'part: 2', '---', '## Timestamps'].join('\n'))).course

    expect(read('"[[Arabic Grammar (PL1)|Arabic grammar]]"')).toEqual({ title: 'Arabic grammar', part: 2, link: 'Arabic Grammar (PL1)', shown: 'Arabic grammar' })
    expect(read('"Arabic Grammar in 40 Lessons"')).toEqual({ title: 'Arabic Grammar in 40 Lessons', part: 2 })
  })

  it('writes a link back as it was read: with its folder, and with words of its own', () => {
    const text = ['---', `videoId: ${ZOO}`, 'playlist: "[[Video Notes/Arabic Grammar|The course]]"', 'part: 2', '---', '## Timestamps', ''].join('\n')
    expect(renderVaultNote(note(readVaultNote(text)))).toContain('playlist: "[[Video Notes/Arabic Grammar|The course]]"\npart: 2\n')
  })

  it("shows only the note's name when a link gives its folder", () => {
    const text = renderVaultNote({ ...vaultNoteFor(video([typed])), course: { ...course, link: 'Video Notes/Arabic Grammar in 40 Lessons' } })
    expect(text).toContain('playlist: "[[Video Notes/Arabic Grammar in 40 Lessons|Arabic Grammar in 40 Lessons]]"')
  })

  it('writes its course over a playlist kept as a list, rather than beside it', () => {
    const text = ['---', `videoId: ${ZOO}`, 'playlist:', '  - "[[Arabic Grammar in 40 Lessons]]"', 'part: 4', 'mood: keen', '---', '## Timestamps', ''].join('\n')
    const rendered = renderVaultNote({ ...note(readVaultNote(text)), course: { ...course, link: 'Arabic Grammar in 40 Lessons' } })

    expect(rendered.match(/^playlist:/gm)).toHaveLength(1)
    expect(rendered.match(/^part:/gm)).toHaveLength(1)
    expect(rendered).toContain('playlist: "[[Arabic Grammar in 40 Lessons]]"\npart: 4\nmood: keen\n')
  })

  it('says nothing for a video that is in no playlist', () => {
    const text = renderVaultNote(vaultNoteFor(video([typed])))
    expect(text).not.toContain('playlist:')
    expect(note(readVaultNote(text)).course).toBeUndefined()
  })

  it('takes no course from a playlist named without a place in it, and keeps the line as written', () => {
    const text = ['---', `videoId: ${ZOO}`, 'playlist: "[[Arabic MOC]]"', '---', '## Timestamps'].join('\n')
    const read = note(readVaultNote(text))

    expect(read.course).toBeUndefined()
    expect(renderVaultNote(read)).toContain('playlist: "[[Arabic MOC]]"')
  })

  it('keeps a playlist or part of the owner’s own that is not the shape of a course, as written', () => {
    const text = ['---', `videoId: ${ZOO}`, 'playlist:', '  - "[[A]]"', '  - "[[B]]"', 'part: 3', '---', '## Timestamps'].join('\n')
    const read = note(readVaultNote(text))

    expect(read.course).toBeUndefined()
    expect(renderVaultNote(read)).toContain('playlist:\n  - "[[A]]"\n  - "[[B]]"\npart: 3')
  })
})

describe('localDate', () => {
  it('is the calendar day, and passes through what isn’t a time', () => {
    expect(localDate('2026-09-13T09:00:00.000Z')).toBe('2026-09-13')
    expect(localDate('someday')).toBe('someday')
  })
})
