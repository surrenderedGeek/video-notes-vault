import { describe, expect, it } from 'vitest'
import { formatTime, parseTime } from './formatTime.js'

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [5.99, '0:05'],
    [65, '1:05'],
    [600, '10:00'],
    [3600, '1:00:00'],
    [3725, '1:02:05'],
    [36000, '10:00:00'],
    [-4, '0:00'],
  ])('writes %s seconds as %s', (seconds, label) => {
    expect(formatTime(seconds)).toBe(label)
  })
})

describe('parseTime', () => {
  it('reads what formatTime writes', () => {
    for (const seconds of [0, 7, 59, 60, 185, 3599, 3600, 3725, 86399]) {
      expect(parseTime(formatTime(seconds))).toBe(seconds)
    }
  })

  it('ignores spaces around the label', () => {
    expect(parseTime(' 3:05 ')).toBe(185)
  })

  it.each(['', '5', '1:2:3:4', '1:xx', '-1:00', '1:00.5', '1: 00', '::'])('refuses %j', (label) => {
    expect(parseTime(label)).toBeNaN()
  })
})
