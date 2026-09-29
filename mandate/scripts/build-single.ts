/**
 * Bundle one HTML entry into a single self-contained HTML file for publishing as an Artifact: JS
 * and CSS inline, fonts as data URIs, dynamic imports folded in, no external requests.
 *
 *   tsx scripts/build-single.ts <entry.html> <out-dir> <out-file> [fallback title]
 *
 * The output is page content only (title, style, root, script): the Artifact host wraps it in its
 * own document skeleton. `VITE_SINGLE_FILE` is set, so the simulation runs on the main thread
 * (there is no separate worker file to load).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'

const [entry, outDir, outName, fallbackTitle = 'Mandate'] = process.argv.slice(2)
if (!entry || !outDir || !outName) {
  throw new Error('Usage: build-single.ts <entry.html> <out-dir> <out-file> [title]')
}

process.env.VITE_SINGLE_FILE = '1'

await build({
  logLevel: 'warn',
  build: {
    outDir,
    emptyOutDir: true,
    // Inline every asset (fonts) as a data URI.
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 4000,
    rolldownOptions: { input: entry, output: { codeSplitting: false } },
  },
})

const html = readFileSync(join(outDir, entry), 'utf8')
const asset = (pattern: RegExp, kind: string): string => {
  const path = pattern.exec(html)?.[1]
  if (!path) throw new Error(`No ${kind} found in built ${entry}`)
  return readFileSync(join(outDir, path), 'utf8')
}

const css = asset(/<link rel="stylesheet"[^>]*href="\.?\/?([^"]+\.css)"/, 'stylesheet')
// A literal `</script` would end the inline script early.
const js = asset(/<script type="module"[^>]*src="\.?\/?([^"]+\.js)"/, 'script').replaceAll(
  '</script',
  '<\\/script',
)
const title = /<title>(.*?)<\/title>/.exec(html)?.[1] ?? fallbackTitle

const page = [
  `<title>${title}</title>`,
  `<style>\n${css}\n</style>`,
  '<div id="root"></div>',
  `<script type="module">\n${js}\n</script>`,
  '',
].join('\n')

const outFile = join(outDir, outName)
writeFileSync(outFile, page)
console.log(`Wrote ${outFile} (${(page.length / 1024).toFixed(0)} KB)`)
