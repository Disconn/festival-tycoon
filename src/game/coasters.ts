import { SIMULATION_CONFIG } from './simulationConfig'

export const TRACK_PIECE_KINDS = [
  'station',
  'straight',
  'slopeGentleUp',
  'slopeUp',
  'slopeGentleDown',
  'slopeDown',
  'pitchTransition',
  'bankTransition',
  'curveLeft1',
  'curveRight1',
  'curveLeft2',
  'curveRight2',
  'curveLeft3',
  'curveRight3',
  'curveLeft4',
  'curveRight4',
  'sBendLeft', 'sBendRight', 'verticalLoop', 'halfLoopUp', 'halfLoopDown', 'photo', 'splash', 'brakes',
] as const

export type TrackPieceKind = (typeof TRACK_PIECE_KINDS)[number]
export type CoasterTypeId = 'classicSteel'
export type DispatchMode = 'full-or-timed' | 'full-only' | 'timed'
export type CoasterOperationMode = 'closed' | 'open' | 'test'

export type TrackAnchor = {
  x: number
  z: number
  elevation: number
  heading: number
  pitch: number
  bank: number
}

export type TrackPoint = {
  frameHeading?: number
  x: number
  y: number
  z: number
  pitch?: number
  bank?: number
}

export type TrackPiece = {
  id: string
  kind: TrackPieceKind
  start: TrackAnchor
  end: TrackAnchor
  points: TrackPoint[]
  chainLift: boolean
  transition?: 'pitch' | 'bank'
}

export type CoasterTrain = {
  photoPieces?: string[]
  state: 'boarding' | 'running' | 'unloading'
  cars: number
  passengers: number
  passengerIds: string[]
  capacity: number
  waitMinutes: number
  boardingProgress: number
  progress: number
  distance: number
  /** Physical velocity in metres per second. */
  speed: number
  x: number
  y: number
  z: number
}

export type CoasterTelemetrySample = {
  distance: number
  speedKmh: number
  verticalG: number
  lateralG: number
  longitudinalG: number
}

export type CoasterTelemetry = {
  samples: CoasterTelemetrySample[]
  durationSeconds: number
  airtimeSeconds: number
  maxSpeedKmh: number
  minVerticalG: number
  maxVerticalG: number
  maxAbsLateralG: number
  maxAbsLongitudinalG: number
  completedRuns: number
  measuring: boolean
  cumulativeDistanceMeters: number
}

export function createCoasterTelemetry(completedRuns = 0): CoasterTelemetry {
  return {
    samples: [],
    durationSeconds: 0,
    airtimeSeconds: 0,
    maxSpeedKmh: 0,
    minVerticalG: Number.POSITIVE_INFINITY,
    maxVerticalG: Number.NEGATIVE_INFINITY,
    maxAbsLateralG: 0,
    maxAbsLongitudinalG: 0,
    completedRuns,
    measuring: false,
    cumulativeDistanceMeters: 0,
  }
}

export type Coaster = {
  id: string
  typeId: CoasterTypeId
  name: string
  pieces: TrackPiece[]
  entrance: TrackPoint | null
  exit: TrackPoint | null
  settings: {
    dispatchMode: DispatchMode
    dispatchIntervalMinutes: number
  }
  operationMode: CoasterOperationMode
  ticketPrice: number
  train: CoasterTrain
  telemetry: CoasterTelemetry
  queue: string[]
  closed: boolean
}

export type TrackPieceDefinition = {
  kind: TrackPieceKind
  name: string
  cost: number
  radius?: number
  turn?: -1 | 1
  targetPitch?: number
  chainAllowed?: boolean
  station?: boolean
  special?: boolean
}

export type TrackBuildOptions = {
  targetPitch?: number
  targetBank?: number
}

export const TRACK_PITCHES = {
  steepDown: -Math.PI / 4,
  gentleDown: -Math.atan(0.5),
  flat: 0,
  gentleUp: Math.atan(0.5),
  steepUp: Math.PI / 4,
} as const

export const TRACK_BANK_ANGLE = (35 * Math.PI) / 180

export type CoasterTypeDefinition = {
  id: CoasterTypeId
  name: string
  color: number
  railColor: number
  carColor: number
  carCapacity: number
  defaultTicketPrice: number
  physics: {
    worldUnitMeters: number
    carMassKg: number
    passengerMassKg: number
    rollingResistance: number
    dragArea: number
    stationLaunchSpeed: number
    stationDriveSpeed: number
    chainSpeed: number
    carSpacing: number
  }
  supportedPieces: TrackPieceKind[]
}

export const TRACK_PIECES: Record<TrackPieceKind, TrackPieceDefinition> = {
  sBendLeft: { kind: 'sBendLeft', name: 'S-Kurve links', cost: 240, special: true },
  sBendRight: { kind: 'sBendRight', name: 'S-Kurve rechts', cost: 240, special: true },
  verticalLoop: { kind: 'verticalLoop', name: 'Vertikaler Looping', cost: 900, special: true },
  halfLoopUp: { kind: 'halfLoopUp', name: 'Halber Looping aufwärts', cost: 550, special: true },
  halfLoopDown: { kind: 'halfLoopDown', name: 'Halber Looping abwärts', cost: 550, special: true },
  photo: { kind: 'photo', name: 'Fotostation', cost: 280, special: true },
  splash: { kind: 'splash', name: 'Wassersplash', cost: 450, special: true },
  brakes: { kind: 'brakes', name: 'Bremsstrecke', cost: 150, special: true },
  station: { kind: 'station', name: 'Stationsplattform', cost: SIMULATION_CONFIG.coasters.trackPieceCosts.station, station: true },
  straight: { kind: 'straight', name: 'Gerade', cost: SIMULATION_CONFIG.coasters.trackPieceCosts.straight },
  slopeGentleUp: {
    kind: 'slopeGentleUp',
    name: 'Sanfte Steigung',
    cost: SIMULATION_CONFIG.coasters.trackPieceCosts.slopeGentleUp,
    targetPitch: TRACK_PITCHES.gentleUp,
    chainAllowed: true,
  },
  slopeUp: {
    kind: 'slopeUp',
    name: 'Steile Steigung',
    cost: SIMULATION_CONFIG.coasters.trackPieceCosts.slopeUp,
    targetPitch: TRACK_PITCHES.steepUp,
    chainAllowed: true,
  },
  slopeGentleDown: {
    kind: 'slopeGentleDown',
    name: 'Sanftes Gefälle',
    cost: SIMULATION_CONFIG.coasters.trackPieceCosts.slopeGentleDown,
    targetPitch: TRACK_PITCHES.gentleDown,
  },
  slopeDown: {
    kind: 'slopeDown',
    name: 'Steiles Gefälle',
    cost: SIMULATION_CONFIG.coasters.trackPieceCosts.slopeDown,
    targetPitch: TRACK_PITCHES.steepDown,
  },
  pitchTransition: {
    kind: 'pitchTransition',
    name: 'Höhenübergang',
    cost: SIMULATION_CONFIG.coasters.trackPieceCosts.pitchTransition,
    chainAllowed: true,
  },
  bankTransition: {
    kind: 'bankTransition',
    name: 'Neigungsübergang',
    cost: SIMULATION_CONFIG.coasters.trackPieceCosts.bankTransition,
  },
  curveLeft1: { kind: 'curveLeft1', name: 'Kurve links 1×1', cost: SIMULATION_CONFIG.coasters.trackPieceCosts.curveLeft1, radius: 1, turn: -1 },
  curveRight1: {
    kind: 'curveRight1',
    name: 'Kurve rechts 1×1',
    cost: SIMULATION_CONFIG.coasters.trackPieceCosts.curveRight1,
    radius: 1,
    turn: 1,
  },
  curveLeft2: { kind: 'curveLeft2', name: 'Kurve links 2×2', cost: SIMULATION_CONFIG.coasters.trackPieceCosts.curveLeft2, radius: 2, turn: -1 },
  curveRight2: {
    kind: 'curveRight2',
    name: 'Kurve rechts 2×2',
    cost: SIMULATION_CONFIG.coasters.trackPieceCosts.curveRight2,
    radius: 2,
    turn: 1,
  },
  curveLeft3: { kind: 'curveLeft3', name: 'Kurve links 3×3', cost: SIMULATION_CONFIG.coasters.trackPieceCosts.curveLeft3, radius: 3, turn: -1 },
  curveRight3: {
    kind: 'curveRight3',
    name: 'Kurve rechts 3×3',
    cost: SIMULATION_CONFIG.coasters.trackPieceCosts.curveRight3,
    radius: 3,
    turn: 1,
  },
  curveLeft4: { kind: 'curveLeft4', name: 'Kurve links 4×4', cost: SIMULATION_CONFIG.coasters.trackPieceCosts.curveLeft4, radius: 4, turn: -1 },
  curveRight4: {
    kind: 'curveRight4',
    name: 'Kurve rechts 4×4',
    cost: SIMULATION_CONFIG.coasters.trackPieceCosts.curveRight4,
    radius: 4,
    turn: 1,
  },
}

export const COASTER_TYPES: Record<CoasterTypeId, CoasterTypeDefinition> = {
  classicSteel: {
    id: 'classicSteel',
    name: 'Klassische Stahlachterbahn',
    color: 0xd53945,
    railColor: 0xf2d35c,
    carColor: 0x2876c7,
    ...SIMULATION_CONFIG.coasters.classicSteel,
    supportedPieces: [...TRACK_PIECE_KINDS],
  },
}

const HEADINGS = [
  { x: 0, z: 1 },
  { x: 1, z: 0 },
  { x: 0, z: -1 },
  { x: -1, z: 0 },
]

export function createTrackPiece(
  id: string,
  kind: TrackPieceKind,
  start: TrackAnchor,
  chainLift: boolean,
  options: TrackBuildOptions = {},
): TrackPiece {
  const definition = TRACK_PIECES[kind]
  const forward = HEADINGS[start.heading] ?? HEADINGS[0]!
  const normalizedStart: TrackAnchor = {
    ...start,
    pitch: start.pitch ?? 0,
    bank: start.bank ?? 0,
  }
  if (definition.special) return createSpecialTrack(id, kind, normalizedStart)
  const targetPitch =
    kind === 'pitchTransition'
      ? options.targetPitch ?? normalizedStart.pitch
      : definition.targetPitch ?? normalizedStart.pitch
  const targetBank =
    kind === 'bankTransition'
      ? options.targetBank ?? normalizedStart.bank
      : normalizedStart.bank
  const transition =
    kind === 'pitchTransition' ? 'pitch' : kind === 'bankTransition' ? 'bank' : undefined

  if (definition.radius && definition.turn) {
    const side =
      definition.turn === 1
        ? { x: -forward.z, z: forward.x }
        : { x: forward.z, z: -forward.x }
    const radius = definition.radius
    const end: TrackAnchor = {
      x: start.x + forward.x * radius + side.x * radius,
      z: start.z + forward.z * radius + side.z * radius,
      elevation: normalizedStart.elevation,
      heading: (start.heading - definition.turn + 4) % 4,
      pitch: normalizedStart.pitch,
      bank: normalizedStart.bank,
    }
    const control = {
      x: start.x + forward.x * radius,
      z: start.z + forward.z * radius,
    }
    const points: TrackPoint[] = []
    const samples = Math.max(12, radius * 10)
    let elevation = normalizedStart.elevation
    let previousX = normalizedStart.x
    let previousZ = normalizedStart.z
    for (let index = 0; index <= samples; index += 1) {
      const t = index / samples
      const inverse = 1 - t
      const x =
        inverse * inverse * normalizedStart.x +
        2 * inverse * t * control.x +
        t * t * end.x
      const z =
        inverse * inverse * normalizedStart.z +
        2 * inverse * t * control.z +
        t * t * end.z
      if (index > 0) {
        elevation += Math.hypot(x - previousX, z - previousZ) * Math.tan(normalizedStart.pitch)
      }
      points.push({
        x,
        y: elevation,
        z,
        pitch: normalizedStart.pitch,
        bank: normalizedStart.bank,
      })
      previousX = x
      previousZ = z
    }
    end.elevation = normalizedStart.elevation + Math.round(elevation - normalizedStart.elevation)
    const correction = end.elevation - elevation
    points.forEach((point, index) => { point.y += correction * smoothStep(index / samples) })
    return {
      id,
      kind,
      start: normalizedStart,
      end,
      points,
      chainLift: false,
    }
  }

  const length = transition === 'pitch' ? 4 : Math.abs(targetPitch) > .001 && Math.abs(Math.tan(targetPitch)) < .75 ? 2 : 1
  const rise = Math.round(length * (transition === 'pitch' ? (Math.tan(normalizedStart.pitch) + Math.tan(targetPitch)) / 2 : Math.tan(targetPitch)))
  const samples = 16
  const points: TrackPoint[] = []
  let elevation = normalizedStart.elevation
  let previousT = 0
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    const eased = transition ? smoothStep(t) : t
    const pitch =
      transition === 'pitch'
        ? lerp(normalizedStart.pitch, targetPitch, eased)
        : targetPitch
    const bank =
      transition === 'bank'
        ? lerp(normalizedStart.bank, targetBank, eased)
        : targetBank
    if (index > 0) {
      const middleT = (previousT + t) / 2
      const middleEased = transition ? smoothStep(middleT) : middleT
      const middlePitch =
        transition === 'pitch'
          ? lerp(normalizedStart.pitch, targetPitch, middleEased)
          : targetPitch
      elevation += (t - previousT) * Math.tan(middlePitch)
    }
    // Hermite endpoints preserve both pitches and land exactly on the height grid.
    const startSlope = length * Math.tan(transition === 'pitch' ? normalizedStart.pitch : targetPitch)
    const endSlope = length * Math.tan(targetPitch)
    const hermiteY = (t * t * t - 2 * t * t + t) * startSlope + (-2 * t * t * t + 3 * t * t) * rise + (t * t * t - t * t) * endSlope
    points.push({
      x: normalizedStart.x + forward.x * t * length,
      y: normalizedStart.elevation + hermiteY,
      z: normalizedStart.z + forward.z * t * length,
      pitch,
      bank,
    })
    previousT = t
  }
  const end: TrackAnchor = {
    x: normalizedStart.x + forward.x * length,
    z: normalizedStart.z + forward.z * length,
    elevation: normalizedStart.elevation + rise,
    heading: normalizedStart.heading,
    pitch: targetPitch,
    bank: targetBank,
  }
  return {
    id,
    kind,
    start: normalizedStart,
    end,
    points,
    chainLift: Boolean(chainLift && definition.chainAllowed),
    transition,
  }
}

function createSpecialTrack(id: string, kind: TrackPieceKind, start: TrackAnchor): TrackPiece {
  const forward = HEADINGS[start.heading]!, side = { x: forward.z, z: -forward.x }
  const points: TrackPoint[] = [], looping = kind === 'verticalLoop' || kind === 'halfLoopUp' || kind === 'halfLoopDown'
  const samples = looping ? 64 : 32
  let endHeading = start.heading, endBank = start.bank
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, ease = smoothStep(t)
    let along = (kind === 'splash' ? 4 : kind === 'photo' || kind === 'brakes' ? 2 : 4) * t, lateral = 0, height = 0, pitch = 0, bank = start.bank
    if (kind === 'sBendLeft' || kind === 'sBendRight') lateral = (kind === 'sBendLeft' ? 2 : -2) * ease
    if (looping) {
      const theta = t * (kind === 'verticalLoop' ? Math.PI * 2 : Math.PI), radius = 2
      const down = kind === 'halfLoopDown'
      along = radius * Math.sin(theta) + 2 * ease
      height = (down ? -1 : 1) * radius * (1 - Math.cos(theta))
      pitch = (down ? -1 : 1) * theta
      bank = down ? Math.PI : 0
      if (kind !== 'verticalLoop') { endHeading = (start.heading + 2) % 4; endBank = down ? 0 : Math.PI }
    }
    points.push({ x: start.x + forward.x * along + side.x * lateral, y: start.elevation + height, z: start.z + forward.z * along + side.z * lateral, pitch, bank, ...(looping ? { frameHeading: start.heading } : {}) })
  }
  const last = points.at(-1)!
  // Remove trigonometric residue from construction anchors.
  last.x = Math.round(last.x); last.y = Math.round(last.y); last.z = Math.round(last.z)
  return { id, kind, start: { ...start }, end: { x: last.x, z: last.z, elevation: last.y, heading: endHeading, pitch: 0, bank: endBank }, points, chainLift: false }
}

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value)
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}

export function trackAnchorsAlign(
  left: Pick<TrackAnchor, 'x' | 'z' | 'elevation' | 'heading' | 'pitch' | 'bank'>,
  right: Pick<TrackAnchor, 'x' | 'z' | 'elevation' | 'heading' | 'pitch' | 'bank'>,
): boolean {
  const heading = (value: number) => ((Math.round(value) % 4) + 4) % 4
  return (
    Math.abs(left.x - right.x) < 0.35 &&
    Math.abs(left.z - right.z) < 0.35 &&
    Math.abs(left.elevation - right.elevation) < 0.2 &&
    heading(left.heading) === heading(right.heading) &&
    Math.abs(left.pitch - right.pitch) < 0.035 &&
    Math.abs(left.bank - right.bank) < 0.035
  )
}

export function isCoasterCircuitClosed(coaster: Coaster): boolean {
  if (coaster.pieces.length < 4) return false
  const first = coaster.pieces[0]
  const last = coaster.pieces.at(-1)
  if (!first || !last || !trackAnchorsAlign(last.end, first.start)) return false
  return coaster.pieces.every((piece, index) => {
    if (index === 0) return true
    const previous = coaster.pieces[index - 1]
    return Boolean(previous && trackAnchorsAlign(previous.end, piece.start))
  })
}

export function snapTrackPieceToAnchor(
  piece: TrackPiece,
  target: TrackAnchor,
): void {
  piece.end = { ...target }
  const last = piece.points.at(-1)
  if (!last) return
  last.x = target.x
  last.y = target.elevation
  last.z = target.z
  last.pitch = target.pitch
  last.bank = target.bank
}

export function migrateTrackPiece(piece: TrackPiece): TrackPiece {
  const first = piece.points[0]
  const second = piece.points[1]
  const beforeLast = piece.points.at(-2)
  const last = piece.points.at(-1)
  const inferPitch = (from?: TrackPoint, to?: TrackPoint): number => {
    if (!from || !to) return 0
    return Math.atan2(to.y - from.y, Math.hypot(to.x - from.x, to.z - from.z))
  }
  piece.start.pitch ??= inferPitch(first, second)
  piece.start.bank ??= 0
  piece.end.pitch ??= inferPitch(beforeLast, last)
  piece.end.bank ??= 0
  piece.points.forEach((point, index) => {
    const amount = piece.points.length <= 1 ? 0 : index / (piece.points.length - 1)
    point.pitch ??= lerp(piece.start.pitch, piece.end.pitch, amount)
    point.bank ??= lerp(piece.start.bank, piece.end.bank, amount)
  })
  return piece
}

export function getCoasterTrackPoints(coaster: Coaster): TrackPoint[] {
  return coaster.pieces.flatMap((piece, index) =>
    index === 0 ? piece.points : piece.points.slice(1),
  )
}

export type TrackSample = {
  pieceKind: TrackPieceKind
  pieceId: string
  point: TrackPoint
  tangent: TrackPoint
  right: TrackPoint
  up: TrackPoint
  pitch: number
  bank: number
  chainLift: boolean
  stationDrive: boolean
  totalLength: number
}

export function computeTrackFrame(
  tangent: TrackPoint,
  bank: number,
  pitch = 0,
  frameHeading?: number,
): { right: TrackPoint; up: TrackPoint } {
  const forward = normalize(tangent)
  let baseRight = normalize({ x: forward.z, y: 0, z: -forward.x })
  if (Math.hypot(baseRight.x, baseRight.y, baseRight.z) < 0.001) {
    baseRight = { x: 1, y: 0, z: 0 }
  }
  if (frameHeading !== undefined) {
    const reference = HEADINGS[frameHeading] ?? HEADINGS[0]!
    baseRight = { x: reference.z, y: 0, z: -reference.x }
  } else if (Math.cos(pitch) < 0) baseRight = { x: -baseRight.x, y: -baseRight.y, z: -baseRight.z }
  const baseUp = normalize(cross(forward, baseRight))
  const cosine = Math.cos(bank)
  const sine = Math.sin(bank)
  const right = normalize({
    x: baseRight.x * cosine + baseUp.x * sine,
    y: baseRight.y * cosine + baseUp.y * sine,
    z: baseRight.z * cosine + baseUp.z * sine,
  })
  return { right, up: normalize(cross(forward, right)) }
}

function normalize(vector: TrackPoint): TrackPoint {
  const length = Math.hypot(vector.x, vector.y, vector.z)
  if (length < 0.000001) return { x: 0, y: 0, z: 0 }
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length }
}

function cross(left: TrackPoint, right: TrackPoint): TrackPoint {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  }
}

function buildSegments(coaster: Coaster) {
  const segments = coaster.pieces
    .flatMap((piece) =>
      piece.points.slice(0, -1).map((start, index) => {
        const end = piece.points[index + 1]!
        const dx = end.x - start.x
        const dy = end.y - start.y
        const dz = end.z - start.z
        return {
          pieceKind: piece.kind,
          pieceId: piece.id,
          start,
          end,
          length: Math.hypot(dx, dy, dz),
          chainLift: piece.chainLift,
          stationDrive: piece.kind === 'station',
          startBank: start.bank ?? piece.start.bank,
          endBank: end.bank ?? piece.end.bank,
          startPitch: start.pitch ?? piece.start.pitch,
          endPitch: end.pitch ?? piece.end.pitch,
        }
      }),
    )
    .filter((segment) => segment.length > 0.0001)
  const totalLength = segments.reduce((total, segment) => total + segment.length, 0)
  let accumulated = 0
  const ends = segments.map(s => accumulated += s.length)
  return { segments, totalLength, ends, signature: coaster.pieces.map(p => `${p.id}:${p.chainLift}`).join('|') }
}

const trackCache = new WeakMap<Coaster, ReturnType<typeof buildSegments>>()
export function sampleCoasterTrack(coaster: Coaster, distance: number): TrackSample | null {
  const signature = coaster.pieces.map(p => `${p.id}:${p.chainLift}`).join('|')
  let cached = trackCache.get(coaster)
  if (!cached || cached.signature !== signature) { cached = buildSegments(coaster); trackCache.set(coaster, cached) }
  const { segments, totalLength, ends } = cached
  if (segments.length === 0 || totalLength <= 0) return null

  let remaining = coaster.closed
    ? ((distance % totalLength) + totalLength) % totalLength
    : Math.max(0, Math.min(totalLength, distance))
  let low = 0, high = ends.length - 1
  while (low < high) { const mid = (low + high) >>> 1; if (ends[mid]! < remaining) low = mid + 1; else high = mid }
  remaining -= low > 0 ? ends[low - 1]! : 0
  for (const segment of [segments[low]!]) {
    if (remaining <= segment.length + 1e-7) {
      const t = Math.max(0, Math.min(1, remaining / segment.length))
      const tangent = {
        x: (segment.end.x - segment.start.x) / segment.length,
        y: (segment.end.y - segment.start.y) / segment.length,
        z: (segment.end.z - segment.start.z) / segment.length,
      }
      const bank = lerp(segment.startBank, segment.endBank, t)
      const frame = computeTrackFrame(tangent, bank, lerp(segment.startPitch, segment.endPitch, t), segment.start.frameHeading)
      return {
        pieceKind: segment.pieceKind,
        pieceId: segment.pieceId,
        point: {
          x: segment.start.x + (segment.end.x - segment.start.x) * t,
          y: segment.start.y + (segment.end.y - segment.start.y) * t,
          z: segment.start.z + (segment.end.z - segment.start.z) * t,
        },
        tangent,
        right: frame.right,
        up: frame.up,
        pitch: lerp(segment.startPitch, segment.endPitch, t),
        bank,
        chainLift: segment.chainLift,
        stationDrive: segment.stationDrive,
        totalLength,
      }
    }
    remaining -= segment.length
  }

  const last = segments.at(-1)!
  const tangent = {
    x: (last.end.x - last.start.x) / last.length,
    y: (last.end.y - last.start.y) / last.length,
    z: (last.end.z - last.start.z) / last.length,
  }
  const frame = computeTrackFrame(tangent, last.endBank, last.endPitch, last.end.frameHeading)
  return {
    pieceKind: last.pieceKind,
    pieceId: last.pieceId,
    point: { ...last.end },
    tangent,
    right: frame.right,
    up: frame.up,
    pitch: last.endPitch,
    bank: last.endBank,
    chainLift: last.chainLift,
    stationDrive: last.stationDrive,
    totalLength,
  }
}
