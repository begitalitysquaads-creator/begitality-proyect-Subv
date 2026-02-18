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

// Helper para escribir texto con salto de página automático
function writeText(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight: number): number {
  const lines = doc.splitTextToSize(text, width);
  lines.forEach((line: string) => {
    if (y > 275) {
      doc.addPage();
      y = 25;
    }
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

// --- GENERADOR: CERTIFICADO DE VIABILIDAD ---
export async function generateViabilityCertificate(data: ViabilityData): Promise<ArrayBuffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 25;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CERTIFICADO DE VIABILIDAD TÉCNICA", margin, 25);
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text("BEGITALITY ASSIST - AUDITORÍA DE SUBVENCIONES", margin, 32);

  let cursorY = 55;
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text("DETALLES DEL EXPEDIENTE", margin, cursorY);
  cursorY += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(`Cliente:`, margin, cursorY); doc.setFont("helvetica", "normal"); doc.text(data.clientName, margin + 25, cursorY); cursorY += 6;
  doc.setFont("helvetica", "bold"); doc.text(`Proyecto:`, margin, cursorY); doc.setFont("helvetica", "normal"); doc.text(data.title, margin + 25, cursorY); cursorY += 6;
  doc.setFont("helvetica", "bold"); doc.text(`Convocatoria:`, margin, cursorY); doc.setFont("helvetica", "normal"); 
  cursorY = writeText(doc, data.grantName, margin + 25, cursorY, contentWidth - 25, 5);
  cursorY += 10;

  const statusColor = data.status === "APTO" ? [16, 185, 129] : data.status === "CONDICIONADO" ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(margin, cursorY, 50, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.status, margin + 25, cursorY + 7.5, { align: "center" });
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(`Probabilidad de Éxito: ${data.probability}%`, margin + 60, cursorY + 7.5);
  cursorY += 25;

  doc.setFontSize(11);
  doc.text("Análisis Ejecutivo", margin, cursorY); cursorY += 7;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  cursorY = writeText(doc, data.summary, margin, cursorY, contentWidth, 5);
  
  return doc.output("arraybuffer");
}

// --- GENERADOR: REPORTE DE AUDITORÍA DE CALIDAD ---
export async function generateReviewReport(data: ReviewData): Promise<ArrayBuffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 25;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  // PORTADA
  doc.setFillColor(15, 23, 42); 
  doc.rect(0, 0, pageWidth, 297, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("INFORME DE AUDITORÍA", margin, 80);
  doc.text("DE CALIDAD TÉCNICA", margin, 92);
  doc.setFontSize(12);
  doc.setTextColor(59, 130, 246);
  doc.text(doc.splitTextToSize(data.title.toUpperCase(), contentWidth), margin, 110);
  doc.addPage();

  let cursorY = 25;
  doc.setTextColor(30, 41, 59);
  
  // Score Block
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, cursorY, contentWidth, 35, 4, 4, "F");
  doc.setFontSize(9);
  doc.text("QUALITY PERFORMANCE SCORE", margin + 10, cursorY + 12);
  doc.setFontSize(28);
  doc.setTextColor(data.score >= 80 ? 16 : 220, data.score >= 80 ? 185 : 38, data.score >= 80 ? 129 : 38);
  doc.text(`${data.score}/100`, margin + 10, cursorY + 26);
  cursorY += 50;

  // Summary
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("1. Resumen Ejecutivo", margin, cursorY);
  cursorY += 8;
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  cursorY = writeText(doc, data.summary, margin, cursorY, contentWidth, 5);
  cursorY += 12;

  // Strengths
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Análisis de Fortalezas", margin, cursorY);
  cursorY += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  data.strengths.forEach(s => {
    doc.text("• ", margin, cursorY);
    cursorY = writeText(doc, s, margin + 5, cursorY, contentWidth - 5, 5);
    cursorY += 2;
  });
  cursorY += 10;

  // Weaknesses
  if (cursorY > 250) { doc.addPage(); cursorY = 25; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Áreas de Mejora", margin, cursorY);
  cursorY += 8;
  doc.setFont("helvetica", "normal");
  data.weaknesses.forEach(w => {
    doc.text("• ", margin, cursorY);
    cursorY = writeText(doc, w, margin + 5, cursorY, contentWidth - 5, 5);
    cursorY += 2;
  });
  cursorY += 10;

  // Improvements
  if (cursorY > 230) { doc.addPage(); cursorY = 25; }
  doc.setFont("helvetica", "bold");
  doc.text("4. Plan de Acción Recomendado", margin, cursorY);
  cursorY += 8;
  data.improvements.forEach((imp, i) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${i+1}.`, margin, cursorY);
    doc.setFont("helvetica", "normal");
    cursorY = writeText(doc, imp, margin + 8, cursorY, contentWidth - 10, 5);
    cursorY += 3;
  });

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
