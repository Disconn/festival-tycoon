import type { GameSnapshot } from './GameState'
import { BANDS, bookingHoursOpen, festivalTime, type Booking } from './festivalManagement'
import { bandGenre, expectedMusicMix, genreAffinity } from './musicTaste'

const CHANGEOVER = 30
const SLOT = 30
const DAY_START = 8 * 60

export type AutoLineupPlan = {
  bandId: string
  stageId: string
  day: number
  start: number
  duration: number
}

export function autoLineupDuration(value: number): 60 | 90 | 120 {
  return value === 60 || value === 120 ? value : 90
}

function overlaps(start: number, duration: number, booking: Pick<Booking, 'start' | 'duration'>): boolean {
  return start < booking.start + booking.duration + CHANGEOVER &&
    start + duration + CHANGEOVER > booking.start
}

function slotFree(
  s: Readonly<GameSnapshot>,
  bookings: readonly Pick<Booking, 'day' | 'stageId' | 'start' | 'duration'>[],
  stageId: string,
  day: number,
  start: number,
  duration: number,
): boolean {
  if (start < DAY_START || start + duration > 24 * 60) return false
  if (day * 1440 + start <= festivalTime(s)) return false
  if (!bookingHoursOpen(s, start, duration)) return false
  return !bookings.some(booking => booking.day === day && booking.stageId === stageId && overlaps(start, duration, booking))
}

function bandScore(
  band: (typeof BANDS)[number],
  s: Readonly<GameSnapshot>,
  day: number,
  start: number,
  duration: number,
  planned: readonly AutoLineupPlan[],
): number {
  const mix = expectedMusicMix(s.festival)
  const genre = bandGenre(band.id)
  const appeal = Object.entries(mix).reduce((sum, [id, share]) => sum + share * genreAffinity(id as typeof genre, genre), 0)
  const simultaneous = [...s.festival.bookings, ...planned].filter(booking =>
    booking.day === day && start < booking.start + booking.duration && start + duration > booking.start,
  )
  const clash = simultaneous.reduce((worst, booking) => Math.max(worst, genreAffinity(genre, bandGenre(booking.bandId))), 0)
  const evening = start >= 18 * 60 ? 1 : start >= 16 * 60 ? 0.45 : 0
  return appeal * 80 + band.draw * 0.35 + evening * band.draw * 0.25 - band.fee / 80 - clash * 28
}

export function planAutoLineup(s: Readonly<GameSnapshot>, duration: 60 | 90 | 120): AutoLineupPlan[] {
  const stages = s.buildings.filter(building => building.kind === 'stage')
  if (!stages.length || s.festival.finished) return []
  const firstDay = s.festival.startDay + s.dayPlan.leadDays
  const lastDay = firstDay + s.dayPlan.festivalDays
  const planned: AutoLineupPlan[] = []
  let money = s.money
  const used = new Set(s.festival.bookings.map(booking => booking.bandId))
  const starts: number[] = []
  for (let start = DAY_START; start + duration <= 24 * 60; start += SLOT) starts.push(start)
  starts.sort((left, right) => (right >= 18 * 60 ? 1 : 0) - (left >= 18 * 60 ? 1 : 0) || left - right)

  for (let day = firstDay; day < lastDay; day += 1) {
    for (const start of starts) {
      for (const stage of stages) {
        const bookings = [...s.festival.bookings, ...planned]
        if (!slotFree(s, bookings, stage.id, day, start, duration)) continue
        const candidates = BANDS.filter(band =>
          !used.has(band.id) &&
          s.festival.reputation.music >= band.reputation &&
          money >= band.fee &&
          !bookings.some(booking => booking.day === day && booking.bandId === band.id),
        )
        if (!candidates.length) continue
        const band = candidates.slice().sort((left, right) =>
          bandScore(right, s, day, start, duration, planned) - bandScore(left, s, day, start, duration, planned),
        )[0]!
        planned.push({ bandId: band.id, stageId: stage.id, day, start, duration })
        used.add(band.id)
        money -= band.fee
      }
    }
  }
  return planned
}
