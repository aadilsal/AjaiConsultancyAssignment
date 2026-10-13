// Generates fixtures/notes.docx (headings, bullet list, bold, italic, underline).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'notes.docx');

export async function makeDocx(path = out) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: 'Docx Heading One', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: 'Docx Heading Two', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [
              new TextRun('Plain then '),
              new TextRun({ text: 'docx bold', bold: true }),
              new TextRun(', '),
              new TextRun({ text: 'docx italic', italics: true }),
              new TextRun(' and '),
              new TextRun({ text: 'docx underline', underline: {} }),
              new TextRun('.'),
            ],
          }),
          new Paragraph({ text: 'Docx bullet one', bullet: { level: 0 } }),
          new Paragraph({ text: 'Docx bullet two', bullet: { level: 0 } }),
        ],
      },
    ],
  });
  writeFileSync(path, await Packer.toBuffer(doc));
  return path;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  makeDocx().then((p) => console.log(`wrote ${p}`));
}
