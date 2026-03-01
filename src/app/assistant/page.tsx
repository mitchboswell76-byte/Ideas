import { tasks } from '@/lib/data';

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <section className="panel">
        <p className="section-title">Personal assistant</p>
        <h1 className="mt-2 text-3xl font-semibold">Planning, decisions, and next actions</h1>
        <p className="mt-2 text-sm text-muted">Useful without external AI, with a clean extension path for local models later.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel">
          <p className="section-title mb-3">Task inbox</p>
          {tasks.map((task) => (
            <div key={task.id} className="mb-2 rounded-lg border border-white/10 px-3 py-2 text-sm">
              {task.title} <span className="text-xs text-muted">· {task.status}</span>
            </div>
          ))}
        </div>
        <div className="panel">
          <p className="section-title mb-3">Daily plan template</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>One strategic output</li>
            <li>Three concrete next actions</li>
            <li>One deliberate review checkpoint</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
