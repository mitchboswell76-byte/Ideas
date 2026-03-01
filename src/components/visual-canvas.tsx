'use client';

import { useEffect, useRef } from 'react';

type Dot = { x: number; y: number; vx: number; vy: number; r: number };

export function VisualCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;

    const dots: Dot[] = Array.from({ length: 42 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * 420,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 2 + 0.8
    }));

    let frame = 0;
    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = () => {
      frame = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      dots.forEach((dot) => {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > canvas.clientWidth) dot.vx *= -1;
        if (dot.y < 0 || dot.y > canvas.clientHeight) dot.vy *= -1;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(171, 208, 255, 0.6)';
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      });
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="h-72 w-full rounded-2xl border border-white/10 bg-black/30" />;
}
