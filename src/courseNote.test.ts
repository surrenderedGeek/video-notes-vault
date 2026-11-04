import { describe, expect, it } from 'vitest'
import { courseIdIn, readCourseList, readCourseNote, renderCourseNote, type CourseContent } from './courseNote.js'

const LIST = 'PLZ6keVEpgaQsvR9l8aFJp80LA2MJ9zj8E'

const course = (lessons: CourseContent['lessons'] = [], extra: Partial<CourseContent> = {}): CourseContent => ({
  listId: LIST,
  title: 'Arabic Grammar in 40 Lessons',
  channel: 'Safina Society',
  lessons,
  ...extra,
})

const lessons: CourseContent['lessons'] = [
  { videoId: 'KWa1au9xeLU', title: 'Kalam & Its Components', note: 'Kalam & Its Components - Introduction' },
  { videoId: 'Uzp0xbqNTQ4', title: 'Indicators of the Ism [part 2]' },
]

/** Brings a note up to date as the sync does: read it, then write it again. */
const again = (text: string, content = course(lessons)) => renderCourseNote(content, readCourseNote(text)!)

describe("a course's note", () => {
  it('names the playlist, keeps a table of its lessons, and lists every video, linking the notes it has', () => {
    const text = renderCourseNote(course(lessons))

    expect(text.startsWith(
      [
        '---',
        'title: "Arabic Grammar in 40 Lessons"',
        `playlistId: ${LIST}`,
        `source: https://www.youtube.com/playlist?list=${LIST}`,
        'channel: "Safina Society"',
        'videos: 2',
        '---',
        '',
        '## Progress',
        '',
        '```base',
      ].join('\n'),
    )).toBe(true)
    expect(text).toContain('    - list(playlist).contains(this)')
    expect(text).toContain(
      [
        '## Videos',
        '',
        '1. [[Kalam & Its Components - Introduction]]',
        `2. [Indicators of the Ism \\[part 2\\]](https://www.youtube.com/watch?v=Uzp0xbqNTQ4&list=${LIST})`,
        '',
        '## Notes',
        '',
      ].join('\n'),
    )
    expect(text.endsWith('## Notes\n')).toBe(true)
  })

  it('is written the same way again when nothing changed', () => {
    const text = renderCourseNote(course(lessons))
    expect(again(text)).toBe(text)
    expect(again(again(text))).toBe(text)
  })

  it('keeps everything that is the user’s while its list follows the playlist', () => {
    const edited = renderCourseNote(course(lessons))
      .replace('videos: 2\n', 'videos: 2\ntags:\n  - arabic\n')
      .replace('    name: Lessons', '    name: My lessons')
      .replace('## Notes\n', '## Notes\n\nStart with the verbs.\n\n## My own heading\n\nMore of mine.\n')

    const text = again(edited, course([...lessons, { videoId: 'kRh5fMFWmX0', title: 'The verb' }]))

    expect(text).toContain('videos: 3\ntags:\n  - arabic\n---')
    expect(text).toContain('    name: My lessons')
    expect(text).toContain('## Notes\n\nStart with the verbs.\n\n## My own heading\n\nMore of mine.\n')
    expect(text).toContain(`3. [The verb](https://www.youtube.com/watch?v=kRh5fMFWmX0&list=${LIST})\n\n## Notes`)
  })

  it('links a lesson once it has a note', () => {
    const text = renderCourseNote(course(lessons))
    const noted = lessons.map((lesson) => ({ ...lesson, note: lesson.note ?? 'Indicators of the Ism' }))

    expect(again(text, course(noted))).toContain('2. [[Indicators of the Ism]]\n')
  })

  it('puts the list of videos back when it was taken out', () => {
    const text = renderCourseNote(course(lessons)).replace(/## Videos\n[\s\S]*?(?=## Notes)/, '')
    const back = again(text)

    expect(back).toMatch(/## Notes\n\n## Videos\n\n1\. \[\[Kalam/)
    expect(again(back)).toBe(back)
  })

  it('takes nothing inside a code block for a heading', () => {
    // A snippet under Progress, above the real list, that looks like its heading.
    const text = renderCourseNote(course(lessons)).replace('## Videos\n', '```md\n## Videos\nmy snippet\n```\n\n## Videos\n')
    expect(again(text)).toBe(text)
    expect(again(text, course([...lessons, { videoId: 'kRh5fMFWmX0', title: 'The verb' }]))).toContain('```md\n## Videos\nmy snippet\n```\n\n## Videos\n\n1. [[Kalam')
  })

  it("keeps what's added to a video's line, and lines of the user's own in the list, while the list follows the playlist", () => {
    const edited = renderCourseNote(course(lessons))
      .replace('1. [[Kalam & Its Components - Introduction]]', '1. [[Kalam & Its Components - Introduction]] - done, rewatch 12:30')
      .replace('\n\n## Notes', '\n3. and the verbs next\n\n## Notes')

    const text = again(edited, course([{ videoId: 'newFirst001', title: 'A new first lesson' }, ...lessons]))

    expect(text).toContain('2. [[Kalam & Its Components - Introduction]] - done, rewatch 12:30\n')
    expect(text).toContain('3. [Indicators of the Ism \\[part 2\\]]')
    expect(text).toContain('\n\n3. and the verbs next\n\n## Notes')
    expect(again(text, course([{ videoId: 'newFirst001', title: 'A new first lesson' }, ...lessons]))).toBe(text)
  })

  it('keeps what the user wrote under the list, with the Notes heading taken out or a heading of any level after it', () => {
    const noNotes = renderCourseNote(course(lessons)).replace('\n## Notes\n', '\nMy thoughts on the course.\n')
    expect(again(noNotes)).toContain('My thoughts on the course.\n')

    const mySection = renderCourseNote(course(lessons)).replace('\n## Notes\n', '\n# My summary\n\nThe elephants are the best part.\n')
    expect(again(mySection)).toBe(mySection)
  })

  it("keeps a video's line said twice over only once, as a sync conflict's copy of a note can leave behind", () => {
    const stray = '1. [[Kalam & Its Components - Introduction [conflicted]]]'
    const edited = renderCourseNote(course(lessons)).replace('\n\n## Notes', `\n\n${stray}\n${stray}\n\n## Notes`)

    const text = again(edited)

    expect(text.split(stray)).toHaveLength(2)
    expect(again(text)).toBe(text)
  })

  it("keeps what's added to a line whose note was renamed outside Obsidian, by the line's number", () => {
    const edited = renderCourseNote(course(lessons)).replace('1. [[Kalam & Its Components - Introduction]]', '1. [[An old name]] - my note')
    const text = again(edited)

    expect(text).toContain('1. [[Kalam & Its Components - Introduction]] - my note\n')
    expect(text).not.toContain('An old name')
  })

  it('shows a title as it is, whatever marks Markdown or Obsidian would act on', () => {
    const titles = ['Python __init__ and __name__', 'std::vector<int> tutorial', 'Episode #3 #ramadan', '100%% real', '$5 vs $10', 'a | b ~~c~~ ==d==', 'ends ^abc']
    const text = renderCourseNote(course(titles.map((title, index) => ({ videoId: `video${index}000`, title }))))

    expect(text).toContain('1. [Python \\_\\_init\\_\\_ and \\_\\_name\\_\\_](')
    expect(text).toContain('2. [std::vector\\<int\\> tutorial](')
    expect(text).toContain('3. [Episode \\#3 \\#ramadan](')
    expect(text).toContain('4. [100\\%\\% real](')
    expect(text).toContain('5. [\\$5 vs \\$10](')
    expect(text).toContain('6. [a \\| b \\~\\~c\\~\\~ \\=\\=d\\=\\=](')
    expect(text).toContain('7. [ends \\^abc](')
    // And each is still known for its video when the note is read back.
    expect(again(text, course(titles.map((title, index) => ({ videoId: `video${index}000`, title }))))).toBe(text)
  })

  it('gives a note link its folder when the notes are in one of their own, showing only the name', () => {
    const inFolder = lessons.map((lesson) => (lesson.note ? { ...lesson, note: `Video Notes/${lesson.note}` } : lesson))
    const text = renderCourseNote(course(inFolder))

    expect(text).toContain('1. [[Video Notes/Kalam & Its Components - Introduction|Kalam & Its Components - Introduction]]\n')
    expect(again(text, course(inFolder))).toBe(text)
  })

  it("names the table's columns in words", () => {
    const text = renderCourseNote(course(lessons))
    expect(text).toContain('  note.part:\n    displayName: Part\n')
    expect(text).toContain('  note.status:\n    displayName: Status\n')
  })

  it('says when YouTube stopped before the end, and when there is nothing yet', () => {
    expect(renderCourseNote(course(lessons, { partial: true }))).toContain('_YouTube stopped answering before the end of this playlist, so only its first 2 videos are here._')
    expect(renderCourseNote(course([]))).toContain('## Videos\n\n_No videos yet._\n')
  })
})

describe('reading a course back from its note', () => {
  it('gives its name and every video in order: by its note when it has one, else by its name and address', () => {
    expect(readCourseList(renderCourseNote(course(lessons)))).toEqual({
      listId: LIST,
      platform: 'youtube',
      title: 'Arabic Grammar in 40 Lessons',
      channel: 'Safina Society',
      lessons: [{ note: 'Kalam & Its Components - Introduction' }, { videoId: 'Uzp0xbqNTQ4', title: 'Indicators of the Ism [part 2]' }],
    })
  })

  it('reads each name back as it was, whatever marks were escaped in it', () => {
    const titles = ['Python __init__ and __name__', 'std::vector<int> tutorial', 'a | b ~~c~~ ==d==', 'a back\\slash']
    const listed = readCourseList(renderCourseNote(course(titles.map((title, index) => ({ videoId: `video${index}00000`, title })))))

    expect(listed?.lessons.map((lesson) => ('title' in lesson ? lesson.title : lesson.note))).toEqual(titles)
  })

  it("leaves out what's added after a video's link, and the user's own lines under the list", () => {
    const edited = renderCourseNote(course(lessons))
      .replace('1. [[Kalam & Its Components - Introduction]]', '1. [[Kalam & Its Components - Introduction]] - done')
      .replace('\n\n## Notes', '\n\n3. [My own pick](https://www.youtube.com/watch?v=kRh5fMFWmX0)\n\n## Notes')

    expect(readCourseList(edited)?.lessons).toEqual([
      { note: 'Kalam & Its Components - Introduction' },
      { videoId: 'Uzp0xbqNTQ4', title: 'Indicators of the Ism [part 2]' },
    ])
  })

  it('says when YouTube stopped before the end, and reads a course with no videos yet', () => {
    expect(readCourseList(renderCourseNote(course(lessons, { partial: true })))?.partial).toBe(true)
    expect(readCourseList(renderCourseNote(course([])))?.lessons).toEqual([])
  })

  it('gives nothing for a note whose list was taken out, or is not the one this writes', () => {
    expect(readCourseList(renderCourseNote(course(lessons)).replace(/## Videos\n[\s\S]*?(?=## Notes)/, ''))).toBeNull()
    expect(readCourseList(renderCourseNote(course(lessons)).replace('1. [[Kalam', 'My own list:\n\n1. [[Kalam'))).toBeNull()
    expect(readCourseList('---\ntitle: "My thoughts"\n---\n## Videos\n\n1. [[Something]]\n')).toBeNull()
  })
})

describe('telling a course’s note from any other', () => {
  it('knows it by its playlist id', () => {
    expect(courseIdIn(renderCourseNote(course(lessons)))).toBe(LIST)
  })

  it('never takes a video’s note for one, nor a note of the user’s own', () => {
    expect(courseIdIn(`---\nvideoId: KWa1au9xeLU\nplaylistId: ${LIST}\n---\n`)).toBeNull()
    expect(courseIdIn('---\ntitle: "My thoughts"\n---\nSome prose.')).toBeNull()
    expect(courseIdIn('No front matter at all.')).toBeNull()
    expect(courseIdIn('---\nplaylistId: "not an id"\n---\n')).toBeNull()
  })
})

describe("a LinkedIn Learning course's note", () => {
  const react: CourseContent = {
    listId: 'react-essential-training',
    platform: 'linkedin-learning',
    title: 'React Essential Training',
    channel: 'Eve Porcello',
    lessons: [
      { videoId: 'react-essential-training/using-hooks', title: 'Using hooks' },
      { videoId: 'react-essential-training/custom-hooks', title: 'Custom hooks', note: 'Custom hooks' },
    ],
  }

  it('names the course where it is on LinkedIn, and links each lesson there or to its note', () => {
    const text = renderCourseNote(react)

    expect(text).toContain('playlistId: react-essential-training\nsource: https://www.linkedin.com/learning/react-essential-training\nchannel: "Eve Porcello"\nvideos: 2\n---')
    expect(text).toContain('1. [Using hooks](https://www.linkedin.com/learning/react-essential-training/using-hooks)\n2. [[Custom hooks]]')
  })

  it("keeps what was added after a lesson's link when the list is written again", () => {
    const annotated = renderCourseNote(react).replace('using-hooks)', 'using-hooks) — watch twice')

    expect(renderCourseNote(react, readCourseNote(annotated)!)).toContain(
      '1. [Using hooks](https://www.linkedin.com/learning/react-essential-training/using-hooks) — watch twice\n2. [[Custom hooks]]',
    )
  })

  it('is read back as a LinkedIn Learning course, its lessons by their ids there', () => {
    expect(readCourseList(renderCourseNote(react))).toMatchObject({
      listId: 'react-essential-training',
      platform: 'linkedin-learning',
      lessons: [{ videoId: 'react-essential-training/using-hooks', title: 'Using hooks' }, { note: 'Custom hooks' }],
    })
  })
})
