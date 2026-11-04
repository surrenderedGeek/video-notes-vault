import { describe, expect, it } from 'vitest'
import { normaliseTag, splitTags } from './tags.js'

describe('normaliseTag', () => {
  it('lower-cases and drops the hash', () => {
    expect(normaliseTag('#iOS')).toBe('ios')
    expect(normaliseTag('  ##AI ')).toBe('ai')
  })

  it('joins words with hyphens, since Obsidian tags cannot contain spaces', () => {
    expect(normaliseTag('Machine Learning')).toBe('machine-learning')
    expect(normaliseTag('rock & roll')).toBe('rock-roll')
  })

  it('keeps slashes for nested tags, and letters beyond ASCII', () => {
    expect(normaliseTag('Apple/iPhone')).toBe('apple/iphone')
    expect(normaliseTag('Café Crème')).toBe('café-crème')
  })

  it('rejects what Obsidian would not read as a tag', () => {
    expect(normaliseTag('')).toBeNull()
    expect(normaliseTag('###')).toBeNull()
    expect(normaliseTag('1984')).toBeNull()
    expect(normaliseTag('--')).toBeNull()
  })

  it('caps long tags without leaving a dangling hyphen', () => {
    const tag = normaliseTag(`${'a'.repeat(49)} b`)
    expect(tag).toBe('a'.repeat(49))
  })
})

describe('splitTags', () => {
  it('splits on commas and before hashtags, but not on spaces', () => {
    expect(splitTags('ios, swift')).toEqual(['ios', 'swift'])
    expect(splitTags('#ios #swift')).toEqual(['ios', 'swift'])
    expect(splitTags('machine learning')).toEqual(['machine-learning'])
  })

  it('drops empty parts and duplicates', () => {
    expect(splitTags('ios,, iOS ,')).toEqual(['ios'])
  })
})

