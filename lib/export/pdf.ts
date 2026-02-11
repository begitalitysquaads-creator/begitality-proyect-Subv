import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface PdfSection {
  title: string;
  content: string;
}

export interface GeneratePdfOptions {
  title: string;
  grantName: string;
  sections: PdfSection[];
}

const MARGIN = 72;
const PAGE_WIDTH = 595;
const LINE_HEIGHT = 14;
const TITLE_SIZE = 18;
const BODY_SIZE = 11;

function wrapLines(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  maxWidth: number,
  size: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  const getWidth = (t: string) => font.widthOfTextAtSize(t, size);
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (getWidth(candidate) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generatePdf(options: GeneratePdfOptions): Promise<Buffer> {
  const { title, grantName, sections } = options;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = PAGE_WIDTH - 2 * MARGIN;

  let page = doc.addPage([PAGE_WIDTH, 842]);
  let y = 842 - MARGIN;

  const drawText = (text: string, opts: { size?: number; font?: typeof font; color?: ReturnType<typeof rgb> } = {}) => {
    const size = opts.size ?? BODY_SIZE;
    const f = opts.font ?? font;
    const color = opts.color ?? rgb(0, 0, 0);
    const lines = wrapLines(text, f, contentWidth, size);
    for (const line of lines) {
      if (y < MARGIN + LINE_HEIGHT) {
        page = doc.addPage([PAGE_WIDTH, 842]);
        y = 842 - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y, size, font: f, color });
      y -= size + 2;
    }
  };

  page.drawText("MEMORIA TÉCNICA", {
    x: MARGIN,
    y,
    size: 22,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 28;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 12;

  page.drawText(grantName, {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: rgb(0.39, 0.45, 0.55),
  });
  y -= 32;

  for (const section of sections) {
    if (y < MARGIN + 60) {
      page = doc.addPage([PAGE_WIDTH, 842]);
      y = 842 - MARGIN;
    }
    page.drawText(section.title, {
      x: MARGIN,
      y,
      size: TITLE_SIZE,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    y -= TITLE_SIZE + 6;
    drawText(section.content || "(Sin contenido)", { size: BODY_SIZE });
    y -= 20;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
