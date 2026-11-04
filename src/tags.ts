const MAX_LENGTH = 50

/**
 * Tags follow Obsidian's rules: letters, digits, "-", "_" and "/" for nesting, no spaces, and at least one letter.
 * Lower case so "iOS" and "ios" don't end up as two tags.
 */
export function normaliseTag(input: string): string | null {
  const tag = input
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}_/-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^[-/]+|[-/]+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/[-/]+$/, '')

  return /[\p{L}_]/u.test(tag) ? tag : null
}

/** "ios, swift" and "#ios #swift" are two tags; "machine learning" is one. */
export function splitTags(input: string): string[] {
  return [...new Set(input.split(/,|\s+(?=#)/).flatMap((part) => normaliseTag(part) ?? []))]
}
