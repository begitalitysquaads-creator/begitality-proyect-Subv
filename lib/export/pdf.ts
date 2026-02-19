import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

export interface PdfSection {
  title: string;
  content: string;
}

export interface GeneratePdfOptions {
  title: string;
  grantName: string;
  sections: PdfSection[];
}

// ─── Layout constants (A4 = 595 x 842 pt) ────────────────────────────────────
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN_H = 64;       // horizontal margin
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 60;
const CONTENT_W = PAGE_W - MARGIN_H * 2;
const FOOTER_H = 36;
const HEADER_H = 32;

// ─── Typography ───────────────────────────────────────────────────────────────
const SIZE_HERO = 28;
const SIZE_SECTION_TITLE = 13;
const SIZE_BODY = 10;
const SIZE_SMALL = 8;
const LINE_H_BODY = SIZE_BODY + 4;
const LINE_H_SECTION = SIZE_SECTION_TITLE + 6;

// ─── Color palette ────────────────────────────────────────────────────────────
const C_BRAND = rgb(0.18, 0.39, 0.93);        // #2D63EE
const C_BRAND_DARK = rgb(0.10, 0.22, 0.60);   // #193A99
const C_TEXT = rgb(0.10, 0.12, 0.18);         // near-black
const C_MUTED = rgb(0.42, 0.48, 0.58);        // slate-500
const C_LIGHT = rgb(0.90, 0.93, 0.97);        // slate-100
const C_WHITE = rgb(1, 1, 1);
const C_ACCENT = rgb(0.95, 0.97, 1.0);        // very light blue

// ─── Helpers ─────────────────────────────────────────────────────────────────
function wrapLines(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  maxWidth: number,
  size: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ─── Main generator ───────────────────────────────────────────────────────────
export async function generatePdf(options: GeneratePdfOptions): Promise<Buffer> {
  const { title, grantName, sections } = options;
  const doc = await PDFDocument.create();

  // Metadata
  doc.setTitle(title);
  doc.setSubject("Memoria Técnica");
  doc.setLanguage("es-ES");
  doc.setCreationDate(new Date());

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const today = formatDate(new Date());
  let pageCount = 0;

  // ── Helper: add a new page with header/footer shells ─────────────────────
  function addPage(): { page: ReturnType<typeof doc.addPage>; getY: () => number; setY: (v: number) => void } {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    pageCount++;
    let y = PAGE_H - MARGIN_TOP - HEADER_H;

    // Header bar (thin top accent line)
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 6,
      width: PAGE_W,
      height: 6,
      color: C_BRAND,
    });

    // Header text (only on pages after the cover)
    if (pageCount > 1) {
      // Left: project title (truncated)
      const headerTitle = title.length > 55 ? title.slice(0, 52) + "…" : title;
      page.drawText(headerTitle, {
        x: MARGIN_H,
        y: PAGE_H - 22,
        size: SIZE_SMALL,
        font: fontBold,
        color: C_MUTED,
      });
      // Right: page number placeholder text
      const pageLabel = `Página ${pageCount}`;
      const pageLabelW = font.widthOfTextAtSize(pageLabel, SIZE_SMALL);
      page.drawText(pageLabel, {
        x: PAGE_W - MARGIN_H - pageLabelW,
        y: PAGE_H - 22,
        size: SIZE_SMALL,
        font,
        color: C_MUTED,
      });
      // Separator line under header
      page.drawLine({
        start: { x: MARGIN_H, y: PAGE_H - 28 },
        end: { x: PAGE_W - MARGIN_H, y: PAGE_H - 28 },
        thickness: 0.5,
        color: C_LIGHT,
      });
    }

    // Footer separator + text
    page.drawLine({
      start: { x: MARGIN_H, y: FOOTER_H },
      end: { x: PAGE_W - MARGIN_H, y: FOOTER_H },
      thickness: 0.5,
      color: C_LIGHT,
    });
    page.drawText("Memoria Técnica  ·  Generado por Begitality", {
      x: MARGIN_H,
      y: FOOTER_H - 12,
      size: SIZE_SMALL,
      font: fontOblique,
      color: C_MUTED,
    });
    page.drawText(today, {
      x: PAGE_W - MARGIN_H - font.widthOfTextAtSize(today, SIZE_SMALL),
      y: FOOTER_H - 12,
      size: SIZE_SMALL,
      font,
      color: C_MUTED,
    });

    return {
      page,
      getY: () => y,
      setY: (v: number) => { y = v; },
    };
  }

  // ── COVER PAGE ─────────────────────────────────────────────────────────────
  {
    const { page } = addPage();

    // Full-bleed top banner
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 240,
      width: PAGE_W,
      height: 240,
      color: C_BRAND_DARK,
    });

    // Decorative diagonal stripe inside banner
    page.drawRectangle({
      x: PAGE_W - 160,
      y: PAGE_H - 240,
      width: 160,
      height: 240,
      color: C_BRAND,
      opacity: 0.6,
    });

    // "MEMORIA TÉCNICA" label inside banner
    page.drawText("MEMORIA TÉCNICA", {
      x: MARGIN_H,
      y: PAGE_H - 100,
      size: SIZE_HERO,
      font: fontBold,
      color: C_WHITE,
    });

    // Subtitle: convocatoria
    const grantLines = wrapLines(grantName, font, CONTENT_W - 80, 13);
    let gy = PAGE_H - 136;
    for (const gl of grantLines) {
      page.drawText(gl, {
        x: MARGIN_H,
        y: gy,
        size: 13,
        font,
        color: rgb(0.78, 0.86, 1.0),
      });
      gy -= 18;
    }

    // Thin accent line below banner
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 244,
      width: PAGE_W,
      height: 4,
      color: rgb(0.45, 0.65, 1.0),
    });

    // Project name card (below banner)
    const cardY = PAGE_H - 340;
    page.drawRectangle({
      x: MARGIN_H,
      y: cardY,
      width: CONTENT_W,
      height: 72,
      color: C_ACCENT,
      borderColor: C_LIGHT,
      borderWidth: 1,
    });
    page.drawText("Proyecto", {
      x: MARGIN_H + 20,
      y: cardY + 50,
      size: SIZE_SMALL,
      font: fontBold,
      color: C_BRAND,
    });
    const titleLines = wrapLines(title, fontBold, CONTENT_W - 40, 14);
    let ty = cardY + 36;
    for (const tl of titleLines.slice(0, 2)) {
      page.drawText(tl, {
        x: MARGIN_H + 20,
        y: ty,
        size: 14,
        font: fontBold,
        color: C_TEXT,
      });
      ty -= 18;
    }

    // Metadata grid
    const metaY = cardY - 48;
    const metaItems = [
      { label: "Fecha de generación", value: today },
      { label: "Total de secciones", value: String(sections.length) },
      { label: "Generado con", value: "Begitality AI" },
    ];
    let mx = MARGIN_H;
    for (const item of metaItems) {
      page.drawText(item.label.toUpperCase(), {
        x: mx,
        y: metaY,
        size: SIZE_SMALL,
        font: fontBold,
        color: C_MUTED,
      });
      page.drawText(item.value, {
        x: mx,
        y: metaY - 14,
        size: 10,
        font,
        color: C_TEXT,
      });
      mx += CONTENT_W / 3 + 4;
    }

    // Horizontal rule
    page.drawLine({
      start: { x: MARGIN_H, y: metaY - 34 },
      end: { x: PAGE_W - MARGIN_H, y: metaY - 34 },
      thickness: 1,
      color: C_LIGHT,
    });

    // Table of contents preview
    let tocY = metaY - 60;
    page.drawText("ÍNDICE DE CONTENIDOS", {
      x: MARGIN_H,
      y: tocY,
      size: SIZE_SMALL,
      font: fontBold,
      color: C_BRAND,
    });
    tocY -= 16;

    page.drawLine({
      start: { x: MARGIN_H, y: tocY },
      end: { x: PAGE_W - MARGIN_H, y: tocY },
      thickness: 0.5,
      color: C_LIGHT,
    });
    tocY -= 14;

    for (let i = 0; i < sections.length; i++) {
      if (tocY < MARGIN_BOTTOM + 40) break;
      const sectionTitle = sections[i].title;
      const displayTitle =
        sectionTitle.length > 64 ? sectionTitle.slice(0, 61) + "…" : sectionTitle;
      page.drawText(`${String(i + 1).padStart(2, "0")}.  ${displayTitle}`, {
        x: MARGIN_H + 4,
        y: tocY,
        size: SIZE_SMALL,
        font,
        color: C_TEXT,
      });
      // Dot leader
      const numStr = String(i + 2);
      page.drawText(numStr, {
        x: PAGE_W - MARGIN_H - font.widthOfTextAtSize(numStr, SIZE_SMALL),
        y: tocY,
        size: SIZE_SMALL,
        font,
        color: C_MUTED,
      });
      tocY -= 14;
    }
  }

  // ── CONTENT PAGES ──────────────────────────────────────────────────────────
  let current = addPage();
  let y = current.getY();

  const ensureSpace = (needed: number) => {
    if (y < MARGIN_BOTTOM + FOOTER_H + needed) {
      current = addPage();
      y = current.getY();
    }
    current.setY(y);
  };

  const drawLine = (
    text: string,
    opts: {
      size?: number;
      f?: typeof font;
      color?: ReturnType<typeof rgb>;
      indent?: number;
    } = {}
  ) => {
    const size = opts.size ?? SIZE_BODY;
    const f = opts.f ?? font;
    const color = opts.color ?? C_TEXT;
    const indent = opts.indent ?? 0;
    const maxW = CONTENT_W - indent;
    const wrapped = wrapLines(text, f, maxW, size);
    for (const ln of wrapped) {
      ensureSpace(size + 4);
      current.page.drawText(ln, {
        x: MARGIN_H + indent,
        y,
        size,
        font: f,
        color,
      });
      y -= size + 4;
      current.setY(y);
    }
  };

  for (let idx = 0; idx < sections.length; idx++) {
    const section = sections[idx];

    // ── Section header block ──────────────────────────────────────────────
    ensureSpace(LINE_H_SECTION + 28);

    // Section number badge
    const badgeW = 28;
    const badgeH = 18;
    current.page.drawRectangle({
      x: MARGIN_H,
      y: y - 2,
      width: badgeW,
      height: badgeH,
      color: C_BRAND,
    });
    const numStr = String(idx + 1).padStart(2, "0");
    const numW = fontBold.widthOfTextAtSize(numStr, SIZE_SMALL);
    current.page.drawText(numStr, {
      x: MARGIN_H + (badgeW - numW) / 2,
      y: y + 2,
      size: SIZE_SMALL,
      font: fontBold,
      color: C_WHITE,
    });

    // Section title text after badge
    const titleText =
      section.title.length > 80 ? section.title.slice(0, 77) + "…" : section.title;
    current.page.drawText(titleText, {
      x: MARGIN_H + badgeW + 8,
      y: y + 2,
      size: SIZE_SECTION_TITLE,
      font: fontBold,
      color: C_TEXT,
    });
    y -= LINE_H_SECTION;
    current.setY(y);

    // Underline
    current.page.drawLine({
      start: { x: MARGIN_H, y },
      end: { x: PAGE_W - MARGIN_H, y },
      thickness: 0.75,
      color: C_BRAND,
      opacity: 0.35,
    });
    y -= 10;
    current.setY(y);

    // ── Section body ──────────────────────────────────────────────────────
    const bodyText = section.content?.trim() || "(Sin contenido)";
    // Paragraphs split by double newline
    const paragraphs = bodyText.split(/\n{2,}/);
    for (const para of paragraphs) {
      const singleLines = para.split(/\n/);
      for (const sl of singleLines) {
        drawLine(sl || " ", { size: SIZE_BODY, color: C_TEXT });
      }
      y -= 6; // paragraph gap
      current.setY(y);
    }

    // Gap between sections
    y -= 20;
    current.setY(y);

    // Light separator
    if (idx < sections.length - 1) {
      ensureSpace(16);
      current.page.drawLine({
        start: { x: MARGIN_H, y },
        end: { x: PAGE_W - MARGIN_H, y },
        thickness: 0.4,
        color: C_LIGHT,
      });
      y -= 16;
      current.setY(y);
    }
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
