import { VisualCanvas } from '@/components/visual-canvas';

export default function FocusPage() {
  return (
    <div className="space-y-6">
      <section className="panel">
        <p className="section-title">Observatory</p>
        <h1 className="mt-2 text-3xl font-semibold">Immersive focus atmosphere</h1>
        <p className="mt-2 text-sm text-muted">A lightweight particle field for reflective thinking, with reduced-motion fallbacks and no heavy 3D dependency.</p>
      </section>
      <VisualCanvas />
    </div>
  );
}
