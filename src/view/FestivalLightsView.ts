import { AdditiveBlending, DataTexture, Group, InstancedMesh, LinearFilter, MeshBasicMaterial, PlaneGeometry, SphereGeometry, Matrix4, PointLight, Vector3 } from 'three'
import type { GameSnapshot } from '../game/GameState'
import { isFestivalOfferActive } from '../game/dayPlan'
import { getTerrainHeight } from '../game/terrain'
import { sceneryTransform } from '../game/scenery'

export function nightStrength(minute: number): number {
  const hour = ((minute / 60) % 24 + 24) % 24
  return hour < 5 || hour >= 22 ? 1 : hour < 8 ? (8 - hour) / 3 : hour >= 19 ? (hour - 19) / 3 : 0
}

export const FESTIVAL_LIGHT_BUDGET = 8

function glowTexture(): DataTexture {
  const size = 32, data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1)
    const i = (y * size + x) * 4
    data[i] = data[i + 1] = data[i + 2] = 255
    data[i + 3] = Math.round(Math.max(0, 1 - radius) ** 2 * 255)
  }
  const texture = new DataTexture(data, size, size)
  texture.magFilter = texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

/** Every source keeps a bulb and soft light pool; a fixed local-light budget
 * illuminates nearby objects without recompiling shaders when sources change. */
export class FestivalLightsView {
  readonly group = new Group()
  private cursor = new PointLight(0xc2d6ef, 0, 7, 1.6)
  private pool: PointLight[] = []
  private bulbs: InstancedMesh | null = null
  private glows: InstancedMesh | null = null
  private glowGeometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
  private glowMaterial = new MeshBasicMaterial({ color: 0xffc778, map: glowTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
  private positions: Vector3[] = []
  private focus = new Vector3()
  private geometry = new SphereGeometry(1, 6, 4)
  private material = new MeshBasicMaterial({ color: 0xffd89a })
  private night = 0
  constructor() {
    this.group.add(this.cursor); this.cursor.castShadow = false
    // Keep these lights attached even when off. Light count is part of Three's
    // shader cache key; growing/shrinking it can block rendering for seconds.
    for (let i = 0; i < FESTIVAL_LIGHT_BUDGET; i++) {
      const light = new PointLight(0xffca82, 0, 3.5, 1.6)
      light.castShadow = false; this.pool.push(light); this.group.add(light)
    }
  }
  update(s: Readonly<GameSnapshot>): void {
    this.night = nightStrength(s.minute)
    const positions: Vector3[] = [], groundHeights: number[] = [], powered = new Set(s.power.poweredBuildingIds)
    const lightsActive = isFestivalOfferActive(s.dayPlan, 'lights', s.minute, s.day)
    for (const b of s.buildings) {
      if (b.kind === 'stringLights' && lightsActive) {
        const t = sceneryTransform(b)
        positions.push(new Vector3(b.x + t.x, b.elevation + 1.23, b.z + t.z))
        groundHeights.push(b.elevation)
      } else if (b.kind === 'lighting' && lightsActive && powered.has(b.id)) {
        positions.push(new Vector3(b.x + .5, b.elevation + 1.46, b.z + .5))
        groundHeights.push(b.elevation)
      } else if (b.kind === 'food' || b.kind === 'alcohol' || b.kind === 'toilet') {
        if (!powered.has(b.id) || !isFestivalOfferActive(s.dayPlan, b.kind === 'toilet' ? 'toilets' : b.kind === 'food' ? 'food' : 'drinks', s.minute, s.day)) continue
        const a = b.rotation * Math.PI / 2
        positions.push(new Vector3(b.x + .5 + Math.sin(a) * .38, b.elevation + (b.kind === 'toilet' ? 1 : .69), b.z + .5 + Math.cos(a) * .38))
        groundHeights.push(b.elevation)
      }
    }
    const sleeping = s.visitors.filter(v => v.campsite && v.campingPhase === 'resting')
    const lanternBlock = Math.floor((s.day * 1440 + s.minute) / 30)
    const litTents = sleeping
      .map(v => {
        let score = lanternBlock * 0x9e3779b9
        for (const character of v.id) {
          score ^= character.charCodeAt(0)
          score = Math.imul(score, 16777619)
        }
        return { v, score: score >>> 0 }
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, Math.min(24, Math.max(1, Math.ceil(sleeping.length * .12))))
    for (const { v } of litTents) {
      if (!v.campsite) continue
      const angle = ((Number(v.id.replace(/\D/g, '').slice(-2)) || 0) % 4) * Math.PI / 2
      positions.push(new Vector3(v.campsite.x + .5 + Math.sin(angle) * .38, getTerrainHeight(s.terrain, v.campsite.x, v.campsite.z) + .25, v.campsite.z + .5 + Math.cos(angle) * .38))
      groundHeights.push(getTerrainHeight(s.terrain, v.campsite.x, v.campsite.z))
    }
    if (!this.bulbs || this.bulbs.instanceMatrix.count < positions.length) {
      if (this.bulbs) { this.group.remove(this.bulbs); this.bulbs.dispose() }
      this.bulbs = new InstancedMesh(this.geometry, this.material, Math.max(16, positions.length)); this.bulbs.frustumCulled = false; this.group.add(this.bulbs)
      if (this.glows) { this.group.remove(this.glows); this.glows.dispose() }
      this.glows = new InstancedMesh(this.glowGeometry, this.glowMaterial, this.bulbs.instanceMatrix.count)
      this.glows.frustumCulled = false; this.group.add(this.glows)
    }
    const matrix = new Matrix4()
    positions.forEach((p, i) => {
      matrix.makeScale(.055, .04, .055); matrix.setPosition(p); this.bulbs!.setMatrixAt(i, matrix)
      const radius = p.y - groundHeights[i]! < .5 ? 1.2 : 3.2
      matrix.makeScale(radius, 1, radius); matrix.setPosition(p.x, groundHeights[i]! + .085, p.z)
      this.glows!.setMatrixAt(i, matrix)
    })
    this.bulbs.count = positions.length; this.bulbs.instanceMatrix.needsUpdate = true
    this.glows!.count = positions.length; this.glows!.instanceMatrix.needsUpdate = true
    this.glowMaterial.opacity = .06 + this.night * .22
    this.positions = positions
    this.updateLocalLights()
  }
  setFocus(position: Vector3): void {
    if (this.focus.distanceToSquared(position) < .25) return
    this.focus.copy(position)
    this.updateLocalLights()
  }
  private updateLocalLights(): void {
    const nearest = this.positions.map((position, index) => ({ position, index, distance: (position.x - this.focus.x) ** 2 + (position.z - this.focus.z) ** 2 }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index)
    this.pool.forEach((light, i) => {
      const p = nearest[i]?.position
      light.intensity = p ? 0.45 + this.night * 2.35 : 0
      if (p) { light.position.copy(p); light.position.y += .15 }
    })
  }
  updateCursor(position: Vector3 | null): void { this.cursor.intensity = position ? 0.35 + this.night * 1.85 : 0; if (position) this.cursor.position.copy(position).add(new Vector3(0, 1.5, 0)) }
}
