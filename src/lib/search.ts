import { articles, dictionaryEntries, notes, tasks } from '@/lib/data';

export type SearchResult = {
  id: string;
  title: string;
  kind: 'Note' | 'Article' | 'Dictionary' | 'Task';
  meta: string;
};

export function globalSearch(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  notes.forEach((note) => {
    if (note.title.toLowerCase().includes(q) || note.tags.join(' ').toLowerCase().includes(q)) {
      results.push({ id: note.id, title: note.title, kind: 'Note', meta: `${note.folder} · ${note.type}` });
    }
  });

  dictionaryEntries.forEach((entry) => {
    if (entry.term.toLowerCase().includes(q) || entry.conciseDefinition.toLowerCase().includes(q)) {
      results.push({ id: entry.id, title: entry.term, kind: 'Dictionary', meta: entry.status });
    }
  });

  articles.forEach((article) => {
    if (article.title.toLowerCase().includes(q) || article.summary.toLowerCase().includes(q)) {
      results.push({ id: article.id, title: article.title, kind: 'Article', meta: `${article.outlet} · confidence ${article.confidence}/5` });
    }
  });

  tasks.forEach((task) => {
    if (task.title.toLowerCase().includes(q)) {
      results.push({ id: task.id, title: task.title, kind: 'Task', meta: task.status });
    }
  });

  return results;
}
