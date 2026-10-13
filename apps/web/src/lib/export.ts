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

function splitCamelCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

/** e.g. card_no → Card No, customerName → Customer Name; leaves "Total Points" unchanged */
export function formatExportHeader(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return key;

  const bare = trimmed.replace(/[_-]/g, '').replace(/\s/g, '');
  if (bare.toLowerCase() === 'id') return 'ID';

  const hasSpace = /\s/.test(trimmed);
  const hasSep = /[_-]/.test(trimmed);
  const isAllCaps =
    trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length > 1;
  const isCamelCase =
    !hasSep && !hasSpace && /[a-z]/.test(trimmed) && /[A-Z]/.test(trimmed);
  const isSingleLower =
    !hasSep && !hasSpace && trimmed === trimmed.toLowerCase() && /[a-z]/.test(trimmed);

  if (hasSpace && !hasSep && !isAllCaps) return trimmed;

  if (hasSep || isAllCaps) {
    let s = trimmed.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (isAllCaps || (s.length > 1 && s === s.toUpperCase() && /[A-Z]/.test(s))) {
      s = s.toLowerCase();
    }
    return titleCaseWords(s);
  }

  if (isCamelCase || isSingleLower) {
    return titleCaseWords(splitCamelCase(trimmed).toLowerCase());
  }

  return trimmed;
}

function mapExportRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [formatExportHeader(k), v]),
  );
}

function mapExportData(data: Record<string, unknown>[]): Record<string, unknown>[] {
  return data.map(mapExportRowKeys);
}

/** PDF header cells: break at word boundaries, not mid-word. */
function pdfHeadLabel(label: string): string {
  const words = label.trim().split(/\s+/);
  if (words.length <= 1) return label;
  if (words.length === 2) return words.join('\n');
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')].join('\n');
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
  const headRow = columns.map(pdfHeadLabel);
  const wideTable = columns.length > 10;

  const columnStyles: Record<number, { cellWidth?: number }> = {};
  if (wideTable) {
    columns.forEach((col, i) => {
      if (/phone|email|name|store|retailpro/i.test(col)) {
        columnStyles[i] = { cellWidth: /email|retailpro/i.test(col) ? 28 : 22 };
      }
    });
  }

  autoTable(doc, {
    head: [headRow],
    body: rows,
    startY: 28,
    margin: { left: 10, right: 10 },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: 'linebreak',
      valign: 'top',
    },
    bodyStyles: { minCellHeight: 8 },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 14,
      cellPadding: 2,
    },
    ...(wideTable
      ? {
          horizontalPageBreak: true,
          horizontalPageBreakRepeat: 0,
          ...(Object.keys(columnStyles).length > 0 ? { columnStyles } : {}),
        }
      : {}),
  });

  doc.save(`${filename}.pdf`);
}
