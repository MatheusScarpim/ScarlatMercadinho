function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const csvLines = [
    headers.map(escapeCsvValue).join(';'),
    ...rows.map((row) => row.map(escapeCsvValue).join(';'))
  ].join('\n');

  const blob = new Blob(['\ufeff', csvLines], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
