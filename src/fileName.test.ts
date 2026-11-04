import { describe, expect, it } from 'vitest'
import { lessonTitle, videoFileName } from './fileName.js'

describe('videoFileName', () => {
  it('turns what a path would take for its own into dashes', () => {
    expect(videoFileName('L1: Gender | The Noun', 'x')).toBe('L1- Gender - The Noun')
  })
})

describe('lessonTitle', () => {
  const course = 'Arabic Grammar in 40 Lessons'

  it('drops the course and whatever follows it', () => {
    expect(lessonTitle('L1: Gender | The Noun | Arabic Grammar in 40 Lessons | Dr Shadee Elmasry', course)).toBe('L1: Gender | The Noun')
    expect(lessonTitle('Kalam & Its Components | Introduction | Arabic Grammar in 40 Lessons | Dr Shadee Elmasry', course)).toBe('Kalam & Its Components | Introduction')
  })

  it('drops a course the title starts with', () => {
    expect(lessonTitle('Arabic Grammar in 40 Lessons: L1', course)).toBe('L1')
    expect(lessonTitle('arabic grammar in 40 lessons - L2', course)).toBe('L2')
  })

  it('leaves a title without the course, or with it only inside a part', () => {
    expect(lessonTitle('Upgrade 1: Using data and technology', 'Decision Intelligence')).toBe('Upgrade 1: Using data and technology')
    expect(lessonTitle('Learning Pythonic ways', 'Python')).toBe('Learning Pythonic ways')
    expect(lessonTitle('Arabic Grammar in 40 Lessons', course)).toBe('Arabic Grammar in 40 Lessons')
    expect(lessonTitle('Anything', '')).toBe('Anything')
  })
})
