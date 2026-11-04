/** A YouTube video's id in a link to it, in any of the shapes YouTube hands out, or the bare id. */
export function parseVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Bare video id
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id && /^[\w-]{11}$/.test(id) ? id : null
  }

  if (host.endsWith('youtube.com')) {
    const v = url.searchParams.get('v')
    if (v && /^[\w-]{11}$/.test(v)) return v

    const embedded = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)
    if (embedded) return embedded[1]
  }

  return null
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function timestampUrl(videoId: string, seconds: number): string {
  return `${watchUrl(videoId)}&t=${Math.floor(seconds)}s`
}

/** The playlist an address names: its own page, a video being watched in it, or the bare id. */
export function parsePlaylistId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    const host = url.hostname.replace(/^www\./, '')
    if (host.endsWith('youtube.com') || host === 'youtu.be') return url.searchParams.get('list')
  } catch {
    // Not an address, so it may be the id itself.
  }
  return /^[A-Za-z0-9_-]{13,}$/.test(trimmed) ? trimmed : null
}

export function playlistUrl(listId: string): string {
  return `https://www.youtube.com/playlist?list=${listId}`
}
