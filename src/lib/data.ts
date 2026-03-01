export type Note = {
  id: string;
  title: string;
  folder: string;
  type: 'Quick' | 'Journal' | 'Long-form' | 'Structured';
  updatedAt: string;
  pinned?: boolean;
  tags: string[];
};

export const notes: Note[] = [
  {
    id: 'n1',
    title: 'Signal vs noise checklist for article reviews',
    folder: 'Research Desk',
    type: 'Structured',
    updatedAt: 'Today, 09:40',
    pinned: true,
    tags: ['news', 'rubric', 'critical-reading']
  },
  {
    id: 'n2',
    title: 'Daily journal — steady focus over frantic output',
    folder: 'Daily Journal',
    type: 'Journal',
    updatedAt: 'Today, 07:05',
    tags: ['journal', 'focus']
  },
  {
    id: 'n3',
    title: 'Quick capture: link tasks to notes while context is fresh',
    folder: 'Inbox',
    type: 'Quick',
    updatedAt: 'Yesterday, 21:14',
    tags: ['workflow']
  }
];

export const dictionaryEntries = [
  {
    id: 'd1',
    term: 'apophenia',
    status: 'Reviewed',
    conciseDefinition: 'Seeing patterns that are not supported by strong evidence.',
    etymology: 'Greek roots: apo- + phainein.'
  },
  {
    id: 'd2',
    term: 'epistemic humility',
    status: 'Draft',
    conciseDefinition: 'Holding conclusions with openness to correction.',
    etymology: 'From Greek epistēmē (knowledge).'
  }
];

export const sources = [
  { id: 's1', name: 'BBC News', reliability: 4, note: 'Strong editorial process.' },
  { id: 's2', name: 'Al Jazeera', reliability: 4, note: 'Wide international coverage.' },
  { id: 's3', name: 'New York Times', reliability: 4, note: 'Deep reporting; paywalled context.' }
];

export const articles = [
  {
    id: 'a1',
    title: 'Sample coverage item for rubric scoring',
    outlet: 'BBC',
    confidence: 4,
    summary: 'Used as a baseline example for comparative evaluation.'
  },
  {
    id: 'a2',
    title: 'Alternative framing sample',
    outlet: 'NYT',
    confidence: 3,
    summary: 'Useful for side-by-side context breadth comparison.'
  }
];

export const tasks = [
  { id: 't1', title: 'Review 3 saved articles', status: 'Next action' },
  { id: 't2', title: 'Write daily journal entry', status: 'Today' },
  { id: 't3', title: 'Refine dictionary entry: apophenia', status: 'Waiting' }
];
