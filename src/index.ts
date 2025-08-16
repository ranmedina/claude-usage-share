export * from './types.js';
export * from './parser.js';
export * from './duration.js';
export * from './aggregator.js';
export * from './discovery.js';

import { streamJsonlEvents } from './parser.js';
import { aggregateEvents } from './aggregator.js';
import { discoverLogFiles } from './discovery.js';
import type { NormalizedEvent, ParseOptions, UsageReport, AggregationOptions } from './types.js';

export async function analyzeUsage(
  filePaths?: string[], 
  parseOptions: ParseOptions = {},
  aggregationOptions: AggregationOptions = {}
): Promise<UsageReport | Map<string, UsageReport>> {
  // Always use discoverLogFiles to handle both explicit paths and default discovery
  const logFiles = await discoverLogFiles(filePaths);
  
  if (logFiles.length === 0) {
    throw new Error('No log files found');
  }
  
  const allEvents: NormalizedEvent[] = [];
  
  // Stream and parse all files
  for (const filePath of logFiles) {
    try {
      const eventStream = streamJsonlEvents(filePath, parseOptions);
      for await (const event of eventStream) {
        allEvents.push(event);
      }
    } catch (error) {
      // Log error and continue with other files
      console.warn(`Failed to parse ${filePath}:`, error);
      continue;
    }
  }
  
  if (allEvents.length === 0) {
    throw new Error('No valid events found in log files');
  }
  
  return aggregateEvents(allEvents, aggregationOptions);
}