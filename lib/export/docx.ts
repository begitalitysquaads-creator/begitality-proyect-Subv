import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

export interface DocxSection {
  title: string;
  content: string;
}

export interface GenerateDocxOptions {
  title: string;
  grantName: string;
  sections: DocxSection[];
}

export async function generateDocx(options: GenerateDocxOptions): Promise<Buffer> {
  const { title, grantName, sections } = options;

  const children: Paragraph[] = [
    new Paragraph({
      text: "MEMORIA TÉCNICA",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: grantName,
          size: 22,
          color: "64748B",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  for (const section of sections) {
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: section.content || "(Sin contenido)",
            size: 22,
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
