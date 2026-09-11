// Run after npm run build. Verify the same HTTP server used in the container.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'

const port = 19000 + Math.floor(Math.random() * 1000)
const child = spawn(process.execPath, ['--experimental-strip-types', 'server/serve.ts'], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
})
let output = ''
child.stdout.on('data', data => { output += data })
child.stderr.on('data', data => { output += data })
try {
  const deadline = Date.now() + 10000
  while (!output.includes('Festival Tycoon:')) {
    assert.ok(child.exitCode === null && Date.now() < deadline, output || 'Server start timed out')
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  const origin = `http://127.0.0.1:${port}`
  const page = await fetch(origin)
  assert.equal(page.headers.get('cache-control'), 'no-cache')
  const html = await page.text()
  assert.match(html, /apple-mobile-web-app-capable/)
  assert.match(html, /rel="manifest"/)
  const response = await fetch(`${origin}/manifest.webmanifest`)
  assert.match(response.headers.get('content-type'), /application\/manifest\+json/)
  const manifest = await response.json()
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.start_url, '/')
  const icons = [...manifest.icons, { src: '/app-icons/apple-touch-icon.png', sizes: '180x180' }]
  for (const icon of icons) {
    const response = await fetch(origin + icon.src)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'image/png')
    const bytes = Buffer.from(await response.arrayBuffer())
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes)
  }
  console.log('PASS production HTTP manifest, standalone mode, iOS/manifest icons and fresh HTML')
} finally {
  if (child.exitCode === null) {
    const closed = once(child, 'close')
    child.kill()
    await closed
  }
}
