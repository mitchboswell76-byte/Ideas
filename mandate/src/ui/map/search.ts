/** Case- and accent-insensitive name search ("cote" finds Côte d'Ivoire, "ynys mon" Ynys Môn). */
export function matchesSearch(name: string, query: string): boolean {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return fold(name).includes(fold(query.trim()))
}
