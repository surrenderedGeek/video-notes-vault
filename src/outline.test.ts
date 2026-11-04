import { describe, expect, it } from 'vitest'
import { chapterIndexAt, outline, type OutlineRow } from './outline.js'
import type { Note } from './types.js'

const note = (seconds: number, kind: Note['kind'] = 'text'): Note => ({ kind, timestampSeconds: seconds, text: `at ${seconds}` })
const chapters = [
  { title: 'Intro', startSeconds: 0 },
  { title: 'CIA Career', startSeconds: 124 },
  { title: 'Cuba', startSeconds: 2007 },
]
const shape = (rows: OutlineRow[]) => rows.map((row) => (row.kind === 'chapter' ? row.chapter.title : row.note.timestampSeconds))

describe('chapterIndexAt', () => {
  it('finds the last chapter to start at or before a moment', () => {
    expect(chapterIndexAt(chapters, 0)).toBe(0)
    expect(chapterIndexAt(chapters, 123)).toBe(0)
    expect(chapterIndexAt(chapters, 124)).toBe(1)
    expect(chapterIndexAt(chapters, 5000)).toBe(2)
    expect(chapterIndexAt([{ title: 'Late', startSeconds: 10 }], 5)).toBe(-1)
    expect(chapterIndexAt(undefined, 5)).toBe(-1)
  })
})

describe('outline', () => {
  it('puts every kind of note under the chapter its moment falls in, and keeps chapters with none', () => {
    const notes = [note(2), note(130, 'screenshot'), note(124, 'transcript'), note(2100)]
    expect(shape(outline(notes, chapters))).toEqual(['Intro', 2, 'CIA Career', 130, 124, 'Cuba', 2100])
  })

  it('points each note row at the note’s place in the document', () => {
    const notes = [note(2100), note(2)]
    const rows = outline(notes, chapters).flatMap((row) => (row.kind === 'note' ? [row.index] : []))
    expect(rows).toEqual([1, 0])
  })

  it('lists notes before the first chapter above it, and just the notes without chapters', () => {
    expect(shape(outline([note(1), note(20)], [{ title: 'Later', startSeconds: 10 }]))).toEqual([1, 'Later', 20])
    expect(shape(outline([note(1), note(20)]))).toEqual([1, 20])
    expect(outline([], chapters).every((row) => row.kind === 'chapter')).toBe(true)
  })

  it('sorts chapters by their start', () => {
    expect(shape(outline([], [chapters[2], chapters[0], chapters[1]]))).toEqual(['Intro', 'CIA Career', 'Cuba'])
  })
})

