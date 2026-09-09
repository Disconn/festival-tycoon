import { SIMULATION_CONFIG } from './simulationConfig'

export type GroundIncidentKind = 'vomit' | 'fire' | 'litter'

export type GroundIncident = {
  id: string
  kind: GroundIncidentKind
  x: number
  z: number
  elevation: number
  severity: number
  ageMinutes: number
}

type NauseaVisitor = {
  alcoholLevel: number
  nausea: number
  nauseaCooldown: number
  needs: { toilet: number }
  state: string
}

export class IncidentSystem {
  updateNausea(visitor: NauseaVisitor, minutes: number): boolean {
    const config = SIMULATION_CONFIG.nausea
    visitor.nauseaCooldown = Math.max(0, visitor.nauseaCooldown - minutes)
    const alcoholFactor = Math.max(
      0,
      (visitor.alcoholLevel - config.alcoholBaseline) / config.alcoholRange,
    )
    const toiletFactor = Math.max(
      0,
      (config.toiletBaseline - visitor.needs.toilet) / config.toiletBaseline,
    )
    const badCombination =
      alcoholFactor *
      (config.safeCombinationWeight + toiletFactor * config.toiletCombinationWeight)
    visitor.nausea = Math.max(
      0,
      Math.min(
        100,
        visitor.nausea +
          minutes * badCombination * config.gainPerMinute -
          (badCombination === 0 ? minutes * config.safeRecoveryPerMinute : 0),
      ),
    )
    if (
      visitor.nausea < config.vomitThreshold ||
      visitor.nauseaCooldown > 0 ||
      visitor.state === 'riding'
    ) {
      return false
    }
    visitor.nausea = config.resetAfterVomit
    visitor.nauseaCooldown = config.cooldownMinutes
    return true
  }

  addRideNausea(visitor: NauseaVisitor, intensity: number): void {
    const config = SIMULATION_CONFIG.nausea
    if (visitor.alcoholLevel < config.minimumRideAlcohol) return
    visitor.nausea = Math.min(
      100,
      visitor.nausea +
        intensity * (visitor.alcoholLevel / config.rideAlcoholScale),
    )
  }

  addDrinkNausea(visitor: NauseaVisitor): void {
    const config = SIMULATION_CONFIG.nausea
    if (visitor.alcoholLevel < config.minimumDrinkAlcohol) return
    visitor.nausea = Math.min(
      100,
      visitor.nausea +
        (visitor.alcoholLevel - config.minimumDrinkAlcohol) *
          config.drinkGainPerAlcoholPoint,
    )
  }

  createIncident(
    id: string,
    kind: GroundIncidentKind,
    cell: { x: number; z: number; elevation: number },
    severity = 1,
  ): GroundIncident {
    return { id, kind, ...cell, severity, ageMinutes: 0 }
  }
}
