import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three'
import { createNudeAnatomy, createPersonGeometry, createPersonDetails, personSeed, personStyle } from './pixelPeople'
import { STAFF_DEFINITIONS } from '../game/staff'
import type { StaffMember } from '../game/staff'
import { disposeObject3D } from './disposeObject3D'

type StaffPose = { x: number; y: number; z: number }

export class StaffView {
  readonly group = new Group()
  private models = new Map<string, Group>()
  private prevPos = new Map<string, StaffPose>()
  private currPos = new Map<string, StaffPose>()
  private interpolatedTick = -1

  invalidate(): void {
    this.prevPos.clear()
    this.currPos.clear()
    this.interpolatedTick = -1
  }

  update(
    staff: readonly StaffMember[],
    renderAlpha = 1,
    simTick = 0,
    terrainHeight?: (x: number, z: number, y: number) => number,
  ): void {
    if (simTick !== this.interpolatedTick) {
      this.prevPos = this.currPos
      this.currPos = new Map(
        staff.map((member) => [
          member.id,
          { x: member.x, y: member.y, z: member.z },
        ]),
      )
      this.interpolatedTick = simTick
    }
    const ids = new Set(staff.map((member) => member.id))
    this.models.forEach((model, id) => {
      if (!ids.has(id)) {
        this.group.remove(model)
        disposeObject3D(model)
        this.models.delete(id)
      }
    })
    staff.forEach((member) => {
      let model = this.models.get(member.id)
      if (!model) {
        model = this.createModel(member)
        model.traverse(object => object.userData.staffId = member.id)
        this.models.set(member.id, model)
        this.group.add(model)
      }
      const moving = member.route.length > 0
      const phase = performance.now() * 0.009 + Number(member.id.replace(/\D/g, '').slice(-3))
      const pose = this.interpolatedPose(member, renderAlpha)
      model.position.set(pose.x, (terrainHeight?.(pose.x, pose.z, pose.y) ?? pose.y) + 0.04, pose.z)
      model.rotation.y +=
        Math.atan2(
          Math.sin(member.facing - model.rotation.y),
          Math.cos(member.facing - model.rotation.y),
        ) * 0.22
      model.traverse((object) => {
        if (typeof object.userData.walkLimb === 'number') {
          object.rotation.x =
            (moving ? Math.sin(phase) : 0) * 0.65 * object.userData.walkLimb
        }
        if (object.userData.cleaningTool) {
          object.rotation.z =
            member.state === 'working' ? Math.sin(phase * 1.7) * 0.35 : -0.16
        }
        if (object.userData.wasteBag) {
          object.visible = member.carryingWaste > 0
        }
      })
    })
  }

  private createModel(member: StaffMember): Group {
    const definition = STAFF_DEFINITIONS[member.role]
    const group = new Group()
    const appearance = personStyle(personSeed(member.id))
    const uniform = new MeshStandardMaterial({ color: definition.color, vertexColors: true, roughness: 0.9 })
    const skin = new MeshStandardMaterial({ color: appearance.skin, vertexColors: true, roughness: 0.9 })
    const pants = new MeshStandardMaterial({ color: 0x3c4c55, vertexColors: true, roughness: .9 })
    const body = new Mesh(createPersonGeometry(appearance.female ? 'femaleBody' : 'body'), uniform)
    const head = new Mesh(createPersonGeometry('head'), skin)
    const leftLeg = new Mesh(createPersonGeometry('leg'), pants)
    const rightLeg = leftLeg.clone()
    const leftArm = new Mesh(createPersonGeometry('arm'), skin), rightArm = leftArm.clone()
    const shoulder = appearance.female ? .11 : .128
    leftArm.position.set(-shoulder, .485, 0); rightArm.position.set(shoulder, .485, 0)
    leftArm.userData.walkLimb = -1; rightArm.userData.walkLimb = 1
    body.position.y = .39
    head.position.y = .605
    leftLeg.position.set(-.044, .275, 0)
    rightLeg.position.set(.044, .275, 0)
    leftLeg.userData.walkLimb = 1
    rightLeg.userData.walkLimb = -1
    const hat =
      member.role === 'firefighter'
        ? new ConeGeometry(0.13, 0.15, 8)
        : new CylinderGeometry(0.12, 0.1, 0.08, 10)
    const hatMesh = new Mesh(
      hat,
      new MeshStandardMaterial({ color: definition.hatColor, roughness: 0.7 }),
    )
    hatMesh.position.y = .72
    const details = new Mesh(createPersonDetails(appearance.variant, false), new MeshStandardMaterial({vertexColors:true, roughness:.9}))
    group.add(leftLeg, rightLeg, body, head, leftArm, rightArm, details, hatMesh)
    if (appearance.female) {
      const bust = new Mesh(createNudeAnatomy('bust'), uniform)
      bust.position.y = .39
      group.add(bust)
    }
    group.scale.set(appearance.width, appearance.height, appearance.width)
    if (member.role === 'cleaner') {
      const broom = new Group()
      const handle = new Mesh(
        new CylinderGeometry(0.012, 0.012, 0.65, 6),
        new MeshStandardMaterial({ color: 0x936239 }),
      )
      const brush = new Mesh(
        new BoxGeometry(0.22, 0.06, 0.08),
        new MeshStandardMaterial({ color: 0xe1c062 }),
      )
      handle.position.y = 0.36
      brush.position.y = 0.04
      broom.position.set(0.16, 0, 0.06)
      broom.rotation.z = -0.16
      broom.userData.cleaningTool = true
      broom.add(handle, brush)
      group.add(broom)
      const bag = new Mesh(
        new BoxGeometry(0.1, 0.12, 0.08),
        new MeshStandardMaterial({ color: 0x6b5a32, roughness: 1 }),
      )
      bag.position.set(-0.14, 0.28, 0.04)
      bag.userData.wasteBag = true
      bag.visible = false
      group.add(bag)
    }
    group.traverse((object) => {
      if (object instanceof Mesh) object.castShadow = false
    })
    return group
  }

  private interpolatedPose(
    member: StaffMember,
    renderAlpha: number,
  ): StaffPose {
    const current = this.currPos.get(member.id) ?? {
      x: member.x,
      y: member.y,
      z: member.z,
    }
    const previous = this.prevPos.get(member.id)
    if (
      !previous ||
      Math.hypot(current.x - previous.x, current.z - previous.z) > 2.5
    ) {
      return current
    }
    return {
      x: previous.x + (current.x - previous.x) * renderAlpha,
      y: previous.y + (current.y - previous.y) * renderAlpha,
      z: previous.z + (current.z - previous.z) * renderAlpha,
    }
  }
}
