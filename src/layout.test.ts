import { describe, expect, it } from 'vitest'
import { courseFolderName, courseNotePaths, isScreenshotPath, notePaths, screenshotPath } from './layout.js'

describe('notePaths', () => {
  it('gives a video a folder of its own, named after it, with its id too for when that is taken', () => {
    expect(notePaths({ videoId: 'jNQXAC9IVRw', title: 'Me at the zoo' })).toEqual([
      'Me at the zoo/Me at the zoo.md',
      'Me at the zoo (jNQXAC9IVRw)/Me at the zoo (jNQXAC9IVRw).md',
    ])
  })

  it("puts a lesson in its course's folder, under its name there", () => {
    const lesson = { videoId: 'GK-3EWM8-X0', title: 'L1: Gender | The Noun | Arabic Grammar in 40 Lessons' }
    expect(notePaths(lesson, { course: 'Arabic Grammar in 40 Lessons', lesson: 'L1: Gender | The Noun' })).toEqual([
      'Arabic Grammar in 40 Lessons/L1- Gender - The Noun.md',
      'Arabic Grammar in 40 Lessons/L1- Gender - The Noun (GK-3EWM8-X0).md',
    ])
  })

  it('keeps the slash in a LinkedIn Learning id out of the path', () => {
    expect(notePaths({ videoId: 'react-essential-training/using-hooks', title: '' })[0]).toBe(
      'react-essential-training-using-hooks/react-essential-training-using-hooks.md',
    )
  })
})

describe('Skool ids in paths', () => {
  it("keeps a Skool id's colons out of the path, for a lesson and its course", () => {
    expect(notePaths({ videoId: 'skool:group:abc:def', title: 'Intro' })[1]).toBe('Intro (skool-group-abc-def)/Intro (skool-group-abc-def).md')
    expect(courseNotePaths('Module 2', 'skool:group:abc')[1]).toBe('Module 2 (skool-group-abc)/Module 2 (skool-group-abc).md')
  })
})

describe("a course's note", () => {
  it('lives in a folder of the same name', () => {
    expect(courseNotePaths('Arabic Grammar in 40 Lessons', 'PLabc')).toEqual([
      'Arabic Grammar in 40 Lessons/Arabic Grammar in 40 Lessons.md',
      'Arabic Grammar in 40 Lessons (PLabc)/Arabic Grammar in 40 Lessons (PLabc).md',
    ])
  })

  it("never names it with Obsidian's comment mark", () => {
    expect(courseFolderName('100%% Done', 'PLabc')).toBe('100% Done')
  })
})

describe('screenshots', () => {
  it('are named after their video, moment and picture, with the picture’s own extension', () => {
    expect(screenshotPath('jNQXAC9IVRw', 12.7, 'data:image/jpeg;base64,/9j/4AAQ')).toBe('attachments/jNQXAC9IVRw-12-1bo559h.jpg')
    expect(screenshotPath('react-essential-training/using-hooks', 5, 'data:image/webp;base64,AAAA')).toMatch(
      /^attachments\/react-essential-training-using-hooks-5-[0-9a-z]+\.webp$/,
    )
    expect(screenshotPath('jNQXAC9IVRw', 1, 'data:application/octet-stream;base64,AAAA')).toMatch(/\.png$/)
  })

  it('are only ever in the attachments folder', () => {
    expect(isScreenshotPath('attachments/jNQXAC9IVRw-12-1bo559h.jpg')).toBe(true)
    for (const path of ['attachments/../secret.md', 'attachments/a/b.png', '../attachments/a.png', 'other/a.png', 'attachments\\a.png']) {
      expect(isScreenshotPath(path)).toBe(false)
    }
  })
})
