/**
 * Script que se ejecuta en un proceso Node separado para extraer texto de un PDF.
 * Así pdf-parse tiene module.parent (este script) y no ejecuta su código de prueba.
 * Uso: node scripts/extract-pdf-text.cjs <ruta-al-pdf>
 * Salida: texto en stdout, errores en stderr.
 */
const fs = require("fs");
const path = process.argv[2];
if (!path || !fs.existsSync(path)) {
  process.stderr.write("Usage: node extract-pdf-text.cjs <path-to-pdf>\n");
  process.exit(1);
}
const pdfParse = require("pdf-parse");
const buffer = fs.readFileSync(path);
pdfParse(buffer)
  .then((data) => {
    process.stdout.write(typeof data?.text === "string" ? data.text : "");
  })
  .catch((err) => {
    process.stderr.write(err.message || String(err));
    process.exit(1);
  });
