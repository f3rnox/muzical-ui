#!/usr/bin/env node

const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const packageRoot = path.resolve(__dirname, '..')
const buildIdPath = path.join(packageRoot, '.next', 'BUILD_ID')

if (!fs.existsSync(buildIdPath)) {
  console.error('muzical-ui: production build missing from the installed package (.next/BUILD_ID).')
  console.error('Install a published build that includes .next, or from a checkout run: pnpm build')
  process.exit(1)
}

const nextBin = require.resolve('next/dist/bin/next')

const child = spawn(
  process.execPath,
  [nextBin, 'start', ...process.argv.slice(2)],
  {
    cwd: packageRoot,
    stdio: 'inherit',
    env: process.env,
  },
)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
