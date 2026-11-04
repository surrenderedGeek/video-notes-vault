import { describe, expect, it } from 'vitest'
import { newerPosition, samePosition } from './resume.js'

describe('newerPosition', () => {
  const here = { seconds: 100, updated: 2_000 }
  const there = { seconds: 900, updated: 3_000 }

  it('is whichever was watched last, wherever that was', () => {
    expect(newerPosition(here, there)).toBe(there)
    expect(newerPosition(there, here)).toBe(there)
  })

  it('is whichever there is, when only one side has one', () => {
    expect(newerPosition(here, undefined)).toBe(here)
    expect(newerPosition(undefined, there)).toBe(there)
    expect(newerPosition(undefined, undefined)).toBeUndefined()
  })

  it("takes the note's for two kept at the same time: it differs only when someone changed it by hand", () => {
    const edited = { seconds: 900, updated: here.updated }
    expect(newerPosition(here, edited)).toBe(edited)
  })
})

describe('samePosition', () => {
  it('is the same moment kept at the same time, and none on either side', () => {
    expect(samePosition({ seconds: 10, updated: 1 }, { seconds: 10, updated: 1 })).toBe(true)
    expect(samePosition(undefined, undefined)).toBe(true)
    expect(samePosition({ seconds: 10, updated: 1 }, { seconds: 11, updated: 1 })).toBe(false)
    expect(samePosition({ seconds: 10, updated: 1 }, { seconds: 10, updated: 2 })).toBe(false)
    expect(samePosition({ seconds: 10, updated: 1 }, undefined)).toBe(false)
  })
})
