// Reproducible pixel-art app icon; no fonts or image dependencies required.
import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'

const palette = ['22372f', '344f40', '101f1c', '8fa588', 'efcf86', 'ed9860', '7dd8bf']
const pixels = new Uint8Array(32 * 32)
const rect = (x, y, w, h, color) => {
  for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) pixels[row * 32 + col] = color
}
rect(3, 3, 26, 26, 1)
rect(7, 9, 18, 16, 2)
rect(7, 8, 18, 2, 3)
rect(7, 10, 2, 14, 3)
rect(23, 10, 2, 14, 3)
rect(6, 24, 20, 2, 4)
rect(9, 26, 14, 2, 2)
rect(11, 11, 10, 3, 4)
rect(11, 14, 3, 9, 4)
rect(14, 16, 6, 3, 4)
rect(9, 6, 3, 2, 5)
rect(20, 6, 3, 2, 6)

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}
function png(size) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4)
  header[8] = 8; header[9] = 2 // 8-bit RGB, opaque for iOS icon masks
  const rows = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const color = palette[pixels[Math.floor(y * 32 / size) * 32 + Math.floor(x * 32 / size)]]
    const offset = y * (size * 3 + 1) + 1 + x * 3
    for (let c = 0; c < 3; c++) rows[offset + c] = parseInt(color.slice(c * 2, c * 2 + 2), 16)
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))])
}
const directory = new URL('../public/app-icons/', import.meta.url)
await mkdir(directory, { recursive: true })
for (const [size, name] of [[180, 'apple-touch-icon'], [192, 'icon-192'], [512, 'icon-512']]) {
  await writeFile(new URL(`${name}.png`, directory), png(size))
}
