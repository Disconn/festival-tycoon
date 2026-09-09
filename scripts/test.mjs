import { build } from 'rolldown'
import { mkdir, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

await mkdir('.test-output', { recursive: true })
try {
  await build({ input: 'tests/regression.ts', platform: 'node', external: ['ws'], output: { file: '.test-output/regression.mjs', format: 'esm' } })
  const result = spawnSync(process.execPath, ['.test-output/regression.mjs'], { stdio: 'inherit' })
  process.exitCode = result.status ?? 1
} finally {
  await rm('.test-output', { recursive: true, force: true })
}
