import { dictionaryEntries } from '@/lib/data';

export default function DictionaryPage() {
  return (
    <div className="space-y-6">
      <section className="panel">
        <p className="section-title">Personal dictionary</p>
        <h1 className="mt-2 text-3xl font-semibold">Your living language archive</h1>
        <p className="mt-2 text-sm text-muted">Manual curation first, with clean fields ready for later API enrichment.</p>
      </section>

      {dictionaryEntries.map((entry) => (
        <article key={entry.id} className="panel">
          <div className="mb-2 flex justify-between text-xs text-muted">
            <span>{entry.status}</span>
            <span>Cross-link ready</span>
          </div>
          <h2 className="text-2xl font-semibold">{entry.term}</h2>
          <p className="mt-2 text-sm">{entry.conciseDefinition}</p>
          <p className="mt-2 text-xs text-muted">Etymology: {entry.etymology}</p>
        </article>
      ))}
    </div>
  );
}
