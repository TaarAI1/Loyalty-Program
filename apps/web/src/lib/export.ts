import Papa from 'papaparse';

/** Column keys that contain phone numbers */
const PHONE_KEYS = ['cell', 'phone', 'mobile', 'contact'];

function isPhoneKey(key: string): boolean {
  return PHONE_KEYS.some((k) => key.toLowerCase().includes(k));
}

function titleCaseWords(s: string): string {
  return s.replace(/\b\w+/g, (word) => {
    if (word.toUpperCase() === 'ID') return 'ID';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

/** e.g. card_no → Card No, TOTAL_EARNING → Total Earning; leaves "Total Points" unchanged */
export function formatExportHeader(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return key;

  const bare = trimmed.replace(/[_-]/g, '').replace(/\s/g, '');
  if (bare.toLowerCase() === 'id') return 'ID';

  const hasSep = /[_-]/.test(trimmed);
  const isAllCaps =
    trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length > 1;

  if (!hasSep && !isAllCaps) return trimmed;

  let s = trimmed.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (isAllCaps || (s.length > 1 && s === s.toUpperCase() && /[A-Z]/.test(s))) {
    s = s.toLowerCase();
  }
  return titleCaseWords(s);
}

function mapExportRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [formatExportHeader(k), v]),
  );
}

function mapExportData(data: Record<string, unknown>[]): Record<string, unknown>[] {
  return data.map(mapExportRowKeys);
}

/**
 * Prefix phone number values with a tab so Excel/Sheets treats them as text,
 * preventing scientific notation (e.g. 9.23E+11).
 */
function withTextPhones(data: Record<string, unknown>[]): Record<string, unknown>[] {
  return data.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) =>
        isPhoneKey(k) && v != null ? [k, `\t${v}`] : [k, v],
      ),
    ),
  );
}

export function exportToCsv(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(withTextPhones(mapExportData(data)));
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportToExcel(data: Record<string, unknown>[], filename: string) {
  const XLSX = await import('xlsx');
  const mapped = mapExportData(data);
  // Pre-convert phone columns to strings so XLSX writes them as text cells
  const processed = mapped.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) =>
        isPhoneKey(k) && v != null ? [k, String(v)] : [k, v],
      ),
    ),
  );
  const ws = XLSX.utils.json_to_sheet(processed);

  // Force text format (@) on phone columns so Excel doesn't coerce to numbers
  if (processed.length > 0) {
    const keys = Object.keys(processed[0]);
    keys.forEach((key, colIdx) => {
      if (!isPhoneKey(key)) return;
      const colLetter = XLSX.utils.encode_col(colIdx);
      for (let row = 2; row <= processed.length + 1; row++) {
        const ref = `${colLetter}${row}`;
        if (ws[ref]) {
          ws[ref].t = 's';
          ws[ref].z = '@';
        }
      }
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPdf(
  data: Record<string, unknown>[],
  filename: string,
  title: string,
) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

  const mapped = mapExportData(data);
  const columns = mapped.length > 0 ? Object.keys(mapped[0]) : [];
  const rows = mapped.map((row) => columns.map((col) => String(row[col] ?? '')));

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  doc.save(`${filename}.pdf`);
}
