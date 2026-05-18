const fs = require('node:fs')
const path = require('node:path')

/**
 * Copy `.next/static` and `public` into the standalone output folder.
 */
function prepareStandaloneBuild(rootDir = path.resolve(__dirname, '..')) {
  const standaloneDir = path.join(rootDir, '.next', 'standalone')
  const staticSrc = path.join(rootDir, '.next', 'static')
  const staticDest = path.join(standaloneDir, '.next', 'static')
  const publicSrc = path.join(rootDir, 'public')
  const publicDest = path.join(standaloneDir, 'public')

  if (!fs.existsSync(standaloneDir)) {
    throw new Error('Missing .next/standalone — run next build first')
  }
  if (!fs.existsSync(staticSrc)) {
    throw new Error('Missing .next/static — run next build first')
  }

  fs.rmSync(staticDest, { recursive: true, force: true })
  fs.cpSync(staticSrc, staticDest, { recursive: true })

  if (fs.existsSync(publicSrc)) {
    fs.rmSync(publicDest, { recursive: true, force: true })
    fs.cpSync(publicSrc, publicDest, { recursive: true })
  }
}

if (require.main === module) {
  prepareStandaloneBuild()
}

module.exports = { prepareStandaloneBuild }
