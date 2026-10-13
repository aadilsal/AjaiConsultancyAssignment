import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// Idempotent: upserts users, creates docs only when Alice has none.
const prisma = new PrismaClient();

const USERS = [
  { email: 'alice@ajaia.test', name: 'Alice Johnson' },
  { email: 'bob@ajaia.test', name: 'Bob Smith' },
  { email: 'carol@ajaia.test', name: 'Carol Diaz' },
];

const text = (t: string, marks?: { type: string }[]) => ({ type: 'text', text: t, ...(marks && { marks }) });
const para = (...content: object[]) => ({ type: 'paragraph', content });
const item = (t: string) => ({ type: 'listItem', content: [para(text(t))] });

const Q4_CONTENT = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [text('Q4 Planning Notes')] },
    para(
      text('This quarter we focus on '),
      text('reliability', [{ type: 'bold' }]),
      text(' and '),
      text('delightful editing', [{ type: 'italic' }]),
      text('.'),
    ),
    { type: 'heading', attrs: { level: 2 }, content: [text('Goals')] },
    { type: 'bulletList', content: [item('Ship document sharing'), item('Import .docx files'), item('Autosave everywhere')] },
    { type: 'heading', attrs: { level: 2 }, content: [text('Next steps')] },
    { type: 'orderedList', attrs: { start: 1 }, content: [item('Review the PRD'), item('Demo to the team'), item('Collect feedback')] },
  ],
};

const simpleDoc = (t: string) => ({ type: 'doc', content: [para(text(t))] });

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash('demo1234', 10);
  const [alice, bob] = await Promise.all(
    USERS.map((u) =>
      prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash } }),
    ),
  );

  if ((await prisma.document.count({ where: { ownerId: alice.id } })) > 0) {
    console.log('Seed: documents already present, skipping.');
    return;
  }

  const q4 = await prisma.document.create({ data: { ownerId: alice.id, title: 'Q4 Planning Notes', content: Q4_CONTENT } });
  await prisma.documentShare.create({ data: { documentId: q4.id, userId: bob.id, role: 'editor' } });
  await prisma.document.create({
    data: { ownerId: alice.id, title: 'Private Draft', content: simpleDoc('Only Alice can see this.') },
  });
  await prisma.document.create({
    data: { ownerId: bob.id, title: "Bob's Ideas", content: simpleDoc('Ideas for the next sprint.') },
  });
  console.log('Seed: created demo users and documents.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
