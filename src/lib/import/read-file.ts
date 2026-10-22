"use client";

// Lê CSV ou Excel no navegador e devolve a matriz de células (a 1ª linha da matriz é a linha 1 do arquivo).

import Papa from "papaparse";

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // RNF04

export class ImportFileError extends Error {}

function decodeText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // O Google Ads costuma exportar CSV em UTF-16 separado por tabulação.
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(buffer);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(buffer);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export async function readFileRows(file: File): Promise<unknown[][]> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ImportFileError("O arquivo passa de 10 MB. Exporte um período menor.");
  }
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (/\.(xlsx|xls|xlsm)$/.test(name)) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new ImportFileError("A planilha está vazia.");
    return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
  }

  if (/\.(csv|tsv|txt)$/.test(name)) {
    const parsed = Papa.parse<string[]>(decodeText(buffer), {
      skipEmptyLines: false,
      delimitersToGuess: ["\t", ",", ";", "|"],
    });
    if (parsed.data.length === 0) throw new ImportFileError("O arquivo está vazio.");
    return parsed.data;
  }

  throw new ImportFileError("Formato não suportado. Envie um arquivo CSV ou Excel (.xlsx).");
}
