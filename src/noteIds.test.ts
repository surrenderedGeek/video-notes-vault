import { describe, expect, it } from 'vitest'
import { newNoteId, withNoteIds } from './noteIds.js'
import type { Note, VideoNotes } from './types.js'

/** Math.random stand-in that plays back `values` in a loop. */
function sequence(...values: number[]): () => number {
  let index = 0
  return () => values[index++ % values.length]
}

// Where each character falls in the id alphabet: a–z, then 0–9.
const A = 0
const Z = 25 / 36
const ZERO = 26 / 36

function doc(notes: Note[]): VideoNotes {
  return { meta: { videoId: 'v', title: 't', url: 'u', created: 'c' }, notes }
}

const note = (text: string, id?: string): Note => ({ kind: 'text', timestampSeconds: 1, text, ...(id ? { id } : {}) })

describe('newNoteId', () => {
  it('makes six letters and digits', () => {
    expect(newNoteId(new Set())).toMatch(/^[a-z0-9]{6}$/)
  })

  it('never makes one that reads as a number', () => {
    const random = sequence(...Array(6).fill(ZERO), ...Array(6).fill(A))
    expect(newNoteId(new Set(), random)).toBe('aaaaaa')
  })

  it('never makes one already taken', () => {
    const random = sequence(...Array(6).fill(A), ...Array(6).fill(Z))
    expect(newNoteId(new Set(['aaaaaa']), random)).toBe('zzzzzz')
  })
})

describe('withNoteIds', () => {
  it('hands back the same document when every note already has its own id', () => {
    const original = doc([note('a', 'id0001'), note('b', 'id0002')])
    expect(withNoteIds(original)).toBe(original)
  })

  it('gives notes without one a new id, leaving the original untouched', () => {
    const original = doc([note('kept', 'k3f9qa'), note('new')])
    const result = withNoteIds(original)

    expect(result.notes[0].id).toBe('k3f9qa')
    expect(result.notes[1].id).toMatch(/^[a-z0-9]{6}$/)
    expect(result.notes[1].id).not.toBe('k3f9qa')
    expect(original.notes[1].id).toBeUndefined()
  })

  it('treats a copied line as a new note: the first keeps the id, the copy gets its own', () => {
    const result = withNoteIds(doc([note('original', 'k3f9qa'), note('copy', 'k3f9qa')]))

    expect(result.notes[0].id).toBe('k3f9qa')
    expect(result.notes[1].id).not.toBe('k3f9qa')
  })

  it('never hands out an id another note in the document has', () => {
    // The first draw collides with the note further down; it must be skipped.
    const random = sequence(...Array(6).fill(Z), ...Array(6).fill(A))
    const result = withNoteIds(doc([note('new'), note('later', 'zzzzzz')]), random)

    expect(result.notes.map((n) => n.id)).toEqual(['aaaaaa', 'zzzzzz'])
  })
})
