'use client';

import { useMemo, useState } from 'react';
import { globalSearch } from '@/lib/search';

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => globalSearch(query), [query]);

  return (
    <section className="panel">
      <p className="section-title mb-3">Global search</p>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search notes, dictionary, news, tasks..."
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none ring-accent transition focus:ring-2"
      />
      <div className="mt-4 space-y-2">
        {results.slice(0, 6).map((result) => (
          <div key={result.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-sm font-medium">{result.title}</p>
            <p className="text-xs text-muted">{result.kind} · {result.meta}</p>
          </div>
        ))}
        {query && results.length === 0 ? <p className="text-xs text-muted">No matches yet. Try tags, terms, or outlet names.</p> : null}
      </div>
    </section>
  );
}
