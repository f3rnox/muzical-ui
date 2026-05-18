#!/usr/bin/env node

const { spawn } = require('node:child_process')
const path = require('node:path')

const packageRoot = path.resolve(__dirname, '..')
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
