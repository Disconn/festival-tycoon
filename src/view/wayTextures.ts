import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three'
import type { WayType } from '../game/wayTypes'

const textures = new Map<WayType, CanvasTexture>()
/** Small, repeatable material details without additional meshes or overlays. */
export function wayTexture(kind?: WayType): CanvasTexture | null {
  if (!kind) return null
  const cached = textures.get(kind)
  if (cached) return cached
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 32, 32)
  ctx.fillStyle = '#dadada'
  if (kind === 'footBoard') {
    for (let y = 0; y < 32; y += 8) {
      ctx.fillRect(0, y, 32, 1)
      ctx.fillRect(3, y + 3, 1, 1); ctx.fillRect(28, y + 3, 1, 1)
    }
  } else if (kind === 'footPaved' || kind === 'roadPlates') {
    const height = kind === 'footPaved' ? 8 : 16
    for (let y = 0; y < 32; y += height) {
      ctx.fillRect(0, y, 32, 1)
      for (let x = y % 16 ? 8 : 0; x < 32; x += 16) ctx.fillRect(x, y, 1, height)
    }
  } else if (kind === 'footGravel' || kind === 'roadGravel') {
    for (let n = 0; n < 55; n++) ctx.fillRect((n * 17 + 3) % 32, (n * 11 + Math.floor(n / 7)) % 32, 1, 1)
  } else if (kind === 'roadDirt') {
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(7, 0, 3, 32); ctx.fillRect(22, 0, 3, 32)
  } else {
    ctx.fillStyle = '#f2f2f2'
    for (let n = 0; n < 22; n++) ctx.fillRect(n * 13 % 32, n * 7 % 32, 1, 1)
  }
  const texture = new CanvasTexture(canvas)
  texture.magFilter = NearestFilter; texture.minFilter = NearestFilter
  texture.colorSpace = SRGBColorSpace; texture.generateMipmaps = false
  textures.set(kind, texture)
  return texture
}
