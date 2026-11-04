import { describe, expect, it } from 'vitest'
import { parsePlaylistId, parseVideoId, playlistUrl, timestampUrl, watchUrl } from './youtube.js'

describe('parseVideoId', () => {
  it('handles 11-char bare id', () => {
    expect(parseVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('handles full youtube.com url', () => {
    expect(parseVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share')).toBe('dQw4w9WgXcQ')
  })

  it('handles youtu.be short url', () => {
    expect(parseVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('handles embed and shorts urls', () => {
    expect(parseVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(parseVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for invalid inputs', () => {
    expect(parseVideoId('')).toBeNull()
    expect(parseVideoId('not-a-valid-id')).toBeNull()
  })
})

describe('watchUrl and timestampUrl', () => {
  it('link to the video, and to a whole second in it', () => {
    expect(watchUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(timestampUrl('dQw4w9WgXcQ', 65.9)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=65s')
  })
})

describe('parseVideoId, more shapes', () => {
  it.each([
    ['youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=42', 'dQw4w9WgXcQ'],
    ['  dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
  ])('finds the video in %s', (input, id) => {
    expect(parseVideoId(input)).toBe(id)
  })

  it.each([
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/@channel',
    'https://youtu.be/',
    'https://vimeo.com/dQw4w9WgXcQ',
    'https://notyoutube.test/watch?v=dQw4w9WgXcQ',
    'http://[bad',
  ])('finds no video in %s', (input) => {
    expect(parseVideoId(input)).toBeNull()
  })
})

describe('parsePlaylistId', () => {
  const LIST = 'PLZ6keVEpgaQsvR9l8aFJp80LA2MJ9zj8E'

  it('reads the playlist out of a link to its page, to a video in it, or out of the id itself', () => {
    expect(parsePlaylistId(`https://www.youtube.com/playlist?list=${LIST}`)).toBe(LIST)
    expect(parsePlaylistId(`https://www.youtube.com/watch?v=KWa1au9xeLU&list=${LIST}&index=1`)).toBe(LIST)
    expect(parsePlaylistId(`  youtube.com/playlist?list=${LIST}  `)).toBe(LIST)
    expect(parsePlaylistId(LIST)).toBe(LIST)
  })

  it("reads the playlist out of YouTube's Share link and the phone site's links", () => {
    expect(parsePlaylistId(`https://youtu.be/KWa1au9xeLU?list=${LIST}&si=abc`)).toBe(LIST)
    expect(parsePlaylistId(`https://m.youtube.com/watch?v=KWa1au9xeLU&list=${LIST}`)).toBe(LIST)
    expect(parsePlaylistId('https://youtu.be/KWa1au9xeLU')).toBeNull()
  })

  it('says nothing of a link that names no playlist', () => {
    expect(parsePlaylistId('https://www.youtube.com/watch?v=KWa1au9xeLU')).toBeNull()
    expect(parsePlaylistId('https://vimeo.com/123')).toBeNull()
    expect(parsePlaylistId('')).toBeNull()
  })

  it('addresses a playlist by its page', () => {
    expect(playlistUrl(LIST)).toBe(`https://www.youtube.com/playlist?list=${LIST}`)
  })
})
