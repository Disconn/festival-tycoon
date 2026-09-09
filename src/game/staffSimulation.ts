import { STAFF_DEFINITIONS } from './staff'
import type { StaffMember } from './staff'
import type { GroundIncident } from './incidents'
import type { MedicalCell } from './medical'
import type { WasteBinInfo, WasteDumpCell } from './waste'
import { findNearestWasteDump, wasteDumpId, parseWasteDumpId } from './waste'
import { SIMULATION_CONFIG } from './simulationConfig'
import type { RngSource } from './rng'

type Cell = { x: number; z: number; elevation: number }
type Patient = {
  id: string
  state: string
  x: number
  y: number
  z: number
  cellX: number
  cellZ: number
  cellElevation: number
  route: Cell[]
  medicalCell: Cell | null
  medicalSlot: number | null
  thought: string
  nausea: number
  injuryVehicleId?: string | null
  rescueVehicleId?: string | null
}

type StaffContext = {
  staff: StaffMember[]
  visitors: Patient[]
  incidents: GroundIncident[]
  medicalCells: MedicalCell[]
  wasteDumps: WasteDumpCell[]
  wasteBins: WasteBinInfo[]
  securityGates: Array<{ id: string; x: number; z: number; elevation: number }>
  findPath: (start: Cell, goals: Cell[], allowGround?: boolean) => Cell[] | null
  pathNeighbors: (cell: Cell) => Cell[]
  rng: RngSource
  reserveBed: (
    visitorId: string,
    preferredCell?: MedicalCell,
  ) => { cell: MedicalCell; slot: number } | null
  removeIncident: (id: string) => void
  depositWaste: (x: number, z: number, amount: number) => number
  emptyBin: (id: string, amount: number) => number
  fillBin?: (id: string, amount: number) => number
}

export class StaffSimulation {
  update(context: StaffContext, minutes: number): void {
    this.assignSecurity(context)
    const claimed = new Set(
      context.staff.map((member) => member.targetId).filter((id): id is string => Boolean(id)),
    )
    context.staff.forEach((member) => {
      const incident = context.incidents.find(
        (candidate) => candidate.id === member.targetId,
      )
      if (incident) claimed.add(this.incidentFieldKey(incident))
    })
    context.staff.forEach((member) => {
      if (member.role === 'security' && member.assignedBuildingId) return
      if (member.state === 'working' && !member.targetId) {
        member.state = member.carryingWaste > 0 ? 'carrying' : 'patrolling'
        member.workMinutes = 0
      }
      if (member.state === 'working') {
        member.workMinutes -= minutes
        if (member.workMinutes <= 0 && member.targetId) {
          this.finishWork(member, context)
        }
        return
      }
      if (member.route.length > 0) {
        this.move(member, minutes * this.staffSpeed(member))
        if (member.role === 'medic' && member.state === 'carrying') {
          const patient = context.visitors.find((visitor) => visitor.id === member.targetId)
          if (patient) {
            patient.x = member.x
            patient.y = member.y + 0.12
            patient.z = member.z
            patient.cellX = member.cellX
            patient.cellZ = member.cellZ
            patient.cellElevation = member.cellElevation
          }
        }
        if (member.route.length > 0) return
      }
      if (member.targetId) {
        this.finishArrival(member, context)
        return
      }
      if (member.role === 'cleaner' && member.carryingWaste > 0) {
        if (this.sendCleanerToDump(member, context)) return
        member.state = 'carrying'
        this.patrol(member, context)
        return
      }
      const area = member.workArea
      const inside = (x: number, z: number) => !area || x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ
      const workContext = area ? { ...context, visitors: context.visitors.filter(v => inside(v.cellX, v.cellZ)), incidents: context.incidents.filter(p => inside(p.x, p.z)), wasteBins: context.wasteBins.filter(p => inside(p.x, p.z)) } : context
      // An inaccessible job must not pin a worker in place. Bound path searches
      // per decision, then patrol so the next search starts from a new position.
      const excluded = new Set(claimed)
      for (let attempt = 0; attempt < 8; attempt++) {
        const target = this.findTarget(member, workContext, excluded)
        if (!target) break
        const route = context.findPath(
          this.staffCell(member),
          [target.cell],
          target.allowMedical,
        )
        if (!route) {
          excluded.add(target.id)
          continue
        }
        member.targetId = target.id
        member.state = 'responding'
        member.route = route
        claimed.add(target.id)
        if (member.role === 'cleaner' || member.role === 'firefighter') {
          claimed.add(
            `${target.kind ?? (member.role === 'cleaner' ? 'vomit' : 'fire')}:${target.cell.x}:${target.cell.z}:${target.cell.elevation}`,
          )
        }
        return
      }
      this.patrol(member, context)
    })
  }

  private assignSecurity(context: StaffContext): void {
    const security = context.staff.filter((member) => member.role === 'security')
    const assigned = new Set<string>()
    security.forEach((member) => {
      const area = member.workArea
      const gate = context.securityGates.find(g => !assigned.has(g.id) && (!area || g.x>=area.minX&&g.x<=area.maxX&&g.z>=area.minZ&&g.z<=area.maxZ))
      if (gate) assigned.add(gate.id)
      member.assignedBuildingId = gate?.id ?? null
      if (!gate) {
        if (member.state === 'stationed') member.state = 'patrolling'
        return
      }
      member.state = 'stationed'
      member.route = []
      member.targetId = null
      member.x = gate.x + 0.5
      member.y = gate.elevation
      member.z = gate.z + 0.5
      member.cellX = gate.x
      member.cellZ = gate.z
      member.cellElevation = gate.elevation
    })
  }

  private findTarget(
    member: StaffMember,
    context: StaffContext,
    claimed: Set<string>,
  ): { id: string; cell: Cell; allowMedical?: boolean; kind?: string } | null {
    if (member.role === 'medic') {
      const patient = context.visitors.find(
        (visitor) =>
          (visitor.state === 'sleeping' ||
            visitor.state === 'injured' ||
            visitor.state === 'vomiting' ||
            visitor.nausea >= SIMULATION_CONFIG.staff.medicNauseaThreshold) &&
          !visitor.rescueVehicleId &&
          !visitor.medicalCell &&
          !claimed.has(visitor.id),
      )
      return patient
        ? {
            id: patient.id,
            cell: { x: patient.cellX, z: patient.cellZ, elevation: patient.cellElevation },
            allowMedical: true,
          }
        : null
    }
    if (member.role === 'cleaner') {
      if (member.carryingWaste >= SIMULATION_CONFIG.waste.cleanerMaxCarry) {
        return null
      }
      const bin = context.wasteBins
        .filter((candidate) => candidate.stored > 0 && !claimed.has(candidate.id))
        .sort(
          (left, right) =>
            Math.abs(left.x - member.cellX) +
            Math.abs(left.z - member.cellZ) -
            (Math.abs(right.x - member.cellX) + Math.abs(right.z - member.cellZ)),
        )[0]
      const incident = context.incidents
        .filter(
          (candidate) =>
            (candidate.kind === 'litter' || candidate.kind === 'vomit') &&
            !claimed.has(candidate.id) &&
            !claimed.has(this.incidentFieldKey(candidate)),
        )
        .sort(
          (left, right) =>
            this.incidentDistance(left, member) - this.incidentDistance(right, member),
        )[0]
      if (bin && incident) {
        const binDistance =
          Math.abs(bin.x - member.cellX) + Math.abs(bin.z - member.cellZ)
        const incidentDistance = this.incidentDistance(incident, member)
        if (binDistance <= incidentDistance + 2) {
          return {
            id: bin.id,
            cell: { x: bin.x, z: bin.z, elevation: bin.elevation },
            allowMedical: true,
            kind: 'bin',
          }
        }
      }
      if (bin && !incident) {
        return {
          id: bin.id,
          cell: { x: bin.x, z: bin.z, elevation: bin.elevation },
          allowMedical: true,
          kind: 'bin',
        }
      }
      return incident
        ? {
            id: incident.id,
            cell: { x: incident.x, z: incident.z, elevation: incident.elevation },
            allowMedical: true,
            kind: incident.kind,
          }
        : null
    }
    if (member.role !== 'firefighter') return null
    const incident = context.incidents
      .filter(
        (candidate) =>
          candidate.kind === 'fire' &&
          !claimed.has(candidate.id) &&
          !claimed.has(this.incidentFieldKey(candidate)),
      )
      .sort(
        (left, right) =>
          this.incidentDistance(left, member) - this.incidentDistance(right, member),
      )[0]
    return incident
      ? {
          id: incident.id,
          cell: { x: incident.x, z: incident.z, elevation: incident.elevation },
          allowMedical: true,
          kind: 'fire',
        }
      : null
  }

  private finishArrival(member: StaffMember, context: StaffContext): void {
    if (member.role === 'medic') {
      const patient = context.visitors.find((visitor) => visitor.id === member.targetId)
      if (!patient) return this.reset(member)
      if (member.state === 'responding') {
        const nearest = context.medicalCells
          .filter((cell) =>
            cell.occupants.some((occupant) => occupant === null),
          )
          .map((cell) => ({
            cell,
            route: context.findPath(this.staffCell(member), [cell], true),
          }))
          .filter(
            (
              candidate,
            ): candidate is { cell: MedicalCell; route: Cell[] } =>
              candidate.route !== null,
          )
          .sort((left, right) => left.route.length - right.route.length)[0]
        if (!nearest) return this.reset(member)
        const bed = context.reserveBed(patient.id, nearest.cell)
        if (!bed) return this.reset(member)
        member.medicalCell = bed.cell
        member.medicalSlot = bed.slot
        member.state = 'carrying'
        patient.state = 'medical-transport'
        patient.injuryVehicleId = null
        patient.route = []
        patient.thought = 'Ein Sanitäter bringt mich zur Krankenstation.'
        member.route = nearest.route
        return
      }
      if (member.state === 'carrying' && member.medicalCell && member.medicalSlot != null) {
        patient.state = 'medical'
        patient.medicalCell = { ...member.medicalCell }
        patient.medicalSlot = member.medicalSlot
        patient.x = member.medicalCell.x + 0.5
        patient.y = member.medicalCell.elevation
        patient.z = member.medicalCell.z + 0.5
        patient.thought = 'Hier werde ich medizinisch versorgt.'
        return this.reset(member)
      }
    }
    if (member.role === 'cleaner' && member.targetId) {
      if (member.targetId.startsWith('deposit-bin:')) {
        const id = member.targetId.slice('deposit-bin:'.length)
        const deposited = context.fillBin?.(id, member.carryingWaste) ?? 0
        member.carryingWaste -= deposited
        member.targetId = null
        member.state = member.carryingWaste > 0 ? 'carrying' : 'patrolling'
        return
      }
      const dump = parseWasteDumpId(member.targetId)
      if (dump) {
        const deposited = context.depositWaste(
          dump.x,
          dump.z,
          member.carryingWaste,
        )
        member.carryingWaste = Math.max(0, member.carryingWaste - deposited)
        if (member.carryingWaste <= 0) {
          this.reset(member)
          return
        }
        member.targetId = null
        member.state = 'carrying'
        return
      }
      const bin = context.wasteBins.find((candidate) => candidate.id === member.targetId)
      if (bin) {
        member.state = 'working'
        member.workMinutes = SIMULATION_CONFIG.staff.cleanerBinWorkMinutes
        return
      }
      const incident = context.incidents.find(
        (candidate) => candidate.id === member.targetId,
      )
      member.state = 'working'
      member.workMinutes =
        incident?.kind === 'litter'
          ? SIMULATION_CONFIG.staff.cleanerLitterWorkMinutes
          : SIMULATION_CONFIG.staff.cleanerWorkMinutes
      return
    }
    member.state = 'working'
    member.workMinutes =
      member.role === 'firefighter'
        ? SIMULATION_CONFIG.staff.firefighterWorkMinutes
        : SIMULATION_CONFIG.staff.cleanerWorkMinutes
  }

  private finishWork(member: StaffMember, context: StaffContext): void {
    const incident = context.incidents.find(
      (candidate) => candidate.id === member.targetId,
    )
    if (
      member.role === 'cleaner' &&
      member.targetId &&
      context.wasteBins.some((candidate) => candidate.id === member.targetId)
    ) {
      const emptied = context.emptyBin(
        member.targetId,
        Math.max(
          0,
          SIMULATION_CONFIG.waste.cleanerMaxCarry - member.carryingWaste,
        ),
      )
      member.carryingWaste += emptied
      member.wasteFromBin = true
      member.targetId = null
      if (member.carryingWaste > 0) {
        if (!this.sendCleanerToDump(member, context)) {
          member.state = 'carrying'
        }
        return
      }
      this.reset(member)
      return
    }
    if (member.role === 'cleaner' && incident?.kind === 'litter') {
      const room = Math.max(
        0,
        SIMULATION_CONFIG.waste.cleanerMaxCarry - member.carryingWaste,
      )
      const taken = Math.min(incident.severity, room)
      member.carryingWaste += taken
      member.wasteFromBin = false
      incident.severity -= taken
      if (incident.severity <= 0) {
        context.removeIncident(incident.id)
      }
      member.targetId = null
      if (member.carryingWaste > 0) {
        if (!this.sendCleanerToDump(member, context)) {
          member.state = 'carrying'
        }
        return
      }
      this.reset(member)
      return
    }
    if (member.targetId) context.removeIncident(member.targetId)
    member.targetId = null
    member.state = 'patrolling'
  }

  private sendCleanerToDump(member: StaffMember, context: StaffContext): boolean {
    if (!member.wasteFromBin && context.fillBin) {
      const bins = context.wasteBins.filter(bin => bin.stored < SIMULATION_CONFIG.waste.binCapacity)
        .sort((a, b) => Math.abs(a.x-member.cellX)+Math.abs(a.z-member.cellZ)-Math.abs(b.x-member.cellX)-Math.abs(b.z-member.cellZ))
      for (const bin of bins) {
        const route = context.findPath(this.staffCell(member), [bin], true)
        if (!route) continue
        member.targetId = `deposit-bin:${bin.id}`; member.route = route; member.state = 'carrying'
        return true
      }
    }
    const dump = findNearestWasteDump(this.staffCell(member), context.wasteDumps)
    if (!dump) return false
    const route = context.findPath(
      this.staffCell(member),
      [{ x: dump.x, z: dump.z, elevation: dump.elevation }],
      true,
    )
    if (!route) return false
    member.targetId = wasteDumpId(dump)
    member.state = 'carrying'
    member.route = route
    return true
  }

  private patrol(member: StaffMember, context: StaffContext): void {
    const area = member.workArea
    const neighbors = context.pathNeighbors(this.staffCell(member)).filter(p => !area || p.x >= area.minX && p.x <= area.maxX && p.z >= area.minZ && p.z <= area.maxZ)
    if (area && !neighbors.length) {
      const goals: Cell[] = []
      for (let z = area.minZ; z <= area.maxZ; z++) for (let x = area.minX; x <= area.maxX; x++) goals.push({x,z,elevation:member.cellElevation})
      member.route = context.findPath(this.staffCell(member), goals) ?? []
      return
    }
    const next = context.rng.pick(neighbors)
    if (next) member.route = [next]
    if (member.role !== 'cleaner' || member.carryingWaste <= 0) {
      member.state = 'patrolling'
    }
  }

  private staffSpeed(member: StaffMember): number {
    const base = STAFF_DEFINITIONS[member.role].speed
    if (member.role === 'cleaner' && member.carryingWaste > 0) {
      return base * SIMULATION_CONFIG.waste.cleanerCarrySpeedMultiplier
    }
    return base
  }

  private incidentDistance(incident: GroundIncident, member: StaffMember): number {
    return (
      Math.abs(incident.x - member.cellX) + Math.abs(incident.z - member.cellZ)
    )
  }

  private move(member: StaffMember, distance: number): void {
    while (distance > 0 && member.route.length > 0) {
      const next = member.route[0]!
      const targetX = next.x + 0.5
      const targetZ = next.z + 0.5
      const dx = targetX - member.x
      const dz = targetZ - member.z
      const remaining = Math.hypot(dx, dz)
      member.facing = Math.atan2(dx, dz)
      if (remaining <= distance) {
        member.x = targetX
        member.y = next.elevation
        member.z = targetZ
        member.cellX = next.x
        member.cellZ = next.z
        member.cellElevation = next.elevation
        member.route.shift()
        distance -= remaining
      } else {
        member.x += (dx / remaining) * distance
        member.z += (dz / remaining) * distance
        distance = 0
      }
    }
  }

  private staffCell(member: StaffMember): Cell {
    return { x: member.cellX, z: member.cellZ, elevation: member.cellElevation }
  }

  private incidentFieldKey(incident: GroundIncident): string {
    return `${incident.kind}:${incident.x}:${incident.z}:${incident.elevation}`
  }

  private reset(member: StaffMember): void {
    member.state = 'patrolling'
    member.targetId = null
    member.route = []
    member.medicalCell = null
    member.medicalSlot = null
    if (member.role !== 'cleaner') member.carryingWaste = 0
    if (member.role === 'cleaner' && member.carryingWaste <= 0) {
      member.carryingWaste = 0
    }
  }
}
