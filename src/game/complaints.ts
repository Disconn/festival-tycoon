export const COMPLAINT_TOPICS = [
  'no-campsite',
  'overcrowding',
  'dirty-grounds',
  'security-confiscation',
  'no-parking',
  'bus-wait',
  'bus-full',
  'long-walk-to-camp',
  'traffic-accident',
] as const

export type ComplaintTopic = (typeof COMPLAINT_TOPICS)[number]

export const COMPLAINT_LABELS: Record<
  ComplaintTopic,
  { icon: string; name: string }
> = {
  'no-campsite': { icon: '⛺', name: 'Kein Campingplatz verfügbar' },
  overcrowding: { icon: '👥', name: 'Extremes Gedränge' },
  'dirty-grounds': { icon: '🤢', name: 'Stark verschmutztes Gelände' },
  'security-confiscation': {
    icon: '🛂',
    name: 'Beschwerde über Beschlagnahmung',
  },
  'no-parking': { icon: '🅿️', name: 'Kein Parkplatz verfügbar' },
  'bus-wait': { icon: '⌛', name: 'Zu lange auf den Bus gewartet' },
  'bus-full': { icon: '🚌', name: 'Bus überfüllt' },
  'long-walk-to-camp': { icon: '🥾', name: 'Zu langer Weg zum Zelt' },
  'traffic-accident': { icon: '⚠️', name: 'Verkehrsunfall' },
}

export type ComplaintCounts = Record<ComplaintTopic, number>

export type ComplaintSnapshot = {
  currentSession: ComplaintCounts
  previousSession: ComplaintCounts
  sessionNumber: number
}

export function createComplaintCounts(): ComplaintCounts {
  return {
    'no-campsite': 0,
    overcrowding: 0,
    'dirty-grounds': 0,
    'security-confiscation': 0,
    'no-parking': 0,
    'bus-wait': 0,
    'bus-full': 0,
    'long-walk-to-camp': 0,
    'traffic-accident': 0,
  }
}

export function createComplaintSnapshot(): ComplaintSnapshot {
  return {
    currentSession: createComplaintCounts(),
    previousSession: createComplaintCounts(),
    sessionNumber: 1,
  }
}

export function normalizeComplaintSnapshot(
  value: Partial<ComplaintSnapshot> | undefined,
): ComplaintSnapshot {
  const normalized = createComplaintSnapshot()
  normalized.sessionNumber = Math.max(
    1,
    Math.floor(value?.sessionNumber ?? 1),
  )
  COMPLAINT_TOPICS.forEach((topic) => {
    normalized.currentSession[topic] = Math.max(
      0,
      Math.floor(value?.currentSession?.[topic] ?? 0),
    )
    normalized.previousSession[topic] = Math.max(
      0,
      Math.floor(value?.previousSession?.[topic] ?? 0),
    )
  })
  return normalized
}
