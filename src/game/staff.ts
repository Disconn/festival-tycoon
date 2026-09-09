import { SIMULATION_CONFIG } from './simulationConfig'

export const STAFF_ROLES = ['cleaner', 'security', 'firefighter', 'medic'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]
export type StaffState = 'patrolling' | 'responding' | 'working' | 'carrying' | 'stationed'

export type StaffMember = {
  id: string
  name: string
  role: StaffRole
  x: number
  y: number
  z: number
  cellX: number
  cellZ: number
  cellElevation: number
  facing: number
  route: Array<{ x: number; z: number; elevation: number }>
  state: StaffState
  targetId: string | null
  workMinutes: number
  assignedBuildingId: string | null
  medicalCell: { x: number; z: number; elevation: number } | null
  medicalSlot: number | null
  workArea?: { minX: number; maxX: number; minZ: number; maxZ: number } | null
  wasteFromBin?: boolean
  carryingWaste: number
}

export type StaffDefinition = {
  role: StaffRole
  name: string
  icon: string
  color: number
  hatColor: number
  hireCost: number
  hourlyWage: number
  speed: number
}

export const STAFF_DEFINITIONS: Record<StaffRole, StaffDefinition> = {
  cleaner: { role: 'cleaner', name: 'Reinigungskraft', icon: '🧹', color: 0x4fa86f, hatColor: 0xe8f3de, ...SIMULATION_CONFIG.staff.roles.cleaner },
  security: { role: 'security', name: 'Sicherheitskraft', icon: '🛡️', color: 0x263f66, hatColor: 0x18283f, ...SIMULATION_CONFIG.staff.roles.security },
  firefighter: { role: 'firefighter', name: 'Feuerwehrkraft', icon: '🚒', color: 0xc94135, hatColor: 0xf4c542, ...SIMULATION_CONFIG.staff.roles.firefighter },
  medic: { role: 'medic', name: 'Sanitäter', icon: '⚕️', color: 0xf2f2ed, hatColor: 0xd94841, ...SIMULATION_CONFIG.staff.roles.medic },
}

export function createStaffMember(
  id: string,
  role: StaffRole,
  entrance: { x: number; z: number; elevation: number },
): StaffMember {
  return {
    id,
    name: `${STAFF_DEFINITIONS[role].name} ${id.replace(/\D/g, '').slice(-3)}`,
    role,
    x: entrance.x + 0.5,
    y: entrance.elevation,
    z: entrance.z + 0.5,
    cellX: entrance.x,
    cellZ: entrance.z,
    cellElevation: entrance.elevation,
    facing: 0,
    route: [],
    state: 'patrolling',
    targetId: null,
    workMinutes: 0,
    assignedBuildingId: null,
    medicalCell: null,
    medicalSlot: null,
    carryingWaste: 0,
  }
}
