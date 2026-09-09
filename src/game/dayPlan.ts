export const DAY_PLAN_OFFERS = [
  'food',
  'drinks',
  'toilets',
  'rides',
  'stages',
  'lights',
] as const

export type DayPlanOffer = (typeof DAY_PLAN_OFFERS)[number]

export const DAY_PLAN_OFFER_LABELS: Record<
  DayPlanOffer,
  { icon: string; name: string }
> = {
  food: { icon: '🍔', name: 'Essensbuden' },
  drinks: { icon: '🍺', name: 'Getränkebuden' },
  toilets: { icon: '🚻', name: 'Toiletten' },
  rides: { icon: '🎢', name: 'Fahrgeschäfte' },
  stages: { icon: '🎤', name: 'Bühnen & Beschallung' },
  lights: { icon: '💡', name: 'Beleuchtung' },
}

export type DayPlan = {
  dayVisitorEntryHour: number
  dayVisitorExitHour: number
  festivalDays: number
  leadDays: number
  breakDays: number
  cycleStartDay: number
  campingCapacityBufferPercent: number
  offers: Record<DayPlanOffer, boolean[]>
}

export type FestivalPhase = 'lead' | 'festival' | 'break'

export type FestivalCycleStatus = {
  phase: FestivalPhase
  phaseDay: number
  phaseLength: number
  cycleDay: number
  cycleLength: number
  firstFestivalDay: boolean
}

function hoursActive(predicate: (hour: number) => boolean): boolean[] {
  return Array.from({ length: 24 }, (_, hour) => predicate(hour))
}

export function createDefaultDayPlan(): DayPlan {
  return {
    dayVisitorEntryHour: 8,
    dayVisitorExitHour: 23,
    festivalDays: 3,
    leadDays: 1,
    breakDays: 2,
    cycleStartDay: 1,
    campingCapacityBufferPercent: 10,
    offers: {
      food: hoursActive((hour) => hour >= 8 && hour < 23),
      drinks: hoursActive((hour) => hour >= 10 || hour < 2),
      toilets: hoursActive(() => true),
      rides: hoursActive((hour) => hour >= 10 && hour < 23),
      stages: hoursActive((hour) => hour >= 14 || hour < 2),
      lights: hoursActive((hour) => hour >= 18 || hour < 7),
    },
  }
}

export function normalizeDayPlan(value: Partial<DayPlan> | undefined): DayPlan {
  const fallback = createDefaultDayPlan()
  const offers = { ...fallback.offers }
  DAY_PLAN_OFFERS.forEach((offer) => {
    const hours = value?.offers?.[offer]
    if (Array.isArray(hours)) {
      offers[offer] = Array.from(
        { length: 24 },
        (_, hour) => Boolean(hours[hour]),
      )
    }
  })
  const entry = Math.max(
    0,
    Math.min(23, Math.floor(value?.dayVisitorEntryHour ?? fallback.dayVisitorEntryHour)),
  )
  const exit = Math.max(
    0,
    Math.min(23, Math.floor(value?.dayVisitorExitHour ?? fallback.dayVisitorExitHour)),
  )
  return {
    dayVisitorEntryHour: entry,
    dayVisitorExitHour: exit === entry ? fallback.dayVisitorExitHour : exit,
    festivalDays: Math.max(
      1,
      Math.min(14, Math.floor(value?.festivalDays ?? fallback.festivalDays)),
    ),
    leadDays: Math.max(
      0,
      Math.min(14, Math.floor(value?.leadDays ?? fallback.leadDays)),
    ),
    breakDays: Math.max(
      1,
      Math.min(30, Math.floor(value?.breakDays ?? fallback.breakDays)),
    ),
    cycleStartDay: Math.max(
      1,
      Math.floor(value?.cycleStartDay ?? fallback.cycleStartDay),
    ),
    campingCapacityBufferPercent: Math.max(
      0,
      Math.min(
        50,
        Math.floor(
          value?.campingCapacityBufferPercent ??
            fallback.campingCapacityBufferPercent,
        ),
      ),
    ),
    offers,
  }
}

export function getFestivalCycleStatus(
  plan: Readonly<DayPlan>,
  day: number,
): FestivalCycleStatus {
  const cycleLength = plan.leadDays + plan.festivalDays + plan.breakDays
  const cycleDay =
    (((Math.max(1, day) - plan.cycleStartDay) % cycleLength) + cycleLength) %
    cycleLength
  if (cycleDay < plan.leadDays) {
    return {
      phase: 'lead',
      phaseDay: cycleDay + 1,
      phaseLength: plan.leadDays,
      cycleDay,
      cycleLength,
      firstFestivalDay: false,
    }
  }
  if (cycleDay < plan.leadDays + plan.festivalDays) {
    const phaseDay = cycleDay - plan.leadDays + 1
    return {
      phase: 'festival',
      phaseDay,
      phaseLength: plan.festivalDays,
      cycleDay,
      cycleLength,
      firstFestivalDay: phaseDay === 1,
    }
  }
  return {
    phase: 'break',
    phaseDay: cycleDay - plan.leadDays - plan.festivalDays + 1,
    phaseLength: plan.breakDays,
    cycleDay,
    cycleLength,
    firstFestivalDay: false,
  }
}

export function getOpenWindowHours(entryHour: number, exitHour: number): number {
  return (exitHour - entryHour + 24) % 24
}

export function isDayVisitorAdmissionOpen(
  plan: Readonly<DayPlan>,
  minute: number,
): boolean {
  const hour = ((minute / 60) % 24 + 24) % 24
  const entry = plan.dayVisitorEntryHour
  const exit = plan.dayVisitorExitHour
  return entry < exit
    ? hour >= entry && hour < exit
    : hour >= entry || hour < exit
}

export function isOfferActive(
  plan: Readonly<DayPlan>,
  offer: DayPlanOffer,
  minute: number,
): boolean {
  const hour = Math.floor(((minute / 60) % 24 + 24) % 24)
  return Boolean(plan.offers[offer]?.[hour])
}

export function isFestivalOfferActive(
  plan: Readonly<DayPlan>,
  offer: DayPlanOffer,
  minute: number,
  day: number,
): boolean {
  const status = getFestivalCycleStatus(plan, day)
  if (status.phase === 'festival') {
    return isOfferActive(plan, offer, minute)
  }
  if (status.phase === 'lead') {
    return offer !== 'rides' && offer !== 'stages' &&
      isOfferActive(plan, offer, minute)
  }
  return (offer === 'toilets' || offer === 'lights') &&
    isOfferActive(plan, offer, minute)
}
