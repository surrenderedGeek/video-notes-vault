/**
 * A short, stable fingerprint of some text: enough to tell two contents apart, not for
 * anything that needs to resist someone trying to collide it. Every app writing this format
 * uses the same one, so they all name the same screenshot the same way.
 */
export function shortHash(text: string): string {
  let value = 5381
  for (let i = 0; i < text.length; i++) value = ((value << 5) + value + text.charCodeAt(i)) | 0
  return (value >>> 0).toString(36)
}
