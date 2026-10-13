import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Builds test/fixtures/sample.docx: heading, bullets, bold/italic/underline.
export async function buildSampleDocx(): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: 'Quarterly Report', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: 'Highlights', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Bold text', bold: true }),
              new TextRun(' then '),
              new TextRun({ text: 'italic text', italics: true }),
              new TextRun(' then '),
              new TextRun({ text: 'underlined text', underline: {} }),
            ],
          }),
          new Paragraph({ text: 'First bullet', bullet: { level: 0 } }),
          new Paragraph({ text: 'Second bullet', bullet: { level: 0 } }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  writeFileSync(join(__dirname, 'sample.docx'), buffer);
  return buffer;
}

if (require.main === module) void buildSampleDocx();
