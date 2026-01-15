import * as XLSX from 'xlsx';

export interface ExcelParseResult {
  filename: string;
  sheets: SheetSummary[];
  summary: string;
}

interface SheetSummary {
  name: string;
  headers: string[];
  rowCount: number;
  formulas: string[];
  sampleData: string[][];
}

export function parseExcelFile(buffer: Buffer, filename: string): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets: SheetSummary[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

    // Extract headers (first row)
    const headers = jsonData[0] || [];

    // Count rows (excluding header)
    const rowCount = Math.max(0, jsonData.length - 1);

    // Extract formulas from the sheet
    const formulas: string[] = [];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.f) {
          formulas.push(`${cellAddress}: =${cell.f}`);
        }
      }
    }

    // Get sample data (first 3 data rows)
    const sampleData = jsonData.slice(1, 4).map((row) =>
      (row as unknown as (string | number | boolean)[]).map((cell) => String(cell ?? ''))
    );

    sheets.push({
      name: sheetName,
      headers: headers.map((h) => String(h ?? '')),
      rowCount,
      formulas: formulas.slice(0, 20), // Limit to 20 formulas
      sampleData,
    });
  }

  // Generate summary text for Claude
  const summary = generateExcelSummary(filename, sheets);

  return { filename, sheets, summary };
}

function generateExcelSummary(filename: string, sheets: SheetSummary[]): string {
  let summary = `## Excel File: ${filename}\n\n`;

  for (const sheet of sheets) {
    summary += `### Sheet: ${sheet.name}\n`;
    summary += `- Rows: ${sheet.rowCount}\n`;
    summary += `- Columns: ${sheet.headers.join(', ') || 'No headers'}\n`;

    if (sheet.formulas.length > 0) {
      summary += `\n**Formulas (business logic):**\n`;
      for (const formula of sheet.formulas.slice(0, 10)) {
        summary += `- ${formula}\n`;
      }
      if (sheet.formulas.length > 10) {
        summary += `- ... and ${sheet.formulas.length - 10} more formulas\n`;
      }
    }

    if (sheet.sampleData.length > 0) {
      summary += `\n**Sample data:**\n`;
      summary += `| ${sheet.headers.join(' | ')} |\n`;
      summary += `| ${sheet.headers.map(() => '---').join(' | ')} |\n`;
      for (const row of sheet.sampleData) {
        summary += `| ${row.join(' | ')} |\n`;
      }
    }

    summary += '\n';
  }

  return summary;
}
