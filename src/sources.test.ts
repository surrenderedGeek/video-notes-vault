import { describe, expect, it } from 'vitest'
import { courseUrl, lessonParts, momentUrl, parseVideoLink, platformOf, skoolParts, sourceUrl } from './sources.js'

const LESSON = 'https://www.linkedin.com/learning/react-essential-training/using-hooks'

describe('telling the platforms apart', () => {
  it('reads a LinkedIn Learning lesson link as the lesson in its course, and a course link as the course', () => {
    expect(parseVideoLink(`${LESSON}?autoSkip=true&resume=false&u=2113185`)).toEqual({
      platform: 'linkedin-learning',
      videoId: 'react-essential-training/using-hooks',
      listId: 'react-essential-training',
    })
    expect(parseVideoLink('linkedin.com/learning/react-essential-training')).toEqual({
      platform: 'linkedin-learning',
      videoId: null,
      listId: 'react-essential-training',
    })
  })

  it("leaves LinkedIn Learning's own pages alone", () => {
    expect(parseVideoLink('https://www.linkedin.com/learning/topics/python')).toBeNull()
    expect(parseVideoLink('https://www.linkedin.com/learning/me?u=1')).toBeNull()
    expect(parseVideoLink('https://www.linkedin.com/in/someone/')).toBeNull()
  })

  it('still reads YouTube links, and refuses the rest', () => {
    expect(parseVideoLink('https://youtu.be/dQw4w9WgXcQ?list=PLZ6keVEpgaQsvR9l8aFJp80LA2MJ9zj8E')).toEqual({
      platform: 'youtube',
      videoId: 'dQw4w9WgXcQ',
      listId: 'PLZ6keVEpgaQsvR9l8aFJp80LA2MJ9zj8E',
    })
    expect(parseVideoLink('https://www.youtube.com/playlist?list=PLZ6keVEpgaQsvR9l8aFJp80LA2MJ9zj8E')).toMatchObject({ videoId: null })
    expect(parseVideoLink('https://vimeo.com/123')).toBeNull()
    expect(parseVideoLink('  ')).toBeNull()
  })

  it('tells the platform of a video that never said, by its address or the shape of its id', () => {
    expect(platformOf({ videoId: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toBe('youtube')
    expect(platformOf({ videoId: 'react-essential-training/using-hooks', url: LESSON })).toBe('linkedin-learning')
    expect(platformOf({ videoId: 'react-essential-training/using-hooks' })).toBe('linkedin-learning')
    expect(platformOf({ videoId: 'x', platform: 'udemy' })).toBe('udemy')
  })

  it('links to a moment the way each platform takes it', () => {
    expect(momentUrl({ videoId: 'dQw4w9WgXcQ' }, 90.7)).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s')
    expect(momentUrl({ videoId: 'react-essential-training/using-hooks', url: LESSON }, 90.7)).toBe(`${LESSON}?t=90`)
    expect(momentUrl({ videoId: 'react-essential-training/using-hooks', url: `${LESSON}?u=1` }, 5)).toBe(`${LESSON}?u=1&t=5`)
  })

  it("knows a video's page and its course's page without being told", () => {
    expect(sourceUrl({ videoId: 'react-essential-training/using-hooks' })).toBe(LESSON)
    expect(sourceUrl({ videoId: 'dQw4w9WgXcQ' })).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(courseUrl('linkedin-learning', 'react-essential-training')).toBe('https://www.linkedin.com/learning/react-essential-training')
    expect(courseUrl('youtube', 'PLabc')).toBe('https://www.youtube.com/playlist?list=PLabc')
    expect(lessonParts('react-essential-training/using-hooks')).toEqual({ course: 'react-essential-training', lesson: 'using-hooks' })
    expect(lessonParts('dQw4w9WgXcQ')).toBeNull()
  })
})

const SKOOL_LESSON = 'https://www.skool.com/muslimfilmmakers/classroom/1e816385?md=ca63f60a0e5c44d7868c0ae0f681942d'
const SKOOL_ID = 'skool:muslimfilmmakers:1e816385:ca63f60a0e5c44d7868c0ae0f681942d'

describe('Skool', () => {
  it('reads a lesson link as the lesson in its course, and a classroom link without one as the course', () => {
    expect(parseVideoLink(SKOOL_LESSON)).toEqual({ platform: 'skool', videoId: SKOOL_ID, listId: 'skool:muslimfilmmakers:1e816385' })
    expect(parseVideoLink('skool.com/muslimfilmmakers/classroom/1e816385')).toEqual({
      platform: 'skool',
      videoId: null,
      listId: 'skool:muslimfilmmakers:1e816385',
    })
  })

  it("leaves Skool's other pages alone", () => {
    expect(parseVideoLink('https://www.skool.com/muslimfilmmakers/classroom')).toBeNull()
    expect(parseVideoLink('https://www.skool.com/muslimfilmmakers/about')).toBeNull()
    expect(parseVideoLink('https://www.skool.com/discovery')).toBeNull()
  })

  it('tells a Skool lesson by its address or its id, never as LinkedIn Learning', () => {
    expect(platformOf({ videoId: SKOOL_ID })).toBe('skool')
    expect(platformOf({ videoId: 'x', url: SKOOL_LESSON })).toBe('skool')
    expect(SKOOL_ID).not.toContain('/')
  })

  it('rebuilds the lesson, course and moment addresses from the id', () => {
    expect(sourceUrl({ videoId: SKOOL_ID })).toBe(SKOOL_LESSON)
    expect(courseUrl('skool', 'skool:muslimfilmmakers:1e816385')).toBe('https://www.skool.com/muslimfilmmakers/classroom/1e816385')
    expect(momentUrl({ videoId: SKOOL_ID }, 90.7)).toBe(`${SKOOL_LESSON}&t=90`)
    expect(skoolParts(SKOOL_ID)).toEqual({ group: 'muslimfilmmakers', course: '1e816385', lesson: 'ca63f60a0e5c44d7868c0ae0f681942d' })
    expect(skoolParts('skool:muslimfilmmakers:1e816385')).toEqual({ group: 'muslimfilmmakers', course: '1e816385' })
    expect(skoolParts('dQw4w9WgXcQ')).toBeNull()
  })
})
