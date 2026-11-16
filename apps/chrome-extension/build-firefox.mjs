// Builds the Firefox version: same code, adjusted manifest (Firefox MV3 uses background scripts, not a service worker).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const m = JSON.parse(readFileSync('src/manifest.json', 'utf8'))
m.background = { scripts: ['background.js'] }
m.browser_specific_settings = {
  gecko: {
    id: 'laraselector@mhmdelbadry74.github.io',
    strict_min_version: '140.0',
    data_collection_permissions: { required: ['none'] },
  },
}

rmSync('dist-firefox', { recursive: true, force: true })
mkdirSync('dist-firefox/icons', { recursive: true })
for (const f of ['background.js', 'content.js', 'popup.html', 'popup.js']) cpSync(`src/${f}`, `dist-firefox/${f}`)
cpSync('src/icons', 'dist-firefox/icons', { recursive: true })
writeFileSync('dist-firefox/manifest.json', JSON.stringify(m, null, 2) + '\n')
