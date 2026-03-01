import { PrismaClient, NoteType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.link.deleteMany();
  await prisma.task.deleteMany();
  await prisma.article.deleteMany();
  await prisma.source.deleteMany();
  await prisma.dictionaryEntry.deleteMany();
  await prisma.note.deleteMany();
  await prisma.folder.deleteMany();

  const research = await prisma.folder.create({ data: { name: 'Research Desk' } });
  const journal = await prisma.folder.create({ data: { name: 'Daily Journal' } });

  const note = await prisma.note.create({
    data: {
      title: 'Launch architecture intent',
      content: 'Build a private command centre with frictionless capture and transparent evaluation workflows.',
      tags: 'mvp,architecture,vision',
      type: NoteType.STRUCTURED,
      pinned: true,
      folderId: research.id
    }
  });

  await prisma.note.create({
    data: {
      title: 'Daily reflection',
      content: 'The system should feel calm under heavy information load.',
      tags: 'journal,focus',
      type: NoteType.JOURNAL,
      folderId: journal.id
    }
  });

  const source = await prisma.source.create({
    data: {
      name: 'BBC News',
      homepage: 'https://www.bbc.com/news',
      reliability: 4,
      reliabilityNote: 'Consistent editorial process and correction discipline.',
      biasNote: 'UK institutional framing; broad but occasionally state-centred.'
    }
  });

  const article = await prisma.article.create({
    data: {
      title: 'Sample coverage comparison item',
      summary: 'Demonstrates article-level rubric scoring and context checks.',
      outlet: 'BBC',
      confidence: 4,
      evaluation: 'Good sourcing with moderate context depth.',
      sourceId: source.id
    }
  });

  const entry = await prisma.dictionaryEntry.create({
    data: {
      term: 'apophenia',
      partOfSpeech: 'noun',
      conciseDefinition: 'The tendency to perceive meaningful patterns in unrelated information.',
      extendedDefinition: 'Often discussed in psychology when pattern recognition outpaces evidence.',
      etymology: 'From Greek apo- (away from) + phainein (to show).',
      usageHistory: 'Popularised in clinical writing in the twentieth century.',
      examples: '“In media analysis, apophenia can turn coincidence into narrative certainty.”',
      status: 'reviewed',
      pinned: true,
      notes: 'Useful term for the news evaluation module.'
    }
  });

  await prisma.task.create({
    data: {
      title: 'Review three saved articles against rubric',
      status: 'next',
      note: 'Link strongest note to final judgement.'
    }
  });

  await prisma.link.create({
    data: {
      fromKind: 'NOTE',
      fromId: note.id,
      toKind: 'ARTICLE',
      toId: article.id,
      note: 'Architecture note references this coverage workflow.'
    }
  });

  await prisma.link.create({
    data: {
      fromKind: 'NOTE',
      fromId: note.id,
      toKind: 'DICTIONARY',
      toId: entry.id,
      note: 'Key concept linked to critical reasoning.'
    }
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
