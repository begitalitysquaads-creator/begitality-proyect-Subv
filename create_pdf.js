import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

async function createInternalPdf() {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 30;
    page.drawText('Bases de la Convocatoria - Ejemplo', {
        x: 50,
        y: height - 4 * fontSize,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0.53, 0.71),
    });
    page.drawText('Requisitos: Memoria descriptiva, presupuesto, cronograma.', {
        x: 50,
        y: height - 6 * fontSize,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('convocatoria_dummy.pdf', pdfBytes);
    console.log('PDF creado: convocatoria_dummy.pdf');
}

createInternalPdf();
