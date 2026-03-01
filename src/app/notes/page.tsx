import { notes } from '@/lib/data';

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <section className="panel">
        <p className="section-title">Notes and diary</p>
        <h1 className="mt-2 text-3xl font-semibold">Capture fast, think deeply</h1>
        <p className="mt-2 text-sm text-muted">Folders, note types, pins, and structured writing in a hybrid markdown-friendly workflow.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {notes.map((note) => (
          <article key={note.id} className="panel">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>{note.folder} · {note.type}</span>
              <span>{note.updatedAt}</span>
            </div>
            <h2 className="text-lg font-medium">{note.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {note.tags.map((tag) => <span key={tag} className="rounded bg-white/10 px-2 py-1 text-xs">#{tag}</span>)}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
