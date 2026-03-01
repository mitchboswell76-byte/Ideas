import { NextResponse } from 'next/server';
import { articles, dictionaryEntries, notes, sources, tasks } from '@/lib/data';

export async function GET() {
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    version: '0.1.0',
    notes,
    dictionaryEntries,
    sources,
    articles,
    tasks
  });
}
