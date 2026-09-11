import { build } from 'rolldown'
import { mkdir, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

await mkdir('.performance-output', { recursive: true })
try {
  await build({ input: 'tests/performance.ts', platform: 'node', output: { file: '.performance-output/profile.mjs', format: 'esm' } })
  const result = spawnSync(process.execPath, ['.performance-output/profile.mjs', ...process.argv.slice(2)], { stdio: 'inherit' })
  process.exitCode = result.status ?? 1
} finally {
  await rm('.performance-output', { recursive: true, force: true })
}
