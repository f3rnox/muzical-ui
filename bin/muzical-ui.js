#!/usr/bin/env node

const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const packageRoot = path.resolve(__dirname, '..')
const standaloneDir = path.join(packageRoot, '.next', 'standalone')
const standaloneServerPath = path.join(standaloneDir, 'server.js')
const cliArgs = process.argv.slice(2)

/**
 * Read the package version from package.json.
 */
function readPackageVersion() {
  const pkgPath = path.join(packageRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  return typeof pkg.version === 'string' ? pkg.version : '0.0.0'
}

if (cliArgs.includes('--version') || cliArgs.includes('-v') || cliArgs.includes('-V')) {
  console.log(readPackageVersion())
  process.exit(0)
}

/**
 * Standalone server expects static assets under `.next/standalone/.next/static`.
 */
function ensureStandaloneAssets() {
  const staticSrc = path.join(packageRoot, '.next', 'static')
  const staticDest = path.join(standaloneDir, '.next', 'static')
  const publicSrc = path.join(packageRoot, 'public')
  const publicDest = path.join(standaloneDir, 'public')

  if (!fs.existsSync(staticDest) && fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true })
    fs.cpSync(staticSrc, staticDest, { recursive: true })
  }

  if (!fs.existsSync(publicDest) && fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true })
  }
}

ensureStandaloneAssets()

if (!fs.existsSync(standaloneServerPath)) {
  console.error('muzical-ui: standalone production server missing (.next/standalone/server.js).')
  console.error('Publish from a clean build with output: standalone, or run: pnpm build')
  process.exit(1)
}

const child = spawn(
  process.execPath,
  [standaloneServerPath, ...cliArgs],
  {
    cwd: standaloneDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      // WSL/macOS often set HOSTNAME to the machine name; Next uses it in startup URLs.
      HOSTNAME: 'localhost',
    },
  },
)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
