import { SIMULATION_CONFIG } from './simulationConfig'

export const BUILDING_KINDS = [
  'path',
  'food',
  'toilet',
  'ride',
  'alcohol',
  'securityGate',
  'tree',
  'hedge',
  'fence',
  'bench',
  'lighting',
  'stage',
  'directionalSpeaker',
  'omniSpeaker',
  'ambulanceGarage',
  'busStop',
  'busDepot',
  'wasteDepot',
  'wasteBin',
  'generator',
  'backupGenerator',
  'foh',
  'delayTower',
  'videoWall',
  'laserShow',
  'fireworkBattery',
] as const

export type BuildingKind = (typeof BUILDING_KINDS)[number]
export type Tool =
  | BuildingKind
  | 'camping'
  | 'medicalArea'
  | 'wasteDump'
  | 'stageForecourt'
  | 'road'
  | 'parkingArea'
  | 'roadDirection'
  | 'roadSeparator'
  | 'roadSpeed10'
  | 'roadSpeed30'
  | 'roadSpeed50'
  | 'crosswalk'
  | 'coaster'
  | 'terrainRaise'
  | 'terrainLower'
  | 'terrainFlatten'
  | 'powerCable'
  | 'bulldoze'
  | 'inspect'

export type BuildingDefinition = {
  kind: BuildingKind
  name: string
  cost: number
  upkeep: number
  capacity: number
  appeal: number
  height: number
  defaultPrice: number
  color: number
  icon: string
}

export const BUILDINGS: Record<BuildingKind, BuildingDefinition> = {
  path: {
    kind: 'path',
    name: 'Weg',
    ...SIMULATION_CONFIG.economy.buildings.path,
    height: 0.12,
    color: 0xc9b48a,
    icon: '▦',
  },
  food: {
    kind: 'food',
    name: 'Imbiss',
    ...SIMULATION_CONFIG.economy.buildings.food,
    height: 0.95,
    color: 0xf6a623,
    icon: '🍔',
  },
  toilet: {
    kind: 'toilet',
    name: 'Toilette',
    ...SIMULATION_CONFIG.economy.buildings.toilet,
    height: 0.95,
    color: 0x55a7dc,
    icon: 'WC',
  },
  ride: {
    kind: 'ride',
    name: 'Karussell',
    ...SIMULATION_CONFIG.economy.buildings.ride,
    height: 1.5,
    color: 0xd64f8f,
    icon: '🎠',
  },
  alcohol: {
    kind: 'alcohol',
    name: 'Getränkestand',
    ...SIMULATION_CONFIG.economy.buildings.alcohol,
    height: 1.05,
    color: 0x8f5fc7,
    icon: '🍺',
  },
  securityGate: {
    kind: 'securityGate',
    name: 'Sicherheitsschleuse',
    ...SIMULATION_CONFIG.economy.buildings.securityGate,
    height: 1.35,
    color: 0x344e72,
    icon: '🛂',
  },
  tree: {
    kind: 'tree',
    name: 'Baum',
    ...SIMULATION_CONFIG.economy.buildings.tree,
    height: 1.8,
    color: 0x4d8b46,
    icon: '🌳',
  },
  hedge: {
    kind: 'hedge',
    name: 'Hecke',
    ...SIMULATION_CONFIG.economy.buildings.hedge,
    height: 0.55,
    color: 0x3f7b42,
    icon: '🌿',
  },
  fence: {
    kind: 'fence',
    name: 'Bauzaun',
    ...SIMULATION_CONFIG.economy.buildings.fence,
    height: 1.15,
    color: 0xe67a22,
    icon: '🚧',
  },
  bench: {
    kind: 'bench',
    name: 'Parkbank',
    ...SIMULATION_CONFIG.economy.buildings.bench,
    height: 0.55,
    color: 0x98643c,
    icon: '🪑',
  },
  lighting: {
    kind: 'lighting',
    name: 'Beleuchtung',
    ...SIMULATION_CONFIG.economy.buildings.lighting,
    height: 1.75,
    color: 0xf0c75e,
    icon: '💡',
  },
  stage: {
    kind: 'stage',
    name: 'Festivalbühne',
    ...SIMULATION_CONFIG.economy.buildings.stage,
    height: 2.2,
    color: 0x583b72,
    icon: '🎤',
  },
  directionalSpeaker: {
    kind: 'directionalSpeaker',
    name: 'Gerichteter Lautsprecher',
    ...SIMULATION_CONFIG.economy.buildings.directionalSpeaker,
    height: 1.5,
    color: 0x292b32,
    icon: '🔊',
  },
  omniSpeaker: {
    kind: 'omniSpeaker',
    name: 'Omnidirektionaler Lautsprecher',
    ...SIMULATION_CONFIG.economy.buildings.omniSpeaker,
    height: 1.35,
    color: 0x383a43,
    icon: '📢',
  },
  ambulanceGarage: {
    kind: 'ambulanceGarage',
    name: 'Krankenwagengarage',
    ...SIMULATION_CONFIG.economy.buildings.ambulanceGarage,
    height: 1.7,
    color: 0xe8ecef,
    icon: '🚑',
  },
  busStop: {
    kind: 'busStop',
    name: 'Bushaltestelle',
    ...SIMULATION_CONFIG.economy.buildings.busStop,
    height: 1.2,
    color: 0x4e83b8,
    icon: '🚏',
  },
  busDepot: {
    kind: 'busDepot',
    name: 'Busdepot',
    ...SIMULATION_CONFIG.economy.buildings.busDepot,
    height: 1.8,
    color: 0x546575,
    icon: '🚌',
  },
  wasteDepot: {
    kind: 'wasteDepot',
    name: 'Mülldepot',
    ...SIMULATION_CONFIG.economy.buildings.wasteDepot,
    height: 1.65,
    color: 0x4a5a3a,
    icon: '🚛',
  },
  wasteBin: {
    kind: 'wasteBin',
    name: 'Mülleimer',
    ...SIMULATION_CONFIG.economy.buildings.wasteBin,
    height: 0.75,
    color: 0x3f4a3a,
    icon: '🗑️',
  },
  generator: {
    kind: 'generator',
    name: 'Stromgenerator',
    ...SIMULATION_CONFIG.economy.buildings.generator,
    height: 1.45,
    color: 0xd4a017,
    icon: '⚡',
  },
  backupGenerator: {
    kind: 'backupGenerator',
    name: 'Notstromaggregat',
    ...SIMULATION_CONFIG.economy.buildings.backupGenerator,
    height: 1.2,
    color: 0xb8860b,
    icon: '🔋',
  },
  foh: {
    kind: 'foh',
    name: 'FOH-Pult',
    ...SIMULATION_CONFIG.economy.buildings.foh,
    height: 1.35,
    color: 0x2c333a,
    icon: '🎛️',
  },
  delayTower: {
    kind: 'delayTower',
    name: 'Delay-Tower',
    ...SIMULATION_CONFIG.economy.buildings.delayTower,
    height: 2.4,
    color: 0x1f2430,
    icon: '🗼',
  },
  videoWall: {
    kind: 'videoWall',
    name: 'LED-Wand',
    ...SIMULATION_CONFIG.economy.buildings.videoWall,
    height: 2.1,
    color: 0x1a4d8f,
    icon: '📺',
  },
  laserShow: {
    kind: 'laserShow',
    name: 'Lasershow',
    ...SIMULATION_CONFIG.economy.buildings.laserShow,
    height: 1.8,
    color: 0x2ee6a6,
    icon: '✳️',
  },
  fireworkBattery: {
    kind: 'fireworkBattery',
    name: 'Feuerwerkbatterie',
    ...SIMULATION_CONFIG.economy.buildings.fireworkBattery,
    height: 0.85,
    color: 0xc23b4b,
    icon: '🎆',
  },
}

export const STARTING_MONEY = SIMULATION_CONFIG.economy.startingMoney
export const WORLD_SIZE = 48
export const SAVE_KEY = 'festival-simulator-save-v1'
