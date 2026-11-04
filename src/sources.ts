import { parsePlaylistId, parseVideoId, playlistUrl, timestampUrl, watchUrl } from './youtube.js'
import type { Platform, VideoMeta } from './types.js'

/**
 * Where a video comes from, and the addresses that follow from it. YouTube's own helpers stay in
 * youtube.ts; this is the one place that tells the platforms apart, so nothing else has to.
 */

const LINKEDIN_LEARNING = 'https://www.linkedin.com/learning/'

/** Pages under /learning/ that are the site's own, not a course. */
const NOT_A_COURSE = new Set([
  'topics',
  'paths',
  'collections',
  'instructors',
  'search',
  'me',
  'browse',
  'subscription',
  'settings',
  'certificates',
  'content',
  'login',
  'signup',
])

type Source = Pick<VideoMeta, 'videoId'> & Partial<Pick<VideoMeta, 'platform' | 'url'>>

/**
 * The platform a video is from. Notes written before this was kept say nothing, so it's told
 * from the address, or failing that the id: a LinkedIn Learning lesson's is course/lesson, and
 * YouTube's never has a slash.
 */
export function platformOf(video: Source): Platform {
  if (video.platform) return video.platform
  return video.url?.startsWith(LINKEDIN_LEARNING) || video.videoId.includes('/') ? 'linkedin-learning' : 'youtube'
}

/** What a pasted or visited address names: a video, the list it's in, or both. */
export interface VideoLink {
  platform: Platform
  videoId: string | null
  listId: string | null
}

export function parseVideoLink(input: string): VideoLink | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  return linkedInLink(trimmed) ?? youTubeLink(trimmed)
}

function youTubeLink(input: string): VideoLink | null {
  const videoId = parseVideoId(input)
  const listId = parsePlaylistId(input)
  return videoId || listId ? { platform: 'youtube', videoId, listId } : null
}

/** linkedin.com/learning/<course>/<lesson>: the lesson in its course; without a lesson, the course alone. */
function linkedInLink(input: string): VideoLink | null {
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')
  if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) return null
  const [learning, course, lesson] = url.pathname.split('/').filter(Boolean)
  if (learning !== 'learning' || !course || NOT_A_COURSE.has(course)) return null
  return { platform: 'linkedin-learning', videoId: lesson ? `${course}/${lesson}` : null, listId: course }
}

/** The course and lesson in a LinkedIn Learning id, which is course/lesson. */
export function lessonParts(videoId: string): { course: string; lesson: string } | null {
  const slash = videoId.indexOf('/')
  return slash > 0 && slash < videoId.length - 1 ? { course: videoId.slice(0, slash), lesson: videoId.slice(slash + 1) } : null
}

/** The video's own page. */
export function sourceUrl(video: Source): string {
  if (video.url) return video.url
  return platformOf(video) === 'linkedin-learning' ? `${LINKEDIN_LEARNING}${video.videoId}` : watchUrl(video.videoId)
}

/**
 * The video at a moment. YouTube's own form for YouTube. On LinkedIn Learning `?t=` is the Video
 * Notes extension's convention: its script on the lesson's page moves the video there.
 */
export function momentUrl(video: Source, seconds: number): string {
  const at = Math.floor(seconds)
  if (platformOf(video) === 'youtube') return timestampUrl(video.videoId, at)
  const url = sourceUrl(video)
  return `${url}${url.includes('?') ? '&' : '?'}t=${at}`
}

/** A course's own page: a playlist's on YouTube, a course's on LinkedIn Learning. */
export function courseUrl(platform: Platform, listId: string): string {
  return platform === 'linkedin-learning' ? `${LINKEDIN_LEARNING}${listId}` : playlistUrl(listId)
}
