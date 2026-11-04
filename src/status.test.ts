import { describe, expect, it } from 'vitest'
import { effectiveStatus, isFinished, isVideoStatus } from './status.js'
import type { Note, VideoNotes } from './types.js'

const note: Note = { kind: 'timestamp', timestampSeconds: 5, text: '' }

function doc(meta: Partial<VideoNotes['meta']> = {}, notes: Note[] = []): VideoNotes {
  return { meta: { videoId: 'v', title: 'T', url: 'u', created: 'c', ...meta }, notes }
}

describe('isVideoStatus', () => {
  it('accepts only the three statuses', () => {
    expect(['to-watch', 'in-progress', 'done'].every(isVideoStatus)).toBe(true)
    expect(['', 'Done', 'watching', 'todo'].some(isVideoStatus)).toBe(false)
  })
})

describe('isFinished', () => {
  it('counts the last 5% of a video as the end', () => {
    expect(isFinished(94, 100)).toBe(false)
    expect(isFinished(95, 100)).toBe(true)
    expect(isFinished(100, 100)).toBe(true)
  })

  it('never calls a video of unknown length finished', () => {
    expect(isFinished(500, undefined)).toBe(false)
    expect(isFinished(500, 0)).toBe(false)
  })
})

describe('effectiveStatus', () => {
  it('keeps a status that was set, whatever the watching says', () => {
    expect(effectiveStatus(doc({ status: 'to-watch', duration: 100 }, [note]), 100)).toBe('to-watch')
  })

  it('works one out for notes from before statuses', () => {
    expect(effectiveStatus(doc({ duration: 100 }), 99)).toBe('done')
    expect(effectiveStatus(doc({ duration: 100 }), 30)).toBe('in-progress')
    expect(effectiveStatus(doc({}, [note]))).toBe('in-progress')
    expect(effectiveStatus(doc())).toBe('to-watch')
    expect(effectiveStatus(doc(), 0)).toBe('to-watch')
  })

  it("doesn't call a video done without knowing its length", () => {
    expect(effectiveStatus(doc(), 5000)).toBe('in-progress')
  })
})

