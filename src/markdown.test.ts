import { describe, expect, it } from 'vitest'
import { parse, serialise } from './markdown.js'
import type { VideoNotes } from './types.js'

const meta = {
  videoId: 'jNQXAC9IVRw',
  title: 'Me at the zoo',
  url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  channel: 'jawed',
  duration: 19,
  created: '2026-09-07T10:15:00.000Z',
}

const link = (seconds: number) => `https://www.youtube.com/watch?v=jNQXAC9IVRw&t=${seconds}s`

const sample: VideoNotes = {
  meta,
  notes: [
    { kind: 'text', timestampSeconds: 3, text: 'Opening shot' },
    { kind: 'text', timestampSeconds: 754, text: 'The three signs' },
  ],
}

describe('serialise', () => {
  it('writes frontmatter and one list item per note', () => {
    const output = serialise(sample)

    expect(output).toContain('videoId: jNQXAC9IVRw')
    expect(output).toContain('title: "Me at the zoo"')
    expect(output).toContain('channel: "jawed"')
    expect(output).toContain(`- [0:03](${link(3)}) Opening shot`)
    expect(output).toContain(`- [12:34](${link(754)}) The three signs`)
  })

  it('omits optional fields that are absent', () => {
    const output = serialise({ meta: { ...meta, channel: undefined, duration: undefined }, notes: [] })

    expect(output).not.toContain('channel:')
    expect(output).not.toContain('duration:')
    expect(output).not.toContain('status:')
  })

  it('writes the status as a plain property Obsidian can filter on', () => {
    const output = serialise({ meta: { ...meta, status: 'in-progress' }, notes: [] })
    expect(output).toContain('channel: "jawed"\nstatus: in-progress\n')
  })

  it('escapes quotes in titles so the frontmatter stays valid', () => {
    const output = serialise({ meta: { ...meta, title: 'He said "hello"' }, notes: [] })
    expect(output).toContain('title: "He said \\"hello\\""')
  })

  it('writes screenshots as an image nested under the item, with a relative path', () => {
    const output = serialise({
      meta,
      notes: [{ kind: 'screenshot', timestampSeconds: 195, text: '', image: 'attachments/jNQXAC9IVRw-195.jpg' }],
    })

    expect(output).toContain(`- [3:15](${link(195)}) 📷\n  ![3:15](attachments/jNQXAC9IVRw-195.jpg)`)
  })

  it('writes tags as a YAML list, the way Obsidian writes its tags property', () => {
    const output = serialise({ meta: { ...meta, tags: ['ios', 'machine-learning'] }, notes: [] })
    expect(output).toContain('channel: "jawed"\ntags:\n  - ios\n  - machine-learning\n')
  })

  it('writes transcripts as a range label with a nested quote', () => {
    const output = serialise({
      meta,
      notes: [{ kind: 'transcript', timestampSeconds: 180, endSeconds: 210, text: 'what was said' }],
    })

    expect(output).toContain(`- [3:00–3:30](${link(180)}) 💬\n  > what was said`)
  })
})

describe('parse', () => {
  it('round-trips a document without loss', () => {
    expect(parse(serialise(sample))).toEqual(sample)
  })

  it('round-trips every kind of note', () => {
    const everything: VideoNotes = {
      meta,
      notes: [
        { kind: 'timestamp', timestampSeconds: 5, text: '' },
        { kind: 'text', timestampSeconds: 10, text: 'A thought' },
        { kind: 'screenshot', timestampSeconds: 20, text: '', image: 'attachments/jNQXAC9IVRw-20.jpg' },
        { kind: 'screenshot', timestampSeconds: 25, text: 'The key slide', image: 'attachments/jNQXAC9IVRw-25.jpg' },
        { kind: 'transcript', timestampSeconds: 30, endSeconds: 60, text: 'all right so here we are' },
      ],
    }
    expect(parse(serialise(everything))).toEqual(everything)
  })

  it('round-trips block IDs on notes', () => {
    const withIds: VideoNotes = {
      meta,
      notes: [
        { id: 'k3f9qa', kind: 'text', timestampSeconds: 10, text: 'A thought' },
        { id: 'ab12cd', kind: 'screenshot', timestampSeconds: 20, text: 'Caption', image: 'attachments/pic.jpg' },
      ],
    }
    expect(parse(serialise(withIds))).toEqual(withIds)
  })

  it('round-trips chapters and keeps notes under chapters', () => {
    const withChapters: VideoNotes = {
      meta,
      chapters: [
        { title: 'Intro', startSeconds: 0 },
        { title: 'Main Part', startSeconds: 100 },
      ],
      notes: [
        { kind: 'text', timestampSeconds: 10, text: 'In intro' },
        { kind: 'text', timestampSeconds: 120, text: 'In main part' },
      ],
    }
    expect(parse(serialise(withChapters))).toEqual(withChapters)
  })
})

describe('a LinkedIn Learning lesson', () => {
  const lesson = {
    videoId: 'react-essential-training/using-hooks',
    platform: 'linkedin-learning' as const,
    title: 'Using hooks',
    url: 'https://www.linkedin.com/learning/react-essential-training/using-hooks',
    created: '2026-09-07T10:15:00.000Z',
  }
  const notes: VideoNotes = { meta: lesson, notes: [{ kind: 'text', timestampSeconds: 90, text: 'Hooks' }] }

  it('links each note to the lesson at its moment, and says where the video is from', () => {
    const output = serialise(notes)

    expect(output).toContain('platform: linkedin-learning')
    expect(output).toContain(`- [1:30](${lesson.url}?t=90) Hooks`)
  })

  it('reads the platform back, whether from its own line or from the source alone', () => {
    const parsed = parse(serialise(notes))
    expect(parsed?.meta).toMatchObject({ platform: 'linkedin-learning', url: lesson.url })
    expect(parsed?.notes).toEqual([expect.objectContaining({ timestampSeconds: 90, text: 'Hooks' })])

    const fromSource = parse(['---', `videoId: ${lesson.videoId}`, `source: ${lesson.url}`, '---', ''].join('\n'))
    expect(fromSource?.meta.platform).toBe('linkedin-learning')
    expect(parse(serialise(sample))?.meta).not.toHaveProperty('platform')
  })
})
