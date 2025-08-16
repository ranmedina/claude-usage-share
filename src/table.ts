import Table from 'cli-table3';
import type { UsageReport, ModelBucket } from './types.js';

export function formatTable(report: UsageReport | Map<string, UsageReport>): string {
  if (report instanceof Map) {
    return formatGroupedTables(report);
  }
  
  return formatSingleTable(report);
}

function formatSingleTable(report: UsageReport): string {
  const table = new Table({
    head: ['Model', 'Tokens %', 'Prompts %', 'Time %', 'Totals (tokens/prompts/time hh:mm)'],
    style: { head: ['cyan'] },
  });
  
  const modelKeys: ModelBucket[] = ['Opus', 'Sonnet', 'Other'];
  
  for (const model of modelKeys) {
    const stats = report.models[model];
    const tokensFormatted = formatNumber(stats.tokens);
    const promptsFormatted = formatNumber(stats.prompts);
    const durationFormatted = formatDuration(stats.durationMs);
    const totalsCell = `${tokensFormatted} / ${promptsFormatted} / ${durationFormatted}`;
    
    table.push([
      model,
      `${stats.pctTokens.toFixed(1)}%`,
      `${stats.pctPrompts.toFixed(1)}%`,
      `${stats.pctTime.toFixed(1)}%`,
      totalsCell
    ]);
  }
  
  let output = table.toString();
  
  // Add footer with Plan share summary
  const opusTokenPct = report.models.Opus.pctTokens.toFixed(1);
  const sonnetTokenPct = report.models.Sonnet.pctTokens.toFixed(1);
  output += `\nPlan share: Opus ${opusTokenPct}%, Sonnet ${sonnetTokenPct}% (by tokens).`;
  
  return output;
}

function formatGroupedTables(reportMap: Map<string, UsageReport>): string {
  const outputs: string[] = [];
  
  for (const [groupKey, report] of reportMap) {
    outputs.push(`\n=== ${groupKey} ===`);
    outputs.push(formatSingleTable(report));
  }
  
  return outputs.join('\n');
}

function formatDuration(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}