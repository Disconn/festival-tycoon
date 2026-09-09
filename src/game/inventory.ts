import { SIMULATION_CONFIG } from './simulationConfig'
import type { RngSource } from './rng'

export const INVENTORY_ITEM_KINDS = [
  'tent',
  'chairs',
  'pavilion',
  'musicBox',
  'alcohol',
  'food',
  'fireworks',
] as const

export type InventoryItemKind = (typeof INVENTORY_ITEM_KINDS)[number]

export type InventoryItem = {
  kind: InventoryItemKind
  quantity: number
}

export type InventoryItemDefinition = {
  kind: InventoryItemKind
  name: string
  icon: string
  securityCategory: 'camping' | 'drink' | 'food' | 'hazard'
  detectionDifficulty: number
  prohibitedByDefault: boolean
  spawnProbability: number
}

export const INVENTORY_ITEMS: Record<InventoryItemKind, InventoryItemDefinition> = {
  tent: {
    kind: 'tent',
    name: 'Zelt',
    icon: '⛺',
    securityCategory: 'camping',
    detectionDifficulty: SIMULATION_CONFIG.inventory.tent.detectionDifficulty,
    prohibitedByDefault: false,
    spawnProbability: SIMULATION_CONFIG.inventory.tent.spawnProbability,
  },
  chairs: {
    kind: 'chairs',
    name: 'Campingstuhl',
    icon: '🪑',
    securityCategory: 'camping',
    detectionDifficulty: SIMULATION_CONFIG.inventory.chairs.detectionDifficulty,
    prohibitedByDefault: false,
    spawnProbability: SIMULATION_CONFIG.inventory.chairs.spawnProbability,
  },
  pavilion: {
    kind: 'pavilion',
    name: 'Pavillon',
    icon: '⛱️',
    securityCategory: 'camping',
    detectionDifficulty: SIMULATION_CONFIG.inventory.pavilion.detectionDifficulty,
    prohibitedByDefault: false,
    spawnProbability: SIMULATION_CONFIG.inventory.pavilion.spawnProbability,
  },
  musicBox: {
    kind: 'musicBox',
    name: 'Musikbox',
    icon: '🔈',
    securityCategory: 'camping',
    detectionDifficulty:
      SIMULATION_CONFIG.inventory.musicBox.detectionDifficulty,
    prohibitedByDefault: false,
    spawnProbability: SIMULATION_CONFIG.inventory.musicBox.spawnProbability,
  },
  alcohol: {
    kind: 'alcohol',
    name: 'Alkohol',
    icon: '🍺',
    securityCategory: 'drink',
    detectionDifficulty: SIMULATION_CONFIG.inventory.alcohol.detectionDifficulty,
    prohibitedByDefault: false,
    spawnProbability: SIMULATION_CONFIG.inventory.alcohol.spawnProbability,
  },
  food: {
    kind: 'food',
    name: 'Essen',
    icon: '🥪',
    securityCategory: 'food',
    detectionDifficulty: SIMULATION_CONFIG.inventory.food.detectionDifficulty,
    prohibitedByDefault: false,
    spawnProbability: SIMULATION_CONFIG.inventory.food.spawnProbability,
  },
  fireworks: {
    kind: 'fireworks',
    name: 'Feuerwerkskörper',
    icon: '🧨',
    securityCategory: 'hazard',
    detectionDifficulty: SIMULATION_CONFIG.inventory.fireworks.detectionDifficulty,
    prohibitedByDefault: true,
    spawnProbability: SIMULATION_CONFIG.inventory.fireworks.spawnProbability,
  },
}

function randomQuantity(maximum: number, rng: RngSource): number {
  return rng.nextInt(maximum + 1)
}

export function createFestivalInventory(rng: RngSource): InventoryItem[] {
  const inventory: InventoryItem[] = []
  const isCamper = rng.chance(INVENTORY_ITEMS.tent.spawnProbability)
  if (isCamper) {
    inventory.push({ kind: 'tent', quantity: 1 })
    if (rng.chance(INVENTORY_ITEMS.chairs.spawnProbability)) {
      inventory.push({ kind: 'chairs', quantity: 1 })
    }
    if (rng.chance(INVENTORY_ITEMS.pavilion.spawnProbability)) {
      inventory.push({ kind: 'pavilion', quantity: 1 })
    }
    if (rng.chance(INVENTORY_ITEMS.musicBox.spawnProbability)) {
      inventory.push({ kind: 'musicBox', quantity: 1 })
    }
  }
  const alcohol =
    rng.chance(INVENTORY_ITEMS.alcohol.spawnProbability)
      ? 1 + randomQuantity(SIMULATION_CONFIG.inventory.maximumAlcoholExtraQuantity, rng)
      : 0
  const food =
    rng.chance(INVENTORY_ITEMS.food.spawnProbability)
      ? 1 + randomQuantity(SIMULATION_CONFIG.inventory.maximumFoodExtraQuantity, rng)
      : 0
  const fireworks =
    rng.chance(INVENTORY_ITEMS.fireworks.spawnProbability)
      ? 1 + randomQuantity(SIMULATION_CONFIG.inventory.maximumFireworksExtraQuantity, rng)
      : 0
  if (alcohol > 0) inventory.push({ kind: 'alcohol', quantity: alcohol })
  if (food > 0) inventory.push({ kind: 'food', quantity: food })
  if (fireworks > 0) inventory.push({ kind: 'fireworks', quantity: fireworks })
  return inventory
}

export function normalizeInventory(
  inventory: readonly InventoryItem[] | undefined,
  requiresTent = false,
): InventoryItem[] {
  const quantities = new Map<InventoryItemKind, number>()
  if (Array.isArray(inventory)) {
    inventory.forEach((item) => {
      if (!INVENTORY_ITEM_KINDS.includes(item.kind)) return
      const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0))
      if (quantity > 0) quantities.set(item.kind, (quantities.get(item.kind) ?? 0) + quantity)
    })
  }
  if (requiresTent && !quantities.has('tent')) quantities.set('tent', 1)
  return [...quantities].map(([kind, quantity]) => ({ kind, quantity }))
}

export function getItemQuantity(
  inventory: readonly InventoryItem[],
  kind: InventoryItemKind,
): number {
  return inventory.find((item) => item.kind === kind)?.quantity ?? 0
}

export function addItem(
  inventory: InventoryItem[],
  kind: InventoryItemKind,
  quantity = 1,
): void {
  if (quantity <= 0) return
  const existing = inventory.find((item) => item.kind === kind)
  if (existing) existing.quantity += quantity
  else inventory.push({ kind, quantity })
}

export function consumeItem(
  inventory: InventoryItem[],
  kind: InventoryItemKind,
  quantity = 1,
): boolean {
  const item = inventory.find((candidate) => candidate.kind === kind)
  if (!item || item.quantity < quantity) return false
  item.quantity -= quantity
  if (item.quantity <= 0) inventory.splice(inventory.indexOf(item), 1)
  return true
}
