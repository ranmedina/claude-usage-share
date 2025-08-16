import Table from 'cli-table3';
import type { UsageReport, ModelBucket } from './types.js';
import type { TodayUsageReport } from './session-tracker.js';

// JSON formatters
export function formatJson(report: UsageReport | Map<string, UsageReport>): string {
  if (report instanceof Map) {
    // Convert Map to object for JSON serialization
    const grouped: Record<string, UsageReport> = {};
    for (const [key, value] of report) {
      grouped[key] = value;
    }
    return JSON.stringify(grouped, null, 2);
  }
  
  return JSON.stringify(report, null, 2);
}


// CSV formatters
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

function escapeCsvCell(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

// Table formatters
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
  
  // Add cost summary if available
  const totalCost = Object.values(report.models).reduce((sum, stats) => sum + (stats.costUSD || 0), 0);
  if (totalCost > 0) {
    const totalInputCost = Object.values(report.models).reduce((sum, stats) => sum + (stats.costInput || 0), 0);
    const totalOutputCost = Object.values(report.models).reduce((sum, stats) => sum + (stats.costOutput || 0), 0);
    
    output += `\n\n💰 API Value: $${totalCost.toFixed(2)}`;
    if (totalInputCost > 0 || totalOutputCost > 0) {
      output += ` (Input: $${totalInputCost.toFixed(2)}, Output: $${totalOutputCost.toFixed(2)})`;
    }
  }
  
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

// Today usage formatter
export function formatTodayReport(report: TodayUsageReport): string {
  const output: string[] = [];
  
  // Header
  output.push(`\n📅 Today's Usage Report (${report.date})`);
  output.push('═'.repeat(50));
  
  // Daily totals
  const totalTokensFormatted = formatNumber(report.totalUsage.tokens);
  const totalPromptsFormatted = formatNumber(report.totalUsage.prompts);
  const totalDurationFormatted = formatDuration(report.totalUsage.durationMs);
  
  output.push(`\n📊 Daily Totals:`);
  output.push(`   Tokens: ${totalTokensFormatted}`);
  output.push(`   Prompts: ${totalPromptsFormatted}`);
  output.push(`   Duration: ${totalDurationFormatted}`);
  
  // Active session status
  if (report.activeSession) {
    const session = report.activeSession;
    const burnRateFormatted = Math.round(session.burnRate).toLocaleString();
    const usagePercent = session.usagePercent || 0;
    
    // Status indicator based on usage
    let statusIcon = '🟢';
    let statusText = 'Good';
    if (usagePercent >= 90) {
      statusIcon = '🔴';
      statusText = 'Critical';
    } else if (usagePercent >= 75) {
      statusIcon = '🟠';
      statusText = 'High';
    } else if (usagePercent >= 50) {
      statusIcon = '🟡';
      statusText = 'Medium';
    }
    
    output.push(`\n${statusIcon} Active Session (${statusText} Usage)`);
    output.push(`   ├─ Block Started: ${session.startTime.toLocaleTimeString()}`);
    output.push(`   ├─ Time Remaining: ${session.timeRemaining}`);
    output.push(`   ├─ Burn Rate: ${burnRateFormatted} tokens/min`);
    
    if (session.tokenLimit) {
      const limitFormatted = formatNumber(session.tokenLimit);
      const remainingTokens = session.tokenLimit - session.tokensUsed;
      const remainingFormatted = formatNumber(remainingTokens);
      output.push(`   ├─ Token Limit: ${limitFormatted}`);
      output.push(`   ├─ Tokens Remaining: ${remainingFormatted}`);
    }
    
    if (session.projectedTotal) {
      const projectedFormatted = formatNumber(Math.round(session.projectedTotal));
      const willExceed = session.projectedTotal > (session.tokenLimit || Infinity);
      const exceedIcon = willExceed ? '⚠️ ' : '';
      output.push(`   ├─ ${exceedIcon}Projected Total: ${projectedFormatted} tokens`);
    }
    
    // Enhanced progress bar with percentage
    if (session.usagePercent !== undefined) {
      const progressBarLength = 40;
      const filledLength = Math.round((usagePercent / 100) * progressBarLength);
      const emptyLength = progressBarLength - filledLength;
      
      // Use different characters for different usage levels
      let fillChar = '█';
      let emptyChar = '░';
      if (usagePercent >= 90) {
        fillChar = '█'; // Red zone
      } else if (usagePercent >= 75) {
        fillChar = '▓'; // Orange zone  
      } else if (usagePercent >= 50) {
        fillChar = '▒'; // Yellow zone
      } else {
        fillChar = '░'; // Green zone - use lighter fill
      }
      
      const progressBar = fillChar.repeat(filledLength) + emptyChar.repeat(emptyLength);
      output.push(`   └─ Usage: [${progressBar}] ${usagePercent.toFixed(1)}%`);
    }
  } else {
    output.push(`\n⏸️  No Active Session`);
    output.push(`   Start using Claude Code to begin a new 5-hour session block.`);
  }
  
  // Completed blocks today
  if (report.completedBlocks.length > 0) {
    output.push(`\n✅ Completed Blocks Today: ${report.completedBlocks.length}`);
    for (const block of report.completedBlocks) {
      const blockTokens = formatNumber(block.tokenCounts.totalTokens);
      const blockStart = block.startTime.toLocaleTimeString();
      const blockDuration = formatDuration(Date.now() - block.startTime.getTime());
      output.push(`   ${blockStart}: ${blockTokens} tokens (${blockDuration})`);
    }
  }
  
  // Model breakdown with enhanced visuals
  const modelEntries = Object.entries(report.models).filter(([_, stats]) => stats.tokens > 0);
  if (modelEntries.length > 0) {
    output.push(`\n🤖 Model Usage Breakdown:`);
    
    // Sort by token usage (highest first)
    const sortedModels = modelEntries.sort((a, b) => b[1].tokens - a[1].tokens);
    
    for (const [model, stats] of sortedModels) {
      const sharePercent = ((stats.tokens / report.totalUsage.tokens) * 100);
      const tokensFormatted = formatNumber(stats.tokens);
      const promptsFormatted = formatNumber(stats.prompts);
      
      // Model-specific icons and information
      let modelIcon = '🤖';
      let modelInfo = '';
      let extraInfo = '';
      
      if (model.toLowerCase().includes('sonnet')) {
        modelIcon = '⚡';
        modelInfo = 'Sonnet (Fast & Efficient)';
        if (model.includes('4')) {
          extraInfo = ' • Latest Generation';
        }
      } else if (model.toLowerCase().includes('opus')) {
        modelIcon = '🧠';
        modelInfo = 'Opus (Premium Intelligence)';
        extraInfo = ' • Highest Capability';
      } else if (model.toLowerCase().includes('claude')) {
        modelIcon = '🔮';
        modelInfo = 'Claude';
      } else {
        modelInfo = model;
      }
      
      // Create visual share bar
      const barLength = 20;
      const filledLength = Math.round((sharePercent / 100) * barLength);
      const emptyLength = barLength - filledLength;
      const shareBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
      
      output.push(`\n   ${modelIcon} ${modelInfo}${extraInfo}`);
      output.push(`   ├─ Tokens: ${tokensFormatted} (${sharePercent.toFixed(1)}%)`);
      
      // Show input/output breakdown if available
      if (stats.tokensIn !== undefined && stats.tokensOut !== undefined) {
        const inputFormatted = formatNumber(stats.tokensIn);
        const outputFormatted = formatNumber(stats.tokensOut);
        output.push(`   │  ├─ Input: ${inputFormatted}`);
        output.push(`   │  └─ Output: ${outputFormatted}`);
      }
      
      output.push(`   ├─ Prompts: ${promptsFormatted}`);
      output.push(`   └─ Share: [${shareBar}] ${sharePercent.toFixed(1)}%`);
      
      // Add cost information if available with breakdown
      if (stats.costUSD && stats.costUSD > 0) {
        const totalCostFormatted = `$${stats.costUSD.toFixed(2)}`;
        
        if (stats.costInput !== undefined && stats.costOutput !== undefined) {
          const inputCostFormatted = `$${stats.costInput.toFixed(2)}`;
          const outputCostFormatted = `$${stats.costOutput.toFixed(2)}`;
          output.push(`      API Value: ${totalCostFormatted}`);
          output.push(`      ├─ Input cost: ${inputCostFormatted}`);
          output.push(`      └─ Output cost: ${outputCostFormatted}`);
        } else {
          output.push(`      API Value: ${totalCostFormatted} (if using API instead of subscription)`);
        }
      }
    }
    
    // Add summary if multiple models
    if (sortedModels.length > 1) {
      const totalCost = Object.values(report.models).reduce((sum, stats) => sum + (stats.costUSD || 0), 0);
      if (totalCost > 0) {
        const totalInputCost = Object.values(report.models).reduce((sum, stats) => sum + (stats.costInput || 0), 0);
        const totalOutputCost = Object.values(report.models).reduce((sum, stats) => sum + (stats.costOutput || 0), 0);
        
        output.push(`\n💰 Total API Value: $${totalCost.toFixed(2)}`);
        if (totalInputCost > 0 || totalOutputCost > 0) {
          output.push(`   ├─ Input costs: $${totalInputCost.toFixed(2)}`);
          output.push(`   └─ Output costs: $${totalOutputCost.toFixed(2)}`);
        }
        output.push(`   (What this usage would cost with API pricing)`);
      }
    }
  }
  
  return output.join('\n');
}

export function formatTodayJson(report: TodayUsageReport): string {
  return JSON.stringify(report, null, 2);
}