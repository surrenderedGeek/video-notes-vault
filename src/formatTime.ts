/** A moment as a note's label writes it: "0:05", "1:02:05". */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')

  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Inverse of formatTime: "3:05" → 185, "1:02:05" → 3725. NaN for anything else. */
export function parseTime(label: string): number {
  const parts = label.trim().split(':')
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) return NaN
  return parts.reduce((total, part) => total * 60 + Number(part), 0)
}
