import { consumeItem, getItemQuantity } from './inventory'
import type { RngSource } from './rng'
import { SIMULATION_CONFIG } from './simulationConfig'
import type { InventoryItem } from './inventory'

export type FireworkEffect = {
  id: string
  x: number
  y: number
  z: number
  color: number
  age: number
}

type FireworkCarrier = {
  id: string
  x: number
  y: number
  z: number
  state: string
  campingPhase?: string
  alcoholLevel: number
  inventory: InventoryItem[]
}

export type FireworkLaunch = {
  visitorId: string
  effect: FireworkEffect
  startsFire: boolean
}

const FIREWORK_COLORS = [0xff5964, 0xffca3a, 0x8ac926, 0x38bdf8, 0xc77dff]
export class FireworksSystem {
  update(
    visitors: readonly FireworkCarrier[],
    elapsedGameMinutes: number,
    createId: () => string,
    rng: RngSource,
  ): FireworkLaunch[] {
    const config = SIMULATION_CONFIG.fireworks
    const launchChance =
      1 - Math.exp(-config.launchRatePerGameMinute * elapsedGameMinutes)
    const launches: FireworkLaunch[] = []
    visitors.forEach((visitor) => {
      if (
        getItemQuantity(visitor.inventory, 'fireworks') <= 0 ||
        visitor.state === 'riding' ||
        visitor.state === 'sleeping' ||
        visitor.state === 'leaving' ||
        visitor.state === 'camping' ||
        visitor.alcoholLevel < config.minimumLaunchAlcohol ||
        rng.next() >= launchChance
      ) {
        return
      }
      if (!consumeItem(visitor.inventory, 'fireworks')) return
      launches.push({
        visitorId: visitor.id,
        startsFire:
          visitor.alcoholLevel >= config.minimumFireRiskAlcohol &&
          rng.chance(
            config.fireProbabilityAtMaximumAlcohol * (visitor.alcoholLevel / 100),
          ),
        effect: {
          id: createId(),
          x: visitor.x,
          y: visitor.y + 0.15,
          z: visitor.z,
          color:
            FIREWORK_COLORS[rng.nextInt(FIREWORK_COLORS.length)] ??
            FIREWORK_COLORS[0]!,
          age: 0,
        },
      })
    })
    return launches
  }
}
