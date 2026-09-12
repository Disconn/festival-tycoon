import { transportMotionFactor } from './transportMotion'
import { BoxGeometry, Group, Line, BufferGeometry, LineBasicMaterial, Mesh, MeshStandardMaterial, Color, Vector3 } from 'three'
import { TerrainShape } from './terrainShape'
import { createTerrainSurface } from './terrainSurface'
import type { GameSnapshot } from '../game/GameState'
import { groundInfo } from '../game/ground'
import { getTerrainHeight } from '../game/terrain'
import { disposeChildren } from './disposeObject3D'

export class SupplyChainView {
  group = new Group()
  private ground = new Group()
  private structures = new Group()
  private lines = new Group()
  private actors = new Map<string, Group>()
  private lastAnimationTime: number | null = null
  private groundStamp = ''
  private groundShape: TerrainShape | undefined
  private depotStamp = ''
  private lineStamp = ''
  private gates = new Group()
  private gateStamp = ''
  private stockModels = new Map<string, Group>()
  constructor() { this.group.add(this.ground, this.structures, this.lines, this.gates) }
  private box(group: Group, size: [number, number, number], position: [number, number, number], color: number) {
    const mesh = new Mesh(new BoxGeometry(...size), new MeshStandardMaterial({ color, roughness: 1 }))
    mesh.position.set(...position); group.add(mesh)
  }
  getCarrierPosition(id: string): Vector3 | undefined { return this.actors.get(id)?.position }
  getStaffMeshes(): Group[] { return [...this.actors.entries()].filter(([id])=>id.startsWith('carrier-')).map(([,model])=>model) }
  update(s: Readonly<GameSnapshot>, planning: boolean, shape?: TerrainShape) {
    this.ground.visible = planning
    const i = s.festival.infrastructure
    const gatePaths=s.buildings.filter(b=>b.kind==='path'&&b.staffOnly)
    const gateStamp=gatePaths.map(b=>`${b.id}:${b.x}:${b.z}:${b.elevation}:${b.rotation}`).join('|')
    if(gateStamp!==this.gateStamp) {
      this.gateStamp=gateStamp;disposeChildren(this.gates)
      for(const p of gatePaths) {
        const gate=new Group();gate.position.set(p.x+.5,p.elevation,p.z+.5);gate.rotation.y=p.rotation*Math.PI/2
        this.box(gate,[.08,.9,.08],[-.4,.45,0],0xe2c35c);this.box(gate,[.08,.9,.08],[.4,.45,0],0xe2c35c)
        this.box(gate,[.8,.16,.06],[0,.7,0],0x334e5a);this.gates.add(gate)
      }
    }
    const stockIds=new Set<string>()
    for(const b of s.buildings) {
      const kind=b.kind==='food'?'food':b.kind==='alcohol'?'drinks':b.kind==='toilet'?'water':null
      if(!kind) continue
      stockIds.add(b.id)
      let model=this.stockModels.get(b.id)
      if(!model) {model=new Group();this.box(model,[.68,.09,.05],[0,0,0],0x292d29);this.box(model,[.64,.065,.065],[0,0,.01],0x70c481);this.group.add(model);this.stockModels.set(b.id,model)}
      model.position.set(b.x+.5,b.elevation+1.1,b.z+.06)
      const ratio=Math.min(1,(i.shops[b.id]?.[kind]??0)/40)
      const fill=model.children[1] as Mesh
      fill.scale.x=Math.max(.025,ratio);fill.position.x=-(1-ratio)*.32
      ;(fill.material as MeshStandardMaterial).color.setHex(ratio<=0?0xe86e53:ratio<.25?0xe4b557:0x70c481)
    }
    for(const [id,model] of this.stockModels) if(!stockIds.has(id)){disposeChildren(model);this.group.remove(model);this.stockModels.delete(id)}
    const stamp = `${planning}:${s.scenario.environment}:${s.scenario.worldSize}:${JSON.stringify(i.ground)}:${JSON.stringify(s.terrain.heights)}`
    if (stamp !== this.groundStamp || this.groundShape !== shape) {
      this.groundShape = shape
      this.groundStamp = stamp; disposeChildren(this.ground)
      if (planning) {
      const size = s.scenario.worldSize
      const mesh = createTerrainSurface(s, new MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: .25, roughness: 1, depthWrite: false }), shape)
      const colors = mesh.geometry.getAttribute('color'), tint = new Color()
      let index = 0
      for (let z = -size / 2; z < size / 2; z++) for (let x = -size / 2; x < size / 2; x++) {
        const ground = groundInfo(s, x, z)
        const color = ground.surface === 'paved' ? 0xaebbb7 : ground.surface === 'gravel' ? 0x9e9a85 : ground.compacted ? 0x93835a : ground.drained ? 0x559a98 : ground.type === 'clay' ? 0xb57a59 : ground.type === 'gravel' ? 0xa3a280 : ground.type === 'sand' ? 0xd4bd83 : ground.type === 'grass' ? 0x79a85f : 0x828343
        tint.setHex(color)
        for (let corner = 0; corner < 5; corner++) colors.setXYZ(index++, tint.r, tint.g, tint.b)
      }
      mesh.position.y = .012; this.ground.add(mesh)
      }
    }
    const depots = i.depots.map(d => `${d.id}:${d.role}:${d.x}:${d.z}:${getTerrainHeight(s.terrain, d.x, d.z)}`).join('|')
    if (depots !== this.depotStamp) {
      this.depotStamp = depots; disposeChildren(this.structures)
      for (const d of i.depots) {
        const model = new Group(); model.position.set(d.x + .5, getTerrainHeight(s.terrain, d.x, d.z), d.z + .5)
        this.box(model, [.9, .16, .9], [0, .08, 0], 0x635544)
        this.box(model, [.82, .65, .7], [0, .47, .05], d.role === 'delivery' ? 0xc9a45f : 0x678d82)
        this.box(model, [.98, .13, .92], [0, .85, 0], 0xd5af5c)
        this.box(model, [.48, .5, .02], [0, .41, -.31], 0x283e3a)
        this.box(model, [.26, .24, .24], [.28, .27, -.32], 0xd1a16a)
        this.structures.add(model)
      }
    }
    this.lines.visible = planning
    const lineStamp = planning ? JSON.stringify(i.routes.map(r => [r.id, r.position, r.path])) : ''
    if (planning && lineStamp !== this.lineStamp) {
      this.lineStamp = lineStamp; disposeChildren(this.lines)
      for (const r of i.routes) {
        const points = [r.position, ...r.path].map(p => new Vector3(p.x + .5, p.elevation + .18, p.z + .5))
        if (points.length > 1) this.lines.add(new Line(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ color: r.kind === 'waste' ? 0xf1a060 : 0x79f6dd, depthTest: false })))
      }
    }
    const active = new Set<string>()
    const actor = (id: string, truck: boolean, x: number, y: number, z: number, loaded: boolean, stuck: boolean) => {
      active.add(id)
      let model = this.actors.get(id)
      if (!model) {
        model = new Group()
        if (truck) {
          this.box(model, [.56, .44, .62], [0, .37, .1], 0xe1bb62)
          this.box(model, [.53, .36, .3], [0, .33, -.35], 0x518fa0)
          for (const x of [-.28, .28]) for (const z of [-.3, .32]) this.box(model, [.12, .2, .19], [x, .13, z], 0x293237)
        } else {
          this.box(model, [.18, .3, .16], [-.13, .34, -.15], 0x37b7a3)
          this.box(model, [.16, .16, .16], [-.13, .58, -.15], 0xe7bc8c)
          this.box(model, [.36, .1, .35], [.08, .14, .17], 0x453d31)
        }
        const load = new Group(); load.name = 'load'; this.box(load, [.29, .22, .27], [.08, .3, .17], 0xcba16e); model.add(load)
        const driver = new Group(); driver.name = 'driver'; this.box(driver, [.18, .36, .18], [.4, .3, .38], 0xe39342); this.box(driver, [.16, .16, .16], [.4, .56, .4], 0xe9ba90); model.add(driver)
        if (!truck && id.startsWith('carrier-')) model.traverse(object=>object.userData.staffId=id)
        model.position.set(x + .5, y, z + .5)
        model.userData.transportTarget = new Vector3(x + .5, y, z + .5)
        model.userData.transportFacing = 0
        this.actors.set(id, model); this.group.add(model)
      }
      const target = model.userData.transportTarget as Vector3
      const dx=x+.5-target.x, dz=z+.5-target.z
      if(Math.abs(dx)+Math.abs(dz)>.001) model.userData.transportFacing=Math.atan2(dx,dz)+(truck?Math.PI:0)
      target.set(x+.5,y,z+.5)
      model.getObjectByName('load')!.visible = loaded && !truck
      model.getObjectByName('driver')!.visible = stuck
    }
    for (const t of i.trucks) actor(t.id, true, t.x, getTerrainHeight(s.terrain, t.x, t.z), t.z, t.cargo > 0, t.stuck > 0)
    for (const r of i.routes) actor(r.id, false, r.position.x, r.position.elevation, r.position.z, r.cargo > 0, false)
    for (const v of s.logistics.roadVehicles) if ((v.stuckMinutes ?? 0) > 0 && v.cell) {
      actor(`push-${v.id}`, false, v.cell.x, getTerrainHeight(s.terrain, v.cell.x, v.cell.z), v.cell.z, false, true)
    }
    for (const [id, model] of this.actors) if (!active.has(id)) { disposeChildren(model); this.group.remove(model); this.actors.delete(id) }
  }
  animate(paused: boolean, time = performance.now(), terrainHeight?: (x: number, z: number, y: number) => number): void {
    const seconds = this.lastAnimationTime === null ? 0 : Math.min(.25, Math.max(0, (time-this.lastAnimationTime)/1000))
    this.lastAnimationTime=time
    if(paused) return
    const factor=transportMotionFactor(seconds)
    for(const model of this.actors.values()) {
      const target=model.userData.transportTarget as Vector3
      // Loading a different world or relocating an actor is not a drive across the map.
      if(model.position.distanceToSquared(target)>25) model.position.copy(target)
      else model.position.lerp(target,factor)
      if (terrainHeight) model.position.y = terrainHeight(model.position.x, model.position.z, model.position.y)
      const angle=Number(model.userData.transportFacing??0)-model.rotation.y
      model.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*factor
    }
  }

}
