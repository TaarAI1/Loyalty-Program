import Papa from 'papaparse';

export function exportToCsv(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data);
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
  const ws = XLSX.utils.json_to_sheet(data);
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

  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const rows = data.map((row) => columns.map((col) => String(row[col] ?? '')));

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  doc.save(`${filename}.pdf`);
}
