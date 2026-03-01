import { articles, sources } from '@/lib/data';

export default function NewsPage() {
  return (
    <div className="space-y-6">
      <section className="panel">
        <p className="section-title">News evaluation</p>
        <h1 className="mt-2 text-3xl font-semibold">Transparent source and article judgement</h1>
        <p className="mt-2 text-sm text-muted">Rubric-first review: evidence strength, context breadth, framing, and reliability notes.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel">
          <p className="section-title mb-3">Source profiles</p>
          {sources.map((source) => (
            <div key={source.id} className="mb-3 rounded-lg border border-white/10 p-3">
              <p className="text-sm font-medium">{source.name}</p>
              <p className="text-xs text-muted">Reliability: {source.reliability}/5 · {source.note}</p>
            </div>
          ))}
        </div>

        <div className="panel">
          <p className="section-title mb-3">Articles awaiting judgement</p>
          {articles.map((article) => (
            <div key={article.id} className="mb-3 rounded-lg border border-white/10 p-3">
              <p className="text-sm font-medium">{article.title}</p>
              <p className="text-xs text-muted">{article.outlet} · Confidence {article.confidence}/5</p>
              <p className="mt-1 text-xs text-muted">{article.summary}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
