/**
 * Minimal RFC 4180 CSV reader: quoted fields (with "" escapes, commas and newlines inside),
 * CRLF or LF line ends, optional UTF-8 BOM. Returns header-keyed rows; blank lines are skipped.
 */
export type CsvRow = Record<string, string>

export function parseCsv(text: string): CsvRow[] {
  const records = parseRecords(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
  const header = records.shift()
  if (!header) return []
  return records.map((fields, i) => {
    if (fields.length !== header.length) {
      throw new Error(`CSV row ${i + 2} has ${fields.length} fields, expected ${header.length}`)
    }
    return Object.fromEntries(header.map((h, j) => [h.trim(), fields[j]]))
  })
}

function parseRecords(text: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false
  let i = 0
  const endRecord = () => {
    record.push(field)
    if (record.length > 1 || record[0] !== '') records.push(record)
    record = []
    field = ''
  }
  while (i < text.length) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i += 2
        continue
      }
      if (ch === '"') quoted = false
      else field += ch
      i++
      continue
    }
    if (ch === '"' && field === '') quoted = true
    else if (ch === ',') {
      record.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      endRecord()
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else field += ch
    i++
  }
  if (quoted) throw new Error('CSV ends inside a quoted field')
  if (field !== '' || record.length > 0) endRecord()
  return records
}
