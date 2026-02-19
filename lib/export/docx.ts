import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageBreak,
  Tab,
  TabStopType,
  TabStopPosition,
  type ISectionOptions,
} from "docx";

// docx v8+ uses a union type for children; use (Paragraph | Table)[] to avoid strict type errors
type DocxChild = Paragraph | Table;

export interface DocxSection {
  title: string;
  content: string;
}

export interface GenerateDocxOptions {
  title: string;
  grantName: string;
  sections: DocxSection[];
}

// ─── Brand colors (hex strings used by docx) ─────────────────────────────────
const COLOR_BRAND = "2D63EE";
const COLOR_BRAND_DARK = "193A99";
const COLOR_TEXT = "1A1E2E";
const COLOR_MUTED = "64748B";
const COLOR_LIGHT_BG = "EEF2FF";
const COLOR_WHITE = "FFFFFF";

// ─── Shared font name ────────────────────────────────────────────────────────
const FONT = "Calibri";

function today(): string {
  return new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Main generator ───────────────────────────────────────────────────────────
export async function generateDocx(options: GenerateDocxOptions): Promise<Buffer> {
  const { title, grantName, sections } = options;

  // ── Common header ──────────────────────────────────────────────────────────
  const commonHeader = new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: "MEMORIA TÉCNICA  ·  ",
            font: FONT,
            size: 16,
            color: COLOR_MUTED,
            bold: true,
          }),
          new TextRun({
            text: title,
            font: FONT,
            size: 16,
            color: COLOR_MUTED,
          }),
        ],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 4, color: "DBEAFE" },
        },
        spacing: { after: 100 },
      }),
    ],
  });

  // ── Common footer with page number ─────────────────────────────────────────
  const commonFooter = new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: "Begitality AI  ·  ", font: FONT, size: 16, color: COLOR_MUTED }),
          new TextRun({ text: today(), font: FONT, size: 16, color: COLOR_MUTED }),
          new TextRun({ text: "\t", font: FONT, size: 16 }),
          new TextRun({ text: "Pág. ", font: FONT, size: 16, color: COLOR_MUTED }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: FONT,
            size: 16,
            color: COLOR_MUTED,
          }),
          new TextRun({ text: " / ", font: FONT, size: 16, color: COLOR_MUTED }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: FONT,
            size: 16,
            color: COLOR_MUTED,
          }),
        ],
        tabStops: [
          { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
        ],
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "DBEAFE" },
        },
        spacing: { before: 100 },
      }),
    ],
  });

  // ── Cover page children ────────────────────────────────────────────────────
  const coverChildren: DocxChild[] = [
    // Large spacing to push content down
    new Paragraph({ spacing: { after: 2000 } }),

    // Brand: "MEMORIA TÉCNICA"
    new Paragraph({
      children: [
        new TextRun({
          text: "MEMORIA",
          font: FONT,
          size: 72,        // 36pt
          bold: true,
          color: COLOR_BRAND_DARK,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 0 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "TÉCNICA",
          font: FONT,
          size: 72,
          bold: true,
          color: COLOR_BRAND,
        }),
      ],
      alignment: AlignmentType.LEFT,
      spacing: { after: 400 },
    }),

    // Horizontal rule (simulate with border on paragraph)
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR_BRAND },
      },
      spacing: { after: 400 },
    }),

    // Project title
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          font: FONT,
          size: 36,         // 18pt
          bold: true,
          color: COLOR_TEXT,
        }),
      ],
      spacing: { after: 200 },
    }),

    // Grant / Convocatoria
    new Paragraph({
      children: [
        new TextRun({
          text: grantName,
          font: FONT,
          size: 26,         // 13pt
          italics: true,
          color: COLOR_MUTED,
        }),
      ],
      spacing: { after: 600 },
    }),

    // Metadata table (date, sections)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.SOLID, color: COLOR_LIGHT_BG },
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "FECHA DE GENERACIÓN", font: FONT, size: 14, bold: true, color: COLOR_BRAND }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: today(), font: FONT, size: 20, color: COLOR_TEXT }),
                  ],
                }),
              ],
            }),
            new TableCell({
              shading: { type: ShadingType.SOLID, color: COLOR_LIGHT_BG },
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 150, right: 150 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "TOTAL SECCIONES", font: FONT, size: 14, bold: true, color: COLOR_BRAND }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: String(sections.length), font: FONT, size: 20, color: COLOR_TEXT }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),

    // Force page break after cover
    new Paragraph({
      children: [new PageBreak()],
      spacing: { after: 0 },
    }),
  ];

  // ── Table of contents page ─────────────────────────────────────────────────
  const tocChildren: DocxChild[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: "ÍNDICE DE CONTENIDOS",
          font: FONT,
          size: 28,
          bold: true,
          color: COLOR_BRAND,
        }),
      ],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BRAND },
      },
      spacing: { after: 300 },
    }),
  ];

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    tocChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${String(i + 1).padStart(2, "0")}.  ${s.title}`,
            font: FONT,
            size: 22,
            color: COLOR_TEXT,
          }),
          new TextRun({ children: [new Tab()], font: FONT, size: 22 }),
          new TextRun({
            text: String(i + 3),   // estimate: cover + toc + sections
            font: FONT,
            size: 22,
            color: COLOR_MUTED,
          }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: 8000 }],
        spacing: { after: 120 },
        border: {
          bottom: { style: BorderStyle.DOTTED, size: 2, color: "CBD5E1" },
        },
      })
    );
  }

  tocChildren.push(
    new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } })
  );

  // ── Content pages ──────────────────────────────────────────────────────────
  const contentChildren: DocxChild[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const num = String(i + 1).padStart(2, "0");

    // Section number + title
    contentChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${num}. `,
            font: FONT,
            size: 30,
            bold: true,
            color: COLOR_BRAND,
          }),
          new TextRun({
            text: section.title,
            font: FONT,
            size: 30,
            bold: true,
            color: COLOR_TEXT,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 160 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_BRAND },
        },
        indent: { left: 200 },
      })
    );

    // Body text (split by paragraphs)
    const bodyText = section.content?.trim() || "(Sin contenido)";
    const paragraphs = bodyText.split(/\n{2,}/);
    for (const para of paragraphs) {
      const lines = para.split(/\n/);
      for (const line of lines) {
        contentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line || " ",
                font: FONT,
                size: 22,   // 11pt
                color: COLOR_TEXT,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200, line: 280 },
          })
        );
      }
    }

    // Section divider (except last)
    if (i < sections.length - 1) {
      contentChildren.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 3, color: "E2E8F0" },
          },
          spacing: { after: 200 },
        })
      );
    }
  }

  // ── Assemble document ──────────────────────────────────────────────────────
  const docxDoc = new Document({
    title,
    description: "Memoria Técnica generada por Begitality AI",
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22, color: COLOR_TEXT },
        },
      },
    },
    sections: [
      // Cover (no header/footer)
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
          titlePage: true,
        },
        children: coverChildren,
      },
      // ToC + content (with header/footer)
      {
        headers: { default: commonHeader },
        footers: { default: commonFooter },
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1260, right: 1260 },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        children: [...tocChildren, ...contentChildren],
      },
    ],
  });

  return Packer.toBuffer(docxDoc);
}
