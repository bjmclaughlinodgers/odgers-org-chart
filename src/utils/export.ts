/* eslint-disable @typescript-eslint/no-explicit-any */

export async function exportToPng(elementId: string, filename: string = 'org-chart'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const mod = await (Function('return import("html2canvas")')() as Promise<any>);
    const html2canvas = mod.default;
    const canvas = await html2canvas(element, {
      backgroundColor: '#f8f9fa',
      scale: 2,
      useCORS: true,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch {
    console.warn('html2canvas not installed. Run: npm install html2canvas');
    alert('Export to PNG requires html2canvas. Install it with: npm install html2canvas');
  }
}

export async function exportToPdf(elementId: string, filename: string = 'org-chart'): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const h2cMod = await (Function('return import("html2canvas")')() as Promise<any>);
    const jspdfMod = await (Function('return import("jspdf")')() as Promise<any>);
    const html2canvas = h2cMod.default;
    const jsPDF = jspdfMod.default;

    const canvas = await html2canvas(element, {
      backgroundColor: '#f8f9fa',
      scale: 2,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
  } catch {
    console.warn('html2canvas or jspdf not installed. Run: npm install html2canvas jspdf');
    alert('Export to PDF requires html2canvas and jspdf. Install them with: npm install html2canvas jspdf');
  }
}

export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  columns: { key: string; header: string }[],
  filename: string = 'export'
): void {
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}
