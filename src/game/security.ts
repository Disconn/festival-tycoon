import { INVENTORY_ITEMS } from './inventory'
import type { RngSource } from './rng'
import type { InventoryItem, InventoryItemKind } from './inventory'
import { SIMULATION_CONFIG } from './simulationConfig'

export type SecurityGateConfig = {
  thoroughness: number
  prohibitedItems: InventoryItemKind[]
}

export type SecurityInspection = {
  durationMinutes: number
  funPenalty: number
  motivationPenalty: number
  confiscated: InventoryItemKind[]
}

export const DEFAULT_SECURITY_CONFIG: SecurityGateConfig = {
  thoroughness: SIMULATION_CONFIG.security.defaultThoroughness,
  prohibitedItems: Object.values(INVENTORY_ITEMS)
    .filter((item) => item.prohibitedByDefault)
    .map((item) => item.kind),
}

export class SecuritySystem {
  inspect(
    inventory: InventoryItem[],
    config: SecurityGateConfig,
    rng: RngSource,
  ): SecurityInspection {
    const tuning = SIMULATION_CONFIG.security
    const thoroughness = Math.max(0, Math.min(1, config.thoroughness))
    const confiscated: InventoryItemKind[] = []
    inventory.forEach((item) => {
      if (!config.prohibitedItems.includes(item.kind)) return
      const definition = INVENTORY_ITEMS[item.kind]
      const chance = Math.min(
        tuning.maximumDetectionChance,
        tuning.baseDetectionChance +
          thoroughness *
            tuning.thoroughnessDetectionWeight *
            (1 - definition.detectionDifficulty * tuning.difficultyWeight),
      )
      if (rng.chance(chance)) confiscated.push(item.kind)
    })
    confiscated.forEach((kind) => {
      const index = inventory.findIndex((item) => item.kind === kind)
      if (index >= 0) inventory.splice(index, 1)
    })
    return {
      durationMinutes:
        tuning.baseDurationMinutes + thoroughness * tuning.additionalDurationMinutes,
      funPenalty: tuning.baseFunPenalty + thoroughness * tuning.additionalFunPenalty,
      motivationPenalty:
        tuning.baseMotivationPenalty +
        thoroughness * tuning.additionalMotivationPenalty,
      confiscated,
    }
  }
}
