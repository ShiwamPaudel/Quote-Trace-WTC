export function buildCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escaped = rows.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        const content = value === null || value === undefined ? '' : String(value);
        return `"${content.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  return [headers.join(','), ...escaped].join('\n');
}

export function downloadCsvFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
