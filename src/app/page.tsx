import Link from 'next/link';
import { SearchPanel } from '@/components/search-panel';
import { notes, tasks, articles, dictionaryEntries } from '@/lib/data';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="panel">
        <p className="section-title">Daily brief</p>
        <h1 className="mt-2 text-3xl font-semibold">Your private command centre</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Quick capture, structured thinking, source evaluation, and connected planning in one calm workspace.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link href="/notes" className="rounded-full bg-white/10 px-3 py-1">Open notes</Link>
          <Link href="/news" className="rounded-full bg-white/10 px-3 py-1">Review coverage</Link>
          <Link href="/focus" className="rounded-full bg-white/10 px-3 py-1">Enter focus mode</Link>
        </div>
      </section>

      <SearchPanel />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel">
          <p className="section-title mb-3">Recent notes</p>
          {notes.slice(0, 3).map((note) => <p className="mb-2 text-sm" key={note.id}>{note.title}</p>)}
        </div>
        <div className="panel">
          <p className="section-title mb-3">News queue</p>
          {articles.map((article) => <p className="mb-2 text-sm" key={article.id}>{article.outlet}: {article.title}</p>)}
        </div>
        <div className="panel">
          <p className="section-title mb-3">Next actions</p>
          {tasks.map((task) => <p className="mb-2 text-sm" key={task.id}>{task.title}</p>)}
        </div>
      </section>

      <section className="panel">
        <p className="section-title mb-3">Recent lexicon entries</p>
        {dictionaryEntries.map((entry) => <p className="mb-1 text-sm" key={entry.id}>{entry.term} · {entry.status}</p>)}
      </section>
    </div>
  );
}
