import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextBin = require.resolve('next/dist/bin/next')
const nodeOptions = process.env.NODE_OPTIONS?.trim() || '--max-old-space-size=8192'

process.stdout.write(`[build] NODE_OPTIONS=${nodeOptions}\n`)

const result = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
  stdio: 'inherit',
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
