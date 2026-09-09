import { ENVIRONMENTS } from './environments'
import type { Environment } from './environments'
import { STARTING_MONEY, WORLD_SIZE } from './catalog'
import { SIMULATION_CONFIG } from './simulationConfig'
import type { RngSource } from './rng'

export const SCENARIO_WORLD_SIZES = [32, 48, 64, 80] as const
export type ScenarioWorldSize = (typeof SCENARIO_WORLD_SIZES)[number]

export type ScenarioSettings = {
  environment: Environment
  unevenness: number
  carArrivalShare: number
  partyAffinity: number
  beautyAffinity: number
  aggressiveShare: number
  startingMoney: number
  worldSize: ScenarioWorldSize
}

export const DEFAULT_SCENARIO: ScenarioSettings = {
  environment: 'farmland',
  unevenness: .5,
  carArrivalShare: SIMULATION_CONFIG.logistics.carArrivalShare,
  partyAffinity: 0.55,
  beautyAffinity: 0.55,
  aggressiveShare: SIMULATION_CONFIG.visitors.aggressiveProbability,
  startingMoney: STARTING_MONEY,
  worldSize: WORLD_SIZE as ScenarioWorldSize,
}

export function createDefaultScenarioSettings(): ScenarioSettings {
  return { ...DEFAULT_SCENARIO }
}

export function createScenarioEntrance(worldSize: number): {
  x: number
  z: number
  elevation: number
} {
  return { x: 3, z: -worldSize / 2, elevation: 0 }
}

export function createScenarioRoadEntry(worldSize: number): {
  x: number
  z: number
} {
  return { x: 0, z: -worldSize / 2 }
}

function clampRatio(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(1, Math.max(0, value))
}

export function normalizeScenarioSettings(
  source?: Partial<ScenarioSettings> | null,
): ScenarioSettings {
  const worldSize = SCENARIO_WORLD_SIZES.includes(
    source?.worldSize as ScenarioWorldSize,
  )
    ? (source?.worldSize as ScenarioWorldSize)
    : DEFAULT_SCENARIO.worldSize
  const startingMoney = Math.round(
    Number.isFinite(source?.startingMoney)
      ? Math.min(500_000, Math.max(5_000, Number(source?.startingMoney)))
      : DEFAULT_SCENARIO.startingMoney,
  )
  return {
    environment: source?.environment && Object.hasOwn(ENVIRONMENTS, source.environment) ? source.environment : DEFAULT_SCENARIO.environment,
    unevenness: clampRatio(source?.unevenness ?? DEFAULT_SCENARIO.unevenness, DEFAULT_SCENARIO.unevenness),
    carArrivalShare: clampRatio(
      source?.carArrivalShare ?? DEFAULT_SCENARIO.carArrivalShare,
      DEFAULT_SCENARIO.carArrivalShare,
    ),
    partyAffinity: clampRatio(
      source?.partyAffinity ?? DEFAULT_SCENARIO.partyAffinity,
      DEFAULT_SCENARIO.partyAffinity,
    ),
    beautyAffinity: clampRatio(
      source?.beautyAffinity ?? DEFAULT_SCENARIO.beautyAffinity,
      DEFAULT_SCENARIO.beautyAffinity,
    ),
    aggressiveShare: clampRatio(
      source?.aggressiveShare ?? DEFAULT_SCENARIO.aggressiveShare,
      DEFAULT_SCENARIO.aggressiveShare,
    ),
    startingMoney,
    worldSize,
  }
}

export function sampleBiasedPreference(
  tendency: number,
  rng: RngSource,
): number {
  const spread = 0.28
  return Math.min(
    1,
    Math.max(0.05, tendency + (rng.next() - 0.5) * 2 * spread),
  )
}
