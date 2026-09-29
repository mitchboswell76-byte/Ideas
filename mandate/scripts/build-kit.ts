/**
 * Bundle the UI-kit style guide (`kit.html`) into one self-contained HTML file for publishing as
 * an Artifact: JS and CSS inline, fonts as data URIs, no external requests.
 *
 * Output: `dist-kit/ballot-and-block.html` — page content only (title, style, root, script), since
 * the Artifact host wraps it in its own document skeleton.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'

const OUT_DIR = 'dist-kit'
const OUT_FILE = join(OUT_DIR, 'ballot-and-block.html')

await build({
  logLevel: 'warn',
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    // Inline every asset (fonts) as a data URI.
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    modulePreload: false,
    rolldownOptions: { input: 'kit.html' },
  },
})

const assets = join(OUT_DIR, 'assets')
const files = readdirSync(assets)
const read = (ext: string): string => {
  const matches = files.filter((f) => f.endsWith(ext))
  if (matches.length !== 1) throw new Error(`Expected one ${ext} file, found ${matches.join(', ')}`)
  return readFileSync(join(assets, matches[0]!), 'utf8')
}

const css = read('.css')
// A literal `</script` would end the inline script early.
const js = read('.js').replaceAll('</script', '<\\/script')
const title = /<title>(.*?)<\/title>/.exec(readFileSync(join(OUT_DIR, 'kit.html'), 'utf8'))?.[1]

const page = [
  `<title>${title ?? 'Ballot &amp; Block'}</title>`,
  `<style>\n${css}\n</style>`,
  '<div id="root"></div>',
  `<script type="module">\n${js}\n</script>`,
  '',
].join('\n')

writeFileSync(OUT_FILE, page)
console.log(`Wrote ${OUT_FILE} (${(page.length / 1024).toFixed(0)} KB)`)
