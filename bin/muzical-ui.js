#!/usr/bin/env node

const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const packageRoot = path.resolve(__dirname, '..')
const standaloneServerPath = path.join(packageRoot, '.next', 'standalone', 'server.js')

if (!fs.existsSync(standaloneServerPath)) {
  console.error('muzical-ui: standalone production server missing (.next/standalone/server.js).')
  console.error('Publish from a clean build with output: standalone, or run: pnpm build')
  process.exit(1)
}

const child = spawn(
  process.execPath,
  [standaloneServerPath, ...process.argv.slice(2)],
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
