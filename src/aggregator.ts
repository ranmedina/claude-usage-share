import type { NormalizedEvent, ModelBucket, ModelStats, UsageReport, AggregationOptions } from './types.js';
import { estimateDurations, getDurationMs } from './duration.js';
import { calculateCost } from './pricing.js';

export function aggregateEvents(
  events: NormalizedEvent[], 
  options: AggregationOptions = {}
): UsageReport | Map<string, UsageReport> {
  const eventsWithDuration = estimateDurations(events);
  
  if (options.groupBy === 'day' || options.groupBy === 'month' || options.groupBy === 'today') {
    return aggregateByTimeGroup(eventsWithDuration, options);
  }
  
  return aggregateAllTime(eventsWithDuration, options);
}

function aggregateAllTime(
  events: Array<NormalizedEvent & { inferredDurationMs?: number }>, 
  options: AggregationOptions
): UsageReport {
  const modelStats: Record<ModelBucket, Omit<ModelStats, 'pctTokens' | 'pctPrompts' | 'pctTime'>> = {
    Opus: { tokens: 0, tokensIn: 0, tokensOut: 0, prompts: 0, durationMs: 0, costUSD: 0, costInput: 0, costOutput: 0 },
    Sonnet: { tokens: 0, tokensIn: 0, tokensOut: 0, prompts: 0, durationMs: 0, costUSD: 0, costInput: 0, costOutput: 0 },
    Other: { tokens: 0, tokensIn: 0, tokensOut: 0, prompts: 0, durationMs: 0, costUSD: 0, costInput: 0, costOutput: 0 },
  };
  
  let totalTokens = 0;
  let totalPrompts = 0;
  let totalDurationMs = 0;
  
  for (const event of events) {
    const model = event.model as ModelBucket;
    const duration = getDurationMs(event);
    const stats = modelStats[model];
    
    if (stats) {
      stats.tokens += event.tokensTotal;
      stats.tokensIn += event.tokensIn;
      stats.tokensOut += event.tokensOut;
      stats.prompts += 1;
      stats.durationMs += duration;
      
      // Calculate costs
      const inputCost = calculateCost(event.model, event.tokensIn, 0);
      const outputCost = calculateCost(event.model, 0, event.tokensOut);
      stats.costInput = (stats.costInput || 0) + inputCost;
      stats.costOutput = (stats.costOutput || 0) + outputCost;
      stats.costUSD = (stats.costUSD || 0) + inputCost + outputCost;
    }
    
    totalTokens += event.tokensTotal;
    totalPrompts += 1;
    totalDurationMs += duration;
  }
  
  // Calculate percentages
  const modelsWithPercentages: Record<ModelBucket, ModelStats> = {} as Record<ModelBucket, ModelStats>;
  for (const [model, stats] of Object.entries(modelStats) as [ModelBucket, typeof modelStats[ModelBucket]][]) {
    modelsWithPercentages[model] = {
      ...stats,
      pctTokens: totalTokens > 0 ? (stats.tokens / totalTokens) * 100 : 0,
      pctPrompts: totalPrompts > 0 ? (stats.prompts / totalPrompts) * 100 : 0,
      pctTime: totalDurationMs > 0 ? (stats.durationMs / totalDurationMs) * 100 : 0,
    };
  }
  
  return {
    window: {
      since: options.since?.toISOString(),
      until: options.until?.toISOString(),
      tz: options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    grouping: 'all-time',
    totals: {
      tokens: totalTokens,
      prompts: totalPrompts,
      durationMs: totalDurationMs,
    },
    models: modelsWithPercentages,
  };
}

function aggregateByTimeGroup(
  events: Array<NormalizedEvent & { inferredDurationMs?: number }>,
  options: AggregationOptions
): Map<string, UsageReport> {
  const groups = new Map<string, Array<NormalizedEvent & { inferredDurationMs?: number }>>();
  const groupBy = options.groupBy!;
  const timezone = options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  for (const event of events) {
    const groupKey = getTimeGroupKey(event.timestamp, groupBy, timezone);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(event);
  }
  
  const result = new Map<string, UsageReport>();
  for (const [groupKey, groupEvents] of groups) {
    const report = aggregateAllTime(groupEvents, { ...options, groupBy: undefined });
    report.grouping = groupBy;
    result.set(groupKey, report);
  }
  
  return result;
}

function getTimeGroupKey(timestamp: Date, groupBy: 'day' | 'month' | 'all-time' | 'today', timezone: string): string {
  // Convert to timezone for grouping
  const zonedDate = new Date(timestamp.toLocaleString('en-US', { timeZone: timezone }));
  
  if (groupBy === 'day' || groupBy === 'today') {
    return zonedDate.toISOString().split('T')[0]; // YYYY-MM-DD
  } else if (groupBy === 'month') {
    const year = zonedDate.getFullYear();
    const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // YYYY-MM
  }
  
  throw new Error(`Unsupported groupBy: ${groupBy}`);
}

export function formatDuration(durationMs: number): string {
  const totalMinutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}