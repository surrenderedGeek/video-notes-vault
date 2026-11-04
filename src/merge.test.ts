import { describe, expect, it } from 'vitest'
import { mergeNotes, mergeStatus, mergeTags, mergeValue, sameContent, tooManyRemovals } from './merge.js'
import type { SyncedNote } from './types.js'

describe('mergeNotes', () => {
  const synced = (id: string, time: number, text: string, extra: Partial<SyncedNote> = {}): SyncedNote => ({
    id,
    kind: 'text',
    time,
    text,
    ...extra,
  })
  const ids = () => {
    let next = 0
    return () => `new${next++}`
  }
  const summary = (result: ReturnType<typeof mergeNotes>) => ({
    merged: result.merged.map(({ note, from }) => `${from}:${note.id}:${note.text}`),
    removedHere: result.removedHere,
    removedThere: result.removedThere.map((note) => note.id),
    conflicts: result.conflicts,
  })

  const base = [synced('a', 10, 'agreed')]

  it('keeps a note both sides still agree on, in the bullet Notion has', () => {
    const result = mergeNotes(base, [synced('a', 10, 'agreed')], [synced('a', 10, 'agreed', { blocks: ['b1'] })], { newId: ids() })
    expect(result.merged).toEqual([
      { note: synced('a', 10, 'agreed', { blocks: ['b1'] }), from: 'here', there: synced('a', 10, 'agreed', { blocks: ['b1'] }) },
    ])
  })

  it('takes each side’s own edit', () => {
    expect(summary(mergeNotes(base, [synced('a', 10, 'mine')], [synced('a', 10, 'agreed')], { newId: ids() })).merged).toEqual([
      'here:a:mine',
    ])
    expect(summary(mergeNotes(base, [synced('a', 10, 'agreed')], [synced('a', 10, 'theirs')], { newId: ids() })).merged).toEqual([
      'there:a:theirs',
    ])
  })

  it('keeps both versions of a note each side changed differently', () => {
    expect(summary(mergeNotes(base, [synced('a', 10, 'mine')], [synced('a', 10, 'theirs')], { newId: ids() }))).toEqual({
      merged: ['here:a:mine', 'there:new0:theirs'],
      removedHere: [],
      removedThere: [],
      conflicts: 1,
    })
  })

  it('is no conflict when both sides made the same edit', () => {
    const result = mergeNotes(base, [synced('a', 10, 'same')], [synced('a', 10, ' same ')], { newId: ids() })
    expect(summary(result)).toMatchObject({ merged: ['here:a:same'], conflicts: 0 })
  })

  it('removes a note one side deleted and the other left alone', () => {
    expect(summary(mergeNotes(base, [], [synced('a', 10, 'agreed')], { newId: ids() }))).toMatchObject({
      merged: [],
      removedThere: ['a'],
    })
    expect(summary(mergeNotes(base, [synced('a', 10, 'agreed')], [], { newId: ids() }))).toMatchObject({
      merged: [],
      removedHere: ['a'],
    })
  })

  it('keeps a note one side deleted but the other edited', () => {
    expect(summary(mergeNotes(base, [], [synced('a', 10, 'theirs')], { newId: ids() })).merged).toEqual(['there:a:theirs'])
    expect(summary(mergeNotes(base, [synced('a', 10, 'mine')], [], { newId: ids() })).merged).toEqual(['here:a:mine'])
  })

  it('removes nothing when told to keep everything', () => {
    const result = mergeNotes(base, [], [synced('a', 10, 'agreed')], { newId: ids(), keepEverything: true })
    expect(summary(result)).toMatchObject({ merged: ['there:a:agreed'], removedThere: [] })
  })

  it('keeps notes new on either side, in time order', () => {
    const result = mergeNotes(undefined, [synced('m', 30, 'mine')], [synced('t', 20, 'theirs')], { newId: ids() })
    expect(summary(result).merged).toEqual(['there:t:theirs', 'here:m:mine'])
  })
})

describe('sameContent', () => {
  const text = { kind: 'text' as const, time: 10, text: 'words' }

  it('ignores where a note lives and whether it has its image', () => {
    expect(sameContent(text, { ...text, kind: 'screenshot' })).toBe(true)
    expect(sameContent(text, { ...text, text: '  words\n' })).toBe(true)
  })

  it('tells apart a different moment, words, or transcript range', () => {
    expect(sameContent(text, { ...text, time: 11 })).toBe(false)
    expect(sameContent(text, { ...text, text: 'other' })).toBe(false)
    expect(sameContent(text, { ...text, kind: 'transcript', end: 10 })).toBe(false)
    const clip = { kind: 'transcript' as const, time: 10, end: 30, text: 'words' }
    expect(sameContent(clip, { ...clip, end: 40 })).toBe(false)
    expect(sameContent({ ...clip, end: undefined }, { ...clip, end: 10 })).toBe(true)
  })
})

describe('tooManyRemovals', () => {
  const removing = (here: number, there: number) => ({
    merged: [],
    removedHere: Array.from({ length: here }, (_, i) => `h${i}`),
    removedThere: Array.from({ length: there }, (_, i) => ({ id: `t${i}`, kind: 'text' as const, time: i, text: '' })),
    conflicts: 0,
  })
  const of = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `n${i}`, kind: 'text' as const, time: i, text: '' }))

  it('lets tidying up through: a couple of notes, or no more than half', () => {
    expect(tooManyRemovals(removing(2, 0), of(2))).toBe(false)
    expect(tooManyRemovals(removing(0, 3), of(6))).toBe(false)
  })

  it('stops to ask before most of a video’s notes go at once', () => {
    expect(tooManyRemovals(removing(3, 0), of(4))).toBe(true)
    expect(tooManyRemovals(removing(0, 4), of(6))).toBe(true)
  })
})

describe('mergeStatus', () => {
  it("keeps this side's status when the page shows none, or the same", () => {
    expect(mergeStatus('done', 'done', undefined)).toBe('done')
    expect(mergeStatus(undefined, 'in-progress', undefined)).toBe('in-progress')
    expect(mergeStatus('to-watch', 'done', 'done')).toBe('done')
  })

  it('takes the side that changed since they last agreed, whichever way it went', () => {
    expect(mergeStatus('done', 'done', 'in-progress')).toBe('in-progress')
    expect(mergeStatus('in-progress', 'to-watch', 'in-progress')).toBe('to-watch')
  })

  it('takes the status further along when there is no agreement to go by, or both sides changed', () => {
    expect(mergeStatus(undefined, 'done', 'to-watch')).toBe('done')
    expect(mergeStatus(undefined, 'in-progress', 'done')).toBe('done')
    expect(mergeStatus('to-watch', 'in-progress', 'done')).toBe('done')
    expect(mergeStatus('done', 'in-progress', 'to-watch')).toBe('in-progress')
  })
})

describe('mergeTags', () => {
  it('adds a tag added on either side, and drops one dropped on either', () => {
    expect(mergeTags(['a', 'b'], ['a', 'b', 'mine'], ['a', 'theirs'])).toEqual(['a', 'mine', 'theirs'])
  })

  it('keeps every tag from both the first time they meet, and this side’s when the other says nothing', () => {
    expect(mergeTags(undefined, ['a'], ['b'])).toEqual(['a', 'b'])
    expect(mergeTags(['a'], ['a', 'b'], undefined)).toEqual(['a', 'b'])
  })
})

describe('mergeValue', () => {
  it('takes a change made on one side only, and otherwise keeps this side’s', () => {
    expect(mergeValue('old', 'old', 'renamed there')).toBe('renamed there')
    expect(mergeValue('old', 'renamed here', 'old')).toBe('renamed here')
    expect(mergeValue('old', 'mine', 'theirs')).toBe('mine')
    expect(mergeValue(undefined, 'mine', 'theirs')).toBe('mine')
    expect(mergeValue('old', 'mine', undefined)).toBe('mine')
  })
})
