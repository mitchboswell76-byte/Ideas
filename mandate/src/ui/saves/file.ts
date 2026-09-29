/** `.mandate` export/import: the file is the gzip save bytes as stored in a slot. */

export const SAVE_FILE_EXTENSION = '.mandate'

export function saveFileName(gameDate: string): string {
  return `mandate-${gameDate}${SAVE_FILE_EXTENSION}`
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
