import type { UsageReport, ModelBucket } from './types.js';

export function formatCsv(report: UsageReport | Map<string, UsageReport>): string {
  const headers = [
    'Group',
    'Model',
    'Tokens',
    'Tokens %',
    'Prompts',
    'Prompts %',
    'Duration (ms)',
    'Duration %',
    'Duration (formatted)'
  ];
  
  const rows: string[][] = [headers];
  
  if (report instanceof Map) {
    // Multiple groups (daily/monthly)
    for (const [groupKey, groupReport] of report) {
      addReportRows(rows, groupReport, groupKey);
    }
  } else {
    // Single report (all-time)
    addReportRows(rows, report, report.grouping);
  }
  
  return rows.map(row => row.map(cell => escapeCsvCell(cell)).join(',')).join('\n');
}

function addReportRows(rows: string[][], report: UsageReport, groupKey: string): void {
  const modelKeys: ModelBucket[] = ['Opus', 'Sonnet', 'Other'];
  
  for (const model of modelKeys) {
    const stats = report.models[model];
    const durationFormatted = formatDuration(stats.durationMs);
    
    rows.push([
      groupKey,
      model,
      stats.tokens.toString(),
      stats.pctTokens.toFixed(1),
      stats.prompts.toString(),
      stats.pctPrompts.toFixed(1),
      stats.durationMs.toString(),
      stats.pctTime.toFixed(1),
      durationFormatted
    ]);
  }
}

function formatDuration(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}