import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/**
 * Extrae texto de un buffer PDF. Solo para uso en servidor (Node).
 * Ejecuta pdf-parse en un proceso hijo para evitar su código de prueba (ENOENT).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `pdf-extract-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  try {
    fs.writeFileSync(tmpFile, buffer);
    const text = await new Promise<string>((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), "scripts", "extract-pdf-text.cjs");
      const child = spawn(process.execPath, [scriptPath, tmpFile], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      let err = "";
      child.stdout?.on("data", (chunk) => { out += chunk; });
      child.stderr?.on("data", (chunk) => { err += chunk; });
      child.on("close", (code) => {
        if (code === 0) resolve(out.trim());
        else reject(new Error(err || `Exit code ${code}`));
      });
      child.on("error", reject);
    });
    return text;
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      // ignorar si no existe
    }
  }
}
