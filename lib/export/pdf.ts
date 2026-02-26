import { jsPDF } from "jspdf";

interface ViabilityData {
  title: string;
  clientName: string;
  grantName: string;
  status: string;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  probability: number;
}

interface ReviewData {
  title: string;
  clientName: string;
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

// Helper para escribir texto con salto de página automático y control de viñetas
function writeText(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, width);
  lines.forEach((line: string) => {
    if (y > 270) {
      addFooter(doc, "INFORME TÉCNICO DE CALIDAD");
      doc.addPage();
      y = 25;
    }
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function addFooter(doc: jsPDF, title: string) {
  const pageCount = doc.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`© 2026 Begitality Intelligence Systems - ${title}`, 25, 285);
  doc.text(`Pág. ${pageCount}`, 185, 285);
}

// --- GENERADOR: REPORTE DE AUDITORÍA DE CALIDAD (GOVERNMENT-READY) ---
export async function generateReviewReport(data: ReviewData): Promise<ArrayBuffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 25;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // 1. PORTADA INSTITUCIONAL
  doc.setFillColor(15, 23, 42); // Navy Blue
  doc.rect(0, 0, pageWidth, 297, "F");
  
  // Líneas decorativas
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(margin, 60, margin + 20, 60);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("INFORME DE", margin, 85);
  doc.text("AUDITORÍA TÉCNICA", margin, 97);
  
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text("CERTIFICACIÓN DE CALIDAD Y ELEGIBILIDAD DE MEMORIA", margin, 105);

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(data.title.toUpperCase(), contentWidth);
  doc.text(titleLines, margin, 130);

  // Sello inferior
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 250, pageWidth, 47, "F");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("EMITIDO POR:", margin, 265);
  doc.setFontSize(12);
  doc.text("BEGITALITY ASSIST AI", margin, 272);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("DEPARTAMENTO DE VALIDACIÓN ESTRATÉGICA", margin, 277);

  doc.addPage();

  // 2. FICHA TÉCNICA DEL EXPEDIENTE
  let cursorY = 30;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("1. Resumen de Certificación", margin, cursorY);
  
  cursorY += 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cursorY, contentWidth, 45, 3, 3, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("RAZÓN SOCIAL:", margin + 10, cursorY + 12);
  doc.text("ID EXPEDIENTE:", margin + 10, cursorY + 22);
  doc.text("FECHA CERTIFICACIÓN:", margin + 10, cursorY + 32);

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(data.clientName, margin + 55, cursorY + 12);
  doc.text(`BEG-${Math.random().toString(36).substring(7).toUpperCase()}`, margin + 55, cursorY + 22);
  doc.text(new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }), margin + 55, cursorY + 32);

  // Score Seal
  const scoreColor = data.score >= 80 ? [16, 185, 129] : [245, 158, 11];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(pageWidth - margin - 40, cursorY + 10, 30, 25, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(`${data.score}`, pageWidth - margin - 25, cursorY + 25, { align: "center" });
  doc.setFontSize(7);
  doc.text("CALIDAD TÉCNICA", pageWidth - margin - 25, cursorY + 30, { align: "center" });

  cursorY += 60;

  // 3. ANÁLISIS EJECUTIVO
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("2. Dictamen de Auditoría", margin, cursorY);
  cursorY += 8;
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  cursorY = writeText(doc, data.summary, margin, cursorY, contentWidth, 6);
  cursorY += 15;

  // 4. FORTALEZAS Y DEBILIDADES (GRID)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Análisis de Puntos Clave", margin, cursorY);
  cursorY += 10;

  // Fortalezas
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, cursorY, contentWidth, 8, 1, 1, "F");
  doc.setTextColor(21, 128, 61);
  doc.setFontSize(9);
  doc.text("FORTALEZAS DETECTADAS (FACTORES POSITIVOS)", margin + 5, cursorY + 5.5);
  cursorY += 12;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  data.strengths.forEach(s => {
    doc.text("✓", margin, cursorY);
    cursorY = writeText(doc, s, margin + 6, cursorY, contentWidth - 10, 5);
    cursorY += 2;
  });

  cursorY += 8;
  if (cursorY > 240) { doc.addPage(); cursorY = 25; }

  // Debilidades
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(margin, cursorY, contentWidth, 8, 1, 1, "F");
  doc.setTextColor(185, 28, 28);
  doc.text("RIESGOS Y DEBILIDADES (ÁREAS DE ATENCIÓN)", margin + 5, cursorY + 5.5);
  cursorY += 12;
  doc.setTextColor(30, 41, 59);
  data.weaknesses.forEach(w => {
    doc.text("!", margin + 1, cursorY);
    cursorY = writeText(doc, w, margin + 6, cursorY, contentWidth - 10, 5);
    cursorY += 2;
  });

  cursorY += 15;
  if (cursorY > 230) { doc.addPage(); cursorY = 25; }

  // 5. PLAN DE ACCIÓN
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4. Plan de Acción Recomendado", margin, cursorY);
  cursorY += 10;
  data.improvements.forEach((imp, i) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${i+1}.`, margin, cursorY);
    doc.setFont("helvetica", "normal");
    cursorY = writeText(doc, imp, margin + 8, cursorY, contentWidth - 10, 5.5);
    cursorY += 4;
  });

  // Footer en la última página
  addFooter(doc, "INFORME TÉCNICO DE CALIDAD");

  return doc.output("arraybuffer");
}

// --- GENERADOR: MEMORIA TÉCNICA COMPLETA ---
export async function generatePdf(data: any): Promise<ArrayBuffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  const contentWidth = 210 - margin * 2;
  
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 297, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text(doc.splitTextToSize(data.title.toUpperCase(), contentWidth), margin, 100);
  doc.addPage();
  
  let cursorY = 25;
  doc.setTextColor(0, 0, 0);
  data.sections.forEach((section: any) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    if (cursorY > 260) { doc.addPage(); cursorY = 25; }
    doc.text(doc.splitTextToSize(section.title.toUpperCase(), contentWidth), margin, cursorY);
    cursorY += 10;
    
    doc.setFont("times", "normal");
    doc.setFontSize(11);
    cursorY = writeText(doc, section.content || "(Sin contenido)", margin, cursorY, contentWidth, 6);
    cursorY += 15;
  });

  return doc.output("arraybuffer");
}

export async function generateViabilityCertificate(data: ViabilityData): Promise<ArrayBuffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 25;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // 1. PORTADA
  doc.setFillColor(15, 23, 42); // Navy Blue
  doc.rect(0, 0, pageWidth, 297, "F");
  
  doc.setDrawColor(16, 185, 129); // Green
  doc.setLineWidth(1);
  doc.line(margin, 60, margin + 20, 60);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("CERTIFICADO DE", margin, 85);
  doc.text("VIABILIDAD TÉCNICA", margin, 97);
  
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text("ANÁLISIS PRELIMINAR DE ELEGIBILIDAD Y ÉXITO", margin, 105);

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(data.title.toUpperCase(), contentWidth);
  doc.text(titleLines, margin, 130);

  // Sello inferior
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 250, pageWidth, 47, "F");
  doc.setFontSize(9);
  doc.text("PROCESADO POR:", margin, 265);
  doc.setFontSize(12);
  doc.text("BEGITALITY INTELLIGENCE", margin, 272);

  doc.addPage();

  // 2. CONTENIDO
  let cursorY = 30;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen de Viabilidad", margin, cursorY);
  
  cursorY += 10;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cursorY, contentWidth, 35, 3, 3, "F");
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("CLIENTE:", margin + 10, cursorY + 12);
  doc.text("CONVOCATORIA:", margin + 10, cursorY + 22);

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(data.clientName, margin + 45, cursorY + 12);
  doc.text(data.grantName, margin + 45, cursorY + 22);

  // Probability Gauge
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(pageWidth - margin - 40, cursorY + 5, 30, 25, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`${data.probability}%`, pageWidth - margin - 25, cursorY + 18, { align: "center" });
  doc.setFontSize(6);
  doc.text("PROBABILIDAD", pageWidth - margin - 25, cursorY + 24, { align: "center" });

  cursorY += 50;

  // Status Badge
  const statusColor = data.status === "APTO" ? [16, 185, 129] : [245, 158, 11];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(margin, cursorY, 40, 8, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(data.status, margin + 20, cursorY + 5.5, { align: "center" });
  
  cursorY += 15;
  doc.setTextColor(30, 41, 59);
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  cursorY = writeText(doc, data.summary, margin, cursorY, contentWidth, 6);

  cursorY += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Fortalezas y Oportunidades", margin, cursorY);
  cursorY += 8;
  doc.setFont("helvetica", "normal");
  data.strengths.forEach(s => {
    doc.text("•", margin, cursorY);
    cursorY = writeText(doc, s, margin + 5, cursorY, contentWidth - 10, 5);
    cursorY += 2;
  });

  cursorY += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Riesgos Detectados", margin, cursorY);
  cursorY += 8;
  doc.setFont("helvetica", "normal");
  data.risks.forEach(r => {
    doc.text("!", margin + 1, cursorY);
    cursorY = writeText(doc, r, margin + 5, cursorY, contentWidth - 10, 5);
    cursorY += 2;
  });

  addFooter(doc, "CERTIFICADO DE VIABILIDAD");
  return doc.output("arraybuffer");
}
