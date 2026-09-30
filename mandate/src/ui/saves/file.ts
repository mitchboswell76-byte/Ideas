/**
 * Save export/import. A normal browser tab downloads the gzip save bytes as they are stored in a
 * slot (`.mandate`). The published Artifact exports the plain JSON as `.json` through the viewer's
 * downloads capability (see `host.ts`), which refuses `.mandate`. Import reads either: the runner
 * tells them apart by the gzip header.
 */

export type SaveFormat = 'mandate' | 'json'

export const SAVE_FILE_EXTENSIONS: Readonly<Record<SaveFormat, string>> = {
  mandate: '.mandate',
  json: '.json',
}

/** `accept` for the import picker. */
export const IMPORT_ACCEPT = '.mandate,.json,application/json'

/** Lower-case ASCII words joined by hyphens, for file names. */
function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** `mandate-<name>-<date>.<ext>`; the name part is left out while there is none (or it slugs away). */
export function saveFileName(gameDate: string, format: SaveFormat, name?: string): string {
  const parts = ['mandate', name ? slug(name) : '', gameDate].filter(Boolean)
  return parts.join('-') + SAVE_FILE_EXTENSIONS[format]
}

export function downloadSave(bytes: Uint8Array<ArrayBuffer>, fileName: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Some browsers start the download asynchronously; revoke once it has surely begun.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Raw bytes of a chosen file; the runner validates them when loading. */
export async function readSaveFile(file: Blob): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await file.arrayBuffer())
}
