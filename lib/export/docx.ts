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
  viabilityReport?: any;
  reviewReport?: any;
}

export async function generateDocx(options: GenerateDocxOptions): Promise<Buffer> {
  const { title, grantName, sections, viabilityReport, reviewReport } = options;

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

  // Añadir resumen de viabilidad si existe
  if (viabilityReport) {
    children.push(
      new Paragraph({
        text: "RESUMEN DE VIABILIDAD IA",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Puntuación Global: ${viabilityReport.overall_score}/100`,
            bold: true,
            color: viabilityReport.overall_score >= 75 ? "10B981" : "F59E0B",
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: viabilityReport.summary,
        spacing: { after: 400 },
      })
    );
  }

  // Añadir resumen de revisión técnica si existe
  if (reviewReport) {
    children.push(
      new Paragraph({
        text: "ANÁLISIS DE CALIDAD TÉCNICA",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Quality Score: ${reviewReport.score}/100`,
            bold: true,
            color: reviewReport.score >= 80 ? "10B981" : "F59E0B",
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: reviewReport.summary,
        spacing: { after: 400 },
      })
    );
  }

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
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}

export interface ReviewDocxData {
  title: string;
  clientName: string;
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export async function generateReviewDocx(data: ReviewDocxData): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      text: "INFORME DE AUDITORÍA TÉCNICA",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: `Cliente: ${data.clientName}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: `PROYECTO: ${data.title.toUpperCase()}`,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `QUALITY SCORE: ${data.score}/100`,
          bold: true,
          size: 28,
          color: data.score >= 80 ? "10B981" : "F59E0B",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
    new Paragraph({ text: "1. RESUMEN EJECUTIVO", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    new Paragraph({ text: data.summary, spacing: { after: 400 } }),
    
    new Paragraph({ text: "2. ANÁLISIS DE FORTALEZAS", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    ...data.strengths.map(s => new Paragraph({ text: `• ${s}`, spacing: { after: 100 } })),

    new Paragraph({ text: "3. RIESGOS Y DEBILIDADES", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    ...data.weaknesses.map(w => new Paragraph({ text: `• ${w}`, spacing: { after: 100 } })),

    new Paragraph({ text: "4. PLAN DE ACCIÓN RECOMENDADO", heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }),
    ...data.improvements.map((imp, i) => new Paragraph({ text: `${i + 1}. ${imp}`, spacing: { after: 100 } })),
  ];

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
